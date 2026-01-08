-- Create a table to track login attempts for rate limiting
CREATE TABLE public.login_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    ip_address TEXT,
    attempted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    success BOOLEAN NOT NULL DEFAULT false
);

-- Create an index for efficient lookups
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);
CREATE INDEX idx_login_attempts_ip_time ON public.login_attempts (ip_address, attempted_at DESC) WHERE ip_address IS NOT NULL;

-- Enable RLS but allow public inserts (needed for tracking before auth)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert attempts (needed before authentication)
CREATE POLICY "Allow insert attempts"
ON public.login_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only allow reading own attempts or via service role
CREATE POLICY "Service role can read all"
ON public.login_attempts
FOR SELECT
TO service_role
USING (true);

-- Create a function to check rate limits (callable via RPC)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_email TEXT,
    p_ip_address TEXT DEFAULT NULL,
    p_max_attempts INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email_attempts INTEGER;
    v_ip_attempts INTEGER;
    v_is_blocked BOOLEAN := false;
    v_retry_after INTEGER := 0;
    v_oldest_attempt TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Count recent failed attempts by email
    SELECT COUNT(*), MIN(attempted_at)
    INTO v_email_attempts, v_oldest_attempt
    FROM public.login_attempts
    WHERE email = LOWER(p_email)
      AND attempted_at > (now() - (p_window_minutes || ' minutes')::INTERVAL)
      AND success = false;

    -- Check if blocked
    IF v_email_attempts >= p_max_attempts THEN
        v_is_blocked := true;
        -- Calculate retry_after in seconds
        v_retry_after := EXTRACT(EPOCH FROM (v_oldest_attempt + (p_window_minutes || ' minutes')::INTERVAL - now()))::INTEGER;
        IF v_retry_after < 0 THEN
            v_retry_after := 0;
            v_is_blocked := false;
        END IF;
    END IF;

    -- Also check IP if provided
    IF p_ip_address IS NOT NULL AND NOT v_is_blocked THEN
        SELECT COUNT(*)
        INTO v_ip_attempts
        FROM public.login_attempts
        WHERE ip_address = p_ip_address
          AND attempted_at > (now() - (p_window_minutes || ' minutes')::INTERVAL)
          AND success = false;

        IF v_ip_attempts >= (p_max_attempts * 2) THEN
            v_is_blocked := true;
            v_retry_after := p_window_minutes * 60;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'allowed', NOT v_is_blocked,
        'attempts', v_email_attempts,
        'max_attempts', p_max_attempts,
        'retry_after', v_retry_after
    );
END;
$$;

-- Create a function to record login attempts
CREATE OR REPLACE FUNCTION public.record_login_attempt(
    p_email TEXT,
    p_success BOOLEAN,
    p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.login_attempts (email, ip_address, success)
    VALUES (LOWER(p_email), p_ip_address, p_success);

    -- If successful, delete old failed attempts for this email
    IF p_success THEN
        DELETE FROM public.login_attempts
        WHERE email = LOWER(p_email)
          AND success = false;
    END IF;

    -- Clean up old attempts (older than 24 hours)
    DELETE FROM public.login_attempts
    WHERE attempted_at < (now() - INTERVAL '24 hours');
END;
$$;