
import React from 'react';
import { LoginBonusResult } from '../types';

interface LoginBonusProps {
    result: LoginBonusResult;
    onClose: () => void;
}

const LoginBonus: React.FC<LoginBonusProps> = ({ result, onClose }) => {
    // Determine the days to display based on the streak
    // If streak is 1-7, show 1-7. If 8-14, show 1-7 (repeating cycle visually, or next cycle)
    // For simplicity, we just visualize the 1-7 cycle.
    const days = [1, 2, 3, 4, 5, 6, 7];
    const currentStreakInCycle = ((result.streak - 1) % 7) + 1;

    const getRewardIcon = (type: string) => {
        if (type === 'JEWEL') return <i className="fas fa-star text-pink-500 text-3xl drop-shadow-sm"></i>;
        if (type === 'MONEY') return <i className="fas fa-coins text-yellow-500 text-3xl drop-shadow-sm"></i>;
        return <i className="fas fa-gift text-blue-500 text-3xl drop-shadow-sm"></i>;
    };

    const getRewardName = (type: string, amount: number) => {
         if (type === 'JEWEL') return `${amount} Jewels`;
         if (type === 'MONEY') return `${amount} Money`;
         return `Item x${amount}`;
    };

    return (
        <div className="absolute inset-0 z-[1000] bg-black/80 flex flex-col items-center justify-center p-4 overflow-hidden animate-[fadeIn_0.5s_ease-out]">
             
             <div className="relative w-full max-w-2xl h-[400px] flex items-center justify-center">
                 
                 {/* Chihiro (Left Side) */}
                 <div className="absolute left-[-20px] bottom-[-40px] w-64 h-[450px] z-20 pointer-events-none filter drop-shadow-lg">
                    <img src="https://imas.gamedbs.jp/cg/images_o/ui/navi/1452751597-103.png" className="w-full h-full object-contain" />
                 </div>

                 {/* Speech Bubble */}
                 <div className="absolute left-20 bottom-32 z-30 bg-black/80 text-white text-xs p-3 rounded-xl border border-white/50 max-w-[150px] text-center animate-bounce shadow-lg">
                     {result.todayConfig.message}
                     <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-black/80 border-b border-r border-white/50 transform rotate-45"></div>
                 </div>

                 {/* Whiteboard Container */}
                 <div className="relative bg-white w-[90%] md:w-[600px] h-[320px] rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-[6px] border-gray-300 ml-12 md:ml-24 flex flex-col overflow-hidden">
                     
                     {/* Board Content */}
                     <div className="flex-1 p-4 relative">
                         {/* Header: Hand-drawn text style */}
                         <div className="flex justify-center items-center mb-4">
                             <div className="text-center">
                                 <h2 className="text-3xl font-black text-green-500 tracking-widest drop-shadow-sm" style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}>
                                     <i className="fas fa-leaf text-xl mr-2 transform -rotate-45 text-green-400"></i>
                                     LOGIN BONUS
                                     <i className="fas fa-leaf text-xl ml-2 transform rotate-45 text-green-400"></i>
                                 </h2>
                                 <div className="h-1 w-full bg-green-200 rounded-full mt-1"></div>
                             </div>
                         </div>

                         {/* Stamps Grid */}
                         <div className="grid grid-cols-4 grid-rows-2 gap-3 h-[200px]">
                             {days.map(d => {
                                 // "Is Past" means day index is less than current streak.
                                 // "Is Today" means day index equals current streak.
                                 // BUT: If result.claimedToday is false, then today is technically NOT stamped yet visually until animation plays?
                                 // Let's assume if we are viewing this screen, we treat "today" as stamped or about to be stamped.
                                 
                                 const isToday = d === currentStreakInCycle;
                                 const isPast = d < currentStreakInCycle;
                                 
                                 // Find reward from config
                                 const rewardConfig = result.allRewards.find(r => r.day === d) || result.allRewards[0];
                                 const rType = rewardConfig.type;
                                 const rAmt = rewardConfig.amount;

                                 return (
                                     <div key={d} className="relative bg-white border-2 border-dashed border-blue-200 rounded-lg flex flex-col items-center justify-center p-1 shadow-sm">
                                         {/* Pin Graphic */}
                                         <div className={`absolute -top-2 w-3 h-3 rounded-full shadow-sm z-10 ${d % 2 === 0 ? 'bg-blue-400' : 'bg-yellow-400 left-1/2'}`}></div>

                                         <div className="text-[10px] text-gray-400 absolute top-1 right-1 font-bold">{d}</div>
                                         
                                         {/* Item Icon */}
                                         <div className={`transform transition-transform ${isToday ? 'scale-110' : 'scale-75 opacity-70'}`}>
                                             {getRewardIcon(rType)}
                                         </div>
                                         <div className="text-[8px] text-gray-500 font-bold mt-1 text-center leading-none">
                                            {getRewardName(rType, rAmt)}
                                         </div>

                                         {/* Red Stamp Overlay (Completed) */}
                                         {(isPast || (isToday && result.claimedToday)) && (
                                             <div className="absolute inset-0 flex items-center justify-center z-20 animate-[stamp_0.3s_ease-out]">
                                                 <div className="w-14 h-14 border-4 border-red-500/80 rounded-full flex items-center justify-center transform -rotate-12 bg-white/10 backdrop-blur-[1px]">
                                                     <div className="w-12 h-12 border border-red-500/80 rounded-full flex items-center justify-center">
                                                         <span className="text-red-600 font-black text-xl" style={{ fontFamily: 'serif' }}>
                                                             {isToday ? 'Get' : '済'}
                                                         </span>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                             
                             {/* Doodle Area (Fills the 8th slot visually) */}
                             <div className="relative flex items-center justify-center opacity-50">
                                 <div className="text-blue-300 transform rotate-12">
                                     <i className="fas fa-dog text-6xl"></i>
                                     <div className="text-[10px] font-bold text-center mt-1 font-mono">Good Job!</div>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>

             {/* Close Button */}
             <button 
                onClick={onClose}
                className="mt-8 bg-white text-pink-600 px-12 py-3 rounded-full font-black text-lg shadow-[0_0_20px_rgba(255,255,255,0.5)] hover:scale-105 transition-transform z-50 border-2 border-pink-200"
             >
                 OK
             </button>

             <style>{`
                 @keyframes fadeIn {
                     from { opacity: 0; }
                     to { opacity: 1; }
                 }
                 @keyframes stamp {
                     0% { transform: scale(3); opacity: 0; }
                     80% { transform: scale(0.8); opacity: 1; }
                     100% { transform: scale(1); }
                 }
             `}</style>
        </div>
    );
};

export default LoginBonus;