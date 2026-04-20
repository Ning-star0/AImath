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
  @ApiProperty({ example: 'student_001', description: '平台用户名或默认登录名' })
  @IsString()
  @MinLength(4)
  username!: string;

  @ApiProperty({ example: '张小明', description: '用户姓名' })
  @IsString()
  @MinLength(2)
  displayName!: string;

  @ApiPropertyOptional({ example: 'S20260001', description: '学生学号，也用于家长绑定孩子' })
  @IsOptional()
  @IsString()
  studentCode?: string;

  @ApiPropertyOptional({ example: 'T20260001', description: '教师工号' })
  @IsOptional()
  @IsString()
  teacherCode?: string;

  @ApiProperty({ example: 'Study@123', description: '账号密码' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: 'student@example.com', description: '邮箱' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '13800138000', description: '手机号' })
  @IsOptional()
  @Matches(/^1\d{10}$/)
  phone?: string;

  @ApiPropertyOptional({ enum: Role, default: Role.STUDENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: 3, description: '学生年级，学生注册必填' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;

  @ApiPropertyOptional({ example: '三年级二班', description: '学生班级' })
  @IsOptional()
  @IsString()
  className?: string;

  @ApiPropertyOptional({ example: '星河小学', description: '学校名称' })
  @IsOptional()
  @IsString()
  schoolName?: string;

  @ApiPropertyOptional({ example: '数学', description: '教师学科' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: '妈妈', description: '家长与孩子关系，例如妈妈、爸爸、监护人' })
  @IsOptional()
  @IsString()
  relationLabel?: string;
}
