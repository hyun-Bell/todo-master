import { Logger } from '@nestjs/common';

/**
 * NestJS Logger를 완전히 무음 처리하는 설정
 * 테스트 환경에서 불필요한 로그 출력을 방지
 */
export function setupLoggerMock() {
  // Logger의 모든 메서드를 no-op으로 대체
  const mockMethods = ['log', 'error', 'warn', 'debug', 'verbose'];
  
  mockMethods.forEach(method => {
    jest.spyOn(Logger.prototype, method as any).mockImplementation(() => {});
  });
  
  // Logger의 정적 메서드도 모킹
  mockMethods.forEach(method => {
    jest.spyOn(Logger, method as any).mockImplementation(() => {});
  });
}

/**
 * 특정 테스트에서 Logger 동작을 확인해야 할 때 사용
 */
export function createLoggerSpy() {
  return {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };
}