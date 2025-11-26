
import React, { useState, useEffect } from 'react';
import { CommuType, Chapter, DialogLine, UserSprite } from '../types';
import StoryReader from './StoryReader';
import FanmadeCreator from './FanmadeCreator';

interface CommuProps {
    fetchChapters: (type: string) => Promise<Chapter[]>;
    fetchDialogs: (id: string, isFan: boolean) => Promise<DialogLine[]>;
    saveFanmadeStory: (title: string, dialogs: DialogLine[]) => Promise<boolean>;
    uploadSprite: (name: string, base64: string) => Promise<boolean>;
    fetchUserSprites: () => Promise<UserSprite[]>;
}

const Commu: React.FC<CommuProps> = ({ fetchChapters, fetchDialogs, saveFanmadeStory, uploadSprite, fetchUserSprites }) => {
  // Use props instead of internal hook to maintain shared state with App.tsx
  const [path, setPath] = useState<any[]>([]); 
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [activeDialogs, setActiveDialogs] = useState<DialogLine[]>([]);
  const [loadedChapters, setLoadedChapters] = useState<Chapter[]>([]);
  const [isCreatorMode, setIsCreatorMode] = useState(false);

  const navigateTo = (item: any) => setPath([...path, item]);
  
  const goBack = () => {
    if (activeChapter) {
        setActiveChapter(null);
        return;
    }
    setPath(path.slice(0, -1));
  };

  const handleSelectChapter = async (chapter: Chapter) => {
      const dialogs = await fetchDialogs(chapter.id, chapter.type === 'FANMADE');
      setActiveDialogs(dialogs);
      setActiveChapter({...chapter, dialogs});
  };

  useEffect(() => {
    const load = async () => {
        if (path.length === 1 && path[0].type) {
            const data = await fetchChapters(path[0].type);
            setLoadedChapters(data || []);
        }
    };
    load();
  }, [path, fetchChapters, isCreatorMode]); // Reload on mode switch to refresh fan list

  if (isCreatorMode) {
      return (
          <FanmadeCreator 
            onSave={saveFanmadeStory} 
            onCancel={() => setIsCreatorMode(false)} 
            onUploadSprite={uploadSprite}
            onFetchSprites={fetchUserSprites}
          />
      );
  }

  const renderContent = () => {
    if (activeChapter) {
        return <StoryReader chapter={activeChapter} onClose={() => setActiveChapter(null)} />;
    }

    // Level 0: Main Menu
    if (path.length === 0) {
      return (
        <div className="grid grid-cols-1 gap-4 p-4">
          <MenuCard title="Story Community" desc="Main Story Chapters" color="bg-pink-600" onClick={() => navigateTo({ type: CommuType.STORY })} />
          <MenuCard title="Event Community" desc="Past Event Stories" color="bg-blue-600" onClick={() => navigateTo({ type: CommuType.EVENT })} />
          <MenuCard title="Idol Community" desc="Individual Idol Stories" color="bg-yellow-600" onClick={() => navigateTo({ type: CommuType.IDOL })} />
          <MenuCard title="Extra Community" desc="Special Campaigns" color="bg-green-600" onClick={() => navigateTo({ type: CommuType.EXTRA })} />
          <MenuCard title="Fanmade / Experimental" desc="User Created Stories" color="bg-purple-600" onClick={() => navigateTo({ type: CommuType.FANMADE })} />
        </div>
      );
    }

    // Level 1: Lists based on Type
    if (path.length === 1) {
       return (
         <div className="p-4 space-y-3">
            {path[0].type === CommuType.FANMADE && (
                <button 
                    onClick={() => setIsCreatorMode(true)}
                    className="w-full bg-purple-500 text-white py-3 rounded mb-4 font-bold shadow-lg flex items-center justify-center gap-2"
                >
                    <i className="fas fa-plus-circle"></i> Create New Story
                </button>
            )}

            {loadedChapters.length === 0 ? <p className="text-gray-400 text-center">Loading or No Stories...</p> : null}
            {loadedChapters.map(ch => (
                <div key={ch.id} onClick={() => handleSelectChapter(ch)} className="bg-gray-800 border-l-4 border-pink-500 p-4 rounded shadow hover:bg-gray-750 cursor-pointer flex justify-between items-center transition-transform active:scale-95">
                    <div>
                        <div className="text-xs text-pink-400 font-bold mb-1">{ch.type}</div>
                        <h4 className="font-bold text-white">{ch.title}</h4>
                        {(ch as any).authorName && <p className="text-xs text-gray-500">by {(ch as any).authorName}</p>}
                    </div>
                    <i className="fas fa-play text-gray-600"></i>
                </div>
            ))}
         </div>
       );
    }

    return <div>Unknown Path</div>;
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
        {path.length > 0 && !activeChapter && (
            <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center">
                <button onClick={goBack} className="text-white px-3 py-1 rounded hover:bg-gray-700 mr-2">
                    <i className="fas fa-arrow-left"></i>
                </button>
                <span className="font-bold capitalize text-sm">
                    {path.length === 1 ? (path[0].type === 'FANMADE' ? 'Fanmade Stories' : path[0].type.toLowerCase()) : 'Chapters'}
                </span>
            </div>
        )}
        <div className="flex-1 overflow-y-auto">
            {renderContent()}
        </div>
    </div>
  );
};

const MenuCard = ({ title, desc, color, onClick }: any) => (
    <div onClick={onClick} className={`${color} p-6 rounded-xl shadow-lg cursor-pointer transform transition hover:scale-[1.02] active:scale-95 flex flex-col justify-center h-28 relative overflow-hidden group`}>
        <div className="absolute right-0 bottom-0 text-9xl opacity-10 transform translate-x-4 translate-y-4 rotate-[-15deg] group-hover:rotate-0 transition-transform">
            <i className="fas fa-music"></i>
        </div>
        <h3 className="text-xl font-black italic z-10">{title}</h3>
        <p className="text-white/80 text-xs z-10">{desc}</p>
    </div>
);

export default Commu;
