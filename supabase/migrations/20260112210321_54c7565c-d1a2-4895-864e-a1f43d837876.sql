-- Fix RLS policies for login_attempts table
-- Users should be able to view their own login attempts via the function
GRANT SELECT ON public.login_attempts TO authenticated;

-- Fix RLS policies for user_2fa table
-- Users should only access their own 2FA settings
DROP POLICY IF EXISTS "Users can view own 2fa" ON public.user_2fa;
DROP POLICY IF EXISTS "Users can insert own 2fa" ON public.user_2fa;
DROP POLICY IF EXISTS "Users can update own 2fa" ON public.user_2fa;
DROP POLICY IF EXISTS "Users can delete own 2fa" ON public.user_2fa;

CREATE POLICY "Users can view own 2fa" ON public.user_2fa
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own 2fa" ON public.user_2fa
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own 2fa" ON public.user_2fa
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own 2fa" ON public.user_2fa
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for user_sessions table
DROP POLICY IF EXISTS "Users can view own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.user_sessions;

CREATE POLICY "Users can view own sessions" ON public.user_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for push_subscriptions table
DROP POLICY IF EXISTS "Users can view own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view own push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for user_email_preferences table
DROP POLICY IF EXISTS "Users can view own email preferences" ON public.user_email_preferences;
DROP POLICY IF EXISTS "Users can insert own email preferences" ON public.user_email_preferences;
DROP POLICY IF EXISTS "Users can update own email preferences" ON public.user_email_preferences;
DROP POLICY IF EXISTS "Users can delete own email preferences" ON public.user_email_preferences;

CREATE POLICY "Users can view own email preferences" ON public.user_email_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences" ON public.user_email_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences" ON public.user_email_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email preferences" ON public.user_email_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- Fix RLS policies for alert_digest_queue table
DROP POLICY IF EXISTS "Users can view own alert digest" ON public.alert_digest_queue;
DROP POLICY IF EXISTS "Users can insert own alert digest" ON public.alert_digest_queue;
DROP POLICY IF EXISTS "Users can update own alert digest" ON public.alert_digest_queue;
DROP POLICY IF EXISTS "Users can delete own alert digest" ON public.alert_digest_queue;

CREATE POLICY "Users can view own alert digest" ON public.alert_digest_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alert digest" ON public.alert_digest_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alert digest" ON public.alert_digest_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alert digest" ON public.alert_digest_queue
  FOR DELETE USING (auth.uid() = user_id);