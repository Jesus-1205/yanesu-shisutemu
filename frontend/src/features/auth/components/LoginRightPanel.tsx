import LoginForm from "./LoginForm";

export default function LoginRightPanel() {
  return (
    <div className="flex w-full items-center justify-center bg-white p-8 lg:w-1/2">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Bienvenido de nuevo</h1>
        <p className="mt-2 text-sm text-gray-500">Ingresa tus credenciales para continuar</p>
        
        <LoginForm />
      </div>
    </div>
  );
}
