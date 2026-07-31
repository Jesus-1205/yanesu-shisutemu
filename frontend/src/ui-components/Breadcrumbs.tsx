import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export default function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1 text-sm text-slate-500">
        <li>
          <a
            href="/"
            className="inline-flex items-center gap-1 hover:text-brand-blue transition-colors duration-150"
          >
            <Home className="w-4 h-4" />
            <span className="sr-only">Inicio</span>
          </a>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-slate-300" />
            {item.href ? (
              <a
                href={item.href}
                className="hover:text-brand-blue transition-colors duration-150"
              >
                {item.label}
              </a>
            ) : (
              <span className="text-text-main font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
