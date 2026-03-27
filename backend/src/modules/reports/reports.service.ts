import { Injectable } from '@nestjs/common';
import { Prisma, QuestionType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryReportDto } from './dto/query-report.dto';

interface AuthUser {
  id: string;
  role: Role;
  student?: { id: string; grade: number } | null;
}

type ExerciseDetailWithRelations = Prisma.ExerciseRecordDetailGetPayload<{
  include: {
    question: {
      include: {
        questionKnowledgeMaps: {
          include: {
            knowledgePoint: true;
          };
        };
      };
    };
    exerciseRecord: {
      select: {
        id: true;
        createdAt: true;
        submittedAt: true;
      };
    };
  };
}>;

type DrilldownItem = {
  questionId: string;
  title: string;
  stem: string;
  questionType: QuestionType;
  grade: number;
  difficulty: number;
  studentAnswer: string | null;
  correctAnswer: string | null;
  isCorrect: boolean;
  feedback: string | null;
  latestSubmittedAt: string;
  knowledgePoints: Array<{
    id: string;
    code: string;
    name: string;
  }>;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser, query: QueryReportDto) {
    const trendDays = query.trendDays ?? 7;
    const since = new Date();
    since.setDate(since.getDate() - (trendDays - 1));
    since.setHours(0, 0, 0, 0);

    const [exerciseDetails, exerciseRecords, aiQaCount] = await Promise.all([
      this.prisma.exerciseRecordDetail.findMany({
        where: {
          exerciseRecord: {
            userId: user.id,
          },
        },
        include: {
          question: {
            include: {
              questionKnowledgeMaps: {
                include: {
                  knowledgePoint: true,
                },
              },
            },
          },
          exerciseRecord: {
            select: {
              id: true,
              createdAt: true,
              submittedAt: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prisma.exerciseRecord.findMany({
        where: {
          userId: user.id,
          createdAt: {
            gte: since,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        select: {
          id: true,
          createdAt: true,
        },
      }),
      this.prisma.aiQaRecord.count({
        where: {
          userId: user.id,
        },
      }),
    ]);

    if (exerciseDetails.length === 0) {
      return this.buildDemoOverview();
    }

    const latestByQuestion = this.buildLatestQuestionMap(exerciseDetails);
    const uniqueLatestDetails = [...latestByQuestion.values()];

    const allDrilldowns = uniqueLatestDetails.map((detail) =>
      this.toDrilldownItem(detail),
    );
    const correctDrilldowns = allDrilldowns.filter((item) => item.isCorrect);
    const wrongDrilldowns = allDrilldowns.filter((item) => !item.isCorrect);

    const totalQuestions = allDrilldowns.length;
    const correctCount = correctDrilldowns.length;
    const wrongCount = wrongDrilldowns.length;
    const accuracyRate =
      totalQuestions === 0
        ? 0
        : Number(((correctCount / totalQuestions) * 100).toFixed(2));

    const masteryByKnowledgePoint = this.buildMasteryByKnowledgePoint(
      uniqueLatestDetails,
    );
    const learningTrend = this.buildLearningTrend(
      exerciseDetails,
      exerciseRecords,
      since,
    );

    return {
      totalQuestions,
      correctCount,
      wrongCount,
      accuracyRate,
      aiQaCount,
      masteryByKnowledgePoint,
      learningTrend,
      questionDrilldowns: {
        all: allDrilldowns,
        correct: correctDrilldowns,
        wrong: wrongDrilldowns,
      },
    };
  }

  private buildLatestQuestionMap(details: ExerciseDetailWithRelations[]) {
    const latestMap = new Map<string, ExerciseDetailWithRelations>();

    for (const detail of details) {
      if (!latestMap.has(detail.questionId)) {
        latestMap.set(detail.questionId, detail);
      }
    }

    return latestMap;
  }

  private toDrilldownItem(detail: ExerciseDetailWithRelations): DrilldownItem {
    return {
      questionId: detail.questionId,
      title: detail.question.title,
      stem: detail.question.stem,
      questionType: detail.question.questionType,
      grade: detail.question.grade,
      difficulty: detail.question.difficulty,
      studentAnswer: detail.studentAnswer ?? null,
      correctAnswer: detail.correctAnswer ?? detail.question.answer ?? null,
      isCorrect: detail.isCorrect === true,
      feedback: detail.feedback ?? null,
      latestSubmittedAt: (
        detail.exerciseRecord.submittedAt ?? detail.exerciseRecord.createdAt
      ).toISOString(),
      knowledgePoints: detail.question.questionKnowledgeMaps.map((relation) => ({
        id: relation.knowledgePoint.id,
        code: relation.knowledgePoint.code,
        name: relation.knowledgePoint.name,
      })),
    };
  }

  private buildMasteryByKnowledgePoint(details: ExerciseDetailWithRelations[]) {
    const masteryMap = new Map<
      string,
      {
        knowledgePointId: string;
        knowledgePointName: string;
        correctCount: number;
        wrongCount: number;
        total: number;
      }
    >();

    for (const detail of details) {
      const relations = detail.question.questionKnowledgeMaps;

      if (relations.length === 0) {
        const current = masteryMap.get('unknown');
        masteryMap.set('unknown', {
          knowledgePointId: 'unknown',
          knowledgePointName: '未分类知识点',
          correctCount:
            (current?.correctCount ?? 0) + (detail.isCorrect === true ? 1 : 0),
          wrongCount:
            (current?.wrongCount ?? 0) + (detail.isCorrect === true ? 0 : 1),
          total: (current?.total ?? 0) + 1,
        });
        continue;
      }

      for (const relation of relations) {
        const key = relation.knowledgePoint.id;
        const current = masteryMap.get(key);

        masteryMap.set(key, {
          knowledgePointId: relation.knowledgePoint.id,
          knowledgePointName: relation.knowledgePoint.name,
          correctCount:
            (current?.correctCount ?? 0) + (detail.isCorrect === true ? 1 : 0),
          wrongCount:
            (current?.wrongCount ?? 0) + (detail.isCorrect === true ? 0 : 1),
          total: (current?.total ?? 0) + 1,
        });
      }
    }

    return [...masteryMap.values()]
      .map((item) => ({
        knowledgePointId: item.knowledgePointId,
        knowledgePointName: item.knowledgePointName,
        correctCount: item.correctCount,
        wrongCount: item.wrongCount,
        correctRate:
          item.total === 0
            ? 0
            : Number(((item.correctCount / item.total) * 100).toFixed(2)),
        total: item.total,
      }))
      .sort((left, right) => right.total - left.total);
  }

  private buildLearningTrend(
    details: ExerciseDetailWithRelations[],
    exerciseRecords: Array<{ id: string; createdAt: Date }>,
    since: Date,
  ) {
    const recordCountByDate = new Map<string, number>();

    for (const record of exerciseRecords) {
      const date = record.createdAt.toISOString().slice(0, 10);
      recordCountByDate.set(date, (recordCountByDate.get(date) ?? 0) + 1);
    }

    const trendQuestionMap = new Map<
      string,
      Map<string, ExerciseDetailWithRelations>
    >();

    for (const detail of details) {
      const submittedAt =
        detail.exerciseRecord.submittedAt ?? detail.exerciseRecord.createdAt;

      if (submittedAt < since) {
        continue;
      }

      const date = submittedAt.toISOString().slice(0, 10);
      const dateMap = trendQuestionMap.get(date) ?? new Map<string, ExerciseDetailWithRelations>();

      if (!dateMap.has(detail.questionId)) {
        dateMap.set(detail.questionId, detail);
      }

      trendQuestionMap.set(date, dateMap);
    }

    return [...trendQuestionMap.entries()]
      .map(([date, dateMap]) => {
        const questionList = [...dateMap.values()];
        const totalQuestions = questionList.length;
        const correctCount = questionList.filter(
          (detail) => detail.isCorrect === true,
        ).length;

        return {
          date,
          practiceCount: recordCountByDate.get(date) ?? 0,
          totalQuestions,
          correctCount,
          accuracyRate:
            totalQuestions === 0
              ? 0
              : Number(((correctCount / totalQuestions) * 100).toFixed(2)),
        };
      })
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  private buildDemoOverview() {
    const demoAll: DrilldownItem[] = [
      {
        questionId: 'demo-question-1',
        title: '三年级加法应用题',
        stem: '小明有 12 支铅笔，又买了 8 支，现在一共有多少支？',
        questionType: QuestionType.SHORT_ANSWER,
        grade: 3,
        difficulty: 1,
        studentAnswer: '18',
        correctAnswer: '20',
        isCorrect: false,
        feedback: '先把原来的数量和新买的数量加起来。',
        latestSubmittedAt: '2026-03-24T09:00:00.000Z',
        knowledgePoints: [
          {
            id: 'demo-kp-1',
            code: 'GRADE3-ADD-001',
            name: '万以内加法',
          },
        ],
      },
      {
        questionId: 'demo-question-2',
        title: '三年级加法选择题',
        stem: '36 + 14 的正确答案是哪一个？',
        questionType: QuestionType.SINGLE_CHOICE,
        grade: 3,
        difficulty: 1,
        studentAnswer: 'B',
        correctAnswer: 'B',
        isCorrect: true,
        feedback: '回答正确，已经掌握基础进位加法。',
        latestSubmittedAt: '2026-03-24T09:05:00.000Z',
        knowledgePoints: [
          {
            id: 'demo-kp-1',
            code: 'GRADE3-ADD-001',
            name: '万以内加法',
          },
        ],
      },
      {
        questionId: 'demo-question-3',
        title: '三年级乘法基础题',
        stem: '8 × 7 等于多少？',
        questionType: QuestionType.SHORT_ANSWER,
        grade: 3,
        difficulty: 1,
        studentAnswer: '56',
        correctAnswer: '56',
        isCorrect: true,
        feedback: '回答正确，乘法口诀掌握不错。',
        latestSubmittedAt: '2026-03-23T15:20:00.000Z',
        knowledgePoints: [
          {
            id: 'demo-kp-2',
            code: 'GRADE3-MUL-001',
            name: '表内乘法',
          },
        ],
      },
      {
        questionId: 'demo-question-4',
        title: '三年级乘法应用题',
        stem: '每盒彩笔有 6 支，4 盒一共有多少支？',
        questionType: QuestionType.SHORT_ANSWER,
        grade: 3,
        difficulty: 2,
        studentAnswer: '20',
        correctAnswer: '24',
        isCorrect: false,
        feedback: '这道题要用乘法，6 × 4 = 24。',
        latestSubmittedAt: '2026-03-22T11:00:00.000Z',
        knowledgePoints: [
          {
            id: 'demo-kp-2',
            code: 'GRADE3-MUL-001',
            name: '表内乘法',
          },
        ],
      },
    ];

    return {
      totalQuestions: 4,
      correctCount: 2,
      wrongCount: 2,
      accuracyRate: 50,
      aiQaCount: 2,
      masteryByKnowledgePoint: [
        {
          knowledgePointId: 'demo-kp-1',
          knowledgePointName: '万以内加法',
          correctCount: 1,
          wrongCount: 1,
          correctRate: 50,
          total: 2,
        },
        {
          knowledgePointId: 'demo-kp-2',
          knowledgePointName: '表内乘法',
          correctCount: 1,
          wrongCount: 1,
          correctRate: 50,
          total: 2,
        },
      ],
      learningTrend: [
        {
          date: '2026-03-22',
          practiceCount: 1,
          totalQuestions: 1,
          correctCount: 0,
          accuracyRate: 0,
        },
        {
          date: '2026-03-23',
          practiceCount: 1,
          totalQuestions: 1,
          correctCount: 1,
          accuracyRate: 100,
        },
        {
          date: '2026-03-24',
          practiceCount: 1,
          totalQuestions: 2,
          correctCount: 1,
          accuracyRate: 50,
        },
      ],
      questionDrilldowns: {
        all: demoAll,
        correct: demoAll.filter((item) => item.isCorrect),
        wrong: demoAll.filter((item) => !item.isCorrect),
      },
    };
  }
}
