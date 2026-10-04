import { Key, Eye, EyeOff, Zap, Loader2 } from "lucide-react";
import Button from "@/ui-components/Button";
import Input from "@/ui-components/Input";
import type { TestConnectionResponse } from "@/types/api";
import { ApiKeyStatusBadge } from "./ApiKeyStatusBadge";

export interface GeminiApiKeyCardProps {
  geminiKey: string;
  onKeyChange: (value: string) => void;
  showKey: boolean;
  onToggleShowKey: () => void;
  configured: boolean;
  loading: boolean;
  saving: boolean;
  testing: boolean;
  testResult: TestConnectionResponse | null;
  onSave: () => void;
  onTest: () => void;
  onDelete: () => void;
}

export function GeminiApiKeyCard({
  geminiKey,
  onKeyChange,
  showKey,
  onToggleShowKey,
  configured,
  loading,
  saving,
  testing,
  testResult,
  onSave,
  onTest,
  onDelete,
}: GeminiApiKeyCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-blue-50">
          <Key className="size-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-main">
            Google Gemini API Key
          </h3>
          <p className="text-text-secondary text-sm">
            Necesaria para el análisis de facturas con IA
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-text-secondary flex items-center gap-2 py-4 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Verificando estado...
        </div>
      ) : (
        <>
          {/* Status indicator */}
          <div className="mb-4 flex items-center gap-2">
            <ApiKeyStatusBadge configured={configured} />
          </div>

          {/* Key input */}
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  label="API Key"
                  type={showKey ? "text" : "password"}
                  value={geminiKey}
                  onChange={(e) => onKeyChange(e.target.value)}
                  placeholder={configured ? "••••••••••••••••••••" : "AIza..."}
                />
              </div>
              <button
                type="button"
                onClick={onToggleShowKey}
                aria-label={showKey ? "Ocultar API key" : "Mostrar API key"}
                className="flex h-13 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-surface text-slate-400 transition-colors hover:border-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Test result */}
            {testResult && (
              <div
                className={`rounded-lg p-3 text-sm ${
                  testResult.success
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <p className="font-medium">{testResult.message}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Button
                variant="accent"
                onClick={onSave}
                loading={saving}
                disabled={!geminiKey.trim()}
              >
                Guardar API Key
              </Button>
              <Button
                variant="outline"
                onClick={onTest}
                loading={testing}
                disabled={!geminiKey.trim()}
              >
                <Zap className="size-4" />
                Probar Conexión
              </Button>
              {configured && (
                <Button
                  variant="ghost"
                  onClick={onDelete}
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
  );
}
