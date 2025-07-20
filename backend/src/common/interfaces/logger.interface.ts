/**
 * Logger 인터페이스
 * 테스트에서 쉽게 모킹할 수 있도록 인터페이스 정의
 */
export interface ILogger {
  log(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
  verbose(message: string, context?: string): void;
}
