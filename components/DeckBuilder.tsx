
import React, { useState, useEffect } from 'react';
import { Idol, Rarity } from '../types';

interface DeckBuilderProps {
  idols: Idol[];
  currentDeckIds: string[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}

const DeckBuilder: React.FC<DeckBuilderProps> = ({ idols, currentDeckIds, onSave, onClose }) => {
  const [deck, setDeck] = useState<(Idol | null)[]>([null, null, null, null]);

  useEffect(() => {
    // Hydrate deck from IDs
    const newDeck = [null, null, null, null] as (Idol | null)[];
    currentDeckIds.forEach((id, idx) => {
        if (idx < 4) {
            const found = idols.find(i => i.id === id);
            if (found) newDeck[idx] = found;
        }
    });
    setDeck(newDeck);
  }, [currentDeckIds, idols]);

  const toggleIdol = (idol: Idol) => {
    // Check if already in deck
    const existingIndex = deck.findIndex(i => i?.id === idol.id);
    if (existingIndex !== -1) {
        // Remove
        const newDeck = [...deck];
        newDeck[existingIndex] = null;
        setDeck(newDeck);
    } else {
        // Add to first empty slot
        const emptyIndex = deck.findIndex(i => i === null);
        if (emptyIndex !== -1) {
            const newDeck = [...deck];
            newDeck[emptyIndex] = idol;
            setDeck(newDeck);
        } else {
            alert("Deck is full! Remove a card first.");
        }
    }
  };

  const handleSave = () => {
      const ids = deck.map(i => i ? i.id : null).filter(Boolean) as string[];
      if(ids.length !== 4) {
          alert("You must select 4 idols for your deck!");
          return;
      }
      onSave(ids);
  };

  const totalStats = deck.reduce((acc, i) => i ? acc + (i.vocal + i.dance + i.visual) : acc, 0);

  return (
    <div className="absolute inset-0 z-[100] bg-gray-900 flex flex-col animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-4 shadow-lg border-b border-white/10 flex justify-between items-center">
            <div>
                <h2 className="text-xl font-bold text-white italic">Unit Setup</h2>
                <p className="text-xs text-blue-300">Total Power: {totalStats}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
        </div>

        {/* Deck Slots */}
        <div className="flex justify-center gap-2 p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-gray-800 border-b border-gray-700">
            {deck.map((slot, i) => (
                <div key={i} className="w-20 h-28 bg-gray-900 rounded border-2 border-dashed border-gray-600 flex items-center justify-center relative overflow-hidden shadow-inner">
                    {slot ? (
                        <div onClick={() => toggleIdol(slot)} className="w-full h-full cursor-pointer relative group">
                            <img src={slot.image} className="w-full h-full object-cover" alt="slot" />
                            <div className="absolute inset-0 bg-red-500/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <i className="fas fa-minus-circle text-white"></i>
                            </div>
                        </div>
                    ) : (
                        <span className="text-gray-600 font-bold text-xs">Slot {i+1}</span>
                    )}
                </div>
            ))}
        </div>

        {/* Action Bar */}
        <div className="p-2 flex justify-center bg-gray-800">
            <button 
                onClick={handleSave}
                className="bg-pink-600 hover:bg-pink-500 text-white px-8 py-2 rounded-full font-bold shadow-lg transition-transform active:scale-95"
            >
                Confirm Deck
            </button>
        </div>

        {/* Idol List */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 gap-2 bg-gray-900">
            {idols.map(idol => {
                const isInDeck = deck.some(i => i?.id === idol.id);
                return (
                    <div 
                        key={idol.id} 
                        onClick={() => toggleIdol(idol)}
                        className={`relative aspect-[3/4] rounded cursor-pointer overflow-hidden border-2 ${isInDeck ? 'border-green-500 opacity-50' : 'border-transparent hover:border-white'}`}
                    >
                        <img src={idol.image} className="w-full h-full object-cover" alt={idol.name} />
                        <div className={`absolute bottom-0 w-full text-center text-[8px] font-bold ${idol.rarity === Rarity.SSR ? 'bg-gradient-to-r from-pink-500 to-blue-500' : 'bg-gray-700'} text-white`}>
                            {(idol.vocal + idol.dance + idol.visual)} Power
                        </div>
                        {isInDeck && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <i className="fas fa-check text-green-400 text-2xl drop-shadow-md"></i>
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
