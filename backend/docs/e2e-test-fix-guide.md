# E2E 테스트 통과 가이드

## 문제 진단

현재 E2E 테스트가 실패하는 주요 원인:

1. **순환 의존성 문제**
   - RealtimeService ↔ WebsocketGateway 간의 순환 참조
   - 이로 인해 NestJS 의존성 주입 실패

2. **임시방편 해결책들**
   - Health check에서 Supabase/WebSocket 체크를 하드코딩
   - 실제 상태 확인이 아닌 가짜 응답 반환

## 해결 방안

### Step 1: 순환 의존성 해결 (이벤트 기반 아키텍처)

```typescript
// 1. EventEmitter 모듈 추가 (완료)
pnpm add @nestjs/event-emitter

// 2. app.module.ts에 EventEmitterModule 추가 (완료)
EventEmitterModule.forRoot({
  wildcard: true,
  delimiter: '.',
})

// 3. RealtimeService 수정 (완료)
- WebsocketGateway 주입 제거
- EventEmitter2로 이벤트 발행

// 4. WebsocketGateway 수정 (완료)
- @OnEvent 데코레이터로 이벤트 수신
- broadcastToUser 메서드 구현
```

### Step 2: 테스트 수정

#### 2.1 RealtimeService 테스트 수정

```typescript
// realtime.service.spec.ts
// WebsocketGateway mock을 EventEmitter2 mock으로 교체

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RealtimeService,
      {
        provide: ConfigService,
        useValue: { /* config mock */ },
      },
      {
        provide: EventEmitter2,
        useValue: {
          emit: jest.fn(),
        },
      },
    ],
  }).compile();

  service = module.get<RealtimeService>(RealtimeService);
  eventEmitter = module.get<EventEmitter2>(EventEmitter2);
});

// 테스트 케이스에서 websocketGateway.broadcastToUser 대신
// eventEmitter.emit 호출 확인
it('should emit database change event', () => {
  // ... test logic
  expect(eventEmitter.emit).toHaveBeenCalledWith(
    RealtimeEventType.DATABASE_CHANGE,
    expect.any(DatabaseChangeEvent)
  );
});
```

#### 2.2 E2E 테스트 환경 설정

```typescript
// test/setup-e2e.ts 생성
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';

export async function createE2ETestingModule() {
  // 테스트용 환경 변수 설정
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.JWT_SECRET = 'test-secret';
  
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
  .overrideProvider(RealtimeService)
  .useValue({
    // Mock implementation
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    subscribeToTable: jest.fn(),
    testConnection: jest.fn().mockResolvedValue(true),
  })
  .compile();

  return moduleFixture;
}
```

### Step 3: Health Check 개선

```typescript
// health.service.ts
@Injectable()
export class HealthService {
  constructor(
    private prismaService: PrismaService,
    private configService: ConfigService,
    @Optional() private realtimeService?: RealtimeService,
    @Optional() private websocketService?: WebsocketService,
  ) {}

  async checkDetailedHealth() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkSupabase(),
      this.checkWebSocket(),
    ]);

    // ... rest of implementation
  }

  private async checkSupabase(): Promise<ServiceStatus> {
    if (!this.realtimeService) {
      return {
        status: 'down',
        message: 'RealtimeService not available',
      };
    }
    
    try {
      const isConnected = await this.realtimeService.testConnection();
      return {
        status: isConnected ? 'up' : 'down',
        message: isConnected ? 'Supabase is healthy' : 'Supabase connection failed',
      };
    } catch (error) {
      return {
        status: 'down',
        message: `Supabase error: ${error.message}`,
      };
    }
  }
}
```

### Step 4: E2E 테스트 실행 순서

```bash
# 1. 테스트 데이터베이스 준비
docker-compose up -d postgres
npm run prisma:test:deploy

# 2. 단위 테스트 먼저 확인
npm run test

# 3. E2E 테스트 실행
npm run test:e2e

# 4. 특정 E2E 테스트만 실행
npm run test:e2e -- goals.e2e-spec.ts
```

### Step 5: 디버깅 팁

```bash
# Jest 디버그 모드로 실행
node --inspect-brk ./node_modules/.bin/jest --runInBand --config ./test/jest-e2e.json

# 타임아웃 증가
jest.setTimeout(30000); // 테스트 파일 상단에 추가

# 상세 로그 출력
DEBUG=* npm run test:e2e
```

## 체크리스트

- [ ] EventEmitter 기반 아키텍처로 전환 완료
- [ ] 모든 단위 테스트 통과
- [ ] WebSocket 관련 mock 구현
- [ ] E2E 테스트 환경 설정
- [ ] Health check Optional 의존성 처리
- [ ] 테스트 데이터베이스 설정
- [ ] 모든 E2E 테스트 통과

## 추가 개선 사항

1. **테스트 격리**
   - 각 테스트는 독립적으로 실행 가능해야 함
   - beforeEach/afterEach에서 데이터 정리

2. **Mock 전략**
   - 외부 서비스(Supabase, Redis)는 항상 mock
   - 데이터베이스는 테스트 DB 사용

3. **CI/CD 통합**
   - GitHub Actions에서 테스트 자동화
   - 테스트 커버리지 리포트 생성