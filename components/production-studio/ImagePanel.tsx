'use client';
import React from 'react';
import { 
  Sparkles, Loader2, Copy, Check, FileText, Image as ImageIcon, 
  Sliders, Target, CheckCircle2, Download, RefreshCw, ChevronDown, 
  AlertCircle, UserCheck 
} from 'lucide-react';
import { PromptNextStepLinks } from './PromptNextStepLinks';
import CharacterSelector from './CharacterSelector';
import { injectCharacterToPrompt } from '@/lib/character-prompt';

export default function ImagePanel(props: any) {
  const {
    activeItem,
    activeContext,
    imageAnglesPackage,
    selectedAngleId,
    setSelectedAngleId,
    generatedImages,
    imageGeneratingKey,
    handleCopyText,
    copiedStates,
    handleGenerateImage,
    nextStepVisibleKeys,
    handleDismissNextStep,
    imageOutput,
    getInitialDraft,
    sourceItem,
    handleDownloadImage,
    imageGenerateError,
    savedCharacters,
    selectedCharacterId,
    handleSelectCharacter,
    handleCreateCharacterClick,
    characterDNA,
  } = props;

  if (!imageAnglesPackage || imageAnglesPackage.angles.length === 0) {
    const rawFallback = imageOutput || getInitialDraft('image', activeItem, activeContext);
    return (
      <div className="bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl p-6 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#e7e0d4]">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-[#1f2933]">Draft Naskah Image</h3>
          </div>
          <button
            onClick={() => handleCopyText('image_raw_draft', rawFallback, 'none')}
            className="px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] text-xs font-bold rounded-xl transition flex items-center gap-1.5 border border-[#e7e0d4]"
          >
            {copiedStates['image_raw_draft'] ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
            <span>{copiedStates['image_raw_draft'] ? 'Tersalin' : 'Salin Naskah'}</span>
          </button>
        </div>
        <div className="whitespace-pre-wrap font-mono text-stone-800 text-xs leading-relaxed bg-[#f6f3ee] p-4 rounded-xl border border-[#e7e0d4]">
          {rawFallback}
        </div>
      </div>
    );
  }

  const activeAngle = imageAnglesPackage.angles.find((a: any) => a.id === selectedAngleId) || imageAnglesPackage.angles[0];
  const recommendedAngleId = imageAnglesPackage.recommendedAngleId || 'A';
  const imageKey = `${sourceItem?.no || 1}_${activeAngle.id}`;
  const generatedImg = generatedImages[imageKey];
  const isGenerating = imageGeneratingKey === imageKey;
  const effectivePrompt = injectCharacterToPrompt(activeAngle.finalPrompt, characterDNA, 'image');

  return (
    <div className="space-y-4">
      {/* 1. ANGLE & CHARACTER SELECTOR */}
      <div className="bg-[#fffdf8] border border-[#e7e0d4] p-2.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
          {imageAnglesPackage.angles.map((angle: any) => {
            const isRecommended = angle.id === recommendedAngleId;
            const isSelected = selectedAngleId === angle.id;

            return (
              <button
                key={angle.id}
                onClick={() => setSelectedAngleId(angle.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-[#f6f3ee] border border-transparent'
                }`}
              >
                <span>{angle.name || `Angle ${angle.id}`}</span>
                {isRecommended && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-white/20 text-white border border-white/30'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <CharacterSelector
            savedCharacters={savedCharacters || []}
            selectedCharacterId={selectedCharacterId || null}
            onSelectCharacter={handleSelectCharacter}
            onCreateCharacter={handleCreateCharacterClick}
          />
          <div className="text-[11px] text-stone-500 font-medium px-2 hidden sm:block">
            Format: <span className="font-semibold text-stone-700">4:5 Vertical</span> &bull; {activeAngle.funnelStage || 'TOFU'}
          </div>
        </div>
      </div>

      {/* ERROR ALERT IF GENERATION FAILED */}
      {imageGenerateError && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs shadow-xs">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
          <p className="font-medium leading-relaxed">{imageGenerateError}</p>
        </div>
      )}

      {/* 2. RESULT / VISUAL PREVIEW & PRIMARY ACTIONS (Dominant Workspace Element) */}
      <div className="bg-[#fffdf8] border border-[#e7e0d4] p-5 rounded-2xl shadow-xs space-y-4">
        {generatedImg ? (
          /* STATE A: GAMBAR SUDAH DIBUAT */
          <div className="space-y-4">
            <div className="relative group rounded-xl overflow-hidden border border-[#e7e0d4] bg-[#f6f3ee] flex justify-center max-w-lg mx-auto shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImg.imageDataUrl}
                alt={`Visual Angle ${activeAngle.id}`}
                className="w-full h-auto object-contain max-h-[480px] rounded-xl"
              />
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/75 backdrop-blur-md rounded-md text-[10px] font-mono text-white border border-white/20">
                {generatedImg.model || 'gemini-3.1-flash-lite-image'}
              </div>
              {activeAngle.textOverlay && (
                <div className="absolute bottom-3 left-3 right-3 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white text-center text-xs font-semibold">
                  &ldquo;{activeAngle.textOverlay}&rdquo;
                </div>
              )}
            </div>

            {/* Action Bar: Dominant Download, Secondary Copy & Regenerate */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {/* Dominant Action */}
              <button
                onClick={() => handleDownloadImage(generatedImg.imageDataUrl, activeAngle.id)}
                className="px-5 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download size={14} />
                <span>Download Image</span>
              </button>

              {/* Secondary Action 1: Copy Prompt */}
              <button
                onClick={() => handleCopyText(`prompt_${selectedAngleId}`, effectivePrompt, 'promptCopied')}
                className="px-4 py-2.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] border border-[#e7e0d4] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedStates[`prompt_${selectedAngleId}`] ? (
                  <>
                    <Check size={13} className="text-primary" />
                    <span className="text-primary">Prompt Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>

              {/* Secondary Action 2: Regenerate */}
              <button
                onClick={() => handleGenerateImage(effectivePrompt, activeAngle.id)}
                disabled={isGenerating}
                className="px-4 py-2.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-stone-700 border border-[#e7e0d4] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-primary" />
                    <span>Regenerating...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={13} />
                    <span>Regenerate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* STATE B: BELUM DIBUAT / SEDANG DIBUAT (Clean Empty State with Dominant Action) */
          <div className="py-10 px-4 text-center border-2 border-dashed border-[#e7e0d4] rounded-xl bg-[#fcfaf6] flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <ImageIcon size={24} />
            </div>

            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-[#1f2933]">Visual belum dibuat</h4>
              <p className="text-xs text-stone-500 leading-relaxed">
                Generate visual resolusi tinggi berdasarkan strategi konten Angle {activeAngle.id} ({activeAngle.name}) langsung menggunakan model Imagen.
              </p>
              {characterDNA?.identity?.display_name && (
                <p className="text-[11px] text-primary font-semibold flex items-center justify-center gap-1">
                  <UserCheck size={12} />
                  <span>Karakter Aktif: {characterDNA.identity.display_name}</span>
                </p>
              )}
            </div>

            {/* DOMINANT ACTION BUTTON */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => handleGenerateImage(effectivePrompt, activeAngle.id)}
                disabled={isGenerating}
                className="px-6 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Generating Visual...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Generate Visual</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleCopyText(`prompt_${selectedAngleId}`, effectivePrompt, 'promptCopied')}
                className="px-4 py-2.5 bg-[#fffdf8] hover:bg-[#f6f3ee] text-stone-700 border border-[#e7e0d4] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {copiedStates[`prompt_${selectedAngleId}`] ? (
                  <>
                    <Check size={13} className="text-primary" />
                    <span className="text-primary">Prompt Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Next Step Links when prompt copied */}
      <PromptNextStepLinks
        show={Boolean(nextStepVisibleKeys?.[`prompt_${selectedAngleId}`])}
        onDismiss={() => handleDismissNextStep?.(`prompt_${selectedAngleId}`)}
      />

      {/* 3. CAPTION / KETERANGAN POSTINGAN (Clean, post-ready) */}
      {activeAngle.captionForPost && (
        <div className="bg-[#fffdf8] border border-[#e7e0d4] p-4.5 rounded-2xl space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText size={14} className="text-primary" />
              <span className="text-xs font-bold text-[#1f2933]">Caption Postingan (Siap Publish)</span>
            </div>
            <button
              onClick={() => handleCopyText(`caption_${activeAngle.id}`, activeAngle.captionForPost, 'captionCopied')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] text-xs font-bold rounded-xl transition cursor-pointer border border-[#e7e0d4]"
            >
              {copiedStates[`caption_${activeAngle.id}`] ? (
                <>
                  <Check size={12} className="text-primary" />
                  <span className="text-primary">Caption Tersalin</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Salin Caption</span>
                </>
              )}
            </button>
          </div>
          {activeAngle.captionInstruction && (
            <div className="text-[11px] text-stone-500 font-medium">
              {activeAngle.captionInstruction}
            </div>
          )}
          <div className="p-3.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-stone-900 font-sans text-xs leading-relaxed select-all whitespace-pre-wrap">
            {activeAngle.captionForPost}
          </div>
        </div>
      )}

      {/* 4. PROGRESSIVE DISCLOSURE: STRATEGY DETAILS (Default Collapsed) */}
      {activeAngle.strategyBrief && (
        <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
          <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-primary" />
              <span>Strategy Details</span>
              <span className="text-[10px] font-normal text-stone-500">({activeAngle.strategyBrief.funnelStage || activeAngle.funnelStage || 'TOFU'})</span>
            </div>
            <ChevronDown size={15} className="group-open:rotate-180 transition-transform text-stone-400" />
          </summary>
          <div className="p-4 pt-2 border-t border-[#e7e0d4] space-y-3 text-xs bg-[#fcfaf6]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <span className="text-stone-500 font-medium block text-[10px]">Tujuan Konten:</span>
                <p className="text-stone-800 font-semibold">{activeAngle.strategyBrief.tujuanKonten || activeAngle.contentGoal || '-'}</p>
              </div>
              <div>
                <span className="text-stone-500 font-medium block text-[10px]">Ide Utama Konten:</span>
                <p className="text-stone-800 font-semibold">{activeAngle.strategyBrief.ideUtama || '-'}</p>
              </div>
              <div>
                <span className="text-stone-500 font-medium block text-[10px]">Konteks Audiens:</span>
                <p className="text-stone-800">{activeAngle.strategyBrief.audienceContext || '-'}</p>
              </div>
              <div>
                <span className="text-stone-500 font-medium block text-[10px]">Target Emosi:</span>
                <p className="text-stone-800 font-medium">{activeAngle.strategyBrief.emosiUtama || activeAngle.targetEmotion || '-'}</p>
              </div>
            </div>

            {activeAngle.visualObjective && (
              <div className="bg-primary/5 p-2.5 rounded-xl border border-primary/20">
                <span className="text-primary font-bold block text-[10px] uppercase tracking-wide">Visual Objective:</span>
                <p className="text-stone-800 text-xs mt-0.5">{activeAngle.visualObjective}</p>
              </div>
            )}

            {activeAngle.messageAlignmentCheck && (
              <div className="flex items-center gap-2 text-[11px] text-stone-600 pt-1">
                <CheckCircle2 size={12} className={activeAngle.messageAlignmentCheck.isAligned ? 'text-emerald-600' : 'text-amber-600'} />
                <span>{activeAngle.messageAlignmentCheck.reason}</span>
              </div>
            )}
          </div>
        </details>
      )}

      {/* 5. PROGRESSIVE DISCLOSURE: PROMPT DETAILS (Default Collapsed) */}
      <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
        <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-primary" />
            <span>Prompt Details</span>
            <span className="text-[10px] font-normal text-stone-500">(Midjourney / Imagen Prompt)</span>
          </div>
          <ChevronDown size={15} className="group-open:rotate-180 transition-transform text-stone-400" />
        </summary>
        <div className="p-4 pt-2 border-t border-[#e7e0d4] space-y-3 bg-[#fcfaf6]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-500 font-medium">Salin prompt lengkap untuk digunakan di Midjourney atau platform lain:</span>
            <button
              onClick={() => handleCopyText(`prompt_${selectedAngleId}`, effectivePrompt, 'promptCopied')}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy size={12} />
              <span>Salin Prompt</span>
            </button>
          </div>
          <div className="p-3.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-stone-900 font-mono text-xs leading-relaxed select-all whitespace-pre-wrap">
            {effectivePrompt}
          </div>
          {characterDNA?.identity?.display_name && (
            <div className="text-[11px] text-primary font-medium flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Karakter &quot;{characterDNA.identity.display_name}&quot; aktif diinjeksikan ke prompt.</span>
            </div>
          )}
          {activeAngle.textOverlay && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="text-stone-500 font-medium text-[10px]">Teks Overlay:</span>
              <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">
                &ldquo;{activeAngle.textOverlay}&rdquo;
              </span>
            </div>
          )}
        </div>
      </details>

      {/* 6. PROGRESSIVE DISCLOSURE: ADVANCED (Default Collapsed) */}
      <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
        <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <Sliders size={14} className="text-primary" />
            <span>Advanced Details</span>
            <span className="text-[10px] font-normal text-stone-500">(Komposisi, Layout &amp; Psikologi Warna)</span>
          </div>
          <ChevronDown size={15} className="group-open:rotate-180 transition-transform text-stone-400" />
        </summary>
        <div className="p-4 pt-2 border-t border-[#e7e0d4] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-[#fcfaf6]">
          <div>
            <span className="text-stone-500 font-medium block text-[10px]">Strategi Visual:</span>
            <p className="text-stone-800 mt-0.5">{activeAngle.visualStrategy || '-'}</p>
          </div>
          <div>
            <span className="text-stone-500 font-medium block text-[10px]">Tata Letak / Layout:</span>
            <p className="text-stone-800 mt-0.5">{activeAngle.layoutStrategy || '-'}</p>
          </div>
          {activeAngle.colorPsychology && (
            <div className="md:col-span-2">
              <span className="text-stone-500 font-medium block text-[10px]">Psikologi Warna:</span>
              <p className="text-stone-800 mt-0.5">{activeAngle.colorPsychology}</p>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
