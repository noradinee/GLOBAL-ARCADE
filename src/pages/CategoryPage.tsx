import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import { CategoryBar } from '../components/home/CategoryBar';
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
  SlidersHorizontal,
  ArrowLeft,
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

type SortOption = 'popular' | 'rating' | 'alphabetical';

export const CategoryPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang, isRtl } = useLanguage();
  const [sortBy, setSortBy] = useState<SortOption>('popular');

  const category = slug ? gameService.getCategoryBySlug(slug) : undefined;
  const allCategories = gameService.getAllCategories();
  const rawGames = slug ? gameService.getGamesByCategory(slug) : [];

  const sortedGames = useMemo(() => {
    const list = [...rawGames];
    if (sortBy === 'popular') {
      return list.sort((a, b) => b.popularityScore - a.popularityScore);
    }
    if (sortBy === 'rating') {
      return list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    if (sortBy === 'alphabetical') {
      return list.sort((a, b) => {
        const titleA = lang === 'ar' ? a.titleAr : a.title;
        const titleB = lang === 'ar' ? b.titleAr : b.title;
        return titleA.localeCompare(titleB);
      });
    }
    return list;
  }, [rawGames, sortBy, lang]);

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-black text-white mb-4">Category Not Found</h1>
        <p className="text-slate-400 mb-8">
          The category you are looking for does not exist or has been modified.
        </p>
        <Link
          to="/categories"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-purple text-white font-bold hover:bg-brand-violet transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{t.home.exploreCategories}</span>
        </Link>
      </div>
    );
  }

  const categoryName = lang === 'ar' ? category.nameAr : category.name;
  const categoryDesc = lang === 'ar' ? category.descriptionAr : category.description;
  const IconComponent = iconMap[category.icon] || Gamepad2;

  const seoTitle =
    lang === 'ar'
      ? `${categoryName} — العب أفضل ${categoryName} مجاناً بدون تحميل | جلوبال أركيد`
      : `Free Online ${category.name} — Play Best ${category.name} Browser Games | Global Arcade`;

  const seoDescription =
    lang === 'ar'
      ? `العب أحدث وأقوى ${categoryName} أونلاين على متصفحك بدون تحميل. استمتع بألعاب مجانية عالية الجودة للجوال والكمبيوتر على جلوبال أركيد.`
      : `Play the best free online ${category.name.toLowerCase()} on Global Arcade. Instant browser play, no download required. Discover top-rated games now!`;

  const canonicalUrl = `${window.location.origin}/category/${category.slug}`;

  const breadcrumbItems = [
    { label: t.nav.categories, path: '/categories' },
    { label: categoryName },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={canonicalUrl}
        lang={lang}
      />

      <Breadcrumb items={breadcrumbItems} />

      {/* Category Hero Header Banner */}
      <div className={`relative rounded-3xl overflow-hidden bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750 p-6 sm:p-8 my-4 shadow-xl`}>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr ${category.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
              <IconComponent className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                  {categoryName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-dark-800 text-brand-cyan text-xs font-bold border border-dark-700">
                  {rawGames.length}
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
                {categoryDesc}
              </p>
            </div>
          </div>

          {/* Sort Dropdown Filter */}
          <div className="flex items-center gap-2 self-start sm:self-center bg-dark-900/90 p-1.5 rounded-xl border border-dark-750">
            <SlidersHorizontal className="w-4 h-4 text-brand-purple ml-2 rtl:mr-2" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none cursor-pointer pr-4 rtl:pl-4"
              aria-label={t.category.sortBy}
            >
              <option value="popular" className="bg-dark-900 text-white">
                {t.category.popularFirst}
              </option>
              <option value="rating" className="bg-dark-900 text-white">
                {t.category.highestRated}
              </option>
              <option value="alphabetical" className="bg-dark-900 text-white">
                {t.category.alphabetical}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Quick Category Bar */}
      <CategoryBar categories={allCategories} activeSlug={category.slug} />

      {/* Top Category Ad */}
      <AdSlot placement="header-top" className="my-4" />

      {/* Games List or Empty State */}
      <div className="my-8">
        {sortedGames.length > 0 ? (
          <GameGrid games={sortedGames} showInFeedAds={true} />
        ) : (
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-12 text-center my-8">
            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm max-w-sm mx-auto">
              {t.category.noGamesFound}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Ad */}
      <AdSlot placement="below-game" className="my-8" />
    </div>
  );
};
