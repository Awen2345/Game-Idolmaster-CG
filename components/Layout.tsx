
import React, { useState } from 'react';
import { UserState } from '../types';
import MusicPlayer from './MusicPlayer';
import PromoModal from './PromoModal';

interface LayoutProps {
  user: UserState;
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUseItem: (type: 'staminaDrink' | 'trainerTicket') => void;
  onLogout: () => void;
  isEventActive?: boolean;
  onOpenPromo?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, children, activeTab, onTabChange, onUseItem, onLogout, isEventActive, onOpenPromo }) => {
  const [isMusicOpen, setIsMusicOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabClick = (tab: string) => {
      onTabChange(tab);
      setIsMenuOpen(false); // Close menu if navigating
  };

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
      
      {/* Floating Promo Button (Bottom Left) */}
      {onOpenPromo && (
        <div className="absolute bottom-20 left-4 z-30">
            <button 
                onClick={onOpenPromo}
                className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,0.5)] border-2 border-white/50 hover:scale-110 transition-transform animate-bounce-slow group"
                title="Promo Code"
            >
                <i className="fas fa-ticket-alt text-white text-xl drop-shadow-md group-hover:rotate-12 transition-transform"></i>
            </button>
        </div>
      )}

      {/* Overlays */}
      <MusicPlayer isOpen={isMusicOpen} onClose={() => setIsMusicOpen(false)} />

      {/* MENU OVERLAY */}
      {isMenuOpen && (
          <div className="absolute inset-0 bg-black/80 z-40 flex flex-col justify-end pb-20 animate-fade-in" onClick={() => setIsMenuOpen(false)}>
              <div className="bg-gray-800 rounded-t-2xl p-6 grid grid-cols-4 gap-4 m-2 border border-gray-600" onClick={e => e.stopPropagation()}>
                  <MenuIcon icon="shopping-cart" label="Shop" color="bg-yellow-600" onClick={() => handleTabClick('SHOP')} />
                  <MenuIcon icon="music" label="Music" color="bg-pink-600" onClick={() => { setIsMusicOpen(true); setIsMenuOpen(false); }} />
                  <MenuIcon icon="user-circle" label="Profile" color="bg-blue-600" onClick={() => alert("Profile Coming Soon")} />
                  <MenuIcon icon="box-open" label="Items" color="bg-green-600" onClick={() => alert("Inventory Coming Soon")} />
                  
                  {isEventActive && (
                      <MenuIcon icon="trophy" label="Event" color="bg-red-600" onClick={() => handleTabClick('EVENT')} />
                  )}
              </div>
          </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-gray-800 border-t border-gray-700 p-1 flex justify-between items-center h-16 shrink-0 z-50 relative">
        <NavButton icon="home" label="Home" active={activeTab === 'HOME'} onClick={() => onTabChange('HOME')} />
        <NavButton icon="users" label="Idols" active={activeTab === 'IDOLS'} onClick={() => onTabChange('IDOLS')} />
        
        {/* COMMU IS BACK PERMANENTLY */}
        <NavButton icon="book-open" label="Commu" active={activeTab === 'COMMU'} onClick={() => onTabChange('COMMU')} />
        
        <NavButton icon="star" label="Gacha" active={activeTab === 'GACHA'} onClick={() => onTabChange('GACHA')} />
        
        {/* Menu Button toggles overlay */}
        <NavButton 
            icon="bars" 
            label="Menu" 
            active={isMenuOpen} 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
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

const MenuIcon = ({ icon, label, color, onClick }: any) => (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
        <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shadow-lg border-2 border-white/20 group-hover:scale-110 transition-transform`}>
            <i className={`fas fa-${icon} text-white text-lg`}></i>
        </div>
        <span className="text-xs font-bold text-gray-300">{label}</span>
    </button>
);

export default Layout;
