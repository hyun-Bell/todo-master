# Todo Master Backend 개발 가이드

## 🏗️ 기술 스택

```yaml
Framework: NestJS 11.x
Language: TypeScript 5.x
Database: PostgreSQL (Supabase)
ORM: Prisma 6.x
Auth: Supabase Auth + JWT (통합 가드)
Realtime: WebSocket + Supabase Realtime (Adapter 패턴)
Testing: Jest 29.x + Dual-Mode Testing (Mock/Real)
Package Manager: pnpm
```

## 🗂️ 프로젝트 구조

```
backend/
├── src/
│   ├── auth/              # 인증 모듈
│   │   ├── guards/        # UnifiedAuthGuard (JWT + Supabase)
│   │   ├── services/      # AuthenticationService, TokenService
│   │   └── decorators/    # @Public, @CurrentUser
│   ├── common/            # 공통 모듈
│   │   ├── filters/       # HttpExceptionFilter
│   │   ├── interceptors/  # TransformInterceptor
│   │   ├── repositories/  # BaseRepository 추상 클래스
│   │   ├── services/      # Logger, Broadcast, WebSocket
│   │   └── decorators/    # @InjectLogger
│   ├── config/            # 환경 설정 (ConfigModule)
│   ├── users/             # 사용자 도메인
│   ├── goals/             # 목표 도메인  
│   ├── plans/             # 계획 도메인
│   ├── realtime/          # 실시간 통신
│   │   ├── interfaces/    # IRealtimeService, IRealtimeAdapter
│   │   └── adapters/      # WebSocketAdapter, SupabaseAdapter
│   ├── health/            # 헬스체크 모듈
│   └── supabase/          # Supabase 클라이언트 서비스
├── test/
│   ├── adapters/          # IAuthAdapter 인터페이스 구현
│   ├── builders/          # 테스트 데이터 빌더
│   ├── factories/         # 테스트 데이터 팩토리
│   ├── helpers/           # E2E 테스트 헬퍼
│   ├── mocks/             # 서비스 Mock 구현
│   └── setup/             # Jest 설정 (unit/integration/e2e)
├── prisma/
│   └── schema.prisma      # 데이터베이스 스키마
└── generated/
    └── prisma/            # Prisma Client (자동 생성)

## 🔗 데이터베이스 스키마

```typescript
User {              // 사용자 (Supabase Auth 연동)
  id: UUID
  email: string
  supabaseId: UUID  // Supabase auth.users 연결
  goals: Goal[]
}

Goal {              // 목표
  id: UUID
  userId: UUID
  title: string
  status: GoalStatus (ACTIVE | COMPLETED | PAUSED | CANCELLED)
  priority: Priority (LOW | MEDIUM | HIGH)
  plans: Plan[]
}

Plan {              // 계획
  id: UUID
  goalId: UUID
  title: string
  status: PlanStatus (PENDING | IN_PROGRESS | COMPLETED | CANCELLED)
  checkpoints: Checkpoint[]
}

Checkpoint {        // 체크포인트
  id: UUID
  planId: UUID
  isCompleted: boolean
}
```

## 🏛️ 아키텍처 패턴

### Repository Pattern
```typescript
// BaseRepository 추상 클래스 활용
export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  abstract create(data: CreateDto): Promise<T>
  abstract findById(id: string): Promise<T | null>
  abstract update(id: string, data: UpdateDto): Promise<T>
  abstract delete(id: string): Promise<void>
  
  // 트랜잭션 지원
  async transaction<R>(fn: (tx: Prisma.TransactionClient) => Promise<R>): Promise<R>
}

// 구현 예시: GoalRepository extends BaseRepository
```

### Adapter Pattern (실시간 통신)
```typescript
interface IRealtimeAdapter {
  connect(userId: string, connectionId: string): Promise<void>
  disconnect(connectionId: string): Promise<void>
  broadcast(event: RealtimeEvent): Promise<void>
  isHealthy(): Promise<boolean>
}

// WebSocketAdapter, SupabaseAdapter가 인터페이스 구현
// UnifiedRealtimeService가 어댑터들을 통합 관리
```

### Guard Pattern (인증)
```typescript
// UnifiedAuthGuard: JWT와 Supabase 토큰 모두 지원
// 1. JWT 검증 시도 (E2E 테스트용)
// 2. 실패 시 Supabase 토큰 검증
// 3. 로컬 DB와 동기화
```

## 🌐 API 엔드포인트

```typescript
// 인증
POST   /api/auth/register      // 회원가입
POST   /api/auth/login         // 로그인

// 리소스 (UnifiedAuthGuard 보호)
GET    /api/users/profile      // 프로필 조회
PATCH  /api/users/profile      // 프로필 수정
GET    /api/goals              // 목표 목록
POST   /api/goals              // 목표 생성
PATCH  /api/goals/:id          // 목표 수정
DELETE /api/goals/:id          // 목표 삭제
GET    /api/plans              // 계획 목록
POST   /api/plans              // 계획 생성

// 헬스체크
GET    /api/health             // 서비스 상태
GET    /api/health/db          // DB 연결 상태
GET    /api/health/redis       // Redis 연결 상태

## 🎯 테스트 아키텍처

### Jest 프로젝트 구조
```javascript
// jest.config.js
projects: [
  {
    displayName: 'Unit',
    testMatch: ['<rootDir>/src/**/*.spec.ts'],
    setupFilesAfterEnv: ['<rootDir>/test/setup/unit.ts'],
    // Supabase 자동 모킹
    moduleNameMapper: {
      '^@supabase/supabase-js$': '<rootDir>/test/mocks/stateful-supabase.mock.ts'
    }
  },
  {
    displayName: 'Integration',
    testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
    setupFilesAfterEnv: ['<rootDir>/test/setup/integration.ts']
  },
  {
    displayName: 'E2E',
    testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
    setupFilesAfterEnv: ['<rootDir>/test/setup/e2e.ts'],
    maxWorkers: 1  // 순차 실행
  }
]
```

### Dual-Mode Testing (Adapter Pattern)
```typescript
// IAuthAdapter 인터페이스로 Mock/Real 환경 통합
interface IAuthAdapter {
  createUser(data: CreateUserData): Promise<AuthResult>
  signIn(credentials: SignInData): Promise<AuthResult>
  verifyToken(token: string): Promise<User | null>
  deleteUser(id: string): Promise<boolean>
}

// MockAuthAdapter: 메모리 기반 빠른 테스트
// RealAuthAdapter: 실제 Supabase 연동 테스트
```

### 테스트 격리 전략
```typescript
// 1. Unit 테스트: 완전 격리 (모든 의존성 모킹)
// 2. Integration 테스트: 부분 격리 (DB는 실제, 외부 서비스는 모킹)
// 3. E2E 테스트: 최소 격리 (실제 환경과 유사)

// 각 테스트는 독립적인 설정 파일 사용
// - test/setup/unit.ts
// - test/setup/integration.ts  
// - test/setup/e2e.ts
```

## 🚀 개발 환경 설정

```bash
# 1. 의존성 설치
pnpm install

# 2. 환경 변수 설정
cp .env.example .env
cp .env.test.example .env.test

# 3. 데이터베이스 설정
pnpm db:start                 # PostgreSQL 시작
pnpm prisma db push          # 스키마 적용
pnpm prisma generate         # 클라이언트 생성

# 4. 개발 서버 시작
pnpm start:dev               # 개발 모드
```

## 🧪 테스트 실행

### Silent Mode (기본값)
```bash
# 조용한 출력 (로그 최소화)
pnpm test                    # Unit 테스트만
pnpm test:integration        # Integration 테스트만
pnpm test:e2e               # E2E 테스트만 (순차 실행)
pnpm test:all               # 모든 테스트 실행

# 디버그 모드 (상세 로그)
TEST_SILENT=false pnpm test  # 또는 pnpm test:debug
```

### 테스트 환경별 특징
- **Unit**: Supabase 자동 모킹, 완전 격리
- **Integration**: Mock/Real 어댑터 선택 가능
- **E2E**: JWT 토큰 사용, 실제 API 호출

## 📝 코드 컨벤션

### 네이밍 규칙
- **클래스**: PascalCase
  - Service: `UsersService`, `AuthenticationService`
  - Module: `UsersModule`, `CommonModule`
  - Repository: `UserRepository`, `GoalRepository`
  - Guard: `UnifiedAuthGuard`, `SupabaseAuthGuard`
- **인터페이스**: `I` 접두사 + PascalCase (`IAuthAdapter`, `IRealtimeService`)
- **메서드**: camelCase (`findByEmail()`, `createUser()`)
- **변수**: camelCase (`userId`, `isActive`)

### 계층 구조
```typescript
Controller → Service → Repository → Prisma
         ↓
      Guard/Interceptor
```

### 에러 처리
```typescript
// HTTP 예외는 컨트롤러 레벨에서 처리
throw new ConflictException('이미 존재하는 이메일입니다.');
throw new NotFoundException('사용자를 찾을 수 없습니다.');
throw new UnauthorizedException('인증에 실패했습니다.');

// 비즈니스 로직 에러는 서비스 레벨에서 처리
```

### 의존성 주입
```typescript
// 생성자 주입 사용
constructor(
  private readonly prisma: PrismaService,
  @InjectLogger() private readonly logger: ILogger,
) {}
```

### 환경 설정
```typescript
// ConfigModule과 validation schema 사용
@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: configValidationSchema,
      isGlobal: true,
    }),
  ],
})
```

## 💡 개발 팁

### 로깅 시스템
- **개발**: 상세 로그 출력
- **테스트**: Silent 모드 기본 (TEST_SILENT=false로 활성화)
- **프로덕션**: 에러 레벨만 출력

### Prisma Client 위치
```bash
# generated/prisma 폴더에 생성됨 (기본 위치 아님)
pnpm prisma generate
```

### 환경별 실행
```bash
pnpm start:dev        # 로컬 개발 (PostgreSQL)
pnpm start:supabase   # Supabase 연동 개발
pnpm start:prod       # 프로덕션 모드
```

### 테스트 데이터
- **Builder Pattern**: `UserBuilder`, `GoalBuilder` 
- **Factory Pattern**: `UserFactory`, `GoalFactory`
- **Database Cleaner**: 테스트 후 자동 정리