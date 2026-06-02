import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class BindChildDto {
  @ApiProperty({ example: 'S20260001', description: '需要绑定的学生学号' })
  @IsString()
  @MinLength(4)
  studentCode!: string;

  @ApiProperty({ example: 'Study@123', description: '学生登录密码，用于家长绑定校验' })
  @IsString()
  @MinLength(6)
  studentPassword!: string;

  @ApiProperty({ example: '妈妈', description: '与孩子的关系，例如妈妈、爸爸、监护人' })
  @IsString()
  @MinLength(1)
  relationLabel!: string;
}
