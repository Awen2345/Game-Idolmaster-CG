
import React, { useState, useRef, useEffect } from 'react';
import { MOCK_SONGS } from '../constants';
import { Song } from '../types';

const MusicPlayer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSong = MOCK_SONGS[currentSongIndex];

  useEffect(() => {
    if (audioRef.current) {
        if (isPlaying) {
            audioRef.current.play().catch(e => console.log("Autoplay blocked usually:", e));
        } else {
            audioRef.current.pause();
        }
    }
  }, [isPlaying, currentSongIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextSong = () => {
      setCurrentSongIndex((prev) => (prev + 1) % MOCK_SONGS.length);
      setIsPlaying(true);
  };

  const prevSong = () => {
      setCurrentSongIndex((prev) => (prev - 1 + MOCK_SONGS.length) % MOCK_SONGS.length);
      setIsPlaying(true);
  };

  const selectSong = (index: number) => {
      setCurrentSongIndex(index);
      setIsPlaying(true);
  };

  return (
    <>
        {/* Floating Toggle Button */}
        <button 
            onClick={() => setIsOpen(!isOpen)}
            className={`fixed bottom-20 right-4 w-12 h-12 rounded-full shadow-xl flex items-center justify-center z-50 transition-all duration-300 ${isOpen ? 'bg-pink-500 rotate-90' : 'bg-gray-800 border-2 border-pink-400'}`}
        >
            <i className={`fas ${isOpen ? 'fa-times' : 'fa-music'} text-white`}></i>
            {isPlaying && !isOpen && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                </span>
            )}
        </button>

        <audio ref={audioRef} src={currentSong.url} onEnded={nextSong} />

        {/* Jukebox Overlay */}
        <div className={`fixed inset-x-0 bottom-0 bg-gray-900/95 backdrop-blur-xl border-t border-pink-500/30 transition-transform duration-500 z-40 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-y-0' : 'translate-y-[120%]'}`}>
            <div className="p-6 pb-24 max-w-md mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-lg overflow-hidden shadow-lg border border-white/10 relative">
                        <img src={currentSong.cover} alt="Cover" className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                        <div className="absolute inset-0 bg-black/20 rounded-lg ring-1 ring-inset ring-white/10"></div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <h3 className="text-white font-bold text-lg truncate">{currentSong.title}</h3>
                        <p className="text-pink-400 text-xs font-bold uppercase tracking-wider">{currentSong.artist}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8 mb-6">
                    <button onClick={prevSong} className="text-gray-400 hover:text-white transition-colors">
                        <i className="fas fa-backward text-2xl"></i>
                    </button>
                    <button 
                        onClick={togglePlay} 
                        className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-white"
                    >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-2xl ml-1`}></i>
                    </button>
                    <button onClick={nextSong} className="text-gray-400 hover:text-white transition-colors">
                        <i className="fas fa-forward text-2xl"></i>
                    </button>
                </div>

                {/* Playlist List */}
                <div className="bg-black/40 rounded-xl p-2 max-h-40 overflow-y-auto custom-scrollbar">
                    {MOCK_SONGS.map((song, idx) => (
                        <div 
                            key={song.id} 
                            onClick={() => selectSong(idx)}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${currentSongIndex === idx ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <span className={`text-xs w-4 ${currentSongIndex === idx ? 'text-pink-400' : 'text-gray-600'}`}>
                                {currentSongIndex === idx && isPlaying ? <i className="fas fa-volume-up animate-pulse"></i> : idx + 1}
                            </span>
                            <div className="flex-1">
                                <div className={`text-sm font-bold ${currentSongIndex === idx ? 'text-pink-300' : 'text-gray-300'}`}>{song.title}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </>
  );
};

export default MusicPlayer;
