
import React from 'react';

interface CardDetailProps {
    card: {
        id: string;
        name: string;
        rarity: string;
        type: string;
        image: string;
        vocal: number;
        dance: number;
        visual: number;
        maxLevel?: number;
    };
    onClose: () => void;
}

const CardDetail: React.FC<CardDetailProps> = ({ card, onClose }) => {
    const totalStats = card.vocal + card.dance + card.visual;
    
    // Calculate percentages for progress bars (assuming max stat around 100 for N to 300 for SSR in raw DB, scaled)
    // Adjust max base based on rarity for visualization
    const maxBase = card.rarity === 'SSR' ? 100 : card.rarity === 'SR' ? 80 : 60;
    
    const getBarWidth = (val: number) => Math.min(100, (val / maxBase) * 100) + '%';

    const typeColor = 
        card.type === 'CUTE' ? 'text-pink-500 bg-pink-100 border-pink-200' :
        card.type === 'COOL' ? 'text-blue-500 bg-blue-100 border-blue-200' :
        'text-yellow-500 bg-yellow-100 border-yellow-200';

    const bgGradient = 
        card.type === 'CUTE' ? 'from-pink-500 to-red-400' :
        card.type === 'COOL' ? 'from-blue-500 to-indigo-400' :
        'from-yellow-400 to-orange-400';

    return (
        <div className="absolute inset-0 z-[200] bg-gray-900 flex flex-col animate-fade-in overflow-hidden">
            {/* Header / Nav */}
            <div className={`p-4 shadow-lg z-10 flex justify-between items-center bg-gradient-to-r ${bgGradient}`}>
                <h2 className="text-white font-black italic text-xl drop-shadow-md">IDOL PROFILE</h2>
                <button onClick={onClose} className="bg-white/20 hover:bg-white/40 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto bg-gray-100 relative">
                
                {/* IDOL IMAGE HERO */}
                <div className="relative w-full h-[60%] bg-gray-200 flex items-center justify-center overflow-hidden shadow-inner">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
                    <img src={card.image} className="h-full w-full object-contain drop-shadow-xl z-10" alt={card.name} />
                    
                    {/* Rarity Badge */}
                    <div className={`absolute top-4 left-4 px-4 py-1 rounded-r-full shadow-lg font-black text-white text-lg z-20 ${
                        card.rarity === 'SSR' ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse' :
                        card.rarity === 'SR' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                        'bg-gray-500'
                    }`}>
                        {card.rarity}
                    </div>
                </div>

                {/* STATS CARD */}
                <div className="relative -mt-10 mx-4 bg-white rounded-xl shadow-2xl p-6 border border-gray-200 z-30 mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 leading-none">{card.name}</h1>
                            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold border ${typeColor}`}>
                                {card.type} TYPE
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-gray-400 uppercase font-bold">Total Appeal</div>
                            <div className="text-2xl font-black text-gray-800">{totalStats}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Vocal */}
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-pink-500"><i className="fas fa-microphone-alt mr-1"></i> Vocal</span>
                                <span className="text-gray-700">{card.vocal}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]" style={{ width: getBarWidth(card.vocal) }}></div>
                            </div>
                        </div>

                        {/* Dance */}
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-blue-500"><i className="fas fa-shoe-prints mr-1"></i> Dance</span>
                                <span className="text-gray-700">{card.dance}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" style={{ width: getBarWidth(card.dance) }}></div>
                            </div>
                        </div>

                        {/* Visual */}
                        <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                                <span className="text-yellow-500"><i className="fas fa-camera mr-1"></i> Visual</span>
                                <span className="text-gray-700">{card.visual}</span>
                            </div>
                            <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.6)]" style={{ width: getBarWidth(card.visual) }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                        <span>Max Level: <span className="font-bold text-gray-800">{card.maxLevel || 70}</span></span>
                        <span>ID: {card.id}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CardDetail;
