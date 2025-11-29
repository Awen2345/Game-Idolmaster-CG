
import React, { useState } from 'react';
import { EventData, UserState } from '../types';

interface EventCenterProps {
  event: EventData;
  user: UserState;
  onWork: (stamina: number) => Promise<any>;
}

const EventCenter: React.FC<EventCenterProps> = ({ event, user, onWork }) => {
  const [activeTab, setActiveTab] = useState<'MAIN' | 'REWARDS' | 'RANKING'>('MAIN');
  const [animating, setAnimating] = useState(false);
  const [lastGain, setLastGain] = useState<number | null>(null);

  const handleWork = async () => {
      if (user.stamina < 15) {
          alert("Not enough stamina! Need 15.");
          return;
      }
      setAnimating(true);
      const res = await onWork(15);
      if (res) {
          setLastGain(res.pointsGained);
          setTimeout(() => {
              setAnimating(false);
              setLastGain(null);
          }, 2000);
      } else {
          setAnimating(false);
      }
  };

  const nextReward = event.rewards.find(r => !r.claimed);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
        {/* Banner */}
        <div className="relative w-full h-32 bg-gray-800 shrink-0">
            <img src={event.banner} alt={event.name} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 flex items-end p-4">
                <div>
                    <span className="bg-pink-600 text-[10px] font-bold px-2 py-0.5 rounded text-white">EVENT ACTIVE</span>
                    <h2 className="text-xl font-black italic text-white drop-shadow-md">{event.name}</h2>
                    <p className="text-xs text-gray-300">Ends: {new Date(event.endTime).toLocaleDateString()}</p>
                </div>
            </div>
        </div>

        {/* Navigation */}
        <div className="flex bg-gray-800 border-b border-gray-700">
            {['MAIN', 'REWARDS', 'RANKING'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2 text-xs font-bold ${activeTab === tab ? 'text-pink-400 border-b-2 border-pink-400' : 'text-gray-400'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]">
            {activeTab === 'MAIN' && (
                <div className="space-y-6">
                    {/* Points Display */}
                    <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-xl p-6 text-center shadow-lg border border-white/10 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-gray-300 text-xs font-bold uppercase tracking-widest">Event Points</h3>
                            <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.8)] font-mono">
                                {event.userPoints.toLocaleString()}
                            </div>
                            {lastGain && (
                                <div className="absolute top-0 right-0 left-0 bottom-0 flex items-center justify-center animate-bounce">
                                    <span className="text-yellow-400 font-bold text-2xl drop-shadow-md">+{lastGain}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Next Reward */}
                    {nextReward ? (
                        <div className="bg-gray-800 p-4 rounded-lg border-l-4 border-yellow-500">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">Next Reward</span>
                                <span className="text-yellow-400 font-bold">{nextReward.pointThreshold.toLocaleString()} pts</span>
                            </div>
                            <div className="font-bold text-white mb-2">{nextReward.rewardName}</div>
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-yellow-500 transition-all duration-500"
                                    style={{ width: `${Math.min(100, (event.userPoints / nextReward.pointThreshold) * 100)}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-800 p-4 rounded text-center text-green-400 font-bold">
                            All Rewards Claimed!
                        </div>
                    )}

                    {/* Live Button */}
                    <div className="mt-8">
                        <button 
                            onClick={handleWork}
                            disabled={animating}
                            className={`w-full py-6 rounded-xl font-black text-xl shadow-2xl transition-all active:scale-95 group relative overflow-hidden ${
                                animating ? 'bg-gray-600' : 'bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 animate-[pulse_3s_infinite]'
                            }`}
                        >
                            <span className="relative z-10 flex flex-col items-center">
                                <i className="fas fa-music mb-1 text-2xl"></i>
                                {animating ? "PERFORMING LIVE..." : "PLAY LIVE GROOVE"}
                                <span className="text-xs font-normal opacity-80 mt-1 bg-black/30 px-2 rounded-full">-15 Stamina</span>
                            </span>
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'REWARDS' && (
                <div className="space-y-2">
                    {event.rewards.map((r, i) => (
                        <div key={i} className={`p-3 rounded border flex justify-between items-center ${r.claimed ? 'bg-gray-800 border-gray-700 opacity-60' : 'bg-gray-800 border-yellow-600'}`}>
                            <div>
                                <div className="text-xs text-blue-300 font-bold">{r.pointThreshold} pts</div>
                                <div className="font-bold">{r.rewardName}</div>
                            </div>
                            {r.claimed && <i className="fas fa-check-circle text-green-500"></i>}
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'RANKING' && (
                <div className="space-y-2">
                    {event.ranking.map((r) => (
                        <div key={r.rank} className={`p-3 rounded flex justify-between items-center ${r.name === user.name ? 'bg-pink-900/50 border border-pink-500' : 'bg-gray-800'}`}>
                            <div className="flex items-center gap-3">
                                <span className={`font-black text-lg w-8 text-center ${r.rank <= 3 ? 'text-yellow-400' : 'text-gray-500'}`}>{r.rank}</span>
                                <span className="font-bold">{r.name}</span>
                            </div>
                            <span className="font-mono text-blue-300">{r.points.toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="text-center text-xs text-gray-500 mt-4">Top 5 Players Displayed</div>
                </div>
            )}
        </div>
    </div>
  );
};

export default EventCenter;
