import { faker } from '@faker-js/faker';
import { type Goal, GoalStatus, Priority } from '../../generated/prisma';

export class GoalBuilder {
  private goal: Goal;

  constructor() {
    this.goal = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      title: faker.lorem.sentence(),
      description: faker.lorem.paragraph(),
      category: 'personal',
      deadline: faker.date.future(),
      status: GoalStatus.ACTIVE,
      priority: Priority.MEDIUM,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  withId(id: string): GoalBuilder {
    this.goal.id = id;
    return this;
  }

  withUserId(userId: string): GoalBuilder {
    this.goal.userId = userId;
    return this;
  }

  withTitle(title: string): GoalBuilder {
    this.goal.title = title;
    return this;
  }

  withDescription(description: string | null): GoalBuilder {
    this.goal.description = description;
    return this;
  }

  withCategory(category: string): GoalBuilder {
    this.goal.category = category;
    return this;
  }

  withDeadline(deadline: Date | null): GoalBuilder {
    this.goal.deadline = deadline;
    return this;
  }

  withStatus(status: GoalStatus): GoalBuilder {
    this.goal.status = status;
    return this;
  }

  withPriority(priority: Priority): GoalBuilder {
    this.goal.priority = priority;
    return this;
  }

  withCreatedAt(date: Date): GoalBuilder {
    this.goal.createdAt = date;
    return this;
  }

  withUpdatedAt(date: Date): GoalBuilder {
    this.goal.updatedAt = date;
    return this;
  }

  build(): Goal {
    return { ...this.goal };
  }
}
