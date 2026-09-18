'use client';
import React, { useState } from 'react';
import {
  Zap,
  Copy,
  Check,
  ExternalLink,
  Users,
  MessageSquare,
  ChevronDown,
  Image as ImageIcon,
  Sparkles,
  Info,
  UserCheck,
} from 'lucide-react';
import { countWords } from '@/lib/funnel-rules';

export default function UGCPanel(props: any) {
  const {
    activeItem,
    activeContext,
    handleCopyText,
    copiedStates,
    getInitialDraft,
    ugcOutput,
    tryParseJSON,
  } = props;

  const [activeSceneNumber, setActiveSceneNumber] = useState<number>(1);

  if (!ugcOutput) {
    return (
      <div className="whitespace-pre-wrap font-sans text-stone-800 text-xs leading-relaxed">
        {ugcOutput || (getInitialDraft ? getInitialDraft('ugc', activeItem, activeContext) : '')}
      </div>
    );
  }

  let ugcPack: any | null = null;
  try {
    const parsed = tryParseJSON(ugcOutput);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      ugcPack = parsed as any;
    }
  } catch (e) {
    ugcPack = null;
  }

  if (!ugcPack) {
    return (
      <div className="whitespace-pre-wrap font-sans text-stone-800 text-xs leading-relaxed">
        {ugcOutput}
      </div>
    );
  }

  const scenes = [
    {
      num: 1,
      title: 'Hook Pembuka',
      desc: 'Penarik Perhatian Spontan (0-3s)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      script: ugcPack.script_scene_1,
      imagePrompt: ugcPack.scene1_image_prompt,
      videoPrompt: ugcPack.scene1_google_flow_prompt,
      imgCopyKey: 'ugc_s1_img',
      vidCopyKey: 'ugc_s1_vid',
    },
    {
      num: 2,
      title: 'Problem & Solution',
      desc: 'Penyelesaian Masalah & Trust (3-7s)',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      script: ugcPack.script_scene_2,
      imagePrompt: ugcPack.scene2_image_prompt,
      videoPrompt: ugcPack.scene2_google_flow_prompt,
      imgCopyKey: 'ugc_s2_img',
      vidCopyKey: 'ugc_s2_vid',
    },
    {
      num: 3,
      title: 'Call to Action',
      desc: 'Ajakan Bertindak Konversi Tinggi (7-10s)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      script: ugcPack.script_scene_3,
      imagePrompt: ugcPack.scene3_image_prompt,
      videoPrompt: ugcPack.scene3_google_flow_prompt,
      imgCopyKey: 'ugc_s3_img',
      vidCopyKey: 'ugc_s3_vid',
    },
  ];

  const activeScene = scenes.find((s) => s.num === activeSceneNumber) || scenes[0];
  const isImgCopied = copiedStates[activeScene.imgCopyKey];
  const isVidCopied = copiedStates[activeScene.vidCopyKey];
  const isDialogueCopied = copiedStates[`ugc_dialogue_${activeScene.num}`];

  return (
    <div className="space-y-4 font-sans">
      
      {/* 1. CHARACTER AREA (Compact Context) */}
      <div className="bg-[#fffdf8] border border-[#e7e0d4] p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <UserCheck size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-900">
                Persona Talent UGC
              </span>
              <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md border border-stone-200">
                Kreator Konten
              </span>
            </div>
            <p className="text-[11px] text-stone-600 line-clamp-1 max-w-lg">
              {ugcPack.characterProfile || 'Kreator autentik berbicara langsung ke kamera (talking head) dengan nada natural.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ugcPack.characterReferenceImagePrompt && (
            <button
              type="button"
              onClick={() => handleCopyText('ugc_char_ref', ugcPack.characterReferenceImagePrompt, 'promptCopied')}
              className="px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4]/60 text-stone-800 border border-[#e7e0d4] text-[11px] font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              {copiedStates['ugc_char_ref'] ? (
                <>
                  <Check size={12} className="text-primary" />
                  <span className="text-primary">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Salin Prompt Karakter</span>
                </>
              )}
            </button>
          )}

          <a
            href="https://labs.google/fx/tools/flow"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ExternalLink size={13} />
            <span>Buka Google Flow</span>
          </a>
        </div>
      </div>

      {/* 2. SCENE NAVIGATION BAR */}
      <div className="bg-[#f6f3ee] border border-[#e7e0d4] p-2 rounded-2xl flex items-center gap-1.5 overflow-x-auto custom-scrollbar shadow-xs">
        {scenes.map((scene) => {
          const isActive = activeScene.num === scene.num;
          return (
            <button
              key={scene.num}
              onClick={() => setActiveSceneNumber(scene.num)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-[#fffdf8] text-stone-700 hover:bg-white border border-[#e7e0d4]'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold ${
                isActive ? 'bg-white/25 text-white' : 'bg-primary/15 text-primary'
              }`}>
                {scene.num}
              </span>
              <span>Scene {scene.num}: {scene.title}</span>
            </button>
          );
        })}
      </div>

      {/* 3. ACTIVE SCENE WORKSPACE */}
      <div className="bg-[#fffdf8] border border-[#e7e0d4] p-5 rounded-2xl space-y-4 shadow-xs">
        
        {/* Scene Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e7e0d4]">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${activeScene.badgeClass}`}>
              Langkah {activeScene.num}: {activeScene.title}
            </span>
            <span className="text-xs font-semibold text-stone-700">
              {activeScene.desc}
            </span>
          </div>
        </div>

        {/* Script & Dialogue */}
        <div className="p-4 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl space-y-2">
          <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
            <span className="font-bold text-stone-700 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-primary" />
              Naskah Dialog Kreator:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200 text-stone-700 font-mono font-medium">
                {countWords(activeScene.script || '')} kata
              </span>
              <button
                type="button"
                onClick={() => handleCopyText(`ugc_dialogue_${activeScene.num}`, activeScene.script, 'none')}
                className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                {isDialogueCopied ? <Check size={12} /> : <Copy size={12} />}
                <span>{isDialogueCopied ? 'Tersalin' : 'Salin Dialog'}</span>
              </button>
            </div>
          </div>
          <p className="text-stone-900 leading-relaxed font-semibold italic text-xs bg-[#fffdf8] p-3 rounded-lg border border-[#e7e0d4]/80">
            &ldquo;{activeScene.script}&rdquo;
          </p>
        </div>

        {/* Primary Production Actions (2 Steps) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          
          {/* Step 1: Start Frame Image Prompt */}
          <div className="p-4 bg-[#f6f3ee]/60 border border-[#e7e0d4] rounded-xl flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon size={13} className="text-sky-600" />
                  1. Start Frame Image Prompt (9:16)
                </span>
              </div>
              <div className="p-3 bg-[#fffdf8] border border-[#e7e0d4] rounded-xl min-h-[85px] max-h-[140px] overflow-y-auto custom-scrollbar">
                <p className="text-stone-800 font-mono text-[11px] leading-relaxed select-all">
                  {activeScene.imagePrompt}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyText(activeScene.imgCopyKey, activeScene.imagePrompt, 'promptCopied')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border ${
                isImgCopied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-[#fffdf8] hover:bg-sky-50 border-sky-200 text-sky-800 hover:border-sky-300'
              }`}
            >
              {isImgCopied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span>Prompt Image Scene {activeScene.num} Tersalin</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>1. Salin Prompt Image Scene {activeScene.num}</span>
                </>
              )}
            </button>
          </div>

          {/* Step 2: Google Flow Video Prompt */}
          <div className="p-4 bg-[#f6f3ee]/60 border border-[#e7e0d4] rounded-xl flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles size={13} className="text-primary" />
                  2. Google Flow Video Motion Prompt (Veo)
                </span>
              </div>
              <div className="p-3 bg-[#fffdf8] border border-[#e7e0d4] rounded-xl min-h-[85px] max-h-[140px] overflow-y-auto custom-scrollbar">
                <p className="text-stone-800 font-mono text-[11px] leading-relaxed select-all">
                  {activeScene.videoPrompt}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleCopyText(activeScene.vidCopyKey, activeScene.videoPrompt, 'promptCopied')}
              className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer border ${
                isVidCopied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-primary hover:bg-blue-700 border-primary text-white'
              }`}
            >
              {isVidCopied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span>Prompt Video Scene {activeScene.num} Tersalin</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>2. Salin Prompt Video Scene {activeScene.num}</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* 4. PROGRESSIVE DISCLOSURE: DETAIL KARAKTER LENGKAP */}
      <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
        <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <span>Detail Karakter &amp; Persona Lengkap (Opsional)</span>
          </div>
          <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="p-4 pt-2 border-t border-[#e7e0d4]/60 space-y-3 text-xs">
          <div className="bg-[#f6f3ee] p-3.5 rounded-xl border border-[#e7e0d4]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
              Profil &amp; Persona Kreator
            </span>
            <p className="text-stone-800 leading-relaxed">{ugcPack.characterProfile}</p>
          </div>

          {ugcPack.characterReferenceImagePrompt && (
            <div className="bg-[#f6f3ee] p-3.5 rounded-xl border border-[#e7e0d4] space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                Full Reference Image Prompt
              </span>
              <p className="text-stone-800 font-mono text-[11px] leading-relaxed bg-[#fffdf8] p-3 rounded-lg border border-[#e7e0d4] select-all">
                {ugcPack.characterReferenceImagePrompt}
              </p>
            </div>
          )}
        </div>
      </details>

    </div>
  );
}
