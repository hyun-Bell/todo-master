# 테스트 데이터베이스 설정 가이드

## 1. 테스트 데이터베이스 생성

```bash
# PostgreSQL에 접속
psql -U postgres

# 테스트 데이터베이스 생성
CREATE DATABASE todomaster_test;

# 권한 부여
GRANT ALL PRIVILEGES ON DATABASE todomaster_test TO postgres;

# 종료
\q
```

## 2. 테스트용 환경 변수 설정

```bash
# .env.test 파일 생성
cat > .env.test << EOF
NODE_ENV=test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todomaster_test?schema=public"
JWT_SECRET=test-secret
REDIS_URL=redis://localhost:6379
EOF
```

## 3. 테스트 데이터베이스 마이그레이션

```bash
# 테스트 환경으로 마이그레이션 실행
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todomaster_test?schema=public" npx prisma migrate deploy

# 또는 스크립트로 추가
# package.json에 추가:
"prisma:test:deploy": "DATABASE_URL=\"postgresql://postgres:postgres@localhost:5432/todomaster_test?schema=public\" prisma migrate deploy"
```

## 4. 테스트 실행 전 확인사항

1. PostgreSQL이 실행 중인지 확인
2. Redis가 실행 중인지 확인 (선택사항)
3. 테스트 데이터베이스가 생성되었는지 확인
4. 마이그레이션이 적용되었는지 확인

## 5. 테스트 실행

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 특정 E2E 테스트만 실행
npm run test:e2e -- goals.e2e-spec.ts
```

## 6. 문제 해결

### 데이터베이스 연결 오류
```bash
# 연결 테스트
psql -U postgres -d todomaster_test -c "SELECT 1"
```

### 마이그레이션 오류
```bash
# 스키마 재생성
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/todomaster_test?schema=public" npx prisma db push --force-reset
```

### 테스트 후 정리
```bash
# 테스트 데이터 정리
psql -U postgres -d todomaster_test -c "TRUNCATE TABLE goals, plans, users CASCADE"
```