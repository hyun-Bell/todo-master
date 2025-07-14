-- Sample data for TodoMaster database
-- This is for testing purposes only

-- Note: Users will be created automatically through Supabase Auth
-- The following is sample data that can be inserted after user registration

-- Sample goals (replace user_id with actual user UUID)
INSERT INTO public.goals (user_id, title, description, category, deadline, status, priority) VALUES
('00000000-0000-0000-0000-000000000000', '영어 실력 향상', '6개월 내에 토익 900점 달성하기', 'education', '2024-12-31 23:59:59+00', 'active', 'high'),
('00000000-0000-0000-0000-000000000000', '건강한 생활습관 만들기', '매일 운동하고 건강한 식단 유지하기', 'health', '2024-06-30 23:59:59+00', 'active', 'medium'),
('00000000-0000-0000-0000-000000000000', '새로운 기술 스택 학습', 'React Native와 Supabase 마스터하기', 'career', '2024-09-30 23:59:59+00', 'active', 'high');

-- Sample plans (replace goal_id with actual goal UUID)
INSERT INTO public.plans (goal_id, title, description, order_index, status, estimated_duration) VALUES
('00000000-0000-0000-0000-000000000001', '기초 문법 복습', '영어 기초 문법을 체계적으로 복습하기', 1, 'completed', 1440),
('00000000-0000-0000-0000-000000000001', '단어 암기', '토익 필수 단어 2000개 암기하기', 2, 'in_progress', 2880),
('00000000-0000-0000-0000-000000000001', '모의고사 풀기', '매주 토익 모의고사 풀고 분석하기', 3, 'pending', 720);

-- Sample checkpoints (replace plan_id with actual plan UUID)
INSERT INTO public.checkpoints (plan_id, title, description, is_completed, order_index) VALUES
('00000000-0000-0000-0000-000000000001', '1-5강 완료', '기초 문법 1-5강 학습 완료', true, 1),
('00000000-0000-0000-0000-000000000001', '6-10강 완료', '기초 문법 6-10강 학습 완료', true, 2),
('00000000-0000-0000-0000-000000000001', '11-15강 완료', '기초 문법 11-15강 학습 완료', false, 3);

-- Sample notifications (replace user_id with actual user UUID)
INSERT INTO public.notifications (user_id, type, title, message, is_read) VALUES
('00000000-0000-0000-0000-000000000000', 'reminder', '단어 암기 시간', '오늘의 단어 50개를 암기할 시간입니다.', false),
('00000000-0000-0000-0000-000000000000', 'achievement', '체크포인트 완료!', '기초 문법 1-5강을 완료했습니다. 축하합니다!', true),
('00000000-0000-0000-0000-000000000000', 'deadline', '목표 마감 임박', '영어 실력 향상 목표의 마감일이 30일 남았습니다.', false);