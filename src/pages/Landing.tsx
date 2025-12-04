import { Link } from "react-router-dom";
import { TrendingUp, Sparkles, ArrowRight, BarChart3, Brain, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-purple">
            <TrendingUp className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">Zikalyze</span>
        </div>
        <Link to="/login">
          <Button className="bg-primary hover:bg-primary/90 glow-purple">
            Get Started <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center px-6 py-20 text-center md:py-32">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary">AI-Powered Predictions</span>
        </div>

        <h1 className="mb-6 max-w-4xl text-5xl font-bold leading-tight text-foreground md:text-7xl">
          Predict Tomorrow.{" "}
          <span className="gradient-text">Trade Today.</span>
        </h1>

        <p className="mb-12 max-w-2xl text-lg text-muted-foreground md:text-xl">
          AI-driven crypto forecasting that gives you an edge in the market. Make
          informed decisions with real-time predictions.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/login">
            <Button size="lg" className="bg-primary hover:bg-primary/90 glow-purple px-8">
              Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="border-border hover:bg-secondary">
            Watch Demo
          </Button>
        </div>

        {/* Features */}
        <div className="mt-24 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Smart Money Concepts</h3>
            <p className="text-muted-foreground">
              Advanced ICT analysis powered by machine learning algorithms.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">VWAP Analysis</h3>
            <p className="text-muted-foreground">
              Volume-weighted average price indicators for precise entries.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-foreground">Risk Management</h3>
            <p className="text-muted-foreground">
              AI-powered risk assessment and position sizing recommendations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
