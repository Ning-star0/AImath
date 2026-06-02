import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TeacherClassAccessRequestDto } from './dto/teacher-class-access-request.dto';
import { TeacherService } from './teacher.service';

@ApiTags('Teacher')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
@Controller('teacher')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '教师端首页基础概览' })
  getDashboard(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      student?: { id: string; grade: number } | null;
      teacher?: { id: string; extra?: unknown } | null;
    },
  ) {
    return this.teacherService.getDashboard(user);
  }

  @Get('students')
  @ApiOperation({ summary: '教师端学生列表与班级权限结果' })
  getStudents(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      student?: { id: string; grade: number } | null;
      teacher?: { id: string; extra?: unknown } | null;
    },
  ) {
    return this.teacherService.getStudents(user);
  }

  @Get('students/:studentId/report')
  @ApiOperation({ summary: '查看学生学情画像与 AI 分析' })
  getStudentReport(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      student?: { id: string; grade: number } | null;
      teacher?: { id: string; extra?: unknown } | null;
    },
    @Param('studentId') studentId: string,
  ) {
    return this.teacherService.getStudentReport(user, studentId);
  }

  @Post('class-access-request')
  @ApiOperation({ summary: '教师提交班级管理申请' })
  submitClassAccessRequest(
    @CurrentUser()
    user: {
      id: string;
      role: Role;
      student?: { id: string; grade: number } | null;
      teacher?: { id: string; extra?: unknown } | null;
    },
    @Body() payload: TeacherClassAccessRequestDto,
  ) {
    return this.teacherService.submitClassAccessRequest(user, payload);
  }
}
