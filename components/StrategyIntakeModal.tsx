'use client';

import React, { useState } from 'react';
import {
  StrategyBlueprint,
  SharedContentContext,
  validateBlueprint,
  buildSharedContentContext,
  parseAndMapStrategyJson,
  createEmptyStrategyBlueprint,
  detectLegacyFallbackSignatures,
  SAMPLE_STRATEGY_BLUEPRINT
} from '@/lib/content-contract';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Code2,
  Building2,
  Target,
  Megaphone,
  Briefcase,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StrategyIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStrategy: (blueprint: StrategyBlueprint, context: SharedContentContext, isNewProject: boolean) => void;
  hasActiveProject?: boolean;
  currentBlueprint?: StrategyBlueprint | null;
}

export function StrategyIntakeModal({
  isOpen,
  onClose,
  onApplyStrategy,
  currentBlueprint, hasActiveProject
}: StrategyIntakeModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'form'>('upload');
  const [pastedJson, setPastedJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<{
    isConverted: boolean;
    type: string;
    note: string;
  } | null>(null);

  // Editable Blueprint State
  const [blueprint, setBlueprint] = useState<StrategyBlueprint>(
    currentBlueprint || createEmptyStrategyBlueprint()
  );

  React.useEffect(() => {
    if (currentBlueprint) {
      setBlueprint(currentBlueprint);
    }
  }, [currentBlueprint]);

  const validation = validateBlueprint(blueprint);
  const legacyCheck = detectLegacyFallbackSignatures(blueprint);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = parseAndMapStrategyJson(json);
        setBlueprint(result.blueprint);
        setImportStatus({
          isConverted: result.isConverted,
          type: result.conversionType,
          note: result.conversionNote,
        });
        setParseError(null);
        setActiveTab('form');
      } catch (err) {
        setParseError('Format file JSON tidak valid. Pastikan file berupa JSON valid.');
      }
    };
    reader.readAsText(file);
  };

  const handleParsePastedJson = () => {
    if (!pastedJson.trim()) {
      setParseError('Silakan masukkan text JSON terlebih dahulu.');
      return;
    }
    try {
      const json = JSON.parse(pastedJson);
      const result = parseAndMapStrategyJson(json);
      setBlueprint(result.blueprint);
      setImportStatus({
        isConverted: result.isConverted,
        type: result.conversionType,
        note: result.conversionNote,
      });
      setParseError(null);
      setActiveTab('form');
    } catch (err) {
      setParseError('Gagal memproses JSON. Periksa sintaksis dan coba lagi.');
    }
  };

  const handleLoadSample = () => {
    setBlueprint(SAMPLE_STRATEGY_BLUEPRINT);
    setImportStatus(null);
    setParseError(null);
    setActiveTab('form');
  };

  const handleSaveAndApply = (isNewProject: boolean) => {
    const origin = importStatus?.isConverted ? 'campaign_pack_converted' : 'creative_system_json';
    const context = buildSharedContentContext(blueprint, origin, importStatus?.note);
    onApplyStrategy(blueprint, context, isNewProject);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden text-[#1f2933]"
        >
          {/* Modal Header */}
          <div className="p-5 border-b border-[#e7e0d4] flex items-center justify-between bg-[#f6f3ee]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Sparkles size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1f2933] tracking-tight">
                  ALCO Strategy Intake
                </h2>
                <p className="text-xs text-[#627d98]">
                  Sinkronisasi Strategy Blueprint dari ALCO Creative System
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#627d98] hover:text-[#1f2933] rounded-lg hover:bg-black/5 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="px-6 pt-4 border-b border-[#e7e0d4] bg-[#fffdf8] flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'upload'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-[#627d98] hover:text-[#1f2933]'
              }`}
            >
              <Upload size={14} /> Upload JSON
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'paste'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-[#627d98] hover:text-[#1f2933]'
              }`}
            >
              <Code2 size={14} /> Paste Blueprint
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`pb-3 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition ${
                activeTab === 'form'
                  ? 'border-primary text-primary font-bold'
                  : 'border-transparent text-[#627d98] hover:text-[#1f2933]'
              }`}
            >
              <FileText size={14} /> Review & Edit Blueprint
            </button>

            <div className="ml-auto">
              <button
                onClick={handleLoadSample}
                className="mb-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
              >
                <Sparkles size={13} /> Load Demo Blueprint
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {parseError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                {parseError}
              </div>
            )}

            {/* TAB 1: UPLOAD JSON */}
            {activeTab === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-[#e7e0d4] hover:border-primary bg-[#f6f3ee]/50 rounded-2xl p-10 text-center transition flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Upload size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#1f2933]">
                      Upload File Strategy Blueprint (.json)
                    </p>
                    <p className="text-xs text-[#627d98] mt-1">
                      Export file JSON dari ALCO Creative System Anda di sini
                    </p>
                  </div>
                  <label className="mt-2 px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl cursor-pointer hover:bg-blue-700 shadow-xs transition">
                    Pilih File JSON
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: PASTE JSON */}
            {activeTab === 'paste' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-[#1f2933] block">
                  Paste JSON Blueprint
                </label>
                <textarea
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder={`{\n  "project_name": "Course Launch 2026",\n  "brand_identity": {\n    "brand_name": "ALCO Academy"\n  }\n}`}
                  rows={10}
                  className="w-full bg-white border border-[#e7e0d4] rounded-xl p-3.5 text-xs font-mono text-[#1f2933] focus:outline-none focus:border-primary"
                />
                <button
                  onClick={handleParsePastedJson}
                  className="px-5 py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-xs transition flex items-center gap-2"
                >
                  Proses & Impor JSON
                  <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* TAB 3: REVIEW & FORM EDIT */}
            {activeTab === 'form' && (
              <div className="space-y-6">
                {/* ALCO Ecosystem Blueprint Success Status Banner */}
                {importStatus?.type === 'alco_ecosystem_blueprint' && (
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-900 text-xs flex items-center gap-3">
                    <CheckCircle2 size={18} className="text-cyan-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-cyan-950">Blueprint ALCO berhasil dibaca</span>
                      <p className="text-xs text-cyan-700 mt-0.5">
                        Ecosystem Blueprint resmi ALCO telah dimuat lengkap dengan identitas visual, positioning, dan strategi konten.
                      </p>
                    </div>
                  </div>
                )}

                {/* Campaign Pack Conversion Honest Status Banner */}
                {importStatus?.isConverted && (
                  <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-sky-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Sparkles size={18} className="text-sky-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase bg-sky-100 text-sky-800 px-2 py-0.5 rounded text-[10px]">
                            Imported as Campaign Pack
                          </span>
                          <span className="font-bold text-xs text-sky-950">Automated Strategic Mapping</span>
                        </div>
                        <p className="text-xs text-sky-700 mt-1">
                          JSON terdeteksi sebagai Campaign Pack Meta Ads. Data telah secara otomatis dipetakan ke Strategy Blueprint. Anda dapat mereview atau menyesuaikan field di bawah.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-sky-800 font-semibold bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                      Mapped into Content Context
                    </span>
                  </div>
                )}

                {/* Legacy Fallback Warning Banner */}
                {legacyCheck.hasLegacySignatures && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs text-amber-950">Data Mengandung Nilai Bawaan Lama</span>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Konteks strategi terdeteksi mengandung nilai default lama ({legacyCheck.detectedSignatures.join(', ')}). Perbarui nilai di bawah agar sesuai dengan bisnis dan campaign asli Anda.
                      </p>
                    </div>
                  </div>
                )}

                {/* Validation Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    validation.isComplete
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {validation.isComplete ? (
                    <CheckCircle2 size={20} className="shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle size={20} className="shrink-0 mt-0.5 text-amber-600" />
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-sm">
                      {validation.isComplete
                        ? 'Blueprint Lengkap — Siap Masuk ke Content Engine'
                        : 'Field Wajib Belum Lengkap'}
                    </p>
                    {validation.isComplete ? (
                      <p className="mt-1 text-emerald-700">
                        Seluruh field wajib strategy intake telah terpenuhi. Kalender konten akan dibuat berlandaskan positioning & funnel ini.
                      </p>
                    ) : (
                      <div className="mt-1">
                        <p className="text-amber-800">
                          Beberapa data strategi penting belum diisi. Lengkapi di bawah agar AI tidak membuat konten generik:
                        </p>
                        <ul className="list-disc list-inside mt-1 font-medium text-xs text-amber-700">
                          {validation.missingFields.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Editable Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Brand Identity */}
                  <div className="bg-[#f6f3ee]/60 p-4 border border-[#e7e0d4] rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <Building2 size={14} /> Brand Identity
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Brand Name *
                      </label>
                      <input
                        type="text"
                        value={blueprint.brand_identity?.brand_name || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            brand_identity: { ...blueprint.brand_identity, brand_name: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Industry / Category
                      </label>
                      <input
                        type="text"
                        value={blueprint.brand_identity?.category || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            brand_identity: { ...blueprint.brand_identity, category: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="bg-[#f6f3ee]/60 p-4 border border-[#e7e0d4] rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <Target size={14} /> Target Audience
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Primary Audience Segment *
                      </label>
                      <input
                        type="text"
                        value={blueprint.target_audience?.primary_audience || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            target_audience: {
                              ...blueprint.target_audience,
                              primary_audience: e.target.value
                            }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Pain Points (Pisahkan Koma) *
                      </label>
                      <input
                        type="text"
                        value={blueprint.target_audience?.audience_problem?.join(', ') || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            target_audience: {
                              ...blueprint.target_audience,
                              audience_problem: e.target.value.split(',').map((s) => s.trim())
                            }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Positioning & Offer */}
                  <div className="bg-[#f6f3ee]/60 p-4 border border-[#e7e0d4] rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <Briefcase size={14} /> Positioning & Offer
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Core Positioning *
                      </label>
                      <textarea
                        rows={2}
                        value={blueprint.positioning?.core_positioning || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            positioning: { ...blueprint.positioning, core_positioning: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Main Offer *
                      </label>
                      <input
                        type="text"
                        value={blueprint.offer?.main_offer || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            offer: { ...blueprint.offer, main_offer: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Messaging & Copy Direction */}
                  <div className="bg-[#f6f3ee]/60 p-4 border border-[#e7e0d4] rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                      <Megaphone size={14} /> Core Message & Messaging
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Core Message *
                      </label>
                      <textarea
                        rows={2}
                        value={blueprint.messaging?.core_message || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            messaging: { ...blueprint.messaging, core_message: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#627d98] block mb-1">
                        Brand Voice & Tone
                      </label>
                      <input
                        type="text"
                        value={blueprint.messaging?.brand_voice || ''}
                        onChange={(e) =>
                          setBlueprint({
                            ...blueprint,
                            messaging: { ...blueprint.messaging, brand_voice: e.target.value }
                          })
                        }
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg p-2.5 text-xs text-[#1f2933] focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 border-t border-[#e7e0d4] bg-[#f6f3ee]/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#627d98] hover:text-[#1f2933] font-semibold transition"
            >
              Batal
            </button>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {hasActiveProject && (
                <button
                  onClick={() => handleSaveAndApply(false)}
                  className="px-6 py-2.5 bg-white border border-[#e7e0d4] hover:bg-[#f6f3ee] text-[#1f2933] font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
                >
                  Update Project Aktif
                </button>
              )}
              <button
                onClick={() => handleSaveAndApply(true)}
                className="px-6 py-2.5 bg-primary hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Sparkles size={16} />
                {hasActiveProject ? 'Buat Project Baru dari JSON' : 'Terapkan Strategy Blueprint'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
