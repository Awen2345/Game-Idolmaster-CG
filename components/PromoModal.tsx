
import React, { useState } from 'react';

interface PromoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRedeem: (code: string) => Promise<{ success: boolean; message: string }>;
}

const PromoModal: React.FC<PromoModalProps> = ({ isOpen, onClose, onRedeem }) => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) return;
        
        setLoading(true);
        setResult(null);
        
        const res = await onRedeem(code.trim());
        setLoading(false);
        setResult(res);
        
        if (res.success) {
            setCode('');
        }
    };

    return (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl border border-pink-500/30">
                <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg italic"><i className="fas fa-ticket-alt mr-2"></i> Redeem Code</h2>
                    <button onClick={onClose} className="text-white hover:text-pink-200"><i className="fas fa-times"></i></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <div className="text-center text-sm text-gray-300 mb-2">
                        Enter a valid campaign code to receive special rewards!
                    </div>

                    <input 
                        type="text" 
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE HERE"
                        className="w-full bg-gray-900 border-2 border-gray-600 rounded-lg p-3 text-center text-xl font-mono tracking-widest uppercase text-white focus:border-pink-500 focus:outline-none transition-colors"
                        disabled={loading}
                    />

                    {result && (
                        <div className={`text-center text-xs font-bold p-2 rounded ${result.success ? 'bg-green-900/50 text-green-400 border border-green-500' : 'bg-red-900/50 text-red-400 border border-red-500'}`}>
                            {result.success ? <i className="fas fa-check-circle mr-1"></i> : <i className="fas fa-exclamation-circle mr-1"></i>}
                            {result.message}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading || !code}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-black py-3 rounded-lg shadow-lg transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <i className="fas fa-spinner animate-spin"></i> : "REDEEM"}
                    </button>
                </form>

                <div className="bg-gray-900/50 p-3 text-center text-[10px] text-gray-500">
                    Rewards will be sent to your Present Box.
                </div>
            </div>
        </div>
    );
};

export default PromoModal;
