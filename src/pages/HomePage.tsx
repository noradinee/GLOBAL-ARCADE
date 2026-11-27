import React, { useState, useEffect } from 'react';
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
import { getLocaleSeo, getLocalizedCategorySeo, localizePath } from '../i18n/localeRouting';
import {
  Flame,
  Star,
  Sparkles,
  ArrowRight,
  Grid,
  Compass,
  Baby,
  SlidersHorizontal,
  Users,
  Globe,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t, lang, isRtl } = useLanguage();
  const { profile } = useProfile();
  const [, setCatalogVersion] = useState(0);

  useEffect(() => {
    return gameService.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
  }, []);

  const categories = gameService.getAllCategories();
  const allGames = gameService.getAllGames();
  const gamePixGames = gameService.getGamePixGames();
  const featuredGame = gamePixGames[0] || allGames[0];
  const trendingGames = gameService.getTrendingGames().slice(0, 10);
  const popularGames = gameService.getPopularGames(10);

  const requestedCategorySlugs = [
    'action',
    'arcade',
    'racing',
    'puzzle',
    'sports',
    'adventure',
    'two-player',
  ];
  const featuredCategories = requestedCategorySlugs
    .map(slug => categories.find(c => c.slug === slug))
    .filter((c): c is GameCategory => Boolean(c));

  // Filter kids & educational games specifically
  const kidsEducationalGames = allGames.filter(
    (g) => g.category === 'kids' || g.tags?.includes('kids') || g.tags?.includes('education')
  );

  // 2-Player showdown games
  const twoPlayerGames = allGames.filter(
    (g) => g.category === 'two-player' || g.tags?.includes('two-player')
  ).slice(0, 8);

  // Personalized recommendations
  const personalizedGames = gameService.getPersonalizedRecommendations(profile.history, 6);

  // Active Tab state for quick category switching
  const [activeTab, setActiveTab] = useState<'all' | 'kids' | 'trending' | 'global-hits' | 'two-player' | 'racing' | 'puzzle'>('all');
  const [showFilterBar, setShowFilterBar] = useState(false);

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

  const localeSeo = getLocaleSeo(lang);
  const seoTitle = localeSeo.home.seoTitle;
  const seoDescription = localeSeo.home.seoDesc;
  const seoKeywords = localeSeo.home.keywords;
  const canonicalUrl = `${window.location.origin}${localizePath('/', lang)}`;

  const websiteSchema = [
    {
      '@type': 'WebSite',
      name: seoTitle,
      alternateName: ['KYRAXO', 'كايراكسو', 'KYRAXO Games', 'ألعاب كايراكسو'],
      url: window.location.origin,
      inLanguage: lang,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${window.location.origin}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      name: 'KYRAXO',
      url: window.location.origin,
      logo: `${window.location.origin}/logo.svg`,
      sameAs: [
        'https://twitter.com/kyraxo',
      ],
    },
    {
      '@type': 'CollectionPage',
      name: localeSeo.home.h1,
      description: seoDescription,
      url: canonicalUrl,
      inLanguage: lang,
      numberOfItems: allGames.length,
    }
  ];

  // Select games according to active tab
  let tabGames = allGames;
  if (activeTab === 'kids') tabGames = kidsEducationalGames;
  else if (activeTab === 'trending') tabGames = trendingGames;
  else if (activeTab === 'global-hits') tabGames = gamePixGames;
  else if (activeTab === 'two-player') tabGames = twoPlayerGames;
  else if (activeTab === 'racing') tabGames = allGames.filter((g) => g.category === 'racing');
  else if (activeTab === 'puzzle') tabGames = allGames.filter((g) => g.category === 'puzzle');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
        schemaData={websiteSchema}
        lang={lang}
      />

      {/* Top Sponsored Banner Placement */}
      <AdSlot placement="header-top" className="mb-4 sm:mb-6" />

      {/* Featured Single Top Game Hero Banner */}
      <HeroBanner featuredGame={featuredGame} />

      {/* Clean Category Bar */}
      <CategoryBar categories={categories} />

      {/* Jump Back In: Recently Played Shelf (Only appears if user played games) */}
      <RecentlyPlayedShelf />

      {/* Daily Challenge Widget */}
      <DailyChallengeWidget />

      {/* STREAMLINED TAB NAVIGATION BAR */}
      <div className="my-6 bg-dark-900/90 border border-dark-800 p-2 sm:p-3 rounded-2xl backdrop-blur-md shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-brand-purple text-white shadow-glow-purple'
                : 'bg-dark-850 text-slate-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>{lang === 'ar' ? 'جميع الألعاب' : 'All Games'}</span>
            <span className="text-[10px] bg-dark-950/60 px-1.5 py-0.5 rounded-full font-mono">
              {allGames.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('kids')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'kids'
                ? 'bg-brand-emerald text-white shadow-glow-emerald'
                : 'bg-dark-850 text-slate-400 hover:text-emerald-400 hover:bg-dark-800'
            }`}
          >
            <Baby className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'ar' ? '👶 أطفال وتربية' : '👶 Kids & Learning'}</span>
            <span className="text-[10px] bg-dark-950/60 px-1.5 py-0.5 rounded-full font-mono">
              {kidsEducationalGames.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('global-hits')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'global-hits'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-glow-cyan'
                : 'bg-dark-850 text-slate-400 hover:text-cyan-300 hover:bg-dark-800'
            }`}
          >
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ar' ? '🌐 ألعاب عالمية' : '🌐 Global Hits'}</span>
            <span className="text-[10px] bg-dark-950/60 px-1.5 py-0.5 rounded-full font-mono">
              {gamePixGames.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trending')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'trending'
                ? 'bg-brand-rose text-white shadow-glow-rose'
                : 'bg-dark-850 text-slate-400 hover:text-rose-400 hover:bg-dark-800'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-400" />
            <span>{lang === 'ar' ? '🔥 الشائع' : '🔥 Trending'}</span>
          </button>

          <button
            onClick={() => setActiveTab('two-player')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'two-player'
                ? 'bg-brand-cyan text-white shadow-glow-cyan'
                : 'bg-dark-850 text-slate-400 hover:text-cyan-400 hover:bg-dark-800'
            }`}
          >
            <Users className="w-4 h-4 text-cyan-400" />
            <span>{lang === 'ar' ? '👥 لشخصين' : '👥 2-Player'}</span>
          </button>

          <button
            onClick={() => setActiveTab('racing')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'racing'
                ? 'bg-brand-amber text-white shadow-glow-amber'
                : 'bg-dark-850 text-slate-400 hover:text-amber-400 hover:bg-dark-800'
            }`}
          >
            <span>🏎️</span>
            <span>{lang === 'ar' ? 'سباقات' : 'Racing'}</span>
          </button>

          <button
            onClick={() => setActiveTab('puzzle')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition-all ${
              activeTab === 'puzzle'
                ? 'bg-brand-purple text-white shadow-glow-purple'
                : 'bg-dark-850 text-slate-400 hover:text-purple-400 hover:bg-dark-800'
            }`}
          >
            <span>🧩</span>
            <span>{lang === 'ar' ? 'ذكاء' : 'Puzzles'}</span>
          </button>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilterBar(!showFilterBar)}
          className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors border ${
            hasActiveFilters || showFilterBar
              ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan'
              : 'bg-dark-850 border-dark-700 text-slate-400 hover:text-white'
          }`}
          title={lang === 'ar' ? 'تخصيص الفلاتر والترتيب' : 'Toggle Filters'}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'تصفية وترتيب' : 'Filters'}</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse" />
          )}
        </button>
      </div>

      {/* Collapsible Advanced Filter Bar */}
      {(showFilterBar || hasActiveFilters) && (
        <div className="mb-6 animate-fadeIn">
          <AdvancedFilterBar
            categories={categories}
            filters={filters}
            onChange={setFilters}
            onReset={resetFilters}
            totalResults={filteredGames.length}
          />
        </div>
      )}

      {/* FILTERED RESULTS VIEW (if advanced filters are actively applied) */}
      {hasActiveFilters ? (
        <section className="my-8 animate-fadeIn">
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
      ) : activeTab !== 'all' ? (
        /* SINGLE TAB VIEW: Instant clean grid of selected tab */
        <section className="my-8 animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span>
                  {activeTab === 'kids' && (lang === 'ar' ? '👶 ألعاب الأطفال الصغار والتربية والتعليم' : '👶 Kids & Early Learning')}
                  {activeTab === 'global-hits' && (lang === 'ar' ? '🌐 ألعاب الشركاء العالمية المعتمدة (GamePix Hits)' : '🌐 Global Partner Hits (GamePix)')}
                  {activeTab === 'trending' && (lang === 'ar' ? '🔥 الألعاب الأكثر تداولاً ولعباً' : '🔥 Trending Games')}
                  {activeTab === 'two-player' && (lang === 'ar' ? '👥 ألعاب وتحديات لشخصين' : '👥 2-Player Local Duels')}
                  {activeTab === 'racing' && (lang === 'ar' ? '🏎️ ألعاب السيارات والسرعة والدريفت' : '🏎️ Racing & Speed')}
                  {activeTab === 'puzzle' && (lang === 'ar' ? '🧩 ألعاب الذكاء والألغاز والتفكير' : '🧩 Mind & Puzzle Games')}
                </span>
                <span className="text-xs font-mono text-slate-400 bg-dark-850 px-2.5 py-0.5 rounded-full border border-dark-700">
                  {tabGames.length}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                {activeTab === 'kids' && (lang === 'ar' ? 'باقة تعليمية تفاعلية: رسم، تلوين، حروف، أرقام، نظافة وعادات حسنة' : 'Interactive educational games: drawing, coloring, letters, numbers, and habits')}
                {activeTab === 'global-hits' && (lang === 'ar' ? `${gamePixGames.length}+ لعبة HTML5 عالمية فائقة الجودة تشمل الألغاز، الأكشن، الاستراتيجية، والرياضة للعب الفوري بدون تحميل` : `${gamePixGames.length}+ world-class HTML5 games featuring puzzles, action, strategy, sports & casual blockbusters`)}
                {activeTab === 'trending' && (lang === 'ar' ? 'الألعاب الأعلى نشاطاً ومشاركة من مجتمع كايراكسو' : 'Most played and highest active engagement on KYRAXO')}
                {activeTab === 'two-player' && (lang === 'ar' ? 'العب على نفس الجهاز مع صديقك أو أخيك بدون أي تحميل' : 'Pass-and-play party duels on the same screen')}
                {activeTab === 'racing' && (lang === 'ar' ? 'تحديات السرعة والتفحيط ومضامير السباق الحماسية' : 'High-octane drift and highway racing challenges')}
                {activeTab === 'puzzle' && (lang === 'ar' ? 'نشط عقلك بالألغاز المنطقية وتفجير المكعبات' : 'Sharpen your mind with logic and block puzzles')}
              </p>
            </div>
          </div>
          <GameGrid games={tabGames} showInFeedAds={true} />
        </section>
      ) : (
        /* "ALL" EDITORIAL HOMEPAGE VIEW: Well-organized shelves */
        <>
          {/* SECTION 1: VISUAL GENRE EXPLORER (Requested 7 Categories with Expressive Artwork) */}
          <section className="my-10 animate-fadeIn">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 shadow-glow-cyan">
                  <Grid className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-white">
                    {localeSeo.home.h1}
                  </h1>
                  <p className="text-xs text-slate-400">
                    {localeSeo.home.subtitle}
                  </p>
                </div>
              </div>

              <Link
                to={localizePath('/categories', lang)}
                className="flex items-center gap-1.5 text-xs font-bold text-brand-cyan hover:text-brand-purple transition-colors bg-brand-cyan/10 hover:bg-brand-cyan/20 px-3.5 py-1.5 rounded-xl border border-brand-cyan/20"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
              {featuredCategories.map((cat) => {
                const name = getLocalizedCategorySeo(cat.slug, lang)?.name || (lang === 'ar' ? cat.nameAr : cat.name);
                const count = gameService.getGamesByCategory(cat.slug).length;

                return (
                  <Link
                    key={cat.id}
                    to={localizePath(`/category/${cat.slug}`, lang)}
                    className="group relative rounded-2xl overflow-hidden bg-dark-900 border border-dark-800 hover:border-brand-cyan/60 transition-all duration-300 hover:shadow-glow-cyan hover:-translate-y-1 flex flex-col"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-dark-950">
                      {cat.thumbnail ? (
                        <img
                          src={cat.thumbnail}
                          alt={name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-tr ${cat.color} flex items-center justify-center`}>
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent" />
                      <span className="absolute top-2 right-2 text-[10px] font-bold bg-dark-900/80 backdrop-blur-md text-brand-cyan border border-brand-cyan/30 px-2 py-0.5 rounded-full shadow-sm font-mono">
                        {count}
                      </span>
                    </div>
                    <div className="p-3 text-center flex-1 flex flex-col justify-center bg-dark-900/90">
                      <h3 className="font-black text-xs sm:text-sm text-white group-hover:text-brand-cyan transition-colors truncate">
                        {name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {lang === 'ar' ? `${count} لعبة` : `${count} Games`}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* SECTION 3: KIDS & EARLY LEARNING HIGHLIGHT SHELF */}
          <section className="my-10 bg-gradient-to-r from-emerald-950/40 via-dark-900 to-teal-950/40 border border-emerald-500/20 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Baby className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-white">
                      {lang === 'ar' ? 'ألعاب الأطفال والتربية والتعليم' : 'Kids & Early Learning'}
                    </h2>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {kidsEducationalGames.length} {lang === 'ar' ? 'لعبة' : 'Games'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'تعلم الحروف العربية، الأرقام والحساب، تتبع الرسم، والعادات والأخلاق الحميدة'
                      : 'Arabic letters, math & numbers, drawing, manners & healthy habits'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('kids')}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/20"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <GameGrid games={kidsEducationalGames.slice(0, 8)} />
          </section>

          {/* SECTION 2: Trending Games */}
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

              <button
                onClick={() => setActiveTab('trending')}
                className="flex items-center gap-1 text-xs font-bold text-brand-cyan hover:text-brand-purple transition-colors"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <GameGrid games={trendingGames} />
          </section>

          {/* Middle Sponsored Banner Placement */}
          <AdSlot placement="below-game" className="my-8" />

          {/* SECTION 3: 2-PLAYER SHOWDOWNS */}
          <section className="my-10 bg-gradient-to-r from-cyan-950/30 via-dark-900 to-blue-950/30 border border-cyan-500/20 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {lang === 'ar' ? 'تحديات لشخصين (2-Player)' : '2-Player Showdowns'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? 'هوكي الهواء، تيك تاك تو نيون، وتنس المضرب على نفس الشاشة'
                      : 'Air hockey, neon tic-tac-toe, tennis clash and party duels'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('two-player')}
                className="flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <GameGrid games={twoPlayerGames} />
          </section>

          {/* SECTION 4: Recommended For You */}
          {personalizedGames.length > 0 && (
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
          )}

          {/* SECTION 5: Most Popular Games */}
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
                    {lang === 'ar' ? 'الألعاب الأعلى تقييماً من مجتمع اللاعبين' : 'All-time community favorites'}
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

          {/* SECTION 6: Browse by Category Cards */}
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
                to={localizePath('/categories', lang)}
                className="flex items-center gap-1 text-xs font-bold text-brand-cyan hover:text-brand-purple transition-colors"
              >
                <span>{t.home.viewAll}</span>
                <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5 sm:gap-4">
              {categories.map((cat: GameCategory) => {
                const name = getLocalizedCategorySeo(cat.slug, lang)?.name || (lang === 'ar' ? cat.nameAr : cat.name);
                const count = gameService.getGamesByCategory(cat.slug).length;

                return (
                  <Link
                    key={cat.id}
                    to={localizePath(`/category/${cat.slug}`, lang)}
                    className="group relative bg-dark-900 border border-dark-800 hover:border-brand-purple/50 p-4 rounded-2xl transition-all duration-300 hover:shadow-glow-purple flex flex-col justify-between overflow-hidden"
                  >
                    {cat.thumbnail ? (
                      <div className="w-full aspect-[16/10] rounded-xl overflow-hidden mb-3 relative bg-dark-950">
                        <img
                          src={cat.thumbnail}
                          alt={name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                    )}
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

          {/* SECTION 7: Complete Arcade Catalog */}
          <section className="my-14">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-cyan/15 text-brand-cyan">
                  <Grid className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    {lang === 'ar' ? `مكتبة الألعاب الشاملة (${allGames.length} لعبة)` : `Complete Game Library (${allGames.length} Games)`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {lang === 'ar' ? 'تصفح والعب أي لعبة مباشرة بدون أي انتظار' : 'Browse and play instantly without installation'}
                  </p>
                </div>
              </div>
            </div>

            <GameGrid games={allGames} showInFeedAds={true} />
          </section>

          {/* SECTION 8: Editorial Platform Guide & Quality Standards (AdSense & Search Content Depth) */}
          <section className="my-14 bg-dark-900/90 border border-dark-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-dark-800 pb-4">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {lang === 'ar' ? 'دليل كايراكسو للألعاب المباشرة ومعايير الجودة' : 'KYRAXO Editorial Guide: Instant Web Gaming & Quality Standards'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                {lang === 'ar'
                  ? 'تعرف على كيفية فحص الألعاب واختيار أفضل التجارب التفاعلية لتعمل بأمان وسرعة في متصفحك.'
                  : 'How we curate, sandbox, and test browser-ready HTML5 games across desktop and mobile devices.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="bg-dark-850/70 border border-dark-800 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-brand-cyan">
                  {lang === 'ar' ? 'لعب فوري بتقنيات HTML5 و WebGL' : 'Built for Instant HTML5 & WebGL Play'}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {lang === 'ar'
                    ? 'تعمل جميع الألعاب مباشرة داخل المتصفح باستخدام HTML5 Canvas وWebGL دون الحاجة لتحميل ملفات تنفيذية أو تثبيت إضافات، مع دعم تلقائي لحجم شاشة الهاتف والكمبيوتر.'
                    : 'Every game launches directly inside your modern browser using standard HTML5 Canvas and WebGL graphics with zero installers, plugins, or storage overhead.'}
                </p>
              </div>
              <div className="bg-dark-850/70 border border-dark-800 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-brand-purple">
                  {lang === 'ar' ? 'بيئة تشغيل معزولة وفحص أمني مستمر' : 'Sandboxed Runtime & Curation Checks'}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {lang === 'ar'
                    ? 'يتم تشغيل الألعاب المحلية داخل بيئة iframe معزولة وفحصها برمجياً للتحقق من خلوها من الأكواد الضارة وإتاحة قسم مخصص وآمن لتعليم الأطفال.'
                    : 'Titles run in strict sandboxed frames with automated static security auditing, permissive licensing checks, and dedicated family-safe kids & puzzle collections.'}
                </p>
              </div>
              <div className="bg-dark-850/70 border border-dark-800 rounded-2xl p-4 space-y-2">
                <h3 className="font-bold text-brand-emerald">
                  {lang === 'ar' ? 'تصنيفات دقيقة وتحديات يومية' : 'Genre Curation, 2-Player & Daily Picks'}
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  {lang === 'ar'
                    ? 'تغطي المكتبة ألعاب الذكاء والرياضيات، السباقات، الأكشن، الأركيد الكلاسيكي، ومواجهات اللاعبين على جهاز واحد، مع تحكم باللمس ولوحة المفاتيح.'
                    : 'Explore categorized collections covering strategy, puzzles, racing, 2-player local duels, sports, and kids educational activities with saved personal high scores.'}
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
