export interface BadgeDefinition {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpValue: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  target: number;
  current: number;
  xpReward: number;
  completed: boolean;
  type: 'play_games' | 'explore_category' | 'reach_score' | 'try_genre';
  meta?: {
    category?: string;
    gameId?: string;
    minScore?: number;
  };
}

export interface PlayedGameRecord {
  gameId: string;
  playedAt: string;
  playCount: number;
  lastScore?: number;
}

export interface PlayerProfile {
  gamerTag: string;
  avatarId: string;
  xp: number;
  level: number;
  streak: {
    currentDays: number;
    lastPlayedDate: string; // YYYY-MM-DD
    longestStreak: number;
  };
  badges: {
    id: string;
    unlockedAt: string;
  }[];
  history: PlayedGameRecord[];
  highScores: Record<string, number>;
  dailyChallenges: DailyChallenge[];
  reactions: Record<string, 'like' | 'dislike'>;
  selectedReactionTags: Record<string, string[]>; // gameId -> ['addictive', 'fast', 'relaxing']
}

export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
}
