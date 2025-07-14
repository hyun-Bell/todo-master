-- RLS Policy Testing Script
-- This script tests the Row Level Security policies

-- Test 1: Create test users (simulate authentication)
-- Note: These tests should be run in Supabase SQL Editor with proper authentication

-- Test 2: Try to access another user's data (should fail)
-- This query should return empty result when executed by different user
SELECT * FROM public.goals WHERE user_id != auth.uid();

-- Test 3: Try to insert data with wrong user_id (should fail)
-- This should fail due to RLS policy
INSERT INTO public.goals (user_id, title, description) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Goal', 'This should fail');

-- Test 4: Insert valid data for authenticated user (should succeed)
-- This should succeed when user_id matches auth.uid()
INSERT INTO public.goals (user_id, title, description) 
VALUES (auth.uid(), 'My Valid Goal', 'This should succeed');

-- Test 5: Try to update another user's goal (should fail)
-- This should fail due to RLS policy
UPDATE public.goals 
SET title = 'Hacked Goal' 
WHERE user_id != auth.uid();

-- Test 6: Update own goal (should succeed)
-- This should succeed
UPDATE public.goals 
SET title = 'Updated Goal' 
WHERE user_id = auth.uid();

-- Test 7: Try to access plans through goal ownership
-- This should only return plans for user's own goals
SELECT p.* FROM public.plans p
JOIN public.goals g ON p.goal_id = g.id
WHERE g.user_id = auth.uid();

-- Test 8: Test cascading permissions for checkpoints
-- This should only return checkpoints for user's own plans/goals
SELECT c.* FROM public.checkpoints c
JOIN public.plans p ON c.plan_id = p.id
JOIN public.goals g ON p.goal_id = g.id
WHERE g.user_id = auth.uid();

-- Test 9: Test notification access
-- This should only return user's own notifications
SELECT * FROM public.notifications WHERE user_id = auth.uid();

-- Test 10: Test helper functions
-- These should return true for user's own data, false for others
SELECT public.user_owns_goal('your-goal-id-here');
SELECT public.user_owns_plan('your-plan-id-here');

-- Test 11: Test schema validation
-- Check if all policies are properly applied
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, cmd;

-- Test 12: Test table permissions
-- Check if RLS is enabled on all tables
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;