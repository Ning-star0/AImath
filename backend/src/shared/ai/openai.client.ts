import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import {
  buildMathQaSystemPrompt,
  buildMathQaUserPrompt,
} from '../../modules/ai-qa/prompts/math-qa.prompt';

export interface StructuredAiAnswer {
  originalQuestion: string;
  steps: string[];
  finalAnswer: string;
  knowledgePoints: string[];
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  riskNotice: string;
  similarQuestions: string[];
  refused?: boolean;
}

interface MathQuestionInput {
  originalQuestion: string;
  grade?: number;
  context?: Record<string, unknown>;
  imageDataUrl?: string;
  manualHint?: string;
  questionType?: string;
  options?: string[];
}

interface StreamHandlers {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (answer: StructuredAiAnswer, rawText: string) => void;
  onError?: (message: string) => void;
}

export interface StudentLearningInsight {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  teacherFocus: string[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface StudentLearningInsightInput {
  studentName: string;
  grade?: number;
  accuracyRate: number;
  totalQuestions: number;
  unresolvedWrongCount: number;
  weakKnowledgePoints: string[];
  recentWrongQuestions: string[];
}

export interface OcrExtractionResult {
  recognizedText: string;
  confidence: number;
  questionType: string;
  options: string[];
  note: string;
  needsManualConfirmation: boolean;
}

interface OcrExtractionInput {
  imageDataUrl: string;
  manualHint?: string;
  questionType?: string;
  grade?: number;
}

@Injectable()
export class OpenAiClient {
  private readonly logger = new Logger(OpenAiClient.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  private readonly visionClient: OpenAI | null;
  private readonly visionModel: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    const baseURL = this.configService.get<string>('openai.baseUrl');
    this.model = this.configService.get<string>('openai.model', 'gpt-4o-mini');

    const visionApiKey =
      this.configService.get<string>('openai.visionApiKey') ?? apiKey;
    const visionBaseUrl =
      this.configService.get<string>('openai.visionBaseUrl') ?? baseURL;
    this.visionModel =
      this.configService.get<string>('openai.visionModel', this.model) ?? this.model;

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL,
        })
      : null;

    this.visionClient = visionApiKey
      ? new OpenAI({
          apiKey: visionApiKey,
          baseURL: visionBaseUrl,
        })
      : null;
  }

  async answerMathQuestion(input: MathQuestionInput): Promise<StructuredAiAnswer> {
    if (input.imageDataUrl?.trim()) {
      return this.answerMathQuestionFromImage(input);
    }

    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY not configured, falling back to local answer.');
      return this.buildFallback(input);
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: buildMathQaSystemPrompt(input),
          },
          {
            role: 'user',
            content: buildMathQaUserPrompt(input),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        return this.buildFallback(input);
      }

      return this.parseStructuredAnswer(raw, input.originalQuestion);
    } catch (error) {
      this.logger.error(
        `AI text answer failed, using fallback: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.buildFallback(
        input,
        'AI 服务暂时不可用，本次返回的是基础回退讲解。',
      );
    }
  }

  async extractMathQuestionFromImage(
    input: OcrExtractionInput,
  ): Promise<OcrExtractionResult> {
    if (!this.visionClient) {
      this.logger.warn('OPENAI_VISION_API_KEY not configured, OCR preview is unavailable.');
      return this.buildOcrFallback(
        input,
        '当前未连接可用的视觉模型，请先手动补充题干，或检查视觉模型配置。',
      );
    }

    try {
      const content: ChatCompletionContentPart[] = [
        {
          type: 'image_url',
          image_url: { url: input.imageDataUrl },
        },
        {
          type: 'text',
          text: [
            '请只识别这道小学数学题，不要讲解。',
            '只返回 JSON，不要 Markdown，不要额外文字。',
            '字段包含 recognizedText、confidence、questionType、options、note、needsManualConfirmation。',
            'recognizedText 保留题干，options 只放选项，note 不超过 20 个汉字。',
            `年级参考：${input.grade ?? '未知'}`,
            `预期题型：${input.questionType ?? '未指定'}`,
            `补充提示：${input.manualHint?.trim() || '无'}`,
            '如果识别不清，recognizedText 返回空字符串，needsManualConfirmation 返回 true。',
          ].join('\n'),
        },
      ];
      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.visionModel,
        temperature: 0,
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      };
      const completion = await this.visionClient.chat.completions.create(request);

      const raw = completion.choices[0]?.message?.content ?? '';
      if (!raw) {
        return this.buildOcrFallback(input, '图片识别结果为空，请人工确认题干后继续。');
      }

      return this.parseOcrExtraction(raw, input);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Image OCR preview failed: ${errorMessage}`);
      return this.buildOcrFallback(
        input,
        `图片识别暂时失败，请检查视觉模型配置后重试。原始错误：${errorMessage}`,
      );
    }
  }

  async analyzeStudentLearningProfile(
    input: StudentLearningInsightInput,
  ): Promise<StudentLearningInsight> {
    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY not configured, using local insight fallback.');
      return this.buildStudentInsightFallback(input);
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              '你是一名小学数学教研分析助手。请根据学生做题表现输出结构化 JSON，字段必须包含 summary、strengths、weaknesses、recommendations、teacherFocus、confidence。语言简洁、专业，适合教师查看。',
          },
          {
            role: 'user',
            content: JSON.stringify(input),
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        return this.buildStudentInsightFallback(input);
      }

      return this.parseStudentInsight(raw, input);
    } catch (error) {
      this.logger.error(
        `Student insight failed, using fallback: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.buildStudentInsightFallback(input);
    }
  }

  async streamMathQuestion(
    input: MathQuestionInput,
    handlers: StreamHandlers,
  ): Promise<StructuredAiAnswer> {
    handlers.onStart?.();

    if (!this.client) {
      const fallback = this.buildFallback(input);
      const rawText = JSON.stringify(fallback, null, 2);
      this.emitChunkedText(rawText, handlers.onChunk);
      handlers.onComplete?.(fallback, rawText);
      return fallback;
    }

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.3,
        max_tokens: 900,
        response_format: { type: 'json_object' },
        stream: true,
        messages: [
          {
            role: 'system',
            content: buildMathQaSystemPrompt(input),
          },
          {
            role: 'user',
            content: buildMathQaUserPrompt(input),
          },
        ],
      });

      let rawText = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (!content) {
          continue;
        }

        rawText += content;
        handlers.onChunk?.(content);
      }

      const answer = rawText
        ? this.parseStructuredAnswer(rawText, input.originalQuestion)
        : this.buildFallback(input);

      handlers.onComplete?.(answer, rawText);
      return answer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI stream failed';
      this.logger.error(`AI stream failed, using fallback: ${message}`);
      handlers.onError?.(message);

      const fallback = this.buildFallback(
        input,
        'AI 流式服务暂时不可用，本次返回的是基础回退讲解。',
      );
      const rawText = JSON.stringify(fallback, null, 2);
      this.emitChunkedText(rawText, handlers.onChunk);
      handlers.onComplete?.(fallback, rawText);
      return fallback;
    }
  }

  private async answerMathQuestionFromImage(
    input: MathQuestionInput,
  ): Promise<StructuredAiAnswer> {
    if (!this.visionClient) {
      return this.buildFallback(
        input,
        '当前未配置可用的视觉模型，本次先返回基础讲解。',
      );
    }
    if (!input.imageDataUrl) {
      return this.buildFallback(input, '未收到可识别的图片内容，本次先返回基础讲解。');
    }

    try {
      const content: ChatCompletionContentPart[] = [
        {
          type: 'image_url',
          image_url: { url: input.imageDataUrl },
        },
        {
          type: 'text',
          text: [
            '你是一名小学数学讲题老师。请结合图片题目直接给出结构化讲解，并尽量返回 JSON。',
            '字段必须包含 originalQuestion、steps、finalAnswer、knowledgePoints、difficulty、riskNotice、similarQuestions。',
            '讲解要短：steps 最多 4 步，每步不超过 45 个汉字；knowledgePoints 最多 3 个；similarQuestions 只给 1 道。',
            `年级：${input.grade ?? '未知'}`,
            `题型：${input.questionType ?? '未指定'}`,
            `补充提示：${input.manualHint?.trim() || input.originalQuestion || '无'}`,
            input.options?.length ? `选项：${input.options.join('；')}` : '无额外选项',
            '请直接根据图片内容讲题，不要只做 OCR 摘抄。',
            '如果无法严格返回 JSON，也至少给出完整题意理解、分步骤讲解、最终答案和知识点。',
          ].join('\n'),
        },
      ];
      const request: ChatCompletionCreateParamsNonStreaming = {
        model: this.visionModel,
        temperature: 0.3,
        max_tokens: 900,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      };
      const completion = await this.visionClient.chat.completions.create(request);

      const raw = completion.choices[0]?.message?.content ?? '';
      if (!raw) {
        return this.buildFallback(input, '视觉模型未返回可用讲解，本次先返回基础讲解。');
      }

      return this.parseStructuredAnswer(raw, input.originalQuestion || '图片数学题');
    } catch (error) {
      this.logger.error(
        `Image math answer failed, using fallback: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.buildFallback(input, '图片讲题暂时失败，本次先返回基础讲解。');
    }
  }

  private buildFallback(
    input: MathQuestionInput,
    riskNotice?: string,
  ): StructuredAiAnswer {
    return {
      originalQuestion: input.originalQuestion,
      steps: [
        '先认真审题，找出题目里的已知条件和问题。',
        '再判断这道题更适合用哪一种运算或解题方法。',
        '按顺序一步一步计算，不要跳步骤。',
        '最后把答案代回题目里检查是否合理。',
      ],
      finalAnswer: '当前返回的是基础回退讲解，连接正式模型后会给出更完整的分步解析。',
      knowledgePoints: ['四则运算', '应用题理解'],
      difficulty: input.grade && input.grade >= 5 ? 'MEDIUM' : 'EASY',
      riskNotice:
        riskNotice ?? '当前未连接可用模型或结构化解析失败，因此返回了基础回退讲解。',
      similarQuestions: [
        '把题目中的数字换一组，再独立做一遍。',
        '再做一道同类型基础题，检查自己是否真正理解了步骤。',
      ],
    };
  }

  private buildOcrFallback(
    input: OcrExtractionInput,
    note: string,
  ): OcrExtractionResult {
    const normalizedText = input.manualHint?.trim() || '';
    return {
      recognizedText: normalizedText,
      confidence: normalizedText ? 0.35 : 0,
      questionType: input.questionType ?? 'SHORT_ANSWER',
      options: extractOptionsFromText(normalizedText),
      note,
      needsManualConfirmation: true,
    };
  }

  private buildStudentInsightFallback(
    input: StudentLearningInsightInput,
  ): StudentLearningInsight {
    const weaknesses =
      input.weakKnowledgePoints.length > 0
        ? input.weakKnowledgePoints.map((item) => `${item} 需要继续巩固`)
        : ['当前练习样本较少，暂时无法稳定识别薄弱知识点'];

    const strengths =
      input.accuracyRate >= 85
        ? ['基础练习完成较稳定', '最近正确率保持在较好水平']
        : input.accuracyRate >= 60
          ? ['已有部分知识点掌握较稳定']
          : ['能够持续完成练习，具备继续提升的基础'];

    const recommendations =
      input.unresolvedWrongCount > 0
        ? ['建议先完成错题复习，再进入相似题巩固。', '优先处理最近重复出错的题目。']
        : ['建议继续保持本周练习频率，逐步扩大题量覆盖。'];

    return {
      summary:
        input.unresolvedWrongCount > 0
          ? `${input.studentName} 当前仍有 ${input.unresolvedWrongCount} 道待复习错题，薄弱点主要集中在 ${input.weakKnowledgePoints[0] ?? '近期错题涉及的知识点'}。`
          : `${input.studentName} 当前整体练习状态较稳定，可以继续通过专项练习提升掌握度。`,
      strengths,
      weaknesses,
      recommendations,
      teacherFocus: [
        '先检查学生是否真正理解题意，而不是只记住答案。',
        '结合错题讲解与相似题训练，观察是否能独立完成。',
      ],
      confidence:
        input.totalQuestions >= 12 ? 'HIGH' : input.totalQuestions >= 5 ? 'MEDIUM' : 'LOW',
    };
  }

  private parseStructuredAnswer(
    rawText: string,
    originalQuestion: string,
  ): StructuredAiAnswer {
    try {
      return this.normalizeStructuredAnswer(
        JSON.parse(rawText) as Partial<StructuredAiAnswer>,
        originalQuestion,
      );
    } catch {
      this.logger.warn('AI returned non-JSON content, using plain-text fallback parsing.');
      return this.buildStructuredTextFallback(rawText, originalQuestion);
    }
  }

  private buildStructuredTextFallback(
    rawText: string,
    originalQuestion: string,
  ): StructuredAiAnswer {
    const normalizedText = rawText.trim();
    const lines = normalizedText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!normalizedText) {
      return this.buildFallback(
        { originalQuestion },
        'AI 返回内容为空，本次展示的是安全回退讲解。',
      );
    }

    const stepLines = lines.filter((line) =>
      /(^第.+步)|(^步骤)|(^先)|(^再)|(^然后)|(^最后)/.test(line),
    );

    return {
      originalQuestion,
      steps: stepLines.length > 0 ? stepLines : lines.slice(0, 4),
      finalAnswer: lines.at(-1) ?? normalizedText,
      knowledgePoints: ['图片题意理解', '数学问题分析'],
      difficulty: 'MEDIUM',
      riskNotice:
        '本次结果由多模态模型直接生成，并按纯文本结果兜底解析，建议人工确认后再继续练习。',
      similarQuestions: ['可以基于这道题继续生成一题同类型练习。'],
    };
  }

  private parseOcrExtraction(
    rawText: string,
    input: OcrExtractionInput,
  ): OcrExtractionResult {
    try {
      const parsed = JSON.parse(rawText) as Partial<OcrExtractionResult>;
      const recognizedText =
        typeof parsed.recognizedText === 'string'
          ? parsed.recognizedText.trim()
          : input.manualHint?.trim() || '';
      const confidence =
        typeof parsed.confidence === 'number'
          ? Math.max(0, Math.min(1, parsed.confidence))
          : recognizedText
            ? 0.7
            : 0;
      const options = Array.isArray(parsed.options)
        ? parsed.options.filter(
            (item): item is string => typeof item === 'string' && Boolean(item.trim()),
          )
        : extractOptionsFromText(recognizedText);

      return {
        recognizedText,
        confidence,
        questionType:
          parsed.questionType &&
          ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'SHORT_ANSWER'].includes(
            parsed.questionType,
          )
            ? parsed.questionType
            : input.questionType ?? (options.length > 0 ? 'SINGLE_CHOICE' : 'SHORT_ANSWER'),
        options,
        note:
          typeof parsed.note === 'string' && parsed.note
            ? parsed.note
            : '请先确认识别结果是否正确，再继续进入 AI 讲题。',
        needsManualConfirmation:
          typeof parsed.needsManualConfirmation === 'boolean'
            ? parsed.needsManualConfirmation
            : true,
      };
    } catch {
      const recognizedText = rawText.trim();

      if (!recognizedText) {
        return this.buildOcrFallback(input, '图片识别结果解析失败，请人工确认后继续。');
      }

      return {
        recognizedText,
        confidence: 0.45,
        questionType: input.questionType ?? 'SHORT_ANSWER',
        options: extractOptionsFromText(recognizedText),
        note: '模型未严格按 JSON 返回，系统已先保留识别文本，请人工确认后继续。',
        needsManualConfirmation: true,
      };
    }
  }

  private parseStudentInsight(
    rawText: string,
    input: StudentLearningInsightInput,
  ): StudentLearningInsight {
    try {
      const parsed = JSON.parse(rawText) as Partial<StudentLearningInsight>;
      return {
        summary:
          typeof parsed.summary === 'string' && parsed.summary
            ? parsed.summary
            : this.buildStudentInsightFallback(input).summary,
        strengths: Array.isArray(parsed.strengths)
          ? parsed.strengths.filter((item): item is string => typeof item === 'string')
          : [],
        weaknesses: Array.isArray(parsed.weaknesses)
          ? parsed.weaknesses.filter((item): item is string => typeof item === 'string')
          : [],
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter((item): item is string => typeof item === 'string')
          : [],
        teacherFocus: Array.isArray(parsed.teacherFocus)
          ? parsed.teacherFocus.filter((item): item is string => typeof item === 'string')
          : [],
        confidence:
          parsed.confidence === 'LOW' ||
          parsed.confidence === 'MEDIUM' ||
          parsed.confidence === 'HIGH'
            ? parsed.confidence
            : 'MEDIUM',
      };
    } catch {
      return this.buildStudentInsightFallback(input);
    }
  }

  private emitChunkedText(text: string, onChunk?: (chunk: string) => void) {
    if (!onChunk) {
      return;
    }

    const chunks = text.match(/.{1,40}/g) ?? [text];
    for (const chunk of chunks) {
      onChunk(chunk);
    }
  }

  private normalizeStringList(value: unknown, maxItems: number, maxLength: number) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .map((item) => item.trim().slice(0, maxLength))
      .slice(0, maxItems);
  }

  private normalizeText(value: unknown, fallback: string, maxLength: number) {
    if (typeof value !== 'string' || !value.trim()) {
      return fallback;
    }

    return value.trim().slice(0, maxLength);
  }

  private normalizeStructuredAnswer(
    answer: Partial<StructuredAiAnswer>,
    originalQuestion: string,
  ): StructuredAiAnswer {
    const steps = this.normalizeStringList(answer.steps, 8, 500);
    const knowledgePoints = this.normalizeStringList(answer.knowledgePoints, 8, 80);
    const similarQuestions = this.normalizeStringList(answer.similarQuestions, 5, 300);

    const difficulty =
      answer.difficulty === 'EASY' ||
      answer.difficulty === 'MEDIUM' ||
      answer.difficulty === 'HARD'
        ? answer.difficulty
        : 'EASY';

    return {
      originalQuestion: this.normalizeText(answer.originalQuestion, originalQuestion, 3000),
      steps:
        steps.length > 0
          ? steps
          : ['先审题，再按顺序一步一步解题，最后检查答案是否合理。'],
      finalAnswer: this.normalizeText(
        answer.finalAnswer,
        '暂时无法稳定解析这道题，请换一种更清晰的表述再试试。',
        1000,
      ),
      knowledgePoints: knowledgePoints.length > 0 ? knowledgePoints : ['基础数学思维'],
      difficulty,
      riskNotice: this.normalizeText(
        answer.riskNotice,
        '本次结果经过结构化兜底处理，建议结合题目再做一次检查。',
        500,
      ),
      similarQuestions:
        similarQuestions.length > 0
          ? similarQuestions
          : ['后续系统会根据知识点推荐相似练习。'],
      refused: this.isRefusedAnswer(answer),
    };
  }

  private isRefusedAnswer(answer: Partial<StructuredAiAnswer>): boolean {
    const refusedPatterns = [
      '不太适合在这里讨论',
      '不适合小学生',
      '超出辅导范围',
      '不适合在这里讨论',
      '请换一道与学习相关的问题',
    ];
    const stepText = Array.isArray(answer.steps) ? answer.steps.join('') : '';
    const riskText = typeof answer.riskNotice === 'string' ? answer.riskNotice : '';
    const combined = stepText + riskText;
    return refusedPatterns.some((pattern) => combined.includes(pattern));
  }

}

export function extractOptionsFromText(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[A-DＡ-Ｄ][.、\s]/i.test(line));
}
