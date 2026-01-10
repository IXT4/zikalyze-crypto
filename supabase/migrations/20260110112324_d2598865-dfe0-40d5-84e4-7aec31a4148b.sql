-- Fix security issues on views and tables

-- 1. Revoke anon access from all sensitive views
REVOKE ALL ON public.push_subscriptions_safe FROM anon;
REVOKE ALL ON public.user_2fa_safe FROM anon;
REVOKE ALL ON public.user_sessions_safe FROM anon;
REVOKE ALL ON public.ai_learning_stats FROM anon;

-- 2. Grant authenticated access to safe views (they use security_invoker so RLS on base tables applies)
GRANT SELECT ON public.push_subscriptions_safe TO authenticated;
GRANT SELECT ON public.user_2fa_safe TO authenticated;
GRANT SELECT ON public.user_sessions_safe TO authenticated;
GRANT SELECT ON public.ai_learning_stats TO authenticated;

-- 3. Restrict ai_global_learning updates to only allow via RPC function (prevent direct manipulation)
-- First drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can update global learning" ON public.ai_global_learning;
DROP POLICY IF EXISTS "Authenticated users can insert global learning" ON public.ai_global_learning;

-- Drop existing function first (all overloads)
DROP FUNCTION IF EXISTS public.contribute_to_global_learning(TEXT);
DROP FUNCTION IF EXISTS public.contribute_to_global_learning(TEXT, NUMERIC, NUMERIC, TEXT, NUMERIC, INTEGER, INTEGER);

-- Create a secure RPC function for contributing to global learning
-- This validates the data before inserting/updating
CREATE FUNCTION public.contribute_to_global_learning(
  p_symbol TEXT,
  p_avg_trend_accuracy NUMERIC,
  p_avg_volatility NUMERIC,
  p_consensus_bias TEXT,
  p_bias_confidence NUMERIC,
  p_total_predictions INTEGER,
  p_correct_predictions INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Ensure user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate inputs
  IF p_symbol IS NULL OR length(p_symbol) > 20 THEN
    RAISE EXCEPTION 'Invalid symbol';
  END IF;
  
  IF p_consensus_bias NOT IN ('BULLISH', 'BEARISH', 'NEUTRAL') THEN
    RAISE EXCEPTION 'Invalid bias value';
  END IF;

  IF p_bias_confidence < 0 OR p_bias_confidence > 100 THEN
    RAISE EXCEPTION 'Invalid confidence value';
  END IF;

  -- Upsert the global learning data
  INSERT INTO public.ai_global_learning (
    symbol, avg_trend_accuracy, avg_volatility, consensus_bias, 
    bias_confidence, total_predictions, correct_predictions,
    contributor_count, accuracy_percentage, updated_at
  )
  VALUES (
    upper(p_symbol), 
    LEAST(GREATEST(p_avg_trend_accuracy, 0), 1),
    GREATEST(p_avg_volatility, 0),
    p_consensus_bias,
    LEAST(GREATEST(p_bias_confidence, 0), 100),
    GREATEST(p_total_predictions, 0),
    GREATEST(p_correct_predictions, 0),
    1,
    CASE WHEN GREATEST(p_total_predictions, 0) > 0 
         THEN (GREATEST(p_correct_predictions, 0)::numeric / GREATEST(p_total_predictions, 1)) * 100 
         ELSE 0 END,
    now()
  )
  ON CONFLICT (symbol) DO UPDATE SET
    avg_trend_accuracy = (ai_global_learning.avg_trend_accuracy + EXCLUDED.avg_trend_accuracy) / 2,
    avg_volatility = (ai_global_learning.avg_volatility + EXCLUDED.avg_volatility) / 2,
    consensus_bias = EXCLUDED.consensus_bias,
    bias_confidence = (ai_global_learning.bias_confidence + EXCLUDED.bias_confidence) / 2,
    total_predictions = ai_global_learning.total_predictions + GREATEST(EXCLUDED.total_predictions - ai_global_learning.total_predictions, 0),
    correct_predictions = ai_global_learning.correct_predictions + GREATEST(EXCLUDED.correct_predictions - ai_global_learning.correct_predictions, 0),
    contributor_count = ai_global_learning.contributor_count + 1,
    accuracy_percentage = CASE 
      WHEN (ai_global_learning.total_predictions + GREATEST(EXCLUDED.total_predictions - ai_global_learning.total_predictions, 0)) > 0 
      THEN ((ai_global_learning.correct_predictions + GREATEST(EXCLUDED.correct_predictions - ai_global_learning.correct_predictions, 0))::numeric / 
            (ai_global_learning.total_predictions + GREATEST(EXCLUDED.total_predictions - ai_global_learning.total_predictions, 1))) * 100
      ELSE 0 END,
    updated_at = now();

  RETURN TRUE;
END;
$$;

-- 4. Only allow service role to directly insert/update ai_global_learning
-- (The function above uses SECURITY DEFINER to bypass this)
CREATE POLICY "Service role only for inserts" 
  ON public.ai_global_learning 
  FOR INSERT 
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Service role only for updates" 
  ON public.ai_global_learning 
  FOR UPDATE 
  TO authenticated
  USING (false);

-- Grant execute on the RPC function to authenticated users
GRANT EXECUTE ON FUNCTION public.contribute_to_global_learning(TEXT, NUMERIC, NUMERIC, TEXT, NUMERIC, INTEGER, INTEGER) TO authenticated;