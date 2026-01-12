// ═══════════════════════════════════════════════════════════════════════════════
// 🖌️ Canvas2D Fallback Renderer — Software Rendering for Maximum Compatibility
// ═══════════════════════════════════════════════════════════════════════════════
// Provides smooth chart rendering using Canvas2D when WebGPU/WebGL2 unavailable
// Uses requestAnimationFrame for smooth animations
// ═══════════════════════════════════════════════════════════════════════════════

import type { ChartConfig, ChartDataPoint, FlashState } from "./webgpu-chart-renderer";
import { calculatePriceRange, cubicInterpolate, formatPrice, formatTime } from "./webgpu-chart-renderer";

export interface Canvas2DRendererState {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
}

export const initCanvas2DRenderer = (canvas: HTMLCanvasElement): Canvas2DRendererState | null => {
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;
  
  return { ctx, canvas };
};

const rgbaToString = (rgba: [number, number, number, number], alphaOverride?: number): string => {
  const [r, g, b, a] = rgba;
  const alpha = alphaOverride !== undefined ? alphaOverride : a;
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
};

export const renderCanvas2DChart = (
  state: Canvas2DRendererState,
  data: ChartDataPoint[],
  config: ChartConfig,
  flashState: FlashState,
  isBullish: boolean,
  _time: number
): void => {
  const { ctx, canvas } = state;
  const { width, height, padding, colors } = config;
  
  // Handle high DPI displays
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  if (data.length < 2) {
    // Draw placeholder
    ctx.fillStyle = rgbaToString(colors.text, 0.5);
    ctx.font = "14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Waiting for data...", width / 2, height / 2);
    return;
  }
  
  // Interpolate for smoothness
  const interpolated = cubicInterpolate(data, Math.max(data.length * 3, 100));
  const priceRange = calculatePriceRange(interpolated);
  
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  const timeMin = interpolated[0].timestamp;
  const timeMax = interpolated[interpolated.length - 1].timestamp;
  const timeRange = timeMax - timeMin || 1;
  
  // Convert data to canvas coordinates
  const points: { x: number; y: number }[] = interpolated.map((d) => ({
    x: padding.left + ((d.timestamp - timeMin) / timeRange) * chartWidth,
    y: padding.top + chartHeight - ((d.price - priceRange.min) / priceRange.range) * chartHeight,
  }));
  
  const color = isBullish ? colors.bullish : colors.bearish;
  const colorStr = rgbaToString(color);
  
  // Draw grid lines
  if (config.showGrid) {
    ctx.strokeStyle = rgbaToString(colors.grid);
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    
    // Horizontal grid lines (5 lines)
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Vertical grid lines (6 lines)
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (i / 5) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  }
  
  // Draw area fill with gradient
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, rgbaToString(color, 0.3));
  gradient.addColorStop(1, rgbaToString(color, 0.0));
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, height - padding.bottom);
  ctx.lineTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  
  ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Draw main line with glow effect
  if (config.showGlow) {
    ctx.shadowColor = colorStr;
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  
  ctx.strokeStyle = colorStr;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
  
  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  
  // Draw flash overlay if active
  if (flashState.active && flashState.intensity > 0) {
    const flashColor = flashState.type === "up" 
      ? `rgba(0, 255, 157, ${flashState.intensity * 0.3})`
      : `rgba(255, 7, 58, ${flashState.intensity * 0.3})`;
    
    ctx.fillStyle = flashColor;
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
  }
  
  // Draw Y-axis price labels
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillStyle = rgbaToString(colors.text);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * chartHeight;
    const price = priceRange.max - (i / 4) * priceRange.range;
    ctx.fillText(`$${formatPrice(price)}`, width - 5, y);
  }
  
  // Draw X-axis time labels
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  
  const timeLabels = 5;
  for (let i = 0; i <= timeLabels; i++) {
    const x = padding.left + (i / timeLabels) * chartWidth;
    const timestamp = timeMin + (i / timeLabels) * timeRange;
    ctx.fillText(formatTime(timestamp), x, height - padding.bottom + 5);
  }
  
  // Draw current price indicator (rightmost point)
  const lastPoint = points[points.length - 1];
  const lastPrice = interpolated[interpolated.length - 1].price;
  
  // Pulsing dot
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = colorStr;
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(lastPoint.x, lastPoint.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
  
  // Price label box
  const labelWidth = 70;
  const labelHeight = 20;
  ctx.fillStyle = colorStr;
  ctx.fillRect(width - padding.right + 5, lastPoint.y - labelHeight / 2, labelWidth, labelHeight);
  
  ctx.font = "bold 10px system-ui, sans-serif";
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`$${formatPrice(lastPrice)}`, width - padding.right + 10, lastPoint.y);
};

export const cleanupCanvas2DRenderer = (_state: Canvas2DRendererState): void => {
  // Canvas2D doesn't need explicit cleanup
};
