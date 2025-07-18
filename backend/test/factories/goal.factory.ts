import { faker } from '@faker-js/faker';
import { type Goal, GoalStatus, Priority } from '../../generated/prisma';
import { type CreateGoalDto } from '../../src/goals/dto/create-goal.dto';

export const createMockGoal = (overrides: Partial<Goal> = {}): Goal => {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement([
      'personal',
      'work',
      'health',
      'education',
    ]),
    deadline: faker.date.future(),
    status: faker.helpers.enumValue(GoalStatus),
    priority: faker.helpers.enumValue(Priority),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

export const createMockGoals = (
  count: number,
  overrides: Partial<Goal> = {},
): Goal[] => {
  return Array.from({ length: count }, () => createMockGoal(overrides));
};

export const createMockGoalDto = (
  overrides: Partial<CreateGoalDto> = {},
): CreateGoalDto => {
  return {
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement([
      'personal',
      'work',
      'health',
      'education',
    ]),
    deadline: faker.date.future().toISOString(),
    status: faker.helpers.enumValue(GoalStatus),
    priority: faker.helpers.enumValue(Priority),
    ...overrides,
  };
};
