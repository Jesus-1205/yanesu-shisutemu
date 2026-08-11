import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const variantConfig: Record<
  ToastVariant,
  { Icon: typeof CheckCircle; barClass: string; iconClass: string }
> = {
  success: {
    Icon: CheckCircle,
    barClass: "bg-success",
    iconClass: "text-success",
  },
  error: {
    Icon: XCircle,
    barClass: "bg-danger",
    iconClass: "text-danger",
  },
  info: {
    Icon: Info,
    barClass: "bg-info",
    iconClass: "text-info",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const addToast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId++;
      setItems((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    [],
  );

  const removeToast = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ toast: addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {items.map((item) => {
          const { Icon, barClass, iconClass } = variantConfig[item.variant];
          return (
            <div
              key={item.id}
              className={`
                pointer-events-auto relative flex items-start gap-3 w-80
                bg-white rounded-xl shadow-lg border border-slate-200
                px-4 py-3.5 overflow-hidden
                motion-safe:animate-[slideIn_250ms_cubic-bezier(0.16,1,0.3,1)]
              `}
            >
              <span
                className={`absolute inset-x-0 bottom-0 h-0.5 origin-left motion-safe:animate-[shrink_4s_linear] ${barClass}`}
              />
              <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconClass}`} />
              <p className="flex-1 text-sm text-text-main leading-5">
                {item.message}
              </p>
              <button
                onClick={() => removeToast(item.id)}
                className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors duration-150 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
