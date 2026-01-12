// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 GPU Chart Manager — Unified Interface for All Rendering Backends
// ═══════════════════════════════════════════════════════════════════════════════
// Manages WebGPU/WebGL2/Canvas2D rendering with automatic fallback
// Provides smooth 60 FPS animation loop with flash detection
// ═══════════════════════════════════════════════════════════════════════════════

import type { ChartConfig, ChartDataPoint, FlashState, RenderBackend } from "./webgpu-chart-renderer";
import { detectBestBackend, getDefaultChartConfig } from "./webgpu-chart-renderer";
import { initWebGL2Renderer, renderWebGL2Chart, cleanupWebGL2Renderer, type WebGL2RendererState } from "./webgl2-fallback-renderer";
import { initCanvas2DRenderer, renderCanvas2DChart, cleanupCanvas2DRenderer, type Canvas2DRendererState } from "./canvas2d-fallback-renderer";

export interface GPUChartManager {
  backend: RenderBackend;
  isInitialized: boolean;
  canvas: HTMLCanvasElement | null;
  config: ChartConfig;
  flashState: FlashState;
  lastPrice: number;
  animationFrameId: number | null;
  startTime: number;
  
  // Internal state
  webgl2State: WebGL2RendererState | null;
  canvas2dState: Canvas2DRendererState | null;
}

export type GPUChartInstance = {
  render: (data: ChartDataPoint[], isBullish: boolean) => void;
  triggerFlash: (type: "up" | "down") => void;
  updateConfig: (config: Partial<ChartConfig>) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
  getBackend: () => RenderBackend;
};

const FLASH_DURATION = 700; // ms
const FLASH_THRESHOLD = 0.005; // 0.5% price change triggers flash

export const createGPUChartManager = async (
  canvas: HTMLCanvasElement,
  initialWidth: number,
  initialHeight: number
): Promise<GPUChartInstance> => {
  const backend = await detectBestBackend();
  console.log(`[GPUChart] Using backend: ${backend}`);
  
  const manager: GPUChartManager = {
    backend,
    isInitialized: false,
    canvas,
    config: getDefaultChartConfig(initialWidth, initialHeight),
    flashState: { active: false, type: "up", intensity: 0, startTime: 0 },
    lastPrice: 0,
    animationFrameId: null,
    startTime: performance.now(),
    webgl2State: null,
    canvas2dState: null,
  };
  
  // Initialize the appropriate renderer
  if (backend === "webgl2") {
    manager.webgl2State = initWebGL2Renderer(canvas);
    manager.isInitialized = manager.webgl2State !== null;
  } else {
    // Canvas2D fallback (also used for WebGPU until we implement it)
    manager.canvas2dState = initCanvas2DRenderer(canvas);
    manager.isInitialized = manager.canvas2dState !== null;
  }
  
  if (!manager.isInitialized) {
    console.warn("[GPUChart] Failed to initialize any rendering backend");
  }
  
  let currentData: ChartDataPoint[] = [];
  let currentIsBullish = true;
  
  // Animation loop
  const animate = () => {
    if (!manager.isInitialized) return;
    
    const now = performance.now();
    const time = (now - manager.startTime) / 1000;
    
    // Update flash state
    if (manager.flashState.active) {
      const elapsed = now - manager.flashState.startTime;
      if (elapsed >= FLASH_DURATION) {
        manager.flashState.active = false;
        manager.flashState.intensity = 0;
      } else {
        // Ease out
        manager.flashState.intensity = 1 - (elapsed / FLASH_DURATION);
      }
    }
    
    // Render
    if (currentData.length > 0) {
      if (manager.webgl2State) {
        renderWebGL2Chart(
          manager.webgl2State,
          currentData,
          manager.config,
          manager.flashState,
          currentIsBullish,
          time
        );
      } else if (manager.canvas2dState) {
        renderCanvas2DChart(
          manager.canvas2dState,
          currentData,
          manager.config,
          manager.flashState,
          currentIsBullish,
          time
        );
      }
    }
    
    manager.animationFrameId = requestAnimationFrame(animate);
  };
  
  // Start animation loop
  animate();
  
  const render = (data: ChartDataPoint[], isBullish: boolean) => {
    if (data.length > 0) {
      const newPrice = data[data.length - 1].price;
      
      // Detect flash-worthy price changes
      if (manager.lastPrice > 0) {
        const changePercent = Math.abs(newPrice - manager.lastPrice) / manager.lastPrice;
        if (changePercent >= FLASH_THRESHOLD) {
          const flashType = newPrice > manager.lastPrice ? "up" : "down";
          manager.flashState = {
            active: true,
            type: flashType,
            intensity: 1,
            startTime: performance.now(),
          };
        }
      }
      
      manager.lastPrice = newPrice;
    }
    
    currentData = data;
    currentIsBullish = isBullish;
  };
  
  const triggerFlash = (type: "up" | "down") => {
    manager.flashState = {
      active: true,
      type,
      intensity: 1,
      startTime: performance.now(),
    };
  };
  
  const updateConfig = (newConfig: Partial<ChartConfig>) => {
    manager.config = { ...manager.config, ...newConfig };
  };
  
  const resize = (width: number, height: number) => {
    manager.config.width = width;
    manager.config.height = height;
    
    if (manager.canvas) {
      manager.canvas.style.width = `${width}px`;
      manager.canvas.style.height = `${height}px`;
    }
  };
  
  const destroy = () => {
    if (manager.animationFrameId) {
      cancelAnimationFrame(manager.animationFrameId);
    }
    
    if (manager.webgl2State) {
      cleanupWebGL2Renderer(manager.webgl2State);
    }
    
    if (manager.canvas2dState) {
      cleanupCanvas2DRenderer(manager.canvas2dState);
    }
    
    manager.isInitialized = false;
  };
  
  const getBackend = () => manager.backend;
  
  return {
    render,
    triggerFlash,
    updateConfig,
    resize,
    destroy,
    getBackend,
  };
};
