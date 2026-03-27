import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryWrongbookDto {
  @ApiPropertyOptional({ example: 'demo-kp-1', description: '按知识点筛选' })
  @IsOptional()
  @IsString()
  knowledgePointId?: string;

  @ApiPropertyOptional({ example: 3, description: '按年级筛选' })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @ApiPropertyOptional({ enum: QuestionType, description: '按题型筛选' })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ example: false, description: '是否只查看未解决错题' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unresolvedOnly?: boolean;

  @ApiPropertyOptional({ example: false, description: '是否包含已归档错题' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean;
}
