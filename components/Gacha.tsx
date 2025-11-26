
import React, { useState, useEffect } from 'react';
import { Idol, Rarity } from '../types';
import { GACHA_COST, GACHA_10_COST } from '../constants';

interface GachaProps {
  jewels: number;
  onPull: (count: 1 | 10) => Promise<Idol[] | null>;
}

const Gacha: React.FC<GachaProps> = ({ jewels, onPull }) => {
  const [results, setResults] = useState<Idol[] | null>(null);
  const [stage, setStage] = useState<'IDLE' | 'LOADING' | 'ENVELOPE_APPEAR' | 'ENVELOPE_WAIT' | 'OPENING' | 'REVEAL'>('IDLE');
  const [highestRarity, setHighestRarity] = useState<Rarity>(Rarity.N);

  const handlePull = async (count: 1 | 10) => {
    if (jewels < (count === 10 ? GACHA_10_COST : GACHA_COST)) {
      alert("Not enough Star Jewels!");
      return;
    }
    setStage('LOADING');

    // Simulate network delay for suspense
    await new Promise(r => setTimeout(r, 800));

    const pulledIdols = await onPull(count);
    
    if (pulledIdols) {
      setResults(pulledIdols);
      // Determine Envelope Type
      const max = pulledIdols.some(i => i.rarity === Rarity.SSR) ? Rarity.SSR 
                : pulledIdols.some(i => i.rarity === Rarity.SR) ? Rarity.SR 
                : Rarity.R; // R is min for premium gacha usually
      setHighestRarity(max);
      
      setStage('ENVELOPE_APPEAR');
      setTimeout(() => setStage('ENVELOPE_WAIT'), 1000);
    } else {
      setStage('IDLE');
    }
  };

  const openEnvelope = () => {
      setStage('OPENING');
      setTimeout(() => {
          setStage('REVEAL');
      }, 1500);
  };

  const reset = () => {
    setResults(null);
    setStage('IDLE');
  };

  // --- CUSTOM CSS STYLES FOR ANIMATION ---
  const styles = `
    @keyframes rays { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
    @keyframes shake { 0% { transform: translate(1px, 1px) rotate(0deg); } 10% { transform: translate(-1px, -2px) rotate(-1deg); } 20% { transform: translate(-3px, 0px) rotate(1deg); } 30% { transform: translate(3px, 2px) rotate(0deg); } 40% { transform: translate(1px, -1px) rotate(1deg); } 50% { transform: translate(-1px, 2px) rotate(-1deg); } 60% { transform: translate(-3px, 1px) rotate(0deg); } 70% { transform: translate(3px, 1px) rotate(-1deg); } 80% { transform: translate(-1px, -1px) rotate(1deg); } 90% { transform: translate(1px, 2px) rotate(0deg); } 100% { transform: translate(1px, -2px) rotate(-1deg); } }
    @keyframes burst { 0% { transform: scale(0); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
    @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
    @keyframes cardFlip { 0% { transform: rotateY(90deg); opacity: 0; } 100% { transform: rotateY(0deg); opacity: 1; } }
    
    .animate-rays { animation: rays 10s linear infinite; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .animate-shake { animation: shake 0.5s; }
    .animate-burst { animation: burst 0.8s forwards; }
    .animate-card-flip { animation: cardFlip 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
  `;

  // --- RENDER HELPERS ---

  const renderEnvelope = () => {
      const isSSR = highestRarity === Rarity.SSR;
      
      return (
        <div 
            onClick={stage === 'ENVELOPE_WAIT' ? openEnvelope : undefined}
            className={`relative w-72 h-48 cursor-pointer transition-transform duration-300 ${stage === 'ENVELOPE_APPEAR' ? 'animate-[bounce_1s]' : 'animate-float'} ${stage === 'OPENING' ? 'animate-shake scale-110' : 'hover:scale-105'}`}
        >
            {/* Glow / Rays for SSR */}
            {isSSR && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none z-0">
                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-rays absolute opacity-50"></div>
                    <div className="w-full h-full bg-gradient-to-t from-transparent via-pink-500/30 to-transparent rounded-full animate-rays absolute animation-delay-500 opacity-50 rotate-45"></div>
                </div>
            )}

            {/* The Envelope Body */}
            <div className={`relative z-10 w-full h-full rounded shadow-2xl overflow-hidden flex items-center justify-center border-b-8 border-r-8 border-black/20 ${isSSR ? 'bg-gradient-to-br from-blue-600 to-indigo-900' : 'bg-gradient-to-br from-blue-400 to-blue-600'}`}>
                {/* SSR Embroidery Pattern */}
                {isSSR && (
                    <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/floral-linen.png')]"></div>
                )}

                {/* The Flap Lines */}
                <div className="absolute top-0 w-0 h-0 border-l-[144px] border-r-[144px] border-t-[100px] border-l-transparent border-r-transparent border-t-white/90 drop-shadow-md"></div>
                
                {/* Sticker / Seal */}
                <div className={`absolute top-16 bg-white rounded-full p-1 shadow-lg ${isSSR ? 'animate-pulse' : ''}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white ${isSSR ? 'bg-gradient-to-br from-yellow-300 to-pink-500' : 'bg-blue-300'}`}>
                        <i className="fas fa-crown text-white text-xl drop-shadow-md"></i>
                    </div>
                </div>

                {/* SSR Sparkles */}
                {isSSR && (
                    <>
                        <div className="absolute top-10 left-10 text-yellow-300 text-2xl animate-[sparkle_2s_infinite]"><i className="fas fa-star"></i></div>
                        <div className="absolute bottom-10 right-10 text-pink-300 text-xl animate-[sparkle_2s_infinite_0.5s]"><i className="fas fa-star"></i></div>
                    </>
                )}
            </div>
        </div>
      );
  };

  if (stage === 'LOADING') {
      return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
            <style>{styles}</style>
            <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-pink-300 mt-4 font-bold tracking-widest animate-pulse">CONNECTING...</p>
        </div>
      );
  }

  // Cinematic Fullscreen Overlay
  if (['ENVELOPE_APPEAR', 'ENVELOPE_WAIT', 'OPENING'].includes(stage)) {
    return (
      <div className="absolute inset-0 z-50 bg-gray-900 overflow-hidden flex flex-col items-center justify-center perspective-1000">
        <style>{styles}</style>
        
        {/* Background Atmosphere */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-black to-black opacity-80"></div>
        {highestRarity === Rarity.SSR && (
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
        )}

        {/* Instructions */}
        {stage === 'ENVELOPE_WAIT' && (
            <div className="absolute bottom-20 text-white font-light tracking-[0.5em] text-sm animate-pulse z-20">
                TOUCH TO OPEN
            </div>
        )}

        {/* Light Burst on Open */}
        {stage === 'OPENING' && (
            <div className="absolute inset-0 bg-white z-50 animate-burst pointer-events-none"></div>
        )}

        {renderEnvelope()}
      </div>
    );
  }

  if (stage === 'REVEAL' && results) {
    return (
      <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col items-center p-4 overflow-y-auto">
        <style>{styles}</style>
        
        {/* Confetti / bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
             {results.some(i => i.rarity === Rarity.SSR) && (
                 <div className="w-full h-full bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-10"></div>
             )}
        </div>

        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-6 mt-4 z-10 drop-shadow-sm">
          RESULTS
        </h2>
        
        <div className="grid grid-cols-2 gap-4 w-full mb-20 z-10">
          {results.map((idol, idx) => (
            <div 
              key={idx} 
              className={`relative bg-gray-800 rounded-lg overflow-hidden shadow-2xl transform opacity-0 animate-card-flip border-2`}
              style={{ 
                  animationDelay: `${idx * 200}ms`, // Staggered reveal
                  borderColor: idol.rarity === Rarity.SSR ? '#f472b6' : idol.rarity === Rarity.SR ? '#fbbf24' : '#6b7280'
              }} 
            >
               {/* SSR Glow */}
               {idol.rarity === Rarity.SSR && (
                 <div className="absolute inset-0 z-0 bg-gradient-to-tr from-pink-500/20 to-yellow-500/20 animate-pulse"></div>
               )}

              <div className="relative z-10">
                  <img src={idol.image} alt={idol.name} className="w-full h-40 object-cover" />
                  
                  {/* Rarity Ribbon */}
                  <div className={`absolute top-0 left-0 px-2 py-0.5 rounded-br-lg text-[10px] font-black tracking-tighter z-20 shadow-md ${
                      idol.rarity === Rarity.SSR ? 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 text-white border border-white/50' :
                      idol.rarity === Rarity.SR ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800'
                  }`}>
                      {idol.rarity}
                  </div>

                  <div className="absolute bottom-0 w-full bg-black/80 p-1.5 backdrop-blur-sm">
                    <div className={`text-sm font-bold truncate ${idol.rarity === Rarity.SSR ? 'text-yellow-300' : 'text-white'}`}>
                        {idol.name}
                    </div>
                  </div>
              </div>
              
              <div className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-1 rounded font-bold animate-ping" style={{ animationDuration: '3s' }}>NEW</div>
            </div>
          ))}
        </div>

        <button 
          onClick={reset}
          className="fixed bottom-20 bg-white text-pink-600 px-12 py-3 rounded-full font-black tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform z-50"
        >
          OK
        </button>
      </div>
    );
  }

  // --- MAIN IDLE SCREEN ---
  return (
    <div className="h-full flex flex-col items-center justify-between p-4 bg-gradient-to-b from-purple-900 to-black overflow-y-auto">
      <div className="w-full text-center mt-4">
        <h1 className="text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(236,72,153,0.8)] italic tracking-tighter transform -skew-x-6">
          PLATINUM GACHA
        </h1>
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent mt-2"></div>
      </div>

      <div className="relative w-full max-w-xs aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(236,72,153,0.3)] border border-pink-500/30 group my-4">
          <img src="https://picsum.photos/seed/uzuki/400/600" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700 scale-100 group-hover:scale-110 transition-transform" alt="Banner" />
          
          <div className="absolute top-4 left-0 bg-gradient-to-r from-pink-600 to-transparent text-white font-bold px-4 py-1 shadow-md skew-x-[-10deg] -ml-2">
              <span className="skew-x-[10deg] inline-block">SSR APPEARANCE UP!</span>
          </div>

          <div className="absolute bottom-0 w-full h-2/3 bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-4">
             <div className="text-yellow-300 font-bold text-lg drop-shadow-md">New Idol</div>
             <div className="text-white font-black text-3xl leading-none mb-2">Uzuki Shimamura</div>
          </div>
      </div>

      <div className="w-full space-y-3 mb-4">
        <button 
          onClick={() => handlePull(1)}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:brightness-110 text-white py-3 rounded-lg font-bold shadow-lg flex justify-between items-center px-4 transition-transform active:scale-95 border border-blue-400/50"
        >
          <span>1x Pull</span>
          <div className="flex items-center text-sm font-mono bg-black/20 px-2 rounded"><i className="fas fa-star text-pink-300 mr-1"></i> {GACHA_COST}</div>
        </button>
        
        <button 
          onClick={() => handlePull(10)}
          className="w-full relative overflow-hidden bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110 text-white py-4 rounded-lg font-bold shadow-[0_0_15px_rgba(236,72,153,0.6)] flex justify-between items-center px-4 transition-transform active:scale-95 border border-pink-400"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 animate-[pulse_4s_infinite]"></div>
          <span className="flex flex-col items-start z-10">
             <span className="text-lg italic">10x Pull</span>
             <span className="text-[10px] text-yellow-200 bg-black/30 px-1 rounded">SR Guaranteed!</span>
          </span>
          <div className="flex items-center font-mono z-10 bg-black/20 px-2 py-1 rounded border border-white/20">
              <i className="fas fa-star text-pink-300 mr-1"></i> {GACHA_10_COST}
          </div>
        </button>
      </div>
    </div>
  );
};

export default Gacha;
