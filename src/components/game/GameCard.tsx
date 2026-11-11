import React from 'react';
import { Link } from 'react-router-dom';
import { Game } from '../../types/game';
import { useLanguage } from '../../context/LanguageContext';
import { useFavorites } from '../../context/FavoritesContext';
import { analytics } from '../../services/analytics';
import { Star, Play, Bookmark, Flame } from 'lucide-react';

interface GameCardProps {
  game: Game;
  priority?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, priority = false }) => {
  const { lang, isRtl } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();

  const title = lang === 'ar' ? game.titleAr : game.title;
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
    <div className="group relative bg-dark-900/90 hover:bg-dark-850 border border-dark-800/90 hover:border-brand-purple/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-glow-purple flex flex-col">
      <Link
        to={`/game/${game.slug}`}
        onClick={handleCardClick}
        className="block relative aspect-[16/10] overflow-hidden bg-dark-950"
      >
        {/* Lazy Loaded Thumbnail */}
        <img
          src={game.thumbnail}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
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
          {game.trending ? (
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
          to={`/game/${game.slug}`}
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
