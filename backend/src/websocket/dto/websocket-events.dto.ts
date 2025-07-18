export enum WebSocketEvents {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  RECONNECT = 'reconnect',
  RECONNECT_REQUIRED = 'reconnect_required',
  PING = 'ping',
  PONG = 'pong',
}

export enum RealtimeEvents {
  GOALS_CREATED = 'goals:created',
  GOALS_UPDATED = 'goals:updated',
  GOALS_DELETED = 'goals:deleted',
  PLANS_CREATED = 'plans:created',
  PLANS_UPDATED = 'plans:updated',
  PLANS_DELETED = 'plans:deleted',
  CHECKPOINTS_CREATED = 'checkpoints:created',
  CHECKPOINTS_UPDATED = 'checkpoints:updated',
  CHECKPOINTS_DELETED = 'checkpoints:deleted',
}

export interface WebSocketResponse<T = any> {
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
}

export interface RealtimeChangePayload {
  table: string;
  event: 'created' | 'updated' | 'deleted';
  record: any;
  oldRecord?: any;
  timestamp: string;
}

export interface SubscribePayload {
  tables: string[];
}

export interface ConnectedPayload {
  message: string;
  socketId: string;
  userId: string;
}
