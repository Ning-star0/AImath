import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class AssignStudentClassDto {
  @ApiProperty({ example: 3, description: '学生年级，范围 1-6' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;

  @ApiProperty({ example: '三年级一班', description: '班级名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  className!: string;

  @ApiPropertyOptional({ example: '未来小学', description: '学校名称' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolName?: string | null;
}
