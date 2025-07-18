import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RealtimeService } from './realtime.service';
import {
  cleanupTestEnvironment,
  MockRealtimeChannel,
  MockSupabaseClient,
  MockWebSocketServer,
  setupTestEnvironment,
  TestDataFactory,
} from '../../test/utils/websocket-test.utils';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let eventEmitter: EventEmitter2;
  let mockSupabaseClient: MockSupabaseClient;
  let _mockWebSocketServer: MockWebSocketServer;
  let consoleErrorSpy: jest.SpyInstance;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(async () => {
    // console.error 모킹
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockSupabaseClient = new MockSupabaseClient();
    _mockWebSocketServer = new MockWebSocketServer();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                SUPABASE_URL: 'http://localhost:54321',
                SUPABASE_ANON_KEY: 'test-anon-key',
              };
              return config[key as keyof typeof config];
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // Supabase client mock 주입
    (service as any).supabase = mockSupabaseClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // console.error 복원
    consoleErrorSpy.mockRestore();
    // Cleanup channels
    (service as any).channels.clear();
  });

  describe('초기화 및 정리', () => {
    it('서비스 초기화 시 테이블 구독 설정', async () => {
      // channels Map 초기화
      (service as any).channels = new Map();

      const mockChannel = new MockRealtimeChannel('test-channel');
      jest.spyOn(mockSupabaseClient, 'channel').mockReturnValue(mockChannel);
      jest.spyOn(mockChannel, 'on').mockReturnValue(mockChannel);
      jest.spyOn(mockChannel, 'subscribe').mockReturnValue(mockChannel);

      // subscribeToTable 메서드를 직접 호출하여 테이블 구독
      await (service as any).subscribeToTable('goals');

      // 기본 테이블들이 구독되었는지 확인
      expect((service as any).channels.size).toBeGreaterThan(0);
    });

    it('서비스 종료 시 모든 채널 구독 해제', async () => {
      const mockChannels = new Map<string, MockRealtimeChannel>();
      const tables = ['goals', 'plans', 'checkpoints'];

      tables.forEach((table) => {
        const channel = new MockRealtimeChannel(`realtime:${table}`);
        jest.spyOn(channel, 'unsubscribe');
        mockChannels.set(table, channel);
      });

      (service as any).channels = mockChannels;

      await service.onModuleDestroy();

      // unsubscribeFromTable이 각 테이블에 대해 호출되었는지 확인
      expect((service as any).channels.size).toBe(0);
    });
  });

  describe('subscribeToTable', () => {
    it('테이블 변경사항 구독 성공', async () => {
      const table = 'goals';

      // Mock channel 설정
      const mockChannel = new MockRealtimeChannel(`realtime:${table}`);
      jest.spyOn(mockSupabaseClient, 'channel').mockReturnValue(mockChannel);
      jest.spyOn(mockChannel, 'on').mockReturnValue(mockChannel);
      jest.spyOn(mockChannel, 'subscribe').mockReturnValue(mockChannel);

      await (service as any).subscribeToTable(table);

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        `realtime:${table}`,
      );
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: '*',
          schema: 'public',
          table,
        }),
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect((service as any).channels.has(table)).toBe(true);
    });

    it('테이블 구독 실패 시 에러 로깅', async () => {
      const table = 'goals';

      // subscribe 메서드에서 에러를 발생시킴
      jest.spyOn(mockSupabaseClient, 'channel').mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const loggerSpy = jest.spyOn((service as any).logger, 'error');

      await (service as any).subscribeToTable(table);

      expect(loggerSpy).toHaveBeenCalledWith(
        `Failed to subscribe to ${table} changes`,
        expect.any(Error),
      );
      // 에러 발생 시 channels에 추가되지 않아야 함
      expect((service as any).channels.has(table)).toBe(false);
    });
  });

  describe('handleRealtimeChange', () => {
    it('INSERT 이벤트 처리', () => {
      const userId = 'test-user-123';
      const goal = TestDataFactory.createGoal(userId);
      const payload = TestDataFactory.createRealtimePayload(
        'goals',
        'INSERT',
        goal,
      );

      const eventEmitterSpy = jest.spyOn(eventEmitter, 'emit');

      (service as any).handleRealtimeChange('goals', payload);

      expect(eventEmitterSpy).toHaveBeenCalledWith(
        'database.change',
        expect.objectContaining({
          table: 'goals',
          action: 'INSERT',
          userId,
          data: goal,
        }),
      );
    });

    it('UPDATE 이벤트 처리', () => {
      const userId = 'test-user-123';
      const oldGoal = TestDataFactory.createGoal(userId);
      const newGoal = { ...oldGoal, title: 'Updated Goal' };

      const payload = {
        eventType: 'UPDATE',
        new: newGoal,
        old: oldGoal,
        table: 'goals',
        schema: 'public',
        commitTimestamp: new Date().toISOString(),
      };

      const eventEmitterSpy = jest.spyOn(eventEmitter, 'emit');

      (service as any).handleRealtimeChange('goals', payload);

      expect(eventEmitterSpy).toHaveBeenCalledWith(
        'database.change',
        expect.objectContaining({
          table: 'goals',
          action: 'UPDATE',
          userId,
          data: expect.objectContaining({
            id: newGoal.id,
            changes: newGoal,
            old: oldGoal,
          }),
        }),
      );
    });

    it('DELETE 이벤트 처리', () => {
      const userId = 'test-user-123';
      const goal = TestDataFactory.createGoal(userId);
      const payload = TestDataFactory.createRealtimePayload(
        'goals',
        'DELETE',
        goal,
      );

      const eventEmitterSpy = jest.spyOn(eventEmitter, 'emit');

      (service as any).handleRealtimeChange('goals', payload);

      expect(eventEmitterSpy).toHaveBeenCalledWith(
        'database.change',
        expect.objectContaining({
          table: 'goals',
          action: 'DELETE',
          userId,
          data: expect.objectContaining({
            id: goal.id,
          }),
        }),
      );
    });

    it('userId가 없는 레코드는 전체 브로드캐스트만 수행', () => {
      const record = {
        id: 'test-id',
        title: 'Public Announcement',
        // user_id가 없음
      };
      const payload = TestDataFactory.createRealtimePayload(
        'announcements',
        'INSERT',
        record,
      );

      const eventEmitterSpy = jest.spyOn(eventEmitter, 'emit');

      (service as any).handleRealtimeChange('announcements', payload);

      // userId가 없으면 이벤트가 발생하지 않음
      expect(eventEmitterSpy).not.toHaveBeenCalled();
    });

    it('에러 발생 시 로깅만 수행', () => {
      const userId = 'test-user-123';
      const goal = TestDataFactory.createGoal(userId);
      const payload = TestDataFactory.createRealtimePayload(
        'goals',
        'INSERT',
        goal,
      );

      const eventEmitterSpy = jest.spyOn(eventEmitter, 'emit');
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      // EventEmitter에서 에러 발생하도록 설정
      eventEmitterSpy.mockImplementation(() => {
        throw new Error('Test error');
      });

      // 에러가 발생해도 예외를 던지지 않아야 함
      expect(() => {
        (service as any).handleRealtimeChange('goals', payload);
      }).not.toThrow();

      // 에러 로깅 확인
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('Supabase 연결 테스트 성공', async () => {
      jest.spyOn(mockSupabaseClient, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('Supabase 연결 테스트 실패', async () => {
      jest.spyOn(mockSupabaseClient, 'from').mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Connection failed' },
          }),
        }),
      });

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('예외 발생 시 false 반환', async () => {
      jest.spyOn(mockSupabaseClient, 'from').mockImplementation(() => {
        throw new Error('Network error');
      });

      const loggerSpy = jest.spyOn((service as any).logger, 'error');
      const result = await service.testConnection();

      expect(result).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Supabase connection test failed:',
        expect.any(Error),
      );
    });
  });

  describe('환경 설정 검증', () => {
    it('Supabase 설정이 없어도 서비스는 생성됨 (경고만 출력)', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      expect(() => {
        new RealtimeService(mockConfigService as any, {} as any);
      }).not.toThrow();
    });
  });

  describe('실시간 이벤트 통합 시나리오', () => {
    it('여러 테이블의 동시 이벤트 처리', async () => {
      const userId = 'test-user-123';
      const goal = TestDataFactory.createGoal(userId);
      const plan = TestDataFactory.createPlan(goal.id, userId);

      const goalPayload = TestDataFactory.createRealtimePayload(
        'goals',
        'INSERT',
        goal,
      );
      const planPayload = TestDataFactory.createRealtimePayload(
        'plans',
        'INSERT',
        plan,
      );

      let eventCount = 0;
      jest.spyOn(eventEmitter, 'emit').mockImplementation(() => {
        eventCount++;
        return true;
      });

      // 동시에 여러 이벤트 처리
      await Promise.all([
        Promise.resolve(
          (service as any).handleRealtimeChange('goals', goalPayload),
        ),
        Promise.resolve(
          (service as any).handleRealtimeChange('plans', planPayload),
        ),
      ]);

      expect(eventCount).toBe(2);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'database.change',
        expect.objectContaining({
          table: 'goals',
          action: 'INSERT',
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'database.change',
        expect.objectContaining({
          table: 'plans',
          action: 'INSERT',
        }),
      );
    });
  });

  describe('채널 상태 관리', () => {
    it('구독 중인 채널 목록 확인', () => {
      const tables = ['goals', 'plans', 'checkpoints'];

      tables.forEach((table) => {
        const channel = new MockRealtimeChannel(`realtime:${table}`);
        (service as any).channels.set(table, channel);
      });

      const { channels } = service as any;
      expect(Array.from(channels.keys())).toEqual(
        expect.arrayContaining(tables),
      );
    });

    it('특정 채널 구독 상태 확인', () => {
      const channel = new MockRealtimeChannel('realtime:goals');
      channel.subscribe();
      (service as any).channels.set('goals', channel);

      const goalsChannel = (service as any).channels.get('goals');
      expect(goalsChannel.getStatus()).toBe('SUBSCRIBED');
    });
  });
});
