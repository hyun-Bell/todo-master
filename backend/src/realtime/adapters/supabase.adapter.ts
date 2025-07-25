import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RealtimeChannel, RealtimeClient } from '@supabase/realtime-js';

import {
  IRealtimeAdapter,
  RealtimeEvent,
} from '../interfaces/realtime.interface';

@Injectable()
export class SupabaseRealtimeAdapter implements IRealtimeAdapter {
  private readonly logger = new Logger('SupabaseRealtimeAdapter');
  private realtimeClient: RealtimeClient;
  private readonly channels: Map<string, RealtimeChannel> = new Map();
  private readonly userSubscriptions: Map<string, Set<string>> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.warn('Supabase configuration missing, adapter disabled');
      return;
    }

    const realtimeUrl = `${supabaseUrl.replace('https://', 'wss://')}/realtime/v1`;

    this.realtimeClient = new RealtimeClient(realtimeUrl, {
      params: {
        apikey: supabaseAnonKey,
      },
    });

    this.realtimeClient.connect();
    this.logger.log('Supabase Realtime client initialized');
  }

  connect(userId: string, connectionId: string): Promise<void> {
    this.logger.log(`Supabase connect: ${userId} - ${connectionId}`);

    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    return Promise.resolve();
  }

  disconnect(connectionId: string): Promise<void> {
    this.logger.log(`Supabase disconnect: ${connectionId}`);

    // Find user by connectionId and clean up their subscriptions
    for (const [userId, tables] of this.userSubscriptions.entries()) {
      // In a real implementation, we'd track connectionId -> userId mapping
      // For now, we'll handle this in the unified service
    }
    return Promise.resolve();
  }

  subscribe(userId: string, tables: string[]): Promise<void> {
    if (!this.realtimeClient) {
      this.logger.warn('Realtime client not initialized');
      return Promise.resolve();
    }

    this.logger.log(
      `Supabase subscribe: ${userId} to tables ${tables.join(', ')}`,
    );

    const userSubs = this.userSubscriptions.get(userId) || new Set();

    for (const table of tables) {
      if (!userSubs.has(table)) {
        userSubs.add(table);

        // Create channel if not exists
        if (!this.channels.has(table)) {
          const channel = this.realtimeClient.channel(`public:${table}`);

          channel
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table,
              },
              (payload) => {
                this.handleDatabaseChange(table, payload);
              },
            )
            .subscribe();

          this.channels.set(table, channel);
          this.logger.log(`Created Supabase channel for table: ${table}`);
        }
      }
    }

    this.userSubscriptions.set(userId, userSubs);
    return Promise.resolve();
  }

  async unsubscribe(userId: string, tables: string[]): Promise<void> {
    this.logger.log(
      `Supabase unsubscribe: ${userId} from tables ${tables.join(', ')}`,
    );

    const userSubs = this.userSubscriptions.get(userId);
    if (!userSubs) return;

    for (const table of tables) {
      userSubs.delete(table);
    }

    if (userSubs.size === 0) {
      this.userSubscriptions.delete(userId);
    }

    // Clean up channels if no users are subscribed
    for (const table of tables) {
      const hasOtherSubscribers = Array.from(
        this.userSubscriptions.values(),
      ).some((subs) => subs.has(table));

      if (!hasOtherSubscribers) {
        const channel = this.channels.get(table);
        if (channel) {
          await channel.unsubscribe();
          this.channels.delete(table);
          this.logger.log(`Removed Supabase channel for table: ${table}`);
        }
      }
    }
  }

  broadcast(event: RealtimeEvent): Promise<void> {
    this.logger.debug(`Broadcasting event via Supabase: ${event.type}`);

    // Supabase Realtime automatically broadcasts database changes
    // This method is primarily for custom events

    if (event.type === 'CUSTOM' && event.table) {
      const channel = this.channels.get(event.table);
      if (channel) {
        void channel.send({
          type: 'broadcast',
          event: 'custom',
          payload: {
            data: event.data,
            userId: event.userId,
            timestamp: event.timestamp,
          },
        });
      }
    }
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    try {
      if (!this.realtimeClient) {
        return Promise.resolve(false);
      }

      // Check if at least one channel is connected
      for (const channel of this.channels.values()) {
        if (channel.state === 'joined') {
          return Promise.resolve(true);
        }
      }

      // If no channels, check if client is connected
      return Promise.resolve(this.realtimeClient.isConnected());
    } catch (error) {
      this.logger.error(
        `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return Promise.resolve(false);
    }
  }

  private handleDatabaseChange(table: string, payload: any) {
    this.logger.debug(`Database change detected on table ${table}:`, payload);

    // Emit event to be handled by the unified service
    // In the unified service, we'll emit this to WebSocket clients if needed
  }
}
