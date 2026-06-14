import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AskAiDto {
  @ApiProperty({
    example: '35 + 27 等于多少？请一步一步讲解。',
    description: '学生输入的原始题目文本',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(3000)
  originalQuestion!: string;

  @ApiPropertyOptional({ example: 3, description: '学生年级' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @ApiPropertyOptional({
    example: { source: 'student-practice-page' },
    description: '上下文信息',
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: false,
    description: '是否为 OCR 图像识别后的问题，阶段 4 仅预留字段',
  })
  @IsOptional()
  @IsBoolean()
  fromOcr?: boolean;

  @ApiPropertyOptional({
    example: 'SINGLE_CHOICE',
    description: '题型，前端可选填，便于 AI 更准确理解题目形式',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  questionType?: string;

  @ApiPropertyOptional({
    example: ['A. 40', 'B. 50', 'C. 52', 'D. 60'],
    description: '当题型为选择题时，可传入选项列表',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(500, { each: true })
  options?: string[];

  @ApiPropertyOptional({
    description: '图片题目的 Data URL，上传图片后可直接走多模态讲题链路',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8_000_000)
  imageDataUrl?: string;

  @ApiPropertyOptional({
    description: '图片讲题时的人类补充提示，可辅助模型理解题干',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  manualHint?: string;
}
