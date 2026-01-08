-- Fix public API access to sensitive tables
-- These tables have RLS policies that block access, but we also need to revoke 
-- the ability for anonymous users to even attempt to query them via the API

-- 1. Revoke all privileges from anon role on sensitive tables
REVOKE ALL ON public.login_attempts FROM anon;
REVOKE ALL ON public.push_subscriptions FROM anon;
REVOKE ALL ON public.user_wallets FROM anon;

-- 2. For push_subscriptions, authenticated users still need access via RLS
-- Keep authenticated access but ensure it's properly controlled by RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- 3. For login_attempts and user_wallets, no direct access should be allowed
-- Access is handled through SECURITY DEFINER functions for login_attempts
-- user_wallets is a legacy table that should have no access

-- Ensure the authenticated role has proper grants on tables they need
-- analysis_history and price_alerts need authenticated access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_alerts TO authenticated;