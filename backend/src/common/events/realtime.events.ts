export enum RealtimeEventType {
  // Database change events
  DATABASE_INSERT = 'database.insert',
  DATABASE_UPDATE = 'database.update',
  DATABASE_DELETE = 'database.delete',

  // WebSocket events
  WEBSOCKET_USER_CONNECTED = 'websocket.user.connected',
  WEBSOCKET_USER_DISCONNECTED = 'websocket.user.disconnected',
  WEBSOCKET_TABLE_SUBSCRIBED = 'websocket.table.subscribed',
  WEBSOCKET_TABLE_UNSUBSCRIBED = 'websocket.table.unsubscribed',
}

export interface DatabaseChangeEvent {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  userId: string;
  record: Record<string, unknown>;
  oldRecord?: Record<string, unknown>;
  timestamp: string;
}

export interface WebSocketConnectionEvent {
  userId: string;
  socketId: string;
  timestamp: string;
}

export interface WebSocketSubscriptionEvent {
  userId: string;
  socketId: string;
  tables: string[];
  timestamp: string;
}
