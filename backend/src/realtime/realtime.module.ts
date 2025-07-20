import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { UnifiedRealtimeService } from './services/unified-realtime.service';
import { WebsocketRealtimeAdapter } from './adapters/websocket.adapter';
import { SupabaseRealtimeAdapter } from './adapters/supabase.adapter';
import { CommonModule } from '../common/modules/common.module';

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
