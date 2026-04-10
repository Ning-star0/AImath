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
      throw new BadRequestException('绠＄悊鍛樿处鍙峰彧鑳界敱鍚庡彴鍒涘缓銆');
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
      throw new BadRequestException('鐢ㄦ埛鍚嶃€侀偖绠辨垨鎵嬫満鍙峰凡琚崰鐢ㄣ€');
    }

    const studentCode = payload.studentCode?.trim();
    const teacherCode = payload.teacherCode?.trim();

    if (role === Role.STUDENT && !studentCode) {
      throw new BadRequestException('瀛︾敓娉ㄥ唽蹇呴』濉啓瀛﹀彿銆');
    }

    if (role === Role.TEACHER && !teacherCode) {
      throw new BadRequestException('鏁欏笀娉ㄥ唽蹇呴』濉啓宸ュ彿銆');
    }

    if (role === Role.STUDENT) {
      const duplicateStudentCode = await this.prisma.student.findUnique({
        where: { studentCode: studentCode! },
      });

      if (duplicateStudentCode) {
        throw new BadRequestException('璇ュ鍙峰凡瀹屾垚娉ㄥ唽銆');
      }
    }

    if (role === Role.TEACHER) {
      const duplicateTeacherCode = await this.prisma.teacher.findFirst({
        where: { teacherCode: teacherCode! },
      });

      if (duplicateTeacherCode) {
        throw new BadRequestException('璇ュ伐鍙峰凡瀹屾垚娉ㄥ唽銆');
      }
    }

    if (role === Role.STUDENT && !payload.grade) {
      throw new BadRequestException('瀛︾敓娉ㄥ唽闇€瑕佸～鍐欏勾绾т俊鎭€');
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
          title: '鏁欏笀璐﹀彿鐢宠宸叉彁浜',
          description:
            '鍩虹鏁欏笀韬唤瀹℃牳閫氳繃鍚庯紝浣犺繕闇€瑕佺櫥褰曟暀甯堢鎻愪氦鐝骇绠＄悊鐢宠锛屽鏍搁€氳繃鍚庢墠鑳芥煡鐪嬪搴旂彮绾у鐢熶俊鎭€',
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
              title: '瀹堕暱璐﹀彿宸插紑閫',
              description:
                '瀹堕暱璐﹀彿宸插垱寤哄畬鎴愩€傜櫥褰曞悗璇峰厛缁戝畾瀛╁瓙鐨勫鐢熻处鍙峰拰瀛︾敓瀵嗙爜锛屽啀鏌ョ湅瀵瑰簲瀛︿範鏁版嵁銆',
            }
          : {
              status: 'AUTO_LOGIN' as const,
              title: '娉ㄥ唽鎴愬姛',
              description: '浣犵殑瀛︿範璐﹀彿宸插垱寤哄畬鎴愶紝姝ｅ湪杩涘叆瀵瑰簲宸ヤ綔鍙般€',
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
          throw new UnauthorizedException('鏁欏笀璐﹀彿瀹℃牳鏈€氳繃銆');
        }
        throw new UnauthorizedException('鏁欏笀璐﹀彿姝ｅ湪瀹℃牳涓€');
      }

      throw new UnauthorizedException('褰撳墠璐﹀彿灏氭湭婵€娲汇€');
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
      throw new UnauthorizedException('鐢ㄦ埛涓嶅瓨鍦ㄣ€');
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
      throw new UnauthorizedException('鐢ㄦ埛涓嶅瓨鍦ㄣ€');
    }

    if (user.role !== Role.STUDENT || !user.student) {
      throw new BadRequestException('鍙湁瀛︾敓璐﹀彿鍙互鏇存柊骞寸骇淇℃伅銆');
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

    const result: ManagedClassAssignment[] = [];

    for (const item of value) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const record = item as Record<string, unknown>;
      const grade = Number(record.grade);
      const className =
        typeof record.className === 'string' ? normalizeManagedClassName(record.className) : '';
      const schoolName =
        typeof record.schoolName === 'string' ? record.schoolName.trim() : null;

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
}

