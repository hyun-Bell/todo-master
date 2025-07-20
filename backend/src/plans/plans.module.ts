import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PlanRepository } from './repositories/plan.repository';
import { GoalRepository } from '../goals/repositories/goal.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [PlansService, PlanRepository, GoalRepository],
  controllers: [PlansController],
  exports: [PlanRepository],
})
export class PlansModule {}
