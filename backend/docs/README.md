# TodoMaster Backend Documentation

## Overview

TodoMaster 백엔드는 NestJS 프레임워크로 구축된 RESTful API와 WebSocket 기반 실시간 통신을 제공합니다.

## Documentation Index

### API Documentation

1. **[WebSocket API](./websocket-api.md)**
   - 실시간 통신을 위한 Socket.IO 기반 API
   - 인증, 구독, 실시간 이벤트 처리

2. **REST API** (Swagger)
   - 개발 서버 실행 후 http://localhost:3000/api/docs 접속
   - 모든 REST 엔드포인트의 상세 문서 제공

### Architecture Documentation

3. **[Architecture Overview](./architecture.md)**
   - 시스템 아키텍처
   - 모듈 구조
   - 데이터 흐름

4. **[Database Schema](./database-schema.md)**
   - Prisma 스키마 정의
   - 엔티티 관계도
   - 인덱스 및 제약조건

### Development Guides

5. **[Development Setup](./development-setup.md)**
   - 개발 환경 설정
   - 환경 변수 구성
   - 로컬 개발 가이드

6. **[Testing Guide](./testing-guide.md)**
   - 단위 테스트
   - 통합 테스트
   - E2E 테스트
   - WebSocket 테스트

### Operations

7. **[Deployment Guide](./deployment-guide.md)**
   - 프로덕션 배포
   - Docker 컨테이너화
   - 환경별 설정

8. **[Monitoring & Logging](./monitoring.md)**
   - 로깅 전략
   - 성능 모니터링
   - 에러 추적

## Quick Links

- [프로젝트 루트 README](../../README.md)
- [프론트엔드 문서](../../frontend/docs/README.md)
- [API 문서 (Swagger)](http://localhost:3000/api/docs)

## API Endpoints Overview

### Authentication
- `POST /api/v1/auth/register` - 회원가입
- `POST /api/v1/auth/login` - 로그인
- `POST /api/v1/auth/refresh` - 토큰 갱신
- `POST /api/v1/auth/logout` - 로그아웃

### Users
- `GET /api/v1/users/profile` - 프로필 조회
- `PATCH /api/v1/users/profile` - 프로필 수정
- `DELETE /api/v1/users/account` - 계정 삭제

### Goals
- `GET /api/v1/goals` - 목표 목록 조회
- `POST /api/v1/goals` - 목표 생성
- `GET /api/v1/goals/:id` - 목표 상세 조회
- `PATCH /api/v1/goals/:id` - 목표 수정
- `DELETE /api/v1/goals/:id` - 목표 삭제

### Plans
- `GET /api/v1/plans` - 계획 목록 조회
- `POST /api/v1/plans` - 계획 생성
- `GET /api/v1/plans/:id` - 계획 상세 조회
- `PATCH /api/v1/plans/:id` - 계획 수정
- `DELETE /api/v1/plans/:id` - 계획 삭제

### Health Check
- `GET /health` - 기본 헬스 체크
- `GET /health/detailed` - 상세 헬스 체크

### WebSocket (Socket.IO)
- `ws://localhost:3000/realtime` - 실시간 통신 엔드포인트

## Environment Variables

필수 환경 변수 목록은 [.env.example](../.env.example) 파일을 참조하세요.

주요 환경 변수:
- `DATABASE_URL` - PostgreSQL 연결 문자열
- `JWT_SECRET` - JWT 토큰 서명 키
- `REDIS_URL` - Redis 연결 URL
- `SUPABASE_URL` - Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY` - Supabase 익명 키

## Development Commands

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm run start:dev

# 프로덕션 빌드
pnpm run build

# 프로덕션 서버 실행
pnpm run start:prod

# 테스트 실행
pnpm run test
pnpm run test:e2e
pnpm run test:cov

# 린트 및 포맷
pnpm run lint
pnpm run format
```