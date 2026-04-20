import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class QueryReportDto {
  @ApiPropertyOptional({
    example: 7,
    description: '趋势统计天数，默认 7 天',
  })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(30)
  trendDays?: number;
}
