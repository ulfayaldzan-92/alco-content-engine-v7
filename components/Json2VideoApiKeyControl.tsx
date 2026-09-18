'use client';

import React, { useState, useEffect } from 'react';
import { Video, Check, Trash2, Eye, EyeOff, ShieldCheck, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useJson2VideoApiKey } from '@/lib/client-json2video-key';

interface Json2VideoApiKeyControlProps {
  variant?: 'badge' | 'button' | 'compact';
  onToast?: (message: string) => void;
}

export function Json2VideoApiKeyControl({ variant = 'badge', onToast }: Json2VideoApiKeyControlProps) {
  const { apiKey, hasCustomKey, saveKey, clearKey } = useJson2VideoApiKey();
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
      if (onToast) onToast('JSON2Video API Key pribadi dihapus. Kembali menggunakan default server.');
    } else {
      saveKey(trimmed);
      if (onToast) onToast('JSON2Video API Key pribadi berhasil disimpan ke browser!');
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    clearKey();
    setInputKey('');
    if (onToast) onToast('JSON2Video API Key pribadi dihapus.');
    setIsOpen(false);
  };

  const maskedKey = apiKey
    ? apiKey.length > 8
      ? `${apiKey.substring(0, 4)}••••••••${apiKey.substring(apiKey.length - 4)}`
      : '••••••••'
    : '';

  return (
    <>
      {/* Trigger Button */}
      {variant === 'compact' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Pengaturan JSON2Video API Key"
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
            hasCustomKey
              ? 'bg-amber-50 border-amber-200 text-[#b7791f] hover:bg-amber-100/70'
              : 'bg-white border-[#e7e0d4] text-[#1f2933] hover:bg-[#f6f3ee]'
          }`}
          title="Pengaturan JSON2Video API Key Pribadi"
        >
          <Video size={13} className={hasCustomKey ? 'text-[#b7791f]' : 'text-[#627d98]'} />
          <span className="hidden sm:inline">
            {hasCustomKey ? 'JSON2Video Key' : 'JSON2Video Key'}
          </span>
          <span
            className={`w-2 h-2 rounded-full ${
              hasCustomKey ? 'bg-[#b7791f]' : 'bg-[#e7e0d4]'
            }`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Buka Pengaturan JSON2Video API Key"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
            hasCustomKey
              ? 'bg-amber-50 border-amber-200 text-[#b7791f] hover:bg-amber-100/70'
              : 'bg-white border-[#e7e0d4] text-[#1f2933] hover:bg-[#f6f3ee]'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <Video size={13} className={hasCustomKey ? 'text-[#b7791f]' : 'text-[#627d98]'} />
            <span className="font-medium">
              {hasCustomKey ? 'JSON2Video Key' : 'Set JSON2Video Key'}
            </span>
          </div>
          <span
            className={`w-2 h-2 rounded-full ${
              hasCustomKey ? 'bg-[#b7791f]' : 'bg-amber-400'
            }`}
            title={hasCustomKey ? 'JSON2Video Key Pribadi Aktif' : 'Default / Belum Diisi'}
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
                  <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-[#b7791f]">
                    <Video size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1f2933] tracking-tight">JSON2Video API Key Pribadi</h3>
                    <p className="text-xs text-[#627d98]">Integrasi render video otomatis via JSON2Video</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup Dialog Pengaturan JSON2Video API Key"
                  className="text-[#627d98] hover:text-[#1f2933] p-1.5 rounded-lg hover:bg-[#f6f3ee] transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  hasCustomKey
                    ? 'bg-amber-50 border-amber-200 text-[#b7791f]'
                    : 'bg-[#f6f3ee] border-[#e7e0d4] text-[#627d98]'
                }`}
              >
                <ShieldCheck size={18} className={hasCustomKey ? 'text-[#b7791f] mt-0.5 shrink-0' : 'text-[#627d98] mt-0.5 shrink-0'} />
                <div className="space-y-1">
                  <p className="font-semibold text-xs text-[#1f2933]">
                    {hasCustomKey ? 'API Key Pribadi Tersimpan' : 'Menggunakan Konfigurasi Standar / Server'}
                  </p>
                  <p className="text-xs leading-relaxed text-[#627d98]">
                    {hasCustomKey
                      ? `Key Anda (${maskedKey}) tersimpan secara lokal di browser dan otomatis dikirimkan via header 'x-json2video-api-key'.`
                      : 'Masukkan JSON2Video API Key pribadi Anda untuk render video langsung tanpa batas server.'}
                  </p>
                </div>
              </div>

              {/* Form Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#1f2933]">
                  JSON2Video API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="Masukkan JSON2Video API Key..."
                    className="w-full bg-white border border-[#e7e0d4] rounded-xl px-3.5 py-2.5 pr-20 text-xs font-mono text-[#1f2933] placeholder:text-[#627d98]/50 focus:outline-none focus:border-[#b7791f] transition"
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
                  <span>Free tier: 600 credits gratis awal</span>
                  <a
                    href="https://json2video.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#b7791f] hover:underline flex items-center gap-1 font-semibold"
                  >
                    Buka JSON2Video <ExternalLink size={11} />
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
                      aria-label="Hapus JSON2Video API Key Pribadi"
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
                    aria-label="Simpan JSON2Video API Key"
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#b7791f] hover:bg-[#975a16] text-white rounded-xl text-xs font-bold transition shadow-sm"
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
