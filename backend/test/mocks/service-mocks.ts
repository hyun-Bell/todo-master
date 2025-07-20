/**
 * 테스트용 서비스 모킹 팩토리
 */

import { StatefulSupabaseMock } from './stateful-supabase.mock';

// 테스트용 고정 UUID (레거시 지원)
const TEST_USER_ID = '12345678-1234-5678-9012-123456789012';
const TEST_USER_EMAIL = 'test@example.com';

export const createLoggerServiceMock = () => ({
  // NestJS LoggerService 인터페이스 메서드들
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),

  // 커스텀 LoggerService 메서드들
  setContext: jest.fn(),
  logHttpRequest: jest.fn(),

  // 추가 헬퍼 메서드들 (winston logger 호환)
  info: jest.fn(),
  silly: jest.fn(),

  // 내부 logger 인스턴스 모킹
  logger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
    silly: jest.fn(),
  },
});

export const createSupabaseServiceMock = (
  statefulMock?: StatefulSupabaseMock,
) => {
  // Stateful mock이 제공되면 사용, 아니면 새로 생성
  const mock = statefulMock || new StatefulSupabaseMock();

  return {
    // Stateful mock 사용
    getClient: jest.fn(() => mock.getClient()),
    getAdminClient: jest.fn(() => mock.getAdminClient()),

    // SupabaseService 핵심 메서드들도 stateful mock과 연동
    verifyToken: jest.fn((token: string) => mock.verifyToken(token)),
    getUserById: jest.fn(async (id: string) => {
      const result = await mock.getAdminClient().auth.admin.getUserById(id);
      return result.data?.user || null;
    }),
    getUserByEmail: jest.fn((email: string) => mock.getUserByEmail(email)),

    // 내부 mock 접근 (테스트용)
    _mock: mock,
  };
};

export const createRealtimeServiceMock = () => ({
  onModuleInit: jest.fn(),
  onModuleDestroy: jest.fn(),
  subscribeToTable: jest.fn(),
  unsubscribeFromTable: jest.fn(),
  subscribeUserToChanges: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
});

/**
 * 테스트 환경에서 실제로 필요한 최소한의 모킹만 제공
 */
export const getMinimalMocks = (
  statefulSupabaseMock?: StatefulSupabaseMock,
) => ({
  logger: createLoggerServiceMock(),
  supabase: createSupabaseServiceMock(statefulSupabaseMock),
  realtime: createRealtimeServiceMock(),
});

/**
 * 각 테스트마다 독립적인 stateful mock 인스턴스를 생성하는 헬퍼
 */
export const createTestMocks = () => {
  const statefulSupabaseMock = new StatefulSupabaseMock();
  return {
    mocks: getMinimalMocks(statefulSupabaseMock),
    statefulSupabaseMock,
  };
};
