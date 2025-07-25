import { Injectable } from '@nestjs/common';

import { Goal, GoalStatus, Priority, Prisma } from '../../../generated/prisma';
import { BaseRepository } from '../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto } from '../dto/create-goal.dto';
import { UpdateGoalDto } from '../dto/update-goal.dto';

export interface GoalFilter {
  userId?: string;
  status?: GoalStatus;
  priority?: Priority;
  category?: string;
  search?: string;
}

export interface GoalWithPlans extends Goal {
  plans?: Array<{
    id: string;
    title: string;
    status: string;
    orderIndex: number;
  }>;
}

@Injectable()
export class GoalRepository extends BaseRepository<
  Goal,
  CreateGoalDto,
  UpdateGoalDto,
  GoalFilter
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: CreateGoalDto & { userId: string }): Promise<Goal> {
    return this.prisma.goal.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description,
        category: data.category || 'personal',
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: data.status || GoalStatus.ACTIVE,
        priority: data.priority || Priority.MEDIUM,
      },
    });
  }

  async findById(id: string): Promise<Goal | null> {
    return this.prisma.goal.findUnique({
      where: { id },
    });
  }

  async findByIdWithPlans(id: string): Promise<GoalWithPlans | null> {
    return this.prisma.goal.findUnique({
      where: { id },
      include: {
        plans: {
          select: {
            id: true,
            title: true,
            status: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async findByIdWithDetails(id: string): Promise<Goal | null> {
    return this.prisma.goal.findUnique({
      where: { id },
      include: {
        plans: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            orderIndex: true,
            estimatedDuration: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(filter?: GoalFilter): Promise<Goal[]> {
    const where: Prisma.GoalWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.priority) {
      where.priority = filter.priority;
    }
    if (filter?.category) {
      where.category = filter.category;
    }
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.goal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllWithPlans(filter?: GoalFilter): Promise<GoalWithPlans[]> {
    const where: Prisma.GoalWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.priority) {
      where.priority = filter.priority;
    }
    if (filter?.category) {
      where.category = filter.category;
    }
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.goal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        plans: {
          select: {
            id: true,
            title: true,
            status: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async update(id: string, data: UpdateGoalDto): Promise<Goal> {
    return this.prisma.goal.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.deadline !== undefined && {
          deadline: data.deadline ? new Date(data.deadline) : null,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
      },
    });
  }

  async updateStatus(id: string, status: GoalStatus): Promise<Goal> {
    return this.prisma.goal.update({
      where: { id },
      data: { status },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.goal.delete({
      where: { id },
    });
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.prisma.goal.deleteMany({
      where: { userId },
    });
  }

  async count(filter?: GoalFilter): Promise<number> {
    const where: Prisma.GoalWhereInput = {};

    if (filter?.userId) {
      where.userId = filter.userId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.priority) {
      where.priority = filter.priority;
    }
    if (filter?.category) {
      where.category = filter.category;
    }

    return this.prisma.goal.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!goal;
  }

  async belongsToUser(id: string, userId: string): Promise<boolean> {
    const goal = await this.prisma.goal.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    return !!goal;
  }

  /**
   * 트랜잭션 내에서 Goal과 관련 Plans를 함께 생성
   */
  async createGoalWithPlans(
    goalData: CreateGoalDto & { userId: string },
    plansData: Array<{
      title: string;
      description?: string;
      orderIndex: number;
    }>,
  ): Promise<GoalWithPlans> {
    return this.transaction(async (tx) => {
      const goal = await tx.goal.create({
        data: {
          userId: goalData.userId,
          title: goalData.title,
          description: goalData.description,
          category: goalData.category || 'personal',
          deadline: goalData.deadline ? new Date(goalData.deadline) : null,
          status: goalData.status || GoalStatus.ACTIVE,
          priority: goalData.priority || Priority.MEDIUM,
        },
      });

      const plans = await Promise.all(
        plansData.map((planData) =>
          tx.plan.create({
            data: {
              goalId: goal.id,
              title: planData.title,
              description: planData.description,
              orderIndex: planData.orderIndex,
              status: 'PENDING',
            },
            select: {
              id: true,
              title: true,
              status: true,
              orderIndex: true,
            },
          }),
        ),
      );

      return { ...goal, plans };
    });
  }
}
