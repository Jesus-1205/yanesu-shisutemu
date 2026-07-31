import { Outlet } from "react-router-dom";
import SettingsNav from "./SettingsNav";

export default function SettingsLayout() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main">Configuración</h1>
        <p className="text-sm text-text-secondary mt-1">
          Administra los ajustes del sistema
        </p>
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <SettingsNav />
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
