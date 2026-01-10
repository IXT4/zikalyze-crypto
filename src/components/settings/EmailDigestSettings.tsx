import { useState, useEffect } from "react";
import { 
  Mail, 
  Calendar,
  Clock,
  TrendingUp,
  Activity,
  Waves,
  BarChart3,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type DigestFrequency = 'none' | 'daily' | 'weekly';

interface EmailPreferences {
  digest_frequency: DigestFrequency;
  digest_time: number;
  include_price_alerts: boolean;
  include_market_summary: boolean;
  include_sentiment: boolean;
  include_whale_activity: boolean;
}

const DEFAULT_PREFERENCES: EmailPreferences = {
  digest_frequency: 'none',
  digest_time: 9,
  include_price_alerts: true,
  include_market_summary: true,
  include_sentiment: true,
  include_whale_activity: true,
};

const EmailDigestSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<EmailPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalPrefs, setOriginalPrefs] = useState<EmailPreferences>(DEFAULT_PREFERENCES);

  // Fetch existing preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id || !user?.email) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_email_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching email preferences:', error);
        }

        if (data) {
          const prefs: EmailPreferences = {
            digest_frequency: data.digest_frequency as DigestFrequency,
            digest_time: data.digest_time,
            include_price_alerts: data.include_price_alerts,
            include_market_summary: data.include_market_summary,
            include_sentiment: data.include_sentiment,
            include_whale_activity: data.include_whale_activity,
          };
          setPreferences(prefs);
          setOriginalPrefs(prefs);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [user?.id, user?.email]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(preferences) !== JSON.stringify(originalPrefs);
    setHasChanges(changed);
  }, [preferences, originalPrefs]);

  const handleSave = async () => {
    if (!user?.id || !user?.email) {
      toast({
        title: "Not authenticated",
        description: "Please log in to save email preferences.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('user_email_preferences')
        .upsert({
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setOriginalPrefs(preferences);
      toast({
        title: "Email preferences saved",
        description: preferences.digest_frequency === 'none' 
          ? "Email digests have been disabled."
          : `You'll receive ${preferences.digest_frequency} digests at ${preferences.digest_time}:00 UTC.`,
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast({
        title: "Failed to save",
        description: "Could not save email preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof EmailPreferences>(key: K, value: EmailPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const contentTypes = [
    {
      key: "include_price_alerts" as const,
      label: "Price Alerts",
      description: "Your triggered price target alerts",
      icon: TrendingUp,
      color: "text-success",
    },
    {
      key: "include_market_summary" as const,
      label: "Market Summary",
      description: "BTC, ETH prices & top movers",
      icon: BarChart3,
      color: "text-primary",
    },
    {
      key: "include_sentiment" as const,
      label: "Sentiment Analysis",
      description: "Fear & Greed and market mood",
      icon: Activity,
      color: "text-chart-cyan",
    },
    {
      key: "include_whale_activity" as const,
      label: "Whale Activity",
      description: "Large transaction alerts",
      icon: Waves,
      color: "text-warning",
    },
  ];

  const timeOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString(),
    label: `${i.toString().padStart(2, '0')}:00 UTC`,
  }));

  return (
    <div className="space-y-6">
      {/* Frequency Selection */}
      <div>
        <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Digest
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Receive a summary of your alerts and market movements via email
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {(['none', 'daily', 'weekly'] as DigestFrequency[]).map((freq) => (
            <button
              key={freq}
              onClick={() => updatePreference('digest_frequency', freq)}
              className={cn(
                "p-4 rounded-xl border-2 text-center transition-all",
                preferences.digest_frequency === freq
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30 hover:bg-secondary/50"
              )}
            >
              <div className={cn(
                "mx-auto mb-2 h-10 w-10 rounded-full flex items-center justify-center",
                preferences.digest_frequency === freq ? "bg-primary/20" : "bg-secondary"
              )}>
                {freq === 'none' ? (
                  <AlertCircle className={cn("h-5 w-5", preferences.digest_frequency === freq ? "text-primary" : "text-muted-foreground")} />
                ) : freq === 'daily' ? (
                  <Calendar className={cn("h-5 w-5", preferences.digest_frequency === freq ? "text-primary" : "text-muted-foreground")} />
                ) : (
                  <Calendar className={cn("h-5 w-5", preferences.digest_frequency === freq ? "text-primary" : "text-muted-foreground")} />
                )}
              </div>
              <div className={cn(
                "font-medium",
                preferences.digest_frequency === freq ? "text-foreground" : "text-muted-foreground"
              )}>
                {freq === 'none' ? 'Disabled' : freq === 'daily' ? 'Daily' : 'Weekly'}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {freq === 'none' ? 'No emails' : freq === 'daily' ? 'Every day' : 'Every Sunday'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Selection (only shown when digest is enabled) */}
      {preferences.digest_frequency !== 'none' && (
        <>
          <div className="p-4 rounded-xl bg-secondary/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium text-foreground">Delivery Time</div>
                  <div className="text-sm text-muted-foreground">When to send your digest</div>
                </div>
              </div>
              <Select 
                value={preferences.digest_time.toString()} 
                onValueChange={(v) => updatePreference('digest_time', parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content Types */}
          <div>
            <h4 className="text-md font-semibold text-foreground mb-3">
              Digest Content
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Choose what to include in your email digest
            </p>

            <div className="space-y-3">
              {contentTypes.map((content) => (
                <div
                  key={content.key}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl transition-all",
                    preferences[content.key]
                      ? "bg-secondary/70 border border-border"
                      : "bg-secondary/30 border border-transparent opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <content.icon className={cn("h-5 w-5", content.color)} />
                    <div>
                      <div className="font-medium text-foreground">{content.label}</div>
                      <div className="text-xs text-muted-foreground">{content.description}</div>
                    </div>
                  </div>
                  <Switch
                    checked={preferences[content.key]}
                    onCheckedChange={(checked) => updatePreference(content.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Status Indicator */}
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg text-sm",
        preferences.digest_frequency === 'none' 
          ? "bg-muted/50 text-muted-foreground" 
          : "bg-success/10 text-success"
      )}>
        {preferences.digest_frequency === 'none' ? (
          <>
            <AlertCircle className="h-4 w-4" />
            Email digests are currently disabled
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            {preferences.digest_frequency === 'daily' ? 'Daily' : 'Weekly'} digest scheduled for {preferences.digest_time}:00 UTC
          </>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="gap-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Email Settings
        </Button>
      </div>
    </div>
  );
};

export default EmailDigestSettings;
