'use client';

import React, { useState, useEffect } from 'react';
import { Key, Check, Trash2, Eye, EyeOff, ShieldCheck, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGeminiApiKey } from '@/lib/client-gemini-key';

interface GeminiApiKeyControlProps {
  variant?: 'badge' | 'button' | 'compact';
  onToast?: (message: string) => void;
}

export function GeminiApiKeyControl({ variant = 'badge', onToast }: GeminiApiKeyControlProps) {
  const { apiKey, hasCustomKey, saveKey, clearKey } = useGeminiApiKey();
  const [isOpen, setIsOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputKey(apiKey || '');
      setShowKey(false);
    }
  }, [isOpen, apiKey]);

  const handleSave = () => {
    const trimmed = inputKey.trim();
    if (!trimmed) {
      clearKey();
      if (onToast) onToast('Gemini API Key pribadi dihapus. Kembali menggunakan default server.');
    } else {
      saveKey(trimmed);
      if (onToast) onToast('Gemini API Key pribadi berhasil disimpan ke browser!');
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    clearKey();
    setInputKey('');
    if (onToast) onToast('Gemini API Key pribadi dihapus.');
    setIsOpen(false);
  };

  const maskedKey = apiKey
    ? apiKey.length > 10
      ? `${apiKey.substring(0, 6)}••••••••${apiKey.substring(apiKey.length - 4)}`
      : '••••••••'
    : '';

  return (
    <>
      {/* Trigger Button */}
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Pengaturan Gemini API Key"
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
            hasCustomKey
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
              : 'bg-white border-[#e7e0d4] text-[#1f2933] hover:bg-[#f6f3ee]'
          }`}
          title="Pengaturan Gemini API Key Pribadi"
        >
          <Key size={13} className={hasCustomKey ? 'text-primary' : 'text-[#627d98]'} />
          <span className="hidden sm:inline">
            {hasCustomKey ? 'Custom API Key' : 'Gemini Key'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              hasCustomKey ? 'bg-primary' : 'bg-[#e7e0d4]'
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Pengaturan Gemini API Key"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
            hasCustomKey
              ? 'bg-primary/10 border-primary/30 text-primary hover:bg-primary/15'
              : 'bg-white border-[#e7e0d4] text-[#1f2933] hover:bg-[#f6f3ee]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Key size={13} className={hasCustomKey ? 'text-primary' : 'text-[#627d98]'} />
            <span className="font-medium">
              {hasCustomKey ? 'API Key Pribadi' : 'Set Gemini Key'}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              hasCustomKey ? 'bg-primary' : 'bg-amber-400'
            }`}
            title={hasCustomKey ? 'API Key Pribadi Aktif' : 'Default / Belum Diisi'}
          />
        </button>
      )}

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl p-6 shadow-xl z-10 space-y-5 text-[#1f2933]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#e7e0d4]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1f2933] tracking-tight">Gemini API Key Pribadi</h3>
                    <p className="text-xs text-[#627d98]">Pola terhubung seperti ALCO Creative System</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup Dialog Pengaturan Gemini API Key"
                  className="text-[#627d98] hover:text-[#1f2933] p-1.5 rounded-lg hover:bg-[#f6f3ee] transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  hasCustomKey
                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-900'
                    : 'bg-[#f6f3ee] border-[#e7e0d4] text-[#627d98]'
                }`}
              >
                <ShieldCheck size={18} className={hasCustomKey ? 'text-cyan-700 mt-0.5 shrink-0' : 'text-[#627d98] mt-0.5 shrink-0'} />
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-[#1f2933]">
                    {hasCustomKey ? 'API Key Pribadi Tersimpan' : 'Menggunakan Konfigurasi Standar / Server'}
                  </p>
                  <p className="text-xs leading-relaxed text-[#627d98]">
                    {hasCustomKey
                      ? `Key Anda (${maskedKey}) tersimpan secara lokal di browser dan otomatis dikirimkan via header 'x-gemini-api-key'.`
                      : 'Masukkan Gemini API Key pribadi Anda untuk menghindari kuota bersama atau rate limit.'}
                  </p>
                </div>
              </div>

              {/* Form Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1f2933]">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-white border border-[#e7e0d4] rounded-xl px-3.5 py-2.5 pr-20 text-xs font-mono text-[#1f2933] placeholder:text-[#627d98]/50 focus:outline-none focus:border-primary transition"
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      aria-label={showKey ? 'Sembunyikan Key' : 'Lihat Key'}
                      className="p-1.5 text-[#627d98] hover:text-[#1f2933] hover:bg-[#f6f3ee] rounded-lg transition"
                      title={showKey ? 'Sembunyikan Key' : 'Lihat Key'}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[#627d98] pt-1">
                  <span>Dapatkan API Key gratis di Google AI Studio</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-semibold"
                  >
                    Buka AI Studio <ExternalLink size={11} />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-[#e7e0d4] gap-2">
                <div>
                  {hasCustomKey && (
                    <button
                      onClick={handleClear}
                      type="button"
                      aria-label="Hapus Gemini API Key Pribadi"
                      className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition border border-rose-200"
                    >
                      <Trash2 size={13} />
                      Hapus
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsOpen(false)}
                    type="button"
                    aria-label="Batal"
                    className="px-4 py-2 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] rounded-xl text-xs font-semibold transition"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSave}
                    type="button"
                    aria-label="Simpan Gemini API Key"
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Check size={14} />
                    Simpan Key
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
