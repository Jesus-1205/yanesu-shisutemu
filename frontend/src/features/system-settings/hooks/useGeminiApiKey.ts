import { useCallback, useEffect, useState } from "react";
import { api } from "@/services/api";
import { useToast } from "@/ui-components/Toast";
import type { TestConnectionResponse } from "@/types/api";

export interface UseGeminiApiKeyReturn {
  geminiKey: string;
  setGeminiKey: (key: string) => void;
  showKey: boolean;
  setShowKey: (show: boolean | ((prev: boolean) => boolean)) => void;
  configured: boolean;
  loading: boolean;
  error: string | null;
  saving: boolean;
  testing: boolean;
  testResult: TestConnectionResponse | null;
  setTestResult: (result: TestConnectionResponse | null) => void;
  fetchStatus: () => Promise<void>;
  handleSave: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleTest: () => Promise<void>;
}

export function useGeminiApiKey(): UseGeminiApiKeyReturn {
  const { toast } = useToast();
  const [geminiKey, setGeminiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = await api.getApiKeyStatus("GEMINI_API_KEY");
      setConfigured(status.configured);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al consultar el estado de la API key";
      setError(message);
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSave = async () => {
    if (!geminiKey.trim()) return;
    setSaving(true);
    try {
      await api.saveApiKey({
        clave: "GEMINI_API_KEY",
        valor: geminiKey.trim(),
        descripcion: "API Key de Google Gemini para análisis de facturas",
      });
      toast("API key guardada correctamente", "success");
      setConfigured(true);
      setGeminiKey("");
      setShowKey(false);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al guardar la API key",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteApiKey("GEMINI_API_KEY");
      toast("API key eliminada", "success");
      setConfigured(false);
      setTestResult(null);
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al eliminar la API key",
        "error",
      );
    }
  };

  const handleTest = async () => {
    const keyToTest = geminiKey.trim();
    if (!keyToTest) {
      toast("Ingresa una API key para probar", "error");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testGeminiConnection({
        clave: "GEMINI_API_KEY",
        valor: keyToTest,
      });
      setTestResult(result);
      if (result.success) {
        toast("Conexión exitosa con Gemini", "success");
      } else {
        toast(result.message, "error");
      }
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Error al probar conexión",
        "error",
      );
    } finally {
      setTesting(false);
    }
  };

  return {
    geminiKey,
    setGeminiKey,
    showKey,
    setShowKey,
    configured,
    loading,
    error,
    saving,
    testing,
    testResult,
    setTestResult,
    fetchStatus,
    handleSave,
    handleDelete,
    handleTest,
  };
}
