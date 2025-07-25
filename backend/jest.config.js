module.exports = {
  // 프로젝트별 설정
  projects: [
    {
      displayName: 'Unit',
      testMatch: ['<rootDir>/src/**/*.spec.ts'],
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup/unit.ts'],
      moduleNameMapper: {
        '^@supabase/supabase-js$': '<rootDir>/test/mocks/stateful-supabase.mock.ts',
      },
    },
    {
      displayName: 'Integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup/integration.ts'],
    },
    {
      displayName: 'E2E',
      testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: {
        '^.+\\.(t|j)s$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
        }],
      },
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.ts'],
      maxWorkers: 1, // E2E 테스트는 순차 실행
    },
  ],
  
  // 공통 설정
  rootDir: '.',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.interface.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 기본 설정
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  // 테스트 완료 후 강제 종료 (비동기 작업이 남아있어도)
  forceExit: true,
};