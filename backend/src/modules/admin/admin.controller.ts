import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { QueryAdminQuestionsDto } from './dto/query-admin-questions.dto';
import { ReviewTeacherClassAccessDto } from './dto/review-teacher-class-access.dto';
import { ReviewTeacherDto } from './dto/review-teacher.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '获取管理端首页统计数据' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: '获取平台用户列表与教师审核状态' })
  getUsers() {
    return this.adminService.getUsers();
  }

  @Delete('users/:id')
  @ApiOperation({ summary: '删除平台账号' })
  deleteUser(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.adminService.deleteUser(id, user.id);
  }

  @Patch('users/:id/teacher-review')
  @ApiOperation({ summary: '审核教师基础账号' })
  reviewTeacher(
    @Param('id') id: string,
    @Body() payload: ReviewTeacherDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.reviewTeacher(id, payload, user.id);
  }

  @Patch('users/:id/teacher-class-access-review')
  @ApiOperation({ summary: '审核教师班级管理权限' })
  reviewTeacherClassAccess(
    @Param('id') id: string,
    @Body() payload: ReviewTeacherClassAccessDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.reviewTeacherClassAccess(id, payload, user.id);
  }

  @Get('questions')
  @ApiOperation({ summary: '获取题库列表' })
  getQuestions(@Query() query: QueryAdminQuestionsDto) {
    return this.adminService.getQuestions(query);
  }

  @Get('ai-config')
  @ApiOperation({ summary: '获取 AI 配置信息' })
  getAiConfig() {
    return this.adminService.getAiConfig();
  }
}
