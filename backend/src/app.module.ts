import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UnifiedAuthGuard } from './auth/guards/unified-auth.guard';
import { CommonModule } from './common/modules/common.module';
import configuration from './config';
import { validationSchema } from './config/validation.schema';
import { GoalsModule } from './goals/goals.module';
import { HealthModule } from './health/health.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SupabaseModule } from './supabase/supabase.module';
import { UsersModule } from './users/users.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
      ],
      load: configuration,
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    CommonModule,
    PrismaModule,
    SupabaseModule,
    AuthModule,
    UsersModule,
    GoalsModule,
    PlansModule,
    WebsocketModule,
    RealtimeModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: UnifiedAuthGuard,
    },
  ],
})
export class AppModule {}
