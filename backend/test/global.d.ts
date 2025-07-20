// Jest 테스트 환경을 위한 전역 타입 선언

declare global {
  namespace NodeJS {
    interface Global {
      registerCleanupTask: (task: () => Promise<void> | void) => void;
    }
  }

  var registerCleanupTask: (task: () => Promise<void> | void) => void;
}

export {};
