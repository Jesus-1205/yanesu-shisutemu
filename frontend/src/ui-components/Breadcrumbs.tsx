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
            className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-brand-blue"
          >
            <Home className="size-4" />
            <span className="sr-only">Inicio</span>
          </a>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            <ChevronRight className="size-4 text-slate-300" />
            {item.href ? (
              <a
                href={item.href}
                className="transition-colors duration-150 hover:text-brand-blue"
              >
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-text-main" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
