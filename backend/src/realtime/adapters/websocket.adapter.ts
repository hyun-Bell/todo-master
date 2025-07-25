import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { RealtimeEventType } from '../../common/events/realtime-events';
import { BroadcastService } from '../../common/services/broadcast.service';
import { WebsocketService } from '../../common/services/websocket/websocket.service';
import {
  IRealtimeAdapter,
  RealtimeEvent,
} from '../interfaces/realtime.interface';

@Injectable()
export class WebsocketRealtimeAdapter implements IRealtimeAdapter {
  private readonly logger = new Logger('WebsocketRealtimeAdapter');

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly broadcastService: BroadcastService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  connect(userId: string, connectionId: string): Promise<void> {
    this.logger.log(`WebSocket connect: ${userId} - ${connectionId}`);
    // WebsocketService already handles connection via Gateway
    return Promise.resolve();
  }

  disconnect(connectionId: string): Promise<void> {
    this.logger.log(`WebSocket disconnect: ${connectionId}`);
    // WebsocketService already handles disconnection via Gateway
    return Promise.resolve();
  }

  subscribe(userId: string, tables: string[]): Promise<void> {
    this.logger.log(
      `WebSocket subscribe: ${userId} to tables ${tables.join(', ')}`,
    );
    // WebsocketService handles subscription via socket rooms
    // No additional action needed as WebsocketGateway manages this
    return Promise.resolve();
  }

  unsubscribe(userId: string, tables: string[]): Promise<void> {
    this.logger.log(
      `WebSocket unsubscribe: ${userId} from tables ${tables.join(', ')}`,
    );
    // WebsocketService handles unsubscription via socket rooms
    // No additional action needed as WebsocketGateway manages this
    return Promise.resolve();
  }

  broadcast(event: RealtimeEvent): Promise<void> {
    this.logger.debug(`Broadcasting event via WebSocket: ${event.type}`);

    // Emit event for BroadcastService to handle
    this.eventEmitter.emit(RealtimeEventType.DATABASE_CHANGE, {
      table: event.table,
      action: event.type,
      userId: event.userId,
      data: event.data,
      timestamp: event.timestamp.toISOString(),
    });
    return Promise.resolve();
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Check if WebSocket server is initialized
      const activeUsers = await this.websocketService.getActiveUserCount();
      return activeUsers >= 0;
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`);
      return false;
    }
  }
}
