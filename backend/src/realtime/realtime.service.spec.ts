import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, type TestingModule } from '@nestjs/testing';
import { createClient } from '@supabase/supabase-js';

import {
  DatabaseChangeEvent,
  RealtimeEventType,
} from '../common/events/realtime-events';

import { RealtimeService } from './realtime.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('RealtimeService', () => {
  let service: RealtimeService;
  let eventEmitter: EventEmitter2;
  let mockSupabaseClient: any;
  let mockChannel: any;

  beforeEach(async () => {
    // Mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Supabase client
    mockSupabaseClient = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeAllChannels: jest.fn().mockResolvedValue(undefined),
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                SUPABASE_URL: 'http://localhost:54321',
                SUPABASE_ANON_KEY: 'test-anon-key',
              };
              return config[key];
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

    // Initialize channels Map
    (service as any).channels = new Map();
  });

  afterEach(async () => {
    // 모든 채널 구독 해제
    if (service) {
      await service.onModuleDestroy();
    }

    // Mock 초기화
    jest.clearAllMocks();
  });

  describe('초기화 및 정리', () => {
    it('서비스 초기화 시 테이블 구독 설정', async () => {
      await service.onModuleInit();

      // Supabase client가 생성되었는지 확인
      expect(createClient).toHaveBeenCalledWith(
        'http://localhost:54321',
        'test-anon-key',
      );
    });

    it('서비스 종료 시 모든 채널 구독 해제', async () => {
      // 채널 추가
      (service as any).channels.set('test-channel', mockChannel);

      await service.onModuleDestroy();

      expect(mockSupabaseClient.removeAllChannels).toHaveBeenCalled();
      expect((service as any).channels.size).toBe(0);
    });
  });

  describe('subscribeToTable', () => {
    it('테이블 변경사항 구독 성공', async () => {
      await (service as any).subscribeToTable('goals');

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith('realtime:goals');
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'goals' },
        expect.any(Function),
      );
      expect(mockChannel.subscribe).toHaveBeenCalled();
      expect((service as any).channels.has('goals')).toBe(true);
    });

    it('테이블 구독 실패 시 에러 로깅', async () => {
      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      mockChannel.subscribe.mockImplementationOnce(() => {
        throw new Error('Subscribe failed');
      });

      await (service as any).subscribeToTable('goals');

      // Logger를 통해 에러가 로깅되었는지 확인
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to subscribe to goals changes',
        expect.any(Error),
      );
      loggerErrorSpy.mockRestore();
    });
  });

  describe('handleRealtimeChange', () => {
    const mockChange = (eventType: string, record: any) => ({
      eventType,
      new:
        eventType === 'INSERT' || eventType === 'UPDATE' ? record : undefined,
      old:
        eventType === 'DELETE' || eventType === 'UPDATE' ? record : undefined,
      table: 'goals',
    });

    it('INSERT 이벤트 처리', () => {
      const record = { id: '1', user_id: 'user1', title: 'Test Goal' };
      const change = mockChange('INSERT', record);

      (service as any).handleRealtimeChange('goals', change);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        RealtimeEventType.DATABASE_CHANGE,
        expect.any(DatabaseChangeEvent),
      );
      const call = (eventEmitter.emit as jest.Mock).mock.calls[0];
      const event = call[1];
      expect(event.table).toBe('goals');
      expect(event.action).toBe('INSERT');
      expect(event.userId).toBe('user1');
      expect(event.data).toEqual(record);
    });

    it('UPDATE 이벤트 처리', () => {
      const record = { id: '1', user_id: 'user1', title: 'Updated Goal' };
      const change = mockChange('UPDATE', record);

      (service as any).handleRealtimeChange('goals', change);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        RealtimeEventType.DATABASE_CHANGE,
        expect.any(DatabaseChangeEvent),
      );
    });

    it('DELETE 이벤트 처리', () => {
      const record = { id: '1', user_id: 'user1' };
      const change = mockChange('DELETE', record);

      (service as any).handleRealtimeChange('goals', change);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        RealtimeEventType.DATABASE_CHANGE,
        expect.any(DatabaseChangeEvent),
      );
    });

    it('userId가 없는 레코드는 이벤트를 발행하지 않음', () => {
      const record = { id: '1', title: 'Test Goal' };
      const change = mockChange('INSERT', record);

      (service as any).handleRealtimeChange('goals', change);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('에러 발생 시 로깅만 수행', () => {
      const loggerErrorSpy = jest
        .spyOn(service['logger'], 'error')
        .mockImplementation();
      (eventEmitter.emit as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Emit failed');
      });

      const record = { id: '1', user_id: 'user1' };
      const change = mockChange('INSERT', record);

      (service as any).handleRealtimeChange('goals', change);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error handling realtime change: Emit failed',
      );
      loggerErrorSpy.mockRestore();
    });
  });

  describe('testConnection', () => {
    it('Supabase 연결 테스트 성공', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('users');
    });

    it('Supabase 연결 테스트 실패', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Connection failed'),
          }),
        }),
      });

      const result = await service.testConnection();

      expect(result).toBe(false);
    });

    it('예외 발생 시 false 반환', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest
            .fn()
            .mockImplementationOnce(() =>
              Promise.reject(new Error('Network error')),
            ),
        }),
      });

      const result = await service.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('환경 설정 검증', () => {
    it('Supabase 설정이 없어도 서비스는 생성됨 (경고만 출력)', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RealtimeService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn().mockReturnValue(undefined),
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

      const serviceWithoutConfig = module.get<RealtimeService>(RealtimeService);
      expect(serviceWithoutConfig).toBeDefined();

      const loggerWarnSpy = jest
        .spyOn(serviceWithoutConfig['logger'], 'warn')
        .mockImplementation();

      await serviceWithoutConfig.onModuleInit();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Supabase not configured, skipping realtime initialization',
      );
      loggerWarnSpy.mockRestore();
    });
  });

  describe('실시간 이벤트 통합 시나리오', () => {
    it('여러 테이블의 동시 이벤트 처리', async () => {
      // 여러 테이블 구독
      await (service as any).subscribeToTable('goals');
      await (service as any).subscribeToTable('plans');

      // 각 테이뺔에서 이벤트 발생
      const goalsChange = {
        eventType: 'INSERT',
        new: { id: '1', user_id: 'user1', title: 'Goal 1' },
        table: 'goals',
      };

      const plansChange = {
        eventType: 'UPDATE',
        new: { id: '2', goalId: '1', title: 'Plan 1' },
        old: { id: '2', goalId: '1', title: 'Old Plan 1' },
        table: 'plans',
      };

      (service as any).handleRealtimeChange('goals', goalsChange);
      (service as any).handleRealtimeChange('plans', plansChange);

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1); // goals만 user_id가 있어서 1개만 발행
    });
  });

  describe('채널 상태 관리', () => {
    it('구독 중인 채널 목록 확인', async () => {
      await (service as any).subscribeToTable('goals');
      await (service as any).subscribeToTable('plans');

      const { channels } = service as any;
      expect(channels.size).toBe(2);
      expect(channels.has('goals')).toBe(true);
      expect(channels.has('plans')).toBe(true);
    });

    it('특정 채널 구독 상태 확인', async () => {
      await (service as any).subscribeToTable('goals');

      const isSubscribed = (service as any).channels.has('goals');
      expect(isSubscribed).toBe(true);

      const isNotSubscribed = (service as any).channels.has('users');
      expect(isNotSubscribed).toBe(false);
    });
  });
});
