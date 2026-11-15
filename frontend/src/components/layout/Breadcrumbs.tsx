import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  onHomeClick?: () => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  className = '',
  onHomeClick,
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 ${className}`}>
      <ol className="flex items-center gap-1.5 list-none p-0 m-0">
        <li>
          <button
            onClick={onHomeClick}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors"
            title="Overview"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Home</span>
          </button>
        </li>

        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            {item.isCurrent || !item.onClick ? (
              <span
                className={`font-semibold text-slate-900 ${
                  item.isCurrent ? 'aria-current="page"' : ''
                }`}
              >
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="text-slate-500 hover:text-slate-800 transition-colors"
              >
                {item.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
