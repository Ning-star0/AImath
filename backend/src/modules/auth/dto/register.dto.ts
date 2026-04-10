import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'student_001', description: 'System username' })
  @IsString()
  @MinLength(4)
  username!: string;

  @ApiProperty({ example: '小明', description: 'Display name' })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiPropertyOptional({ example: 'S20260001', description: 'Student ID' })
  @IsOptional()
  @IsString()
  studentCode?: string;

  @ApiPropertyOptional({ example: 'T20260001', description: 'Teacher ID' })
  @IsOptional()
  @IsString()
  teacherCode?: string;

  @ApiProperty({ example: '12345678', description: 'Account password' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'student@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '13800138000' })
  @IsOptional()
  @Matches(/^1\d{10}$/)
  phone?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.STUDENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 3, description: 'Student grade, required for students' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @ApiPropertyOptional({ example: '三年级二班', description: 'Class name for student registration' })
  @IsOptional()
  @IsString()
  className?: string;

  @ApiPropertyOptional({ example: '星河小学', description: 'School name' })
  @IsOptional()
  @IsString()
  schoolName?: string;

  @ApiPropertyOptional({ example: '数学', description: 'Teacher subject' })
  @IsOptional()
  @IsString()
  subject?: string;
}
