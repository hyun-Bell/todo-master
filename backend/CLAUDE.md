# Backend 코드 컨벤션

## 1. 네이밍 컨벤션

### 클래스
- **PascalCase** 사용
- 모듈: 복수형 사용 (예: `UsersModule`, `GoalsModule`)
- 서비스/컨트롤러: 복수형 + 역할 (예: `UsersService`, `UsersController`)
- 필터/인터셉터: 역할 + 타입 (예: `HttpExceptionFilter`, `TransformInterceptor`)

### 메서드
- **camelCase** 사용
- 동사로 시작 (예: `create()`, `findAll()`, `update()`, `remove()`)
- 명확한 동작 표현 (예: `findByEmail()`, `validateUser()`)

### 변수
- **camelCase** 사용
- 의미 있는 이름 사용 (예: `createUserDto`, `existingUser`)
- boolean은 is/has 접두사 (예: `isActive`, `hasPermission`)

## 2. 파일 및 폴더 구조

```
src/
├── [feature]/                    # 기능별 모듈
│   ├── dto/                     # DTO 파일
│   │   ├── create-[feature].dto.ts
│   │   ├── update-[feature].dto.ts
│   │   └── [feature]-response.dto.ts
│   ├── [feature].controller.ts
│   ├── [feature].controller.spec.ts
│   ├── [feature].service.ts
│   ├── [feature].service.spec.ts
│   └── [feature].module.ts
├── common/                      # 공통 모듈
│   ├── decorators/             # 커스텀 데코레이터
│   ├── filters/                # 예외 필터
│   └── interceptors/           # 인터셉터
└── prisma/                     # Prisma 관련
```

## 3. 의존성 주입

### 생성자 주입 사용
```typescript
constructor(
  private readonly usersService: UsersService,
  private readonly prisma: PrismaService,
) {}
```

### 모듈 구성
```typescript
@Module({
  imports: [...],
  controllers: [...],
  providers: [...],
  exports: [...],
})
```

## 4. 에러 처리

### NestJS 내장 예외 사용
```typescript
throw new ConflictException('이미 존재하는 이메일입니다.');
throw new NotFoundException('사용자를 찾을 수 없습니다.');
throw new UnauthorizedException('인증되지 않은 사용자입니다.');
```

### 에러 메시지 규칙
- 한국어 사용
- 명확하고 구체적인 메시지
- 사용자 친화적인 표현

## 5. DTO 패턴

### 입력 DTO
```typescript
export class CreateUserDto {
  @ApiProperty({ description: '사용자 이메일', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
```

### 응답 DTO
```typescript
export class UserResponseDto {
  @ApiProperty({ description: '사용자 ID' })
  id: string;
  
  @ApiProperty({ description: '사용자 이메일' })
  email: string;
}
```

## 6. API 문서화

### 컨트롤러 레벨
```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {}
```

### 메서드 레벨
```typescript
@Post()
@ApiOperation({ summary: '새 사용자 생성' })
@ApiResponse({ status: HttpStatus.CREATED, description: '사용자가 성공적으로 생성되었습니다.' })
@ApiResponse({ status: HttpStatus.CONFLICT, description: '이미 존재하는 이메일입니다.' })
```

## 7. 테스트 작성

### 구조
```typescript
describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    // 테스트 환경 설정
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new user', async () => {
      // 테스트 구현
    });

    it('should throw ConflictException if email exists', async () => {
      // 테스트 구현
    });
  });
});
```

## 8. Import 순서

1. NestJS 관련 import
2. 외부 라이브러리 import
3. 내부 모듈 import (상대 경로)
4. 타입/인터페이스 import

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';
```

## 9. 코드 스타일

### async/await 사용
```typescript
async create(createUserDto: CreateUserDto): Promise<User> {
  const user = await this.prisma.user.create({
    data: createUserDto,
  });
  return user;
}
```

### 타입 명시
- 메서드 반환 타입 항상 명시
- 제네릭 타입 활용

### 로깅
```typescript
private readonly logger = new Logger(UsersService.name);

this.logger.log(`사용자 생성: ${user.email}`);
this.logger.error(`에러 발생: ${error.message}`, error.stack);
```

## 10. 보안 고려사항

- 민감한 정보는 응답에서 제외 (예: 비밀번호)
- 환경 변수로 설정값 관리
- 입력값 검증 필수
- SQL Injection 방지 (Prisma 사용)

## 11. 성능 최적화

- 필요한 필드만 select
- 페이지네이션 구현
- 캐싱 전략 적용 (필요시)
- N+1 쿼리 문제 방지

## 12. Git 커밋 메시지

```
feat: 사용자 인증 기능 추가
fix: 사용자 조회 시 null 참조 오류 수정
refactor: 사용자 서비스 메서드 구조 개선
test: 사용자 생성 API 테스트 추가
docs: API 문서 업데이트
```