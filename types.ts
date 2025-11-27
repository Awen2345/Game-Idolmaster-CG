
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
  customSpriteUrl?: string; // URL/Base64 for custom character art
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
  url: string; // Base64
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

export interface Song {
  id: string;
  title: string;
  artist: string;
  url: string;
  cover: string;
}

export interface Present {
    id: number;
    type: 'MONEY' | 'JEWEL' | 'ITEM_STAMINA' | 'ITEM_TICKET';
    amount: number;
    description: string;
    receivedAt: number;
}

export interface Announcement {
    id: number;
    title: string;
    content: string;
    date: number;
    bannerUrl?: string;
}

// --- BATTLE TYPES ---

export interface BattleOpponent {
    name: string;
    level: number;
    isBot: boolean;
    cards: {
        name: string;
        image: string;
        rarity: Rarity;
        totalStats: number; // Vo + Da + Vi
    }[];
    totalPower: number;
}

export interface BattleResult {
    won: boolean;
    playerScore: number;
    opponentScore: number;
    rewards: {
        exp: number;
        money: number;
        jewels: number;
    }
}
