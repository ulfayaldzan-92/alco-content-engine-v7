'use client';

import React from 'react';
import { UserCheck, Sparkles, Plus, Check, User } from 'lucide-react';
import { CharacterDNA } from '@/lib/content-contract';

interface CharacterSelectorProps {
  savedCharacters: CharacterDNA[];
  selectedCharacterId: string | null;
  onSelectCharacter: (charId: string | null) => void;
  onCreateCharacter?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function CharacterSelector({
  savedCharacters,
  selectedCharacterId,
  onSelectCharacter,
  onCreateCharacter,
  className = '',
  size = 'md',
}: CharacterSelectorProps) {
  const selectedCharacter = savedCharacters.find((c) => c.character_id === selectedCharacterId) || null;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__create__') {
      if (onCreateCharacter) {
        onCreateCharacter();
      }
    } else if (val === '' || val === 'none') {
      onSelectCharacter(null);
    } else {
      onSelectCharacter(val);
    }
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <div className="flex items-center gap-1.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-2.5 py-1.5 shadow-2xs">
        <label htmlFor="character-select" className="flex items-center gap-1 text-[11px] font-bold text-stone-600 shrink-0 select-none">
          <UserCheck size={13} className={selectedCharacter ? 'text-primary' : 'text-stone-400'} />
          <span>Karakter:</span>
        </label>

        <select
          id="character-select"
          value={selectedCharacterId || ''}
          onChange={handleChange}
          className="bg-transparent text-xs font-semibold text-stone-900 border-none focus:outline-none cursor-pointer pr-1"
        >
          <option value="">No Character</option>
          {savedCharacters.length > 0 && (
            <optgroup label="Saved Characters">
              {savedCharacters.map((char) => (
                <option key={char.character_id} value={char.character_id}>
                  {char.identity?.display_name || 'Unnamed Character'}
                </option>
              ))}
            </optgroup>
          )}
          <option value="__create__">+ Buat Karakter Baru</option>
        </select>
      </div>

      {selectedCharacter && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary font-semibold animate-fadeIn">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>{selectedCharacter.identity?.display_name} Aktif</span>
          {onCreateCharacter && (
            <button
              type="button"
              onClick={onCreateCharacter}
              className="text-[10px] underline font-bold hover:text-primary/80 ml-1 cursor-pointer"
              title="Edit atau Lihat Profil Karakter"
            >
              Lihat/Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
