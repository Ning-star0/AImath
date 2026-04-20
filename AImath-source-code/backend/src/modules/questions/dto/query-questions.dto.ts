import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class QueryQuestionsDto {
  @ApiPropertyOptional({ example: 3, description: '年级筛选' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @ApiPropertyOptional({ example: 2, description: '难度筛选' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ example: '分数加减法', description: '知识点 ID' })
  @IsOptional()
  @IsString()
  knowledgePointId?: string;

  @ApiPropertyOptional({ example: '应用题', description: '关键词搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ enum: QuestionType, description: '题型筛选' })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ example: 'MATH', description: '学科筛选，默认 MATH' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: 20, description: '每页数量' })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
