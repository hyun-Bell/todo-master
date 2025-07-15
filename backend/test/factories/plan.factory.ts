import { faker } from '@faker-js/faker';
import { type Plan, PlanStatus } from '../../generated/prisma';
import { type CreatePlanDto } from '../../src/plans/dto/create-plan.dto';

export const createMockPlan = (overrides: Partial<Plan> = {}): Plan => {
  return {
    id: faker.string.uuid(),
    goalId: faker.string.uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    orderIndex: faker.number.int({ min: 0, max: 100 }),
    status: faker.helpers.enumValue(PlanStatus),
    estimatedDuration: faker.number.int({ min: 15, max: 480 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

export const createMockPlans = (
  count: number,
  overrides: Partial<Plan> = {},
): Plan[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockPlan({ orderIndex: index, ...overrides }),
  );
};

export const createMockPlanDto = (
  overrides: Partial<CreatePlanDto> = {},
): CreatePlanDto => {
  return {
    goalId: faker.string.uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    orderIndex: faker.number.int({ min: 0, max: 100 }),
    estimatedDuration: faker.number.int({ min: 15, max: 480 }),
    status: faker.helpers.enumValue(PlanStatus),
    ...overrides,
  };
};
