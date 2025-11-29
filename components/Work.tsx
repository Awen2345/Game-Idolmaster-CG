
import React, { useState, useEffect } from 'react';
import { WorkResult, UserState, WorkRegion, WorkJob, IdolType, Idol } from '../types';
import { useGameEngine } from '../services/gameService';

interface WorkProps {
    user: UserState;
    onWork: (jobId: number) => Promise<WorkResult | null>;
}

const Work: React.FC<WorkProps> = ({ user, onWork }) => {
    const { fetchWorkRegions, fetchWorkJobs, fetchDeck, idols } = useGameEngine();
    
    // States for Navigation
    const [phase, setPhase] = useState<'MAP' | 'JOBS' | 'CONFIRM' | 'RESULT'>('MAP');
    
    // Data
    const [regions, setRegions] = useState<WorkRegion[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<WorkRegion | null>(null);
    const [jobs, setJobs] = useState<WorkJob[]>([]);
    const [selectedJob, setSelectedJob] = useState<WorkJob | null>(null);
    
    // Work Execution
    const [animating, setAnimating] = useState(false);
    const [lastResult, setLastResult] = useState<WorkResult | null>(null);
    
    // Deck Data for Confirmation
    const [deckIdols, setDeckIdols] = useState<Idol[]>([]);

    useEffect(() => {
        fetchWorkRegions().then(setRegions);
        loadDeck();
    }, [idols]); // Reload deck if idols change

    const loadDeck = async () => {
        const deckIds = await fetchDeck();
        const hydrated = deckIds.map(id => idols.find(i => i.id === id)).filter((i): i is Idol => !!i);
        setDeckIdols(hydrated);
    };

    const handleSelectRegion = async (region: WorkRegion) => {
        setSelectedRegion(region);
        const data = await fetchWorkJobs(region.id);
        setJobs(data);
        setPhase('JOBS');
    };

    const handleSelectJob = (job: WorkJob) => {
        setSelectedJob(job);
        setPhase('CONFIRM');
    };

    const executeWork = async () => {
        if (!selectedJob) return;
        if (user.stamina < selectedJob.stamina_cost) {
            alert("Not enough stamina! Use an item or wait.");
            return;
        }

        setAnimating(true);
        const res = await onWork(selectedJob.id);
        
        if (res) {
            setLastResult(res);
            setTimeout(() => {
                setAnimating(false);
                setPhase('RESULT');
            }, 1500); // Animation delay
        } else {
            setAnimating(false);
        }
    };

    const handleBack = () => {
        if (phase === 'JOBS') setPhase('MAP');
        if (phase === 'CONFIRM') setPhase('JOBS');
        if (phase === 'RESULT') {
            setPhase('JOBS');
            setLastResult(null);
        }
    };

    // Calculate Meter Fills based on Deck Attributes
    const getAttributeCounts = () => {
        let cute = 0, cool = 0, passion = 0;
        deckIdols.forEach(i => {
            if (i.type === IdolType.CUTE) cute++;
            if (i.type === IdolType.COOL) cool++;
            if (i.type === IdolType.PASSION) passion++;
        });
        // Normalize to a percentage (Max 4 idols)
        return {
            unique: Math.min(100, (cute / 4) * 100),   // CUTE = Unique
            smart: Math.min(100, (cool / 4) * 100),    // COOL = Smart
            active: Math.min(100, (passion / 4) * 100) // PASSION = Active
        };
    };

    const stats = getAttributeCounts();

    // --- RENDERERS ---

    const renderMap = () => (
        <div className="h-full flex flex-col bg-gray-100 relative overflow-hidden">
            {/* Header */}
            <div className="bg-yellow-500 p-2 flex items-center justify-between shadow-md z-10 border-b-2 border-yellow-600">
                <button className="bg-yellow-700 text-white px-3 py-1 rounded text-xs font-bold shadow"><i className="fas fa-arrow-left"></i></button>
                <h2 className="text-white font-black text-lg drop-shadow-md">AREA SELECT</h2>
                <div className="w-8"></div>
            </div>

            <div className="flex-1 relative bg-blue-50 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                
                {/* Simulated Japan Map Layout */}
                <div className="relative w-full h-full max-w-sm mx-auto mt-4">
                    {/* Region 2: North East (Purple) */}
                    <button 
                        onClick={() => regions[1] && handleSelectRegion(regions[1])}
                        className="absolute top-[5%] right-[10%] w-32 h-24 bg-purple-400/90 rounded-tl-[40px] rounded-br-[20px] shadow-lg border-2 border-white flex flex-col items-center justify-center hover:scale-105 transition-transform"
                    >
                        <span className="text-white font-black text-sm drop-shadow-md">North East</span>
                        <div className="bg-white/30 px-2 rounded-full text-[10px] text-white font-bold mt-1">3 Jobs</div>
                    </button>

                    {/* Region 1: Capital (Green) */}
                    <button 
                        onClick={() => regions[0] && handleSelectRegion(regions[0])}
                        className="absolute top-[30%] left-[30%] w-40 h-20 bg-green-400/90 rounded-2xl shadow-lg border-2 border-white flex flex-col items-center justify-center hover:scale-105 transition-transform z-10"
                    >
                        <span className="text-white font-black text-sm drop-shadow-md">Capital Area</span>
                        <div className="bg-white/30 px-2 rounded-full text-[10px] text-white font-bold mt-1">4 Jobs</div>
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[8px] font-bold px-1 rounded animate-bounce">NEW</div>
                    </button>

                    {/* Region 3: West (Yellow) */}
                    <button 
                        onClick={() => regions[2] && handleSelectRegion(regions[2])}
                        className="absolute top-[45%] left-[10%] w-32 h-24 bg-yellow-400/90 rounded-bl-[40px] shadow-lg border-2 border-white flex flex-col items-center justify-center hover:scale-105 transition-transform"
                    >
                        <span className="text-white font-black text-sm drop-shadow-md">West Area</span>
                        <div className="bg-white/30 px-2 rounded-full text-[10px] text-white font-bold mt-1">3 Jobs</div>
                    </button>

                    {/* Region 4: South (Orange) */}
                    <button 
                        onClick={() => regions[3] && handleSelectRegion(regions[3])}
                        className="absolute bottom-[10%] left-[5%] w-24 h-24 bg-orange-400/90 rounded-full shadow-lg border-2 border-white flex flex-col items-center justify-center hover:scale-105 transition-transform"
                    >
                        <span className="text-white font-black text-sm drop-shadow-md">South Area</span>
                        <div className="bg-white/30 px-2 rounded-full text-[10px] text-white font-bold mt-1">2 Jobs</div>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderJobs = () => (
        <div className="h-full flex flex-col bg-gray-100">
            {/* Header */}
            <div className="bg-yellow-500 p-2 flex items-center shadow-md z-10 border-b-2 border-yellow-600">
                <button onClick={handleBack} className="bg-yellow-700 text-white px-3 py-1 rounded text-xs font-bold shadow mr-4">
                    <i className="fas fa-arrow-left"></i>
                </button>
                <div className="text-white">
                    <div className="text-[10px] opacity-80 font-bold">AREA SELECT</div>
                    <h2 className="font-black text-sm drop-shadow-md">{selectedRegion?.name}</h2>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden flex flex-col">
                        {/* Job Card Top */}
                        <div className="p-2 flex gap-3 border-b border-gray-100">
                            {/* Icon/Thumbnail */}
                            <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center shrink-0 border border-gray-300 relative overflow-hidden">
                                {job.type === IdolType.CUTE && <div className="absolute inset-0 bg-pink-100 opacity-50"></div>}
                                {job.type === IdolType.COOL && <div className="absolute inset-0 bg-blue-100 opacity-50"></div>}
                                {job.type === IdolType.PASSION && <div className="absolute inset-0 bg-yellow-100 opacity-50"></div>}
                                <i className={`fas fa-building text-3xl opacity-50 ${
                                    job.type === IdolType.CUTE ? 'text-pink-400' : 
                                    job.type === IdolType.COOL ? 'text-blue-400' : 'text-yellow-400'
                                }`}></i>
                            </div>

                            {/* Info */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{job.title}</h4>
                                    
                                    {/* Type Badges */}
                                    <div className="flex gap-1 mt-1">
                                        {job.type === IdolType.CUTE && <Badge label="Unique" color="bg-pink-500" />}
                                        {job.type === IdolType.COOL && <Badge label="Smart" color="bg-blue-500" />}
                                        {job.type === IdolType.PASSION && <Badge label="Active" color="bg-yellow-500" />}
                                        {job.type === 'ALL' && (
                                            <>
                                                <Badge label="Unique" color="bg-pink-500" />
                                                <Badge label="Smart" color="bg-blue-500" />
                                                <Badge label="Active" color="bg-yellow-500" />
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                        <i className="far fa-clock mr-1"></i>{job.duration_text || '10h'}
                                    </div>
                                    <div className="text-yellow-400 text-xs">
                                        {[...Array(5)].map((_, i) => (
                                            <i key={i} className={`fas fa-star ${i < job.difficulty ? '' : 'text-gray-200'}`}></i>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Job Card Bottom */}
                        <div className="bg-gray-50 p-2 flex justify-between items-center">
                            <div className="flex gap-2">
                                <RewardIcon icon="coins" color="text-yellow-500" />
                                <RewardIcon icon="star" color="text-pink-500" />
                                <RewardIcon icon="gift" color="text-green-500" />
                            </div>
                            <button 
                                onClick={() => handleSelectJob(job)}
                                className="bg-gradient-to-b from-pink-500 to-pink-600 text-white font-bold px-6 py-1.5 rounded shadow border-b-2 border-pink-700 active:translate-y-0.5 active:border-b-0 text-xs"
                            >
                                Select
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderConfirm = () => (
        <div className="h-full flex flex-col bg-black/80 text-white relative">
            <div className="absolute inset-0 bg-white opacity-90"></div>
            
            <div className="relative z-10 flex-1 flex flex-col p-4 items-center justify-center">
                
                {/* Confirmation Box */}
                <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl border border-gray-300 overflow-hidden">
                    <div className="bg-gray-100 p-2 border-b border-gray-300 flex items-center gap-2">
                        <i className="fas fa-tasks text-gray-500"></i>
                        <span className="font-bold text-gray-700 text-sm">Business Start Confirmation</span>
                    </div>

                    <div className="p-4">
                        {/* Job Title */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded font-bold">Regular</span>
                            <span className="font-bold text-gray-800 text-sm">{selectedJob?.title}</span>
                        </div>

                        {/* Idol Platforms */}
                        <div className="flex justify-center gap-2 mb-4 h-24 items-end bg-gray-50 rounded border border-gray-200 p-2 relative">
                            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center z-10">
                                    {deckIdols[i] ? (
                                        <img src={deckIdols[i].image} className="w-12 h-12 object-cover rounded-full border-2 border-white shadow-md mb-1" />
                                    ) : (
                                        <div className="w-12 h-12 bg-gray-300 rounded-full border-2 border-white shadow-md mb-1 flex items-center justify-center text-gray-400"><i className="fas fa-user"></i></div>
                                    )}
                                    <div className="w-16 h-3 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full shadow-lg"></div>
                                    <div className="text-[8px] text-gray-500 mt-1">{deckIdols[i] ? "Ready" : "Empty"}</div>
                                </div>
                            ))}
                        </div>

                        {/* Attribute Meters */}
                        <div className="space-y-2 mb-4">
                            <AttributeMeter label="Unique" color="bg-pink-500" value={stats.unique} target={selectedJob?.type === IdolType.CUTE || selectedJob?.type === 'ALL'} />
                            <AttributeMeter label="Smart" color="bg-blue-500" value={stats.smart} target={selectedJob?.type === IdolType.COOL || selectedJob?.type === 'ALL'} />
                            <AttributeMeter label="Active" color="bg-yellow-500" value={stats.active} target={selectedJob?.type === IdolType.PASSION || selectedJob?.type === 'ALL'} />
                        </div>

                        {/* Costs */}
                        <div className="flex justify-between items-center text-xs text-gray-600 bg-gray-100 p-2 rounded mb-4">
                            <span>Required Time: <strong>{selectedJob?.duration_text || '10h'}</strong></span>
                            <span>Stamina: <strong className="text-red-500">-{selectedJob?.stamina_cost}</strong></span>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2">
                            <button onClick={handleBack} className="flex-1 bg-white border border-gray-400 text-gray-700 py-2 rounded shadow font-bold text-sm">Cancel</button>
                            <button 
                                onClick={executeWork}
                                className="flex-[2] bg-gradient-to-b from-pink-500 to-pink-600 text-white py-2 rounded shadow font-bold text-sm border-b-4 border-pink-700 active:border-b-0 active:translate-y-1"
                            >
                                Start Business
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderResult = () => (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center animate-fade-in p-6" onClick={handleBack}>
            <div className="text-center animate-bounce mb-8">
                {lastResult?.isGreatSuccess ? (
                    <h2 className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-500 to-purple-500 drop-shadow-[0_0_25px_rgba(236,72,153,0.8)]">GREAT SUCCESS!</h2>
                ) : (
                    <h2 className="text-4xl font-black text-white drop-shadow-md">JOB COMPLETE</h2>
                )}
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-sm mb-8">
                <ResultCard label="Money" value={lastResult?.moneyGained} icon="coins" color="text-yellow-400" />
                <ResultCard label="Exp" value={lastResult?.expGained} icon="level-up-alt" color="text-green-400" />
                <ResultCard label="Fans" value={lastResult?.affectionGained} icon="heart" color="text-pink-400" />
            </div>

            {lastResult?.drops && (
                <div className="bg-white/10 p-4 rounded-xl border border-white/20 animate-pulse mb-8 flex items-center gap-3">
                    <i className="fas fa-gift text-3xl text-blue-300"></i>
                    <div>
                        <div className="text-[10px] text-blue-200 font-bold uppercase">Bonus Drop</div>
                        <div className="font-bold text-white">{lastResult.drops.name} x{lastResult.drops.count || 1}</div>
                    </div>
                </div>
            )}

            <div className="text-gray-500 text-xs animate-pulse">Tap screen to continue</div>
        </div>
    );

    // --- SUB-COMPONENTS ---

    const Badge = ({ label, color }: any) => (
        <span className={`${color} text-white text-[8px] font-bold px-1.5 py-0.5 rounded border border-white/20`}>
            {label}
        </span>
    );

    const RewardIcon = ({ icon, color }: any) => (
        <div className={`w-6 h-6 bg-gray-100 rounded border border-gray-300 flex items-center justify-center ${color} text-xs`}>
            <i className={`fas fa-${icon}`}></i>
        </div>
    );

    const AttributeMeter = ({ label, color, value, target }: any) => (
        <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold w-10 text-white px-1 rounded text-center ${color}`}>{label}</span>
            <div className="flex-1 h-3 bg-gray-300 rounded-full overflow-hidden relative border border-gray-400 shadow-inner">
                <div 
                    className={`h-full ${color} transition-all duration-500`} 
                    style={{ width: `${value}%` }}
                ></div>
                {target && (
                    <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-black/50 z-10">
                        <i className="fas fa-star text-[8px] text-yellow-500 absolute -top-1 -left-1"></i>
                    </div>
                )}
            </div>
        </div>
    );

    const ResultCard = ({ label, value, icon, color }: any) => (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 text-center shadow-lg">
            <div className={`text-2xl mb-1 ${color}`}><i className={`fas fa-${icon}`}></i></div>
            <div className="text-xs text-gray-400 font-bold uppercase">{label}</div>
            <div className="text-lg font-black text-white">+{value}</div>
        </div>
    );

    // --- MAIN ---
    if (phase === 'MAP') return renderMap();
    if (phase === 'JOBS') return renderJobs();
    if (phase === 'CONFIRM') return renderConfirm();
    if (phase === 'RESULT') return renderResult();
    
    return <div>Error</div>;
};

export default Work;
