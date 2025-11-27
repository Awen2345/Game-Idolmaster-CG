
import React, { useState } from 'react';
import { Chapter } from '../types';

interface StoryReaderProps {
  chapter: Chapter;
  onClose: () => void;
  onFinish?: (chapterId: string) => void;
}

const StoryReader: React.FC<StoryReaderProps> = ({ chapter, onClose, onFinish }) => {
  const [index, setIndex] = useState(0);

  const currentLine = chapter.dialogs![index];
  const isFinished = index >= chapter.dialogs!.length;

  const next = () => {
    if (index < chapter.dialogs!.length) {
      setIndex(index + 1);
    } else {
      if (onFinish) onFinish(chapter.id);
      onClose();
    }
  };

  let spriteUrl = '';
  if (currentLine?.customSpriteUrl) {
      spriteUrl = currentLine.customSpriteUrl;
  } else {
      // Use relative path so it goes through Vite proxy (to port 3001)
      spriteUrl = `/assets/sprites/${currentLine?.speaker}/${currentLine?.expression || 'neutral'}.png`;
  }
  
  const fallbackUrl = `https://picsum.photos/seed/${currentLine?.speaker}/400/600`;

  const handleImageError = (e: any) => {
      if (e.target.src !== fallbackUrl) {
          e.target.src = fallbackUrl;
      }
  };

  if (isFinished) {
    return (
      <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 animate-fade-in">
        <h2 className="text-3xl text-white font-bold mb-4">CLEAR!</h2>
        <div className="text-yellow-400 mb-8"><i className="fas fa-star"></i> Story Completed</div>
        <button onClick={() => { if(onFinish) onFinish(chapter.id); onClose(); }} className="bg-pink-600 px-6 py-2 rounded-full font-bold">Return to Menu</button>
      </div>
    );
  }

  return (
    <div 
      className="absolute inset-0 z-40 bg-[url('https://picsum.photos/seed/bg_school/800/600')] bg-cover bg-center flex flex-col justify-end pb-4"
      onClick={next}
    >
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-80 h-[500px] transition-all duration-300 pointer-events-none">
             {currentLine.speaker !== 'Producer' && (
                 <img 
                    src={spriteUrl} 
                    onError={handleImageError}
                    alt={currentLine.speaker} 
                    className={`w-full h-full object-contain drop-shadow-2xl filter ${
                        currentLine.expression === 'happy' && !currentLine.customSpriteUrl ? 'brightness-110' : 
                        currentLine.expression === 'angry' && !currentLine.customSpriteUrl ? 'sepia-[.3] hue-rotate-[-30deg]' : ''
                    } ${currentLine.expression === 'happy' ? 'animate-bounce' : ''}`} 
                 />
             )}
        </div>

        <div className="mx-4 bg-black/80 border-2 border-white/20 rounded-xl p-4 min-h-[150px] relative backdrop-blur-sm cursor-pointer hover:bg-black/90 transition-colors">
            <div className="absolute -top-4 left-4 bg-pink-600 px-4 py-1 rounded-t-lg font-bold text-sm border-t border-x border-pink-400 shadow-lg">
                {currentLine.speaker}
            </div>
            <p className="text-white text-lg leading-relaxed mt-2">{currentLine.text}</p>
            <div className="absolute bottom-4 right-4 animate-bounce text-pink-500">
                <i className="fas fa-caret-down text-2xl"></i>
            </div>
        </div>

        <button 
            onClick={(e) => { e.stopPropagation(); if(onFinish) onFinish(chapter.id); onClose(); }}
            className="absolute top-4 right-4 bg-gray-800/80 px-3 py-1 rounded text-xs font-bold border border-white/20"
        >
            SKIP <i className="fas fa-forward"></i>
        </button>
    </div>
  );
};

export default StoryReader;
