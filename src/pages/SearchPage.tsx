import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gameService, GameFilterOptions } from '../services/gameService';
import { analytics } from '../services/analytics';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import { SearchAutocomplete } from '../components/common/SearchAutocomplete';
import { GameCategory } from '../types/game';
import {
  Search,
  Filter,
  X,
  Tag,
  Smartphone,
  Monitor,
  Users,
  User,
  Flame,
  Star,
  Zap,
  ArrowDownAZ,
  ArrowUpZA,
  Sparkles,
  RotateCcw,
  Languages,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang, isRtl } = useLanguage();

  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const deviceParam = (searchParams.get('device') as 'all' | 'mobile' | 'desktop') || 'all';
  const playersParam = (searchParams.get('players') as 'all' | 'single' | 'two-player') || 'all';
  const sortParam = (searchParams.get('sort') as GameFilterOptions['sort']) || 'trending';
  const letterParam = searchParams.get('letter') || 'all';

  const [query, setQuery] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedDevice, setSelectedDevice] = useState(deviceParam);
  const [selectedPlayers, setSelectedPlayers] = useState(playersParam);
  const [selectedSort, setSelectedSort] = useState<GameFilterOptions['sort']>(sortParam);
  const [selectedLetter, setSelectedLetter] = useState<string>(letterParam);
  const [useArabicAlphabet, setUseArabicAlphabet] = useState<boolean>(lang === 'ar');
  const [catalogVersion, setCatalogVersion] = useState(0);

  useEffect(() => {
    gameService.loadFullCatalog();
    return gameService.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
  }, []);

  const categories = gameService.getAllCategories();
  const allGames = gameService.getAllGames();
  const popularTags = ['runner', 'puzzle', 'drift', 'space', 'retro', '2-player', 'cyberpunk', 'stack', 'kids', 'racing'];

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  useEffect(() => {
    setSelectedSort(sortParam);
  }, [sortParam]);

  useEffect(() => {
    setSelectedLetter(letterParam);
  }, [letterParam]);

  // Synchronize URL parameters
  const updateUrlParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val && val !== 'all' && (key !== 'sort' || val !== 'trending')) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    setSearchParams(params);
  };

  const handleQueryChange = (val: string) => {
    setQuery(val);
    updateUrlParams({ q: val.trim() });
  };

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    updateUrlParams({ category: cat });
  };

  const handleDeviceChange = (dev: 'all' | 'mobile' | 'desktop') => {
    setSelectedDevice(dev);
    updateUrlParams({ device: dev });
  };

  const handlePlayersChange = (pl: 'all' | 'single' | 'two-player') => {
    setSelectedPlayers(pl);
    updateUrlParams({ players: pl });
  };

  const handleSortChange = (sort: GameFilterOptions['sort']) => {
    setSelectedSort(sort);
    updateUrlParams({ sort: sort || 'trending' });
  };

  const handleLetterChange = (letter: string) => {
    setSelectedLetter(letter);
    updateUrlParams({ letter });
  };

  const handleTagClick = (tag: string) => {
    handleQueryChange(tag);
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedDevice('all');
    setSelectedPlayers('all');
    setSelectedSort('trending');
    setSelectedLetter('all');
    setSearchParams({});
  };

  // Search results based on active filters
  const searchResults = useMemo(() => {
    return gameService.filterGames({
      query,
      category: selectedCategory || undefined,
      device: selectedDevice,
      players: selectedPlayers,
      sort: selectedSort,
      letter: selectedLetter !== 'all' ? selectedLetter : undefined,
    });
  }, [query, selectedCategory, selectedDevice, selectedPlayers, selectedSort, selectedLetter, catalogVersion]);

  useEffect(() => {
    if (query.trim()) {
      analytics.trackSearchUsed(query.trim(), searchResults.length);
    }
  }, [query, searchResults.length]);

  // Alphabets for letter filter
  const latinAlphabet = useMemo(
    () => ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'],
    []
  );

  const arabicAlphabet = useMemo(
    () => ['all', 'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ر', 'ز', 'س', 'ش', 'ص', 'ط', 'ع', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي', '#'],
    []
  );

  const activeAlphabet = useArabicAlphabet ? arabicAlphabet : latinAlphabet;

  // Compute game count per letter for badges
  const letterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allGames.length };
    allGames.forEach((g) => {
      const enFirst = g.title.trim().charAt(0).toUpperCase();
      const arFirst = (g.titleAr || '').trim().charAt(0);

      // Check non-letter
      if (!/^[A-Za-z\u0621-\u064A]/.test(g.title)) {
        counts['#'] = (counts['#'] || 0) + 1;
      }

      if (enFirst) {
        counts[enFirst] = (counts[enFirst] || 0) + 1;
      }
      if (arFirst) {
        counts[arFirst] = (counts[arFirst] || 0) + 1;
      }
    });
    return counts;
  }, [allGames]);

  // Sort pills config
  const sortOptions = [
    { id: 'popular', label: t.search.mostPlayed, icon: Flame, badge: '🔥' },
    { id: 'trending', label: t.search.trending, icon: Zap, badge: '⚡' },
    { id: 'rating', label: t.search.highestRated, icon: Star, badge: '⭐' },
    { id: 'az', label: t.search.alphabeticalAZ, icon: ArrowDownAZ, badge: 'A-Z' },
    { id: 'za', label: t.search.alphabeticalZA, icon: ArrowUpZA, badge: 'Z-A' },
    { id: 'recent', label: t.search.newest, icon: Sparkles, badge: '🚀' },
  ];

  const hasActiveFilters =
    Boolean(query) ||
    Boolean(selectedCategory) ||
    selectedDevice !== 'all' ||
    selectedPlayers !== 'all' ||
    selectedSort !== 'trending' ||
    selectedLetter !== 'all';

  const seoTitle = query
    ? `${t.search.resultsFor} "${query}" — KYRAXO`
    : `${t.search.searchTitle} — KYRAXO`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description="Search thousands of free HTML5 games by keyword, genre, alphabet letter, popularity, device support, and tags on KYRAXO."
        canonicalUrl={`${window.location.origin}/search`}
        lang={lang}
        robots="noindex, follow"
      />

      <Breadcrumb items={[{ label: t.search.searchTitle }]} />

      {/* Main Search & Filter Control Center */}
      <div className="bg-dark-900/95 border border-dark-800 rounded-3xl p-5 sm:p-8 my-6 shadow-2xl relative overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute top-0 right-1/4 w-80 h-32 bg-brand-violet/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-cyan text-white shadow-glow-purple">
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
            </span>
            <span>{t.search.searchTitle}</span>
          </h1>

          {/* Quick game count badge */}
          <span className="text-xs font-bold text-slate-400 bg-dark-850 px-3 py-1.5 rounded-full border border-dark-750 self-start sm:self-auto">
            {allGames.length} {t.home.gamesAvailable}
          </span>
        </div>

        {/* Search Input with Instant Autocomplete + Category Filter */}
        <div className="flex flex-col md:flex-row gap-3.5">
          <div className="flex-1 relative">
            <SearchAutocomplete
              value={query}
              onChange={handleQueryChange}
              onSubmit={handleQueryChange}
              size="lg"
              autoFocus={!queryParam}
              placeholder={t.search.placeholder}
              className="w-full"
            />
          </div>

          {/* Category Dropdown */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-dark-850 text-white rounded-xl py-3.5 px-4 border border-dark-700 text-sm focus:border-brand-purple focus:outline-none appearance-none cursor-pointer shadow-inner"
            >
              <option value="">{t.search.allCategories}</option>
              {categories.map((c: GameCategory) => (
                <option key={c.id} value={c.slug}>
                  {lang === 'ar' ? c.nameAr : c.name}
                </option>
              ))}
            </select>
            <Filter className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none ${isRtl ? 'left-3.5' : 'right-3.5'}`} />
          </div>
        </div>

        {/* 1. Sorting Bar: Most Played / Trending / Rating / Alphabetical */}
        <div className="mt-5 pt-4 border-t border-dark-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>{t.search.sortBy}:</span>
            </span>

            {/* Sort Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {sortOptions.map((opt) => {
                const Icon = opt.icon;
                const active = selectedSort === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSortChange(opt.id as GameFilterOptions['sort'])}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      active
                        ? 'bg-gradient-to-r from-brand-violet to-brand-cyan text-white shadow-glow-purple scale-105'
                        : 'bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-750'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 2. Alphabet Letter Filter Bar (A-Z / Arabic Letters / #) */}
        <div className="mt-4 pt-4 border-t border-dark-800">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-brand-purple/20 text-brand-cyan text-[10px] font-black border border-brand-purple/30">
                A-Z
              </span>
              <span>{t.search.letters}:</span>
            </span>

            {/* Language Alphabet Switcher (Latin / Arabic) */}
            <button
              onClick={() => setUseArabicAlphabet(!useArabicAlphabet)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-brand-cyan transition-colors"
              title="Toggle Alphabet (Latin / Arabic)"
            >
              <Languages className="w-3.5 h-3.5" />
              <span>{useArabicAlphabet ? 'English (A - Z)' : 'العربية (أ - ي)'}</span>
            </button>
          </div>

          {/* Letter Pills Scrollable Row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
            {activeAlphabet.map((letter) => {
              const active = selectedLetter === letter;
              const count = letterCounts[letter] || 0;
              const isAll = letter === 'all';
              const displayLabel = isAll ? (lang === 'ar' ? 'الكل' : 'ALL') : letter;

              return (
                <button
                  key={letter}
                  onClick={() => handleLetterChange(letter)}
                  className={`flex-shrink-0 flex items-center justify-center min-w-[34px] h-[34px] px-2 rounded-xl text-xs font-black transition-all ${
                    active
                      ? 'bg-brand-cyan text-dark-950 font-black shadow-glow-cyan scale-110'
                      : 'bg-dark-850 hover:bg-dark-800 text-slate-300 hover:text-white border border-dark-750'
                  }`}
                  title={`${displayLabel} (${count} games)`}
                >
                  <span>{displayLabel}</span>
                  {!isAll && count > 0 && (
                    <span
                      className={`text-[9px] ml-1 rtl:mr-1 opacity-70 ${
                        active ? 'text-dark-900 font-black' : 'text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Device & Player Mode Sub-filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-dark-800 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Device Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Device:</span>
              <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750">
                <button
                  onClick={() => handleDeviceChange('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedDevice === 'all' ? 'bg-brand-purple text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handleDeviceChange('mobile')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedDevice === 'mobile' ? 'bg-brand-purple text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
                <button
                  onClick={() => handleDeviceChange('desktop')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedDevice === 'desktop' ? 'bg-brand-purple text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Keyboard</span>
                </button>
              </div>
            </div>

            {/* Players Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">Players:</span>
              <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750">
                <button
                  onClick={() => handlePlayersChange('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedPlayers === 'all' ? 'bg-brand-cyan text-dark-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => handlePlayersChange('single')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedPlayers === 'single' ? 'bg-brand-cyan text-dark-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>1 Player</span>
                </button>
                <button
                  onClick={() => handlePlayersChange('two-player')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    selectedPlayers === 'two-player' ? 'bg-brand-cyan text-dark-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>2 Players</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reset All Filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand-rose/20 hover:bg-brand-rose text-brand-rose hover:text-white border border-brand-rose/40 text-xs font-bold transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{t.search.clearFilters}</span>
            </button>
          )}
        </div>

        {/* 4. Quick Tag Pills */}
        <div className="flex items-center flex-wrap gap-2 mt-4 pt-3 border-t border-dark-800">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-bold">
            <Tag className="w-3.5 h-3.5 text-brand-purple" />
            {t.search.quickTags}:
          </span>
          {popularTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                query.toLowerCase() === tag
                  ? 'bg-brand-purple text-white shadow-sm'
                  : 'bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700/60'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <AdSlot placement="header-top" className="my-4" />

      {/* Active Filter Chips Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-dark-900/60 border border-dark-800 rounded-2xl text-xs">
          <span className="text-slate-400 font-bold">Active Filters:</span>
          {query && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-violet/20 border border-brand-violet/40 text-brand-cyan font-bold">
              <span>&quot;{query}&quot;</span>
              <button onClick={() => handleQueryChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedLetter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-cyan/20 border border-brand-cyan/40 text-brand-cyan font-bold">
              <span>Letter: {selectedLetter}</span>
              <button onClick={() => handleLetterChange('all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedSort !== 'trending' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
              <span>Sort: {sortOptions.find((s) => s.id === selectedSort)?.label}</span>
              <button onClick={() => handleSortChange('trending')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              <span>Category: {selectedCategory}</span>
              <button onClick={() => handleCategoryChange('')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedDevice !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700 text-slate-300 font-bold">
              <span>Device: {selectedDevice}</span>
              <button onClick={() => handleDeviceChange('all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedPlayers !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700 text-slate-300 font-bold">
              <span>Players: {selectedPlayers}</span>
              <button onClick={() => handlePlayersChange('all')} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between my-6">
        <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
          {query ? (
            <span>
              {t.search.resultsFor} &quot;<span className="text-brand-cyan">{query}</span>&quot;
            </span>
          ) : selectedLetter !== 'all' ? (
            <span>
              {lang === 'ar' ? `الألعاب التي تبدأ بحرف "${selectedLetter}"` : `Games Starting with "${selectedLetter}"`}
            </span>
          ) : (
            <span>{lang === 'ar' ? 'جميع الألعاب المتاحة' : 'All Available Games'}</span>
          )}
          {selectedSort === 'popular' && (
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
              🔥 {t.search.mostPlayed}
            </span>
          )}
        </h2>
        <span className="text-xs font-bold text-slate-300 bg-dark-900 px-3.5 py-1.5 rounded-full border border-dark-800 shadow-sm">
          {searchResults.length} {t.category.gamesCount}
        </span>
      </div>

      {/* Search Results Grid */}
      {searchResults.length > 0 ? (
        <GameGrid games={searchResults} showInFeedAds={true} />
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-12 text-center my-8 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-4 border border-dark-700">
            <Search className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {t.search.noResults} {query ? `"${query}"` : selectedLetter !== 'all' ? `"${selectedLetter}"` : ''}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mb-6">
            {t.search.noResultsHint}
          </p>
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-violet text-white font-bold text-xs transition-all shadow-glow-purple"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.search.clearFilters}</span>
          </button>
        </div>
      )}

      <AdSlot placement="below-game" className="my-8" />
    </div>
  );
};
