import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  type OcrExtractionResult,
  OpenAiClient,
  StructuredAiAnswer,
  extractOptionsFromText,
} from '../../shared/ai/openai.client';
import { StudentMemoryService } from '../../shared/student-memory/student-memory.service';
import { AskAiDto } from './dto/ask-ai.dto';
import { OcrPreviewDto } from './dto/ocr-preview.dto';

interface AuthUser {
  id: string;
  student?: { id: string } | null;
}

interface SseResponse {
  status: (code: number) => void;
  setHeader: (name: string, value: string) => void;
  flushHeaders: () => void;
  write: (chunk: string) => void;
  end: () => void;
}

@Injectable()
export class AiQaService {
  private readonly logger = new Logger(AiQaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiClient: OpenAiClient,
    private readonly studentMemoryService: StudentMemoryService,
  ) {}

  async ask(user: AuthUser, payload: AskAiDto) {
    const answer = await this.openAiClient.answerMathQuestion({
      originalQuestion: payload.originalQuestion,
      grade: payload.grade,
      imageDataUrl: payload.imageDataUrl,
      manualHint: payload.manualHint,
      questionType: payload.questionType,
      options: payload.options,
      context: {
        ...(payload.context ?? {}),
        fromOcr: payload.fromOcr ?? false,
        questionType: payload.questionType ?? null,
        options: payload.options ?? [],
      },
    });

    const persistedRecord = await this.persistAnswer(user, payload, answer);

    if (user.student?.id) {
      await this.studentMemoryService.refreshStudentMemory({
        studentId: user.student.id,
        subject: payload.context?.subject as string | undefined,
        eventType: 'AI_QA',
      });
    }

    return {
      ...answer,
      recordId: persistedRecord?.id ?? null,
      ocrPlaceholder: {
        enabled: true,
        status: payload.fromOcr ? 'USED' : 'NOT_USED',
        note: payload.fromOcr
          ? '本次讲题已使用图片识题结果。'
          : '当前题目由文本输入发起，未经过图片识题。',
      },
    };
  }

  async ocrPreview(user: AuthUser, payload: OcrPreviewDto) {
    const manualText = payload.manualText?.trim() ?? '';
    const normalizedQuestionType = payload.questionType?.trim() || 'SHORT_ANSWER';
    const hasImage = Boolean(payload.imageDataUrl?.trim());

    let extracted: OcrExtractionResult;

    if (hasImage) {
      extracted = await this.openAiClient.extractMathQuestionFromImage({
        imageDataUrl: payload.imageDataUrl!.trim(),
        manualHint: manualText || undefined,
        questionType: normalizedQuestionType,
        grade: payload.grade,
      });
    } else {
      extracted = {
        recognizedText: manualText,
        confidence: manualText ? 0.4 : 0,
        questionType: normalizedQuestionType,
        options: extractOptionsFromText(manualText),
        needsManualConfirmation: true,
        note: manualText
          ? '当前未上传图片，已按手动输入内容生成待确认题干。'
          : '请先上传题目图片，或手动补充题干后再继续识题。',
      };
    }

    await this.prisma.systemLog.create({
      data: {
        actorUserId: user.id,
        module: 'AI_QA',
        action: 'OCR_PREVIEW',
        targetType: 'OcrPreview',
        message: hasImage ? '已完成一次图片识题预览。' : '已生成一次手动题干预览。',
        payload: {
          imageName: payload.imageName ?? null,
          usedImage: hasImage,
          questionType: extracted.questionType,
          recognizedLength: extracted.recognizedText.length,
          optionCount: extracted.options.length,
          confidence: extracted.confidence,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      status: extracted.recognizedText ? 'READY' : 'FAILED',
      imageName: payload.imageName ?? null,
      recognizedText: extracted.recognizedText,
      confidence: Number((extracted.confidence * 100).toFixed(0)) / 100,
      questionType: extracted.questionType,
      options: extracted.options,
      needsManualConfirmation: extracted.needsManualConfirmation,
      note: extracted.note,
    };
  }

  async stream(user: AuthUser, payload: AskAiDto, response: SseResponse) {
    this.setupSseResponse(response);
    this.writeEvent(response, 'status', {
      stage: 'started',
      message: 'AI 正在审题，请稍候。',
    });

    const hasImage = Boolean(payload.imageDataUrl?.trim());

    const input = {
      originalQuestion: payload.originalQuestion,
      grade: payload.grade,
      imageDataUrl: payload.imageDataUrl,
      manualHint: payload.manualHint,
      questionType: payload.questionType,
      options: payload.options,
      context: {
        ...(payload.context ?? {}),
        fromOcr: payload.fromOcr ?? false,
        questionType: payload.questionType ?? null,
        options: payload.options ?? [],
      },
    };

    let answer: StructuredAiAnswer;

    if (hasImage) {
      // Image mode: send heartbeat while waiting for vision API
      this.writeEvent(response, 'status', {
        stage: 'thinking',
        message: '正在识别图片中的题目内容...',
      });

      const heartbeat = setInterval(() => {
        this.writeEvent(response, 'status', {
          stage: 'thinking',
          message: '视觉模型正在分析题目，请耐心等待...',
        });
      }, 5000);

      try {
        answer = await this.openAiClient.answerMathQuestion(input);
      } finally {
        clearInterval(heartbeat);
      }

      await this.emitPreview(response, answer);
    } else {
      // Text mode: use true streaming
      this.writeEvent(response, 'status', {
        stage: 'thinking',
        message: '正在理解题意并整理解题步骤。',
      });

      answer = await this.openAiClient.streamMathQuestion(input, {
        onChunk: (chunk) => {
          this.writeEvent(response, 'chunk', { content: chunk });
        },
      });
    }

    const persistedRecord = await this.persistAnswer(user, payload, answer);

    if (user.student?.id) {
      await this.studentMemoryService.refreshStudentMemory({
        studentId: user.student.id,
        subject: payload.context?.subject as string | undefined,
        eventType: 'AI_QA',
      });
    }

    this.writeEvent(response, 'result', {
      ...answer,
      recordId: persistedRecord?.id ?? null,
      ocrPlaceholder: {
        enabled: true,
        status: payload.fromOcr ? 'USED' : 'NOT_USED',
        note: payload.fromOcr ? '本次讲题使用了图片识题结果。' : '本次讲题使用了文本输入。',
      },
    });
    this.writeEvent(response, 'done', { success: true });
    response.end();
  }

  private async persistAnswer(
    user: AuthUser,
    payload: AskAiDto,
    answer: StructuredAiAnswer,
  ) {
    try {
      return await this.prisma.aiQaRecord.create({
        data: {
          userId: user.id,
          studentId: user.student?.id ?? null,
          originalQuestion: payload.originalQuestion,
          finalAnswer: answer.finalAnswer,
          grade: payload.grade,
          sourceContext: {
            ...(payload.context ?? {}),
            fromOcr: payload.fromOcr ?? false,
            ocrStatus: payload.fromOcr ? 'USED' : 'NOT_USED',
            questionType: payload.questionType ?? null,
            options: payload.options ?? [],
          } as Prisma.InputJsonValue,
          parsedResult: {
            ...answer,
            promptVersion: 'stage-4-v3',
          } as Prisma.InputJsonValue,
          modelName: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          recommendedDrafts: {
            similarQuestions: answer.similarQuestions,
            recommendationStatus: 'PENDING',
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.warn(
        `AI 记录入库失败，已跳过持久化：${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  private setupSseResponse(response: SseResponse) {
    response.status(200);
    response.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders();
  }

  private writeEvent(response: SseResponse, event: string, data: unknown) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private async emitPreview(response: SseResponse, answer: StructuredAiAnswer) {
    const previewLines = [
      `我先来审题：${answer.originalQuestion}`,
      answer.knowledgePoints.length > 0
        ? `这道题主要考查：${answer.knowledgePoints.join('、')}`
        : '我先从基础运算和题意理解开始分析。',
      ...answer.steps.map((step, index) => `第 ${index + 1} 步：${step}`),
      `最后答案：${answer.finalAnswer}`,
    ];

    for (let index = 0; index < previewLines.length; index += 1) {
      const line = previewLines[index];
      this.writeEvent(response, 'chunk', {
        content: `${line}\n`,
      });
      this.writeEvent(response, 'status', {
        stage: 'streaming',
        message:
          index < previewLines.length - 1
            ? '正在整理讲解内容...'
            : '正在完成最后检查...',
      });
      await this.delay(80);
    }
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

}
