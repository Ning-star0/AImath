import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class OcrPreviewDto {
  @ApiPropertyOptional({ example: 'math-question.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  imageName?: string;

  @ApiPropertyOptional({
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...',
    description: '图片的 base64 Data URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(8_000_000)
  imageDataUrl?: string;

  @ApiPropertyOptional({ example: '扇形统计图主要用来展示什么信息？' })
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  manualText?: string;

  @ApiPropertyOptional({ example: 'SHORT_ANSWER' })
  @IsOptional()
  @IsString()
  questionType?: string;

  @ApiPropertyOptional({ example: 6, description: '学生当前年级，用于辅助图片识题' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  grade?: number;
}
