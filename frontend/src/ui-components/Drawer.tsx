import { useEffect, useCallback, type ReactNode } from "react";
import { X } from "lucide-react";

type DrawerSide = "left" | "right";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  side?: DrawerSide;
  children: ReactNode;
  className?: string;
}

const sideStyles: Record<DrawerSide, string> = {
  left: "left-0",
  right: "right-0",
};

const animateIn: Record<DrawerSide, string> = {
  left: "motion-safe:animate-[slideInLeft_250ms_cubic-bezier(0.16,1,0.3,1)]",
  right: "motion-safe:animate-[slideIn_250ms_cubic-bezier(0.16,1,0.3,1)]",
};

export default function Drawer({
  open,
  onClose,
  title,
  side = "right",
  children,
  className = "",
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 animate-[fadeIn_150ms_ease] bg-black/40"
        onClick={onClose}
      />
      <div
        className={`
          absolute inset-y-0 flex w-full flex-col bg-surface shadow-2xl
          sm:w-96
          ${sideStyles[side]}
          ${animateIn[side]}
          ${className}
        `}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-semibold text-text-main">{title}</h2>
            <button
              onClick={onClose}
              className="shrink-0 cursor-pointer text-slate-400 transition-colors duration-150 hover:text-slate-600"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
