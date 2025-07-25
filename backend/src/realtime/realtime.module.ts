import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommonModule } from '../common/modules/common.module';

import { SupabaseRealtimeAdapter } from './adapters/supabase.adapter';
import { WebsocketRealtimeAdapter } from './adapters/websocket.adapter';
import { RealtimeService } from './realtime.service';
import { UnifiedRealtimeService } from './services/unified-realtime.service';

@Module({
  imports: [ConfigModule, CommonModule],
  providers: [
    RealtimeService,
    UnifiedRealtimeService,
    WebsocketRealtimeAdapter,
    SupabaseRealtimeAdapter,
  ],
  exports: [RealtimeService, UnifiedRealtimeService],
})
export class RealtimeModule {}
