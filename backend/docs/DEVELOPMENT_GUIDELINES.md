# Todo Master Backend 개발 가이드라인

## 🎯 TypeScript/ESLint 점진적 품질 관리

### 현재 설정 철학

우리는 **개발 생산성**과 **코드 품질** 사이의 균형을 추구합니다. 초기 개발 단계에서는 생산성을 우선시하고, 점진적으로 품질 기준을 높여갑니다.

## 🔧 현재 설정 수준

### TypeScript 설정 (개발 친화적)
```typescript
// tsconfig.base.json - 완화된 설정
"strictPropertyInitialization": false  // DTO 클래스 편의성
"useUnknownInCatchVariables": false    // 개발 편의성
"noUnusedLocals": false               // 임시 변수 허용
"noUnusedParameters": false           // 인터페이스 구현 편의성
"exactOptionalPropertyTypes": false   // 타입 호환성 개선
"noUncheckedIndexedAccess": false     // 초기 개발 편의성
```

### ESLint 설정 (경고 중심)
```typescript
// 에러 → 경고로 완화된 규칙들
"@typescript-eslint/no-explicit-any": "warn"
"@typescript-eslint/no-unsafe-*": "warn"
"@typescript-eslint/prefer-nullish-coalescing": "warn"
"complexity": ["warn", 15]
"max-lines-per-function": ["warn", 100]
"max-params": ["warn", 6]
```

## 📈 점진적 강화 로드맵

### 1단계: 개발 단계 (현재)
**목표**: 빠른 프로토타이핑과 기능 구현

**특징**:
- 에러 대신 경고 사용
- 관대한 복잡도 허용
- any 타입 임시 허용
- 미사용 변수/매개변수 허용

**활용법**:
```bash
# 개발 중에는 경고 무시하고 진행 가능
pnpm run build    # ✅ 성공
pnpm run lint     # ⚠️ 경고만 표시
```

### 2단계: 안정화 단계 (향후)
**목표**: 기본 품질 기준 확립

**계획**:
- 핵심 경고를 에러로 전환
- 복잡도 기준 점진적 강화
- any 타입 제거 시작

**전환 기준**:
- MVP 완성 후
- 주요 기능 안정화 후
- 팀 코드 리뷰 프로세스 정착 후

### 3단계: 최적화 단계 (장기)
**목표**: 높은 품질 기준 달성

**계획**:
- 모든 타입 안전성 규칙 적용
- 엄격한 복잡도 제한
- 완전한 타입 커버리지

## 🛠️ 환경별 설정 분리 (계획)

### 개발 환경
```json
// tsconfig.dev.json (현재 설정 유지)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "strictPropertyInitialization": false,
    "noUnusedLocals": false
  }
}
```

### 스테이징 환경
```json
// tsconfig.staging.json (중간 수준)
{
  "extends": "./tsconfig.base.json", 
  "compilerOptions": {
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": false
  }
}
```

### 프로덕션 환경
```json
// tsconfig.prod.json (엄격한 설정)
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "strictPropertyInitialization": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## 🚀 Git Hooks 계획

### Pre-commit
```bash
# 기본 문법 검사만
pnpm run build     # TypeScript 컴파일 확인
pnpm run lint --fix # 자동 수정 가능한 경고들 수정
```

### Pre-push  
```bash
# 중간 수준 품질 검사
pnpm run test       # 유닛 테스트 실행
pnpm run lint       # 모든 경고 확인 (실패하지 않음)
```

### CI/CD Pipeline
```bash
# 높은 품질 기준 적용
pnpm run build:prod      # 엄격한 설정으로 빌드
pnpm run lint:strict     # 에러 수준 린트 검사
pnpm run test:coverage   # 테스트 커버리지 확인
```

## 📋 개발자 가이드

### 권장 워크플로우

1. **개발 시작**: 경고 무시하고 기능 구현에 집중
2. **기능 완성**: 해당 파일의 주요 경고들 정리
3. **PR 생성**: 새로 추가된 에러 체크
4. **코드 리뷰**: 품질 개선 제안
5. **배포 준비**: 점진적 엄격화 적용

### 경고 처리 우선순위

**높음** (즉시 수정 권장):
- `@typescript-eslint/no-unsafe-return`
- `complexity` > 20
- `max-lines-per-function` > 150

**중간** (시간 날 때 수정):
- `@typescript-eslint/no-explicit-any`
- `@typescript-eslint/prefer-nullish-coalescing`
- 미사용 변수/매개변수

**낮음** (리팩토링 시 수정):
- 네이밍 컨벤션
- 파라미터 프로퍼티 스타일
- 파일 구조 개선

## 🎯 팀 합의사항

1. **블로킹 금지**: 개발 단계에서는 린트/타입 오류로 진행 차단 X
2. **점진적 개선**: 새 기능 추가 시 기존 경고도 함께 정리
3. **교육 중심**: 강제보다는 가이드와 리뷰를 통한 개선
4. **유연성 유지**: 비즈니스 요구에 따라 기준 조정 가능

## 📊 품질 지표 추적

### 주간 모니터링
- ESLint 경고 수 변화
- TypeScript 컴파일 시간
- 테스트 커버리지
- 개발자 만족도

### 월간 검토
- 규칙 강화 가능성 평가
- 새로운 품질 도구 도입 검토
- 팀 피드백 수집 및 반영

---

**마지막 업데이트**: 2025년 1월 20일
**다음 검토 예정**: 2025년 2월 20일