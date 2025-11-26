import React, { useState } from 'react';
import { Idol, Rarity } from '../types';
import { GACHA_COST, GACHA_10_COST } from '../constants';

interface GachaProps {
  jewels: number;
  onPull: (count: 1 | 10) => Promise<Idol[] | null>;
}

const Gacha: React.FC<GachaProps> = ({ jewels, onPull }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [results, setResults] = useState<Idol[] | null>(null);
  const [stage, setStage] = useState<'IDLE' | 'LOADING' | 'ENVELOPE' | 'REVEAL'>('IDLE');

  const handlePull = async (count: 1 | 10) => {
    if (jewels < (count === 10 ? GACHA_10_COST : GACHA_COST)) {
      alert("Not enough Star Jewels!");
      return;
    }
    setStage('LOADING');
    setIsAnimating(true);

    const pulledIdols = await onPull(count);
    
    if (pulledIdols) {
      setResults(pulledIdols);
      setStage('ENVELOPE');
      setTimeout(() => setStage('REVEAL'), 2000); // 2s Envelope animation
    } else {
      setStage('IDLE');
      setIsAnimating(false);
    }
  };

  const reset = () => {
    setResults(null);
    setStage('IDLE');
    setIsAnimating(false);
  };

  if (stage === 'LOADING') {
      return (
        <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
            <i className="fas fa-spinner fa-spin text-4xl text-pink-500"></i>
            <p className="text-white mt-4 font-bold">Connecting to Server...</p>
        </div>
      );
  }

  if (stage === 'ENVELOPE') {
    return (
      <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
        <div className="text-white text-2xl font-bold animate-pulse mb-8">Signing Contract...</div>
        <div className="relative w-64 h-40 bg-blue-500 rounded-lg shadow-[0_0_50px_rgba(59,130,246,0.5)] border-4 border-white flex items-center justify-center overflow-hidden animate-bounce">
           <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-transparent opacity-30 animate-[spin_3s_linear_infinite]" />
           <i className="fas fa-envelope text-6xl text-white drop-shadow-lg"></i>
        </div>
      </div>
    );
  }

  if (stage === 'REVEAL' && results) {
    return (
      <div className="absolute inset-0 z-50 bg-gray-900/95 flex flex-col items-center p-4 overflow-y-auto">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500 mb-6 mt-4">
          RESULTS
        </h2>
        <div className="grid grid-cols-2 gap-4 w-full mb-20">
          {results.map((idol, idx) => (
            <div 
              key={idx} 
              className={`relative bg-gray-800 rounded-lg overflow-hidden transform transition-all duration-500 hover:scale-105 shadow-xl border-2 ${
                idol.rarity === Rarity.SSR ? 'border-rainbow shadow-rainbow animate-[pulse_2s_infinite]' : 
                idol.rarity === Rarity.SR ? 'border-orange-400' : 'border-gray-500'
              }`}
              style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'backwards' }}
            >
               {/* SSR Rainbow Border Effect Logic in CSS/Style */}
               {idol.rarity === Rarity.SSR && (
                 <div className="absolute inset-0 border-4 border-transparent rounded-lg animate-pulse" style={{ background: 'linear-gradient(45deg, red, orange, yellow, green, blue, indigo, violet) border-box', WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor' }}></div>
               )}

              <img src={idol.image} alt={idol.name} className="w-full h-40 object-cover" />
              <div className="absolute bottom-0 w-full bg-black/70 p-1">
                <div className={`text-xs font-bold ${
                   idol.rarity === Rarity.SSR ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-pink-300 to-yellow-300' :
                   idol.rarity === Rarity.SR ? 'text-orange-300' : 'text-white'
                }`}>
                  {idol.rarity}
                </div>
                <div className="text-white text-sm font-semibold truncate">{idol.name}</div>
              </div>
              
              {/* New Badge */}
              <div className="absolute top-1 right-1 bg-red-600 text-white text-[10px] px-1 rounded font-bold animate-ping">NEW</div>
            </div>
          ))}
        </div>
        <button 
          onClick={reset}
          className="fixed bottom-20 bg-white text-pink-600 px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-100 transition-colors"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-between p-4 bg-gradient-to-b from-purple-900 to-black">
      <div className="w-full text-center mt-4">
        <h1 className="text-4xl font-black text-white drop-shadow-[0_2px_2px_rgba(236,72,153,0.8)] italic">
          PLATINUM GACHA
        </h1>
        <p className="text-pink-300 text-sm mt-2">New SSR Uzuki Shimamura is now available!</p>
      </div>

      <div className="relative w-full max-w-xs aspect-[3/4] bg-gray-800 rounded-xl overflow-hidden shadow-2xl border border-pink-500/30 group">
          <img src="https://picsum.photos/seed/uzuki/400/600" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" alt="Banner" />
          <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-pink-900 to-transparent flex items-end justify-center pb-4">
            <span className="text-white font-bold text-lg drop-shadow-md">Pickup Gacha</span>
          </div>
      </div>

      <div className="w-full space-y-3 mb-4">
        <button 
          onClick={() => handlePull(1)}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white py-3 rounded-lg font-bold shadow-lg flex justify-between items-center px-4 transition-transform active:scale-95"
        >
          <span>1x Pull</span>
          <div className="flex items-center text-sm"><i className="fas fa-star text-pink-300 mr-1"></i> {GACHA_COST}</div>
        </button>
        
        <button 
          onClick={() => handlePull(10)}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white py-4 rounded-lg font-bold shadow-lg flex justify-between items-center px-4 transition-transform active:scale-95 border-2 border-yellow-300"
        >
          <span className="flex flex-col items-start">
             <span>10x Pull</span>
             <span className="text-[10px] text-yellow-200">SR Guaranteed!</span>
          </span>
          <div className="flex items-center"><i className="fas fa-star text-pink-300 mr-1"></i> {GACHA_10_COST}</div>
        </button>
      </div>
    </div>
  );
};

export default Gacha;