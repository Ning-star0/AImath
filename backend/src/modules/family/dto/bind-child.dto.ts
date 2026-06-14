import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class BindChildDto {
  @ApiProperty({ example: 'S20260001', description: '需要绑定的学生学号' })
  @Transform(trimString)
  @IsString()
  @MinLength(4)
  @MaxLength(60)
  studentCode!: string;

  @ApiProperty({ example: 'Study@123', description: '学生登录密码，用于家长绑定校验' })
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  studentPassword!: string;

  @ApiProperty({ example: '妈妈', description: '与孩子的关系，例如妈妈、爸爸、监护人' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  relationLabel!: string;
}
