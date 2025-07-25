import { Module } from '@nestjs/common';

import { GoalRepository } from '../goals/repositories/goal.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';

import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlanRepository } from './repositories/plan.repository';

@Module({
  imports: [PrismaModule, RealtimeModule],
  providers: [PlansService, PlanRepository, GoalRepository],
  controllers: [PlansController],
  exports: [PlanRepository],
})
export class PlansModule {}
