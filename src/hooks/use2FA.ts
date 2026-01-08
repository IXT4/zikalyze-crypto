import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TwoFASetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  otpauthUrl: string;
}

export const use2FA = () => {
  const { user, session } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupData, setSetupData] = useState<TwoFASetupData | null>(null);

  const checkStatus = useCallback(async () => {
    if (!session?.access_token) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "status" },
      });

      if (error) throw error;
      setIsEnabled(data.enabled);
    } catch (error) {
      console.error("Error checking 2FA status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const setupTwoFA = async (): Promise<TwoFASetupData | null> => {
    if (!session?.access_token) return null;

    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "setup" },
      });

      if (error) throw error;
      
      setSetupData(data);
      return data;
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      throw error;
    }
  };

  const verifyAndEnable = async (token: string): Promise<boolean> => {
    if (!session?.access_token) return false;

    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "verify", token },
      });

      if (error) throw error;
      
      if (data.enabled) {
        setIsEnabled(true);
        setSetupData(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      throw error;
    }
  };

  const validateToken = async (token: string): Promise<boolean> => {
    if (!session?.access_token) return false;

    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "validate", token },
      });

      if (error) throw error;
      return data.valid;
    } catch (error) {
      console.error("Error validating 2FA token:", error);
      throw error;
    }
  };

  const validateBackupCode = async (code: string): Promise<{ valid: boolean; remainingCodes?: number }> => {
    if (!session?.access_token) return { valid: false };

    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "validate-backup", backupCode: code },
      });

      if (error) throw error;
      return { valid: data.valid, remainingCodes: data.remainingCodes };
    } catch (error) {
      console.error("Error validating backup code:", error);
      throw error;
    }
  };

  const disableTwoFA = async (token: string): Promise<boolean> => {
    if (!session?.access_token) return false;

    try {
      const { data, error } = await supabase.functions.invoke("totp-2fa", {
        body: { action: "disable", token },
      });

      if (error) throw error;
      
      if (!data.enabled) {
        setIsEnabled(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      throw error;
    }
  };

  return {
    isEnabled,
    isLoading,
    setupData,
    setupTwoFA,
    verifyAndEnable,
    validateToken,
    validateBackupCode,
    disableTwoFA,
    checkStatus,
  };
};

// Hook specifically for checking 2FA status by user ID (for login flow)
export const check2FAStatus = async (userId: string, accessToken: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp-2fa`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "status" }),
      }
    );

    const data = await response.json();
    return data.enabled || false;
  } catch (error) {
    console.error("Error checking 2FA status:", error);
    return false;
  }
};

export const validate2FAToken = async (token: string, accessToken: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/totp-2fa`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "validate", token }),
      }
    );

    const data = await response.json();
    return data.valid || false;
  } catch (error) {
    console.error("Error validating 2FA token:", error);
    return false;
  }
};