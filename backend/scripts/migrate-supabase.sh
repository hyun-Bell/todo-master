#!/bin/bash
# Supabase 데이터베이스 마이그레이션 스크립트

echo "🚀 Supabase 데이터베이스 마이그레이션 시작..."

# 환경 변수 로드
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
else
    echo "❌ .env.local 파일을 찾을 수 없습니다."
    exit 1
fi

# 1. 기존 마이그레이션 적용
echo "📦 기존 Prisma 마이그레이션 적용 중..."
npx prisma migrate deploy

# 2. Prisma Client 생성
echo "🔧 Prisma Client 생성 중..."
npx prisma generate

echo "✅ 마이그레이션 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. Supabase 대시보드에서 테이블이 생성되었는지 확인"
echo "2. Backend 서버 시작: pnpm start:dev"
echo "3. Frontend 앱 시작: pnpm start"