import React, { useState, useEffect } from 'react';
import { BattleOpponent, BattleResult, Idol, Rarity } from '../types';
import DeckBuilder from './DeckBuilder';

interface LiveBattleProps {
  userId: number;
  userDeckIds: string[];
  allIdols: Idol[];
  onFindOpponent: (mode: 'BOT' | 'PVP') => Promise<BattleOpponent | null>;
  onCompleteBattle: (won: boolean) => Promise<BattleResult | null>;
  onSaveDeck: (ids: string[]) => Promise<boolean>;
  onClose: () => void;
}

const LiveBattle: React.FC<LiveBattleProps> = ({ userId, userDeckIds, allIdols, onFindOpponent, onCompleteBattle, onSaveDeck, onClose }) => {
  const [phase, setPhase] = useState<'MENU' | 'DECK' | 'MATCHMAKING' | 'VS' | 'BATTLE' | 'RESULT'>('MENU');
  const [opponent, setOpponent] = useState<BattleOpponent | null>(null);
  
  // Player Deck for Battle
  const [playerDeck, setPlayerDeck] = useState<Idol[]>([]);
  
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);
  
  // Battle Animation States
  const [turn, setTurn] = useState(0); 
  const [playerScore, setPlayerScore] = useState(0);
  const [enemyScore, setEnemyScore] = useState(0);

  useEffect(() => {
    if (!userDeckIds || !allIdols) return;
    
    const safeDeckIds = Array.isArray(userDeckIds) ? userDeckIds : [];
    const safeIdols = Array.isArray(allIdols) ? allIdols : [];

    const hydrated = safeDeckIds
        .map(id => safeIdols.find(i => i.id === id))
        .filter((i): i is Idol => !!i); 
        
    setPlayerDeck(hydrated);
  }, [userDeckIds, allIdols]);

  const handleStartBattle = async (mode: 'BOT' | 'PVP') => {
      if (playerDeck.length === 0) {
          alert("Your deck is empty! Please set up your unit.");
          setPhase('DECK');
          return;
      }
      setPhase('MATCHMAKING');
      const opp = await onFindOpponent(mode);
      if (opp) {
          setOpponent(opp);
          setTimeout(() => setPhase('VS'), 1500); 
      } else {
          setPhase('MENU');
          alert("Could not find opponent. Please try again.");
      }
  };

  const startCombat = () => {
      setPhase('BATTLE');
      setTurn(0);
      setPlayerScore(0);
      setEnemyScore(0);
      
      let pScore = 0;
      let eScore = 0;
      
      const maxTurns = Math.min(4, Math.max(playerDeck.length, opponent!.cards.length));

      for (let i = 1; i <= maxTurns; i++) {
          setTimeout(() => {
              setTurn(i);
              
              const pCard = playerDeck[i-1];
              const eCard = opponent!.cards[i-1];
              
              const pStat = pCard ? (pCard.vocal + pCard.dance + pCard.visual) : 0;
              const eStat = eCard ? eCard.totalStats : 0;
              
              setPlayerScore(prev => prev + pStat);
              setEnemyScore(prev => prev + eStat);
              
              pScore += pStat;
              eScore += eStat;
          }, i * 1200);
      }

      setTimeout(async () => {
          const won = pScore > eScore;
          const res = await onCompleteBattle(won);
          if (res) {
            setBattleResult(res);
            setPhase('RESULT');
          } else {
            setBattleResult({ won, playerScore: pScore, opponentScore: eScore, rewards: { exp: 0, money: 0, jewels: 0 } });
            setPhase('RESULT');
          }
      }, (maxTurns + 1) * 1200 + 1000);
  };

  const saveDeck = async (ids: string[]) => {
      const success = await onSaveDeck(ids);
      if(success) {
        setPhase('MENU');
      } else {
        alert("Failed to save deck");
      }
  };

  // CRITICAL FIX: Removed key={Date.now()} to prevent constant re-rendering/destroying of the component
  if (phase === 'DECK') {
      return (
        <DeckBuilder 
            idols={Array.isArray(allIdols) ? allIdols : []} 
            currentDeckIds={userDeckIds} 
            onSave={saveDeck} 
            onClose={() => setPhase('MENU')} 
            onExit={onClose} 
        />
      );
  }

  // --- RENDER HELPERS ---

  if (phase === 'MATCHMAKING') {
      return (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h2 className="text-white font-bold animate-pulse">SEARCHING FOR OPPONENT...</h2>
          </div>
      );
  }

  if (phase === 'VS' && opponent) {
      return (
          <div className="absolute inset-0 z-50 bg-gradient-to-br from-blue-900 to-red-900 flex flex-col items-center justify-center overflow-hidden" onClick={startCombat}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
              
              <div className="flex items-center justify-between w-full px-8 z-10">
                  <div className="text-left animate-[slideInLeft_1s]">
                      <h2 className="text-3xl font-black text-blue-400 italic">YOU</h2>
                      <div className="text-white text-xl">Unit Strength</div>
                      <div className="text-sm text-gray-300 mt-2">Power: {playerDeck.reduce((a,c)=>a+(c.vocal+c.dance+c.visual),0)}</div>
                  </div>
                  <div className="text-6xl font-black text-white italic drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-bounce">VS</div>
                  <div className="text-right animate-[slideInRight_1s]">
                      <h2 className="text-3xl font-black text-red-500 italic">ENEMY</h2>
                      <div className="text-white text-xl">{opponent.name}</div>
                      <div className="text-sm text-gray-300 mt-2">Power: ???</div>
                  </div>
              </div>

              <div className="mt-12 text-white font-bold animate-pulse cursor-pointer border border-white px-6 py-2 rounded-full hover:bg-white hover:text-black transition-colors">
                  TAP TO START BATTLE
              </div>
          </div>
      );
  }

  if (phase === 'BATTLE' && opponent) {
      return (
          <div className="absolute inset-0 z-50 bg-gray-900 overflow-hidden flex flex-col">
              <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/stadium/800/1200')] bg-cover opacity-30"></div>
              
              <div className="relative z-20 flex justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
                  <div className="text-blue-400 font-black text-2xl drop-shadow-md">{playerScore}</div>
                  <div className="text-red-500 font-black text-2xl drop-shadow-md">{enemyScore}</div>
              </div>

              <div className="flex-1 relative z-10 flex flex-col justify-center gap-4 p-4">
                  {/* Enemy Side */}
                  <div className="flex justify-center gap-2">
                      {opponent.cards.map((card, i) => (
                          <div key={i} className={`w-20 h-28 bg-gray-800 border-2 border-red-500 rounded transition-all duration-500 transform ${turn > i ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 -translate-y-10 scale-90'}`}>
                              <img src={card.image} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 w-full bg-red-600 text-[8px] text-white text-center font-bold">{card.totalStats}</div>
                          </div>
                      ))}
                  </div>

                  <div className="h-0.5 bg-white/20 w-full my-2 flex items-center justify-center">
                       <span className="bg-black/50 px-2 text-[10px] text-white">BATTLE START</span>
                  </div>

                  {/* Player Side */}
                  <div className="flex justify-center gap-2">
                      {playerDeck.map((card, i) => (
                           <div key={i} className={`w-20 h-28 bg-gray-800 border-2 border-blue-500 rounded transition-all duration-500 transform ${turn > i ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 translate-y-10 scale-90'}`}>
                              <img src={card.image} className="w-full h-full object-cover" />
                              <div className="absolute bottom-0 w-full bg-blue-600 text-[8px] text-white text-center font-bold">{(card.vocal + card.dance + card.visual)}</div>
                           </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  }

  if (phase === 'RESULT' && battleResult) {
       return (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in">
              <h1 className={`text-6xl font-black italic mb-8 ${battleResult.won ? 'text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]' : 'text-gray-500'}`}>
                  {battleResult.won ? "WIN!" : "LOSE..."}
              </h1>

              <div className="bg-gray-800 p-6 rounded-xl border border-gray-600 w-64 text-center">
                  <h3 className="text-white font-bold mb-4">Rewards</h3>
                  <div className="flex justify-around items-center mb-2">
                      <div className="flex flex-col">
                          <span className="text-yellow-400 font-bold">+{battleResult.rewards.money}</span>
                          <span className="text-xs text-gray-400">Money</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-pink-400 font-bold">+{battleResult.rewards.jewels}</span>
                          <span className="text-xs text-gray-400">Jewels</span>
                      </div>
                      <div className="flex flex-col">
                          <span className="text-green-400 font-bold">+{battleResult.rewards.exp}</span>
                          <span className="text-xs text-gray-400">EXP</span>
                      </div>
                  </div>
              </div>

              <button 
                onClick={() => setPhase('MENU')}
                className="mt-8 bg-white text-black font-bold px-8 py-3 rounded-full hover:scale-105 transition-transform"
              >
                  Return to Arena
              </button>
          </div>
       );
  }

  // --- MENU ---
  return (
    <div className="absolute inset-0 z-[100] bg-gray-900 flex flex-col overflow-hidden animate-fade-in pointer-events-auto">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/stadium/800/1200')] bg-cover opacity-40"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-black/50"></div>

        <div className="relative z-10 p-4 flex justify-between items-center">
             <h2 className="text-2xl font-black italic text-white drop-shadow-md"><i className="fas fa-fist-raised text-red-500 mr-2"></i> LIVE ARENA</h2>
             <button onClick={onClose} className="text-white/80 hover:text-white bg-black/30 rounded-full w-8 h-8 flex items-center justify-center"><i className="fas fa-times"></i></button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 p-6">
            <button 
                onClick={() => handleStartBattle('PVP')}
                className="w-full max-w-xs bg-gradient-to-r from-red-600 to-orange-600 py-6 rounded-xl font-black text-white text-xl shadow-[0_0_20px_rgba(220,38,38,0.6)] hover:scale-105 transition-transform flex flex-col items-center border border-red-400"
            >
                <span>BATTLE START</span>
                <span className="text-xs font-normal opacity-80 mt-1">Cost: 20 Stamina</span>
            </button>
            
            <button 
                onClick={() => handleStartBattle('BOT')}
                className="w-full max-w-xs bg-gray-800/80 py-4 rounded-xl font-bold text-gray-300 border border-gray-600 hover:bg-gray-700 transition-colors"
            >
                Practice (Bot)
            </button>

            <button 
                onClick={() => setPhase('DECK')}
                className="w-full max-w-xs bg-blue-600/80 py-4 rounded-xl font-bold text-white border border-blue-400 hover:bg-blue-500 transition-colors flex justify-center items-center gap-2"
            >
                <i className="fas fa-users"></i> Edit Unit
            </button>
        </div>
    </div>
  );
};

export default LiveBattle;