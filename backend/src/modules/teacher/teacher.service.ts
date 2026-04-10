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

function normalizeManagedClassName(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const removedGrade = trimmed.replace(
    /^(?:[1-6]|\u4e00|\u4e8c|\u4e09|\u56db|\u4e94|\u516d)\s*\u5e74\u7ea7/,
    '',
  );
  const map: Record<string, string> = {
    '1': '\u4e00\u73ed',
    '2': '\u4e8c\u73ed',
    '3': '\u4e09\u73ed',
    '4': '\u56db\u73ed',
    '5': '\u4e94\u73ed',
    '6': '\u516d\u73ed',
  };
  const numericClassMatch = removedGrade.match(/^([1-6])\s*\u73ed$/);
  if (numericClassMatch) {
    return map[numericClassMatch[1]] ?? removedGrade.trim();
  }

  return removedGrade.trim();
}

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
          classLearningOverview: '鏁欏笀闇€鍏堟彁浜ょ彮绾х鐞嗙敵璇凤紝骞剁敱绠＄悊鍛樺鏍搁€氳繃鍚庯紝鎵嶈兘鏌ョ湅瀵瑰簲鐝骇瀛︽儏銆',
          studentReportEntry: '鐝骇鏉冮檺瀹℃牳閫氳繃鍚庯紝瀛︾敓鍒楄〃鍜?AI 瀛︽儏鐢诲儚浼氳嚜鍔ㄥ紑鏀俱€',
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
        classLearningOverview: '褰撳墠鏁版嵁浠呭睍绀哄凡鎺堟潈鐝骇鐨勬暣浣撳鎯呬笌瀛︾敓琛ㄧ幇銆',
        studentReportEntry: 'AI 瀛︽儏鐢诲儚浼氶殢缁冧範銆侀敊棰樹笌鐭ヨ瘑鐐规帉鎻℃儏鍐垫寔缁洿鏂般€',
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
            : '绛夊緟鐢熸垚 AI 瀛︽儏鍒嗘瀽';

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
      throw new ForbiddenException('Current teacher account has not been granted class access.');
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
      throw new NotFoundException('瀛︾敓涓嶅瓨鍦');
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
        '寰呰ˉ鍏呯煡璇嗙偣',
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
      throw new NotFoundException('鏁欏笀妗ｆ涓嶅瓨鍦');
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
      nextStep: '鐝骇绠＄悊鐢宠宸叉彁浜わ紝璇风瓑寰呯鐞嗗憳瀹℃牳閫氳繃鍚庢煡鐪嬪搴旂彮绾у鐢熴€',
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
      throw new NotFoundException('鏁欏笀妗ｆ涓嶅瓨鍦');
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

    const result: ManagedClassAssignment[] = [];

    for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const row = item as Record<string, unknown>;
      const grade = Number(row.grade);
      const className =
        typeof row.className === 'string' ? normalizeManagedClassName(row.className) : '';
      const schoolName =
        typeof row.schoolName === 'string' ? row.schoolName.trim() : null;

      if (!grade || !className) {
        continue;
      }

      result.push({
        grade,
        className,
        schoolName,
      });
    }

    return result;
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
          knowledgePointName: '寰呰ˉ鍏呯煡璇嗙偣',
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
        insight.recommendations[0] ?? '寤鸿鍏堜粠鏈€杩戦敊璇渶澶氱殑鐭ヨ瘑鐐瑰紑濮嬪珐鍥恒€',
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


