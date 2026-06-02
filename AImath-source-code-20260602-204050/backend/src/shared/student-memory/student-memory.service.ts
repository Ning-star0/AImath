import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type RefreshStudentMemoryInput = {
  studentId: string;
  subject?: string | null;
  eventType: 'EXERCISE_SUBMIT' | 'AI_QA';
};

@Injectable()
export class StudentMemoryService {
  private readonly logger = new Logger(StudentMemoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async refreshStudentMemory(input: RefreshStudentMemoryInput) {
    const memoryPrisma = this.prisma as PrismaService & {
      studentMemorySnapshot: {
        upsert: (args: unknown) => Promise<unknown>;
      };
      studentMemoryHistory: {
        create: (args: unknown) => Promise<unknown>;
      };
    };

    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
      include: {
        user: {
          select: {
            displayName: true,
          },
        },
      },
    });

    if (!student) {
      return null;
    }

    const [detailCount, correctCount, unresolvedWrongs, aiQaCount, latestExercise, latestAiQa] =
      await Promise.all([
        this.prisma.exerciseRecordDetail.count({
          where: {
            exerciseRecord: {
              studentId: input.studentId,
            },
          },
        }),
        this.prisma.exerciseRecordDetail.count({
          where: {
            exerciseRecord: {
              studentId: input.studentId,
            },
            isCorrect: true,
          },
        }),
        this.prisma.wrongQuestion.findMany({
          where: {
            studentId: input.studentId,
            resolved: false,
            archivedAt: null,
          },
          include: {
            question: {
              select: {
                questionType: true,
                title: true,
              },
            },
            knowledgePoint: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
          take: 20,
        }),
        this.prisma.aiQaRecord.count({
          where: {
            studentId: input.studentId,
          },
        }),
        this.prisma.exerciseRecord.findFirst({
          where: {
            studentId: input.studentId,
          },
          orderBy: {
            submittedAt: 'desc',
          },
          select: {
            submittedAt: true,
            createdAt: true,
            subject: true,
          },
        }),
        this.prisma.aiQaRecord.findFirst({
          where: {
            studentId: input.studentId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            createdAt: true,
            subject: true,
          },
        }),
      ]);

    const totalAnswered = detailCount;
    const totalCorrect = correctCount;
    const accuracyRate =
      totalAnswered === 0
        ? 0
        : Number(((totalCorrect / totalAnswered) * 100).toFixed(2));
    const unresolvedWrongCount = unresolvedWrongs.length;
    const challengeLevel = Math.max(1, Math.floor(totalAnswered / 10) + 1);
    const clearedStages = Math.floor(totalAnswered / 5);

    const weakKnowledgePoints = this.rankByFrequency(
      unresolvedWrongs.map((item) => item.knowledgePoint?.name || '待补充知识点'),
    );
    const recentMistakeTypes = this.rankByFrequency(
      unresolvedWrongs.map((item) => item.question.questionType),
    );

    const strengths =
      accuracyRate >= 85
        ? ['基础题稳定性较好', '最近练习正确率保持在较高水平']
        : accuracyRate >= 60
          ? ['已经具备一定的知识点掌握基础']
          : ['能够持续完成练习，具备继续提升的基础'];

    const weaknesses =
      weakKnowledgePoints.length > 0
        ? weakKnowledgePoints.map((item) => `${item} 需要继续巩固`)
        : ['当前练习样本较少，后续会随着做题持续更新学习画像'];

    const recommendations =
      unresolvedWrongCount > 0
        ? [
            '建议先完成最近错题的复习，再进入相似题巩固。',
            '优先处理重复出错的知识点，减少同类错误累积。',
          ]
        : ['建议保持当前练习节奏，逐步扩大题量覆盖。'];

    const summary =
      unresolvedWrongCount > 0
        ? `${student.user.displayName} 当前仍有 ${unresolvedWrongCount} 道待复习错题，主要薄弱点集中在 ${weakKnowledgePoints[0] ?? '近期错题涉及的知识点'}。`
        : `${student.user.displayName} 当前整体学习状态较稳定，可以继续通过专项练习提升掌握度。`;

    const confidence =
      totalAnswered >= 20 ? 'HIGH' : totalAnswered >= 8 ? 'MEDIUM' : 'LOW';

    const preferredSubject =
      input.subject?.trim() ||
      latestExercise?.subject?.trim() ||
      latestAiQa?.subject?.trim() ||
      'MATH';
    const lastPracticedAt = latestExercise?.submittedAt ?? latestExercise?.createdAt ?? null;
    const lastAiInteractionAt = latestAiQa?.createdAt ?? null;

    const snapshotPayload = {
      preferredSubject,
      challengeLevel,
      clearedStages,
      totalAnswered,
      totalCorrect,
      accuracyRate,
      unresolvedWrongCount,
      aiQaCount,
      lastPracticedAt,
      lastAiInteractionAt,
      weakKnowledgePoints,
      recentMistakeTypes,
      summary,
      strengths,
      weaknesses,
      recommendations,
      confidence,
      rawProfile: {
        studentName: student.user.displayName,
        studentCode: student.studentCode,
        grade: student.grade,
        className: student.className,
        schoolName: student.schoolName,
        latestWrongQuestions: unresolvedWrongs.map((item) => ({
          title: item.question.title,
          knowledgePoint: item.knowledgePoint?.name ?? null,
          questionType: item.question.questionType,
        })),
      },
    };

    await this.prisma.$transaction([
      memoryPrisma.studentMemorySnapshot.upsert({
        where: { studentId: input.studentId },
        update: snapshotPayload,
        create: {
          studentId: input.studentId,
          ...snapshotPayload,
        },
      }),
      memoryPrisma.studentMemoryHistory.create({
        data: {
          studentId: input.studentId,
          eventType: input.eventType,
          subject: preferredSubject,
          challengeLevel,
          clearedStages,
          totalAnswered,
          totalCorrect,
          accuracyRate,
          unresolvedWrongCount,
          aiQaCount,
          weakKnowledgePoints,
          recentMistakeTypes,
          summary,
          recommendations,
          rawProfile: snapshotPayload.rawProfile,
        },
      }),
      this.prisma.student.update({
        where: { id: input.studentId },
        data: {
          learningProfile: {
            challengeLevel,
            clearedStages,
            totalAnswered,
            totalCorrect,
            accuracyRate,
            unresolvedWrongCount,
            aiQaCount,
            currentSubject: preferredSubject,
            summary,
            strengths,
            weaknesses,
            recommendations,
            confidence,
            weakKnowledgePoints,
            recentMistakeTypes,
            lastPracticedAt: lastPracticedAt?.toISOString() ?? null,
            lastAiInteractionAt: lastAiInteractionAt?.toISOString() ?? null,
            updatedAt: new Date().toISOString(),
          },
        },
      }),
    ]);

    return snapshotPayload;
  }

  private rankByFrequency(items: string[]) {
    const countMap = new Map<string, number>();

    for (const item of items) {
      const normalized = item.trim();
      if (!normalized) {
        continue;
      }
      countMap.set(normalized, (countMap.get(normalized) ?? 0) + 1);
    }

    return [...countMap.entries()]
      .sort((left, right) => {
        if (right[1] !== left[1]) {
          return right[1] - left[1];
        }
        return left[0].localeCompare(right[0]);
      })
      .map(([name]) => name)
      .slice(0, 6);
  }
}
