
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'game.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Enable Write-Ahead Logging to fix "Database Locked" errors during concurrent fetch/updates
    db.run("PRAGMA journal_mode = WAL;");
  }
});

db.serialize(() => {
  // 1. Users Table - Added type
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT, 
    name TEXT,
    type TEXT, -- CUTE, COOL, PASSION
    level INTEGER,
    exp INTEGER,
    maxExp INTEGER,
    stamina INTEGER,
    maxStamina INTEGER,
    lastStaminaUpdate INTEGER,
    money INTEGER,
    starJewels INTEGER,
    last_login_date INTEGER, -- New: Timestamp for bonus
    login_streak INTEGER DEFAULT 0 -- New: Days streak
  )`);
  
  // Migration for type if missing
  db.run("ALTER TABLE users ADD COLUMN type TEXT", (err) => {});
  // Migration for login bonus
  db.run("ALTER TABLE users ADD COLUMN last_login_date INTEGER", (err) => {});
  db.run("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0", (err) => {});

  // 2. Items Table
  db.run(`CREATE TABLE IF NOT EXISTS user_items (
    user_id INTEGER,
    item_name TEXT,
    count INTEGER,
    PRIMARY KEY (user_id, item_name)
  )`);

  // 3. Idol Templates - Added attribute, attack, defense
  db.run(`CREATE TABLE IF NOT EXISTS idol_templates (
    id TEXT PRIMARY KEY,
    name TEXT,
    rarity TEXT,
    type TEXT, -- CUTE, COOL, PASSION
    maxLevel INTEGER,
    image TEXT,
    vocal INTEGER,
    dance INTEGER,
    visual INTEGER,
    attack INTEGER,
    defense INTEGER
  )`);

  // Migration
  db.run("ALTER TABLE idol_templates ADD COLUMN type TEXT", () => {});
  db.run("ALTER TABLE idol_templates ADD COLUMN attack INTEGER", () => {});
  db.run("ALTER TABLE idol_templates ADD COLUMN defense INTEGER", () => {});

  // 4. User Idols - Added affection, star_rank, is_awakened
  db.run(`CREATE TABLE IF NOT EXISTS user_idols (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    template_id TEXT,
    level INTEGER,
    affection INTEGER DEFAULT 0,
    isLocked INTEGER,
    star_rank INTEGER DEFAULT 1,
    is_awakened INTEGER DEFAULT 0,
    FOREIGN KEY(template_id) REFERENCES idol_templates(id)
  )`);
  
  db.run("ALTER TABLE user_idols ADD COLUMN affection INTEGER DEFAULT 0", () => {});
  db.run("ALTER TABLE user_idols ADD COLUMN star_rank INTEGER DEFAULT 1", () => {});
  db.run("ALTER TABLE user_idols ADD COLUMN is_awakened INTEGER DEFAULT 0", () => {});

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

  // 8. Story Chapters (Legacy)
  db.run(`CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    type TEXT,
    parent_id TEXT,
    title TEXT,
    sort_order INTEGER
  )`);

  // 9. Dialogs (Legacy)
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
    type TEXT,
    reward_type TEXT,
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

  // 15. Presents
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

  // 17. User Read Chapters
  db.run(`CREATE TABLE IF NOT EXISTS user_read_chapters (
    user_id INTEGER,
    chapter_id TEXT,
    read_at INTEGER,
    PRIMARY KEY (user_id, chapter_id)
  )`);

  // 18. User Battle Decks
  db.run(`CREATE TABLE IF NOT EXISTS user_decks (
    user_id INTEGER PRIMARY KEY,
    slot1_id TEXT,
    slot2_id TEXT,
    slot3_id TEXT,
    slot4_id TEXT
  )`);

  // 19. Work Zones (Static Data)
  db.run(`CREATE TABLE IF NOT EXISTS work_zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    area_name TEXT,
    zone_name TEXT,
    stamina_cost INTEGER,
    exp_gain INTEGER
  )`);

  // 20. User Work Progress
  db.run(`CREATE TABLE IF NOT EXISTS work_progress (
    user_id INTEGER PRIMARY KEY,
    current_zone_id INTEGER DEFAULT 1,
    progress_percent INTEGER DEFAULT 0
  )`);

  // 21. Gacha History
  db.run(`CREATE TABLE IF NOT EXISTS gacha_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    idol_id TEXT,
    idol_name TEXT,
    rarity TEXT,
    pulled_at INTEGER
  )`);

  // --- SEED WORK ZONES ---
  db.get("SELECT count(*) as count FROM work_zones", (err, row) => {
      if (row && row.count === 0) {
          db.run("INSERT INTO work_zones (area_name, zone_name, stamina_cost, exp_gain) VALUES ('Harajuku', 'Area 1-1', 2, 2)");
          db.run("INSERT INTO work_zones (area_name, zone_name, stamina_cost, exp_gain) VALUES ('Harajuku', 'Area 1-2', 2, 2)");
          db.run("INSERT INTO work_zones (area_name, zone_name, stamina_cost, exp_gain) VALUES ('Harajuku', 'Area 1-3', 3, 4)");
          db.run("INSERT INTO work_zones (area_name, zone_name, stamina_cost, exp_gain) VALUES ('Shibuya', 'Area 2-1', 4, 6)");
          db.run("INSERT INTO work_zones (area_name, zone_name, stamina_cost, exp_gain) VALUES ('Shibuya', 'Area 2-2', 5, 8)");
      }
  });

  // --- EXISTING SEEDS ---
  db.get("SELECT id FROM events WHERE id = 'evt_live_groove'", (err, row) => {
    if (!row) {
        const now = Date.now();
        const oneWeek = 604800000;
        db.run(`INSERT INTO events VALUES ('evt_live_groove', 'Live Groove: Visual Burst', 'Play lives to earn points and unlock rewards!', 'https://hidamarirhodonite.kirara.ca/card/100065.png', ${now - 10000}, ${now + oneWeek})`);
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 100, '50 Star Jewels', 50)`);
        db.run(`INSERT INTO event_rewards_def (event_id, point_threshold, reward_name, reward_amount) VALUES ('evt_live_groove', 500, 'Stamina Drink', 1)`);
    }
  });

  const now = Date.now();
  db.get("SELECT id FROM announcements", (err, row) => {
      if(!row) {
          db.run("INSERT INTO announcements (title, content, date, banner_url) VALUES (?, ?, ?, ?)", 
            ["Work System Update!", "You can now perform 'Work' to level up and gain affection with your idols.", now + 100, "https://hidamarirhodonite.kirara.ca/spread/100523.png"]);
      }
  });
});

module.exports = db;
