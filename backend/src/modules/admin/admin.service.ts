import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryAdminQuestionsDto } from './dto/query-admin-questions.dto';
import { ReviewTeacherClassAccessDto } from './dto/review-teacher-class-access.dto';
import { ReviewTeacherDto } from './dto/review-teacher.dto';

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

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [userCount, studentCount, teacherCount, questionCount, aiQaCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.student.count(),
        this.prisma.teacher.count(),
        this.prisma.question.count(),
        this.prisma.aiQaRecord.count(),
      ]);

    return {
      systemStats: {
        userCount,
        studentCount,
        teacherCount,
        questionCount,
        aiQaCount,
      },
      placeholders: {
        aiConfig: '后续可继续扩展模型切换、Prompt 版本和调用限额配置。',
        governance: '后续可继续扩展用户治理、题库审核和系统日志管理。',
      },
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        student: true,
        teacher: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });

    return {
      list: users.map((user) => {
        const teacherState = this.readTeacherExtra(user.teacher?.extra);

        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          isActive: user.isActive,
          studentCode: user.student?.studentCode ?? null,
          teacherCode: user.teacher?.teacherCode ?? null,
          schoolName: user.teacher?.schoolName ?? user.student?.schoolName ?? null,
          subject: user.teacher?.subject ?? null,
          teacherReviewStatus:
            user.role === Role.TEACHER ? teacherState.reviewStatus : null,
          teacherReviewNote:
            user.role === Role.TEACHER ? teacherState.reviewNote : null,
          teacherClassAccessStatus:
            user.role === Role.TEACHER ? teacherState.classAccessStatus : null,
          teacherClassAccessNote:
            user.role === Role.TEACHER ? teacherState.classAccessNote : null,
          requestedClasses:
            user.role === Role.TEACHER ? teacherState.requestedClasses : [],
          approvedClasses:
            user.role === Role.TEACHER ? teacherState.approvedClasses : [],
          createdAt: user.createdAt,
        };
      }),
      total: users.length,
    };
  }

  async reviewTeacher(
    targetUserId: string,
    payload: ReviewTeacherDto,
    operatorUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        teacher: true,
      },
    });

    if (!user || user.role !== Role.TEACHER || !user.teacher) {
      throw new NotFoundException('未找到待审核的教师账号。');
    }

    if (targetUserId === operatorUserId) {
      throw new BadRequestException('不能审核当前登录管理员自己的账号。');
    }

    const currentExtra = this.readTeacherExtra(user.teacher.extra);
    const nextStatus = payload.decision;
    const note = payload.note?.trim() || null;

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        isActive: nextStatus === 'APPROVED',
        teacher: {
          update: {
            extra: {
              ...currentExtra,
              reviewStatus: nextStatus,
              reviewNote: note,
              reviewedAt: new Date().toISOString(),
              classAccessStatus:
                nextStatus === 'REJECTED'
                  ? 'NOT_SUBMITTED'
                  : currentExtra.classAccessStatus,
              classAccessNote:
                nextStatus === 'REJECTED'
                  ? '教师账号未通过审核，班级管理申请已重置。'
                  : currentExtra.classAccessNote,
              requestedClasses:
                nextStatus === 'REJECTED' ? [] : currentExtra.requestedClasses,
              approvedClasses:
                nextStatus === 'REJECTED' ? [] : currentExtra.approvedClasses,
            },
          },
        },
      },
      include: {
        teacher: true,
      },
    });

    const nextExtra = this.readTeacherExtra(updatedUser.teacher?.extra);
    return {
      userId: updatedUser.id,
      displayName: updatedUser.displayName,
      reviewStatus: nextExtra.reviewStatus,
      reviewNote: nextExtra.reviewNote,
      isActive: updatedUser.isActive,
      nextStep:
        nextStatus === 'APPROVED'
          ? '教师账号已审核通过。该教师登录后仍需提交班级管理申请，审核后才能查看对应班级学生。'
          : '教师账号已驳回。该教师需要补充资料后重新提交注册申请。',
    };
  }

  async reviewTeacherClassAccess(
    targetUserId: string,
    payload: ReviewTeacherClassAccessDto,
    operatorUserId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        teacher: true,
      },
    });

    if (!user || user.role !== Role.TEACHER || !user.teacher) {
      throw new NotFoundException('未找到待审核班级权限的教师账号。');
    }

    if (targetUserId === operatorUserId) {
      throw new BadRequestException('不能审核当前登录管理员自己的班级权限。');
    }

    const currentExtra = this.readTeacherExtra(user.teacher.extra);
    if (currentExtra.reviewStatus !== 'APPROVED') {
      throw new BadRequestException('教师账号尚未通过基础审核，不能审核班级管理权限。');
    }

    const decision = payload.decision;
    const requestedClasses = currentExtra.requestedClasses;
    if (requestedClasses.length === 0 && decision === 'APPROVED') {
      throw new BadRequestException('当前教师还没有提交班级管理申请。');
    }

    const approvedClasses =
      decision === 'APPROVED'
        ? this.normalizeManagedClasses(payload.approvedClasses ?? requestedClasses)
        : [];

    if (decision === 'APPROVED' && approvedClasses.length === 0) {
      throw new BadRequestException('审核通过时至少需要分配一个班级。');
    }

    const note = payload.note?.trim() || null;

    const updatedUser = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        teacher: {
          update: {
            extra: {
              ...currentExtra,
              classAccessStatus: decision,
              classAccessNote: note,
              classAccessReviewedAt: new Date().toISOString(),
              approvedClasses,
            },
          },
        },
      },
      include: {
        teacher: true,
      },
    });

    const nextExtra = this.readTeacherExtra(updatedUser.teacher?.extra);
    return {
      userId: updatedUser.id,
      displayName: updatedUser.displayName,
      classAccessStatus: nextExtra.classAccessStatus,
      classAccessNote: nextExtra.classAccessNote,
      requestedClasses: nextExtra.requestedClasses,
      approvedClasses: nextExtra.approvedClasses,
      nextStep:
        decision === 'APPROVED'
          ? '教师班级权限已审核通过，教师现在只能查看已分配班级的学生数据。'
          : '教师班级权限申请已驳回，教师需要重新提交班级管理申请。',
    };
  }

  async deleteUser(targetUserId: string, operatorUserId: string) {
    if (targetUserId === operatorUserId) {
      throw new BadRequestException('不能删除当前登录的管理员账号。');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        student: true,
        teacher: true,
        _count: {
          select: {
            exerciseRecords: true,
            wrongQuestions: true,
            aiQaRecords: true,
            learningReports: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('未找到要删除的账号。');
    }

    if (user.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: {
          role: Role.ADMIN,
          isActive: true,
        },
      });

      if (adminCount <= 1) {
        throw new BadRequestException('当前仅剩最后一个启用中的管理员账号，不能删除。');
      }
    }

    await this.prisma.user.delete({
      where: { id: targetUserId },
    });

    return {
      deletedUser: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      cleanupSummary: {
        exerciseRecordCount: user._count.exerciseRecords,
        wrongQuestionCount: user._count.wrongQuestions,
        aiQaRecordCount: user._count.aiQaRecords,
        learningReportCount: user._count.learningReports,
      },
    };
  }

  async getQuestions(query: QueryAdminQuestionsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const skip = (page - 1) * pageSize;

    const where: Prisma.QuestionWhereInput = {
      ...(query.grade ? { grade: query.grade } : {}),
      ...(query.questionType ? { questionType: query.questionType as QuestionType } : {}),
    };

    const [questions, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        include: {
          _count: {
            select: {
              exerciseDetails: true,
              wrongQuestions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.question.count({ where }),
    ]);

    return {
      list: questions.map((question) => ({
        id: question.id,
        title: question.title,
        grade: question.grade,
        difficulty: question.difficulty,
        questionType: question.questionType,
        source: question.source,
        canDelete: true,
        exerciseReferenceCount: question._count.exerciseDetails,
        wrongbookReferenceCount: question._count.wrongQuestions,
        createdAt: question.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      filters: {
        grade: query.grade ?? null,
        questionType: query.questionType ?? null,
      },
    };
  }

  getAiConfig() {
    return {
      provider: 'OpenAI-compatible',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL ?? null,
      promptVersion: 'stage-4-v2',
      placeholders: {
        moderation: '后续增加回答审核、年级边界校验和风险等级配置。',
        rateLimit: '后续增加用户级和接口级限流配置。',
      },
    };
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
}
