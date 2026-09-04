import { Outlet } from "react-router-dom";
import SettingsNav from "./SettingsNav";

export default function SettingsLayout() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main">Configuración</h1>
        <p className="text-text-secondary mt-1 text-sm">
          Administra los ajustes del sistema
        </p>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <SettingsNav />
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
