import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import {
  DatabaseChangeEvent,
  RealtimeEventType,
} from '../common/events/realtime-events';
import { WebsocketService } from './websocket.service';
import { LoggerFactory } from '../common/utils/logger.factory';

@Injectable()
export class BroadcastService {
  private server: Server;
  private readonly logger: Logger;

  constructor(private websocketService: WebsocketService) {
    this.logger = LoggerFactory.create('BroadcastService');
  }

  setServer(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server instance set');
  }

  @OnEvent(RealtimeEventType.DATABASE_CHANGE)
  async handleDatabaseChange(event: DatabaseChangeEvent) {
    if (!this.server) {
      this.logger.warn('Server not initialized, skipping broadcast');
      return;
    }

    const eventName = `${event.table}:${event.action.toLowerCase()}`;

    try {
      // 특정 사용자에게만 브로드캐스트
      await this.broadcastToUser(event.userId, eventName, event.data);

      // 테이블을 구독한 모든 사용자에게 브로드캐스트
      this.server.to(`table:${event.table}`).emit(eventName, event.data);

      this.logger.debug(
        `Broadcasted ${eventName} to user ${event.userId} and table subscribers`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast event: ${error.message}`,
        error.stack,
      );
    }
  }

  private async broadcastToUser(
    userId: string,
    event: string,
    data: any,
  ): Promise<void> {
    try {
      const sockets = await this.websocketService.getUserSockets(userId);

      if (sockets.length === 0) {
        this.logger.debug(`No active sockets for user ${userId}`);
        return;
      }

      sockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });

      this.logger.debug(
        `Broadcasted ${event} to ${sockets.length} sockets for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Broadcast to user error: ${error.message}`);
    }
  }

  broadcastToRoom(room: string, event: string, data: any): void {
    if (!this.server) {
      this.logger.warn('Server not initialized, skipping broadcast');
      return;
    }

    try {
      this.server.to(room).emit(event, data);
      this.logger.debug(`Broadcasted ${event} to room ${room}`);
    } catch (error) {
      this.logger.error(`Broadcast to room error: ${(error as Error).message}`);
    }
  }
}
