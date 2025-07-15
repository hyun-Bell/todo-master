import { Test, type TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import {
  createMockPlan,
  createMockPlanDto,
} from '../../test/factories/plan.factory';
import { type CreatePlanDto } from './dto/create-plan.dto';
import { type UpdatePlanDto } from './dto/update-plan.dto';
import { PlanStatus } from '../../generated/prisma';

describe('PlansController', () => {
  let controller: PlansController;
  let service: PlansService;

  const mockPlansService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
      ],
    }).compile();

    controller = module.get<PlansController>(PlansController);
    service = module.get<PlansService>(PlansService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new plan', async () => {
      const createPlanDto: CreatePlanDto = createMockPlanDto();
      const mockPlan = createMockPlan(createPlanDto);

      mockPlansService.create.mockResolvedValue(mockPlan);

      const result = await controller.create(createPlanDto);

      expect(service.create).toHaveBeenCalledWith(createPlanDto);
      expect(result).toEqual(mockPlan);
    });
  });

  describe('findAll', () => {
    it('should return all plans when no goalId is provided', async () => {
      const mockPlans = [
        createMockPlan({ title: 'Plan 1' }),
        createMockPlan({ title: 'Plan 2' }),
      ];

      mockPlansService.findAll.mockResolvedValue(mockPlans);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined);
      expect(result).toEqual(mockPlans);
      expect(result).toHaveLength(2);
    });

    it('should return plans filtered by goalId', async () => {
      const goalId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPlans = [
        createMockPlan({ goalId, title: 'Goal Plan 1' }),
        createMockPlan({ goalId, title: 'Goal Plan 2' }),
      ];

      mockPlansService.findAll.mockResolvedValue(mockPlans);

      const result = await controller.findAll(goalId);

      expect(service.findAll).toHaveBeenCalledWith(goalId, undefined);
      expect(result).toEqual(mockPlans);
      expect(result.every((plan) => plan.goalId === goalId)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return a single plan', async () => {
      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPlan = createMockPlan({ id: planId });

      mockPlansService.findOne.mockResolvedValue(mockPlan);

      const result = await controller.findOne(planId);

      expect(service.findOne).toHaveBeenCalledWith(planId);
      expect(result).toEqual(mockPlan);
    });
  });

  describe('update', () => {
    it('should update a plan', async () => {
      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123';
      const updatePlanDto: UpdatePlanDto = {
        title: 'Updated Plan',
        status: PlanStatus.COMPLETED,
        estimatedDuration: 120,
      };
      const updatedPlan = createMockPlan({
        id: planId,
        ...updatePlanDto,
      });

      mockPlansService.update.mockResolvedValue(updatedPlan);

      const result = await controller.update(planId, updatePlanDto, userId);

      expect(service.update).toHaveBeenCalledWith(
        planId,
        updatePlanDto,
        userId,
      );
      expect(result).toEqual(updatedPlan);
    });
  });

  describe('remove', () => {
    it('should remove a plan', async () => {
      const planId = '123e4567-e89b-12d3-a456-426614174000';
      const userId = 'user-123';
      const expectedResult = { message: '계획이 삭제되었습니다.' };

      mockPlansService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(planId, userId);

      expect(service.remove).toHaveBeenCalledWith(planId, userId);
      expect(result).toEqual(expectedResult);
    });
  });
});
