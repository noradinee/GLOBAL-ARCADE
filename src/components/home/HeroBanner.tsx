import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Game } from '../../types/game';
import { useLanguage } from '../../context/LanguageContext';
import { gameService } from '../../services/gameService';
import featuredConfig from '../../data/featuredGamesConfig.json';
import {
  Play,
  Sparkles,
  Zap,
  Shield,
  Gamepad2,
  Star,
  ChevronLeft,
  ChevronRight,
  Box,
} from 'lucide-react';

interface HeroBannerProps {
  featuredGame?: Game;
  customFeaturedGames?: Game[];
}

interface CuratedFeaturedItem {
  game: Game;
  badgeAr: string;
  badgeEn: string;
  is3D: boolean;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ featuredGame, customFeaturedGames }) => {
  const { t, lang, isRtl } = useLanguage();
  const totalGames = gameService.getAllGames().length;
  const isAr = lang === 'ar';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Build the list of curated featured games
  const allGames = gameService.getAllGames();
  const curatedList: CuratedFeaturedItem[] = React.useMemo(() => {
    if (customFeaturedGames && customFeaturedGames.length > 0) {
      return customFeaturedGames.map(g => ({
        game: g,
        badgeAr: '🌟 لعبة مميزة مختارة',
        badgeEn: '🌟 Featured Hit',
        is3D: Boolean((g.title + ' ' + g.slug).toLowerCase().includes('3d')),
      }));
    }

    const items: CuratedFeaturedItem[] = [];
    for (const conf of featuredConfig) {
      const g = allGames.find(x => x.slug === conf.slug);
      if (g) {
        items.push({
          game: g,
          badgeAr: conf.badgeAr,
          badgeEn: conf.badgeEn,
          is3D: conf.is3D,
        });
      }
    }

    // Fallback if catalog not yet hydrated
    if (items.length === 0 && featuredGame) {
      items.push({
        game: featuredGame,
        badgeAr: '🌟 اللعبة العالمية الأولى اليوم',
        badgeEn: '🌟 #1 Featured Global Hit',
        is3D: false,
      });
    }

    return items;
  }, [allGames, customFeaturedGames, featuredGame]);

  const totalSlides = curatedList.length;

  const nextSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex(prev => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    if (totalSlides === 0) return;
    setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Auto-play timer (advances every 5.5s unless hovered/paused)
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, totalSlides, nextSlide]);

  if (totalSlides === 0) return null;

  const activeItem = curatedList[currentIndex] || curatedList[0];
  const activeGame = activeItem.game;
  const title = isAr ? activeGame.titleAr || activeGame.title : activeGame.title;
  const description = isAr ? activeGame.descriptionAr || activeGame.description : activeGame.description;
  const activeBadge = isAr ? activeItem.badgeAr : activeItem.badgeEn;

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped Right
        if (isRtl) nextSlide();
        else prevSlide();
      } else {
        // Swiped Left
        if (isRtl) prevSlide();
        else nextSlide();
      }
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  return (
    <section
      className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-dark-950 via-dark-900 to-indigo-950/70 border border-brand-purple/35 shadow-2xl p-6 sm:p-8 md:p-10 mb-8 select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
      aria-label={isAr ? 'بانر أفضل الألعاب المميزة' : 'Top Featured Games Carousel'}
    >
      {/* Background ambient lighting and thumbnail artwork with smooth crossfade */}
      <div
        key={`bg-${activeGame.slug}`}
        className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-xl select-none pointer-events-none transition-all duration-700 transform scale-105"
        style={{ backgroundImage: `url(${activeGame.thumbnail})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-dark-950 via-dark-950/90 to-transparent pointer-events-none" />

      {/* Decorative Neon Lighting Orbs */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-brand-purple/20 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-brand-cyan/20 rounded-full filter blur-3xl pointer-events-none" />

      {/* Slide Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-dark-800/80 overflow-hidden z-20">
        <div
          key={`bar-${currentIndex}`}
          className={`h-full bg-gradient-to-r from-brand-purple via-brand-cyan to-brand-neon ${
            isPaused ? '' : 'animate-progressBar'
          }`}
          style={{
            animationDuration: '5500ms',
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards',
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left Content Column */}
        <div className="max-w-2xl flex flex-col items-start gap-4">
          {/* Featured Pill & 3D Tag */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-brand-purple/30 to-brand-cyan/20 border border-brand-purple/40 text-brand-cyan text-xs font-bold uppercase tracking-wider shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-brand-neon animate-pulse" />
              <span>{activeBadge}</span>
            </div>

            {activeItem.is3D && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-black tracking-wide shadow-sm">
                <Box className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
                <span>3D GAME</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{isAr ? 'لعب فوري مجاني' : 'Instant Web Play'}</span>
            </div>
          </div>

          {/* Title with smooth fade */}
          <h2
            key={`title-${activeGame.slug}`}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight animate-fadeIn"
          >
            {title}
          </h2>

          {/* Description */}
          <p
            key={`desc-${activeGame.slug}`}
            className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed animate-fadeIn"
          >
            {description}
          </p>

          {/* Value Prop Badges */}
          <div className="flex flex-wrap items-center gap-2.5 py-1 text-xs text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{activeGame.rating || 4.9} ★ {isAr ? 'أعلى تقييم' : 'Top Rated'}</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan font-bold shadow-sm">
              <Gamepad2 className="w-3.5 h-3.5 text-brand-cyan" />
              <span className="capitalize">{activeGame.category || 'Arcade'} • {totalGames} {isAr ? 'لعبة' : 'Games'}</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-850/80 border border-dark-700/60 text-slate-400">
              <Zap className="w-3.5 h-3.5 text-brand-neon" />
              <span>{t.home.noDownloads}</span>
            </span>
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-850/80 border border-dark-700/60 text-slate-400">
              <Shield className="w-3.5 h-3.5 text-brand-emerald" />
              <span>{isAr ? 'متوافقة مع الجوال والحاسوب' : 'Mobile & PC Ready'}</span>
            </span>
          </div>

          {/* CTA Buttons & Slide Indicator */}
          <div className="flex items-center flex-wrap gap-4 pt-2">
            <Link
              to={`/game/${activeGame.slug}`}
              className="flex items-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-purple via-brand-violet to-brand-cyan text-white font-extrabold text-base shadow-glow-purple hover:scale-105 active:scale-95 transition-all"
            >
              <Play className={`w-5 h-5 fill-white ${isRtl ? 'rotate-180' : ''}`} />
              <span>{isAr ? 'العب الآن مجاناً' : 'Play Now Free'}</span>
            </Link>

            <Link
              to="/categories"
              className="px-6 py-3.5 rounded-full bg-dark-800/90 hover:bg-dark-750 text-slate-200 font-bold text-sm border border-dark-700 hover:border-slate-500 transition-colors"
            >
              {t.home.exploreCategories}
            </Link>

            {/* Slide Counter Badge */}
            <span className="text-xs font-mono text-slate-400 bg-dark-850/90 px-3 py-1.5 rounded-full border border-dark-700/60">
              {currentIndex + 1} / {totalSlides}
            </span>
          </div>
        </div>

        {/* Right Artwork Showcase Card */}
        <div className="w-full lg:w-80 flex-shrink-0 flex flex-col items-center">
          <Link
            to={`/game/${activeGame.slug}`}
            className="group relative block w-full rounded-2xl overflow-hidden border border-brand-purple/40 bg-dark-900 shadow-2xl transition-transform duration-300 hover:scale-105"
          >
            <div className="aspect-[16/10] overflow-hidden bg-dark-950">
              <img
                key={`img-${activeGame.slug}`}
                src={activeGame.thumbnail}
                alt={title}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 animate-fadeIn"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent opacity-80" />
            </div>

            {/* Play Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-dark-950/40">
              <div className="w-14 h-14 rounded-full bg-brand-purple/90 text-white flex items-center justify-center shadow-glow-purple">
                <Play className={`w-6 h-6 fill-white ml-0.5 ${isRtl ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Card Bottom Meta */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <span className="text-xs font-bold text-white drop-shadow truncate">
                {title}
              </span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-cyan text-dark-950 shadow">
                {isAr ? 'العب' : 'PLAY'}
              </span>
            </div>
          </Link>

          {/* Quick Mini Thumbs Strip below card */}
          <div className="flex items-center justify-center gap-1.5 mt-4 max-w-full overflow-x-auto py-1 px-2 no-scrollbar">
            {curatedList.map((item, idx) => (
              <button
                key={`dot-${item.game.slug}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}: ${item.game.title}`}
                className={`transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-7 h-2 bg-gradient-to-r from-brand-purple to-brand-cyan shadow-sm'
                    : 'w-2 h-2 bg-dark-700 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Arrows (Prev / Next) */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={isRtl ? nextSlide : prevSlide}
            aria-label={isAr ? 'اللعبة السابقة' : 'Previous game'}
            className="absolute top-1/2 -translate-y-1/2 left-2 sm:left-4 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-dark-900/85 hover:bg-dark-800 text-white border border-dark-700/80 shadow-lg flex items-center justify-center opacity-70 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all backdrop-blur-sm"
          >
            {isRtl ? (
              <ChevronRight className="w-5 h-5 text-slate-200" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-slate-200" />
            )}
          </button>

          <button
            onClick={isRtl ? prevSlide : nextSlide}
            aria-label={isAr ? 'اللعبة التالية' : 'Next game'}
            className="absolute top-1/2 -translate-y-1/2 right-2 sm:right-4 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-dark-900/85 hover:bg-dark-800 text-white border border-dark-700/80 shadow-lg flex items-center justify-center opacity-70 group-hover:opacity-100 hover:scale-110 active:scale-95 transition-all backdrop-blur-sm"
          >
            {isRtl ? (
              <ChevronLeft className="w-5 h-5 text-slate-200" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-200" />
            )}
          </button>
        </>
      )}
    </section>
  );
};
