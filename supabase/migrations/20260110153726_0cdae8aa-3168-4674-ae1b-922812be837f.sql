-- Remove email column from user_email_preferences table
-- Emails will now be fetched from Supabase Auth when needed (more secure)

ALTER TABLE public.user_email_preferences DROP COLUMN IF EXISTS email;