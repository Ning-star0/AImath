import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, QuestionType, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  normalizeManagedClassName,
  normalizeManagedClasses,
  readTeacherExtra,
} from '../../shared/utils/class-utils';
import { AssignStudentClassDto } from './dto/assign-student-class.dto';
import { QueryAdminQuestionsDto } from './dto/query-admin-questions.dto';
import { ReviewTeacherClassAccessDto } from './dto/review-teacher-class-access.dto';
import { ReviewTeacherDto } from './dto/review-teacher.dto';

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
        const teacherState = readTeacherExtra(user.teacher?.extra);

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

    const currentExtra = readTeacherExtra(user.teacher.extra);
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
            } as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: {
        teacher: true,
      },
    });

    const nextExtra = readTeacherExtra(updatedUser.teacher?.extra);
    return {
      userId: updatedUser.id,
      displayName: updatedUser.displayName,
      reviewStatus: nextExtra.reviewStatus,
      reviewNote: nextExtra.reviewNote,
      isActive: updatedUser.isActive,
      nextStep:
        nextStatus === 'APPROVED'
          ? '教师账号已审核通过。该教师登录后仍需提交班级管理申请，审核通过后才能查看对应班级学生。'
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

    const currentExtra = readTeacherExtra(user.teacher.extra);
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
        ? normalizeManagedClasses(payload.approvedClasses ?? requestedClasses)
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
            } as unknown as Prisma.InputJsonValue,
          },
        },
      },
      include: {
        teacher: true,
      },
    });

    const nextExtra = readTeacherExtra(updatedUser.teacher?.extra);
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

    const cleanupCounts = {
      memorySnapshotCount: 0,
      memoryHistoryCount: 0,
      childBindingCount: 0,
      parentBindingCount: 0,
    };

    if (user.student) {
      const [memorySnapshotCount, memoryHistoryCount, childBindingCount] =
        await Promise.all([
          this.prisma.studentMemorySnapshot.count({
            where: {
              studentId: user.student.id,
            },
          }),
          this.prisma.studentMemoryHistory.count({
            where: {
              studentId: user.student.id,
            },
          }),
          this.prisma.parentBinding.count({
            where: {
              studentId: user.student.id,
            },
          }),
        ]);

      cleanupCounts.memorySnapshotCount = memorySnapshotCount;
      cleanupCounts.memoryHistoryCount = memoryHistoryCount;
      cleanupCounts.childBindingCount = childBindingCount;
    }

    if (user.role === Role.PARENT) {
      cleanupCounts.parentBindingCount = await this.prisma.parentBinding.count({
        where: {
          parentUserId: user.id,
        },
      });
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
        memorySnapshotCount: cleanupCounts.memorySnapshotCount,
        memoryHistoryCount: cleanupCounts.memoryHistoryCount,
        childBindingCount: cleanupCounts.childBindingCount,
        parentBindingCount: cleanupCounts.parentBindingCount,
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
    const textBaseUrl = process.env.OPENAI_BASE_URL ?? null;
    const textModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    const visionBaseUrl =
      process.env.OPENAI_VISION_BASE_URL ?? textBaseUrl;
    const visionModel =
      process.env.OPENAI_VISION_MODEL ?? textModel;

    return {
      provider: 'OpenAI-compatible',
      promptVersion: 'stage-4-v2',
      textConfig: {
        provider: 'DeepSeek',
        model: textModel,
        baseUrl: textBaseUrl,
      },
      visionConfig: {
        provider: 'Doubao Ark',
        model: visionModel,
        baseUrl: visionBaseUrl,
      },
      placeholders: {
        moderation: '后续增加回答审核、年级边界校验和风险等级配置。',
        rateLimit: '后续增加用户级和接口级限流配置。',
      },
    };
  }

  async getClasses() {
    const students = await this.prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
      orderBy: [{ schoolName: 'asc' }, { grade: 'asc' }, { className: 'asc' }],
    });

    const teachers = await this.prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });

    const classMap = new Map<
      string,
      {
        key: string;
        schoolName: string | null;
        grade: number;
        className: string;
        studentCount: number;
        students: Array<{ id: string; displayName: string; studentCode: string }>;
        assignedTeachers: Array<{ id: string; displayName: string; teacherCode: string | null }>;
      }
    >();

    for (const student of students) {
      if (!student.className) {
        continue;
      }

      const normalizedClassName = normalizeManagedClassName(student.className);
      const key = `${student.schoolName ?? ''}__${student.grade}__${normalizedClassName}`;
      const current = classMap.get(key) ?? {
        key,
        schoolName: student.schoolName ?? null,
        grade: student.grade,
        className: normalizedClassName,
        studentCount: 0,
        students: [],
        assignedTeachers: [],
      };

      current.studentCount += 1;
      current.students.push({
        id: student.id,
        displayName: student.user.displayName,
        studentCode: student.studentCode,
      });
      classMap.set(key, current);
    }

    for (const teacher of teachers) {
      const extra = readTeacherExtra(teacher.extra);
      for (const assignment of extra.approvedClasses) {
        const normalizedClassName = normalizeManagedClassName(assignment.className);
        const key = `${assignment.schoolName ?? ''}__${assignment.grade}__${normalizedClassName}`;
        const current = classMap.get(key) ?? {
          key,
          schoolName: assignment.schoolName ?? null,
          grade: assignment.grade,
          className: normalizedClassName,
          studentCount: 0,
          students: [],
          assignedTeachers: [],
        };

        current.assignedTeachers.push({
          id: teacher.id,
          displayName: teacher.user.displayName,
          teacherCode: teacher.teacherCode,
        });
        classMap.set(key, current);
      }
    }

    const list = [...classMap.values()].sort((a, b) => {
      if ((a.schoolName ?? '') !== (b.schoolName ?? '')) {
        return (a.schoolName ?? '').localeCompare(b.schoolName ?? '');
      }
      if (a.grade !== b.grade) {
        return a.grade - b.grade;
      }
      return a.className.localeCompare(b.className);
    });

    return {
      total: list.length,
      list,
    };
  }

  async assignStudentToClass(studentId: string, payload: AssignStudentClassDto) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundException('未找到要分配班级的学生。');
    }

    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: {
        grade: payload.grade,
        className: normalizeManagedClassName(payload.className),
        schoolName: payload.schoolName?.trim() || null,
      },
      include: {
        user: {
          select: {
            displayName: true,
          },
        },
      },
    });

    await this.prisma.systemLog.create({
      data: {
        module: 'ADMIN',
        action: 'ASSIGN_STUDENT_CLASS',
        targetType: 'Student',
        targetId: updated.id,
        message: `已调整学生 ${updated.user.displayName} 的班级归属。`,
        payload: {
          grade: updated.grade,
          className: updated.className,
          schoolName: updated.schoolName,
        },
      },
    });

    return {
      id: updated.id,
      displayName: updated.user.displayName,
      grade: updated.grade,
      className: updated.className,
      schoolName: updated.schoolName,
    };
  }
}
