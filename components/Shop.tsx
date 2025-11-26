import React from 'react';
import { UserState } from '../types';

interface ShopProps {
  user: UserState;
  onBuy: (item: string, cost: number) => void;
}

const Shop: React.FC<ShopProps> = ({ user, onBuy }) => {
  return (
    <div className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 p-4 rounded-lg text-center shadow-lg mb-6">
        <h1 className="text-2xl font-bold text-white drop-shadow-md">Item Shop</h1>
        <p className="text-yellow-200 text-sm">Spend your Star Jewels here!</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between border border-gray-600">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-white">
            <i className="fas fa-flask"></i>
          </div>
          <div>
            <h3 className="font-bold">Stamina Drink</h3>
            <p className="text-xs text-gray-400">Restores 20 Stamina</p>
          </div>
        </div>
        <button 
          onClick={() => onBuy('staminaDrink', 100)}
          className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded font-bold text-sm flex flex-col items-center min-w-[80px]"
        >
          <span>Buy</span>
          <span className="text-[10px]"><i className="fas fa-star text-yellow-300"></i> 100</span>
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between border border-gray-600">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 border-white">
            <i className="fas fa-ticket-alt"></i>
          </div>
          <div>
            <h3 className="font-bold">Trainer Ticket</h3>
            <p className="text-xs text-gray-400">Used for Training Idols</p>
          </div>
        </div>
        <button 
          onClick={() => onBuy('trainerTicket', 50)}
          className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded font-bold text-sm flex flex-col items-center min-w-[80px]"
        >
          <span>Buy</span>
          <span className="text-[10px]"><i className="fas fa-star text-yellow-300"></i> 50</span>
        </button>
      </div>
    </div>
  );
};

export default Shop;