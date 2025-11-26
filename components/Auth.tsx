import React, { useState } from 'react';

interface AuthProps {
  onLogin: (u: string, p: string) => Promise<boolean>;
  onRegister: (u: string, p: string) => Promise<boolean>;
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!username || !password) {
          setError('Please fill all fields');
          return;
      }
      
      const success = isRegister 
        ? await onRegister(username, password)
        : await onLogin(username, password);
        
      if (!success) setError(isRegister ? "Username taken or error" : "Invalid credentials");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-6 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
      <div className="mb-8 text-center animate-bounce">
          <i className="fas fa-star text-6xl text-pink-500 shadow-pink-500 drop-shadow-lg"></i>
          <h1 className="text-3xl font-black italic mt-4 bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">
              Cinderella Producers
          </h1>
          <p className="text-sm text-gray-400">Starlight Stage Web</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
        <h2 className="text-xl font-bold mb-6 text-center">{isRegister ? "Producer Registration" : "Producer Login"}</h2>
        
        <div className="mb-4">
            <label className="block text-xs font-bold text-gray-400 mb-1">PRODUCER NAME</label>
            <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-pink-500 outline-none transition-colors"
                placeholder="Enter ID..."
            />
        </div>

        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-400 mb-1">PASSWORD</label>
            <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:border-pink-500 outline-none transition-colors"
                placeholder="******"
            />
        </div>

        {error && <p className="text-red-400 text-xs mb-4 text-center">{error}</p>}

        <button type="submit" className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-full transition-transform active:scale-95 shadow-lg shadow-pink-600/30">
            {isRegister ? "REGISTER" : "LOGIN"}
        </button>

        <p className="mt-4 text-center text-xs text-gray-400 cursor-pointer hover:text-white" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? "Already have an account? Login" : "New Producer? Register here"}
        </p>
      </form>
    </div>
  );
};

export default Auth;
