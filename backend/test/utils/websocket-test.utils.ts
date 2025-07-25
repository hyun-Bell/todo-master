import { EventEmitter } from 'events';

import { JwtService } from '@nestjs/jwt';
import { type Socket } from 'socket.io';

/**
 * Mock Socket 생성 헬퍼
 */
export class MockSocket extends EventEmitter {
  id: string;
  connected = true;
  disconnected = false;
  handshake: {
    auth: Record<string, any>;
    headers: Record<string, string>;
    address: string;
    query: Record<string, string>;
  };
  rooms: Set<string> = new Set();

  constructor(id = 'mock-socket-id', auth?: Record<string, any>) {
    super();
    this.id = id;
    this.handshake = {
      auth: auth || {},
      headers: {},
      address: '127.0.0.1',
      query: {},
    };
  }

  join(room: string): void {
    this.rooms.add(room);
  }

  leave(room: string): void {
    this.rooms.delete(room);
  }

  override emit(event: string, ...args: unknown[]): boolean {
    try {
      return super.emit(event, ...args);
    } catch (error) {
      // 에러 이벤트의 경우 정상적인 흐름이므로 에러를 throw하지 않음
      if (event === 'error') {
        // error 이벤트는 리스너가 없어도 정상적으로 처리
        return this.listenerCount(event) > 0;
      }
      // 다른 이벤트의 경우는 에러를 다시 throw
      throw error;
    }
  }

  disconnect(_close?: boolean): Socket {
    this.connected = false;
    this.disconnected = true;
    this.emit('disconnect', 'server namespace disconnect');
    return this as unknown as Socket;
  }

  to(room: string): any {
    return {
      emit: (event: string, data: any) => {
        this.emit(`room:${room}:${event}`, data);
      },
    };
  }

  onAny(_listener: (...args: any[]) => void): Socket {
    return this as unknown as Socket;
  }

  offAny(_listener?: (...args: any[]) => void): Socket {
    return this as unknown as Socket;
  }
}

/**
 * JWT 토큰 생성 헬퍼
 */
export class JwtTestHelper {
  private readonly jwtService: JwtService;

  constructor(secret = 'test-secret') {
    this.jwtService = new JwtService({
      secret,
      signOptions: { expiresIn: '1h' },
    });
  }

  generateToken(userId: string, email = 'test@example.com'): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      iat: Math.floor(Date.now() / 1000),
    });
  }

  generateExpiredToken(userId: string): string {
    return this.jwtService.sign(
      {
        sub: userId,
        email: 'test@example.com',
      },
      { expiresIn: '-1s' },
    );
  }

  generateInvalidToken(): string {
    return 'invalid.jwt.token';
  }
}

/**
 * Redis Mock 설정
 */
export class MockRedisClient {
  private readonly store: Map<string, any> = new Map();
  private readonly sets: Map<string, Set<string>> = new Map();
  private readonly hashes: Map<string, Map<string, string>> = new Map();

  async sadd(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    let added = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        added++;
      }
    }
    return await Promise.resolve(added);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    if (!this.sets.has(key)) {
      return await Promise.resolve(0);
    }
    const set = this.sets.get(key)!;
    let removed = 0;
    for (const member of members) {
      if (set.delete(member)) {
        removed++;
      }
    }
    return await Promise.resolve(removed);
  }

  async smembers(key: string): Promise<string[]> {
    if (!this.sets.has(key)) {
      return await Promise.resolve([]);
    }
    return await Promise.resolve(Array.from(this.sets.get(key)!));
  }

  async hset(
    key: string,
    field: string | Record<string, string>,
  ): Promise<number> {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }
    const hash = this.hashes.get(key)!;

    if (typeof field === 'string') {
      throw new Error('Field value required');
    }

    let added = 0;
    for (const [k, v] of Object.entries(field)) {
      if (!hash.has(k)) {
        added++;
      }
      hash.set(k, v);
    }
    return await Promise.resolve(added);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.hashes.has(key)) {
      return await Promise.resolve(null);
    }
    return await Promise.resolve(this.hashes.get(key)!.get(field) || null);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    if (!this.hashes.has(key)) {
      return await Promise.resolve(0);
    }
    const hash = this.hashes.get(key)!;
    let deleted = 0;
    for (const field of fields) {
      if (hash.delete(field)) {
        deleted++;
      }
    }
    return await Promise.resolve(deleted);
  }

  async del(key: string): Promise<number> {
    const deleted =
      this.store.delete(key) ||
      this.sets.delete(key) ||
      this.hashes.delete(key);
    return await Promise.resolve(deleted ? 1 : 0);
  }

  async expire(_key: string, _seconds: number): Promise<number> {
    // Mock implementation - just return success
    return await Promise.resolve(1);
  }

  async keys(pattern: string): Promise<string[]> {
    const allKeys = [
      ...this.store.keys(),
      ...this.sets.keys(),
      ...this.hashes.keys(),
    ];

    // 패턴 매칭 구현
    const regexPattern = pattern
      .replace(/\*/g, '.*') // * -> .*
      .replace(/\?/g, '.'); // ? -> .

    const regex = new RegExp(`^${regexPattern}$`);
    return await Promise.resolve(allKeys.filter((key) => regex.test(key)));
  }

  clear(): void {
    this.store.clear();
    this.sets.clear();
    this.hashes.clear();
  }
}

/**
 * Supabase Mock 설정
 */
export class MockSupabaseClient {
  private readonly channels: Map<string, MockRealtimeChannel> = new Map();

  channel(name: string): MockRealtimeChannel {
    if (!this.channels.has(name)) {
      this.channels.set(name, new MockRealtimeChannel(name));
    }
    return this.channels.get(name)!;
  }

  from(_table: string): any {
    return {
      select: (_columns: string) => ({
        limit: (_n: number) =>
          Promise.resolve({
            data: [],
            error: null,
          }),
      }),
    };
  }

  removeAllChannels(): void {
    this.channels.clear();
  }
}

export class MockRealtimeChannel {
  private readonly listeners: Map<string, Array<(...args: any[]) => void>> =
    new Map();
  private status = 'CLOSED';
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  on(event: string, _config: any, callback: (...args: any[]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    return this;
  }

  subscribe(callback?: (status: string) => void): this {
    this.status = 'SUBSCRIBED';
    if (callback) {
      callback('SUBSCRIBED');
    }
    return this;
  }

  unsubscribe(): this {
    this.status = 'CLOSED';
    this.listeners.clear();
    return this;
  }

  trigger(event: string, payload: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach((listener) => listener(payload));
  }

  getStatus(): string {
    return this.status;
  }
}

/**
 * WebSocket Server Mock
 */
export class MockWebSocketServer {
  private readonly sockets: Map<string, MockSocket> = new Map();

  to(room: string): any {
    return {
      emit: (event: string, data: any) => {
        this.sockets.forEach((socket) => {
          if (socket.rooms.has(room)) {
            socket.emit(event, data);
          }
        });
      },
    };
  }

  emit(event: string, data: any): void {
    this.sockets.forEach((socket) => {
      socket.emit(event, data);
    });
  }

  addSocket(socket: MockSocket): void {
    this.sockets.set(socket.id, socket);
  }

  removeSocket(socketId: string): void {
    this.sockets.delete(socketId);
  }

  getSocket(socketId: string): MockSocket | undefined {
    return this.sockets.get(socketId);
  }
}

/**
 * 테스트 데이터 생성 헬퍼
 */
export const TestDataFactory = {
  createUser(id = 'test-user-id') {
    return {
      id,
      email: `user-${id}@test.com`,
      name: `Test User ${id}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  },

  createGoal(userId: string, id = 'test-goal-id') {
    return {
      id,
      user_id: userId,
      title: `Test Goal ${id}`,
      description: 'Test goal description',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };
  },

  createPlan(goalId: string, userId: string, id = 'test-plan-id') {
    return {
      id,
      goal_id: goalId,
      user_id: userId,
      title: `Test Plan ${id}`,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
  },

  createRealtimePayload(
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    record: any,
  ) {
    return {
      eventType,
      table,
      new: eventType !== 'DELETE' ? record : null,
      old: eventType === 'UPDATE' || eventType === 'DELETE' ? record : null,
      schema: 'public',
      commitTimestamp: new Date().toISOString(),
    };
  },
};

/**
 * 테스트 환경 설정 헬퍼
 */
export function setupTestEnvironment() {
  process.env.JWT_SECRET = 'test-secret';
  process.env.SUPABASE_URL = 'http://localhost:54321';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  process.env.UPSTASH_REDIS_URL = 'https://test-redis.upstash.io';
  process.env.UPSTASH_REDIS_TOKEN = 'test-token';
}

/**
 * 비동기 이벤트 대기 헬퍼
 */
export function waitForSocketEvent(
  socket: MockSocket,
  event: string,
  timeout = 1000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * 메모리 사용량 측정 헬퍼
 */
export function measureMemoryUsage(): NodeJS.MemoryUsage {
  if (global.gc) {
    global.gc();
  }
  return process.memoryUsage();
}

/**
 * 테스트 후 정리 헬퍼
 */
export function cleanupTestEnvironment() {
  // 환경 변수 정리
  delete process.env.JWT_SECRET;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_ANON_KEY;
  delete process.env.UPSTASH_REDIS_URL;
  delete process.env.UPSTASH_REDIS_TOKEN;
}
