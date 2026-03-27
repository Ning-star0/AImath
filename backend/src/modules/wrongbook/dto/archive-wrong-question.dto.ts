import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ArchiveWrongQuestionDto {
  @ApiPropertyOptional({
    example: '已掌握，先从错题本移除',
    description: '归档原因，可选',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;
}
