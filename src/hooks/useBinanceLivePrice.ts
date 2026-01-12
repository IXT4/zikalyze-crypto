// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 useBinanceLivePrice — Deprecated: Re-exports from useKrakenLivePrice
// ═══════════════════════════════════════════════════════════════════════════════
// This file is kept for backward compatibility.
// All live price streaming now uses Kraken via useKrakenLivePrice.
// ═══════════════════════════════════════════════════════════════════════════════

export { useKrakenLivePrice as useBinanceLivePrice } from "./useKrakenLivePrice";
export { useKrakenLivePrice } from "./useKrakenLivePrice";
