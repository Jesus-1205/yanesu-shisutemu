import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  Drawer,
  DropdownMenu,
  EmptyState,
  ErrorBanner,
  FileUpload,
  HamburgerButton,
  Input,
  LogoutButton,
  Modal,
  PageHeader,
  Pagination,
  SearchInput,
  Select,
  Skeleton, SkeletonCard, SkeletonText,
  Spinner,
  StatCard,
  Table,
  Tabs,
  Textarea,
  ToggleSwitch,
  Tooltip,
  useToast,
} from "../../../ui-components";
import {
  AlertTriangle,
  Building2,
  DollarSign,
  Package,
  Pencil,
  Settings,
  Trash2,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { useState } from "react";

const sampleData = [
  { id: 1, name: "Producto A", stock: 12, price: 25.5 },
  { id: 2, name: "Producto B", stock: 3, price: 40.0 },
  { id: 3, name: "Producto C", stock: 8, price: 15.75 },
];

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [tabValue, setTabValue] = useState("tab1");
  const { toast } = useToast();

  return (
    <div className="min-h-screen p-8">
        <PageHeader
          title="Sistema de Diseño"
          description="Catálogo visual de componentes unitarios"
          actions={
            <Button variant="accent" onClick={() => toast("Toast de prueba", "success")}>
              Probar Toast
            </Button>
          }
        />

        <div className="space-y-10">
          {/* Button */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Button</h2>
            <Card>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="accent">Accent</Button>
                <Button variant="success">Success</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button loading>Loading</Button>
                <Button disabled>Disabled</Button>
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </Card>
          </section>

          {/* Input */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Input</h2>
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Default" />
                <Input label="Con error" error="Campo requerido" defaultValue="mal" />
                <Input label="Con hint" hint="Ingrese un valor válido" />
                <Input label="Deshabilitado" disabled />
              </div>
            </Card>
          </section>

          {/* Select */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Select</h2>
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Categoría"
                  options={[
                    { value: "1", label: "Whisky" },
                    { value: "2", label: "Vodka" },
                    { value: "3", label: "Ron" },
                  ]}
                  placeholder="Seleccione..."
                />
                <Select
                  label="Con error"
                  error="Debe seleccionar una opción"
                  options={[]}
                  placeholder="Seleccione..."
                />
              </div>
            </Card>
          </section>

          {/* Badge */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Badge</h2>
            <Card>
              <div className="flex flex-wrap gap-3">
                <Badge variant="success">Activo</Badge>
                <Badge variant="danger">Inactivo</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="warning">Pendiente</Badge>
                <Badge variant="neutral">Borrador</Badge>
              </div>
            </Card>
          </section>

          {/* Card */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Card</h2>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <h3 className="font-semibold">Tarjeta 1</h3>
                <p className="mt-1 text-sm text-slate-500">Contenido de ejemplo</p>
              </Card>
              <Card>
                <h3 className="font-semibold">Tarjeta 2</h3>
                <p className="mt-1 text-sm text-slate-500">Contenido de ejemplo</p>
              </Card>
              <Card>
                <h3 className="font-semibold">Tarjeta 3</h3>
                <p className="mt-1 text-sm text-slate-500">Contenido de ejemplo</p>
              </Card>
            </div>
          </section>

          {/* Modal */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Modal</h2>
            <Card>
              <Button onClick={() => setModalOpen(true)}>Crear Producto</Button>
              <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Producto">
                <div className="space-y-4">
                  <Input label="Nombre del producto" placeholder="Ej. Whisky 12 años" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Precio" type="number" placeholder="0.00" />
                    <Input label="Stock inicial" type="number" placeholder="0" />
                  </div>
                  <Select
                    label="Categoría"
                    options={[
                      { value: "whisky", label: "Whisky" },
                      { value: "vodka", label: "Vodka" },
                      { value: "ron", label: "Ron" },
                      { value: "tequila", label: "Tequila" },
                      { value: "gin", label: "Gin" },
                    ]}
                    placeholder="Seleccione..."
                  />
                  <Input label="Descripción (opcional)" placeholder="Breve descripción del producto" />
                </div>
                <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                  <Button variant="accent" onClick={() => { setModalOpen(false); toast("Producto creado", "success"); }}>
                    Guardar Producto
                  </Button>
                </div>
              </Modal>
            </Card>
          </section>

          {/* ConfirmDialog */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">ConfirmDialog</h2>
            <Card>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Eliminar
              </Button>
              <ConfirmDialog
                open={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={() => { setConfirmOpen(false); toast("Eliminado", "success"); }}
                message="¿Está seguro de eliminar este registro?"
                variant="danger"
              />
            </Card>
          </section>

          {/* Spinner */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Spinner</h2>
            <Card>
              <div className="flex items-center gap-4">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </div>
            </Card>
          </section>

          {/* SearchInput */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">SearchInput</h2>
            <Card>
              <div className="max-w-md">
                <SearchInput
                  placeholder="Buscar..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onClear={() => setSearchValue("")}
                />
              </div>
            </Card>
          </section>

          {/* Pagination */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Pagination</h2>
            <Card>
              <Pagination page={page} totalPages={10} onPageChange={setPage} />
            </Card>
          </section>

          {/* Table */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Table</h2>
            <Card padding={false}>
              <Table
                columns={[
                  { key: "id", header: "ID" },
                  { key: "name", header: "Nombre" },
                  {
                    key: "stock",
                    header: "Stock",
                    render: (item) => (
                      <Badge variant={item.stock <= 5 ? "danger" : "success"}>
                        {item.stock} unids
                      </Badge>
                    ),
                  },
                  {
                    key: "price",
                    header: "Precio",
                    render: (item) => `$${item.price.toFixed(2)}`,
                  },
                ]}
                data={sampleData}
                keyExtractor={(item) => item.id}
              />
            </Card>
          </section>

          {/* EmptyState */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">EmptyState</h2>
            <Card>
              <EmptyState
                title="Sin registros"
                description="No hay productos para mostrar todavía."
                actionLabel="Crear producto"
                onAction={() => toast("Redirigiendo...", "info")}
              />
            </Card>
          </section>

          {/* LogoutButton */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">LogoutButton</h2>
            <Card>
              <p className="mb-4 text-sm text-slate-500">Pasa el mouse sobre el botón para ver la animación expandible.</p>
              <LogoutButton onClick={() => toast("Cerrando sesión...", "info")} />
            </Card>
          </section>

          {/* HamburgerButton */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">HamburgerButton</h2>
            <Card>
              <p className="mb-4 text-sm text-slate-500">Haz clic para alternar entre menú y cerrar.</p>
              <HamburgerButton
                open={hamburgerOpen}
                onClick={() => setHamburgerOpen((v) => !v)}
              />
            </Card>
          </section>

          {/* DropdownMenu */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">DropdownMenu</h2>
            <Card>
              <div className="flex justify-center">
                <DropdownMenu
                  sections={[
                    {
                      items: [
                        { label: "Rename", icon: <Pencil size={19} />, onClick: () => toast("Renombrar", "info") },
                        { label: "Add Member", icon: <UserRoundPlus size={19} />, onClick: () => toast("Miembro agregado", "success") },
                      ],
                    },
                    {
                      items: [
                        { label: "Settings", icon: <Settings size={19} />, onClick: () => toast("Ajustes", "info") },
                        { label: "Delete", icon: <Trash2 size={19} />, variant: "danger", onClick: () => toast("Eliminado", "success") },
                      ],
                    },
                    {
                      items: [
                        { label: "Team Access", icon: <UsersRound size={19} />, onClick: () => toast("Acceso a equipo", "info") },
                      ],
                    },
                  ]}
                />
              </div>
            </Card>
          </section>

          {/* Tabs */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Tabs</h2>
            <Card>
              <div className="flex justify-center">
                <Tabs
                  tabs={[
                    { value: "tab1", label: "Hello", badge: 2 },
                    { value: "tab2", label: "UI" },
                    { value: "tab3", label: "World" },
                  ]}
                  value={tabValue}
                  onChange={setTabValue}
                />
              </div>
              <p className="mt-4 text-center text-sm text-slate-500">Tab activo: {tabValue}</p>
            </Card>
          </section>

          {/* Checkbox */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Checkbox</h2>
            <Card>
              <div className="flex flex-col gap-4">
                <Checkbox label="Opción por defecto" />
                <Checkbox label="Opción marcada" defaultChecked />
                <Checkbox label="Opción deshabilitada" disabled />
                <Checkbox label="Deshabilitada y marcada" disabled defaultChecked />
              </div>
            </Card>
          </section>

          {/* ToggleSwitch */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">ToggleSwitch</h2>
            <Card>
              <div className="flex flex-col gap-4">
                <ToggleSwitch label="Apagado" />
                <ToggleSwitch label="Encendido" defaultChecked />
                <ToggleSwitch label="Deshabilitado" disabled />
              </div>
            </Card>
          </section>

          {/* Textarea */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Textarea</h2>
            <Card>
              <div className="space-y-4">
                <Textarea label="Descripción" placeholder="Escriba una descripción..." />
                <Textarea label="Con error" error="Este campo es obligatorio" defaultValue="mal" />
                <Textarea label="Deshabilitado" disabled />
              </div>
            </Card>
          </section>

          {/* FileUpload */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">FileUpload</h2>
            <Card>
              <p className="mb-4 text-sm text-slate-500">Imágenes (por defecto)</p>
              <FileUpload />
            </Card>
            <Card className="mt-4">
              <p className="mb-4 text-sm text-slate-500">Documentos PDF</p>
              <FileUpload accept="application/pdf" />
            </Card>
          </section>

          {/* Breadcrumbs */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Breadcrumbs</h2>
            <Card>
              <Breadcrumbs
                items={[
                  { label: "Productos", href: "/productos" },
                  { label: "Whisky", href: "/productos/whisky" },
                  { label: "Jack Daniels" },
                ]}
              />
            </Card>
          </section>

          {/* Tooltip */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Tooltip</h2>
            <Card>
              <div className="flex items-center gap-8">
                <Tooltip content="Editar producto" side="top">
                  <Button variant="ghost" size="sm">Top</Button>
                </Tooltip>
                <Tooltip content="Eliminar producto" side="bottom">
                  <Button variant="ghost" size="sm">Bottom</Button>
                </Tooltip>
                <Tooltip content="Configuración" side="left">
                  <Button variant="ghost" size="sm">Left</Button>
                </Tooltip>
                <Tooltip content="Ver detalles" side="right">
                  <Button variant="ghost" size="sm">Right</Button>
                </Tooltip>
              </div>
            </Card>
          </section>

          {/* Skeleton */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Skeleton</h2>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-slate-500">SkeletonText</h3>
                <SkeletonText lines={4} />
              </Card>
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-slate-500">SkeletonCard</h3>
                <SkeletonCard />
              </Card>
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-slate-500">Personalizado</h3>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Drawer */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">Drawer</h2>
            <Card>
              <div className="flex gap-3">
                <Button onClick={() => setDrawerOpen(true)}>Abrir Drawer</Button>
                <Button variant="outline" onClick={() => setDrawerOpen(true)}>Filtros</Button>
              </div>
              <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filtros">
                <div className="space-y-4">
                  <Input label="Buscar producto" placeholder="Nombre..." />
                  <Select
                    label="Categoría"
                    options={[
                      { value: "whisky", label: "Whisky" },
                      { value: "vodka", label: "Vodka" },
                      { value: "ron", label: "Ron" },
                    ]}
                    placeholder="Todas"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Precio min" type="number" placeholder="0" />
                    <Input label="Precio max" type="number" placeholder="999" />
                  </div>
                  <div className="pt-2">
                    <Button className="w-full" variant="accent">Aplicar Filtros</Button>
                  </div>
                </div>
              </Drawer>
            </Card>
          </section>

          {/* ErrorBanner */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">ErrorBanner</h2>
            <Card>
              <div className="space-y-3">
                <ErrorBanner variant="error" title="Error de conexión">
                  No se pudo conectar con el servidor. Verifica tu conexión a internet.
                </ErrorBanner>
                <ErrorBanner variant="warning" title="Stock bajo">
                  Quedan menos de 5 unidades de algunos productos.
                </ErrorBanner>
                <ErrorBanner variant="info" title="Actualización disponible">
                  Una nueva versión del sistema está disponible para instalar.
                </ErrorBanner>
                <ErrorBanner variant="error" title="Error al guardar" onRetry={() => toast("Reintentando...", "info")}>
                  Ocurrió un error al guardar los cambios. Presiona Reintentar para intentarlo de nuevo.
                </ErrorBanner>
              </div>
            </Card>
          </section>

          {/* StatCard */}
          <section>
            <h2 className="mb-3 text-lg font-bold text-text-main">StatCard</h2>
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="Ventas hoy"
                value="$12,430"
                icon={<DollarSign size={18} />}
                trend={{ direction: "up", value: "12.5%" }}
              />
              <StatCard
                label="Productos"
                value="234"
                icon={<Package size={18} />}
              />
              <StatCard
                label="Stock crítico"
                value="8"
                icon={<AlertTriangle size={18} />}
                variant="danger"
                trend={{ direction: "up", value: "3" }}
              />
              <StatCard
                label="Proveedores"
                value="45"
                icon={<Building2 size={18} />}
                variant="info"
                trend={{ direction: "down", value: "1" }}
              />
            </div>
          </section>
        </div>
      </div>
  );
}
