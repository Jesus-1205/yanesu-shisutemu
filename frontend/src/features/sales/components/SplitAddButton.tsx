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
        className="px-3 py-1.5 text-xs h-8 font-semibold rounded-l-lg transition-all duration-150 ease-out cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:shadow-none bg-accent-orange text-white hover:bg-orange-700 active:bg-orange-800 shadow-xs hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
      >
        +
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onAddBox}
        className="px-2 h-8 rounded-r-lg border-l border-blue-700 transition-all duration-150 ease-out cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:shadow-none bg-brand-blue text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs hover:shadow-md disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed"
      >
        <Package className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
