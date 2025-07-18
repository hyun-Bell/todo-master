/**
 * Jest 글로벌 설정
 * 모든 테스트 실행 전에 자동으로 로드됨
 */

// Logger 모킹을 가장 먼저 설정
import { setupLoggerMock } from './logger-mock';
setupLoggerMock();

// 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.LOG_LEVEL = 'silent';

// 글로벌 타임아웃 설정
jest.setTimeout(10000);

// console 메서드 모킹 (Logger가 직접 사용하는 경우를 위한 백업)
const consoleMethods = ['log', 'error', 'warn', 'info', 'debug'] as const;
consoleMethods.forEach(method => {
  global.console[method] = jest.fn();
});

// 테스트 종료 후 정리
afterAll(async () => {
  // 모든 타이머 정리
  jest.clearAllTimers();
  // 모든 모킹 정리
  jest.clearAllMocks();
});