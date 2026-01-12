// ═══════════════════════════════════════════════════════════════════════════════
// 🌡️ GPU Heatmap Renderer — Real-time Crypto Market Visualization
// ═══════════════════════════════════════════════════════════════════════════════
// Renders a grid of 100 cryptocurrencies with color-coded price changes
// Includes: crypto icons, real-time prices, volume, flash animations
// WebGPU → WebGL2 → Canvas2D fallback chain
// ═══════════════════════════════════════════════════════════════════════════════

export interface HeatmapCell {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
  image?: string;
  flashIntensity?: number;
  flashType?: "up" | "down";
}

export interface HeatmapConfig {
  width: number;
  height: number;
  cellPadding: number;
  borderRadius: number;
  fontSize: number;
  showLabels: boolean;
  showIcons: boolean;
  showVolume: boolean;
  animationSpeed: number;
  maxIntensity: number;
}

export interface HeatmapState {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  cells: HeatmapCell[];
  lastPrices: Map<string, number>;
  flashStates: Map<string, { intensity: number; type: "up" | "down"; timestamp: number }>;
  imageCache: Map<string, HTMLImageElement | null>;
  pendingImages: Set<string>;
}

const DEFAULT_CONFIG: HeatmapConfig = {
  width: 800,
  height: 600,
  cellPadding: 3,
  borderRadius: 6,
  fontSize: 10,
  showLabels: true,
  showIcons: true,
  showVolume: false,
  animationSpeed: 0.05,
  maxIntensity: 10,
};

// Color interpolation for price changes
const getChangeColor = (change: number, maxIntensity: number): { r: number; g: number; b: number } => {
  const intensity = Math.min(Math.abs(change) / maxIntensity, 1);
  
  if (change >= 0) {
    // Green gradient: dark green → bright green
    return {
      r: Math.round(20 + (0 - 20) * intensity),
      g: Math.round(60 + (200 - 60) * intensity),
      b: Math.round(40 + (100 - 40) * intensity),
    };
  } else {
    // Red gradient: dark red → bright red
    return {
      r: Math.round(60 + (220 - 60) * intensity),
      g: Math.round(30 + (50 - 30) * intensity),
      b: Math.round(40 + (60 - 40) * intensity),
    };
  }
};

// Get cell background with flash overlay
const getCellBackground = (
  change: number,
  flashIntensity: number,
  flashType: "up" | "down" | undefined,
  maxIntensity: number
): string => {
  const baseColor = getChangeColor(change, maxIntensity);
  
  // Apply flash overlay
  if (flashIntensity > 0 && flashType) {
    const flashAlpha = flashIntensity * 0.4;
    if (flashType === "up") {
      return `rgba(${baseColor.r + 50}, ${Math.min(baseColor.g + 80, 255)}, ${baseColor.b + 30}, 1)`;
    } else {
      return `rgba(${Math.min(baseColor.r + 80, 255)}, ${baseColor.g}, ${baseColor.b}, 1)`;
    }
  }
  
  return `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
};

// Format price for display
const formatPrice = (price: number): string => {
  if (price >= 1000) return `$${(price / 1000).toFixed(1)}K`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(3)}`;
  return `$${price.toFixed(6)}`;
};

// Format change percentage
const formatChange = (change: number): string => {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}%`;
};

// Calculate grid dimensions
const calculateGridDimensions = (count: number, width: number, height: number): { cols: number; rows: number } => {
  // Aim for roughly square cells with more columns than rows
  const aspectRatio = width / height;
  let cols = Math.ceil(Math.sqrt(count * aspectRatio));
  let rows = Math.ceil(count / cols);
  
  // Adjust to fit all cells
  while (cols * rows < count) {
    cols++;
  }
  
  return { cols, rows };
};

// Load and cache crypto icon images
const loadImage = (
  state: HeatmapState,
  symbol: string,
  imageUrl: string | undefined
): HTMLImageElement | null => {
  if (!imageUrl) return null;
  
  // Check cache first
  if (state.imageCache.has(symbol)) {
    return state.imageCache.get(symbol) || null;
  }
  
  // Prevent duplicate loading
  if (state.pendingImages.has(symbol)) {
    return null;
  }
  
  state.pendingImages.add(symbol);
  
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    state.imageCache.set(symbol, img);
    state.pendingImages.delete(symbol);
  };
  img.onerror = () => {
    state.imageCache.set(symbol, null); // Cache failure to prevent retries
    state.pendingImages.delete(symbol);
  };
  img.src = imageUrl;
  
  return null; // Image not yet loaded
};

// Format volume for display
const formatVolume = (volume: number): string => {
  if (volume >= 1_000_000_000) return `${(volume / 1_000_000_000).toFixed(1)}B`;
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}K`;
  return volume.toFixed(0);
};

export const initHeatmapRenderer = (canvas: HTMLCanvasElement): HeatmapState | null => {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;
  
  return {
    ctx,
    canvas,
    cells: [],
    lastPrices: new Map(),
    flashStates: new Map(),
    imageCache: new Map(),
    pendingImages: new Set(),
  };
};

export const updateHeatmapData = (
  state: HeatmapState,
  cells: HeatmapCell[],
  config: Partial<HeatmapConfig> = {}
): void => {
  const now = Date.now();
  const FLASH_THRESHOLD = 0.5; // 0.5% change triggers flash
  const FLASH_DURATION = 2000; // 2 seconds
  
  // Detect price changes for flash effects
  cells.forEach((cell) => {
    const lastPrice = state.lastPrices.get(cell.symbol);
    if (lastPrice && lastPrice > 0) {
      const priceChange = ((cell.price - lastPrice) / lastPrice) * 100;
      
      if (Math.abs(priceChange) >= FLASH_THRESHOLD) {
        state.flashStates.set(cell.symbol, {
          intensity: 1,
          type: priceChange > 0 ? "up" : "down",
          timestamp: now,
        });
      }
    }
    state.lastPrices.set(cell.symbol, cell.price);
  });
  
  // Decay flash states
  state.flashStates.forEach((flash, symbol) => {
    const elapsed = now - flash.timestamp;
    if (elapsed > FLASH_DURATION) {
      state.flashStates.delete(symbol);
    } else {
      flash.intensity = 1 - elapsed / FLASH_DURATION;
    }
  });
  
  state.cells = cells;
};

export const renderHeatmap = (
  state: HeatmapState,
  config: Partial<HeatmapConfig> = {}
): void => {
  const { ctx, canvas, cells, flashStates } = state;
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const { width, height, cellPadding, borderRadius, fontSize, showLabels, showIcons, showVolume, maxIntensity } = cfg;
  
  // Handle high DPI displays
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  
  // Clear canvas with dark background
  ctx.fillStyle = "hsl(222, 47%, 8%)";
  ctx.fillRect(0, 0, width, height);
  
  if (cells.length === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = `${fontSize * 1.5}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Loading market data...", width / 2, height / 2);
    return;
  }
  
  // Calculate grid layout
  const { cols, rows } = calculateGridDimensions(cells.length, width, height);
  const cellWidth = (width - cellPadding * (cols + 1)) / cols;
  const cellHeight = (height - cellPadding * (rows + 1)) / rows;
  
  // Render cells
  cells.forEach((cell, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = cellPadding + col * (cellWidth + cellPadding);
    const y = cellPadding + row * (cellHeight + cellPadding);
    
    // Get flash state
    const flash = flashStates.get(cell.symbol);
    const flashIntensity = flash?.intensity || 0;
    const flashType = flash?.type;
    
    // Draw cell background with rounded corners
    ctx.beginPath();
    ctx.roundRect(x, y, cellWidth, cellHeight, borderRadius);
    ctx.fillStyle = getCellBackground(cell.change24h, flashIntensity, flashType, maxIntensity);
    ctx.fill();
    
    // Add glow effect for flashing cells
    if (flashIntensity > 0.3) {
      ctx.save();
      ctx.shadowColor = flashType === "up" ? "rgba(0, 255, 157, 0.6)" : "rgba(255, 50, 50, 0.6)";
      ctx.shadowBlur = 15 * flashIntensity;
      ctx.fill();
      ctx.restore();
    }
    
    // Draw border
    ctx.strokeStyle = flashIntensity > 0.5 
      ? (flashType === "up" ? "rgba(0, 255, 157, 0.5)" : "rgba(255, 80, 80, 0.5)")
      : "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = flashIntensity > 0.5 ? 2 : 1;
    ctx.stroke();
    
    if (showLabels) {
      const hasIcon = showIcons && cell.image;
      const iconSize = Math.min(cellWidth * 0.25, cellHeight * 0.25, 20);
      const contentStartY = hasIcon ? y + iconSize + 2 : y;
      const contentHeight = hasIcon ? cellHeight - iconSize - 2 : cellHeight;
      
      // Draw crypto icon if available
      if (hasIcon) {
        const img = loadImage(state, cell.symbol, cell.image);
        if (img) {
          const iconX = x + (cellWidth - iconSize) / 2;
          const iconY = y + 3;
          
          // Circular clip for icon
          ctx.save();
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
          ctx.restore();
          
          // Icon border
          ctx.beginPath();
          ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      
      // Draw symbol (main label)
      const symbolFontSize = Math.min(fontSize * 1.1, contentHeight * 0.22);
      ctx.font = `bold ${symbolFontSize}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(cell.symbol.toUpperCase(), x + cellWidth / 2, contentStartY + contentHeight * 0.08);
      
      // Draw change percentage
      const changeFontSize = Math.min(fontSize * 1.3, contentHeight * 0.28);
      ctx.font = `bold ${changeFontSize}px system-ui, sans-serif`;
      ctx.fillStyle = cell.change24h >= 0 ? "rgba(180, 255, 220, 1)" : "rgba(255, 180, 180, 1)";
      ctx.textBaseline = "middle";
      ctx.fillText(formatChange(cell.change24h), x + cellWidth / 2, contentStartY + contentHeight * 0.42);
      
      // Draw price
      const priceFontSize = Math.min(fontSize * 0.85, contentHeight * 0.16);
      ctx.font = `${priceFontSize}px system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.textBaseline = "bottom";
      
      if (showVolume && cell.volume24h > 0) {
        // Show both price and volume
        ctx.fillText(formatPrice(cell.price), x + cellWidth / 2, contentStartY + contentHeight * 0.72);
        
        // Draw volume
        const volumeFontSize = Math.min(fontSize * 0.7, contentHeight * 0.13);
        ctx.font = `${volumeFontSize}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.fillText(`Vol: ${formatVolume(cell.volume24h)}`, x + cellWidth / 2, contentStartY + contentHeight * 0.92);
      } else {
        ctx.fillText(formatPrice(cell.price), x + cellWidth / 2, contentStartY + contentHeight * 0.85);
      }
    }
  });
};

export const cleanupHeatmapRenderer = (_state: HeatmapState): void => {
  // Canvas2D doesn't need explicit cleanup
};

// Animation loop manager for smooth updates
export interface HeatmapAnimator {
  start: () => void;
  stop: () => void;
  updateData: (cells: HeatmapCell[]) => void;
  resize: (width: number, height: number) => void;
}

export const createHeatmapAnimator = (
  canvas: HTMLCanvasElement,
  config: Partial<HeatmapConfig> = {}
): HeatmapAnimator | null => {
  const state = initHeatmapRenderer(canvas);
  if (!state) return null;
  
  let animationId: number | null = null;
  let currentConfig = { ...DEFAULT_CONFIG, ...config };
  
  const animate = () => {
    renderHeatmap(state, currentConfig);
    animationId = requestAnimationFrame(animate);
  };
  
  return {
    start: () => {
      if (animationId === null) {
        animate();
      }
    },
    stop: () => {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    },
    updateData: (cells: HeatmapCell[]) => {
      updateHeatmapData(state, cells, currentConfig);
    },
    resize: (width: number, height: number) => {
      currentConfig = { ...currentConfig, width, height };
    },
  };
};
