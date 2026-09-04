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
        flex w-50 flex-col
        gap-2.5 rounded-xl bg-slate-800
        py-3 shadow-lg
        ${className}
      `}
    >
      {sections.map((section, si) => (
        <div key={si}>
          {si > 0 && <hr className="mx-0 border-t border-slate-600" />}
          <ul className="flex list-none flex-col gap-2 px-2.5">
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
                      active:scale-0.99 flex w-full items-center
                      gap-2.5 rounded-md px-2
                      py-1.5 text-sm font-semibold
                      text-slate-400 transition-all duration-300
                      ease-out
                      ${isDanger ? "text-red-300" : isLastSection ? "text-indigo-300" : ""}
                      ${hoverStyles}
                      ${item.disabled ? "pointer-events-none cursor-not-allowed opacity-50" : "cursor-pointer"}
                    `}
                    onClick={item.onClick}
                    disabled={item.disabled}
                  >
                    {item.icon && (
                      <span
                        className={`
                          transition-all duration-300 [&>svg]:size-[19px]
                          [&>svg]:stroke-slate-400
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
