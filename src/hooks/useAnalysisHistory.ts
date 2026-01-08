import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AnalysisRecord {
  id: string;
  symbol: string;
  price: number;
  change_24h: number;
  analysis_text: string;
  confidence: number | null;
  bias: string | null;
  created_at: string;
  user_id: string | null;
}

export const useAnalysisHistory = (symbol: string) => {
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!symbol || !user) {
      setHistory([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("analysis_history")
        .select("*")
        .eq("symbol", symbol.toUpperCase())
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Error fetching analysis history:", err);
    } finally {
      setLoading(false);
    }
  }, [symbol, user]);

  const saveAnalysis = useCallback(async (
    analysisText: string,
    price: number,
    change: number,
    confidence?: number,
    bias?: string
  ) => {
    if (!user) {
      console.error("User not authenticated");
      return;
    }

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
          user_id: user.id,
        });

      if (error) throw error;
      
      // Refresh history after saving
      fetchHistory();
    } catch (err) {
      console.error("Error saving analysis:", err);
    }
  }, [symbol, fetchHistory, user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, saveAnalysis, refreshHistory: fetchHistory };
};
