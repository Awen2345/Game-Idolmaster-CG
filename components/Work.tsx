
import React, { useState, useEffect } from 'react';
import { WorkResult, UserState } from '../types';

interface WorkProps {
    user: UserState;
    onWork: () => Promise<WorkResult | null>;
}

const Work: React.FC<WorkProps> = ({ user, onWork }) => {
    const [progress, setProgress] = useState<{area:string, zone:string, pct:number, cost:number} | null>(null);
    const [animating, setAnimating] = useState(false);
    const [lastResult, setLastResult] = useState<WorkResult | null>(null);

    useEffect(() => {
        // Fetch current work status
        fetch(`/api/work/status/${user.id}`).then(r => r.json()).then(data => {
            if(data) setProgress({ area: data.area_name, zone: data.zone_name, pct: data.progress_percent, cost: data.stamina_cost });
        });
    }, [user.id, lastResult]); // Refresh on result

    const handleWork = async () => {
        if (!progress) return;
        if (user.stamina < progress.cost) {
            alert("Not enough stamina! Please wait or use a drink.");
            return;
        }

        setAnimating(true);
        const res = await onWork();
        if (res) {
            // Animation Delay
            setTimeout(() => {
                setLastResult(res);
                setAnimating(false);
            }, 800);
        } else {
            setAnimating(false);
        }
    };

    if (!progress) return <div className="p-4 text-center">Loading Work Data...</div>;

    return (
        <div className="h-full bg-gray-900 flex flex-col relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/city/800/1200')] bg-cover opacity-30"></div>
            
            {/* Header Area */}
            <div className="relative z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
                <h2 className="text-2xl font-black italic text-white flex items-center gap-2">
                    <i className="fas fa-briefcase text-yellow-400"></i> WORK
                </h2>
                <div className="flex justify-between items-end mt-2">
                    <div>
                        <div className="text-sm font-bold text-gray-300">{progress.area}</div>
                        <div className="text-xl font-bold text-white">{progress.zone}</div>
                    </div>
                    <div className="text-xs font-mono bg-blue-900/80 px-2 py-1 rounded border border-blue-500">
                        Cost: -{progress.cost} Stamina
                    </div>
                </div>
            </div>

            {/* Work Content */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center p-6">
                
                {/* Result Overlay */}
                {lastResult && !animating && (
                     <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center animate-fade-in p-4" onClick={() => setLastResult(null)}>
                         <h3 className="text-3xl text-yellow-400 font-black italic mb-4 animate-bounce">GOOD JOB!</h3>
                         
                         <div className="bg-gray-800 p-6 rounded-xl border border-gray-600 w-full max-w-xs space-y-4">
                             <div className="flex justify-between border-b border-gray-700 pb-2">
                                 <span>Exp Gained</span>
                                 <span className="font-bold text-green-400">+{lastResult.expGained}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-700 pb-2">
                                 <span>Money</span>
                                 <span className="font-bold text-yellow-400">+{lastResult.moneyGained}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-700 pb-2">
                                 <span>Affection <i className="fas fa-heart text-pink-500"></i></span>
                                 <span className="font-bold text-pink-400">+{lastResult.affectionGained}</span>
                             </div>

                             {lastResult.drops && (
                                 <div className="bg-blue-900/30 p-3 rounded border border-blue-500/50 mt-2">
                                     <div className="text-[10px] text-blue-300 uppercase font-bold">New Item!</div>
                                     <div className="font-bold text-white flex items-center gap-2">
                                         {lastResult.drops.type === 'IDOL' ? <i className="fas fa-user-friends"></i> : <i className="fas fa-box"></i>}
                                         {lastResult.drops.name}
                                         {lastResult.drops.rarity && <span className="text-xs bg-gray-600 px-1 rounded ml-1">{lastResult.drops.rarity}</span>}
                                     </div>
                                 </div>
                             )}

                             {lastResult.isLevelUp && <div className="text-center font-black text-xl text-yellow-300 animate-pulse">LEVEL UP!</div>}
                             {lastResult.isZoneClear && <div className="text-center font-black text-xl text-blue-300">ZONE CLEAR!</div>}
                         </div>

                         <div className="mt-8 text-gray-500 text-xs">Tap to continue</div>
                     </div>
                )}

                {/* Progress Circle */}
                <div className="relative w-48 h-48 mb-8">
                     <svg className="w-full h-full transform -rotate-90">
                        <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-gray-700" />
                        <circle 
                            cx="96" cy="96" r="88" 
                            stroke="currentColor" strokeWidth="12" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 88}
                            strokeDashoffset={2 * Math.PI * 88 * (1 - progress.pct / 100)}
                            className={`text-pink-500 transition-all duration-1000 ease-out`}
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-4xl font-black text-white drop-shadow-md">{progress.pct}%</span>
                         <span className="text-xs text-gray-400 uppercase">Clear</span>
                     </div>
                </div>

                {/* Action Button */}
                <button 
                    onClick={handleWork}
                    disabled={animating}
                    className={`w-full py-5 rounded-full font-black text-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${animating ? 'bg-gray-600 scale-95' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110'}`}
                >
                    {animating ? (
                        <>
                           <i className="fas fa-spinner animate-spin"></i> Working...
                        </>
                    ) : (
                        "DO WORK"
                    )}
                </button>
                <p className="text-center text-xs text-gray-400 mt-4">
                    Uses {progress.cost} Stamina to gain EXP & Fans.
                </p>
            </div>
        </div>
    );
};

export default Work;
