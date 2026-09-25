import { useCallback, useState } from "react";
import { api } from "@/services/api";
import type { InvoiceAnalysisOut } from "@/types/api";
import { useToast } from "@/ui-components/Toast";
import { useInvoiceFormStore } from "../store/invoiceFormStore";

export type AIState = "idle" | "analyzing" | "reviewing";

export interface UseInvoiceAIReturn {
  aiState: AIState;
  aiLoading: boolean;
  aiAnalysis: InvoiceAnalysisOut | null;
  aiRawJsonIa: Record<string, unknown> | null;
  handleAnalyzeImage: () => Promise<void>;
  handleCancelAiReview: () => void;
  resetAi: () => void;
}

export function useInvoiceAI(): UseInvoiceAIReturn {
  const { toast } = useToast();
  const [aiState, setAiState] = useState<AIState>("idle");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<InvoiceAnalysisOut | null>(null);
  const [aiRawJsonIa, setAiRawJsonIa] = useState<Record<string, unknown> | null>(null);

  const handleAnalyzeImage = useCallback(async () => {
    const invoiceFiles = useInvoiceFormStore.getState().invoiceFiles;
    if (invoiceFiles.length === 0) {
      toast("Sube una imagen primero para analizar con IA", "error");
      return;
    }
    setAiLoading(true);
    try {
      const result = await api.analyzeInvoice(invoiceFiles);
      setAiAnalysis(result);
      setAiRawJsonIa(result.raw_json_ia);
      setAiState("reviewing");
      toast(`IA: ${result.productos.length} productos extraídos`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al analizar imagen", "error");
    } finally {
      setAiLoading(false);
    }
  }, [toast]);

  const handleCancelAiReview = useCallback(() => {
    setAiState("idle");
    setAiAnalysis(null);
  }, []);

  const resetAi = useCallback(() => {
    setAiState("idle");
    setAiLoading(false);
    setAiAnalysis(null);
    setAiRawJsonIa(null);
  }, []);

  return {
    aiState,
    aiLoading,
    aiAnalysis,
    aiRawJsonIa,
    handleAnalyzeImage,
    handleCancelAiReview,
    resetAi,
  };
}
