-- Create table for price alerts
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet_id UUID REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  target_price DECIMAL NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('above', 'below')),
  current_price_at_creation DECIMAL NOT NULL,
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (wallet-based auth)
CREATE POLICY "Allow all operations for price_alerts"
ON public.price_alerts
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for price alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_alerts;