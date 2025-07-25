import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';

import {
  DatabaseChangeEvent,
  RealtimeEventType,
} from '../events/realtime-events';

/**
 * 통합 브로드캐스트 서비스
 * - WebSocket과 Supabase Realtime의 브로드캐스트 기능을 일원화
 * - 이벤트 기반 아키텍처로 모듈 간 결합도 감소
 */
@Injectable()
export class BroadcastService {
  private server: Server;
  private readonly logger = new Logger('BroadcastService');

  /**
   * WebSocket 서버 인스턴스를 설정합니다.
   */
  setServer(server: Server) {
    this.server = server;
    this.logger.log('WebSocket server instance set');
  }

  /**
   * 데이터베이스 변경 이벤트를 처리합니다.
   */
  @OnEvent(RealtimeEventType.DATABASE_CHANGE)
  async handleDatabaseChange(event: DatabaseChangeEvent) {
    if (!this.server) {
      this.logger.warn('Server not initialized, skipping broadcast');
      return;
    }

    const eventName = `${event.table}:${event.action.toLowerCase()}`;
    const data = {
      table: event.table,
      event: event.action.toLowerCase(),
      record: event.data,
      timestamp: new Date().toISOString(),
    };

    try {
      // 특정 사용자에게 브로드캐스트
      if (event.userId) {
        await this.broadcastToUser(event.userId, eventName, data);
      }

      // 테이블을 구독한 모든 사용자에게 브로드캐스트
      this.broadcastToRoom(`table:${event.table}`, eventName, data);

      this.logger.debug(
        `Broadcasted ${eventName} to ${event.userId ? `user ${event.userId} and` : ''} table subscribers`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast event: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 특정 사용자에게 이벤트를 브로드캐스트합니다.
   */
  async broadcastToUser(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    if (!this.server) {
      this.logger.warn('Server not initialized, skipping broadcast');
      return;
    }

    try {
      // 사용자별 룸 사용
      this.server.to(`user:${userId}`).emit(event, data);
      this.logger.debug(`Broadcasted ${event} to user ${userId}`);
    } catch (error) {
      this.logger.error(`Broadcast to user error: ${error.message}`);
    }
  }

  /**
   * 특정 룸에 이벤트를 브로드캐스트합니다.
   */
  broadcastToRoom(
    room: string,
    event: string,
    data: Record<string, unknown>,
  ): void {
    if (!this.server) {
      this.logger.warn('Server not initialized, skipping broadcast');
      return;
    }

    try {
      this.server.to(room).emit(event, data);
      this.logger.debug(`Broadcasted ${event} to room ${room}`);
    } catch (error) {
      this.logger.error(`Broadcast to room error: ${error.message}`);
    }
  }

  /**
   * 모든 클라이언트에게 이벤트를 브로드캐스트합니다.
   */
  broadcastToAll(event: string, data: Record<string, unknown>): void {
    if (!this.server) {
      this.logger.warn('Server not initialized, skipping broadcast');
      return;
    }

    try {
      this.server.emit(event, data);
      this.logger.debug(`Broadcasted ${event} to all clients`);
    } catch (error) {
      this.logger.error(`Broadcast to all error: ${error.message}`);
    }
  }
}
