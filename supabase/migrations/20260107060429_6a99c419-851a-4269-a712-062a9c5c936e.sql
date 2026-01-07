-- Drop the INSERT policy to recreate with more flexible validation
DROP POLICY IF EXISTS "Create wallet with validation" ON public.user_wallets;

-- Create INSERT policy that accepts both legacy format and new 11-char format
-- The new format is 11 uppercase alphanumeric chars, legacy format is base64 encoded key
CREATE POLICY "Create wallet with validation"
ON public.user_wallets
FOR INSERT
WITH CHECK (
  -- Must have a public_key
  public_key IS NOT NULL AND
  -- Reasonable length limits (11 for new format, up to 200 for legacy base64)
  char_length(public_key) BETWEEN 11 AND 200 AND
  -- Name must be reasonable length if provided
  (name IS NULL OR char_length(name) BETWEEN 1 AND 100)
);