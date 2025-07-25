import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Goal, GoalStatus, Priority } from '../../../generated/prisma';

class PlanSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  orderIndex: number;
}

export class GoalResponseDto {
  @ApiProperty({
    description: '목표 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '사용자 ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  userId: string;

  @ApiProperty({
    description: '목표 제목',
    example: '매일 운동하기',
  })
  title: string;

  @ApiPropertyOptional({
    description: '목표 설명',
    example: '건강한 생활을 위해 매일 30분 이상 운동하기',
  })
  description?: string;

  @ApiProperty({
    description: '카테고리',
    example: 'personal',
  })
  category: string;

  @ApiPropertyOptional({
    description: '목표 마감일',
    example: '2024-12-31T23:59:59.999Z',
  })
  deadline?: Date;

  @ApiProperty({
    description: '목표 상태',
    enum: GoalStatus,
    example: GoalStatus.ACTIVE,
  })
  status: GoalStatus;

  @ApiProperty({
    description: '우선순위',
    enum: Priority,
    example: Priority.MEDIUM,
  })
  priority: Priority;

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

  @ApiPropertyOptional({
    description: '리플랜 목록',
    type: [PlanSummaryDto],
  })
  plans?: PlanSummaryDto[];

  constructor(
    goal: Goal & {
      plans?: Array<{
        id: string;
        title: string;
        status: string;
        orderIndex: number;
      }>;
    },
  ) {
    this.id = goal.id;
    this.userId = goal.userId;
    this.title = goal.title;
    this.description = goal.description || undefined;
    this.category = goal.category;
    this.deadline = goal.deadline || undefined;
    this.status = goal.status;
    this.priority = goal.priority;
    this.createdAt = goal.createdAt;
    this.updatedAt = goal.updatedAt;
    if (goal.plans) {
      this.plans = goal.plans.map((plan) => ({
        id: plan.id,
        title: plan.title,
        status: plan.status,
        orderIndex: plan.orderIndex,
      }));
    }
  }
}
