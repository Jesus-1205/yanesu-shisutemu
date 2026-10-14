import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  SlidersHorizontal,
  FileText,
  Star,
  Boxes,
  Tags,
  ChevronDown,
} from "lucide-react";
import Button from "@/ui-components/Button";
import Select from "@/ui-components/Select";
import SearchInput from "@/ui-components/SearchInput";
import ViewToggle from "./ViewToggle";
import {
  useProductsStore,
  selectActiveFiltersCount,
} from "../stores/useProductsStore";

const sortOptions = [
  { value: "nombre_asc", label: "Nombre (A-Z)" },
  { value: "nombre_desc", label: "Nombre (Z-A)" },
  { value: "stock_asc", label: "Stock (Menor-Mayor)" },
  { value: "stock_desc", label: "Stock (Mayor-Menor)" },
  { value: "precio_asc", label: "Precio (Menor-Mayor)" },
  { value: "precio_desc", label: "Precio (Mayor-Menor)" },
];

const sortOptionsAdmin = [
  ...sortOptions,
  { value: "margen_asc", label: "Margen (Menor-Mayor)" },
  { value: "margen_desc", label: "Margen (Mayor-Menor)" },
];

export interface ProductsToolbarProps {
  isOperator?: boolean;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  onOpenCreate?: () => void;
}

export default function ProductsToolbar({
  isOperator = false,
  searchRef,
  onOpenCreate,
}: ProductsToolbarProps) {
  const navigate = useNavigate();
  const internalCatalogRef = useRef<HTMLDivElement>(null);

  const search = useProductsStore((s) => s.filters.search);
  const setSearch = useProductsStore((s) => s.setSearch);
  const clearSearch = useProductsStore((s) => s.clearSearch);
  const showFavoritesOnly = useProductsStore((s) => s.showFavoritesOnly);
  const toggleFavoritesOnly = useProductsStore((s) => s.toggleFavoritesOnly);
  const sortField = useProductsStore((s) => s.filters.sortField);
  const sortOrder = useProductsStore((s) => s.filters.sortOrder);
  const handleSortChange = useProductsStore((s) => s.handleSortChange);
  const activeFiltersCount = useProductsStore(selectActiveFiltersCount);
  const openDrawer = useProductsStore((s) => s.openDrawer);
  const view = useProductsStore((s) => s.view);
  const setView = useProductsStore((s) => s.setView);
  const catalogMenuOpen = useProductsStore((s) => s.catalogMenuOpen);
  const menuPosition = useProductsStore((s) => s.menuPosition);
  const toggleCatalogMenu = useProductsStore((s) => s.toggleCatalogMenu);
  const closeCatalogMenu = useProductsStore((s) => s.closeCatalogMenu);

  const sortValue = `${sortField}_${sortOrder}`;

  const handleCatalogButtonClick = () => {
    if (internalCatalogRef.current) {
      const rect = internalCatalogRef.current.getBoundingClientRect();
      toggleCatalogMenu({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 224 - 16),
      });
    } else {
      toggleCatalogMenu({ top: 0, left: 0 });
    }
  };

  const handleCreate = () => {
    if (onOpenCreate) {
      onOpenCreate();
    } else {
      navigate("/products/new");
    }
  };

  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Search + Filters row */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs md:max-w-sm">
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={clearSearch}
            placeholder="Buscar nombre o código... (Ctrl+K)"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </div>
        <button
          type="button"
          onClick={toggleFavoritesOnly}
          className={`shrink-0 cursor-pointer rounded-lg border p-2 shadow-xs transition-colors ${showFavoritesOnly
              ? "border-yellow-200 bg-yellow-50 text-yellow-600"
              : "border-slate-200 bg-surface text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-yellow-500"
            }`}
          title={
            showFavoritesOnly
              ? "Mostrar todos los productos"
              : "Mostrar solo favoritos"
          }
        >
          <Star
            className={`size-4 ${showFavoritesOnly ? "fill-yellow-400" : ""}`}
          />
        </button>

        {!isOperator && (
          <div className="hidden min-w-[190px] w-48 sm:w-52 md:block">
            <Select
              value={sortValue}
              onChange={(e) => handleSortChange(e.target.value)}
              options={sortOptionsAdmin}
              className="text-xs shadow-xs"
            />
          </div>
        )}
        <div className="relative shrink-0">
          <Button variant="outline" onClick={openDrawer} className="shadow-xs">
            <SlidersHorizontal className="size-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white shadow-xs">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:gap-2.5 self-start">
        {!isOperator && <ViewToggle view={view} onChange={setView} />}
        {!isOperator && (
          <div className="relative" ref={internalCatalogRef}>
            <Button
              variant="outline"
              onClick={handleCatalogButtonClick}
              title="Gestión de Catálogo"
              className="shadow-xs"
            >
              <Boxes className="size-4 text-brand-blue" />
              <span className="hidden xl:inline">Catálogo</span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${catalogMenuOpen ? "rotate-180" : ""
                  }`}
              />
            </Button>
            {catalogMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={closeCatalogMenu}
                />
                <div
                  style={{
                    top: `${menuPosition.top}px`,
                    left: `${menuPosition.left}px`,
                  }}
                  className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-surface p-1.5 shadow-xl"
                >
                  <button
                    onClick={() => {
                      closeCatalogMenu();
                      navigate("/combos");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Boxes className="size-4 text-brand-blue" />
                    <div>
                      <p className="font-semibold text-text-main">Combos</p>
                      <p className="text-xs text-slate-400">
                        Gestionar paquetes
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      closeCatalogMenu();
                      navigate("/price-rules");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    <Tags className="size-4 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-text-main">
                        Reglas de Precio
                      </p>
                      <p className="text-xs text-slate-400">
                        Precios en divisas
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <Button variant="accent" onClick={handleCreate} className="shadow-xs">
          <Plus className="size-4" />
          <span>Nuevo</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/invoices/new")}
          className="shadow-xs"
        >
          <FileText className="size-4" />
          <span className="hidden lg:inline">Agregar Factura</span>
        </Button>
      </div>
    </div>
  );
}
