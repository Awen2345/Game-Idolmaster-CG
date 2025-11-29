
import React, { useState, useEffect, useRef } from 'react';
import { Idol, Rarity, GachaHistoryEntry, GachaPoolInfo } from '../types';
import { GACHA_COST, GACHA_10_COST } from '../constants';
import { useGameEngine } from '../services/gameService';
import CardDetail from './CardDetail';

interface GachaProps {
  jewels: number;
  onPull: (count: 1 | 10) => Promise<Idol[] | null>;
}

type GachaStage = 
  | 'IDLE' 
  | 'LOADING' 
  | 'PLATINUM_INTRO' 
  | 'ENVELOPE_APPEAR' 
  | 'ENVELOPE_WAIT' 
  | 'OPENING' 
  | 'REVEAL_SINGLE' 
  | 'RESULT';

const Gacha: React.FC<GachaProps> = ({ jewels, onPull }) => {
  const { fetchGachaHistory, fetchGachaDetails } = useGameEngine();
  
  // Data State
  const [results, setResults] = useState<Idol[] | null>(null);
  const [currentRevealIndex, setCurrentRevealIndex] = useState(0);
  const [stage, setStage] = useState<GachaStage>('IDLE');
  const [highestRarity, setHighestRarity] = useState<Rarity>(Rarity.N);

  // Modals & Overlays
  const [showHistory, setShowHistory] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [historyData, setHistoryData] = useState<GachaHistoryEntry[]>([]);
  const [poolInfo, setPoolInfo] = useState<GachaPoolInfo | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'RATES' | 'POOL'>('RATES');
  const [poolFilter, setPoolFilter] = useState<'ALL' | 'SSR' | 'SR' | 'R' | 'N'>('ALL');
  const [activePreviewCard, setActivePreviewCard] = useState<any>(null);

  // Refs for timeouts
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- ACTIONS ---

  const loadHistory = async () => {
      const data = await fetchGachaHistory();
      setHistoryData(data);
      setShowHistory(true);
  };

  const loadDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const data = await fetchGachaDetails();
        if (data) {
            setPoolInfo(data);
            setShowDetails(true);
        }
      } catch (e) {
          console.error("Failed to load details", e);
      } finally {
          setIsLoadingDetails(false);
      }
  };

  const handlePull = async (count: 1 | 10) => {
    if (jewels < (count === 10 ? GACHA_10_COST : GACHA_COST)) {
      alert("Not enough Star Jewels!");
      return;
    }
    setStage('LOADING');

    // Simulate network delay
    await new Promise(r => setTimeout(r, 800));

    const pulledIdols = await onPull(count);
    
    if (pulledIdols) {
      setResults(pulledIdols);
      setCurrentRevealIndex(0);
      
      const max = pulledIdols.some(i => i.rarity === Rarity.SSR) ? Rarity.SSR 
                : pulledIdols.some(i => i.rarity === Rarity.SR) ? Rarity.SR 
                : Rarity.R;
      setHighestRarity(max);
      
      // Start Animation Sequence
      setStage('PLATINUM_INTRO');
      
      timeoutRef.current = setTimeout(() => {
          setStage('ENVELOPE_APPEAR');
          timeoutRef.current = setTimeout(() => setStage('ENVELOPE_WAIT'), 1200);
      }, 2500); // Intro duration
    } else {
      setStage('IDLE');
    }
  };

  const openEnvelope = () => {
      if (stage !== 'ENVELOPE_WAIT') return;
      setStage('OPENING');
      timeoutRef.current = setTimeout(() => {
          setStage('REVEAL_SINGLE');
      }, 1500);
  };

  const nextReveal = () => {
      if (!results) return;
      if (currentRevealIndex < results.length - 1) {
          setCurrentRevealIndex(prev => prev + 1);
      } else {
          setStage('RESULT');
      }
  };

  const skipAnimation = () => {
      setStage('RESULT');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const reset = () => {
    setResults(null);
    setStage('IDLE');
    setHighestRarity(Rarity.N);
    setCurrentRevealIndex(0);
  };

  // --- STYLES ---
  const styles = `
    @keyframes rays { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
    @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
    @keyframes burst { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
    @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
    @keyframes cardFlip { 0% { transform: rotateY(90deg); opacity: 0; } 100% { transform: rotateY(0deg); opacity: 1; } }
    @keyframes slideIn { 0% { transform: translateY(50px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
    @keyframes textShine { 0% { background-position: -200%; } 100% { background-position: 200%; } }

    .animate-rays { animation: rays 10s linear infinite; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-shake { animation: shake 0.5s; }
    .animate-burst { animation: burst 0.8s forwards; }
    .animate-card-flip { animation: cardFlip 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .animate-slide-in { animation: slideIn 0.5s ease-out forwards; }
    .bg-shine { background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); background-size: 200% 100%; animation: textShine 2s infinite linear; }
  `;

  // --- RENDERERS ---

  const renderHistoryModal = () => (
      <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-lg overflow-hidden flex flex-col max-h-[80vh] text-black shadow-2xl">
              <div className="bg-gray-200 p-4 flex justify-between items-center border-b border-gray-300">
                  <h3 className="font-bold">Gacha History</h3>
                  <button onClick={() => setShowHistory(false)} className="text-gray-500 hover:text-black"><i className="fas fa-times"></i></button>
              </div>
              <div className="flex-1 overflow-y-auto p-0">
                  <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                          <tr>
                              <th className="p-2 text-left">Date</th>
                              <th className="p-2 text-left">Idol</th>
                              <th className="p-2 text-center">Rarity</th>
                          </tr>
                      </thead>
                      <tbody>
                          {historyData.map(entry => (
                              <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="p-2 text-gray-500 text-xs">{new Date(entry.pulled_at).toLocaleString()}</td>
                                  <td className="p-2 font-bold">{entry.idol_name}</td>
                                  <td className={`p-2 text-center font-bold ${entry.rarity === 'SSR' ? 'text-pink-500' : entry.rarity === 'SR' ? 'text-orange-500' : 'text-gray-500'}`}>
                                      {entry.rarity}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );

  const renderDetailsModal = () => {
      if(!poolInfo) return null;
      
      const filteredPool = poolInfo.pool.filter(c => poolFilter === 'ALL' || c.rarity === poolFilter);
      const rarityOrder = { 'SSR': 3, 'SR': 2, 'R': 1, 'N': 0 };
      const sortedPool = [...filteredPool].sort((a, b) => (rarityOrder[b.rarity as keyof typeof rarityOrder] || 0) - (rarityOrder[a.rarity as keyof typeof rarityOrder] || 0));

      return (
        <div className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-lg overflow-hidden flex flex-col h-[80vh] text-black shadow-2xl">
                <div className="bg-pink-600 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold">Universal Gacha Details</h3>
                    <button onClick={() => setShowDetails(false)} className="text-white hover:text-pink-200"><i className="fas fa-times"></i></button>
                </div>
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setDetailsTab('RATES')} className={`flex-1 py-3 text-sm font-bold ${detailsTab === 'RATES' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}>Drop Rates</button>
                    <button onClick={() => setDetailsTab('POOL')} className={`flex-1 py-3 text-sm font-bold ${detailsTab === 'POOL' ? 'border-b-2 border-pink-500 text-pink-600' : 'text-gray-500'}`}>Card Pool</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {detailsTab === 'RATES' ? (
                        <div className="space-y-4">
                            <h4 className="font-bold border-l-4 border-pink-500 pl-2">Rarity Rates</h4>
                            <table className="w-full border-collapse border border-gray-300 bg-white shadow-sm">
                                <thead className="bg-gray-100"><tr><th className="border p-2 text-left">Rarity</th><th className="border p-2 text-right">Probability</th></tr></thead>
                                <tbody>
                                    {Object.entries(poolInfo.rates).map(([rarity, rate]) => (
                                        <tr key={rarity}><td className={`border p-2 font-bold ${rarity === 'SSR' ? 'text-pink-600' : ''}`}>{rarity}</td><td className="border p-2 text-right">{rate}%</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h4 className="font-bold border-l-4 border-blue-500 pl-2">Available Idols ({sortedPool.length})</h4>
                            <div className="flex gap-2 text-xs overflow-x-auto pb-2">
                                {['ALL', 'SSR', 'SR', 'R', 'N'].map(f => (
                                    <button key={f} onClick={() => setPoolFilter(f as any)} className={`px-3 py-1 rounded-full font-bold border ${poolFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>{f}</button>
                                ))}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {sortedPool.map(card => (
                                    <div key={card.id} onClick={() => setActivePreviewCard(card)} className="relative aspect-[3/4] bg-gray-200 rounded cursor-pointer overflow-hidden border border-gray-300 hover:border-pink-500 transition-colors group">
                                        <img src={card.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                                        <div className={`absolute top-0 left-0 px-1 text-[8px] text-white font-bold ${card.rarity === 'SSR' ? 'bg-pink-500' : card.rarity === 'SR' ? 'bg-orange-500' : 'bg-gray-500'}`}>{card.rarity}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      );
  };

  // --- ANIMATION PHASES ---

  const renderPlatinumIntro = () => (
      <div className="absolute inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
          <div className="relative text-center">
              <h1 className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-300 to-gray-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] tracking-tighter transform skew-x-[-10deg] animate-[slideIn_1s_ease-out]">
                  PLATINUM
              </h1>
              <h2 className="text-4xl font-black text-white tracking-[0.5em] animate-[slideIn_1s_ease-out_0.3s_both]">
                  AUDITION
              </h2>
              <div className="absolute top-0 left-0 w-full h-full bg-shine opacity-50 mix-blend-overlay"></div>
          </div>
      </div>
  );

  const renderSingleReveal = () => {
      if (!results) return null;
      const card = results[currentRevealIndex];
      const isSSR = card.rarity === Rarity.SSR;
      const isSR = card.rarity === Rarity.SR;

      return (
          <div 
            className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center overflow-hidden cursor-pointer"
            onClick={nextReveal}
          >
              <style>{styles}</style>
              
              {/* Skip Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); skipAnimation(); }}
                className="absolute top-8 right-8 z-50 text-white border border-white/50 px-4 py-1 rounded-full text-xs hover:bg-white/20 transition-colors"
              >
                  SKIP <i className="fas fa-forward ml-1"></i>
              </button>

              {/* Background Effects */}
              {isSSR ? (
                  <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-900 via-purple-900 to-indigo-900 opacity-80"></div>
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full animate-[rays_20s_linear_infinite]"></div>
                  </div>
              ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-black to-black"></div>
              )}

              {/* Card Container */}
              <div className="relative z-10 w-[300px] h-[400px] perspective-1000 animate-card-flip">
                  {/* Glow Behind */}
                  <div className={`absolute -inset-4 rounded-xl blur-xl opacity-70 animate-pulse ${isSSR ? 'bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500' : isSR ? 'bg-yellow-500' : 'bg-white/20'}`}></div>
                  
                  {/* The Card */}
                  <div className={`relative w-full h-full rounded-xl overflow-hidden shadow-2xl border-4 ${isSSR ? 'border-pink-300' : isSR ? 'border-yellow-400' : 'border-gray-400'}`}>
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                      
                      {/* New Badge */}
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-black px-2 py-1 rounded shadow-lg animate-bounce">
                          NEW!
                      </div>

                      {/* Rarity & Name Plate */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-12">
                          <div className={`text-4xl font-black italic mb-1 ${isSSR ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-pink-400 drop-shadow-md' : 'text-white'}`}>
                              {card.rarity}
                          </div>
                          <div className="text-white font-bold text-lg leading-tight">{card.name}</div>
                          <div className="text-gray-300 text-xs mt-1">{card.type} TYPE</div>
                      </div>
                  </div>
              </div>

              <div className="absolute bottom-10 text-white/50 text-sm animate-pulse">
                  Tap to continue
              </div>
          </div>
      );
  };

  // --- MAIN RENDER ---

  return (
    <div className="h-full flex flex-col items-center justify-between p-4 bg-gradient-to-b from-purple-900 to-black overflow-y-auto relative">
      <style>{styles}</style>

      {/* Main UI */}
      <div className="w-full text-center mt-4">
        <h1 className="text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(236,72,153,0.8)] italic tracking-tighter transform -skew-x-6">UNIVERSAL GACHA</h1>
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent mt-2"></div>
      </div>

      <div className="relative w-full max-w-xs aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(236,72,153,0.3)] border border-pink-500/30 group my-4">
          <img src="https://picsum.photos/seed/gacha_banner/400/600" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700 scale-100 group-hover:scale-110 transition-transform" />
          <div className="absolute top-4 left-0 bg-gradient-to-r from-pink-600 to-transparent text-white font-bold px-4 py-1 shadow-md skew-x-[-10deg] -ml-2">
              <span className="skew-x-[10deg] inline-block">PLATINUM AUDITION</span>
          </div>
      </div>

      <div className="w-full mb-4 space-y-3">
        <div className="flex gap-2">
            <button onClick={loadDetails} disabled={isLoadingDetails} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 rounded border border-gray-500 flex items-center justify-center">
                {isLoadingDetails ? <i className="fas fa-spinner animate-spin mr-1"></i> : <i className="fas fa-info-circle mr-1"></i>} Details
            </button>
            <button onClick={loadHistory} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 rounded border border-gray-500">
                <i className="fas fa-history mr-1"></i> History
            </button>
        </div>
        <button onClick={() => handlePull(1)} className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white py-3 rounded-lg font-bold shadow-lg flex justify-between px-4 transition-transform active:scale-95 border border-blue-400/50">
          <span>1x Pull</span><div className="bg-black/20 px-2 rounded font-mono text-sm"><i className="fas fa-star text-pink-300 mr-1"></i> {GACHA_COST}</div>
        </button>
        <button onClick={() => handlePull(10)} className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 text-white py-4 rounded-lg font-bold shadow-[0_0_15px_rgba(236,72,153,0.6)] flex justify-between px-4 transition-transform active:scale-95 border border-pink-400 relative overflow-hidden">
          <span className="z-10 flex flex-col items-start"><span className="text-lg italic">10x Pull</span><span className="text-[9px] bg-black/30 px-1 rounded">SR Guaranteed</span></span>
          <div className="z-10 bg-black/20 px-2 py-1 rounded font-mono flex items-center border border-white/20"><i className="fas fa-star text-pink-300 mr-1"></i> {GACHA_10_COST}</div>
        </button>
      </div>

      {/* OVERLAYS */}
      {showHistory && renderHistoryModal()}
      {showDetails && renderDetailsModal()}
      {activePreviewCard && <CardDetail card={activePreviewCard} onClose={() => setActivePreviewCard(null)} />}

      {/* ANIMATION STAGES */}
      {stage === 'LOADING' && (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-pink-300 mt-4 font-bold tracking-widest animate-pulse">CONNECTING...</p>
        </div>
      )}

      {stage === 'PLATINUM_INTRO' && renderPlatinumIntro()}

      {['ENVELOPE_APPEAR', 'ENVELOPE_WAIT', 'OPENING'].includes(stage) && (
        <div className="absolute inset-0 z-50 bg-gray-900 overflow-hidden flex flex-col items-center justify-center perspective-1000">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-black to-black opacity-80"></div>
            {highestRarity === Rarity.SSR && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>}
            
            {stage === 'ENVELOPE_WAIT' && <div className="absolute bottom-24 text-white font-light tracking-[0.5em] text-sm animate-pulse z-20">TOUCH TO OPEN</div>}
            {stage === 'OPENING' && <div className="absolute inset-0 bg-white z-50 animate-burst pointer-events-none"></div>}
            
            <div 
                onClick={stage === 'ENVELOPE_WAIT' ? openEnvelope : undefined}
                className={`relative w-72 h-48 cursor-pointer transition-transform duration-300 ${stage === 'ENVELOPE_APPEAR' ? 'animate-[bounce_1s]' : 'animate-float'} ${stage === 'OPENING' ? 'animate-shake scale-110' : 'hover:scale-105'}`}
            >
                {highestRarity === Rarity.SSR && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none z-0">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-rays absolute opacity-50"></div>
                    </div>
                )}
                <div className={`relative z-10 w-full h-full rounded shadow-2xl overflow-hidden flex items-center justify-center border-b-8 border-r-8 border-black/20 ${highestRarity === Rarity.SSR ? 'bg-gradient-to-br from-blue-600 to-indigo-900' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                    <div className="absolute top-0 w-0 h-0 border-l-[144px] border-r-[144px] border-t-[100px] border-l-transparent border-r-transparent border-t-white/90 drop-shadow-md"></div>
                    <div className="absolute top-16 bg-white rounded-full p-1 shadow-lg">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white ${highestRarity === Rarity.SSR ? 'bg-gradient-to-br from-yellow-300 to-pink-500 animate-pulse' : 'bg-blue-300'}`}>
                            <i className="fas fa-crown text-white text-xl drop-shadow-md"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {stage === 'REVEAL_SINGLE' && renderSingleReveal()}

      {stage === 'RESULT' && results && (
        <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center p-4 overflow-y-auto animate-fade-in">
            <h2 className="text-3xl font-extrabold text-white mb-6 mt-4 z-10">SCOUT RESULTS</h2>
            <div className="grid grid-cols-2 gap-3 w-full mb-20 z-10">
                {results.map((idol, idx) => (
                    <div key={idx} className={`relative bg-gray-800 rounded overflow-hidden shadow-lg border-2 ${idol.rarity === 'SSR' ? 'border-pink-500' : idol.rarity === 'SR' ? 'border-yellow-500' : 'border-gray-600'}`}>
                        <img src={idol.image} className="w-full h-32 object-cover" />
                        <div className={`absolute top-0 left-0 px-1 text-[9px] font-bold text-white ${idol.rarity === 'SSR' ? 'bg-pink-500' : idol.rarity === 'SR' ? 'bg-orange-500' : 'bg-gray-500'}`}>{idol.rarity}</div>
                        <div className="p-1 bg-black/80">
                            <div className="text-[10px] text-white truncate font-bold">{idol.name}</div>
                        </div>
                        <div className="absolute top-1 right-1 bg-red-600 text-white text-[8px] px-1 rounded animate-pulse">NEW</div>
                    </div>
                ))}
            </div>
            <button onClick={reset} className="fixed bottom-10 bg-white text-pink-600 px-12 py-3 rounded-full font-black shadow-xl hover:scale-105 transition-transform z-50 border-2 border-pink-200">CLOSE</button>
        </div>
      )}
    </div>
  );
};

export default Gacha;
