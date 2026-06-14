import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class IdParamDto {
  @ApiProperty({ example: 'cmnrj10410002p70i2z4azx1j' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  id!: string;
}

export class StudentIdParamDto {
  @ApiProperty({ example: 'cmnrj10410003p70i6rg9sm3p' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  studentId!: string;
}

export class SceneParamDto {
  @ApiProperty({ example: 'student-practice' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  scene!: string;
}
