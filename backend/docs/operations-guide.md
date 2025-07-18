# TodoMaster 운영 가이드

## 1. 시스템 시작 및 종료

### Docker Compose를 사용한 전체 시스템 관리

```bash
# 시스템 시작
docker-compose up -d

# 실시간 로그 모니터링
docker-compose logs -f

# 특정 서비스 로그만 보기
docker-compose logs -f backend
docker-compose logs -f frontend

# 시스템 종료
docker-compose down

# 볼륨 포함 완전 삭제 (주의!)
docker-compose down -v
```

### 개별 서비스 관리

```bash
# Backend만 재시작
docker-compose restart backend

# Frontend만 재시작
docker-compose restart frontend

# Redis만 재시작
docker-compose restart redis
```

## 2. 헬스 체크 및 모니터링

### 기본 헬스 체크

```bash
# 시스템 상태 확인
curl http://localhost:3000/health

# 상세 헬스 체크
curl http://localhost:3000/health/detailed
```

### 헬스 체크 응답 예시

```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "services": {
    "database": "up",
    "redis": "up",
    "supabase": "up"
  }
}
```

### 모니터링 스크립트

```bash
# 5초마다 헬스 체크
while true; do 
  curl -s http://localhost:3000/health | jq .
  sleep 5
done
```

## 3. 데이터베이스 관리

### 백업

```bash
# PostgreSQL 백업
docker exec todomaster-postgres pg_dump -U postgres todomaster > backup_$(date +%Y%m%d_%H%M%S).sql

# 백업 파일 압축
gzip backup_*.sql
```

### 복원

```bash
# 백업 파일에서 복원
gunzip < backup_20250101_120000.sql.gz | docker exec -i todomaster-postgres psql -U postgres todomaster
```

### 마이그레이션

```bash
# 새 마이그레이션 생성
cd backend
pnpm prisma migrate dev --name <migration_name>

# Production 마이그레이션 적용
pnpm prisma migrate deploy
```

### 데이터베이스 상태 확인

```bash
# Prisma Studio 실행
cd backend
pnpm prisma studio

# 데이터베이스 연결 테스트
docker exec todomaster-postgres psql -U postgres -c "SELECT 1"
```

## 4. 로그 관리

### 로그 위치

- Backend 로그: Docker 컨테이너 로그
- Frontend 로그: Docker 컨테이너 로그
- PostgreSQL 로그: `/var/lib/postgresql/data/pg_log/`
- Redis 로그: Docker 컨테이너 로그

### 로그 수집 및 분석

```bash
# 최근 100줄 로그 확인
docker-compose logs --tail=100 backend

# 특정 시간 이후 로그만 보기
docker-compose logs --since="2025-01-01T00:00:00" backend

# 로그를 파일로 저장
docker-compose logs backend > backend_logs_$(date +%Y%m%d).log
```

### 에러 로그 필터링

```bash
# Backend 에러만 필터링
docker-compose logs backend | grep -i error

# WebSocket 관련 로그만 보기
docker-compose logs backend | grep -i websocket
```

## 5. 성능 모니터링

### 시스템 리소스 확인

```bash
# Docker 컨테이너 리소스 사용량
docker stats

# 특정 컨테이너 상세 정보
docker inspect todomaster-backend
```

### WebSocket 연결 모니터링

```bash
# 현재 WebSocket 연결 수 확인 (로그 기반)
docker-compose logs backend | grep "connected" | wc -l

# 부하 테스트
cd backend
node load-test-websocket.js 100
```

## 6. 문제 해결

### 일반적인 문제와 해결 방법

#### 1. Backend가 시작되지 않음

```bash
# 환경 변수 확인
docker-compose config

# 데이터베이스 연결 확인
docker exec todomaster-postgres psql -U postgres -c "SELECT 1"

# 로그 확인
docker-compose logs backend
```

#### 2. WebSocket 연결 실패

```bash
# JWT 토큰 확인
# test-websocket.js 스크립트로 테스트
cd backend
node test-websocket.js

# Redis 연결 확인
docker exec todomaster-redis redis-cli ping
```

#### 3. 데이터베이스 연결 오류

```bash
# PostgreSQL 상태 확인
docker-compose ps postgres

# 연결 테스트
docker exec todomaster-postgres psql -U postgres -d todomaster -c "\l"

# 권한 확인
docker exec todomaster-postgres psql -U postgres -c "\du"
```

### 긴급 복구 절차

#### 1. 전체 시스템 재시작

```bash
# 1. 현재 상태 백업
docker-compose logs > emergency_logs_$(date +%Y%m%d_%H%M%S).log

# 2. 시스템 종료
docker-compose down

# 3. 캐시 정리
docker system prune -f

# 4. 시스템 재시작
docker-compose up -d

# 5. 헬스 체크
curl http://localhost:3000/health
```

#### 2. 데이터베이스 복구

```bash
# 1. 데이터베이스 컨테이너 재시작
docker-compose restart postgres

# 2. 연결 확인
docker exec todomaster-postgres psql -U postgres -c "SELECT 1"

# 3. 필요시 백업에서 복원
# (위의 백업/복원 섹션 참조)
```

## 7. 보안 관리

### SSL/TLS 설정

Production 환경에서는 반드시 HTTPS를 사용하세요:

```nginx
# nginx.conf 예시
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
    
    location /api {
        proxy_pass http://localhost:3000;
    }
}
```

### 방화벽 설정

```bash
# 필요한 포트만 열기
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 정기 보안 업데이트

```bash
# 의존성 보안 취약점 확인
cd backend
pnpm audit

cd ../frontend
pnpm audit

# Docker 이미지 업데이트
docker-compose pull
docker-compose up -d
```

## 8. 백업 및 복구 전략

### 자동 백업 스크립트

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# 데이터베이스 백업
docker exec todomaster-postgres pg_dump -U postgres todomaster | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 환경 설정 백업
cp backend/.env $BACKUP_DIR/env_backend_$DATE
cp frontend/.env.local $BACKUP_DIR/env_frontend_$DATE

# 7일 이상 된 백업 삭제
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

### Cron 작업 설정

```bash
# 매일 새벽 3시에 백업 실행
0 3 * * * /path/to/backup.sh
```

## 9. 스케일링

### 수평 스케일링

여러 Backend 인스턴스 실행:

```yaml
# docker-compose.scale.yml
services:
  backend:
    scale: 3
```

```bash
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d
```

### 로드 밸런싱

Nginx를 사용한 로드 밸런싱:

```nginx
upstream backend {
    server backend1:3000;
    server backend2:3000;
    server backend3:3000;
}
```

## 10. 모니터링 도구 통합

### Prometheus 메트릭

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
```

### Grafana 대시보드

```yaml
  grafana:
    image: grafana/grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## 연락처 및 지원

- 긴급 문제: [긴급 연락처]
- 일반 지원: [지원 이메일]
- 문서: [문서 링크]