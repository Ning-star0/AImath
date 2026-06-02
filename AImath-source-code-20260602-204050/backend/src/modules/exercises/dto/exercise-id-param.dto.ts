import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ExerciseIdParamDto {
  @ApiProperty({ example: 'cm1exercise123', description: '练习记录 ID' })
  @IsString()
  id!: string;
}

