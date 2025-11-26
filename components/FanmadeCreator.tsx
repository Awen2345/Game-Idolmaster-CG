
import React, { useState, useEffect } from 'react';
import { DialogLine, UserSprite } from '../types';
import { useGameEngine } from '../services/gameService';

interface FanmadeCreatorProps {
  onSave: (title: string, dialogs: DialogLine[]) => Promise<boolean>;
  onCancel: () => void;
}

const FanmadeCreator: React.FC<FanmadeCreatorProps> = ({ onSave, onCancel }) => {
  const { uploadSprite, fetchUserSprites } = useGameEngine();
  
  const [mode, setMode] = useState<'EDITOR' | 'ASSETS'>('EDITOR');
  const [title, setTitle] = useState('');
  const [lines, setLines] = useState<DialogLine[]>([{ speaker: 'Producer', text: 'Hello!', expression: 'neutral' }]);
  const [saving, setSaving] = useState(false);
  
  const [userSprites, setUserSprites] = useState<UserSprite[]>([]);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
      loadAssets();
  }, []);

  const loadAssets = async () => {
      const sprites = await fetchUserSprites();
      setUserSprites(sprites);
  };

  const addLine = () => {
      setLines([...lines, { speaker: '', text: '', expression: 'neutral' }]);
  };

  const removeLine = (index: number) => {
      setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof DialogLine, value: string) => {
      const newLines = [...lines];
      const line = { ...newLines[index], [field]: value };
      
      // Auto-attach custom sprite if speaker matches an asset name
      if (field === 'speaker') {
          const matchedAsset = userSprites.find(s => s.name.toLowerCase() === value.toLowerCase());
          if (matchedAsset) {
              line.customSpriteUrl = matchedAsset.url;
          } else {
              delete line.customSpriteUrl;
          }
      }

      newLines[index] = line;
      setLines(newLines);
  };

  const handleSave = async () => {
      if (!title) return alert("Title required");
      if (lines.some(l => !l.speaker || !l.text)) return alert("All lines must have speaker and text");
      
      setSaving(true);
      const success = await onSave(title, lines);
      setSaving(false);
      if (success) {
          alert("Story Saved!");
          onCancel();
      } else {
          alert("Error saving story.");
      }
  };

  const handleUpload = async () => {
      if (!uploadName || !uploadFile) return alert("Name and File required");
      
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = reader.result as string;
          const success = await uploadSprite(uploadName, base64);
          if (success) {
              alert("Uploaded!");
              setUploadName('');
              setUploadFile(null);
              loadAssets();
          } else {
              alert("Upload failed.");
          }
      };
      reader.readAsDataURL(uploadFile);
  };

  // --- RENDER MODES ---

  const renderEditor = () => (
    <div className="flex-1 overflow-y-auto space-y-4 mb-16 p-2">
        <div className="mb-4">
            <label className="text-xs font-bold text-gray-400">Story Title</label>
            <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                placeholder="My Crossover Story"
            />
        </div>
        {lines.map((line, idx) => (
            <div key={idx} className="bg-gray-700 p-3 rounded border border-gray-600 relative animate-fade-in">
                <div className="absolute top-1 right-1">
                    <button onClick={() => removeLine(idx)} className="text-red-500 text-xs hover:bg-red-500/20 p-1 rounded"><i className="fas fa-trash"></i></button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="relative">
                        <input 
                            placeholder="Speaker (e.g. Naruto)"
                            value={line.speaker}
                            onChange={e => updateLine(idx, 'speaker', e.target.value)}
                            className="w-full bg-gray-800 rounded p-1 text-sm border border-gray-600"
                            list="sprites-list"
                        />
                        <datalist id="sprites-list">
                            {userSprites.map(s => <option key={s.id} value={s.name} />)}
                        </datalist>
                        {line.customSpriteUrl && <span className="absolute right-2 top-1 text-green-400 text-xs"><i className="fas fa-link"></i> Custom</span>}
                    </div>
                     <select 
                        value={line.expression} 
                        onChange={e => updateLine(idx, 'expression', e.target.value)}
                        className="bg-gray-800 rounded p-1 text-sm border border-gray-600"
                        disabled={!!line.customSpriteUrl} 
                    >
                        <option value="neutral">Neutral</option>
                        <option value="happy">Happy</option>
                        <option value="angry">Angry</option>
                        <option value="surprised">Surprised</option>
                    </select>
                </div>
                <textarea 
                    placeholder="Dialogue text..."
                    value={line.text}
                    onChange={e => updateLine(idx, 'text', e.target.value)}
                    className="w-full bg-gray-800 rounded p-2 text-sm border border-gray-600 h-16"
                />
            </div>
        ))}
        <button onClick={addLine} className="w-full py-2 bg-gray-600 rounded border-2 border-dashed border-gray-400 text-gray-300 hover:bg-gray-500">
            + Add Line
        </button>
    </div>
  );

  const renderAssets = () => (
      <div className="flex-1 overflow-y-auto p-4 mb-16">
          <h3 className="font-bold mb-4 text-pink-400">Custom Sprite Manager</h3>
          
          <div className="bg-gray-700 p-4 rounded mb-6 border border-gray-600">
              <h4 className="text-sm font-bold mb-2">Upload New Character</h4>
              <input 
                  className="w-full mb-2 bg-gray-900 border border-gray-600 rounded p-1 text-sm"
                  placeholder="Character Name (e.g. Goku)"
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
              />
              <input 
                  type="file"
                  accept="image/*"
                  onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-sm text-gray-400 mb-2"
              />
              <button onClick={handleUpload} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1 rounded text-sm w-full font-bold">
                  Upload Sprite
              </button>
          </div>

          <h4 className="text-sm font-bold mb-2">My Library ({userSprites.length})</h4>
          <div className="grid grid-cols-3 gap-2">
              {userSprites.map(s => (
                  <div key={s.id} className="bg-gray-800 rounded p-1 border border-gray-600 flex flex-col items-center">
                      <div className="w-full h-20 bg-gray-900 mb-1 rounded overflow-hidden">
                          <img src={s.url} className="w-full h-full object-contain" alt={s.name} />
                      </div>
                      <span className="text-[10px] truncate w-full text-center">{s.name}</span>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <div className="h-full bg-gray-800 flex flex-col relative">
        <div className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between items-center shadow-md z-10">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <i className="fas fa-pen-nib text-pink-500"></i> Studio Mode
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-white text-sm"><i className="fas fa-times"></i></button>
        </div>

        {mode === 'EDITOR' ? renderEditor() : renderAssets()}

        {/* TASKBAR MENU */}
        <div className="absolute bottom-0 left-0 right-0 h-14 bg-gray-900 border-t border-gray-700 flex items-center justify-around px-2 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
             <button 
                onClick={() => setMode('EDITOR')}
                className={`flex flex-col items-center p-2 rounded transition-colors ${mode === 'EDITOR' ? 'text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 <i className="fas fa-edit text-lg"></i>
                 <span className="text-[9px] font-bold">Script</span>
             </button>
             
             <button 
                onClick={() => setMode('ASSETS')}
                className={`flex flex-col items-center p-2 rounded transition-colors ${mode === 'ASSETS' ? 'text-pink-400' : 'text-gray-500 hover:text-gray-300'}`}
             >
                 <i className="fas fa-images text-lg"></i>
                 <span className="text-[9px] font-bold">Assets</span>
             </button>

             <div className="w-px h-8 bg-gray-700 mx-2"></div>

             <button 
                onClick={handleSave}
                disabled={saving}
                className="flex flex-col items-center p-2 text-green-500 hover:text-green-400 transition-colors"
             >
                 <i className={`fas fa-save text-lg ${saving ? 'animate-spin' : ''}`}></i>
                 <span className="text-[9px] font-bold">Save</span>
             </button>
        </div>
    </div>
  );
};

export default FanmadeCreator;