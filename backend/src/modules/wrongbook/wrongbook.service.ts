import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ArchiveWrongQuestionDto } from './dto/archive-wrong-question.dto';
import { QueryWrongbookDto } from './dto/query-wrongbook.dto';
import { RetryWrongQuestionDto } from './dto/retry-wrong-question.dto';

interface AuthUser {
  id: string;
  role: Role;
  student?: { id: string; grade: number } | null;
}

@Injectable()
export class WrongbookService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, query: QueryWrongbookDto) {
    const where: Prisma.WrongQuestionWhereInput = {
      userId: user.id,
      ...(query.knowledgePointId
        ? { knowledgePointId: query.knowledgePointId }
        : {}),
      ...(query.unresolvedOnly ? { resolved: false } : {}),
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...((query.grade || query.questionType)
        ? {
            question: {
              ...(query.grade ? { grade: query.grade } : {}),
              ...(query.questionType
                ? { questionType: query.questionType as QuestionType }
                : {}),
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

    if (wrongQuestions.length === 0) {
      return {
        list: [
          {
            id: 'demo-wrong-1',
            questionId: 'demo-question-1',
            questionTitle: '三年级加法应用题',
            questionStem: '小明有 12 支铅笔，又买了 8 支，现在一共有多少支？',
            wrongCount: 2,
            resolved: false,
            lastWrongAnswer: '18',
            archivedAt: null,
            questionType: 'SHORT_ANSWER',
            grade: 3,
            knowledgePoint: {
              id: 'demo-kp-1',
              name: '万以内加法',
              code: 'GRADE3-ADD-001',
            },
            retryEntry: {
              action: 'RETRY',
              path: '/student/practice',
              questionId: 'demo-question-1',
            },
          },
        ],
        total: 1,
      };
    }

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
        totalWrongQuestions: 1,
        unresolvedCount: 1,
        resolvedCount: 0,
        groupedByKnowledgePoint: [
          {
            knowledgePointId: 'demo-kp-1',
            knowledgePointName: '万以内加法',
            count: 1,
          },
        ],
        groupedByQuestionType: [
          {
            questionType: 'SHORT_ANSWER',
            count: 1,
          },
        ],
      };
    }

    const groupedMap = new Map<string, { knowledgePointId: string; knowledgePointName: string; count: number }>();
    for (const item of wrongQuestions) {
      const key = item.knowledgePoint?.id ?? 'unknown';
      const current = groupedMap.get(key);
      const next = {
        knowledgePointId: item.knowledgePoint?.id ?? 'unknown',
        knowledgePointName: item.knowledgePoint?.name ?? '未分类知识点',
        count: (current?.count ?? 0) + 1,
      };
      groupedMap.set(key, next);
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
      throw new NotFoundException('错题记录不存在');
    }

    const normalizedStudentAnswer = payload.answer.replace(/\s+/g, '').trim().toUpperCase();
    const normalizedCorrectAnswer =
      wrongQuestion.question.answer.replace(/\s+/g, '').trim().toUpperCase();
    const resolved = normalizedStudentAnswer === normalizedCorrectAnswer;

    const updatedWrongQuestion = await this.prisma.wrongQuestion.update({
      where: { id: wrongQuestion.id },
      data: {
        resolved,
        lastWrongAnswer: payload.answer,
        reviewStatus: resolved ? 'MASTERED' : 'RETRY_REQUIRED',
      },
    });

    return {
      id: updatedWrongQuestion.id,
      resolved,
      studentAnswer: payload.answer,
      correctAnswer: wrongQuestion.question.answer,
      nextAction: resolved ? '已掌握，可移出重点复习列表。' : '建议继续重练并查看解析。',
    };
  }

  async archive(
    user: AuthUser,
    wrongQuestionId: string,
    payload: ArchiveWrongQuestionDto,
  ) {
    const wrongQuestion = await this.prisma.wrongQuestion.findFirst({
      where: {
        id: wrongQuestionId,
        userId: user.id,
      },
    });

    if (!wrongQuestion) {
      throw new NotFoundException('错题记录不存在');
    }

    const updatedWrongQuestion = await this.prisma.wrongQuestion.update({
      where: { id: wrongQuestion.id },
      data: {
        archivedAt: new Date(),
        reviewStatus: payload.reason
          ? `ARCHIVED:${payload.reason}`
          : 'ARCHIVED',
      },
    });

    return {
      id: updatedWrongQuestion.id,
      archivedAt: updatedWrongQuestion.archivedAt,
      reviewStatus: updatedWrongQuestion.reviewStatus,
      message: '错题已归档，可在需要时重新纳入复习。',
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
}
