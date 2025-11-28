
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
             const response = await fetch("https://starlight.kirara.ca/api/v1/list/card_t?keys=id,name,rarity_dep,attribute,vocal_max,dance_max,visual_max");
             if (!response.ok) throw new Error("API Fetch failed");
             
             const json = await response.json();
             const cards = json.result;

             if (!cards) return;

             const stmt = db.prepare("INSERT OR IGNORE INTO idol_templates (id, name, rarity, type, maxLevel, image, vocal, dance, visual, attack, defense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
             
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
                 
                 // Map Attribute
                 let type = 'CUTE';
                 if (card.attribute === 'cool') type = 'COOL';
                 if (card.attribute === 'passion') type = 'PASSION';

                 // Calculate Stats (Simplified formula)
                 const totalStats = card.vocal_max + card.dance_max + card.visual_max;
                 const attack = Math.floor(totalStats * 0.6); // Offensive bias
                 const defense = Math.floor(totalStats * 0.4); // Defensive bias

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

// Updated Register to accept Type and give specific starter
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
    const { userId } = req.body;
    
    db.get("SELECT last_login_date, login_streak FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.status(404).json({ error: "User not found" });

        const now = Date.now();
        const lastLogin = user.last_login_date || 0;
        
        // MODIFIED FOR TESTING: Check if 1 second (1000ms) has passed instead of 1 day
        const diffMs = now - lastLogin;

        // If less than 1 second has passed, it is claimed
        if (diffMs < 1000) {
            return res.json({ claimed: true });
        }

        // Increment streak every time (Simulating fast forward)
        const newStreak = (user.login_streak || 0) + 1;

        // Determine Reward based on 7-day cycle
        // Days 1-6: Normal, Day 7: Special
        const cycleDay = ((newStreak - 1) % 7) + 1;
        
        let rewardType = 'MONEY';
        let rewardAmount = 5000;
        let message = "Daily Bonus!";

        if (cycleDay === 1) { rewardType = 'MONEY'; rewardAmount = 5000; message="Day 1: Starting Support!"; }
        if (cycleDay === 2) { rewardType = 'ITEM_TICKET'; rewardAmount = 1; message="Day 2: Training Support!"; }
        if (cycleDay === 3) { rewardType = 'ITEM_STAMINA'; rewardAmount = 1; message="Day 3: Energy Support!"; }
        if (cycleDay === 4) { rewardType = 'MONEY'; rewardAmount = 10000; message="Day 4: Funding!"; }
        if (cycleDay === 5) { rewardType = 'ITEM_TICKET'; rewardAmount = 2; message="Day 5: Training Time!"; }
        if (cycleDay === 6) { rewardType = 'ITEM_STAMINA'; rewardAmount = 2; message="Day 6: More Energy!"; }
        if (cycleDay === 7) { rewardType = 'JEWEL'; rewardAmount = 50; message="Day 7: Special Jewel Bonus!"; }

        // Give Reward directly
        if (rewardType === 'MONEY') {
            db.run("UPDATE users SET money = money + ? WHERE id = ?", [rewardAmount, userId]);
        } else if (rewardType === 'JEWEL') {
            db.run("UPDATE users SET starJewels = starJewels + ? WHERE id = ?", [rewardAmount, userId]);
        } else if (rewardType === 'ITEM_TICKET') {
            const item = 'trainerTicket';
             db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = ?", [userId, item], (err, iRow) => {
                if (iRow) db.run("UPDATE user_items SET count = count + ? WHERE user_id = ? AND item_name = ?", [rewardAmount, userId, item]);
                else db.run("INSERT INTO user_items VALUES (?, ?, ?)", [userId, item, rewardAmount]);
             });
        } else if (rewardType === 'ITEM_STAMINA') {
            const item = 'staminaDrink';
             db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = ?", [userId, item], (err, iRow) => {
                if (iRow) db.run("UPDATE user_items SET count = count + ? WHERE user_id = ? AND item_name = ?", [rewardAmount, userId, item]);
                else db.run("INSERT INTO user_items VALUES (?, ?, ?)", [userId, item, rewardAmount]);
             });
        }

        // Update User with current timestamp
        db.run("UPDATE users SET last_login_date = ?, login_streak = ? WHERE id = ?", [now, newStreak, userId]);

        res.json({
            claimed: false,
            result: {
                day: cycleDay,
                rewardType,
                rewardAmount,
                message
            }
        });
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
  const sql = `SELECT ui.id, ui.level, ui.isLocked, ui.affection, ui.star_rank, ui.is_awakened, it.* FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.user_id = ?`;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const idols = rows.map(r => {
        const isAwakened = !!r.is_awakened;
        const maxLevel = isAwakened ? r.maxLevel + 10 : r.maxLevel;
        // Simple stat boost for awakening
        const multiplier = isAwakened ? 1.2 : 1.0;

        return {
          id: r.id, name: r.name, rarity: r.rarity, type: r.type, level: r.level, maxLevel: maxLevel,
          image: r.image, // In a real app, awakened has different image
          vocal: Math.floor(r.vocal * multiplier), 
          dance: Math.floor(r.dance * multiplier), 
          visual: Math.floor(r.visual * multiplier), 
          attack: Math.floor(r.attack * multiplier), 
          defense: Math.floor(r.defense * multiplier), 
          affection: r.affection, 
          maxAffection: isAwakened ? r.maxLevel + 100 : r.maxLevel, 
          isLocked: !!r.isLocked,
          starRank: r.star_rank || 1,
          isAwakened
        };
    });
    res.json(idols);
  });
});

// --- IDOL MANAGEMENT ---

app.post('/api/idol/train', (req, res) => {
  const { userId, idolId } = req.body;
  // Use a trainer ticket
  db.get("SELECT count FROM user_items WHERE user_id = ? AND item_name = 'trainerTicket'", [userId], (err, row) => {
      if(!row || row.count < 1) return res.status(400).json({ error: "No tickets" });
      
      db.run("UPDATE user_items SET count = count - 1 WHERE user_id = ? AND item_name = 'trainerTicket'", [userId]);
      db.run("UPDATE user_idols SET level = level + 1 WHERE id = ?", [idolId]);
      res.json({ success: true });
  });
});

app.post('/api/idol/special_training', (req, res) => {
    const { userId, idolId } = req.body;
    // Check if idol exists and is max level/affection
    const sql = `SELECT ui.*, it.maxLevel FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.id = ? AND ui.user_id = ?`;
    db.get(sql, [idolId, userId], (err, idol) => {
        if (!idol) return res.status(404).json({error: "Idol not found"});
        if (idol.is_awakened) return res.status(400).json({error: "Already Awakened"});
        if (idol.level < idol.maxLevel) return res.status(400).json({error: "Must be Max Level"});
        // Simplify affection check for demo
        
        // Awakening: Reset Level to 1, Set is_awakened = 1
        db.run("UPDATE user_idols SET level = 1, is_awakened = 1 WHERE id = ?", [idolId], (err) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({success: true});
        });
    });
});

app.post('/api/idol/star_lesson', (req, res) => {
    const { userId, targetId, partnerId } = req.body;
    if (targetId === partnerId) return res.status(400).json({error: "Cannot merge same instance"});
    
    const sql = "SELECT * FROM user_idols WHERE id IN (?, ?) AND user_id = ?";
    db.all(sql, [targetId, partnerId, userId], (err, rows) => {
        if (rows.length !== 2) return res.status(400).json({error: "Invalid idols"});
        const target = rows.find(r => r.id === targetId);
        const partner = rows.find(r => r.id === partnerId);
        
        if (target.template_id !== partner.template_id) return res.status(400).json({error: "Must be same idol type"});
        
        const newRank = (target.star_rank || 1) + (partner.star_rank || 1);
        
        db.serialize(() => {
            db.run("DELETE FROM user_idols WHERE id = ?", [partnerId]);
            db.run("UPDATE user_idols SET star_rank = ? WHERE id = ?", [newRank, targetId]);
        });
        
        res.json({success: true, newRank});
    });
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

// --- WORK API ---
app.post('/api/work/execute', (req, res) => {
    const { userId } = req.body;
    const sql = `
        SELECT u.stamina, u.maxStamina, u.exp, u.maxExp, u.level, wp.current_zone_id, wp.progress_percent, wz.stamina_cost, wz.exp_gain
        FROM users u
        JOIN work_progress wp ON u.id = wp.user_id
        JOIN work_zones wz ON wp.current_zone_id = wz.id
        WHERE u.id = ?
    `;

    db.get(sql, [userId], (err, data) => {
        if (err || !data) return res.status(500).json({ error: "Work data not found" });
        if (data.stamina < data.stamina_cost) return res.json({ success: false, error: "Not enough stamina" });

        const newStamina = data.stamina - data.stamina_cost;
        let newExp = data.exp + data.exp_gain;
        const moneyGain = Math.floor(Math.random() * 100) + 50;
        let newProgress = data.progress_percent + 10;
        
        let newLevel = data.level;
        let newMaxExp = data.maxExp;
        let newMaxStamina = data.maxStamina;
        let isLevelUp = false;
        if (newExp >= data.maxExp) {
             newLevel++;
             newExp -= data.maxExp;
             newMaxExp = Math.floor(newMaxExp * 1.1);
             newMaxStamina += 1;
             isLevelUp = true;
        }

        let isZoneClear = false;
        let nextZoneId = data.current_zone_id;
        if (newProgress >= 100) {
            isZoneClear = true;
            newProgress = 0;
            nextZoneId++;
        }

        let drop = null;
        const rand = Math.random();
        if (rand < 0.15) {
             db.run("UPDATE user_items SET count = count + 1 WHERE user_id = ? AND item_name = 'trainerTicket'", [userId]);
             drop = { type: 'ITEM', name: 'Trainer Ticket' };
        } else if (rand < 0.25) {
             db.get("SELECT * FROM idol_templates WHERE rarity = 'N' ORDER BY RANDOM() LIMIT 1", (err, tpl) => {
                 if (tpl) {
                     const instId = `${Date.now()}-DROP`;
                     db.run("INSERT INTO user_idols (id, user_id, template_id, level, isLocked, affection) VALUES (?, ?, ?, 1, 0, 0)", [instId, userId, tpl.id]);
                 }
             });
             drop = { type: 'IDOL', name: 'New Idol', rarity: 'N' };
        }

        const affectionGain = 1;
        db.get("SELECT id FROM user_decks WHERE user_id = ?", [userId], (err, deck) => {
            if (deck && deck.slot1_id) {
                 db.run("UPDATE user_idols SET affection = affection + ? WHERE id = ?", [affectionGain, deck.slot1_id]);
            }
        });

        db.run("UPDATE users SET stamina = ?, exp = ?, level = ?, maxExp = ?, maxStamina = ?, money = money + ? WHERE id = ?", 
            [newStamina, newExp, newLevel, newMaxExp, newMaxStamina, moneyGain, userId]);
        
        db.run("UPDATE work_progress SET current_zone_id = ?, progress_percent = ? WHERE user_id = ?", 
            [nextZoneId, newProgress, userId]);

        res.json({ success: true, newStamina, expGained: data.exp_gain, moneyGained, affectionGained: affectionGain, progress: newProgress, drops: drop, isLevelUp, isZoneClear });
    });
});

app.get('/api/work/status/:userId', (req, res) => {
    const sql = `SELECT wp.progress_percent, wz.area_name, wz.zone_name, wz.stamina_cost FROM work_progress wp JOIN work_zones wz ON wp.current_zone_id = wz.id WHERE wp.user_id = ?`;
    db.get(sql, [req.params.userId], (err, row) => {
        if (!row) return res.json(null);
        res.json(row);
    });
});

// ... (Rest of existing endpoints) ...
app.get('/api/user/:id/deck', (req, res) => {
    db.get("SELECT * FROM user_decks WHERE user_id = ?", [req.params.id], (err, row) => {
        if (!row) { return res.json([null, null, null, null]); }
        const ids = [row.slot1_id || null, row.slot2_id || null, row.slot3_id || null, row.slot4_id || null];
        res.json(ids);
    });
});

app.post('/api/deck', (req, res) => {
    const { userId, cardIds } = req.body; 
    const safeIds = [...(cardIds || [])];
    while(safeIds.length < 4) safeIds.push(null);
    const [s1, s2, s3, s4] = safeIds;
    const sql = `INSERT OR REPLACE INTO user_decks (user_id, slot1_id, slot2_id, slot3_id, slot4_id) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [userId, s1, s2, s3, s4], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/battle/match/:userId', (req, res) => {
    const mode = req.query.mode || 'BOT';
    if (mode === 'BOT') {
        const botNames = ["P-San 902", "KiraraFan", "Producer X", "StaminaDrain", "RinP"];
        const randomName = botNames[Math.floor(Math.random() * botNames.length)];
        const randomLevel = Math.floor(Math.random() * 20) + 1;
        db.all("SELECT * FROM idol_templates ORDER BY RANDOM() LIMIT 4", (err, rows) => {
            const cards = rows.map(r => ({
                name: r.name,
                image: r.image,
                rarity: r.rarity,
                totalStats: Math.floor((r.vocal + r.dance + r.visual) * (1 + (randomLevel * 0.05)))
            }));
            const totalPower = cards.reduce((sum, c) => sum + c.totalStats, 0);
            res.json({ name: randomName, level: randomLevel, isBot: true, cards: cards, totalPower });
        });
    } else {
        const sql = `SELECT u.name, u.level, ud.* FROM users u JOIN user_decks ud ON u.id = ud.user_id WHERE u.id != ? ORDER BY RANDOM() LIMIT 1`;
        db.get(sql, [req.params.userId], async (err, opponent) => {
            if (!opponent) return res.redirect(`/api/battle/match/${req.params.userId}?mode=BOT`);
            const slots = [opponent.slot1_id, opponent.slot2_id, opponent.slot3_id, opponent.slot4_id].filter(Boolean);
            if(slots.length === 0) return res.redirect(`/api/battle/match/${req.params.userId}?mode=BOT`);
            const placeholder = slots.map(()=>'?').join(',');
            const cardSql = `SELECT it.name, it.image, it.rarity, it.vocal, it.dance, it.visual, ui.level FROM user_idols ui JOIN idol_templates it ON ui.template_id = it.id WHERE ui.id IN (${placeholder})`;
            db.all(cardSql, slots, (err, cardsData) => {
                const cards = cardsData.map(c => {
                    const baseTotal = c.vocal + c.dance + c.visual;
                    const scaledTotal = Math.floor(baseTotal * (1 + (c.level - 1) * 0.05));
                    return { name: c.name, image: c.image, rarity: c.rarity, totalStats: scaledTotal };
                });
                const totalPower = cards.reduce((sum, c) => sum + c.totalStats, 0);
                res.json({ name: opponent.name, level: opponent.level, isBot: false, cards, totalPower });
            });
        });
    }
});

app.post('/api/battle/finish', (req, res) => {
    const { userId, won } = req.body;
    const rewards = { exp: 0, money: 0, jewels: 0 };
    if (won) { rewards.exp = 20; rewards.money = 1000; rewards.jewels = 10; } 
    else { rewards.exp = 5; rewards.money = 100; }
    db.get("SELECT level, exp, maxExp FROM users WHERE id = ?", [userId], (err, user) => {
        let newExp = user.exp + rewards.exp;
        let newLevel = user.level;
        let newMaxExp = user.maxExp;
        if (newExp >= user.maxExp) { newLevel++; newExp = newExp - user.maxExp; newMaxExp = Math.floor(newMaxExp * 1.1); }
        db.run("UPDATE users SET money = money + ?, starJewels = starJewels + ?, exp = ?, level = ?, maxExp = ? WHERE id = ?", [rewards.money, rewards.jewels, newExp, newLevel, newMaxExp, userId]);
        res.json({ success: true, rewards });
    });
});

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
                    const mappedRewards = rewards.map(r => ({ pointThreshold: r.point_threshold, rewardName: r.reward_name, rewardAmount: r.reward_amount, claimed: userPoints >= r.point_threshold }));
                    res.json({ id: event.id, name: event.name, description: event.description, banner: event.banner, startTime: event.start_time, endTime: event.end_time, isActive: true, userPoints, rewards: mappedRewards, ranking: rankingWithIndex });
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
        if (newExp >= user.maxExp) { newLevel++; newExp = newExp - user.maxExp; newMaxStamina += 1; leveledUp = true; }
        db.run("UPDATE users SET stamina = ?, exp = ?, level = ?, maxStamina = ? WHERE id = ?", [newStamina, newExp, newLevel, newMaxStamina, userId]);
        const pointsGained = Math.floor(staminaCost * 10 + Math.random() * 20);
        db.get("SELECT points FROM event_points WHERE user_id = ? AND event_id = ?", [userId, eventId], (err, row) => {
            if (row) { db.run("UPDATE event_points SET points = points + ? WHERE user_id = ? AND event_id = ?", [pointsGained, userId, eventId]); } 
            else { db.run("INSERT INTO event_points VALUES (?, ?, ?)", [userId, eventId, pointsGained]); }
            res.json({ success: true, pointsGained, newStamina, leveledUp, newLevel });
        });
    });
});

// ... Keep existing commu, promo, etc routes ...
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
        dialogs.forEach((d, index) => { stmt.run(chapterId, d.speaker, d.text, d.expression || 'neutral', index, d.customSpriteUrl || null); });
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
      const stmt = db.prepare("INSERT INTO user_idols (id, user_id, template_id, level, isLocked, affection) VALUES (?, ?, ?, 1, 0, 0)");
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
        pulledIdols.push({ ...template, id: instanceId, level: 1, isLocked: false, affection: 0, maxAffection: template.maxLevel });
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
            } else { applyReward(true); }
        });
    } else { applyReward(false); }
    function applyReward(shouldRecordUsage) {
         if (shouldRecordUsage) { db.run("INSERT INTO promo_usage (user_id, code, used_at) VALUES (?, ?, ?)", [userId, code, now]); }
         db.run("INSERT INTO presents (user_id, type, amount, description, received_at) VALUES (?, ?, ?, ?, ?)", [userId, promo.rewardType, promo.rewardAmount, `Promo: ${code}`, now]);
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
