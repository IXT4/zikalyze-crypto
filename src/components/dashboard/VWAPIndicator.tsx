/**
 * VWAPIndicator — Visual display for VWAP aggregation status
 * Shows the aggregation method, confidence level, and source count
 */

import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Activity, AlertTriangle, CheckCircle2, Layers } from "lucide-react";

interface VWAPIndicatorProps {
  method: 'vwap' | 'median' | 'single';
  confidence: number;
  sourcesUsed: string[];
  outliersFiltered?: number;
  className?: string;
  compact?: boolean;
}

export function VWAPIndicator({
  method,
  confidence,
  sourcesUsed,
  outliersFiltered = 0,
  className,
  compact = false,
}: VWAPIndicatorProps) {
  // Determine confidence color
  const getConfidenceColor = () => {
    if (confidence >= 0.8) return "text-success";
    if (confidence >= 0.5) return "text-warning";
    return "text-destructive";
  };

  // Determine method icon and label
  const getMethodInfo = () => {
    switch (method) {
      case 'vwap':
        return {
          icon: <Layers className="h-3 w-3" />,
          label: 'VWAP',
          description: 'Volume-Weighted Average Price from multiple sources',
        };
      case 'median':
        return {
          icon: <Activity className="h-3 w-3" />,
          label: 'Median',
          description: 'Statistical median used due to outliers',
        };
      case 'single':
        return {
          icon: <CheckCircle2 className="h-3 w-3" />,
          label: 'Single',
          description: 'Single source price',
        };
    }
  };

  const methodInfo = getMethodInfo();
  const confidencePercent = Math.round(confidence * 100);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted/50",
              getConfidenceColor(),
              className
            )}>
              {methodInfo.icon}
              <span>{confidencePercent}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px]">
            <div className="space-y-1.5">
              <div className="font-semibold">{methodInfo.label} Aggregation</div>
              <p className="text-xs text-muted-foreground">{methodInfo.description}</p>
              <div className="text-xs">
                <span className="text-muted-foreground">Sources:</span>{' '}
                {sourcesUsed.join(', ') || 'None'}
              </div>
              {outliersFiltered > 0 && (
                <div className="text-xs text-warning flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {outliersFiltered} outlier{outliersFiltered > 1 ? 's' : ''} filtered
                </div>
              )}
              <div className="text-xs">
                <span className="text-muted-foreground">Confidence:</span>{' '}
                <span className={getConfidenceColor()}>{confidencePercent}%</span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
            "bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors",
            className
          )}>
            {methodInfo.icon}
            <span className="text-muted-foreground">{methodInfo.label}</span>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              confidence >= 0.8 ? "bg-success" :
              confidence >= 0.5 ? "bg-warning" : "bg-destructive"
            )} />
            <span className={getConfidenceColor()}>{confidencePercent}%</span>
            {outliersFiltered > 0 && (
              <AlertTriangle className="h-3 w-3 text-warning ml-1" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px]">
          <div className="space-y-2">
            <div className="font-semibold flex items-center gap-2">
              {methodInfo.icon}
              {methodInfo.label} Price Aggregation
            </div>
            <p className="text-xs text-muted-foreground">{methodInfo.description}</p>
            
            <div className="pt-1 border-t border-border/50 space-y-1">
              <div className="text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Formula:</span>
                <code className="text-[10px] bg-muted px-1 rounded">
                  P = Σ(P×V) / ΣV
                </code>
              </div>
              <div className="text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Sources Used:</span>
                <span>{sourcesUsed.length}</span>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Active:</span>{' '}
                {sourcesUsed.join(', ') || 'None'}
              </div>
              {outliersFiltered > 0 && (
                <div className="text-xs text-warning flex items-center gap-1 pt-1">
                  <AlertTriangle className="h-3 w-3" />
                  ML filter removed {outliersFiltered} outlier price{outliersFiltered > 1 ? 's' : ''}
                </div>
              )}
            </div>
            
            <div className="pt-1 border-t border-border/50">
              <div className="text-xs flex items-center justify-between">
                <span className="text-muted-foreground">Confidence Score:</span>
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all",
                        confidence >= 0.8 ? "bg-success" :
                        confidence >= 0.5 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                  <span className={getConfidenceColor()}>{confidencePercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simplified status dot for minimal UI
 */
export function VWAPStatusDot({ 
  confidence, 
  className 
}: { 
  confidence: number; 
  className?: string;
}) {
  return (
    <div 
      className={cn(
        "w-2 h-2 rounded-full",
        confidence >= 0.8 ? "bg-success animate-pulse" :
        confidence >= 0.5 ? "bg-warning" : "bg-destructive",
        className
      )}
      title={`Confidence: ${Math.round(confidence * 100)}%`}
    />
  );
}
