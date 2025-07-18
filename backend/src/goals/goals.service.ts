import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalStatus, Priority } from '../../generated/prisma';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    createGoalDto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    const goal = await this.prisma.goal.create({
      data: {
        userId,
        title: createGoalDto.title,
        description: createGoalDto.description,
        category: createGoalDto.category || 'personal',
        deadline: createGoalDto.deadline
          ? new Date(createGoalDto.deadline)
          : null,
        status: createGoalDto.status || GoalStatus.ACTIVE,
        priority: createGoalDto.priority || Priority.MEDIUM,
      },
    });

    return new GoalResponseDto(goal);
  }

  async findAll(userId?: string): Promise<GoalResponseDto[]> {
    const goals = await this.prisma.goal.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        plans: {
          select: {
            id: true,
            title: true,
            status: true,
            orderIndex: true,
          },
        },
      },
    });

    return goals.map((goal) => new GoalResponseDto(goal));
  }

  async findOne(id: string): Promise<GoalResponseDto> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: {
        plans: {
          orderBy: { createdAt: 'desc' },
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

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다.');
    }

    return new GoalResponseDto(goal);
  }

  async update(
    id: string,
    updateGoalDto: UpdateGoalDto,
    userId: string,
  ): Promise<GoalResponseDto> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다.');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('이 목표를 수정할 권한이 없습니다.');
    }

    const updatedGoal = await this.prisma.goal.update({
      where: { id },
      data: {
        title: updateGoalDto.title,
        description: updateGoalDto.description,
        category: updateGoalDto.category,
        deadline: updateGoalDto.deadline
          ? new Date(updateGoalDto.deadline)
          : undefined,
        status: updateGoalDto.status,
        priority: updateGoalDto.priority,
      },
    });

    return new GoalResponseDto(updatedGoal);
  }

  async updateStatus(
    id: string,
    status: GoalStatus,
    userId: string,
  ): Promise<GoalResponseDto> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다.');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('권한이 없습니다.');
    }

    const updatedGoal = await this.prisma.goal.update({
      where: { id },
      data: {
        status,
      },
    });

    return new GoalResponseDto(updatedGoal);
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const goal = await this.prisma.goal.findUnique({
      where: { id },
    });

    if (!goal) {
      throw new NotFoundException('목표를 찾을 수 없습니다.');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenException('이 목표를 삭제할 권한이 없습니다.');
    }

    await this.prisma.goal.delete({
      where: { id },
    });

    return { message: '목표가 삭제되었습니다.' };
  }
}
