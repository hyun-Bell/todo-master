import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { PlanStatus } from '../../../generated/prisma';

export class CreatePlanDto {
  @ApiProperty({
    description: '목표 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  goalId!: string;

  @ApiProperty({
    description: '계획 제목',
    example: '주간 운동 계획',
  })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({
    description: '계획 설명',
    example: '이번 주 운동 목표를 달성하기 위한 구체적인 계획',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '정렬 순서',
    example: 0,
    default: 0,
  })
  @IsInt()
  @IsOptional()
  orderIndex?: number;

  @ApiPropertyOptional({
    description: '예상 소요 시간 (분 단위)',
    example: 60,
  })
  @IsInt()
  @IsOptional()
  estimatedDuration?: number;

  @ApiPropertyOptional({
    description: '계획 상태',
    enum: PlanStatus,
    default: PlanStatus.PENDING,
  })
  @IsEnum(PlanStatus)
  @IsOptional()
  status?: PlanStatus;
}
