import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateStudentProfileDto {
  @ApiProperty({ example: 3, description: '学生当前年级，仅支持 1-6 年级' })
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;
}
