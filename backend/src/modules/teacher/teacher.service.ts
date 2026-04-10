import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiClient, StudentLearningInsight } from '../../shared/ai/openai.client';
import { TeacherClassAccessRequestDto } from './dto/teacher-class-access-request.dto';

type AuthUser = {
  id: string;
  role: Role;
  teacher?: { id: string; extra?: unknown } | null;
};

type ManagedClassAssignment = {
  grade: number;
  className: string;
  schoolName?: string | null;
};

type TeacherExtraState = {
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  classAccessStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  classAccessNote: string | null;
  requestedClasses: ManagedClassAssignment[];
  approvedClasses: ManagedClassAssignment[];
};

type ExerciseDetailWithQuestion = Prisma.ExerciseRecordDetailGetPayload<{
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
        createdAt: true;
        submittedAt: true;
      };
    };
  };
}>;

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openAiClient: OpenAiClient,
  ) {}

  async getDashboard(user: AuthUser) {
    const accessControl = await this.getTeacherAccessControl(user);

    if (!accessControl.canViewStudents) {
      return {
        classOverview: {
          studentCount: 0,
          totalQuestions: 0,
          classAccuracyRate: 0,
          unresolvedWrongCount: 0,
        },
        accessControl,
        placeholders: {
          classLearningOverview: '教师需先提交班级管理申请，并由管理员审核通过后，才能查看对应班级学情。',
          studentReportEntry: '班级权限审核通过后，学生列表和 AI 学情画像会自动开放。',
        },
      };
    }

    const studentWhere = this.buildStudentWhereByAssignments(accessControl.approvedClasses);
    const students = await this.prisma.student.findMany({
      where: studentWhere,
      include: {
        exerciseRecords: true,
        wrongQuestions: {
          where: {
            archivedAt: null,
            resolved: false,
          },
        },
      },
    });

    const studentCount = students.length;
    const totalQuestions = students.reduce(
      (sum, student) =>
        sum + student.exerciseRecords.reduce((recordSum, record) => recordSum + record.totalCount, 0),
      0,
    );
    const correctCount = students.reduce(
      (sum, student) =>
        sum + student.exerciseRecords.reduce((recordSum, record) => recordSum + record.correctCount, 0),
      0,
    );
    const unresolvedWrongCount = students.reduce((sum, student) => sum + student.wrongQuestions.length, 0);
    const classAccuracyRate =
      totalQuestions === 0 ? 0 : Number(((correctCount / totalQuestions) * 100).toFixed(2));

    return {
      classOverview: {
        studentCount,
        totalQuestions,
        classAccuracyRate,
        unresolvedWrongCount,
      },
      accessControl,
      placeholders: {
        classLearningOverview: '当前数据仅展示已授权班级的整体学情与学生表现。',
        studentReportEntry: 'AI 学情画像会随练习、错题与知识点掌握情况持续更新。',
      },
    };
  }

  async getStudents(user: AuthUser) {
    const accessControl = await this.getTeacherAccessControl(user);

    if (!accessControl.canViewStudents) {
      return {
        accessControl,
        list: [],
        total: 0,
      };
    }

    const students = await this.prisma.student.findMany({
      where: this.buildStudentWhereByAssignments(accessControl.approvedClasses),
      include: {
        user: true,
        exerciseRecords: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        wrongQuestions: {
          where: {
            archivedAt: null,
          },
        },
      },
      orderBy: [{ grade: 'asc' }, { className: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      accessControl,
      list: students.map((student) => {
        const totalQuestions = student.exerciseRecords.reduce(
          (sum, record) => sum + record.totalCount,
          0,
        );
        const correctCount = student.exerciseRecords.reduce(
          (sum, record) => sum + record.correctCount,
          0,
        );
        const accuracyRate =
          totalQuestions === 0
            ? 0
            : Number(((correctCount / totalQuestions) * 100).toFixed(2));

        const learningProfile =
          student.learningProfile && typeof student.learningProfile === 'object'
            ? (student.learningProfile as Record<string, unknown>)
            : null;
        const aiSummary =
          typeof learningProfile?.summary === 'string'
            ? learningProfile.summary
            : '等待生成 AI 学情分析';

        return {
          id: student.id,
          studentCode: student.studentCode,
          displayName: student.user.displayName,
          grade: student.grade,
          className: student.className,
          schoolName: student.schoolName,
          totalQuestions,
          accuracyRate,
          unresolvedWrongCount: student.wrongQuestions.filter((item) => !item.resolved).length,
          aiSummary,
          reportEntry: {
            path: `/teacher/students/${student.id}`,
            apiPath: `/api/v1/teacher/students/${student.id}/report`,
          },
        };
      }),
      total: students.length,
    };
  }

  async getStudentReport(user: AuthUser, studentId: string) {
    const accessControl = await this.getTeacherAccessControl(user);

    if (!accessControl.canViewStudents) {
      throw new ForbiddenException('Current teacher account has not been granted class access.');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        exerciseRecords: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        wrongQuestions: {
          where: {
            archivedAt: null,
          },
          orderBy: {
            updatedAt: 'desc',
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
            knowledgePoint: true,
          },
          take: 8,
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    if (!this.isStudentInApprovedClasses(student, accessControl.approvedClasses) && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Current teacher cannot access this class.');
    }

    const exerciseDetails = await this.prisma.exerciseRecordDetail.findMany({
      where: {
        exerciseRecord: {
          studentId: student.id,
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
            createdAt: true,
            submittedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalQuestions = student.exerciseRecords.reduce(
      (sum, record) => sum + record.totalCount,
      0,
    );
    const correctCount = student.exerciseRecords.reduce(
      (sum, record) => sum + record.correctCount,
      0,
    );
    const unresolvedWrongCount = student.wrongQuestions.filter((item) => !item.resolved).length;
    const accuracyRate =
      totalQuestions === 0
        ? 0
        : Number(((correctCount / totalQuestions) * 100).toFixed(2));

    const weakKnowledgePoints = this.buildWeakKnowledgePoints(exerciseDetails);
    const recentWrongQuestions = student.wrongQuestions.slice(0, 5).map((item) => ({
      id: item.id,
      questionId: item.questionId,
      stem: item.question.stem,
      wrongCount: item.wrongCount,
      reviewStatus: item.reviewStatus,
      knowledgePointName:
        item.knowledgePoint?.name ??
        item.question.questionKnowledgeMaps[0]?.knowledgePoint.name ??
        '待补充知识点',
    }));

    const aiInsight = await this.openAiClient.analyzeStudentLearningProfile({
      studentName: student.user.displayName,
      grade: student.grade,
      accuracyRate,
      totalQuestions,
      unresolvedWrongCount,
      weakKnowledgePoints: weakKnowledgePoints.map((item) => item.knowledgePointName),
      recentWrongQuestions: recentWrongQuestions.map((item) => item.stem),
    });

    await this.persistStudentLearningProfile(student.id, {
      ...aiInsight,
      updatedAt: new Date().toISOString(),
      weakKnowledgePoints: weakKnowledgePoints.map((item) => ({
        knowledgePointId: item.knowledgePointId,
        knowledgePointName: item.knowledgePointName,
        wrongCount: item.wrongCount,
        total: item.total,
        correctRate: item.correctRate,
      })),
      unresolvedWrongCount,
      accuracyRate,
      totalQuestions,
    });

    return {
      student: {
        id: student.id,
        displayName: student.user.displayName,
        studentCode: student.studentCode,
        grade: student.grade,
        className: student.className,
        schoolName: student.schoolName,
      },
      reportSummary: {
        totalQuestions,
        accuracyRate,
        unresolvedWrongCount,
        correctCount,
      },
      aiLearningInsight: aiInsight,
      weakKnowledgePoints: weakKnowledgePoints.slice(0, 6),
      recentWrongQuestions,
      teacherActions: this.buildTeacherActions(aiInsight, weakKnowledgePoints),
      accessControl,
    };
  }

  async submitClassAccessRequest(user: AuthUser, payload: TeacherClassAccessRequestDto) {
    if (user.role !== Role.TEACHER || !user.teacher) {
      throw new ForbiddenException('Only teacher accounts can submit class access requests.');
    }

    const classes = this.normalizeManagedClasses(payload.classes);
    if (classes.length === 0) {
      throw new BadRequestException('At least one managed class must be submitted.');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: user.teacher.id },
    });

    if (!teacher) {
      throw new NotFoundException('教师档案不存在');
    }

    const extra = this.readTeacherExtra(teacher.extra);
    if (extra.reviewStatus !== 'APPROVED') {
      throw new ForbiddenException('Teacher account review must be approved before applying for class access.');
    }

    const updatedTeacher = await this.prisma.teacher.update({
      where: { id: teacher.id },
      data: {
        extra: {
          ...extra,
          classAccessStatus: 'PENDING',
          classAccessNote: null,
          classAccessSubmittedAt: new Date().toISOString(),
          requestedClasses: classes,
        },
      },
    });

    const nextExtra = this.readTeacherExtra(updatedTeacher.extra);
    return {
      classAccessStatus: nextExtra.classAccessStatus,
      requestedClasses: nextExtra.requestedClasses,
      approvedClasses: nextExtra.approvedClasses,
      nextStep: '班级管理申请已提交，请等待管理员审核通过后查看对应班级学生。',
    };
  }

  private async getTeacherAccessControl(user: AuthUser) {
    if (user.role === Role.ADMIN) {
      return {
        canViewStudents: true,
        isAdminOverride: true,
        reviewStatus: 'APPROVED',
        classAccessStatus: 'APPROVED',
        classAccessNote: null,
        requestedClasses: [],
        approvedClasses: [],
      };
    }

    if (!user.teacher?.id) {
      throw new ForbiddenException('Current account is not a teacher.');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: user.teacher.id },
    });

    if (!teacher) {
      throw new NotFoundException('教师档案不存在');
    }

    const extra = this.readTeacherExtra(teacher.extra);
    const canViewStudents =
      extra.reviewStatus === 'APPROVED' &&
      extra.classAccessStatus === 'APPROVED' &&
      extra.approvedClasses.length > 0;

    return {
      canViewStudents,
      isAdminOverride: false,
      reviewStatus: extra.reviewStatus,
      classAccessStatus: extra.classAccessStatus,
      classAccessNote: extra.classAccessNote,
      requestedClasses: extra.requestedClasses,
      approvedClasses: extra.approvedClasses,
    };
  }

  private buildStudentWhereByAssignments(assignments: ManagedClassAssignment[]): Prisma.StudentWhereInput {
    if (assignments.length === 0) {
      return { id: '__NO_MATCH__' };
    }

    return {
      OR: assignments.map((item) => ({
        grade: item.grade,
        className: item.className,
        ...(item.schoolName ? { schoolName: item.schoolName } : {}),
      })),
    };
  }

  private isStudentInApprovedClasses(
    student: { grade: number; className: string | null; schoolName: string | null },
    assignments: ManagedClassAssignment[],
  ) {
    return assignments.some(
      (item) =>
        item.grade === student.grade &&
        item.className === (student.className ?? '') &&
        (!item.schoolName || item.schoolName === (student.schoolName ?? null)),
    );
  }

  private readTeacherExtra(extra: Prisma.JsonValue | null | undefined): TeacherExtraState {
    const value =
      extra && typeof extra === 'object' && !Array.isArray(extra)
        ? (extra as Record<string, unknown>)
        : {};

    return {
      reviewStatus:
        value.reviewStatus === 'APPROVED' || value.reviewStatus === 'REJECTED'
          ? value.reviewStatus
          : 'PENDING',
      reviewNote: typeof value.reviewNote === 'string' ? value.reviewNote : null,
      classAccessStatus:
        value.classAccessStatus === 'PENDING' ||
        value.classAccessStatus === 'APPROVED' ||
        value.classAccessStatus === 'REJECTED'
          ? value.classAccessStatus
          : 'NOT_SUBMITTED',
      classAccessNote:
        typeof value.classAccessNote === 'string' ? value.classAccessNote : null,
      requestedClasses: this.normalizeManagedClasses(value.requestedClasses),
      approvedClasses: this.normalizeManagedClasses(value.approvedClasses),
    };
  }

  private normalizeManagedClasses(value: unknown): ManagedClassAssignment[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const row = item as Record<string, unknown>;
        const grade = Number(row.grade);
        const className =
          typeof row.className === 'string' ? row.className.trim() : '';
        const schoolName =
          typeof row.schoolName === 'string' ? row.schoolName.trim() : null;

        if (!grade || !className) {
          return null;
        }

        return {
          grade,
          className,
          schoolName,
        };
      })
      .filter((item): item is ManagedClassAssignment => Boolean(item));
  }

  private buildWeakKnowledgePoints(details: ExerciseDetailWithQuestion[]) {
    const knowledgeMap = new Map<
      string,
      {
        knowledgePointId: string;
        knowledgePointName: string;
        total: number;
        wrongCount: number;
      }
    >();

    for (const detail of details) {
      const relations = detail.question.questionKnowledgeMaps;

      if (relations.length === 0) {
        const current = knowledgeMap.get('unknown');
        knowledgeMap.set('unknown', {
          knowledgePointId: 'unknown',
          knowledgePointName: '待补充知识点',
          total: (current?.total ?? 0) + 1,
          wrongCount: (current?.wrongCount ?? 0) + (detail.isCorrect ? 0 : 1),
        });
        continue;
      }

      for (const relation of relations) {
        const current = knowledgeMap.get(relation.knowledgePoint.id);
        knowledgeMap.set(relation.knowledgePoint.id, {
          knowledgePointId: relation.knowledgePoint.id,
          knowledgePointName: relation.knowledgePoint.name,
          total: (current?.total ?? 0) + 1,
          wrongCount: (current?.wrongCount ?? 0) + (detail.isCorrect ? 0 : 1),
        });
      }
    }

    return [...knowledgeMap.values()]
      .map((item) => ({
        ...item,
        correctRate:
          item.total === 0
            ? 0
            : Number((((item.total - item.wrongCount) / item.total) * 100).toFixed(2)),
      }))
      .sort((left, right) => {
        if (right.wrongCount !== left.wrongCount) {
          return right.wrongCount - left.wrongCount;
        }

        return left.correctRate - right.correctRate;
      });
  }

  private buildTeacherActions(
    insight: StudentLearningInsight,
    weakKnowledgePoints: Array<{
      knowledgePointId: string;
      knowledgePointName: string;
      total: number;
      wrongCount: number;
      correctRate: number;
    }>,
  ) {
    return {
      teacherFocus: insight.teacherFocus,
      nextRecommendedKnowledgePoint: weakKnowledgePoints[0]?.knowledgePointName ?? null,
      recommendationSummary:
        insight.recommendations[0] ?? '建议先从最近错误最多的知识点开始巩固。',
    };
  }

  private async persistStudentLearningProfile(studentId: string, profile: Record<string, unknown>) {
    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        learningProfile: profile as Prisma.InputJsonValue,
      },
    });
  }
}
