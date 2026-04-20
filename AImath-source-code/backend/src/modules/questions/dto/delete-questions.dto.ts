import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class DeleteQuestionsDto {
  @ApiProperty({
    example: ['question-id-1', 'question-id-2'],
    description: '需要删除的题目 ID 列表',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  ids!: string[];
}
