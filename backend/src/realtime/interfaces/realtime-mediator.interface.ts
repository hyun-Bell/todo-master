export interface RealtimeChange {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  userId: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface RealtimeMediator {
  handleDatabaseChange(change: RealtimeChange): Promise<void>;
  subscribeUser(userId: string, tables: string[]): void;
  unsubscribeUser(userId: string, tables: string[]): void;
}

export interface RealtimeBroadcaster {
  broadcastToUser(
    userId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void>;
  broadcastToTable(
    table: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void>;
}
