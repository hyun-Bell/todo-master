import { Test, type TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type CreateGoalDto } from './dto/create-goal.dto';
import { GoalStatus, Priority } from '../../generated/prisma';

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
  },
  goal: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const createGoalDto: CreateGoalDto = {
      title: 'Test Goal',
      description: 'Test Description',
      category: 'personal',
      deadline: '2024-12-31T23:59:59.999Z',
      status: GoalStatus.ACTIVE,
      priority: Priority.MEDIUM,
    };

    it('should create a new goal', async () => {
      const mockUser = { id: userId };
      const mockGoal = {
        id: 'goal-id',
        userId,
        ...createGoalDto,
        deadline: createGoalDto.deadline
          ? new Date(createGoalDto.deadline)
          : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.goal.create.mockResolvedValue(mockGoal);

      const result = await service.create(userId, createGoalDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: {
          userId,
          title: createGoalDto.title,
          description: createGoalDto.description,
          category: 'personal',
          deadline: createGoalDto.deadline
            ? new Date(createGoalDto.deadline)
            : null,
          status: GoalStatus.ACTIVE,
          priority: Priority.MEDIUM,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockGoal.id,
          title: mockGoal.title,
        }),
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, createGoalDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all goals', async () => {
      const mockGoals = [
        {
          id: '1',
          userId: 'user-1',
          title: 'Goal 1',
          description: null,
          category: 'personal',
          deadline: null,
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
          createdAt: new Date(),
          updatedAt: new Date(),
          plans: [],
        },
        {
          id: '2',
          userId: 'user-2',
          title: 'Goal 2',
          description: 'Description',
          category: 'work',
          deadline: new Date(),
          status: GoalStatus.COMPLETED,
          priority: Priority.LOW,
          createdAt: new Date(),
          updatedAt: new Date(),
          plans: [{ id: 'plan-1' }],
        },
      ];

      mockPrismaService.goal.findMany.mockResolvedValue(mockGoals);

      const result = await service.findAll();

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          plans: {
            select: {
              id: true,
              title: true,
              status: true,
              orderIndex: true,
            },
          },
        },
      });
      expect(result).toHaveLength(2);
    });

    it('should filter goals by userId', async () => {
      const userId = 'user-1';
      const mockGoals = [
        {
          id: '1',
          userId,
          title: 'Goal 1',
          description: null,
          category: 'personal',
          deadline: null,
          status: GoalStatus.ACTIVE,
          priority: Priority.HIGH,
          createdAt: new Date(),
          updatedAt: new Date(),
          plans: [],
        },
      ];

      mockPrismaService.goal.findMany.mockResolvedValue(mockGoals);

      const result = await service.findAll(userId);

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          plans: {
            select: {
              id: true,
              title: true,
              status: true,
              orderIndex: true,
            },
          },
        },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    const goalId = 'goal-id';
    const userId = 'user-id';
    const updateGoalDto = {
      title: 'Updated Goal',
      status: GoalStatus.COMPLETED,
    };

    it('should update a goal', async () => {
      const existingGoal = {
        id: goalId,
        userId,
        title: 'Original Goal',
        description: null,
        category: 'personal',
        deadline: null,
        status: GoalStatus.ACTIVE,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedGoal = {
        ...existingGoal,
        ...updateGoalDto,
      };

      mockPrismaService.goal.findUnique.mockResolvedValue(existingGoal);
      mockPrismaService.goal.update.mockResolvedValue(updatedGoal);

      const result = await service.update(goalId, updateGoalDto, userId);

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: goalId },
        data: {
          title: updateGoalDto.title,
          description: undefined,
          category: undefined,
          deadline: undefined,
          status: updateGoalDto.status,
          priority: undefined,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          title: updateGoalDto.title,
          status: updateGoalDto.status,
        }),
      );
    });

    it('should throw NotFoundException if goal not found', async () => {
      mockPrismaService.goal.findUnique.mockResolvedValue(null);

      await expect(
        service.update(goalId, updateGoalDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const existingGoal = {
        id: goalId,
        userId: 'other-user-id',
        title: 'Goal',
        status: GoalStatus.ACTIVE,
      };

      mockPrismaService.goal.findUnique.mockResolvedValue(existingGoal);

      await expect(
        service.update(goalId, updateGoalDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    const goalId = 'goal-id';
    const userId = 'user-id';

    it('should delete a goal', async () => {
      const mockGoal = {
        id: goalId,
        userId,
        title: 'Goal to Delete',
      };

      mockPrismaService.goal.findUnique.mockResolvedValue(mockGoal);
      mockPrismaService.goal.delete.mockResolvedValue(mockGoal);

      const result = await service.remove(goalId, userId);

      expect(prisma.goal.delete).toHaveBeenCalledWith({
        where: { id: goalId },
      });
      expect(result).toEqual({ message: '목표가 삭제되었습니다.' });
    });

    it('should throw NotFoundException if goal not found', async () => {
      mockPrismaService.goal.findUnique.mockResolvedValue(null);

      await expect(service.remove(goalId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const mockGoal = {
        id: goalId,
        userId: 'other-user-id',
      };

      mockPrismaService.goal.findUnique.mockResolvedValue(mockGoal);

      await expect(service.remove(goalId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
