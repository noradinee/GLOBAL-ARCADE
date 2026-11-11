import React from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { gameService } from '../../services/gameService';
import { History, Play } from 'lucide-react';

export const RecentlyPlayedShelf: React.FC = () => {
  const { profile } = useProfile();
  const { lang, isRtl } = useLanguage();

  if (!profile.history || profile.history.length === 0) {
    return null;
  }

  const allGames = gameService.getAllGames();
  const recentGames = profile.history
    .map((item) => {
      const game = allGames.find((g) => g.id === item.gameId);
      return game ? { game, record: item } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, 5);

  if (recentGames.length === 0) return null;

  return (
    <section className="my-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-cyan/15 text-brand-cyan">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              {lang === 'ar' ? 'ألعاب لعبتها مؤخراً' : 'Jump Back In (Recently Played)'}
            </h2>
            <p className="text-xs text-slate-400">
              {lang === 'ar' ? 'تابع تقدمك وحقق أرقاماً قياسية جديدة' : 'Resume where you left off and beat your high scores'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {recentGames.map(({ game, record }) => {
          const title = lang === 'ar' ? game.titleAr : game.title;
          const personalBest = profile.highScores[game.id];

          return (
            <Link
              key={game.id}
              to={`/game/${game.slug}`}
              className="group relative bg-dark-900 border border-dark-800 hover:border-brand-cyan/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-glow-cyan flex flex-col"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-dark-950">
                <img
                  src={game.thumbnail}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-dark-950/40 group-hover:bg-dark-950/20 transition-colors flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-brand-cyan text-dark-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className={`w-4 h-4 fill-dark-950 ${isRtl ? 'rotate-180 translate-x-0.5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </div>

              <div className="p-3 flex flex-col justify-between flex-1 gap-1.5">
                <h3 className="font-bold text-xs text-white truncate group-hover:text-brand-cyan transition-colors">
                  {title}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Played {record.playCount}x</span>
                  {personalBest !== undefined && (
                    <span className="text-brand-amber font-bold">Best: {personalBest}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
