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
  | 'kids';

export interface GameControls {
  desktop: string[];
  mobile: string[];
}

export interface Game {
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
  license?: string;
  releaseDate?: string;
  rating?: number; // e.g. 4.9
  ratingCount?: number;
  orientation?: 'landscape' | 'portrait' | 'any';
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
}
