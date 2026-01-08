-- Create analysis history table
CREATE TABLE public.analysis_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  change_24h NUMERIC NOT NULL,
  analysis_text TEXT NOT NULL,
  confidence INTEGER,
  bias TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public access for this app)
CREATE POLICY "Allow all operations for analysis_history"
ON public.analysis_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries by symbol
CREATE INDEX idx_analysis_history_symbol ON public.analysis_history(symbol);
CREATE INDEX idx_analysis_history_created_at ON public.analysis_history(created_at DESC);