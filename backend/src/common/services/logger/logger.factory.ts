import { Logger } from '@nestjs/common';

import { TestLoggerService } from './test-logger.service';

/**
 * Logger Factory
 *
 * 환경에 따라 적절한 Logger 인스턴스를 생성합니다.
 * - 테스트 환경: TestLoggerService (조용한 테스트 실행)
 * - 프로덕션/개발 환경: NestJS 기본 Logger
 */
export class LoggerFactory {
  /**
   * Logger 인스턴스 생성
   * @param context - Logger 컨텍스트 (일반적으로 클래스명)
   * @returns Logger 또는 TestLoggerService 인스턴스
   */
  static create(context?: string): Logger {
    // 테스트 환경에서는 TestLoggerService 사용
    if (process.env.NODE_ENV === 'test') {
      return new TestLoggerService(context) as unknown as Logger;
    }

    // 프로덕션/개발 환경에서는 기본 Logger 사용
    return context ? new Logger(context) : new Logger();
  }

  /**
   * 특정 환경을 강제로 지정하여 Logger 생성
   * (주로 테스트에서 사용)
   */
  static createForEnvironment(
    environment: 'test' | 'production',
    context?: string,
  ): Logger {
    if (environment === 'test') {
      return new TestLoggerService(context) as unknown as Logger;
    }
    return context ? new Logger(context) : new Logger();
  }
}
