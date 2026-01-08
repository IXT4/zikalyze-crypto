import { useState } from "react";
import { Shield, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TwoFAVerifyProps {
  onVerify: (token: string) => Promise<boolean>;
  onBackupVerify: (code: string) => Promise<{ valid: boolean; remainingCodes?: number }>;
  onCancel: () => void;
  isLoading?: boolean;
}

const TwoFAVerify = ({ onVerify, onBackupVerify, onCancel, isLoading = false }: TwoFAVerifyProps) => {
  const [token, setToken] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [showBackup, setShowBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleVerify = async () => {
    if (token.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const isValid = await onVerify(token);
      if (!isValid) {
        setError("Invalid verification code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleBackupVerify = async () => {
    if (!backupCode.trim()) {
      setError("Please enter a backup code");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const result = await onBackupVerify(backupCode);
      if (!result.valid) {
        setError("Invalid backup code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setProcessing(false);
    }
  };

  const isProcessing = processing || isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
          <Shield className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-xl font-bold mb-2">Two-Factor Authentication</h3>
        <p className="text-muted-foreground">
          {showBackup
            ? "Enter one of your backup codes"
            : "Enter the 6-digit code from your authenticator app"}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive text-center">{error}</p>
        </div>
      )}

      {!showBackup ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totp-code">Authentication Code</Label>
            <Input
              id="totp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={token}
              onChange={(e) => {
                setToken(e.target.value.replace(/\D/g, ""));
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && token.length === 6) {
                  handleVerify();
                }
              }}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={isProcessing || token.length !== 6}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verify"
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setShowBackup(true);
              setError(null);
            }}
            className="w-full text-sm text-muted-foreground hover:text-primary text-center"
          >
            <KeyRound className="inline h-4 w-4 mr-1" />
            Use a backup code instead
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-code">Backup Code</Label>
            <Input
              id="backup-code"
              type="text"
              placeholder="XXXX-XXXX"
              value={backupCode}
              onChange={(e) => {
                setBackupCode(e.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && backupCode.trim()) {
                  handleBackupVerify();
                }
              }}
              className="text-center text-xl tracking-widest font-mono"
              autoFocus
            />
          </div>

          <Button
            className="w-full"
            onClick={handleBackupVerify}
            disabled={isProcessing || !backupCode.trim()}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Verify Backup Code"
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setShowBackup(false);
              setError(null);
            }}
            className="w-full text-sm text-muted-foreground hover:text-primary text-center"
          >
            Back to authenticator code
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onCancel}
        className="w-full text-sm text-muted-foreground hover:text-foreground"
      >
        Cancel and use a different account
      </button>
    </div>
  );
};

export default TwoFAVerify;