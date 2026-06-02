import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePilotFeedbackDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: '家长' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactName?: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @IsPhoneNumber('CN')
  contactPhone?: string;

  @ApiPropertyOptional({ example: '未来小学' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolName?: string;

  @ApiPropertyOptional({ example: 6 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  studentGrade?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ example: '学生更喜欢按错题类型查看复习建议。' })
  @IsString()
  @MaxLength(1000)
  content!: string;

  @ApiPropertyOptional({ example: 'USABILITY' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  feedbackType?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
