import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlanResponseDto } from './dto/plan-response.dto';
import { PlanStatus } from '../../generated/prisma';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async create(createPlanDto: CreatePlanDto): Promise<PlanResponseDto> {
    const goal = await this.prisma.goal.findUnique({
      where: { id: createPlanDto.goalId },
    });

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다.');
    }

    const plan = await this.prisma.plan.create({
      data: {
        goalId: createPlanDto.goalId,
        title: createPlanDto.title,
        description: createPlanDto.description,
        orderIndex: createPlanDto.orderIndex || 0,
        status: createPlanDto.status || PlanStatus.PENDING,
        estimatedDuration: createPlanDto.estimatedDuration,
      },
      include: {
        checkpoints: true,
      },
    });

    return new PlanResponseDto(plan);
  }

  async findAll(
    goalId?: string,
    status?: PlanStatus,
  ): Promise<PlanResponseDto[]> {
    const plans = await this.prisma.plan.findMany({
      where: {
        ...(goalId && { goalId }),
        ...(status && { status }),
      },
      orderBy: [{ orderIndex: 'asc' }, { createdAt: 'asc' }],
      include: {
        checkpoints: {
          select: { id: true, isCompleted: true },
        },
      },
    });

    return plans.map((plan) => new PlanResponseDto(plan));
  }

  async findOne(id: string): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('계획을 찾을 수 없습니다.');
    }

    return new PlanResponseDto(plan);
  }

  async update(
    id: string,
    updatePlanDto: UpdatePlanDto,
    userId: string,
  ): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        goal: {
          select: { userId: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('계획을 찾을 수 없습니다.');
    }

    if (plan.goal.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: {
        title: updatePlanDto.title,
        description: updatePlanDto.description,
        orderIndex: updatePlanDto.orderIndex,
        status: updatePlanDto.status,
        estimatedDuration: updatePlanDto.estimatedDuration,
      },
    });

    return new PlanResponseDto(updatedPlan);
  }

  async updateStatus(
    id: string,
    status: PlanStatus,
    userId: string,
  ): Promise<PlanResponseDto> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        goal: {
          select: { userId: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('계획을 찾을 수 없습니다.');
    }

    if (plan.goal.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    const updatedPlan = await this.prisma.plan.update({
      where: { id },
      data: { status },
    });

    return new PlanResponseDto(updatedPlan);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        goal: {
          select: { userId: true },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('계획을 찾을 수 없습니다.');
    }

    if (plan.goal.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    await this.prisma.plan.delete({
      where: { id },
    });

    return { message: '계획이 삭제되었습니다.' };
  }
}
