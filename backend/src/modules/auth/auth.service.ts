import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, Teacher } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';

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
};

type TeacherReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
type TeacherClassAccessStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED';

type ManagedClassAssignment = {
  grade: number;
  className: string;
  schoolName?: string | null;
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
      throw new BadRequestException(
        'Administrator accounts can only be created from the admin console.',
      );
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
      throw new BadRequestException(
        'Username, email, or phone number is already in use.',
      );
    }

    const studentCode = payload.studentCode?.trim();
    const teacherCode = payload.teacherCode?.trim();

    if (role === Role.STUDENT && !studentCode) {
      throw new BadRequestException('Student ID is required.');
    }

    if (role === Role.TEACHER && !teacherCode) {
      throw new BadRequestException('Teacher ID is required.');
    }

    if (role === Role.STUDENT) {
      const duplicateStudentCode = await this.prisma.student.findUnique({
        where: { studentCode: studentCode! },
      });

      if (duplicateStudentCode) {
        throw new BadRequestException('Student ID already exists.');
      }
    }

    if (role === Role.TEACHER) {
      const duplicateTeacherCode = await this.prisma.teacher.findFirst({
        where: { teacherCode: teacherCode! },
      });

      if (duplicateTeacherCode) {
        throw new BadRequestException('Teacher ID already exists.');
      }
    }

    if (role === Role.STUDENT && !payload.grade) {
      throw new BadRequestException('Grade is required for student registration.');
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
        isActive: role === Role.STUDENT,
        student:
          role === Role.STUDENT
            ? {
                create: {
                  studentCode: studentCode!,
                  grade: payload.grade ?? 1,
                  className: payload.className,
                  schoolName: payload.schoolName,
                },
              }
            : undefined,
        teacher:
          role === Role.TEACHER
            ? {
                create: {
                  teacherCode: teacherCode!,
                  schoolName: payload.schoolName,
                  subject: payload.subject,
                  extra: this.buildTeacherExtraPayload('PENDING'),
                },
              }
            : undefined,
      },
      include: {
        student: true,
        teacher: true,
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
            '我们已收到你的教师注册申请。审核通过并激活后，你就可以登录教师工作台查看班级与学情数据。',
        },
      };
    }

    return {
      ...this.buildAuthResult(createdUser),
      nextStep: {
        status: 'AUTO_LOGIN',
        title: '注册成功',
        description: '你的学习账号已经创建完成，正在进入学生学习中心。',
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
      },
    });

    if (!user) {
      throw new UnauthorizedException('Account does not exist.');
    }

    if (payload.role && user.role !== payload.role) {
      throw new UnauthorizedException(
        'This account does not match the selected role entry.',
      );
    }

    const passwordMatched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatched) {
      throw new UnauthorizedException('Incorrect password.');
    }

    if (!user.isActive) {
      if (user.role === Role.TEACHER) {
        const reviewStatus = this.getTeacherReviewStatus(user.teacher);
        if (reviewStatus === 'REJECTED') {
          throw new UnauthorizedException('Teacher review was rejected.');
        }
        throw new UnauthorizedException('Teacher review is pending.');
      }

      throw new UnauthorizedException('Account is not activated.');
    }

    return this.buildAuthResult(user);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User does not exist.');
    }

    return this.buildUserProfile(user);
  }

  async updateStudentProfile(userId: string, payload: UpdateStudentProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        teacher: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User does not exist.');
    }

    if (user.role !== Role.STUDENT || !user.student) {
      throw new BadRequestException(
        'Only student accounts can update student grade information.',
      );
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
      requestedClasses: this.readManagedClasses(extra.requestedClasses),
      approvedClasses: this.readManagedClasses(extra.approvedClasses),
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

  private readManagedClasses(value: unknown): ManagedClassAssignment[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }

        const record = item as Record<string, unknown>;
        const grade = Number(record.grade);
        const className =
          typeof record.className === 'string' ? record.className.trim() : '';
        const schoolName =
          typeof record.schoolName === 'string' ? record.schoolName.trim() : null;

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
