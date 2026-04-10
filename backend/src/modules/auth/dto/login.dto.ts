import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'S20260001', description: 'Student ID, teacher ID, phone, email, or username' })
  @IsString()
  account!: string;

  @ApiProperty({ example: '123456', description: 'Login password' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ enum: Role, description: 'Expected role for the selected login entry' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
