import { useState, useEffect } from "react";
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Target,
  Waves,
  Save,
  RotateCcw
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSettings, NotificationAlertSettings } from "@/hooks/useSettings";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const NotificationSettings = () => {
  const { settings, saveSettings } = useSettings();
  const { toast } = useToast();
  
  // Local state for editing
  const [localSettings, setLocalSettings] = useState<NotificationAlertSettings>(
    settings.notificationAlerts
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when settings load
  useEffect(() => {
    setLocalSettings(settings.notificationAlerts);
  }, [settings.notificationAlerts]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings.notificationAlerts);
    setHasChanges(changed);
  }, [localSettings, settings.notificationAlerts]);

  const handleToggle = (key: keyof NotificationAlertSettings) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleThresholdChange = (key: keyof NotificationAlertSettings, value: number) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = () => {
    saveSettings({ notificationAlerts: localSettings });
    toast({
      title: "Notification settings saved",
      description: "Your alert preferences have been updated.",
    });
  };

  const handleReset = () => {
    const defaults: NotificationAlertSettings = {
      priceAlerts: true,
      priceSurges: true,
      priceDrops: true,
      sentimentShifts: true,
      whaleActivity: true,
      volumeSpikes: true,
      priceChangeThreshold: 5,
      volumeSpikeThreshold: 50,
      sentimentShiftThreshold: 15,
      whaleTransactionThreshold: 1,
    };
    setLocalSettings(defaults);
    saveSettings({ notificationAlerts: defaults });
    toast({
      title: "Settings reset",
      description: "Notification settings restored to defaults.",
    });
  };

  const alertTypes = [
    {
      key: "priceAlerts" as const,
      label: "Price Target Alerts",
      description: "When your price targets are hit",
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      key: "priceSurges" as const,
      label: "Price Surges",
      description: "Significant upward price movements",
      icon: TrendingUp,
      color: "text-success",
      bgColor: "bg-success/20",
    },
    {
      key: "priceDrops" as const,
      label: "Price Drops",
      description: "Significant downward price movements",
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/20",
    },
    {
      key: "sentimentShifts" as const,
      label: "Sentiment Shifts",
      description: "Major changes in market sentiment",
      icon: Activity,
      color: "text-chart-cyan",
      bgColor: "bg-chart-cyan/20",
    },
    {
      key: "whaleActivity" as const,
      label: "Whale Activity",
      description: "Large transaction movements",
      icon: Waves,
      color: "text-warning",
      bgColor: "bg-warning/20",
    },
    {
      key: "volumeSpikes" as const,
      label: "Volume Spikes",
      description: "Unusual trading volume detected",
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alert Types Section */}
      <div>
        <h4 className="text-md font-semibold text-foreground mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Alert Types
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which types of notifications you want to receive
        </p>
        
        <div className="grid gap-3 sm:grid-cols-2">
          {alertTypes.map((alert) => (
            <div
              key={alert.key}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl transition-all",
                localSettings[alert.key] 
                  ? "bg-secondary/70 border border-border" 
                  : "bg-secondary/30 border border-transparent opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", alert.bgColor)}>
                  <alert.icon className={cn("h-4 w-4", alert.color)} />
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">{alert.label}</div>
                  <div className="text-xs text-muted-foreground">{alert.description}</div>
                </div>
              </div>
              <Switch
                checked={localSettings[alert.key]}
                onCheckedChange={() => handleToggle(alert.key)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Thresholds Section */}
      <div>
        <h4 className="text-md font-semibold text-foreground mb-3">
          Alert Thresholds
        </h4>
        <p className="text-sm text-muted-foreground mb-4">
          Customize when you receive alerts based on these thresholds
        </p>

        <div className="space-y-6 p-4 rounded-xl bg-secondary/50">
          {/* Price Change Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Price Change Threshold
              </Label>
              <span className="text-sm font-medium text-primary">
                ±{localSettings.priceChangeThreshold}%
              </span>
            </div>
            <Slider
              value={[localSettings.priceChangeThreshold]}
              onValueChange={(v) => handleThresholdChange("priceChangeThreshold", v[0])}
              min={1}
              max={20}
              step={1}
              className="w-full"
              disabled={!localSettings.priceSurges && !localSettings.priceDrops}
            />
            <p className="text-xs text-muted-foreground">
              Alert when price moves ±{localSettings.priceChangeThreshold}% or more
            </p>
          </div>

          {/* Volume Spike Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Volume Spike Threshold
              </Label>
              <span className="text-sm font-medium text-primary">
                +{localSettings.volumeSpikeThreshold}%
              </span>
            </div>
            <Slider
              value={[localSettings.volumeSpikeThreshold]}
              onValueChange={(v) => handleThresholdChange("volumeSpikeThreshold", v[0])}
              min={20}
              max={200}
              step={10}
              className="w-full"
              disabled={!localSettings.volumeSpikes}
            />
            <p className="text-xs text-muted-foreground">
              Alert when volume increases by {localSettings.volumeSpikeThreshold}% or more
            </p>
          </div>

          {/* Sentiment Shift Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-chart-cyan" />
                Sentiment Shift Threshold
              </Label>
              <span className="text-sm font-medium text-primary">
                ±{localSettings.sentimentShiftThreshold} pts
              </span>
            </div>
            <Slider
              value={[localSettings.sentimentShiftThreshold]}
              onValueChange={(v) => handleThresholdChange("sentimentShiftThreshold", v[0])}
              min={5}
              max={50}
              step={5}
              className="w-full"
              disabled={!localSettings.sentimentShifts}
            />
            <p className="text-xs text-muted-foreground">
              Alert when Fear & Greed shifts by {localSettings.sentimentShiftThreshold} points or more
            </p>
          </div>

          {/* Whale Transaction Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-warning" />
                Whale Transaction Size
              </Label>
              <span className="text-sm font-medium text-primary">
                ${localSettings.whaleTransactionThreshold}M+
              </span>
            </div>
            <Slider
              value={[localSettings.whaleTransactionThreshold]}
              onValueChange={(v) => handleThresholdChange("whaleTransactionThreshold", v[0])}
              min={0.5}
              max={50}
              step={0.5}
              className="w-full"
              disabled={!localSettings.whaleActivity}
            />
            <p className="text-xs text-muted-foreground">
              Alert for whale transactions of ${localSettings.whaleTransactionThreshold}M USD or more
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={!hasChanges}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
