import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  const { isRtl, t } = useLanguage();

  // Generate BreadcrumbList Schema for Google
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t.nav.home,
        item: window.location.origin,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        ...(item.path ? { item: `${window.location.origin}${item.path}` } : {}),
      })),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <nav aria-label="Breadcrumb" className="py-3 text-xs sm:text-sm text-slate-400">
        <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
          <li className="flex items-center">
            <Link
              to="/"
              className="flex items-center gap-1 hover:text-brand-cyan transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{t.nav.home}</span>
            </Link>
          </li>

          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li key={idx} className="flex items-center gap-1.5 sm:gap-2">
                <ChevronRight
                  className={`w-3.5 h-3.5 text-slate-600 ${isRtl ? 'rotate-180' : ''}`}
                />
                {isLast || !item.path ? (
                  <span className="text-slate-200 font-semibold truncate max-w-[200px] sm:max-w-none">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.path}
                    className="hover:text-brand-cyan transition-colors truncate max-w-[150px] sm:max-w-none"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};
