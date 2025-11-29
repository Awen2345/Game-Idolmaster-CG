
import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { MOCK_SONGS } from '../constants';
import { Song } from '../types';

interface MusicPlayerProps {
    isOpen: boolean;
    onClose: () => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ isOpen, onClose }) => {
    const [currentSongIndex, setCurrentSongIndex] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [played, setPlayed] = useState(0);
    
    // Playlist State
    const [activeCategory, setActiveCategory] = useState<'ALL' | 'IDOLMASTER' | 'ANIME' | 'J-POP'>('ALL');

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

    const playSong = (globalIndex: number) => {
        setCurrentSongIndex(globalIndex);
        setPlaying(true);
    };

    const getFilteredSongs = () => {
        if (activeCategory === 'ALL') return MOCK_SONGS;
        return MOCK_SONGS.filter(s => s.category === activeCategory);
    };

    // Cast to any to bypass type definition issues with ReactPlayer
    const Player = ReactPlayer as any;

    return (
        <>
            {/* Hidden Player for Background Audio */}
            <div className="hidden">
                <Player 
                    url={currentSong.url}
                    playing={playing}
                    volume={volume}
                    onEnded={handleNext}
                    onProgress={(state: any) => setPlayed(state.played)}
                    width="0"
                    height="0"
                />
            </div>

            {/* UI Overlay */}
            {isOpen && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col animate-fade-in text-white overflow-hidden">
                    
                    {/* TOP: Player Controls Area */}
                    <div className="flex-none p-4 bg-gradient-to-b from-gray-800 to-gray-900 border-b border-gray-700 shadow-xl relative z-10">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold italic text-pink-500 flex items-center gap-2">
                                <i className="fas fa-compact-disc"></i> JUKEBOX
                            </h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full">
                                <i className="fas fa-chevron-down"></i>
                            </button>
                        </div>

                        {/* Main Player Info */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-24 h-24 rounded-lg overflow-hidden shadow-lg border border-white/20 ${playing ? 'animate-pulse' : ''}`}>
                                <img src={currentSong.cover} alt="Cover" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="text-xs bg-pink-600 inline-block px-2 py-0.5 rounded mb-1 font-bold">{currentSong.category}</div>
                                <h3 className="text-xl font-bold truncate">{currentSong.title}</h3>
                                <p className="text-gray-400 text-sm truncate">{currentSong.artist}</p>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="w-full bg-gray-700 h-1.5 rounded-full mb-4 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                                style={{ width: `${played * 100}%` }}
                            ></div>
                        </div>

                        {/* Buttons & Volume */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-6">
                                <button onClick={handlePrev} className="text-2xl text-gray-400 hover:text-white"><i className="fas fa-step-backward"></i></button>
                                <button onClick={togglePlay} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center text-xl hover:scale-105 transition-transform">
                                    <i className={`fas ${playing ? 'fa-pause' : 'fa-play ml-1'}`}></i>
                                </button>
                                <button onClick={handleNext} className="text-2xl text-gray-400 hover:text-white"><i className="fas fa-step-forward"></i></button>
                            </div>
                            
                            <div className="flex items-center gap-2 w-24">
                                <i className="fas fa-volume-down text-xs text-gray-500"></i>
                                <input 
                                    type="range" min="0" max="1" step="0.01" 
                                    value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))}
                                    className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-pink-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE: Category Tabs */}
                    <div className="flex-none p-2 bg-gray-900 border-b border-gray-800 overflow-x-auto whitespace-nowrap scrollbar-hide">
                        {['ALL', 'IDOLMASTER', 'ANIME', 'J-POP'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat as any)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold mr-2 transition-colors border ${
                                    activeCategory === cat 
                                        ? 'bg-pink-600 text-white border-pink-500' 
                                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* BOTTOM: Playlist */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                        {getFilteredSongs().map((song) => {
                            // We need to find the GLOBAL index to play it correctly
                            const globalIndex = MOCK_SONGS.findIndex(s => s.id === song.id);
                            const isCurrent = globalIndex === currentSongIndex;

                            return (
                                <div 
                                    key={song.id} 
                                    onClick={() => playSong(globalIndex)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${
                                        isCurrent 
                                            ? 'bg-pink-900/40 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]' 
                                            : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700'
                                    }`}
                                >
                                    {/* Tiny Cover */}
                                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 relative">
                                        <img src={song.cover} className={`w-full h-full object-cover ${isCurrent && playing ? 'opacity-50' : ''}`} />
                                        {isCurrent && playing && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="flex gap-0.5 items-end h-4">
                                                    <div className="w-1 bg-white animate-[bounce_0.5s_infinite]"></div>
                                                    <div className="w-1 bg-white animate-[bounce_0.7s_infinite]"></div>
                                                    <div className="w-1 bg-white animate-[bounce_0.4s_infinite]"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`text-sm font-bold truncate ${isCurrent ? 'text-pink-400' : 'text-white'}`}>{song.title}</h4>
                                        <p className="text-[10px] text-gray-400 truncate">{song.artist}</p>
                                    </div>

                                    {/* Status Icon */}
                                    <div className="text-gray-500">
                                        {isCurrent ? <i className="fas fa-volume-up text-pink-500 animate-pulse"></i> : <i className="fas fa-play text-xs opacity-0 group-hover:opacity-100"></i>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                </div>
            )}
        </>
    );
};

export default MusicPlayer;
