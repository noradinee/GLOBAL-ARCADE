import React from 'react';
import { Link } from 'react-router-dom';
import { Game } from '../../types/game';
import { useLanguage } from '../../context/LanguageContext';
import { Play, Sparkles, Zap, Shield, Flame } from 'lucide-react';

interface HeroBannerProps {
  featuredGame?: Game;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ featuredGame }) => {
  const { t, lang, isRtl } = useLanguage();

  if (!featuredGame) return null;

  const title = lang === 'ar' ? featuredGame.titleAr : featuredGame.title;
  const description = lang === 'ar' ? featuredGame.descriptionAr : featuredGame.description;

  return (
    <section className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-dark-900 via-dark-850 to-dark-900 border border-dark-750/80 shadow-2xl p-6 sm:p-8 md:p-12 mb-10">
      {/* Background ambient lighting and thumbnail artwork */}
      <div
        className="absolute top-0 right-0 w-full sm:w-2/3 h-full bg-cover bg-center opacity-20 filter blur-sm select-none pointer-events-none"
        style={{ backgroundImage: `url(${featuredGame.thumbnail})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-dark-950 via-dark-950/90 to-transparent" />

      {/* Decorative Neon Blurs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-brand-purple/25 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-brand-cyan/20 rounded-full filter blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl flex flex-col items-start gap-4">
        {/* Featured Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-violet/20 border border-brand-violet/40 text-brand-cyan text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-brand-neon" />
          <span>{lang === 'ar' ? 'اللعبة المميزة اليوم' : 'Featured Game of the Day'}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
          {title}
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-300 line-clamp-3 leading-relaxed">
          {description}
        </p>

        {/* Value Prop Badges */}
        <div className="flex flex-wrap items-center gap-3 py-2 text-xs text-slate-400 font-semibold">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800/80 border border-dark-700/60">
            <Zap className="w-3.5 h-3.5 text-brand-amber" />
            <span>{t.home.noDownloads}</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800/80 border border-dark-700/60">
            <Shield className="w-3.5 h-3.5 text-brand-emerald" />
            <span>{t.home.instantPlay}</span>
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800/80 border border-dark-700/60">
            <Flame className="w-3.5 h-3.5 text-brand-rose" />
            <span>{featuredGame.rating} ★ Top Rated</span>
          </span>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center flex-wrap gap-4 pt-2">
          <Link
            to={`/game/${featuredGame.slug}`}
            className="flex items-center gap-3 px-7 py-3.5 rounded-full bg-gradient-to-r from-brand-purple via-brand-violet to-brand-cyan text-white font-extrabold text-base shadow-glow-purple hover:scale-105 active:scale-95 transition-all"
          >
            <Play className={`w-5 h-5 fill-white ${isRtl ? 'rotate-180' : ''}`} />
            <span>{t.home.playNow}</span>
          </Link>

          <Link
            to="/categories"
            className="px-6 py-3.5 rounded-full bg-dark-800 hover:bg-dark-750 text-slate-200 font-bold text-sm border border-dark-700 hover:border-slate-500 transition-colors"
          >
            {t.home.exploreCategories}
          </Link>
        </div>
      </div>
    </section>
  );
};
