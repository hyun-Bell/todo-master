import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GoalStatus, Priority } from '../../../generated/prisma';

export class CreateGoalDto {
  @ApiProperty({
    description: '목표 제목',
    example: '매일 운동하기',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: '목표 설명',
    example: '건강한 생활을 위해 매일 30분 이상 운동하기',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '카테고리',
    example: 'personal',
    default: 'personal',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: '목표 마감일',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({
    description: '목표 상태',
    enum: GoalStatus,
    default: GoalStatus.ACTIVE,
  })
  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;

  @ApiPropertyOptional({
    description: '우선순위',
    enum: Priority,
    default: Priority.MEDIUM,
  })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;
}
