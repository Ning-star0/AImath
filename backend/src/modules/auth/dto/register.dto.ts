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
  @ApiProperty({ example: 'student_001', description: '系统用户名' })
  @IsString()
  @MinLength(4)
  username!: string;

  @ApiProperty({ example: '小明', description: '显示名称' })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiProperty({ example: 'S20260001', description: '学生学号或教师工号' })
  @IsString()
  studentCode!: string;

  @ApiProperty({ example: '12345678', description: '登录密码' })
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

  @ApiPropertyOptional({ example: 3, description: '学生年级，学生角色时必填' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;
}

