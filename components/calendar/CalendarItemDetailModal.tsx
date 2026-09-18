'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Image as ImageIcon,
  Video,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  X,
  Loader2,
  Target,
  Anchor,
  Pin,
} from 'lucide-react';
import { ContentItem } from './types';
import { getActiveProjectId, saveProjectSelectedItem } from '@/lib/storage';
import { PromptNextStepLinks } from '@/components/production-studio/PromptNextStepLinks';
import ProductionProgressWidget from './ProductionProgressWidget';
import { ProductionProgress } from '@/lib/content-contract';

function getStudioCtaLabel(item?: ContentItem | null): string {
  return 'Lanjutkan Konten Ini';
}

const safeCopyToClipboard = async (text: string) => {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Clipboard write failed:', error);
    return false;
  }
};

interface CalendarItemDetailModalProps {
  editingItem: ContentItem | null;
  onClose: () => void;
  isEditAccessLocked: boolean;
  setShowUnlockModal: (show: boolean) => void;
  onUpdateItem?: (item: ContentItem) => void;
  onRegenerateItem?: (itemNo: number, instructions: string) => Promise<void>;
  productionAsset: { type: string; title: string; content: string } | null;
  setProductionAsset: (asset: { type: string; title: string; content: string } | null) => void;
  isGeneratingAsset: boolean;
  copiedAsset: boolean;
  setCopiedAsset: (copied: boolean) => void;
  handleGenerateProductionAsset: (assetType: 'brief' | 'caption' | 'image' | 'carousel' | 'video') => void;
}

export const CalendarItemDetailModal: React.FC<CalendarItemDetailModalProps> = ({
  editingItem,
  onClose,
  onUpdateItem,
  onRegenerateItem,
  productionAsset,
  isGeneratingAsset,
  copiedAsset,
  setCopiedAsset,
  handleGenerateProductionAsset,
}) => {
  const router = useRouter();
  const [revisionInstructions, setRevisionInstructions] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isOpeningStudio, setIsOpeningStudio] = useState(false);
  const [showDraftNextStepLinks, setShowDraftNextStepLinks] = useState(false);

  if (!editingItem) return null;

  const handleUpdateProgress = (newProgress: Partial<ProductionProgress>) => {
    const updated: ContentItem = {
      ...editingItem,
      productionProgress: {
        ...(editingItem.productionProgress || {
          briefReady: true,
          promptCopied: false,
          assetCreated: false,
          captionCopied: false,
          readyToPost: false,
          alreadyPosted: false,
        }),
        ...newProgress,
      },
    };
    if (onUpdateItem) {
      onUpdateItem(updated);
    }
  };

  const handleSendToProductionStudio = () => {
    setIsOpeningStudio(true);
    const resolvedProjectId =
      editingItem?.project_id ||
      editingItem?.projectId ||
      getActiveProjectId() ||
      '';

    if (resolvedProjectId) {
      saveProjectSelectedItem(resolvedProjectId, editingItem);
    }

    const tab =
      editingItem.primaryAssetType === 'carousel'
        ? 'carousel'
        : editingItem.primaryAssetType === 'video'
        ? 'video'
        : 'image';

    const contentItemId = editingItem.content_item_id || String(editingItem.no);
    const query = new URLSearchParams({
      tab,
      ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
      contentItemId,
      itemNo: String(editingItem.no),
    });

    router.push(`/production-studio?${query.toString()}`);
  };

  const handleCopyDetail = async () => {
    const text = `[${editingItem.jenis}] ${editingItem.headline}\nTanggal: ${editingItem.tanggal}\nFormat: ${editingItem.format}\n\nBody:\n${editingItem.body}\n\nCaption:\n${editingItem.caption}\n\nVisual Plan:\n${editingItem.visual}\n\nKeterangan/Hook:\n${editingItem.keterangan}`;
    const copied = await safeCopyToClipboard(text);
    if (copied) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const isTofu = (editingItem.jenis || '').includes('TOFU');
  const isMofu = (editingItem.jenis || '').includes('MOFU');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#fffdf8] border border-[#e7e0d4] rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative text-stone-800 font-sans my-auto"
        >
          {/* Header */}
          <div className="p-5 md:p-6 border-b border-[#e7e0d4] bg-[#f6f3ee]/60 flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                    isTofu
                      ? 'bg-sky-100 text-sky-800 border border-sky-200'
                      : isMofu
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-primary/10 text-primary border border-primary/20'
                  }`}
                >
                  {editingItem.jenis}
                </span>
                <span className="text-xs text-stone-500">
                  Day {editingItem.no} • {editingItem.tanggal}
                </span>
                <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                  {editingItem.format}
                </span>
              </div>
              <h2 className="text-base md:text-lg font-bold text-[#1f2933] leading-snug">
                {editingItem.headline}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopyDetail}
                className="p-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-700 hover:text-stone-900 transition-all flex items-center gap-1.5 text-xs font-semibold"
                title="Salin Detail Konten"
              >
                {isCopied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                <span className="hidden sm:inline">{isCopied ? 'Tersalin' : 'Salin'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-500 hover:text-stone-800 transition-all"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Quick Action: Send to Production Studio */}
            <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-primary font-bold text-xs">
                  <Sparkles size={14} />
                  <span>Lanjutkan Konten Ini</span>
                </div>
                <p className="text-xs text-stone-600">
                  Buka Production Studio untuk membuat gambar, carousel, video, dan caption siap posting.
                </p>
              </div>
              <button
                onClick={handleSendToProductionStudio}
                disabled={isOpeningStudio}
                aria-busy={isOpeningStudio}
                className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
              >
                {isOpeningStudio ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Membuka Studio...</span>
                  </>
                ) : (
                  <>
                    <span>Lanjutkan Konten Ini</span>
                    <ExternalLink size={13} />
                  </>
                )}
              </button>
            </div>

            {/* Production Progress Checklist */}
            <ProductionProgressWidget
              item={editingItem}
              onUpdateProgress={handleUpdateProgress}
            />

            {/* Objective & Hook */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#f6f3ee]/60 border border-[#e7e0d4] p-4 rounded-2xl space-y-1">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Target size={13} className="text-[#b7791f]" />
                  Objective / Tujuan
                </span>
                <p className="text-xs text-[#1f2933]">{editingItem.tujuan || '-'}</p>
              </div>
              <div className="bg-[#f6f3ee]/60 border border-[#e7e0d4] p-4 rounded-2xl space-y-1">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Anchor size={13} className="text-primary" />
                  Hook Type & Dialect
                </span>
                <p className="text-xs text-[#1f2933]">{editingItem.hookType || '-'}</p>
              </div>
            </div>

            {/* Body Copywriting */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-2">
                <FileText size={13} className="text-primary" />
                Naskah / Body Konten
              </span>
              <div className="bg-[#f6f3ee]/60 border border-[#e7e0d4] p-4 rounded-2xl text-xs text-[#1f2933] whitespace-pre-wrap leading-relaxed font-sans">
                {editingItem.body}
              </div>
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <FileText size={13} className="text-primary" />
                <span>Caption & Hashtags</span>
              </span>
              <div className="bg-[#f6f3ee]/60 border border-[#e7e0d4] p-4 rounded-2xl text-xs text-stone-700 whitespace-pre-wrap leading-relaxed">
                {editingItem.caption}
              </div>
            </div>

            {/* Visual Direction & Keterangan */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-sky-600" />
                  Visual Direction / Scene
                </span>
                <div className="bg-[#f6f3ee]/60 border border-[#e7e0d4] p-3.5 rounded-2xl text-xs text-stone-700">
                  {editingItem.visual || '-'}
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Pin size={13} className="text-[#b7791f]" />
                  <span>Catatan Eksekusi & CTA</span>
                </span>
                <div className="bg-[#f6f3ee]/60 border border-[#e7e0d4] p-3.5 rounded-2xl text-xs text-stone-700">
                  {editingItem.keterangan || '-'}
                </div>
              </div>
            </div>

            {/* Carousel Breakdown if available */}
            {editingItem.carousel_plan && (
              <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-800 font-semibold flex items-center gap-1.5">
                    <Layers size={14} className="text-primary" />
                    Carousel Plan ({editingItem.carousel_plan.slide_count || editingItem.carousel_plan.slides?.length || 0} Slides)
                  </span>
                  {editingItem.carousel_plan.primary_cta_text && (
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                      CTA: {editingItem.carousel_plan.primary_cta_text}
                    </span>
                  )}
                </div>
                {editingItem.carousel_plan.slides && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                    {editingItem.carousel_plan.slides.map((s: any, idx: number) => (
                      <div key={idx} className="bg-[#fffdf8] border border-[#e7e0d4] p-3 rounded-xl space-y-1 text-xs">
                        <div className="flex items-center justify-between text-stone-600 font-semibold">
                          <span>Slide #{s.slide_number || idx + 1} ({s.slide_type || 'Content'})</span>
                        </div>
                        <p className="font-semibold text-[#1f2933] leading-snug">{s.headline_or_focus || s.main_text || ''}</p>
                        {s.body_text && <p className="text-stone-600 line-clamp-2">{s.body_text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick AI Asset Generation */}
            <div className="border-t border-[#e7e0d4] pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" />
                  Aset Produksi Cepat via AI
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { type: 'brief', label: 'Brief Lengkap', icon: FileText },
                  { type: 'caption', label: 'Caption', icon: FileText },
                  { type: 'image', label: 'Gambar', icon: ImageIcon },
                  { type: 'carousel', label: 'Carousel', icon: Layers },
                  { type: 'video', label: 'Video', icon: Video },
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    disabled={isGeneratingAsset}
                    onClick={() => handleGenerateProductionAsset(type as any)}
                    className="px-3 py-1.5 bg-[#f6f3ee] hover:bg-primary hover:text-white border border-[#e7e0d4] hover:border-primary rounded-xl text-xs font-medium text-stone-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Icon size={13} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Generated Asset View */}
              {isGeneratingAsset && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-2">
                  <Loader2 size={16} className="animate-spin text-primary mx-auto" />
                  <p className="text-xs text-primary font-medium">Caleco AI sedang menyusun draft aset produksi...</p>
                </div>
              )}

              {productionAsset && !isGeneratingAsset && (
                <div className="bg-[#fffdf8] border border-primary/30 rounded-2xl p-4 space-y-2 relative shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary" />
                      <span>{productionAsset.title}</span>
                    </span>
                    <button
                      onClick={async () => {
                        const copied = await safeCopyToClipboard(productionAsset.content);
                        if (copied) {
                          setCopiedAsset(true);
                          setShowDraftNextStepLinks(true);
                          setTimeout(() => setCopiedAsset(false), 2000);
                        }
                      }}
                      className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/30 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAsset ? <Check size={12} /> : <Copy size={12} />}
                      {copiedAsset ? 'Tersalin' : 'Salin Draft'}
                    </button>
                  </div>
                  <div className="text-xs text-stone-800 whitespace-pre-wrap font-sans bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4] max-h-48 overflow-y-auto leading-relaxed">
                    {productionAsset.content}
                  </div>
                  {/* Next step links when draft/asset is copied */}
                  <PromptNextStepLinks 
                    show={showDraftNextStepLinks} 
                    onDismiss={() => setShowDraftNextStepLinks(false)}
                    className="mt-2" 
                  />
                </div>
              )}
            </div>

            {/* AI Revision Box */}
            <div className="border-t border-[#e7e0d4] pt-5 space-y-3">
              <span className="text-xs text-stone-700 font-semibold flex items-center gap-1.5">
                <RefreshCw size={13} className="text-primary" />
                Instruksi Revisi Konten Ini via AI
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={revisionInstructions}
                  onChange={(e) => setRevisionInstructions(e.target.value)}
                  placeholder="Contoh: Buat headline lebih provokatif, ubah CTA jadi follow Instagram..."
                  className="flex-1 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-primary"
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && revisionInstructions.trim() && onRegenerateItem && !isRevising) {
                      setIsRevising(true);
                      await onRegenerateItem(editingItem.no, revisionInstructions);
                      setIsRevising(false);
                      setRevisionInstructions('');
                    }
                  }}
                />
                <button
                  disabled={!revisionInstructions.trim() || isRevising || !onRegenerateItem}
                  onClick={async () => {
                    if (!revisionInstructions.trim() || !onRegenerateItem || isRevising) return;
                    setIsRevising(true);
                    await onRegenerateItem(editingItem.no, revisionInstructions);
                    setIsRevising(false);
                    setRevisionInstructions('');
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shrink-0"
                >
                  {isRevising ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Revisi
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
