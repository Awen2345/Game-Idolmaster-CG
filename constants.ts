
import { Rarity, Idol, Chapter, Event, IdolCommu, CommuType, Song } from './types';

// Game Balance
export const MAX_STAMINA_BASE = 50;
export const STAMINA_REGEN_MS = 60000; // 1 stamina per minute for demo purposes (usually 5 min)
export const GACHA_COST = 250;
export const GACHA_10_COST = 2500;

// Mock Database Data - Updated with real Starlight Stage URLs
export const MOCK_IDOLS_DB: Omit<Idol, 'id' | 'isLocked'>[] = [
  { name: "Uzuki Shimamura", rarity: Rarity.SSR, level: 1, maxLevel: 90, image: "https://hidamarirhodonite.kirara.ca/card/100065.png", vocal: 50, dance: 40, visual: 60 },
  { name: "Rin Shibuya", rarity: Rarity.SSR, level: 1, maxLevel: 90, image: "https://hidamarirhodonite.kirara.ca/card/100067.png", vocal: 45, dance: 45, visual: 65 },
  { name: "Mio Honda", rarity: Rarity.SSR, level: 1, maxLevel: 90, image: "https://hidamarirhodonite.kirara.ca/card/100069.png", vocal: 60, dance: 40, visual: 40 },
  { name: "Kaede Takagaki", rarity: Rarity.SR, level: 1, maxLevel: 70, image: "https://hidamarirhodonite.kirara.ca/card/100109.png", vocal: 40, dance: 30, visual: 50 },
  { name: "Mika Jougasaki", rarity: Rarity.SR, level: 1, maxLevel: 70, image: "https://hidamarirhodonite.kirara.ca/card/100057.png", vocal: 45, dance: 35, visual: 45 },
  { name: "Anzu Futaba", rarity: Rarity.R, level: 1, maxLevel: 40, image: "https://hidamarirhodonite.kirara.ca/card/100007.png", vocal: 20, dance: 20, visual: 20 },
  { name: "Kirari Moroboshi", rarity: Rarity.R, level: 1, maxLevel: 40, image: "https://hidamarirhodonite.kirara.ca/card/100015.png", vocal: 25, dance: 25, visual: 15 },
  { name: "Ranko Kanzaki", rarity: Rarity.N, level: 1, maxLevel: 20, image: "https://hidamarirhodonite.kirara.ca/card/100031.png", vocal: 10, dance: 10, visual: 10 },
  { name: "Miku Maekawa", rarity: Rarity.N, level: 1, maxLevel: 20, image: "https://hidamarirhodonite.kirara.ca/card/100021.png", vocal: 10, dance: 12, visual: 8 },
  { name: "Riina Tada", rarity: Rarity.N, level: 1, maxLevel: 20, image: "https://hidamarirhodonite.kirara.ca/card/100033.png", vocal: 11, dance: 9, visual: 10 },
];

export const MOCK_STORY_CHAPTERS: Chapter[] = [
  {
    id: 'main_1_1', title: 'Chapter 1: The Beginning', type: CommuType.STORY, isRead: false,
    dialogs: [
      { speaker: 'Producer', text: 'Welcome to the production agency!' },
      { speaker: 'Uzuki', text: 'I will do my best! Ganbarimasu!', expression: 'happy' },
    ]
  },
  {
    id: 'main_1_2', title: 'Chapter 2: First Lesson', type: CommuType.STORY, isRead: false,
    dialogs: [
      { speaker: 'Trainer', text: 'One, two, three, four!' },
      { speaker: 'Rin', text: 'This is harder than it looks.', expression: 'neutral' },
    ]
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'evt_001', name: 'Cinderella Caravan',
    chapters: [
      { id: 'evt_1_1', title: 'Caravan Start!', type: CommuType.EVENT, isRead: false, dialogs: [{ speaker: 'Mio', text: 'Let\'s sell lots of merch!', expression: 'happy' }] }
    ]
  },
  {
    id: 'evt_002', name: 'Live Groove',
    chapters: [
      { id: 'evt_2_1', title: 'Groove Burst', type: CommuType.EVENT, isRead: false, dialogs: [{ speaker: 'Kaede', text: 'The crowd is waiting...', expression: 'neutral' }] }
    ]
  }
];

export const MOCK_IDOL_COMMUS: IdolCommu[] = [
  {
    idolId: 'uzuki', name: 'Uzuki Shimamura',
    chapters: [
      { id: 'idol_uzuki_1', title: 'A New Smile', type: CommuType.IDOL, isRead: false, dialogs: [{ speaker: 'Uzuki', text: 'Producer-san, look at this flower!', expression: 'happy' }] }
    ]
  },
  {
    idolId: 'rin', name: 'Rin Shibuya',
    chapters: [
      { id: 'idol_rin_1', title: 'Reluctant Idol', type: CommuType.IDOL, isRead: false, dialogs: [{ speaker: 'Rin', text: 'Why did you scout me?', expression: 'angry' }] }
    ]
  }
];

export const MOCK_EXTRA_COMMUS: Chapter[] = [
  { id: 'ext_1', title: 'April Fools 2024', type: CommuType.EXTRA, isRead: false, dialogs: [{ speaker: 'Chihiro', text: 'Just kidding!', expression: 'happy' }] }
];

// YouTube Links for Demo
export const MOCK_SONGS: Song[] = [
    {
        id: 'sng_1',
        title: 'Star!!',
        artist: 'Cinderella Project',
        url: 'https://www.youtube.com/watch?v=SwmwS_7Wfww', // Official Anime OP 1
        cover: 'https://i.ytimg.com/vi/SwmwS_7Wfww/hqdefault.jpg'
    },
    {
        id: 'sng_2',
        title: 'Shine!!',
        artist: 'Cinderella Project',
        url: 'https://www.youtube.com/watch?v=a3YV8z5-t8M', // Official Anime OP 2
        cover: 'https://i.ytimg.com/vi/a3YV8z5-t8M/hqdefault.jpg'
    },
    {
        id: 'sng_3',
        title: 'M@GIC',
        artist: 'Cinderella Project',
        url: 'https://www.youtube.com/watch?v=v=0pLgD54y9T0', // Ep 25 Insert
        cover: 'https://i.ytimg.com/vi/0pLgD54y9T0/hqdefault.jpg'
    }
];
