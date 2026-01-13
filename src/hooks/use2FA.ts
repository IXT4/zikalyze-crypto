import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  setup2FA,
  verifyAndEnable2FA,
  validate2FAToken,
  validateBackupCode as validateBackupCodeClient,
  check2FAStatus,
  disable2FA,
} from "@/lib/clientAuth";

interface TwoFASetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  otpauthUrl: string;
}

export const use2FA = () => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [setupData, setSetupData] = useState<TwoFASetupData | null>(null);

  const checkStatus = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const status = await check2FAStatus(user.id);
      setIsEnabled(status.enabled);
    } catch (error) {
      console.error("Error checking 2FA status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const setupTwoFA = async (): Promise<TwoFASetupData | null> => {
    if (!user?.id) return null;

    try {
      const data = await setup2FA(user.id, user.email || "");
      setSetupData(data);
      return data;
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      throw error;
    }
  };

  const verifyAndEnable = async (token: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await verifyAndEnable2FA(user.id, token);
      if (success) {
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
    if (!user?.id) return false;

    try {
      return await validate2FAToken(user.id, token);
    } catch (error) {
      console.error("Error validating 2FA token:", error);
      throw error;
    }
  };

  const validateBackupCode = async (code: string): Promise<{ valid: boolean; remainingCodes?: number }> => {
    if (!user?.id) return { valid: false };

    try {
      const result = await validateBackupCodeClient(user.id, code);
      return { valid: result.valid, remainingCodes: result.remainingCodes };
    } catch (error) {
      console.error("Error validating backup code:", error);
      throw error;
    }
  };

  const disableTwoFA = async (token: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await disable2FA(user.id, token);
      if (success) {
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
export const check2FAStatusForLogin = async (userId: string): Promise<boolean> => {
  try {
    const status = await check2FAStatus(userId);
    return status.enabled;
  } catch (error) {
    console.error("Error checking 2FA status:", error);
    return false;
  }
};

export const validate2FATokenForLogin = async (userId: string, token: string): Promise<boolean> => {
  try {
    return await validate2FAToken(userId, token);
  } catch (error) {
    console.error("Error validating 2FA token:", error);
    return false;
  }
};
