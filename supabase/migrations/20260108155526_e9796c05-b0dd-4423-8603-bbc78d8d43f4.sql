-- Add feedback columns to analysis_history table for AI learning
ALTER TABLE public.analysis_history 
ADD COLUMN IF NOT EXISTS was_correct boolean DEFAULT NULL,
ADD COLUMN IF NOT EXISTS feedback_at timestamp with time zone DEFAULT NULL;

-- Create an index for faster feedback queries
CREATE INDEX IF NOT EXISTS idx_analysis_history_feedback ON public.analysis_history(symbol, was_correct) WHERE was_correct IS NOT NULL;

-- Create a view for AI learning stats
CREATE OR REPLACE VIEW public.ai_learning_stats AS
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