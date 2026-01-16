import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TrendingUp, Sparkles, ArrowRight, BarChart3, Brain, Shield, Activity, Zap, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import zikalyzeLogo from "@/assets/zikalyze-logo.png";

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isNavigating, setIsNavigating] = useState(false);

  // Handle navigation with loading state
  const handleNavigate = useCallback((path: string) => {
    setIsNavigating(true);
    // Brief delay to show loading animation before navigation
    setTimeout(() => {
      navigate(path);
    }, 400);
  }, [navigate]);

  // Handle email verification callback
  useEffect(() => {
    const hash = location.hash;
    if (hash && hash.includes('access_token')) {
      toast({
        title: t("landing.emailVerified"),
        description: t("landing.emailVerifiedDesc"),
      });
      window.history.replaceState(null, '', location.pathname);
    }
  }, [location, toast, t]);

  // Redirect to dashboard if already logged in (non-blocking)
  useEffect(() => {
    if (!authLoading && user) {
      setIsNavigating(true);
      setTimeout(() => {
        navigate("/dashboard");
      }, 400);
    }
  }, [navigate, user, authLoading]);

  // Loading overlay when navigating or redirecting
  if (isNavigating || (authLoading && !user)) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ backgroundColor: '#0a0f1a' }}
      >
        <img 
          src={zikalyzeLogo} 
          alt="Loading"
          width={64}
          height={64}
          className="h-16 w-16 animate-spin-slow opacity-80"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl animate-pulse-slow sm:w-72 sm:h-72 lg:w-96 lg:h-96" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse-slow sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px]" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-r from-primary/5 to-accent/5 rounded-full blur-3xl sm:w-[600px] sm:h-[600px] lg:w-[800px] lg:h-[800px] xl:w-[1000px] xl:h-[1000px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-12 lg:px-16 xl:px-24">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary sm:h-12 sm:w-12 sm:rounded-xl lg:h-14 lg:w-14">
            <TrendingUp className="h-4 w-4 text-primary-foreground sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
          </div>
          <span className="text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">Zikalyze</span>
        </div>
        <Button 
          onClick={() => handleNavigate("/auth")}
          className="bg-primary hover:bg-primary/90 glow-cyan text-primary-foreground text-xs h-8 px-3 sm:text-sm sm:h-10 sm:px-4 lg:h-11 lg:px-6 lg:text-base"
        >
          {t("common.getStarted")} <ArrowRight className="ml-1.5 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
        </Button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-4 py-12 text-center sm:px-6 md:py-20 lg:py-28 xl:py-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 backdrop-blur-sm sm:mb-8 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5">
          <Sparkles className="h-3 w-3 text-primary sm:h-4 sm:w-4" />
          <span className="text-xs text-primary sm:text-sm lg:text-base">{t("landing.heroTagline")}</span>
        </div>

        <h1 className="mb-4 max-w-4xl text-3xl font-bold leading-tight text-foreground sm:mb-6 sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl xl:max-w-5xl">
          {t("landing.heroTitle")}{" "}
          <span className="gradient-text">{t("landing.heroTitleHighlight")}</span>
        </h1>

        <p className="mb-8 max-w-2xl text-base text-muted-foreground sm:mb-12 sm:text-lg md:text-xl lg:text-2xl lg:max-w-3xl">
          {t("landing.heroDescription")}
        </p>

        <div className="flex flex-col gap-3 w-full max-w-sm sm:flex-row sm:justify-center sm:max-w-none sm:gap-4 lg:gap-6">
          <Button 
            size="lg" 
            onClick={() => handleNavigate("/auth")}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 glow-cyan text-primary-foreground px-6 sm:px-8 lg:px-10 lg:h-14 lg:text-lg"
          >
            {t("landing.startFreeTrial")} <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            onClick={() => handleNavigate("/auth")}
            className="w-full sm:w-auto border-primary/30 hover:bg-primary/10 hover:border-primary/50 lg:px-10 lg:h-14 lg:text-lg"
          >
            {t("landing.launchApp")} <Zap className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>

        {/* Dashboard Preview - Clickable */}
        <div 
          className="mt-12 w-full max-w-6xl animate-float cursor-pointer group/preview sm:mt-20 lg:mt-24 xl:max-w-7xl"
          onClick={() => handleNavigate("/auth")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleNavigate("/auth")}
        >
          <div className="relative rounded-xl border border-border bg-card/50 backdrop-blur-xl p-3 shadow-2xl transition-all duration-300 group-hover/preview:border-primary/50 group-hover/preview:shadow-primary/20 sm:rounded-2xl sm:p-6 lg:p-8 xl:p-10">
            {/* Mini Dashboard Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border sm:mb-6 sm:pb-4 lg:mb-8 lg:pb-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-2 w-2 rounded-full bg-destructive sm:h-3 sm:w-3 lg:h-4 lg:w-4" />
                <div className="h-2 w-2 rounded-full bg-warning sm:h-3 sm:w-3 lg:h-4 lg:w-4" />
                <div className="h-2 w-2 rounded-full bg-success sm:h-3 sm:w-3 lg:h-4 lg:w-4" />
              </div>
              <span className="text-xs text-muted-foreground sm:text-sm lg:text-base">{t("landing.dashboardPreview")}</span>
            </div>

            {/* Dashboard Grid - Stack on mobile, 2 cols tablet, 3 cols desktop */}
            <div className="grid gap-3 grid-cols-1 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              {/* AI Generated Card */}
              <div className="rounded-lg border border-border bg-card p-3 sm:rounded-xl sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                  <span className="text-xs font-medium text-foreground sm:text-sm lg:text-base">{t("landing.aiGenerated")}</span>
                  <Brain className="h-3 w-3 text-primary sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs lg:text-sm">{t("landing.predictions")}</div>
                    <div className="text-xl font-bold text-primary sm:text-2xl lg:text-3xl xl:text-4xl">44.28</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground sm:text-xs lg:text-sm">{t("landing.confidence")}</div>
                    <div className="text-xl font-bold text-accent sm:text-2xl lg:text-3xl xl:text-4xl">2,595</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3 sm:mt-3 sm:gap-4 lg:mt-4">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-success sm:text-xs lg:text-sm">↗ 2.12%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-success sm:text-xs lg:text-sm">↗ 4.10%</span>
                  </div>
                </div>
              </div>

              {/* Analytics Card */}
              <div className="rounded-lg border border-border bg-card p-3 sm:rounded-xl sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                  <span className="text-xs font-medium text-foreground sm:text-sm lg:text-base">{t("landing.analytics")}</span>
                  <Activity className="h-3 w-3 text-primary sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="h-16 flex items-end gap-1 sm:h-20 lg:h-28 xl:h-32">
                  {[40, 60, 45, 80, 55, 70, 65, 90, 75, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-primary/50 to-primary rounded-t"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Predictive Card */}
              <div className="rounded-lg border border-border bg-card p-3 sm:col-span-2 lg:col-span-1 sm:rounded-xl sm:p-4 lg:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                  <span className="text-xs font-medium text-foreground sm:text-sm lg:text-base">{t("landing.predictive")}</span>
                  <LineChart className="h-3 w-3 text-accent sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                </div>
                <div className="space-y-1.5 sm:space-y-2 lg:space-y-3">
                  {["Strong", "Uptrend", "Momentum", "Bullish", "Volume"].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px] sm:text-xs lg:text-sm">
                      <span className="text-muted-foreground">{item}</span>
                      <div className="h-1 w-12 rounded-full bg-secondary overflow-hidden sm:h-1.5 sm:w-16 lg:h-2 lg:w-24">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                          style={{ width: `${60 + i * 8}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Candlestick Preview */}
            <div className="mt-3 rounded-lg border border-border bg-card p-3 sm:mt-4 sm:rounded-xl sm:p-4 lg:mt-6 lg:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                <span className="text-xs font-medium text-foreground sm:text-sm lg:text-base">{t("landing.candlesticks")}</span>
                <div className="flex gap-1 sm:gap-2">
                  <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px] text-muted-foreground sm:h-6 sm:px-2 sm:text-xs lg:h-8 lg:px-3 lg:text-sm">{t("landing.indicator")}</Button>
                  <Button size="sm" className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground sm:h-6 sm:px-2 sm:text-xs lg:h-8 lg:px-3 lg:text-sm">{t("landing.dashboard")}</Button>
                </div>
              </div>
              <div className="h-20 flex items-end justify-around sm:h-32 lg:h-40 xl:h-48">
                {[
                  { o: 60, c: 80, h: 90, l: 50, up: true },
                  { o: 80, c: 70, h: 85, l: 65, up: false },
                  { o: 70, c: 85, h: 95, l: 60, up: true },
                  { o: 85, c: 75, h: 90, l: 70, up: false },
                  { o: 75, c: 90, h: 100, l: 70, up: true },
                  { o: 90, c: 80, h: 95, l: 75, up: false },
                  { o: 80, c: 95, h: 100, l: 75, up: true },
                  { o: 95, c: 85, h: 100, l: 80, up: false },
                  { o: 85, c: 70, h: 90, l: 65, up: false },
                  { o: 70, c: 60, h: 75, l: 55, up: false },
                ].map((candle, i) => (
                  <div key={i} className="flex flex-col items-center" style={{ height: "100%" }}>
                    <div
                      className="w-0.5 bg-muted-foreground/50 lg:w-1"
                      style={{ height: `${candle.h - Math.max(candle.o, candle.c)}%`, marginTop: `${100 - candle.h}%` }}
                    />
                    <div
                      className={`w-2 rounded-sm sm:w-3 lg:w-4 xl:w-5 ${candle.up ? "bg-success" : "bg-destructive"}`}
                      style={{ height: `${Math.abs(candle.c - candle.o)}%` }}
                    />
                    <div
                      className="w-0.5 bg-muted-foreground/50 lg:w-1"
                      style={{ height: `${Math.min(candle.o, candle.c) - candle.l}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features - Clickable */}
        <div className="mt-16 grid gap-4 grid-cols-1 w-full max-w-5xl sm:mt-24 sm:gap-6 md:grid-cols-3 lg:mt-32 lg:gap-8 xl:max-w-6xl">
          <div 
            className="group rounded-xl border border-border bg-card/50 backdrop-blur-sm p-5 transition-all hover:border-primary/50 hover:bg-card cursor-pointer sm:rounded-2xl sm:p-6 lg:p-8 xl:p-10"
            onClick={() => handleNavigate("/auth")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleNavigate("/auth")}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 group-hover:glow-cyan transition-all sm:mb-4 sm:h-12 sm:w-12 lg:mb-5 lg:h-16 lg:w-16 sm:rounded-xl">
              <Brain className="h-5 w-5 text-primary sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
            </div>
            <h3 className="mb-1.5 text-lg font-semibold text-foreground sm:mb-2 sm:text-xl lg:text-2xl">{t("landing.smartMoneyConcepts")}</h3>
            <p className="text-sm text-muted-foreground sm:text-base lg:text-lg">
              {t("landing.smartMoneyDesc")}
            </p>
          </div>

          <div 
            className="group rounded-xl border border-border bg-card/50 backdrop-blur-sm p-5 transition-all hover:border-accent/50 hover:bg-card cursor-pointer sm:rounded-2xl sm:p-6 lg:p-8 xl:p-10"
            onClick={() => handleNavigate("/auth")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleNavigate("/auth")}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 group-hover:glow-purple transition-all sm:mb-4 sm:h-12 sm:w-12 lg:mb-5 lg:h-16 lg:w-16 sm:rounded-xl">
              <BarChart3 className="h-5 w-5 text-accent sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
            </div>
            <h3 className="mb-1.5 text-lg font-semibold text-foreground sm:mb-2 sm:text-xl lg:text-2xl">{t("landing.vwapAnalysis")}</h3>
            <p className="text-sm text-muted-foreground sm:text-base lg:text-lg">
              {t("landing.vwapDesc")}
            </p>
          </div>

          <div 
            className="group rounded-xl border border-border bg-card/50 backdrop-blur-sm p-5 transition-all hover:border-primary/50 hover:bg-card cursor-pointer sm:rounded-2xl sm:p-6 lg:p-8 xl:p-10"
            onClick={() => handleNavigate("/auth")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleNavigate("/auth")}
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 group-hover:glow-cyan transition-all sm:mb-4 sm:h-12 sm:w-12 lg:mb-5 lg:h-16 lg:w-16 sm:rounded-xl">
              <Shield className="h-5 w-5 text-primary sm:h-6 sm:w-6 lg:h-8 lg:w-8" />
            </div>
            <h3 className="mb-1.5 text-lg font-semibold text-foreground sm:mb-2 sm:text-xl lg:text-2xl">{t("landing.riskManagement")}</h3>
            <p className="text-sm text-muted-foreground sm:text-base lg:text-lg">
              {t("landing.riskDesc")}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-4xl sm:mt-20 sm:gap-8 md:grid-cols-4 lg:mt-28 lg:gap-12 xl:max-w-5xl">
          {[
            { label: t("landing.accuracyRate"), value: "94.2%", icon: Activity },
            { label: t("landing.activeUsers"), value: "12K+", icon: TrendingUp },
            { label: t("landing.predictionsPerDay"), value: "50K+", icon: Brain },
            { label: t("landing.marketsTracked"), value: "200+", icon: BarChart3 },
          ].map((stat, i) => (
            <div key={i} className="text-center p-3 sm:p-0">
              <stat.icon className="h-5 w-5 text-primary mx-auto mb-1.5 sm:h-6 sm:w-6 sm:mb-2 lg:h-8 lg:w-8 lg:mb-3" />
              <div className="text-2xl font-bold gradient-text sm:text-3xl lg:text-4xl xl:text-5xl">{stat.value}</div>
              <div className="text-xs text-muted-foreground sm:text-sm lg:text-base">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-6 px-4 mt-12 sm:py-8 sm:px-6 sm:mt-20 lg:py-10 lg:mt-28">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 md:flex-row md:justify-between xl:max-w-7xl">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center sm:h-8 sm:w-8 lg:h-10 lg:w-10">
              <TrendingUp className="h-3.5 w-3.5 text-primary-foreground sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
            </div>
            <span className="font-semibold text-foreground text-sm sm:text-base lg:text-lg">Zikalyze AI</span>
          </div>
          
          {/* Social Links */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="https://x.com/_bigzik"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              aria-label="Follow on X"
            >
              <svg className="h-4 w-4 text-foreground sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://discord.gg/MjpCBEVBnu"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary hover:bg-secondary/80 transition-colors sm:h-10 sm:w-10 lg:h-11 lg:w-11"
              aria-label="Join Discord"
            >
              <svg className="h-4 w-4 text-foreground sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </a>
          </div>
          
          <p className="text-xs text-muted-foreground text-center sm:text-sm lg:text-base">
            {t("landing.footer")}
          </p>
        </div>
        
        {/* Legal Disclaimer */}
        <div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-border/50 xl:max-w-7xl">
          <p className="text-[10px] text-muted-foreground/70 text-center italic sm:text-xs lg:text-sm">
            ⚠️ <strong>Not Financial Advice:</strong> Zikalyze AI provides analysis for informational and educational purposes only. 
            Always do your own research and verify signals on your chart before making any trading decisions.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
