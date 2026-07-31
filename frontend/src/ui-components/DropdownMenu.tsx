import type { ReactNode } from "react";

interface DropdownItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

interface DropdownSection {
  items: DropdownItem[];
}

interface DropdownMenuProps {
  sections: DropdownSection[];
  className?: string;
}

export default function DropdownMenu({
  sections,
  className = "",
}: DropdownMenuProps) {
  return (
    <div
      className={`
        w-[200px] rounded-xl py-3
        flex flex-col gap-2.5
        bg-slate-800 shadow-lg
        ${className}
      `}
    >
      {sections.map((section, si) => (
        <div key={si}>
          {si > 0 && <hr className="border-t border-slate-600 mx-0" />}
          <ul className="flex flex-col gap-2 list-none px-2.5">
            {section.items.map((item, ii) => {
              const isDanger = item.variant === "danger";
              const isLastSection = si === sections.length - 1;

              const hoverStyles = isDanger
                ? "hover:bg-red-800/70 hover:text-white"
                : isLastSection
                  ? "hover:bg-indigo-900/50 hover:text-indigo-300"
                  : "hover:bg-brand-blue hover:text-white hover:translate-x-[1px] hover:-translate-y-[1px]";

              return (
                <li key={ii}>
                  <button
                    className={`
                      flex items-center gap-2.5 w-full
                      px-2 py-1.5 rounded-md
                      text-sm font-semibold text-slate-400
                      transition-all duration-300 ease-out
                      active:scale-[0.99]
                      ${isDanger ? "text-red-300" : isLastSection ? "text-indigo-300" : ""}
                      ${hoverStyles}
                      ${item.disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "cursor-pointer"}
                    `}
                    onClick={item.onClick}
                    disabled={item.disabled}
                  >
                    {item.icon && (
                      <span
                        className={`
                          [&>svg]:w-[19px] [&>svg]:h-[19px] [&>svg]:stroke-slate-400
                          transition-all duration-300
                          ${isLastSection ? "[&>svg]:stroke-indigo-400" : ""}
                        `}
                      >
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
