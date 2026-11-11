import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useProfile } from '../context/ProfileContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { HeroBanner } from '../components/home/HeroBanner';
import { CategoryBar } from '../components/home/CategoryBar';
import { RecentlyPlayedShelf } from '../components/home/RecentlyPlayedShelf';
import { DailyChallengeWidget } from '../components/home/DailyChallengeWidget';
import { AdvancedFilterBar, FilterState } from '../components/common/AdvancedFilterBar';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import { GameCategory } from '../types/game';
import { Flame, Star, Sparkles, Clock, ArrowRight, Grid, Compass } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t, lang, isRtl } = useLanguage();
  const { profile } = useProfile();

  const categories = gameService.getAllCategories();
  const featuredGames = gameService.getFeaturedGames();
  const topFeatured = featuredGames[0] || gameService.getAllGames()[0];
  const trendingGames = gameService.getTrendingGames().slice(0, 10);
  const popularGames = gameService.getPopularGames(10);
  const recentGames = gameService.getRecentlyAdded(5);

  // Personalized recommendations based on gamer profile history
  const personalizedGames = gameService.getPersonalizedRecommendations(profile.history, 5);

  // Advanced Filtering State
  const [filters, setFilters] = useState<FilterState>({
    category: '',
    device: 'all',
    players: 'all',
    sort: 'trending',
  });

  const filteredGames = gameService.filterGames({
    category: filters.category || undefined,
    device: filters.device,
    players: filters.players,
    sort: filters.sort,
  });

  const hasActiveFilters =
    filters.category !== '' ||
    filters.device !== 'all' ||
    filters.players !== 'all' ||
    filters.sort !== 'trending';

  const resetFilters = () => {
    setFilters({
      category: '',
      device: 'all',
      players: 'all',
      sort: 'trending',
    });
  };

  const seoTitle =
    lang === 'ar'
      ? 'جلوبال أركيد — العاب مجانية بدون تحميل اون لاين | العاب متصفح HTML5'
      : 'Global Arcade — Play Free Online HTML5 Browser Games | No Download';

  const seoDescription =
    lang === 'ar'
      ? 'العب أفضل ألعاب المتصفح المجانية بدون تحميل على جلوبال أركيد. ألعاب أركيد، سباق، ذكاء، قتال وألعاب لشخصين باللغتين العربية والإنجليزية بجودة عالية وسرعة فائقة.'
      : 'Play hundreds of top free online browser games on Global Arcade. Instant HTML5 play without download or installation. Action, racing, puzzle, 2-player & arcade games.';

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Global Arcade',
    url: window.location.origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${window.location.origin}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={window.location.origin}
        schemaData={websiteSchema}
        lang={lang}
      />

      {/* Top Banner Ad Placement */}
      <AdSlot placement="header-top" className="mb-6" />

      {/* Hero Showcase Section */}
      <HeroBanner featuredGame={topFeatured} />

      {/* Category Pills Navigation */}
      <CategoryBar categories={categories} />

      {/* Jump Back In: Recently Played Shelf (Only appears if user played games) */}
      <RecentlyPlayedShelf />

      {/* Daily Quests / Challenges Widget */}
      <DailyChallengeWidget />

      {/* Advanced Filter & Sorting Bar */}
      <AdvancedFilterBar
        categories={categories}
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        totalResults={filteredGames.length}
      />

      {/* If filters are active, show Filtered Results instantly! */}
      {hasActiveFilters ? (
        <section className="my-10 animate-fadeIn">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-cyan" />
              <span>{lang === 'ar' ? 'نتائج التصفية المخصصة' : 'Filtered Games'}</span>
              <span className="text-xs font-mono text-slate-400 bg-dark-850 px-2.5 py-0.5 rounded-full border border-dark-700">
                {filteredGames.length}
              </span>
            </h2>
          </div>
          <GameGrid games={filteredGames} showInFeedAds={true} />
        </section>
      ) : (
        <>
          {/* SECTION 1: Trending Games */}
          <section className="my-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-rose/15 text-brand-rose">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {t.home.trendingGames}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'الأكثر تفاعلاً ولعباً هذا الأسبوع' : 'Hottest games played right now'}
                  </p>
                </div>
              </div>

              <Link
                to="/trending"
                className="flex items-center gap-1 text-xs font-bold text-brand-cyan hover:text-brand-purple transition-colors"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </div>

            <GameGrid games={trendingGames} />
          </section>

          {/* Middle Banner Ad Placement */}
          <AdSlot placement="below-game" className="my-8" />

          {/* SECTION 2: Recommended For You (Personalized Affinity Loop) */}
          <section className="my-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-purple/15 text-brand-purple">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {t.home.recommendedGames}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'ترشيحات ذكية مبنية على اهتماماتك وطريقة لعبك'
                      : 'Smart recommendations curated for your taste'}
                  </p>
                </div>
              </div>
            </div>

            <GameGrid games={personalizedGames} />
          </section>

          {/* SECTION 3: Most Popular Games */}
          <section className="my-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-amber/15 text-brand-amber">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {t.home.popularGames}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'الألعاب الأعلى تقييماً من اللاعبين' : 'All-time community favorites'}
                  </p>
                </div>
              </div>

              <Link
                to="/popular"
                className="flex items-center gap-1 text-xs font-bold text-brand-cyan hover:text-brand-purple transition-colors"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </div>

            <GameGrid games={popularGames} />
          </section>

          {/* SECTION 4: Browse by Category Cards */}
          <section className="my-14">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-purple/15 text-brand-purple">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {t.home.allCategories}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'اختر تصنيفك المفضل وابدأ اللعب فوراً' : 'Pick your favorite genre and jump straight in'}
                  </p>
                </div>
              </div>

              <Link
                to="/categories"
                className="flex items-center gap-1 text-xs font-bold text-brand-cyan hover:text-brand-purple transition-colors"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
              {categories.map((cat: GameCategory) => {
                const name = lang === 'ar' ? cat.nameAr : cat.name;
                const count = gameService.getGamesByCategory(cat.slug).length;

                return (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    className="group relative bg-dark-900 border border-dark-800 hover:border-brand-purple/50 p-4 rounded-2xl transition-all duration-300 hover:shadow-glow-purple flex flex-col justify-between overflow-hidden"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white group-hover:text-brand-cyan transition-colors truncate">
                        {name}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {count} {t.category.gamesCount}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* SECTION 5: Recently Added */}
          <section className="my-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-emerald/15 text-brand-emerald">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {t.home.recentlyAdded}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'أحدث الإضافات لمكتبة الألعاب' : 'Fresh additions to the arcade library'}
                  </p>
                </div>
              </div>
            </div>

            <GameGrid games={recentGames} />
          </section>
        </>
      )}

      {/* Organic SEO Text Article for Google Crawler Indexing */}
      <article className="mt-16 bg-dark-900/60 border border-dark-800/80 rounded-2xl p-6 sm:p-8 text-slate-400 text-xs sm:text-sm leading-relaxed space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-white">
          {lang === 'ar'
            ? 'مرحباً بكم في جلوبال أركيد — أفضل بوابة ألعاب HTML5 مجانية'
            : 'Welcome to Global Arcade — The Premier Free HTML5 Gaming Portal'}
        </h2>
        <p>
          {lang === 'ar'
            ? 'جلوبال أركيد هي منصة ترفيهية شاملة صممت خصيصاً لتوفر لمحبي الألعاب تجربة لعب فورية وسريعة بدون الحاجة لتنزيل أي برامج أو تثبيت ملفات. تعمل جميع الألعاب لدينا بتقنية HTML5 الحديثة المتوافقة مع أجهزة الكمبيوتر، الهواتف الذكية، وأجهزة التابلت بنظامي أندرويد وiOS.'
            : 'Global Arcade is a comprehensive gaming destination designed to give players around the world instant, free access to top-tier browser games without requiring downloads or software installs. Powered by modern HTML5 technology, every game loads immediately in your web browser across desktop PCs, smartphones, and tablets.'}
        </p>
        <p>
          {lang === 'ar'
            ? 'تضم مكتبتنا تشكيلة واسعة من ألعاب الأركيد، الأكشن، الذكاء والألغاز، سباقات السيارات، ألعاب شخصين، وألعاب الأطفال. نوفر دعماً كاملاً للغتين العربية والإنجليزية مع لوحة تحكم سهلة وتصميم مظلم حديث ومريح للعينين.'
            : 'Our curated catalog features a diverse range of genres including high-octane racing, thrilling action shooters, relaxing block puzzles, retro classics, and two-player split-keyboard faceoffs. Enjoy seamless bilingual English and Arabic support, responsive touch controls, and high-performance gameplay anytime, anywhere.'}
        </p>
      </article>
    </div>
  );
};
