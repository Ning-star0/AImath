import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { AssignStudentClassDto } from './dto/assign-student-class.dto';
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
  deleteUser(@Param() params: IdParamDto, @CurrentUser() user: { id: string }) {
    return this.adminService.deleteUser(params.id, user.id);
  }

  @Patch('users/:id/teacher-review')
  @ApiOperation({ summary: '审核教师基础账号' })
  reviewTeacher(
    @Param() params: IdParamDto,
    @Body() payload: ReviewTeacherDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.reviewTeacher(params.id, payload, user.id);
  }

  @Patch('users/:id/teacher-class-access-review')
  @ApiOperation({ summary: '审核教师班级管理权限' })
  reviewTeacherClassAccess(
    @Param() params: IdParamDto,
    @Body() payload: ReviewTeacherClassAccessDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.adminService.reviewTeacherClassAccess(params.id, payload, user.id);
  }

  @Get('questions')
  @ApiOperation({ summary: '获取题库列表' })
  getQuestions(@Query() query: QueryAdminQuestionsDto) {
    return this.adminService.getQuestions(query);
  }

  @Get('classes')
  @ApiOperation({ summary: '获取班级管理列表' })
  getClasses() {
    return this.adminService.getClasses();
  }

  @Patch('students/:id/class-assignment')
  @ApiOperation({ summary: '调整学生班级归属' })
  assignStudentToClass(
    @Param() params: IdParamDto,
    @Body() payload: AssignStudentClassDto,
  ) {
    return this.adminService.assignStudentToClass(params.id, payload);
  }

  @Get('ai-config')
  @ApiOperation({ summary: '获取 AI 配置信息' })
  getAiConfig() {
    return this.adminService.getAiConfig();
  }
}
