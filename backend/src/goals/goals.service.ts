import { Injectable, Logger } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalStatus } from '../../generated/prisma';
import {
  validateEntityExists,
  validateEntityOwnership,
} from '../common/utils/auth.utils';
import { GoalRepository } from './repositories/goal.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { UnifiedRealtimeService } from '../realtime/services/unified-realtime.service';
import { RealtimeEvent } from '../realtime/interfaces/realtime.interface';

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(
    private goalRepository: GoalRepository,
    private userRepository: UserRepository,
    private realtimeService: UnifiedRealtimeService,
  ) {}

  async create(
    userId: string,
    createGoalDto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    const user = await this.userRepository.findById(userId);

    validateEntityExists(user, '사용자');

    const goal = await this.goalRepository.create({
      ...createGoalDto,
      userId,
    });

    // 실시간 이벤트 브로드캐스트
    await this.broadcastGoalEvent('INSERT', goal, userId);

    return new GoalResponseDto(goal);
  }

  async findAll(userId?: string): Promise<GoalResponseDto[]> {
    const goals = await this.goalRepository.findAllWithPlans(
      userId ? { userId } : undefined,
    );

    return goals.map((goal) => new GoalResponseDto(goal));
  }

  async findOne(id: string): Promise<GoalResponseDto> {
    const goal = await this.goalRepository.findByIdWithDetails(id);

    validateEntityExists(goal, '목표');
    return new GoalResponseDto(goal);
  }

  async update(
    id: string,
    updateGoalDto: UpdateGoalDto,
    userId: string,
  ): Promise<GoalResponseDto> {
    const goal = await this.goalRepository.findById(id);

    validateEntityOwnership(goal, userId, '목표');

    const updatedGoal = await this.goalRepository.update(id, updateGoalDto);

    // 실시간 이벤트 브로드캐스트
    await this.broadcastGoalEvent('UPDATE', updatedGoal, userId);

    return new GoalResponseDto(updatedGoal);
  }

  async updateStatus(
    id: string,
    status: GoalStatus,
    userId: string,
  ): Promise<GoalResponseDto> {
    const goal = await this.goalRepository.findById(id);

    validateEntityOwnership(goal, userId, '목표');

    const updatedGoal = await this.goalRepository.updateStatus(id, status);

    return new GoalResponseDto(updatedGoal);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const goal = await this.goalRepository.findById(id);

    validateEntityOwnership(goal, userId, '목표');

    await this.goalRepository.delete(id);

    // 실시간 이벤트 브로드캐스트
    await this.broadcastGoalEvent('DELETE', { id }, userId);

    return { message: '목표가 삭제되었습니다.' };
  }

  /**
   * 목표 관련 실시간 이벤트 브로드캐스트
   */
  private async broadcastGoalEvent(
    type: 'INSERT' | 'UPDATE' | 'DELETE',
    data: any,
    userId: string,
  ): Promise<void> {
    const event: RealtimeEvent = {
      type,
      table: 'goals',
      data,
      userId,
      timestamp: new Date(),
      provider: this.realtimeService.getActiveProvider(),
    };

    try {
      // 통합 실시간 서비스를 통해 이벤트 브로드캐스트
      await this.realtimeService.broadcast(event);

      // 특정 사용자에게 추가 알림이 필요한 경우
      if (type === 'INSERT') {
        await this.realtimeService.broadcastToUser(userId, 'goal:created', {
          message: '새로운 목표가 생성되었습니다.',
          goal: data,
        });
      }
    } catch (error) {
      // 실시간 브로드캐스트 실패는 주 기능에 영향을 주지 않도록 처리
      this.logger.error('Failed to broadcast realtime event:', error);
    }
  }
}
