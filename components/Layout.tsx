
import React, { useState } from 'react';
import { UserState } from '../types';
import MusicPlayer from './MusicPlayer';

interface LayoutProps {
  user: UserState;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUseItem: (type: 'staminaDrink' | 'trainerTicket') => void;
  onLogout: () => void;
  isEventActive?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ user, children, activeTab, onTabChange, onUseItem, onLogout, isEventActive }) => {
  const [isMusicOpen, setIsMusicOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white overflow-hidden max-w-md mx-auto shadow-2xl relative border-x border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-700 p-2 shadow-md z-10">
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Lv.{user.level} {user.name}</span>
              <button onClick={onLogout} className="text-[10px] bg-red-500/50 px-1 rounded hover:bg-red-500"><i className="fas fa-sign-out-alt"></i></button>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-gray-800 px-2 py-0.5 rounded-full text-xs flex items-center border border-yellow-500">
              <i className="fas fa-coins text-yellow-400 mr-1"></i> {user.money}
            </div>
            <div className="bg-gray-800 px-2 py-0.5 rounded-full text-xs flex items-center border border-pink-400">
              <i className="fas fa-star text-pink-400 mr-1"></i> {user.starJewels}
            </div>
          </div>
        </div>
        
        {/* Stamina Bar */}
        <div className="relative w-full h-5 bg-gray-800 rounded-full border border-gray-600 overflow-hidden group cursor-pointer"
             onClick={() => onUseItem('staminaDrink')}>
          <div 
            className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
            style={{ width: `${(user.stamina / user.maxStamina) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-xs font-bold shadow-black drop-shadow-md">
            Stamina: {user.stamina}/{user.maxStamina}
            <span className="hidden group-hover:inline ml-2 text-yellow-300">(Refill: {user.items.staminaDrink})</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        {children}
      </div>

      {/* Global Music Player Overlay (Controlled by Layout State) */}
      <MusicPlayer isOpen={isMusicOpen} onClose={() => setIsMusicOpen(false)} />

      {/* Bottom Navigation */}
      <div className="bg-gray-800 border-t border-gray-700 p-1 flex justify-between items-center h-16 shrink-0 z-50 relative">
        <NavButton icon="home" label="Home" active={activeTab === 'HOME'} onClick={() => onTabChange('HOME')} />
        <NavButton icon="users" label="Idols" active={activeTab === 'IDOLS'} onClick={() => onTabChange('IDOLS')} />
        
        {/* Conditional Event Button */}
        {isEventActive ? (
          <NavButton icon="trophy" label="Event" active={activeTab === 'EVENT'} onClick={() => onTabChange('EVENT')} isSpecial />
        ) : (
          <NavButton icon="book-open" label="Commu" active={activeTab === 'COMMU'} onClick={() => onTabChange('COMMU')} />
        )}
        
        <NavButton icon="star" label="Gacha" active={activeTab === 'GACHA'} onClick={() => onTabChange('GACHA')} />
        
        <NavButton icon="shopping-cart" label="Shop" active={activeTab === 'SHOP'} onClick={() => onTabChange('SHOP')} />
        
        {/* Music Button - Toggles Overlay */}
        <NavButton 
            icon="music" 
            label="Music" 
            active={isMusicOpen} 
            onClick={() => setIsMusicOpen(!isMusicOpen)} 
        />
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick, isSpecial }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full transition-colors relative ${
        active ? 'text-pink-400' : 'text-gray-400 hover:text-white'
    } ${isSpecial ? 'animate-pulse text-yellow-400' : ''}`}
  >
    <i className={`fas fa-${icon} text-lg mb-0.5 ${active ? 'animate-bounce' : ''}`}></i>
    <span className="text-[9px] uppercase font-bold tracking-wide">{label}</span>
  </button>
);

export default Layout;
