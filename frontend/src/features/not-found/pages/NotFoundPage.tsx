import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import Button from "../../../ui-components/Button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="flex flex-col items-center text-center animate-[fadeIn_0.4s_ease-out]">
        <FileQuestion
          size={80}
          className="text-slate-300 mb-6 animate-[scaleIn_0.5s_ease-out]"
        />

        <span className="text-8xl font-bold text-brand-blue leading-none">
          404
        </span>

        <h1 className="mt-4 text-xl font-semibold text-text-main">
          Pagina no encontrada
        </h1>

        <p className="mt-2 text-slate-500 max-w-sm">
          La ruta que buscas no existe o fue movida a otra ubicacion.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Button variant="primary" onClick={() => navigate("/")}>
            Volver al inicio
          </Button>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            Regresar
          </Button>
        </div>
      </div>
    </div>
  );
}
