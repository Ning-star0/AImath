import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
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
}

interface MathQuestionInput {
  originalQuestion: string;
  grade?: number;
  context?: Record<string, unknown>;
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

@Injectable()
export class OpenAiClient {
  private readonly logger = new Logger(OpenAiClient.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('openai.apiKey');
    const baseURL = this.configService.get<string>('openai.baseUrl');
    this.model = this.configService.get<string>('openai.model', 'gpt-4o-mini');

    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL,
        })
      : null;
  }

  async answerMathQuestion(input: MathQuestionInput): Promise<StructuredAiAnswer> {
    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY 未配置，返回本地占位答案。');
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
        `AI 调用失败，回退到本地答案：${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return this.buildFallback(input, 'AI 服务暂时不可用，本次返回的是本地回退答案。');
    }
  }

  async analyzeStudentLearningProfile(
    input: StudentLearningInsightInput,
  ): Promise<StudentLearningInsight> {
    if (!this.client) {
      this.logger.warn('OPENAI_API_KEY 未配置，返回本地学生学情分析结果。');
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
              '你是一名小学数学教研分析助手。请根据学生做题表现输出结构化 JSON，字段必须包含 summary、strengths、weaknesses、recommendations、teacherFocus、confidence。语言简洁、专业、适合教师查看。',
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
        `学生学情分析失败，回退到本地结果：${error instanceof Error ? error.message : 'unknown error'}`,
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
      const message =
        error instanceof Error ? error.message : 'AI 流式调用失败';
      this.logger.error(`AI 流式调用失败，回退到本地答案：${message}`);
      handlers.onError?.(message);

      const fallback = this.buildFallback(
        input,
        'AI 流式服务暂时不可用，本次返回的是本地回退答案。',
      );
      const rawText = JSON.stringify(fallback, null, 2);
      this.emitChunkedText(rawText, handlers.onChunk);
      handlers.onComplete?.(fallback, rawText);
      return fallback;
    }
  }

  private buildFallback(
    input: MathQuestionInput,
    riskNotice?: string,
  ): StructuredAiAnswer {
    return {
      originalQuestion: input.originalQuestion,
      steps: [
        '先认真读题，找出题目里给出的数字、条件和问题。',
        '再判断这道题更适合用哪一种运算或解题方法。',
        '按照顺序一步一步计算，避免跳步骤。',
        '最后把答案代回题目里检查，看是否合理。',
      ],
      finalAnswer: '当前返回的是本地回退答案，正式 AI 解析会在配置好模型后生效。',
      knowledgePoints: ['四则运算', '应用题理解'],
      difficulty: input.grade && input.grade >= 5 ? 'MEDIUM' : 'EASY',
      riskNotice:
        riskNotice ??
        '当前未连接可用模型或结构化解析失败，因此返回了保守的回退答案。',
      similarQuestions: [
        '相似题占位：再做一道同类型的基础练习题。',
        '相似题占位：把题目里的数字换一组再试一遍。',
      ],
    };
  }

  private buildStudentInsightFallback(
    input: StudentLearningInsightInput,
  ): StudentLearningInsight {
    const weaknesses =
      input.weakKnowledgePoints.length > 0
        ? input.weakKnowledgePoints.map((item) => `${item}需要继续巩固`)
        : ['当前练习样本较少，暂时无法稳定识别薄弱知识点'];

    const strengths =
      input.accuracyRate >= 85
        ? ['基础练习完成较稳定', '最近正确率保持在较好水平']
        : input.accuracyRate >= 60
          ? ['已有部分知识点掌握较稳定']
          : ['能够持续完成练习，具备继续提升的基础'];

    const recommendations =
      input.unresolvedWrongCount > 0
        ? ['建议先完成错题复习，再进入相似题巩固', '优先处理最近重复出错的题目']
        : ['建议继续保持本周练习频率，逐步扩大题量覆盖'];

    return {
      summary:
        input.unresolvedWrongCount > 0
          ? `${input.studentName}当前仍有 ${input.unresolvedWrongCount} 道待复习错题，薄弱点主要集中在${input.weakKnowledgePoints[0] ?? '近期错题涉及的知识点'}。`
          : `${input.studentName}当前整体练习状态较稳定，可以继续通过专项练习提升掌握度。`,
      strengths,
      weaknesses,
      recommendations,
      teacherFocus: [
        '先检查学生是否真正理解题意，而不只是记住答案',
        '结合错题讲解与相似题训练观察是否能独立完成',
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
      this.logger.warn('AI 返回 JSON 解析失败，回退到占位答案。');
      return this.buildFallback(
        { originalQuestion },
        'AI 返回内容解析失败，本次展示的是安全回退答案。',
      );
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
          parsed.confidence === 'LOW' || parsed.confidence === 'MEDIUM' || parsed.confidence === 'HIGH'
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

  private normalizeStructuredAnswer(
    answer: Partial<StructuredAiAnswer>,
    originalQuestion: string,
  ): StructuredAiAnswer {
    const steps = Array.isArray(answer.steps)
      ? answer.steps.filter((item): item is string => typeof item === 'string')
      : [];

    const knowledgePoints = Array.isArray(answer.knowledgePoints)
      ? answer.knowledgePoints.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];

    const similarQuestions = Array.isArray(answer.similarQuestions)
      ? answer.similarQuestions.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];

    const difficulty =
      answer.difficulty === 'EASY' ||
      answer.difficulty === 'MEDIUM' ||
      answer.difficulty === 'HARD'
        ? answer.difficulty
        : 'EASY';

    return {
      originalQuestion:
        typeof answer.originalQuestion === 'string' && answer.originalQuestion
          ? answer.originalQuestion
          : originalQuestion,
      steps:
        steps.length > 0
          ? steps
          : ['先审题，再按顺序一步一步解题，最后检查答案是否合理。'],
      finalAnswer:
        typeof answer.finalAnswer === 'string' && answer.finalAnswer
          ? answer.finalAnswer
          : '暂时无法稳定解析这道题，请换一种更清晰的表述再试试。',
      knowledgePoints:
        knowledgePoints.length > 0 ? knowledgePoints : ['基础数学思维'],
      difficulty,
      riskNotice:
        typeof answer.riskNotice === 'string' && answer.riskNotice
          ? answer.riskNotice
          : '本次结果经过结构化兜底处理，建议结合题目再做一次检查。',
      similarQuestions:
        similarQuestions.length > 0
          ? similarQuestions
          : ['相似题占位：后续系统会根据知识点推荐相似练习。'],
    };
  }
}
