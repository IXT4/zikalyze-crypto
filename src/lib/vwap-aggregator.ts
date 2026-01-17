/**
 * VWAP Price Aggregator with ML-Based Outlier Filtering
 * 
 * Formula: P_global = Σ(P_i × V_i) / Σ(V_i)
 * 
 * This module implements a Volume-Weighted Average Price algorithm
 * combined with statistical ML methods to filter out bad/stale data
 * before aggregation.
 */

export interface PriceDataPoint {
  source: string;
  price: number;
  volume: number; // Estimated volume weight for this source
  timestamp: number;
  confidence: number; // 0-1 confidence score
}

export interface AggregatedPrice {
  price: number;
  confidence: number;
  sourcesUsed: string[];
  outliersSilent: string[];
  timestamp: number;
  method: 'vwap' | 'median' | 'single';
}

// Source reliability weights (based on historical accuracy)
const SOURCE_WEIGHTS: Record<string, number> = {
  'Pyth': 1.0,          // Primary oracle - highest trust
  'WebSocket': 0.95,    // Real-time aggregated feed
  'DeFiLlama': 0.85,    // Aggregated DEX data
  'CoinGecko': 0.80,    // Centralized aggregator
  'Fallback': 0.50,     // Generic fallback sources
};

// Maximum age for a price to be considered valid (5 seconds)
const MAX_PRICE_AGE_MS = 5000;

// Z-score threshold for outlier detection (2 standard deviations)
const OUTLIER_Z_THRESHOLD = 2.0;

// Minimum sources required for VWAP (otherwise use median)
const MIN_SOURCES_FOR_VWAP = 2;

/**
 * Calculate the median of an array of numbers
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0;
  
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate Z-score for outlier detection
 */
function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return Math.abs(value - mean) / stdDev;
}

/**
 * ML-based outlier detection using Modified Z-Score (robust to small samples)
 * Uses Median Absolute Deviation (MAD) for robustness
 */
function detectOutliers(dataPoints: PriceDataPoint[]): {
  valid: PriceDataPoint[];
  outliers: PriceDataPoint[];
} {
  if (dataPoints.length <= 2) {
    // Not enough data for outlier detection
    return { valid: dataPoints, outliers: [] };
  }
  
  const prices = dataPoints.map(d => d.price);
  const median = calculateMedian(prices);
  
  // Calculate Median Absolute Deviation (MAD)
  const absoluteDeviations = prices.map(p => Math.abs(p - median));
  const mad = calculateMedian(absoluteDeviations);
  
  // Modified Z-score using MAD (more robust than standard Z-score)
  // Formula: Modified Z = 0.6745 * (x - median) / MAD
  const K = 0.6745; // Constant for normal distribution
  
  const valid: PriceDataPoint[] = [];
  const outliers: PriceDataPoint[] = [];
  
  dataPoints.forEach(dp => {
    // If MAD is 0, use percentage deviation from median
    let isOutlier = false;
    
    if (mad === 0) {
      // All prices are identical or near-identical
      const pctDeviation = Math.abs(dp.price - median) / median;
      isOutlier = pctDeviation > 0.05; // 5% deviation threshold
    } else {
      const modifiedZ = (K * Math.abs(dp.price - median)) / mad;
      isOutlier = modifiedZ > OUTLIER_Z_THRESHOLD;
    }
    
    // Additional checks: stale data and confidence
    const now = Date.now();
    const isStale = now - dp.timestamp > MAX_PRICE_AGE_MS;
    const isLowConfidence = dp.confidence < 0.3;
    
    if (isOutlier || isStale || isLowConfidence) {
      outliers.push(dp);
    } else {
      valid.push(dp);
    }
  });
  
  // If all data was filtered out, return the most reliable source
  if (valid.length === 0 && dataPoints.length > 0) {
    const mostReliable = [...dataPoints].sort((a, b) => {
      const weightA = SOURCE_WEIGHTS[a.source] || 0.5;
      const weightB = SOURCE_WEIGHTS[b.source] || 0.5;
      return (weightB * b.confidence) - (weightA * a.confidence);
    })[0];
    
    return {
      valid: [mostReliable],
      outliers: dataPoints.filter(d => d !== mostReliable)
    };
  }
  
  return { valid, outliers };
}

/**
 * Calculate VWAP (Volume-Weighted Average Price)
 * P_global = Σ(P_i × V_i) / Σ(V_i)
 */
function calculateVWAP(dataPoints: PriceDataPoint[]): number {
  if (dataPoints.length === 0) return 0;
  if (dataPoints.length === 1) return dataPoints[0].price;
  
  let sumPriceVolume = 0;
  let sumVolume = 0;
  
  dataPoints.forEach(dp => {
    // Adjust volume by source reliability and confidence
    const sourceWeight = SOURCE_WEIGHTS[dp.source] || 0.5;
    const adjustedVolume = dp.volume * sourceWeight * dp.confidence;
    
    sumPriceVolume += dp.price * adjustedVolume;
    sumVolume += adjustedVolume;
  });
  
  if (sumVolume === 0) {
    // Fallback to simple average if no volume data
    return dataPoints.reduce((sum, dp) => sum + dp.price, 0) / dataPoints.length;
  }
  
  return sumPriceVolume / sumVolume;
}

/**
 * Calculate overall confidence score for the aggregated price
 */
function calculateAggregatedConfidence(
  validDataPoints: PriceDataPoint[],
  outlierCount: number
): number {
  if (validDataPoints.length === 0) return 0;
  
  // Base confidence from number of valid sources
  const sourceConfidence = Math.min(validDataPoints.length / 3, 1.0);
  
  // Average confidence of valid sources
  const avgSourceConfidence = validDataPoints.reduce(
    (sum, dp) => sum + dp.confidence * (SOURCE_WEIGHTS[dp.source] || 0.5),
    0
  ) / validDataPoints.length;
  
  // Penalty for outliers
  const outlierPenalty = outlierCount * 0.1;
  
  // Price consistency bonus (low std dev = high consistency)
  const prices = validDataPoints.map(dp => dp.price);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev = calculateStdDev(prices, mean);
  const coefficientOfVariation = stdDev / mean;
  const consistencyBonus = Math.max(0, 0.2 - coefficientOfVariation);
  
  return Math.max(0.1, Math.min(1.0, 
    sourceConfidence * 0.3 + 
    avgSourceConfidence * 0.5 + 
    consistencyBonus - 
    outlierPenalty
  ));
}

/**
 * Main aggregation function
 * Combines VWAP calculation with ML-based outlier filtering
 */
export function aggregatePrices(dataPoints: PriceDataPoint[]): AggregatedPrice {
  const now = Date.now();
  
  // Handle edge cases
  if (dataPoints.length === 0) {
    return {
      price: 0,
      confidence: 0,
      sourcesUsed: [],
      outliersSilent: [],
      timestamp: now,
      method: 'single',
    };
  }
  
  if (dataPoints.length === 1) {
    const dp = dataPoints[0];
    return {
      price: dp.price,
      confidence: dp.confidence * (SOURCE_WEIGHTS[dp.source] || 0.5),
      sourcesUsed: [dp.source],
      outliersSilent: [],
      timestamp: now,
      method: 'single',
    };
  }
  
  // Step 1: Filter outliers using ML-based detection
  const { valid, outliers } = detectOutliers(dataPoints);
  
  // Step 2: Choose aggregation method based on valid data points
  let price: number;
  let method: 'vwap' | 'median' | 'single';
  
  if (valid.length >= MIN_SOURCES_FOR_VWAP) {
    // Use VWAP for multiple sources
    price = calculateVWAP(valid);
    method = 'vwap';
  } else if (valid.length === 1) {
    // Single source - use directly
    price = valid[0].price;
    method = 'single';
  } else {
    // Fallback to median of all original data
    price = calculateMedian(dataPoints.map(dp => dp.price));
    method = 'median';
  }
  
  // Step 3: Calculate confidence
  const confidence = calculateAggregatedConfidence(valid, outliers.length);
  
  return {
    price,
    confidence,
    sourcesUsed: valid.map(dp => dp.source),
    outliersSilent: outliers.map(dp => dp.source),
    timestamp: now,
    method,
  };
}

/**
 * Create a PriceDataPoint from raw oracle/API data
 */
export function createPriceDataPoint(
  source: string,
  price: number,
  volume: number = 1000000, // Default 1M volume if unknown
  timestamp: number = Date.now(),
  confidence: number = 0.8
): PriceDataPoint {
  // Validate inputs
  if (!Number.isFinite(price) || price <= 0) {
    return {
      source,
      price: 0,
      volume: 0,
      timestamp,
      confidence: 0,
    };
  }
  
  return {
    source,
    price,
    volume: Math.max(0, volume),
    timestamp,
    confidence: Math.max(0, Math.min(1, confidence)),
  };
}

/**
 * Calculate dynamic confidence based on data freshness and source reliability
 */
export function calculateDynamicConfidence(
  source: string,
  timestamp: number,
  hasVolume: boolean = false
): number {
  const now = Date.now();
  const age = now - timestamp;
  
  // Base confidence from source
  let confidence = SOURCE_WEIGHTS[source] || 0.5;
  
  // Freshness penalty (linear decay over 5 seconds)
  if (age > 0) {
    const freshnessPenalty = Math.min(age / MAX_PRICE_AGE_MS, 0.5);
    confidence -= freshnessPenalty;
  }
  
  // Volume bonus
  if (hasVolume) {
    confidence += 0.1;
  }
  
  return Math.max(0.1, Math.min(1.0, confidence));
}

/**
 * Multi-symbol VWAP aggregator for batch processing
 */
export function aggregateMultipleSymbols(
  symbolDataMap: Map<string, PriceDataPoint[]>
): Map<string, AggregatedPrice> {
  const results = new Map<string, AggregatedPrice>();
  
  symbolDataMap.forEach((dataPoints, symbol) => {
    results.set(symbol, aggregatePrices(dataPoints));
  });
  
  return results;
}
