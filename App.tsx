
import React, { useState } from 'react';
import Layout from './components/Layout';
import Gacha from './components/Gacha';
import IdolManager from './components/IdolManager';
import Commu from './components/Commu';
import Shop from './components/Shop';
import EventCenter from './components/EventCenter';
import Auth from './components/Auth';
import { useGameEngine } from './services/gameService';

const App: React.FC = () => {
  const { 
    userId, user, idols, event, 
    login, register, logout, 
    useItem, pullGacha, retireIdols, trainIdol, buyItem, doEventWork,
    error 
  } = useGameEngine();
  
  const [activeTab, setActiveTab] = useState('HOME');

  const handleBuy = (item: string, cost: number) => {
      buyItem(item, cost);
  };

  if (!userId) {
      return <Auth onLogin={login} onRegister={register} />;
  }

  const renderContent = () => {
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
                <p className="text-gray-300 text-sm mb-4">{error}</p>
                <div className="bg-gray-800 p-4 rounded text-xs text-left w-full font-mono text-gray-400">
                    <p>Troubleshooting:</p>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                        <li>Restart server: <code>npm run dev</code></li>
                    </ul>
                </div>
            </div>
        );
    }

    switch (activeTab) {
      case 'HOME':
        return (
          <div className="p-4 text-center space-y-6">
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20 mt-10 shadow-xl">
                <h2 className="text-3xl font-bold mb-2">Welcome, {user.name}!</h2>
                <div className="text-gray-300 text-sm flex flex-col gap-1">
                   {event && event.isActive ? (
                       <span className="text-pink-400 font-bold animate-pulse">
                           <i className="fas fa-broadcast-tower mr-1"></i> Active Event: {event.name}
                       </span>
                   ) : (
                       <span>No active events currently.</span>
                   )}
                </div>
            </div>
            
            {/* Featured Idol (Secretary) */}
            <div className="relative w-full aspect-[3/4] max-w-xs mx-auto mt-4 rounded-xl overflow-hidden shadow-2xl border-4 border-pink-500/50 group cursor-pointer">
                <img 
                    src={idols.length > 0 ? idols[0].image : "https://picsum.photos/seed/placeholder/400/600"} 
                    alt="Secretary" 
                    className="w-full h-full object-cover transform transition duration-1000 group-hover:scale-105"
                />
                <div className="absolute bottom-4 left-0 w-full text-center bg-black/60 py-2 backdrop-blur-sm">
                    <p className="font-bold text-white">"{idols.length > 0 ? idols[0].name : "Let's scout some idols!"}"</p>
                </div>
            </div>
          </div>
        );
      case 'IDOLS':
        return <IdolManager idols={idols} onRetire={retireIdols} onTrain={trainIdol} trainerTickets={user.items.trainerTicket} />;
      case 'GACHA':
        return <Gacha jewels={user.starJewels} onPull={pullGacha} />;
      case 'COMMU':
        return <Commu />;
      case 'SHOP':
        return <Shop user={user} onBuy={handleBuy} />;
      case 'EVENT':
        return event && event.isActive ? (
            <EventCenter event={event} user={user} onWork={doEventWork} />
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <i className="fas fa-calendar-times text-6xl mb-4"></i>
                <p>No Active Events</p>
                <p className="text-xs">Check back later!</p>
            </div>
        );
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      onTabChange={setActiveTab} 
      onUseItem={useItem} 
      onLogout={logout}
      isEventActive={event?.isActive}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
