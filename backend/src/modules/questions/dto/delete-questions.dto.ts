import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteQuestionsDto {
  @ApiProperty({
    example: ['question-id-1', 'question-id-2'],
    description: '需要删除的题目 ID 列表',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(100, { each: true })
  ids!: string[];
}
