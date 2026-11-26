export type ProjectCategory = 'game' | 'app';

export type GameSubGenre =
  | 'space_shooter'
  | 'platformer'
  | 'coin_runner'
  | 'puzzle_grid';

export type AppSubGenre =
  | 'storefront'
  | 'task_manager'
  | 'finance_ledger';

export type SubGenre = GameSubGenre | AppSubGenre;

export type InputSourceMode = 'text' | 'camera' | 'gallery';

export type CharacterArchetype =
  | 'cat_tom'
  | 'knight_hero'
  | 'space_ranger'
  | 'ninja_runner'
  | 'cyber_bot'
  | 'adventurer_hero';

export interface CharacterBlueprint {
  id?: string;
  role?: 'hero' | 'companion' | 'rival';
  archetype: CharacterArchetype;
  displayNameAr: string;
  englishCharacterId: string;
  skinOrFurColor: string;
  secondaryFurOrAccent: string;
  outfitColor: string;
  outfitSecondaryColor: string;
  eyeColor: string;
  hairOrHelmetColor: string;
  shoeColor: string;
  hasTail: boolean;
  hasEars: 'cat' | 'human' | 'helmet' | 'visor';
  hasCapeOrPack: 'none' | 'cape' | 'jetpack';
  scaleY: number;
  headScale: number;
}

export interface ImagePixelAnalysis {
  dominantColor: string;
  accentColor: string;
  backgroundColor: string;
  brightness: number;
  width: number;
  height: number;
}

export interface FeemiDesignSpec {
  appName: string;
  englishSlug: string;
  packageName: string;
  category: ProjectCategory;
  subGenre: SubGenre;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  playerSpeed: number;
  gravity: number;
  difficulty: 'easy' | 'medium' | 'hard';
  soundEnabled: boolean;
  securityShieldLevel: 'standard' | 'strict';
  versionName: string;
  versionCode: number;
  sourcePrompt: string;
  inputSource: InputSourceMode;
  customPatches: string[];
  characterBlueprint?: CharacterBlueprint;
  characterRoster?: CharacterBlueprint[];
  activeCharacterId?: string;
}

export interface OwnershipInfo {
  mode: 'default' | 'custom';
  ownerName: string;
  ownerEmail: string;
}

export interface DigitalSignatureInfo {
  algorithm: string;
  sha256Fingerprint: string;
  keystoreAlias: string;
  issuedAt: string;
  verified: boolean;
}

export interface SecurityReport {
  vulnerabilitiesBlocked: number;
  checks: string[];
}

export interface BuiltProjectRecord {
  id: string;
  shareSlug: string;
  appName: string;
  englishSlug: string;
  packageName: string;
  category: ProjectCategory;
  subGenre: SubGenre;
  code: string;
  svgIcon: string;
  spec: FeemiDesignSpec;
  ownership: OwnershipInfo;
  signature: DigitalSignatureInfo;
  securityReport: SecurityReport;
  apkFileName: string;
  apkSizeBytes: number;
  localSavedAt: string;
  cloudUpdatedAt: string;
  aiAudited: boolean;
}

export const DEFAULT_DEVELOPER_OWNERSHIP: OwnershipInfo = {
  mode: 'default',
  ownerName: 'عمر تامر عبد السلام العاشر',
  ownerEmail: 'omar.t.elashry@gmail.com',
};
