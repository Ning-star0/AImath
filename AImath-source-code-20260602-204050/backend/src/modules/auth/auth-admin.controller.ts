import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Auth Admin Demo')
@Controller('auth/admin-demo')
export class AuthAdminController {
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员权限守卫示例接口' })
  getAdminProtectedData() {
    return {
      visible: true,
      note: '该接口用于验证 Roles Guard 已接入成功。',
    };
  }
}

