
import { useState, useEffect, useCallback } from 'react';
import { UserState, Idol, EventData, Chapter, DialogLine, UserSprite, Present, Announcement, BattleOpponent, BattleResult, IdolType, WorkResult, LoginBonusResult, GachaHistoryEntry, GachaPoolInfo, WorkRegion, WorkJob } from '../types';

const API_URL = '/api';

const INITIAL_USER: UserState = {
  id: 0,
  name: "Guest",
  type: IdolType.CUTE,
  level: 1,
  exp: 0,
  maxExp: 100,
  stamina: 50,
  maxStamina: 50,
  lastStaminaUpdate: Date.now(),
  money: 0,
  starJewels: 0,
  tickets: { gacha: 0, skip: 0 },
  items: { staminaDrink: 0, trainerTicket: 0 }
};

export const useGameEngine = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [user, setUser] = useState<UserState>(INITIAL_USER);
  const [idols, setIdols] = useState<Idol[]>([]);
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presents, setPresents] = useState<Present[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [canClaimBonus, setCanClaimBonus] = useState(false); 

  // ... (Auth functions login/register/logout omitted for brevity, keeping existing) ...
  const login = async (u: string, p: string) => {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, password: p})
        });
        const data = await res.json();
        if (data.success) {
            setUserId(data.userId);
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
  };

  const register = async (u: string, p: string, type: IdolType = IdolType.CUTE) => {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username: u, password: p, type})
        });
        const data = await res.json();
        if (data.success) {
            setUserId(data.userId);
            return true;
        }
    } catch (e) { console.error(e); }
    return false;
  };

  const logout = () => {
      setUserId(null);
      setUser(INITIAL_USER);
  };

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      if (user.id === 0) setLoading(true);
      
      const userRes = await fetch(`${API_URL}/user/${userId}`);
      if (!userRes.ok) throw new Error("Connection failed");
      const userData = await userRes.json();
      setUser(userData);

      const idolsRes = await fetch(`${API_URL}/user/${userId}/idols`);
      setIdols(await idolsRes.json());
      
      const eventRes = await fetch(`${API_URL}/event/active/${userId}`);
      const eventData = await eventRes.json();
      setEvent(eventData.isActive ? eventData : null);

      const presentsRes = await fetch(`${API_URL}/user/${userId}/presents`);
      setPresents(await presentsRes.json());

      const newsRes = await fetch(`${API_URL}/announcements`);
      setAnnouncements(await newsRes.json());

      setError(null);
    } catch (e: any) {
      console.error("Fetch error", e);
      if (user.id === 0) setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }, [userId, user.id]);

  useEffect(() => {
    if (userId) {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }
  }, [fetchData, userId]);

  // ... (Gacha, Item, Etc functions kept same) ...
  const checkLoginBonus = async (action: 'check' | 'claim' = 'check'): Promise<LoginBonusResult | null> => {
      if (!userId) return null;
      try {
          const res = await fetch(`${API_URL}/user/login_bonus`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, action })
          });
          const data = await res.json();
          if (action === 'check') { setCanClaimBonus(data.canClaim); return null; }
          if (action === 'claim') { fetchData(); setCanClaimBonus(false); return data; }
      } catch(e) { console.error(e); }
      return null;
  };

  const useItem = async (itemName: 'staminaDrink' | 'trainerTicket') => {
    if (!userId) return;
    try {
        const res = await fetch(`${API_URL}/item/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, item: itemName })
        });
        const data = await res.json();
        if (data.success) { fetchData(); return true; }
    } catch(e) { console.error(e); }
    return false;
  };

  const pullGacha = async (count: 1 | 10): Promise<Idol[] | null> => {
    if (!userId) return null;
    try {
        const res = await fetch(`${API_URL}/gacha`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, count })
        });
        const data = await res.json();
        if (data.error) { alert(data.error); return null; }
        setUser(prev => ({ ...prev, starJewels: data.newJewels }));
        setIdols(prev => [...prev, ...data.pulledIdols]);
        return data.pulledIdols;
    } catch(e) { return null; }
  };

  const fetchGachaHistory = async (): Promise<GachaHistoryEntry[]> => {
      if (!userId) return [];
      const res = await fetch(`${API_URL}/gacha/history/${userId}`);
      return await res.json();
  };

  const fetchGachaDetails = async (): Promise<GachaPoolInfo> => {
      const res = await fetch(`${API_URL}/gacha/details`);
      return await res.json();
  };

  // --- WORK SYSTEM ---

  const fetchWorkRegions = async (): Promise<WorkRegion[]> => {
      try {
          const res = await fetch(`${API_URL}/work/regions`);
          return await res.json();
      } catch(e) { console.error(e); return []; }
  };

  const fetchWorkJobs = async (regionId: number): Promise<WorkJob[]> => {
      try {
          const res = await fetch(`${API_URL}/work/jobs/${regionId}`);
          return await res.json();
      } catch(e) { console.error(e); return []; }
  };

  const doNormalWork = async (jobId: number): Promise<WorkResult | null> => {
      if (!userId) return null;
      try {
          const res = await fetch(`${API_URL}/work/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, jobId })
          });
          const data = await res.json();
          if (data.success) {
              fetchData();
              return data;
          } else {
              alert(data.error);
              return null;
          }
      } catch(e) { console.error(e); return null; }
  };

  // ... (Keep existing imports and exports) ...
  const retireIdols = async (ids: string[]) => {
    if (!userId) return;
    try {
        const res = await fetch(`${API_URL}/idol/retire`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, ids }) });
        const data = await res.json();
        if (data.success) { setIdols(prev => prev.filter(i => !ids.includes(i.id))); fetchData(); }
    } catch(e) { console.error(e); }
  };

  const trainIdol = async (idolId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
        const res = await fetch(`${API_URL}/idol/train`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, idolId }) });
        const data = await res.json();
        if (data.success) { fetchData(); return true; } else { alert(data.error); }
    } catch(e) { console.error(e); }
    return false;
  };

  const specialTraining = async (idolId: string): Promise<boolean> => {
      if(!userId) return false;
      const res = await fetch(`${API_URL}/idol/special_training`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, idolId }) });
      const data = await res.json();
      if (data.success) { fetchData(); return true; } else { alert(data.error); return false; }
  };

  const starLesson = async (targetId: string, partnerId: string): Promise<boolean> => {
      if(!userId) return false;
      const res = await fetch(`${API_URL}/idol/star_lesson`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, targetId, partnerId }) });
      const data = await res.json();
      if (data.success) { fetchData(); return true; } else { alert(data.error); return false; }
  };

  const buyItem = async (item: string, cost: number) => {
    if (!userId) return;
    const res = await fetch(`${API_URL}/shop/buy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, item, cost }) });
    const data = await res.json();
    if (data.success) fetchData(); else alert(data.error);
  };

  const doEventWork = async (staminaCost: number) => {
      if (!userId || !event) return;
      const res = await fetch(`${API_URL}/event/work`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, eventId: event.id, staminaCost }) });
      const data = await res.json();
      if (data.success) { fetchData(); return data; } else alert(data.error);
      return null;
  };

  const fetchChapters = async (type: string) => {
      if (type === 'FANMADE') { const res = await fetch(`${API_URL}/fan/chapters`); return await res.json(); }
      const res = await fetch(`${API_URL}/commu/chapters?type=${type}&userId=${userId}`); return await res.json();
  };

  const fetchDialogs = async (chapterId: string, isFanmade: boolean = false): Promise<DialogLine[]> => {
      const endpoint = isFanmade ? `${API_URL}/fan/dialogs/${chapterId}` : `${API_URL}/commu/dialogs/${chapterId}`;
      const res = await fetch(endpoint); return await res.json();
  };

  const markChapterRead = async (chapterId: string) => {
      if(!userId) return;
      await fetch(`${API_URL}/commu/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, chapterId }) });
  };

  const saveFanmadeStory = async (title: string, dialogs: DialogLine[]) => {
      if (!userId) return false;
      const res = await fetch(`${API_URL}/fan/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, title, dialogs }) });
      const data = await res.json(); return data.success;
  };

  const uploadSprite = async (name: string, base64Image: string) => {
      if (!userId) return false;
      const res = await fetch(`${API_URL}/fan/sprite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, name, image: base64Image }) });
      return res.ok;
  };

  const fetchUserSprites = async (): Promise<UserSprite[]> => {
      if (!userId) return [];
      const res = await fetch(`${API_URL}/fan/sprites/${userId}`); return await res.json();
  };

  const redeemPromoCode = async (code: string) => {
      if (!userId) return { success: false, message: "Not logged in" };
      const res = await fetch(`${API_URL}/promo/redeem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, code }) });
      const data = await res.json();
      if (data.success) { fetchData(); return { success: true, message: data.message }; }
      return { success: false, message: data.error };
  };

  const claimPresent = async (presentId: number) => {
      if (!userId) return false;
      const res = await fetch(`${API_URL}/user/${userId}/presents/claim`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, presentId }) });
      const data = await res.json();
      if(data.success) { setPresents(prev => prev.filter(p => p.id !== presentId)); fetchData(); return true; }
      return false;
  };

  const fetchDeck = async (): Promise<string[]> => {
      if(!userId) return [];
      const res = await fetch(`${API_URL}/user/${userId}/deck`); return await res.json();
  };

  const saveDeck = async (cardIds: string[]) => {
      if(!userId) return false;
      await fetch(`${API_URL}/deck`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, cardIds }) });
      return true;
  };

  const findOpponent = async (mode: 'BOT' | 'PVP'): Promise<BattleOpponent | null> => {
      if(!userId) return null;
      try { const res = await fetch(`${API_URL}/battle/match/${userId}?mode=${mode}`); return await res.json(); } catch(e) { console.error(e); return null; }
  };

  const completeBattle = async (won: boolean): Promise<BattleResult | null> => {
      if(!userId) return null;
      try { const res = await fetch(`${API_URL}/battle/finish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, won }) }); const data = await res.json(); if(data.success) { fetchData(); return { won, playerScore: 0, opponentScore: 0, rewards: data.rewards }; } } catch(e) { console.error(e); } return null;
  };

  return {
    userId, user, idols, event, loading, error, presents, announcements, canClaimBonus,
    login, register, logout, useItem, pullGacha, fetchGachaHistory, fetchGachaDetails,
    retireIdols, trainIdol, specialTraining, starLesson, buyItem, doEventWork, 
    doNormalWork, fetchWorkRegions, fetchWorkJobs, // Updated Work functions
    fetchChapters, fetchDialogs, markChapterRead, saveFanmadeStory, uploadSprite, fetchUserSprites, redeemPromoCode, claimPresent, fetchDeck, saveDeck, findOpponent, completeBattle, checkLoginBonus
  };
};
