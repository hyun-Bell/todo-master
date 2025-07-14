-- Row Level Security (RLS) Policies for TodoMaster
-- Comprehensive security policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Users can only view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Prevent users from inserting into users table directly (handled by trigger)
CREATE POLICY "Prevent direct user insertion" ON public.users
    FOR INSERT WITH CHECK (false);

-- Goals table policies
-- Users can only view their own goals
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only create goals for themselves
CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own goals
CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own goals
CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Plans table policies
-- Users can only view plans for their own goals
CREATE POLICY "Users can view own plans" ON public.plans
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = plans.goal_id));

-- Users can only create plans for their own goals
CREATE POLICY "Users can insert own plans" ON public.plans
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = plans.goal_id));

-- Users can only update plans for their own goals
CREATE POLICY "Users can update own plans" ON public.plans
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = plans.goal_id))
    WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = plans.goal_id));

-- Users can only delete plans for their own goals
CREATE POLICY "Users can delete own plans" ON public.plans
    FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = plans.goal_id));

-- Checkpoints table policies
-- Users can only view checkpoints for their own plans
CREATE POLICY "Users can view own checkpoints" ON public.checkpoints
    FOR SELECT USING (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = (SELECT goal_id FROM public.plans WHERE plans.id = checkpoints.plan_id)));

-- Users can only create checkpoints for their own plans
CREATE POLICY "Users can insert own checkpoints" ON public.checkpoints
    FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = (SELECT goal_id FROM public.plans WHERE plans.id = checkpoints.plan_id)));

-- Users can only update checkpoints for their own plans
CREATE POLICY "Users can update own checkpoints" ON public.checkpoints
    FOR UPDATE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = (SELECT goal_id FROM public.plans WHERE plans.id = checkpoints.plan_id)))
    WITH CHECK (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = (SELECT goal_id FROM public.plans WHERE plans.id = checkpoints.plan_id)));

-- Users can only delete checkpoints for their own plans
CREATE POLICY "Users can delete own checkpoints" ON public.checkpoints
    FOR DELETE USING (auth.uid() = (SELECT user_id FROM public.goals WHERE goals.id = (SELECT goal_id FROM public.plans WHERE plans.id = checkpoints.plan_id)));

-- Notifications table policies
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only create notifications for themselves
CREATE POLICY "Users can insert own notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own notifications (mainly for marking as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Additional security measures
-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Revoke permissions from anonymous users for sensitive operations
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON public.users TO anon; -- Allow anonymous to read user profiles (optional)

-- Create function to check if user owns a goal (for better performance)
CREATE OR REPLACE FUNCTION public.user_owns_goal(goal_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.goals 
        WHERE id = goal_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user owns a plan (for better performance)
CREATE OR REPLACE FUNCTION public.user_owns_plan(plan_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.plans p
        JOIN public.goals g ON p.goal_id = g.id
        WHERE p.id = plan_id AND g.user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;