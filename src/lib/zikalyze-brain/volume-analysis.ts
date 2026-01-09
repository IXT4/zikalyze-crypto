// ═══════════════════════════════════════════════════════════════════════════════
// 📊 VOLUME SPIKE DETECTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

import { VolumeSpikeAlert } from './types';

export function detectVolumeSpike(volumeData: {
  currentVolume: number;
  avgVolume24h: number;
  priceChange: number;
  price: number;
  high24h: number;
  low24h: number;
}): VolumeSpikeAlert {
  const { currentVolume, avgVolume24h, priceChange, price, high24h, low24h } = volumeData;

  // Calculate volume ratio
  const volumeRatio = avgVolume24h > 0 ? (currentVolume / avgVolume24h) * 100 : 100;
  const percentageAboveAvg = volumeRatio - 100;

  // Determine magnitude
  let magnitude: VolumeSpikeAlert['magnitude'] = 'NORMAL';
  let isSpike = false;

  if (percentageAboveAvg >= 200) {
    magnitude = 'EXTREME';
    isSpike = true;
  } else if (percentageAboveAvg >= 100) {
    magnitude = 'HIGH';
    isSpike = true;
  } else if (percentageAboveAvg >= 50) {
    magnitude = 'MODERATE';
    isSpike = true;
  }

  // Determine signal context based on price action + volume
  let signal: VolumeSpikeAlert['signal'] = 'NEUTRAL';
  let description = '';

  const range = high24h - low24h;
  const pricePosition = range > 0 ? ((price - low24h) / range) * 100 : 50;

  if (isSpike) {
    if (priceChange > 3 && pricePosition > 70) {
      signal = 'BULLISH_BREAKOUT';
      description = `🚀 VOLUME SURGE +${percentageAboveAvg.toFixed(0)}% — Bullish breakout momentum with price near highs`;
    } else if (priceChange < -3 && pricePosition < 30) {
      signal = 'BEARISH_BREAKDOWN';
      description = `📉 VOLUME SURGE +${percentageAboveAvg.toFixed(0)}% — Bearish breakdown with price near lows`;
    } else if (priceChange > 0 && pricePosition < 50) {
      signal = 'ACCUMULATION';
      description = `💎 VOLUME SPIKE +${percentageAboveAvg.toFixed(0)}% — Accumulation detected at lower levels`;
    } else if (priceChange < 0 && pricePosition > 50) {
      signal = 'DISTRIBUTION';
      description = `⚠️ VOLUME SPIKE +${percentageAboveAvg.toFixed(0)}% — Distribution detected at higher levels`;
    } else {
      description = `📊 VOLUME SPIKE +${percentageAboveAvg.toFixed(0)}% — Unusual activity, watch for directional move`;
    }
  } else {
    description = 'Normal volume conditions';
  }

  return {
    isSpike,
    magnitude,
    percentageAboveAvg: Math.max(0, percentageAboveAvg),
    signal,
    description
  };
}

export function getVolumeSpikeFlag(volumeSpike: VolumeSpikeAlert): string {
  if (!volumeSpike.isSpike) return '';

  const emoji = volumeSpike.signal === 'BULLISH_BREAKOUT' ? '🟢' :
                volumeSpike.signal === 'BEARISH_BREAKDOWN' ? '🔴' :
                volumeSpike.signal === 'ACCUMULATION' ? '💎' :
                volumeSpike.signal === 'DISTRIBUTION' ? '⚠️' : '📊';

  return `${emoji} VOLUME ALERT: ${volumeSpike.description}`;
}
