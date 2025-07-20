/**
 * Logger Mock 설정
 * 테스트 환경에서 Logger 출력을 제어하기 위한 모킹
 */

import { type ILogger } from '../../src/common/interfaces/logger.interface';

/**
 * 테스트용 Logger Mock 구현
 */
class TestLoggerMock implements ILogger {
  private silent: boolean;

  constructor() {
    this.silent = process.env.TEST_SILENT !== 'false';
  }

  log(message: string, ...optionalParams: unknown[]): void {
    if (!this.silent) {
      console.log(`[LOG] ${message}`, ...optionalParams);
    }
  }

  error(message: string, ...optionalParams: unknown[]): void {
    if (!this.silent) {
      console.error(`[ERROR] ${message}`, ...optionalParams);
    }
  }

  warn(message: string, ...optionalParams: unknown[]): void {
    if (!this.silent) {
      console.warn(`[WARN] ${message}`, ...optionalParams);
    }
  }

  debug(message: string, ...optionalParams: unknown[]): void {
    if (!this.silent) {
      console.debug(`[DEBUG] ${message}`, ...optionalParams);
    }
  }

  verbose(message: string, ...optionalParams: unknown[]): void {
    if (!this.silent) {
      console.log(`[VERBOSE] ${message}`, ...optionalParams);
    }
  }

  fatal(message: string, ...optionalParams: unknown[]): void {
    if (!this.silent) {
      console.error(`[FATAL] ${message}`, ...optionalParams);
    }
  }

  setContext(context: string): void {
    // Context는 테스트에서 사용하지 않음
  }

  localInstance(context: string): ILogger {
    return new TestLoggerMock();
  }
}

/**
 * Logger 모킹 설정 함수
 * Jest 환경에서 Logger를 모킹하여 테스트 출력을 제어
 */
export function setupLoggerMock(): void {
  const mockLogger = new TestLoggerMock();

  // @InjectLogger 데코레이터를 위한 모킹
  jest.doMock('../../src/common/decorators/inject-logger.decorator', () => ({
    InjectLogger:
      () =>
      (
        target: unknown,
        propertyKey: string | symbol | undefined,
        parameterIndex: number,
      ) => {
        // 실제 데코레이터 로직은 테스트에서 필요 없음
      },
  }));

  // LoggerFactory 모킹
  jest.doMock('../../src/common/services/logger/logger.factory', () => ({
    LoggerFactory: {
      createLogger: jest.fn(() => mockLogger),
      createTestLogger: jest.fn(() => mockLogger),
    },
  }));

  // TestLoggerService 모킹
  jest.doMock('../../src/common/services/logger/test-logger.service', () => ({
    TestLoggerService: jest.fn().mockImplementation(() => mockLogger),
  }));

  // NestJS Logger 모킹
  jest.doMock('@nestjs/common', () => {
    const actual = jest.requireActual('@nestjs/common');
    return {
      ...actual,
      Logger: jest.fn().mockImplementation(() => mockLogger),
    };
  });
}

export { TestLoggerMock };
