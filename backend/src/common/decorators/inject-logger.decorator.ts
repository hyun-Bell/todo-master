import { Logger } from '@nestjs/common';

/**
 * Logger 인스턴스를 주입하기 위한 커스텀 데코레이터
 * 테스트 환경에서 Logger를 쉽게 모킹할 수 있도록 함
 */
export function InjectLogger(context: string) {
  return function (target: object, propertyKey: string) {
    let logger: Logger;

    const getter = function () {
      if (!logger) {
        logger = new Logger(context);
      }
      return logger;
    };

    const setter = function (newLogger: Logger) {
      logger = newLogger;
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      set: setter,
      enumerable: true,
      configurable: true,
    });
  };
}
