import { Logger } from '@nestjs/common';

/**
 * 환경에 따라 적절한 Logger 인스턴스를 생성하는 팩토리
 */
export class LoggerFactory {
  static create(context: string): Logger {
    return new Logger(context);
  }

  /**
   * 테스트용 무음 Logger 생성
   */
  static createSilent(context: string): Logger {
    const logger = new Logger(context);
    logger.log = () => {};
    logger.error = () => {};
    logger.warn = () => {};
    logger.debug = () => {};
    logger.verbose = () => {};
    return logger;
  }
}