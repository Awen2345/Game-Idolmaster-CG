
import { useState, useEffect, useCallback } from 'react';
import { UserState, Idol, EventData, Chapter, DialogLine, UserSprite, Present, Announcement, BattleOpponent, BattleResult } from '../types';

const API_URL = '/api';

const INITIAL_USER: UserState = {
  id: 0,
  name: "Guest",
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

  const register = async (u: string, p: string) => {
    try {
        const res = await fetch(`${API_URL}/auth/register`, {
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

  const logout = () => {
      setUserId(null);
      setUser(INITIAL_USER);
  };

  const fetchData = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const userRes = await fetch(`${API_URL}/user/${userId}`);
      if (!userRes.ok) throw new Error("Connection failed");
      const userData = await userRes.json();
      setUser(userData);

      const idolsRes = await fetch(`${API_URL}/user/${userId}/idols`);
      const idolsData = await idolsRes.json();
      setIdols(idolsData);
      
      const eventRes = await fetch(`${API_URL}/event/active/${userId}`);
      const eventData = await eventRes.json();
      if (eventData.isActive) {
          setEvent(eventData);
      } else {
          setEvent(null);
      }

      // Fetch Presents
      const presentsRes = await fetch(`${API_URL}/user/${userId}/presents`);
      setPresents(await presentsRes.json());

      // Fetch Announcements
      const newsRes = await fetch(`${API_URL}/announcements`);
      setAnnouncements(await newsRes.json());

      setError(null);
    } catch (e: any) {
      console.error("Fetch error", e);
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
        fetchData();
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }
  }, [fetchData, userId]);

  const useItem = async (itemName: 'staminaDrink' | 'trainerTicket') => {
    if (!userId) return;
    try {
        const res = await fetch(`${API_URL}/item/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, item: itemName })
        });
        const data = await res.json();
        if (data.success) {
            fetchData();
            return true;
        }
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
        if (data.error) {
            alert(data.error);
            return null;
        }
        setUser(prev => ({ ...prev, starJewels: data.newJewels }));
        setIdols(prev => [...prev, ...data.pulledIdols]);
        return data.pulledIdols;
    } catch(e) {
        alert("Gacha failed: Server Error");
        return null;
    }
  };

  const retireIdols = async (idsToRetire: string[]) => {
    if (!userId) return;
    try {
        const res = await fetch(`${API_URL}/idol/retire`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, ids: idsToRetire })
        });
        const data = await res.json();
        if (data.success) {
            setIdols(prev => prev.filter(i => !idsToRetire.includes(i.id)));
            fetchData(); 
        }
    } catch(e) { console.error(e); }
  };

  const trainIdol = async (idolId: string): Promise<boolean> => {
    if (!userId) return false;
    try {
        const res = await fetch(`${API_URL}/idol/train`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, idolId })
        });
        const data = await res.json();
        if (data.success) {
             fetchData();
             return true;
        } else {
            alert(data.error);
        }
    } catch(e) { console.error(e); }
    return false;
  };

  const buyItem = async (item: string, cost: number) => {
    if (!userId) return;
    try {
        const res = await fetch(`${API_URL}/shop/buy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, item, cost })
        });
        const data = await res.json();
        if (data.success) {
            fetchData();
            return true;
        } else {
            alert(data.error);
        }
    } catch(e) { console.error(e); }
    return false;
  };

  const doEventWork = async (staminaCost: number) => {
      if (!userId || !event) return;
      try {
          const res = await fetch(`${API_URL}/event/work`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, eventId: event.id, staminaCost })
          });
          const data = await res.json();
          if (data.success) {
              fetchData();
              return data;
          } else {
              alert(data.error);
          }
      } catch (e) { console.error(e); }
      return null;
  };

  const fetchChapters = async (type: string) => {
      if (type === 'FANMADE') {
          const res = await fetch(`${API_URL}/fan/chapters`);
          return await res.json();
      }
      const res = await fetch(`${API_URL}/commu/chapters?type=${type}&userId=${userId}`);
      return await res.json();
  };

  const fetchDialogs = async (chapterId: string, isFanmade: boolean = false): Promise<DialogLine[]> => {
      const endpoint = isFanmade 
        ? `${API_URL}/fan/dialogs/${chapterId}`
        : `${API_URL}/commu/dialogs/${chapterId}`;
      const res = await fetch(endpoint);
      return await res.json();
  };

  const markChapterRead = async (chapterId: string) => {
      if(!userId) return;
      try {
        await fetch(`${API_URL}/commu/read`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ userId, chapterId })
        });
      } catch (e) { console.error(e); }
  };

  const saveFanmadeStory = async (title: string, dialogs: DialogLine[]) => {
      if (!userId) return false;
      try {
          const res = await fetch(`${API_URL}/fan/create`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, title, dialogs })
          });
          const data = await res.json();
          return data.success;
      } catch(e) {
          console.error(e);
          return false;
      }
  };

  const uploadSprite = async (name: string, base64Image: string) => {
      if (!userId) return false;
      try {
          const res = await fetch(`${API_URL}/fan/sprite`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, name, image: base64Image })
          });
          return res.ok;
      } catch(e) {
          console.error(e);
          return false;
      }
  };

  const fetchUserSprites = async (): Promise<UserSprite[]> => {
      if (!userId) return [];
      try {
          const res = await fetch(`${API_URL}/fan/sprites/${userId}`);
          return await res.json();
      } catch(e) {
          console.error(e);
          return [];
      }
  };

  const redeemPromoCode = async (code: string) => {
      if (!userId) return { success: false, message: "Not logged in" };
      try {
          const res = await fetch(`${API_URL}/promo/redeem`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, code })
          });
          const data = await res.json();
          if (data.success) {
              fetchData(); // Refresh to see present
              return { success: true, message: data.message };
          }
          return { success: false, message: data.error };
      } catch(e) {
          return { success: false, message: "Server Error" };
      }
  };

  const claimPresent = async (presentId: number) => {
      if (!userId) return false;
      try {
          const res = await fetch(`${API_URL}/user/${userId}/presents/claim`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, presentId })
          });
          const data = await res.json();
          if(data.success) {
              setPresents(prev => prev.filter(p => p.id !== presentId));
              fetchData(); // Refresh user balance
              return true;
          }
      } catch (e) { console.error(e); }
      return false;
  };

  // --- BATTLE SERVICES ---
  
  const fetchDeck = async (): Promise<string[]> => {
      if(!userId) return [];
      const res = await fetch(`${API_URL}/user/${userId}/deck`);
      return await res.json();
  };

  const saveDeck = async (cardIds: string[]) => {
      if(!userId) return false;
      await fetch(`${API_URL}/deck`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, cardIds })
      });
      return true;
  };

  const findOpponent = async (mode: 'BOT' | 'PVP'): Promise<BattleOpponent | null> => {
      if(!userId) return null;
      try {
          const res = await fetch(`${API_URL}/battle/match/${userId}?mode=${mode}`);
          return await res.json();
      } catch(e) { console.error(e); return null; }
  };

  const completeBattle = async (won: boolean): Promise<BattleResult | null> => {
      if(!userId) return null;
      try {
          const res = await fetch(`${API_URL}/battle/finish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId, won })
          });
          const data = await res.json();
          if(data.success) {
              fetchData(); // Refresh user rewards
              return { won, playerScore: 0, opponentScore: 0, rewards: data.rewards };
          }
      } catch(e) { console.error(e); }
      return null;
  };

  return {
    userId, user, idols, event, loading, error, presents, announcements,
    login, register, logout, useItem, pullGacha, retireIdols, trainIdol, buyItem, doEventWork,
    fetchChapters, fetchDialogs, markChapterRead, saveFanmadeStory, uploadSprite, fetchUserSprites, redeemPromoCode,
    claimPresent,
    fetchDeck, saveDeck, findOpponent, completeBattle
  };
};
