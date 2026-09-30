import PageHeader from "@/ui-components/PageHeader";
import { useGeminiApiKey } from "../hooks/useGeminiApiKey";
import { GeminiApiKeyCard } from "../components/GeminiApiKeyCard";
import { HowToGetApiKeyInfo } from "../components/HowToGetApiKeyInfo";

export default function SystemSettingsPage() {
  const {
    geminiKey,
    setGeminiKey,
    showKey,
    setShowKey,
    configured,
    loading,
    saving,
    testing,
    testResult,
    setTestResult,
    handleSave,
    handleDelete,
    handleTest,
  } = useGeminiApiKey();

  const handleKeyChange = (val: string) => {
    setGeminiKey(val);
    setTestResult(null);
  };

  const handleToggleShowKey = () => {
    setShowKey((prev) => !prev);
  };

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Configura las API keys del sistema"
      />

      <div className="mx-auto max-w-2xl space-y-6">
        <GeminiApiKeyCard
          geminiKey={geminiKey}
          onKeyChange={handleKeyChange}
          showKey={showKey}
          onToggleShowKey={handleToggleShowKey}
          configured={configured}
          loading={loading}
          saving={saving}
          testing={testing}
          testResult={testResult}
          onSave={handleSave}
          onTest={handleTest}
          onDelete={handleDelete}
        />

        <HowToGetApiKeyInfo />
      </div>
    </div>
  );
}
