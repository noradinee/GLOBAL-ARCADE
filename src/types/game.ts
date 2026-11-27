export type GameCategorySlug =
  | 'puzzle'
  | 'arcade'
  | 'racing'
  | 'sports'
  | 'adventure'
  | 'action'
  | 'two-player'
  | 'multiplayer'
  | 'casual'
  | 'kids'
  | 'strategy';

export interface GameControls {
  desktop: string[];
  mobile: string[];
}

export type MultiplayerMode =
  | 'SINGLE_PLAYER'
  | 'LOCAL_MULTIPLAYER'
  | 'ONLINE_MULTIPLAYER'
  | 'TURN_BASED_MULTIPLAYER'
  | 'REAL_TIME_MULTIPLAYER'
  | 'MULTIPLAYER_UNKNOWN';

export type MultiplayerNetworkingType =
  | 'WEBSOCKET'
  | 'WEBRTC'
  | 'POLLING'
  | 'NONE'
  | 'UNKNOWN';

export type MultiplayerBackendRequirement = 'NONE' | 'OPTIONAL' | 'REQUIRED' | 'UNKNOWN';

export interface MultiplayerInfo {
  mode: MultiplayerMode;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
  evidence: string[];
  maxPlayers?: number;
  supportsPublicMatchmaking?: boolean;
  supportsPrivateRooms?: boolean;
  supportsInviteLinks?: boolean;
  supportsRoomCodes?: boolean;
  networkingType?: MultiplayerNetworkingType;
  backendRequirement?: MultiplayerBackendRequirement;
  staticHostingCompatible?: boolean;
  usesOwnBackend?: boolean;
  externalServices?: string[];
}

export interface Game {
  multiplayer?: MultiplayerInfo;
  id: string;
  slug: string;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  category: GameCategorySlug;
  tags: string[];
  thumbnail: string;
  gameSource: string;
  sourceType: 'local' | 'iframe';
  featured: boolean;
  trending: boolean;
  popularityScore: number; // e.g. 98, 92
  instructions: string;
  instructionsAr: string;
  controls: GameControls;
  language: 'en' | 'ar' | 'both';
  status: 'published' | 'draft' | 'unlisted';
  author?: string;
  isOriginal?: boolean; // Owner-created exclusive original game
  priority?: number; // Sorting priority (e.g. 100 = absolute top shelf)
  license?: string;
  // Licensing/embedding distinction (optional; unknown by default)
  commercialRedistributionAllowed?: boolean;
  embeddingAllowed?: boolean;
  hostingPermission?: boolean;
  monetizationAllowed?: boolean;
  // Discovery policy status (optional)
  technicalAcceptance?: 'TECHNICALLY_ACCEPTED' | 'REJECTED';
  licensePending?: boolean;
  releaseDate?: string;
  rating?: number; // e.g. 4.9
  ratingCount?: number;
  orientation?: 'landscape' | 'portrait' | 'any';
  // SEO & Benchmark Lookalike Fields
  benchmarkGame?: string; // Famous benchmark game name (e.g. "Fruit Ninja", "Subway Surfers")
  benchmarkGameAr?: string; // Famous benchmark game name in Arabic (e.g. "فروت نينجا", "صب واي سيرفرز")
  seoTitle?: string; // Custom CTR-optimized English SEO <title>
  seoDescription?: string; // Custom CTR-optimized English meta description
  seoTitleAr?: string; // Custom CTR-optimized Arabic SEO <title>
  seoDescriptionAr?: string; // Custom CTR-optimized Arabic meta description
  similarTo?: string[]; // Array of famous benchmark game titles
  searchKeywords?: string[]; // Targeted high-volume SEO search queries
}

export interface GameCategory {
  id: GameCategorySlug;
  slug: GameCategorySlug;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  color: string;
  thumbnail?: string;
}
