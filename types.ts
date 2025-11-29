
export enum Rarity {
  N = 'N',
  R = 'R',
  SR = 'SR',
  SSR = 'SSR'
}

export enum IdolType {
  CUTE = 'CUTE',
  COOL = 'COOL',
  PASSION = 'PASSION'
}

export interface Idol {
  id: string;
  name: string;
  rarity: Rarity;
  type: IdolType;
  level: number;
  maxLevel: number;
  image: string; // URL
  vocal: number;
  dance: number;
  visual: number;
  attack: number; // New: Derived from stats
  defense: number; // New: Derived from stats
  affection: number; // New: 0 to Max
  maxAffection: number; // New
  isLocked: boolean;
  starRank: number; // New
  isAwakened: boolean; // New
}

export interface UserState {
  id: number;
  name: string;
  type: IdolType; // Producer Type
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

export interface LoginRewardConfig {
    day: number;
    type: 'MONEY' | 'JEWEL' | 'ITEM_STAMINA' | 'ITEM_TICKET';
    amount: number;
    message: string;
}

export interface LoginBonusResult {
    claimedToday: boolean; // Is it just claimed or viewed?
    streak: number; // 1-7
    todayConfig: LoginRewardConfig;
    allRewards: LoginRewardConfig[];
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
  category: 'IDOLMASTER' | 'ANIME' | 'J-POP' | 'OTHER';
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

export interface WorkResult {
    success: boolean;
    newStamina: number;
    expGained: number;
    moneyGained: number;
    affectionGained: number;
    progress: number; // 0-100 for current zone
    drops: {
        type: 'IDOL' | 'ITEM';
        name: string;
        rarity?: string;
    } | null;
    isLevelUp: boolean;
    isZoneClear: boolean;
}

// --- GACHA EXTENSIONS ---

export interface GachaHistoryEntry {
    id: number;
    idol_name: string;
    rarity: Rarity;
    pulled_at: number;
}

export interface GachaPoolInfo {
    rates: { [key: string]: number }; // SSR: 3.0, etc
    pool: {
        id: string;
        name: string;
        rarity: Rarity;
        image: string;
        type: IdolType;
        vocal: number;
        dance: number;
        visual: number;
        individualRate: number; // Calculated field
    }[];
}
