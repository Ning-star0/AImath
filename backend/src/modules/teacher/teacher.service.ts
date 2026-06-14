import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAiClient, StudentLearningInsight } from '../../shared/ai/openai.client';
import {
  normalizeManagedClassName,
  normalizeManagedClasses,
  readTeacherExtra,
  ManagedClassAssignment,
} from '../../shared/utils/class-utils';
import { TeacherClassAccessRequestDto } from './dto/teacher-class-access-request.dto';

type AuthUser = {
  id: string;
  role: Role;
  teacher?: { id: string; extra?: unknown } | null;
};

function gradeToChinese(grade: number) {
  const map: Record<number, string> = {
    1: '\u4e00',
    2: '\u4e8c',
    3: '\u4e09',
    4: '\u56db',
    5: '\u4e94',
    6: '\u516d',
  };

  return map[grade] ?? String(grade);
}

function expandClassNameVariants(grade: number, className: string) {
  const normalized = normalizeManagedClassName(className);
  const variants = new Set<string>();

  if (normalized) {
    variants.add(normalized);
    variants.add(`${grade}\u5e74\u7ea7${normalized}`);
    variants.add(`${gradeToChinese(grade)}\u5e74\u7ea7${normalized}`);
  }

  if (className.trim()) {
    variants.add(className.trim());
  }

  return [...variants];
}

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
          classLearningOverview:
            '教师需先提交班级管理申请，并由管理员审核通过后，才能查看对应班级学情。',
          studentReportEntry:
            '班级权限审核通过后，学生列表和 AI 学情画像会自动开放。',
        },
      };
    }

    const students = await this.prisma.student.findMany({
      where: this.buildStudentCandidateWhereByAssignments(accessControl.approvedClasses),
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

    const filteredStudents = students.filter((student) =>
      this.isStudentInApprovedClasses(student, accessControl.approvedClasses),
    );

    const studentCount = filteredStudents.length;
    const totalQuestions = filteredStudents.reduce(
      (sum, student) =>
        sum + student.exerciseRecords.reduce((recordSum, record) => recordSum + record.totalCount, 0),
      0,
    );
    const correctCount = filteredStudents.reduce(
      (sum, student) =>
        sum + student.exerciseRecords.reduce((recordSum, record) => recordSum + record.correctCount, 0),
      0,
    );
    const unresolvedWrongCount = filteredStudents.reduce(
      (sum, student) => sum + student.wrongQuestions.length,
      0,
    );
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
      where: this.buildStudentCandidateWhereByAssignments(accessControl.approvedClasses),
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

    const filteredStudents = students.filter((student) =>
      this.isStudentInApprovedClasses(student, accessControl.approvedClasses),
    );

    return {
      accessControl,
      list: filteredStudents.map((student) => {
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
      total: filteredStudents.length,
    };
  }

  async getStudentReport(user: AuthUser, studentId: string) {
    const accessControl = await this.getTeacherAccessControl(user);

    if (!accessControl.canViewStudents) {
      throw new ForbiddenException('当前教师账号尚未获得班级访问权限。');
    }

    const student = await this.prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentCode: studentId }],
      },
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
      throw new ForbiddenException('当前教师无法访问该班级。');
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
      throw new ForbiddenException('仅教师账号可以提交班级管理申请。');
    }

    const classes = normalizeManagedClasses(payload.classes);
    if (classes.length === 0) {
      throw new BadRequestException('至少需要提交一个管理班级。');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: user.teacher.id },
    });

    if (!teacher) {
      throw new NotFoundException('教师档案不存在');
    }

    const extra = readTeacherExtra(teacher.extra);
    if (extra.reviewStatus !== 'APPROVED') {
      throw new ForbiddenException('教师账号需先通过审核才能申请班级管理权限。');
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
        } as unknown as Prisma.InputJsonValue,
      },
    });

    const nextExtra = readTeacherExtra(updatedTeacher.extra);
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
      throw new ForbiddenException('当前账号不是教师账号。');
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: user.teacher.id },
    });

    if (!teacher) {
      throw new NotFoundException('教师档案不存在');
    }

    const extra = readTeacherExtra(teacher.extra);
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

  private buildStudentCandidateWhereByAssignments(
    assignments: ManagedClassAssignment[],
  ): Prisma.StudentWhereInput {
    if (assignments.length === 0) {
      return { id: '__NO_MATCH__' };
    }

    return {
      OR: assignments.flatMap((item) =>
        expandClassNameVariants(item.grade, item.className).map((variant) => ({
          grade: item.grade,
          className: variant,
          ...(item.schoolName
            ? {
                OR: [
                  { schoolName: item.schoolName.trim() },
                  { schoolName: null },
                  { schoolName: '' },
                ],
              }
            : {}),
        })),
      ),
    };
  }

  private isStudentInApprovedClasses(
    student: { grade: number; className: string | null; schoolName: string | null },
    assignments: ManagedClassAssignment[],
  ) {
    return assignments.some(
      (item) =>
        item.grade === student.grade &&
        normalizeManagedClassName(item.className) ===
          normalizeManagedClassName(student.className ?? '') &&
        (!item.schoolName ||
          !student.schoolName ||
          item.schoolName.trim() === student.schoolName.trim()),
    );
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
