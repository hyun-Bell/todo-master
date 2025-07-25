import { ForbiddenException, Injectable, Logger } from '@nestjs/common';

import { PlanStatus } from '../../generated/prisma';
import { validateEntityExists } from '../common/utils/auth.utils';
import { GoalRepository } from '../goals/repositories/goal.repository';
import { RealtimeEvent } from '../realtime/interfaces/realtime.interface';
import { UnifiedRealtimeService } from '../realtime/services/unified-realtime.service';

import { CreatePlanDto } from './dto/create-plan.dto';
import { PlanResponseDto } from './dto/plan-response.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanRepository } from './repositories/plan.repository';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    private readonly planRepository: PlanRepository,
    private readonly goalRepository: GoalRepository,
    private readonly realtimeService: UnifiedRealtimeService,
  ) {}

  async create(createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    const goal = await this.goalRepository.findById(createPlanDto.goalId);

    validateEntityExists(goal, '목표');

    const plan = await this.planRepository.create({
      ...createPlanDto,
      goalId: createPlanDto.goalId,
    });

    const planWithCheckpoints =
      await this.planRepository.findByIdWithCheckpoints(plan.id);

    // 실시간 이벤트 브로드캐스트
    await this.broadcastPlanEvent('INSERT', plan, goal.userId);

    return new PlanResponseDto(planWithCheckpoints || plan);
  }

  async findAll(
    goalId?: string,
    status?: PlanStatus,
  ): Promise<PlanResponseDto[]> {
    const plans = await this.planRepository.findAllWithCheckpoints({
      ...(goalId && { goalId }),
      ...(status && { status }),
    });

    return plans.map((plan) => new PlanResponseDto(plan));
  }

  async findOne(id: string): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findByIdWithDetails(id);

    validateEntityExists(plan, '계획');
    return new PlanResponseDto(plan);
  }

  async update(
    id: string,
    updatePlanDto: UpdatePlanDto,
    userId: string,
  ): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findByIdWithDetails(id);

    validateEntityExists(plan, '계획');

    if (plan.goal.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    const updatedPlan = await this.planRepository.update(id, updatePlanDto);

    // 실시간 이벤트 브로드캐스트
    await this.broadcastPlanEvent('UPDATE', updatedPlan, userId);

    return new PlanResponseDto(updatedPlan);
  }

  async updateStatus(
    id: string,
    status: PlanStatus,
    userId: string,
  ): Promise<PlanResponseDto> {
    const plan = await this.planRepository.findByIdWithDetails(id);

    validateEntityExists(plan, '계획');

    if (plan.goal.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    const updatedPlan = await this.planRepository.updateStatus(id, status);

    return new PlanResponseDto(updatedPlan);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const plan = await this.planRepository.findByIdWithDetails(id);

    validateEntityExists(plan, '계획');

    if (plan.goal.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    await this.planRepository.delete(id);

    // 실시간 이벤트 브로드캐스트
    await this.broadcastPlanEvent('DELETE', { id }, userId);

    return { message: '계획이 삭제되었습니다.' };
  }

  /**
   * 계획 관련 실시간 이벤트 브로드캐스트
   */
  private async broadcastPlanEvent(
    type: 'INSERT' | 'UPDATE' | 'DELETE',
    data: any,
    userId: string,
  ): Promise<void> {
    const event: RealtimeEvent = {
      type,
      table: 'plans',
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
        await this.realtimeService.broadcastToUser(userId, 'plan:created', {
          message: '새로운 계획이 생성되었습니다.',
          plan: data,
        });
      }
    } catch (error) {
      // 실시간 브로드캐스트 실패는 주 기능에 영향을 주지 않도록 처리
      this.logger.error('Failed to broadcast realtime event:', error);
    }
  }
}
