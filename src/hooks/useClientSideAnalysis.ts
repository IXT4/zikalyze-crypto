// ═══════════════════════════════════════════════════════════════════════════════
// 🧠 useClientSideAnalysis — React Hook for Client-Side AI Brain
// ═══════════════════════════════════════════════════════════════════════════════
// Runs the Zikalyze AI Brain 100% in the browser — fully trustless, zero server
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from 'react';
import { runClientSideAnalysis, AnalysisInput, AnalysisResult } from '@/lib/zikalyze-brain';

interface UseClientSideAnalysisOptions {
  language?: string;
}

interface UseClientSideAnalysisReturn {
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  runAnalysis: (input: AnalysisInput) => Promise<AnalysisResult>;
  clearAnalysis: () => void;
}

export function useClientSideAnalysis(
  options: UseClientSideAnalysisOptions = {}
): UseClientSideAnalysisReturn {
  const { language = 'en' } = options;
  
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async (input: AnalysisInput): Promise<AnalysisResult> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Simulate brief processing time for UX
      await new Promise(resolve => setTimeout(resolve, 300));

      // Run the analysis entirely client-side
      const result = runClientSideAnalysis({
        ...input,
        language
      });

      setAnalysis(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [language]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setError(null);
  }, []);

  return {
    analysis,
    isAnalyzing,
    error,
    runAnalysis,
    clearAnalysis
  };
}

export default useClientSideAnalysis;
