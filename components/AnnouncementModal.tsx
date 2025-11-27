
import React from 'react';
import { Announcement } from '../types';

interface AnnouncementModalProps {
    announcements: Announcement[];
    onClose: () => void;
}

const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcements, onClose }) => {
    return (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-gray-800">
                <div className="bg-blue-600 p-4 flex justify-between items-center">
                    <h2 className="text-white font-bold text-lg"><i className="fas fa-bullhorn mr-2"></i> Announcements</h2>
                    <button onClick={onClose} className="text-white hover:text-blue-200"><i className="fas fa-times text-xl"></i></button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-100 p-4 custom-scrollbar">
                    {announcements.map(a => (
                        <div key={a.id} className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 overflow-hidden">
                            {a.bannerUrl && (
                                <img src={a.bannerUrl} alt="News" className="w-full h-32 object-cover" />
                            )}
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-blue-800">{a.title}</h3>
                                    <span className="text-[10px] bg-gray-200 px-2 py-1 rounded text-gray-600">{new Date(a.date).toLocaleDateString()}</span>
                                </div>
                                <div className="w-full h-px bg-gray-200 mb-2"></div>
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{a.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
                
                <div className="bg-gray-50 p-3 text-center border-t border-gray-200">
                    <button onClick={onClose} className="bg-gray-800 text-white px-8 py-2 rounded-full font-bold text-sm">Close</button>
                </div>
             </div>
        </div>
    );
};

export default AnnouncementModal;
