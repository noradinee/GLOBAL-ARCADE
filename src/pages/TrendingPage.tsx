import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import { Flame } from 'lucide-react';

export const TrendingPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const trendingGames = gameService.getTrendingGames();

  const seoTitle =
    lang === 'ar'
      ? 'الألعاب الرائجة والأكثر تداولاً — العاب اون لاين | جلوبال أركيد'
      : 'Trending Browser Games — What Gamers Are Playing Now | Global Arcade';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description="Discover the most played and trending online HTML5 games on Global Arcade. Free instant play on mobile and desktop."
        canonicalUrl={`${window.location.origin}/trending`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.nav.trending }]} />

      <div className="flex items-center gap-3 my-6">
        <div className="p-2.5 rounded-2xl bg-brand-rose/20 text-brand-rose border border-brand-rose/30 shadow-md">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {t.home.trendingGames}
          </h1>
          <p className="text-xs text-slate-400">
            {trendingGames.length} {t.category.gamesCount}
          </p>
        </div>
      </div>

      <AdSlot placement="header-top" className="mb-6" />

      <GameGrid games={trendingGames} showInFeedAds={true} />

      <AdSlot placement="below-game" className="mt-10" />
    </div>
  );
};
