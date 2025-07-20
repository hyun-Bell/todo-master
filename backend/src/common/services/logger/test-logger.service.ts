import { type LoggerService } from '@nestjs/common';

/**
 * 테스트 환경 전용 Logger 서비스
 *
 * 환경 변수에 따라 로그 출력을 제어합니다:
 * - TEST_SILENT=true: 모든 로그 숨김 (기본값)
 * - TEST_DEBUG=true: 디버그 정보 포함하여 모든 로그 출력
 * - TEST_SILENT=false: warn 이상의 로그만 출력
 */
export class TestLoggerService implements LoggerService {
  private readonly isSilent: boolean;
  private readonly isDebug: boolean;
  private readonly context?: string;

  constructor(context?: string) {
    this.context = context;
    this.isSilent = process.env.TEST_SILENT === 'true';
    this.isDebug = process.env.TEST_DEBUG === 'true';
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isSilent && this.isDebug) {
      this.print('LOG', message, ...optionalParams);
    }
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    // 테스트에서 의도된 에러는 디버그 모드에서만 출력
    if (!this.isSilent && this.isDebug) {
      this.print('ERROR', message, ...optionalParams);
    }
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    // 경고는 silent 모드가 아니면 항상 출력 (중요할 수 있음)
    if (!this.isSilent) {
      this.print('WARN', message, ...optionalParams);
    }
  }

  debug?(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isSilent && this.isDebug) {
      this.print('DEBUG', message, ...optionalParams);
    }
  }

  verbose?(message: unknown, ...optionalParams: unknown[]): void {
    if (!this.isSilent && this.isDebug) {
      this.print('VERBOSE', message, ...optionalParams);
    }
  }

  fatal?(message: unknown, ...optionalParams: unknown[]): void {
    // Fatal은 항상 출력 (심각한 오류)
    this.print('FATAL', message, ...optionalParams);
  }

  private print(
    level: string,
    message: unknown,
    ...optionalParams: unknown[]
  ): void {
    const contextStr = this.context ? `[${this.context}] ` : '';
    const timestamp = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.log(
      `[TEST] ${timestamp} ${level} ${contextStr}${message}`,
      ...optionalParams,
    );
  }
}
