
import React, { useState, useMemo } from 'react';
import { Idol, Rarity, IdolType } from '../types';
import DeckBuilder from './DeckBuilder';

interface IdolManagerProps {
  idols: Idol[];
  onRetire: (ids: string[]) => void;
  onTrain: (id: string) => Promise<boolean>;
  onSpecialTraining: (id: string) => Promise<boolean>;
  onStarLesson: (targetId: string, partnerId: string) => Promise<boolean>;
  trainerTickets: number;
  userDeckIds: string[];
  onSaveDeck: (ids: string[]) => Promise<boolean>;
}

type MenuMode = 'MENU' | 'LIST' | 'FORMATION' | 'LESSON' | 'SPECIAL_TRAINING' | 'STAR_LESSON' | 'TRANSFER';

const IdolManager: React.FC<IdolManagerProps> = ({ 
    idols, onRetire, onTrain, onSpecialTraining, onStarLesson, trainerTickets, userDeckIds, onSaveDeck 
}) => {
  const [mode, setMode] = useState<MenuMode>('MENU');
  
  // Selection States
  const [selectedId, setSelectedId] = useState<string | null>(null); // Main Target
  const [partnerIds, setPartnerIds] = useState<string[]>([]); // For Star Lesson or Transfer
  const [filter, setFilter] = useState<'ALL' | 'SSR'>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);

  // --- HELPERS ---

  const filteredIdols = useMemo(() => {
    return idols.filter(i => filter === 'ALL' || i.rarity === filter);
  }, [idols, filter]);

  const getTypeIcon = (type: IdolType) => {
      if (type === IdolType.CUTE) return <i className="fas fa-heart text-pink-400"></i>;
      if (type === IdolType.COOL) return <i className="fas fa-gem text-blue-400"></i>;
      if (type === IdolType.PASSION) return <i className="fas fa-sun text-yellow-400"></i>;
      return null;
  };

  const resetSelection = () => {
      setSelectedId(null);
      setPartnerIds([]);
  };

  // --- ACTIONS ---

  const handleTransfer = async () => {
      if (partnerIds.length === 0) return;
      if (confirm(`Transfer ${partnerIds.length} idols for Money?`)) {
          setIsProcessing(true);
          await onRetire(partnerIds);
          setIsProcessing(false);
          resetSelection();
          setMode('MENU');
      }
  };

  const handleLesson = async () => {
      if (!selectedId) return;
      setIsProcessing(true);
      const success = await onTrain(selectedId);
      setIsProcessing(false);
      if (success) alert("Lesson Complete! Level Up!");
  };

  const handleSpecialTraining = async () => {
      if (!selectedId) return;
      if (confirm("Perform Special Training? This will reset Level to 1 but increase max stats.")) {
          setIsProcessing(true);
          const success = await onSpecialTraining(selectedId);
          setIsProcessing(false);
          if (success) {
              alert("Special Training Successful! Idol Awakened!");
              setMode('MENU');
          }
      }
  };

  const handleStarLesson = async () => {
      if (!selectedId || partnerIds.length !== 1) return;
      if (confirm("Perform Star Lesson? The partner idol will be consumed.")) {
          setIsProcessing(true);
          const success = await onStarLesson(selectedId, partnerIds[0]);
          setIsProcessing(false);
          if (success) {
              alert("Star Rank Up!");
              resetSelection();
              setMode('MENU');
          }
      }
  };

  // --- SUB-RENDERERS ---

  const renderGridMenu = () => (
      <div className="h-full flex bg-gray-100 overflow-hidden relative">
          {/* Left: Chihiro / Secretary */}
          <div className="w-5/12 relative bg-gradient-to-b from-blue-50 to-blue-100 border-r border-blue-200 overflow-visible z-10">
             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
             
             {/* Chihiro Image - Scaled and positioned to hide bottom cut-off */}
             <div className="absolute bottom-0 left-0 w-full h-[95%] flex items-end justify-center overflow-hidden">
                 <img 
                    src="https://imas.gamedbs.jp/cg/images_o/ui/navi/1452751597-103.png" 
                    className="h-full object-contain object-bottom transform scale-110 translate-y-4"
                    alt="Secretary"
                 />
             </div>

             {/* Speech Bubble Dialog - Positioned near waist/skirt */}
             <div className="absolute bottom-24 left-2 right-[-20px] bg-white text-gray-800 text-[10px] p-3 rounded-xl shadow-lg border-2 border-gray-300 z-20 animate-fade-in">
                <p className="font-bold leading-tight">Producer-san! Let's organize the unit and train the idols!</p>
                {/* Bubble Tail */}
                <div className="absolute bottom-4 -left-2 w-4 h-4 bg-white border-b-2 border-l-2 border-gray-300 transform rotate-45"></div>
             </div>
          </div>

          {/* Right: Menu Grid */}
          <div className="w-7/12 p-2 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] custom-scrollbar pb-20">
              <div className="grid grid-cols-1 gap-2">
                  <MenuButton icon="users" color="bg-white text-blue-600 border-blue-200" label="Idol Formation" sub="Edit Units" onClick={() => setMode('FORMATION')} />
                  <MenuButton icon="microphone-alt" color="bg-white text-yellow-600 border-yellow-200" label="Lesson" sub="Level Up" onClick={() => setMode('LESSON')} />
                  <MenuButton icon="magic" color="bg-white text-pink-600 border-pink-200" label="Special Training" sub="Awaken" onClick={() => setMode('SPECIAL_TRAINING')} />
                  <MenuButton icon="star" color="bg-white text-purple-600 border-purple-200" label="Star Lesson" sub="Rank Up" onClick={() => setMode('STAR_LESSON')} />
                  
                  <MenuButton icon="bolt" color="bg-gray-100 text-gray-500" label="Potential Release" sub="Locked" disabled />
                  <MenuButton icon="gift" color="bg-gray-100 text-gray-500" label="Gift Items" sub="Locked" disabled />
                  
                  <MenuButton icon="list-alt" color="bg-white text-green-600 border-green-200" label="Idol List" sub="View All" onClick={() => setMode('LIST')} />
                  
                  <MenuButton icon="tshirt" color="bg-gray-100 text-gray-500" label="Dress Coord" sub="Locked" disabled />
                  <MenuButton icon="building" color="bg-gray-100 text-gray-500" label="Girls Dormitory" sub="Locked" disabled />
                  <MenuButton icon="book" color="bg-gray-100 text-gray-500" label="Produce Note" sub="Locked" disabled />
                  <MenuButton icon="film" color="bg-gray-100 text-gray-500" label="Premium Cut" sub="Locked" disabled />

                  <MenuButton icon="exchange-alt" color="bg-white text-red-600 border-red-200" label="Transfer" sub="Send Home" onClick={() => setMode('TRANSFER')} />
              </div>
          </div>
      </div>
  );

  const renderIdolSelector = (
      instruction: string, 
      onSelect: (id: string) => void, 
      currentSelected: string | null,
      filterFn: (i: Idol) => boolean = () => true
  ) => (
      <div className="flex-1 flex flex-col bg-gray-900 text-white h-full">
          <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-bold text-sm">{instruction}</h3>
              <button onClick={() => setMode('MENU')} className="bg-gray-600 px-3 py-1 rounded text-xs">Back</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 grid grid-cols-4 gap-2">
              {idols.filter(filterFn).map(idol => (
                  <div 
                    key={idol.id}
                    onClick={() => onSelect(idol.id)}
                    className={`relative aspect-[3/4] rounded border-2 cursor-pointer ${currentSelected === idol.id ? 'border-yellow-400' : 'border-transparent'}`}
                  >
                      <img src={idol.image} className="w-full h-full object-cover" />
                      <div className="absolute top-0 right-0 bg-black/60 px-1 text-[8px]">Lv.{idol.level}</div>
                      {idol.isAwakened && <div className="absolute top-0 left-0 bg-pink-500 text-[8px] px-1 text-white font-bold">+</div>}
                      {currentSelected === idol.id && (
                          <div className="absolute inset-0 bg-yellow-500/30 flex items-center justify-center"><i className="fas fa-check text-2xl text-white"></i></div>
                      )}
                  </div>
              ))}
          </div>
      </div>
  );

  // --- RENDER MAIN ---

  if (mode === 'MENU') return renderGridMenu();

  if (mode === 'FORMATION') {
      return <DeckBuilder 
        idols={idols} 
        currentDeckIds={userDeckIds} 
        onSave={async (ids) => { await onSaveDeck(ids); }} 
        onClose={() => setMode('MENU')} 
        onBack={() => setMode('MENU')}
      />;
  }

  if (mode === 'LIST') {
      return (
          <div className="h-full bg-gray-900 overflow-y-auto p-4">
               <div className="flex justify-between items-center mb-4">
                   <h2 className="text-white font-bold">Idol List</h2>
                   <button onClick={() => setMode('MENU')} className="bg-gray-600 text-white px-3 py-1 rounded">Back</button>
               </div>
               <div className="grid grid-cols-4 gap-2">
                   {idols.map(idol => (
                       <div key={idol.id} className="relative aspect-[3/4] rounded border-2 border-gray-700">
                           <img src={idol.image} className="w-full h-full object-cover" />
                           <div className="absolute bottom-0 w-full bg-black/60 text-[8px] text-white text-center">{idol.name}</div>
                           <div className="absolute top-0 right-0 bg-black/60 px-1 text-[8px] text-white">
                               {getTypeIcon(idol.type)} Lv.{idol.level}
                           </div>
                           <div className="absolute top-0 left-0 bg-yellow-500 text-[8px] text-black px-1 font-bold">
                               ★{idol.starRank}
                           </div>
                       </div>
                   ))}
               </div>
          </div>
      );
  }

  if (mode === 'LESSON') {
      return (
          <div className="h-full flex flex-col bg-gray-900 text-white">
              {renderIdolSelector("Select Idol to Level Up", setSelectedId, selectedId)}
              <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                  <div>
                      <div className="text-xs text-gray-400">Trainer Tickets: {trainerTickets}</div>
                      <div className="text-sm font-bold">{selectedId ? idols.find(i=>i.id===selectedId)?.name : "None Selected"}</div>
                  </div>
                  <button 
                    onClick={handleLesson}
                    disabled={!selectedId || trainerTickets < 1 || isProcessing}
                    className="bg-yellow-500 text-black px-6 py-2 rounded font-bold disabled:opacity-50"
                  >
                      {isProcessing ? 'Training...' : 'Start Lesson'}
                  </button>
              </div>
          </div>
      );
  }

  if (mode === 'SPECIAL_TRAINING') {
      const candidates = idols.filter(i => i.level === i.maxLevel && !i.isAwakened);
      return (
          <div className="h-full flex flex-col bg-gray-900 text-white">
               {candidates.length === 0 ? (
                   <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                       <p className="text-gray-400 mb-4">No idols ready for Special Training.</p>
                       <p className="text-xs text-gray-500">Idols must be Max Level and not yet Awakened.</p>
                       <button onClick={() => setMode('MENU')} className="mt-4 bg-gray-700 px-4 py-2 rounded">Back</button>
                   </div>
               ) : (
                   renderIdolSelector("Select Max Level Idol to Awaken", setSelectedId, selectedId, i => i.level === i.maxLevel && !i.isAwakened)
               )}
               {selectedId && (
                   <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end">
                       <button onClick={handleSpecialTraining} disabled={isProcessing} className="bg-pink-600 text-white px-6 py-2 rounded font-bold">
                           {isProcessing ? 'Awakening...' : 'Do Special Training'}
                       </button>
                   </div>
               )}
          </div>
      );
  }

  if (mode === 'STAR_LESSON') {
      // Step 1: Select Base
      if (!selectedId) {
          return renderIdolSelector("Select Base Idol", setSelectedId, null);
      }
      // Step 2: Select Duplicate
      const base = idols.find(i => i.id === selectedId);
      return (
          <div className="h-full flex flex-col bg-gray-900 text-white">
              <div className="p-2 bg-gray-800 flex justify-between items-center">
                  <span className="text-xs">Base: {base?.name}</span>
                  <button onClick={() => setSelectedId(null)} className="text-xs bg-red-900 px-2 py-1 rounded">Change Base</button>
              </div>
              {renderIdolSelector(
                  "Select Duplicate to Merge (Will be lost)", 
                  (id) => setPartnerIds([id]), 
                  partnerIds[0], 
                  (i) => i.name === base?.name && i.rarity === base?.rarity && i.id !== base?.id
              )}
              {partnerIds.length > 0 && (
                   <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end">
                       <button onClick={handleStarLesson} disabled={isProcessing} className="bg-purple-600 text-white px-6 py-2 rounded font-bold">
                           {isProcessing ? 'Merging...' : 'Start Star Lesson'}
                       </button>
                   </div>
              )}
          </div>
      );
  }

  if (mode === 'TRANSFER') {
       return (
           <div className="h-full flex flex-col bg-gray-900 text-white">
               {renderIdolSelector(
                   "Select Idols to Transfer (Sell)", 
                   (id) => {
                       setPartnerIds(prev => prev.includes(id) ? prev.filter(p=>p!==id) : [...prev, id]);
                   }, 
                   null
               )}
               {partnerIds.length > 0 && (
                   <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-between items-center">
                       <div className="text-sm">{partnerIds.length} Selected</div>
                       <button onClick={handleTransfer} disabled={isProcessing} className="bg-red-600 text-white px-6 py-2 rounded font-bold">
                           Transfer
                       </button>
                   </div>
               )}
           </div>
       );
  }

  return <div>Unknown Mode</div>;
};

const MenuButton = ({ icon, color, label, sub, onClick, disabled }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center p-3 rounded-lg shadow-sm border border-b-4 transition-transform active:scale-95 active:border-b-0 active:translate-y-1 ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100 border-gray-300 text-gray-400' : `hover:brightness-105 ${color}`}`}
    >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mr-3 bg-black/5 shrink-0`}>
            <i className={`fas fa-${icon}`}></i>
        </div>
        <div className="text-left flex-1">
            <div className="font-bold text-sm leading-tight">{label}</div>
            <div className="text-[9px] uppercase tracking-wider opacity-70">{sub}</div>
        </div>
        {!disabled && <i className="fas fa-chevron-right ml-auto text-black/20"></i>}
    </button>
);

export default IdolManager;
