
import React, { useState, useEffect } from 'react';
import { Idol } from '../types';

interface DeckBuilderProps {
  idols: Idol[];
  currentDeckIds: string[];
  onSave: (ids: string[]) => Promise<void>; 
  onClose: () => void; // Used for "Back" to menu
  onExit?: () => void; // Used for "Exit" to Home
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ idols, currentDeckIds, onSave, onClose, onExit }) => {
  // Slots State: always length 4. Holds ID string or null.
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // New state to track if user has modified deck

  // Initialize Slots from props, but ONLY if user hasn't touched the deck (isDirty check)
  useEffect(() => {
    // If user has made edits, do NOT overwrite with background updates from server
    if (isDirty) return;

    if (Array.isArray(currentDeckIds)) {
        // Pad to 4 if needed (should come correct from server but safety first)
        const incoming = [...currentDeckIds];
        while(incoming.length < 4) incoming.push(null);

        // Validate that these IDs actually exist in user inventory (idols)
        const validated = incoming.slice(0, 4).map(id => {
            if (!id) return null;
            const exists = idols.some(i => i.id === id);
            return exists ? id : null;
        });
        setSlots(validated);
    }
  }, [currentDeckIds, idols, isDirty]); 

  const getIdol = (id: string | null) => id ? idols.find(i => i.id === id) : null;

  // -- LOGIC --
  
  const handleSlotClick = (index: number) => {
      // Clicking a slot removes the card
      if (slots[index]) {
          setIsDirty(true); // User is modifying
          const newSlots = [...slots];
          newSlots[index] = null;
          setSlots(newSlots);
      }
  };

  const handleListClick = (idolId: string) => {
      // Check if already in deck
      const existingIndex = slots.indexOf(idolId);

      setIsDirty(true); // User is modifying

      if (existingIndex !== -1) {
          // If in deck -> remove it
          const newSlots = [...slots];
          newSlots[existingIndex] = null;
          setSlots(newSlots);
      } else {
          // If not in deck -> find first empty slot
          const emptyIndex = slots.indexOf(null);
          if (emptyIndex !== -1) {
              const newSlots = [...slots];
              newSlots[emptyIndex] = idolId;
              setSlots(newSlots);
          } else {
              // Deck full
              alert("Deck is full! Tap a card in the top section to remove it first.");
          }
      }
  };

  const handleSave = async () => {
      setIsSaving(true);
      // Cast to string[] safely because backend handles nulls now
      const payload = slots as any as string[]; 
      await onSave(payload);
      setIsSaving(false);
      setIsDirty(false); // Reset dirty flag after save
  };

  const totalPower = slots.reduce((acc, id) => {
      const i = getIdol(id);
      return i ? acc + (i.vocal + i.dance + i.visual) : acc;
  }, 0);

  return (
    <div className="absolute inset-0 z-[500] bg-gray-900 flex flex-col h-full pointer-events-auto animate-fade-in text-white">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-3 shadow-lg flex justify-between items-center shrink-0 border-b border-blue-500/30">
            <div>
                <h2 className="text-white font-bold italic text-lg shadow-black drop-shadow-md">Unit Formation</h2>
                <div className="text-yellow-400 text-xs font-mono font-bold">Total Power: {totalPower}</div>
            </div>
            
            {onExit && (
                <button onClick={onExit} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-xs font-bold shadow-md flex items-center gap-1">
                    <i className="fas fa-home"></i> Exit
                </button>
            )}
        </div>

        {/* Deck Slots (Top) */}
        <div className="bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-800 p-4 shrink-0 shadow-lg z-10 border-b border-gray-700">
            <div className="flex justify-between gap-2 max-w-sm mx-auto">
                {slots.map((id, idx) => {
                    const idol = getIdol(id);
                    return (
                        <div 
                            key={idx} 
                            onClick={(e) => { e.stopPropagation(); handleSlotClick(idx); }}
                            className={`relative w-20 h-28 rounded border-2 cursor-pointer transition-all ${idol ? 'border-pink-500 bg-gray-900' : 'border-dashed border-gray-600 bg-gray-800/50 hover:bg-gray-700'}`}
                        >
                             {idol ? (
                                 <>
                                    <img src={idol.image} className="w-full h-full object-cover rounded-sm" />
                                    <div className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center rounded-bl font-bold text-xs shadow-md z-10">
                                        <i className="fas fa-minus"></i>
                                    </div>
                                    <div className="absolute bottom-0 w-full bg-black/70 text-[8px] text-white text-center truncate px-1">
                                        {idol.name}
                                    </div>
                                 </>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-1 pointer-events-none">
                                     <span className="text-xs font-bold opacity-50">{idx + 1}</span>
                                     <i className="fas fa-plus opacity-30"></i>
                                 </div>
                             )}
                        </div>
                    );
                })}
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2">Tap a slot above to remove. Tap list below to add.</p>
        </div>

        {/* Idol List (Scrollable) */}
        <div className="flex-1 overflow-y-auto bg-gray-900 p-2 pb-24">
            <div className="grid grid-cols-4 gap-2">
                {idols.map((idol) => {
                    const isInDeck = slots.includes(idol.id);
                    return (
                        <div 
                            key={idol.id} 
                            onClick={(e) => { e.stopPropagation(); handleListClick(idol.id); }}
                            className={`relative aspect-[3/4] rounded cursor-pointer overflow-hidden border-2 transition-all ${
                                isInDeck 
                                    ? 'border-green-500 opacity-80' 
                                    : 'border-transparent hover:border-white'
                            }`}
                        >
                            <img src={idol.image} className="w-full h-full object-cover" loading="lazy" />
                            
                            {/* Rarity Badge */}
                            <div className={`absolute top-0 left-0 px-1 text-[8px] font-bold text-white z-10 ${
                                idol.rarity === 'SSR' ? 'bg-pink-500' : 
                                idol.rarity === 'SR' ? 'bg-orange-500' : 'bg-gray-500'
                            }`}>
                                {idol.rarity}
                            </div>

                            {/* In Deck Checkmark Visual */}
                            {isInDeck && (
                                <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center z-20 backdrop-blur-[1px]">
                                    <div className="bg-white rounded-full p-1 shadow-lg">
                                        <i className="fas fa-check-circle text-3xl text-green-500"></i>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Footer Actions (Fixed) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 p-3 border-t border-gray-700 shadow-[0_-5px_15px_rgba(0,0,0,0.5)] z-20 flex gap-2">
             <button 
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-xl shadow-lg transition-colors"
             >
                Back
             </button>
             <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold py-3 rounded-xl shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
             >
                 {isSaving ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-save"></i>}
                 Confirm Formation
             </button>
        </div>

    </div>
  );
};

export default DeckBuilder;
