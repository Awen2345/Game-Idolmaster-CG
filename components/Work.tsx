
import React, { useState, useEffect } from 'react';
import { WorkResult, UserState, WorkRegion, WorkJob, IdolType } from '../types';
import { useGameEngine } from '../services/gameService';

interface WorkProps {
    user: UserState;
    onWork: (jobId: number) => Promise<WorkResult | null>;
}

const Work: React.FC<WorkProps> = ({ user, onWork }) => {
    const { fetchWorkRegions, fetchWorkJobs, fetchDeck } = useGameEngine();
    
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
    const [userDeck, setUserDeck] = useState<string[]>([]); // To show who is working

    useEffect(() => {
        fetchWorkRegions().then(setRegions);
        fetchDeck().then(setUserDeck);
    }, []);

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

    // --- RENDERERS ---

    const renderMap = () => (
        <div className="h-full flex flex-col bg-blue-100 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            
            <div className="p-4 bg-white/90 border-b-2 border-blue-300 z-10 shadow-sm">
                <h2 className="text-xl font-black text-blue-600 flex items-center gap-2">
                    <i className="fas fa-map-marked-alt"></i> AREA SELECTION
                </h2>
                <p className="text-xs text-gray-500">Select a region to find work offers.</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 items-center justify-center">
                {/* CSS Map Visual */}
                <div className="relative w-full max-w-sm h-96 bg-blue-200/50 rounded-3xl border-4 border-white shadow-xl overflow-hidden p-4">
                    {/* Japan-ish Shape (Abstract) */}
                    <div className="grid grid-cols-2 gap-4 h-full">
                        {regions.map(region => (
                            <button 
                                key={region.id}
                                onClick={() => handleSelectRegion(region)}
                                className="relative bg-white hover:bg-yellow-50 rounded-xl border-2 border-blue-200 shadow-md flex flex-col items-center justify-center p-2 group transition-all hover:scale-105 active:scale-95"
                            >
                                <div className="text-3xl mb-1 text-blue-400 group-hover:text-pink-500 transition-colors">
                                    <i className="fas fa-map-pin"></i>
                                </div>
                                <div className="font-bold text-gray-700 text-sm">{region.name}</div>
                                <div className="text-[9px] text-gray-400">{region.description}</div>
                                
                                {/* Notification Badge (Fake for now) */}
                                <div className="absolute top-2 right-2 bg-red-500 text-white text-[8px] font-bold px-1 rounded animate-pulse">NEW</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderJobs = () => (
        <div className="h-full flex flex-col bg-gray-100">
            <div className="p-3 bg-gray-800 text-white flex items-center justify-between shadow-md z-10">
                <button onClick={handleBack} className="bg-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-600">Back</button>
                <h3 className="font-bold">{selectedRegion?.name} Jobs</h3>
                <div className="w-12"></div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {jobs.map(job => (
                    <div key={job.id} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                        {/* Job Header */}
                        <div className="bg-gray-50 p-2 border-b border-gray-200 flex justify-between items-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                                job.type === IdolType.CUTE ? 'bg-pink-500' : 
                                job.type === IdolType.COOL ? 'bg-blue-500' : 
                                job.type === IdolType.PASSION ? 'bg-yellow-500' : 'bg-purple-500'
                            }`}>
                                {job.type === 'ALL' ? 'ANY TYPE' : job.type}
                            </span>
                            <div className="flex text-yellow-400 text-xs">
                                {[...Array(5)].map((_, i) => (
                                    <i key={i} className={`fas fa-star ${i < job.difficulty ? '' : 'text-gray-300'}`}></i>
                                ))}
                            </div>
                        </div>

                        {/* Job Body */}
                        <div className="p-3 flex items-center gap-3">
                            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center text-blue-400 text-2xl border-2 border-blue-200">
                                {job.type === IdolType.CUTE ? <i className="fas fa-microphone"></i> : 
                                 job.type === IdolType.COOL ? <i className="fas fa-camera"></i> : 
                                 <i className="fas fa-tv"></i>}
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800 text-sm leading-tight mb-1">{job.title}</h4>
                                <div className="flex gap-2 text-xs text-gray-500">
                                    <span className="flex items-center gap-1"><i className="fas fa-clock"></i> 10h</span>
                                    <span className="flex items-center gap-1"><i className="fas fa-bolt text-yellow-500"></i> -{job.stamina_cost} Stamina</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleSelectJob(job)}
                                className="bg-pink-600 text-white font-bold px-4 py-2 rounded shadow hover:bg-pink-500 active:scale-95 transition-transform text-xs"
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
        <div className="h-full flex flex-col bg-gray-900 text-white relative">
            <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/office/800/600')] bg-cover opacity-20"></div>
            
            <div className="relative z-10 flex-1 flex flex-col p-6 items-center justify-center">
                <div className="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 shadow-2xl">
                    <h3 className="text-xl font-black text-center mb-6 border-b border-white/10 pb-2">CONFIRM WORK</h3>
                    
                    <div className="bg-black/40 rounded p-4 mb-4 text-center">
                        <div className="text-yellow-400 font-bold text-lg mb-1">{selectedJob?.title}</div>
                        <div className="text-xs text-gray-300">Target: {selectedJob?.type === 'ALL' ? 'Any Type' : selectedJob?.type} Idols</div>
                    </div>

                    <div className="flex justify-between items-center mb-6 px-4">
                        <div className="text-center">
                            <div className="text-xs text-gray-400">Cost</div>
                            <div className="text-xl font-bold text-red-400">-{selectedJob?.stamina_cost} <i className="fas fa-bolt"></i></div>
                        </div>
                        <div className="text-3xl text-gray-500"><i className="fas fa-arrow-right"></i></div>
                        <div className="text-center">
                            <div className="text-xs text-gray-400">Exp</div>
                            <div className="text-xl font-bold text-green-400">High</div>
                        </div>
                    </div>

                    {/* Unit Preview (Simple placeholder for slots) */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                        {userDeck.map((id, i) => (
                            <div key={i} className="aspect-square bg-gray-800 rounded border border-gray-600 flex items-center justify-center">
                                {id ? <i className="fas fa-user text-pink-400"></i> : <span className="text-xs text-gray-600">Empty</span>}
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={executeWork}
                        disabled={animating}
                        className={`w-full py-4 rounded-full font-black text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                            animating ? 'bg-gray-600' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:brightness-110'
                        }`}
                    >
                        {animating ? <><i className="fas fa-spinner animate-spin"></i> Working...</> : "START BUSINESS"}
                    </button>
                    <button onClick={handleBack} disabled={animating} className="mt-3 text-sm text-gray-400 hover:text-white w-full">Cancel</button>
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
