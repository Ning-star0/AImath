import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BindChildDto } from './dto/bind-child.dto';
import { FamilyService } from './family.service';

@ApiTags('Family')
@Controller('family')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取家长或学生视角下的孩子学习概览' })
  getOverview(
    @CurrentUser() user: { id: string; role: string },
    @Query('childId') childId?: string,
  ) {
    return this.familyService.getOverview(user as any, childId);
  }

  @Post('bind-child')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '家长绑定孩子' })
  bindChild(
    @CurrentUser() user: { id: string; role: string },
    @Body() payload: BindChildDto,
  ) {
    return this.familyService.bindChild(user as any, payload);
  }
}
