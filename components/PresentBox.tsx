
import React, { useState } from 'react';
import { Present } from '../types';

interface PresentBoxProps {
    presents: Present[];
    onClaim: (id: number) => Promise<boolean>;
    onClose: () => void;
}

const PresentBox: React.FC<PresentBoxProps> = ({ presents, onClaim, onClose }) => {
    const [claimingId, setClaimingId] = useState<number | null>(null);

    const handleClaim = async (id: number) => {
        setClaimingId(id);
        await onClaim(id);
        setClaimingId(null);
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-gray-800 w-full max-w-md rounded-xl border-2 border-pink-500 overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-4 flex justify-between items-center">
                    <h2 className="text-white font-black text-xl italic"><i className="fas fa-gift mr-2"></i> Present Box</h2>
                    <button onClick={onClose} className="text-white hover:text-pink-200"><i className="fas fa-times text-xl"></i></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 bg-gray-900 custom-scrollbar">
                    {presents.length === 0 ? (
                        <div className="h-40 flex flex-col items-center justify-center text-gray-400">
                            <i className="fas fa-box-open text-4xl mb-2"></i>
                            <p>No presents available.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {presents.map(p => (
                                <div key={p.id} className="bg-gray-800 p-3 rounded-lg border border-gray-700 flex justify-between items-center shadow-md">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-xl text-yellow-400 border border-white/20">
                                            {p.type === 'MONEY' && <i className="fas fa-coins"></i>}
                                            {p.type === 'JEWEL' && <i className="fas fa-star text-pink-400"></i>}
                                            {p.type.includes('ITEM') && <i className="fas fa-flask text-green-400"></i>}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{p.description}</p>
                                            <p className="text-pink-300 text-xs">{p.type} x{p.amount}</p>
                                            <p className="text-gray-500 text-[10px]">{new Date(p.receivedAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleClaim(p.id)}
                                        disabled={claimingId === p.id}
                                        className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded-full font-bold text-xs shadow-lg transition-transform active:scale-95 disabled:opacity-50"
                                    >
                                        {claimingId === p.id ? <i className="fas fa-spinner animate-spin"></i> : "Receive"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-3 bg-gray-800 border-t border-gray-700 text-center text-xs text-gray-500">
                    Items expire after 30 days.
                </div>
            </div>
        </div>
    );
};

export default PresentBox;
