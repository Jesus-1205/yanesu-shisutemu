export function HowToGetApiKeyInfo() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <h4 className="mb-1 text-sm font-semibold text-blue-800">¿Cómo obtener una API Key?</h4>
      <ol className="list-inside list-decimal space-y-1 text-sm text-blue-700">
        <li>
          Ve a{" "}
          <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs select-all">
            https://aistudio.google.com/apikey
          </span>
        </li>
        <li>Inicia sesión con tu cuenta de Google</li>
        <li>Haz clic en &quot;Create API Key&quot;</li>
        <li>Copia la key generada y pégala aquí</li>
      </ol>
    </div>
  );
}
