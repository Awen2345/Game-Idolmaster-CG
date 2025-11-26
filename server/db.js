
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

const MAX_STAMINA_BASE = 50;

db.serialize(() => {
  // 1. Users Table (Updated for Auth)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT, 
    name TEXT,
    level INTEGER,
    exp INTEGER,
    maxExp INTEGER,
    stamina INTEGER,
    maxStamina INTEGER,
    lastStaminaUpdate INTEGER,
    money INTEGER,
    starJewels INTEGER
  )`);

  // 2. Items Table
  db.run(`CREATE TABLE IF NOT EXISTS user_items (
    user_id INTEGER,
    item_name TEXT,
    count INTEGER,
    PRIMARY KEY (user_id, item_name)
  )`);

  // 3. Idol Templates
  db.run(`CREATE TABLE IF NOT EXISTS idol_templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    rarity TEXT,
    maxLevel INTEGER,
    image TEXT,
    vocal INTEGER,
    dance INTEGER,
    visual INTEGER
  )`);

  // 4. User Idols
  db.run(`CREATE TABLE IF NOT EXISTS user_idols (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    template_id TEXT,
    level INTEGER,
    isLocked INTEGER,
    FOREIGN KEY(template_id) REFERENCES idol_templates(id)
  )`);

  // 5. Events Table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT,
    description TEXT,
    banner TEXT,
    start_time INTEGER,
    end_time INTEGER
  )`);

  // 6. Event Points
  db.run(`CREATE TABLE IF NOT EXISTS event_points (
    user_id INTEGER,
    event_id TEXT,
    points INTEGER,
    PRIMARY KEY (user_id, event_id)
  )`);

  // 7. Event Rewards Definition
  db.run(`CREATE TABLE IF NOT EXISTS event_rewards_def (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT,
    point_threshold INTEGER,
    reward_name TEXT,
    reward_amount INTEGER
  )`);

  // 8. Story Chapters
  db.run(`CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    type TEXT, -- STORY, EVENT, IDOL, EXTRA
    parent_id TEXT, -- e.g., 'uzuki' or 'evt_001'
    title TEXT,
    sort_order INTEGER
  )`);

  // 9. Dialogs
  db.run(`CREATE TABLE IF NOT EXISTS dialogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id TEXT,
    speaker TEXT,
    text TEXT,
    expression TEXT,
    sort_order INTEGER
  )`);

  // 10. Fanmade Chapters
  db.run(`CREATE TABLE IF NOT EXISTS fan_chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    created_at INTEGER
  )`);

  // 11. Fanmade Dialogs (Updated to include custom_sprite_url)
  // Attempt to create. If it exists, we might need to alter it in a real scenario, but for this demo, we assume fresh or compatible DB.
  db.run(`CREATE TABLE IF NOT EXISTS fan_dialogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id INTEGER,
    speaker TEXT,
    text TEXT,
    expression TEXT,
    sort_order INTEGER,
    custom_sprite_url TEXT,
    FOREIGN KEY(chapter_id) REFERENCES fan_chapters(id)
  )`);
  
  // Try to add column if it doesn't exist (Migration hack for persistent sqlite)
  db.run("ALTER TABLE fan_dialogs ADD COLUMN custom_sprite_url TEXT", (err) => {
      // Ignore error if column exists
  });

  // 12. User Custom Sprites
  db.run(`CREATE TABLE IF NOT EXISTS user_sprites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    url TEXT -- Base64 encoded image string or URL
  )`);

  // --- SEED DATA ---

  // Seed Event
  db.get("SELECT id FROM events WHERE id = 'evt_live_groove'", (err, row) => {
    if (!row) {
        console.log("Seeding Event...");
        const now = Date.now();
        const oneWeek = 604800000;
        db.run(`INSERT INTO events VALUES ('evt_live_groove', 'Live Groove: Visual Burst', 'Play lives to earn points and unlock rewards!', 'https://picsum.photos/seed/event_banner/600/200', ${now - 10000}, ${now + oneWeek})`);
        
        // Rewards
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 100, '50 Star Jewels', 50)`);
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 500, 'Stamina Drink', 1)`);
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 1000, 'SR Ticket', 1)`);
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 2000, 'Event SR Card', 1)`);
    }
  });

  // Seed Chapters & Dialogs
  db.get("SELECT id FROM chapters WHERE id = 'main_1_1'", (err, row) => {
    if (!row) {
        console.log("Seeding Stories...");
        // Main Story
        db.run(`INSERT INTO chapters VALUES ('main_1_1', 'STORY', NULL, 'Chapter 1: The Beginning', 1)`);
        db.run(`INSERT INTO dialogs (chapter_id, speaker, text, expression, sort_order) VALUES 
            ('main_1_1', 'Producer', 'Welcome to 346 Production!', 'neutral', 1),
            ('main_1_1', 'Uzuki', 'I will do my best! Ganbarimasu!', 'happy', 2)
        `);

        // Event Story
        db.run(`INSERT INTO chapters VALUES ('evt_lg_1', 'EVENT', 'evt_live_groove', 'Opening: The Groove Begins', 1)`);
        db.run(`INSERT INTO dialogs (chapter_id, speaker, text, expression, sort_order) VALUES 
            ('evt_lg_1', 'Mika', 'Hey Producer! The Live Groove is starting soon.', 'happy', 1),
            ('evt_lg_1', 'Rin', 'Are we ready for this?', 'neutral', 2)
        `);

        // Idol Story
        db.run(`INSERT INTO chapters VALUES ('idol_uzuki_1', 'IDOL', 'uzuki', 'Uzuki: Smile Magic', 1)`);
        db.run(`INSERT INTO dialogs (chapter_id, speaker, text, expression, sort_order) VALUES 
            ('idol_uzuki_1', 'Uzuki', 'Producer-san, do you like flowers?', 'happy', 1)
        `);
    }
  });

  // Seed Templates (Idols)
  const templates = [
    { id: 'uzuki_ssr', name: "Uzuki S.", rarity: 'SSR', level: 1, maxLevel: 90, image: "https://picsum.photos/seed/uzuki/300/400", vocal: 50, dance: 40, visual: 60 },
    { id: 'rin_ssr', name: "Rin S.", rarity: 'SSR', level: 1, maxLevel: 90, image: "https://picsum.photos/seed/rin/300/400", vocal: 45, dance: 45, visual: 65 },
    { id: 'mio_ssr', name: "Mio H.", rarity: 'SSR', level: 1, maxLevel: 90, image: "https://picsum.photos/seed/mio/300/400", vocal: 60, dance: 40, visual: 40 },
    { id: 'kaede_sr', name: "Kaede T.", rarity: 'SR', level: 1, maxLevel: 70, image: "https://picsum.photos/seed/kaede/300/400", vocal: 40, dance: 30, visual: 50 },
    { id: 'mika_sr', name: "Mika J.", rarity: 'SR', level: 1, maxLevel: 70, image: "https://picsum.photos/seed/mika/300/400", vocal: 45, dance: 35, visual: 45 },
    { id: 'anzu_r', name: "Anzu F.", rarity: 'R', level: 1, maxLevel: 40, image: "https://picsum.photos/seed/anzu/300/400", vocal: 20, dance: 20, visual: 20 },
    { id: 'kirari_r', name: "Kirari M.", rarity: 'R', level: 1, maxLevel: 40, image: "https://picsum.photos/seed/kirari/300/400", vocal: 25, dance: 25, visual: 15 },
    { id: 'ranko_n', name: "Ranko K.", rarity: 'N', level: 1, maxLevel: 20, image: "https://picsum.photos/seed/ranko/300/400", vocal: 10, dance: 10, visual: 10 },
    { id: 'miku_n', name: "Miku M.", rarity: 'N', level: 1, maxLevel: 20, image: "https://picsum.photos/seed/miku/300/400", vocal: 10, dance: 12, visual: 8 },
    { id: 'riina_n', name: "Riina T.", rarity: 'N', level: 1, maxLevel: 20, image: "https://picsum.photos/seed/riina/300/400", vocal: 11, dance: 9, visual: 10 },
  ];

  templates.forEach(t => {
    db.run(`INSERT OR IGNORE INTO idol_templates (id, name, rarity, maxLevel, image, vocal, dance, visual) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [t.id, t.name, t.rarity, t.maxLevel, t.image, t.vocal, t.dance, t.visual]);
  });

});

module.exports = db;
