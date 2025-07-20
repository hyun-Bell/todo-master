# 테스트 환경 가이드

## 📋 개요

이 프로젝트는 **Dual-Mode Testing** 시스템을 도입하여 Mock과 Real 환경에서 동일한 테스트를 실행하고 결과를 비교할 수 있습니다.

## 🏗️ 테스트 구조

```
test/
├── adapters/              # Adapter 패턴 구현
│   ├── auth-adapter.interface.ts
│   ├── storage-adapter.interface.ts
│   ├── realtime-adapter.interface.ts
│   ├── mock-auth.adapter.ts
│   ├── mock-storage.adapter.ts
│   ├── mock-realtime.adapter.ts
│   ├── supabase-auth.adapter.ts
│   └── adapter.factory.ts
├── config/                # 테스트 설정
│   ├── jest.unit.config.js
│   ├── jest.integration.config.js
│   ├── jest.e2e.config.js
│   ├── setup-unit.ts
│   ├── setup-integration.ts
│   └── setup-e2e.ts
├── helpers/               # 테스트 헬퍼
│   └── dual-mode-runner.ts
├── types/                 # 타입 정의
│   └── test-mode.ts
├── examples/              # 사용 예시
│   └── dual-mode-example.spec.ts
├── unit/                  # 단위 테스트
├── integration/           # 통합 테스트
├── e2e/                   # E2E 테스트
└── README.md             # 이 파일
```

## 🔧 테스트 모드

### 1. Mock 모드 (기본값)
- 모든 외부 서비스를 Mock으로 대체
- 빠른 실행 속도
- 격리된 테스트 환경

### 2. Real 모드
- 실제 외부 서비스 사용
- 실제 환경과 동일한 동작
- 테스트 데이터베이스 필요

### 3. Hybrid 모드
- 일부 서비스만 실제 사용
- 환경변수로 세밀한 제어 가능
- 점진적 통합 테스트

## 🚀 사용 방법

### 기본 테스트 실행

```bash
# 단위 테스트 (항상 Mock 모드)
npm run test
npm run test:watch
npm run test:cov

# 통합 테스트
npm run test:integration              # 기본 (Mock 모드)
npm run test:integration:mock         # Mock 모드 명시
npm run test:integration:real         # Real 모드
npm run test:integration:hybrid       # Hybrid 모드

# E2E 테스트
npm run test:e2e                      # 기본 (Mock 모드)
npm run test:e2e:mock                 # Mock 모드 명시
npm run test:e2e:real                 # Real 모드
npm run test:e2e:hybrid               # Hybrid 모드

# 전체 테스트
npm run test:all                      # 모든 테스트 (Mock 모드)
npm run test:all:real                 # 모든 테스트 (Real 모드)
npm run test:all:cov                  # 모든 테스트 + 커버리지
```

### Dual-Mode 테스트

```bash
# Mock과 Real 모드 비교
npm run test:dual                     # 통합 테스트 비교
npm run test:dual:e2e                 # E2E 테스트 비교
```

### 환경변수 설정

```bash
# 테스트 모드 설정
export TEST_MODE=mock|real|hybrid

# Hybrid 모드 세부 설정
export TEST_REAL_AUTH=true
export TEST_REAL_STORAGE=false
export TEST_REAL_REALTIME=false

# 로깅 설정
export TEST_SILENT=true|false
export LOG_LEVEL=error|warn|info|debug

# Real 모드용 데이터베이스
export DATABASE_URL=postgresql://testuser:testpassword@localhost:5433/todomaster_test
```

## 📝 테스트 작성 가이드

### 1. 단위 테스트

```typescript
// src/users/users.service.spec.ts
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, /* mocked dependencies */],
    }).compile();

    service = module.get(UsersService);
  });

  it('should create user', async () => {
    // 단위 테스트 로직
  });
});
```

### 2. 통합 테스트

```typescript
// test/integration/auth.integration.spec.ts
import { AdapterFactory } from '../adapters/adapter.factory';

describe('Auth Integration', () => {
  it('should authenticate user', async () => {
    const authAdapter = AdapterFactory.getAuthAdapter();
    
    const result = await authAdapter.createUser({
      email: 'test@example.com',
      password: 'password123',
    });
    
    expect(result.user).toBeDefined();
  });
});
```

### 3. Dual-Mode 테스트

```typescript
// test/integration/dual-auth.spec.ts
import { DualModeRunner } from '../helpers/dual-mode-runner';
import { AdapterFactory } from '../adapters/adapter.factory';

describe('Auth Dual-Mode', () => {
  let dualModeRunner: DualModeRunner;

  beforeAll(() => {
    dualModeRunner = DualModeRunner.getInstance();
  });

  it('should work identically in both modes', async () => {
    const testFunction = async () => {
      const authAdapter = AdapterFactory.getAuthAdapter();
      return await authAdapter.createUser({
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
      });
    };

    const comparison = await dualModeRunner.runDualMode(testFunction);
    
    expect(comparison.identical).toBe(true);
  });
});
```

## 🏃‍♂️ CI/CD 파이프라인

### PR 검증 워크플로우
- **Unit Tests**: 빠른 피드백
- **Integration Tests (Mock)**: 기본 통합 검증
- **Integration Tests (Real)**: 실제 환경 검증
- **E2E Tests (Mock/Real)**: 전체 시나리오 검증
- **Dual-Mode Comparison**: Mock vs Real 결과 비교

### Nightly 빌드
- **종합 테스트**: 모든 모드에서 전체 테스트 실행
- **성능 벤치마크**: Mock vs Real 성능 비교
- **상세 분석**: Dual-Mode 결과 종합 분석

## 🛠️ 어댑터 패턴

### 지원되는 어댑터

1. **Auth Adapter**
   - 사용자 인증/인가
   - Mock: 메모리 기반 사용자 관리
   - Real: Supabase Auth

2. **Storage Adapter**
   - 파일 저장소
   - Mock: 메모리 기반 파일 시스템
   - Real: Supabase Storage (구현 예정)

3. **Realtime Adapter**
   - 실시간 통신
   - Mock: 이벤트 기반 메시지 시스템
   - Real: Supabase Realtime (구현 예정)

### 새 어댑터 추가

1. 인터페이스 정의
```typescript
// test/adapters/new-service-adapter.interface.ts
export interface INewServiceAdapter {
  doSomething(): Promise<any>;
}
```

2. Mock 구현
```typescript
// test/adapters/mock-new-service.adapter.ts
export class MockNewServiceAdapter implements INewServiceAdapter {
  async doSomething(): Promise<any> {
    // Mock 구현
  }
}
```

3. Factory에 등록
```typescript
// test/adapters/adapter.factory.ts
static createAdapters(mode: TestMode): AdapterInstances {
  return {
    // 기존 어댑터들...
    newService: new MockNewServiceAdapter(),
  };
}
```

## 📊 성능 및 품질 지표

### 커버리지 목표
- **Unit Tests**: 80% 이상
- **Integration Tests**: 70% 이상  
- **E2E Tests**: 60% 이상

### 성능 목표
- **Mock 모드**: 빠른 피드백 (단위 테스트 < 10초)
- **Real 모드**: 신뢰할 수 있는 검증 (통합 테스트 < 2분)
- **Mock vs Real**: 성능 차이 모니터링

## 🔍 문제 해결

### 일반적인 문제

1. **데이터베이스 연결 실패**
```bash
# Docker 컨테이너 확인
docker-compose -f ../docker-compose.test.yml ps

# 데이터베이스 로그 확인
docker-compose -f ../docker-compose.test.yml logs postgres

# 마이그레이션 실행
npm run test:e2e:migrate
```

2. **Mock과 Real 결과 불일치**
```typescript
// DualModeRunner 결과 확인
const comparison = await dualModeRunner.runDualMode(testFunction);
console.log('차이점:', comparison.differences);
console.log('권장사항:', comparison.recommendation);
```

3. **테스트 격리 문제**
```typescript
// 각 테스트 전에 어댑터 초기화
beforeEach(() => {
  AdapterFactory.resetCurrent();
});
```

### 디버깅

```bash
# 상세 로그와 함께 테스트 실행
TEST_SILENT=false npm run test:integration:real

# 특정 테스트만 실행
npm run test -- --testNamePattern="Auth"

# 디버그 모드로 실행
npm run test:debug
```

## 🎯 로드맵

### Phase 2.1 (완료)
- ✅ Dual-Mode Testing 환경 구축
- ✅ Adapter 패턴 확장 (Auth, Storage, Realtime)
- ✅ 테스트 구조 재구성
- ✅ CI/CD 파이프라인 설정

### Phase 2.2 (예정)
- 🔄 Real Storage/Realtime Adapter 구현
- 🔄 성능 최적화 및 병렬 실행
- 🔄 Dual-Mode 결과 분석 대시보드
- 🔄 자동화된 Mock 업데이트 시스템

### Phase 2.3 (예정)
- 📋 Visual Regression Testing
- 📋 Contract Testing
- 📋 Chaos Engineering
- 📋 Performance Monitoring Integration