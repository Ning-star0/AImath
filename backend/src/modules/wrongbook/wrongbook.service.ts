import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ArchiveWrongQuestionDto } from './dto/archive-wrong-question.dto';
import { QueryWrongbookDto } from './dto/query-wrongbook.dto';
import { RetryWrongQuestionDto } from './dto/retry-wrong-question.dto';
import { StudentMemoryService } from '../../shared/student-memory/student-memory.service';
import { judgeAnswer } from '../../shared/utils/answer-utils';

interface AuthUser {
  id: string;
  role: Role;
  student?: { id: string; grade: number } | null;
}

@Injectable()
export class WrongbookService {
  private readonly logger = new Logger(WrongbookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly studentMemoryService: StudentMemoryService,
  ) {}

  async list(user: AuthUser, query: QueryWrongbookDto) {
    const where: Prisma.WrongQuestionWhereInput = {
      userId: user.id,
      ...(query.knowledgePointId ? { knowledgePointId: query.knowledgePointId } : {}),
      ...(query.unresolvedOnly ? { resolved: false } : {}),
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...((query.grade || query.questionType)
        ? {
            question: {
              ...(query.grade ? { grade: query.grade } : {}),
              ...(query.questionType ? { questionType: query.questionType as QuestionType } : {}),
            },
          }
        : {}),
    };

    const wrongQuestions = await this.prisma.wrongQuestion.findMany({
      where,
      include: {
        question: true,
        knowledgePoint: true,
      },
      orderBy: [{ archivedAt: 'asc' }, { resolved: 'asc' }, { updatedAt: 'desc' }],
    });

    return {
      list: wrongQuestions.map((item) => ({
        id: item.id,
        questionId: item.questionId,
        questionTitle: item.question.title,
        questionStem: item.question.stem,
        questionType: item.question.questionType,
        grade: item.question.grade,
        wrongCount: item.wrongCount,
        resolved: item.resolved,
        lastWrongAnswer: item.lastWrongAnswer,
        reviewStatus: item.reviewStatus,
        archivedAt: item.archivedAt,
        knowledgePoint: item.knowledgePoint
          ? {
              id: item.knowledgePoint.id,
              name: item.knowledgePoint.name,
              code: item.knowledgePoint.code,
            }
          : null,
        retryEntry: {
          action: 'RETRY',
          path: '/student/practice',
          questionId: item.questionId,
        },
        options: item.question.options,
        updatedAt: item.updatedAt,
      })),
      total: wrongQuestions.length,
    };
  }

  async stats(user: AuthUser) {
    const wrongQuestions = await this.prisma.wrongQuestion.findMany({
      where: {
        userId: user.id,
        archivedAt: null,
      },
      include: {
        knowledgePoint: true,
        question: true,
      },
    });

    const archivedCount = await this.prisma.wrongQuestion.count({
      where: {
        userId: user.id,
        NOT: {
          archivedAt: null,
        },
      },
    });

    if (wrongQuestions.length === 0) {
      return {
        totalWrongQuestions: 0,
        unresolvedCount: 0,
        resolvedCount: 0,
        archivedCount,
        groupedByKnowledgePoint: [],
        groupedByQuestionType: [],
      };
    }

    const groupedMap = new Map<string, { knowledgePointId: string; knowledgePointName: string; count: number }>();
    for (const item of wrongQuestions) {
      const key = item.knowledgePoint?.id ?? 'unknown';
      const current = groupedMap.get(key);
      groupedMap.set(key, {
        knowledgePointId: item.knowledgePoint?.id ?? 'unknown',
        knowledgePointName: item.knowledgePoint?.name ?? '未分类知识点',
        count: (current?.count ?? 0) + 1,
      });
    }

    return {
      totalWrongQuestions: wrongQuestions.length,
      unresolvedCount: wrongQuestions.filter((item) => !item.resolved).length,
      resolvedCount: wrongQuestions.filter((item) => item.resolved).length,
      archivedCount,
      groupedByKnowledgePoint: [...groupedMap.values()],
      groupedByQuestionType: this.groupByQuestionType(wrongQuestions.map((item) => item.question.questionType)),
    };
  }

  async retry(user: AuthUser, wrongQuestionId: string, payload: RetryWrongQuestionDto) {
    const wrongQuestion = await this.prisma.wrongQuestion.findFirst({
      where: {
        id: wrongQuestionId,
        userId: user.id,
      },
      include: {
        question: true,
      },
    });

    if (!wrongQuestion) {
      throw new NotFoundException('错题记录不存在。');
    }

    const judgement = judgeAnswer({
      questionType: wrongQuestion.question.questionType,
      correctAnswer: wrongQuestion.question.answer,
      studentAnswer: payload.answer,
    });
    const resolved = judgement.isCorrect;

    if (resolved) {
      await this.prisma.wrongQuestion.delete({
        where: { id: wrongQuestion.id },
      });

      if (user.student?.id) {
        await this.refreshStudentMemorySafely(user.student.id, wrongQuestion.question.subject);
      }

      return {
        id: wrongQuestion.id,
        resolved: true,
        removedFromWrongbook: true,
        studentAnswer: payload.answer,
        correctAnswer: judgement.normalizedCorrectAnswer,
        nextAction: '这道题已经做对，已从错题本中移除。',
      };
    }

    const updatedWrongQuestion = await this.prisma.wrongQuestion.update({
      where: { id: wrongQuestion.id },
      data: {
        resolved: false,
        lastWrongAnswer: payload.answer,
        wrongCount: {
          increment: 1,
        },
        reviewStatus: 'RETRY_REQUIRED',
      },
    });

    if (user.student?.id) {
      await this.refreshStudentMemorySafely(user.student.id, wrongQuestion.question.subject);
    }

    return {
      id: updatedWrongQuestion.id,
      resolved: false,
      removedFromWrongbook: false,
      studentAnswer: payload.answer,
      correctAnswer: judgement.normalizedCorrectAnswer,
      nextAction: '建议继续重练，并结合解析再次理解题意。',
    };
  }

  async archive(user: AuthUser, wrongQuestionId: string, payload: ArchiveWrongQuestionDto) {
    const wrongQuestion = await this.prisma.wrongQuestion.findFirst({
      where: {
        id: wrongQuestionId,
        userId: user.id,
      },
      include: {
        question: {
          select: {
            subject: true,
          },
        },
      },
    });

    if (!wrongQuestion) {
      throw new NotFoundException('错题记录不存在。');
    }

    const updatedWrongQuestion = await this.prisma.wrongQuestion.update({
      where: { id: wrongQuestion.id },
      data: {
        archivedAt: new Date(),
        reviewStatus: payload.reason ? `ARCHIVED:${payload.reason}` : 'ARCHIVED',
      },
    });

    if (user.student?.id) {
      await this.refreshStudentMemorySafely(user.student.id, wrongQuestion.question.subject);
    }

    return {
      id: updatedWrongQuestion.id,
      archivedAt: updatedWrongQuestion.archivedAt,
      reviewStatus: updatedWrongQuestion.reviewStatus,
      message: '错题已归档，后续如需复习可重新加入练习。',
    };
  }

  private groupByQuestionType(questionTypes: QuestionType[]) {
    const typeMap = new Map<QuestionType, number>();

    for (const questionType of questionTypes) {
      typeMap.set(questionType, (typeMap.get(questionType) ?? 0) + 1);
    }

    return [...typeMap.entries()].map(([questionType, count]) => ({
      questionType,
      count,
    }));
  }

  private async refreshStudentMemorySafely(studentId: string, subject: string | null) {
    try {
      await this.studentMemoryService.refreshStudentMemory({
        studentId,
        subject,
        eventType: 'WRONGBOOK_UPDATE',
      });
    } catch (error) {
      this.logger.warn(
        `错题状态已更新，但学生记忆刷新失败：${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}
