import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RetryWrongQuestionDto {
  @ApiProperty({ example: '18', description: '重练答案' })
  @IsString()
  answer!: string;
}

