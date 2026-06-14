import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({ example: 'student_001', description: '平台用户名或默认登录名' })
  @Transform(trimString)
  @IsString()
  @MinLength(4)
  @MaxLength(60)
  username!: string;

  @ApiProperty({ example: '张小明', description: '用户姓名' })
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  displayName!: string;

  @ApiPropertyOptional({ example: 'S20260001', description: '学生学号，也用于家长绑定孩子' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  studentCode?: string;

  @ApiPropertyOptional({ example: 'T20260001', description: '教师工号' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  teacherCode?: string;

  @ApiProperty({ example: 'Study@123', description: '账号密码' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ example: 'student@example.com', description: '邮箱' })
  @IsOptional()
  @Transform(trimString)
  @IsEmail()
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ example: '13800138000', description: '手机号' })
  @IsOptional()
  @Transform(trimString)
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
  @Transform(trimString)
  @IsString()
  @MaxLength(60)
  className?: string;

  @ApiPropertyOptional({ example: '星河小学', description: '学校名称' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  schoolName?: string;

  @ApiPropertyOptional({ example: '数学', description: '教师学科' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(30)
  subject?: string;

  @ApiPropertyOptional({ example: '妈妈', description: '家长与孩子关系，例如妈妈、爸爸、监护人' })
  @IsOptional()
  @Transform(trimString)
  @IsString()
  @MaxLength(20)
  relationLabel?: string;
}
