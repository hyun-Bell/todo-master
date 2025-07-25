import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { UserRepository } from '../users/repositories/user.repository';

import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { GoalRepository } from './repositories/goal.repository';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [GoalsService, GoalRepository, UserRepository],
  controllers: [GoalsController],
  exports: [GoalRepository],
})
export class GoalsModule {}
