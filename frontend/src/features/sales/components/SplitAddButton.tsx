import { Package } from "lucide-react";

interface SplitAddButtonProps {
  onAddUnit: () => void;
  onAddBox: () => void;
  disabled?: boolean;
}

export default function SplitAddButton({
  onAddUnit,
  onAddBox,
  disabled = false,
}: SplitAddButtonProps) {
  return (
    <div className="inline-flex">
      <button
        type="button"
        disabled={disabled}
        onClick={onAddUnit}
        className="h-8 cursor-pointer rounded-l-lg bg-accent-orange px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-md active:translate-y-0 active:bg-orange-800 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
      >
        +
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onAddBox}
        className="h-8 cursor-pointer rounded-r-lg border-l border-blue-700 bg-brand-blue px-2 text-white shadow-xs transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md active:translate-y-0 active:bg-blue-800 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
      >
        <Package className="size-3.5" />
      </button>
    </div>
  );
}
