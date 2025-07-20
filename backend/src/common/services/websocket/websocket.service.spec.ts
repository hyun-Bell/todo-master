import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type Socket } from 'socket.io';
import { WebsocketService } from './websocket.service';
import {
  cleanupTestEnvironment,
  JwtTestHelper,
  MockRedisClient,
  MockSocket,
  setupTestEnvironment,
} from '../../../../test/utils/websocket-test.utils';

describe('WebsocketService', () => {
  let service: WebsocketService;
  let jwtService: JwtService;
  let mockRedis: MockRedisClient;
  let jwtHelper: JwtTestHelper;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(async () => {
    mockRedis = new MockRedisClient();
    jwtHelper = new JwtTestHelper('test-secret');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                UPSTASH_REDIS_URL: 'https://test-redis.upstash.io',
                UPSTASH_REDIS_TOKEN: 'test-token',
              };
              return config[key as keyof typeof config];
            }),
          },
        },
        {
          provide: JwtService,
          useValue: new JwtService({
            secret: 'test-secret',
            signOptions: { expiresIn: '1h' },
          }),
        },
      ],
    }).compile();

    service = module.get<WebsocketService>(WebsocketService);
    jwtService = module.get<JwtService>(JwtService);

    // Redis mock 주입

    (service as any).redis = mockRedis;
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockRedis.clear();
  });

  describe('getUserIdFromSocket', () => {
    it('유효한 JWT 토큰에서 userId 추출', () => {
      const userId = 'test-user-123';
      const token = jwtHelper.generateToken(userId);
      const mockSocket = new MockSocket('socket-1', { token });

      const result = service.getUserIdFromSocket(mockSocket as Socket);

      expect(result).toBe(userId);
    });

    it('Authorization 헤더에서 토큰 추출', () => {
      const userId = 'test-user-456';
      const token = jwtHelper.generateToken(userId);
      const mockSocket = new MockSocket('socket-2');
      mockSocket.handshake.headers.authorization = `Bearer ${token}`;

      const result = service.getUserIdFromSocket(mockSocket as Socket);

      expect(result).toBe(userId);
    });

    it('토큰이 없을 때 null 반환', () => {
      const mockSocket = new MockSocket('socket-3');

      const result = service.getUserIdFromSocket(mockSocket as Socket);

      expect(result).toBeNull();
    });

    it('만료된 토큰일 때 null 반환', () => {
      const userId = 'test-user-789';
      const expiredToken = jwtHelper.generateExpiredToken(userId);
      const mockSocket = new MockSocket('socket-4', { token: expiredToken });

      const result = service.getUserIdFromSocket(mockSocket as Socket);

      expect(result).toBeNull();
    });

    it('잘못된 토큰일 때 null 반환', () => {
      const invalidToken = jwtHelper.generateInvalidToken();
      const mockSocket = new MockSocket('socket-5', { token: invalidToken });

      const result = service.getUserIdFromSocket(mockSocket as Socket);

      expect(result).toBeNull();
    });
  });

  describe('handleConnection', () => {
    it('새 연결 시 Redis에 세션 저장', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-6', {
        token: jwtHelper.generateToken(userId),
      });

      jest.spyOn(service, 'getUserIdFromSocket').mockReturnValue(userId);

      await service.handleConnection(mockSocket as Socket);

      const socketsKey = `ws:user:${userId}:sockets`;
      const sessionKey = `ws:session:${userId}`;

      const sockets = await mockRedis.smembers(socketsKey);
      expect(sockets).toContain('socket-6');

      const sessionData = await mockRedis.hget(sessionKey, 'socket-6');
      expect(sessionData).toBeTruthy();

      const session = JSON.parse(sessionData!);
      expect(session).toHaveProperty('connectedAt');
      expect(session).toHaveProperty('lastActivity');
    });

    it('Redis가 없을 때도 에러 없이 처리', async () => {
      const _userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-7');

      // Redis를 null로 설정

      (service as any).redis = null;

      await expect(
        service.handleConnection(mockSocket as Socket),
      ).resolves.not.toThrow();
    });
  });

  describe('handleDisconnect', () => {
    it('연결 해제 시 Redis에서 세션 정리', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-8', {
        token: jwtHelper.generateToken(userId),
      });

      // 먼저 연결 생성
      await service.handleConnection(mockSocket as Socket);

      // 구독 추가
      const subscriptionsKey = `ws:socket:${mockSocket.id}:subscriptions`;
      await mockRedis.sadd(subscriptionsKey, 'goals', 'plans');

      // 연결 해제
      await service.handleDisconnect(mockSocket as Socket);

      const socketsKey = `ws:user:${userId}:sockets`;
      const sessionKey = `ws:session:${userId}`;

      const sockets = await mockRedis.smembers(socketsKey);
      expect(sockets).not.toContain('socket-8');

      const sessionData = await mockRedis.hget(sessionKey, 'socket-8');
      expect(sessionData).toBeNull();

      const subscriptions = await mockRedis.smembers(subscriptionsKey);
      expect(subscriptions).toHaveLength(0);
    });

    it('userId를 추출할 수 없을 때도 정상 처리', async () => {
      const mockSocket = new MockSocket('socket-9');

      await expect(
        service.handleDisconnect(mockSocket as any),
      ).resolves.not.toThrow();
    });
  });

  describe('subscribeToTables', () => {
    it('테이블 구독 시 소켓을 올바른 room에 추가', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-10');
      const tables = ['goals', 'plans', 'checkpoints'];

      jest.spyOn(mockSocket, 'join');

      jest.spyOn(service, 'getUserIdFromSocket').mockReturnValue(userId);

      await service.subscribeToTables(mockSocket as any, userId, tables);

      expect(mockSocket.join).toHaveBeenCalledWith('table:goals');
      expect(mockSocket.join).toHaveBeenCalledWith('table:plans');
      expect(mockSocket.join).toHaveBeenCalledWith('table:checkpoints');
      expect(mockSocket.join).toHaveBeenCalledWith(
        `user:${userId}:table:goals`,
      );
      expect(mockSocket.join).toHaveBeenCalledWith(
        `user:${userId}:table:plans`,
      );
      expect(mockSocket.join).toHaveBeenCalledWith(
        `user:${userId}:table:checkpoints`,
      );

      const subscriptionsKey = `ws:socket:${mockSocket.id}:subscriptions`;
      const subscriptions = await mockRedis.smembers(subscriptionsKey);
      expect(subscriptions).toEqual(expect.arrayContaining(tables));
    });

    it('빈 테이블 배열로 구독 시도', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-11');

      jest.spyOn(mockSocket, 'join');

      await service.subscribeToTables(mockSocket as any, userId, []);

      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribeFromTables', () => {
    it('테이블 구독 해제 시 room에서 제거', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-12', {
        token: jwtHelper.generateToken(userId),
      });
      const tables = ['goals', 'plans'];

      // 먼저 구독
      await service.subscribeToTables(mockSocket as any, userId, tables);

      jest.spyOn(mockSocket, 'leave');

      // 구독 해제
      await service.unsubscribeFromTables(mockSocket as any, tables);

      expect(mockSocket.leave).toHaveBeenCalledWith('table:goals');
      expect(mockSocket.leave).toHaveBeenCalledWith('table:plans');
      expect(mockSocket.leave).toHaveBeenCalledWith(
        `user:${userId}:table:goals`,
      );
      expect(mockSocket.leave).toHaveBeenCalledWith(
        `user:${userId}:table:plans`,
      );

      const subscriptionsKey = `ws:socket:${mockSocket.id}:subscriptions`;
      const subscriptions = await mockRedis.smembers(subscriptionsKey);
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('getUserSockets', () => {
    it('특정 사용자의 모든 소켓 ID 반환', async () => {
      const userId = 'test-user-123';

      // 여러 소켓 연결
      for (let i = 1; i <= 3; i++) {
        const mockSocket = new MockSocket(`socket-user-${i}`, {
          token: jwtHelper.generateToken(userId),
        });
        jest.spyOn(service, 'getUserIdFromSocket').mockReturnValueOnce(userId);
        await service.handleConnection(mockSocket as Socket);
      }

      const sockets = await service.getUserSockets(userId);

      expect(sockets).toHaveLength(3);
      expect(sockets).toEqual(
        expect.arrayContaining([
          'socket-user-1',
          'socket-user-2',
          'socket-user-3',
        ]),
      );
    });

    it('연결이 없는 사용자는 빈 배열 반환', async () => {
      const sockets = await service.getUserSockets('non-existent-user');

      expect(sockets).toEqual([]);
    });

    it('Redis가 없을 때 빈 배열 반환', async () => {
      (service as any).redis = null;

      const sockets = await service.getUserSockets('test-user');

      expect(sockets).toEqual([]);
    });
  });

  describe('updateLastActivity', () => {
    it('마지막 활동 시간 업데이트', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-13', {
        token: jwtHelper.generateToken(userId),
      });

      // 연결 생성
      await service.handleConnection(mockSocket as Socket);

      // 시간 경과 시뮬레이션
      const originalSession = await mockRedis.hget(
        `ws:session:${userId}`,
        mockSocket.id,
      );
      const originalData = JSON.parse(originalSession!);

      // 100ms 대기
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 활동 시간 업데이트
      await service.updateLastActivity(mockSocket as any);

      const updatedSession = await mockRedis.hget(
        `ws:session:${userId}`,
        mockSocket.id,
      );
      const updatedData = JSON.parse(updatedSession!);

      expect(new Date(updatedData.lastActivity).getTime()).toBeGreaterThan(
        new Date(originalData.lastActivity).getTime(),
      );
    });
  });

  describe('getActiveUserCount', () => {
    it('활성 사용자 수 반환', async () => {
      // 3명의 사용자 연결
      for (let i = 1; i <= 3; i++) {
        const userId = `user-${i}`;
        const mockSocket = new MockSocket(`socket-${i}`, {
          token: jwtHelper.generateToken(userId),
        });
        jest.spyOn(service, 'getUserIdFromSocket').mockReturnValueOnce(userId);
        await service.handleConnection(mockSocket as Socket);
      }

      const count = await service.getActiveUserCount();

      expect(count).toBe(3);
    });

    it('Redis가 없을 때 0 반환', async () => {
      (service as any).redis = null;

      const count = await service.getActiveUserCount();

      expect(count).toBe(0);
    });
  });

  describe('getSocketSubscriptions', () => {
    it('소켓의 구독 목록 반환', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-14');
      const tables = ['goals', 'plans', 'checkpoints'];

      await service.subscribeToTables(mockSocket as any, userId, tables);

      const subscriptions = await service.getSocketSubscriptions(mockSocket.id);

      expect(subscriptions).toEqual(expect.arrayContaining(tables));
      expect(subscriptions).toHaveLength(3);
    });

    it('구독이 없는 소켓은 빈 배열 반환', async () => {
      const subscriptions = await service.getSocketSubscriptions(
        'non-existent-socket',
      );

      expect(subscriptions).toEqual([]);
    });
  });

  describe('Redis 환경 설정', () => {
    it('Redis 설정이 없을 때 경고 로그', async () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebsocketService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: JwtService,
            useValue: jwtService,
          },
        ],
      }).compile();

      const serviceWithoutRedis =
        module.get<WebsocketService>(WebsocketService);

      expect((serviceWithoutRedis as any).redis).toBeUndefined();
    });
  });

  describe('세션 TTL 관리', () => {
    it('세션 TTL이 올바르게 설정되는지 확인', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-ttl-test', {
        token: jwtHelper.generateToken(userId),
      });

      jest.spyOn(service, 'getUserIdFromSocket').mockReturnValue(userId);

      // expire 메서드 스파이
      const expireSpy = jest.spyOn(mockRedis, 'expire');

      await service.handleConnection(mockSocket as Socket);

      const socketsKey = `ws:user:${userId}:sockets`;
      const sessionKey = `ws:session:${userId}`;

      expect(expireSpy).toHaveBeenCalledWith(socketsKey, 86400); // 24시간
      expect(expireSpy).toHaveBeenCalledWith(sessionKey, 86400);
    });
  });
});
