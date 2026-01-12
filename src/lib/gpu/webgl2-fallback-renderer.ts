// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 WebGL2 Fallback Renderer — GPU-Accelerated Charts for Non-WebGPU Browsers
// ═══════════════════════════════════════════════════════════════════════════════
// Provides smooth chart rendering using WebGL2 when WebGPU is unavailable
// Implements the same visual features with WebGL2 shaders
// ═══════════════════════════════════════════════════════════════════════════════

import type { ChartConfig, ChartDataPoint, FlashState } from "./webgpu-chart-renderer";
import { calculatePriceRange, normalizeDataPoints, cubicInterpolate } from "./webgpu-chart-renderer";

// Vertex shader for line rendering
const LINE_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in float a_index;

uniform float u_time;
uniform float u_pointCount;
uniform vec4 u_color;
uniform float u_flashIntensity;
uniform float u_flashType; // 1.0 = up, -1.0 = down

out vec4 v_color;
out float v_intensity;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  
  // Calculate glow intensity based on position (stronger at right edge = newest data)
  float progress = a_index / u_pointCount;
  v_intensity = 0.5 + progress * 0.5;
  
  // Apply flash effect
  float flash = u_flashIntensity * (0.5 + 0.5 * sin(u_time * 10.0));
  vec3 flashColor = u_flashType > 0.0 ? vec3(0.0, 1.0, 0.6) : vec3(1.0, 0.2, 0.3);
  
  v_color = vec4(mix(u_color.rgb, flashColor, flash * 0.5), u_color.a);
}
`;

// Fragment shader for line rendering with glow
const LINE_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
in float v_intensity;

uniform float u_glowEnabled;

out vec4 fragColor;

void main() {
  vec4 baseColor = v_color * v_intensity;
  
  // Add subtle glow effect
  if (u_glowEnabled > 0.5) {
    baseColor.rgb += v_color.rgb * 0.15;
  }
  
  fragColor = baseColor;
}
`;

// Area fill vertex shader
const AREA_VERTEX_SHADER = `#version 300 es
precision highp float;

in vec2 a_position;
in float a_alpha;

uniform vec4 u_topColor;
uniform vec4 u_bottomColor;

out vec4 v_color;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  
  // Gradient from top to bottom
  float t = (a_position.y + 1.0) / 2.0;
  v_color = mix(u_bottomColor, u_topColor, t);
  v_color.a *= a_alpha;
}
`;

const AREA_FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 v_color;
out vec4 fragColor;

void main() {
  fragColor = v_color;
}
`;

export interface WebGL2RendererState {
  gl: WebGL2RenderingContext;
  lineProgram: WebGLProgram;
  areaProgram: WebGLProgram;
  lineBuffer: WebGLBuffer;
  areaBuffer: WebGLBuffer;
  indexBuffer: WebGLBuffer;
}

const createShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
};

const createProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null => {
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  
  if (!vertexShader || !fragmentShader) return null;
  
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
};

export const initWebGL2Renderer = (canvas: HTMLCanvasElement): WebGL2RendererState | null => {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
  });
  
  if (!gl) return null;
  
  const lineProgram = createProgram(gl, LINE_VERTEX_SHADER, LINE_FRAGMENT_SHADER);
  const areaProgram = createProgram(gl, AREA_VERTEX_SHADER, AREA_FRAGMENT_SHADER);
  
  if (!lineProgram || !areaProgram) return null;
  
  const lineBuffer = gl.createBuffer();
  const areaBuffer = gl.createBuffer();
  const indexBuffer = gl.createBuffer();
  
  if (!lineBuffer || !areaBuffer || !indexBuffer) return null;
  
  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  return {
    gl,
    lineProgram,
    areaProgram,
    lineBuffer,
    areaBuffer,
    indexBuffer,
  };
};

export const renderWebGL2Chart = (
  state: WebGL2RendererState,
  data: ChartDataPoint[],
  config: ChartConfig,
  flashState: FlashState,
  isBullish: boolean,
  time: number
): void => {
  const { gl, lineProgram, areaProgram, lineBuffer, areaBuffer } = state;
  
  // Clear with transparent background
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  if (data.length < 2) return;
  
  // Interpolate for smoothness
  const interpolated = cubicInterpolate(data, Math.max(data.length * 3, 100));
  const priceRange = calculatePriceRange(interpolated);
  const normalizedPoints = normalizeDataPoints(interpolated, config, priceRange);
  
  const color = isBullish ? config.colors.bullish : config.colors.bearish;
  
  // Create area fill vertices (triangle strip from line to bottom)
  const areaVertices = new Float32Array(interpolated.length * 6);
  for (let i = 0; i < interpolated.length; i++) {
    const x = normalizedPoints[i * 2];
    const y = normalizedPoints[i * 2 + 1];
    
    // Top vertex (on the line)
    areaVertices[i * 6] = x;
    areaVertices[i * 6 + 1] = y;
    areaVertices[i * 6 + 2] = 0.3; // alpha
    
    // Bottom vertex
    areaVertices[i * 6 + 3] = x;
    areaVertices[i * 6 + 4] = -1.0; // bottom of canvas
    areaVertices[i * 6 + 5] = 0.0; // alpha
  }
  
  // Render area fill
  gl.useProgram(areaProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, areaBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, areaVertices, gl.DYNAMIC_DRAW);
  
  const areaPositionLoc = gl.getAttribLocation(areaProgram, "a_position");
  const areaAlphaLoc = gl.getAttribLocation(areaProgram, "a_alpha");
  
  gl.enableVertexAttribArray(areaPositionLoc);
  gl.enableVertexAttribArray(areaAlphaLoc);
  
  gl.vertexAttribPointer(areaPositionLoc, 2, gl.FLOAT, false, 12, 0);
  gl.vertexAttribPointer(areaAlphaLoc, 1, gl.FLOAT, false, 12, 8);
  
  const topColorLoc = gl.getUniformLocation(areaProgram, "u_topColor");
  const bottomColorLoc = gl.getUniformLocation(areaProgram, "u_bottomColor");
  
  gl.uniform4fv(topColorLoc, [...color.slice(0, 3), 0.25]);
  gl.uniform4fv(bottomColorLoc, [...color.slice(0, 3), 0.0]);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, interpolated.length * 2);
  
  // Create line vertices with index for gradient
  const lineVertices = new Float32Array(interpolated.length * 3);
  for (let i = 0; i < interpolated.length; i++) {
    lineVertices[i * 3] = normalizedPoints[i * 2];
    lineVertices[i * 3 + 1] = normalizedPoints[i * 2 + 1];
    lineVertices[i * 3 + 2] = i; // index
  }
  
  // Render line
  gl.useProgram(lineProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, lineVertices, gl.DYNAMIC_DRAW);
  
  const positionLoc = gl.getAttribLocation(lineProgram, "a_position");
  const indexLoc = gl.getAttribLocation(lineProgram, "a_index");
  
  gl.enableVertexAttribArray(positionLoc);
  gl.enableVertexAttribArray(indexLoc);
  
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 12, 0);
  gl.vertexAttribPointer(indexLoc, 1, gl.FLOAT, false, 12, 8);
  
  // Set uniforms
  const timeLoc = gl.getUniformLocation(lineProgram, "u_time");
  const pointCountLoc = gl.getUniformLocation(lineProgram, "u_pointCount");
  const colorLoc = gl.getUniformLocation(lineProgram, "u_color");
  const flashIntensityLoc = gl.getUniformLocation(lineProgram, "u_flashIntensity");
  const flashTypeLoc = gl.getUniformLocation(lineProgram, "u_flashType");
  const glowEnabledLoc = gl.getUniformLocation(lineProgram, "u_glowEnabled");
  
  gl.uniform1f(timeLoc, time);
  gl.uniform1f(pointCountLoc, interpolated.length);
  gl.uniform4fv(colorLoc, color);
  gl.uniform1f(flashIntensityLoc, flashState.active ? flashState.intensity : 0);
  gl.uniform1f(flashTypeLoc, flashState.type === "up" ? 1.0 : -1.0);
  gl.uniform1f(glowEnabledLoc, config.showGlow ? 1.0 : 0.0);
  
  // Draw line with thick line width
  gl.lineWidth(2.5);
  gl.drawArrays(gl.LINE_STRIP, 0, interpolated.length);
};

export const cleanupWebGL2Renderer = (state: WebGL2RendererState): void => {
  const { gl, lineProgram, areaProgram, lineBuffer, areaBuffer, indexBuffer } = state;
  
  gl.deleteProgram(lineProgram);
  gl.deleteProgram(areaProgram);
  gl.deleteBuffer(lineBuffer);
  gl.deleteBuffer(areaBuffer);
  gl.deleteBuffer(indexBuffer);
};
