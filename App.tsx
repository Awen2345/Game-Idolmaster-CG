
import React, { useState, useEffect } from 'react';
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
import LiveBattle from './components/LiveBattle';
import Work from './components/Work'; // New Work Component
import LoginBonus from './components/LoginBonus'; // New
import { useGameEngine } from './services/gameService';
import { LoginBonusResult } from './types';

const App: React.FC = () => {
  const { 
    userId, user, idols, event, presents, announcements,
    login, register, logout, 
    useItem, pullGacha, retireIdols, trainIdol, specialTraining, starLesson, buyItem, doEventWork, doNormalWork,
    fetchChapters, fetchDialogs, markChapterRead, saveFanmadeStory, uploadSprite, fetchUserSprites, redeemPromoCode, claimPresent,
    fetchDeck, saveDeck, findOpponent, completeBattle, checkLoginBonus,
    error 
  } = useGameEngine();
  
  const [activeTab, setActiveTab] = useState('HOME');
  const [showPresents, setShowPresents] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [showBattle, setShowBattle] = useState(false);
  const [loginBonus, setLoginBonus] = useState<LoginBonusResult | null>(null);
  const [userDeckIds, setUserDeckIds] = useState<string[]>([]);

  useEffect(() => {
      if(showBattle && userId) {
          fetchDeck().then(ids => {
             setUserDeckIds(ids || []);
          });
      }
      // Initial fetch for Deck IDs to pass to IdolManager
      if (userId && userDeckIds.length === 0) {
          fetchDeck().then(ids => setUserDeckIds(ids || []));
      }
  }, [showBattle, userId, fetchDeck]);

  // Check Login Bonus on Load
  useEffect(() => {
      if (userId) {
          checkLoginBonus().then(bonus => {
              if (bonus) setLoginBonus(bonus);
          });
      }
  }, [userId]);

  const handleBuy = (item: string, cost: number) => {
      buyItem(item, cost);
  };

  const handleOpenBattle = () => {
      setShowBattle(true);
  };

  const handleSaveDeck = async (ids: string[]): Promise<boolean> => {
      const success = await saveDeck(ids);
      if (success) {
          setUserDeckIds(ids);
          return true;
      }
      return false;
  };

  const renderContent = () => {
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <i className="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
                <p className="text-gray-300 text-sm mb-4">{error}</p>
            </div>
        );
    }

    switch (activeTab) {
      case 'HOME':
        return (
          <div className="p-4 text-center space-y-6 relative h-full flex flex-col">
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
            
            <div className="flex justify-center gap-6 z-20">
                <div className="relative">
                    <button onClick={() => setShowNews(true)} className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 hover:scale-110 transition-transform"><i className="fas fa-bullhorn text-xl text-white"></i></button>
                    <span className="text-[10px] font-bold mt-1 block drop-shadow-md">News</span>
                </div>
                <div className="relative">
                    <button onClick={() => setShowPresents(true)} className="w-14 h-14 bg-pink-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 hover:scale-110 transition-transform"><i className="fas fa-gift text-xl text-white"></i></button>
                    {presents.length > 0 && (
                        <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full border border-white flex items-center justify-center">{presents.length}</div>
                    )}
                    <span className="text-[10px] font-bold mt-1 block drop-shadow-md">Presents</span>
                </div>
                <div className="relative">
                    <button onClick={() => setShowPromo(true)} className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 hover:scale-110 transition-transform"><i className="fas fa-ticket-alt text-xl text-white"></i></button>
                    <span className="text-[10px] font-bold mt-1 block drop-shadow-md">Promo</span>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center pb-10">
                <div className="relative w-full aspect-[3/4] max-w-xs mx-auto rounded-xl overflow-hidden shadow-2xl border-4 border-pink-500/50 group cursor-pointer hover:border-pink-400 transition-colors">
                    <img src={idols.length > 0 ? idols[0].image : "https://picsum.photos/seed/placeholder/400/600"} alt="Secretary" className="w-full h-full object-cover transform transition duration-1000 group-hover:scale-105" />
                    <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/80 to-transparent pt-10 pb-4 text-center">
                        <p className="font-bold text-white text-lg drop-shadow-lg">"{idols.length > 0 ? idols[0].name : "Let's scout some idols!"}"</p>
                    </div>
                </div>
            </div>
          </div>
        );
      case 'WORK':
        return <Work user={user} onWork={doNormalWork} />;
      case 'IDOLS':
        return <IdolManager 
            idols={idols} 
            onRetire={retireIdols} 
            onTrain={trainIdol} 
            onSpecialTraining={specialTraining}
            onStarLesson={starLesson}
            trainerTickets={user.items.trainerTicket} 
            userDeckIds={userDeckIds}
            onSaveDeck={handleSaveDeck}
        />;
      case 'GACHA':
        return <Gacha jewels={user.starJewels} onPull={pullGacha} />;
      case 'COMMU':
        return <Commu fetchChapters={fetchChapters} fetchDialogs={fetchDialogs} markChapterRead={markChapterRead} saveFanmadeStory={saveFanmadeStory} uploadSprite={uploadSprite} fetchUserSprites={fetchUserSprites} />;
      case 'SHOP':
        return <Shop user={user} onBuy={handleBuy} />;
      case 'EVENT':
        return event && event.isActive ? <EventCenter event={event} user={user} onWork={doEventWork} /> : <div>No Active Event</div>;
      default:
        return <div>Select a tab</div>;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen relative overflow-hidden bg-black shadow-2xl border-x border-gray-800 font-sans">
        {!userId ? (
            <Auth onLogin={login} onRegister={register} />
        ) : (
            <>
                <Layout 
                    user={user} 
                    activeTab={activeTab} 
                    onTabChange={setActiveTab} 
                    onUseItem={useItem} 
                    onLogout={logout}
                    isEventActive={event?.isActive}
                    onOpenPromo={() => setShowPromo(true)}
                    onOpenBattle={handleOpenBattle}
                >
                    {renderContent()}
                </Layout>

                {showPresents && <PresentBox presents={presents} onClaim={claimPresent} onClose={() => setShowPresents(false)} />}
                {showNews && <AnnouncementModal announcements={announcements} onClose={() => setShowNews(false)} />}
                <PromoModal isOpen={showPromo} onClose={() => setShowPromo(false)} onRedeem={redeemPromoCode} />
                
                {loginBonus && <LoginBonus result={loginBonus} onClose={() => setLoginBonus(null)} />}

                {showBattle && (
                    <LiveBattle 
                        userId={userId} 
                        userDeckIds={userDeckIds}
                        allIdols={idols}
                        onFindOpponent={findOpponent}
                        onCompleteBattle={completeBattle}
                        onSaveDeck={handleSaveDeck}
                        onClose={() => setShowBattle(false)}
                    />
                )}
            </>
        )}
    </div>
  );
};

export default App;
