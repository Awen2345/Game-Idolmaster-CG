
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
  // 1. Users Table
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
    last_login_date INTEGER,
    login_streak INTEGER DEFAULT 0
  )`);
  
  db.run("ALTER TABLE users ADD COLUMN type TEXT", (err) => {});
  db.run("ALTER TABLE users ADD COLUMN last_login_date INTEGER", (err) => {});
  db.run("ALTER TABLE users ADD COLUMN login_streak INTEGER DEFAULT 0", (err) => {});

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
    type TEXT,
    maxLevel INTEGER,
    image TEXT,
    vocal INTEGER,
    dance INTEGER,
    visual INTEGER,
    attack INTEGER,
    defense INTEGER
  )`);

  db.run("ALTER TABLE idol_templates ADD COLUMN type TEXT", () => {});
  db.run("ALTER TABLE idol_templates ADD COLUMN attack INTEGER", () => {});
  db.run("ALTER TABLE idol_templates ADD COLUMN defense INTEGER", () => {});

  // 4. User Idols
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

  // 8-11. Chapters & Dialogs (Story & Fanmade)
  db.run(`CREATE TABLE IF NOT EXISTS chapters (id TEXT PRIMARY KEY, type TEXT, parent_id TEXT, title TEXT, sort_order INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS dialogs (id INTEGER PRIMARY KEY AUTOINCREMENT, chapter_id TEXT, speaker TEXT, text TEXT, expression TEXT, sort_order INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS fan_chapters (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, title TEXT, created_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS fan_dialogs (id INTEGER PRIMARY KEY AUTOINCREMENT, chapter_id INTEGER, speaker TEXT, text TEXT, expression TEXT, sort_order INTEGER, custom_sprite_url TEXT, FOREIGN KEY(chapter_id) REFERENCES fan_chapters(id))`);
  
  // 12. User Custom Sprites
  db.run(`CREATE TABLE IF NOT EXISTS user_sprites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, name TEXT, url TEXT)`);

  // 13-14. Promo Codes
  db.run(`CREATE TABLE IF NOT EXISTS promo_codes (code TEXT PRIMARY KEY, type TEXT, reward_type TEXT, reward_amount INTEGER, start_time INTEGER, end_time INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS promo_usage (user_id INTEGER, code TEXT, used_at INTEGER, PRIMARY KEY (user_id, code))`);

  // 15-16. Presents & Announcements
  db.run(`CREATE TABLE IF NOT EXISTS presents (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, type TEXT, amount INTEGER, description TEXT, received_at INTEGER)`);
  db.run(`CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT, date INTEGER, banner_url TEXT)`);

  // 17. User Read Chapters
  db.run(`CREATE TABLE IF NOT EXISTS user_read_chapters (user_id INTEGER, chapter_id TEXT, read_at INTEGER, PRIMARY KEY (user_id, chapter_id))`);

  // 18. User Battle Decks
  db.run(`CREATE TABLE IF NOT EXISTS user_decks (user_id INTEGER PRIMARY KEY, slot1_id TEXT, slot2_id TEXT, slot3_id TEXT, slot4_id TEXT)`);

  // 19. WORK REGIONS (NEW)
  db.run(`CREATE TABLE IF NOT EXISTS work_regions (
    id INTEGER PRIMARY KEY,
    name TEXT,
    description TEXT
  )`);

  // 20. WORK JOBS (NEW)
  db.run(`CREATE TABLE IF NOT EXISTS work_jobs (
    id INTEGER PRIMARY KEY,
    region_id INTEGER,
    title TEXT,
    type TEXT, -- CUTE, COOL, PASSION, ALL
    stamina_cost INTEGER,
    difficulty INTEGER,
    base_money INTEGER,
    base_exp INTEGER
  )`);

  // 21. Gacha History
  db.run(`CREATE TABLE IF NOT EXISTS gacha_history (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, idol_id TEXT, idol_name TEXT, rarity TEXT, pulled_at INTEGER)`);

  // --- SEED WORK DATA (NEW) ---
  db.get("SELECT count(*) as count FROM work_regions", (err, row) => {
      if (row && row.count === 0) {
          // Regions
          db.run("INSERT INTO work_regions VALUES (1, 'Central Area', 'Tokyo, Kanagawa, Chiba')");
          db.run("INSERT INTO work_regions VALUES (2, 'North Area', 'Hokkaido, Tohoku')");
          db.run("INSERT INTO work_regions VALUES (3, 'West Area', 'Osaka, Kyoto, Hyogo')");
          db.run("INSERT INTO work_regions VALUES (4, 'South Area', 'Kyushu, Okinawa')");

          // Jobs for Central Area
          db.run("INSERT INTO work_jobs VALUES (1, 1, 'Variety Show Recording', 'ALL', 10, 1, 500, 10)");
          db.run("INSERT INTO work_jobs VALUES (2, 1, 'Radio Guest Appearance', 'CUTE', 15, 2, 800, 20)");
          db.run("INSERT INTO work_jobs VALUES (3, 1, 'Fashion Magazine Shoot', 'COOL', 20, 3, 1200, 35)");
          
          // Jobs for North Area
          db.run("INSERT INTO work_jobs VALUES (4, 2, 'Local Commercial', 'PASSION', 12, 1, 600, 15)");
          db.run("INSERT INTO work_jobs VALUES (5, 2, 'Snow Festival Live', 'COOL', 25, 4, 1500, 50)");

          // Jobs for West Area
          db.run("INSERT INTO work_jobs VALUES (6, 3, 'Comedy Sketch', 'PASSION', 15, 2, 900, 25)");
          db.run("INSERT INTO work_jobs VALUES (7, 3, 'Temple Visit Coverage', 'CUTE', 18, 3, 1000, 30)");
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
            ["Business Update!", "New Jobs available in Central Area! Send your idols to work.", now + 100, "https://hidamarirhodonite.kirara.ca/spread/100523.png"]);
      }
  });
});

module.exports = db;
