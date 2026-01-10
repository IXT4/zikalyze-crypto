// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 ZIKALYZE AI BRAIN v10.0 — CLIENT-SIDE TYPES
// ═══════════════════════════════════════════════════════════════════════════════
// Fully decentralized — runs 100% in the browser with zero server dependency
// ═══════════════════════════════════════════════════════════════════════════════

export interface OnChainMetrics {
  exchangeNetFlow: { value: number; trend: 'OUTFLOW' | 'INFLOW' | 'NEUTRAL'; magnitude: string };
  whaleActivity: { buying: number; selling: number; netFlow: string };
  longTermHolders: { accumulating: boolean; change7d: number; sentiment: string };
  shortTermHolders: { behavior: string; profitLoss: number };
  activeAddresses: { current: number; change24h: number; trend: 'INCREASING' | 'DECREASING' | 'STABLE' };
  transactionVolume: { value: number; change24h: number };
  mempoolData?: { unconfirmedTxs: number; mempoolSize: number; avgFeeRate: number };
  source: string;
}

export interface ETFFlowData {
  btcNetFlow24h: number;
  btcNetFlow7d: number;
  ethNetFlow24h: number;
  ethNetFlow7d: number;
  trend: 'ACCUMULATING' | 'DISTRIBUTING' | 'NEUTRAL';
  topBuyers: string[];
  topSellers: string[];
  institutionalSentiment: string;
  source: string;
}

export interface MacroCatalyst {
  event: string;
  date: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedEffect: 'BULLISH' | 'BEARISH' | 'VOLATILE' | 'UNCERTAIN';
  description: string;
}

export interface VolumeSpikeAlert {
  isSpike: boolean;
  magnitude: 'EXTREME' | 'HIGH' | 'MODERATE' | 'NORMAL';
  percentageAboveAvg: number;
  signal: 'BULLISH_BREAKOUT' | 'BEARISH_BREAKDOWN' | 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  description: string;
}

export interface MarketStructure {
  trend: 'BULLISH' | 'BEARISH' | 'RANGING';
  strength: number;
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  lastBOS: 'BULLISH' | 'BEARISH' | null;
  lastCHoCH: 'BULLISH' | 'BEARISH' | null;
}

export interface InstitutionalVsRetail {
  institutionalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  institutionalConfidence: number;
  retailBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  retailConfidence: number;
  divergence: boolean;
  divergenceNote: string;
}

export interface IfThenScenario {
  condition: string;
  priceLevel: number;
  outcome: string;
  probability: number;
  action: string;
}

export interface PrecisionEntry {
  timing: 'NOW' | 'WAIT_PULLBACK' | 'WAIT_BREAKOUT' | 'AVOID';
  zone: string;
  trigger: string;
  confirmation: string;
  invalidation: string;
  volumeCondition: string;
  structureStatus: string;
  movementPhase: string;
}

// Real-time chart data for trend analysis
export interface ChartTrendInput {
  candles: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  trend24h: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  trendStrength: number;
  higherHighs: boolean;
  higherLows: boolean;
  lowerHighs: boolean;
  lowerLows: boolean;
  ema9: number;
  ema21: number;
  rsi: number;
  volumeTrend: 'INCREASING' | 'DECREASING' | 'STABLE';
  priceVelocity: number;
  isLive: boolean;
  source: string;
}

export interface AnalysisInput {
  crypto: string;
  price: number;
  change: number;
  high24h?: number;
  low24h?: number;
  volume?: number;
  marketCap?: number;
  language?: string;
  isLiveData?: boolean; // True if using real-time WebSocket data
  dataSource?: string;  // e.g., "price+on-chain+sentiment"
  onChainData?: OnChainMetrics;
  sentimentData?: {
    fearGreed?: { value: number; label: string };
    social?: { overall?: { score: number } };
  };
  chartTrendData?: ChartTrendInput; // Real-time 24h chart data for accurate trend analysis
}

export interface AnalysisResult {
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  analysis: string;
  insights: string[];
  macroCatalysts: MacroCatalyst[];
  volumeSpike: VolumeSpikeAlert;
  precisionEntry: PrecisionEntry;
  institutionalVsRetail: InstitutionalVsRetail;
  scenarios: IfThenScenario[];
  timestamp: string;
  source: 'client-side-wasm';
}
