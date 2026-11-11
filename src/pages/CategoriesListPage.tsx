import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { AdSlot } from '../components/ads/AdSlot';
import { GameCategory } from '../types/game';
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
  ArrowRight,
} from 'lucide-react';

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

export const CategoriesListPage: React.FC = () => {
  const { t, lang, isRtl } = useLanguage();
  const categories = gameService.getAllCategories();

  const seoTitle =
    lang === 'ar'
      ? 'أقسام وتصنيفات الألعاب — تصفح جميع أنواع ألعاب المتصفح | جلوبال أركيد'
      : 'All Game Categories — Browse Free Browser Games by Genre | Global Arcade';

  const seoDescription =
    lang === 'ar'
      ? 'تصفح جميع أقسام الألعاب على جلوبال أركيد. ألعاب أركيد، سباق سيارات، ألغاز، أكشن، ألعاب شخصين، وألعاب أطفال مجانية بدون تحميل.'
      : 'Explore all game categories on Global Arcade. Find your favorite arcade, puzzle, racing, action, sports, and multiplayer browser games.';

  const breadcrumbItems = [{ label: t.category.allCategoriesTitle }];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={`${window.location.origin}/categories`}
        lang={lang}
      />

      <Breadcrumb items={breadcrumbItems} />

      <div className="my-6">
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
          {t.category.allCategoriesTitle}
        </h1>
        <p className="text-sm text-slate-400 max-w-xl">
          {t.category.exploreDesc}
        </p>
      </div>

      <AdSlot placement="header-top" className="mb-8" />

      {/* Grid of 10 Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat: GameCategory) => {
          const IconComponent = iconMap[cat.icon] || Gamepad2;
          const name = lang === 'ar' ? cat.nameAr : cat.name;
          const desc = lang === 'ar' ? cat.descriptionAr : cat.description;
          const gamesCount = gameService.getGamesByCategory(cat.slug).length;

          return (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="group bg-dark-900 border border-dark-800 hover:border-brand-purple/60 rounded-2xl p-6 transition-all duration-300 hover:shadow-glow-purple flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-brand-cyan bg-dark-800 px-2.5 py-1 rounded-full border border-dark-750">
                    {gamesCount} {t.category.gamesCount}
                  </span>
                </div>

                <h2 className="text-lg font-black text-white group-hover:text-brand-cyan transition-colors mb-2">
                  {name}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                  {desc}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-purple group-hover:text-brand-cyan transition-colors mt-6 pt-4 border-t border-dark-800">
                <span>{lang === 'ar' ? 'استكشف الألعاب' : 'Explore Games'}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </div>
            </Link>
          );
        })}
      </div>

      <AdSlot placement="below-game" className="mt-12" />
    </div>
  );
};
