-- Fix overly permissive RLS policy on alert_digest_queue
-- Drop the permissive policy and replace with proper user-scoped policies
DROP POLICY IF EXISTS "Service role can manage digest queue" ON public.alert_digest_queue;

-- Users can only insert their own alerts
CREATE POLICY "Users can insert their own digest alerts"
ON public.alert_digest_queue
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own alerts (for marking as included in digest)
CREATE POLICY "Users can update their own digest alerts"
ON public.alert_digest_queue
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own alerts
CREATE POLICY "Users can delete their own digest alerts"
ON public.alert_digest_queue
FOR DELETE
USING (auth.uid() = user_id);