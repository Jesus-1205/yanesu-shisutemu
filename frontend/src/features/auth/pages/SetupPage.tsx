import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ErrorBanner from "../../../ui-components/ErrorBanner";
import Spinner from "../../../ui-components/Spinner";

export default function SetupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setupAdmin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !nombreCompleto || !password || !confirmPassword) {
      setError("Completa todos los campos");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await setupAdmin({ username, email, password, nombre_completo: nombreCompleto });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al configurar el administrador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundImage: "url('/auth-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-slate-950/40" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
            Configuración Inicial
          </h1>
          <p className="mt-3 text-base text-white/60 leading-relaxed max-w-sm mx-auto drop-shadow">
            Crea el usuario administrador para comenzar a usar el sistema.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Crear Administrador</h2>

          {error && (
            <div className="mb-6">
              <ErrorBanner variant="error" dismissible={false}>
                {error}
              </ErrorBanner>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre de Usuario</label>
              <input
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                autoComplete="username"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre Completo</label>
              <input
                type="text"
                placeholder="Tu nombre"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                disabled={loading}
                autoComplete="name"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="admin@yanesu.test"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-all duration-200 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed mt-6 md:col-span-2"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner size="sm" />
                  Configurando...
                </span>
              ) : "Crear Administrador"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
