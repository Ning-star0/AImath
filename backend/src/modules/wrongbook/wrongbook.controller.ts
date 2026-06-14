import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IdParamDto } from '../../common/dto/id-param.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ArchiveWrongQuestionDto } from './dto/archive-wrong-question.dto';
import { QueryWrongbookDto } from './dto/query-wrongbook.dto';
import { RetryWrongQuestionDto } from './dto/retry-wrong-question.dto';
import { WrongbookService } from './wrongbook.service';

@ApiTags('Wrongbook')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wrongbook')
export class WrongbookController {
  constructor(private readonly wrongbookService: WrongbookService) {}

  @Get()
  @ApiOperation({ summary: '查询错题列表，可按知识点分类筛选' })
  list(
    @CurrentUser()
    user: { id: string; role: Role; student?: { id: string; grade: number } | null },
    @Query() query: QueryWrongbookDto,
  ) {
    return this.wrongbookService.list(user, query);
  }

  @Get('stats')
  @ApiOperation({ summary: '查询错题统计信息' })
  stats(
    @CurrentUser()
    user: { id: string; role: Role; student?: { id: string; grade: number } | null },
  ) {
    return this.wrongbookService.stats(user);
  }

  @Patch(':id/retry')
  @ApiOperation({ summary: '错题重练并更新掌握状态' })
  retry(
    @CurrentUser()
    user: { id: string; role: Role; student?: { id: string; grade: number } | null },
    @Param() params: IdParamDto,
    @Body() payload: RetryWrongQuestionDto,
  ) {
    return this.wrongbookService.retry(user, params.id, payload);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: '归档错题，不做物理删除' })
  archive(
    @CurrentUser()
    user: { id: string; role: Role; student?: { id: string; grade: number } | null },
    @Param() params: IdParamDto,
    @Body() payload: ArchiveWrongQuestionDto,
  ) {
    return this.wrongbookService.archive(user, params.id, payload);
  }
}
