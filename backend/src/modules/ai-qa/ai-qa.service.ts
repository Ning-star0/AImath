import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OpenAiClient,
  StructuredAiAnswer,
} from '../../shared/ai/openai.client';
import { AskAiDto } from './dto/ask-ai.dto';

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
  ) {}

  async ask(user: AuthUser, payload: AskAiDto) {
    const answer = await this.openAiClient.answerMathQuestion({
      originalQuestion: payload.originalQuestion,
      grade: payload.grade,
      context: {
        ...(payload.context ?? {}),
        fromOcr: payload.fromOcr ?? false,
        questionType: payload.questionType ?? null,
        options: payload.options ?? [],
      },
    });

    const persistedRecord = await this.persistAnswer(user, payload, answer);

    return {
      ...answer,
      recordId: persistedRecord?.id ?? null,
      ocrPlaceholder: {
        enabled: false,
        status: 'RESERVED',
        note: '图片 OCR 接口将在后续阶段接入，这里先保留统一扩展位。',
      },
    };
  }

  async stream(user: AuthUser, payload: AskAiDto, response: SseResponse) {
    this.setupSseResponse(response);
    this.writeEvent(response, 'status', {
      stage: 'started',
      message: 'AI 正在审题，请稍候。',
    });

    this.writeEvent(response, 'status', {
      stage: 'thinking',
      message: '正在理解题意并整理解题步骤。',
    });

    const answer = await this.openAiClient.answerMathQuestion({
      originalQuestion: payload.originalQuestion,
      grade: payload.grade,
      context: {
        ...(payload.context ?? {}),
        fromOcr: payload.fromOcr ?? false,
        questionType: payload.questionType ?? null,
        options: payload.options ?? [],
      },
    });

    await this.emitPreview(response, answer);

    const persistedRecord = await this.persistAnswer(user, payload, answer);

    this.writeEvent(response, 'result', {
      ...answer,
      recordId: persistedRecord?.id ?? null,
      ocrPlaceholder: {
        enabled: false,
        status: 'RESERVED',
        note: '图片 OCR 接口将在后续阶段接入，这里先保留统一扩展位。',
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
            ocrStatus: payload.fromOcr ? 'RESERVED' : 'NOT_USED',
            questionType: payload.questionType ?? null,
            options: payload.options ?? [],
          } as Prisma.InputJsonValue,
          parsedResult: {
            ...answer,
            promptVersion: 'stage-4-v2',
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

  private async emitPreview(
    response: SseResponse,
    answer: StructuredAiAnswer,
  ) {
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
