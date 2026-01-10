-- Create AI learning data table for persistent adaptation
CREATE TABLE public.ai_learning_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Learned patterns
  trend_accuracy NUMERIC DEFAULT 0,
  avg_velocity NUMERIC DEFAULT 0,
  volatility NUMERIC DEFAULT 0,
  last_bias TEXT DEFAULT 'NEUTRAL',
  bias_changes INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  
  -- Price pattern memory
  support_levels NUMERIC[] DEFAULT '{}',
  resistance_levels NUMERIC[] DEFAULT '{}',
  avg_price_24h NUMERIC DEFAULT 0,
  price_range_24h NUMERIC DEFAULT 0,
  
  -- On-chain pattern memory
  whale_buy_threshold NUMERIC DEFAULT 60,
  whale_sell_threshold NUMERIC DEFAULT 40,
  exchange_flow_sensitivity NUMERIC DEFAULT 0.5,
  
  -- Confidence calibration
  confidence_adjustment NUMERIC DEFAULT 0,
  overconfidence_penalty NUMERIC DEFAULT 0,
  underconfidence_bonus NUMERIC DEFAULT 0,
  
  -- Learning metrics
  samples_collected INTEGER DEFAULT 0,
  learning_sessions INTEGER DEFAULT 0,
  last_learning_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint per user per symbol
  UNIQUE(user_id, symbol)
);

-- Enable RLS
ALTER TABLE public.ai_learning_data ENABLE ROW LEVEL SECURITY;

-- Users can only access their own learning data
CREATE POLICY "Users can view their own AI learning data"
ON public.ai_learning_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI learning data"
ON public.ai_learning_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI learning data"
ON public.ai_learning_data FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_learning_data_updated_at
BEFORE UPDATE ON public.ai_learning_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_ai_learning_data_user_symbol ON public.ai_learning_data(user_id, symbol);

-- Create global learning aggregates view (anonymous, for all users to benefit)
CREATE TABLE public.ai_global_learning (
  symbol TEXT PRIMARY KEY,
  
  -- Aggregated wisdom from all users
  avg_trend_accuracy NUMERIC DEFAULT 0,
  avg_volatility NUMERIC DEFAULT 0,
  consensus_bias TEXT DEFAULT 'NEUTRAL',
  bias_confidence NUMERIC DEFAULT 0,
  
  -- Price level consensus
  strong_support NUMERIC DEFAULT 0,
  strong_resistance NUMERIC DEFAULT 0,
  
  -- Global metrics
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_percentage NUMERIC DEFAULT 0,
  
  -- Contributors
  contributor_count INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS but allow public read for global learning
ALTER TABLE public.ai_global_learning ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view global AI learning"
ON public.ai_global_learning FOR SELECT
USING (true);

-- Only authenticated users can contribute (via function)
CREATE POLICY "Authenticated users can update global learning"
ON public.ai_global_learning FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert global learning"
ON public.ai_global_learning FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to update global learning from individual contributions
CREATE OR REPLACE FUNCTION public.contribute_to_global_learning(
  p_symbol TEXT,
  p_trend_accuracy NUMERIC,
  p_volatility NUMERIC,
  p_bias TEXT,
  p_was_correct BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.ai_global_learning (
    symbol,
    avg_trend_accuracy,
    avg_volatility,
    consensus_bias,
    total_predictions,
    correct_predictions,
    accuracy_percentage,
    contributor_count,
    updated_at
  ) VALUES (
    p_symbol,
    p_trend_accuracy,
    p_volatility,
    p_bias,
    1,
    CASE WHEN p_was_correct THEN 1 ELSE 0 END,
    CASE WHEN p_was_correct THEN 100 ELSE 0 END,
    1,
    now()
  )
  ON CONFLICT (symbol) DO UPDATE SET
    avg_trend_accuracy = (ai_global_learning.avg_trend_accuracy * 0.95 + p_trend_accuracy * 0.05),
    avg_volatility = (ai_global_learning.avg_volatility * 0.95 + p_volatility * 0.05),
    consensus_bias = p_bias,
    total_predictions = ai_global_learning.total_predictions + 1,
    correct_predictions = ai_global_learning.correct_predictions + CASE WHEN p_was_correct THEN 1 ELSE 0 END,
    accuracy_percentage = (ai_global_learning.correct_predictions + CASE WHEN p_was_correct THEN 1 ELSE 0 END)::NUMERIC / 
                          (ai_global_learning.total_predictions + 1)::NUMERIC * 100,
    contributor_count = ai_global_learning.contributor_count + 1,
    updated_at = now();
END;
$$;