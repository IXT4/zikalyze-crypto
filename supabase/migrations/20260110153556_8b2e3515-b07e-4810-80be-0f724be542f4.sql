-- Drop and recreate ai_learning_stats view with security_invoker
DROP VIEW IF EXISTS public.ai_learning_stats;

CREATE VIEW public.ai_learning_stats
WITH (security_invoker = true)
AS
SELECT 
  symbol,
  COUNT(*) FILTER (WHERE was_correct IS NOT NULL) as total_feedback,
  COUNT(*) FILTER (WHERE was_correct = true) as correct_predictions,
  COUNT(*) FILTER (WHERE was_correct = false) as incorrect_predictions,
  CASE 
    WHEN COUNT(*) FILTER (WHERE was_correct IS NOT NULL) > 0 
    THEN ROUND((COUNT(*) FILTER (WHERE was_correct = true)::numeric / 
                COUNT(*) FILTER (WHERE was_correct IS NOT NULL)) * 100, 2)
    ELSE NULL 
  END as accuracy_percentage,
  ROUND(AVG(confidence) FILTER (WHERE was_correct = true), 2) as avg_confidence_when_correct,
  ROUND(AVG(confidence) FILTER (WHERE was_correct = false), 2) as avg_confidence_when_incorrect
FROM public.analysis_history
WHERE was_correct IS NOT NULL
GROUP BY symbol;

-- Revoke all access from anon role
REVOKE ALL ON public.ai_learning_stats FROM anon;

-- Grant SELECT to authenticated users only (view respects analysis_history RLS via security_invoker)
GRANT SELECT ON public.ai_learning_stats TO authenticated;

COMMENT ON VIEW public.ai_learning_stats IS 'Aggregated AI learning statistics per symbol. Uses security_invoker to respect RLS on analysis_history table.';