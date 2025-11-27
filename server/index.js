
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

// --- IDOL DATA SYNC ---
const syncIdolData = async () => {
    db.get("SELECT count(*) as count FROM idol_templates", async (err, row) => {
        if (err || (row && row.count > 0)) {
            console.log("Idol database already populated.");
            return;
        }

        console.log("Fetching Idol Data from Starlight Stage API...");
        try {
             const response = await fetch("https://starlight.kirara.ca/api/v1/list/card_t?keys=id,name,rarity_dep,vocal_max,dance_max,visual_max");
             if (!response.ok) throw new Error("API Fetch failed");
             
             const json = await response.json();
             const cards = json.result;

             if (!cards) return;

             const stmt = db.prepare("INSERT OR IGNORE INTO idol_templates VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
             
             let count = 0;
             for (const card of cards) {
                 const rId = card.rarity_dep.rarity;
                 if (![1, 3, 5, 7].includes(rId)) continue;

                 let rarity = 'N';
                 let maxLevel = 20;
                 if (rId === 3) { rarity = 'R'; maxLevel = 40; }
                 if (rId === 5) { rarity = 'SR'; maxLevel = 70; }
                 if (rId === 7) { rarity = 'SSR'; maxLevel = 90; }

                 const image = `https://hidamarirhodonite.kirara.ca/card/${card.id}.png`;

                 stmt.run(
                     card.id.toString(), 
                     card.name, 
                     rarity, 
                     maxLevel, 
                     image, 
                     card.vocal_max, 
                     card.dance_max, 
                     card.visual_max
                 );
                 count++;
                 if (count >= 300) break; 
             }
             stmt.finalize();
             console.log(`Successfully populated ${count} idols from Starlight Stage API.`);
        } catch (e) {
            console.error("Failed to sync idols:", e);
        }
    });
};

const getGameConfig = () => {
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { chapters: [], promoCodes: [] };
    }
};

const recalcStamina = (user) => {
  if (user.stamina >= user.maxStamina) return user;
  const now = Date.now();
  const elapsed = now - user.lastStaminaUpdate;
  if (elapsed >= STAMINA_REGEN_MS) {
    const recovered = Math.floor(elapsed / STAMINA_REGEN_MS);
    const newStamina = Math.min(user.maxStamina, user.stamina + recovered);
    const newLastUpdate = now - (elapsed % STAMINA_REGEN_MS);
    db.run("UPDATE users SET stamina = ?, lastStaminaUpdate = ? WHERE id = ?", [newStamina, newLastUpdate, user.id]);
    return { ...user, stamina: newStamina, lastStaminaUpdate: newLastUpdate };
  }
  return user;
};

// --- ROUTES ---

// ... (Auth and User routes unchanged) ...
app.post('/api/auth/register', (req, res) => {
    const { username, password } = req.body;
    const now = Date.now();
    db.run(`INSERT INTO users (username, password, name, level, exp, maxExp, stamina, maxStamina, lastStaminaUpdate, money, starJewels) 
            VALUES (?, ?, 'Producer', 1, 0, 100, 50, 50, ?, 5000, 2500)`, 
            [username, password, now], 
            function(err) {
                if (err) return res.status(400).json({ error: "Username taken" });
                const userId = this.lastID;
                db.run(`INSERT INTO user_items VALUES (${userId}, 'staminaDrink', 3)`);
                db.run(`INSERT INTO user_items VALUES (${userId}, 'trainerTicket', 5)`);
                db.run("INSERT INTO presents (user_id, type, amount, description, received_at) VALUES (?, 'JEWEL', 500, 'Welcome Gift!', ?)", [userId, now]);
                res.json({ success: true, userId });
            });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (!row) return res.status(401).json({ error: "Invalid credentials" });
        res.json({ success: true, userId: row.id });
    });
});

app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (!user) return res.status(404).json({ error: "User not found" });
    user = recalcStamina(user);
    db.all("SELECT item_name, count FROM user_items WHERE user_id = ?", [userId], (err, items) => {
      const itemsMap = {};
      items.forEach(i => itemsMap[i.item_name] = i.count);
      const fullUser = {
        ...user,
        tickets: { gacha: itemsMap['gachaTicket'] || 0, skip: itemsMap['skipTicket'] || 0 },
        items: { staminaDrink: itemsMap['staminaDrink'] || 0, trainerTicket: itemsMap['trainerTicket'] || 0 }
      };
      res.json(fullUser);
    });
  });
});

app.get('/api/user/:id/idols', (req, res) => {
  const userId = req.params.id;
  const sql = `SELECT ui.id, ui.level, ui.isLocked, it.* FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.user_id = ?`;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const idols = rows.map(r => ({
      id: r.id, name: r.name, rarity: r.rarity, level: r.level, maxLevel: r.maxLevel,
      image: r.image, vocal: r.vocal, dance: r.dance, visual: r.visual, isLocked: !!r.isLocked
    }));
    res.json(idols);
  });
});

// --- BATTLE & DECK ROUTES ---

// Get User Deck
app.get('/api/user/:id/deck', (req, res) => {
    db.get("SELECT * FROM user_decks WHERE user_id = ?", [req.params.id], (err, row) => {
        if (!row) {
            // Return empty 4 slots
            return res.json([null, null, null, null]);
        }
        // Return exactly 4 items, null if empty or undefined
        const ids = [
            row.slot1_id || null, 
            row.slot2_id || null, 
            row.slot3_id || null, 
            row.slot4_id || null
        ];
        res.json(ids);
    });
});

// Save Deck
app.post('/api/deck', (req, res) => {
    const { userId, cardIds } = req.body; 
    
    // Ensure array has exactly 4 elements. Pad with null if missing.
    // If cardIds is undefined, treat as empty array.
    const safeIds = [...(cardIds || [])];
    while(safeIds.length < 4) safeIds.push(null);
    
    const [s1, s2, s3, s4] = safeIds;
    
    // INSERT OR REPLACE checks the PRIMARY KEY (user_id)
    const sql = `INSERT OR REPLACE INTO user_decks (user_id, slot1_id, slot2_id, slot3_id, slot4_id) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [userId, s1, s2, s3, s4], (err) => {
        if (err) {
            console.error("Deck Save Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true });
    });
});

// Matchmaking
app.get('/api/battle/match/:userId', (req, res) => {
    const mode = req.query.mode || 'BOT'; // 'BOT' or 'PVP'
    
    if (mode === 'BOT') {
        const botNames = ["P-San 902", "KiraraFan", "Producer X", "StaminaDrain", "RinP"];
        const randomName = botNames[Math.floor(Math.random() * botNames.length)];
        const randomLevel = Math.floor(Math.random() * 20) + 1;
        
        // Generate random 4 cards for bot
        db.all("SELECT * FROM idol_templates ORDER BY RANDOM() LIMIT 4", (err, rows) => {
            const cards = rows.map(r => ({
                name: r.name,
                image: r.image,
                rarity: r.rarity,
                totalStats: Math.floor((r.vocal + r.dance + r.visual) * (1 + (randomLevel * 0.05))) // Scale stats by level
            }));
            const totalPower = cards.reduce((sum, c) => sum + c.totalStats, 0);

            res.json({
                name: randomName,
                level: randomLevel,
                isBot: true,
                cards: cards,
                totalPower
            });
        });
    } else {
        // Simple PvP: Fetch a random user who has a deck and isn't me
        const sql = `
            SELECT u.name, u.level, ud.* 
            FROM users u 
            JOIN user_decks ud ON u.id = ud.user_id 
            WHERE u.id != ? 
            ORDER BY RANDOM() LIMIT 1
        `;
        db.get(sql, [req.params.userId], async (err, opponent) => {
            if (!opponent) {
                // Fallback to bot if no players found
                return res.redirect(`/api/battle/match/${req.params.userId}?mode=BOT`);
            }

            // Fetch card details for opponent deck
            const slots = [opponent.slot1_id, opponent.slot2_id, opponent.slot3_id, opponent.slot4_id].filter(Boolean);
            if(slots.length === 0) return res.redirect(`/api/battle/match/${req.params.userId}?mode=BOT`);

            // We need to fetch the specific user_idols stats (considering their level)
            const placeholder = slots.map(()=>'?').join(',');
            const cardSql = `
                SELECT it.name, it.image, it.rarity, it.vocal, it.dance, it.visual, ui.level
                FROM user_idols ui
                JOIN idol_templates it ON ui.template_id = it.id
                WHERE ui.id IN (${placeholder})
            `;
            
            db.all(cardSql, slots, (err, cardsData) => {
                const cards = cardsData.map(c => {
                    const baseTotal = c.vocal + c.dance + c.visual;
                    // Simple level scaling for demo: 5% per level
                    const scaledTotal = Math.floor(baseTotal * (1 + (c.level - 1) * 0.05));
                    return {
                        name: c.name,
                        image: c.image,
                        rarity: c.rarity,
                        totalStats: scaledTotal
                    };
                });
                const totalPower = cards.reduce((sum, c) => sum + c.totalStats, 0);

                res.json({
                    name: opponent.name,
                    level: opponent.level,
                    isBot: false,
                    cards,
                    totalPower
                });
            });
        });
    }
});

app.post('/api/battle/finish', (req, res) => {
    const { userId, won } = req.body;
    const rewards = { exp: 0, money: 0, jewels: 0 };

    if (won) {
        rewards.exp = 20;
        rewards.money = 1000;
        rewards.jewels = 10;
    } else {
        rewards.exp = 5;
        rewards.money = 100;
    }

    db.get("SELECT level, exp, maxExp FROM users WHERE id = ?", [userId], (err, user) => {
        let newExp = user.exp + rewards.exp;
        let newLevel = user.level;
        let newMaxExp = user.maxExp;
        if (newExp >= user.maxExp) {
            newLevel++;
            newExp = newExp - user.maxExp;
            newMaxExp = Math.floor(newMaxExp * 1.1);
        }

        db.run("UPDATE users SET money = money + ?, starJewels = starJewels + ?, exp = ?, level = ?, maxExp = ? WHERE id = ?", 
            [rewards.money, rewards.jewels, newExp, newLevel, newMaxExp, userId]);
        
        res.json({ success: true, rewards });
    });
});

// ... (Other endpoints kept same) ...

app.get('/api/event/active/:userId', (req, res) => {
    const userId = req.params.userId;
    const now = Date.now();
    db.get("SELECT * FROM events WHERE start_time <= ? AND end_time >= ? LIMIT 1", [now, now], (err, event) => {
        if (!event) return res.json({ isActive: false });
        db.get("SELECT points FROM event_points WHERE user_id = ? AND event_id = ?", [userId, event.id], (err, pointRow) => {
            const userPoints = pointRow ? pointRow.points : 0;
            db.all("SELECT * FROM event_rewards_def WHERE event_id = ? ORDER BY point_threshold ASC", [event.id], (err, rewards) => {
                db.all(`SELECT u.name, ep.points FROM event_points ep JOIN users u ON ep.user_id = u.id WHERE ep.event_id = ? ORDER BY ep.points DESC LIMIT 5`, [event.id], (err, ranking) => {
                    const rankingWithIndex = ranking.map((r, i) => ({ rank: i + 1, name: r.name, points: r.points }));
                    const mappedRewards = rewards.map(r => ({
                        pointThreshold: r.point_threshold,
                        rewardName: r.reward_name,
                        rewardAmount: r.reward_amount,
                        claimed: userPoints >= r.point_threshold
                    }));
                    res.json({
                        id: event.id, name: event.name, description: event.description, banner: event.banner,
                        startTime: event.start_time, endTime: event.end_time, isActive: true, userPoints,
                        rewards: mappedRewards,
                        ranking: rankingWithIndex
                    });
                });
            });
        });
    });
});

app.post('/api/event/work', (req, res) => {
    const { userId, eventId, staminaCost } = req.body;
    db.get("SELECT stamina, maxStamina, exp, level, maxExp FROM users WHERE id = ?", [userId], (err, user) => {
        if (user.stamina < staminaCost) return res.status(400).json({ error: "Not enough stamina" });
        const newStamina = user.stamina - staminaCost;
        let newExp = user.exp + (staminaCost * 2);
        let newLevel = user.level;
        let newMaxStamina = user.maxStamina;
        let leveledUp = false;
        if (newExp >= user.maxExp) {
            newLevel++; newExp = newExp - user.maxExp; newMaxStamina += 1; leveledUp = true;
        }
        db.run("UPDATE users SET stamina = ?, exp = ?, level = ?, maxStamina = ? WHERE id = ?", [newStamina, newExp, newLevel, newMaxStamina, userId]);
        const pointsGained = Math.floor(staminaCost * 10 + Math.random() * 20);
        db.get("SELECT points FROM event_points WHERE user_id = ? AND event_id = ?", [userId, eventId], (err, row) => {
            if (row) { db.run("UPDATE event_points SET points = points + ? WHERE user_id = ? AND event_id = ?", [pointsGained, userId, eventId]); } 
            else { db.run("INSERT INTO event_points VALUES (?, ?, ?)", [userId, eventId, pointsGained]); }
            res.json({ success: true, pointsGained, newStamina, leveledUp, newLevel });
        });
    });
});

app.get('/api/commu/chapters', (req, res) => {
    const { type, userId } = req.query;
    const config = getGameConfig();
    let chapters = config.chapters || [];
    if (type) { chapters = chapters.filter(c => c.type === type); }
    if (!userId) { return res.json(chapters.map(c => ({ ...c, isRead: false }))); }
    db.all("SELECT chapter_id FROM user_read_chapters WHERE user_id = ?", [userId], (err, readRows) => {
        if (err) return res.status(500).json({ error: err.message });
        const readIds = new Set(readRows.map(r => r.chapter_id));
        const response = chapters.map(c => ({ ...c, isRead: readIds.has(c.id) }));
        res.json(response);
    });
});

app.get('/api/commu/dialogs/:chapterId', (req, res) => {
    const config = getGameConfig();
    const chapter = config.chapters.find(c => c.id === req.params.chapterId);
    if (chapter && chapter.dialogs) { res.json(chapter.dialogs); } else { db.all("SELECT * FROM dialogs WHERE chapter_id = ? ORDER BY sort_order ASC", [req.params.chapterId], (err, rows) => { res.json(rows || []); }); }
});

app.post('/api/commu/read', (req, res) => {
    const { userId, chapterId } = req.body;
    db.run("INSERT OR IGNORE INTO user_read_chapters (user_id, chapter_id, read_at) VALUES (?, ?, ?)", [userId, chapterId, Date.now()], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/fan/chapters', (req, res) => {
    const sql = `SELECT fc.*, u.username as authorName FROM fan_chapters fc LEFT JOIN users u ON fc.user_id = u.id ORDER BY fc.created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows.map(r => ({ ...r, type: 'FANMADE' })));
    });
});

app.get('/api/fan/dialogs/:chapterId', (req, res) => {
    db.all("SELECT * FROM fan_dialogs WHERE chapter_id = ? ORDER BY sort_order ASC", [req.params.chapterId], (err, rows) => {
        const mappedRows = rows.map(r => ({ ...r, customSpriteUrl: r.custom_sprite_url }));
        res.json(mappedRows);
    });
});

app.post('/api/fan/create', (req, res) => {
    const { userId, title, dialogs } = req.body;
    db.run("INSERT INTO fan_chapters (user_id, title, created_at) VALUES (?, ?, ?)", [userId, title, Date.now()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const chapterId = this.lastID;
        const stmt = db.prepare("INSERT INTO fan_dialogs (chapter_id, speaker, text, expression, sort_order, custom_sprite_url) VALUES (?, ?, ?, ?, ?, ?)");
        dialogs.forEach((d, index) => {
            stmt.run(chapterId, d.speaker, d.text, d.expression || 'neutral', index, d.customSpriteUrl || null);
        });
        stmt.finalize();
        res.json({ success: true, chapterId });
    });
});

app.post('/api/fan/sprite', (req, res) => {
    const { userId, name, image } = req.body;
    if(!image) return res.status(400).json({error: "No image"});
    db.run("INSERT INTO user_sprites (user_id, name, url) VALUES (?, ?, ?)", [userId, name, image], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.get('/api/fan/sprites/:userId', (req, res) => {
    db.all("SELECT id, name, url FROM user_sprites WHERE user_id = ?", [req.params.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/gacha', (req, res) => {
  const { userId, count } = req.body; 
  const cost = count === 10 ? 2500 : 250;
  db.get("SELECT starJewels FROM users WHERE id = ?", [userId], (err, row) => {
    if (!row || row.starJewels < cost) return res.status(400).json({ error: "Not enough jewels" });
    const newJewels = row.starJewels - cost;
    db.run("UPDATE users SET starJewels = ? WHERE id = ?", [newJewels, userId]);
    db.all("SELECT * FROM idol_templates", (err, templates) => {
      if (!templates || templates.length === 0) return res.status(500).json({error: "Gacha Data Not Ready"});
      const pulledIdols = [];
      const stmt = db.prepare("INSERT INTO user_idols (id, user_id, template_id, level, isLocked) VALUES (?, ?, ?, 1, 0)");
      const poolSSR = templates.filter(t => t.rarity === 'SSR');
      const poolSR = templates.filter(t => t.rarity === 'SR');
      const poolR = templates.filter(t => t.rarity === 'R');
      const poolN = templates.filter(t => t.rarity === 'N');
      for(let i=0; i<count; i++) {
        const rand = Math.random() * 100;
        let pool = poolN;
        if (rand <= 3) pool = poolSSR;
        else if (rand <= 12) pool = poolSR;
        else if (rand <= 90) pool = poolR;
        if (pool.length === 0) pool = templates;
        const template = pool[Math.floor(Math.random() * pool.length)];
        const instanceId = `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`;
        stmt.run(instanceId, userId, template.id);
        pulledIdols.push({ ...template, id: instanceId, level: 1, isLocked: false });
      }
      stmt.finalize();
      res.json({ newJewels, pulledIdols });
    });
  });
});

app.post('/api/item/use', (req, res) => {
  const { userId, item } = req.body;
  if (item === 'staminaDrink') {
    db.run("UPDATE user_items SET count = count - 1 WHERE user_id = ? AND item_name = 'staminaDrink'", [userId]);
    db.run("UPDATE users SET stamina = stamina + 20 WHERE id = ?", [userId]);
    res.json({ success: true });
  } else { res.status(400).json({ error: "Invalid item" }); }
});

app.post('/api/shop/buy', (req, res) => {
  const { userId, item, cost } = req.body;
  db.get("SELECT starJewels FROM users WHERE id = ?", [userId], (err, row) => {
    if (row.starJewels < cost) return res.status(400).json({ error: "Not enough jewels" });
    db.run("UPDATE users SET starJewels = starJewels - ? WHERE id = ?", [cost, userId]);
    db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = ?", [userId, item], (err, iRow) => {
        if (iRow) db.run("UPDATE user_items SET count = count + 1 WHERE user_id = ? AND item_name = ?", [userId, item]);
        else db.run("INSERT INTO user_items VALUES (?, ?, 1)", [userId, item]);
        res.json({ success: true });
    });
  });
});

app.post('/api/idol/train', (req, res) => {
  const { userId, idolId } = req.body;
  db.run("UPDATE user_items SET count = count - 1 WHERE user_id = ? AND item_name = 'trainerTicket'", [userId]);
  db.run("UPDATE user_idols SET level = level + 1 WHERE id = ?", [idolId]);
  res.json({ success: true });
});

app.post('/api/idol/retire', (req, res) => {
  const { userId, ids } = req.body;
  const placeholders = ids.map(() => '?').join(',');
  const gain = ids.length * 500;
  db.run(`DELETE FROM user_idols WHERE id IN (${placeholders})`, ids, (err) => {
     db.run("UPDATE users SET money = money + ? WHERE id = ?", [gain, userId]);
     res.json({ success: true, moneyGain: gain });
  });
});

app.post('/api/promo/redeem', (req, res) => {
    const { userId, code } = req.body;
    const now = Date.now();
    const config = getGameConfig();
    const promo = config.promoCodes.find(p => p.code === code);
    if (!promo) return res.json({ success: false, error: "Invalid Code" });
    if (now < promo.startTime) return res.json({ success: false, error: "Code not yet active" });
    if (now > promo.endTime) return res.json({ success: false, error: "Code expired" });

    if (promo.isSingleUse) {
        db.get("SELECT * FROM promo_usage WHERE user_id = ? AND code = ?", [userId, code], (err, usage) => {
            if (usage) return res.json({ success: false, error: "You already used this code" });
            if (promo.type === 'UNIQUE') {
                db.get("SELECT * FROM promo_usage WHERE code = ?", [code], (err, anyUsage) => {
                    if (anyUsage) return res.json({ success: false, error: "Code already claimed by someone else" });
                    applyReward(true);
                });
            } else {
                applyReward(true);
            }
        });
    } else {
        applyReward(false);
    }

    function applyReward(shouldRecordUsage) {
         if (shouldRecordUsage) {
             db.run("INSERT INTO promo_usage (user_id, code, used_at) VALUES (?, ?, ?)", [userId, code, now]);
         }
         db.run("INSERT INTO presents (user_id, type, amount, description, received_at) VALUES (?, ?, ?, ?, ?)", 
            [userId, promo.rewardType, promo.rewardAmount, `Promo: ${code}`, now]);
         res.json({ success: true, message: "Reward sent to Present Box!" });
    }
});

app.get('/api/user/:id/presents', (req, res) => {
    db.all("SELECT * FROM presents WHERE user_id = ? ORDER BY received_at DESC", [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const mapped = rows.map(r => ({ id: r.id, type: r.type, amount: r.amount, description: r.description, receivedAt: r.received_at }));
        res.json(mapped);
    });
});

app.post('/api/user/:id/presents/claim', (req, res) => {
    const { userId, presentId } = req.body;
    db.get("SELECT * FROM presents WHERE id = ? AND user_id = ?", [presentId, userId], (err, present) => {
        if(!present) return res.status(404).json({error: "Present not found"});
        if (present.type === 'MONEY') { db.run("UPDATE users SET money = money + ? WHERE id = ?", [present.amount, userId]); } 
        else if (present.type === 'JEWEL') { db.run("UPDATE users SET starJewels = starJewels + ? WHERE id = ?", [present.amount, userId]); } 
        else if (present.type.includes('ITEM')) {
            const itemName = 'staminaDrink'; 
             db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = ?", [userId, itemName], (err, iRow) => {
                if (iRow) db.run("UPDATE user_items SET count = count + ? WHERE user_id = ? AND item_name = ?", [present.amount, userId, itemName]);
                else db.run("INSERT INTO user_items VALUES (?, ?, ?)", [userId, itemName, present.amount]);
             });
        }
        db.run("DELETE FROM presents WHERE id = ?", [presentId], (err) => {
            if(err) return res.status(500).json({error: "Delete failed"});
            res.json({success: true});
        });
    });
});

app.get('/api/announcements', (req, res) => {
    db.all("SELECT * FROM announcements ORDER BY date DESC", [], (err, rows) => {
         if (err) return res.status(500).json({ error: err.message });
         res.json(rows);
    });
});

app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
  syncIdolData();
});
