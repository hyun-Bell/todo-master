import { Test, type TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { GoalRepository } from './repositories/goal.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { UnifiedRealtimeService } from '../realtime/services/unified-realtime.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type CreateGoalDto } from './dto/create-goal.dto';
import { GoalStatus, Priority } from '../../generated/prisma';

const mockGoalRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findByIdWithDetails: jest.fn(),
  findAll: jest.fn(),
  findAllWithPlans: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
};

const mockUserRepository = {
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

describe('GoalsService 목표 서비스', () => {
  let service: GoalsService;
  let goalRepository: GoalRepository;
  let userRepository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: GoalRepository,
          useValue: mockGoalRepository,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: UnifiedRealtimeService,
          useValue: mockUnifiedRealtimeService,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    goalRepository = module.get<GoalRepository>(GoalRepository);
    userRepository = module.get<UserRepository>(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create 목표 생성', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const createGoalDto: CreateGoalDto = {
      title: 'Test Goal',
      description: 'Test Description',
      category: 'personal',
      deadline: '2024-12-31T23:59:59.999Z',
      status: GoalStatus.ACTIVE,
      priority: Priority.MEDIUM,
    };

    it('새로운 목표를 성공적으로 생성해야 함', async () => {
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

      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockGoalRepository.create.mockResolvedValue(mockGoal);

      const result = await service.create(userId, createGoalDto);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(goalRepository.create).toHaveBeenCalledWith({
        ...createGoalDto,
        userId,
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: mockGoal.id,
          title: mockGoal.title,
        }),
      );
    });

    it('사용자가 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.create(userId, createGoalDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update 목표 수정', () => {
    const goalId = 'goal-id';
    const userId = 'user-id';
    const updateGoalDto = {
      title: 'Updated Goal',
      status: GoalStatus.COMPLETED,
    };

    it('목표가 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockGoalRepository.findById.mockResolvedValue(null);

      await expect(
        service.update(goalId, updateGoalDto, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('소유자가 아닌 사용자가 수정하려 하면 ForbiddenException을 발생시켜야 함', async () => {
      const existingGoal = {
        id: goalId,
        userId: 'other-user-id',
        title: 'Goal',
        status: GoalStatus.ACTIVE,
        description: null,
        category: 'personal',
        deadline: null,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGoalRepository.findById.mockResolvedValue(existingGoal);

      await expect(
        service.update(goalId, updateGoalDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove 목표 삭제', () => {
    const goalId = 'goal-id';
    const userId = 'user-id';

    it('목표가 존재하지 않으면 NotFoundException을 발생시켜야 함', async () => {
      mockGoalRepository.findById.mockResolvedValue(null);

      await expect(service.remove(goalId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('소유자가 아닌 사용자가 삭제하려 하면 ForbiddenException을 발생시켜야 함', async () => {
      const mockGoal = {
        id: goalId,
        userId: 'other-user-id',
        title: 'Goal',
        description: null,
        category: 'personal',
        deadline: null,
        status: GoalStatus.ACTIVE,
        priority: Priority.MEDIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGoalRepository.findById.mockResolvedValue(mockGoal);

      await expect(service.remove(goalId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
