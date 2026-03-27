import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  getDashboard() {
    return this.teacherService.getDashboard();
  }

  @Get('students')
  @ApiOperation({ summary: '教师端学生列表基础版' })
  getStudents() {
    return this.teacherService.getStudents();
  }

  @Get('students/:studentId/report')
  @ApiOperation({ summary: '查看学生报告接口预留' })
  getStudentReport(@Param('studentId') studentId: string) {
    return this.teacherService.getStudentReport(studentId);
  }
}
