import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ParentBinding, Role, Teacher } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import {
  normalizeManagedClassName,
  normalizeManagedClasses,
} from '../../shared/utils/class-utils';

type TeacherReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type TeacherClassAccessStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

type AuthUserRecord = {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  student:
    | {
        id?: string;
        studentCode: string;
        grade: number;
        schoolName?: string | null;
        className?: string | null;
      }
    | null;
  teacher:
    | {
        id?: string;
        teacherCode: string | null;
        subject?: string | null;
        schoolName?: string | null;
        extra?: unknown;
      }
    | null;
  parentBindings?: Array<
    Pick<ParentBinding, 'id' | 'relationLabel' | 'bindingStatus'> & {
      student: {
        id: string;
        studentCode: string;
        grade: number;
        className?: string | null;
        schoolName?: string | null;
        user: {
          displayName: string;
        };
      };
    }
  >;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto) {
    const role = payload.role ?? Role.STUDENT;

    if (role === Role.ADMIN) {
      throw new BadRequestException('管理员账号只能由后台创建。');
    }

    const duplicateUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: payload.username },
          ...(payload.email ? [{ email: payload.email }] : []),
          ...(payload.phone ? [{ phone: payload.phone }] : []),
        ],
      },
    });

    if (duplicateUser) {
      throw new BadRequestException('用户名、邮箱或手机号已被占用。');
    }

    const studentCode = payload.studentCode?.trim();
    const teacherCode = payload.teacherCode?.trim();

    if (role === Role.STUDENT && !studentCode) {
      throw new BadRequestException('学生注册必须填写学号。');
    }

    if (role === Role.TEACHER && !teacherCode) {
      throw new BadRequestException('教师注册必须填写工号。');
    }

    if (role === Role.STUDENT) {
      const duplicateStudentCode = await this.prisma.student.findUnique({
        where: { studentCode: studentCode! },
      });

      if (duplicateStudentCode) {
        throw new BadRequestException('该学号已完成注册。');
      }
    }

    if (role === Role.TEACHER) {
      const duplicateTeacherCode = await this.prisma.teacher.findFirst({
        where: { teacherCode: teacherCode! },
      });

      if (duplicateTeacherCode) {
        throw new BadRequestException('该工号已完成注册。');
      }
    }

    if (role === Role.STUDENT && !payload.grade) {
      throw new BadRequestException('学生注册需要填写年级信息。');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const createdUser = await this.prisma.user.create({
      data: {
        username: payload.username,
        email: payload.email,
        phone: payload.phone,
        passwordHash,
        role,
        displayName: payload.displayName,
        isActive: role !== Role.TEACHER,
        student:
          role === Role.STUDENT
            ? {
                create: {
                  studentCode: studentCode!,
                  grade: payload.grade ?? 1,
                  className: normalizeManagedClassName(payload.className) || null,
                  schoolName: payload.schoolName?.trim() || null,
                },
              }
            : undefined,
        teacher:
          role === Role.TEACHER
            ? {
                create: {
                  teacherCode: teacherCode!,
                  schoolName: payload.schoolName?.trim() || null,
                  subject: payload.subject?.trim() || null,
                  extra: this.buildTeacherExtraPayload('PENDING'),
                },
              }
            : undefined,
      },
      include: {
        student: true,
        teacher: true,
        parentBindings: {
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
        },
      },
    });

    if (role === Role.TEACHER) {
      return {
        accessToken: null,
        user: this.buildUserProfile(createdUser),
        nextStep: {
          status: 'PENDING_REVIEW',
          title: '教师账号申请已提交',
          description:
            '基础教师身份审核通过后，你还需要登录教师端提交班级管理申请，审核通过后才能查看对应班级学生信息。',
        },
      };
    }

    const authResult = this.buildAuthResult(createdUser);
    return {
      ...authResult,
      nextStep:
        role === Role.PARENT
          ? {
              status: 'AUTO_LOGIN' as const,
              title: '家长账号已开通',
              description:
                '家长账号已创建完成。登录后请先绑定孩子的学生账号和学生密码，再查看对应学习数据。',
            }
          : {
              status: 'AUTO_LOGIN' as const,
              title: '注册成功',
              description: '你的学习账号已创建完成，正在进入对应工作台。',
            },
    };
  }

  async login(payload: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: payload.account },
          { email: payload.account },
          { phone: payload.account },
          { student: { is: { studentCode: payload.account } } },
          { teacher: { is: { teacherCode: payload.account } } },
        ],
      },
      include: {
        student: true,
        teacher: true,
        parentBindings: {
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
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('未找到对应账号，请确认账号后重试。');
    }

    if (payload.role && user.role !== payload.role) {
      throw new UnauthorizedException('当前账号与所选身份入口不匹配，请切换到正确入口后再登录。');
    }

    const passwordMatched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatched) {
      throw new UnauthorizedException('密码输入不正确，请重新尝试。');
    }

    if (!user.isActive) {
      if (user.role === Role.TEACHER) {
        const reviewStatus = this.getTeacherReviewStatus(user.teacher);
        if (reviewStatus === 'REJECTED') {
          throw new UnauthorizedException('教师账号审核未通过。');
        }
        throw new UnauthorizedException('教师账号正在审核中。');
      }

      throw new UnauthorizedException('当前账号尚未激活。');
    }

    return this.buildAuthResult(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        teacher: true,
        parentBindings: {
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
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在。');
    }

    return this.buildUserProfile(user);
  }

  async updateStudentProfile(userId: string, payload: UpdateStudentProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        teacher: true,
        parentBindings: {
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
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在。');
    }

    if (user.role !== Role.STUDENT || !user.student) {
      throw new BadRequestException('只有学生账号可以更新年级信息。');
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id: user.student.id },
      data: {
        grade: payload.grade,
      },
    });

    return this.buildUserProfile({
      ...user,
      student: updatedStudent,
    });
  }

  private buildAuthResult(user: AuthUserRecord) {
    const tokenPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(tokenPayload),
      user: this.buildUserProfile(user),
    };
  }

  private buildUserProfile(user: AuthUserRecord) {
    const teacherReview = this.readTeacherReview(user.teacher);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      studentCode: user.student?.studentCode ?? null,
      teacherCode: user.teacher?.teacherCode ?? null,
      grade: user.student?.grade ?? null,
      isActive: user.isActive,
      student: user.student
        ? {
            id: user.student.id ?? '',
            userId: user.id,
            studentCode: user.student.studentCode,
            grade: user.student.grade,
            schoolName: user.student.schoolName ?? null,
            className: user.student.className ?? null,
          }
        : null,
      teacher: user.teacher
        ? {
            id: user.teacher.id ?? '',
            userId: user.id,
            teacherCode: user.teacher.teacherCode,
            schoolName: user.teacher.schoolName ?? null,
            subject: user.teacher.subject ?? null,
            reviewStatus: teacherReview.reviewStatus,
            reviewNote: teacherReview.reviewNote,
            classAccessStatus: teacherReview.classAccessStatus,
            classAccessNote: teacherReview.classAccessNote,
            requestedClasses: teacherReview.requestedClasses,
            approvedClasses: teacherReview.approvedClasses,
          }
        : null,
      parentBindings:
        user.parentBindings?.map((binding) => ({
          id: binding.id,
          relationLabel: binding.relationLabel,
          bindingStatus: binding.bindingStatus,
          student: {
            id: binding.student.id,
            displayName: binding.student.user.displayName,
            studentCode: binding.student.studentCode,
            grade: binding.student.grade,
            className: binding.student.className ?? null,
            schoolName: binding.student.schoolName ?? null,
          },
        })) ?? [],
    };
  }

  private getTeacherReviewStatus(teacher: AuthUserRecord['teacher']) {
    return this.readTeacherReview(teacher).reviewStatus;
  }

  private readTeacherReview(teacher: AuthUserRecord['teacher']) {
    const extra =
      teacher?.extra && typeof teacher.extra === 'object'
        ? (teacher.extra as Record<string, unknown>)
        : {};

    return {
      reviewStatus: (extra.reviewStatus as TeacherReviewStatus | undefined) ?? 'PENDING',
      reviewNote: typeof extra.reviewNote === 'string' ? extra.reviewNote : null,
      reviewedAt: typeof extra.reviewedAt === 'string' ? extra.reviewedAt : null,
      classAccessStatus:
        (extra.classAccessStatus as TeacherClassAccessStatus | undefined) ?? 'NOT_SUBMITTED',
      classAccessNote:
        typeof extra.classAccessNote === 'string' ? extra.classAccessNote : null,
      requestedClasses: normalizeManagedClasses(extra.requestedClasses),
      approvedClasses: normalizeManagedClasses(extra.approvedClasses),
    };
  }

  private buildTeacherExtraPayload(
    reviewStatus: TeacherReviewStatus,
    reviewNote?: string,
  ) {
    return {
      reviewStatus,
      reviewNote: reviewNote ?? null,
      reviewedAt: reviewStatus === 'PENDING' ? null : new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      classAccessStatus: 'NOT_SUBMITTED',
      classAccessNote: null,
      classAccessSubmittedAt: null,
      classAccessReviewedAt: null,
      requestedClasses: [],
      approvedClasses: [],
    };
  }

}

