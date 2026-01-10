import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface AISummaryCardProps {
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  entryZone: string;
  timing: 'NOW' | 'WAIT_PULLBACK' | 'WAIT_BREAKOUT' | 'AVOID';
  successProbability?: number;
  crypto: string;
  isVisible: boolean;
}

const AISummaryCard = ({ 
  bias, 
  confidence, 
  entryZone, 
  timing, 
  successProbability = 50,
  crypto,
  isVisible 
}: AISummaryCardProps) => {
  if (!isVisible) return null;

  const getBiasConfig = () => {
    switch (bias) {
      case 'LONG':
        return {
          label: 'BULLISH',
          icon: TrendingUp,
          bgClass: 'from-success/20 to-success/5',
          borderClass: 'border-success/30',
          textClass: 'text-success',
          badgeClass: 'bg-success/20 text-success'
        };
      case 'SHORT':
        return {
          label: 'BEARISH',
          icon: TrendingDown,
          bgClass: 'from-destructive/20 to-destructive/5',
          borderClass: 'border-destructive/30',
          textClass: 'text-destructive',
          badgeClass: 'bg-destructive/20 text-destructive'
        };
      default:
        return {
          label: 'NEUTRAL',
          icon: Minus,
          bgClass: 'from-muted/30 to-muted/10',
          borderClass: 'border-muted-foreground/30',
          textClass: 'text-muted-foreground',
          badgeClass: 'bg-muted/50 text-muted-foreground'
        };
    }
  };

  const getTimingConfig = () => {
    switch (timing) {
      case 'NOW':
        return {
          label: 'EXECUTE',
          icon: CheckCircle,
          className: 'text-success bg-success/10'
        };
      case 'WAIT_PULLBACK':
        return {
          label: 'WAIT',
          icon: Clock,
          className: 'text-warning bg-warning/10'
        };
      case 'WAIT_BREAKOUT':
        return {
          label: 'WAIT',
          icon: Clock,
          className: 'text-warning bg-warning/10'
        };
      default:
        return {
          label: 'AVOID',
          icon: AlertTriangle,
          className: 'text-destructive bg-destructive/10'
        };
    }
  };

  const biasConfig = getBiasConfig();
  const timingConfig = getTimingConfig();
  const BiasIcon = biasConfig.icon;
  const TimingIcon = timingConfig.icon;

  // Create confidence bar
  const confidenceBlocks = Math.round(confidence / 10);
  const confidenceBar = '█'.repeat(Math.max(0, Math.min(10, confidenceBlocks))) + 
                        '░'.repeat(Math.max(0, 10 - confidenceBlocks));

  return (
    <div className={cn(
      "mb-4 rounded-xl border p-4 bg-gradient-to-r transition-all duration-300 animate-fade-in",
      biasConfig.bgClass,
      biasConfig.borderClass
    )}>
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {crypto} Quick View
          </span>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold",
          timingConfig.className
        )}>
          <TimingIcon className="h-3.5 w-3.5" />
          <span>{timingConfig.label}</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Verdict */}
        <div className="flex flex-col items-center text-center">
          <div className={cn(
            "flex items-center justify-center h-10 w-10 rounded-xl mb-1.5",
            biasConfig.badgeClass
          )}>
            <BiasIcon className={cn("h-5 w-5", biasConfig.textClass)} />
          </div>
          <span className={cn("text-lg font-bold", biasConfig.textClass)}>
            {biasConfig.label}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Verdict
          </span>
        </div>

        {/* Confidence */}
        <div className="flex flex-col items-center text-center">
          <div className="text-2xl font-bold text-foreground mb-0.5">
            {confidence.toFixed(0)}%
          </div>
          <div className="text-[10px] font-mono text-muted-foreground tracking-tighter mb-0.5">
            [{confidenceBar}]
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Confidence
          </span>
        </div>

        {/* Entry Zone */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1 mb-1">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm font-semibold text-foreground leading-tight max-w-full truncate px-1">
            {entryZone}
          </div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            Entry Zone
          </span>
        </div>
      </div>

      {/* Success Probability Footer */}
      {successProbability > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Success Probability</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    successProbability >= 70 ? "bg-success" : 
                    successProbability >= 50 ? "bg-warning" : "bg-destructive"
                  )}
                  style={{ width: `${Math.min(100, successProbability)}%` }}
                />
              </div>
              <span className={cn(
                "text-xs font-semibold tabular-nums",
                successProbability >= 70 ? "text-success" : 
                successProbability >= 50 ? "text-warning" : "text-destructive"
              )}>
                {successProbability}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISummaryCard;
