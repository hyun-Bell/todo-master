import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';

import { BroadcastService } from '../services/broadcast.service';
import { WebsocketService } from '../services/websocket/websocket.service';

/**
 * 공통 기능을 제공하는 전역 모듈
 */
@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '15m',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [BroadcastService, WebsocketService],
  exports: [BroadcastService, WebsocketService, EventEmitterModule],
})
export class CommonModule {}
