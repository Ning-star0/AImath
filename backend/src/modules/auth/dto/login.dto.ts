import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LoginDto {
  @ApiProperty({ example: 'S20260001', description: 'Student ID, teacher ID, phone, email, or username' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  account!: string;

  @ApiProperty({ example: '123456', description: 'Login password' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ enum: Role, description: 'Expected role for the selected login entry' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
