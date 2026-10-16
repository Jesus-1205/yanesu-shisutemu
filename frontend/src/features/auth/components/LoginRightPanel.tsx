import BrandLogo from "@/ui-components/BrandLogo";
import LoginForm from "./LoginForm";

export default function LoginRightPanel() {
  return (
    <div className="flex w-full items-center justify-center bg-slate-50 p-6 sm:p-8 lg:w-1/2 lg:bg-white">
      <div className="w-full max-w-md">
        {/* Identidad de marca visible en móvil y tablet */}
        <div className="mb-8 flex justify-center lg:hidden">
          <BrandLogo />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Bienvenido de nuevo
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Ingresa tus credenciales para continuar
        </p>

        <LoginForm />

        {/* Pie de pantalla institucional */}
        <p className="mt-10 text-center text-xs text-slate-400">
          Yanesu Shisutemu • Software Administrativo
        </p>
      </div>
    </div>
  );
}

