
import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { MOCK_SONGS } from '../constants';

interface MusicPlayerProps {
    isOpen: boolean;
    onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isOpen, onClose }) => {
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const currentSong = MOCK_SONGS[currentSongIndex];

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
        {/* Hidden ReactPlayer to handle YouTube/Audio logic */}
        <div className="hidden">
            <ReactPlayer
                url={currentSong.url}
                playing={isPlaying}
                onEnded={nextSong}
                volume={volume}
                width="0"
                height="0"
                controls={false}
                playsinline
            />
        </div>

        {/* Jukebox Overlay */}
        <div className={`fixed inset-x-0 bottom-[64px] bg-gray-900/95 backdrop-blur-xl border-t border-pink-500/30 transition-transform duration-500 z-40 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.5)] ${isOpen ? 'translate-y-0' : 'translate-y-[120%]'}`}>
            
            {/* Drag Handle / Close Button */}
            <div className="w-full flex justify-center pt-2 pb-1" onClick={onClose}>
                <div className="w-12 h-1.5 bg-gray-600 rounded-full cursor-pointer hover:bg-gray-400 transition-colors"></div>
            </div>

            <div className="p-6 pt-2 pb-6 max-w-md mx-auto">
                {/* Header with Close */}
                <div className="flex justify-between items-center mb-4">
                     <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest">Now Playing</h4>
                     <button onClick={onClose} className="text-gray-500 hover:text-white"><i className="fas fa-chevron-down"></i></button>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-lg overflow-hidden shadow-lg border border-white/10 relative shrink-0">
                        <img src={currentSong.cover} alt="Cover" className={`w-full h-full object-cover ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                        <div className="absolute inset-0 bg-black/20 rounded-lg ring-1 ring-inset ring-white/10"></div>
                        {/* YouTube indicator */}
                        {currentSong.url.includes('youtu') && (
                            <div className="absolute bottom-1 right-1 text-red-600 text-lg"><i className="fab fa-youtube"></i></div>
                        )}
                    </div>
                    <div className="flex-1 overflow-hidden min-w-0">
                        <h3 className="text-white font-bold text-lg truncate leading-tight">{currentSong.title}</h3>
                        <p className="text-pink-400 text-xs font-bold uppercase tracking-wider truncate">{currentSong.artist}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8 mb-6">
                    <button onClick={prevSong} className="text-gray-400 hover:text-white transition-colors">
                        <i className="fas fa-backward text-2xl"></i>
                    </button>
                    <button 
                        onClick={togglePlay} 
                        className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all text-white border-2 border-white/20"
                    >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl ml-1`}></i>
                    </button>
                    <button onClick={nextSong} className="text-gray-400 hover:text-white transition-colors">
                        <i className="fas fa-forward text-2xl"></i>
                    </button>
                </div>
                
                {/* Volume Slider */}
                <div className="flex items-center gap-2 mb-4 px-2">
                    <i className="fas fa-volume-down text-gray-500 text-xs"></i>
                    <input 
                        type="range" 
                        min={0} max={1} step={0.05} 
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <i className="fas fa-volume-up text-gray-500 text-xs"></i>
                </div>

                {/* Playlist List */}
                <div className="bg-black/40 rounded-xl p-2 max-h-40 overflow-y-auto custom-scrollbar border border-white/5">
                    {MOCK_SONGS.map((song, idx) => (
                        <div 
                            key={song.id} 
                            onClick={() => selectSong(idx)}
                            className={`flex items-center gap-3 p-2 rounded cursor-pointer transition-colors ${currentSongIndex === idx ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        >
                            <span className={`text-xs w-4 text-center ${currentSongIndex === idx ? 'text-pink-400' : 'text-gray-600'}`}>
                                {currentSongIndex === idx && isPlaying ? <i className="fas fa-volume-up animate-pulse"></i> : idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className={`text-sm font-bold truncate ${currentSongIndex === idx ? 'text-pink-300' : 'text-gray-300'}`}>{song.title}</div>
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
