
import React, { useState, useMemo } from 'react';
import { Idol, Rarity, IdolType } from '../types';

interface IdolManagerProps {
  idols: Idol[];
  onRetire: (ids: string[]) => void;
  onTrain: (id: string) => Promise<boolean>;
  trainerTickets: number;
}

const IdolManager: React.FC<IdolManagerProps> = ({ idols, onRetire, onTrain, trainerTickets }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'VIEW' | 'RETIRE' | 'TRAIN'>('VIEW');
  const [filter, setFilter] = useState<'ALL' | 'SSR'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredIdols = useMemo(() => {
    return idols.filter(i => filter === 'ALL' || i.rarity === filter);
  }, [idols, filter]);

  const toggleSelect = (id: string) => {
    if (mode === 'VIEW') return;
    if (mode === 'TRAIN') {
        setSelectedIds([id]);
        return;
    }
    setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleAction = async () => {
    if (isProcessing) return;
    
    if (mode === 'RETIRE') {
      if (confirm(`Retire ${selectedIds.length} idols?`)) {
        setIsProcessing(true);
        await onRetire(selectedIds);
        setIsProcessing(false);
        setSelectedIds([]);
        setMode('VIEW');
      }
    } else if (mode === 'TRAIN') {
      if (selectedIds.length === 1) {
         setIsProcessing(true);
         const success = await onTrain(selectedIds[0]);
         setIsProcessing(false);
         if (success) {
             setSelectedIds([]);
         }
      }
    }
  };

  const getTypeIcon = (type: IdolType) => {
      if (type === IdolType.CUTE) return <i className="fas fa-heart text-pink-400"></i>;
      if (type === IdolType.COOL) return <i className="fas fa-gem text-blue-400"></i>;
      if (type === IdolType.PASSION) return <i className="fas fa-sun text-yellow-400"></i>;
      return null;
  };

  return (
    <div className="p-4 min-h-full bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-900 z-10 py-2 border-b border-gray-700">
        <h2 className="text-xl font-bold">Idol List ({idols.length})</h2>
        <div className="flex gap-2">
            <button onClick={() => setFilter(prev => prev === 'ALL' ? 'SSR' : 'ALL')} className="text-xs bg-gray-700 px-2 py-1 rounded">
                Filter: {filter}
            </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button 
            onClick={() => { setMode('VIEW'); setSelectedIds([]); }} 
            className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${mode === 'VIEW' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
            View
        </button>
        <button 
            onClick={() => { setMode('TRAIN'); setSelectedIds([]); }} 
            className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${mode === 'TRAIN' ? 'bg-green-600' : 'bg-gray-700'}`}
        >
            Train
        </button>
        <button 
            onClick={() => { setMode('RETIRE'); setSelectedIds([]); }} 
            className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${mode === 'RETIRE' ? 'bg-red-600' : 'bg-gray-700'}`}
        >
            Retire
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 pb-20">
        {filteredIdols.map(idol => {
            const isSelected = selectedIds.includes(idol.id);
            const affectionPct = (idol.affection / (idol.maxAffection || 20)) * 100;
            
            return (
                <div 
                    key={idol.id} 
                    onClick={() => toggleSelect(idol.id)}
                    className={`relative aspect-[3/4] rounded overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-yellow-400 scale-95 opacity-80' : 'border-transparent hover:border-white'
                    }`}
                >
                    <img src={idol.image} className="w-full h-full object-cover" alt={idol.name} />
                    
                    {/* Level Badge */}
                    <div className="absolute top-0 left-0 bg-black/60 px-1 text-[9px] font-bold text-yellow-300">
                        Lv.{idol.level}
                    </div>
                    
                    {/* Type Badge */}
                    <div className="absolute top-0 right-0 bg-black/60 px-1 text-[9px]">
                        {getTypeIcon(idol.type)}
                    </div>

                    {/* Affection Bar */}
                    <div className="absolute bottom-4 left-0 w-full h-1 bg-gray-800">
                        <div className="h-full bg-pink-500" style={{width: `${Math.min(100, affectionPct)}%`}}></div>
                    </div>

                    {/* Rarity Label */}
                    <div className={`absolute bottom-0 w-full text-center text-[9px] font-bold ${
                         idol.rarity === Rarity.SSR ? 'bg-gradient-to-r from-blue-500 to-pink-500' : 
                         idol.rarity === Rarity.SR ? 'bg-orange-500' : 'bg-gray-600'
                    }`}>
                        {idol.rarity}
                    </div>
                    {isSelected && <div className="absolute inset-0 bg-white/20 flex items-center justify-center"><i className="fas fa-check-circle text-2xl text-yellow-400 drop-shadow-md"></i></div>}
                </div>
            );
        })}
      </div>

      {(mode === 'RETIRE' || mode === 'TRAIN') && selectedIds.length > 0 && (
          <div className="fixed bottom-20 left-0 right-0 p-4 flex justify-center z-30 pointer-events-none">
              <button 
                onClick={handleAction}
                disabled={isProcessing}
                className={`pointer-events-auto px-8 py-3 rounded-full font-bold shadow-lg text-white transform hover:scale-105 transition-transform ${
                    mode === 'RETIRE' ? 'bg-red-600 shadow-red-500/50' : 'bg-green-600 shadow-green-500/50'
                } ${isProcessing ? 'opacity-50' : ''}`}
              >
                 {isProcessing ? 'Processing...' : (mode === 'RETIRE' ? `Retire (${selectedIds.length})` : 'Start Lesson')}
              </button>
          </div>
      )}
    </div>
  );
};

export default IdolManager;
