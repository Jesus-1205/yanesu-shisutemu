import { useId, type ReactNode } from "react";

interface Tab {
  value: string;
  label: string;
  badge?: number;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function Tabs({
  tabs,
  value,
  onChange,
  className = "",
}: TabsProps) {
  const uid = useId();
  const activeIndex = tabs.findIndex((t) => t.value === value);

  return (
    <div
      className={`
        relative flex items-center overflow-x-auto
        bg-white rounded-full p-3
        shadow-[0_0_1px_0_rgba(24,94,224,0.15),0_6px_12px_0_rgba(24,94,224,0.15)]
        ${className}
      `}
    >
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        const inputId = `${uid}-tab-${tab.value}`;

        return (
          <label
            key={tab.value}
            htmlFor={inputId}
            className={`
              relative z-10 flex items-center justify-center
              h-[30px] px-4 shrink-0
              text-xs font-medium
              rounded-full cursor-pointer select-none
              transition-colors duration-150 ease-in
              ${isActive ? "text-brand-blue" : "text-slate-700"}
            `}
          >
            {tab.icon && <span className="mr-1.5 [&>svg]:w-4 [&>svg]:h-4">{tab.icon}</span>}
            {tab.label}
            {tab.badge !== undefined && (
              <span
                className={`
                  inline-flex items-center justify-center
                  w-3.5 h-3.5 ml-1.5
                  text-[10px] rounded-full
                  transition-colors duration-150 ease-in
                  ${isActive ? "bg-brand-blue text-white" : "bg-slate-100 text-slate-600"}
                `}
              >
                {tab.badge}
              </span>
            )}
            <input
              id={inputId}
              type="radio"
              name={uid}
              value={tab.value}
              checked={isActive}
              onChange={() => onChange(tab.value)}
              className="hidden"
            />
          </label>
        );
      })}

      {/* Glider */}
      {activeIndex >= 0 && (
        <span
          className="
            absolute top-3 bottom-3 z-0
            rounded-full bg-slate-100
            transition-all duration-250 ease-out
          "
          style={{
            width: `calc(${100 / tabs.length}% - 6px)`,
            left: `calc(${activeIndex * (100 / tabs.length)}% + 3px)`,
          }}
        />
      )}
    </div>
  );
}
