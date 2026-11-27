import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import { getLocaleSeo, localizePath } from '../i18n/localeRouting';
import { Flame } from 'lucide-react';

export const TrendingPage: React.FC = () => {
  const { t, lang } = useLanguage();
  const [, setCatalogVersion] = useState(0);

  useEffect(() => {
    gameService.loadFullCatalog();
    return gameService.subscribe(() => {
      setCatalogVersion((v) => v + 1);
    });
  }, []);

  const trendingGames = gameService.getTrendingGames();
  const localeSeo = getLocaleSeo(lang);

  const seoTitle = localeSeo.trending.seoTitle;
  const seoDescription = localeSeo.trending.seoDesc;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalUrl={`${window.location.origin}${localizePath('/trending', lang)}`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.nav.trending }]} />

      <div className="flex items-center gap-3 my-6">
        <div className="p-2.5 rounded-2xl bg-brand-rose/20 text-brand-rose border border-brand-rose/30 shadow-md">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {localeSeo.trending.h1}
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
