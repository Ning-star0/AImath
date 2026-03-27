import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto) {
    const role = payload.role ?? Role.STUDENT;

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
      throw new BadRequestException('用户名、邮箱或手机号已存在');
    }

    if (role === Role.STUDENT) {
      const duplicateStudentCode = await this.prisma.student.findUnique({
        where: { studentCode: payload.studentCode },
      });

      if (duplicateStudentCode) {
        throw new BadRequestException('学号已存在');
      }
    }

    if (role === Role.TEACHER) {
      const duplicateTeacherCode = await this.prisma.teacher.findFirst({
        where: { teacherCode: payload.studentCode },
      });

      if (duplicateTeacherCode) {
        throw new BadRequestException('教师工号已存在');
      }
    }

    if (role === Role.STUDENT && !payload.grade) {
      throw new BadRequestException('学生注册时必须提供年级');
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
        student:
          role === Role.STUDENT
            ? {
                create: {
                  studentCode: payload.studentCode,
                  grade: payload.grade ?? 1,
                },
              }
            : undefined,
        teacher:
          role === Role.TEACHER
            ? {
                create: {
                  teacherCode: payload.studentCode,
                },
              }
            : undefined,
      },
      include: {
        student: true,
        teacher: true,
      },
    });

    return this.buildAuthResult(createdUser);
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

    if (!user || !user.isActive) {
      throw new UnauthorizedException('账号不存在或已被禁用');
    }

    const passwordMatched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!passwordMatched) {
      throw new UnauthorizedException('账号或密码错误');
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
      throw new UnauthorizedException('用户不存在');
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      student: user.student,
      teacher: user.teacher,
      isActive: user.isActive,
    };
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
      throw new UnauthorizedException('用户不存在');
    }

    if (user.role !== Role.STUDENT || !user.student) {
      throw new BadRequestException('当前账号不是学生账号，无法修改学生年级');
    }

    const updatedStudent = await this.prisma.student.update({
      where: { id: user.student.id },
      data: {
        grade: payload.grade,
      },
    });

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      student: updatedStudent,
      teacher: user.teacher,
      isActive: user.isActive,
      grade: updatedStudent.grade,
      studentCode: updatedStudent.studentCode,
    };
  }

  private buildAuthResult(user: {
    id: string;
    username: string;
    displayName: string;
    role: Role;
    student: { studentCode: string; grade: number } | null;
    teacher: { teacherCode: string | null } | null;
  }) {
    const tokenPayload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(tokenPayload),
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        studentCode: user.student?.studentCode ?? null,
        teacherCode: user.teacher?.teacherCode ?? null,
        grade: user.student?.grade ?? null,
      },
    };
  }
}
