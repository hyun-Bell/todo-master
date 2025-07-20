# 실시간 통신 통합 마이그레이션 가이드

## 개요

이 가이드는 WebSocket과 Supabase Realtime을 통합된 실시간 서비스로 마이그레이션하는 방법을 설명합니다.

## 아키텍처

### 통합 실시간 서비스 구조

```
┌─────────────────────────────────────────────────────────┐
│                 UnifiedRealtimeService                   │
│  (Provider 선택, Fallback 지원, 연결/구독 관리)            │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐       ┌───────▼────────┐
│ WebSocket      │       │ Supabase       │
│ Adapter        │       │ Adapter        │
└────────────────┘       └────────────────┘
        │                         │
┌───────▼────────┐       ┌───────▼────────┐
│ WebSocket      │       │ Supabase       │
│ Gateway        │       │ Realtime       │
└────────────────┘       └────────────────┘
```

## 주요 컴포넌트

### 1. 통합 인터페이스 (`realtime.interface.ts`)

```typescript
export interface IRealtimeService {
  // Connection management
  connect(userId: string, connectionId: string): Promise<void>;
  disconnect(connectionId: string): Promise<void>;
  
  // Subscription management
  subscribe(userId: string, tables: string[]): Promise<void>;
  unsubscribe(userId: string, tables: string[]): Promise<void>;
  
  // Broadcasting
  broadcast(event: RealtimeEvent): Promise<void>;
  broadcastToUser(userId: string, event: string, data: any): Promise<void>;
  broadcastToTable(table: string, event: string, data: any): Promise<void>;
  
  // Provider management
  getActiveProvider(): RealtimeProvider;
  switchProvider(provider: RealtimeProvider): Promise<void>;
  isHealthy(): Promise<boolean>;
}
```

### 2. 어댑터 패턴

각 실시간 제공자(WebSocket, Supabase)는 동일한 인터페이스를 구현:

- **WebSocketRealtimeAdapter**: 기존 WebSocket 기능을 래핑
- **SupabaseRealtimeAdapter**: Supabase Realtime 기능을 래핑

### 3. UnifiedRealtimeService

- 현재 활성 Provider 관리
- 자동 Fallback 지원
- 연결 및 구독 추적
- Health Check 및 자동 전환

## 마이그레이션 단계

### Step 1: 환경 변수 설정

```env
# 실시간 Provider 설정 (websocket 또는 supabase)
REALTIME_PROVIDER=websocket

# Fallback 활성화 여부
REALTIME_FALLBACK_ENABLED=true

# Supabase 설정 (Supabase provider 사용 시)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Step 2: 모듈 Import 업데이트

```typescript
// 기존 코드
import { WebsocketService } from '../websocket/websocket.service';
import { RealtimeService } from '../realtime/realtime.service';

// 새로운 코드
import { UnifiedRealtimeService } from '../realtime/services/unified-realtime.service';
```

### Step 3: 서비스 주입 업데이트

```typescript
// 기존 코드
constructor(
  private websocketService: WebsocketService,
  private realtimeService: RealtimeService,
) {}

// 새로운 코드
constructor(
  private realtimeService: UnifiedRealtimeService,
) {}
```

### Step 4: 이벤트 브로드캐스트 업데이트

```typescript
// 기존 코드 - WebSocket 직접 사용
this.websocketService.broadcastToUser(userId, 'goal:created', data);

// 기존 코드 - Supabase Realtime 직접 사용
this.realtimeService.publishChange({
  table: 'goals',
  action: 'INSERT',
  data: goal,
});

// 새로운 코드 - 통합 서비스 사용
await this.realtimeService.broadcast({
  type: 'INSERT',
  table: 'goals',
  data: goal,
  userId: userId,
  timestamp: new Date(),
  provider: this.realtimeService.getActiveProvider(),
});
```

### Step 5: 구독 관리 업데이트

```typescript
// 기존 코드
socket.on('subscribe', (tables) => {
  this.websocketService.subscribeToTables(socket, tables);
});

// 새로운 코드
await this.realtimeService.subscribe(userId, tables);
```

## 사용 예시

### 목표 생성 시 실시간 알림

```typescript
@Injectable()
export class GoalsService {
  constructor(
    private goalRepository: GoalRepository,
    private realtimeService: UnifiedRealtimeService,
  ) {}

  async create(userId: string, createGoalDto: CreateGoalDto): Promise<GoalResponseDto> {
    const goal = await this.goalRepository.create({
      ...createGoalDto,
      userId,
    });

    // 실시간 이벤트 브로드캐스트
    await this.realtimeService.broadcast({
      type: 'INSERT',
      table: 'goals',
      data: goal,
      userId,
      timestamp: new Date(),
      provider: this.realtimeService.getActiveProvider(),
    });

    return new GoalResponseDto(goal);
  }
}
```

### Provider 전환

```typescript
// 런타임에 Provider 전환
await this.realtimeService.switchProvider(RealtimeProvider.SUPABASE);

// Health Check
const isHealthy = await this.realtimeService.isHealthy();
if (!isHealthy) {
  console.log('Realtime service is unhealthy, fallback will be used');
}
```

## 테스트

### Unit 테스트

```typescript
describe('GoalsService with Realtime', () => {
  let service: GoalsService;
  let realtimeService: UnifiedRealtimeService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: UnifiedRealtimeService,
          useValue: {
            broadcast: jest.fn(),
            broadcastToUser: jest.fn(),
            getActiveProvider: jest.fn().mockReturnValue('websocket'),
          },
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    realtimeService = module.get<UnifiedRealtimeService>(UnifiedRealtimeService);
  });

  it('should broadcast event when goal is created', async () => {
    const createGoalDto = { title: 'Test Goal' };
    const userId = 'user-123';

    await service.create(userId, createGoalDto);

    expect(realtimeService.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'INSERT',
        table: 'goals',
        userId,
      })
    );
  });
});
```

## 이점

1. **Provider 독립성**: WebSocket과 Supabase 간 쉬운 전환
2. **자동 Fallback**: 한 Provider 실패 시 자동으로 다른 Provider 사용
3. **통합 인터페이스**: 일관된 API로 실시간 기능 사용
4. **확장성**: 새로운 실시간 Provider 추가 용이
5. **테스트 용이성**: Mock 어댑터로 쉬운 테스트

## 주의사항

1. **순환 의존성**: RealtimeModule과 WebsocketModule 간 순환 의존성 주의
2. **성능**: 두 Provider를 동시에 사용할 경우 중복 브로드캐스트 방지
3. **에러 처리**: 실시간 브로드캐스트 실패가 주 기능에 영향을 주지 않도록 처리

## 향후 계획

1. **Phase 1**: 통합 인터페이스 구현 및 어댑터 생성 ✅
2. **Phase 2**: 기존 서비스들을 통합 서비스 사용하도록 마이그레이션
3. **Phase 3**: WebSocket 모듈을 Fallback 전용으로 리팩토링
4. **Phase 4**: 성능 최적화 및 모니터링 추가