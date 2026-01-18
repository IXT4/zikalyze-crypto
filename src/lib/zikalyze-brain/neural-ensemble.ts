// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 NEURAL ENSEMBLE ENGINE — Advanced Sequential & Boosted Prediction
// ═══════════════════════════════════════════════════════════════════════════════
// ⚡ Implements advanced temporal pattern recognition with gated memory units
// 🎯 Ensemble prediction with iterative refinement for robust bias detection
// 📴 100% Client-side — No external dependencies
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Sigmoid activation function: σ(x) = 1 / (1 + e^(-x))
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));

// Hyperbolic tangent activation
const tanh = (x: number): number => Math.tanh(x);

// Element-wise vector operations
const vecAdd = (a: number[], b: number[]): number[] => a.map((v, i) => v + (b[i] || 0));
const vecMul = (a: number[], b: number[]): number[] => a.map((v, i) => v * (b[i] || 1));
const vecScale = (a: number[], s: number): number[] => a.map(v => v * s);
const vecSubtract = (a: number[], b: number[]): number[] => a.map((v, i) => v - (b[i] || 0));

// Dot product
const dot = (a: number[], b: number[]): number => 
  a.reduce((sum, v, i) => sum + v * (b[i] || 0), 0);

// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 GATED RECURRENT MEMORY UNIT
// ═══════════════════════════════════════════════════════════════════════════════
// Implements temporal pattern recognition with adaptive memory gating
// r_t = σ(W_r·[h_{t-1}, x_t] + b_r)  — Reset gate
// z_t = σ(W_z·[h_{t-1}, x_t] + b_z)  — Update gate
// h̃_t = tanh(W_h·[r_t ⊙ h_{t-1}, x_t] + b_h)  — Candidate state
// h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t  — New hidden state
// ═══════════════════════════════════════════════════════════════════════════════

interface GatedMemoryState {
  hidden: number[];
  timestamp: number;
}

interface GatedMemoryWeights {
  Wr: number[];  // Reset gate weights
  Wz: number[];  // Update gate weights
  Wh: number[];  // Candidate state weights
  br: number;    // Reset bias
  bz: number;    // Update bias
  bh: number;    // Candidate bias
}

// Initialize weights based on input features
function initializeGatedWeights(inputSize: number): GatedMemoryWeights {
  // Xavier/Glorot initialization approximation
  const scale = Math.sqrt(2 / (inputSize + 8));
  
  return {
    Wr: Array(inputSize).fill(0).map((_, i) => Math.sin(i * 0.7) * scale),
    Wz: Array(inputSize).fill(0).map((_, i) => Math.cos(i * 0.5) * scale),
    Wh: Array(inputSize).fill(0).map((_, i) => Math.sin(i * 1.1 + 0.3) * scale),
    br: 0.1,
    bz: 0.2,
    bh: 0,
  };
}

// Forward pass through gated memory unit
function gatedMemoryForward(
  input: number[],
  prevState: GatedMemoryState,
  weights: GatedMemoryWeights
): GatedMemoryState {
  const { hidden: h_prev } = prevState;
  const x = input;
  
  // Ensure dimensions match
  const hiddenSize = h_prev.length;
  const inputSize = x.length;
  
  // Concatenate [h_{t-1}, x_t] for gate computations
  const concat = [...h_prev, ...x];
  
  // Reset gate: r_t = σ(W_r·[h_{t-1}, x_t] + b_r)
  const r_pre = dot(weights.Wr.slice(0, concat.length), concat) + weights.br;
  const r_t = sigmoid(r_pre);
  
  // Update gate: z_t = σ(W_z·[h_{t-1}, x_t] + b_z)
  const z_pre = dot(weights.Wz.slice(0, concat.length), concat) + weights.bz;
  const z_t = sigmoid(z_pre);
  
  // Candidate state: h̃_t = tanh(W_h·[r_t ⊙ h_{t-1}, x_t] + b_h)
  const reset_hidden = vecScale(h_prev, r_t);
  const candidateInput = [...reset_hidden, ...x];
  const h_tilde_pre = dot(weights.Wh.slice(0, candidateInput.length), candidateInput) + weights.bh;
  const h_tilde = tanh(h_tilde_pre);
  
  // New hidden state: h_t = (1 - z_t) ⊙ h_{t-1} + z_t ⊙ h̃_t
  const h_new = h_prev.map((h, i) => 
    (1 - z_t) * h + z_t * h_tilde
  );
  
  return {
    hidden: h_new,
    timestamp: Date.now(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 ENSEMBLE BOOSTED PREDICTOR
// ═══════════════════════════════════════════════════════════════════════════════
// Implements iterative ensemble refinement for robust predictions
// F_M(x) = F_0(x) + Σ_{m=1}^M η·γ_m·h_m(x)
// Where each weak learner h_m focuses on residual errors
// ═══════════════════════════════════════════════════════════════════════════════

interface WeakLearner {
  weight: number;      // γ_m — Learner importance
  threshold: number;   // Decision threshold
  feature: number;     // Which feature to use
  direction: number;   // +1 or -1
}

interface EnsembleConfig {
  learningRate: number;    // η — Step size
  numLearners: number;     // M — Number of weak learners
  regularization: number;  // λ — Regularization strength
}

// Initialize ensemble with diverse weak learners
function initializeEnsemble(numFeatures: number, config: EnsembleConfig): WeakLearner[] {
  const learners: WeakLearner[] = [];
  
  for (let m = 0; m < config.numLearners; m++) {
    learners.push({
      weight: 1 / config.numLearners,
      threshold: (m - config.numLearners / 2) / config.numLearners,
      feature: m % numFeatures,
      direction: m % 2 === 0 ? 1 : -1,
    });
  }
  
  return learners;
}

// Weak learner prediction: simple threshold-based
function weakLearnerPredict(learner: WeakLearner, features: number[]): number {
  const featureValue = features[learner.feature] || 0;
  return learner.direction * (featureValue > learner.threshold ? 1 : -1);
}

// Ensemble prediction: F_M(x) = F_0(x) + Σ η·γ_m·h_m(x)
function ensemblePredict(
  features: number[],
  learners: WeakLearner[],
  config: EnsembleConfig,
  baseScore: number = 0
): number {
  let score = baseScore; // F_0(x)
  
  for (const learner of learners) {
    const h_m = weakLearnerPredict(learner, features);
    score += config.learningRate * learner.weight * h_m;
  }
  
  // Apply regularization to prevent overconfidence
  return score / (1 + config.regularization * Math.abs(score));
}

// Update learner weights based on error residuals
function updateEnsembleWeights(
  learners: WeakLearner[],
  features: number[],
  target: number,
  prediction: number,
  config: EnsembleConfig
): WeakLearner[] {
  const residual = target - prediction;
  
  return learners.map(learner => {
    const h_m = weakLearnerPredict(learner, features);
    const alignment = h_m * Math.sign(residual);
    
    // Increase weight if learner aligned with residual direction
    const newWeight = learner.weight * (1 + config.learningRate * alignment * 0.1);
    
    return {
      ...learner,
      weight: Math.max(0.01, Math.min(2, newWeight)),
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🚀 NEURAL ENSEMBLE PREDICTOR — Main Interface
// ═══════════════════════════════════════════════════════════════════════════════

export interface SequenceDataPoint {
  price: number;
  change: number;
  volume: number;
  volatility: number;
  momentum: number;
  timestamp: number;
}

export interface NeuralEnsembleState {
  gatedState: GatedMemoryState;
  ensemble: WeakLearner[];
  sequenceBuffer: SequenceDataPoint[];
  predictionHistory: { bias: number; confidence: number; timestamp: number }[];
  adaptiveThresholds: { bullish: number; bearish: number };
}

export interface NeuralPrediction {
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  temporalStrength: number;  // How strong the sequential pattern is
  ensembleAgreement: number; // How aligned the weak learners are
  adaptiveScore: number;     // Final refined score
}

// Default initial state
const HIDDEN_SIZE = 8;

function createInitialState(): NeuralEnsembleState {
  const ensembleConfig: EnsembleConfig = {
    learningRate: 0.1,
    numLearners: 12,
    regularization: 0.05,
  };
  
  return {
    gatedState: {
      hidden: Array(HIDDEN_SIZE).fill(0),
      timestamp: Date.now(),
    },
    ensemble: initializeEnsemble(5, ensembleConfig),
    sequenceBuffer: [],
    predictionHistory: [],
    adaptiveThresholds: { bullish: 0.3, bearish: -0.3 },
  };
}

// Global state management (per symbol)
const stateCache = new Map<string, NeuralEnsembleState>();

function getState(symbol: string): NeuralEnsembleState {
  if (!stateCache.has(symbol)) {
    stateCache.set(symbol, createInitialState());
  }
  return stateCache.get(symbol)!;
}

function setState(symbol: string, state: NeuralEnsembleState): void {
  stateCache.set(symbol, state);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎯 MAIN PREDICTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export function neuralEnsemblePredict(
  symbol: string,
  data: SequenceDataPoint
): NeuralPrediction {
  const state = getState(symbol);
  const weights = initializeGatedWeights(10);
  
  // Normalize input features
  const features = [
    data.change / 10,           // Normalized change (-10% to +10% -> -1 to +1)
    data.volatility / 5,        // Normalized volatility
    data.momentum / 100,        // Normalized momentum
    Math.log10(data.volume + 1) / 10, // Log-scaled volume
    data.price > 0 ? Math.log10(data.price) / 5 : 0, // Log price
  ];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Sequential Pattern Recognition (Gated Memory)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const newGatedState = gatedMemoryForward(
    features,
    state.gatedState,
    weights
  );
  
  // Temporal signal from hidden state
  const temporalSignal = newGatedState.hidden.reduce((a, b) => a + b, 0) / newGatedState.hidden.length;
  const temporalStrength = Math.abs(temporalSignal);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Ensemble Boosted Prediction
  // ═══════════════════════════════════════════════════════════════════════════
  
  const ensembleConfig: EnsembleConfig = {
    learningRate: 0.1,
    numLearners: 12,
    regularization: 0.05,
  };
  
  const ensembleScore = ensemblePredict(
    features,
    state.ensemble,
    ensembleConfig,
    temporalSignal * 0.3 // Use temporal signal as base
  );
  
  // Calculate ensemble agreement (how many learners agree)
  let agreements = 0;
  for (const learner of state.ensemble) {
    const pred = weakLearnerPredict(learner, features);
    if (Math.sign(pred) === Math.sign(ensembleScore)) agreements++;
  }
  const ensembleAgreement = agreements / state.ensemble.length;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Adaptive Score Refinement
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Combine temporal and ensemble signals
  const rawScore = temporalSignal * 0.4 + ensembleScore * 0.6;
  
  // Apply adaptive thresholds (self-adjusting based on history)
  let adaptiveScore = rawScore;
  if (state.predictionHistory.length >= 10) {
    const recentBiases = state.predictionHistory.slice(-10).map(p => p.bias);
    const avgBias = recentBiases.reduce((a, b) => a + b, 0) / recentBiases.length;
    
    // Mean reversion tendency for extreme predictions
    if (Math.abs(avgBias) > 0.5) {
      adaptiveScore = rawScore - avgBias * 0.1;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Convert to Bias & Confidence
  // ═══════════════════════════════════════════════════════════════════════════
  
  let bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  const { bullish, bearish } = state.adaptiveThresholds;
  
  if (adaptiveScore > bullish && ensembleAgreement > 0.5) {
    bias = 'LONG';
  } else if (adaptiveScore < bearish && ensembleAgreement > 0.5) {
    bias = 'SHORT';
  } else {
    bias = 'NEUTRAL';
  }
  
  // Confidence based on signal strength and agreement
  const baseConfidence = Math.abs(adaptiveScore) * 100;
  const agreementBoost = ensembleAgreement * 15;
  const temporalBoost = temporalStrength * 10;
  
  let confidence = Math.min(80, baseConfidence + agreementBoost + temporalBoost);
  
  // Reduce confidence for NEUTRAL (uncertain) signals
  if (bias === 'NEUTRAL') {
    confidence = Math.min(55, confidence * 0.6);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5: Update State
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Add to sequence buffer
  const newBuffer = [...state.sequenceBuffer, data].slice(-100);
  
  // Update prediction history
  const newHistory = [
    ...state.predictionHistory,
    { bias: adaptiveScore, confidence, timestamp: Date.now() }
  ].slice(-50);
  
  // Update adaptive thresholds based on recent performance
  let newThresholds = state.adaptiveThresholds;
  if (newHistory.length >= 20) {
    const recentScores = newHistory.slice(-20).map(p => Math.abs(p.bias));
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    newThresholds = {
      bullish: Math.max(0.2, Math.min(0.5, avgScore * 0.8)),
      bearish: Math.min(-0.2, Math.max(-0.5, -avgScore * 0.8)),
    };
  }
  
  // Update ensemble weights based on recent data alignment
  const updatedEnsemble = updateEnsembleWeights(
    state.ensemble,
    features,
    data.change > 0 ? 1 : data.change < 0 ? -1 : 0,
    adaptiveScore,
    ensembleConfig
  );
  
  // Save updated state
  setState(symbol, {
    gatedState: newGatedState,
    ensemble: updatedEnsemble,
    sequenceBuffer: newBuffer,
    predictionHistory: newHistory,
    adaptiveThresholds: newThresholds,
  });
  
  return {
    bias,
    confidence: Math.round(confidence),
    temporalStrength: Math.round(temporalStrength * 100) / 100,
    ensembleAgreement: Math.round(ensembleAgreement * 100) / 100,
    adaptiveScore: Math.round(adaptiveScore * 1000) / 1000,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 BATCH SEQUENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export function analyzeSequence(
  symbol: string,
  sequence: SequenceDataPoint[]
): NeuralPrediction {
  // Process entire sequence to build up hidden state
  let lastPrediction: NeuralPrediction | null = null;
  
  for (const dataPoint of sequence) {
    lastPrediction = neuralEnsemblePredict(symbol, dataPoint);
  }
  
  return lastPrediction || {
    bias: 'NEUTRAL',
    confidence: 50,
    temporalStrength: 0,
    ensembleAgreement: 0.5,
    adaptiveScore: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 INTEGRATE WITH EXISTING ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

export function enhanceBiasWithNeuralEnsemble(
  symbol: string,
  currentBias: 'LONG' | 'SHORT' | 'NEUTRAL',
  currentConfidence: number,
  marketData: {
    price: number;
    change: number;
    volume: number;
    volatility?: number;
    momentum?: number;
  }
): { bias: 'LONG' | 'SHORT' | 'NEUTRAL'; confidence: number; neuralSignal: NeuralPrediction } {
  // Build data point from market data
  const dataPoint: SequenceDataPoint = {
    price: marketData.price,
    change: marketData.change,
    volume: marketData.volume || 0,
    volatility: marketData.volatility || Math.abs(marketData.change) * 0.3,
    momentum: marketData.momentum || marketData.change * 2,
    timestamp: Date.now(),
  };
  
  // Get neural ensemble prediction
  const neuralPrediction = neuralEnsemblePredict(symbol, dataPoint);
  
  // Blend neural prediction with existing bias
  const neuralWeight = 0.25; // Neural contributes 25%
  const existingWeight = 0.75; // Existing technical analysis 75%
  
  // Convert biases to numeric scores
  const biasToScore = (b: 'LONG' | 'SHORT' | 'NEUTRAL') => 
    b === 'LONG' ? 1 : b === 'SHORT' ? -1 : 0;
  
  const existingScore = biasToScore(currentBias);
  const neuralScore = biasToScore(neuralPrediction.bias);
  
  const blendedScore = existingScore * existingWeight + neuralScore * neuralWeight;
  
  // Determine final bias
  let finalBias: 'LONG' | 'SHORT' | 'NEUTRAL';
  if (blendedScore > 0.25) {
    finalBias = 'LONG';
  } else if (blendedScore < -0.25) {
    finalBias = 'SHORT';
  } else {
    finalBias = 'NEUTRAL';
  }
  
  // Blend confidence
  let finalConfidence = currentConfidence * existingWeight + 
                        neuralPrediction.confidence * neuralWeight;
  
  // Boost confidence if neural and technical agree
  if (currentBias === neuralPrediction.bias && currentBias !== 'NEUTRAL') {
    finalConfidence = Math.min(80, finalConfidence + neuralPrediction.ensembleAgreement * 5);
  }
  
  // Reduce confidence if they disagree
  if (currentBias !== neuralPrediction.bias && 
      currentBias !== 'NEUTRAL' && 
      neuralPrediction.bias !== 'NEUTRAL') {
    finalConfidence = Math.max(35, finalConfidence - 8);
  }
  
  return {
    bias: finalBias,
    confidence: Math.round(Math.max(35, Math.min(80, finalConfidence))),
    neuralSignal: neuralPrediction,
  };
}

// Reset state for a symbol (useful for testing)
export function resetNeuralState(symbol: string): void {
  stateCache.delete(symbol);
}

// Get current neural state (for debugging/display)
export function getNeuralState(symbol: string): NeuralEnsembleState | null {
  return stateCache.get(symbol) || null;
}
