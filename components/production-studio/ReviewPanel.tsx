'use client';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Layers,
  Video,
  BrainCircuit,
  Target,
  CheckSquare,
  Copy,
  Check,
  ChevronDown,
  Edit3,
} from 'lucide-react';

export default function ReviewPanel(props: any) {
  const {
    activeItem,
    activeContext,
    readinessChecklist,
    isEditingMode,
    setIsEditingMode,
    reviewOutput,
    getInitialDraft,
    saveReviewOutput,
    handleCopyText,
    copiedStates,
    setActiveTab,
  } = props;

  // Determine standard checkpoint status using existing data
  const hasHeadline = Boolean(activeItem?.headline?.trim());
  const hasBody = Boolean(activeItem?.body?.trim());
  const hasVisual = Boolean(activeItem?.visual?.trim());
  const hasCaption = Boolean(activeItem?.caption?.trim());
  const hasFunnel = Boolean(activeItem?.jenis?.trim());

  const contentStatus: 'READY' | 'NEEDS ATTENTION' | 'MISSING' =
    hasHeadline && hasBody ? 'READY' : hasHeadline ? 'NEEDS ATTENTION' : 'MISSING';

  const visualStatus: 'READY' | 'NEEDS ATTENTION' | 'MISSING' =
    hasVisual ? 'READY' : 'NEEDS ATTENTION';

  const captionStatus: 'READY' | 'NEEDS ATTENTION' | 'MISSING' =
    hasCaption ? 'READY' : 'NEEDS ATTENTION';

  const funnelStatus: 'READY' | 'NEEDS ATTENTION' | 'MISSING' =
    hasFunnel ? 'READY' : 'MISSING';

  const isFullyReady = readinessChecklist?.percentage === 100;
  const productionStatus: 'READY' | 'NEEDS ATTENTION' | 'MISSING' =
    isFullyReady ? 'READY' : (readinessChecklist?.percentage || 0) >= 50 ? 'NEEDS ATTENTION' : 'MISSING';

  const checkpoints = [
    { label: 'Content', status: contentStatus, desc: hasHeadline ? activeItem.headline : 'Headline kosong' },
    { label: 'Visual', status: visualStatus, desc: hasVisual ? activeItem.visual : 'Arahan visual kosong' },
    { label: 'Caption', status: captionStatus, desc: hasCaption ? 'Rencana caption tersedia' : 'Caption belum ada' },
    { label: 'Funnel', status: funnelStatus, desc: hasFunnel ? activeItem.jenis : 'Stage belum ditentukan' },
    { label: 'Production', status: productionStatus, desc: `${readinessChecklist?.percentage || 0}% kesiapan data` },
  ];

  const getStatusBadge = (status: 'READY' | 'NEEDS ATTENTION' | 'MISSING') => {
    switch (status) {
      case 'READY':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100/80 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <Check size={11} className="text-emerald-700" />
            READY
          </span>
        );
      case 'NEEDS ATTENTION':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100/80 text-amber-800 border border-amber-300 flex items-center gap-1">
            <AlertCircle size={11} className="text-amber-700" />
            NEEDS ATTENTION
          </span>
        );
      case 'MISSING':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100/80 text-rose-800 border border-rose-300 flex items-center gap-1">
            <AlertCircle size={11} className="text-rose-700" />
            MISSING
          </span>
        );
    }
  };

  const reportText = reviewOutput || (getInitialDraft ? getInitialDraft('review', activeItem, activeContext) : '');

  return (
    <div className="space-y-5 flex-1 font-sans">
      
      {/* 1. REVIEW MAIN SUMMARY: "Apakah konten ini siap diproduksi / dipublish?" */}
      <div className={`p-5 rounded-2xl border shadow-xs transition-all ${
        isFullyReady 
          ? 'bg-[#fffdf8] border-emerald-300/80' 
          : 'bg-[#fffdf8] border-amber-300/80'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e7e0d4]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {isFullyReady ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-amber-600 shrink-0" />
              )}
              <h3 className="text-sm font-bold text-[#1f2933]">
                {isFullyReady
                  ? 'Konten Siap Masuk Jalur Produksi'
                  : 'Konten Memerlukan Perhatian Sebelum Produksi'}
              </h3>
            </div>
            <p className="text-xs text-stone-600">
              {isFullyReady
                ? 'Seluruh parameter penawaran, arahan visual, dan naskah telah memenuhi standar kelayakan konten.'
                : `Terdapat beberapa field atau konteks yang belum terisi optimal (${readinessChecklist?.percentage || 0}% kesiapan).`}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-stone-500 font-medium">Skor Kesiapan:</span>
            <span className={`px-3 py-1 rounded-xl text-xs font-bold font-mono border ${
              isFullyReady
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {readinessChecklist?.percentage || 0}%
            </span>
          </div>
        </div>

        {/* 2. CHECKPOINT STATUS BAR */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-4">
          {checkpoints.map((cp) => (
            <div
              key={cp.label}
              className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800">{cp.label}</span>
                {getStatusBadge(cp.status)}
              </div>
              <p className="text-[11px] text-stone-500 line-clamp-1 leading-snug">
                {cp.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CHOOSE PRODUCTION PATH (Primary Actions) */}
      <div className="bg-[#fffdf8] rounded-2xl p-4.5 border border-[#e7e0d4] space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-primary" />
            <h4 className="text-xs font-bold text-[#1f2933] uppercase tracking-wider">
              Pilih Format Produksi
            </h4>
          </div>
          <span className="text-[11px] text-stone-500">
            Klik format untuk langsung menuju workspace eksekusi
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Path Image */}
          <button
            onClick={() => setActiveTab('image')}
            className="p-3.5 bg-[#f6f3ee] hover:bg-[#fffdf8] hover:border-primary border border-[#e7e0d4] rounded-xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs group-hover:text-primary transition">
                <ImageIcon size={14} className="text-sky-600" />
                <span>Single Image</span>
              </div>
              <ArrowRight size={12} className="text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </div>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
              Prompt visual Imagen/Midjourney siap pakai dengan rasio aspek teroptimasi.
            </p>
          </button>

          {/* Path Carousel */}
          <button
            onClick={() => setActiveTab('carousel')}
            className="p-3.5 bg-[#f6f3ee] hover:bg-[#fffdf8] hover:border-primary border border-[#e7e0d4] rounded-xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs group-hover:text-primary transition">
                <Layers size={14} className="text-primary" />
                <span>Carousel</span>
              </div>
              <ArrowRight size={12} className="text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </div>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
              Struktur slide berurutan dengan hook psikologis, pembuktian, dan CTA swipe.
            </p>
          </button>

          {/* Path Video */}
          <button
            onClick={() => setActiveTab('video')}
            className="p-3.5 bg-[#f6f3ee] hover:bg-[#fffdf8] hover:border-primary border border-[#e7e0d4] rounded-xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 text-stone-900 font-bold text-xs group-hover:text-primary transition">
                <Video size={14} className="text-rose-600" />
                <span>Video / Reels</span>
              </div>
              <ArrowRight size={12} className="text-stone-400 group-hover:text-primary group-hover:translate-x-0.5 transition" />
            </div>
            <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
              Naskah monolog dialog, 3 scene Google Flow, dan opsi render JSON2Video.
            </p>
          </button>
        </div>
      </div>

      {/* 4. PROGRESSIVE DISCLOSURE: DETAIL SECTIONS */}
      <div className="space-y-2.5">
        
        {/* Detail Konten & Naskah */}
        <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
          <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-primary" />
              <span>Detail Konten (Headline, Naskah Kasar, Call to Action)</span>
            </div>
            <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">Headline Utama</span>
              <p className="text-sm font-bold text-stone-900 mt-0.5">{activeItem?.headline || '-'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Call to Action (CTA)</span>
                <p className="text-primary font-bold mt-0.5">{activeItem?.cta || '-'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Objective / Tujuan</span>
                <p className="text-stone-800 mt-0.5">{activeItem?.tujuan || '-'}</p>
              </div>
            </div>

            {activeItem?.body && (
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Naskah Kasar / Body</span>
                <p className="text-stone-700 leading-relaxed bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4] mt-1 whitespace-pre-wrap">
                  {activeItem.body}
                </p>
              </div>
            )}

            {activeItem?.caption && (
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Rencana Caption</span>
                <p className="text-stone-700 leading-relaxed bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4] mt-1 whitespace-pre-wrap">
                  {activeItem.caption}
                </p>
              </div>
            )}
          </div>
        </details>

        {/* Detail Visual & Format */}
        <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
          <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <ImageIcon size={14} className="text-primary" />
              <span>Detail Visual &amp; Format Target</span>
            </div>
            <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Format Konten Rencana</span>
                <p className="text-stone-900 font-semibold mt-0.5">{activeItem?.format || '-'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Funnel Stage Terkait</span>
                <p className="text-stone-900 font-semibold mt-0.5">{activeItem?.jenis || '-'}</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">Arahan Visual (Visual Direction)</span>
              <p className="text-stone-700 italic bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4] mt-1 leading-relaxed">
                {activeItem?.visual || '-'}
              </p>
            </div>
          </div>
        </details>

        {/* Detail Funnel & Konteks Brand */}
        <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
          <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-primary" />
              <span>Detail Funnel &amp; Konteks Strategis Brand</span>
            </div>
            <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">Nama Brand &amp; Voice</span>
              <p className="text-stone-900 font-semibold mt-0.5">
                {activeContext?.brand_context?.brand_name || '-'} &bull; {activeContext?.brand_context?.brand_voice || '-'}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">Target Audiens Utama</span>
              <p className="text-stone-800 mt-0.5">{activeContext?.audience_context?.primary_audience || '-'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">Core Positioning</span>
              <p className="text-stone-800 mt-0.5 leading-snug">{activeContext?.strategy_context?.positioning || '-'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase block">Penawaran Utama (Main Offer)</span>
              <p className="text-primary font-bold mt-0.5">{activeContext?.strategy_context?.main_offer || '-'}</p>
            </div>
            {activeContext?.audience_context?.pain_points && (
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold text-stone-500 uppercase block">Pain Points Terpetakan</span>
                <p className="text-rose-700 mt-0.5 leading-snug">{activeContext.audience_context.pain_points.join(', ')}</p>
              </div>
            )}
          </div>
        </details>

        {/* Detail Production Checklist */}
        <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
          <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <CheckSquare size={14} className="text-emerald-600" />
              <span>Detail Parameter Production Readiness</span>
            </div>
            <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-3 text-xs">
            {/* Visual Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-stone-500 font-medium">
                <span>Kelayakan Parameter</span>
                <span className="font-bold text-primary font-mono">{readinessChecklist?.percentage || 0}%</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden border border-[#e7e0d4]">
                <motion.div
                  className="bg-primary h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${readinessChecklist?.percentage || 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Checklist items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {readinessChecklist?.checks?.map((check: any) => (
                <div key={check.id} className="p-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl flex items-center justify-between">
                  <span className="text-stone-700">{check.label}</span>
                  {check.status ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">
                      <Check size={11} /> Valid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-700 font-bold text-[10px] bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                      <AlertCircle size={11} /> Kosong
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </details>

        {/* AI Strategic Alignment Report */}
        <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
          <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <BrainCircuit size={14} className="text-primary" />
              <span>AI Strategic Alignment Report &amp; Catatan Evaluasi</span>
            </div>
            <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
          </summary>
          <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Laporan evaluasi keselarasan konten dan brand positioning
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingMode((prev: any) => !prev)}
                  className="px-3 py-1 rounded-xl font-bold text-xs bg-[#f6f3ee] hover:bg-stone-200 text-stone-700 border border-[#e7e0d4] transition cursor-pointer"
                >
                  {isEditingMode ? 'Lihat Hasil' : 'Edit Laporan'}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyText('review_report', reportText, 'none')}
                  className="p-1.5 bg-[#f6f3ee] hover:bg-stone-200 text-stone-600 rounded-xl border border-[#e7e0d4] transition cursor-pointer"
                  title="Salin Laporan"
                >
                  {copiedStates['review_report'] ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {isEditingMode ? (
              <textarea
                value={reportText}
                onChange={(e) => saveReviewOutput?.(e.target.value)}
                className="w-full h-64 p-3 bg-[#fffdf8] text-stone-800 text-xs font-sans leading-relaxed resize-none focus:outline-none focus:border-primary custom-scrollbar rounded-xl border border-[#e7e0d4]"
                placeholder="Sesuaikan laporan evaluasi strategis di sini..."
              />
            ) : (
              <div className="whitespace-pre-wrap font-sans text-stone-800 text-xs leading-relaxed bg-[#f6f3ee] p-4 rounded-xl border border-[#e7e0d4] max-h-80 overflow-y-auto custom-scrollbar">
                {reportText}
              </div>
            )}
          </div>
        </details>

      </div>

    </div>
  );
}
