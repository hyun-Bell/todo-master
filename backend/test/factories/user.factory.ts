import { faker } from '@faker-js/faker';

import { type User } from '../../generated/prisma';
import { type CreateUserDto } from '../../src/users/dto/create-user.dto';
import { type UpdateUserDto } from '../../src/users/dto/update-user.dto';

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  password: null,
  fullName: faker.person.fullName(),
  avatarUrl: faker.image.avatar(),
  refreshToken: null,
  supabaseId: null,
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

export const createMockUsers = (
  count: number,
  overrides: Partial<User> = {},
): User[] => Array.from({ length: count }, () => createMockUser(overrides));

export const createMockUserDto = (
  overrides: Partial<CreateUserDto> = {},
): CreateUserDto => ({
  id: faker.string.uuid(),
  email: faker.internet.email().toLowerCase(),
  fullName: faker.person.fullName(),
  avatarUrl: faker.image.avatar(),
  ...overrides,
});

export const createMockUpdateUserDto = (
  overrides: Partial<UpdateUserDto> = {},
): UpdateUserDto => ({
  email: faker.internet.email().toLowerCase(),
  fullName: faker.person.fullName(),
  avatarUrl: faker.image.avatar(),
  ...overrides,
});
