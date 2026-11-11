// Lightweight, privacy-conscious event dispatcher for Google Analytics 4 & Internal Metrics

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export const analytics = {
  trackEvent(eventName: string, params: Record<string, any> = {}) {
    // Dispatch to window.gtag if GA4 script is loaded
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }

    // In development mode, log clean structured analytics events
    if (import.meta.env.DEV) {
      console.log(`[Analytics Event] %c${eventName}`, 'color: #06b6d4; font-weight: bold;', params);
    }
  },

  trackGameCardClick(gameId: string, gameTitle: string, category: string) {
    this.trackEvent('game_card_click', {
      game_id: gameId,
      game_title: gameTitle,
      category,
    });
  },

  trackGameStarted(gameId: string, gameTitle: string, sourceType: string) {
    this.trackEvent('game_started', {
      game_id: gameId,
      game_title: gameTitle,
      source_type: sourceType,
      timestamp: Date.now(),
    });
  },

  trackFullscreenClicked(gameId: string, isFullscreen: boolean) {
    this.trackEvent('fullscreen_clicked', {
      game_id: gameId,
      fullscreen_state: isFullscreen,
    });
  },

  trackCategoryView(categorySlug: string) {
    this.trackEvent('category_view', {
      category: categorySlug,
    });
  },

  trackSearchUsed(query: string, resultsCount: number) {
    this.trackEvent('search_used', {
      search_term: query,
      results_count: resultsCount,
    });
  },

  trackLanguageSwitched(lang: string) {
    this.trackEvent('language_switched', {
      selected_language: lang,
    });
  },

  trackFavoriteToggled(gameId: string, isFavorited: boolean) {
    this.trackEvent('favorite_toggled', {
      game_id: gameId,
      favorited: isFavorited,
    });
  },
};
