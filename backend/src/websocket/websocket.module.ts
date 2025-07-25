import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommonModule } from '../common/modules/common.module';

import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [ConfigModule, CommonModule],
  providers: [WebsocketGateway],
  exports: [],
})
export class WebsocketModule {}
