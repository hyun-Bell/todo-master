export enum RealtimeEventType {
  DATABASE_CHANGE = 'database.change',
  USER_CONNECTED = 'user.connected',
  USER_DISCONNECTED = 'user.disconnected',
}

export interface DatabaseChangeData {
  id: string;
  [key: string]: unknown;
}

export class DatabaseChangeEvent {
  constructor(
    public readonly table: string,
    public readonly action: 'INSERT' | 'UPDATE' | 'DELETE',
    public readonly userId: string,
    public readonly data: DatabaseChangeData,
  ) {}
}

export class UserConnectionEvent {
  constructor(
    public readonly userId: string,
    public readonly socketId: string,
    public readonly connectedAt: Date,
  ) {}
}

export class UserDisconnectionEvent {
  constructor(
    public readonly userId: string,
    public readonly socketId: string,
    public readonly disconnectedAt: Date,
  ) {}
}
