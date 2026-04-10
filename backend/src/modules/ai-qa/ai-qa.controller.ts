import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AskAiDto } from './dto/ask-ai.dto';
import { OcrPreviewDto } from './dto/ocr-preview.dto';
import { AiQaService } from './ai-qa.service';

@ApiTags('AI QA')
@Controller('ai-qa')
export class AiQaController {
  constructor(private readonly aiQaService: AiQaService) {}

  @Post('ask')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 数学文本答疑，返回结构化解析结果' })
  ask(
    @CurrentUser() user: { id: string; student?: { id: string } | null },
    @Body() payload: AskAiDto,
  ) {
    return this.aiQaService.ask(user, payload);
  }

  @Post('ocr-preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'OCR 预识别与人工确认接口' })
  ocrPreview(
    @CurrentUser() user: { id: string; student?: { id: string } | null },
    @Body() payload: OcrPreviewDto,
  ) {
    return this.aiQaService.ocrPreview(user, payload);
  }

  @Post('stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 数学文本答疑流式输出接口' })
  stream(
    @CurrentUser() user: { id: string; student?: { id: string } | null },
    @Body() payload: AskAiDto,
    @Res() response: any,
  ) {
    return this.aiQaService.stream(user, payload, response);
  }

  @Get('ocr-capability/:scene')
  @ApiOperation({ summary: 'OCR 扩展能力占位接口' })
  getOcrCapability(@Param('scene') scene: string) {
    return {
      scene,
      enabled: false,
      status: 'RESERVED',
      note: '阶段 4 仅预留图片 OCR 接口扩展位，后续将接入图像识别与题干提取。',
    };
  }
}
