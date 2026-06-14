import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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
  @MaxLength(60)
  className!: string;

  @ApiPropertyOptional({ example: '未来小学' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  schoolName?: string;
}

export class ReviewTeacherClassAccessDto {
  @ApiProperty({ example: 'APPROVED', enum: ['APPROVED', 'REJECTED'] })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'])
  decision!: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({ example: '班级信息核验通过。' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @ApiPropertyOptional({ type: [ManagedClassDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => ManagedClassDto)
  approvedClasses?: ManagedClassDto[];
}
