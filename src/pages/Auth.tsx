import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, Mail, Lock, ArrowRight, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRateLimit } from "@/hooks/useRateLimit";
import zikalyzeLogo from "@/assets/zikalyze-logo.png";

import { z } from "zod";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user, loading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const { checkRateLimit, recordLoginAttempt, formatRetryAfter } = useRateLimit();
  
  const emailSchema = z.string().email(t("validation.invalidEmail"));
  const passwordSchema = z.string().min(6, t("validation.passwordMinLength"));
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      navigate("/dashboard");
    }
  }, [user, authLoading, navigate]);

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setRateLimitError(null);
    setIsLoading(true);
    
    // Check rate limit before attempting sign in
    const rateLimitResult = await checkRateLimit(email);
    if (!rateLimitResult.allowed) {
      setIsLoading(false);
      setRateLimitError(
        t("auth.tryAgainIn", { time: formatRetryAfter(rateLimitResult.retry_after) })
      );
      toast({
        title: t("auth.tooManyAttempts"),
        description: t("auth.tryAgainIn", { time: formatRetryAfter(rateLimitResult.retry_after) }),
        variant: "destructive",
      });
      return;
    }
    
    const { error } = await signIn(email, password);
    
    if (error) {
      // Record failed attempt
      await recordLoginAttempt(email, false);
      setIsLoading(false);
      
      if (error.message.includes("Invalid login credentials")) {
        const remainingAttempts = rateLimitResult.max_attempts - rateLimitResult.attempts - 1;
        toast({
          title: t("auth.invalidCredentials"),
          description: remainingAttempts > 0 
            ? t("auth.checkCredentials", { attempts: remainingAttempts })
            : t("auth.checkCredentials", { attempts: 0 }),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("auth.signInFailed"),
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    // Record successful attempt (clears failed attempts)
    await recordLoginAttempt(email, true);
    setIsLoading(false);

    toast({
      title: t("auth.welcomeBack"),
      description: t("auth.signInSuccess"),
    });
    navigate("/dashboard");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }
    
    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);

    if (error) {
      toast({
        title: t("auth.resetFailed"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("auth.checkEmailForReset"),
      description: t("auth.resetLinkSent"),
    });
    setShowForgotPassword(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: t("auth.accountExists"),
          description: t("auth.accountExistsDesc"),
          variant: "destructive",
        });
      } else {
        toast({
          title: t("auth.signUpFailed"),
          description: error.message,
          variant: "destructive",
        });
      }
      return;
    }

    // Show email confirmation screen
    setShowEmailConfirmation(true);
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    const { error } = await signUp(email, password);
    setIsResending(false);

    if (error) {
      toast({
        title: t("auth.failedToResend"),
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: t("auth.emailSent"),
      description: t("auth.anotherVerificationSent"),
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <img 
          src={zikalyzeLogo} 
          alt="Loading" 
          className="h-16 w-16"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary glow-cyan">
            <TrendingUp className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold text-foreground">Zikalyze</span>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-8 shadow-2xl">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              {rateLimitError && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                  <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{rateLimitError}</p>
                </div>
              )}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t("auth.enterEmail")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, email: undefined }));
                        setRateLimitError(null);
                      }}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t("auth.enterPassword")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>


                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 glow-cyan"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t("auth.signIn")} <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t("auth.enterEmail")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t("auth.createPassword")}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className="pl-10"
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 glow-cyan"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t("auth.createAccount")} <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("auth.termsAgreement")}
          </p>
        </div>

        {/* Email Confirmation Screen */}
        {showEmailConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl w-full max-w-md mx-4 text-center">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">{t("auth.checkEmail")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("auth.verificationSent")}
              </p>
              <p className="font-medium text-foreground mb-6 break-all">{email}</p>
              <p className="text-sm text-muted-foreground mb-6">
                {t("auth.verificationExpiry")}
              </p>
              <div className="space-y-3">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleResendVerification}
                  disabled={isResending}
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("auth.sending")}
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      {t("auth.resendVerification")}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowEmailConfirmation(false);
                    setEmail("");
                    setPassword("");
                  }}
                >
                  {t("auth.backToSignIn")}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t("auth.checkSpam")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl w-full max-w-md mx-4">
              <h3 className="text-xl font-bold mb-2">{t("auth.resetPassword")}</h3>
              <p className="text-muted-foreground mb-4">
                {t("auth.resetPasswordDesc")}
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">{t("auth.email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder={t("auth.enterEmail")}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors((prev) => ({ ...prev, email: undefined }));
                      }}
                      className="pl-10"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("auth.sendResetLink")
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;
