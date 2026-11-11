import React from 'react';
import { Game } from '../../types/game';
import { GameCard } from './GameCard';
import { AdSlot } from '../ads/AdSlot';

interface GameGridProps {
  games: Game[];
  showInFeedAds?: boolean;
}

export const GameGrid: React.FC<GameGridProps> = ({ games, showInFeedAds = false }) => {
  if (games.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-5">
      {games.map((game, index) => {
        // Insert an in-feed ad card every 8 games if enabled
        const shouldInsertAd = showInFeedAds && index > 0 && index % 8 === 0;

        return (
          <React.Fragment key={game.id}>
            {shouldInsertAd && (
              <div className="col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5 my-2">
                <AdSlot placement="in-feed" />
              </div>
            )}
            <GameCard game={game} />
          </React.Fragment>
        );
      })}
    </div>
  );
};
