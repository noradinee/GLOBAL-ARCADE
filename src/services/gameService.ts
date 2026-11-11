import { Game, GameCategory, GameCategorySlug } from '../types/game';
import { PlayedGameRecord } from '../types/profile';
import gamesData from '../data/games.json';
import categoriesData from '../data/categories.json';

const allGames = gamesData as Game[];
const allCategories = categoriesData as GameCategory[];

export interface GameFilterOptions {
  category?: string;
  device?: 'all' | 'mobile' | 'desktop';
  players?: 'all' | 'single' | 'two-player';
  sort?: 'trending' | 'rating' | 'popular' | 'recent';
  query?: string;
}

export const gameService = {
  getAllGames(): Game[] {
    return allGames.filter(g => g.status === 'published');
  },

  getGameBySlug(slug: string): Game | undefined {
    return allGames.find(g => g.slug === slug && g.status === 'published');
  },

  getGamesByCategory(categorySlug: GameCategorySlug | string): Game[] {
    return allGames.filter(
      g => g.category.toLowerCase() === categorySlug.toLowerCase() && g.status === 'published'
    );
  },

  getFeaturedGames(): Game[] {
    return allGames.filter(g => g.featured && g.status === 'published');
  },

  getTrendingGames(): Game[] {
    return allGames
      .filter(g => g.trending && g.status === 'published')
      .sort((a, b) => b.popularityScore - a.popularityScore);
  },

  getPopularGames(limit = 10): Game[] {
    return [...allGames]
      .filter(g => g.status === 'published')
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, limit);
  },

  getRecentlyAdded(limit = 8): Game[] {
    return [...allGames]
      .filter(g => g.status === 'published')
      .sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  },

  getRelatedGames(currentGame: Game, limit = 6): Game[] {
    return allGames
      .filter(g => g.id !== currentGame.id && g.status === 'published')
      .filter(
        g =>
          g.category === currentGame.category ||
          g.tags.some(tag => currentGame.tags.includes(tag))
      )
      .slice(0, limit);
  },

  getPersonalizedRecommendations(history: PlayedGameRecord[], limit = 6): Game[] {
    const published = this.getAllGames();
    if (!history || history.length === 0) {
      return this.getTrendingGames().slice(0, limit);
    }

    // Build genre and tag affinity map
    const genreAffinity: Record<string, number> = {};
    const tagAffinity: Record<string, number> = {};
    const playedIds = new Set(history.map(h => h.gameId));

    history.forEach(item => {
      const g = published.find(game => game.id === item.gameId);
      if (g) {
        genreAffinity[g.category] = (genreAffinity[g.category] || 0) + item.playCount;
        g.tags.forEach(tag => {
          tagAffinity[tag] = (tagAffinity[tag] || 0) + 1;
        });
      }
    });

    // Score unplayed or less-played games
    const scored = published.map(game => {
      let score = game.popularityScore * 0.2 + (game.rating || 4.5) * 10;

      // Genre match boost
      if (genreAffinity[game.category]) {
        score += Math.min(40, genreAffinity[game.category] * 10);
      }

      // Tag overlap boost
      game.tags.forEach(tag => {
        if (tagAffinity[tag]) {
          score += 15;
        }
      });

      // Prefer new unplayed titles
      if (playedIds.has(game.id)) {
        score -= 25;
      }

      return { game, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.game);
  },

  filterGames(options: GameFilterOptions): Game[] {
    let result = this.getAllGames();

    // Category filter
    if (options.category) {
      result = result.filter(
        g => g.category.toLowerCase() === options.category!.toLowerCase()
      );
    }

    // Device filter
    if (options.device && options.device !== 'all') {
      if (options.device === 'mobile') {
        result = result.filter(g => g.controls.mobile.length > 0);
      } else if (options.device === 'desktop') {
        result = result.filter(g => g.controls.desktop.length > 0);
      }
    }

    // Players filter
    if (options.players && options.players !== 'all') {
      if (options.players === 'two-player') {
        result = result.filter(g => g.category === 'two-player' || g.tags.includes('2-player') || g.tags.includes('multiplayer'));
      } else if (options.players === 'single') {
        result = result.filter(g => g.category !== 'two-player');
      }
    }

    // Text search
    if (options.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      result = result.filter(g => {
        return (
          g.title.toLowerCase().includes(q) ||
          g.titleAr.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.descriptionAr.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.tags.some(t => t.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    const sort = options.sort || 'trending';
    if (sort === 'trending') {
      result.sort((a, b) => b.popularityScore - a.popularityScore);
    } else if (sort === 'rating') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'popular') {
      result.sort((a, b) => (b.ratingCount || 0) - (a.ratingCount || 0));
    } else if (sort === 'recent') {
      result.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
    }

    return result;
  },

  searchGames(query: string, categoryFilter?: string): Game[] {
    return this.filterGames({ query, category: categoryFilter });
  },

  getAllCategories(): GameCategory[] {
    return allCategories;
  },

  getCategoryBySlug(slug: string): GameCategory | undefined {
    return allCategories.find(c => c.slug.toLowerCase() === slug.toLowerCase());
  },
};
