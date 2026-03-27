import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AskAiDto {
  @ApiProperty({
    example: '35 + 27 等于多少？请一步一步讲解。',
    description: '学生输入的原始题目文本',
  })
  @IsString()
  @IsNotEmpty()
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
  questionType?: string;

  @ApiPropertyOptional({
    example: ['A. 40', 'B. 50', 'C. 52', 'D. 60'],
    description: '当题型为选择题时，可传入选项列表',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}
