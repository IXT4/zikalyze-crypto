import { useState } from "react";
import { Shield, ShieldCheck, ShieldOff, Copy, Check, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { use2FA } from "@/hooks/use2FA";

const TwoFactorAuth = () => {
  const { toast } = useToast();
  const { isEnabled, isLoading, setupData, setupTwoFA, verifyAndEnable, disableTwoFA } = use2FA();
  
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [step, setStep] = useState<"qr" | "backup" | "verify">("qr");

  const handleSetup = async () => {
    setIsProcessing(true);
    try {
      await setupTwoFA();
      setShowSetupDialog(true);
      setStep("qr");
    } catch (error) {
      toast({
        title: "Setup failed",
        description: "Could not initialize 2FA setup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const success = await verifyAndEnable(verificationCode);
      if (success) {
        toast({
          title: "2FA Enabled! 🔒",
          description: "Your account is now protected with two-factor authentication.",
        });
        setShowSetupDialog(false);
        setVerificationCode("");
        setStep("qr");
      } else {
        toast({
          title: "Verification failed",
          description: "Invalid code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisable = async () => {
    if (disableCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit verification code.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const success = await disableTwoFA(disableCode);
      if (success) {
        toast({
          title: "2FA Disabled",
          description: "Two-factor authentication has been removed from your account.",
        });
        setShowDisableDialog(false);
        setDisableCode("");
      } else {
        toast({
          title: "Failed to disable",
          description: "Invalid code. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to disable",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (text: string, type: "secret" | "backup") => {
    await navigator.clipboard.writeText(text);
    if (type === "secret") {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
    toast({
      title: "Copied!",
      description: type === "secret" ? "Secret key copied to clipboard" : "Backup codes copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading 2FA status...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${isEnabled ? "bg-success/20" : "bg-muted"}`}>
              {isEnabled ? (
                <ShieldCheck className="h-6 w-6 text-success" />
              ) : (
                <Shield className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Two-Factor Authentication</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isEnabled
                  ? "Your account is protected with an authenticator app."
                  : "Add an extra layer of security using an authenticator app."}
              </p>
              {isEnabled && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-xs bg-success/20 text-success px-2 py-1 rounded-full">
                    <ShieldCheck className="h-3 w-3" />
                    Enabled
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {isEnabled ? (
            <Button
              variant="outline"
              onClick={() => setShowDisableDialog(true)}
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <ShieldOff className="h-4 w-4 mr-2" />
              Disable
            </Button>
          ) : (
            <Button onClick={handleSetup} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Enable 2FA
            </Button>
          )}
        </div>
      </div>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              {step === "qr" && "Scan this QR code with your authenticator app."}
              {step === "backup" && "Save these backup codes in a secure location."}
              {step === "verify" && "Enter the 6-digit code from your authenticator app."}
            </DialogDescription>
          </DialogHeader>

          {step === "qr" && setupData && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img
                  src={setupData.qrCodeUrl}
                  alt="2FA QR Code"
                  className="w-48 h-48"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Can't scan? Enter this key manually:
                </Label>
                <div className="flex gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(setupData.secret, "secret")}
                  >
                    {copiedSecret ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button className="w-full" onClick={() => setStep("backup")}>
                Next: Save Backup Codes
              </Button>
            </div>
          )}

          {step === "backup" && setupData && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Backup Codes</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(setupData.backupCodes.join("\n"), "backup")}
                  >
                    {copiedBackup ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, i) => (
                    <code key={i} className="px-2 py-1 bg-background rounded text-sm font-mono text-center">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                ⚠️ Save these codes securely. Each code can only be used once if you lose access to your authenticator app.
              </p>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("qr")}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep("verify")}>
                  I've Saved My Codes
                </Button>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep("backup")}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleVerify}
                  disabled={isProcessing || verificationCode.length !== 6}
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Verify & Enable"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldOff className="h-5 w-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter your authenticator code to confirm disabling 2FA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-code">Verification Code</Label>
              <Input
                id="disable-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-widest font-mono"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDisableDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleDisable}
                disabled={isProcessing || disableCode.length !== 6}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Disable 2FA"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TwoFactorAuth;