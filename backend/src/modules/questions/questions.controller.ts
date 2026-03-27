import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DeleteQuestionsDto } from './dto/delete-questions.dto';
import { ImportQuestionsDto } from './dto/import-questions.dto';
import { QuestionIdParamDto } from './dto/question-id-param.dto';
import { QueryQuestionsDto } from './dto/query-questions.dto';
import { QuestionsService } from './questions.service';

@ApiTags('Questions')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  @ApiOperation({ summary: '获取题目列表，支持按年级、知识点、难度筛选' })
  findAll(@Query() query: QueryQuestionsDto) {
    return this.questionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取题目详情' })
  findOne(@Param() params: QuestionIdParamDto) {
    return this.questionsService.findOne(params.id);
  }

  @Post('import-json')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员 JSON 批量导入题库与知识点' })
  importJson(@Body() payload: ImportQuestionsDto) {
    return this.questionsService.importFromJson(payload);
  }

  @Delete('batch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '管理员批量删除题目' })
  deleteBatch(@Body() payload: DeleteQuestionsDto) {
    return this.questionsService.deleteBatch(payload);
  }
}
