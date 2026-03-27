import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '管理端首页统计占位' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: '管理端用户列表基础版' })
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('questions')
  @ApiOperation({ summary: '管理端题目列表基础版' })
  getQuestions() {
    return this.adminService.getQuestions();
  }

  @Get('ai-config')
  @ApiOperation({ summary: 'AI 配置占位接口' })
  getAiConfig() {
    return this.adminService.getAiConfig();
  }
}
