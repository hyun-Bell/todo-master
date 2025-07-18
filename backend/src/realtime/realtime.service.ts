import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  createClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from '@supabase/supabase-js';
import {
  DatabaseChangeData,
  DatabaseChangeEvent,
  RealtimeEventType,
} from '../common/events/realtime-events';

type DatabaseRecord = Record<string, unknown>;
type RealtimePayload = RealtimePostgresChangesPayload<DatabaseRecord>;

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private supabase: SupabaseClient | null = null;
  private channels: Map<string, RealtimeChannel> = new Map();
  private logger = new Logger('RealtimeService');

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
      this.logger.log('Supabase client initialized');
    } else {
      this.logger.warn('Supabase configuration missing');
    }
  }

  async onModuleInit() {
    if (!this.supabase) {
      this.logger.warn(
        'Supabase not configured, skipping realtime initialization',
      );
      return;
    }

    // 기본 테이블 구독
    const tables = ['goals', 'plans', 'checkpoints'];
    for (const table of tables) {
      this.subscribeToTable(table);
    }
  }

  async onModuleDestroy() {
    // 모든 채널 구독 해제
    for (const [table, _channel] of this.channels) {
      await this.unsubscribeFromTable(table);
    }

    if (this.supabase) {
      await this.supabase.removeAllChannels();
    }
  }

  private subscribeToTable(table: string): void {
    if (!this.supabase) {
      return;
    }

    try {
      const channel = this.supabase
        .channel(`realtime:${table}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
          },
          (payload: RealtimePayload) => {
            this.handleRealtimeChange(table, payload);
          },
        )
        .subscribe();

      this.channels.set(table, channel);
      this.logger.log(`Subscribed to ${table} changes`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to ${table} changes`, error);
    }
  }

  private async unsubscribeFromTable(table: string): Promise<void> {
    const channel = this.channels.get(table);
    if (channel) {
      await channel.unsubscribe();
      this.channels.delete(table);
      this.logger.log(`Unsubscribed from ${table} changes`);
    }
  }

  private handleRealtimeChange(table: string, payload: RealtimePayload): void {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      const userIdValue =
        (newRecord as DatabaseRecord)?.user_id ||
        (oldRecord as DatabaseRecord)?.user_id;

      const userId = userIdValue
        ? typeof userIdValue === 'string' || typeof userIdValue === 'number'
          ? String(userIdValue)
          : ''
        : '';

      if (!userId) {
        this.logger.warn(`No userId found in ${table} change event`);
        return;
      }

      let action: 'INSERT' | 'UPDATE' | 'DELETE';
      let data: DatabaseChangeData;

      switch (eventType) {
        case 'INSERT':
          action = 'INSERT';
          data = newRecord as DatabaseChangeData;
          break;
        case 'UPDATE':
          action = 'UPDATE';
          data = {
            id: newRecord.id as string,
            changes: newRecord,
            old: oldRecord,
          };
          break;
        case 'DELETE':
          action = 'DELETE';
          data = {
            id: (oldRecord as DatabaseRecord).id as string,
          };
          break;
        default: {
          const eventTypeStr = String(eventType);
          this.logger.warn(`Unknown event type: ${eventTypeStr}`);
          return;
        }
      }

      // 이벤트 발행
      this.eventEmitter.emit(
        RealtimeEventType.DATABASE_CHANGE,
        new DatabaseChangeEvent(table, action, userId, data),
      );

      this.logger.debug(
        `Emitted ${action} event for ${table} (user: ${userId})`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling realtime change: ${(error as Error).message}`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    try {
      // 간단한 쿼리로 연결 테스트
      const { error } = await this.supabase.from('users').select('id').limit(1);
      return !error;
    } catch (error) {
      this.logger.error('Supabase connection test failed:', error);
      return false;
    }
  }
}
