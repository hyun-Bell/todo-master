# TodoMaster

목표 달성을 위한 체계적인 계획 수립과 실행을 돕는 지능형 할 일 관리 시스템

## 🚀 프로젝트 개요

TodoMaster는 단순한 할 일 관리를 넘어, 사용자의 목표를 체계적으로 관리하고 달성할 수 있도록 돕는 플랫폼입니다. AI 기반 추천, 실시간 동기화, 그리고 직관적인 UI를 통해 생산성을 극대화합니다.

### 주요 기능

- 🎯 **계층적 목표 관리**: 목표 → 계획 → 체크포인트 구조로 체계적 관리
- 🤖 **AI 기반 추천**: 목표 달성을 위한 지능형 계획 수립 지원
- ⚡ **실시간 동기화**: WebSocket 기반 실시간 데이터 동기화
- 📊 **진행 상황 추적**: 시각적 대시보드와 분석 기능
- 🔐 **안전한 데이터 관리**: JWT 인증 및 데이터 암호화

## 🛠 기술 스택

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.IO + Supabase Realtime
- **Cache**: Redis (Upstash)
- **Authentication**: JWT

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Real-time**: Socket.IO Client

### Infrastructure
- **Container**: Docker & Docker Compose
- **Monitoring**: Health Check Endpoints
- **Documentation**: Swagger (REST API) + Custom WebSocket Docs

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18+
- pnpm 8+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis (로컬 또는 Upstash)

### 1. 프로젝트 클론

```bash
git clone https://github.com/yourusername/todo-master.git
cd todo-master
```

### 2. 환경 설정

#### Backend 환경 변수 설정

```bash
cd backend
cp .env.example .env
# .env 파일을 열어 필요한 값들을 설정하세요
```

주요 환경 변수:
- `DATABASE_URL`: PostgreSQL 연결 문자열
- `JWT_SECRET`: JWT 토큰 서명용 비밀 키
- `REDIS_URL` 또는 `UPSTASH_REDIS_URL`: Redis 연결 정보
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: Supabase 프로젝트 정보

#### Frontend 환경 변수 설정

```bash
cd ../frontend
cp .env.example .env.local
# .env.local 파일을 열어 백엔드 API URL 등을 설정하세요
```

### 3. Docker Compose로 시작 (권장)

프로젝트 루트에서:

```bash
# 모든 서비스 시작 (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 서비스 중지
docker-compose down
```

### 4. 로컬 개발 환경

#### Backend

```bash
cd backend
pnpm install

# 데이터베이스 마이그레이션
pnpm prisma migrate dev

# 개발 서버 실행
pnpm run start:dev
```

#### Frontend

```bash
cd frontend
pnpm install

# 개발 서버 실행
pnpm run dev
```

### 5. 접속 정보

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Documentation (Swagger): http://localhost:3000/api/docs
- Health Check: http://localhost:3000/health

## 📋 프로젝트 구조

```
todo-master/
├── backend/                 # NestJS 백엔드
│   ├── src/
│   │   ├── auth/           # 인증 모듈
│   │   ├── users/          # 사용자 관리
│   │   ├── goals/          # 목표 관리
│   │   ├── plans/          # 계획 관리
│   │   ├── websocket/      # WebSocket 게이트웨이
│   │   ├── realtime/       # 실시간 이벤트 처리
│   │   └── health/         # 헬스 체크
│   ├── prisma/             # 데이터베이스 스키마
│   ├── test/               # 테스트 파일
│   └── docs/               # API 문서
├── frontend/               # Next.js 프론트엔드
│   ├── app/                # App Router 페이지
│   ├── components/         # React 컴포넌트
│   ├── lib/                # 유틸리티 함수
│   └── public/             # 정적 파일
├── docker-compose.yml      # Docker Compose 설정
└── README.md              # 이 파일

```

## 🧪 테스트

### Backend 테스트

```bash
cd backend

# 단위 테스트
pnpm run test

# E2E 테스트
pnpm run test:e2e

# 테스트 커버리지
pnpm run test:cov

# WebSocket 수동 테스트
node test-websocket.js

# WebSocket 부하 테스트
node load-test-websocket.js 100
```

### Frontend 테스트

```bash
cd frontend

# 컴포넌트 테스트
pnpm run test

# E2E 테스트
pnpm run test:e2e
```

## 📚 문서

- [Backend API 문서](./backend/docs/README.md)
- [WebSocket API 문서](./backend/docs/websocket-api.md)
- [Frontend 문서](./frontend/docs/README.md)
- [아키텍처 문서](./docs/architecture.md)

## 🔧 개발 도구

### 추천 VS Code 확장

- ESLint
- Prettier
- Prisma
- Thunder Client (API 테스트)

### 유용한 명령어

```bash
# Prisma Studio (데이터베이스 GUI)
cd backend && pnpm prisma studio

# 데이터베이스 스키마 동기화
cd backend && pnpm prisma db push

# 코드 포맷팅
pnpm run format

# 린트 검사
pnpm run lint
```

## 🚀 배포

### Production 빌드

#### Backend

```bash
cd backend
pnpm run build
pnpm run start:prod
```

#### Frontend

```bash
cd frontend
pnpm run build
pnpm run start
```

### Docker를 사용한 배포

```bash
# Production 이미지 빌드
docker-compose -f docker-compose.prod.yml build

# Production 환경 실행
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 보안 고려사항

1. **환경 변수**: 모든 민감한 정보는 환경 변수로 관리
2. **HTTPS**: Production에서는 반드시 HTTPS 사용
3. **Rate Limiting**: API 및 WebSocket 연결에 대한 제한
4. **Input Validation**: 모든 사용자 입력 검증
5. **Authentication**: JWT 토큰 기반 인증

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 문의

프로젝트 관련 문의사항은 이슈 트래커를 통해 문의해 주세요.

---

Made with ❤️ by TodoMaster Team