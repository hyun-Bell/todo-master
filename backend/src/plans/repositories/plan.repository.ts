import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Plan, PlanStatus, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

export interface PlanFilter {
  goalId?: string;
  status?: PlanStatus;
  search?: string;
}

export interface PlanWithCheckpoints extends Plan {
  checkpoints?: Array<{
    id: string;
    description: string | null;
    isCompleted: boolean;
    orderIndex: number;
  }>;
}

export interface PlanWithDetails extends Plan {
  goal: {
    id: string;
    title: string;
    userId: string;
  };
  checkpoints: Array<{
    id: string;
    title: string;
    description: string | null;
    isCompleted: boolean;
    orderIndex: number;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

@Injectable()
export class PlanRepository extends BaseRepository<
  Plan,
  CreatePlanDto,
  UpdatePlanDto,
  PlanFilter
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: CreatePlanDto & { goalId: string }): Promise<Plan> {
    return this.prisma.plan.create({
      data: {
        goalId: data.goalId,
        title: data.title,
        description: data.description,
        orderIndex: data.orderIndex || 0,
        estimatedDuration: data.estimatedDuration,
        status: data.status || PlanStatus.PENDING,
      },
    });
  }

  async findById(id: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { id },
    });
  }

  async findByIdWithCheckpoints(
    id: string,
  ): Promise<PlanWithCheckpoints | null> {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        checkpoints: {
          select: {
            id: true,
            description: true,
            isCompleted: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async findByIdWithDetails(id: string): Promise<PlanWithDetails | null> {
    return this.prisma.plan.findUnique({
      where: { id },
      include: {
        goal: {
          select: {
            id: true,
            title: true,
            userId: true,
          },
        },
        checkpoints: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    }) as Promise<PlanWithDetails | null>;
  }

  async findAll(filter?: PlanFilter): Promise<Plan[]> {
    const where: Prisma.PlanWhereInput = {};

    if (filter?.goalId) {
      where.goalId = filter.goalId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.plan.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });
  }

  async findAllByGoalId(goalId: string): Promise<Plan[]> {
    return this.prisma.plan.findMany({
      where: { goalId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  async findAllWithCheckpoints(
    filter?: PlanFilter,
  ): Promise<PlanWithCheckpoints[]> {
    const where: Prisma.PlanWhereInput = {};

    if (filter?.goalId) {
      where.goalId = filter.goalId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }
    if (filter?.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.plan.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
      include: {
        checkpoints: {
          select: {
            id: true,
            description: true,
            isCompleted: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
  }

  async update(id: string, data: UpdatePlanDto): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.estimatedDuration !== undefined && {
          estimatedDuration: data.estimatedDuration,
        }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });
  }

  async updateStatus(id: string, status: PlanStatus): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data: { status },
    });
  }

  async updateOrder(id: string, orderIndex: number): Promise<Plan> {
    return this.prisma.plan.update({
      where: { id },
      data: { orderIndex },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.plan.delete({
      where: { id },
    });
  }

  async deleteAllByGoalId(goalId: string): Promise<void> {
    await this.prisma.plan.deleteMany({
      where: { goalId },
    });
  }

  async count(filter?: PlanFilter): Promise<number> {
    const where: Prisma.PlanWhereInput = {};

    if (filter?.goalId) {
      where.goalId = filter.goalId;
    }
    if (filter?.status) {
      where.status = filter.status;
    }

    return this.prisma.plan.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!plan;
  }

  async belongsToGoal(id: string, goalId: string): Promise<boolean> {
    const plan = await this.prisma.plan.findFirst({
      where: { id, goalId },
      select: { id: true },
    });
    return !!plan;
  }

  /**
   * 트랜잭션 내에서 Plan과 Checkpoints를 함께 생성
   */
  async createPlanWithCheckpoints(
    planData: CreatePlanDto & { goalId: string },
    checkpointsData: Array<{
      title: string;
      description: string;
      orderIndex: number;
    }>,
  ): Promise<PlanWithCheckpoints> {
    return this.transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          goalId: planData.goalId,
          title: planData.title,
          description: planData.description,
          orderIndex: planData.orderIndex || 0,
          estimatedDuration: planData.estimatedDuration,
          status: planData.status || PlanStatus.PENDING,
        },
      });

      const checkpoints = await Promise.all(
        checkpointsData.map((checkpointData) =>
          tx.checkpoint.create({
            data: {
              planId: plan.id,
              title: checkpointData.title,
              description: checkpointData.description,
              orderIndex: checkpointData.orderIndex,
              isCompleted: false,
            },
            select: {
              id: true,
              description: true,
              isCompleted: true,
              orderIndex: true,
            },
          }),
        ),
      );

      return { ...plan, checkpoints };
    });
  }

  /**
   * Plan의 순서를 재정렬
   */
  async reorderPlans(
    goalId: string,
    planOrders: Array<{ id: string; orderIndex: number }>,
  ): Promise<void> {
    await this.transaction(async (tx) => {
      await Promise.all(
        planOrders.map((order) =>
          tx.plan.update({
            where: { id: order.id, goalId },
            data: { orderIndex: order.orderIndex },
          }),
        ),
      );
    });
  }
}
