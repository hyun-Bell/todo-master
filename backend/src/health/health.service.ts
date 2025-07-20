import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from '@upstash/redis';
import { ConfigService } from '@nestjs/config';
import {
  DetailedHealthResponseDto,
  HealthResponseDto,
  ServiceStatus,
} from './dto/health-response.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { WebsocketService } from '../common/services/websocket/websocket.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LoggerFactory } from '../common/services/logger';

@Injectable()
export class HealthService {
  private redis: Redis | null = null;
  private readonly logger = LoggerFactory.create(HealthService.name);

  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
    private moduleRef: ModuleRef,
  ) {
    const redisUrl = this.configService.get<string>('UPSTASH_REDIS_URL');
    const redisToken = this.configService.get<string>('UPSTASH_REDIS_TOKEN');

    if (redisUrl && redisToken) {
      this.redis = new Redis({ url: redisUrl, token: redisToken });
    }
  }

  private getRealtimeService(): RealtimeService | null {
    try {
      return this.moduleRef.get(RealtimeService, { strict: false });
    } catch {
      return null;
    }
  }

  private getWebsocketService(): WebsocketService | null {
    try {
      return this.moduleRef.get(WebsocketService, { strict: false });
    } catch {
      return null;
    }
  }

  private getSupabaseService(): SupabaseService | null {
    try {
      return this.moduleRef.get(SupabaseService, { strict: false });
    } catch {
      return null;
    }
  }

  async checkHealth(): Promise<HealthResponseDto> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSupabase(),
    ]);

    const [databaseResult, redisResult, supabaseResult] = checks;

    // ServiceStatus 타입을 확인하여 상태 결정
    const database =
      databaseResult.status === 'fulfilled' &&
      databaseResult.value.status === 'up';
    const redis = redisResult.status === 'fulfilled' && redisResult.value;
    const supabase =
      supabaseResult.status === 'fulfilled' &&
      supabaseResult.value.status === 'up';

    const allHealthy = database && redis && supabase;

    return {
      status: allHealthy ? 'ok' : 'unhealthy',
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

  async checkDatabase(): Promise<ServiceStatus> {
    try {
      const start = Date.now();
      await this.prismaService.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      this.logger.log(`Database health check passed (${responseTime}ms)`);

      return {
        status: 'up',
        responseTime,
        message: 'PostgreSQL connection is healthy',
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'down',
        message: `Database connection failed: ${(error as Error).message}`,
      };
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

  async checkSupabase(): Promise<ServiceStatus> {
    try {
      const supabaseService = this.getSupabaseService();
      if (!supabaseService) {
        return {
          status: 'down',
          message: 'Supabase service not configured',
        };
      }

      const start = Date.now();

      // Supabase 연결 테스트
      const client = supabaseService.getClient();
      const { error } = await client.from('users').select('count').limit(1);

      const responseTime = Date.now() - start;

      if (error) {
        throw error;
      }

      this.logger.log(`Supabase health check passed (${responseTime}ms)`);

      return {
        status: 'up',
        responseTime,
        message: 'Supabase connection is healthy',
      };
    } catch (error) {
      this.logger.error('Supabase health check failed', error);
      return {
        status: 'down',
        message: `Supabase connection failed: ${(error as Error).message}`,
      };
    }
  }

  private async checkSupabaseDetailed(): Promise<ServiceStatus> {
    try {
      const realtimeService = this.getRealtimeService();
      if (!realtimeService) {
        return {
          status: 'down',
          message: 'Realtime service not available',
        };
      }

      const start = Date.now();
      const isConnected = await realtimeService.testConnection();
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
      const websocketService = this.getWebsocketService();
      if (!websocketService) {
        return {
          status: 'down',
          message: 'WebSocket service not available',
        };
      }

      const connectedClients = websocketService.getConnectedClientsCount();

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
