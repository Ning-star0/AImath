import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitExerciseAnswerDto {
  @ApiProperty({ example: 'cm1question123', description: '题目 ID' })
  @IsString()
  questionId!: string;

  @ApiProperty({
    example: '20',
    description: '学生答案，选择题可传 A/B/C 或逗号分隔值',
  })
  @IsString()
  answer!: string;
}

export class SubmitExerciseDto {
  @ApiProperty({
    type: [SubmitExerciseAnswerDto],
    description: '本次提交的题目答案列表',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitExerciseAnswerDto)
  answers!: SubmitExerciseAnswerDto[];

  @ApiPropertyOptional({ example: 'MATH', description: '学科，默认 MATH' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    example: { source: 'student-practice-page' },
    description: '练习上下文信息',
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, unknown>;
}
