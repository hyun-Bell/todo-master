import { Injectable } from '@nestjs/common';

import { Goal, Prisma, User } from '../../../generated/prisma';
import { BaseRepository } from '../../common/repositories/base.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

export interface UserFilter {
  email?: string;
  fullName?: string;
  supabaseId?: string;
}

@Injectable()
export class UserRepository extends BaseRepository<
  User,
  CreateUserDto,
  UpdateUserDto,
  UserFilter
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  async create(data: CreateUserDto): Promise<User> {
    return this.prisma.user.create({
      data: {
        id: data.id,
        email: data.email,
        fullName: data.fullName || '',
        avatarUrl: data.avatarUrl || '',
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByIdWithGoals(
    id: string,
  ): Promise<(User & { goals: Goal[] }) | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        goals: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            deadline: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true,
            userId: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findBySupabaseId(supabaseId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { supabaseId },
    });
  }

  async findByEmailOrSupabaseId(
    email: string,
    supabaseId: string,
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { supabaseId }],
      },
    });
  }

  async findAll(filter?: UserFilter): Promise<User[]> {
    const where: Prisma.UserWhereInput = {};

    if (filter?.email) {
      where.email = { contains: filter.email, mode: 'insensitive' };
    }
    if (filter?.fullName) {
      where.fullName = { contains: filter.fullName, mode: 'insensitive' };
    }
    if (filter?.supabaseId) {
      where.supabaseId = filter.supabaseId;
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      },
    });
  }

  async updateSupabaseId(id: string, supabaseId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { supabaseId },
    });
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async deleteByEmail(email: string): Promise<void> {
    await this.prisma.user.delete({
      where: { email },
    });
  }

  async count(filter?: UserFilter): Promise<number> {
    const where: Prisma.UserWhereInput = {};

    if (filter?.email) {
      where.email = { contains: filter.email, mode: 'insensitive' };
    }
    if (filter?.fullName) {
      where.fullName = { contains: filter.fullName, mode: 'insensitive' };
    }
    if (filter?.supabaseId) {
      where.supabaseId = filter.supabaseId;
    }

    return this.prisma.user.count({ where });
  }

  async exists(id: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!user;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }
}
