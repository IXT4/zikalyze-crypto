import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AnalysisRecord {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  analysis_text: string;
  confidence: number | null;
  bias: string | null;
  created_at: string;
}

export const useAnalysisHistory = (symbol: string) => {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!symbol) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching analysis history:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const saveAnalysis = useCallback(async (
    analysisText: string,
    price: number,
    change: number,
    confidence?: number,
    bias?: string
  ) => {
    try {
      const { error } = await supabase
        .from("analysis_history")
        .insert({
          symbol: symbol.toUpperCase(),
          price,
          change_24h: change,
          analysis_text: analysisText,
          confidence: confidence || null,
          bias: bias || null,
        });

      if (error) throw error;
      
      // Refresh history after saving
      fetchHistory();
    } catch (err) {
      console.error("Error saving analysis:", err);
    }
  }, [symbol, fetchHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, saveAnalysis, refreshHistory: fetchHistory };
};
