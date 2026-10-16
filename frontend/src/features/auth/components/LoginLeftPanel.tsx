import { BrandGlyph } from "@/ui-components/BrandLogo";

export default function LoginLeftPanel() {
  return (
    <div
      className="relative hidden w-1/2 items-center justify-center overflow-hidden lg:flex"
      style={{ backgroundImage: "url('/auth-bg.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />
      <div className="relative z-10 flex flex-col items-center px-12 text-center">
        {/* Isotipo Katakana Ne oficial */}
        <div className="mb-6 flex size-20 items-center justify-center rounded-2xl bg-slate-900/90 border border-slate-700/60 text-white shadow-2xl ring-1 ring-white/20 backdrop-blur-md">
          <BrandGlyph className="size-11 text-white drop-shadow" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white drop-shadow-lg">
          Yanesu Shisutemu
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-white/70 drop-shadow">
          Software administrativo para la gestión integral de ventas, compras e inventario.
        </p>
      </div>
    </div>
  );
}

