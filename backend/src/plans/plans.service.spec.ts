import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { PlanStatus } from '../../generated/prisma';
import { createMockPlan } from '../../test/factories/plan.factory';
import { GoalRepository } from '../goals/repositories/goal.repository';
import { UnifiedRealtimeService } from '../realtime/services/unified-realtime.service';

import { type CreatePlanDto } from './dto/create-plan.dto';
import { PlanResponseDto } from './dto/plan-response.dto';
import { type UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';
import { PlanRepository } from './repositories/plan.repository';

const mockPlanRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdWithCheckpoints: jest.fn(),
  findByIdWithDetails: jest.fn(),
  findAll: jest.fn(),
  findAllWithCheckpoints: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
};

const mockGoalRepository = {
  findById: jest.fn(),
};

const mockUnifiedRealtimeService = {
  broadcast: jest.fn(),
  broadcastToUser: jest.fn(),
  broadcastToTable: jest.fn(),
  getActiveProvider: jest.fn().mockReturnValue('websocket'),
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  getActiveConnections: jest.fn(),
  getSubscriptions: jest.fn(),
  switchProvider: jest.fn(),
  isHealthy: jest.fn(),
};

describe('PlansService 계획 서비스', () => {
  let service: PlansService;
  let planRepository: PlanRepository;
  let goalRepository: GoalRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PlanRepository,
          useValue: mockPlanRepository,
        },
        {
          provide: GoalRepository,
          useValue: mockGoalRepository,
        },
        {
          provide: UnifiedRealtimeService,
          useValue: mockUnifiedRealtimeService,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    planRepository = module.get<PlanRepository>(PlanRepository);
    goalRepository = module.get<GoalRepository>(GoalRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create 계획 생성', () => {
    const createPlanDto: CreatePlanDto = {
      goalId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Plan',
      description: 'Test Description',
      orderIndex: 1,
      status: PlanStatus.PENDING,
      estimatedDuration: 60,
    };

    it('새로운 계획을 성공적으로 생성해야 함', async () => {
      const mockGoal = {
        id: createPlanDto.goalId,
        userId: 'user-123',
        title: 'Test Goal',
        description: null,
        category: 'personal',
        deadline: null,
        status: 'ACTIVE',
        priority: 'MEDIUM',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockPlan = createMockPlan(createPlanDto);
      const mockPlanWithCheckpoints = { ...mockPlan, checkpoints: [] };

      mockGoalRepository.findById.mockResolvedValue(mockGoal);
      mockPlanRepository.create.mockResolvedValue(mockPlan);
      mockPlanRepository.findByIdWithCheckpoints.mockResolvedValue(
        mockPlanWithCheckpoints,
      );

      const result = await service.create(createPlanDto);

      expect(goalRepository.findById).toHaveBeenCalledWith(
        createPlanDto.goalId,
      );
      expect(planRepository.create).toHaveBeenCalledWith({
        ...createPlanDto,
        goalId: createPlanDto.goalId,
      });
      expect(planRepository.findByIdWithCheckpoints).toHaveBeenCalledWith(
        mockPlan.id,
      );
      expect(result).toBeInstanceOf(PlanResponseDto);
      expect(result.id).toEqual(mockPlan.id);
      expect(result.title).toEqual(mockPlan.title);
    });

    it('목표가 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockGoalRepository.findById.mockResolvedValue(null);

      await expect(service.create(createPlanDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOne 계획 단건 조회', () => {
    it('계획이 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockPlanRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update 계획 수정', () => {
    const planId = 'plan-id';
    const userId = 'user-id';
    const updatePlanDto: UpdatePlanDto = {
      title: 'Updated Plan',
      status: PlanStatus.IN_PROGRESS,
    };

    it('계획이 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockPlanRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(
        service.update(planId, updatePlanDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('소유자가 아닌 사용자가 수정하려 하면 ForbiddenException을 발생시켜야 함', async () => {
      const existingPlan = {
        id: planId,
        goalId: 'goal-id',
        title: 'Original Plan',
        description: null,
        orderIndex: 0,
        status: PlanStatus.PENDING,
        estimatedDuration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: {
          id: 'goal-id',
          title: 'Test Goal',
          userId: 'other-user-id',
        },
      };

      mockPlanRepository.findByIdWithDetails.mockResolvedValue(existingPlan);

      await expect(
        service.update(planId, updatePlanDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove 계획 삭제', () => {
    const planId = 'plan-id';
    const userId = 'user-id';

    it('계획이 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockPlanRepository.findByIdWithDetails.mockResolvedValue(null);

      await expect(service.remove(planId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('소유자가 아닌 사용자가 삭제하려 하면 ForbiddenException을 발생시켜야 함', async () => {
      const mockPlan = {
        id: planId,
        goalId: 'goal-id',
        title: 'Plan',
        description: null,
        orderIndex: 0,
        status: PlanStatus.PENDING,
        estimatedDuration: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        goal: {
          id: 'goal-id',
          title: 'Test Goal',
          userId: 'other-user-id',
        },
      };

      mockPlanRepository.findByIdWithDetails.mockResolvedValue(mockPlan);

      await expect(service.remove(planId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
