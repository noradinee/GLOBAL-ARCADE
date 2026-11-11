import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PlayerProfile, DailyChallenge } from '../types/profile';
import { BADGE_DEFINITIONS, AVATAR_OPTIONS } from '../data/badges';
import gamesData from '../data/games.json';

interface ToastNotification {
  id: string;
  title: string;
  subtitle: string;
  icon?: string;
  type: 'badge' | 'level' | 'xp' | 'streak';
}

interface ProfileContextType {
  profile: PlayerProfile;
  setGamerTag: (tag: string) => void;
  setAvatarId: (avatarId: string) => void;
  recordGameSession: (gameId: string, score?: number) => void;
  setReaction: (gameId: string, reaction: 'like' | 'dislike') => void;
  toggleReactionTag: (gameId: string, tag: string) => void;
  saveHighScore: (gameId: string, score: number) => void;
  toasts: ToastNotification[];
  dismissToast: (id: string) => void;
  nextLevelXp: number;
  currentLevelXpFloor: number;
  xpProgressPercent: number;
}

const STORAGE_KEY = 'global_arcade_profile_v2';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function calculateLevel(xp: number): number {
  if (xp >= 900) return 5;
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

function getLevelThresholds(level: number): { floor: number; next: number } {
  switch (level) {
    case 1: return { floor: 0, next: 100 };
    case 2: return { floor: 100, next: 250 };
    case 3: return { floor: 250, next: 500 };
    case 4: return { floor: 500, next: 900 };
    case 5: return { floor: 900, next: 1500 };
    default: return { floor: level * 300, next: (level + 1) * 300 };
  }
}

function generateDailyChallenges(date: string): DailyChallenge[] {
  return [
    {
      id: `daily-play-2-${date}`,
      title: 'Double Play',
      titleAr: 'جولة ثنائية',
      description: 'Play at least 2 different games today',
      descriptionAr: 'العب لعبتين مختلفتين اليوم في المنصة',
      target: 2,
      current: 0,
      xpReward: 60,
      completed: false,
      type: 'play_games',
    },
    {
      id: `daily-genre-${date}`,
      title: 'Arcade Rush',
      titleAr: 'حماس الأركيد',
      description: 'Play any game in the Arcade or Action category',
      descriptionAr: 'العب أي لعبة في قسم الأركيد أو الأكشن',
      target: 1,
      current: 0,
      xpReward: 50,
      completed: false,
      type: 'try_genre',
      meta: { category: 'arcade' },
    },
    {
      id: `daily-score-${date}`,
      title: 'Score Hunter',
      titleAr: 'صائد النقاط',
      description: 'Achieve a score of 100 or higher in any game',
      descriptionAr: 'حقق 100 نقطة أو أكثر في أي لعبة تلعبها',
      target: 100,
      current: 0,
      xpReward: 80,
      completed: false,
      type: 'reach_score',
      meta: { minScore: 100 },
    },
  ];
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const today = getTodayString();
    const defaultTag = 'Player_' + Math.floor(1000 + Math.random() * 9000);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PlayerProfile;
        // Check daily challenges freshness
        const firstChallenge = parsed.dailyChallenges?.[0];
        const challengesNeedRefresh = !firstChallenge || !firstChallenge.id.endsWith(today);
        if (challengesNeedRefresh) {
          parsed.dailyChallenges = generateDailyChallenges(today);
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse saved player profile:', e);
    }

    return {
      gamerTag: defaultTag,
      avatarId: 'cyber-fox',
      xp: 0,
      level: 1,
      streak: {
        currentDays: 1,
        lastPlayedDate: today,
        longestStreak: 1,
      },
      badges: [],
      history: [],
      highScores: {},
      dailyChallenges: generateDailyChallenges(today),
      reactions: {},
      selectedReactionTags: {},
    };
  });

  // Sync profile to localStorage on state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save player profile:', e);
    }
  }, [profile]);

  const setGamerTag = (gamerTag: string) => {
    const clean = gamerTag.trim().substring(0, 16);
    if (clean) {
      setProfile((prev) => ({ ...prev, gamerTag: clean }));
    }
  };

  const setAvatarId = (avatarId: string) => {
    if (AVATAR_OPTIONS.some((a) => a.id === avatarId)) {
      setProfile((prev) => ({ ...prev, avatarId }));
    }
  };

  const saveHighScore = useCallback((gameId: string, score: number) => {
    setProfile((prev) => {
      const existing = prev.highScores[gameId] || 0;
      if (score > existing) {
        return {
          ...prev,
          highScores: {
            ...prev.highScores,
            [gameId]: score,
          },
        };
      }
      return prev;
    });
  }, []);

  const setReaction = (gameId: string, reaction: 'like' | 'dislike') => {
    setProfile((prev) => ({
      ...prev,
      reactions: {
        ...prev.reactions,
        [gameId]: prev.reactions[gameId] === reaction ? undefined : reaction,
      } as Record<string, 'like' | 'dislike'>,
    }));
  };

  const toggleReactionTag = (gameId: string, tag: string) => {
    setProfile((prev) => {
      const current = prev.selectedReactionTags[gameId] || [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      return {
        ...prev,
        selectedReactionTags: {
          ...prev.selectedReactionTags,
          [gameId]: updated,
        },
      };
    });
  };

  const unlockBadgeIfEligible = useCallback((badgeId: string, currentBadges: { id: string; unlockedAt: string }[]): boolean => {
    return !currentBadges.some((b) => b.id === badgeId);
  }, []);

  const recordGameSession = useCallback((gameId: string, score?: number) => {
    setProfile((prev) => {
      const today = getTodayString();
      let updatedXp = prev.xp + 25; // Base XP for launching game
      let updatedBadges = [...prev.badges];
      let newStreakDays = prev.streak.currentDays;
      let newLongest = prev.streak.longestStreak;

      // 1. Streak update
      if (prev.streak.lastPlayedDate !== today) {
        const lastDate = new Date(prev.streak.lastPlayedDate);
        const currDate = new Date(today);
        const diffDays = Math.round((currDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays === 1) {
          newStreakDays += 1;
          if (newStreakDays > newLongest) newLongest = newStreakDays;
          updatedXp += 50; // Streak bonus XP!
          addToast({
            title: `🔥 ${newStreakDays}-Day Streak!`,
            subtitle: `Keep playing daily to earn XP multiplier (+50 XP)`,
            type: 'streak',
          });
        } else if (diffDays > 1) {
          newStreakDays = 1;
        }
      }

      // 2. Play History Update
      const existingHistoryIdx = prev.history.findIndex((h) => h.gameId === gameId);
      let updatedHistory = [...prev.history];
      if (existingHistoryIdx >= 0) {
        const item = updatedHistory[existingHistoryIdx];
        updatedHistory[existingHistoryIdx] = {
          ...item,
          playedAt: new Date().toISOString(),
          playCount: item.playCount + 1,
          lastScore: score !== undefined ? score : item.lastScore,
        };
      } else {
        updatedHistory.unshift({
          gameId,
          playedAt: new Date().toISOString(),
          playCount: 1,
          lastScore: score,
        });
      }
      // Keep up to 20 recent games
      updatedHistory = updatedHistory.slice(0, 20);

      // 3. High Scores
      const updatedHighScores = { ...prev.highScores };
      if (score !== undefined) {
        const currentBest = updatedHighScores[gameId] || 0;
        if (score > currentBest) {
          updatedHighScores[gameId] = score;
        }
      }

      // 4. Daily Challenges Progress
      const targetGame = (gamesData as any[]).find((g) => g.id === gameId);
      const updatedChallenges = prev.dailyChallenges.map((challenge) => {
        if (challenge.completed) return challenge;

        let inc = 0;
        if (challenge.type === 'play_games') inc = 1;
        if (challenge.type === 'try_genre' && targetGame && targetGame.category === challenge.meta?.category) inc = 1;
        if (challenge.type === 'reach_score' && score && score >= (challenge.meta?.minScore || 100)) inc = score;

        const newCurrent = challenge.current + inc;
        const isDone = newCurrent >= challenge.target;

        if (isDone) {
          updatedXp += challenge.xpReward;
          addToast({
            title: `🎯 Challenge Complete: ${challenge.title}!`,
            subtitle: `+${challenge.xpReward} XP earned`,
            type: 'xp',
          });
        }

        return {
          ...challenge,
          current: Math.min(newCurrent, challenge.target),
          completed: isDone,
        };
      });

      // 5. Check Badge Unlocks
      // First Blood
      if (unlockBadgeIfEligible('first-blood', updatedBadges)) {
        updatedBadges.push({ id: 'first-blood', unlockedAt: new Date().toISOString() });
        const b = BADGE_DEFINITIONS.find((b) => b.id === 'first-blood')!;
        updatedXp += b.xpValue;
        addToast({ title: `🏆 Badge Unlocked: ${b.name}!`, subtitle: b.description, type: 'badge' });
      }

      // Explorer (3 different categories)
      const playedCategories = new Set(
        updatedHistory.map((h) => {
          const g = (gamesData as any[]).find((item) => item.id === h.gameId);
          return g ? g.category : null;
        }).filter(Boolean)
      );
      if (playedCategories.size >= 3 && unlockBadgeIfEligible('explorer', updatedBadges)) {
        updatedBadges.push({ id: 'explorer', unlockedAt: new Date().toISOString() });
        const b = BADGE_DEFINITIONS.find((b) => b.id === 'explorer')!;
        updatedXp += b.xpValue;
        addToast({ title: `🏆 Badge Unlocked: ${b.name}!`, subtitle: b.description, type: 'badge' });
      }

      // Night owl (10 PM to 5 AM)
      const currentHour = new Date().getHours();
      if ((currentHour >= 22 || currentHour < 5) && unlockBadgeIfEligible('night-owl', updatedBadges)) {
        updatedBadges.push({ id: 'night-owl', unlockedAt: new Date().toISOString() });
        const b = BADGE_DEFINITIONS.find((b) => b.id === 'night-owl')!;
        updatedXp += b.xpValue;
        addToast({ title: `🏆 Badge Unlocked: ${b.name}!`, subtitle: b.description, type: 'badge' });
      }

      // Streak master (3 days)
      if (newStreakDays >= 3 && unlockBadgeIfEligible('streak-master', updatedBadges)) {
        updatedBadges.push({ id: 'streak-master', unlockedAt: new Date().toISOString() });
        const b = BADGE_DEFINITIONS.find((b) => b.id === 'streak-master')!;
        updatedXp += b.xpValue;
        addToast({ title: `🏆 Badge Unlocked: ${b.name}!`, subtitle: b.description, type: 'badge' });
      }

      // Two Player champ
      if (targetGame && targetGame.category === 'two-player' && unlockBadgeIfEligible('two-player-champ', updatedBadges)) {
        updatedBadges.push({ id: 'two-player-champ', unlockedAt: new Date().toISOString() });
        const b = BADGE_DEFINITIONS.find((b) => b.id === 'two-player-champ')!;
        updatedXp += b.xpValue;
        addToast({ title: `🏆 Badge Unlocked: ${b.name}!`, subtitle: b.description, type: 'badge' });
      }

      // Check level up
      const oldLevel = prev.level;
      const newLevel = calculateLevel(updatedXp);
      if (newLevel > oldLevel) {
        addToast({
          title: `⚡ Level Up: Level ${newLevel}!`,
          subtitle: `Congratulations, your arcade power increased!`,
          type: 'level',
        });
        if (newLevel >= 5 && unlockBadgeIfEligible('arcade-legend', updatedBadges)) {
          updatedBadges.push({ id: 'arcade-legend', unlockedAt: new Date().toISOString() });
          const b = BADGE_DEFINITIONS.find((b) => b.id === 'arcade-legend')!;
          updatedXp += b.xpValue;
          addToast({ title: `👑 Legendary Badge: ${b.name}!`, subtitle: b.description, type: 'badge' });
        }
      }

      return {
        ...prev,
        xp: updatedXp,
        level: newLevel,
        streak: {
          currentDays: newStreakDays,
          lastPlayedDate: today,
          longestStreak: newLongest,
        },
        badges: updatedBadges,
        history: updatedHistory,
        highScores: updatedHighScores,
        dailyChallenges: updatedChallenges,
      };
    });
  }, [unlockBadgeIfEligible]);

  const levelInfo = getLevelThresholds(profile.level);
  const xpInCurrentLevel = Math.max(0, profile.xp - levelInfo.floor);
  const xpNeededInCurrentLevel = levelInfo.next - levelInfo.floor;
  const xpProgressPercent = Math.min(100, Math.floor((xpInCurrentLevel / xpNeededInCurrentLevel) * 100));

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setGamerTag,
        setAvatarId,
        recordGameSession,
        setReaction,
        toggleReactionTag,
        saveHighScore,
        toasts,
        dismissToast,
        nextLevelXp: levelInfo.next,
        currentLevelXpFloor: levelInfo.floor,
        xpProgressPercent,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
