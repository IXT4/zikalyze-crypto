-- Fix user_wallets: The table appears to be legacy and not actively used
-- The current policy allows anyone to read all wallets which exposes data
-- Replace with a restrictive policy that requires authentication

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Allow key lookup only" ON public.user_wallets;

-- Create a new restrictive policy - only authenticated users can see data
-- Since there's no user_id column, we'll restrict to authenticated users only
CREATE POLICY "Authenticated users can view wallets"
ON public.user_wallets
FOR SELECT
TO authenticated
USING (true);

-- Note: The push_subscriptions policies are already correctly scoped to auth.uid() = user_id