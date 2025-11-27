
import React, { useState, useEffect } from 'react';
import { Idol, Rarity } from '../types';

interface DeckBuilderProps {
  idols: Idol[];
  currentDeckIds: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ idols, currentDeckIds, onSave, onClose }) => {
  // Store only IDs locally to prevent resets when 'idols' prop updates in background
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);

  useEffect(() => {
    // Only initialize/reset when currentDeckIds changes (e.g. initial load or save complete)
    // We EXCLUDE 'idols' from dependency array so background data refreshes don't wipe user work
    const newSlots = [null, null, null, null] as (string | null)[];
    if (currentDeckIds && currentDeckIds.length > 0) {
        currentDeckIds.forEach((id, idx) => {
            if (idx < 4) newSlots[idx] = id;
        });
    }
    setSlots(newSlots);
  }, [currentDeckIds]);

  const toggleIdol = (idolId: string) => {
    // Check if already in deck
    const existingIndex = slots.findIndex(id => id === idolId);
    
    if (existingIndex !== -1) {
        // Remove from slot
        const newSlots = [...slots];
        newSlots[existingIndex] = null;
        setSlots(newSlots);
    } else {
        // Add to first empty slot
        const emptyIndex = slots.findIndex(id => id === null);
        if (emptyIndex !== -1) {
            const newSlots = [...slots];
            newSlots[emptyIndex] = idolId;
            setSlots(newSlots);
        } else {
            alert("Deck is full! Tap a card in the deck to remove it first.");
        }
    }
  };

  const handleSave = () => {
      // Filter out nulls and send array of IDs
      const activeIds = slots.filter(s => s !== null) as string[];
      
      if(activeIds.length < 4) {
          if(!confirm(`You have only selected ${activeIds.length} idols. Are you sure?`)) return;
      }
      
      onSave(activeIds);
  };

  // Helper to find idol object by ID
  const getIdol = (id: string | null) => id ? idols.find(i => i.id === id) : null;

  const totalStats = slots.reduce((acc, id) => {
      const i = getIdol(id);
      return i ? acc + (i.vocal + i.dance + i.visual) : acc;
  }, 0);

  return (
    <div className="absolute inset-0 z-[100] bg-gray-900 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4 shadow-lg border-b border-white/10 flex justify-between items-center shrink-0">
            <div>
                <h2 className="text-xl font-bold text-white italic">Unit Setup</h2>
                <p className="text-xs text-blue-300">Total Power: {totalStats}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white px-2"><i className="fas fa-times text-xl"></i></button>
        </div>

        {/* Deck Slots */}
        <div className="flex justify-center gap-2 p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-800 border-b border-gray-700 shrink-0">
            {slots.map((slotId, i) => {
                const idol = getIdol(slotId);
                return (
                    <div key={i} className="w-20 h-28 bg-gray-900 rounded border-2 border-dashed border-gray-600 flex items-center justify-center relative overflow-hidden shadow-inner transition-all">
                        {idol ? (
                            <div onClick={() => toggleIdol(idol.id)} className="w-full h-full cursor-pointer relative group">
                                <img src={idol.image} className="w-full h-full object-cover" alt="slot" />
                                <div className="absolute inset-0 bg-red-500/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <i className="fas fa-minus-circle text-white drop-shadow-md"></i>
                                </div>
                                {/* Rarity Tag */}
                                <div className={`absolute bottom-0 left-0 text-[8px] font-bold px-1 ${idol.rarity === 'SSR' ? 'bg-pink-500 text-white' : 'bg-gray-600 text-gray-200'}`}>
                                    {idol.rarity}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-600">
                                <i className="fas fa-plus mb-1"></i>
                                <span className="font-bold text-[10px]">Slot {i+1}</span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Action Bar */}
        <div className="p-3 flex justify-center bg-gray-800 shrink-0 border-b border-gray-700">
            <button 
                onClick={handleSave}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white px-10 py-2 rounded-full font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
            >
                <i className="fas fa-save"></i> Confirm Deck
            </button>
        </div>

        {/* Idol List */}
        <div className="flex-1 overflow-y-auto p-2 bg-gray-900 grid grid-cols-4 gap-2 content-start">
            {idols.map(idol => {
                const isSelected = slots.includes(idol.id);
                return (
                    <div 
                        key={idol.id} 
                        onClick={() => toggleIdol(idol.id)}
                        className={`relative aspect-[3/4] rounded cursor-pointer overflow-hidden border-2 transition-all ${
                            isSelected 
                                ? 'border-green-500 opacity-60 scale-95' 
                                : 'border-transparent hover:border-white'
                        }`}
                    >
                        <img src={idol.image} className="w-full h-full object-cover" alt={idol.name} />
                        
                        {/* Stats Overlay */}
                        <div className="absolute bottom-0 w-full bg-black/70 text-[9px] text-white text-center font-bold py-0.5">
                            {(idol.vocal + idol.dance + idol.visual)}
                        </div>

                        {/* Rarity Ribbon */}
                        <div className={`absolute top-0 left-0 px-1.5 py-0.5 rounded-br text-[8px] font-black z-10 ${
                             idol.rarity === Rarity.SSR ? 'bg-pink-500 text-white shadow-pink-500/50' : 
                             idol.rarity === Rarity.SR ? 'bg-orange-500 text-white' : 'bg-gray-500 text-gray-200'
                        }`}>
                            {idol.rarity}
                        </div>

                        {/* Selected Checkmark */}
                        {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="bg-green-500 rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white">
                                    <i className="fas fa-check text-white text-xs"></i>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default DeckBuilder;
