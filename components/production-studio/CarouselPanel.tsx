'use client';
import React from 'react';
import { 
  Sparkles, Copy, Check, Sliders, CheckCircle2, AlertCircle,
  Layers, ArrowRight, Palette, Compass, Camera, BarChart3,
  Layers2, Eye, ShieldCheck, ChevronDown, FileText, UserCheck
} from 'lucide-react';
import { PromptNextStepLinks } from './PromptNextStepLinks';
import CharacterSelector from './CharacterSelector';
import { injectCharacterToPrompt } from '@/lib/character-prompt';

export default function CarouselPanel(props: any) {
  const {
    activeItem,
    activeContext,
    handleCopyText,
    copiedStates,
    nextStepVisibleKeys,
    handleDismissNextStep,
    activeSlideNumber,
    setActiveSlideNumber,
    carouselOutput,
    getInitialDraft,
    tryParseJSON,
    savedCharacters,
    selectedCharacterId,
    handleSelectCharacter,
    handleCreateCharacterClick,
    characterDNA,
  } = props;

  let plan: any | null = activeItem?.carousel_plan || null;

  if (!plan) {
    const rawOutput = carouselOutput || getInitialDraft('carousel', activeItem, activeContext);
    if (rawOutput) {
      const parsed = tryParseJSON(rawOutput);
      if (parsed && typeof parsed === 'object') {
        if ('slides' in parsed && Array.isArray(parsed.slides)) {
          plan = parsed;
        } else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.slides) {
          plan = parsed[0];
        }
      }
    }
  }

  if (!plan || !plan.slides || plan.slides.length === 0) {
    return (
      <div className="p-4 bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl">
        <div className="whitespace-pre-wrap font-sans text-stone-800 text-xs leading-relaxed">
          {carouselOutput || getInitialDraft('carousel', activeItem, activeContext)}
        </div>
      </div>
    );
  }

  const slides = plan.slides;
  const currentSlideIndex = slides.findIndex((s: any) => s.slide === activeSlideNumber);
  const activeSlide = currentSlideIndex >= 0 ? slides[currentSlideIndex] : slides[0];
  const activeSlideNum = activeSlide.slide || 1;

  const funnelStage = String(plan.funnel_stage || activeItem?.jenis || 'TOFU').toUpperCase();
  const alignmentCheck = plan.messageAlignmentCheck || { isAligned: true };

  // Helper to extract 3-layer data with fallbacks
  const visualFormat: 'photography' | 'infographic' | 'hybrid' = 
    activeSlide.visual_format || (activeSlide.slide === 1 ? 'photography' : 'infographic');

  const creativeStrategy = activeSlide.creative_strategy || {
    funnel_stage: funnelStage,
    slide_role: activeSlide.role || 'content',
    visual_objective: activeSlide.visual_intent || '',
    core_message: activeSlide.headline || '',
    audience_emotion: activeSlide.emotional_state || '',
    visual_concept: activeSlide.visual_type || '',
    text_overlay: activeSlide.headline || ''
  };

  const visualProduction = activeSlide.visual_production || {
    subject: activeSlide.visual_intent || '',
    action: activeSlide.visual_intent || '',
    composition: activeSlide.text_zone || 'Upper Third / Center',
    layout: activeSlide.negative_space_plan || '',
    visual_metaphor: '',
    typography: 'Headline 28-32pt bold, body 16pt sans-serif.',
    background: '#FAF9F6 clean warm neutral background.',
    color_mood: 'Professional & high-contrast.',
    negative_space: activeSlide.negative_space_plan || 'Ruang bersih 40%',
    negative_prompt: visualFormat === 'photography' 
      ? 'hard selling ads, cluttered poster, too much text, generic stock photo, unreadable typography, distorted face, extra fingers.'
      : 'photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads.'
  };

  const formatSlideFullText = (s: any) => {
    const cs = s.creative_strategy || {
      funnel_stage: funnelStage,
      slide_role: s.role || 'content',
      visual_objective: s.visual_intent || '',
      core_message: s.headline || '',
      audience_emotion: s.emotional_state || '',
      visual_concept: s.visual_type || '',
      text_overlay: s.headline || ''
    };
    const vf = s.visual_format || (s.slide === 1 ? 'photography' : 'infographic');
    const vp = s.visual_production || {
      subject: s.visual_intent || '',
      action: s.visual_intent || '',
      composition: s.text_zone || '',
      layout: s.negative_space_plan || '',
      visual_metaphor: '',
      typography: 'Headline 28-32pt bold, body 16pt.',
      background: '#FAF9F6',
      color_mood: 'Professional',
      negative_space: 'Ruang bersih 40%',
      negative_prompt: ''
    };

    const effectiveImagePrompt = injectCharacterToPrompt(s.slide_image_prompt, characterDNA, vf);

    return `--- SLIDE ${s.slide} (${(s.role || 'Content').toUpperCase()}) [Format: ${vf.toUpperCase()}] ---
Headline: ${s.headline}
Body:
${s.body}
Swipe Bridge: ${s.swipe_bridge || '-'}

[1. CREATIVE STRATEGY]
Funnel Stage: ${cs.funnel_stage || funnelStage}
Slide Role: ${cs.slide_role || s.role}
Visual Objective: ${cs.visual_objective || s.visual_intent || '-'}
Core Message: ${cs.core_message || s.headline}
Audience Emotion: ${cs.audience_emotion || s.emotional_state || '-'}
Visual Concept: ${cs.visual_concept || s.visual_type || '-'}
Text Overlay: "${cs.text_overlay || s.headline}"

[2. VISUAL FORMAT]
Visual Format: ${vf}

[3. VISUAL PRODUCTION]
Subject: ${vp.subject || '-'}
Action: ${vp.action || '-'}
Composition: ${vp.composition || '-'}
Layout: ${vp.layout || '-'}
Visual Metaphor: ${vp.visual_metaphor || '-'}
Typography: ${vp.typography || '-'}
Background: ${vp.background || '-'}
Color Mood: ${vp.color_mood || '-'}
Negative Space: ${vp.negative_space || '-'}
Negative Prompt: ${vp.negative_prompt || '-'}

[SLIDE IMAGE PROMPT (AI GENERATOR / FLUX / MIDJOURNEY)]
${effectiveImagePrompt || '-'}

[PRODUCTION / LAYOUT PROMPT]
${s.production_prompt || '-'}`;
  };

  const effectiveSlideImagePrompt = injectCharacterToPrompt(
    activeSlide.slide_image_prompt,
    characterDNA,
    visualFormat
  );

  return (
    <div className="space-y-4">
      {/* 1. CAROUSEL OVERVIEW (Compact Context Strip) */}
      <div className="bg-[#fffdf8] border border-[#e7e0d4] p-3 rounded-2xl flex flex-wrap items-center justify-between gap-2.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-xl text-primary font-bold">
            {funnelStage} Carousel Blueprint
          </span>
          <span className="text-stone-400">&bull;</span>
          <span className="font-semibold text-stone-800">{slides.length} Slides</span>
          {plan.primary_cta_text && (
            <>
              <span className="text-stone-400">&bull;</span>
              <span className="text-stone-600">CTA: <strong className="text-stone-900">{plan.primary_cta_text}</strong></span>
            </>
          )}
          {alignmentCheck && (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
              alignmentCheck.isAligned
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {alignmentCheck.isAligned ? 'Corong OK' : 'Corong Disesuaikan'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <CharacterSelector
            savedCharacters={savedCharacters || []}
            selectedCharacterId={selectedCharacterId || null}
            onSelectCharacter={handleSelectCharacter}
            onCreateCharacter={handleCreateCharacterClick}
          />
          <button
            onClick={() => {
              const combinedText = `[CAROUSEL 3-LAYER STRATEGY BLUEPRINT]\nFunnel Stage: ${funnelStage}\nGoal: ${plan.content_goal || '-'}\nCore Promise: ${plan.core_promise || '-'}\nPrimary CTA: ${plan.primary_cta_text || '-'} (${plan.primary_cta_type || '-'})\nSlide Count Reason: ${plan.slide_count_reason || '-'}\n\n` +
                slides.map((s: any) => formatSlideFullText(s)).join('\n\n========================================\n\n');
              handleCopyText('carousel_plan_all', combinedText, 'none');
            }}
            className="px-3 py-1.5 bg-[#f6f3ee] hover:bg-[#e7e0d4] text-[#1f2933] border border-[#e7e0d4] rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            {copiedStates['carousel_plan_all'] ? (
              <>
                <Check size={12} className="text-primary" />
                <span className="text-primary">Semua Slide Tersalin!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Salin Seluruh Blueprint</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. SLIDE NAVIGATION (Compact, focused buttons: [1] [2] [3]... ) */}
      <div className="bg-[#fffdf8] border border-[#e7e0d4] p-3 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-[#e7e0d4] mb-2 px-1">
          <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">Slide Navigator</span>
          <span className="text-[11px] text-stone-500">Pilih slide untuk fokus naskah &amp; produksi:</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-7 gap-2">
          {slides.map((s: any) => {
            const isCurrent = s.slide === activeSlideNum;
            return (
              <button
                key={s.slide}
                onClick={() => setActiveSlideNumber(s.slide)}
                className={`p-2.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  isCurrent
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-[#f6f3ee] hover:bg-[#e7e0d4] text-stone-700 border border-[#e7e0d4]'
                }`}
              >
                <span className={`text-xs font-mono font-bold ${isCurrent ? 'text-white' : 'text-stone-900'}`}>
                  Slide {s.slide}
                </span>
                <span className={`text-[10px] capitalize leading-tight truncate w-full text-center ${
                  isCurrent ? 'text-white/85 font-medium' : 'text-stone-500'
                }`}>
                  {s.role || 'Content'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Slide Content & 3-Layer Structure */}
      {activeSlide && (
        <div className="bg-[#fffdf8] border border-[#e7e0d4] p-5 rounded-2xl space-y-4 shadow-xs">
          {/* Header Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#e7e0d4]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-primary text-white text-[11px] font-mono font-bold uppercase tracking-wider shadow-xs">
                Slide {activeSlide.slide} / {slides.length}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-stone-100 border border-[#e7e0d4] text-[11px] font-bold text-stone-800 capitalize">
                Peran: {activeSlide.role}
              </span>
              
              {/* Visual Format Badge */}
              <div className={`flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                visualFormat === 'photography'
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : visualFormat === 'infographic'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {visualFormat === 'photography' ? (
                  <>
                    <Camera size={12} />
                    <span>Photography</span>
                  </>
                ) : visualFormat === 'infographic' ? (
                  <>
                    <BarChart3 size={12} />
                    <span>Infographic</span>
                  </>
                ) : (
                  <>
                    <Layers2 size={12} />
                    <span>Hybrid</span>
                  </>
                )}
              </div>

              {activeSlide.emotional_state && (
                <span className="px-2.5 py-0.5 rounded-lg bg-[#f6f3ee] border border-[#e7e0d4] text-[10px] font-medium text-stone-600">
                  Emosi: {activeSlide.emotional_state}
                </span>
              )}
            </div>

            {/* Single Unified Copy Button on Main UI */}
            <button
              onClick={() => {
                const slideCopy = formatSlideFullText(activeSlide);
                handleCopyText(`slide_main_copy_${activeSlideNum}`, slideCopy, 'promptCopied');
              }}
              className="px-3.5 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedStates[`slide_main_copy_${activeSlideNum}`] ? (
                <>
                  <Check size={13} />
                  <span>Prompt Slide {activeSlideNum} Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Salin Prompt Slide {activeSlideNum}</span>
                </>
              )}
            </button>
          </div>

          {/* Next Step Links when prompt slide is copied */}
          <PromptNextStepLinks 
            show={Boolean(nextStepVisibleKeys?.[`slide_main_copy_${activeSlideNum}`])} 
            onDismiss={() => handleDismissNextStep?.(`slide_main_copy_${activeSlideNum}`)}
          />

          {/* Headline & Body Copy */}
          <div className="space-y-3.5">
            <div className="bg-[#f6f3ee]/60 p-3.5 rounded-xl border border-[#e7e0d4] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Headline Slide</span>
                <button
                  onClick={() => handleCopyText(`slide_hl_${activeSlide.slide}`, activeSlide.headline, 'none')}
                  className="text-[10px] font-bold text-stone-600 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  {copiedStates[`slide_hl_${activeSlide.slide}`] ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                  <span>{copiedStates[`slide_hl_${activeSlide.slide}`] ? 'Tersalin' : 'Salin Headline'}</span>
                </button>
              </div>
              <h3 className="text-stone-900 font-bold text-base md:text-lg leading-snug">
                {activeSlide.headline}
              </h3>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Isi Naskah / Body Copy</span>
                <button
                  onClick={() => handleCopyText(`slide_body_${activeSlide.slide}`, activeSlide.body, 'none')}
                  className="text-[10px] font-bold text-stone-600 hover:text-primary flex items-center gap-1 transition-colors"
                >
                  {copiedStates[`slide_body_${activeSlide.slide}`] ? <Check size={11} className="text-primary" /> : <Copy size={11} />}
                  <span>{copiedStates[`slide_body_${activeSlide.slide}`] ? 'Tersalin' : 'Salin Body'}</span>
                </button>
              </div>
              <div className="text-stone-800 font-medium text-xs leading-relaxed bg-[#f6f3ee] p-4 rounded-xl border border-[#e7e0d4] whitespace-pre-wrap">
                {activeSlide.body}
              </div>
            </div>

            {activeSlide.swipe_bridge && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wide">Swipe Bridge:</span>
                <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg">
                  &rarr; {activeSlide.swipe_bridge}
                </span>
              </div>
            )}

            {/* Visual Direction & Text Overlay Preview */}
            <div className="bg-primary/5 border border-primary/20 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Arah Visual (Visual Direction):</span>
                {activeSlide.swipe_bridge && (
                  <span className="text-[11px] text-stone-600 font-medium">
                    Swipe Bridge: <strong className="text-primary">&rarr; {activeSlide.swipe_bridge}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-800 leading-relaxed font-medium">
                {creativeStrategy.visual_objective || activeSlide.visual_intent || '-'}
              </p>
              {creativeStrategy.text_overlay && (
                <div className="pt-1 flex items-center gap-2 text-xs">
                  <span className="text-stone-500 font-medium text-[10px]">Teks Overlay:</span>
                  <span className="font-semibold text-primary bg-white px-2.5 py-0.5 rounded-md border border-primary/20">
                    &ldquo;{creativeStrategy.text_overlay}&rdquo;
                  </span>
                </div>
              )}
            </div>

            {/* 4. PROMPT DETAILS FOR ACTIVE SLIDE */}
            <details className="group border border-[#e7e0d4] bg-[#fcfaf6] rounded-xl overflow-hidden shadow-xs transition-all">
              <summary className="p-3 flex items-center justify-between font-bold text-xs text-stone-700 hover:text-primary cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  <Palette size={13} className="text-primary" />
                  <span>Prompt Details &bull; Slide {activeSlide.slide}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-500 text-[11px]">
                  <span>Image &amp; Layout Prompts</span>
                  <ChevronDown size={14} className="group-open:rotate-180 transition-transform" />
                </div>
              </summary>
              
              <div className="p-4 pt-2 border-t border-[#e7e0d4] space-y-3 text-xs bg-[#fffdf8]">
                {/* Detail Teknis 1: Prompt Image Saja */}
                {activeSlide.slide_image_prompt && (
                  <div className="bg-stone-900 text-stone-100 p-3.5 rounded-xl space-y-2 border border-stone-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-teal-400 text-[11px] font-bold">
                        <Sparkles size={12} />
                        <span>Prompt Image Saja &bull; Slide {activeSlide.slide} (4:5 Format)</span>
                      </div>
                      <button
                        onClick={() => handleCopyText(`slide_img_prompt_only_${activeSlide.slide}`, effectiveSlideImagePrompt, 'promptCopied')}
                        className="px-2.5 py-1 bg-primary hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        {copiedStates[`slide_img_prompt_only_${activeSlide.slide}`] ? (
                          <>
                            <Check size={11} />
                            <span>Prompt Image Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Salin Prompt Image Saja</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[10px] leading-relaxed text-stone-300 bg-stone-950/80 p-3 rounded-lg border border-stone-800 whitespace-pre-wrap select-all">
                      {effectiveSlideImagePrompt}
                    </div>
                    {characterDNA?.identity?.display_name && (
                      <div className="text-[10px] text-teal-300 font-medium flex items-center gap-1">
                        <CheckCircle2 size={11} />
                        <span>Karakter &quot;{characterDNA.identity.display_name}&quot; aktif diinjeksikan ke prompt slide ini.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Detail Teknis 2: Prompt Layout Saja */}
                {activeSlide.production_prompt && (
                  <div className="bg-[#f6f3ee] text-stone-800 p-3.5 rounded-xl space-y-2 border border-[#e7e0d4]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-stone-700 text-[11px] font-bold">
                        <Palette size={12} className="text-primary" />
                        <span>Prompt Layout Saja &bull; Slide {activeSlide.slide}</span>
                      </div>
                      <button
                        onClick={() => handleCopyText(`slide_layout_prompt_only_${activeSlide.slide}`, activeSlide.production_prompt, 'promptCopied')}
                        className="px-2.5 py-1 bg-[#fffdf8] hover:bg-stone-200 text-stone-800 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border border-[#e7e0d4] cursor-pointer"
                      >
                        {copiedStates[`slide_layout_prompt_only_${activeSlide.slide}`] ? (
                          <>
                            <Check size={11} className="text-primary" />
                            <span className="text-primary">Prompt Layout Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>Salin Prompt Layout Saja</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[10px] leading-relaxed text-stone-700 bg-[#fffdf8] p-3 rounded-lg border border-[#e7e0d4] whitespace-pre-wrap select-all">
                      {activeSlide.production_prompt}
                    </div>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* 5. STRATEGY & VISUAL PRODUCTION DETAILS (Progressive Disclosure) */}
      <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
        <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <Compass size={14} className="text-primary" />
            <span>Strategy &amp; Visual Production Details &bull; Slide {activeSlideNum}</span>
            <span className="text-[10px] font-normal text-stone-500">({creativeStrategy.slide_role || activeSlide?.role})</span>
          </div>
          <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="p-4 pt-2 border-t border-[#e7e0d4] space-y-3.5 text-xs bg-[#fcfaf6]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <span className="text-stone-500 font-medium block text-[10px]">Tujuan Visual:</span>
              <p className="text-stone-800 mt-0.5">{creativeStrategy.visual_objective || activeSlide?.visual_intent || '-'}</p>
            </div>
            <div>
              <span className="text-stone-500 font-medium block text-[10px]">Pesan Utama:</span>
              <p className="text-stone-800 font-semibold mt-0.5">{creativeStrategy.core_message || activeSlide?.headline || '-'}</p>
            </div>
            <div>
              <span className="text-stone-500 font-medium block text-[10px]">Subjek &amp; Aksi:</span>
              <p className="text-stone-800 mt-0.5">{visualProduction.subject || '-'}</p>
              {visualProduction.action && <p className="text-stone-600 text-[11px] mt-0.5">{visualProduction.action}</p>}
            </div>
            <div>
              <span className="text-stone-500 font-medium block text-[10px]">Komposisi &amp; Tata Letak:</span>
              <p className="text-stone-800 mt-0.5">{visualProduction.composition || activeSlide?.text_zone || 'Upper Third'}</p>
            </div>
            <div>
              <span className="text-stone-500 font-medium block text-[10px]">Tipografi:</span>
              <p className="text-stone-800 mt-0.5">{visualProduction.typography || 'Headline 28pt bold, body 16pt'}</p>
            </div>
            <div>
              <span className="text-stone-500 font-medium block text-[10px]">Latar Belakang &amp; Mood:</span>
              <p className="text-stone-800 mt-0.5">{visualProduction.background || '#FAF9F6'} &bull; {visualProduction.color_mood || 'Professional'}</p>
            </div>
          </div>
        </div>
      </details>

      {/* 6. BELIEF JOURNEY & SYSTEM NOTES (Progressive Disclosure) */}
      <details className="group border border-[#e7e0d4] bg-[#fffdf8] rounded-2xl overflow-hidden shadow-xs transition-all">
        <summary className="p-3.5 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-primary" />
            <span>Belief Journey &amp; Sistem Visual Carousel</span>
          </div>
          <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="p-4 pt-2 border-t border-[#e7e0d4] space-y-3 text-xs bg-[#fcfaf6]">
          {plan.belief_journey_summary && (
            <div className="bg-[#f6f3ee] p-3.5 rounded-xl border border-[#e7e0d4]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">Ringkasan Alur Keyakinan (Belief Journey)</span>
              <p className="text-stone-800 leading-relaxed">{plan.belief_journey_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {plan.slide_count_reason && (
              <div className="bg-[#f6f3ee] p-3.5 rounded-xl border border-[#e7e0d4]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">Alasan Jumlah Slide ({plan.slide_count || slides.length} Slide)</span>
                <p className="text-stone-800 leading-relaxed">{plan.slide_count_reason}</p>
              </div>
            )}
            {plan.visual_system_notes && (
              <div className="bg-[#f6f3ee] p-3.5 rounded-xl border border-[#e7e0d4]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">Catatan Sistem Visual</span>
                <p className="text-stone-800 leading-relaxed">{plan.visual_system_notes}</p>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
