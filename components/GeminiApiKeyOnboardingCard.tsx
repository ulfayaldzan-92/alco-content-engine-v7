'use client';

import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, Check, Trash2, Eye, EyeOff, ShieldCheck, Settings } from 'lucide-react';
import { useGeminiApiKey } from '@/lib/client-gemini-key';

export function GeminiApiKeyOnboardingCard() {
  const { apiKey, hasCustomKey, saveKey, clearKey, isLoaded } = useGeminiApiKey();
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setInputKey(apiKey || '');
      setShowKey(false);
    }
  }, [isEditing, apiKey]);

  if (!isLoaded) return null;

  const handleSave = () => {
    const trimmed = inputKey.trim();
    if (trimmed) {
      saveKey(trimmed);
      setIsEditing(false);
    }
  };

  const handleClear = () => {
    clearKey();
    setInputKey('');
    setIsEditing(false);
  };

  if (hasCustomKey && !isEditing) {
    const maskedKey = apiKey.length > 10
      ? `${apiKey.substring(0, 6)}••••••••${apiKey.substring(apiKey.length - 4)}`
      : '••••••••';

    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Gemini API Key terhubung</h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Key Anda ({maskedKey}) aktif dan disimpan di browser ini.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Settings size={14} />
              Ganti Key
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Hapus Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Key size={24} className="text-primary" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-[#1f2933]">Aktifkan AI dengan Gemini API Key</h2>
          <p className="text-xs sm:text-sm text-[#627d98] leading-relaxed max-w-2xl">
            ALCO Content Engine memakai Gemini API Key milik Anda agar proses generate kalender, prompt, dan aset konten berjalan dengan kuota Anda sendiri. Key disimpan di browser/perangkat ini.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#f6f3ee] text-[#1f2933] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#e7e0d4]">1</div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#1f2933]">Buka Google AI Studio</p>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] text-xs font-semibold rounded-lg transition-all"
                >
                  <span>Buka AI Studio</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#f6f3ee] text-[#1f2933] font-bold text-xs flex items-center justify-center shrink-0 border border-[#e7e0d4]">2</div>
              <p className="text-sm font-semibold text-[#1f2933] mt-0.5">Create API Key</p>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#f6f3ee] text-[#1f2933] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-[#e7e0d4]">3</div>
              <p className="text-sm font-semibold text-[#1f2933] mt-0.5">Paste key di sini lalu validasi</p>
            </div>
          </div>
          
          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-800 leading-relaxed">
              <span className="font-semibold">Catatan:</span> Google AI Studio menyediakan kuota gratis terbatas. Penggunaan selanjutnya mengikuti kuota atau billing akun Google Anda.
            </p>
          </div>
        </div>

        <div className="space-y-4 bg-[#fcfaf6] p-4 sm:p-5 rounded-xl border border-[#e7e0d4]">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-[#1f2933]">
              Input Gemini API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white border border-[#e7e0d4] rounded-xl px-4 py-3 pr-12 text-sm font-mono text-[#1f2933] placeholder:text-[#627d98]/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#627d98] hover:text-[#1f2933] hover:bg-[#f6f3ee] rounded-lg transition-colors"
                title={showKey ? 'Sembunyikan Key' : 'Lihat Key'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!inputKey.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <Check size={16} />
              Validasi & Simpan Key
            </button>
            {hasCustomKey && isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setInputKey(apiKey || '');
                }}
                className="px-4 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl text-sm font-bold transition-all"
              >
                Batal
              </button>
            )}
          </div>
          
          <p className="text-[11px] text-stone-500 leading-relaxed text-center px-2">
            Jangan bagikan API key Anda. Key ini dipakai dari browser Anda untuk mengakses Gemini.
          </p>
        </div>
      </div>
    </div>
  );
}
