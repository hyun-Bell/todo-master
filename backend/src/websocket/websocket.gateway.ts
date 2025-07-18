import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WebsocketService } from './websocket.service';
import { BroadcastService } from './broadcast.service';
import { LoggerFactory } from '../common/utils/logger.factory';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
  namespace: 'realtime',
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger: Logger;
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;

  constructor(
    private readonly websocketService: WebsocketService,
    private readonly broadcastService: BroadcastService,
  ) {
    this.logger = LoggerFactory.create('WebsocketGateway');
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    // BroadcastService에 서버 인스턴스 설정
    this.broadcastService.setServer(server);
  }

  async handleConnection(client: Socket) {
    try {
      const userId = await this.websocketService.handleConnection(client);

      if (!userId) {
        this.logger.warn(`Connection rejected for client ${client.id}`);
        client.emit('error', { message: '인증이 필요합니다.' });
        client.disconnect();
        return;
      }

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
      this.reconnectAttempts.delete(client.id);

      // 연결 성공 메시지 전송
      client.emit('connected', {
        userId,
        connectedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection error: ${(error as Error).message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      await this.websocketService.handleDisconnect(client);
      this.logger.log(`Client disconnected: ${client.id}`);
      this.reconnectAttempts.delete(client.id);
    } catch (error) {
      this.logger.error(`Disconnect error: ${(error as Error).message}`);
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tables: string[] },
  ) {
    try {
      const userId = this.websocketService.getUserIdBySocket(client.id);

      if (!userId) {
        return { error: 'Unauthorized' };
      }

      const { tables = [] } = data;

      await this.websocketService.subscribeToTables(client, userId, tables);

      return {
        success: true,
        subscribedTables: tables,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Subscribe error: ${(error as Error).message}`);
      return { error: (error as Error).message };
    }
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tables: string[] },
  ) {
    try {
      const { tables = [] } = data;

      await this.websocketService.unsubscribeFromTables(client, tables);

      const remainingRooms = Array.from(client.rooms).filter(
        (room) => room !== client.id && room.startsWith('table:'),
      );

      return {
        success: true,
        unsubscribedTables: tables,
        remainingTables: remainingRooms.map((room) =>
          room.replace('table:', ''),
        ),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Unsubscribe error: ${(error as Error).message}`);
      return { error: (error as Error).message };
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    const timestamp = new Date().toISOString();
    client.emit('pong', { timestamp, latency: Date.now() });
    return { received: true };
  }

  @SubscribeMessage('reconnect')
  handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody() _data: unknown,
  ) {
    try {
      const attempts = this.reconnectAttempts.get(client.id) || 0;

      if (attempts >= this.MAX_RECONNECT_ATTEMPTS) {
        client.emit('error', { message: '재연결 시도 횟수를 초과했습니다.' });
        client.disconnect();
        return { error: 'Max reconnection attempts exceeded' };
      }

      this.reconnectAttempts.set(client.id, attempts + 1);

      const userId = this.websocketService.getUserIdBySocket(client.id);
      if (!userId) {
        return { error: 'Authentication required' };
      }

      return {
        success: true,
        message: 'Reconnected successfully',
        attempt: attempts + 1,
      };
    } catch (error) {
      this.logger.error(`Reconnect error: ${(error as Error).message}`);
      return { error: (error as Error).message };
    }
  }
}
