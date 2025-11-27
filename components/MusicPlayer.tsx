
import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { MOCK_SONGS } from '../constants';

interface MusicPlayerProps {
    isOpen: boolean;
    onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isOpen, onClose }) => {
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [played, setPlayed] = useState(0);

    const currentSong = MOCK_SONGS[currentSongIndex];

    const handleNext = () => {
        setCurrentSongIndex((prev) => (prev + 1) % MOCK_SONGS.length);
        setPlayed(0);
    };

    const handlePrev = () => {
        setCurrentSongIndex((prev) => (prev - 1 + MOCK_SONGS.length) % MOCK_SONGS.length);
        setPlayed(0);
    };

    const togglePlay = () => {
        setPlaying(!playing);
    };

    return (
        <>
            {/* Hidden Player for Background Audio */}
            <div className="hidden">
                <ReactPlayer 
                    url={currentSong.url}
                    playing={playing}
                    volume={volume}
                    onEnded={handleNext}
                    onProgress={({ played }) => setPlayed(played)}
                    width="0"
                    height="0"
                />
            </div>

            {/* UI Overlay */}
            {isOpen && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col animate-fade-in">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b border-gray-700">
                        <h2 className="text-white font-bold italic"><i className="fas fa-music text-pink-500 mr-2"></i> JUKEBOX</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <i className="fas fa-chevron-down text-xl"></i>
                        </button>
                    </div>

                    {/* CD / Cover Art */}
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
                        <div className={`relative w-64 h-64 rounded-full border-4 border-gray-800 shadow-[0_0_30px_rgba(236,72,153,0.3)] overflow-hidden ${playing ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
                            <div className="absolute inset-0 bg-black">
                                <img src={currentSong.cover} alt="Cover" className="w-full h-full object-cover opacity-80" />
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-gray-900 rounded-full border border-gray-600"></div>
                            </div>
                        </div>

                        <div className="text-center">
                            <h3 className="text-xl font-bold text-white mb-1">{currentSong.title}</h3>
                            <p className="text-pink-400 text-sm">{currentSong.artist}</p>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="bg-gray-800 rounded-t-3xl p-6 pb-24 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-700 h-1 rounded-full mb-6 overflow-hidden">
                            <div 
                                className="h-full bg-pink-500 transition-all duration-300"
                                style={{ width: `${played * 100}%` }}
                            ></div>
                        </div>

                        {/* Main Buttons */}
                        <div className="flex items-center justify-center gap-8 mb-6">
                            <button onClick={handlePrev} className="text-gray-400 hover:text-white text-2xl transition-transform active:scale-95">
                                <i className="fas fa-step-backward"></i>
                            </button>
                            
                            <button 
                                onClick={togglePlay}
                                className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border border-white/20 hover:scale-105 transition-transform active:scale-95"
                            >
                                <i className={`fas ${playing ? 'fa-pause' : 'fa-play pl-1'}`}></i>
                            </button>

                            <button onClick={handleNext} className="text-gray-400 hover:text-white text-2xl transition-transform active:scale-95">
                                <i className="fas fa-step-forward"></i>
                            </button>
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-3 px-4">
                            <i className="fas fa-volume-down text-gray-500 text-xs"></i>
                            <input 
                                type="range" 
                                min="0" max="1" step="0.01" 
                                value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="w-full accent-pink-500 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                            <i className="fas fa-volume-up text-gray-500 text-xs"></i>
                        </div>
                    </div>

                    {/* Playlist (Mini) */}
                    <div className="absolute top-20 right-4">
                        <div className="bg-black/50 p-2 rounded-lg backdrop-blur-sm border border-white/10 max-h-40 overflow-y-auto w-48 custom-scrollbar">
                             {MOCK_SONGS.map((song, idx) => (
                                 <div 
                                    key={song.id} 
                                    onClick={() => { setCurrentSongIndex(idx); setPlaying(true); }}
                                    className={`text-[10px] p-2 rounded cursor-pointer mb-1 truncate ${idx === currentSongIndex ? 'bg-pink-600 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                                 >
                                     {idx + 1}. {song.title}
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MusicPlayer;
