import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { GoalRepository } from './repositories/goal.repository';
import { UserRepository } from '../users/repositories/user.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [GoalsService, GoalRepository, UserRepository],
  controllers: [GoalsController],
  exports: [GoalRepository],
})
export class GoalsModule {}
