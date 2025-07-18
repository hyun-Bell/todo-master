import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import {
  DatabaseChangeEvent,
  RealtimeEventType,
} from '../../common/events/realtime.events';

@Injectable()
export class BroadcastService {
  private server: Server;
  private logger = new Logger('BroadcastService');

  constructor(private eventEmitter: EventEmitter2) {
    // Listen for database changes from RealtimeService
    this.eventEmitter.on(
      RealtimeEventType.DATABASE_INSERT,
      this.handleDatabaseChange.bind(this),
    );
    this.eventEmitter.on(
      RealtimeEventType.DATABASE_UPDATE,
      this.handleDatabaseChange.bind(this),
    );
    this.eventEmitter.on(
      RealtimeEventType.DATABASE_DELETE,
      this.handleDatabaseChange.bind(this),
    );
  }

  setServer(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server connected to BroadcastService');
  }

  private handleDatabaseChange(event: DatabaseChangeEvent) {
    if (!this.server) {
      this.logger.warn('No WebSocket server available for broadcasting');
      return;
    }

    const eventName = `${event.table}:${event.action.toLowerCase()}`;
    const data = {
      table: event.table,
      event: event.action.toLowerCase(),
      record: event.record,
      oldRecord: event.oldRecord,
      timestamp: event.timestamp,
    };

    // Broadcast to specific user
    if (event.userId) {
      this.broadcastToUser(event.userId, eventName, data);
    }

    // Broadcast to table subscribers
    this.broadcastToTable(event.table, eventName, data);
  }

  broadcastToUser(userId: string, event: string, data: any): void {
    try {
      // Use user-specific room
      this.server.to(`user:${userId}`).emit(event, data);
      this.logger.debug(`Broadcasted ${event} to user ${userId}`);
    } catch (error) {
      this.logger.error(`Broadcast to user error: ${(error as Error).message}`);
    }
  }

  broadcastToTable(table: string, event: string, data: any): void {
    try {
      this.server.to(`table:${table}`).emit(event, data);
      this.logger.debug(`Broadcasted ${event} to table ${table} subscribers`);
    } catch (error) {
      this.logger.error(
        `Broadcast to table error: ${(error as Error).message}`,
      );
    }
  }

  broadcastToAll(event: string, data: any): void {
    try {
      this.server.emit(event, data);
      this.logger.debug(`Broadcasted ${event} to all clients`);
    } catch (error) {
      this.logger.error(`Broadcast to all error: ${error.message}`);
    }
  }
}
