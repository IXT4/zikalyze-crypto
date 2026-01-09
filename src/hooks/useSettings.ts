import { useState, useEffect, useCallback } from "react";

export type SoundType = "chime" | "beep" | "bell";

export interface NotificationAlertSettings {
  // Alert types enabled
  priceAlerts: boolean;
  priceSurges: boolean;
  priceDrops: boolean;
  sentimentShifts: boolean;
  whaleActivity: boolean;
  volumeSpikes: boolean;
  
  // Thresholds
  priceChangeThreshold: number; // percentage
  volumeSpikeThreshold: number; // percentage
  sentimentShiftThreshold: number; // points
  whaleTransactionThreshold: number; // in millions USD
}

export interface AppSettings {
  soundEnabled: boolean;
  soundVolume: number;
  soundType: SoundType;
  notifications: boolean;
  emailAlerts: boolean;
  priceAlerts: boolean;
  language: string;
  currency: string;
  twoFactorAuth: boolean;
  
  // Advanced notification settings
  notificationAlerts: NotificationAlertSettings;
}

const DEFAULT_NOTIFICATION_ALERTS: NotificationAlertSettings = {
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

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundVolume: 0.7,
  soundType: "chime",
  notifications: true,
  emailAlerts: true,
  priceAlerts: true,
  language: "English",
  currency: "USD",
  twoFactorAuth: false,
  notificationAlerts: DEFAULT_NOTIFICATION_ALERTS,
};

const STORAGE_KEY = "zikalyze_settings";

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
    setLoaded(true);
  }, []);

  // Save settings to localStorage (synchronous for immediate effect)
  const saveSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        // Synchronously persist to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving settings:", error);
      }
      return updated;
    });
  }, []);

  // Toggle a boolean setting
  const toggleSetting = useCallback((key: keyof AppSettings) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving settings:", error);
      }
      return updated;
    });
  }, []);

  return {
    settings,
    loaded,
    saveSettings,
    toggleSetting,
  };
};

// Standalone function to check if sound is enabled (for use outside React components)
export const isSoundEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.soundEnabled !== false;
    }
  } catch (error) {
    console.error("Error reading sound setting:", error);
  }
  return true; // Default to enabled
};

// Standalone function to get sound volume (for use outside React components)
export const getSoundVolume = (): number => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return typeof parsed.soundVolume === "number" ? parsed.soundVolume : 0.7;
    }
  } catch (error) {
    console.error("Error reading volume setting:", error);
  }
  return 0.7; // Default volume
};

// Standalone function to get sound type (for use outside React components)
export const getSoundType = (): SoundType => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.soundType === "chime" || parsed.soundType === "beep" || parsed.soundType === "bell") {
        return parsed.soundType;
      }
    }
  } catch (error) {
    console.error("Error reading sound type setting:", error);
  }
  return "chime"; // Default sound type
};
