import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { GameCategory } from '../../types/game';
import {
  Smartphone,
  Monitor,
  Users,
  User,
  RotateCcw,
} from 'lucide-react';

export interface FilterState {
  category: string;
  device: 'all' | 'mobile' | 'desktop';
  players: 'all' | 'single' | 'two-player';
  sort: 'trending' | 'rating' | 'popular' | 'recent';
}

interface AdvancedFilterBarProps {
  categories: GameCategory[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  totalResults: number;
}

export const AdvancedFilterBar: React.FC<AdvancedFilterBarProps> = ({
  categories,
  filters,
  onChange,
  onReset,
  totalResults,
}) => {
  const { lang } = useLanguage();

  const handleDeviceChange = (device: FilterState['device']) => {
    onChange({ ...filters, device });
  };

  const handlePlayersChange = (players: FilterState['players']) => {
    onChange({ ...filters, players });
  };

  const handleSortChange = (sort: FilterState['sort']) => {
    onChange({ ...filters, sort });
  };

  const handleCategoryChange = (category: string) => {
    onChange({ ...filters, category });
  };

  const hasActiveFilters =
    filters.category !== '' ||
    filters.device !== 'all' ||
    filters.players !== 'all' ||
    filters.sort !== 'trending';

  return (
    <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-3 sm:p-4 my-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Device Mode Toggle */}
        <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750">
          <button
            onClick={() => handleDeviceChange('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filters.device === 'all'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Devices
          </button>
          <button
            onClick={() => handleDeviceChange('mobile')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
              filters.device === 'mobile'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile Touch Screen Ready"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile Touch</span>
          </button>
          <button
            onClick={() => handleDeviceChange('desktop')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
              filters.device === 'desktop'
                ? 'bg-brand-purple text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Keyboard / Mouse"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keyboard</span>
          </button>
        </div>

        {/* Player Count Toggle */}
        <div className="flex items-center gap-1 bg-dark-850 p-1 rounded-xl border border-dark-750">
          <button
            onClick={() => handlePlayersChange('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              filters.players === 'all'
                ? 'bg-brand-cyan text-dark-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {lang === 'ar' ? 'الكل' : 'All Modes'}
          </button>
          <button
            onClick={() => handlePlayersChange('single')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
              filters.players === 'single'
                ? 'bg-brand-cyan text-dark-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1 Player</span>
          </button>
          <button
            onClick={() => handlePlayersChange('two-player')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
              filters.players === 'two-player'
                ? 'bg-brand-cyan text-dark-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2 Players</span>
          </button>
        </div>

        {/* Sort Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-bold hidden md:inline">Sort:</span>
          <select
            value={filters.sort}
            onChange={(e) => handleSortChange(e.target.value as FilterState['sort'])}
            className="bg-dark-850 text-white rounded-xl py-1.5 px-3 border border-dark-750 font-bold cursor-pointer focus:outline-none"
          >
            <option value="trending">🔥 Trending First</option>
            <option value="rating">★ Highest Rated</option>
            <option value="popular">⚡ Most Popular</option>
            <option value="recent">🕒 Recently Added</option>
          </select>
        </div>
      </div>

      {/* Category Filter Chips & Reset */}
      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-dark-800">
        <button
          onClick={() => handleCategoryChange('')}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
            filters.category === ''
              ? 'bg-slate-200 text-dark-950 shadow-sm'
              : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-750'
          }`}
        >
          {lang === 'ar' ? 'جميع الأقسام' : 'All Genres'}
        </button>

        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => handleCategoryChange(c.slug)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filters.category === c.slug
                ? 'bg-brand-purple text-white shadow-sm'
                : 'bg-dark-850 text-slate-400 hover:text-white border border-dark-750'
            }`}
          >
            {lang === 'ar' ? c.nameAr : c.name}
          </button>
        ))}

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-1 text-xs text-brand-rose hover:underline ml-auto rtl:mr-auto font-bold px-2 py-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}

        <span className="text-[11px] text-slate-500 font-mono ml-2 rtl:mr-2">
          {totalResults} games
        </span>
      </div>
    </div>
  );
};
