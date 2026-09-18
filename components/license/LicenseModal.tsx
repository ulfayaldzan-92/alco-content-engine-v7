'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  X,
  AlertTriangle,
  Laptop,
  Mail,
  User,
  FileText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useLicense } from '@/lib/license/license-context';
import { AlcoVerificationResult } from '@/lib/license/types';
import { ALCO_APP_ID } from '@/lib/license/authority-key';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose }) => {
  const { state, deviceId, isLoading, activateLicense, deactivateLicense, generateRequestCode } = useLicense();

  const [activeTab, setActiveTab] = useState<'status' | 'request' | 'activate'>('status');

  // Request Code Generator state
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [generatedRequestCode, setGeneratedRequestCode] = useState<string | null>(null);
  const [reqCopied, setReqCopied] = useState(false);
  const [devCopied, setDevCopied] = useState(false);
  const [reqError, setReqError] = useState<string | null>(null);

  // Activation state
  const [licenseInput, setLicenseInput] = useState('');
  const [activationResult, setActivationResult] = useState<AlcoVerificationResult | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const handleCopyDeviceId = () => {
    if (!deviceId) return;
    navigator.clipboard.writeText(deviceId);
    setDevCopied(true);
    setTimeout(() => setDevCopied(false), 2000);
  };

  const handleGenerateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setReqError(null);
    if (!custName.trim()) {
      setReqError('Nama lengkap / Customer Name wajib diisi.');
      return;
    }
    if (!custEmail.trim() || !custEmail.includes('@')) {
      setReqError('Email valid wajib diisi.');
      return;
    }

    try {
      const code = generateRequestCode({
        name: custName.trim(),
        email: custEmail.trim(),
        notes: notes.trim() || undefined,
      });
      setGeneratedRequestCode(code);
    } catch (err: unknown) {
      setReqError(err instanceof Error ? err.message : 'Gagal membuat Request Code');
    }
  };

  const handleCopyRequestCode = () => {
    if (!generatedRequestCode) return;
    navigator.clipboard.writeText(generatedRequestCode);
    setReqCopied(true);
    setTimeout(() => setReqCopied(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseInput.trim()) return;

    setIsActivating(true);
    setActivationResult(null);

    const result = await activateLicense(licenseInput.trim());
    setActivationResult(result);
    setIsActivating(false);

    if (result.valid) {
      setLicenseInput('');
      setTimeout(() => {
        setActiveTab('status');
      }, 1200);
    }
  };

  if (!isOpen) return null;

  const isLicensed = state.status === 'active' && !!state.license;
  const planName = state.license?.plan?.toUpperCase() || 'UNLICENSED';
  const licenseType = state.license?.licenseType?.toUpperCase() || 'TRIAL';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="bg-[#fffdf8] dark:bg-slate-900 border border-[#e7e0d4] dark:border-slate-800 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-[#e7e0d4] dark:border-slate-800 flex items-center justify-between bg-[#f6f3ee]/60 dark:bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isLicensed
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/60'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800/60'
                }`}
              >
                {isLicensed ? <ShieldCheck size={22} /> : <Key size={22} />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1f2933] dark:text-slate-100 flex items-center gap-2">
                  <span>ALCO License Center</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                    Content Engine
                  </span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-slate-400">
                  Sistem Lisensi Resmi Aladzan Corpora Ecosystem ({ALCO_APP_ID})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#e7e0d4] dark:border-slate-800 bg-[#fbf9f4] dark:bg-slate-900/80 px-4 pt-2 gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'status'
                  ? 'border-primary text-primary dark:text-blue-400 bg-[#fffdf8] dark:bg-slate-900 font-bold'
                  : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck size={14} /> Status Lisensi
            </button>
            <button
              onClick={() => setActiveTab('request')}
              className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'request'
                  ? 'border-primary text-primary dark:text-blue-400 bg-[#fffdf8] dark:bg-slate-900 font-bold'
                  : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText size={14} /> Buat Request Code v2
            </button>
            <button
              onClick={() => setActiveTab('activate')}
              className={`px-4 py-2.5 rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'activate'
                  ? 'border-primary text-primary dark:text-blue-400 bg-[#fffdf8] dark:bg-slate-900 font-bold'
                  : 'border-transparent text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-slate-200'
              }`}
            >
              <Key size={14} /> Aktivasi License Code
            </button>
          </div>

          {/* Body content */}
          <div className="p-5 md:p-6 overflow-y-auto space-y-5 flex-1">
            {/* TAB 1: STATUS */}
            {activeTab === 'status' && (
              <div className="space-y-4">
                {/* Active License Card */}
                <div
                  className={`p-4 md:p-5 rounded-2xl border ${
                    isLicensed
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-black/5 dark:border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            isLicensed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                          }`}
                        />
                        <h4 className="font-bold text-sm text-[#1f2933] dark:text-slate-100">
                          {isLicensed ? 'Lisensi Aktif & Terverifikasi' : 'Aplikasi Belum Teraktivasi'}
                        </h4>
                      </div>
                      <p className="text-xs text-stone-600 dark:text-slate-400 mt-1">
                        {isLicensed
                          ? `Terdaftar atas nama: ${state.license?.customerName || state.license?.customerId || 'Owner'}`
                          : 'Jalankan pembuatan Request Code untuk mendapatkan License Code resmi dari Owner.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isLicensed
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-amber-600 text-white shadow-xs'
                        }`}
                      >
                        {planName} • {licenseType}
                      </span>
                    </div>
                  </div>

                  {/* License metadata details if active */}
                  {isLicensed && state.license && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-xs">
                      <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-black/5 dark:border-white/5">
                        <span className="text-stone-500 dark:text-slate-400 block mb-0.5">License ID:</span>
                        <span className="font-mono font-bold text-stone-800 dark:text-slate-200 truncate block">
                          {state.license.licenseId}
                        </span>
                      </div>
                      <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-black/5 dark:border-white/5">
                        <span className="text-stone-500 dark:text-slate-400 block mb-0.5">Masa Berlaku:</span>
                        <span className="font-bold text-stone-800 dark:text-slate-200">
                          {state.license.licenseType === 'lifetime'
                            ? 'LIFETIME (Permanen Seumur Hidup)'
                            : state.license.expiresAt
                            ? new Date(state.license.expiresAt).toLocaleDateString('id-ID', {
                                dateStyle: 'long',
                              })
                            : 'Subscription'}
                        </span>
                      </div>
                      <div className="p-3 bg-white/70 dark:bg-slate-900/70 rounded-xl border border-black/5 dark:border-white/5 sm:col-span-2">
                        <span className="text-stone-500 dark:text-slate-400 block mb-0.5">Device Binding:</span>
                        <span className="font-mono font-bold text-primary dark:text-blue-400">
                          {state.license.deviceId}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-4 pt-3 flex items-center justify-between flex-wrap gap-2">
                    {!isLicensed ? (
                      <button
                        onClick={() => setActiveTab('request')}
                        className="px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Sparkles size={14} /> Minta Lisensi Baru
                      </button>
                    ) : (
                      <button
                        onClick={deactivateLicense}
                        className="px-3 py-1.5 text-stone-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 border border-stone-200 dark:border-slate-800"
                      >
                        <Trash2 size={13} /> Hapus / Nonaktifkan Lisensi
                      </button>
                    )}
                  </div>
                </div>

                {/* Device ID Display Box */}
                <div className="p-4 bg-[#f6f3ee]/70 dark:bg-slate-950/70 rounded-2xl border border-[#e7e0d4] dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-600 dark:text-slate-300 flex items-center gap-1.5">
                      <Laptop size={14} className="text-primary dark:text-blue-400" /> ALCO Device Fingerprint
                    </span>
                    <button
                      onClick={handleCopyDeviceId}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-[#e7e0d4] dark:border-slate-800 text-stone-700 dark:text-slate-300 hover:text-primary dark:hover:text-blue-300 flex items-center gap-1 transition-colors shadow-2xs"
                    >
                      {devCopied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      {devCopied ? 'Tersalin' : 'Salin Device ID'}
                    </button>
                  </div>
                  <div className="font-mono text-xs font-bold p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-[#e7e0d4] dark:border-slate-800 text-primary dark:text-blue-400 select-all">
                    {deviceId}
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-slate-400">
                    Device ID terikat secara hardware dan stabil pada perangkat ini untuk menjamin keamanan lisensi.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: REQUEST CODE V2 GENERATOR */}
            {activeTab === 'request' && (
              <form onSubmit={handleGenerateRequest} className="space-y-4">
                <div className="p-3.5 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/80 dark:border-sky-800/40 rounded-2xl text-xs text-sky-900 dark:text-sky-200">
                  <p className="font-medium leading-relaxed">
                    <strong>Request Code v2</strong> membawa identitas pemilik dan Device ID perangkat ini. Kirimkan
                    Request Code yang dihasilkan ke Owner / ALCO Hub untuk menerima License Code resmi.
                  </p>
                </div>

                {reqError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{reqError}</span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <User size={13} className="text-primary" /> Nama Lengkap / Customer Name *
                    </label>
                    <input
                      type="text"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e0d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail size={13} className="text-primary" /> Email Pengguna *
                    </label>
                    <input
                      type="email"
                      value={custEmail}
                      onChange={(e) => setCustEmail(e.target.value)}
                      placeholder="Contoh: budi@corpora.id"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e0d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1">
                      Catatan / Referensi Pembelian (Opsional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Order #ALCO-2026-09"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e0d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} /> Generate Request Code v2
                  </button>
                </div>

                {/* Generated Request Code Output */}
                {generatedRequestCode && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-2.5 mt-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Check size={14} /> Request Code v2 Berhasil Dibuat
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyRequestCode}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                      >
                        {reqCopied ? <Check size={13} /> : <Copy size={13} />}
                        {reqCopied ? 'Tersalin!' : 'Salin Kode'}
                      </button>
                    </div>

                    <div className="font-mono text-xs p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800/40 text-stone-800 dark:text-slate-200 break-all select-all max-h-28 overflow-y-auto">
                      {generatedRequestCode}
                    </div>

                    <div className="p-3 bg-emerald-100/60 dark:bg-emerald-950/50 rounded-xl border border-emerald-300 dark:border-emerald-800 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-2">
                      <p className="font-medium leading-relaxed">
                        Request Code berhasil disalin. Langkah berikutnya: kirim Request Code kepada Admin ALCO untuk mendapatkan License Code. Setelah menerima License Code, kembali ke halaman ini dan lanjutkan ke tahap Aktivasi.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('activate')}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5"
                      >
                        <span>Lanjut ke Tahap Aktivasi</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </form>
            )}

            {/* TAB 3: AKTIVASI LICENSE CODE */}
            {activeTab === 'activate' && (
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="p-3.5 bg-stone-100/70 dark:bg-slate-950/70 border border-[#e7e0d4] dark:border-slate-800 rounded-2xl text-xs text-stone-600 dark:text-slate-400">
                  <p className="leading-relaxed">
                    Tempelkan <strong>License Code</strong> yang diterbitkan oleh ALCO License Generator (format:{' '}
                    <code className="font-mono font-bold text-primary">ALCO-LIC-v1.*</code>). Sistem akan
                    memverifikasi Ed25519 digital signature dan device binding secara lokal &amp; aman.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Key size={13} className="text-primary" /> Kode Lisensi Resmi (ALCO-LIC-v1.*)
                  </label>
                  <textarea
                    value={licenseInput}
                    onChange={(e) => setLicenseInput(e.target.value)}
                    placeholder="ALCO-LIC-v1.eyJsaWNlbnNlVmVyc2lvbiI6IjEuMCIs..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#e7e0d4] dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono text-stone-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    required
                  />
                </div>

                {activationResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                      activationResult.valid
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {activationResult.valid ? (
                      <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert size={18} className="text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-bold block">
                        {activationResult.valid
                          ? 'Lisensi Berhasil Diverifikasi & Diaktifkan!'
                          : 'Aktivasi Lisensi Gagal'}
                      </span>
                      <p className="mt-0.5 text-[11px] leading-relaxed">
                        {activationResult.valid
                          ? `Paket: ${activationResult.license?.plan?.toUpperCase()} (${activationResult.license?.licenseType?.toUpperCase()}) telah terpasang permanen pada perangkat ini.`
                          : activationResult.error || 'Signature atau parameter lisensi tidak valid.'}
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isActivating || !licenseInput.trim()}
                    className="w-full py-2.5 px-4 bg-primary hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    {isActivating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Memverifikasi Signature...
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={14} /> Verifikasi &amp; Aktifkan Lisensi
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Footer note */}
          <div className="p-4 border-t border-[#e7e0d4] dark:border-slate-800 bg-[#f6f3ee]/40 dark:bg-slate-950/40 flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400">
            <span>Aladzan Corpora Ecosystem • License Authority v2.1</span>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-stone-200/70 hover:bg-stone-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-stone-700 dark:text-slate-200 rounded-xl font-semibold transition-colors"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
