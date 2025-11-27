
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
  // 1. Users Table
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
    type TEXT,
    parent_id TEXT,
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

  // 11. Fanmade Dialogs
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
  
  // Migration for existing DB
  db.run("ALTER TABLE fan_dialogs ADD COLUMN custom_sprite_url TEXT", (err) => {
      // Ignore if exists
  });

  // 12. User Custom Sprites
  db.run(`CREATE TABLE IF NOT EXISTS user_sprites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    url TEXT
  )`);

  // 13. Promo Codes
  db.run(`CREATE TABLE IF NOT EXISTS promo_codes (
    code TEXT PRIMARY KEY,
    type TEXT, -- 'PUBLIC' or 'UNIQUE'
    reward_type TEXT, -- 'JEWEL', 'MONEY', 'ITEM'
    reward_amount INTEGER,
    start_time INTEGER,
    end_time INTEGER
  )`);

  // 14. Promo Usage
  db.run(`CREATE TABLE IF NOT EXISTS promo_usage (
    user_id INTEGER,
    code TEXT,
    used_at INTEGER,
    PRIMARY KEY (user_id, code)
  )`);

  // 15. Presents / Gift Box
  db.run(`CREATE TABLE IF NOT EXISTS presents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT, -- 'MONEY', 'JEWEL', 'ITEM_STAMINA', 'ITEM_TICKET'
    amount INTEGER,
    description TEXT,
    received_at INTEGER
  )`);

  // 16. Announcements
  db.run(`CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    date INTEGER,
    banner_url TEXT
  )`);

  // --- SEED DATA ---
  
  // Seed Event
  db.get("SELECT id FROM events WHERE id = 'evt_live_groove'", (err, row) => {
    if (!row) {
        const now = Date.now();
        const oneWeek = 604800000;
        db.run(`INSERT INTO events VALUES ('evt_live_groove', 'Live Groove: Visual Burst', 'Play lives to earn points and unlock rewards!', 'https://picsum.photos/seed/event_banner/600/200', ${now - 10000}, ${now + oneWeek})`);
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 100, '50 Star Jewels', 50)`);
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 500, 'Stamina Drink', 1)`);
    }
  });

  // Seed Promo Codes
  db.run(`INSERT OR IGNORE INTO promo_codes VALUES ('WELCOME2024', 'PUBLIC', 'JEWEL', 2500, 0, 9999999999999)`);
  db.run(`INSERT OR IGNORE INTO promo_codes VALUES ('STARTERPACK', 'PUBLIC', 'ITEM', 5, 0, 9999999999999)`); // 5 Stamina Drinks
  db.run(`INSERT OR IGNORE INTO promo_codes VALUES ('UNIQUE123', 'UNIQUE', 'MONEY', 50000, 0, 9999999999999)`);

  // Seed Announcements
  db.get("SELECT id FROM announcements", (err, row) => {
      if(!row) {
          const now = Date.now();
          db.run("INSERT INTO announcements (title, content, date, banner_url) VALUES (?, ?, ?, ?)", 
            ["Welcome Producer!", "Thank you for playing the Web Version. Check out the new Live Groove event.", now, "https://picsum.photos/seed/news1/600/200"]);
          db.run("INSERT INTO announcements (title, content, date, banner_url) VALUES (?, ?, ?, ?)", 
            ["Maintenance Update", "We fixed some bugs regarding the Gacha animation.", now - 86400000, null]);
      }
  });

  // Seed Templates
  const templates = [
    { id: 'uzuki_ssr', name: "Uzuki S.", rarity: 'SSR', level: 1, maxLevel: 90, image: "https://picsum.photos/seed/uzuki/300/400", vocal: 50, dance: 40, visual: 60 },
    { id: 'rin_ssr', name: "Rin S.", rarity: 'SSR', level: 1, maxLevel: 90, image: "https://picsum.photos/seed/rin/300/400", vocal: 45, dance: 45, visual: 65 },
    { id: 'mio_ssr', name: "Mio H.", rarity: 'SSR', level: 1, maxLevel: 90, image: "https://picsum.photos/seed/mio/300/400", vocal: 60, dance: 40, visual: 40 },
  ];

  templates.forEach(t => {
    db.run(`INSERT OR IGNORE INTO idol_templates (id, name, rarity, maxLevel, image, vocal, dance, visual) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
            [t.id, t.name, t.rarity, t.maxLevel, t.image, t.vocal, t.dance, t.visual]);
  });
});

module.exports = db;
