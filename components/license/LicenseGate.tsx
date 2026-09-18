'use client';

import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Key,
  Copy,
  Check,
  RefreshCw,
  Laptop,
  Mail,
  User,
  FileText,
  AlertTriangle,
  Loader2,
  Lock,
  ArrowRight,
  HelpCircle,
  Zap,
  Send,
} from 'lucide-react';
import { useLicense } from '@/lib/license/license-context';
import { AlcoVerificationResult } from '@/lib/license/types';
import { ALCO_APP_ID } from '@/lib/license/authority-key';

interface LicenseGateProps {
  children: React.ReactNode;
}

type LicenseStage = 'step1' | 'step2' | 'step3' | 'guide';

export const LicenseGate: React.FC<LicenseGateProps> = ({ children }) => {
  const { state, deviceId, isLoading, activateLicense, generateRequestCode, reverifyLicense } = useLicense();

  // ALCO APP STANDARD v2.5 Section 15B: Baseline 3-stage activation flow
  const [activeTab, setActiveTab] = useState<LicenseStage>('step1');

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

  // Re-verify state
  const [isReverifying, setIsReverifying] = useState(false);

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
      setReqError('Nama lengkap pelanggan wajib diisi.');
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
      // ALCO APP STANDARD v2.5 Section 15B: Automatic seamless progression to Tahap 2
      setActiveTab('step2');
    } catch (err: unknown) {
      setReqError(err instanceof Error ? err.message : 'Gagal membuat Request Code');
    }
  };

  const handleCopyRequestCode = () => {
    if (!generatedRequestCode) return;
    navigator.clipboard.writeText(generatedRequestCode);
    setReqCopied(true);
    setTimeout(() => setReqCopied(false), 3500);
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
    }
  };

  const handleReverify = async () => {
    setIsReverifying(true);
    await reverifyLicense();
    setIsReverifying(false);
  };

  // 1. Loading State (Checking license integrity at startup)
  if (isLoading) {
    return (
      <div id="alco-license-checking" className="min-h-screen bg-background flex flex-col items-center justify-center p-6 select-none font-sans">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-xl flex flex-col items-center text-center space-y-6">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Lock className="w-8 h-8 animate-pulse text-primary" />
            </div>
            <div className="absolute -inset-2 border-2 border-primary/30 border-t-primary rounded-3xl animate-spin pointer-events-none" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20 text-xs font-semibold tracking-wider uppercase">
              <Zap size={13} className="text-cyan-600 dark:text-cyan-400" />
              <span>ALCO Content Engine v2.5</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Memeriksa Integritas Lisensi</h1>
            <p className="text-sm text-muted-foreground">
              Memvalidasi tanda tangan digital Ed25519 dan identitas perangkat keras lokal...
            </p>
          </div>

          {deviceId ? (
            <div className="w-full bg-muted/50 border border-border/80 rounded-xl p-3 text-left">
              <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                Hardware Device ID
              </div>
              <div
                suppressHydrationWarning
                className="font-mono text-xs text-foreground font-semibold tracking-widest break-all"
              >
                {deviceId}
              </div>
            </div>
          ) : null}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span>ALCO License Protocol v2.5 Fail-Closed Gate</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active License State -> Render Workspace
  if (state.status === 'active' && state.license) {
    return <>{children}</>;
  }

  // 3. Unlicensed / Invalid / Expired State -> BLOCK WORKSPACE and Render Full-Screen License Gate
  return (
    <div id="alco-license-gate" className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm font-black">
            <Zap size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-foreground">ALCO Content Engine</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                Cyan Accent
              </span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              License Protocol v1.0 &bull; App ID: {ALCO_APP_ID}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
            Plan: {state.license?.plan?.toUpperCase() || 'UNLICENSED'}
          </span>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
            <ShieldAlert size={14} />
            <span>Akses Dibatasi &bull; Belum Berlisensi</span>
          </div>
        </div>
      </header>

      {/* Main Activation Screen */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Hero Banner inside Card */}
          <div className="p-6 sm:p-8 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary uppercase tracking-wider mb-1">
                  <Lock size={12} />
                  Startup License Gate (ALCO LICENSE STANDARD v1.0)
                </div>
                <h1 className="text-2xl font-black tracking-tight text-foreground">Aktivasi Lisensi Diperlukan</h1>
                <p className="text-sm text-muted-foreground max-w-lg">
                  Sesuai <strong>ALCO LICENSE STANDARD v1.0</strong>, workspace aplikasi hanya dapat dibuka setelah lisensi perangkat keras diverifikasi secara lokal menggunakan Authority Public Key Ed25519 resmi.
                </p>
              </div>

              <button
                id="btn-reverify-license"
                onClick={handleReverify}
                disabled={isReverifying}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-colors shrink-0 disabled:opacity-50"
                title="Periksa ulang lisensi tersimpan"
              >
                <RefreshCw size={14} className={isReverifying ? 'animate-spin' : ''} />
                <span>Cek Ulang</span>
              </button>
            </div>

            {/* Error Message if present */}
            {state.error && (
              <div className="mt-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Pemeriksaan Lisensi Gagal:</div>
                  <div className="text-destructive/90 mt-0.5">{state.error}</div>
                </div>
              </div>
            )}

            {/* Device ID Display Box */}
            <div className="mt-5 p-4 rounded-xl bg-background border border-border">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                  <Laptop size={14} className="text-primary" />
                  <span>Hardware Device ID (Windows MachineGuid)</span>
                </div>
                <button
                  id="btn-copy-device-id"
                  onClick={handleCopyDeviceId}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  {devCopied ? (
                    <>
                      <Check size={13} className="text-green-600 dark:text-green-400" />
                      <span className="text-green-600 dark:text-green-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin Device ID</span>
                    </>
                  )}
                </button>
              </div>
              <div
                suppressHydrationWarning
                className="font-mono text-sm font-bold tracking-widest text-foreground bg-muted/40 px-3 py-2 rounded-lg border border-border/60 select-all break-all"
              >
                {deviceId || 'ALCO-DEV-UNKNOWN'}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Device ID ini stabil dan terikat dengan perangkat ini. Digunakan oleh ALCO License Generator resmi untuk menandatangani lisensi Anda.
              </p>
            </div>
          </div>

          {/* Section 15B Baseline 3-Stage Stepper Navigation */}
          <div className="flex border-b border-border bg-muted/40 px-4 sm:px-6 overflow-x-auto">
            <button
              id="tab-request-code"
              onClick={() => setActiveTab('step1')}
              className={`py-3.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'step1'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                activeTab === 'step1' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                1
              </span>
              <span>Tahap 1: Buat Request Code</span>
            </button>

            <button
              id="tab-step-2"
              onClick={() => setActiveTab('step2')}
              className={`py-3.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'step2'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                activeTab === 'step2' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                2
              </span>
              <span>Tahap 2: Dapatkan License Code</span>
            </button>

            <button
              id="tab-activate-license"
              onClick={() => setActiveTab('step3')}
              className={`py-3.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === 'step3'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black ${
                activeTab === 'step3' ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20 text-muted-foreground'
              }`}>
                3
              </span>
              <span>Tahap 3: Aktivasi Lisensi</span>
            </button>

            <button
              id="tab-license-guide"
              onClick={() => setActiveTab('guide')}
              className={`py-3.5 px-3 sm:px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ml-auto ${
                activeTab === 'guide'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <HelpCircle size={14} />
              <span>Panduan</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6 sm:p-8">
            {/* TAHAP 1: BUAT REQUEST CODE (Section 15B) */}
            {activeTab === 'step1' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <FileText size={16} className="text-primary" />
                    <span>Tahap 1 — Buat Request Code</span>
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Isi identitas Anda untuk menghasilkan Request Code resmi v2. Kode ini akan diikat secara aman dengan Device ID komputer Anda.
                  </p>
                </div>

                <form onSubmit={handleGenerateRequest} className="space-y-3.5 pt-1">
                  <div>
                    <label htmlFor="input-customer-name" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Nama Lengkap Pelanggan
                    </label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                      <input
                        id="input-customer-name"
                        type="text"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="input-customer-email" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Alamat Email
                    </label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-3 text-muted-foreground" />
                      <input
                        id="input-customer-email"
                        type="email"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        placeholder="nama@perusahaan.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="input-request-notes" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Catatan Tambahan (Opsional)
                    </label>
                    <input
                      id="input-request-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Contoh: Paket Lisensi Lifetime / Konten Studio"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {reqError && (
                    <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                      {reqError}
                    </div>
                  )}

                  <button
                    id="btn-generate-request-code"
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <FileText size={15} />
                    <span>Hasilkan Request Code v2 & Lanjut ke Tahap 2</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              </div>
            )}

            {/* TAHAP 2: DAPATKAN LICENSE CODE (Section 15B) */}
            {activeTab === 'step2' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Send size={16} className="text-primary" />
                    <span>Tahap 2 — Dapatkan License Code</span>
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Salin Request Code di bawah ini dan kirimkan kepada Admin ALCO untuk mendapatkan License Code resmi Anda.
                  </p>
                </div>

                {generatedRequestCode ? (
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Check size={14} className="text-green-600 dark:text-green-400" />
                          <span>Request Code v2 Siap Dikirim</span>
                        </div>
                        <button
                          id="btn-copy-request-code"
                          onClick={handleCopyRequestCode}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                        >
                          {reqCopied ? (
                            <>
                              <Check size={13} className="text-green-600 dark:text-green-400" />
                              <span className="text-green-600 dark:text-green-400">Tersalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Salin Request Code</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="font-mono text-xs text-foreground bg-background p-3 rounded-lg border border-border break-all select-all max-h-28 overflow-y-auto">
                        {generatedRequestCode}
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Format resmi: <code className="font-mono text-foreground font-semibold">ALCO-REQ-v2.&lt;PAYLOAD&gt;.&lt;CRC16&gt;</code>
                      </p>
                    </div>

                    {/* ALCO APP STANDARD v2.5 Section 15B Mandatory Action Message Banner */}
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-foreground space-y-2.5">
                      <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-bold text-xs">
                        <ArrowRight size={14} />
                        <span>Arahan Langkah Berikutnya (Wajib):</span>
                      </div>
                      <p className="text-xs leading-relaxed text-foreground font-medium">
                        Request Code berhasil disalin. Langkah berikutnya: kirim Request Code kepada Admin ALCO untuk mendapatkan License Code. Setelah menerima License Code, kembali ke halaman ini dan lanjutkan ke tahap Aktivasi.
                      </p>
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <button
                          id="btn-next-to-activation"
                          onClick={() => setActiveTab('step3')}
                          className="py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                        >
                          <span>Lanjutkan ke Tahap 3: Aktivasi Lisensi</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Anda belum membuat Request Code. Silakan selesaikan Tahap 1 terlebih dahulu.
                    </p>
                    <button
                      onClick={() => setActiveTab('step1')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all"
                    >
                      <FileText size={14} />
                      <span>Kembali ke Tahap 1: Buat Request Code</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAHAP 3: AKTIVASI LISENSI (Section 15B) */}
            {activeTab === 'step3' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Key size={16} className="text-primary" />
                    <span>Tahap 3 — Aktivasi Lisensi</span>
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tempelkan kode lisensi yang Anda terima dari Admin ALCO di bawah ini untuk membuka akses workspace aplikasi.
                  </p>
                </div>

                <form onSubmit={handleActivate} className="space-y-4 pt-1">
                  <div>
                    <label htmlFor="input-license-code" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      ALCO Signed License Code
                    </label>
                    <textarea
                      id="input-license-code"
                      rows={4}
                      value={licenseInput}
                      onChange={(e) => setLicenseInput(e.target.value)}
                      placeholder="ALCO-LIC-v1.eyJsaWNlbnNlVmVyc2lvbiI6IjEuMCIs... (Tempel kode lisensi resmi dari Admin ALCO di sini)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                      required
                    />
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Format resmi (ALCO LICENSE STANDARD v1.0 Section 6):{' '}
                      <code className="font-mono text-foreground font-semibold">
                        ALCO-LIC-v1.&lt;PAYLOAD&gt;.&lt;SIGNATURE_HEX (128 karakter)&gt;
                      </code>
                    </p>
                  </div>

                  {activationResult && !activationResult.valid && (
                    <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5">
                      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Aktivasi Ditolak:</div>
                        <div className="text-destructive/90 mt-0.5">{activationResult.error}</div>
                        <div className="text-[11px] text-destructive/80 mt-1">
                          Pastikan License Code diterbitkan untuk App ID &quot;{ALCO_APP_ID}&quot; dan Hardware Device ID &quot;{deviceId}&quot;.
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    id="btn-submit-license-activation"
                    type="submit"
                    disabled={isActivating || !licenseInput.trim()}
                    className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActivating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Memverifikasi Signature Ed25519...</span>
                      </>
                    ) : (
                      <>
                        <Key size={16} />
                        <span>Verifikasi &amp; Aktifkan Workspace</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* TAB: PANDUAN */}
            {activeTab === 'guide' && (
              <div className="space-y-4 text-xs text-muted-foreground">
                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                  <div className="text-sm font-bold text-foreground">Alur Aktivasi Resmi (ALCO LICENSE STANDARD v1.0):</div>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">1</div>
                      <div>
                        <strong className="text-foreground">Tahap 1 — Buat Request Code:</strong> Isi nama lengkap dan email Anda, lalu buat Request Code v2.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">2</div>
                      <div>
                        <strong className="text-foreground">Tahap 2 — Dapatkan License Code:</strong> Salin Request Code dan kirimkan ke Admin ALCO.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">3</div>
                      <div>
                        <strong className="text-foreground">Tahap 3 — Aktivasi Lisensi:</strong> Tempelkan License Code yang diterima, tekan tombol aktivasi, dan sistem akan memverifikasi integritas Ed25519 secara lokal.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-background flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-primary shrink-0" />
                    <span>Keamanan Terjamin: Lisensi diverifikasi secara lokal dan offline menggunakan Authority Public Key resmi.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Security Notice */}
          <div className="px-6 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-green-600 dark:text-green-400" />
              <span>Ed25519 Local Verification &bull; Fail-Closed Security</span>
            </div>
            <span>Aladzan Corpora Ecosystem</span>
          </div>
        </div>
      </main>
    </div>
  );
};
