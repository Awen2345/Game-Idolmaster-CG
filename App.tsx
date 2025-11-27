
import React, { useState } from 'react';
import Layout from './components/Layout';
import Gacha from './components/Gacha';
import IdolManager from './components/IdolManager';
import Commu from './components/Commu';
import Shop from './components/Shop';
import EventCenter from './components/EventCenter';
import Auth from './components/Auth';
import PresentBox from './components/PresentBox';
import AnnouncementModal from './components/AnnouncementModal';
import PromoModal from './components/PromoModal';
import { useGameEngine } from './services/gameService';

const App: React.FC = () => {
  const { 
    userId, user, idols, event, presents, announcements,
    login, register, logout, 
    useItem, pullGacha, retireIdols, trainIdol, buyItem, doEventWork,
    fetchChapters, fetchDialogs, saveFanmadeStory, uploadSprite, fetchUserSprites, redeemPromoCode, claimPresent,
    error 
  } = useGameEngine();
  
  const [activeTab, setActiveTab] = useState('HOME');
  const [showPresents, setShowPresents] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

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
          <div className="p-4 text-center space-y-6 relative h-full flex flex-col">
            {/* Top Info Banner */}
            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20 mt-4 shadow-xl relative z-10">
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
            
            {/* Utility Buttons Row */}
            <div className="flex justify-center gap-6 z-20">
                <div className="relative">
                    <button 
                        onClick={() => setShowNews(true)}
                        className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 hover:scale-110 transition-transform"
                    >
                        <i className="fas fa-bullhorn text-xl text-white"></i>
                    </button>
                    {/* Badge hardcoded for demo, usually checks 'read' status */}
                    <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border border-white"></div>
                    <span className="text-[10px] font-bold mt-1 block drop-shadow-md">News</span>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setShowPresents(true)}
                        className="w-14 h-14 bg-pink-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 hover:scale-110 transition-transform"
                    >
                        <i className="fas fa-gift text-xl text-white"></i>
                    </button>
                    {presents.length > 0 && (
                        <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border border-white flex items-center justify-center">
                            {presents.length}
                        </div>
                    )}
                    <span className="text-[10px] font-bold mt-1 block drop-shadow-md">Presents</span>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setShowPromo(true)}
                        className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 hover:scale-110 transition-transform"
                    >
                        <i className="fas fa-ticket-alt text-xl text-white"></i>
                    </button>
                    <span className="text-[10px] font-bold mt-1 block drop-shadow-md">Promo</span>
                </div>
            </div>

            {/* Featured Idol (Secretary) */}
            <div className="flex-1 flex items-center justify-center pb-10">
                <div className="relative w-full aspect-[3/4] max-w-xs mx-auto rounded-xl overflow-hidden shadow-2xl border-4 border-pink-500/50 group cursor-pointer hover:border-pink-400 transition-colors">
                    <img 
                        src={idols.length > 0 ? idols[0].image : "https://picsum.photos/seed/placeholder/400/600"} 
                        alt="Secretary" 
                        className="w-full h-full object-cover transform transition duration-1000 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent pt-10 pb-4 text-center">
                        <p className="font-bold text-white text-lg drop-shadow-lg">"{idols.length > 0 ? idols[0].name : "Let's scout some idols!"}"</p>
                    </div>
                </div>
            </div>
          </div>
        );
      case 'IDOLS':
        return <IdolManager idols={idols} onRetire={retireIdols} onTrain={trainIdol} trainerTickets={user.items.trainerTicket} />;
      case 'GACHA':
        return <Gacha jewels={user.starJewels} onPull={pullGacha} />;
      case 'COMMU':
        return (
            <Commu 
                fetchChapters={fetchChapters}
                fetchDialogs={fetchDialogs}
                saveFanmadeStory={saveFanmadeStory}
                uploadSprite={uploadSprite}
                fetchUserSprites={fetchUserSprites}
            />
        );
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
    <>
        <Layout 
            user={user} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            onUseItem={useItem} 
            onLogout={logout}
            isEventActive={event?.isActive}
            onOpenPromo={() => setShowPromo(true)}
        >
            {renderContent()}
        </Layout>

        {showPresents && <PresentBox presents={presents} onClaim={claimPresent} onClose={() => setShowPresents(false)} />}
        {showNews && <AnnouncementModal announcements={announcements} onClose={() => setShowNews(false)} />}
        <PromoModal isOpen={showPromo} onClose={() => setShowPromo(false)} onRedeem={redeemPromoCode} />
    </>
  );
};

export default App;
