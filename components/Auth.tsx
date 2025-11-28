
import React, { useState } from 'react';
import { IdolType } from '../types';

interface AuthProps {
  onLogin: (u: string, p: string) => Promise<boolean>;
  onRegister: (u: string, p: string, type: IdolType) => Promise<boolean>;
}

const COVER_IMAGE = "https://mediaproxy.tvtropes.org/width/1200/https://static.tvtropes.org/pmwiki/pub/images/imcg_horiz_banner.png"; 

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedType, setSelectedType] = useState<IdolType>(IdolType.CUTE);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!username || !password) {
          setError('Please fill all fields');
          return;
      }
      
      const success = isRegister 
        ? await onRegister(username, password, selectedType)
        : await onLogin(username, password);
        
      if (!success) setError(isRegister ? "Username taken or error" : "Invalid credentials");
  };

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden bg-black font-sans z-50">
      <div 
        className="absolute inset-0 bg-cover bg-[center_top] bg-no-repeat transition-transform duration-[20s] ease-linear hover:scale-110"
        style={{ backgroundImage: `url('${COVER_IMAGE}')` }}
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30" />

      <div className="relative z-10 w-full px-6 flex flex-col items-center justify-between h-full py-12">
        
        <div className="mt-16 text-center animate-[fadeInDown_1s_ease-out]">
           <div className="inline-block relative group">
               <i className="fas fa-crown text-4xl text-yellow-400 absolute -top-8 -right-8 rotate-12 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-bounce"></i>
               <h1 className="text-5xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-pink-200 to-pink-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] tracking-tighter transform skew-x-[-5deg]"
                   style={{ WebkitTextStroke: '1px #be185d' }}>
                   CINDERELLA
               </h1>
               <h2 className="text-3xl md:text-4xl font-black text-white tracking-[0.2em] drop-shadow-lg transform skew-x-[-5deg] mt-[-5px]">
                   PRODUCERS
               </h2>
           </div>
           <div className="mt-3 flex justify-center gap-2">
                <span className="text-pink-300 text-[10px] font-bold tracking-[0.3em] uppercase border border-pink-500/50 px-2 py-0.5 rounded bg-black/30 backdrop-blur-sm">
                    Starlight Stage Web
                </span>
           </div>
        </div>

        <div className="w-full flex flex-col gap-4 animate-[fadeInUp_1s_ease-out_0.5s_both]">
            
            {!touched ? (
                <button 
                    onClick={() => setTouched(true)}
                    className="w-full py-32 flex flex-col items-center justify-center cursor-pointer group"
                >
                    <span className="text-2xl text-white font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] animate-pulse group-hover:scale-110 transition-transform">
                        TOUCH TO START
                    </span>
                    <span className="text-gray-400 text-xs mt-2 opacity-70">Tap screen to login</span>
                </button>
            ) : (
                <div className="bg-black/50 backdrop-blur-md border-t border-white/10 p-6 rounded-t-3xl rounded-b-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 animate-[slideUp_0.3s_ease-out]">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="text-center mb-6">
                            <h3 className="text-white font-bold text-xl drop-shadow-md">
                                {isRegister ? "Producer Registration" : "Producer Login"}
                            </h3>
                            <div className="h-0.5 w-16 bg-gradient-to-r from-transparent via-pink-500 to-transparent mx-auto mt-2"></div>
                        </div>

                        {isRegister && (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button type="button" onClick={() => setSelectedType(IdolType.CUTE)} className={`p-2 rounded border-2 flex flex-col items-center ${selectedType === IdolType.CUTE ? 'bg-pink-600 border-pink-300' : 'bg-gray-800 border-gray-600 opacity-50'}`}>
                                    <i className="fas fa-heart text-pink-300 text-xl mb-1"></i>
                                    <span className="text-[9px] font-bold text-white">CUTE</span>
                                </button>
                                <button type="button" onClick={() => setSelectedType(IdolType.COOL)} className={`p-2 rounded border-2 flex flex-col items-center ${selectedType === IdolType.COOL ? 'bg-blue-600 border-blue-300' : 'bg-gray-800 border-gray-600 opacity-50'}`}>
                                    <i className="fas fa-gem text-blue-300 text-xl mb-1"></i>
                                    <span className="text-[9px] font-bold text-white">COOL</span>
                                </button>
                                <button type="button" onClick={() => setSelectedType(IdolType.PASSION)} className={`p-2 rounded border-2 flex flex-col items-center ${selectedType === IdolType.PASSION ? 'bg-orange-600 border-orange-300' : 'bg-gray-800 border-gray-600 opacity-50'}`}>
                                    <i className="fas fa-sun text-yellow-300 text-xl mb-1"></i>
                                    <span className="text-[9px] font-bold text-white">PASSION</span>
                                </button>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <i className="fas fa-user absolute left-3 top-3.5 text-gray-400 text-sm"></i>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={e => setUsername(e.target.value)}
                                    className="w-full bg-black/60 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all font-bold text-sm"
                                    placeholder="Enter Producer Name"
                                />
                            </div>

                            <div className="relative">
                                <i className="fas fa-lock absolute left-3 top-3.5 text-gray-400 text-sm"></i>
                                <input 
                                    type="password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)}
                                    className="w-full bg-black/60 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all font-bold text-sm"
                                    placeholder="Enter Password"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-300 text-xs text-center bg-red-900/40 py-2 rounded border border-red-500/30 flex items-center justify-center gap-2">
                                <i className="fas fa-exclamation-circle"></i> {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black py-3.5 rounded-lg shadow-[0_0_20px_rgba(236,72,153,0.4)] transform active:scale-95 transition-all uppercase tracking-wider text-sm flex items-center justify-center gap-2 group"
                        >
                            <span>{isRegister ? "Join Production" : "Login"}</span>
                            <i className="fas fa-chevron-right group-hover:translate-x-1 transition-transform"></i>
                        </button>
                    </form>
                    
                    <div className="mt-6 text-center border-t border-gray-700/50 pt-4">
                         <button 
                            type="button"
                            onClick={() => { setError(''); setIsRegister(!isRegister); }}
                            className="text-gray-300 text-xs hover:text-white transition-colors"
                         >
                            {isRegister ? (
                                <span>Already a Producer? <span className="text-pink-400 font-bold underline decoration-pink-500 underline-offset-2">Login</span></span>
                            ) : (
                                <span>New to production? <span className="text-pink-400 font-bold underline decoration-pink-500 underline-offset-2">Create ID</span></span>
                            )}
                         </button>
                    </div>
                </div>
            )}
        </div>
        <div className="text-[9px] text-gray-500/80 mb-2 flex flex-col items-center">
            <span>© BANDAI NAMCO Entertainment Inc. (Fanmade Web Ver.)</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
