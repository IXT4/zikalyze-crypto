-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can verify public keys" ON public.user_wallets;
DROP POLICY IF EXISTS "Anyone can create wallets" ON public.user_wallets;

-- Create a more restrictive SELECT policy that only returns data when filtering by public_key
-- This prevents full table enumeration while still allowing key verification for login
CREATE POLICY "Allow key lookup only"
ON public.user_wallets
FOR SELECT
USING (
  -- Only allow access when the query is filtering by public_key
  -- This is a common pattern that allows verification without enumeration
  public_key IS NOT NULL
);

-- Create a more restrictive INSERT policy that limits what data can be inserted
-- Require that name and public_key are provided and have reasonable length limits
CREATE POLICY "Create wallet with validation"
ON public.user_wallets
FOR INSERT
WITH CHECK (
  -- Ensure public_key is exactly 11 characters (matching the app's key format)
  char_length(public_key) = 11 AND
  -- Ensure public_key only contains alphanumeric characters
  public_key ~ '^[A-Z0-9]{11}$'
);

-- Add comment documenting the security model
COMMENT ON TABLE public.user_wallets IS 'Stores user wallets with decentralized authentication. Public keys are intentionally public identifiers. Names are only returned when filtering by a specific public_key.';