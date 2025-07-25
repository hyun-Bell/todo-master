import { faker } from '@faker-js/faker';

import { type User } from '../../generated/prisma';

export class UserBuilder {
  private readonly user: User;

  constructor() {
    this.user = {
      id: faker.string.uuid(),
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password(),
      fullName: faker.person.fullName(),
      avatarUrl: faker.image.avatar(),
      refreshToken: null,
      supabaseId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  withId(id: string): UserBuilder {
    this.user.id = id;
    return this;
  }

  withEmail(email: string): UserBuilder {
    this.user.email = email;
    return this;
  }

  withFullName(fullName: string | null): UserBuilder {
    this.user.fullName = fullName;
    return this;
  }

  withAvatarUrl(avatarUrl: string | null): UserBuilder {
    this.user.avatarUrl = avatarUrl;
    return this;
  }

  withCreatedAt(date: Date): UserBuilder {
    this.user.createdAt = date;
    return this;
  }

  withUpdatedAt(date: Date): UserBuilder {
    this.user.updatedAt = date;
    return this;
  }

  withSupabaseId(supabaseId: string | null): UserBuilder {
    this.user.supabaseId = supabaseId;
    return this;
  }

  build(): User {
    return { ...this.user };
  }
}
