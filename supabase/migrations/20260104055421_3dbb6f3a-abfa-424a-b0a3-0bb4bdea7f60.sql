-- Create table for storing user wallets (public keys)
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to check if a public key exists (for login)
CREATE POLICY "Anyone can verify public keys"
ON public.user_wallets
FOR SELECT
USING (true);

-- Allow anyone to create a wallet (for signup)
CREATE POLICY "Anyone can create wallets"
ON public.user_wallets
FOR INSERT
WITH CHECK (true);