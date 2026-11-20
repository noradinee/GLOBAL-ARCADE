import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { gameService } from '../../services/gameService';
import { Game } from '../../types/game';
import {
  Search,
  X,
  Play,
  CornerDownLeft,
  ArrowUpLeft,
  ArrowUpRight,
  Sparkles,
  Star,
  Gamepad2,
} from 'lucide-react';

interface SearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: (val: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  dropdownClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  onSelectGame?: (game: Game) => void;
}

export const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  autoFocus = false,
  className = '',
  inputClassName = '',
  dropdownClassName = '',
  size = 'md',
  onSelectGame,
}) => {
  const { t, lang, isRtl } = useLanguage();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions trigger starting at 1 single letter!
  const suggestions = value.trim().length >= 1
    ? gameService.getSearchSuggestions(value.trim(), 6)
    : [];

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset active index when suggestions change
  useEffect(() => {
    setActiveIndex(-1);
  }, [value]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      handleChooseGame(suggestions[activeIndex].game);
      return;
    }
    const cleanQuery = value.trim();
    if (cleanQuery) {
      setIsOpen(false);
      if (onSubmit) {
        onSubmit(cleanQuery);
      } else {
        navigate(`/search?q=${encodeURIComponent(cleanQuery)}`);
      }
    }
  };

  const handleChooseGame = (game: Game) => {
    setIsOpen(false);
    if (onSelectGame) {
      onSelectGame(game);
    } else {
      navigate(`/game/${game.slug}`);
    }
  };

  // Autocomplete into input without navigating
  const handleAutoComplete = (e: React.MouseEvent, title: string) => {
    e.stopPropagation();
    e.preventDefault();
    onChange(title);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Tab') {
      // Tab autocompletes text from active or first suggestion
      const targetSuggestion = activeIndex >= 0 ? suggestions[activeIndex] : suggestions[0];
      if (targetSuggestion) {
        e.preventDefault();
        const chosenTitle = lang === 'ar' ? targetSuggestion.game.titleAr : targetSuggestion.game.title;
        onChange(chosenTitle);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        handleChooseGame(suggestions[activeIndex].game);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Helper to highlight matching characters
  const highlightMatch = (text: string, queryStr: string) => {
    if (!queryStr.trim()) return text;
    const parts = text.split(new RegExp(`(${queryStr.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === queryStr.toLowerCase() ? (
        <span key={i} className="text-brand-cyan font-black underline decoration-brand-cyan/60">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const sizeClasses = {
    sm: 'py-1.5 text-xs',
    md: 'py-2 sm:py-2.5 text-sm',
    lg: 'py-3 sm:py-3.5 text-base',
  };

  const AutoFillIcon = isRtl ? ArrowUpLeft : ArrowUpRight;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (value.trim().length >= 1) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder || t.search.placeholder}
          className={`w-full bg-dark-900/95 text-slate-100 placeholder-slate-500 rounded-xl border border-dark-700/80 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple focus:outline-none transition-all shadow-inner ${
            sizeClasses[size]
          } ${isRtl ? 'pr-10 pl-16' : 'pl-10 pr-16'} ${inputClassName}`}
        />

        {/* Search Magnifier Icon */}
        <Search
          className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
            isRtl ? 'right-3.5' : 'left-3.5'
          }`}
        />

        {/* Actions inside input (Clear and Submit button) */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 ${
            isRtl ? 'left-2.5' : 'right-2.5'
          }`}
        >
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
              title="Clear text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="submit"
            className="p-1.5 rounded-lg bg-brand-violet/20 hover:bg-brand-violet text-brand-cyan hover:text-white border border-brand-violet/40 transition-all focus:outline-none"
            title={t.search.searchTitle}
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Floating Autocomplete & Instant Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          className={`absolute top-full left-0 right-0 mt-2 bg-dark-950/98 backdrop-blur-xl border border-brand-purple/30 rounded-2xl shadow-2xl shadow-black/80 p-2 z-50 animate-fadeIn divide-y divide-dark-800/60 overflow-hidden ${dropdownClassName}`}
        >
          {/* Header pill */}
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-brand-cyan">
              <Sparkles className="w-3 h-3 text-brand-cyan animate-pulse" />
              {t.search.quickSuggestions}
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              [Tab] {t.search.autoComplete}
            </span>
          </div>

          {/* List of matching games with Autocomplete action */}
          <div className="py-1 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
            {suggestions.map((item, idx) => {
              const g = item.game;
              const displayTitle = lang === 'ar' ? g.titleAr : g.title;
              const isSelected = activeIndex === idx;

              return (
                <div
                  key={g.id}
                  onClick={() => handleChooseGame(g)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={`group flex items-center justify-between gap-3 p-2 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-violet/30 to-brand-cyan/20 border border-brand-cyan/40 shadow-sm'
                      : 'hover:bg-dark-900 border border-transparent'
                  }`}
                >
                  {/* Left: Thumbnail & Titles */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative w-11 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-dark-850 border border-dark-750">
                      <img
                        src={g.thumbnail}
                        alt={displayTitle}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback icon placeholder if image fails
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-brand-cyan transition-colors">
                          {highlightMatch(displayTitle, value.trim())}
                        </h4>
                        <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-semibold bg-dark-800 text-slate-400 rounded border border-dark-700 capitalize">
                          {g.category}
                        </span>
                        {g.benchmarkGame && (
                          <span className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/15 text-amber-300 rounded border border-amber-500/30">
                            {lang === 'ar' ? `بديل ${g.benchmarkGameAr || g.benchmarkGame}` : `${g.benchmarkGame} Alt`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                          <Star className="w-2.5 h-2.5 fill-amber-400" />
                          {g.rating || 4.8}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">
                          {g.ratingCount ? `${g.ratingCount.toLocaleString()} plays` : 'Instant Play'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Auto-fill icon button & Play button */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Autocomplete Button: fills input with this game title */}
                    <button
                      type="button"
                      onClick={(e) => handleAutoComplete(e, displayTitle)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-dark-800 hover:bg-brand-purple/20 text-slate-300 hover:text-brand-cyan text-[11px] font-semibold border border-dark-700 hover:border-brand-purple/40 transition-all"
                      title={`${t.search.autoComplete}: "${displayTitle}"`}
                    >
                      <AutoFillIcon className="w-3 h-3 text-brand-purple" />
                      <span className="hidden md:inline">{t.search.autoComplete}</span>
                    </button>

                    {/* Direct Play button */}
                    <div className="p-1.5 rounded-lg bg-brand-cyan/20 group-hover:bg-brand-cyan text-brand-cyan group-hover:text-dark-950 transition-colors">
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer: Press Enter for all results */}
          <div
            onClick={() => handleSubmit()}
            className="px-3 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-white hover:bg-dark-900 rounded-b-xl cursor-pointer transition-colors"
          >
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Gamepad2 className="w-3.5 h-3.5 text-brand-purple" />
              <span>
                {t.search.pressEnterForResults} &quot;<span className="text-brand-cyan font-bold">{value.trim()}</span>&quot;
              </span>
            </span>
            <span className="text-[10px] text-brand-cyan font-bold bg-dark-850 px-2 py-0.5 rounded-md border border-dark-750">
              Enter ↵
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
