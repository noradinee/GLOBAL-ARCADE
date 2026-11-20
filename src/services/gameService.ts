import { Game, GameCategory, GameCategorySlug } from '../types/game';
import { PlayedGameRecord } from '../types/profile';
import gamesData from '../data/games.json';
import categoriesData from '../data/categories.json';

let allGames = gamesData as Game[];
const allCategories = categoriesData as GameCategory[];

/**
 * A game is publicly visible when its status is the canonical `published` value
 * (what the catalog uses) or the legacy `active` value still written by the
 * admin console. Anything else (draft / unlisted / disabled) stays hidden.
 */
export function isGameVisible(status?: string): boolean {
  return status === 'published' || status === 'active';
}

export interface GameFilterOptions {
  category?: string;
  device?: 'all' | 'mobile' | 'desktop';
  players?: 'all' | 'single' | 'two-player';
  sort?: 'trending' | 'rating' | 'popular' | 'recent' | 'plays' | 'az' | 'za';
  letter?: string;
  query?: string;
}

export const gameService = {
  /**
   * Replaces the bundled catalog snapshot with the live server-side catalog.
   * Required because the production bundle freezes `games.json` at build time:
   * without this, a game published after the last build would never appear.
   * Never throws — a failed refresh keeps the last known catalog.
   */
  async refreshCatalog(): Promise<boolean> {
    try {
      const response = await fetch('/api/catalog/games', {
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) return false;
      const payload = await response.json();
      const games = Array.isArray(payload?.games) ? payload.games : null;
      if (!games || games.length === 0) return false;
      allGames = games as Game[];
      return true;
    } catch {
      return false;
    }
  },

  /** Returns the currently loaded catalog snapshot (bundled or live). */
  getCatalogSnapshot(): Game[] {
    return allGames;
  },

  getAllGames(): Game[] {
    return allGames.filter(g => isGameVisible(g.status));
  },

  getGameBySlug(slug: string): Game | undefined {
    return allGames.find(g => g.slug === slug && isGameVisible(g.status));
  },

  getGamesByCategory(categorySlug: GameCategorySlug | string): Game[] {
    return allGames.filter(
      g => g.category.toLowerCase() === categorySlug.toLowerCase() && isGameVisible(g.status)
    );
  },

  getOriginalGames(): Game[] {
    return allGames
      .filter(g => (g.isOriginal || g.author?.toLowerCase().includes('kyraxo') || g.author?.toLowerCase().includes('noureddine')) && isGameVisible(g.status))
      .sort((a, b) => ((b.priority || 0) - (a.priority || 0)) || (b.popularityScore - a.popularityScore));
  },

  getFeaturedGames(): Game[] {
    return allGames.filter(g => (g.featured || g.isOriginal) && isGameVisible(g.status));
  },

  getTrendingGames(): Game[] {
    return allGames
      .filter(g => (g.trending || g.isOriginal) && isGameVisible(g.status))
      .sort((a, b) => {
        const aBoost = (a.isOriginal ? 1000 : 0) + (a.priority || 0);
        const bBoost = (b.isOriginal ? 1000 : 0) + (b.priority || 0);
        return (bBoost + b.popularityScore) - (aBoost + a.popularityScore);
      });
  },

  getPopularGames(limit = 10): Game[] {
    return [...allGames]
      .filter(g => isGameVisible(g.status))
      .sort((a, b) => {
        const aBoost = (a.isOriginal ? 1000 : 0) + (a.priority || 0);
        const bBoost = (b.isOriginal ? 1000 : 0) + (b.priority || 0);
        return (bBoost + b.popularityScore) - (aBoost + a.popularityScore);
      })
      .slice(0, limit);
  },

  getRecentlyAdded(limit = 8): Game[] {
    return [...allGames]
      .filter(g => isGameVisible(g.status))
      .sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, limit);
  },

  getRelatedGames(currentGame: Game, limit = 6): Game[] {
    return allGames
      .filter(g => g.id !== currentGame.id && isGameVisible(g.status))
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

    // Letter filter (A-Z, #, or Arabic letters)
    if (options.letter && options.letter !== 'all') {
      const l = options.letter.trim().toUpperCase();
      if (l === '#') {
        // Non-letter prefixes (numbers, symbols like 2048, 123)
        result = result.filter(g => !/^[A-Za-z\u0621-\u064A]/.test(g.title));
      } else {
        result = result.filter(g => {
          const tEn = (g.title || '').trim().toUpperCase();
          const tAr = (g.titleAr || '').trim().toUpperCase();
          return tEn.startsWith(l) || tAr.startsWith(l);
        });
      }
    }

    // Text search
    if (options.query && options.query.trim()) {
      const q = options.query.trim().toLowerCase();
      result = result.filter(g => {
        const benchMatch = (g.benchmarkGame || '').toLowerCase().includes(q) || (g.benchmarkGameAr || '').toLowerCase().includes(q);
        const simMatch = (g.similarTo || []).some(s => s.toLowerCase().includes(q));
        const kwMatch = (g.searchKeywords || []).some(k => k.toLowerCase().includes(q));
        return (
          g.title.toLowerCase().includes(q) ||
          g.titleAr.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.descriptionAr.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          g.tags.some(t => t.toLowerCase().includes(q)) ||
          benchMatch ||
          simMatch ||
          kwMatch
        );
      });
    }

    // Sorting (with top-tier priority boost for KYRAXO Originals)
    const sort = options.sort || 'trending';
    const getBoost = (g: Game) => (g.isOriginal ? 10000 : 0) + ((g.priority || 0) * 100);

    if (sort === 'trending') {
      result.sort((a, b) => (getBoost(b) + b.popularityScore) - (getBoost(a) + a.popularityScore));
    } else if (sort === 'rating') {
      result.sort((a, b) => (getBoost(b) + (b.rating || 0) * 10) - (getBoost(a) + (a.rating || 0) * 10));
    } else if (sort === 'popular' || sort === 'plays') {
      result.sort((a, b) => {
        const scoreA = getBoost(a) + (a.ratingCount || 0) * 10 + (a.popularityScore || 0);
        const scoreB = getBoost(b) + (b.ratingCount || 0) * 10 + (b.popularityScore || 0);
        return scoreB - scoreA;
      });
    } else if (sort === 'recent') {
      result.sort((a, b) => {
        if (a.isOriginal !== b.isOriginal) return a.isOriginal ? -1 : 1;
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sort === 'az') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sort === 'za') {
      result.sort((a, b) => b.title.localeCompare(a.title));
    }

    return result;
  },

  searchGames(query: string, categoryFilter?: string): Game[] {
    return this.filterGames({ query, category: categoryFilter });
  },

  getSearchSuggestions(query: string, limit = 8): { game: Game; matchedTitle: string }[] {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const published = this.getAllGames();

    const matched = published.filter(g => {
      const en = (g.title || '').toLowerCase();
      const ar = (g.titleAr || '').toLowerCase();
      const tags = (g.tags || []).map(t => t.toLowerCase());
      const cat = (g.category || '').toLowerCase();
      const bench = (g.benchmarkGame || '').toLowerCase();
      const benchAr = (g.benchmarkGameAr || '').toLowerCase();
      const sim = (g.similarTo || []).map(s => s.toLowerCase());
      const kw = (g.searchKeywords || []).map(k => k.toLowerCase());
      return (
        en.includes(q) ||
        ar.includes(q) ||
        tags.some(t => t.includes(q)) ||
        cat.includes(q) ||
        bench.includes(q) ||
        benchAr.includes(q) ||
        sim.some(s => s.includes(q)) ||
        kw.some(k => k.includes(q))
      );
    });

    matched.sort((a, b) => {
      const aStartsEn = a.title.toLowerCase().startsWith(q) ? 4 : 0;
      const bStartsEn = b.title.toLowerCase().startsWith(q) ? 4 : 0;
      const aStartsAr = (a.titleAr || '').toLowerCase().startsWith(q) ? 4 : 0;
      const bStartsAr = (b.titleAr || '').toLowerCase().startsWith(q) ? 4 : 0;
      const aExactMatch = (a.title.toLowerCase() === q || (a.titleAr || '').toLowerCase() === q) ? 10 : 0;
      const bExactMatch = (b.title.toLowerCase() === q || (b.titleAr || '').toLowerCase() === q) ? 10 : 0;
      const aScore = aExactMatch + Math.max(aStartsEn, aStartsAr) * 100 + (a.ratingCount || 0) * 0.1 + a.popularityScore;
      const bScore = bExactMatch + Math.max(bStartsEn, bStartsAr) * 100 + (b.ratingCount || 0) * 0.1 + b.popularityScore;
      return bScore - aScore;
    });

    return matched.slice(0, limit).map(g => {
      const isArabicMatch = g.titleAr && g.titleAr.toLowerCase().includes(q) && !g.title.toLowerCase().includes(q);
      return {
        game: g,
        matchedTitle: isArabicMatch ? g.titleAr : g.title,
      };
    });
  },

  getAllCategories(): GameCategory[] {
    return allCategories;
  },

  getCategoryBySlug(slug: string): GameCategory | undefined {
    return allCategories.find(c => c.slug.toLowerCase() === slug.toLowerCase());
  },
};
