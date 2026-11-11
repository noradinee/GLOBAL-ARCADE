import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useFavorites } from '../context/FavoritesContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GameGrid } from '../components/game/GameGrid';
import { Game } from '../types/game';
import { Bookmark, Gamepad2, ArrowLeft } from 'lucide-react';

export const FavoritesPage: React.FC = () => {
  const { t, lang, isRtl } = useLanguage();
  const { favorites } = useFavorites();

  const allGames = gameService.getAllGames();
  const favoritedGames = allGames.filter((g: Game) => favorites.includes(g.id));

  const seoTitle =
    lang === 'ar'
      ? 'ألعابي المفضلة — جلوبال أركيد'
      : 'My Favorite Games — Global Arcade';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description="Your bookmarked favorite HTML5 games on Global Arcade. Return anytime to continue playing."
        canonicalUrl={`${window.location.origin}/favorites`}
        lang={lang}
      />

      <Breadcrumb items={[{ label: t.nav.favorites }]} />

      <div className="flex items-center gap-3 my-6">
        <div className="p-2.5 rounded-2xl bg-brand-rose/20 text-brand-rose border border-brand-rose/30">
          <Bookmark className="w-6 h-6 fill-brand-rose" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {t.nav.favorites}
          </h1>
          <p className="text-xs text-slate-400">
            {favoritedGames.length} {t.category.gamesCount}
          </p>
        </div>
      </div>

      {favoritedGames.length > 0 ? (
        <GameGrid games={favoritedGames} />
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-3xl p-12 text-center my-10 max-w-lg mx-auto">
          <Gamepad2 className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">
            {lang === 'ar' ? 'قائمتك المفضلة فارغة حالياً' : 'Your favorites list is empty'}
          </h3>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {lang === 'ar'
              ? 'انقر على أيقونة الإشارة المرجعية على أي لعبة لإضافتها إلى قائمتك الخاصة والعودة إليها بسرعة في أي وقت.'
              : 'Click the bookmark icon on any game card to save it here for fast instant access whenever you visit.'}
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-purple hover:bg-brand-violet text-white text-xs font-bold transition-all shadow-glow-purple"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span>{t.home.exploreCategories}</span>
          </Link>
        </div>
      )}
    </div>
  );
};
