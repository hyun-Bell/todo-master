import { Test, type TestingModule } from '@nestjs/testing';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { BroadcastService } from './broadcast.service';
import {
  JwtTestHelper,
  MockSocket,
  MockWebSocketServer,
  waitForSocketEvent,
} from '../../test/utils/websocket-test.utils';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;
  let websocketService: WebsocketService;
  let mockServer: MockWebSocketServer;
  let jwtHelper: JwtTestHelper;

  beforeEach(async () => {
    mockServer = new MockWebSocketServer();
    jwtHelper = new JwtTestHelper();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        {
          provide: WebsocketService,
          useValue: {
            getUserIdFromSocket: jest.fn(),
            handleConnection: jest.fn(),
            handleDisconnect: jest.fn(),
            subscribeToTables: jest.fn(),
            unsubscribeFromTables: jest.fn(),
            getUserSockets: jest.fn(),
            updateLastActivity: jest.fn(),
            getUserIdBySocket: jest.fn().mockReturnValue(null),
          },
        },
        {
          provide: BroadcastService,
          useValue: {
            setServer: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
    websocketService = module.get<WebsocketService>(WebsocketService);

    // Mock server 설정
    gateway.server = mockServer as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('유효한 JWT 토큰으로 연결 성공', async () => {
      const userId = 'test-user-123';
      const token = jwtHelper.generateToken(userId);
      const mockSocket = new MockSocket('socket-1', { token });

      jest
        .spyOn(websocketService, 'getUserIdBySocket')
        .mockReturnValueOnce(userId as any);
      jest
        .spyOn(websocketService, 'handleConnection')
        .mockReturnValueOnce(userId as any);

      const connectedPromise = waitForSocketEvent(mockSocket, 'connected');

      await gateway.handleConnection(mockSocket as any);

      const connectedData = await connectedPromise;

      expect(websocketService.handleConnection).toHaveBeenCalledWith(
        mockSocket,
      );
      expect(connectedData).toEqual({
        userId,
        connectedAt: expect.any(String),
      });
    });

    it('인증되지 않은 연결 시도 시 연결 거부', async () => {
      const mockSocket = new MockSocket('socket-2');

      jest.spyOn(websocketService, 'handleConnection').mockResolvedValue(null);
      jest.spyOn(mockSocket, 'disconnect');

      // error 이벤트 리스너 추가
      const errorPromise = new Promise((resolve) => {
        mockSocket.on('error', (data) => {
          resolve(data);
        });
      });

      await gateway.handleConnection(mockSocket as any);

      const errorData = await errorPromise;
      expect(errorData).toEqual({ message: '인증이 필요합니다.' });
      expect(websocketService.handleConnection).toHaveBeenCalledWith(
        mockSocket,
      );
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('만료된 토큰으로 연결 시도 시 거부', async () => {
      const userId = 'test-user-123';
      const expiredToken = jwtHelper.generateExpiredToken(userId);
      const mockSocket = new MockSocket('socket-3', { token: expiredToken });

      jest.spyOn(websocketService, 'handleConnection').mockResolvedValue(null);
      jest.spyOn(mockSocket, 'disconnect');

      // error 이벤트 리스너 추가
      const errorPromise = new Promise((resolve) => {
        mockSocket.on('error', (data) => {
          resolve(data);
        });
      });

      await gateway.handleConnection(mockSocket as any);

      const errorData = await errorPromise;
      expect(errorData).toEqual({ message: '인증이 필요합니다.' });
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('연결 시 에러 발생 처리', async () => {
      const mockSocket = new MockSocket('socket-4', { token: 'valid-token' });

      jest
        .spyOn(websocketService, 'handleConnection')
        .mockRejectedValue(new Error('Database error'));
      jest.spyOn(mockSocket, 'disconnect');

      const errorPromise = waitForSocketEvent(mockSocket, 'error');

      await gateway.handleConnection(mockSocket as any);

      const errorData = await errorPromise;

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(errorData).toEqual({ message: 'Authentication failed' });
    });

    it('ping 이벤트에 pong 응답', () => {
      const mockSocket = new MockSocket('socket-5');
      jest.spyOn(mockSocket, 'emit');

      const result = gateway.handlePing(mockSocket as any);

      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        timestamp: expect.any(String),
        latency: expect.any(Number),
      });
      expect(result).toEqual({ received: true });
    });
  });

  describe('handleDisconnect', () => {
    it('연결 해제 시 정리 작업 수행', async () => {
      const mockSocket = new MockSocket('socket-6');

      jest
        .spyOn(websocketService, 'handleDisconnect')
        .mockResolvedValue(undefined);

      await gateway.handleDisconnect(mockSocket as any);

      expect(websocketService.handleDisconnect).toHaveBeenCalledWith(
        mockSocket,
      );
    });
  });

  describe('handleSubscribe', () => {
    it('인증된 사용자의 테이블 구독 성공', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-7');
      const tables = ['goals', 'plans'];

      jest
        .spyOn(websocketService, 'getUserIdBySocket')
        .mockReturnValueOnce(userId as any);
      jest
        .spyOn(websocketService, 'subscribeToTables')
        .mockResolvedValue(undefined);

      const result = await gateway.handleSubscribe(mockSocket as any, {
        tables,
      });

      expect(websocketService.getUserIdBySocket).toHaveBeenCalledWith(
        mockSocket.id,
      );
      expect(websocketService.subscribeToTables).toHaveBeenCalledWith(
        mockSocket,
        userId,
        tables,
      );
      expect(result).toEqual({
        success: true,
        subscribedTables: tables,
        timestamp: expect.any(String),
      });
    });

    it('인증되지 않은 사용자의 구독 거부', async () => {
      const mockSocket = new MockSocket('socket-8');
      const tables = ['goals', 'plans'];

      jest
        .spyOn(websocketService, 'getUserIdBySocket')
        .mockReturnValueOnce(null as any);

      const result = await gateway.handleSubscribe(mockSocket as any, {
        tables,
      });

      expect(websocketService.subscribeToTables).not.toHaveBeenCalled();
      expect(result).toEqual({ error: 'Unauthorized' });
    });

    it('구독 중 에러 발생 처리', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-9');
      const tables = ['goals', 'plans'];

      jest
        .spyOn(websocketService, 'getUserIdBySocket')
        .mockReturnValueOnce(userId as any);
      jest
        .spyOn(websocketService, 'subscribeToTables')
        .mockRejectedValue(new Error('Subscription failed'));

      const result = await gateway.handleSubscribe(mockSocket as any, {
        tables,
      });

      expect(result).toEqual({
        error: new Error('Subscription failed').message,
      });
    });
  });

  describe('handleUnsubscribe', () => {
    it('테이블 구독 해제 성공', async () => {
      const mockSocket = new MockSocket('socket-10');
      const tables = ['goals', 'plans'];

      jest
        .spyOn(websocketService, 'unsubscribeFromTables')
        .mockResolvedValue(undefined);

      const result = await gateway.handleUnsubscribe(mockSocket as any, {
        tables,
      });

      expect(websocketService.unsubscribeFromTables).toHaveBeenCalledWith(
        mockSocket,
        tables,
      );
      expect(result).toEqual({
        success: true,
        unsubscribedTables: tables,
        remainingTables: [],
        timestamp: expect.any(String),
      });
    });

    it('구독 해제 중 에러 발생 처리', async () => {
      const mockSocket = new MockSocket('socket-11');
      const tables = ['goals', 'plans'];

      jest
        .spyOn(websocketService, 'unsubscribeFromTables')
        .mockRejectedValue(new Error('Unsubscribe failed'));

      const result = await gateway.handleUnsubscribe(mockSocket as any, {
        tables,
      });

      expect(result).toEqual({
        error: new Error('Unsubscribe failed').message,
      });
    });
  });

  describe('handleReconnect', () => {
    it('재연결 성공', () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-12');

      jest
        .spyOn(websocketService, 'getUserIdBySocket')
        .mockReturnValueOnce(userId as any);
      jest
        .spyOn(websocketService, 'handleConnection')
        .mockReturnValueOnce(userId as any);

      const result = gateway.handleReconnect(mockSocket as any, {});

      expect(result).toEqual({
        success: true,
        message: 'Reconnected successfully',
        attempt: 1,
      });
    });

    it('최대 재연결 시도 초과 시 연결 거부', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-13');

      jest
        .spyOn(websocketService, 'getUserIdBySocket')
        .mockReturnValueOnce(userId as any);
      jest.spyOn(mockSocket, 'disconnect');

      // 최대 시도 횟수만큼 재연결 시도
      for (let i = 0; i < 5; i++) {
        gateway.handleReconnect(mockSocket as any, {});
      }

      const errorPromise = waitForSocketEvent(mockSocket, 'error');
      const result = gateway.handleReconnect(mockSocket as any, {});

      const errorData = await errorPromise;

      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(errorData).toEqual({
        message: '재연결 시도 횟수를 초과했습니다.',
      });
      expect(result).toEqual({ error: 'Max reconnection attempts exceeded' });
    });
  });

  describe('메모리 관리', () => {
    it('연결 해제 시 reconnectAttempts Map 정리', async () => {
      const userId = 'test-user-123';
      const mockSocket = new MockSocket('socket-memory-test');

      jest
        .spyOn(websocketService, 'getUserIdBySocket')
        .mockReturnValueOnce(userId as any)
        .mockReturnValueOnce(userId as any)
        .mockReturnValueOnce(userId as any);

      // 재연결 시도 기록 생성
      gateway.handleReconnect(mockSocket as any, {});
      gateway.handleReconnect(mockSocket as any, {});

      // 연결 성공 시 기록 삭제되는지 확인
      jest
        .spyOn(websocketService, 'handleConnection')
        .mockReturnValueOnce(userId as any);
      await gateway.handleConnection(mockSocket as any);

      // 새로운 재연결 시도가 1부터 시작하는지 확인
      const result = gateway.handleReconnect(mockSocket as any, {});
      expect(result).toEqual({
        success: true,
        message: 'Reconnected successfully',
        attempt: 1,
      });
    });
  });
});
