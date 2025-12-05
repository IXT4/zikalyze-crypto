import { Link } from "react-router-dom";
import { TrendingUp, Sparkles, ArrowRight, BarChart3, Brain, Shield, Activity, Zap, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-primary/5 to-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-cyan">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Zikalyze</span>
        </div>
        <Link to="/login">
          <Button className="bg-primary hover:bg-primary/90 glow-cyan text-primary-foreground">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 py-16 text-center md:py-24">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 backdrop-blur-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">AI-Powered Crypto Analysis</span>
        </div>

        <h1 className="mb-6 max-w-4xl text-5xl font-bold leading-tight text-foreground md:text-7xl">
          Predict Tomorrow.{" "}
          <span className="gradient-text">Trade Today.</span>
        </h1>

        <p className="mb-12 max-w-2xl text-lg text-muted-foreground md:text-xl">
          AI-driven crypto forecasting with Smart Money Concepts, ICT analysis, and VWAP indicators. Make informed decisions with real-time predictions.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/login">
            <Button size="lg" className="bg-primary hover:bg-primary/90 glow-cyan text-primary-foreground px-8">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/10 hover:border-primary/50">
              Launch App <Zap className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-20 w-full max-w-6xl animate-float">
          <div className="relative rounded-2xl border border-border bg-card/50 backdrop-blur-xl p-6 shadow-2xl">
            {/* Mini Dashboard Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <div className="h-3 w-3 rounded-full bg-warning" />
                <div className="h-3 w-3 rounded-full bg-success" />
              </div>
              <span className="text-sm text-muted-foreground">Zikalyze AI Dashboard</span>
            </div>

            {/* Dashboard Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* AI Generated Card */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">AI Generated</span>
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Predictions</div>
                    <div className="text-2xl font-bold text-primary">44.28</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Confidence</div>
                    <div className="text-2xl font-bold text-accent">2,595</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-success">↗ 2.12%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-success">↗ 4.10%</span>
                  </div>
                </div>
              </div>

              {/* Analytics Card */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Analytics</span>
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="h-20 flex items-end gap-1">
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
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">Predictive</span>
                  <LineChart className="h-4 w-4 text-accent" />
                </div>
                <div className="space-y-2">
                  {["Strong", "Uptrend", "Momentum", "Bullish", "Volume"].map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{item}</span>
                      <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
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
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Candlesticks</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground">Indicator</Button>
                  <Button size="sm" className="h-6 px-2 text-xs bg-primary text-primary-foreground">Dashboard</Button>
                </div>
              </div>
              <div className="h-32 flex items-end justify-around">
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
                      className="w-0.5 bg-muted-foreground/50"
                      style={{ height: `${candle.h - Math.max(candle.o, candle.c)}%`, marginTop: `${100 - candle.h}%` }}
                    />
                    <div
                      className={`w-3 rounded-sm ${candle.up ? "bg-success" : "bg-destructive"}`}
                      style={{ height: `${Math.abs(candle.c - candle.o)}%` }}
                    />
                    <div
                      className="w-0.5 bg-muted-foreground/50"
                      style={{ height: `${Math.min(candle.o, candle.c) - candle.l}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-8 md:grid-cols-3 w-full max-w-5xl">
          <div className="group rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 transition-all hover:border-primary/50 hover:bg-card">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 group-hover:glow-cyan transition-all">
              <Brain className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Smart Money Concepts</h3>
            <p className="text-muted-foreground">
              Advanced ICT analysis powered by machine learning algorithms for precise market structure detection.
            </p>
          </div>

          <div className="group rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 transition-all hover:border-accent/50 hover:bg-card">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/20 group-hover:glow-purple transition-all">
              <BarChart3 className="h-7 w-7 text-accent" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">VWAP Analysis</h3>
            <p className="text-muted-foreground">
              Volume-weighted average price indicators for institutional-grade entry and exit signals.
            </p>
          </div>

          <div className="group rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-8 transition-all hover:border-primary/50 hover:bg-card">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/20 group-hover:glow-cyan transition-all">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Risk Management</h3>
            <p className="text-muted-foreground">
              AI-powered risk assessment and position sizing recommendations for optimal portfolio protection.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-4xl">
          {[
            { label: "Accuracy Rate", value: "94.2%", icon: Activity },
            { label: "Active Users", value: "12K+", icon: TrendingUp },
            { label: "Predictions/Day", value: "50K+", icon: Brain },
            { label: "Markets Tracked", value: "200+", icon: BarChart3 },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold gradient-text">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 px-6 mt-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">Zikalyze AI</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 Zikalyze. AI-Powered Crypto Analysis.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
