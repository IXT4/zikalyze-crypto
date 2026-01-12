import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Zap, Link2, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { useOracleCrossValidation, OracleDeviation, DEVIATION_THRESHOLDS } from "@/hooks/useOracleCrossValidation";

interface OracleCrossValidationProps {
  crypto?: string;
}

const getSeverityColor = (severity: OracleDeviation["severity"]) => {
  switch (severity) {
    case "critical": return "text-red-500 bg-red-500/20";
    case "high": return "text-orange-400 bg-orange-500/20";
    case "medium": return "text-amber-400 bg-amber-500/20";
    case "low": return "text-emerald-400 bg-emerald-500/20";
  }
};

const getSeverityIcon = (severity: OracleDeviation["severity"]) => {
  switch (severity) {
    case "critical":
    case "high":
      return <AlertTriangle className="h-3 w-3" />;
    default:
      return <CheckCircle className="h-3 w-3" />;
  }
};

const OracleCrossValidation = ({ crypto }: OracleCrossValidationProps) => {
  const [expanded, setExpanded] = useState(false);
  const [alertThreshold] = useState<keyof typeof DEVIATION_THRESHOLDS>("medium");

  const {
    deviations,
    highestDeviation,
    isMonitoring,
    symbolsMonitored,
    alertsTriggered,
    pythConnected,
    diaConnected,
    getDeviation,
  } = useOracleCrossValidation(true, alertThreshold);

  // Get selected crypto deviation if specified
  const selectedDeviation = crypto ? getDeviation(crypto) : null;

  // Get top deviations for display
  const topDeviations = deviations.slice(0, expanded ? 10 : 5);
  const significantDeviations = deviations.filter(d => d.severity !== "low");

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Oracle Cross-Validation</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Oracle status indicators */}
          <div className="flex items-center gap-1.5">
            <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium ${
              pythConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'
            }`}>
              <Zap className="h-2.5 w-2.5" />
              Pyth
            </span>
            <span className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-medium ${
              diaConnected ? 'bg-blue-500/20 text-blue-400' : 'bg-muted text-muted-foreground'
            }`}>
              <Link2 className="h-2.5 w-2.5" />
              DIA
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="text-lg font-bold text-foreground">{symbolsMonitored}</div>
          <div className="text-[9px] text-muted-foreground">Symbols</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className={`text-lg font-bold ${significantDeviations.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {significantDeviations.length}
          </div>
          <div className="text-[9px] text-muted-foreground">Deviations</div>
        </div>
        <div className="rounded-lg bg-muted/50 p-2 text-center">
          <div className="text-lg font-bold text-foreground">{alertsTriggered}</div>
          <div className="text-[9px] text-muted-foreground">Alerts</div>
        </div>
      </div>

      {/* Selected crypto deviation if applicable */}
      {selectedDeviation && (
        <div className={`rounded-lg p-2 mb-3 ${getSeverityColor(selectedDeviation.severity)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSeverityIcon(selectedDeviation.severity)}
              <span className="text-xs font-medium">{selectedDeviation.symbol}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-70">Δ</span>
              <span className={`font-mono font-medium ${
                selectedDeviation.deviationPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {selectedDeviation.deviationPercent >= 0 ? '+' : ''}
                {selectedDeviation.deviationPercent.toFixed(3)}%
              </span>
            </div>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center justify-between rounded bg-background/50 px-2 py-1">
              <span className="flex items-center gap-1">
                <Zap className="h-2.5 w-2.5 text-amber-400" />
                Pyth
              </span>
              <span className="font-mono">${selectedDeviation.pythPrice.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-background/50 px-2 py-1">
              <span className="flex items-center gap-1">
                <Link2 className="h-2.5 w-2.5 text-blue-400" />
                DIA
              </span>
              <span className="font-mono">${selectedDeviation.diaPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Highest deviation highlight */}
      {highestDeviation && !selectedDeviation && (
        <div className={`rounded-lg p-2 mb-3 ${getSeverityColor(highestDeviation.severity)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getSeverityIcon(highestDeviation.severity)}
              <span className="text-xs font-medium">Highest: {highestDeviation.symbol}</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono font-medium">
              {Math.abs(highestDeviation.deviationPercent) >= 0.01 ? (
                highestDeviation.deviationPercent >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )
              ) : null}
              {highestDeviation.deviationPercent >= 0 ? '+' : ''}
              {highestDeviation.deviationPercent.toFixed(3)}%
            </div>
          </div>
        </div>
      )}

      {/* Deviation list */}
      {topDeviations.length > 0 ? (
        <div className="space-y-1">
          {topDeviations.map((deviation) => (
            <div
              key={deviation.symbol}
              className="flex items-center justify-between rounded-lg bg-muted/30 px-2 py-1.5 text-[10px]"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded px-1 py-0.5 ${getSeverityColor(deviation.severity)}`}>
                  {getSeverityIcon(deviation.severity)}
                </span>
                <span className="font-medium text-foreground">{deviation.symbol}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  <span className="text-amber-400">${deviation.pythPrice.toLocaleString()}</span>
                  {" / "}
                  <span className="text-blue-400">${deviation.diaPrice.toLocaleString()}</span>
                </span>
                <span className={`font-mono font-medium min-w-[50px] text-right ${
                  deviation.deviationPercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  {deviation.deviationPercent >= 0 ? '+' : ''}
                  {deviation.deviationPercent.toFixed(2)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
          {isMonitoring ? (
            <>
              <CheckCircle className="h-6 w-6 mb-1 text-emerald-400" />
              <span className="text-xs">All oracles aligned</span>
            </>
          ) : (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
              <span className="text-xs">Connecting to oracles...</span>
            </>
          )}
        </div>
      )}

      {/* Expand/collapse */}
      {deviations.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show {deviations.length - 5} more
            </>
          )}
        </button>
      )}

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-border flex items-center justify-center gap-3 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          &lt;0.5%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          0.5-2%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          2-5%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          &gt;5%
        </span>
      </div>
    </div>
  );
};

export default OracleCrossValidation;
