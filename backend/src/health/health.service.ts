import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from '@upstash/redis';
import { ConfigService } from '@nestjs/config';
import {
  DetailedHealthResponseDto,
  HealthResponseDto,
  ServiceStatus,
} from './dto/health-response.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { WebsocketService } from '../websocket/websocket.service';

@Injectable()
export class HealthService {
  private redis: Redis | null = null;

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
    @Optional() private realtimeService?: RealtimeService,
    @Optional() private websocketService?: WebsocketService,
  ) {
    const redisUrl = this.configService.get<string>('UPSTASH_REDIS_URL');
    const redisToken = this.configService.get<string>('UPSTASH_REDIS_TOKEN');

    if (redisUrl && redisToken) {
      this.redis = new Redis({ url: redisUrl, token: redisToken });
    }
  }

  async checkHealth(): Promise<HealthResponseDto> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSupabase(),
    ]);

    const [database, redis, supabase] = checks.map((result) =>
      result.status === 'fulfilled' ? result.value : false,
    );

    const allHealthy = database && redis && supabase;

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: database ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
        supabase: supabase ? 'up' : 'down',
      },
    };
  }

  async checkDetailedHealth(): Promise<DetailedHealthResponseDto> {
    const [database, redis, memory, supabase, websocket] =
      await Promise.allSettled([
        this.checkDatabaseDetailed(),
        this.checkRedisDetailed(),
        this.checkMemoryUsage(),
        this.checkSupabaseDetailed(),
        this.checkWebSocketDetailed(),
      ]);

    return {
      status: this.determineOverallStatus([
        database,
        redis,
        supabase,
        websocket,
      ]),
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: this.formatServiceResult(database),
        redis: this.formatServiceResult(redis),
        supabase: this.formatServiceResult(supabase),
        websocket: this.formatServiceResult(websocket),
      },
      system: {
        memory: this.formatServiceResult(memory),
        nodeVersion: process.version,
        environment: this.configService.get('NODE_ENV') || 'development',
      },
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkDatabaseDetailed(): Promise<ServiceStatus> {
    try {
      const start = Date.now();
      await this.prismaService.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: 'up',
        responseTime,
        message: 'PostgreSQL is healthy',
      };
    } catch (error) {
      return {
        status: 'down',
        message: `Database error: ${(error as Error).message}`,
      };
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      if (!this.redis) return false;
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedisDetailed(): Promise<ServiceStatus> {
    try {
      if (!this.redis) {
        return {
          status: 'down',
          message: 'Redis not configured',
        };
      }

      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;

      return {
        status: 'up',
        responseTime,
        message: 'Redis is healthy',
      };
    } catch (error) {
      return {
        status: 'down',
        message: `Redis error: ${(error as Error).message}`,
      };
    }
  }

  private checkMemoryUsage(): ServiceStatus {
    const used = process.memoryUsage();
    const totalMB = Math.round(used.heapTotal / 1024 / 1024);
    const usedMB = Math.round(used.heapUsed / 1024 / 1024);
    const percentUsed = Math.round((used.heapUsed / used.heapTotal) * 100);

    return {
      status: percentUsed < 90 ? ('up' as const) : ('down' as const),
      message: `Memory usage: ${usedMB}MB / ${totalMB}MB (${percentUsed}%)`,
      metadata: {
        heapTotal: totalMB,
        heapUsed: usedMB,
        percentUsed,
        rss: Math.round(used.rss / 1024 / 1024),
      },
    };
  }

  private determineOverallStatus(
    results: PromiseSettledResult<ServiceStatus>[],
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const healthyCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value?.status === 'up',
    ).length;

    if (healthyCount === results.length) return 'healthy';
    if (healthyCount > results.length / 2) return 'degraded';
    return 'unhealthy';
  }

  private formatServiceResult(
    result: PromiseSettledResult<ServiceStatus>,
  ): ServiceStatus {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      status: 'error' as const,
      message: (result.reason as Error)?.message || 'Unknown error',
    };
  }

  private async checkSupabase(): Promise<boolean> {
    try {
      if (!this.realtimeService) return false;
      return await this.realtimeService.testConnection();
    } catch {
      return false;
    }
  }

  private async checkSupabaseDetailed(): Promise<ServiceStatus> {
    try {
      if (!this.realtimeService) {
        return {
          status: 'down',
          message: 'Realtime service not available',
        };
      }

      const start = Date.now();
      const isConnected = await this.realtimeService.testConnection();
      const responseTime = Date.now() - start;

      return {
        status: isConnected ? 'up' : 'down',
        responseTime,
        message: isConnected
          ? 'Supabase is healthy'
          : 'Supabase connection failed',
      };
    } catch (error) {
      return {
        status: 'down',
        message: `Supabase error: ${(error as Error).message}`,
      };
    }
  }

  private checkWebSocketDetailed(): ServiceStatus {
    try {
      if (!this.websocketService) {
        return {
          status: 'down',
          message: 'WebSocket service not available',
        };
      }

      const connectedClients = this.websocketService.getConnectedClientsCount();

      return {
        status: 'up',
        message: `WebSocket is healthy (${connectedClients} clients connected)`,
        metadata: {
          connectedClients,
        },
      };
    } catch (error) {
      return {
        status: 'down',
        message: `WebSocket error: ${(error as Error).message}`,
      };
    }
  }
}
