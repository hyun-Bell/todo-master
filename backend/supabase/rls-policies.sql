-- Supabase RLS (Row Level Security) 정책 설정
-- 이 SQL을 Supabase 대시보드의 SQL Editor에서 실행하세요

-- 1. users 테이블 RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 프로필만 조회 가능
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (
    auth.uid()::text = supabase_id::text OR 
    id::text = auth.uid()::text
  );

-- 사용자는 자신의 프로필만 수정 가능
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (
    auth.uid()::text = supabase_id::text OR 
    id::text = auth.uid()::text
  );

-- 2. goals 테이블 RLS 활성화
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 목표만 조회 가능
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_id::text = auth.uid()::text
    )
  );

-- 사용자는 자신의 목표만 생성 가능
CREATE POLICY "Users can create own goals" ON goals
  FOR INSERT WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE supabase_id::text = auth.uid()::text
    )
  );

-- 사용자는 자신의 목표만 수정 가능
CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_id::text = auth.uid()::text
    )
  );

-- 사용자는 자신의 목표만 삭제 가능
CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (
    user_id IN (
      SELECT id FROM users WHERE supabase_id::text = auth.uid()::text
    )
  );

-- 3. plans 테이블 RLS 활성화
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 계획만 조회 가능
CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT USING (
    goal_id IN (
      SELECT id FROM goals WHERE user_id IN (
        SELECT id FROM users WHERE supabase_id::text = auth.uid()::text
      )
    )
  );

-- 나머지 테이블들도 동일한 패턴으로 설정...