import { faker } from '@faker-js/faker';
import { type User } from '../../generated/prisma';
import { type CreateUserDto } from '../../src/users/dto/create-user.dto';
import { type UpdateUserDto } from '../../src/users/dto/update-user.dto';

export const createMockUser = (overrides: Partial<User> = {}): User => {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    fullName: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    ...overrides,
  };
};

export const createMockUsers = (
  count: number,
  overrides: Partial<User> = {},
): User[] => {
  return Array.from({ length: count }, () => createMockUser(overrides));
};

export const createMockUserDto = (
  overrides: Partial<CreateUserDto> = {},
): CreateUserDto => {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email().toLowerCase(),
    fullName: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    ...overrides,
  };
};

export const createMockUpdateUserDto = (
  overrides: Partial<UpdateUserDto> = {},
): UpdateUserDto => {
  return {
    email: faker.internet.email().toLowerCase(),
    fullName: faker.person.fullName(),
    avatarUrl: faker.image.avatar(),
    ...overrides,
  };
};
