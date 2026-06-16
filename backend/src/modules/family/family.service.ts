import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { BindChildDto } from './dto/bind-child.dto';

type FamilyAuthUser = {
  id: string;
  role: Role;
};

type AccessibleChild = {
  id: string;
  displayName: string;
  studentCode: string;
  grade: number;
  className?: string | null;
  schoolName?: string | null;
  relationLabel: string;
  learningProfile?: Prisma.JsonValue | null;
  user: {
    displayName: string;
  };
};

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

function inferWrongCause(
  stem: string,
  knowledgePointName?: string | null,
) {
  const text = `${stem} ${knowledgePointName ?? ''}`;

  if (/周长|面积|体积|角|图形|圆|长方形|正方形|三角形|统计图/.test(text)) {
    return '概念理解不清';
  }
  if (/计算|口算|竖式|分数|小数|百分数|[-+*÷]|乘|除|加|减/.test(text)) {
    return '计算细节失误';
  }
  if (/应用题|至少|最多|一共|剩下|比较|需要|已知|根据/.test(text)) {
    return '审题不够仔细';
  }

  return '步骤表达不完整';
}

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(user: FamilyAuthUser, selectedChildId?: string) {
    const children = await this.getAccessibleChildren(user);

    if (children.length === 0) {
      return {
        child: null,
        summary: {
          totalQuestions: 0,
          correctCount: 0,
          wrongCount: 0,
          accuracyRate: 0,
          unresolvedWrongCount: 0,
          aiQaCount: 0,
        },
        weakKnowledgePoints: [],
        learningTrend: [],
        knowledgeRadar: [],
        wrongCauseBreakdown: [],
        wrongQuestions: [],
        aiSummary: {
          headline: '先绑定孩子，再查看学习画像。',
          focus: [],
          parentSuggestion: '绑定成功后，系统会根据孩子近期练习和错题情况给出家长辅导建议。',
        },
        bindingOptions: [],
      };
    }

    const selectedChild = selectedChildId
      ? children.find((item) => item.id === selectedChildId)
      : children[0];

    if (!selectedChild) {
      throw new ForbiddenException('当前账号无法查看该孩子的学习数据。');
    }

    const [exerciseRecords, wrongQuestions, reports, aiQaCount] = await Promise.all([
      this.prisma.exerciseRecord.findMany({
        where: { studentId: selectedChild.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wrongQuestion.findMany({
        where: {
          studentId: selectedChild.id,
          archivedAt: null,
        },
        include: {
          question: true,
          knowledgePoint: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 12,
      }),
      this.prisma.learningReport.findMany({
        where: { studentId: selectedChild.id },
        include: {
          knowledgePoint: true,
        },
        orderBy: { reportDate: 'desc' },
        take: 60,
      }),
      this.prisma.aiQaRecord.count({
        where: { studentId: selectedChild.id },
      }),
    ]);

    const totalQuestions = exerciseRecords.reduce((sum, item) => sum + item.totalCount, 0);
    const correctCount = exerciseRecords.reduce((sum, item) => sum + item.correctCount, 0);
    const wrongCount = Math.max(0, totalQuestions - correctCount);
    const accuracyRate = toPercent(correctCount, totalQuestions);

    const trendMap = new Map<
      string,
      { date: string; totalQuestions: number; correctCount: number; accuracyRate: number }
    >();

    for (const record of exerciseRecords.slice(0, 14)) {
      const date = record.submittedAt ?? record.createdAt;
      const key = date.toISOString().slice(0, 10);
      const current = trendMap.get(key) ?? {
        date: key,
        totalQuestions: 0,
        correctCount: 0,
        accuracyRate: 0,
      };
      current.totalQuestions += record.totalCount;
      current.correctCount += record.correctCount;
      current.accuracyRate = toPercent(current.correctCount, current.totalQuestions);
      trendMap.set(key, current);
    }

    const masteryMap = new Map<
      string,
      {
        knowledgePointId: string;
        knowledgePointName: string;
        total: number;
        wrongCount: number;
        correctCount: number;
        correctRate: number;
      }
    >();

    for (const report of reports) {
      if (!report.knowledgePoint) {
        continue;
      }

      const current = masteryMap.get(report.knowledgePoint.id) ?? {
        knowledgePointId: report.knowledgePoint.id,
        knowledgePointName: report.knowledgePoint.name,
        total: 0,
        wrongCount: 0,
        correctCount: 0,
        correctRate: 0,
      };

      current.total += report.totalQuestions;
      current.correctCount += report.correctCount;
      current.wrongCount += report.wrongCount;
      current.correctRate = toPercent(current.correctCount, current.total);
      masteryMap.set(current.knowledgePointId, current);
    }

    const reportWeakKnowledgePoints = [...masteryMap.values()]
      .sort((a, b) => {
        if (b.wrongCount !== a.wrongCount) {
          return b.wrongCount - a.wrongCount;
        }
        return a.correctRate - b.correctRate;
      })
      .slice(0, 6);

    const wrongQuestionWeakMap = new Map<
      string,
      {
        knowledgePointId: string;
        knowledgePointName: string;
        total: number;
        wrongCount: number;
        correctCount: number;
        correctRate: number;
      }
    >();

    for (const item of wrongQuestions) {
      const key = item.knowledgePoint?.id ?? `question-${item.questionId}`;
      const current = wrongQuestionWeakMap.get(key) ?? {
        knowledgePointId: key,
        knowledgePointName: item.knowledgePoint?.name ?? '待补充知识点',
        total: 0,
        wrongCount: 0,
        correctCount: 0,
        correctRate: 0,
      };

      const wrongCountForQuestion = Math.max(1, item.wrongCount);
      current.total += wrongCountForQuestion;
      current.wrongCount += wrongCountForQuestion;
      current.correctRate = toPercent(current.correctCount, current.total);
      wrongQuestionWeakMap.set(key, current);
    }

    const weakKnowledgePoints =
      reportWeakKnowledgePoints.length > 0
        ? reportWeakKnowledgePoints
        : [...wrongQuestionWeakMap.values()]
            .sort((a, b) => b.wrongCount - a.wrongCount)
            .slice(0, 6);

    const knowledgeRadar =
      weakKnowledgePoints.length > 0
        ? weakKnowledgePoints.slice(0, 5).map((item) => ({
            knowledgePointId: item.knowledgePointId,
            knowledgePointName: item.knowledgePointName,
            mastery: Math.max(8, Math.round(item.correctRate)),
            insight:
              item.correctRate < 60
                ? '当前掌握度偏弱，建议先做同知识点基础题。'
                : item.correctRate < 80
                  ? '已经具备基础，但稳定性还需要继续提高。'
                  : '当前掌握比较稳定，可以继续保持。',
          }))
        : [];

    const causeSeed = new Map<string, { label: string; count: number; description: string }>([
      [
        '概念理解不清',
        {
          label: '概念理解不清',
          count: 0,
          description: '更容易出现在图形、周长、面积、单位概念类题目中。',
        },
      ],
      [
        '审题不够仔细',
        {
          label: '审题不够仔细',
          count: 0,
          description: '常见于应用题或条件较多的题目，需要先划重点再列式。',
        },
      ],
      [
        '计算细节失误',
        {
          label: '计算细节失误',
          count: 0,
          description: '多数表现为口算、分数、小数计算时出现看错或算错。',
        },
      ],
      [
        '步骤表达不完整',
        {
          label: '步骤表达不完整',
          count: 0,
          description: '会做但表达不完整，建议练习分步书写和检查。',
        },
      ],
    ]);

    for (const item of wrongQuestions) {
      const cause = inferWrongCause(item.question.stem, item.knowledgePoint?.name);
      const current = causeSeed.get(cause);
      if (current) {
        current.count += Math.max(1, item.wrongCount);
      }
    }

    const wrongCauseBreakdown = [...causeSeed.values()]
      .sort((a, b) => b.count - a.count)
      .map((item) => ({
        ...item,
        count: item.count,
      }));

    const latestProfile =
      selectedChild.learningProfile &&
      typeof selectedChild.learningProfile === 'object' &&
      !Array.isArray(selectedChild.learningProfile)
        ? (selectedChild.learningProfile as Record<string, unknown>)
        : null;

    const aiSummaryHeadline =
      typeof latestProfile?.summary === 'string'
        ? latestProfile.summary
        : `${selectedChild.displayName} 最近完成了 ${totalQuestions} 道题，当前正确率 ${accuracyRate}%，仍有 ${wrongQuestions.filter((item) => !item.resolved).length} 道错题需要复习。`;

    const aiSummaryFocus = Array.isArray(latestProfile?.weaknesses)
      ? latestProfile.weaknesses.filter((item): item is string => typeof item === 'string')
      : knowledgeRadar.slice(0, 3).map((item) => item.knowledgePointName);

    const aiSummaryParentSuggestion =
      Array.isArray(latestProfile?.recommendations) && latestProfile.recommendations[0]
        ? String(latestProfile.recommendations[0])
        : knowledgeRadar[0]
          ? `建议本周优先陪孩子复习 ${knowledgeRadar[0].knowledgePointName}，先做基础题，再回看最近错题。`
          : '建议先保持稳定练习，等系统积累更多做题和错题数据后再查看薄弱点分析。';

    return {
      child: {
        id: selectedChild.id,
        displayName: selectedChild.user.displayName,
        studentCode: selectedChild.studentCode,
        grade: selectedChild.grade,
        className: selectedChild.className,
        schoolName: selectedChild.schoolName,
      },
      summary: {
        totalQuestions,
        correctCount,
        wrongCount,
        accuracyRate,
        unresolvedWrongCount: wrongQuestions.filter((item) => !item.resolved).length,
        aiQaCount,
      },
      weakKnowledgePoints,
      learningTrend: [...trendMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      knowledgeRadar,
      wrongCauseBreakdown,
      wrongQuestions: wrongQuestions.map((item) => ({
        id: item.id,
        questionTitle: item.question.title,
        wrongCount: item.wrongCount,
        reviewStatus: item.reviewStatus,
        unresolved: !item.resolved,
        knowledgePointName: item.knowledgePoint?.name ?? '待补充知识点',
      })),
      aiSummary: {
        headline: aiSummaryHeadline,
        focus: aiSummaryFocus,
        parentSuggestion: aiSummaryParentSuggestion,
      },
      bindingOptions: children.map((child, index) => ({
        id: `${child.id}-${index}`,
        relationLabel: child.relationLabel,
        bindingStatus: 'APPROVED',
        student: {
          id: child.id,
          displayName: child.displayName,
          studentCode: child.studentCode,
          grade: child.grade,
          className: child.className,
          schoolName: child.schoolName,
        },
      })),
    };
  }

  async bindChild(user: FamilyAuthUser, payload: BindChildDto) {
    if (user.role !== Role.PARENT) {
      throw new ForbiddenException('只有家长账号可以绑定孩子。');
    }

    const student = await this.prisma.student.findUnique({
      where: { studentCode: payload.studentCode.trim() },
      include: {
        user: true,
      },
    });

    if (!student) {
      throw new NotFoundException('未找到对应学号的学生。');
    }

    const passwordMatched = await bcrypt.compare(payload.studentPassword, student.user.passwordHash);
    if (!passwordMatched) {
      throw new BadRequestException('学生密码校验失败，请确认学号和密码后重试。');
    }

    const existing = await this.prisma.parentBinding.findUnique({
      where: {
        parentUserId_studentId: {
          parentUserId: user.id,
          studentId: student.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('当前家长账号已经绑定了这个学生。');
    }

    const relationLabel = payload.relationLabel.trim();
    if (!relationLabel) {
      throw new BadRequestException('请填写与孩子的关系。');
    }

    const binding = await this.prisma.parentBinding.create({
      data: {
        parentUserId: user.id,
        studentId: student.id,
        relationLabel,
        bindingStatus: 'APPROVED',
      },
    });

    await this.prisma.systemLog.create({
      data: {
        actorUserId: user.id,
        module: 'FAMILY',
        action: 'BIND_CHILD',
        targetType: 'Student',
        targetId: student.id,
        message: `家长已绑定孩子 ${student.user.displayName}`,
        payload: {
          relationLabel: binding.relationLabel,
          studentCode: student.studentCode,
        } as Prisma.InputJsonValue,
      },
    });

    return {
      id: binding.id,
      relationLabel: binding.relationLabel,
      child: {
        id: student.id,
        displayName: student.user.displayName,
        studentCode: student.studentCode,
        grade: student.grade,
        className: student.className,
        schoolName: student.schoolName,
      },
      nextStep: '孩子绑定成功，家长视图已经同步更新。',
    };
  }

  private async getAccessibleChildren(user: FamilyAuthUser): Promise<AccessibleChild[]> {
    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
      });

      return student
        ? [
            {
              id: student.id,
              displayName: student.user.displayName,
              studentCode: student.studentCode,
              grade: student.grade,
              className: student.className,
              schoolName: student.schoolName,
              relationLabel: '本人',
              learningProfile: student.learningProfile,
              user: student.user,
            },
          ]
        : [];
    }

    if (user.role !== Role.PARENT) {
      throw new ForbiddenException('当前账号无法查看家长视图。');
    }

    const bindings = await this.prisma.parentBinding.findMany({
      where: {
        parentUserId: user.id,
        bindingStatus: 'APPROVED',
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return bindings.map((binding) => ({
      id: binding.student.id,
      displayName: binding.student.user.displayName,
      studentCode: binding.student.studentCode,
      grade: binding.student.grade,
      className: binding.student.className,
      schoolName: binding.student.schoolName,
      relationLabel: binding.relationLabel,
      learningProfile: binding.student.learningProfile,
      user: binding.student.user,
    }));
  }
}
