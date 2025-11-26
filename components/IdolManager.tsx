import React, { useState, useMemo } from 'react';
import { Idol, Rarity } from '../types';

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
        // Only select one for training
        setSelectedIds([id]);
        return;
    }
    // Multi select for Retire
    setSelectedIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleAction = async () => {
    if (isProcessing) return;
    
    if (mode === 'RETIRE') {
      if (confirm(`Retire ${selectedIds.length} idols? This cannot be undone.`)) {
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
         if (!success) {
           // Alert handled in service
         } else {
             setSelectedIds([]); // Deselect after train
         }
      }
    }
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
            Train Lesson
        </button>
        <button 
            onClick={() => { setMode('RETIRE'); setSelectedIds([]); }} 
            className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${mode === 'RETIRE' ? 'bg-red-600' : 'bg-gray-700'}`}
        >
            Retire
        </button>
      </div>

      {mode === 'TRAIN' && (
        <div className="bg-green-900/50 p-2 rounded mb-2 text-center text-sm border border-green-500">
            Select an idol to train. Tickets: {trainerTickets}
        </div>
      )}
      {mode === 'RETIRE' && selectedIds.length > 0 && (
         <div className="bg-red-900/50 p-2 rounded mb-2 text-center text-sm border border-red-500 animate-pulse">
            Selected: {selectedIds.length} idols.
         </div>
      )}

      <div className="grid grid-cols-4 gap-2 pb-20">
        {filteredIdols.map(idol => {
            const isSelected = selectedIds.includes(idol.id);
            return (
                <div 
                    key={idol.id} 
                    onClick={() => toggleSelect(idol.id)}
                    className={`relative aspect-[3/4] rounded overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected ? 'border-yellow-400 scale-95 opacity-80' : 'border-transparent hover:border-white'
                    }`}
                >
                    <img src={idol.image} className="w-full h-full object-cover" alt={idol.name} />
                    <div className="absolute top-0 left-0 bg-black/60 px-1 text-[10px] font-bold text-yellow-300">Lv.{idol.level}</div>
                    <div className={`absolute bottom-0 w-full text-center text-[10px] font-bold ${
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