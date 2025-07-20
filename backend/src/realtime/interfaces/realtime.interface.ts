/**
 * 실시간 통신 통합 인터페이스
 * WebSocket과 Supabase Realtime을 추상화하여 일관된 인터페이스 제공
 */

export enum RealtimeProvider {
  WEBSOCKET = 'websocket',
  SUPABASE = 'supabase',
}

export interface RealtimeConfig {
  provider: RealtimeProvider;
  fallbackProvider?: RealtimeProvider;
  enableFallback: boolean;
}

export interface RealtimeConnection {
  userId: string;
  connectionId: string;
  provider: RealtimeProvider;
  connectedAt: Date;
  lastActivity?: Date;
}

export interface RealtimeSubscription {
  userId: string;
  tables: string[];
  provider: RealtimeProvider;
}

export interface RealtimeEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  table?: string;
  data: Record<string, unknown>;
  userId?: string;
  timestamp: Date;
  provider: RealtimeProvider;
}

export interface IRealtimeService {
  // Connection management
  connect(userId: string, connectionId: string): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  getActiveConnections(userId: string): Promise<RealtimeConnection[]>;

  // Subscription management
  subscribe(userId: string, tables: string[]): Promise<void>;
  unsubscribe(userId: string, tables: string[]): Promise<void>;
  getSubscriptions(userId: string): Promise<RealtimeSubscription>;

  // Broadcasting
  broadcast(event: RealtimeEvent): Promise<void>;
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

  // Provider management
  getActiveProvider(): RealtimeProvider;
  switchProvider(provider: RealtimeProvider): Promise<void>;
  isHealthy(): Promise<boolean>;
}

export interface IRealtimeAdapter {
  connect(userId: string, connectionId: string): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  subscribe(userId: string, tables: string[]): Promise<void>;
  unsubscribe(userId: string, tables: string[]): Promise<void>;
  broadcast(event: RealtimeEvent): Promise<void>;
  isHealthy(): Promise<boolean>;
}
