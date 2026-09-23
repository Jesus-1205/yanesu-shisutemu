export default function LoginLeftPanel() {
  return (
    <div
      className="relative hidden w-1/2 items-center justify-center overflow-hidden lg:flex"
      style={{ backgroundImage: "url('/auth-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="relative z-10 px-12 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
          Yanesu Shisutemu
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-white/60 drop-shadow">
          Sistema de control de inventario para gestión de productos, ventas y proveedores.
        </p>
      </div>
    </div>
  );
}
