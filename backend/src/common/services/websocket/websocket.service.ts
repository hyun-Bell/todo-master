import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Redis } from '@upstash/redis';
import { Socket } from 'socket.io';

@Injectable()
export class WebsocketService {
  private readonly redis: Redis;
  private readonly logger = new Logger('WebsocketService');
  private readonly SESSION_TTL = 60 * 60 * 24; // 24 hours in seconds
  private readonly socketUserMap = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    const redisUrl = this.configService.get<string>('UPSTASH_REDIS_URL');
    const redisToken = this.configService.get<string>('UPSTASH_REDIS_TOKEN');

    if (redisUrl && redisToken) {
      this.redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
    } else {
      this.logger.warn(
        'Redis configuration not found, WebSocket sessions will not persist',
      );
    }
  }

  getUserIdFromSocket(socket: Socket): string | null {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return null;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload.sub;
    } catch (error) {
      // 테스트 환경에서는 예상된 토큰 검증 실패를 debug 레벨로 기록
      if (process.env.NODE_ENV === 'test') {
        this.logger.debug(
          `Token verification failed in test: ${(error as Error).message}`,
        );
      } else {
        this.logger.error(
          `Token verification failed: ${(error as Error).message}`,
        );
      }
      return null;
    }
  }

  async handleConnection(socket: Socket): Promise<string | null> {
    const userId = this.getUserIdFromSocket(socket);
    if (!userId) {
      return null;
    }

    // Save socket-user mapping
    this.socketUserMap.set(socket.id, userId);

    await this.saveConnection(socket, userId);
    return userId;
  }

  private async saveConnection(socket: Socket, userId: string) {
    if (!this.redis) return;

    const sessionKey = `ws:session:${userId}`;
    const socketsKey = `ws:user:${userId}:sockets`;

    await this.redis.sadd(socketsKey, socket.id);
    await this.redis.expire(socketsKey, this.SESSION_TTL);

    await this.redis.hset(sessionKey, {
      [socket.id]: JSON.stringify({
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
      }),
    });
    await this.redis.expire(sessionKey, this.SESSION_TTL);
  }

  async handleDisconnect(socket: Socket) {
    // Remove socket-user mapping
    const userId = this.socketUserMap.get(socket.id);
    this.socketUserMap.delete(socket.id);

    if (!this.redis) return;

    if (!userId) return;

    const socketsKey = `ws:user:${userId}:sockets`;
    const sessionKey = `ws:session:${userId}`;
    const subscriptionsKey = `ws:socket:${socket.id}:subscriptions`;

    await this.redis.srem(socketsKey, socket.id);
    await this.redis.hdel(sessionKey, socket.id);
    await this.redis.del(subscriptionsKey);
  }

  async subscribeToTables(socket: Socket, userId: string, tables: string[]) {
    if (!this.redis) return;

    const subscriptionsKey = `ws:socket:${socket.id}:subscriptions`;

    for (const table of tables) {
      void socket.join(`table:${table}`);
      void socket.join(`user:${userId}:table:${table}`);
      await this.redis.sadd(subscriptionsKey, table);
    }

    await this.redis.expire(subscriptionsKey, this.SESSION_TTL);
  }

  async unsubscribeFromTables(socket: Socket, tables: string[]) {
    if (!this.redis) return;

    const subscriptionsKey = `ws:socket:${socket.id}:subscriptions`;

    for (const table of tables) {
      void socket.leave(`table:${table}`);
      const userId = this.getUserIdFromSocket(socket);
      if (userId) {
        void socket.leave(`user:${userId}:table:${table}`);
      }
      await this.redis.srem(subscriptionsKey, table);
    }
  }

  async getUserSockets(userId: string): Promise<string[]> {
    if (!this.redis) return [];

    const socketsKey = `ws:user:${userId}:sockets`;
    const sockets = await this.redis.smembers(socketsKey);
    return sockets || [];
  }

  getUserIdBySocket(socketId: string): string | null {
    return this.socketUserMap.get(socketId) || null;
  }

  async updateLastActivity(socket: Socket) {
    if (!this.redis) return;

    const userId = this.getUserIdFromSocket(socket);
    if (!userId) return;

    const sessionKey = `ws:session:${userId}`;
    const sessionData = await this.redis.hget(sessionKey, socket.id);

    if (sessionData) {
      const session = JSON.parse(sessionData as string);
      session.lastActivity = new Date().toISOString();
      await this.redis.hset(sessionKey, {
        [socket.id]: JSON.stringify(session),
      });
      await this.redis.expire(sessionKey, this.SESSION_TTL);
    }
  }

  async getActiveUserCount(): Promise<number> {
    if (!this.redis) return 0;

    const pattern = 'ws:user:*:sockets';
    const keys = await this.redis.keys(pattern);
    return keys.length;
  }

  async getSocketSubscriptions(socketId: string): Promise<string[]> {
    if (!this.redis) return [];

    const subscriptionsKey = `ws:socket:${socketId}:subscriptions`;
    const subscriptions = await this.redis.smembers(subscriptionsKey);
    return subscriptions || [];
  }

  getConnectedClientsCount(): number {
    // 실제 구현에서는 Socket.IO의 connected sockets 수를 반환
    // 현재는 0을 반환
    return 0;
  }
}
