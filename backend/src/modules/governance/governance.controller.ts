import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePilotFeedbackDto } from './dto/create-pilot-feedback.dto';
import { GovernanceService } from './governance.service';

@ApiTags('Governance')
@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Post('pilot-feedback')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '提交试点反馈' })
  createPilotFeedback(
    @CurrentUser() user: { id: string; role: Role },
    @Body() payload: CreatePilotFeedbackDto,
  ) {
    return this.governanceService.createPilotFeedback(user.id, {
      ...payload,
      role: payload.role ?? user.role,
    });
  }

  @Get('pilot-feedback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '查看试点反馈列表' })
  getPilotFeedbackList() {
    return this.governanceService.getPilotFeedbackList();
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '查看系统日志' })
  getSystemLogs() {
    return this.governanceService.getSystemLogs();
  }
}
