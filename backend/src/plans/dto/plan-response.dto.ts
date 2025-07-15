import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Plan, PlanStatus } from '../../../generated/prisma';

export class PlanResponseDto {
  @ApiProperty({
    description: '계획 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '목표 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  goalId: string;

  @ApiProperty({
    description: '계획 제목',
    example: '주간 운동 계획',
  })
  title: string;

  @ApiPropertyOptional({
    description: '계획 설명',
    example: '이번 주 운동 목표를 달성하기 위한 구체적인 계획',
  })
  description?: string;

  @ApiProperty({
    description: '정렬 순서',
    example: 0,
  })
  orderIndex: number;

  @ApiProperty({
    description: '계획 상태',
    enum: PlanStatus,
    example: PlanStatus.PENDING,
  })
  status: PlanStatus;

  @ApiPropertyOptional({
    description: '예상 소요 시간 (분 단위)',
    example: 60,
  })
  estimatedDuration?: number;

  @ApiProperty({
    description: '생성일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  constructor(plan: Plan) {
    this.id = plan.id;
    this.goalId = plan.goalId;
    this.title = plan.title;
    this.description = plan.description || undefined;
    this.orderIndex = plan.orderIndex;
    this.status = plan.status;
    this.estimatedDuration = plan.estimatedDuration || undefined;
    this.createdAt = plan.createdAt;
    this.updatedAt = plan.updatedAt;
  }
}
