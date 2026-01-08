import { TrendingUp } from "lucide-react";

interface ZikalyzeSplashProps {
  message?: string;
}

const ZikalyzeSplash = ({ message = "Loading..." }: ZikalyzeSplashProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s" }} />
      </div>

      {/* Logo Container */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Animated Logo */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary to-accent opacity-50 blur-xl animate-pulse" />
          
          {/* Logo */}
          <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-2xl animate-logo-bounce">
            <TrendingUp className="h-7 w-7 text-primary-foreground" />
          </div>
          
          {/* Rotating ring */}
          <div className="absolute -inset-3 rounded-3xl border-2 border-primary/30 animate-spin-slow" 
               style={{ 
                 borderStyle: "dashed",
                 animationDuration: "8s" 
               }} 
          />
        </div>

        {/* Brand Name */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Zikalyze</span>
          </h1>
          <p className="text-sm text-muted-foreground tracking-widest uppercase">
            AI-Powered Crypto Analysis
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex flex-col items-center gap-4 mt-4">
          {/* Progress dots */}
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-2 w-2 rounded-full bg-primary animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          
          {/* Message */}
          <p className="text-sm text-muted-foreground animate-pulse">
            {message}
          </p>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground/50">
          Powered by Advanced AI Technology
        </p>
      </div>
    </div>
  );
};

export default ZikalyzeSplash;
