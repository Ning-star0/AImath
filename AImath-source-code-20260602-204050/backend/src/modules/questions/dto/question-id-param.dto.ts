import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class QuestionIdParamDto {
  @ApiProperty({ example: 'cm1question123', description: '题目 ID' })
  @IsString()
  id!: string;
}

