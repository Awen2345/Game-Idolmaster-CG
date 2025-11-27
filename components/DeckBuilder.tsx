
import React, { useState, useEffect } from 'react';
import { Idol, Rarity } from '../types';

interface DeckBuilderProps {
  idols: Idol[];
  currentDeckIds: string[];
  onSave: (ids: string[]) => Promise<void>; 
  onClose: () => void;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ idols, currentDeckIds, onSave, onClose }) => {
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize slots
  useEffect(() => {
    // If user has started editing, do not overwrite with props to prevent resets
    if (isDirty) return;

    // Validate incoming Deck IDs against the actual Idol Inventory
    const validSlots = [null, null, null, null] as (string | null)[];
    
    if (currentDeckIds && Array.isArray(currentDeckIds)) {
        currentDeckIds.forEach((deckId, idx) => {
            if (idx < 4 && deckId) {
                // Check if this ID actually exists in the provided idols list
                const exists = idols.some(i => i.id === deckId);
                validSlots[idx] = exists ? deckId : null;
            }
        });
    }
    setSlots(validSlots);
  }, [currentDeckIds, idols, isDirty]);

  const toggleIdol = (idolId: string) => {
    setIsDirty(true);
    
    const existingIndex = slots.findIndex(id => id === idolId);
    
    if (existingIndex !== -1) {
        // Remove
        const newSlots = [...slots];
        newSlots[existingIndex] = null;
        setSlots(newSlots);
    } else {
        // Add
        const emptyIndex = slots.findIndex(id => id === null);
        if (emptyIndex !== -1) {
            const newSlots = [...slots];
            newSlots[emptyIndex] = idolId;
            setSlots(newSlots);
        } else {
            // Deck Full Feedback
            alert("Deck is full! Tap a slot at the top to remove a card first.");
        }
    }
  };

  const clearSlot = (index: number) => {
      const newSlots = [...slots];
      newSlots[index] = null;
      setSlots(newSlots);
      setIsDirty(true);
  };

  const handleSave = async () => {
      const activeIds = slots.filter(s => s !== null) as string[];
      if(activeIds.length < 4) {
          if(!confirm(`Your deck has empty slots (${activeIds.length}/4). Continue?`)) return;
      }
      
      setIsSaving(true);
      await onSave(activeIds); // Save logic handles padding nulls if needed backend side
      setIsSaving(false);
  };

  const getIdol = (id: string | null) => id ? idols.find(i => i.id === id) : null;

  const totalStats = slots.reduce((acc, id) => {
      const i = getIdol(id);
      return i ? acc + (i.vocal + i.dance + i.visual) : acc;
  }, 0);

  return (
    <div className="absolute inset-0 z-[500] bg-gray-900 flex flex-col h-full animate-fade-in pointer-events-auto">
        {/* Fixed Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-3 shadow-lg flex justify-between items-center shrink-0 z-[510]">
            <div>
                <h2 className="text-lg font-bold text-white italic">Unit Setup</h2>
                <p className="text-xs text-blue-300">Total Power: {totalStats}</p>
            </div>
            {/* Top Close Button for redundancy */}
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }} 
                className="bg-red-500/20 text-white p-2 rounded hover:bg-red-500 transition-colors"
            >
                <i className="fas fa-times"></i> Close
            </button>
        </div>

        {/* Deck Slots Area */}
        <div className="bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-800 p-4 shrink-0 shadow-md z-[505]">
            <div className="flex justify-center gap-2">
                {slots.map((slotId, i) => {
                    const idol = getIdol(slotId);
                    return (
                        <div 
                            key={i} 
                            onClick={(e) => { e.stopPropagation(); clearSlot(i); }}
                            className="w-20 h-28 bg-gray-900 rounded border-2 border-dashed border-gray-600 flex items-center justify-center relative overflow-hidden shadow-inner cursor-pointer hover:border-red-400 transition-colors group"
                        >
                            {idol ? (
                                <>
                                    <img src={idol.image} className="w-full h-full object-cover pointer-events-none" alt="slot" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <i className="fas fa-times text-red-400 text-xl font-bold"></i>
                                    </div>
                                    <div className={`absolute bottom-0 left-0 text-[8px] font-bold px-1 ${idol.rarity === 'SSR' ? 'bg-pink-500 text-white' : 'bg-gray-600 text-gray-200'}`}>
                                        {idol.rarity}
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center text-gray-600 pointer-events-none">
                                    <span className="font-bold text-[10px]">Slot {i+1}</span>
                                    <span className="text-[8px] text-gray-500">Tap to Add</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2">Tap a slot above to clear it. Tap a card below to add/remove.</p>
        </div>

        {/* Scrollable Idol List */}
        <div className="flex-1 overflow-y-auto p-2 bg-gray-900 grid grid-cols-4 gap-2 content-start pb-24 z-[501]">
            {idols.map(idol => {
                const isSelected = slots.includes(idol.id);
                return (
                    <div 
                        key={idol.id} 
                        onClick={(e) => { e.stopPropagation(); toggleIdol(idol.id); }}
                        className={`relative aspect-[3/4] rounded cursor-pointer overflow-hidden border-2 transition-all ${
                            isSelected 
                                ? 'border-green-500 opacity-80 scale-95 ring-2 ring-green-400' 
                                : 'border-transparent hover:border-white'
                        }`}
                    >
                        <img src={idol.image} className="w-full h-full object-cover pointer-events-none" alt={idol.name} loading="lazy" />
                        
                        <div className="absolute bottom-0 w-full bg-black/70 text-[9px] text-white text-center font-bold py-0.5">
                            {(idol.vocal + idol.dance + idol.visual)}
                        </div>

                        <div className={`absolute top-0 left-0 px-1.5 py-0.5 rounded-br text-[8px] font-black z-10 ${
                             idol.rarity === Rarity.SSR ? 'bg-pink-500 text-white shadow-pink-500/50' : 
                             idol.rarity === Rarity.SR ? 'bg-orange-500 text-white' : 'bg-gray-500 text-gray-200'
                        }`}>
                            {idol.rarity}
                        </div>

                        {isSelected && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                                <div className="bg-green-500 rounded-full w-8 h-8 flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                                    <i className="fas fa-check text-white text-sm"></i>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>

        {/* Fixed Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 p-3 border-t border-gray-700 flex flex-col gap-2 z-[510] shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            <button 
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={isSaving}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white py-3 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
            >
                {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>} 
                Confirm Deck
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="w-full py-2 text-gray-400 text-xs hover:text-white underline"
            >
                Cancel / Return
            </button>
        </div>
    </div>
  );
};

export default DeckBuilder;
