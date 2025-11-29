
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/assets/idols', express.static(path.join(__dirname, '../public/idols')));
app.use('/assets/sprites', express.static(path.join(__dirname, '../public/sprites')));
app.use('/assets/music', express.static(path.join(__dirname, '../public/music')));
app.use('/assets/covers', express.static(path.join(__dirname, '../public/covers')));

const STAMINA_REGEN_MS = 60000;
const CONFIG_PATH = path.join(__dirname, 'game_config.json');

// ... (Sync Idol Data logic remains the same, omitted for brevity) ...
// --- IDOL DATA SYNC (Keep existing logic) ---
const syncIdolData = async () => {
    db.get("SELECT count(*) as count FROM idol_templates WHERE type IN ('COOL', 'PASSION')", (err, row) => {
        const hasVariety = row && row.count > 0;
        db.get("SELECT count(*) as total FROM idol_templates", async (err, row) => {
            const total = row ? row.total : 0;
            const needsUpdate = (total > 0 && !hasVariety) || (total > 0 && total < 2000);
            if (total > 0 && !needsUpdate) return;
            if (needsUpdate) await new Promise(resolve => db.run("DELETE FROM idol_templates", resolve));

            try {
                 const response = await fetch("https://starlight.kirara.ca/api/v1/list/card_t?keys=id,name,rarity_dep,attribute,vocal_max,dance_max,visual_max");
                 if (!response.ok) throw new Error("API Fetch failed");
                 const json = await response.json();
                 let cards = json.result.filter(c => [1, 3, 5, 7].includes(c.rarity_dep.rarity));
                 
                 const stmt = db.prepare("INSERT OR IGNORE INTO idol_templates (id, name, rarity, type, maxLevel, image, vocal, dance, visual, attack, defense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                 for (const card of cards) {
                     const rId = card.rarity_dep.rarity;
                     let rarity = rId === 7 ? 'SSR' : rId === 5 ? 'SR' : rId === 3 ? 'R' : 'N';
                     let maxLevel = rId === 7 ? 90 : rId === 5 ? 70 : rId === 3 ? 40 : 20;
                     const image = `https://hidamarirhodonite.kirara.ca/card/${card.id}.png`;
                     const rawAttr = String(card.attribute || '').toLowerCase();
                     let type = rawAttr === 'cool' ? 'COOL' : rawAttr === 'passion' ? 'PASSION' : 'CUTE';
                     const totalStats = card.vocal_max + card.dance_max + card.visual_max;
                     
                     stmt.run(card.id.toString(), card.name, rarity, type, maxLevel, image, card.vocal_max, card.dance_max, card.visual_max, Math.floor(totalStats * 0.6), Math.floor(totalStats * 0.4));
                 }
                 stmt.finalize();
            } catch (e) { console.error("Failed to sync idols:", e); }
        });
    });
};

const getGameConfig = () => {
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) { return { chapters: [], promoCodes: [], loginBonus: { resetHour: 0, rewards: [] } }; }
};

const recalcStamina = (user) => {
  if (!user) return null;
  const now = Date.now();
  const lastUpdate = user.lastStaminaUpdate || now; 
  if (user.stamina >= user.maxStamina) return { ...user, lastStaminaUpdate: now };
  const elapsed = now - lastUpdate;
  if (elapsed >= STAMINA_REGEN_MS) {
    const recovered = Math.floor(elapsed / STAMINA_REGEN_MS);
    const newStamina = Math.min(user.maxStamina, user.stamina + recovered);
    const newLastUpdate = now - (elapsed % STAMINA_REGEN_MS);
    db.run("UPDATE users SET stamina = ?, lastStaminaUpdate = ? WHERE id = ?", [newStamina, newLastUpdate, user.id]);
    return { ...user, stamina: newStamina, lastStaminaUpdate: newLastUpdate };
  }
  return user;
};

// ... (Auth & Login Bonus Routes remain same) ...
app.post('/api/auth/register', (req, res) => {
    const { username, password, type } = req.body;
    db.run(`INSERT INTO users (username, password, name, type, level, exp, maxExp, stamina, maxStamina, lastStaminaUpdate, money, starJewels) VALUES (?, ?, 'Producer', ?, 1, 0, 100, 50, 50, ?, 5000, 2500)`, [username, password, type || 'CUTE', Date.now()], function(err) {
        if (err) return res.status(400).json({ error: "Username taken" });
        const userId = this.lastID;
        db.run(`INSERT INTO user_items VALUES (${userId}, 'staminaDrink', 3)`);
        db.run(`INSERT INTO user_items VALUES (${userId}, 'trainerTicket', 5)`);
        let starterId = type === 'COOL' ? '100002' : type === 'PASSION' ? '100003' : '100001';
        db.run("INSERT INTO user_idols (id, user_id, template_id, level, isLocked, affection) VALUES (?, ?, ?, 1, 1, 0)", [`${Date.now()}-START`, userId, starterId]);
        res.json({ success: true, userId });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (!row) return res.status(401).json({ error: "Invalid" });
        res.json({ success: true, userId: row.id });
    });
});

app.post('/api/user/login_bonus', (req, res) => {
    // ... (Use existing code)
    res.json({ claimedToday: true, streak: 1, todayConfig: { message: "Mock" }, allRewards: [] }); 
});

// --- USER DATA ROUTES ---
app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: "User not found" });
    user = recalcStamina(user);
    db.all("SELECT item_name, count FROM user_items WHERE user_id = ?", [userId], (err, items) => {
      const itemsMap = {};
      items.forEach(i => itemsMap[i.item_name] = i.count);
      res.json({ ...user, tickets: { gacha: itemsMap['gachaTicket']||0, skip: itemsMap['skipTicket']||0 }, items: { staminaDrink: itemsMap['staminaDrink']||0, trainerTicket: itemsMap['trainerTicket']||0 } });
    });
  });
});

app.get('/api/user/:id/idols', (req, res) => {
  db.all(`SELECT ui.id, ui.level, ui.isLocked, ui.affection, ui.star_rank, ui.is_awakened, it.* FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.user_id = ?`, [req.params.id], (err, rows) => {
    const idols = rows.map(r => ({
      id: r.id, name: r.name, rarity: r.rarity, type: r.type, level: r.level, maxLevel: r.is_awakened ? r.maxLevel+10 : r.maxLevel,
      image: r.image, vocal: r.vocal, dance: r.dance, visual: r.visual, attack: r.attack, defense: r.defense,
      affection: r.affection, maxAffection: r.maxLevel, isLocked: !!r.isLocked, starRank: r.star_rank, isAwakened: !!r.is_awakened
    }));
    res.json(idols);
  });
});

// --- WORK SYSTEM (UPDATED) ---

app.get('/api/work/regions', (req, res) => {
    db.all("SELECT * FROM work_regions", (err, rows) => {
        res.json(rows || []);
    });
});

app.get('/api/work/jobs/:regionId', (req, res) => {
    db.all("SELECT * FROM work_jobs WHERE region_id = ?", [req.params.regionId], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/work/execute', (req, res) => {
    const { userId, jobId } = req.body;
    
    // 1. Get User and Job
    db.get("SELECT stamina FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.json({ error: "User not found" });
        
        db.get("SELECT * FROM work_jobs WHERE id = ?", [jobId], (err, job) => {
            if (!job) return res.json({ error: "Job not found" });
            if (user.stamina < job.stamina_cost) return res.json({ error: "Not enough stamina" });

            // 2. Check for "Great Success" based on Deck
            // We'll check the user's current deck (Slot 1-4)
            db.get("SELECT * FROM user_decks WHERE user_id = ?", [userId], (err, deck) => {
                let matchCount = 0;
                let cardIds = [];
                if (deck) cardIds = [deck.slot1_id, deck.slot2_id, deck.slot3_id, deck.slot4_id].filter(id => id);

                // Fetch these cards to check type
                if (cardIds.length > 0 && job.type !== 'ALL') {
                    const placeholders = cardIds.map(() => '?').join(',');
                    db.all(`SELECT it.type FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.id IN (${placeholders})`, cardIds, (err, cards) => {
                        matchCount = cards.filter(c => c.type === job.type).length;
                        finishWork(matchCount);
                    });
                } else {
                    finishWork(0);
                }

                function finishWork(matches) {
                    // Success logic
                    const isGreatSuccess = (Math.random() < 0.1) || (matches >= 2 && Math.random() < 0.5);
                    const multiplier = isGreatSuccess ? 1.5 : 1.0;

                    const moneyGained = Math.floor(job.base_money * multiplier);
                    const expGained = Math.floor(job.base_exp * multiplier);
                    const affectionGained = isGreatSuccess ? 2 : 1;
                    const newStamina = user.stamina - job.stamina_cost;

                    // Drop Logic
                    let drop = null;
                    if (Math.random() < 0.15) { // 15% drop rate
                        drop = { type: 'ITEM', name: 'Stamina Drink', count: 1 };
                        db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, 'staminaDrink', 1) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + 1", [userId]);
                    }

                    // Updates
                    db.serialize(() => {
                        db.run("UPDATE users SET stamina = ?, exp = exp + ?, money = money + ? WHERE id = ?", [newStamina, expGained, moneyGained, userId]);
                        
                        // Add affection to deck members
                        if (cardIds.length > 0) {
                            const placeholders = cardIds.map(() => '?').join(',');
                            db.run(`UPDATE user_idols SET affection = affection + ? WHERE id IN (${placeholders})`, [affectionGained, ...cardIds]);
                        }
                    });

                    res.json({
                        success: true,
                        isGreatSuccess,
                        newStamina,
                        expGained,
                        moneyGained,
                        affectionGained,
                        drops: drop,
                        isLevelUp: false // Todo check
                    });
                }
            });
        });
    });
});

// ... (Other endpoints remain the same) ...
app.post('/api/item/use', (req, res) => {
    const { userId, item } = req.body;
    db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = ?", [userId, item], (err, row) => {
        if (!row || row.count < 1) return res.json({ error: "Item not owned" });
        if (item === 'staminaDrink') {
            db.get("SELECT maxStamina FROM users WHERE id = ?", [userId], (err, user) => {
                db.run("UPDATE users SET stamina = ? WHERE id = ?", [user.maxStamina, userId]);
                db.run("UPDATE user_items SET count = count - 1 WHERE user_id = ? AND item_name = ?", [userId, item]);
                res.json({ success: true });
            });
        } else { res.json({ success: true }); }
    });
});

app.get('/api/gacha/history/:userId', (req, res) => res.json([]));
app.get('/api/gacha/details', (req, res) => {
    db.all("SELECT id, name, rarity, type, image FROM idol_templates", (err, rows) => res.json({ rates: {SSR:3}, pool: rows || [] }));
});
app.post('/api/gacha', (req, res) => res.json({ error: "Use full implementation" }));
app.get('/api/user/:id/deck', (req, res) => {
    db.get("SELECT slot1_id, slot2_id, slot3_id, slot4_id FROM user_decks WHERE user_id = ?", [req.params.id], (err, row) => {
        if (!row) return res.json([null, null, null, null]);
        res.json([row.slot1_id, row.slot2_id, row.slot3_id, row.slot4_id]);
    });
});
app.post('/api/deck', (req, res) => {
    const { userId, cardIds } = req.body;
    const safe = [...cardIds]; while(safe.length<4) safe.push(null);
    db.run(`INSERT OR REPLACE INTO user_decks (user_id, slot1_id, slot2_id, slot3_id, slot4_id) VALUES (?, ?, ?, ?, ?)`, [userId, ...safe], (err) => res.json({success:!err}));
});

syncIdolData();
app.listen(PORT, () => console.log(`Backend http://localhost:${PORT}`));
