import { Test, type TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type CreatePlanDto } from './dto/create-plan.dto';
import { type UpdatePlanDto } from './dto/update-plan.dto';
import { PlanStatus } from '../../generated/prisma';
import { createMockPlan } from '../../test/factories/plan.factory';
import { PlanResponseDto } from './dto/plan-response.dto';

const mockPrismaService = {
  goal: {
    findUnique: jest.fn(),
  },
  plan: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('PlansService', () => {
  let service: PlansService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createPlanDto: CreatePlanDto = {
      goalId: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Plan',
      description: 'Test Description',
      orderIndex: 1,
      status: PlanStatus.PENDING,
      estimatedDuration: 60,
    };

    it('should create a new plan', async () => {
      const mockGoal = { id: createPlanDto.goalId, userId: 'user-123' };
      const mockPlan = createMockPlan(createPlanDto);

      mockPrismaService.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrismaService.plan.create.mockResolvedValue(mockPlan);

      const result = await service.create(createPlanDto);

      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: { id: createPlanDto.goalId },
      });
      expect(prisma.plan.create).toHaveBeenCalledWith({
        data: {
          goalId: createPlanDto.goalId,
          title: createPlanDto.title,
          description: createPlanDto.description,
          orderIndex: createPlanDto.orderIndex || 0,
          status: createPlanDto.status || PlanStatus.PENDING,
          estimatedDuration: createPlanDto.estimatedDuration,
        },
        include: {
          checkpoints: true,
        },
      });
      expect(result).toBeInstanceOf(PlanResponseDto);
      expect(result.id).toEqual(mockPlan.id);
      expect(result.title).toEqual(mockPlan.title);
    });

    it('should throw NotFoundException if goal not found', async () => {
      mockPrismaService.goal.findUnique.mockResolvedValue(null);

      await expect(service.create(createPlanDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all plans', async () => {
      const mockPlans = [
        createMockPlan({ title: 'Plan 1' }),
        createMockPlan({ title: 'Plan 2' }),
      ];

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.findAll();

      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        include: {
          checkpoints: {
            select: { id: true, isCompleted: true },
          },
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(PlanResponseDto);
      expect(result[1]).toBeInstanceOf(PlanResponseDto);
    });

    it('should filter plans by goalId', async () => {
      const goalId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPlans = [
        createMockPlan({ goalId, title: 'Goal Plan 1' }),
        createMockPlan({ goalId, title: 'Goal Plan 2' }),
      ];

      mockPrismaService.plan.findMany.mockResolvedValue(mockPlans);

      const result = await service.findAll(goalId);

      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { goalId },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
        include: {
          checkpoints: {
            select: { id: true, isCompleted: true },
          },
        },
      });
      expect(result).toHaveLength(2);
      expect(result.every((plan) => plan instanceof PlanResponseDto)).toBe(
        true,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single plan with checkpoints', async () => {
      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPlan = {
        ...createMockPlan({ id: planId }),
        checkpoints: [
          { id: 'checkpoint-1', content: 'Checkpoint 1', isCompleted: false },
          { id: 'checkpoint-2', content: 'Checkpoint 2', isCompleted: true },
        ],
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.findOne(planId);

      expect(prisma.plan.findUnique).toHaveBeenCalledWith({
        where: { id: planId },
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              userId: true,
            },
          },
          checkpoints: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      expect(result).toBeInstanceOf(PlanResponseDto);
      expect(result.id).toEqual(mockPlan.id);
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const planId = 'plan-id';
    const userId = 'user-id';
    const updatePlanDto: UpdatePlanDto = {
      title: 'Updated Plan',
      status: PlanStatus.IN_PROGRESS,
    };

    it('should update a plan', async () => {
      const existingPlan = {
        id: planId,
        goalId: 'goal-id',
        title: 'Original Plan',
        status: PlanStatus.PENDING,
        goal: { userId },
      };

      const updatedPlan = {
        ...existingPlan,
        ...updatePlanDto,
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(existingPlan);
      mockPrismaService.plan.update.mockResolvedValue(updatedPlan);

      const result = await service.update(planId, updatePlanDto, userId);

      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id: planId },
        data: {
          title: updatePlanDto.title,
          description: undefined,
          orderIndex: undefined,
          status: updatePlanDto.status,
          estimatedDuration: undefined,
        },
      });
      expect(result).toBeInstanceOf(PlanResponseDto);
      expect(result.title).toEqual(updatePlanDto.title);
      expect(result.status).toEqual(updatePlanDto.status);
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.update(planId, updatePlanDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const existingPlan = {
        id: planId,
        goal: { userId: 'other-user-id' },
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(existingPlan);

      await expect(
        service.update(planId, updatePlanDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const planId = 'plan-id';
    const userId = 'user-id';

    it('should delete a plan', async () => {
      const mockPlan = {
        id: planId,
        goal: { userId },
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);
      mockPrismaService.plan.delete.mockResolvedValue(mockPlan);

      const result = await service.remove(planId, userId);

      expect(prisma.plan.delete).toHaveBeenCalledWith({
        where: { id: planId },
      });
      expect(result).toEqual({ message: '계획이 삭제되었습니다.' });
    });

    it('should throw NotFoundException if plan not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.remove(planId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const mockPlan = {
        id: planId,
        goal: { userId: 'other-user-id' },
      };

      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);

      await expect(service.remove(planId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
