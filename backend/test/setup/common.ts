// 공통 테스트 설정
import 'dotenv/config';

// 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRATION = '1h';
process.env.JWT_REFRESH_EXPIRATION = '7d';

// 테스트 로깅 설정
// TEST_SILENT가 명시적으로 false가 아니면 기본값은 true
if (process.env.TEST_SILENT !== 'false') {
  process.env.TEST_SILENT = 'true';
}

// 전역 헬퍼 함수
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// 공통 테스트 데이터
export const testData = {
  user: {
    email: 'test@example.com',
    password: 'Test123!@#',
    fullName: 'Test User',
  },
  goal: {
    title: 'Test Goal',
    description: 'Test goal description',
    category: 'personal',
    status: 'ACTIVE' as const,
    priority: 'MEDIUM' as const,
  },
  plan: {
    title: 'Test Plan',
    description: 'Test plan description',
    orderIndex: 0,
    status: 'PENDING' as const,
  },
};
