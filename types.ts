
export enum Rarity {
  N = 'N',
  R = 'R',
  SR = 'SR',
  SSR = 'SSR'
}

export interface Idol {
  id: string;
  name: string;
  rarity: Rarity;
  level: number;
  maxLevel: number;
  image: string; // URL
  vocal: number;
  dance: number;
  visual: number;
  isLocked: boolean;
}

export interface UserState {
  id: number;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  stamina: number;
  maxStamina: number;
  lastStaminaUpdate: number; // Timestamp
  money: number; // Coins
  starJewels: number; // Premium Currency
  tickets: {
    gacha: number;
    skip: number;
  };
  items: {
    staminaDrink: number;
    trainerTicket: number;
  };
}

export enum CommuType {
  STORY = 'STORY',
  EVENT = 'EVENT',
  EXTRA = 'EXTRA',
  IDOL = 'IDOL',
  FANMADE = 'FANMADE'
}

export interface DialogLine {
  speaker: string;
  text: string;
  expression?: 'neutral' | 'happy' | 'angry' | 'surprised' | string;
  customSpriteUrl?: string; // New field for custom uploaded sprites
}

export interface Chapter {
  id: string;
  title: string;
  type: CommuType;
  parentId?: string; // Idol ID or Event ID
  isRead: boolean;
  dialogs?: DialogLine[]; // Optional, fetched on demand
}

export interface FanChapter extends Chapter {
  authorName?: string;
}

export interface UserSprite {
  id: number;
  name: string;
  url: string; // Base64 or URL
}

export interface EventData {
  id: string;
  name: string;
  description: string;
  banner: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  userPoints: number;
  rewards: { pointThreshold: number; rewardName: string; claimed: boolean }[];
  ranking: { rank: number; name: string; points: number }[];
}

export interface Event {
  id: string;
  name: string;
  chapters: Chapter[];
}

export interface IdolCommu {
  idolId: string;
  name: string;
  chapters: Chapter[];
}
