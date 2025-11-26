
const express = require('express');
const cors = require('cors');
const path = require('path');
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
                    
                    // FIX: Mapping snake_case DB columns to camelCase for Frontend
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
    const { type } = req.query;
    let sql = "SELECT * FROM chapters";
    const params = [];
    if (type) { sql += " WHERE type = ?"; params.push(type); }
    sql += " ORDER BY sort_order ASC";
    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/commu/dialogs/:chapterId', (req, res) => {
    db.all("SELECT * FROM dialogs WHERE chapter_id = ? ORDER BY sort_order ASC", [req.params.chapterId], (err, rows) => { res.json(rows); });
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
      const pulledIdols = [];
      const stmt = db.prepare("INSERT INTO user_idols (id, user_id, template_id, level, isLocked) VALUES (?, ?, ?, 1, 0)");
      for(let i=0; i<count; i++) {
        const rand = Math.random() * 100;
        let pool = templates.filter(t => t.rarity === 'N');
        if (rand <= 5) pool = templates.filter(t => t.rarity === 'SSR');
        else if (rand <= 20) pool = templates.filter(t => t.rarity === 'SR');
        else if (rand <= 50) pool = templates.filter(t => t.rarity === 'R');
        const template = pool[Math.floor(Math.random() * pool.length)] || templates[0];
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

app.listen(PORT, () => {
  console.log(`Backend Server running on http://localhost:${PORT}`);
});
