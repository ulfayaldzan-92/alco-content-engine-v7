'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Zap,
  Calendar,
  Users,
  Layers,
  Mic2,
  Filter,
  Sparkles,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Info,
  ArrowRight,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { ConfigDataProps } from './types';
import { buildFunnelStrategyFromContext } from '@/lib/funnel-strategy';

const InputField = ({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: any;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
      <Icon size={14} className="text-primary" />
      {label}
    </label>
    {children}
  </div>
);

interface CalendarConfigWizardProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  setCurrentStep: (step: number | ((prev: number) => number)) => void;
  configData: ConfigDataProps;
  accessStatus: any;
  isLoading: boolean;
  recommendations: Record<number, any>;
  isRecommending: boolean;
  getAIRecommendation: (step: number) => void;
  handleApplyRecommendation: (step: number, field: string, text: string) => void;
  handleApplyAllRecommendations: (step: number, data: Record<string, string>) => void;
}

export const CalendarConfigWizard: React.FC<CalendarConfigWizardProps> = ({
  isOpen,
  onClose,
  configData,
  accessStatus,
  isLoading,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const activeSharedContext = configData.sharedContentContext;
  const projectFunnelStrategy = React.useMemo(() => {
    if (!activeSharedContext) return null;
    return buildFunnelStrategyFromContext(activeSharedContext, {
      totalPosts: (configData.ratio?.tofu || 0) + (configData.ratio?.mofu || 0) + (configData.ratio?.bofu || 0) || 14,
    });
  }, [activeSharedContext, configData.ratio?.tofu, configData.ratio?.mofu, configData.ratio?.bofu]);

  if (!isOpen) return null;

  const totalPosts = configData.ratio.tofu + configData.ratio.mofu + configData.ratio.bofu;
  const projectName = configData.strategyBlueprint?.brand_identity?.brand_name 
    || configData.sharedContentContext?.brand_context?.brand_name 
    || configData.selectedProject 
    || 'Project Aktif';

  const formatList = configData.formats && configData.formats.length > 0 
    ? configData.formats.join(', ') 
    : 'Semua Format';

  const formattedStartDate = configData.startDate
    ? new Date(configData.startDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'hari ini';

  const isGenerateDisabled = 
    isLoading ||
    totalPosts > (accessStatus?.maxContent || 30) ||
    totalPosts === 0 ||
    configData.formats.length === 0 ||
    (configData.formats.includes('Reels') && !configData.reelsDuration) ||
    (configData.formats.includes('Carousel') && !configData.carouselSlides);

  const handleStartGeneration = () => {
    if (isGenerateDisabled) return;
    configData.generateContent();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/40 backdrop-blur-xs overflow-y-auto"
        onClick={isLoading ? undefined : onClose}
      >
        <motion.div
          initial={{ scale: 0.96, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#fffdf8] border border-[#e7e0d4] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl font-sans my-auto"
        >
          {/* Header */}
          <div className="px-5 sm:px-7 py-4 border-b border-[#e7e0d4] bg-[#f6f3ee]/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#1f2933]">
                  Konfigurasi Kalender Konten
                </h2>
                <p className="text-[11px] text-[#627d98]">
                  Perencanaan konten terstruktur untuk membangun kepercayaan audiens (Instagram & Facebook)
                </p>
              </div>
            </div>
            {!isLoading && (
              <button
                onClick={onClose}
                className="p-2 border border-[#e7e0d4] hover:bg-stone-200/60 rounded-xl text-stone-500 hover:text-stone-800 transition-all shrink-0"
                title="Tutup Modal"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Body Content - Scrollable */}
          <div className="flex-1 p-5 sm:p-7 overflow-y-auto custom-scrollbar space-y-6">
            {/* 1. Project Aktif & Topik Utama */}
            <div className="bg-white border border-[#e7e0d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e7e0d4]/80 pb-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-stone-500 font-medium">Project Aktif:</span>
                  <span className="font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                    {projectName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                  <ShieldCheck size={13} className="text-primary" />
                  <span>Trust-Building Formula</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Zap size={14} className="text-primary" />
                  Topik / Fokus Kampanye
                </label>
                <input
                  type="text"
                  value={configData.coreTopic || ''}
                  onChange={(e) => {
                    configData.setCoreTopic(e.target.value);
                    configData.setHasUserCoreTopicOverride?.(true);
                  }}
                  placeholder="Contoh: Edukasi Funnel & Solusi Produk Digital"
                  className="w-full bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-3.5 py-2.5 text-xs text-[#1f2933] placeholder:text-stone-400 focus:outline-none focus:border-primary transition-colors font-medium"
                />
              </div>
            </div>

            {/* 2. Periode & Tanggal Mulai */}
            <div className="bg-white border border-[#e7e0d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-primary" />
                    Tanggal Mulai Publikasi
                  </label>
                  <input
                    type="date"
                    value={configData.startDate || ''}
                    onChange={(e) => configData.setStartDate(e.target.value)}
                    className="w-full bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-primary text-stone-800 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                    <Clock size={14} className="text-primary" />
                    Hari Libur / Skip Posting (Opsional)
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                      const isSkipped = configData.skipDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => configData.toggleSkipDay(day)}
                          className={`py-2 rounded-lg text-[11px] font-semibold border transition-all text-center ${
                            isSkipped
                              ? 'bg-rose-50 border-rose-200 text-rose-600 line-through'
                              : 'bg-[#f6f3ee] border-[#e7e0d4] text-stone-700 hover:border-primary/40'
                          }`}
                          title={isSkipped ? `Hari ${day} dilewati (tidak posting)` : `Posting pada hari ${day}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Format Konten (Single Image, Carousel, Reels) */}
            <div className="bg-white border border-[#e7e0d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <LayoutGrid size={14} className="text-primary" />
                  Format Konten
                </label>
                <span className="text-[11px] text-stone-500">Pilih format yang ingin dibuat</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: 'Single', title: 'Single Image', desc: 'Infografik / Quote Edukasi' },
                  { id: 'Carousel', title: 'Carousel', desc: '5 Slide Micro-Learning' },
                  { id: 'Reels', title: 'Reels / Video', desc: 'Video Pendek Edukasi 30s' },
                ].map((fmt) => {
                  const isSelected = configData.formats.includes(fmt.id);
                  return (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => configData.toggleFormat(fmt.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-xs'
                          : 'bg-[#f6f3ee] border-[#e7e0d4] text-stone-700 hover:border-stone-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{fmt.title}</span>
                        {isSelected && <CheckCircle2 size={13} className="text-white shrink-0" />}
                      </div>
                      <p className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-stone-500'}`}>
                        {fmt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Ringkasan Funnel yang Direkomendasikan */}
            <div className="bg-white border border-[#e7e0d4] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Layers size={14} className="text-primary" />
                  Alokasi Funnel (Jumlah Postingan)
                </label>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                  Total: {totalPosts} Postingan
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    key: 'tofu',
                    label: 'TOFU (Awareness)',
                    desc: 'Jangkau audiens baru & bangun rasa ingin tahu',
                    badge: 'bg-primary/10 text-primary border-primary/20'
                  },
                  {
                    key: 'mofu',
                    label: 'MOFU (Trust/Nurture)',
                    desc: 'Edukasi mendalam & bukti keahlian solusi',
                    badge: 'bg-amber-50 text-amber-800 border-amber-200'
                  },
                  {
                    key: 'bofu',
                    label: 'BOFU (Conversion)',
                    desc: 'Arahkan ke link bio / penawaran produk',
                    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  },
                ].map(({ key, label, desc, badge }) => (
                  <div key={key} className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl flex flex-col justify-between">
                    <div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded border inline-block mb-1.5 ${badge}`}>
                        {label}
                      </span>
                      <p className="text-[10px] text-stone-500 leading-snug mb-2">{desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={configData.ratio[key as keyof typeof configData.ratio]}
                        onChange={(e) => {
                          configData.setRatio({
                            ...configData.ratio,
                            [key]: Math.max(0, parseInt(e.target.value) || 0),
                          });
                          if (configData.setHasUserFunnelOverride) {
                            configData.setHasUserFunnelOverride(true);
                          }
                        }}
                        className="w-full bg-white border border-[#e7e0d4] rounded-lg py-1.5 text-center text-xs font-bold text-stone-900 focus:outline-none focus:border-primary"
                      />
                      <span className="text-[11px] text-stone-500 font-medium">post</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Blok Rasional & Rekomendasi Funnel Strategy */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 sm:p-4.5 text-xs text-stone-700 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <Sparkles size={14} />
                  <span>
                    {projectFunnelStrategy
                      ? `Rasional Corong Konten: ${activeSharedContext?.brand_context?.brand_name || 'Proyek Aktif'}`
                      : 'Rasional Corong Konten (Funnel Authority)'}
                  </span>
                </div>
                {projectFunnelStrategy && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Fakta Strategi Proyek
                  </span>
                )}
              </div>
              <p className="text-stone-600 leading-relaxed text-[11px] sm:text-xs">
                {projectFunnelStrategy
                  ? projectFunnelStrategy.distribution.reasoning
                  : 'Distribusi corong (TOFU/MOFU/BOFU) disusun secara proporsional sesuai sasaran awareness, positioning, dan penawaran aktif proyek.'}
              </p>
            </div>

            {/* 6. Accordion Pengaturan Lanjutan */}
            <div className="border border-[#e7e0d4] rounded-2xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="w-full px-4 sm:px-5 py-3.5 bg-[#f6f3ee]/60 hover:bg-[#f6f3ee] flex items-center justify-between text-xs font-bold text-stone-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-primary" />
                  <span>Pengaturan Lanjutan (Opsional untuk Penyesuaian Detail)</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-500 text-[11px]">
                  <span>{isAdvancedOpen ? 'Tutup' : 'Buka'}</span>
                  {isAdvancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {isAdvancedOpen && (
                <div className="p-4 sm:p-5 border-t border-[#e7e0d4] space-y-5 bg-[#fffdf8]">
                  {/* Target Demografi: Gender & Umur */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Target Gender" icon={Users}>
                      <div className="grid grid-cols-3 gap-2">
                        {['Both', 'Male', 'Female'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => configData.setGender(g)}
                            className={`py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              configData.gender === g
                                ? 'bg-primary border-primary text-white'
                                : 'bg-[#f6f3ee] border-[#e7e0d4] text-stone-700 hover:border-stone-400'
                            }`}
                          >
                            {g === 'Both' ? 'Semua' : g === 'Male' ? 'Pria' : 'Wanita'}
                          </button>
                        ))}
                      </div>
                    </InputField>

                    <InputField
                      label={`Rentang Umur: ${configData.ageRange[0]} - ${configData.ageRange[1]} Tahun`}
                      icon={Users}
                    >
                      <div className="flex items-center gap-3 pt-1">
                        <input
                          type="range"
                          min="15"
                          max="65"
                          value={configData.ageRange[0]}
                          onChange={(e) =>
                            configData.setAgeRange([
                              parseInt(e.target.value),
                              configData.ageRange[1],
                            ])
                          }
                          className="w-full accent-primary bg-stone-200"
                        />
                        <input
                          type="range"
                          min="15"
                          max="65"
                          value={configData.ageRange[1]}
                          onChange={(e) =>
                            configData.setAgeRange([
                              configData.ageRange[0],
                              parseInt(e.target.value),
                            ])
                          }
                          className="w-full accent-primary bg-stone-200"
                        />
                      </div>
                    </InputField>
                  </div>

                  {/* Brand Voices */}
                  <div className="space-y-2">
                    <InputField label="Karakter Suara (Brand Voice)" icon={Mic2}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          'The Efficiency Expert',
                          'The Provocative Leader',
                          'The Data Scientist',
                          'The Empathetic Mentor',
                          'The Visionary Pioneer',
                        ].map((v) => {
                          const isSel = configData.selectedVoices?.includes(v);
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => configData.toggleVoice(v)}
                              className={`p-2.5 text-left border rounded-xl text-xs transition-all ${
                                isSel
                                  ? 'border-primary bg-primary/10 font-bold text-primary'
                                  : 'border-[#e7e0d4] bg-[#f6f3ee] text-stone-700 hover:border-stone-400'
                              }`}
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    </InputField>
                  </div>

                  {/* Hook Mix & Reference Type */}
                  <div className="space-y-3">
                    <InputField label="Psychological Hooks Mix (%)" icon={Filter}>
                      <div className="space-y-2">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="flex gap-2">
                            <select
                              value={configData.hookMix?.[i]?.type || 'Call-Out'}
                              onChange={(e) => {
                                configData.updateHookMix(i, 'type', e.target.value);
                                configData.setHasUserHookOverride?.(true);
                              }}
                              className="flex-1 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-primary"
                            >
                              {['Call-Out', 'Curiosity Gap', 'Social Proof', 'Negativity Bias', 'Authority', 'Relatability'].map((h) => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={configData.hookMix?.[i]?.percentage || 0}
                              onChange={(e) => {
                                configData.updateHookMix(i, 'percentage', parseInt(e.target.value) || 0);
                                configData.setHasUserHookOverride?.(true);
                              }}
                              className="w-20 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-center text-xs text-stone-900 focus:outline-none focus:border-primary"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-4 p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl max-w-sm mt-3 text-xs">
                        {['Logika AI', 'Humanis'].map((type) => (
                          <label key={type} className="flex items-center gap-2 cursor-pointer">
                            <div
                              onClick={() => configData.setReferenceType(type)}
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                configData.referenceType === type ? 'border-primary bg-primary/15' : 'border-stone-300 bg-white'
                              }`}
                            >
                              {configData.referenceType === type && <div className="w-2 h-2 bg-primary rounded-full" />}
                            </div>
                            <span className={configData.referenceType === type ? 'text-[#1f2933] font-bold' : 'text-stone-600'}>
                              {type}
                            </span>
                          </label>
                        ))}
                      </div>
                    </InputField>
                  </div>

                  {/* Goal Formula & Detail CTA */}
                  <div className="space-y-3">
                    <InputField label="Master Goal Formula" icon={Sparkles}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {[
                          { id: 'SALES', title: 'Penjualan', desc: 'Fokus konversi & penutupan transaksi sales.' },
                          { id: 'AWARENESS', title: 'Awareness & Soft Selling', desc: 'Informasikan audiens sembari sounding.' },
                          { id: 'FOLLOWER', title: 'Mencari Follower', desc: 'Mendorong respon komen & menambah penonton.' },
                          { id: 'LAUNCH', title: 'Publikasi untuk Brand-produk baru', desc: 'Peluncuran entitas komersial perdana.' },
                        ].map((formula) => {
                          const isSel = configData.selectedFormula === formula.title;
                          return (
                            <button
                              key={formula.id}
                              type="button"
                              onClick={() => {
                                configData.setSelectedFormula(formula.title);
                                configData.setHasUserFormulaOverride?.(true);
                              }}
                              className={`p-2.5 text-left border rounded-xl transition-all ${
                                isSel ? 'border-primary bg-primary/10 font-bold' : 'border-[#e7e0d4] bg-[#f6f3ee] hover:border-stone-400'
                              }`}
                            >
                              <h4 className="text-xs font-bold text-[#1f2933]">{formula.title}</h4>
                              <p className="text-[10px] text-stone-500">{formula.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-stone-600 font-semibold">Pilihan Call-to-Action (CTA)</label>
                        <div className="flex flex-wrap gap-2">
                          {['Link Bio', 'DM', 'WhatsApp', 'Komentar'].map((cta) => {
                            const isSel = configData.selectedCTAs?.includes(cta);
                            return (
                              <button
                                key={cta}
                                type="button"
                                onClick={() => {
                                  configData.toggleCTA(cta);
                                  configData.setHasUserCtaOverride?.(true);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                                  isSel ? 'bg-primary border-primary text-white font-bold' : 'bg-[#f6f3ee] border-[#e7e0d4] text-stone-700 hover:border-stone-400'
                                }`}
                              >
                                {cta}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </InputField>
                  </div>

                  {/* Durasi Carousel & Reels */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700">Jumlah Slide Carousel</label>
                      <input
                        type="number"
                        min="3"
                        max="10"
                        value={configData.carouselSlides}
                        onChange={(e) => configData.setCarouselSlides(parseInt(e.target.value) || 5)}
                        className="w-full bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-stone-700">Target Durasi Reels</label>
                      <select
                        value={configData.reelsDuration}
                        onChange={(e) => configData.setReelsDuration(e.target.value)}
                        className="w-full bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-primary"
                      >
                        <option value="15s">15 Detik (Ringkas / Hook Cepat)</option>
                        <option value="30s">30 Detik (Standar Edukasi Funnel)</option>
                        <option value="60s">60 Detik (Pembahasan Lengkap)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error banner if exceeding quota */}
            {totalPosts > (accessStatus?.maxContent || 30) && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>Melebihi batas maksimal ({accessStatus?.maxContent || 30} postingan). Silakan kurangi alokasi funnel di atas.</span>
              </div>
            )}
          </div>

          {/* Footer with Summary & Action Button */}
          <div className="p-4 sm:p-6 border-t border-[#e7e0d4] bg-[#fffdf8] shrink-0 space-y-3">
            {/* Short summary text */}
            <div className="flex items-start sm:items-center justify-between gap-2 text-xs text-stone-600">
              <div className="flex items-center gap-1.5">
                <Info size={14} className="text-primary shrink-0 mt-0.5 sm:mt-0" />
                <span>
                  Anda akan membuat kalender konten <strong>[{formatList}]</strong> untuk <strong>[{projectName}]</strong> mulai <strong>[{formattedStartDate}]</strong>.
                </span>
              </div>
            </div>

            {/* Loading Indicator inside modal */}
            {isLoading && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3 text-xs text-primary animate-pulse">
                <Loader2 size={16} className="animate-spin text-primary shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-bold">Sedang merancang strategi konten via Gemini AI...</p>
                  <p className="text-[11px] text-blue-700">Menyusun headline, naskah hook, alur funnel, dan konsep visual. Mohon tunggu beberapa detik.</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-1">
              {!isLoading && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 border border-[#e7e0d4] hover:bg-stone-100 rounded-xl text-xs font-semibold text-stone-700 transition-colors"
                >
                  Batal
                </button>
              )}

              <button
                type="button"
                disabled={isGenerateDisabled}
                onClick={handleStartGeneration}
                className={`w-full sm:w-auto px-6 py-3 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                  isGenerateDisabled
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-blue-700 text-white shadow-blue-900/10'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Sedang Memproses Kalender...</span>
                  </>
                ) : (
                  <>
                    <Zap size={15} className="fill-white" />
                    <span>Buat Kalender Konten ({totalPosts} Post)</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
