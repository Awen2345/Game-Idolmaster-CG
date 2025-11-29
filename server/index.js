
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
    // 1. Check if we need to force update
    db.get("SELECT count(*) as count FROM idol_templates WHERE type IN ('COOL', 'PASSION')", (err, row) => {
        const hasVariety = row && row.count > 0;
        
        db.get("SELECT count(*) as total FROM idol_templates", async (err, row) => {
            const total = row ? row.total : 0;

            // Trigger update if:
            // 1. Data exists but no variety (All Cute bug)
            // 2. Data exists but fewer than 2000 cards (We want MAX cards now)
            const needsUpdate = (total > 0 && !hasVariety) || (total > 0 && total < 2000);

            if (total > 0 && !needsUpdate) {
                console.log(`Idol database is healthy (${total} cards).`);
                return;
            }

            if (needsUpdate) {
                console.log(`Database needs update (Count: ${total}). Purging to resync ALL cards...`);
                await new Promise(resolve => db.run("DELETE FROM idol_templates", resolve));
            }

            console.log("Fetching Idol Data from Starlight Stage API...");
            try {
                 // Fetch keys required for the game
                 const response = await fetch("https://starlight.kirara.ca/api/v1/list/card_t?keys=id,name,rarity_dep,attribute,vocal_max,dance_max,visual_max");
                 if (!response.ok) throw new Error("API Fetch failed");
                 
                 const json = await response.json();
                 let cards = json.result;
    
                 if (!cards) return;
    
                 // Filter for N (1), R (3), SR (5), SSR (7)
                 cards = cards.filter(c => [1, 3, 5, 7].includes(c.rarity_dep.rarity));
    
                 // SHUFFLE the cards (Optional, but good for randomness if we ever limit again)
                 for (let i = cards.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [cards[i], cards[j]] = [cards[j], cards[i]];
                 }
    
                 // REMOVED LIMIT: Fetch everything!
                 const selectedCards = cards; 
    
                 const stmt = db.prepare("INSERT OR IGNORE INTO idol_templates (id, name, rarity, type, maxLevel, image, vocal, dance, visual, attack, defense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                 
                 let count = 0;
                 for (const card of selectedCards) {
                     const rId = card.rarity_dep.rarity;
    
                     let rarity = 'N';
                     let maxLevel = 20;
                     if (rId === 1) { rarity = 'N'; maxLevel = 20; }
                     if (rId === 3) { rarity = 'R'; maxLevel = 40; }
                     if (rId === 5) { rarity = 'SR'; maxLevel = 70; }
                     if (rId === 7) { rarity = 'SSR'; maxLevel = 90; }
    
                     const image = `https://hidamarirhodonite.kirara.ca/card/${card.id}.png`;
                     
                     // SAFE ATTRIBUTE MAPPING
                     const rawAttr = String(card.attribute || '').toLowerCase();
                     
                     let type = 'CUTE'; // Default
                     if (rawAttr === 'cool') type = 'COOL';
                     if (rawAttr === 'passion') type = 'PASSION';
    
                     // Calculate Stats
                     const totalStats = card.vocal_max + card.dance_max + card.visual_max;
                     const attack = Math.floor(totalStats * 0.6);
                     const defense = Math.floor(totalStats * 0.4);
    
                     stmt.run(
                         card.id.toString(), 
                         card.name, 
                         rarity,
                         type, 
                         maxLevel, 
                         image, 
                         card.vocal_max, 
                         card.dance_max, 
                         card.visual_max,
                         attack,
                         defense
                     );
                     count++;
                 }
                 stmt.finalize();
                 console.log(`Successfully populated ${count} mixed idols (N/R/SR/SSR) from API.`);
            } catch (e) {
                console.error("Failed to sync idols:", e);
            }
        });
    });
};

const getGameConfig = () => {
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { 
            chapters: [], 
            promoCodes: [], 
            loginBonus: { resetHour: 0, cycleDays: 7, rewards: [] },
            gacha: { bannerName: "Universal", rates: { SSR: 3, SR: 12, R: 85, N: 0 } }
        };
    }
};

const recalcStamina = (user) => {
  if (!user) return null;
  const now = Date.now();
  const lastUpdate = user.lastStaminaUpdate || now; // Safety default
  
  if (user.stamina >= user.maxStamina) {
       // Just update timestamp if full to prevent clock drift
       return { ...user, lastStaminaUpdate: now };
  }
  
  const elapsed = now - lastUpdate;
  if (elapsed >= STAMINA_REGEN_MS) {
    const recovered = Math.floor(elapsed / STAMINA_REGEN_MS);
    const newStamina = Math.min(user.maxStamina, user.stamina + recovered);
    const newLastUpdate = now - (elapsed % STAMINA_REGEN_MS);
    
    // Perform async update (fire and forget for response speed, but logs errors)
    db.run("UPDATE users SET stamina = ?, lastStaminaUpdate = ? WHERE id = ?", [newStamina, newLastUpdate, user.id], (err) => {
        if(err) console.error("Stamina Update Error:", err);
    });
    
    return { ...user, stamina: newStamina, lastStaminaUpdate: newLastUpdate };
  }
  return user;
};

// --- AUTH ROUTES ---

app.post('/api/auth/register', (req, res) => {
    const { username, password, type } = req.body;
    const prodType = type || 'CUTE'; // Default
    const now = Date.now();
    
    db.run(`INSERT INTO users (username, password, name, type, level, exp, maxExp, stamina, maxStamina, lastStaminaUpdate, money, starJewels) 
            VALUES (?, ?, 'Producer', ?, 1, 0, 100, 50, 50, ?, 5000, 2500)`, 
            [username, password, prodType, now], 
            function(err) {
                if (err) return res.status(400).json({ error: "Username taken" });
                const userId = this.lastID;
                
                // Initialize Items
                db.run(`INSERT INTO user_items VALUES (${userId}, 'staminaDrink', 3)`);
                db.run(`INSERT INTO user_items VALUES (${userId}, 'trainerTicket', 5)`);
                
                // Initialize Work Progress
                db.run(`INSERT INTO work_progress (user_id, current_zone_id, progress_percent) VALUES (?, 1, 0)`, [userId]);

                // Determine Starter Card
                let starterId = '100001'; // Uzuki
                if (prodType === 'COOL') starterId = '100002'; // Rin
                if (prodType === 'PASSION') starterId = '100003'; // Mio
                
                const instanceId = `${now}-STARTER`;
                db.run("INSERT INTO user_idols (id, user_id, template_id, level, isLocked, affection) VALUES (?, ?, ?, 1, 1, 0)", [instanceId, userId, starterId]);

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

app.post('/api/user/login_bonus', (req, res) => {
    const { userId, action } = req.body; // action: 'check' or 'claim'
    const config = getGameConfig();
    const loginConfig = config.loginBonus || { resetHour: 0, rewards: [] };

    db.get("SELECT last_login_date, login_streak FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.status(404).json({ error: "User not found" });

        const now = new Date();
        const lastLogin = new Date(user.last_login_date || 0);

        // --- DAILY RESET LOGIC ---
        const resetHour = loginConfig.resetHour || 0;

        const getGameDateString = (dateObj) => {
            const adjustedDate = new Date(dateObj);
            adjustedDate.setHours(adjustedDate.getHours() - resetHour);
            return adjustedDate.toDateString(); 
        };

        const todayGameDate = getGameDateString(now);
        const lastLoginGameDate = getGameDateString(lastLogin);

        // Compare
        const isNewDay = todayGameDate !== lastLoginGameDate;

        // If action is just CHECK, return status
        if (action === 'check') {
             return res.json({ 
                 canClaim: isNewDay, 
                 streak: (user.login_streak || 0) 
             });
        }

        // If action is CLAIM
        if (!isNewDay) {
            const currentStreak = user.login_streak || 1;
            const cycleDay = ((currentStreak - 1) % 7) + 1;
            const todayReward = loginConfig.rewards.find(r => r.day === cycleDay) || loginConfig.rewards[0];
            return res.json({
                claimedToday: true, 
                streak: currentStreak,
                todayConfig: todayReward,
                allRewards: loginConfig.rewards
            });
        }

        // --- PROCESS NEW CLAIM ---
        const newStreak = (user.login_streak || 0) + 1;
        const cycleDay = ((newStreak - 1) % 7) + 1;
        const reward = loginConfig.rewards.find(r => r.day === cycleDay) || { type: 'MONEY', amount: 1000, message: 'Bonus' };

        // Give Reward
        if (reward.type === 'MONEY') {
            db.run("UPDATE users SET money = money + ? WHERE id = ?", [reward.amount, userId]);
        } else if (reward.type === 'JEWEL') {
            db.run("UPDATE users SET starJewels = starJewels + ? WHERE id = ?", [reward.amount, userId]);
        } else if (reward.type.startsWith('ITEM')) {
            const itemMap = { 'ITEM_TICKET': 'trainerTicket', 'ITEM_STAMINA': 'staminaDrink' };
            const item = itemMap[reward.type];
            db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = ?", [userId, item], (err, iRow) => {
                if (iRow) db.run("UPDATE user_items SET count = count + ? WHERE user_id = ? AND item_name = ?", [reward.amount, userId, item]);
                else db.run("INSERT INTO user_items VALUES (?, ?, ?)", [userId, item, reward.amount]);
            });
        }

        db.run("UPDATE users SET last_login_date = ?, login_streak = ? WHERE id = ?", [Date.now(), newStreak, userId]);

        res.json({
            claimedToday: false, 
            streak: newStreak,
            todayConfig: reward,
            allRewards: loginConfig.rewards
        });
    });
});

// --- USER DATA ROUTES ---

app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) return res.status(500).json({ error: "Database error", details: err.message });
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Safe recalc
    user = recalcStamina(user);
    
    db.all("SELECT item_name, count FROM user_items WHERE user_id = ?", [userId], (err, items) => {
      if(err) return res.json(user);
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
  const sql = `SELECT ui.id, ui.level, ui.isLocked, ui.affection, ui.star_rank, ui.is_awakened, it.* FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.user_id = ?`;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const idols = rows.map(r => {
        const isAwakened = !!r.is_awakened;
        const multiplier = isAwakened ? 1.2 : 1.0;
        const maxLevel = isAwakened ? r.maxLevel + 10 : r.maxLevel;

        return {
          id: r.id, name: r.name, rarity: r.rarity, type: r.type, level: r.level, maxLevel: maxLevel,
          image: r.image, vocal: Math.floor(r.vocal * multiplier), dance: Math.floor(r.dance * multiplier), visual: Math.floor(r.visual * multiplier),
          attack: Math.floor(r.attack * multiplier), defense: Math.floor(r.defense * multiplier),
          affection: r.affection, maxAffection: r.maxLevel, 
          isLocked: !!r.isLocked, starRank: r.star_rank, isAwakened: isAwakened
        };
    });
    res.json(idols);
  });
});

// --- PRESENTS & ANNOUNCEMENTS ---

app.get('/api/user/:id/presents', (req, res) => {
    db.all("SELECT * FROM presents WHERE user_id = ?", [req.params.id], (err, rows) => {
        res.json(rows ? rows.map(r => ({ ...r, receivedAt: r.received_at })) : []);
    });
});

app.post('/api/user/:id/presents/claim', (req, res) => {
    const { userId, presentId } = req.body;
    db.get("SELECT * FROM presents WHERE id = ? AND user_id = ?", [presentId, userId], (err, p) => {
        if (!p) return res.json({ success: false });

        if (p.type === 'MONEY') db.run("UPDATE users SET money = money + ? WHERE id = ?", [p.amount, userId]);
        else if (p.type === 'JEWEL') db.run("UPDATE users SET starJewels = starJewels + ? WHERE id = ?", [p.amount, userId]);
        else if (p.type === 'ITEM_STAMINA') {
             db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, 'staminaDrink', ?) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + ?", [userId, p.amount, p.amount]);
        }
        else if (p.type === 'ITEM_TICKET') {
             db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, 'trainerTicket', ?) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + ?", [userId, p.amount, p.amount]);
        }

        db.run("DELETE FROM presents WHERE id = ?", [presentId]);
        res.json({ success: true });
    });
});

app.get('/api/announcements', (req, res) => {
    db.all("SELECT * FROM announcements ORDER BY date DESC", (err, rows) => {
        res.json(rows || []);
    });
});

// --- WORK SYSTEM ---

app.get('/api/work/status/:userId', (req, res) => {
    const userId = req.params.userId;
    db.get("SELECT wp.current_zone_id, wp.progress_percent, wz.area_name, wz.zone_name, wz.stamina_cost FROM work_progress wp JOIN work_zones wz ON wp.current_zone_id = wz.id WHERE wp.user_id = ?", [userId], (err, row) => {
        if (!row) {
             db.run("INSERT OR IGNORE INTO work_progress (user_id, current_zone_id, progress_percent) VALUES (?, 1, 0)", [userId]);
             return res.json({ area_name: 'Harajuku', zone_name: 'Area 1-1', progress_percent: 0, stamina_cost: 2 });
        }
        res.json(row);
    });
});

app.post('/api/work/execute', (req, res) => {
    const { userId } = req.body;
    db.get("SELECT stamina, maxStamina FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.json({ error: "User not found" });
        
        db.get("SELECT wp.*, wz.stamina_cost, wz.exp_gain FROM work_progress wp JOIN work_zones wz ON wp.current_zone_id = wz.id WHERE wp.user_id = ?", [userId], (err, progress) => {
            if (!progress) return res.json({ error: "Progress not found" });
            if (user.stamina < progress.stamina_cost) return res.json({ error: "Not enough stamina" });

            const newStamina = user.stamina - progress.stamina_cost;
            const expGained = progress.exp_gain;
            const moneyGained = Math.floor(Math.random() * 100) + 50;
            const affectionGained = 1;
            
            let newProgress = progress.progress_percent + 10;
            let isZoneClear = false;
            let currentZone = progress.current_zone_id;

            if (newProgress >= 100) {
                newProgress = 0;
                currentZone += 1; 
                isZoneClear = true;
            }

            let drop = null;
            if (Math.random() < 0.1) {
                drop = { type: 'ITEM', name: 'Stamina Drink' };
                db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, 'staminaDrink', 1) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + 1", [userId]);
            }

            db.serialize(() => {
                db.run("UPDATE users SET stamina = ?, exp = exp + ?, money = money + ? WHERE id = ?", [newStamina, expGained, moneyGained, userId]);
                db.run("UPDATE work_progress SET current_zone_id = ?, progress_percent = ? WHERE user_id = ?", [currentZone, newProgress, userId]);
                
                db.get("SELECT id FROM user_idols WHERE user_id = ? ORDER BY RANDOM() LIMIT 1", [userId], (err, idol) => {
                    if (idol) db.run("UPDATE user_idols SET affection = affection + ? WHERE id = ?", [affectionGained, idol.id]);
                });
            });

            res.json({ success: true, newStamina, expGained, moneyGained, affectionGained, progress: newProgress, isZoneClear, isLevelUp: false, drops: drop });
        });
    });
});

// --- IDOL MANAGEMENT ---

app.post('/api/idol/train', (req, res) => {
    const { userId, idolId } = req.body;
    db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = 'trainerTicket'", [userId], (err, row) => {
        if (!row || row.count < 1) return res.json({ error: "No Trainer Tickets!" });
        
        const sql = `UPDATE user_idols SET level = level + 1 WHERE id = ? AND level < (SELECT maxLevel FROM idol_templates WHERE id = user_idols.template_id) + (CASE WHEN is_awakened = 1 THEN 10 ELSE 0 END)`;
        db.run(sql, [idolId], function(err) {
             if (this.changes > 0) {
                 db.run("UPDATE user_items SET count = count - 1 WHERE user_id = ? AND item_name = 'trainerTicket'", [userId]);
                 res.json({ success: true });
             } else {
                 res.json({ error: "Idol already Max Level or not found" });
             }
        });
    });
});

app.post('/api/idol/special_training', (req, res) => {
    const { userId, idolId } = req.body;
    db.run("UPDATE user_idols SET is_awakened = 1, level = 1 WHERE id = ? AND user_id = ? AND is_awakened = 0", [idolId, userId], function(err) {
        if(this.changes > 0) res.json({ success: true });
        else res.json({ error: "Special Training Failed. Idol might already be awakened." });
    });
});

app.post('/api/idol/star_lesson', (req, res) => {
    const { userId, targetId, partnerId } = req.body;
    if(targetId === partnerId) return res.json({ error: "Cannot use same idol" });
    db.get("SELECT template_id FROM user_idols WHERE id = ?", [targetId], (err, target) => {
        db.get("SELECT template_id FROM user_idols WHERE id = ?", [partnerId], (err, partner) => {
             if(target && partner && target.template_id === partner.template_id) {
                 db.run("UPDATE user_idols SET star_rank = star_rank + 1 WHERE id = ?", [targetId]);
                 db.run("DELETE FROM user_idols WHERE id = ?", [partnerId]);
                 res.json({ success: true });
             } else {
                 res.json({ error: "Idols do not match or not found" });
             }
        });
    });
});

app.post('/api/idol/retire', (req, res) => {
    const { userId, ids } = req.body;
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM user_idols WHERE user_id = ? AND id IN (${placeholders})`, [userId, ...ids], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        const moneyEarned = this.changes * 1000;
        db.run("UPDATE users SET money = money + ? WHERE id = ?", [moneyEarned, userId]);
        res.json({ success: true, moneyEarned });
    });
});

// --- GACHA & SHOP & ITEMS ---

app.get('/api/gacha/history/:userId', (req, res) => {
    db.all("SELECT * FROM gacha_history WHERE user_id = ? ORDER BY pulled_at DESC LIMIT 50", [req.params.userId], (err, rows) => {
        res.json(rows || []);
    });
});

app.get('/api/gacha/details', (req, res) => {
    const config = getGameConfig();
    const rates = config.gacha?.rates || { SSR: 3, SR: 12, R: 85 };
    
    db.all("SELECT id, name, rarity, type, image, vocal, dance, visual FROM idol_templates", (err, rows) => {
        // Return valid structure even if rows empty
        if (!rows) return res.json({ rates, pool: [] });
        if (err) return res.json({ rates, pool: [] });
        res.json({ rates, pool: rows });
    });
});

app.post('/api/gacha', (req, res) => {
    const { userId, count } = req.body;
    const cost = count === 10 ? 2500 : 250;
    
    const config = getGameConfig();
    const gachaConf = config.gacha || { rates: { SSR: 3, SR: 12, R: 85, N: 0 } };
    const rates = gachaConf.rates;

    db.get("SELECT starJewels FROM users WHERE id = ?", [userId], (err, row) => {
        if (!row || row.starJewels < cost) return res.json({ error: "Not enough jewels" });
        
        db.all("SELECT * FROM idol_templates", (err, templates) => {
            if (!templates || templates.length === 0) return res.json({ error: "No idols in database" });
            
            const pulled = [];
            for (let i = 0; i < count; i++) {
                const rand = Math.random() * 100;
                let rarity = 'N'; 
                
                if (rand < rates.SSR) rarity = 'SSR';
                else if (rand < (rates.SSR + rates.SR)) rarity = 'SR';
                else if (rand < (rates.SSR + rates.SR + rates.R)) rarity = 'R';
                else rarity = 'N';

                const pool = templates.filter(t => t.rarity === rarity);
                const finalPool = pool.length > 0 ? pool : templates;
                
                const selected = finalPool[Math.floor(Math.random() * finalPool.length)];
                
                const instanceId = `${Date.now()}-${i}-${Math.floor(Math.random()*1000)}`;
                pulled.push({ ...selected, instanceId });
            }

            // Save to User Idols
            const stmt = db.prepare("INSERT INTO user_idols (id, user_id, template_id, level, isLocked, affection) VALUES (?, ?, ?, 1, 0, 0)");
            pulled.forEach(p => stmt.run(p.instanceId, userId, p.id));
            stmt.finalize();

            // Save to Gacha History
            const histStmt = db.prepare("INSERT INTO gacha_history (user_id, idol_id, idol_name, rarity, pulled_at) VALUES (?, ?, ?, ?, ?)");
            const now = Date.now();
            pulled.forEach(p => histStmt.run(userId, p.id, p.name, p.rarity, now));
            histStmt.finalize();

            const newJewels = row.starJewels - cost;
            db.run("UPDATE users SET starJewels = ? WHERE id = ?", [newJewels, userId]);

            res.json({ newJewels, pulledIdols: pulled.map(p => ({
                id: p.instanceId, name: p.name, rarity: p.rarity, type: p.type, 
                level: 1, maxLevel: p.maxLevel, image: p.image, 
                vocal: p.vocal, dance: p.dance, visual: p.visual,
                attack: p.attack, defense: p.defense, affection: 0, maxAffection: p.maxLevel,
                isLocked: false, starRank: 1, isAwakened: false
            })) });
        });
    });
});

app.post('/api/shop/buy', (req, res) => {
    const { userId, item, cost } = req.body;
    db.get("SELECT starJewels FROM users WHERE id = ?", [userId], (err, user) => {
        if (user.starJewels < cost) return res.json({ error: "Not enough jewels" });
        db.run("UPDATE users SET starJewels = starJewels - ? WHERE id = ?", [cost, userId]);
        db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, ?, 1) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + 1", [userId, item]);
        res.json({ success: true });
    });
});

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
        } else {
             res.json({ success: true, message: "Item used" });
        }
    });
});

// --- EVENTS ---

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
    db.get("SELECT stamina FROM users WHERE id = ?", [userId], (err, user) => {
        if (user.stamina < staminaCost) return res.json({ error: "Not enough stamina" });
        
        const pointsGained = Math.floor(Math.random() * 50) + 50;
        db.run("UPDATE users SET stamina = stamina - ? WHERE id = ?", [staminaCost, userId]);
        db.run("INSERT INTO event_points (user_id, event_id, points) VALUES (?, ?, ?) ON CONFLICT(user_id, event_id) DO UPDATE SET points = points + ?", [userId, eventId, pointsGained, pointsGained]);
        res.json({ success: true, pointsGained });
    });
});

// --- COMMU & FANMADE ---

app.get('/api/commu/chapters', (req, res) => {
    const { type, userId } = req.query;
    const config = getGameConfig();
    
    if (type === 'FANMADE') {
        db.all("SELECT * FROM fan_chapters ORDER BY created_at DESC", (err, rows) => {
            const chapters = rows.map(r => ({
                id: r.id.toString(), title: r.title, type: 'FANMADE', isRead: false
            }));
            res.json(chapters);
        });
        return;
    }

    db.all("SELECT chapter_id FROM user_read_chapters WHERE user_id = ?", [userId], (err, rows) => {
        const readIds = new Set(rows ? rows.map(r => r.chapter_id) : []);
        const filtered = config.chapters.filter(c => c.type === type).map(c => ({
            ...c, isRead: readIds.has(c.id)
        }));
        res.json(filtered);
    });
});

app.get('/api/commu/dialogs/:id', (req, res) => {
    const chapterId = req.params.id;
    const config = getGameConfig();
    const chapter = config.chapters.find(c => c.id === chapterId);
    if (chapter) return res.json(chapter.dialogs);

    db.all("SELECT * FROM fan_dialogs WHERE chapter_id = ? ORDER BY sort_order ASC", [chapterId], (err, rows) => {
        if (rows && rows.length > 0) {
            const dialogs = rows.map(r => ({
                speaker: r.speaker, text: r.text, expression: r.expression, customSpriteUrl: r.custom_sprite_url
            }));
            res.json(dialogs);
        } else {
            res.json([]);
        }
    });
});

app.post('/api/commu/read', (req, res) => {
    const { userId, chapterId } = req.body;
    db.run("INSERT OR IGNORE INTO user_read_chapters (user_id, chapter_id, read_at) VALUES (?, ?, ?)", [userId, chapterId, Date.now()]);
    res.json({ success: true });
});

app.post('/api/fan/create', (req, res) => {
    const { userId, title, dialogs } = req.body;
    db.run("INSERT INTO fan_chapters (user_id, title, created_at) VALUES (?, ?, ?)", [userId, title, Date.now()], function(err) {
        if (err) return res.json({ success: false });
        const chapterId = this.lastID;
        const stmt = db.prepare("INSERT INTO fan_dialogs (chapter_id, speaker, text, expression, sort_order, custom_sprite_url) VALUES (?, ?, ?, ?, ?, ?)");
        dialogs.forEach((d, i) => stmt.run(chapterId, d.speaker, d.text, d.expression, i, d.customSpriteUrl || null));
        stmt.finalize();
        res.json({ success: true });
    });
});

app.get('/api/fan/sprites/:userId', (req, res) => {
    db.all("SELECT * FROM user_sprites WHERE user_id = ?", [req.params.userId], (err, rows) => {
        res.json(rows || []);
    });
});

app.post('/api/fan/sprite', (req, res) => {
    const { userId, name, image } = req.body;
    db.run("INSERT INTO user_sprites (user_id, name, url) VALUES (?, ?, ?)", [userId, name, image], (err) => {
        res.json({ success: !err });
    });
});

// --- PROMO & BATTLE ---

app.post('/api/promo/redeem', (req, res) => {
    const { userId, code } = req.body;
    const config = getGameConfig();
    const promo = config.promoCodes.find(p => p.code === code);
    
    if (!promo) return res.json({ error: "Invalid Code" });
    if (Date.now() < promo.startTime || Date.now() > promo.endTime) return res.json({ error: "Code Expired" });

    if (promo.isSingleUse) {
        db.get("SELECT * FROM promo_usage WHERE user_id = ? AND code = ?", [userId, code], (err, row) => {
            if (row) return res.json({ error: "Already used" });
            db.run("INSERT INTO promo_usage VALUES (?, ?, ?)", [userId, code, Date.now()]);
            grantReward(userId, promo.rewardType, promo.rewardAmount);
            res.json({ success: true, message: `Redeemed ${promo.rewardAmount} ${promo.rewardType}!` });
        });
    } else {
        grantReward(userId, promo.rewardType, promo.rewardAmount);
        res.json({ success: true, message: `Redeemed ${promo.rewardAmount} ${promo.rewardType}!` });
    }
});

function grantReward(userId, type, amount) {
    db.run("INSERT INTO presents (user_id, type, amount, description, received_at) VALUES (?, ?, ?, 'Promo Code Reward', ?)", [userId, type, amount, Date.now()]);
}

app.get('/api/user/:id/deck', (req, res) => {
    db.get("SELECT slot1_id, slot2_id, slot3_id, slot4_id FROM user_decks WHERE user_id = ?", [req.params.id], (err, row) => {
        if (!row) return res.json([null, null, null, null]);
        res.json([row.slot1_id, row.slot2_id, row.slot3_id, row.slot4_id]);
    });
});

app.post('/api/deck', (req, res) => {
    const { userId, cardIds } = req.body;
    const safeIds = [...cardIds];
    while(safeIds.length < 4) safeIds.push(null);
    db.run(`INSERT OR REPLACE INTO user_decks (user_id, slot1_id, slot2_id, slot3_id, slot4_id) VALUES (?, ?, ?, ?, ?)`, [userId, ...safeIds], (err) => {
        res.json({ success: !err });
    });
});

app.get('/api/battle/match/:userId', (req, res) => {
    const mode = req.query.mode;
    if (mode === 'BOT') {
        return res.json({
            name: "Trainer Rookie", level: 5, isBot: true,
            cards: [
                { name: "Uzuki (Bot)", image: "https://hidamarirhodonite.kirara.ca/card/100001.png", rarity: 'N', totalStats: 30 },
                { name: "Rin (Bot)", image: "https://hidamarirhodonite.kirara.ca/card/100002.png", rarity: 'N', totalStats: 30 },
                { name: "Mio (Bot)", image: "https://hidamarirhodonite.kirara.ca/card/100003.png", rarity: 'N', totalStats: 30 },
                { name: "Miku (Bot)", image: "https://hidamarirhodonite.kirara.ca/card/100021.png", rarity: 'N', totalStats: 30 }
            ], totalPower: 120
        });
    }
    res.status(404).json(null);
});

app.post('/api/battle/finish', (req, res) => {
    const { userId, won } = req.body;
    const rewards = won ? { exp: 50, money: 1000, jewels: 10 } : { exp: 10, money: 100, jewels: 0 };
    db.run("UPDATE users SET exp = exp + ?, money = money + ?, starJewels = starJewels + ? WHERE id = ?", [rewards.exp, rewards.money, rewards.jewels, userId]);
    res.json({ success: true, rewards });
});

// START
syncIdolData();
app.listen(PORT, () => {
    console.log(`Backend Server running on http://localhost:${PORT}`);
});
