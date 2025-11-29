
import React, { useState } from 'react';
import { Announcement, AnnouncementCategory } from '../types';

interface AnnouncementModalProps {
    announcements: Announcement[];
    onClose: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcements, onClose }) => {
    const [filter, setFilter] = useState<AnnouncementCategory | 'ALL'>('ALL');
    const [selectedItem, setSelectedItem] = useState<Announcement | null>(null);

    const filteredList = announcements.filter(a => filter === 'ALL' || a.category === filter);

    const getCategoryStyle = (cat: AnnouncementCategory) => {
        switch (cat) {
            case 'IMPORTANT': return 'bg-yellow-500 text-black border-yellow-300';
            case 'EVENT': return 'bg-pink-600 text-white border-pink-400';
            case 'UPDATE': return 'bg-green-600 text-white border-green-400';
            case 'BUG': return 'bg-red-600 text-white border-red-400';
            default: return 'bg-blue-600 text-white border-blue-400'; // NEWS
        }
    };

    const getIcon = (cat: AnnouncementCategory) => {
        switch (cat) {
            case 'IMPORTANT': return 'fa-exclamation-triangle';
            case 'EVENT': return 'fa-trophy';
            case 'UPDATE': return 'fa-download';
            case 'BUG': return 'fa-bug';
            default: return 'fa-newspaper';
        }
    };

    return (
        <div className="absolute inset-0 z-[150] bg-black/80 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
             <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col h-[85vh] text-gray-800 relative">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-4 flex justify-between items-center shrink-0 shadow-md z-10">
                    <h2 className="text-white font-bold text-lg italic tracking-wider">
                        <i className="fas fa-bullhorn mr-2 text-yellow-300"></i> 
                        {selectedItem ? 'News Details' : 'Announcements'}
                    </h2>
                    <button onClick={selectedItem ? () => setSelectedItem(null) : onClose} className="text-white hover:text-blue-200 bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
                        <i className={`fas ${selectedItem ? 'fa-arrow-left' : 'fa-times'}`}></i>
                    </button>
                </div>

                {selectedItem ? (
                    /* DETAIL VIEW */
                    <div className="flex-1 overflow-y-auto bg-gray-50 p-0 animate-slide-in-right">
                        {selectedItem.bannerUrl && (
                            <div className="w-full h-48 bg-gray-200 relative">
                                <img src={selectedItem.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent flex items-end p-4">
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${getCategoryStyle(selectedItem.category)}`}>
                                        {selectedItem.category}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        <div className="p-6">
                            {!selectedItem.bannerUrl && (
                                <span className={`inline-block mb-3 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider ${getCategoryStyle(selectedItem.category)}`}>
                                    {selectedItem.category}
                                </span>
                            )}
                            
                            <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight">{selectedItem.title}</h3>
                            <p className="text-gray-500 text-xs mb-6 border-b border-gray-200 pb-4">
                                <i className="far fa-clock mr-1"></i>
                                {new Date(selectedItem.date).toLocaleDateString()} {new Date(selectedItem.date).toLocaleTimeString()}
                            </p>
                            
                            <div className="prose prose-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                {selectedItem.content}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* LIST VIEW */
                    <>
                        {/* Category Filter Tabs */}
                        <div className="bg-gray-100 p-2 flex gap-2 overflow-x-auto border-b border-gray-200 shrink-0 scrollbar-hide">
                            {(['ALL', 'IMPORTANT', 'NEWS', 'EVENT', 'UPDATE', 'BUG'] as const).map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${
                                        filter === cat 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto bg-gray-100 p-3 custom-scrollbar space-y-3">
                            {filteredList.length === 0 ? (
                                <div className="text-center text-gray-400 mt-10">No announcements found.</div>
                            ) : (
                                filteredList.map(a => (
                                    <div 
                                        key={a.id} 
                                        onClick={() => setSelectedItem(a)}
                                        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden cursor-pointer hover:shadow-md hover:translate-x-1 transition-all group"
                                    >
                                        <div className="flex h-24">
                                            {/* Left: Banner Thumbnail or Icon */}
                                            <div className="w-24 shrink-0 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                                                {a.bannerUrl ? (
                                                    <img src={a.bannerUrl} alt="Thumb" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                ) : (
                                                    <i className={`fas ${getIcon(a.category)} text-3xl text-gray-400 opacity-50`}></i>
                                                )}
                                                {/* Category Overlay */}
                                                <div className="absolute top-0 left-0">
                                                    <div className={`w-0 h-0 border-t-[40px] border-r-[40px] border-t-white/80 border-r-transparent`}></div>
                                                </div>
                                            </div>

                                            {/* Right: Content Info */}
                                            <div className="flex-1 p-3 flex flex-col justify-between">
                                                <div>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border uppercase ${getCategoryStyle(a.category)}`}>
                                                            {a.category}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">{new Date(a.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
                                                        {a.title}
                                                    </h3>
                                                </div>
                                                <div className="text-[10px] text-gray-500 flex items-center gap-1 justify-end">
                                                    Tap for details <i className="fas fa-chevron-right text-xs"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
                
                {/* Footer */}
                <div className="bg-gray-50 p-3 text-center border-t border-gray-200 text-xs text-gray-400 shrink-0">
                    Check back regularly for updates!
                </div>
             </div>
        </div>
    );
};

export default AnnouncementModal;
