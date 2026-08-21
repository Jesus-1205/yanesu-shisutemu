import { useId, useRef, useLayoutEffect, useState, type ReactNode } from "react";

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
  const tabsRef = useRef<(HTMLLabelElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [glider, setGlider] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const activeTab = tabsRef.current[activeIndex];
    const container = containerRef.current;
    if (!activeTab || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();

    setGlider({
      left: tabRect.left - containerRect.left + container.scrollLeft,
      width: tabRect.width,
    });
  }, [activeIndex, tabs]);

  return (
    <div
      ref={containerRef}
      className={`
        relative flex items-center overflow-x-auto
        bg-white rounded-full p-3
        shadow-[0_0_1px_0_rgba(24,94,224,0.15),0_6px_12px_0_rgba(24,94,224,0.15)]
        ${className}
      `}
    >
      {tabs.map((tab, i) => {
        const isActive = tab.value === value;
        const inputId = `${uid}-tab-${tab.value}`;

        return (
          <label
            key={tab.value}
            ref={(el) => { tabsRef.current[i] = el; }}
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
      {glider && (
        <span
          className="
            absolute top-3 bottom-3 z-0
            rounded-full bg-slate-100
            transition-all duration-250 ease-out
          "
          style={{ left: glider.left, width: glider.width }}
        />
      )}
    </div>
  );
}
