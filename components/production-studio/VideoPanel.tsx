'use client';
import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Zap,
  Video,
  Clipboard,
  Sliders,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  PlayCircle,
  MessageSquare,
  ChevronDown,
  Image as ImageIcon,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Json2VideoApiKeyControl } from '@/components/Json2VideoApiKeyControl';
import { VideoAssetUrlInput } from '@/components/VideoAssetUrlInput';
import { PromptNextStepLinks } from './PromptNextStepLinks';
import CharacterSelector from './CharacterSelector';
import { countWords } from '@/lib/funnel-rules';

export default function VideoPanel(props: any) {
  const {
    activeItem,
    activeContext,
    handleCopyText,
    copiedStates,
    nextStepVisibleKeys,
    handleDismissNextStep,
    getInitialDraft,
    videoOutput,
    tryParseJSON,
    normalizeFunnelStage,
    getFunnelRules,
    selectedVideoId,
    handleSelectVideoStyle,
    videoMode,
    setVideoMode,
    characterImageUrl,
    setCharacterImageUrl,
    productScreenImageUrl,
    setProductScreenImageUrl,
    coverImageUrl,
    setCoverImageUrl,
    videoOutputMode,
    setVideoOutputMode,
    showToast,
    handleGenerateJson2VideoPayload,
    isRenderingVideo,
    renderJobId,
    renderJobData,
    renderError,
    isCheckingStatus,
    flowCustomCreator,
    flowCustomSetting,
    flowCustomDialogues,
    handleRenderVideo,
    handleCheckRenderStatus,
    json2VideoPayload,
    characterDNA,
    getGoogleFlowVideoPack,
    savedCharacters,
    selectedCharacterId,
    handleSelectCharacter,
    handleCreateCharacterClick,
  } = props;

  // Single active scene state for focused progressive workspace
  const [activeSceneNumber, setActiveSceneNumber] = useState<number>(1);

  const effectiveVideoOutput = videoOutput || (getInitialDraft ? getInitialDraft('video', activeItem, activeContext) : '');

  let videoStyles: any[] | null = null;
  try {
    const parsed = tryParseJSON(effectiveVideoOutput);
    if (Array.isArray(parsed) && parsed.length > 0) {
      videoStyles = parsed as any[];
    }
  } catch (e) {
    videoStyles = null;
  }

  if (!videoStyles) {
    return (
      <div className="whitespace-pre-wrap font-sans text-stone-800 text-xs leading-relaxed">
        {effectiveVideoOutput}
      </div>
    );
  }

  const activeVideo = videoStyles.find((v) => v.id === selectedVideoId) || videoStyles[0];
  const videoFunnelStage = normalizeFunnelStage(activeItem.jenis);

  // Default mode to google_flow if not explicitly selected, while allowing instant toggle
  const currentOutputMode = videoOutputMode || 'google_flow';

  const googleFlowScenes = getGoogleFlowVideoPack(
    videoFunnelStage,
    activeItem,
    activeContext,
    activeVideo,
    characterDNA,
    flowCustomCreator,
    flowCustomSetting,
    flowCustomDialogues[activeVideo.id]
  );

  const activeScene = googleFlowScenes.find((s: any) => s.sceneNumber === activeSceneNumber) || googleFlowScenes[0] || {
    sceneNumber: 1,
    title: 'Hook Pembuka',
    duration: '8s',
    shotType: 'Close-Up / Medium Shot',
    role: 'Penarik Perhatian Spontan',
    dialogue: activeVideo.script?.hook || '',
    imagePrompt: '',
    googleFlowPrompt: '',
  };

  const isImgCopied = copiedStates[`gflow_img_${activeScene.sceneNumber}_${activeVideo.id}`];
  const isPromptCopied = copiedStates[`gflow_prompt_${activeScene.sceneNumber}_${activeVideo.id}`];
  const isDialogueCopied = copiedStates[`gflow_dialogue_${activeScene.sceneNumber}_${activeVideo.id}`];

  return (
    <div className="space-y-4 font-sans">
      
      {/* 1. SELECTOR TOOLBAR: STYLE & WORKFLOW */}
      <div className="bg-[#fffdf8] border border-[#e7e0d4] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Compact Video Style Selector */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mr-1 hidden sm:inline">
            Style:
          </span>
          {videoStyles.map((style, idx) => {
            const isSelected = selectedVideoId === style.id;
            return (
              <button
                key={style.id}
                onClick={() => handleSelectVideoStyle(style.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-[#f6f3ee] text-stone-700 hover:text-stone-900 hover:bg-[#e7e0d4]/60 border border-[#e7e0d4]'
                }`}
              >
                <span>{style.name}</span>
                {idx === 0 && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-tight ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Character Selector & Workflow Info (Render via API hidden for production) */}
        <div className="flex items-center gap-2 flex-wrap">
          <CharacterSelector
            savedCharacters={savedCharacters || []}
            selectedCharacterId={selectedCharacterId || null}
            onSelectCharacter={handleSelectCharacter}
            onCreateCharacter={handleCreateCharacterClick}
          />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3ee] rounded-xl border border-[#e7e0d4] text-xs font-bold text-primary">
            <Sparkles size={13} className="text-primary" />
            <span>Google Flow (3 Scene)</span>
          </div>
        </div>
      </div>

      {/* 2. WORKSPACE: GOOGLE FLOW 3-SCENE PRODUCTION */}
      {currentOutputMode === 'google_flow' && (
        <div className="space-y-4">
          
          {/* Scene Navigation Bar */}
          <div className="bg-[#f6f3ee] border border-[#e7e0d4] p-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {googleFlowScenes.map((scene: any) => {
                const isActive = activeScene.sceneNumber === scene.sceneNumber;
                const isSceneDone = Boolean(
                  copiedStates[`gflow_prompt_${scene.sceneNumber}_${activeVideo.id}`] &&
                  copiedStates[`gflow_img_${scene.sceneNumber}_${activeVideo.id}`]
                );
                return (
                  <button
                    key={scene.sceneNumber}
                    onClick={() => setActiveSceneNumber(scene.sceneNumber)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-[#fffdf8] text-stone-700 hover:bg-white border border-[#e7e0d4]'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                      isActive ? 'bg-white/25 text-white' : isSceneDone ? 'bg-emerald-100 text-emerald-700' : 'bg-primary/15 text-primary'
                    }`}>
                      {isSceneDone ? '✓' : scene.sceneNumber}
                    </span>
                    <span>
                      Scene {scene.sceneNumber}{isSceneDone ? ' ✓' : ''}: {scene.title.split(':')[1] || scene.title}
                    </span>
                    <span className={`text-[10px] opacity-75 font-mono ${isActive ? 'text-white' : 'text-stone-500'}`}>
                      ({scene.duration})
                    </span>
                  </button>
                );
              })}
            </div>

            <a
              href="https://labs.google/fx/tools/flow"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-[#fffdf8] hover:bg-stone-50 border border-[#e7e0d4] text-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Buka Google Flow</span>
            </a>
          </div>

          {/* ACTIVE SCENE WORKSPACE CARD */}
          <div className="bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl p-5 space-y-4 shadow-xs">
            
            {/* Scene Header & Metadata */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e7e0d4]">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  Scene {activeScene.sceneNumber} &bull; {activeScene.duration}
                </span>
                <h4 className="text-sm font-bold text-[#1f2933]">
                  {activeScene.title}
                </h4>
                <span className="text-xs text-stone-500 font-mono">
                  ({activeScene.shotType})
                </span>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                {activeScene.role}
              </span>
            </div>

            {/* SHORT STEP-BY-STEP SCENE INSTRUCTIONS */}
            <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl px-4 py-3 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <span className="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                  {activeScene.sceneNumber}
                </span>
                <span>Kerjakan Scene {activeScene.sceneNumber}</span>
              </div>
              <ol className="list-decimal list-inside text-stone-600 text-[11px] leading-relaxed pl-1 space-y-0.5">
                <li>Buat Start Frame menggunakan Image Prompt.</li>
                <li>Gunakan Start Frame + Video Prompt di Google Flow.</li>
                <li>
                  {activeScene.sceneNumber === 1 && 'Setelah selesai, lanjut ke Scene 2.'}
                  {activeScene.sceneNumber === 2 && 'Setelah selesai, lanjut ke Scene 3.'}
                  {activeScene.sceneNumber >= 3 && 'Setelah Scene 3 selesai, gabungkan ketiga scene menjadi video final.'}
                </li>
              </ol>
            </div>

            {/* SCRIPT & DIALOGUE BLOCK (Secondary Reference) */}
            <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                <span className="font-semibold text-stone-600 flex items-center gap-1.5">
                  <MessageSquare size={13} className="text-primary" />
                  Naskah Dialog Audio (Bahasa Indonesia):
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono font-medium">
                    {countWords(activeScene.dialogue)} kata &bull; ~8 detik
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(`gflow_dialogue_${activeScene.sceneNumber}_${activeVideo.id}`, activeScene.dialogue, 'none')}
                    className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    {isDialogueCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isDialogueCopied ? 'Tersalin' : 'Salin Dialog'}</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-stone-900 font-medium leading-relaxed italic bg-[#fffdf8] p-2.5 rounded-lg border border-[#e7e0d4]">
                &ldquo;{activeScene.dialogue}&rdquo;
              </p>
            </div>

            {/* STEP-BY-STEP PRODUCTION ACTIONS (Primary Actions) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
              
              {/* STEP 1: Prompt Image Scene */}
              <div className="p-4 bg-[#f6f3ee]/60 border border-[#e7e0d4] rounded-xl flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon size={13} className="text-sky-600" />
                      Langkah 1: Start Frame Image Prompt
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">Format 9:16</span>
                  </div>
                  <div className="p-3 bg-[#fffdf8] border border-[#e7e0d4] rounded-xl min-h-[85px] max-h-[140px] overflow-y-auto custom-scrollbar">
                    <p className="text-stone-800 font-mono text-[11px] leading-relaxed select-all">
                      {activeScene.imagePrompt}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(`gflow_img_${activeScene.sceneNumber}_${activeVideo.id}`, activeScene.imagePrompt, 'promptCopied')
                  }
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border ${
                    isImgCopied
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-[#fffdf8] hover:bg-sky-50 border-sky-200 text-sky-800 hover:border-sky-300'
                  }`}
                >
                  {isImgCopied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Prompt Image Scene {activeScene.sceneNumber} Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>1. Salin Prompt Image Scene {activeScene.sceneNumber}</span>
                    </>
                  )}
                </button>
              </div>

              {/* STEP 2: Prompt Video Scene */}
              <div className="p-4 bg-[#f6f3ee]/60 border border-[#e7e0d4] rounded-xl flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary" />
                      Langkah 2: Video Motion Prompt (FX Studio / Veo)
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">Camera &amp; Motion</span>
                  </div>
                  <div className="p-3 bg-[#fffdf8] border border-[#e7e0d4] rounded-xl min-h-[85px] max-h-[140px] overflow-y-auto custom-scrollbar">
                    <p className="text-stone-800 font-mono text-[11px] leading-relaxed select-all">
                      {activeScene.googleFlowPrompt}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(
                      `gflow_prompt_${activeScene.sceneNumber}_${activeVideo.id}`,
                      activeScene.googleFlowPrompt,
                      'promptCopied'
                    )
                  }
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border ${
                    isPromptCopied
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-primary hover:bg-blue-700 border-primary text-white'
                  }`}
                >
                  {isPromptCopied ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Prompt Video Scene {activeScene.sceneNumber} Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>2. Salin Prompt Video Scene {activeScene.sceneNumber}</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Next step links when prompt is copied (Dedicated Google Flow CTA) */}
            <PromptNextStepLinks
              show={Boolean(
                nextStepVisibleKeys?.[`gflow_img_${activeScene.sceneNumber}_${activeVideo.id}`] ||
                nextStepVisibleKeys?.[`gflow_prompt_${activeScene.sceneNumber}_${activeVideo.id}`]
              )}
              onDismiss={() => {
                handleDismissNextStep?.(`gflow_img_${activeScene.sceneNumber}_${activeVideo.id}`);
                handleDismissNextStep?.(`gflow_prompt_${activeScene.sceneNumber}_${activeVideo.id}`);
              }}
              title="Langkah berikutnya: Google Flow"
              description="Prompt video sudah tersalin. Buka Google Flow FX Studio, lalu tempel prompt untuk render scene."
              links={[
                {
                  label: 'Buka Google Flow',
                  url: 'https://labs.google/fx/tools/flow',
                  primary: true,
                },
              ]}
              className="mt-1"
            />

            {/* NEXT SCENE STEP ACTION */}
            {activeScene.sceneNumber < googleFlowScenes.length ? (
              <div className="pt-3 border-t border-[#e7e0d4] flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs text-stone-500">
                  {isImgCopied && isPromptCopied ? (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Check size={13} className="text-emerald-600" /> Semua prompt Scene {activeScene.sceneNumber} sudah disalin.
                    </span>
                  ) : isImgCopied || isPromptCopied ? (
                    <span className="text-amber-700 font-medium">
                      Salin kedua prompt (Start Frame &amp; Video Motion) untuk menandai scene selesai.
                    </span>
                  ) : (
                    <span>Salin kedua prompt di atas sebelum melanjutkan.</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSceneNumber(activeScene.sceneNumber + 1)}
                  className="px-4 py-2 bg-primary hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer ml-auto"
                >
                  <span>Lanjut ke Scene {activeScene.sceneNumber + 1}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-[#e7e0d4]">
                <div className="flex items-center justify-between flex-wrap gap-3 bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-900">
                        {isImgCopied && isPromptCopied ? 'Semua Scene Selesai' : 'Scene 3 Aktif'}
                      </div>
                      <div className="text-[11px] text-emerald-700">Setelah Scene 3 selesai, gabungkan ketiga scene menjadi video final.</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSceneNumber(1)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 font-semibold text-xs rounded-lg border border-stone-200 transition cursor-pointer"
                    >
                      Ulangi dari Scene 1
                    </button>
                    <a
                      href="https://labs.google/fx/tools/flow"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-primary hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <ExternalLink size={12} />
                      <span>Buka Google Flow</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CAPTION SECTION (Siap Posting) */}
          {(activeVideo.captionForPost || activeItem?.caption) && (
            <div className="bg-[#fffdf8] border border-[#e7e0d4] p-4.5 rounded-2xl space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Caption Postingan Video (Siap Posting)
                  </span>
                </div>
                <button
                  onClick={() => handleCopyText(`video_caption_${activeVideo.id}`, activeVideo.captionForPost || activeItem?.caption, 'captionCopied')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] text-xs font-bold rounded-xl transition cursor-pointer border border-[#e7e0d4]"
                >
                  {copiedStates[`video_caption_${activeVideo.id}`] ? (
                    <>
                      <Check size={13} className="text-primary" />
                      <span className="text-primary">Caption Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin Caption</span>
                    </>
                  )}
                </button>
              </div>
              <div className="text-[11px] text-stone-500 font-medium">
                {activeVideo.captionInstruction || "Paste teks ini di caption/keterangan postingan setelah aset video selesai dibuat."}
              </div>
              <div className="p-3.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-stone-900 font-sans text-xs leading-relaxed select-all whitespace-pre-wrap">
                {activeVideo.captionForPost || activeItem?.caption}
              </div>
            </div>
          )}

          {/* PROGRESSIVE DISCLOSURE: DETAIL PENDUKUNG & STRATEGI */}
          <div className="space-y-2.5 pt-1">
            
            {/* 1. Naskah Alur Cerita Utuh (5-Step Monolog) */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <PlayCircle size={14} className="text-primary" />
                  <span>Struktur Naskah Cerita Utuh (Hook &rarr; Masalah &rarr; Solusi &rarr; Proof &rarr; CTA)</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="px-2 py-0.5 rounded bg-rose-100 border border-rose-200 text-[9px] font-bold text-rose-800 uppercase block w-fit">
                    1. Hook
                  </span>
                  <p className="text-stone-900 italic text-[11px] leading-relaxed">&ldquo;{activeVideo.script?.hook}&rdquo;</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-200 text-[9px] font-bold text-amber-800 uppercase block w-fit">
                    2. Masalah
                  </span>
                  <p className="text-stone-800 text-[11px] leading-relaxed">&ldquo;{activeVideo.script?.masalah}&rdquo;</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 border border-emerald-200 text-[9px] font-bold text-emerald-800 uppercase block w-fit">
                    3. Solusi
                  </span>
                  <p className="text-stone-800 text-[11px] leading-relaxed">&ldquo;{activeVideo.script?.solusi}&rdquo;</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="px-2 py-0.5 rounded bg-blue-100 border border-blue-200 text-[9px] font-bold text-blue-800 uppercase block w-fit">
                    4. Proof
                  </span>
                  <p className="text-stone-800 text-[11px] leading-relaxed">&ldquo;{activeVideo.script?.proof}&rdquo;</p>
                </div>
                <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                  <span className="px-2 py-0.5 rounded bg-purple-100 border border-purple-200 text-[9px] font-bold text-purple-800 uppercase block w-fit">
                    5. CTA
                  </span>
                  <p className="text-stone-900 font-bold text-[11px] leading-relaxed">&ldquo;{activeVideo.script?.cta}&rdquo;</p>
                </div>
              </div>
            </details>

            {/* 2. Urutan Kerja di Google Flow */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  <span>Panduan Langkah Eksekusi di Google FX Studio / Flow</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs text-stone-700">
                <div className="p-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl">
                  <span className="font-bold text-primary block text-[11px]">Langkah 1:</span>
                  <p className="text-[11px] mt-0.5 leading-snug">Salin Prompt Image Scene 1, paste di Flow untuk membuat visual frame pembuka.</p>
                </div>
                <div className="p-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl">
                  <span className="font-bold text-primary block text-[11px]">Langkah 2:</span>
                  <p className="text-[11px] mt-0.5 leading-snug">Salin Prompt Video Scene 1, generate video gerak di Google Flow.</p>
                </div>
                <div className="p-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl">
                  <span className="font-bold text-primary block text-[11px]">Langkah 3:</span>
                  <p className="text-[11px] mt-0.5 leading-snug">Beralih ke Scene 2, lakukan urutan yang sama untuk konten solusi.</p>
                </div>
                <div className="p-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl">
                  <span className="font-bold text-primary block text-[11px]">Langkah 4:</span>
                  <p className="text-[11px] mt-0.5 leading-snug">Lanjutkan Scene 3 untuk dorongan aksi CTA konversi tinggi.</p>
                </div>
                <div className="p-2.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl">
                  <span className="font-bold text-primary block text-[11px]">Langkah 5:</span>
                  <p className="text-[11px] mt-0.5 leading-snug">Gabungkan 3 klip di CapCut/editor, tambahkan voiceover &amp; caption siap posting.</p>
                </div>
              </div>
            </details>

            {/* 3. Detail Strategi & Teknis Video */}
            <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-primary" />
                  <span>Detail Strategi, Arah Audio &amp; Konfigurasi Produksi</span>
                </div>
                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Hook &amp; Pacing</span>
                    <p className="text-stone-800 font-semibold">{activeVideo.hookStyle || '-'}</p>
                    <p className="text-stone-500 text-[11px]">Pacing: {activeVideo.pacingStyle || '-'}</p>
                  </div>
                  <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Arah Audio &amp; Voiceover</span>
                    <p className="text-stone-800 leading-snug">{activeVideo.audioDirection || '-'}</p>
                  </div>
                  <div className="p-3 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase block">Visual Direction Utama</span>
                    <p className="text-stone-800 leading-snug line-clamp-3">{activeVideo.visualDirection || activeItem.visual || '-'}</p>
                  </div>
                </div>

                {/* Mode Selection */}
                <div className="pt-2 border-t border-[#e7e0d4] space-y-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Mode Produksi Video</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { id: 'text_motion', title: 'Text Motion', desc: 'Video berbasis teks & motion graphic' },
                      { id: 'ugc_video', title: 'UGC Video', desc: 'Video dengan talent / karakter pembawa pesan' },
                      { id: 'asset_product', title: 'Asset Product', desc: 'Video memakai aset screenshot / produk' },
                    ].map((mode) => {
                      const isSelected = videoMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setVideoMode(mode.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-[#fffdf8] border-primary shadow-xs'
                              : 'bg-[#f6f3ee] border-[#e7e0d4] text-stone-600 hover:bg-[#fffdf8]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-stone-800'}`}>
                              {mode.title}
                            </span>
                            {isSelected && <Check size={12} className="text-primary" />}
                          </div>
                          <p className="text-[10px] text-stone-500 leading-tight">{mode.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Video Visual Assets URLs */}
                <div className="pt-2 border-t border-[#e7e0d4] space-y-2">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Direct Asset URLs (Opsional)</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <VideoAssetUrlInput
                      id="char-image-url-input"
                      label="Character Image URL"
                      badgeText="Latar UGC 9:16"
                      value={characterImageUrl}
                      onChange={setCharacterImageUrl}
                      placeholder="https://example.com/char.jpg"
                      aspectRatio="9:16"
                      helperText="Wajib URL HTTPS publik."
                      isCharacterUrl={true}
                    />
                    <VideoAssetUrlInput
                      id="product-screen-url-input"
                      label="Product Screen URL"
                      badgeText="Overlay Mockup"
                      value={productScreenImageUrl}
                      onChange={setProductScreenImageUrl}
                      placeholder="https://example.com/mock.png"
                      aspectRatio="16:9"
                      helperText="Tangkapan layar produk/UI."
                    />
                    <VideoAssetUrlInput
                      id="cover-image-url-input"
                      label="Cover Image URL"
                      badgeText="Poster / Scene 1"
                      value={coverImageUrl}
                      onChange={setCoverImageUrl}
                      placeholder="https://example.com/cov.jpg"
                      aspectRatio="9:16"
                      helperText="Thumbnail visual pembuka."
                    />
                  </div>
                </div>
              </div>
            </details>

          </div>

        </div>
      )}

      {/* 3. WORKSPACE: RENDER VIA API (JSON2VIDEO) */}
      {currentOutputMode === 'api' && (
        <div className="space-y-4">
          
          <div className="bg-[#fffdf8] border border-[#e7e0d4] p-5 rounded-2xl space-y-4 shadow-xs">
            
            {/* Header & Primary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#e7e0d4]">
              <div>
                <h3 className="text-xs font-bold uppercase text-[#1f2933] tracking-wider flex items-center gap-1.5">
                  <Video size={14} className="text-[#b7791f]" />
                  Render Otomatis Cloud Engine (JSON2Video)
                </h3>
                <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">
                  Render video otomatis langsung dari script menggunakan API Key Anda.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Json2VideoApiKeyControl onToast={showToast} variant="compact" />

                <button
                  type="button"
                  onClick={() => handleGenerateJson2VideoPayload(activeVideo)}
                  className="px-3.5 py-2 bg-[#f6f3ee] hover:bg-stone-200 text-stone-800 border border-[#e7e0d4] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Clipboard size={13} />
                  <span>Generate Payload</span>
                </button>

                <button
                  type="button"
                  disabled={isRenderingVideo}
                  onClick={() => handleRenderVideo(activeVideo)}
                  className="px-4 py-2 bg-[#b7791f] hover:bg-[#b7791f]/90 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isRenderingVideo ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Rendering...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      <span>Render Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {renderError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs text-rose-800">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle size={15} className="shrink-0 text-rose-600" />
                  <span>Render Error / API Key Alert</span>
                </div>
                <p className="text-[11px] leading-relaxed">{renderError}</p>
              </div>
            )}

            {/* Active Render Job Status */}
            {(isRenderingVideo || renderJobId || renderJobData) && (
              <div className="p-4 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#e7e0d4]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                    </span>
                    <span className="text-xs font-bold text-stone-900">Status Production Job</span>
                    {renderJobId && (
                      <span className="text-[10px] font-mono text-stone-600 bg-[#fffdf8] px-2 py-0.5 rounded border border-[#e7e0d4]">
                        ID: {renderJobId}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {renderJobId && (
                      <button
                        type="button"
                        disabled={isCheckingStatus}
                        onClick={() => handleCheckRenderStatus(renderJobId)}
                        className="px-3 py-1 bg-[#fffdf8] hover:bg-stone-100 text-xs font-bold text-stone-700 rounded-lg transition border border-[#e7e0d4] flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        {isCheckingStatus ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        <span>Cek Status</span>
                      </button>
                    )}

                    {(renderJobData?.movie?.url ||
                      renderJobData?.url ||
                      renderJobData?.movie?.draft_url ||
                      renderJobData?.draft_url) && (
                      <a
                        href={
                          renderJobData?.movie?.url ||
                          renderJobData?.url ||
                          renderJobData?.movie?.draft_url ||
                          renderJobData?.draft_url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1 bg-primary hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center gap-1.5"
                      >
                        <ExternalLink size={12} />
                        <span>Buka Video Hasil</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-stone-500 text-[10px] font-bold uppercase block">Render Status</span>
                    <span className="text-stone-900 font-mono font-bold capitalize">
                      {isRenderingVideo
                        ? 'Rendering...'
                        : renderJobData?.movie?.status || renderJobData?.status || 'Submitted'}
                    </span>
                  </div>
                  {(renderJobData?.movie?.message || renderJobData?.message) && (
                    <div>
                      <span className="text-stone-500 text-[10px] font-bold uppercase block">Pesan API</span>
                      <span className="text-stone-800 font-mono">
                        {renderJobData?.movie?.message || renderJobData?.message}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generated JSON Payload Details */}
            {json2VideoPayload?.key === `${activeItem.no || 1}_${activeVideo.id}` && (
              <details className="group border border-[#e7e0d4] bg-[#f6f3ee] rounded-xl overflow-hidden">
                <summary className="p-3 flex items-center justify-between text-xs font-bold text-stone-700 cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <FileText size={13} className="text-primary" />
                    <span>Detail Payload JSON2Video</span>
                  </div>
                  <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-stone-400" />
                </summary>
                <div className="p-3 pt-0 space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopyText(`json2video_${activeVideo.id}`, json2VideoPayload.text, 'none')}
                      className="px-3 py-1 bg-[#fffdf8] hover:bg-stone-100 text-stone-800 border border-[#e7e0d4] rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {copiedStates[`json2video_${activeVideo.id}`] ? (
                        <>
                          <Check size={12} className="text-primary" />
                          <span className="text-primary">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Salin Payload</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="max-h-60 overflow-auto custom-scrollbar whitespace-pre-wrap break-words rounded-lg border border-[#e7e0d4] bg-[#fffdf8] p-3 text-[10px] leading-relaxed text-stone-800 font-mono">
                    {json2VideoPayload.text}
                  </pre>
                </div>
              </details>
            )}

          </div>

          {/* Caption in API Mode */}
          {(activeVideo.captionForPost || activeItem?.caption) && (
            <div className="bg-[#fffdf8] border border-[#e7e0d4] p-4.5 rounded-2xl space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-primary" />
                  <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Caption Postingan Video (Siap Posting)
                  </span>
                </div>
                <button
                  onClick={() => handleCopyText(`video_caption_${activeVideo.id}`, activeVideo.captionForPost || activeItem?.caption, 'captionCopied')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] text-xs font-bold rounded-xl transition cursor-pointer border border-[#e7e0d4]"
                >
                  {copiedStates[`video_caption_${activeVideo.id}`] ? (
                    <>
                      <Check size={13} className="text-primary" />
                      <span className="text-primary">Caption Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Salin Caption</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-3.5 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-stone-900 font-sans text-xs leading-relaxed select-all whitespace-pre-wrap">
                {activeVideo.captionForPost || activeItem?.caption}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
