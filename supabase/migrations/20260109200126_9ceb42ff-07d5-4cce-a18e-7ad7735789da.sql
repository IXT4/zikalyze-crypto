-- Create table to store user email preferences for digest emails
CREATE TABLE public.user_email_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  digest_frequency TEXT NOT NULL DEFAULT 'none' CHECK (digest_frequency IN ('none', 'daily', 'weekly')),
  digest_time INTEGER NOT NULL DEFAULT 9 CHECK (digest_time >= 0 AND digest_time <= 23),
  last_digest_sent_at TIMESTAMP WITH TIME ZONE,
  include_price_alerts BOOLEAN NOT NULL DEFAULT true,
  include_market_summary BOOLEAN NOT NULL DEFAULT true,
  include_sentiment BOOLEAN NOT NULL DEFAULT true,
  include_whale_activity BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own email preferences"
ON public.user_email_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences"
ON public.user_email_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences"
ON public.user_email_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_email_preferences_updated_at
BEFORE UPDATE ON public.user_email_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create table to track triggered alerts for digest
CREATE TABLE public.alert_digest_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  included_in_digest BOOLEAN NOT NULL DEFAULT false,
  digest_sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.alert_digest_queue ENABLE ROW LEVEL SECURITY;

-- Create policies for alert_digest_queue
CREATE POLICY "Users can view their own digest queue"
ON public.alert_digest_queue
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage digest queue"
ON public.alert_digest_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_alert_digest_queue_user_pending 
ON public.alert_digest_queue(user_id, included_in_digest) 
WHERE included_in_digest = false;