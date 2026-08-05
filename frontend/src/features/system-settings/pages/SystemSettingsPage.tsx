import { useCallback, useEffect, useState } from "react";
import { Key, Eye, EyeOff, Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import Button from "@/ui-components/Button";
import PageHeader from "@/ui-components/PageHeader";
import Input from "@/ui-components/Input";
import { useToast } from "@/ui-components/Toast";
import type { TestConnectionResponse } from "@/types/api";

export default function SystemSettingsPage() {
  const { toast } = useToast();
  const [geminiKey, setGeminiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const status = await api.getApiKeyStatus("GEMINI_API_KEY");
      setConfigured(status.configured);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Configura las API keys del sistema"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Gemini API Key Card */}
        <div className="bg-surface rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-main">
                Google Gemini API Key
              </h3>
              <p className="text-sm text-text-secondary">
                Necesaria para el análisis de facturas con IA
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando estado...
            </div>
          ) : (
            <>
              {/* Status indicator */}
              <div className="flex items-center gap-2 mb-4">
                {configured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Configurada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                    <XCircle className="w-3.5 h-3.5" />
                    No configurada
                  </span>
                )}
              </div>

              {/* Key input */}
              <div className="space-y-4">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      label="API Key"
                      type={showKey ? "text" : "password"}
                      value={geminiKey}
                      onChange={(e) => {
                        setGeminiKey(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder={configured ? "••••••••••••••••••••" : "AIza..."}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="flex items-center justify-center h-[52px] w-10 shrink-0 rounded-xl border border-slate-300 bg-surface text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Test result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      testResult.success
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    <p className="font-medium">{testResult.message}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="accent"
                    onClick={handleSave}
                    loading={saving}
                    disabled={!geminiKey.trim()}
                  >
                    Guardar API Key
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTest}
                    loading={testing}
                    disabled={!geminiKey.trim()}
                  >
                    <Zap className="w-4 h-4" />
                    Probar Conexión
                  </Button>
                  {configured && (
                    <Button
                      variant="ghost"
                      onClick={handleDelete}
                      className="text-danger hover:text-danger"
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">¿Cómo obtener una API Key?</h4>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Ve a <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded select-all">https://aistudio.google.com/apikey</span></li>
            <li>Inicia sesión con tu cuenta de Google</li>
            <li>Haz clic en "Create API Key"</li>
            <li>Copia la key generada y pégala aquí</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
