import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Goal, User } from '../../../generated/prisma';

class GoalSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  status: string;
}

export class UserResponseDto {
  @ApiProperty({
    description: '사용자 ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: '사용자 이메일',
    example: 'user@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: '사용자 전체 이름',
    example: '홍길동',
  })
  fullName?: string;

  @ApiPropertyOptional({
    description: '프로필 이미지 URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatarUrl?: string;

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
    description: '사용자의 목표 목록',
    type: [GoalSummaryDto],
  })
  goals?: GoalSummaryDto[];

  constructor(
    user: User & { goals?: Array<Pick<Goal, 'id' | 'title' | 'status'>> },
  ) {
    this.id = user.id;
    this.email = user.email;
    this.fullName = user.fullName || undefined;
    this.avatarUrl = user.avatarUrl || undefined;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    if (user.goals) {
      this.goals = user.goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        status: goal.status,
      }));
    }
  }
}
