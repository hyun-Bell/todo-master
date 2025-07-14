# TodoMaster Database Schema

## 개요
이 디렉터리는 TodoMaster 앱의 Supabase PostgreSQL 데이터베이스 스키마와 관련 파일들을 포함합니다.

## 파일 구조

### `schema.sql`
- 메인 데이터베이스 스키마 정의
- 모든 테이블, 인덱스, 트리거, 함수 포함
- Supabase SQL 에디터에서 실행

### `rls_policies.sql`
- Row Level Security (RLS) 정책 정의
- 사용자별 데이터 접근 권한 제어
- schema.sql 실행 후 적용

### `sample_data.sql`
- 테스트용 샘플 데이터
- 개발/테스트 환경에서만 사용

## 데이터베이스 스키마

### 테이블 구조

#### 1. users
- `id`: UUID (auth.users 참조)
- `email`: 사용자 이메일
- `full_name`: 사용자 전체 이름
- `avatar_url`: 프로필 이미지 URL
- `created_at`, `updated_at`: 생성/수정 시간

#### 2. goals
- `id`: UUID (Primary Key)
- `user_id`: 사용자 ID (users 테이블 참조)
- `title`: 목표 제목
- `description`: 목표 설명
- `category`: 목표 카테고리
- `deadline`: 마감일
- `status`: 상태 (active, completed, paused, cancelled)
- `priority`: 우선순위 (low, medium, high)
- `created_at`, `updated_at`: 생성/수정 시간

#### 3. plans
- `id`: UUID (Primary Key)
- `goal_id`: 목표 ID (goals 테이블 참조)
- `title`: 플랜 제목
- `description`: 플랜 설명
- `order_index`: 순서
- `status`: 상태 (pending, in_progress, completed, cancelled)
- `estimated_duration`: 예상 소요 시간 (분)
- `created_at`, `updated_at`: 생성/수정 시간

#### 4. checkpoints
- `id`: UUID (Primary Key)
- `plan_id`: 플랜 ID (plans 테이블 참조)
- `title`: 체크포인트 제목
- `description`: 체크포인트 설명
- `is_completed`: 완료 여부
- `completed_at`: 완료 시간
- `order_index`: 순서
- `created_at`, `updated_at`: 생성/수정 시간

#### 5. notifications
- `id`: UUID (Primary Key)
- `user_id`: 사용자 ID (users 테이블 참조)
- `type`: 알림 타입 (reminder, achievement, deadline, system)
- `title`: 알림 제목
- `message`: 알림 메시지
- `is_read`: 읽음 여부
- `data`: 추가 데이터 (JSONB)
- `created_at`, `updated_at`: 생성/수정 시간

## 설정 방법

### 1. Supabase 프로젝트 생성
1. [Supabase 대시보드](https://app.supabase.com)에 접속
2. 새 프로젝트 생성
3. 프로젝트 URL과 anon key 복사

### 2. 환경 변수 설정
```bash
# frontend/TodoMaster/.env 파일에 추가
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. 데이터베이스 스키마 적용
1. Supabase 대시보드 → SQL Editor
2. `schema.sql` 파일 내용 복사하여 실행
3. `rls_policies.sql` 파일 내용 복사하여 실행

### 4. 테스트 데이터 삽입 (선택사항)
1. 실제 사용자 계정으로 로그인 후
2. `sample_data.sql`에서 UUID 값을 실제 사용자 ID로 변경
3. SQL 실행

## 성능 최적화

### 인덱스
- 자주 조회되는 컬럼에 인덱스 생성
- `user_id`, `goal_id`, `plan_id` 등 외래키 인덱스
- 상태 필드(`status`) 인덱스

### 트리거
- `updated_at` 자동 업데이트 트리거
- 새 사용자 자동 등록 트리거

## 보안

### Row Level Security (RLS)
- 모든 테이블에 RLS 활성화
- 사용자별 데이터 접근 권한 제어
- 인증된 사용자만 본인 데이터 접근 가능

### 정책 상세

#### 1. Users 테이블
- **SELECT**: 본인 프로필만 조회 가능
- **UPDATE**: 본인 프로필만 수정 가능
- **INSERT**: 직접 삽입 차단 (트리거를 통해서만 가능)

#### 2. Goals 테이블
- **SELECT**: 본인의 목표만 조회 가능
- **INSERT**: 본인 ID로만 목표 생성 가능
- **UPDATE**: 본인의 목표만 수정 가능
- **DELETE**: 본인의 목표만 삭제 가능

#### 3. Plans 테이블
- **SELECT**: 본인 목표의 플랜만 조회 가능
- **INSERT**: 본인 목표에만 플랜 생성 가능
- **UPDATE**: 본인 목표의 플랜만 수정 가능
- **DELETE**: 본인 목표의 플랜만 삭제 가능

#### 4. Checkpoints 테이블
- **SELECT**: 본인 플랜의 체크포인트만 조회 가능
- **INSERT**: 본인 플랜에만 체크포인트 생성 가능
- **UPDATE**: 본인 플랜의 체크포인트만 수정 가능
- **DELETE**: 본인 플랜의 체크포인트만 삭제 가능

#### 5. Notifications 테이블
- **SELECT**: 본인의 알림만 조회 가능
- **INSERT**: 본인에게만 알림 생성 가능
- **UPDATE**: 본인의 알림만 수정 가능 (읽음 상태 등)
- **DELETE**: 본인의 알림만 삭제 가능

### 정책 예시
```sql
-- 사용자는 본인의 목표만 조회 가능
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 본인 목표에만 플랜 생성 가능
CREATE POLICY "Users can insert own plans" ON public.plans
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = plans.goal_id));
```

### 헬퍼 함수
- `public.user_owns_goal(goal_id)`: 사용자가 목표를 소유하는지 확인
- `public.user_owns_plan(plan_id)`: 사용자가 플랜을 소유하는지 확인

### 테스트
- `rls_test.sql`: SQL 레벨 RLS 정책 테스트
- `testRLSPolicies()`: 클라이언트 측 RLS 정책 테스트 함수

## 타입 정의
- `frontend/TodoMaster/src/types/database.ts`에 TypeScript 타입 정의
- Supabase 클라이언트와 타입 안전성 제공
- 자동 완성 및 타입 검사 지원