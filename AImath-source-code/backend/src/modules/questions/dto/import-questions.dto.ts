import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ImportKnowledgePointDto {
  @ApiProperty({ example: 'GRADE3-ADD-001' })
  @IsString()
  code!: string;

  @ApiProperty({ example: '万以内加法' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;

  @ApiPropertyOptional({ example: 'MATH', description: '学科，默认 MATH' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: '整数加法' })
  @IsOptional()
  @IsString()
  chapter?: string;

  @ApiPropertyOptional({ example: '理解万以内整数加法的运算规则。' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class ImportQuestionOptionDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  label!: string;

  @ApiProperty({ example: '40' })
  @IsString()
  value!: string;
}

export class ImportQuestionDto {
  @ApiPropertyOptional({ example: 'grade3-question-001' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ example: '三年级加法应用题' })
  @IsString()
  title!: string;

  @ApiProperty({ example: '小明原来有 12 支铅笔，又买了 8 支，现在一共有多少支？' })
  @IsString()
  stem!: string;

  @ApiPropertyOptional({ example: 'MATH', description: '学科，默认 MATH' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ enum: QuestionType, example: QuestionType.SHORT_ANSWER })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty!: number;

  @ApiProperty({ example: '20' })
  @IsString()
  answer!: string;

  @ApiPropertyOptional({ type: [ImportQuestionOptionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportQuestionOptionDto)
  options?: ImportQuestionOptionDto[];

  @ApiPropertyOptional({ example: '先看原来有 12 支，再加上新买的 8 支，所以 12 + 8 = 20。' })
  @IsOptional()
  @IsString()
  analysis?: string;

  @ApiProperty({ example: ['加法', '应用题'] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  tags!: string[];

  @ApiPropertyOptional({ example: ['GRADE3-ADD-001', 'GRADE3-APP-001'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knowledgePointCodes?: string[];

  @ApiPropertyOptional({ example: 'manual-json-import' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: { importBatch: '2026-03-24-demo' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class ImportQuestionsDto {
  @ApiPropertyOptional({ type: [ImportKnowledgePointDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportKnowledgePointDto)
  knowledgePoints?: ImportKnowledgePointDto[];

  @ApiProperty({ type: [ImportQuestionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportQuestionDto)
  questions!: ImportQuestionDto[];

  @ApiPropertyOptional({ example: 'grade3-demo-batch' })
  @IsOptional()
  @IsString()
  batchName?: string;
}
