import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { analytics } from '../services/analytics';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
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
  Play,
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, lang, isRtl } = useLanguage();

  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const deviceParam = (searchParams.get('device') as 'all' | 'mobile' | 'desktop') || 'all';
  const playersParam = (searchParams.get('players') as 'all' | 'single' | 'two-player') || 'all';

  const [query, setQuery] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedDevice, setSelectedDevice] = useState(deviceParam);
  const [selectedPlayers, setSelectedPlayers] = useState(playersParam);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const categories = gameService.getAllCategories();
  const allGames = gameService.getAllGames();
  const popularTags = ['runner', 'puzzle', 'drift', 'space', 'retro', '2-player', 'cyberpunk', 'stack'];

  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);

  const searchResults = gameService.filterGames({
    query,
    category: selectedCategory || undefined,
    device: selectedDevice,
    players: selectedPlayers,
    sort: 'trending',
  });

  // Instant suggestions matching title or tag
  const suggestions = query.trim().length >= 2
    ? allGames
        .filter((g) => {
          const q = query.toLowerCase();
          return (
            g.title.toLowerCase().includes(q) ||
            g.titleAr.toLowerCase().includes(q) ||
            g.tags.some((t) => t.toLowerCase().includes(q))
          );
        })
        .slice(0, 4)
    : [];

  useEffect(() => {
    if (query.trim()) {
      analytics.trackSearchUsed(query.trim(), searchResults.length);
    }
  }, [query, searchResults.length]);

  const updateUrlParams = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val && val !== 'all') {
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

  const handleTagClick = (tag: string) => {
    handleQueryChange(tag);
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedCategory('');
    setSelectedDevice('all');
    setSelectedPlayers('all');
    setSearchParams({});
  };

  const seoTitle = query
    ? `${t.search.resultsFor} "${query}" — Global Arcade`
    : `${t.search.searchTitle} — Global Arcade`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description="Search hundreds of free HTML5 games by keyword, genre, device support, and tags on Global Arcade."
        canonicalUrl={`${window.location.origin}/search`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.search.searchTitle }]} />

      {/* Search Header Form */}
      <div className="bg-dark-900 border border-dark-800 rounded-3xl p-5 sm:p-8 my-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white mb-4">
          {t.search.searchTitle}
        </h1>

        <div className="flex flex-col md:flex-row gap-3.5">
          {/* Text Input with Auto-Suggestions dropdown */}
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={t.search.placeholder}
              className={`w-full bg-dark-850 text-white placeholder-slate-500 rounded-xl py-3 border border-dark-700 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple focus:outline-none text-sm transition-all ${
                isRtl ? 'pr-11 pl-10' : 'pl-11 pr-10'
              }`}
            />
            <Search
              className={`w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${
                isRtl ? 'right-3.5' : 'left-3.5'
              }`}
            />
            {query && (
              <button
                onClick={() => handleQueryChange('')}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white ${
                  isRtl ? 'left-3.5' : 'right-3.5'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Instant Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl p-2 z-30 animate-fadeIn">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1 block">
                  Quick Matching Games
                </span>
                {suggestions.map((s) => (
                  <Link
                    key={s.id}
                    to={`/game/${s.slug}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-dark-800 transition-colors"
                  >
                    <img src={s.thumbnail} alt={s.title} className="w-10 h-7 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">
                        {lang === 'ar' ? s.titleAr : s.title}
                      </h4>
                      <span className="text-[10px] text-brand-cyan capitalize">{s.category}</span>
                    </div>
                    <Play className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative min-w-[180px]">
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full bg-dark-850 text-white rounded-xl py-3 px-4 border border-dark-700 text-sm focus:border-brand-purple focus:outline-none appearance-none cursor-pointer"
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

        {/* Device & Player Mode Sub-filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-dark-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-bold">Device:</span>
            <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750">
              <button
                onClick={() => handleDeviceChange('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedDevice === 'all' ? 'bg-brand-purple text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleDeviceChange('mobile')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedDevice === 'mobile' ? 'bg-brand-purple text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Mobile</span>
              </button>
              <button
                onClick={() => handleDeviceChange('desktop')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedDevice === 'desktop' ? 'bg-brand-purple text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Keyboard</span>
              </button>
            </div>

            <span className="text-slate-400 font-bold ml-2 rtl:mr-2">Players:</span>
            <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750">
              <button
                onClick={() => handlePlayersChange('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedPlayers === 'all' ? 'bg-brand-cyan text-dark-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handlePlayersChange('single')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedPlayers === 'single' ? 'bg-brand-cyan text-dark-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>1 Player</span>
              </button>
              <button
                onClick={() => handlePlayersChange('two-player')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                  selectedPlayers === 'two-player' ? 'bg-brand-cyan text-dark-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>2 Players</span>
              </button>
            </div>
          </div>

          {(query || selectedCategory || selectedDevice !== 'all' || selectedPlayers !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-xs text-brand-rose hover:underline font-bold"
            >
              {lang === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
            </button>
          )}
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-dark-800">
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
                  ? 'bg-brand-purple text-white'
                  : 'bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white border border-dark-700/60'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <AdSlot placement="header-top" className="my-4" />

      {/* Results Header */}
      <div className="flex items-center justify-between my-6">
        <h2 className="text-lg font-bold text-white">
          {query ? (
            <span>
              {t.search.resultsFor} &quot;<span className="text-brand-cyan">{query}</span>&quot;
            </span>
          ) : (
            <span>{lang === 'ar' ? 'جميع الألعاب المتاحة' : 'All Available Games'}</span>
          )}
        </h2>
        <span className="text-xs font-bold text-slate-400 bg-dark-900 px-3 py-1 rounded-full border border-dark-800">
          {searchResults.length} {t.category.gamesCount}
        </span>
      </div>

      {/* Search Results Grid */}
      {searchResults.length > 0 ? (
        <GameGrid games={searchResults} showInFeedAds={true} />
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-12 text-center my-8">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">
            {t.search.noResults} {query && `"${query}"`}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t.search.noResultsHint}
          </p>
        </div>
      )}

      <AdSlot placement="below-game" className="my-8" />
    </div>
  );
};
