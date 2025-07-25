import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { BroadcastService } from '../../common/services/broadcast.service';
import { SupabaseRealtimeAdapter } from '../adapters/supabase.adapter';
import { WebsocketRealtimeAdapter } from '../adapters/websocket.adapter';
import {
  IRealtimeAdapter,
  IRealtimeService,
  RealtimeConfig,
  RealtimeConnection,
  RealtimeEvent,
  RealtimeProvider,
  RealtimeSubscription,
} from '../interfaces/realtime.interface';

/**
 * Error 객체에서 안전하게 메시지를 추출하는 헬퍼 함수
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

@Injectable()
export class UnifiedRealtimeService implements IRealtimeService, OnModuleInit {
  private readonly logger = new Logger('UnifiedRealtimeService');
  private config!: RealtimeConfig;
  private currentAdapter!: IRealtimeAdapter;
  private fallbackAdapter?: IRealtimeAdapter;
  private readonly connections: Map<string, RealtimeConnection[]> = new Map();
  private readonly subscriptions: Map<string, RealtimeSubscription> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly websocketAdapter: WebsocketRealtimeAdapter,
    private readonly supabaseAdapter: SupabaseRealtimeAdapter,
    private readonly broadcastService: BroadcastService,
    private readonly _eventEmitter: EventEmitter2,
  ) {
    this.initializeConfig();
  }

  async onModuleInit() {
    await this.initializeAdapters();
  }

  private initializeConfig() {
    const provider = this.configService.get<string>(
      'REALTIME_PROVIDER',
      'websocket',
    ) as RealtimeProvider;
    const fallbackEnabled = this.configService.get<boolean>(
      'REALTIME_FALLBACK_ENABLED',
      true,
    );

    this.config = {
      provider,
      fallbackProvider:
        provider === RealtimeProvider.WEBSOCKET
          ? RealtimeProvider.SUPABASE
          : RealtimeProvider.WEBSOCKET,
      enableFallback: fallbackEnabled,
    };

    this.logger.log(
      `Realtime config: provider=${provider}, fallback=${fallbackEnabled}`,
    );
  }

  private async initializeAdapters() {
    // Set primary adapter
    this.currentAdapter = this.getAdapter(this.config.provider);

    // Set fallback adapter if enabled
    if (this.config.enableFallback && this.config.fallbackProvider) {
      this.fallbackAdapter = this.getAdapter(this.config.fallbackProvider);
    }

    // Health check
    const isHealthy = await this.currentAdapter.isHealthy();
    if (!isHealthy && this.fallbackAdapter) {
      this.logger.warn(`Primary adapter unhealthy, switching to fallback`);
      await this.switchProvider(this.config.fallbackProvider!);
    }
  }

  private getAdapter(provider: RealtimeProvider): IRealtimeAdapter {
    switch (provider) {
      case RealtimeProvider.WEBSOCKET:
        return this.websocketAdapter;
      case RealtimeProvider.SUPABASE:
        return this.supabaseAdapter;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async connect(userId: string, connectionId: string): Promise<void> {
    try {
      await this.currentAdapter.connect(userId, connectionId);

      // Track connection
      const connections = this.connections.get(userId) || [];
      connections.push({
        userId,
        connectionId,
        provider: this.getActiveProvider(),
        connectedAt: new Date(),
      });
      this.connections.set(userId, connections);

      this.logger.log(
        `User ${userId} connected via ${this.getActiveProvider()}`,
      );
    } catch (error) {
      this.logger.error(`Connection failed: ${getErrorMessage(error)}`);
      await this.handleAdapterError(error);
    }
  }

  async disconnect(connectionId: string): Promise<void> {
    try {
      await this.currentAdapter.disconnect(connectionId);

      // Remove connection tracking
      for (const [userId, connections] of this.connections.entries()) {
        const filtered = connections.filter(
          (c) => c.connectionId !== connectionId,
        );
        if (filtered.length === 0) {
          this.connections.delete(userId);
        } else {
          this.connections.set(userId, filtered);
        }
      }

      this.logger.log(`Connection ${connectionId} disconnected`);
    } catch (error) {
      this.logger.error(`Disconnection failed: ${getErrorMessage(error)}`);
    }
  }

  getActiveConnections(userId: string): Promise<RealtimeConnection[]> {
    return Promise.resolve(this.connections.get(userId) || []);
  }

  async subscribe(userId: string, tables: string[]): Promise<void> {
    try {
      await this.currentAdapter.subscribe(userId, tables);

      // Track subscription
      const subscription = this.subscriptions.get(userId) || {
        userId,
        tables: [],
        provider: this.getActiveProvider(),
      };

      subscription.tables = Array.from(
        new Set([...subscription.tables, ...tables]),
      );
      this.subscriptions.set(userId, subscription);

      this.logger.log(
        `User ${userId} subscribed to tables: ${tables.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Subscription failed: ${getErrorMessage(error)}`);
      await this.handleAdapterError(error);
    }
  }

  async unsubscribe(userId: string, tables: string[]): Promise<void> {
    try {
      await this.currentAdapter.unsubscribe(userId, tables);

      // Update subscription tracking
      const subscription = this.subscriptions.get(userId);
      if (subscription) {
        subscription.tables = subscription.tables.filter(
          (t) => !tables.includes(t),
        );
        if (subscription.tables.length === 0) {
          this.subscriptions.delete(userId);
        }
      }

      this.logger.log(
        `User ${userId} unsubscribed from tables: ${tables.join(', ')}`,
      );
    } catch (error) {
      this.logger.error(`Unsubscription failed: ${getErrorMessage(error)}`);
    }
  }

  getSubscriptions(userId: string): Promise<RealtimeSubscription> {
    return Promise.resolve(
      this.subscriptions.get(userId) || {
        userId,
        tables: [],
        provider: this.getActiveProvider(),
      },
    );
  }

  async broadcast(event: RealtimeEvent): Promise<void> {
    try {
      // Ensure event includes current provider
      event.provider = this.getActiveProvider();

      // Broadcast via current adapter
      await this.currentAdapter.broadcast(event);

      // If using Supabase as primary, also broadcast to WebSocket clients
      if (
        this.getActiveProvider() === RealtimeProvider.SUPABASE &&
        event.table
      ) {
        const eventName = `${event.table}:${event.type.toLowerCase()}`;
        const data = {
          table: event.table,
          event: event.type.toLowerCase(),
          record: event.data,
          timestamp: event.timestamp.toISOString(),
        };

        if (event.userId) {
          await this.broadcastService.broadcastToUser(
            event.userId,
            eventName,
            data,
          );
        }
        this.broadcastService.broadcastToRoom(
          `table:${event.table}`,
          eventName,
          data,
        );
      }

      this.logger.debug(`Broadcasted event: ${event.type} on ${event.table}`);
    } catch (error) {
      this.logger.error(`Broadcast failed: ${getErrorMessage(error)}`);
      await this.handleAdapterError(error);
    }
  }

  async broadcastToUser(
    userId: string,
    event: string,
    data: any,
  ): Promise<void> {
    await this.broadcastService.broadcastToUser(userId, event, data);
  }

  async broadcastToTable(
    table: string,
    event: string,
    data: any,
  ): Promise<void> {
    this.broadcastService.broadcastToRoom(`table:${table}`, event, data);
  }

  getActiveProvider(): RealtimeProvider {
    return this.config.provider;
  }

  async switchProvider(provider: RealtimeProvider): Promise<void> {
    this.logger.log(`Switching realtime provider to: ${provider}`);

    const newAdapter = this.getAdapter(provider);
    const isHealthy = await newAdapter.isHealthy();

    if (!isHealthy) {
      throw new Error(`Cannot switch to unhealthy provider: ${provider}`);
    }

    // Migrate existing subscriptions
    for (const [userId, subscription] of this.subscriptions.entries()) {
      await newAdapter.subscribe(userId, subscription.tables);
    }

    // Update configuration
    this.config.provider = provider;
    this.currentAdapter = newAdapter;

    this.logger.log(`Successfully switched to ${provider}`);
  }

  async isHealthy(): Promise<boolean> {
    return this.currentAdapter.isHealthy();
  }

  private async handleAdapterError(error: any): Promise<void> {
    if (!this.config.enableFallback || !this.fallbackAdapter) {
      throw error;
    }

    const fallbackHealthy = await this.fallbackAdapter.isHealthy();
    if (fallbackHealthy && this.config.fallbackProvider) {
      this.logger.warn(`Primary adapter error, switching to fallback`);
      await this.switchProvider(this.config.fallbackProvider);
    } else {
      throw error;
    }
  }
}
