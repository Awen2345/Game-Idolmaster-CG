
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

// Static Assets
app.use('/assets/idols', express.static(path.join(__dirname, '../public/idols')));
app.use('/assets/sprites', express.static(path.join(__dirname, '../public/sprites')));
app.use('/assets/music', express.static(path.join(__dirname, '../public/music')));
app.use('/assets/covers', express.static(path.join(__dirname, '../public/covers')));

const STAMINA_REGEN_MS = 60000;
const CONFIG_PATH = path.join(__dirname, 'game_config.json');

// --- HELPERS ---

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

// --- IDOL SYNC ---
const syncIdolData = async () => {
    db.get("SELECT count(*) as count FROM idol_templates WHERE type IN ('COOL', 'PASSION')", (err, row) => {
        const hasVariety = row && row.count > 0;
        db.get("SELECT count(*) as total FROM idol_templates", async (err, row) => {
            const total = row ? row.total : 0;
            // Force update if database is small (<2000 cards) or has only one type
            const needsUpdate = (total > 0 && !hasVariety) || (total > 0 && total < 2000); 
            
            if (total > 0 && !needsUpdate) {
                console.log("Idol Database Ready.");
                return;
            }
            
            if (needsUpdate) {
                console.log("Updating Idol Database...");
                await new Promise(resolve => db.run("DELETE FROM idol_templates", resolve));
            }

            try {
                 // Fetch all cards from Kirara API
                 const response = await fetch("https://starlight.kirara.ca/api/v1/list/card_t?keys=id,name,rarity_dep,attribute,vocal_max,dance_max,visual_max");
                 if (!response.ok) throw new Error("API Fetch failed");
                 const json = await response.json();
                 
                 // Filter N, R, SR, SSR
                 let cards = json.result.filter(c => [1, 3, 5, 7].includes(c.rarity_dep.rarity));
                 
                 const stmt = db.prepare("INSERT OR IGNORE INTO idol_templates (id, name, rarity, type, maxLevel, image, vocal, dance, visual, attack, defense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                 
                 db.serialize(() => {
                     db.run("BEGIN TRANSACTION");
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
                     db.run("COMMIT");
                 });
                 stmt.finalize();
                 console.log(`Synced ${cards.length} idols.`);
            } catch (e) { console.error("Failed to sync idols:", e); }
        });
    });
};

// --- AUTH ---

app.post('/api/auth/register', (req, res) => {
    const { username, password, type } = req.body;
    db.run(`INSERT INTO users (username, password, name, type, level, exp, maxExp, stamina, maxStamina, lastStaminaUpdate, money, starJewels) VALUES (?, ?, 'Producer', ?, 1, 0, 100, 50, 50, ?, 5000, 2500)`, [username, password, type || 'CUTE', Date.now()], function(err) {
        if (err) return res.status(400).json({ error: "Username taken" });
        const userId = this.lastID;
        db.run(`INSERT INTO user_items VALUES (${userId}, 'staminaDrink', 3)`);
        db.run(`INSERT INTO user_items VALUES (${userId}, 'trainerTicket', 5)`);
        // Give Starter Rare based on Type
        let starterId = type === 'COOL' ? '100002' : type === 'PASSION' ? '100003' : '100001';
        db.run("INSERT INTO user_idols (id, user_id, template_id, level, isLocked, affection) VALUES (?, ?, ?, 1, 1, 0)", [`${Date.now()}-START`, userId, starterId]);
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

// --- USER ---

app.get('/api/user/:id', (req, res) => {
  const userId = req.params.id;
  db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
    if (err || !user) return res.status(404).json({ error: "User not found" });
    user = recalcStamina(user);
    db.all("SELECT item_name, count FROM user_items WHERE user_id = ?", [userId], (err, items) => {
      const itemsMap = {};
      items.forEach(i => itemsMap[i.item_name] = i.count);
      res.json({ 
          ...user, 
          tickets: { gacha: itemsMap['gachaTicket']||0, skip: itemsMap['skipTicket']||0 }, 
          items: { staminaDrink: itemsMap['staminaDrink']||0, trainerTicket: itemsMap['trainerTicket']||0 } 
      });
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

// --- LOGIN BONUS ---
app.post('/api/user/login_bonus', (req, res) => {
    const { userId, action } = req.body;
    const config = getGameConfig();
    const loginConfig = config.loginBonus || { resetHour: 0, rewards: [] };

    db.get("SELECT last_login_date, login_streak FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.status(404).json({ error: "User not found" });

        const now = new Date();
        const lastLogin = new Date(user.last_login_date || 0);
        const resetHour = loginConfig.resetHour || 0;

        const getGameDateString = (dateObj) => {
            const adjustedDate = new Date(dateObj);
            adjustedDate.setHours(adjustedDate.getHours() - resetHour);
            return adjustedDate.toDateString(); 
        };

        const todayGameDate = getGameDateString(now);
        const lastLoginGameDate = getGameDateString(lastLogin);
        const isNewDay = todayGameDate !== lastLoginGameDate;

        if (action === 'check') return res.json({ canClaim: isNewDay, streak: (user.login_streak || 0) });

        if (!isNewDay) {
            const currentStreak = user.login_streak || 1;
            const cycleDay = ((currentStreak - 1) % 7) + 1;
            const todayReward = loginConfig.rewards.find(r => r.day === cycleDay) || loginConfig.rewards[0];
            return res.json({ claimedToday: true, streak: currentStreak, todayConfig: todayReward, allRewards: loginConfig.rewards });
        }

        const newStreak = (user.login_streak || 0) + 1;
        const cycleDay = ((newStreak - 1) % 7) + 1;
        const reward = loginConfig.rewards.find(r => r.day === cycleDay) || { type: 'MONEY', amount: 1000, message: 'Bonus' };

        if (reward.type === 'MONEY') db.run("UPDATE users SET money = money + ? WHERE id = ?", [reward.amount, userId]);
        else if (reward.type === 'JEWEL') db.run("UPDATE users SET starJewels = starJewels + ? WHERE id = ?", [reward.amount, userId]);
        else if (reward.type.includes('ITEM')) {
            const itemMap = { 'ITEM_TICKET': 'trainerTicket', 'ITEM_STAMINA': 'staminaDrink' };
            const item = itemMap[reward.type];
            if (item) db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, ?, ?) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + ?", [userId, item, reward.amount, reward.amount]);
        }

        db.run("UPDATE users SET last_login_date = ?, login_streak = ? WHERE id = ?", [Date.now(), newStreak, userId]);

        res.json({ claimedToday: false, streak: newStreak, todayConfig: reward, allRewards: loginConfig.rewards });
    });
});

// --- PRESENTS & ANNOUNCEMENTS ---

app.get('/api/user/:id/presents', (req, res) => {
    db.all("SELECT * FROM presents WHERE user_id = ? ORDER BY received_at DESC", [req.params.id], (err, rows) => res.json(rows || []));
});

app.post('/api/user/:id/presents/claim', (req, res) => {
    const { userId, presentId } = req.body;
    db.get("SELECT * FROM presents WHERE id = ? AND user_id = ?", [presentId, userId], (err, present) => {
        if (!present) return res.json({ success: false });
        
        if (present.type === 'MONEY') db.run("UPDATE users SET money = money + ? WHERE id = ?", [present.amount, userId]);
        else if (present.type === 'JEWEL') db.run("UPDATE users SET starJewels = starJewels + ? WHERE id = ?", [present.amount, userId]);
        else if (present.type.startsWith('ITEM')) {
            const itemMap = { 'ITEM_STAMINA': 'staminaDrink', 'ITEM_TICKET': 'trainerTicket' };
            const item = itemMap[present.type];
            if (item) db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, ?, ?) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + ?", [userId, item, present.amount, present.amount]);
        }
        
        db.run("DELETE FROM presents WHERE id = ?", [presentId]);
        res.json({ success: true });
    });
});

app.get('/api/announcements', (req, res) => {
    db.all("SELECT * FROM announcements ORDER BY date DESC LIMIT 10", (err, rows) => res.json(rows || []));
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
                        rewards: mappedRewards, ranking: rankingWithIndex
                    });
                });
            });
        });
    });
});

app.post('/api/event/work', (req, res) => {
    const { userId, eventId, staminaCost } = req.body;
    db.get("SELECT stamina FROM users WHERE id = ?", [userId], (err, user) => {
        if(user.stamina < staminaCost) return res.json({ error: "Not enough stamina" });
        const pointsGained = staminaCost * 10 + Math.floor(Math.random() * 50);
        const expGained = staminaCost * 2;
        const newStamina = user.stamina - staminaCost;
        
        db.run("UPDATE users SET stamina = ?, exp = exp + ? WHERE id = ?", [newStamina, expGained, userId]);
        db.run("INSERT INTO event_points (user_id, event_id, points) VALUES (?, ?, ?) ON CONFLICT(user_id, event_id) DO UPDATE SET points = points + ?", [userId, eventId, pointsGained, pointsGained]);
        res.json({ success: true, pointsGained, newStamina });
    });
});

// --- WORK SYSTEM ---

app.get('/api/work/regions', (req, res) => db.all("SELECT * FROM work_regions", (err, rows) => res.json(rows || [])));
app.get('/api/work/jobs/:regionId', (req, res) => db.all("SELECT * FROM work_jobs WHERE region_id = ?", [req.params.regionId], (err, rows) => res.json(rows || [])));

app.post('/api/work/execute', (req, res) => {
    const { userId, jobId } = req.body;
    db.get("SELECT stamina FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.json({ error: "User not found" });
        db.get("SELECT * FROM work_jobs WHERE id = ?", [jobId], (err, job) => {
            if (!job) return res.json({ error: "Job not found" });
            if (user.stamina < job.stamina_cost) return res.json({ error: "Not enough stamina" });

            db.get("SELECT * FROM user_decks WHERE user_id = ?", [userId], (err, deck) => {
                let matchCount = 0;
                let cardIds = deck ? [deck.slot1_id, deck.slot2_id, deck.slot3_id, deck.slot4_id].filter(id => id) : [];
                
                const processResult = () => {
                    const isGreatSuccess = (Math.random() < 0.1) || (matchCount >= 2 && Math.random() < 0.5);
                    const multiplier = isGreatSuccess ? 1.5 : 1.0;
                    const moneyGained = Math.floor(job.base_money * multiplier);
                    const expGained = Math.floor(job.base_exp * multiplier);
                    const affectionGained = isGreatSuccess ? 2 : 1;
                    const newStamina = user.stamina - job.stamina_cost;

                    let drop = null;
                    if (Math.random() < 0.15) {
                        drop = { type: 'ITEM', name: 'Stamina Drink', count: 1 };
                        db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, 'staminaDrink', 1) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + 1", [userId]);
                    }

                    db.run("UPDATE users SET stamina = ?, exp = exp + ?, money = money + ? WHERE id = ?", [newStamina, expGained, moneyGained, userId]);
                    if (cardIds.length > 0) {
                        const ph = cardIds.map(() => '?').join(',');
                        db.run(`UPDATE user_idols SET affection = affection + ? WHERE id IN (${ph})`, [affectionGained, ...cardIds]);
                    }

                    res.json({ success: true, isGreatSuccess, newStamina, expGained, moneyGained, affectionGained, drops: drop, isLevelUp: false });
                };

                if (cardIds.length > 0 && job.type !== 'ALL') {
                    const ph = cardIds.map(() => '?').join(',');
                    db.all(`SELECT it.type FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.id IN (${ph})`, cardIds, (err, cards) => {
                        matchCount = cards ? cards.filter(c => c.type === job.type).length : 0;
                        processResult();
                    });
                } else {
                    processResult();
                }
            });
        });
    });
});

// --- IDOL MANAGEMENT ---

app.post('/api/idol/train', (req, res) => {
    const { userId, idolId } = req.body;
    db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = 'trainerTicket'", [userId], (err, row) => {
        if (!row || row.count < 1) return res.json({ error: "No tickets" });
        db.get("SELECT * FROM user_idols WHERE id = ?", [idolId], (err, idol) => {
            db.get("SELECT maxLevel FROM idol_templates WHERE id = ?", [idol.template_id], (err, tmpl) => {
                const limit = idol.is_awakened ? tmpl.maxLevel + 10 : tmpl.maxLevel;
                if (idol.level >= limit) return res.json({ error: "Max level reached" });
                
                db.run("UPDATE user_items SET count = count - 1 WHERE user_id = ? AND item_name = 'trainerTicket'", [userId]);
                db.run("UPDATE user_idols SET level = level + 1 WHERE id = ?", [idolId]);
                res.json({ success: true });
            });
        });
    });
});

app.post('/api/idol/retire', (req, res) => {
    const { userId, ids } = req.body;
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM user_idols WHERE id IN (${placeholders}) AND user_id = ?`, [...ids, userId], function(err) {
        if (err) return res.json({ error: "DB Error" });
        const money = ids.length * 1000;
        db.run("UPDATE users SET money = money + ? WHERE id = ?", [money, userId]);
        res.json({ success: true });
    });
});

app.post('/api/idol/special_training', (req, res) => {
    const { userId, idolId } = req.body;
    db.get("SELECT ui.*, it.maxLevel FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.id = ?", [idolId], (err, idol) => {
        if (idol.is_awakened) return res.json({ error: "Already awakened" });
        if (idol.level < idol.maxLevel) return res.json({ error: "Not max level" });
        
        db.run("UPDATE user_idols SET is_awakened = 1, level = 1, star_rank = star_rank + 1 WHERE id = ?", [idolId]);
        res.json({ success: true });
    });
});

app.post('/api/idol/star_lesson', (req, res) => {
    const { userId, targetId, partnerId } = req.body;
    db.run("DELETE FROM user_idols WHERE id = ?", [partnerId]);
    db.run("UPDATE user_idols SET star_rank = star_rank + 1 WHERE id = ?", [targetId]);
    res.json({ success: true });
});

// --- ITEMS & SHOP ---

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

app.post('/api/shop/buy', (req, res) => {
    const { userId, item, cost } = req.body;
    db.get("SELECT starJewels FROM users WHERE id = ?", [userId], (err, user) => {
        if (user.starJewels < cost) return res.json({ error: "Not enough jewels" });
        db.run("UPDATE users SET starJewels = starJewels - ? WHERE id = ?", [cost, userId]);
        db.run("INSERT INTO user_items (user_id, item_name, count) VALUES (?, ?, 1) ON CONFLICT(user_id, item_name) DO UPDATE SET count = count + 1", [userId, item]);
        res.json({ success: true });
    });
});

// --- GACHA ---

app.get('/api/gacha/history/:userId', (req, res) => {
    db.all("SELECT * FROM gacha_history WHERE user_id = ? ORDER BY pulled_at DESC LIMIT 50", [req.params.userId], (err, rows) => res.json(rows || []));
});

app.get('/api/gacha/details', (req, res) => {
    db.all("SELECT id, name, rarity, type, image, vocal, dance, visual FROM idol_templates", (err, rows) => {
        const config = getGameConfig();
        const rates = config.gacha ? config.gacha.rates : { SSR: 3 };
        res.json({ rates, pool: rows || [] });
    });
});

app.post('/api/gacha', (req, res) => {
    const { userId, count } = req.body;
    const COST = count === 10 ? 2500 : 250;
    
    db.get("SELECT starJewels FROM users WHERE id = ?", [userId], (err, user) => {
        if (user.starJewels < COST) return res.json({ error: "Not enough jewels" });
        
        db.all("SELECT * FROM idol_templates", (err, templates) => {
            if (!templates || templates.length === 0) return res.json({ error: "Gacha pool empty" });
            
            const config = getGameConfig();
            const rates = config.gacha ? config.gacha.rates : { SSR: 3, SR: 12, R: 85 };
            const pool = {
                SSR: templates.filter(t => t.rarity === 'SSR'),
                SR: templates.filter(t => t.rarity === 'SR'),
                R: templates.filter(t => t.rarity === 'R'),
                N: templates.filter(t => t.rarity === 'N')
            };

            const pulled = [];
            for (let i = 0; i < count; i++) {
                const rand = Math.random() * 100;
                let selectedRarity = 'R';
                if (rand < rates.SSR) selectedRarity = 'SSR';
                else if (rand < rates.SSR + rates.SR) selectedRarity = 'SR';
                else if (rand < rates.SSR + rates.SR + rates.R) selectedRarity = 'R';
                else selectedRarity = 'N';

                // Safety fallback
                if (pool[selectedRarity].length === 0) selectedRarity = 'R';
                if (pool[selectedRarity].length === 0) continue; 

                const template = pool[selectedRarity][Math.floor(Math.random() * pool[selectedRarity].length)];
                pulled.push(template);
            }

            db.run("UPDATE users SET starJewels = starJewels - ? WHERE id = ?", [COST, userId]);
            
            const finalIdols = [];
            db.serialize(() => {
                const stmt = db.prepare("INSERT INTO user_idols (id, user_id, template_id, level, isLocked, affection) VALUES (?, ?, ?, 1, 0, 0)");
                const histStmt = db.prepare("INSERT INTO gacha_history (user_id, idol_id, idol_name, rarity, pulled_at) VALUES (?, ?, ?, ?, ?)");
                
                pulled.forEach(tmpl => {
                    const uniqueId = `${Date.now()}-${Math.floor(Math.random()*1000)}`;
                    stmt.run(uniqueId, userId, tmpl.id);
                    histStmt.run(userId, tmpl.id, tmpl.name, tmpl.rarity, Date.now());
                    finalIdols.push({ ...tmpl, id: uniqueId, level: 1, isLocked: false, affection: 0, starRank: 1, isAwakened: false });
                });
                stmt.finalize();
                histStmt.finalize();
            });

            res.json({ success: true, newJewels: user.starJewels - COST, pulledIdols: finalIdols });
        });
    });
});

// --- BATTLE & DECK ---

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

app.get('/api/battle/match/:userId', (req, res) => {
    const mode = req.query.mode;
    if (mode === 'BOT') {
        const botName = "Producer " + Math.floor(Math.random() * 9999);
        const cards = Array(4).fill(0).map(() => ({
            name: "Unknown Idol",
            image: "https://picsum.photos/200/300",
            rarity: Math.random() > 0.5 ? 'R' : 'N',
            totalStats: Math.floor(Math.random() * 100) + 50
        }));
        return res.json({ name: botName, level: 5, isBot: true, cards });
    }
    db.get("SELECT * FROM users WHERE id != ? ORDER BY RANDOM() LIMIT 1", [req.params.userId], (err, opponent) => {
        if (!opponent) return res.status(404).json({error: "No opponent"});
        // Mock deck for PVP for now
        const cards = Array(4).fill(0).map(() => ({
            name: "Rival Idol",
            image: "https://picsum.photos/200/300",
            rarity: 'SR',
            totalStats: 150
        }));
        res.json({ name: opponent.name, level: opponent.level, isBot: false, cards });
    });
});

app.post('/api/battle/finish', (req, res) => {
    const { userId, won } = req.body;
    const exp = won ? 50 : 10;
    const money = won ? 500 : 100;
    const jewels = won ? 5 : 0;
    db.run("UPDATE users SET exp = exp + ?, money = money + ?, starJewels = starJewels + ? WHERE id = ?", [exp, money, jewels, userId]);
    res.json({ success: true, rewards: { exp, money, jewels } });
});

// --- COMMU & FANMADE ---

app.get('/api/commu/chapters', (req, res) => {
    const type = req.query.type;
    const config = getGameConfig();
    const chapters = config.chapters.filter(c => c.type === type);
    db.all("SELECT chapter_id FROM user_read_chapters WHERE user_id = ?", [req.query.userId], (err, rows) => {
        const readIds = rows ? rows.map(r => r.chapter_id) : [];
        const result = chapters.map(c => ({ ...c, isRead: readIds.includes(c.id) }));
        res.json(result);
    });
});

app.get('/api/commu/dialogs/:id', (req, res) => {
    const config = getGameConfig();
    const chapter = config.chapters.find(c => c.id === req.params.id);
    res.json(chapter ? chapter.dialogs : []);
});

app.post('/api/commu/read', (req, res) => {
    const { userId, chapterId } = req.body;
    db.run("INSERT OR IGNORE INTO user_read_chapters (user_id, chapter_id, read_at) VALUES (?, ?, ?)", [userId, chapterId, Date.now()]);
    res.json({ success: true });
});

app.get('/api/fan/chapters', (req, res) => {
    db.all("SELECT * FROM fan_chapters ORDER BY created_at DESC", (err, rows) => {
        const chapters = rows.map(r => ({ id: r.id.toString(), title: r.title, type: 'FANMADE', isRead: false }));
        res.json(chapters);
    });
});

app.get('/api/fan/dialogs/:id', (req, res) => {
    db.all("SELECT * FROM fan_dialogs WHERE chapter_id = ? ORDER BY sort_order ASC", [req.params.id], (err, rows) => res.json(rows || []));
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
    db.all("SELECT * FROM user_sprites WHERE user_id = ?", [req.params.userId], (err, rows) => res.json(rows || []));
});

app.post('/api/fan/sprite', (req, res) => {
    const { userId, name, image } = req.body;
    db.run("INSERT INTO user_sprites (user_id, name, url) VALUES (?, ?, ?)", [userId, name, image], (err) => res.json({ success: !err }));
});

// --- PROMO ---
app.post('/api/promo/redeem', (req, res) => {
    const { userId, code } = req.body;
    const config = getGameConfig();
    const promo = config.promoCodes.find(p => p.code === code);
    if (!promo) return res.json({ error: "Invalid Code" });
    if (Date.now() > promo.endTime) return res.json({ error: "Code Expired" });

    db.get("SELECT * FROM promo_usage WHERE user_id = ? AND code = ?", [userId, code], (err, usage) => {
        if (promo.isSingleUse && usage) return res.json({ error: "Already used" });
        db.run("INSERT INTO presents (user_id, type, amount, description, received_at) VALUES (?, ?, ?, ?, ?)", [userId, promo.rewardType, promo.rewardAmount, `Promo: ${code}`, Date.now()]);
        if (promo.isSingleUse) db.run("INSERT INTO promo_usage (user_id, code, used_at) VALUES (?, ?, ?)", [userId, code, Date.now()]);
        res.json({ success: true, message: "Rewards sent to Present Box!" });
    });
});

syncIdolData();
app.listen(PORT, () => console.log(`Backend Server running on http://localhost:${PORT}`));
