import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import Button from "../../../ui-components/Button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex animate-[fadeIn_0.4s_ease-out] flex-col items-center text-center">
        <FileQuestion
          size={80}
          className="mb-6 animate-[scaleIn_0.5s_ease-out] text-slate-300"
        />

        <span className="text-8xl leading-none font-bold text-brand-blue">
          404
        </span>

        <h1 className="mt-4 text-xl font-semibold text-text-main">
          Pagina no encontrada
        </h1>

        <p className="mt-2 max-w-sm text-slate-500">
          La ruta que buscas no existe o fue movida a otra ubicacion.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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
