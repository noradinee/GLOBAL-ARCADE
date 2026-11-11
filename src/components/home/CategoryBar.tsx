import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { GameCategory } from '../../types/game';
import {
  Gamepad2,
  Brain,
  Gauge,
  Trophy,
  Swords,
  Users,
  Globe,
  Coffee,
  Sparkles,
  Compass,
} from 'lucide-react';

interface CategoryBarProps {
  categories: GameCategory[];
  activeSlug?: string;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  Gamepad2,
  Brain,
  Gauge,
  Trophy,
  Swords,
  Users,
  Globe,
  Coffee,
  Sparkles,
  Compass,
};

export const CategoryBar: React.FC<CategoryBarProps> = ({ categories, activeSlug }) => {
  const { lang } = useLanguage();

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2 my-4">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-max px-1">
        {categories.map((cat) => {
          const IconComponent = iconMap[cat.icon] || Gamepad2;
          const isActive = activeSlug === cat.slug;
          const title = lang === 'ar' ? cat.nameAr : cat.name;

          return (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                isActive
                  ? 'bg-brand-purple text-white border-brand-purple shadow-glow-purple'
                  : 'bg-dark-900/90 text-slate-300 hover:text-white border-dark-800 hover:border-dark-700 hover:bg-dark-850'
              }`}
            >
              <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-brand-cyan'}`} />
              <span>{title}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
