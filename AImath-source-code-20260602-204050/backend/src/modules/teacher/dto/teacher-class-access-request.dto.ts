import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class ManagedClassDto {
  @ApiProperty({ example: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  grade!: number;

  @ApiProperty({ example: '六年级二班' })
  @IsString()
  className!: string;

  @ApiPropertyOptional({ example: '未来小学' })
  @IsOptional()
  @IsString()
  schoolName?: string;
}

export class TeacherClassAccessRequestDto {
  @ApiProperty({ type: [ManagedClassDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ManagedClassDto)
  classes!: ManagedClassDto[];
}
