// ═══════════════════════════════════════════════════════════════════════════════
// 🧪 ZIKALYZE AI BRAIN — CLIENT-SIDE TEST
// ═══════════════════════════════════════════════════════════════════════════════
// Run in browser console: window.testZikalyzeAI()
// ═══════════════════════════════════════════════════════════════════════════════

import { runClientSideAnalysis } from './index';

// Verification function
function verifyResult(result: ReturnType<typeof runClientSideAnalysis>, testName: string) {
  const checks = [
    { name: 'Has bias', pass: ['LONG', 'SHORT', 'NEUTRAL'].includes(result.bias) },
    { name: 'Confidence 0-100', pass: result.confidence >= 0 && result.confidence <= 100 },
    { name: 'Has analysis text', pass: result.analysis.length > 500 },
    { name: 'Has insights', pass: result.insights.length > 0 },
    { name: 'Has scenarios', pass: result.scenarios.length > 0 },
    { name: 'Has precision entry', pass: ['NOW', 'WAIT_PULLBACK', 'WAIT_BREAKOUT', 'AVOID'].includes(result.precisionEntry.timing) },
    { name: 'Has volume spike data', pass: typeof result.volumeSpike.isSpike === 'boolean' },
    { name: 'Has institutional data', pass: ['BULLISH', 'BEARISH', 'NEUTRAL'].includes(result.institutionalVsRetail.institutionalBias) },
    { name: 'Timestamp valid', pass: !isNaN(Date.parse(result.timestamp)) },
    { name: 'Source correct', pass: result.source === 'client-side-wasm' },
  ];
  
  const passed = checks.filter(c => c.pass).length;
  const failed = checks.filter(c => !c.pass);
  
  console.log(`\n🧪 ${testName}: ${passed}/${checks.length} checks passed`);
  if (failed.length > 0) {
    console.log('❌ Failed:', failed.map(f => f.name).join(', '));
  }
  return failed.length === 0;
}

export function testClientSideAnalysis() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧠 ZIKALYZE AI BRAIN v10.0 — CLIENT-SIDE TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const tests = [
    {
      name: 'BTC Bullish',
      input: { crypto: 'BTC', price: 97542.18, change: 4.5, high24h: 98200, low24h: 93100, volume: 28500000000 }
    },
    {
      name: 'ETH Bearish',
      input: { crypto: 'ETH', price: 3420.50, change: -5.2, high24h: 3650, low24h: 3380, volume: 12000000000 }
    },
    {
      name: 'SOL Neutral',
      input: { crypto: 'SOL', price: 185.20, change: 0.8, high24h: 188, low24h: 182, volume: 2500000000 }
    },
    {
      name: 'XRP Strong Bullish',
      input: { crypto: 'XRP', price: 2.45, change: 12.5, high24h: 2.50, low24h: 2.15, volume: 8000000000 }
    }
  ];

  let allPassed = true;
  const results: Array<{name: string; bias: string; confidence: number; timing: string; ms: number}> = [];

  for (const test of tests) {
    const start = performance.now();
    const result = runClientSideAnalysis({ ...test.input, language: 'en' });
    const ms = performance.now() - start;
    
    const passed = verifyResult(result, test.name);
    allPassed = allPassed && passed;
    
    results.push({
      name: test.name,
      bias: result.bias,
      confidence: result.confidence,
      timing: result.precisionEntry.timing,
      ms: Math.round(ms * 100) / 100
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.table(results);

  console.log('\n═══════════════════════════════════════════════════════════════');
  if (allPassed) {
    console.log('✅ ALL TESTS PASSED — AI Brain is working correctly!');
  } else {
    console.log('❌ SOME TESTS FAILED — Review the output above');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Return the full BTC result for inspection
  const btcResult = runClientSideAnalysis(tests[0].input);
  console.log('📝 SAMPLE BTC ANALYSIS OUTPUT:\n');
  console.log(btcResult.analysis);

  return { allPassed, results, btcResult };
}

// Auto-register for browser console
if (typeof window !== 'undefined') {
  (window as any).testZikalyzeAI = testClientSideAnalysis;
  console.log('💡 Run window.testZikalyzeAI() in browser console to test the AI brain');
}
