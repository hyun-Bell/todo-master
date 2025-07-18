import { Test, type TestingModule } from '@nestjs/testing';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { type CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  createMockGoal,
  createMockGoalDto,
} from '../../test/factories/goal.factory';
import { GoalBuilder } from '../../test/builders/goal.builder';
import { type CreateGoalDto } from './dto/create-goal.dto';
import { type UpdateGoalDto } from './dto/update-goal.dto';
import { GoalStatus, Priority } from '../../generated/prisma';

describe('GoalsController', () => {
  let controller: GoalsController;
  let service: GoalsService;

  const mockGoalsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        {
          provide: GoalsService,
          useValue: mockGoalsService,
        },
      ],
    }).compile();

    controller = module.get<GoalsController>(GoalsController);
    service = module.get<GoalsService>(GoalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new goal', async () => {
      const mockUser: CurrentUser = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };
      const createGoalDto: CreateGoalDto = createMockGoalDto();
      const mockGoal = createMockGoal({
        ...createGoalDto,
        deadline: createGoalDto.deadline
          ? new Date(createGoalDto.deadline)
          : null,
      });

      mockGoalsService.create.mockResolvedValue(mockGoal);

      const result = await controller.create(mockUser, createGoalDto);

      expect(service.create).toHaveBeenCalledWith(
        mockUser.userId,
        createGoalDto,
      );
      expect(result).toEqual(mockGoal);
    });
  });

  describe('findAll', () => {
    it('should return all goals for authenticated user', async () => {
      const mockUser: CurrentUser = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };
      const mockGoals = [
        new GoalBuilder().withTitle('Goal 1').build(),
        new GoalBuilder().withTitle('Goal 2').build(),
      ];

      mockGoalsService.findAll.mockResolvedValue(mockGoals);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockGoals);
      expect(result).toHaveLength(2);
    });

    it('should return goals for specific user', async () => {
      const mockUser: CurrentUser = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      };
      const mockGoals = [
        new GoalBuilder()
          .withUserId(mockUser.userId)
          .withTitle('User Goal 1')
          .build(),
        new GoalBuilder()
          .withUserId(mockUser.userId)
          .withTitle('User Goal 2')
          .build(),
      ];

      mockGoalsService.findAll.mockResolvedValue(mockGoals);

      const result = await controller.findAll(mockUser);

      expect(service.findAll).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockGoals);
      expect(result.every((goal) => goal.userId === mockUser.userId)).toBe(
        true,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single goal', async () => {
      const goalId = '123e4567-e89b-12d3-a456-426614174000';
      const mockGoal = new GoalBuilder().withId(goalId).build();

      mockGoalsService.findOne.mockResolvedValue(mockGoal);

      const result = await controller.findOne(goalId);

      expect(service.findOne).toHaveBeenCalledWith(goalId);
      expect(result).toEqual(mockGoal);
    });
  });

  describe('update', () => {
    it('should update a goal', async () => {
      const goalId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123';
      const updateGoalDto: UpdateGoalDto = {
        title: 'Updated Goal',
        status: GoalStatus.COMPLETED,
        priority: Priority.HIGH,
      };
      const updatedGoal = new GoalBuilder()
        .withId(goalId)
        .withUserId(userId)
        .withTitle(updateGoalDto.title!)
        .withStatus(updateGoalDto.status!)
        .withPriority(updateGoalDto.priority!)
        .build();

      mockGoalsService.update.mockResolvedValue(updatedGoal);

      const mockUser: CurrentUser = {
        userId,
        email: 'test@example.com',
      };
      const result = await controller.update(mockUser, goalId, updateGoalDto);

      expect(service.update).toHaveBeenCalledWith(
        goalId,
        updateGoalDto,
        userId,
      );
      expect(result).toEqual(updatedGoal);
    });
  });

  describe('remove', () => {
    it('should remove a goal', async () => {
      const goalId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123';
      const expectedResult = { message: '목표가 삭제되었습니다.' };

      mockGoalsService.remove.mockResolvedValue(expectedResult);

      const mockUser: CurrentUser = {
        userId,
        email: 'test@example.com',
      };
      const result = await controller.remove(mockUser, goalId);

      expect(service.remove).toHaveBeenCalledWith(goalId, userId);
      expect(result).toEqual(expectedResult);
    });
  });
});
