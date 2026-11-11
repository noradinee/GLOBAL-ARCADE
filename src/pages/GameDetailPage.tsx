import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { gameService } from '../services/gameService';
import { SEOHead } from '../components/common/SEOHead';
import { Breadcrumb } from '../components/common/Breadcrumb';
import { GamePlayer } from '../components/game/GamePlayer';
import { GameRatingWidget } from '../components/game/GameRatingWidget';
import { GameGrid } from '../components/game/GameGrid';
import { AdSlot } from '../components/ads/AdSlot';
import {
  Gamepad2,
  HelpCircle,
  Keyboard,
  Smartphone,
  Tag,
  Star,
  Shield,
  Calendar,
  User,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

export const GameDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang, isRtl } = useLanguage();

  const game = slug ? gameService.getGameBySlug(slug) : undefined;
  const category = game ? gameService.getCategoryBySlug(game.category) : undefined;
  const relatedGames = game ? gameService.getRelatedGames(game, 5) : [];
  const recommendedGames = gameService.getPopularGames(5).filter(g => g.id !== game?.id);

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  if (!game) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-black text-white mb-4">404 — Game Not Found</h1>
        <p className="text-slate-400 mb-8">
          The requested game may have been moved or removed from our library.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-purple text-white font-bold hover:bg-brand-violet transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{t.common.backToHome}</span>
        </Link>
      </div>
    );
  }

  const title = lang === 'ar' ? game.titleAr : game.title;
  const description = lang === 'ar' ? game.descriptionAr : game.description;
  const instructions = lang === 'ar' ? game.instructionsAr : game.instructions;
  const categoryName = category ? (lang === 'ar' ? category.nameAr : category.name) : game.category;

  const seoTitle =
    lang === 'ar'
      ? `${title} — العب مجاناً اون لاين بدون تحميل | جلوبال أركيد`
      : `${title} — Play Free Online HTML5 Game | Global Arcade`;

  const canonicalUrl = `${window.location.origin}/game/${game.slug}`;

  // Structured Data Schema for VideoGame according to Schema.org standard
  const gameSchema = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    headline: title,
    description: game.description,
    image: `${window.location.origin}${game.thumbnail}`,
    genre: game.category,
    applicationCategory: 'Game',
    operatingSystem: 'Any, Web Browser',
    url: canonicalUrl,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: game.rating || 4.8,
      ratingCount: game.ratingCount || 500,
      bestRating: '5',
      worstRating: '1',
    },
    author: {
      '@type': 'Organization',
      name: game.author || 'Global Arcade Studios',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };

  const breadcrumbItems = [
    { label: t.nav.categories, path: '/categories' },
    { label: categoryName, path: `/category/${game.category}` },
    { label: title },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <SEOHead
        title={seoTitle}
        description={description}
        canonicalUrl={canonicalUrl}
        ogImage={game.thumbnail}
        ogType="game"
        schemaData={gameSchema}
        lang={lang}
      />

      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Main Game Section with Player and Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 my-4">
        {/* Left Column: Player & Game Details (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* Responsive Game Player Component */}
          <GamePlayer game={game} />

          {/* Interactive Game Reaction & Rating Widget */}
          <GameRatingWidget gameId={game.id} />

          {/* Ad Slot safely positioned below game with safe margin */}
          <AdSlot placement="below-game" className="my-2" />

          {/* Game Overview / Description Card */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 sm:p-7 space-y-4">
            <div className="flex items-center gap-2 border-b border-dark-800 pb-3">
              <Gamepad2 className="w-5 h-5 text-brand-purple" />
              <h2 className="text-lg font-black text-white">{t.game.description}</h2>
            </div>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {description}
            </p>

            {/* How to Play Section */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-brand-cyan" />
                <span>{t.game.instructions}</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 bg-dark-850 p-3.5 rounded-xl border border-dark-750/70 leading-relaxed">
                {instructions}
              </p>
            </div>

            {/* Controls Matrix */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <Keyboard className="w-4 h-4 text-brand-amber" />
                <span>{t.game.controls}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Desktop controls */}
                <div className="bg-dark-850 p-3 rounded-xl border border-dark-750">
                  <span className="font-bold text-brand-cyan block mb-1.5 flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5" />
                    {t.game.desktopControls}
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {game.controls.desktop.map((c: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Mobile controls */}
                <div className="bg-dark-850 p-3 rounded-xl border border-dark-750">
                  <span className="font-bold text-brand-purple block mb-1.5 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    {t.game.mobileControls}
                  </span>
                  <ul className="space-y-1 text-slate-300">
                    {game.controls.mobile.map((c: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-purple" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Tags Pill List */}
            <div className="flex items-center flex-wrap gap-2 pt-3 border-t border-dark-800">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-xs text-slate-500 font-bold">{t.game.tags}:</span>
              {game.tags.map((tag: string) => (
                <Link
                  key={tag}
                  to={`/search?q=${encodeURIComponent(tag)}`}
                  className="px-2.5 py-1 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 hover:text-white text-xs transition-colors border border-dark-700/60"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Game Metadata & Sidebar Ads (1 col) */}
        <aside className="lg:col-span-1 flex flex-col gap-5">
          {/* Metadata Card */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 space-y-4 text-xs">
            <h3 className="font-black text-sm text-white uppercase tracking-wider border-b border-dark-800 pb-2">
              {lang === 'ar' ? 'معلومات اللعبة' : 'Game Info'}
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-brand-amber fill-brand-amber" />
                  <span>{t.game.rating}</span>
                </span>
                <span className="font-bold text-white">
                  {game.rating} / 5.0 ({game.ratingCount} {t.game.votes})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5 text-brand-cyan" />
                  <span>{t.game.category}</span>
                </span>
                <Link
                  to={`/category/${game.category}`}
                  className="font-bold text-brand-cyan hover:underline capitalize"
                >
                  {categoryName}
                </Link>
              </div>

              {game.author && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-brand-purple" />
                    <span>{t.game.author}</span>
                  </span>
                  <span className="font-semibold text-slate-200 truncate max-w-[130px]">
                    {game.author}
                  </span>
                </div>
              )}

              {game.license && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-brand-emerald" />
                    <span>{t.game.license}</span>
                  </span>
                  <span className="font-semibold text-slate-300">
                    {game.license}
                  </span>
                </div>
              )}

              {game.releaseDate && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.game.releaseDate}</span>
                  </span>
                  <span className="font-semibold text-slate-300">
                    {game.releaseDate}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Banner Ad */}
          <AdSlot placement="game-sidebar" />
        </aside>
      </div>

      {/* SECTION: Related Games */}
      {relatedGames.length > 0 && (
        <section className="mt-14 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-brand-cyan" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {t.game.relatedGames}
            </h2>
          </div>
          <GameGrid games={relatedGames} />
        </section>
      )}

      {/* SECTION: Recommended Games */}
      {recommendedGames.length > 0 && (
        <section className="my-10">
          <div className="flex items-center gap-2 mb-5">
            <Star className="w-5 h-5 text-brand-amber fill-brand-amber" />
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {t.game.recommendedForYou}
            </h2>
          </div>
          <GameGrid games={recommendedGames} />
        </section>
      )}
    </div>
  );
};
