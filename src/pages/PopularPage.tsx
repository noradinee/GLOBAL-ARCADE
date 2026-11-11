import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import { Star } from 'lucide-react';

export const PopularPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const popularGames = gameService.getPopularGames(20);

  const seoTitle =
    lang === 'ar'
      ? 'أفضل وأشهر الألعاب — الأعلى تقييماً | جلوبال أركيد'
      : 'Most Popular Online Games — Highest Rated Games | Global Arcade';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description="Play the top-rated, most popular free browser games on Global Arcade. Hand-picked games with thousands of player reviews."
        canonicalUrl={`${window.location.origin}/popular`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.nav.popular }]} />

      <div className="flex items-center gap-3 my-6">
        <div className="p-2.5 rounded-2xl bg-brand-amber/20 text-brand-amber border border-brand-amber/30 shadow-md">
          <Star className="w-6 h-6 fill-brand-amber" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {t.home.popularGames}
          </h1>
          <p className="text-xs text-slate-400">
            {popularGames.length} {t.category.gamesCount}
          </p>
        </div>
      </div>

      <AdSlot placement="header-top" className="mb-6" />

      <GameGrid games={popularGames} showInFeedAds={true} />

      <AdSlot placement="below-game" className="mt-10" />
    </div>
  );
};
