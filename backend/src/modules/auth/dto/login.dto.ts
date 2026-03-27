import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'S20260001', description: '学生学号或账号' })
  @IsString()
  account!: string;

  @ApiProperty({ example: '123456', description: '登录密码' })
  @IsString()
  @MinLength(6)
  password!: string;
}

