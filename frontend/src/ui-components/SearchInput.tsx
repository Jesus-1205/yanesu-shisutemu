import { forwardRef, type InputHTMLAttributes } from "react";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({
  value,
  onChange,
  onClear,
  className = "",
  ...props
}, ref) {
  return (
    <div className="relative">
      <svg
        className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={ref}
        value={value}
        onChange={onChange}
        autoComplete="off"
        className={`w-full rounded-lg border border-slate-300 bg-surface py-2 pr-8 pl-10 text-sm text-text-main transition-colors outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 ${className}`}
        {...props}
      />
      {value && onClear && (
        <button
          onClick={onClear}
          className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-text-main"
          tabIndex={-1}
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

export default SearchInput;
