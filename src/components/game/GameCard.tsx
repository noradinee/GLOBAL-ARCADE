import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Game } from '../../types/game';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { analytics } from '../../services/analytics';
import { localizePath } from '../../i18n/localeRouting';
import { Star, Play, Bookmark, Flame, Crown } from 'lucide-react';

interface GameCardProps {
  game: Game;
  priority?: boolean;
}

const GameCardComponent: React.FC<GameCardProps> = ({ game, priority = false }) => {
  const { lang, isRtl } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const formatThumb = (url?: string) => {
    if (!url) return '/thumbnails/cyber-dash.svg?v=20261117cover';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url.includes('?v=') ? url : `${url}?v=20261117cover`;
  };
  const [imgSrc, setImgSrc] = useState(() => formatThumb(game.thumbnail));

  useEffect(() => {
    setImgSrc(formatThumb(game.thumbnail));
  }, [game.thumbnail]);

  const title = lang === 'ar' ? game.titleAr : game.title;
  const gameUrl = localizePath(`/game/${game.slug}`, lang);
  const favorited = isFavorite(game.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(game.id);
    analytics.trackFavoriteToggled(game.id, !favorited);
  };

  const handleCardClick = () => {
    analytics.trackGameCardClick(game.id, game.title, game.category);
  };

  return (
    <div className="group relative bg-dark-900/90 hover:bg-dark-850 border border-dark-800/90 hover:border-brand-cyan/60 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-glow-cyan hover:-translate-y-1 flex flex-col">
      <Link
        to={gameUrl}
        onClick={handleCardClick}
        className="block relative aspect-[16/10] overflow-hidden bg-dark-950"
      >
        {/* Lazy Loaded Thumbnail with Fallback */}
        <img
          src={imgSrc}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setImgSrc('/thumbnails/cyber-dash.svg?v=20261117cover')}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-dark-950/40 backdrop-blur-[2px]">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-violet to-brand-cyan flex items-center justify-center text-white shadow-glow-cyan transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className={`w-5 h-5 fill-white ${isRtl ? 'rotate-180 translate-x-0.5' : 'translate-x-0.5'}`} />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {game.isOriginal || game.author?.toLowerCase().includes('kyraxo') ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 text-dark-950 shadow-md border border-amber-300">
              <Crown className="w-3 h-3 fill-dark-950" />
              <span>{lang === 'ar' ? 'حصري للمنصة' : 'ORIGINAL'}</span>
            </span>
          ) : game.trending ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-brand-rose text-white shadow-md">
              <Flame className="w-3 h-3" />
              <span>HOT</span>
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dark-900/80 backdrop-blur-md text-brand-cyan border border-brand-cyan/30 uppercase">
              {game.category}
            </span>
          )}

          {/* Bookmark Button */}
          <button
            onClick={handleFavoriteClick}
            className={`pointer-events-auto p-1.5 rounded-full backdrop-blur-md transition-all ${
              favorited
                ? 'bg-brand-rose text-white shadow-md'
                : 'bg-dark-900/70 text-slate-300 hover:text-white hover:bg-dark-800'
            }`}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Bookmark className={`w-3.5 h-3.5 ${favorited ? 'fill-white' : ''}`} />
          </button>
        </div>
      </Link>

      {/* Card Body */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <Link
          to={gameUrl}
          onClick={handleCardClick}
          className="focus:outline-none"
        >
          <h3 className="font-bold text-sm text-slate-100 group-hover:text-brand-cyan transition-colors truncate">
            {title}
          </h3>
        </Link>

        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-dark-800/80">
          <div className="flex items-center gap-1 text-brand-amber font-semibold">
            <Star className="w-3.5 h-3.5 fill-brand-amber text-brand-amber" />
            <span>{game.rating?.toFixed(1) || '4.8'}</span>
          </div>

          <span className="text-[11px] text-slate-500 font-medium">
            {game.ratingCount ? `${game.ratingCount.toLocaleString()} plays` : 'Free Play'}
          </span>
        </div>
      </div>
    </div>
  );
};

export const GameCard = React.memo(GameCardComponent);
