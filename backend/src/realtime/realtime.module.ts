import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
