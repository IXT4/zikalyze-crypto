-- Add user_id column to price_alerts for Supabase Auth integration
ALTER TABLE public.price_alerts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to analysis_history for Supabase Auth integration
ALTER TABLE public.analysis_history 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations for price_alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Allow all operations for analysis_history" ON public.analysis_history;

-- Create user-isolated RLS policies for price_alerts
CREATE POLICY "Users can view their own alerts"
ON public.price_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alerts"
ON public.price_alerts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
ON public.price_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
ON public.price_alerts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create user-isolated RLS policies for analysis_history
CREATE POLICY "Users can view their own analysis"
ON public.analysis_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own analysis"
ON public.analysis_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis"
ON public.analysis_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis"
ON public.analysis_history
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);