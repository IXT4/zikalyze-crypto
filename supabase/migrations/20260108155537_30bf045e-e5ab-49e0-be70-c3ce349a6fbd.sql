-- Fix security definer view issue by making it security invoker
DROP VIEW IF EXISTS public.ai_learning_stats;

CREATE VIEW public.ai_learning_stats 
WITH (security_invoker = true) AS
SELECT 
  symbol,
  COUNT(*) FILTER (WHERE was_correct IS NOT NULL) as total_feedback,
  COUNT(*) FILTER (WHERE was_correct = true) as correct_predictions,
  COUNT(*) FILTER (WHERE was_correct = false) as incorrect_predictions,
  ROUND(
    (COUNT(*) FILTER (WHERE was_correct = true)::numeric / 
    NULLIF(COUNT(*) FILTER (WHERE was_correct IS NOT NULL), 0) * 100), 1
  ) as accuracy_percentage,
  AVG(confidence) FILTER (WHERE was_correct = true) as avg_confidence_when_correct,
  AVG(confidence) FILTER (WHERE was_correct = false) as avg_confidence_when_incorrect
FROM public.analysis_history
GROUP BY symbol;

-- Grant access to the view
GRANT SELECT ON public.ai_learning_stats TO authenticated;