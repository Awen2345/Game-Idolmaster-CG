import { Rarity, Idol, Chapter, Event, IdolCommu, CommuType } from './types';

// Game Balance
export const MAX_STAMINA_BASE = 50;
export const STAMINA_REGEN_MS = 60000; // 1 stamina per minute for demo purposes (usually 5 min)
export const GACHA_COST = 250;
export const GACHA_10_COST = 2500;

// Mock Database Data
export const MOCK_IDOLS_DB: Omit<Idol, 'id' | 'isLocked'>[] = [
  { name: "Uzuki S.", rarity: Rarity.SSR, level: 1, maxLevel: 90, image: "https://picsum.photos/seed/uzuki/300/400", vocal: 50, dance: 40, visual: 60 },
  { name: "Rin S.", rarity: Rarity.SSR, level: 1, maxLevel: 90, image: "https://picsum.photos/seed/rin/300/400", vocal: 45, dance: 45, visual: 65 },
  { name: "Mio H.", rarity: Rarity.SSR, level: 1, maxLevel: 90, image: "https://picsum.photos/seed/mio/300/400", vocal: 60, dance: 40, visual: 40 },
  { name: "Kaede T.", rarity: Rarity.SR, level: 1, maxLevel: 70, image: "https://picsum.photos/seed/kaede/300/400", vocal: 40, dance: 30, visual: 50 },
  { name: "Mika J.", rarity: Rarity.SR, level: 1, maxLevel: 70, image: "https://picsum.photos/seed/mika/300/400", vocal: 45, dance: 35, visual: 45 },
  { name: "Anzu F.", rarity: Rarity.R, level: 1, maxLevel: 40, image: "https://picsum.photos/seed/anzu/300/400", vocal: 20, dance: 20, visual: 20 },
  { name: "Kirari M.", rarity: Rarity.R, level: 1, maxLevel: 40, image: "https://picsum.photos/seed/kirari/300/400", vocal: 25, dance: 25, visual: 15 },
  { name: "Ranko K.", rarity: Rarity.N, level: 1, maxLevel: 20, image: "https://picsum.photos/seed/ranko/300/400", vocal: 10, dance: 10, visual: 10 },
  { name: "Miku M.", rarity: Rarity.N, level: 1, maxLevel: 20, image: "https://picsum.photos/seed/miku/300/400", vocal: 10, dance: 12, visual: 8 },
  { name: "Riina T.", rarity: Rarity.N, level: 1, maxLevel: 20, image: "https://picsum.photos/seed/riina/300/400", vocal: 11, dance: 9, visual: 10 },
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