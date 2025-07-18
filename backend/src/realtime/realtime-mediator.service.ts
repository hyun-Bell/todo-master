import { Injectable, Logger } from '@nestjs/common';
import {
  RealtimeBroadcaster,
  RealtimeChange,
  RealtimeMediator,
} from './interfaces/realtime-mediator.interface';

@Injectable()
export class RealtimeMediatorService implements RealtimeMediator {
  private logger = new Logger('RealtimeMediatorService');
  private broadcaster: RealtimeBroadcaster | null = null;
  private userSubscriptions: Map<string, Set<string>> = new Map();

  setBroadcaster(broadcaster: RealtimeBroadcaster): void {
    this.broadcaster = broadcaster;
    this.logger.log('Broadcaster connected');
  }

  async handleDatabaseChange(change: RealtimeChange): Promise<void> {
    if (!this.broadcaster) {
      this.logger.warn('No broadcaster available for database change');
      return;
    }

    const eventName = `${change.table}:${change.action.toLowerCase()}`;

    // 특정 사용자에게 브로드캐스트
    if (change.userId) {
      await this.broadcaster.broadcastToUser(
        change.userId,
        eventName,
        change.data,
      );
    }

    // 테이블 구독자에게 브로드캐스트
    await this.broadcaster.broadcastToTable(
      change.table,
      eventName,
      change.data,
    );

    this.logger.debug(`Broadcasted ${eventName} to relevant subscribers`);
  }

  subscribeUser(userId: string, tables: string[]): void {
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }

    const subscriptions = this.userSubscriptions.get(userId)!;
    tables.forEach((table) => subscriptions.add(table));

    this.logger.log(`User ${userId} subscribed to: ${tables.join(', ')}`);
  }

  unsubscribeUser(userId: string, tables: string[]): void {
    const subscriptions = this.userSubscriptions.get(userId);
    if (!subscriptions) return;

    tables.forEach((table) => subscriptions.delete(table));

    if (subscriptions.size === 0) {
      this.userSubscriptions.delete(userId);
    }

    this.logger.log(`User ${userId} unsubscribed from: ${tables.join(', ')}`);
  }

  getUserSubscriptions(userId: string): string[] {
    const subscriptions = this.userSubscriptions.get(userId);
    return subscriptions ? Array.from(subscriptions) : [];
  }

  isUserSubscribed(userId: string, table: string): boolean {
    const subscriptions = this.userSubscriptions.get(userId);
    return subscriptions ? subscriptions.has(table) : false;
  }
}
