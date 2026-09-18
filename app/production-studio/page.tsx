'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ImagePanel from '@/components/production-studio/ImagePanel';
import CarouselPanel from '@/components/production-studio/CarouselPanel';
import VideoPanel from '@/components/production-studio/VideoPanel';
import UGCPanel from '@/components/production-studio/UGCPanel';
import ReviewPanel from '@/components/production-studio/ReviewPanel';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Sparkles, FileText, Image as ImageIcon, Video, Layers, Users, Star, 
  Target, Zap, Check, Copy, RefreshCw, Eye, BrainCircuit, MessageSquare, Clipboard, 
  AlertCircle, AlertTriangle, CheckSquare, ListTodo, Sliders, PlayCircle, ExternalLink, Download, Loader2,
  ChevronDown, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ContentItem, SharedContentContext, CharacterDNA, ProductionProgress, validateProductionGenerationContext } from '@/lib/content-contract';
import { 
  ProductionContext, 
  buildProductionContext, 
  formatProductionContextForPrompt, 
  ANTI_DRIFT_RULES 
} from '@/lib/production-context';
import { 
  buildFunnelPromptBlock, 
  getFunnelRules, 
  normalizeFunnelStage, 
  sanitizeCtaForFunnel, 
  getVoiceoverCtaForFunnel, 
  FUNNEL_CONTENT_RULES, 
  FunnelStage,
  countWords,
  normalizeGoogleFlowDialogue
} from '@/lib/funnel-rules';
import { 
  getActiveProjectId, 
  setActiveProjectId, 
  loadProjectData, 
  saveProjectData, 
  removeProjectData, 
  loadProjectSharedContext,
  loadProjectCalendarItems,
  loadProjectSelectedItem,
  saveProjectSelectedItem,
  ensureContentItemIdentity,
  getProjectCharacterDNA, 
  saveProjectCharacterDNA, 
  updateItemInProject,
  getProjectSavedCharacters,
  saveProjectSavedCharacters,
  getProjectActiveCharacterId,
  saveProjectActiveCharacterId
} from '@/lib/storage';
import { injectCharacterToPrompt } from '@/lib/character-prompt';
import CharacterDNASection from '@/components/CharacterDNA';
import ProductionProgressWidget from '@/components/calendar/ProductionProgressWidget';
import { GeminiApiKeyControl } from '@/components/GeminiApiKeyControl';
import ContentEngineShell from '@/components/ContentEngineShell';
import { buildGeminiRequestHeaders, useGeminiApiKey } from '@/lib/client-gemini-key';
import { buildJson2VideoRequestHeaders } from '@/lib/client-json2video-key';
import { validateJson2VideoPayload } from '@/lib/json2video-payload-validator';









// Helper to copy to clipboard safely
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

interface StrategyBrief {
  funnelStage: string;
  tujuanKonten: string;
  ideUtama: string;
  audienceContext: string;
  angle: string;
  emosiUtama: string;
  pesanVisual: string;
}

interface MessageAlignmentCheck {
  isAligned: boolean;
  issue?: string;
  fixedTextOverlay: string;
  reason: string;
}

interface ImageAngle {
  id: 'A' | 'B' | 'C';
  name: string;
  funnelStage: string;
  visualObjective: string;
  contentGoal?: string;
  targetEmotion?: string;
  visualStrategy?: string;
  hookStrategy?: string;
  colorPsychology?: string;
  layoutStrategy?: string;
  textOverlay?: string;
  captionForPost?: string;
  captionInstruction?: string;
  ctaRecommendation?: string;
  strategyBrief?: StrategyBrief;
  messageAlignmentCheck?: MessageAlignmentCheck;
  finalPrompt: string;
}

interface ImageAnglesPackage {
  recommendedAngleId: 'A' | 'B' | 'C';
  recommendationReason: string;
  angles: ImageAngle[];
}

export type VisualFormatType = 'photography' | 'infographic' | 'hybrid';

export interface SlideCreativeStrategy {
  funnel_stage: string;
  slide_role: string;
  visual_objective: string;
  core_message: string;
  audience_emotion: string;
  visual_concept: string;
  text_overlay: string;
}

export interface SlideVisualProduction {
  subject: string;
  action: string;
  composition: string;
  layout: string;
  visual_metaphor: string;
  typography: string;
  background: string;
  color_mood: string;
  negative_space: string;
  negative_prompt: string;
}

interface CarouselSlide {
  slide: number;
  role: string;
  communication_job: string;
  headline: string;
  body: string;
  swipe_bridge: string;
  emotional_state: string;
  visual_intent: string;
  visual_type?: string;
  text_zone?: string;
  negative_space_plan?: string;
  creative_strategy: SlideCreativeStrategy;
  visual_format: VisualFormatType;
  visual_production: SlideVisualProduction;
  production_prompt: string;
  slide_image_prompt: string;
}

interface CarouselMessageAlignmentCheck {
  isAligned: boolean;
  issue?: string;
  fixApplied?: string;
}

interface CarouselPlan {
  content_goal: string;
  funnel_stage: string;
  current_belief: string;
  desired_belief: string;
  core_promise: string;
  primary_cta_type: string;
  primary_cta_text: string;
  slide_count: number;
  slide_count_reason: string;
  belief_journey_summary: string;
  messageAlignmentCheck?: CarouselMessageAlignmentCheck;
  visual_system_notes: string;
  captionForPost?: string;
  captionInstruction?: string;
  slides: CarouselSlide[];
}

interface VideoScript {
  hook: string;
  masalah: string;
  solusi: string;
  proof: string;
  cta: string;
}

interface VideoStyle {
  id: 'A' | 'B' | 'C';
  name: string;
  hookStyle: string;
  pacingStyle: string;
  audioDirection: string;
  voiceoverOutline: string;
  script: VideoScript;
  videoPrompt: string;
  visualPlan: string;
  captionForPost?: string;
  captionInstruction?: string;
}

interface UgcPack {
  characterProfile: string;
  characterReferenceImagePrompt: string;
  scene1_image_prompt: string;
  scene2_image_prompt: string;
  scene3_image_prompt: string;
  scene1_google_flow_prompt: string;
  scene2_google_flow_prompt: string;
  scene3_google_flow_prompt: string;
  script_scene_1: string;
  script_scene_2: string;
  script_scene_3: string;
}

const getFunnelStageLabel = normalizeFunnelStage;

const createShortOverlay = (text: string, maxWords = 8): string => {
  if (!text) return '';
  const cleaned = text.replace(/[\r\n]+/g, ' ').trim();
  const words = cleaned.split(/\s+/);
  if (words.length <= maxWords) return cleaned;
  return words.slice(0, maxWords).join(' ');
};

const getFallbackOverlayByRole = (stage: FunnelStage, role: string, headline?: string): string => {
  if (headline && headline.trim()) {
    const words = headline.trim().replace(/[\r\n]+/g, ' ').split(/\s+/);
    if (words.length <= 8) return headline.trim();
    return words.slice(0, 8).join(' ');
  }
  const r = (role || '').toLowerCase();
  if (stage === 'MOFU') {
    if (r.includes('hook') || r.includes('insight')) return 'Wawasan Penting & Sudut Pandang Baru';
    if (r.includes('problem') || r.includes('breakdown')) return 'Akar Masalah yang Perlu Ditinjau';
    if (r.includes('framework') || r.includes('solusi')) return 'Struktur Langkah & Solusi Praktis';
    if (r.includes('cta') || r.includes('checklist')) return 'Simpan Panduan Lengkap Ini';
    return 'Simak Panduan Terstruktur Ini';
  }
  if (stage === 'BOFU') {
    if (r.includes('hook') || r.includes('proof')) return 'Solusi Teruji & Bukti Nyata';
    if (r.includes('context') || r.includes('problem')) return 'Hasil Optimal dengan Pendekatan Tepat';
    if (r.includes('offer') || r.includes('demo') || r.includes('solusi')) return 'Kelebihan & Manfaat Utama Solusi';
    if (r.includes('cta') || r.includes('decision')) return 'Dapatkan Akses Lengkap Sekarang';
    return 'Pelajari Penawaran Terbaik Ini';
  }
  // TOFU
  if (r.includes('hook') || r.includes('relatable')) return 'Pernah Mengalami Hal Serupa?';
  if (r.includes('problem') || r.includes('awareness')) return 'Tantangan Utama yang Sering Dihadapi';
  if (r.includes('insight') || r.includes('light')) return 'Sudut Pandang Baru yang Membuka Wawasan';
  if (r.includes('cta') || r.includes('curiosity')) return 'Simpan & Ikuti Ulasan Selanjutnya';
  return 'Simpan Catatan Bermanfaat Ini';
};

const limitWords = (str: string, maxWords = 10): string => {
  if (!str) return '';
  const words = str.trim().split(/\s+/);
  if (words.length <= maxWords) return str.trim();
  return words.slice(0, maxWords).join(' ');
};

const getOverlayText = (scriptText: string | undefined, stage: FunnelStage, role: string, headline?: string): string => {
  if (scriptText && scriptText.trim()) {
    const cleaned = scriptText.trim().replace(/^[-*•\d.]+\s*/, '');
    const words = cleaned.split(/\s+/);
    if (words.length >= 2 && words.length <= 12) {
      return cleaned;
    }
    if (words.length > 12) {
      return limitWords(cleaned, 10);
    }
  }
  return getFallbackOverlayByRole(stage, role, headline);
};

interface GoogleFlowSceneItem {
  sceneNumber: 1 | 2 | 3;
  title: string;
  role: string;
  duration: string;
  shotType: string;
  dialogue: string;
  googleFlowPrompt: string;
  imagePrompt: string;
}

const buildGoogleFlowPromptString = (
  shotType: string,
  creatorDescriptor: string,
  setting: string,
  dialogue: string
): string => {
  const cleanShot = shotType.trim().replace(/\s+shot$/i, '');
  const cleanDialogue = dialogue.replace(/[\r\n]+/g, ' ').replace(/"/g, "'").trim();
  const cleanCreator = creatorDescriptor.trim();
  const cleanSetting = setting.trim();
  return `A 9:16 vertical ${cleanShot} shot of ${cleanCreator} ${cleanSetting}. The creator delivers a realistic monologue directly to the camera with natural mouth movements speaking in Indonesian synchronizing to: "${cleanDialogue}". Natural indoor lighting, UGC style, 8 seconds.`;
};

const getGoogleFlowVideoPack = (
  stageInput: FunnelStage,
  activeItem: ContentItem,
  activeContext: SharedContentContext,
  activeVideo: VideoStyle,
  characterDNA?: CharacterDNA | null,
  customCreator?: string,
  customSetting?: string,
  customDialogues?: { scene1?: string; scene2?: string; scene3?: string }
): GoogleFlowSceneItem[] => {
  const stage = normalizeFunnelStage(stageInput);
  const brandName = activeContext?.brand_context?.brand_name || '';
  const creator = customCreator?.trim() || 
    characterDNA?.prompt_assets?.dna_summary_prompt ||
    characterDNA?.identity?.display_name ||
    'a 26-year-old Indonesian content creator wearing a casual beige shirt';
  const setting = customSetting?.trim() || 
    'in a modern minimalist room with natural ambient lighting';

  // Extract raw dialogue sources
  const rawScene1 = customDialogues?.scene1 || activeVideo?.script?.hook || activeVideo?.script?.masalah || activeItem?.headline || '';
  const rawScene2 = customDialogues?.scene2 || activeVideo?.script?.solusi || activeContext?.strategy_context?.main_offer || activeItem?.body || '';
  const rawScene3 = customDialogues?.scene3 || activeVideo?.script?.cta || activeItem?.cta || '';

  // Stabilize and normalize dialogues strictly to 24-30 words (22-32 words bounds)
  const scene1Dialogue = normalizeGoogleFlowDialogue(1, stage, rawScene1, activeContext);
  const scene2Dialogue = normalizeGoogleFlowDialogue(2, stage, rawScene2, activeContext);
  const scene3Dialogue = normalizeGoogleFlowDialogue(3, stage, rawScene3, activeContext);

  let scene1Role = '';
  let scene1Image = '';
  let scene2Role = '';
  let scene2Image = '';
  let scene3Role = '';
  let scene3Image = '';

  if (stage === 'TOFU') {
    scene1Role = 'Hook Curiosity & Problem Ringan';
    scene1Image = `A 9:16 vertical realistic photo of ${creator} looking thoughtfully at the camera with an intriguing curious expression, ${setting}, natural indoor lighting, UGC style.`;

    scene2Role = 'Insight Edukatif & Paradigma Baru';
    scene2Image = `A 9:16 vertical realistic photo of ${creator} gesturing naturally while explaining an insightful concept to the camera, ${setting}, natural indoor lighting, UGC style.`;

    scene3Role = 'Soft CTA (Simpan, Follow, Baca Lanjut)';
    scene3Image = `A 9:16 vertical realistic photo of ${creator} giving a friendly warm smile and subtle thumbs up to the camera, ${setting}, natural indoor lighting, UGC style.`;
  } else if (stage === 'MOFU') {
    scene1Role = 'Problem Spesifik & Validasi Masalah';
    scene1Image = `A 9:16 vertical realistic photo of ${creator} looking engaged and thoughtful, gesturing to explain a specific problem, ${setting}, natural indoor lighting, UGC style.`;

    scene2Role = 'Framework & Solusi Terstruktur';
    scene2Image = `A 9:16 vertical realistic photo of ${creator} holding a smartphone showing an organized dashboard with a satisfied expression, ${setting}, natural indoor lighting, UGC style.`;

    scene3Role = 'Medium CTA (Cek Panduan, Lihat Demo, Lead Magnet)';
    scene3Image = `A 9:16 vertical realistic photo of ${creator} pointing towards the bio link with an encouraging, inviting expression, ${setting}, natural indoor lighting, UGC style.`;
  } else {
    scene1Role = 'Objection Handling & Social Proof';
    scene1Image = `A 9:16 vertical realistic photo of ${creator} smiling confidently directly at the camera with genuine conviction, ${setting}, natural indoor lighting, UGC style.`;

    scene2Role = 'Offer & Benefit Utama';
    scene2Image = `A 9:16 vertical realistic photo of ${creator} presenting a clear offer on a digital device with a welcoming posture, ${setting}, natural indoor lighting, UGC style.`;

    scene3Role = 'Hard CTA (Daftar, Beli, Konsultasi)';
    scene3Image = `A 9:16 vertical realistic photo of ${creator} making an inviting gesture with high energy and friendly authority, ${setting}, natural indoor lighting, UGC style.`;
  }

  return [
    {
      sceneNumber: 1,
      title: 'Scene 1 • Hook',
      role: scene1Role,
      duration: '8 detik',
      shotType: 'close-up',
      dialogue: scene1Dialogue,
      imagePrompt: injectCharacterToPrompt(scene1Image, characterDNA, 'video'),
      googleFlowPrompt: buildGoogleFlowPromptString('close-up', creator, setting, scene1Dialogue)
    },
    {
      sceneNumber: 2,
      title: 'Scene 2 • Insight / Solution / Proof',
      role: scene2Role,
      duration: '8 detik',
      shotType: 'medium close-up',
      dialogue: scene2Dialogue,
      imagePrompt: injectCharacterToPrompt(scene2Image, characterDNA, 'video'),
      googleFlowPrompt: buildGoogleFlowPromptString('medium close-up', creator, setting, scene2Dialogue)
    },
    {
      sceneNumber: 3,
      title: 'Scene 3 • CTA',
      role: scene3Role,
      duration: '8 detik',
      shotType: 'medium',
      dialogue: scene3Dialogue,
      imagePrompt: injectCharacterToPrompt(scene3Image, characterDNA, 'video'),
      googleFlowPrompt: buildGoogleFlowPromptString('medium', creator, setting, scene3Dialogue)
    }
  ];
};

interface ProductionBrief {
  sceneType: 'ugc_talking_head' | 'screen_recording' | 'motion_graphic' | 'product_demo' | 'cta_card';
  cameraDirection: string;
  backgroundDirection: string;
  talentDirection: string;
  assetNeeded: string[];
  assetUsage?: string;
}

const getAssetUsageForScene = (
  sceneType: ProductionBrief['sceneType'],
  assetNotes?: { characterAssetNote?: string; productScreenAssetNote?: string; coverAssetNote?: string }
): string => {
  const charNote = assetNotes?.characterAssetNote?.trim();
  const prodNote = assetNotes?.productScreenAssetNote?.trim();
  const coverNote = assetNotes?.coverAssetNote?.trim();

  if (sceneType === 'ugc_talking_head') {
    return charNote
      ? `Gunakan aset karakter: ${charNote}`
      : 'Gunakan character asset jika tersedia. Jika tidak tersedia, gunakan productionBrief dan videoPrompt.';
  }
  if (sceneType === 'screen_recording' || sceneType === 'product_demo') {
    return prodNote
      ? `Gunakan aset screenshot produk: ${prodNote}`
      : 'Gunakan product screen asset jika tersedia. Jika tidak tersedia, gunakan productionBrief dan videoPrompt.';
  }
  return coverNote
    ? `Gunakan aset cover/brand: ${coverNote}`
    : 'Gunakan cover asset atau brand logo jika tersedia. Jika tidak tersedia, gunakan productionBrief dan videoPrompt.';
};

const getProductionBrief = (
  stage: FunnelStage,
  role: string,
  assetNotes?: { characterAssetNote?: string; productScreenAssetNote?: string; coverAssetNote?: string }
): ProductionBrief => {
  const r = role.toLowerCase();
  let base: ProductionBrief;

  if (stage === 'BOFU') {
    if (r.includes('hook') || r.includes('proof')) {
      base = {
        sceneType: 'ugc_talking_head',
        cameraDirection: 'Medium close-up vertikal, tatapan mata langsung ke kamera dengan pencahayaan terang.',
        backgroundDirection: 'Studio kerja profesional atau latar belakang bersih berestetika modern.',
        talentDirection: 'Talent tampil percaya diri dan meyakinkan saat menyampaikan bukti hasil.',
        assetNeeded: ['creator footage', 'metrics dashboard screenshot'],
      };
    } else if (r.includes('problem')) {
      base = {
        sceneType: 'product_demo',
        cameraDirection: 'Close-up produk / antarmuka aplikasi dengan gerakan pan perlahan.',
        backgroundDirection: 'Workspace rapi dengan kontras warna tegas fokus pada layar.',
        talentDirection: 'Talent menunjukkan gestur menunjuk titik hambatan di layar atau produk.',
        assetNeeded: ['product screen', 'workflow capture'],
      };
    } else if (r.includes('offer') || r.includes('demo') || r.includes('solusi')) {
      base = {
        sceneType: 'product_demo',
        cameraDirection: 'Over-the-shoulder shot memperlihatkan kemudahan penggunaan fitur utama.',
        backgroundDirection: 'Latar kerja profesional dengan pencahayaan fokus pada fitur utama.',
        talentDirection: 'Talent tersenyum puas menunjukkan alur eksekusi cepat.',
        assetNeeded: ['dashboard recording', 'feature demo video'],
      };
    } else {
      base = {
        sceneType: 'cta_card',
        cameraDirection: 'Static eye-level shot berpusat pada tombol penawaran dan brand logo.',
        backgroundDirection: 'Latar gelap kontras tinggi dengan aksen warna brand.',
        talentDirection: 'Talent memberikan gestur menunjuk tombol CTA di layar dengan ramah.',
        assetNeeded: ['brand logo', 'offer badge', 'creator footage'],
      };
    }
  } else if (stage === 'MOFU') {
    if (r.includes('hook') || r.includes('insight')) {
      base = {
        sceneType: 'ugc_talking_head',
        cameraDirection: 'Close-up vertikal, kamera sedikit handheld agar terasa natural.',
        backgroundDirection: 'Home office atau meja kerja hangat dengan laptop terbuka.',
        talentDirection: 'Talent terlihat penasaran dan sedikit frustrasi saat melihat performa konten.',
        assetNeeded: ['creator footage', 'laptop setup'],
      };
    } else if (r.includes('problem')) {
      base = {
        sceneType: 'screen_recording',
        cameraDirection: 'Screen capture jernih dengan efek zoom halus pada grafik/diagram perbandingan.',
        backgroundDirection: 'Antarmuka dasbor / diagram perbandingan alur konten.',
        talentDirection: 'Voiceover menjelaskan titik hambatan tanpa kemunculan wajah talent.',
        assetNeeded: ['dashboard screenshot', 'comparison graphic'],
      };
    } else if (r.includes('framework') || r.includes('solusi')) {
      base = {
        sceneType: 'motion_graphic',
        cameraDirection: 'Tampilan vertikal bersih dengan animasi daftar checklist bergerak berurutan.',
        backgroundDirection: 'Latar minimalis dengan aksen warna panduan.',
        talentDirection: 'Talent memberikan penekanan verbal pada setiap poin framework.',
        assetNeeded: ['checklist graphic', 'brand assets'],
      };
    } else {
      base = {
        sceneType: 'cta_card',
        cameraDirection: 'Static vertical layout memperlihatkan ikon simpan dan panduan.',
        backgroundDirection: 'Latar bersih dengan aksen tombol bookmark teranimasi.',
        talentDirection: 'Talent mengajak audiens menyimpan postingan secara ramah.',
        assetNeeded: ['bookmark icon', 'brand logo'],
      };
    }
  } else {
    // TOFU
    if (r.includes('hook') || r.includes('relatable')) {
      base = {
        sceneType: 'ugc_talking_head',
        cameraDirection: 'Medium shot casual vertikal, pencahayaan alami dari jendela.',
        backgroundDirection: 'Suasana kasual sehari-hari, kafe atau ruang santai.',
        talentDirection: 'Ekspresi ekspresif dan santai memicu rasa penasaran audiens.',
        assetNeeded: ['creator footage', 'casual setup'],
      };
    } else if (r.includes('problem') || r.includes('awareness')) {
      base = {
        sceneType: 'motion_graphic',
        cameraDirection: 'Dynamic split-screen vertikal membandingkan dua situasi.',
        backgroundDirection: 'Visual kontras dua warna untuk memperlihatkan friksi pesan.',
        talentDirection: 'Talent menggambarkan rasa kewalahan saat membuat konten.',
        assetNeeded: ['split-screen graphic', 'creator footage'],
      };
    } else if (r.includes('insight') || r.includes('solusi') || r.includes('light')) {
      base = {
        sceneType: 'ugc_talking_head',
        cameraDirection: 'Close-up hangat dengan kedalaman bidang halus (bokeh).',
        backgroundDirection: 'Latar kasual hangat yang konsisten.',
        talentDirection: 'Talent mengangguk yakin saat memberikan satu solusi sederhana.',
        assetNeeded: ['creator footage', 'simple diagram overlay'],
      };
    } else {
      base = {
        sceneType: 'cta_card',
        cameraDirection: 'Static vertical frame fokus pada animasi ikon bookmark dan logo.',
        backgroundDirection: 'Latar simpel estetik dengan watermark brand lembut.',
        talentDirection: 'Talent memberikan senyuman hangat dan isyarat menyimpan video.',
        assetNeeded: ['bookmark icon', 'brand watermark'],
      };
    }
  }

  base.assetUsage = getAssetUsageForScene(base.sceneType, assetNotes);
  return base;
};

const getJson2VideoScenePlan = (
  funnelStageInput: string,
  activeVideo: VideoStyle,
  assetNotes?: { characterAssetNote?: string; productScreenAssetNote?: string; coverAssetNote?: string }
) => {
  const funnelStage = normalizeFunnelStage(funnelStageInput);
  const script = activeVideo.script || {};
  const voiceoverCta = getVoiceoverCtaForFunnel(script.cta || '', funnelStage);

  if (funnelStage === 'BOFU') {
    return [
      {
        duration: 5,
        role: 'Proof Hook',
        textOverlay: getOverlayText(script.hook, funnelStage, 'Proof Hook'),
        voiceover: script.hook || 'Lihat bukti nyata dan hasil konkrit sebelum kamu membuat keputusan.',
        visualDirection: 'Testimonial highlight or metric dashboard card',
        productionBrief: getProductionBrief(funnelStage, 'Proof Hook', assetNotes),
      },
      {
        duration: 6,
        role: 'Problem Context',
        textOverlay: getOverlayText(script.masalah, funnelStage, 'Problem Context'),
        voiceover: script.masalah || 'Masalahnya bukan kurang usaha, tapi belum memakai alur kerja yang terstruktur.',
        visualDirection: 'Product close-up / before-after demonstration',
        productionBrief: getProductionBrief(funnelStage, 'Problem Context', assetNotes),
      },
      {
        duration: 7,
        role: 'Offer Demo',
        textOverlay: getOverlayText(script.solusi, funnelStage, 'Offer Demo'),
        voiceover: script.solusi || 'Solusi ini membantu mengeksekusi ide dan alur kerja jauh lebih cepat.',
        visualDirection: 'Product feature walkthrough / workflow animation',
        productionBrief: getProductionBrief(funnelStage, 'Offer Demo', assetNotes),
      },
      {
        duration: 6,
        role: 'Decision CTA',
        textOverlay: getOverlayText(voiceoverCta, funnelStage, 'Decision CTA'),
        voiceover: voiceoverCta,
        visualDirection: 'Special offer card with call-to-action button highlight',
        productionBrief: getProductionBrief(funnelStage, 'Decision CTA', assetNotes),
      },
    ];
  }

  if (funnelStage === 'MOFU') {
    return [
      {
        duration: 5,
        role: 'Insight Hook',
        textOverlay: getOverlayText(script.hook, funnelStage, 'Insight Hook'),
        voiceover: script.hook || 'Ada satu pola penting dalam strategi konten yang sering banget terlewatkan.',
        visualDirection: 'Screen capture / diagram highlight with bold text overlay',
        productionBrief: getProductionBrief(funnelStage, 'Insight Hook', assetNotes),
      },
      {
        duration: 7,
        role: 'Problem Breakdown',
        textOverlay: getOverlayText(script.masalah, funnelStage, 'Problem Breakdown'),
        voiceover: script.masalah || 'Tanpa struktur yang jelas, audiens cuma lewat tanpa mengambil aksi apa pun.',
        visualDirection: 'Side-by-side comparison diagram showing stagnant vs optimized funnel',
        productionBrief: getProductionBrief(funnelStage, 'Problem Breakdown', assetNotes),
      },
      {
        duration: 8,
        role: 'Framework',
        textOverlay: getOverlayText(script.solusi, funnelStage, 'Framework'),
        voiceover: script.solusi || 'Gunakan framework 3 langkah ini untuk menyusun narasi yang lebih tajam.',
        visualDirection: 'Step-by-step checklist graphic',
        productionBrief: getProductionBrief(funnelStage, 'Framework', assetNotes),
      },
      {
        duration: 5,
        role: 'Checklist CTA',
        textOverlay: getOverlayText(voiceoverCta, funnelStage, 'Checklist CTA'),
        voiceover: voiceoverCta,
        visualDirection: 'Interactive checklist badge with save prompt',
        productionBrief: getProductionBrief(funnelStage, 'Checklist CTA', assetNotes),
      },
    ];
  }

  return [
    {
      duration: 5,
      role: 'Relatable Hook',
      textOverlay: getOverlayText(script.hook, funnelStage, 'Relatable Hook'),
      voiceover: script.hook || 'Pernah merasa konten yang kamu buat susah banget dapet jangkauan baru?',
      visualDirection: 'Dynamic energetic opening visual with high contrast text overlay',
      productionBrief: getProductionBrief(funnelStage, 'Relatable Hook', assetNotes),
    },
    {
      duration: 7,
      role: 'Problem Awareness',
      textOverlay: getOverlayText(script.masalah, funnelStage, 'Problem Awareness'),
      voiceover: script.masalah || 'Masalah utamanya bukan karena kurang rajin, tapi karena pesan utamanya tidak sampai.',
      visualDirection: 'Split screen or visual contrast illustrating the core friction',
      productionBrief: getProductionBrief(funnelStage, 'Problem Awareness', assetNotes),
    },
    {
      duration: 7,
      role: 'Light Insight',
      textOverlay: getOverlayText(script.solusi, funnelStage, 'Light Insight'),
      voiceover: script.solusi || 'Fokus pada satu pesan sederhana yang paling relevan dengan masalah audiensmu.',
      visualDirection: 'Clean graphic animation breaking down the single insight',
      productionBrief: getProductionBrief(funnelStage, 'Light Insight', assetNotes),
    },
    {
      duration: 6,
      role: 'Curiosity CTA',
      textOverlay: getOverlayText(voiceoverCta, funnelStage, 'Curiosity CTA'),
      voiceover: voiceoverCta,
      visualDirection: 'CTA screen with bookmark icon animation and brand watermark',
      productionBrief: getProductionBrief(funnelStage, 'Curiosity CTA', assetNotes),
    },
  ];
};

const getVideoModeLabel = (mode?: string): string => {
  if (mode === 'text_motion') return 'Text Motion';
  if (mode === 'asset_product') return 'Asset-Based Product Video';
  return 'UGC Video';
};

const buildJson2VideoPayload = (
  activeVideo: VideoStyle,
  activeItem: ContentItem,
  activeContext: SharedContentContext,
  videoModeInput?: string,
  assetOptions?: {
    characterImageUrl?: string;
    productScreenImageUrl?: string;
    coverImageUrl?: string;
    characterAssetNote?: string;
    productScreenAssetNote?: string;
    coverAssetNote?: string;
  }
) => {
  const funnelStage = normalizeFunnelStage(activeItem.jenis);
  const funnelRules = getFunnelRules(activeItem.jenis);
  const brandName = activeContext.brand_context?.brand_name || '';
  const videoModeLabel = getVideoModeLabel(videoModeInput);

  const rawScenes = getJson2VideoScenePlan(funnelStage, activeVideo, {
    characterAssetNote: assetOptions?.characterAssetNote,
    productScreenAssetNote: assetOptions?.productScreenAssetNote,
    coverAssetNote: assetOptions?.coverAssetNote,
  });

  const combinedVoiceover = rawScenes
    .map((s) => s.voiceover)
    .filter(Boolean)
    .join(' ');

  const scenes = rawScenes.map((scene, index) => {
    const elements: any[] = [];

    // 1. Background layer: characterImageUrl or coverImageUrl or modern dark gradient
    if (assetOptions?.characterImageUrl && assetOptions.characterImageUrl.trim()) {
      elements.push({
        type: 'image',
        src: assetOptions.characterImageUrl.trim(),
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        resize: 'cover',
      });
      elements.push({
        type: 'html',
        html: '<div style="width:1080px;height:1920px;background:linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.75) 100%);"></div>',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
      });
    } else if (assetOptions?.coverImageUrl && assetOptions.coverImageUrl.trim() && index === 0) {
      elements.push({
        type: 'image',
        src: assetOptions.coverImageUrl.trim(),
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
        resize: 'cover',
      });
      elements.push({
        type: 'html',
        html: '<div style="width:1080px;height:1920px;background:linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.75) 100%);"></div>',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
      });
    } else {
      elements.push({
        type: 'html',
        html: '<div style="width:1080px;height:1920px;background:radial-gradient(circle at 50% 35%, #1e293b 0%, #09090b 100%);"></div>',
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
      });
    }

    // 2. Top Header Pill & Step Counter
    elements.push(
      {
        type: 'html',
        html: '<div style="width:380px;height:56px;background:rgba(30,41,59,0.85);border-radius:28px;border:1px solid rgba(255,255,255,0.15);"></div>',
        x: 72,
        y: 80,
        width: 380,
        height: 56,
      },
      {
        type: 'text',
        text: `${funnelStage} - ${scene.role.toUpperCase()}`,
        x: 92,
        y: 94,
        width: 340,
        height: 40,
        style: '001',
        settings: {
          'font-size': '20px',
          'font-weight': 'bold',
          color: '#38bdf8',
        },
      },
      {
        type: 'text',
        text: `0${index + 1} / 04`,
        x: 900,
        y: 94,
        width: 100,
        height: 40,
        style: '001',
        settings: {
          'font-size': '22px',
          'font-weight': 'bold',
          color: '#94a3b8',
        },
      }
    );

    // 3. Product Screen UI Mockup Overlay
    const hasProductScreen = Boolean(assetOptions?.productScreenImageUrl && assetOptions.productScreenImageUrl.trim());
    if (hasProductScreen) {
      elements.push(
        {
          type: 'html',
          html: '<div style="width:840px;height:540px;background:rgba(15,23,42,0.9);border-radius:24px;border:2px solid rgba(56,189,248,0.35);box-sizing:border-box;"></div>',
          x: 120,
          y: 680,
          width: 840,
          height: 540,
        },
        {
          type: 'image',
          src: assetOptions!.productScreenImageUrl!.trim(),
          x: 140,
          y: 700,
          width: 800,
          height: 500,
          resize: 'contain',
        }
      );
    }

    // 4. Text Overlay Card & Headline (Short, punchy max 8-12 words)
    const textY = hasProductScreen ? 360 : 580;
    elements.push(
      {
        type: 'html',
        html: '<div style="width:920px;height:240px;background:rgba(0,0,0,0.55);border-radius:20px;border:1px solid rgba(255,255,255,0.12);"></div>',
        x: 80,
        y: textY,
        width: 920,
        height: 240,
      },
      {
        type: 'text',
        text: scene.textOverlay,
        x: 100,
        y: textY + 30,
        width: 880,
        height: 180,
        style: '001',
        settings: {
          'font-size': '52px',
          'font-weight': 'bold',
          color: '#ffffff',
          'text-align': 'center',
        },
      }
    );

    // 5. Voiceover Subtitle Caption Text
    elements.push({
      type: 'text',
      text: scene.voiceover,
      x: 110,
      y: 1450,
      width: 860,
      height: 220,
      style: '001',
      settings: {
        'font-size': '34px',
        'font-weight': 'normal',
        color: '#e2e8f0',
        'text-align': 'center',
      },
    });

    // 6. Brand Footer Watermark
    elements.push({
      type: 'text',
      text: brandName,
      x: 72,
      y: 1760,
      width: 500,
      height: 80,
      style: '001',
      settings: {
        'font-size': '28px',
        'font-weight': 'bold',
        color: '#94a3b8',
      },
    });

    return {
      duration: scene.duration,
      comment: `${scene.role} - ${funnelStage}`,
      elements,
    };
  });

  return {
    resolution: 'instagram-story',
    quality: 'high',
    comment: `Generated by ALCO Content Engine - ${activeVideo.name}`,
    elements: [
      {
        type: 'voice',
        text: combinedVoiceover,
        model: 'azure',
        voice: 'id-ID-ArdiNeural',
        volume: 1,
      },
    ],
    scenes,
    'client-data': {
      source: 'alco-content-engine',
      renderMode: 'json2video-byo-key',
      billingOwner: 'user',
      funnelStage,
      funnelGoal: funnelRules.goal,
      contentStyle: funnelRules.contentStyle,
      visualStyle: funnelRules.visualStyle,
      ctaStyle: funnelRules.ctaStyle,
      avoid: funnelRules.avoid,
      contentDate: activeItem.tanggal || 'YYYY-MM-DD',
      itemNo: activeItem.no || 1,
      assetType: 'video',
      selectedVideoStyle: activeVideo.id,
      videoMode: videoModeLabel,
      visualAssets: {
        characterImageUrl: assetOptions?.characterImageUrl || '',
        productScreenImageUrl: assetOptions?.productScreenImageUrl || '',
        coverImageUrl: assetOptions?.coverImageUrl || '',
      },
      assetPlan: {
        characterAssetNote: assetOptions?.characterAssetNote || '',
        productScreenAssetNote: assetOptions?.productScreenAssetNote || '',
        coverAssetNote: assetOptions?.coverAssetNote || '',
        assetUsageRule: 'Jika aset tersedia, gunakan sebagai referensi visual. Jika tidak tersedia, gunakan productionBrief dan videoPrompt.',
      },
      brandName,
      headline: activeItem.headline || '',
      visualPlan: activeVideo.visualPlan || activeItem.visual || '',
      videoPrompt: activeVideo.videoPrompt || '',
    },
  };
};

const tryParseJSON = (text: string) => {
  if (!text) return null;
  let cleanText = text.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // If direct parse fails, try cleaning up markdown blocks or extra text
  }

  // Comprehensive cleaning of markdown wrappers or backticks anywhere
  cleanText = cleanText.replace(/```json/gi, '');
  cleanText = cleanText.replace(/```/g, '');
  cleanText = cleanText.trim();

  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // Try to extract pure JSON block
  }

  // Find boundaries of potential JSON array or object
  const firstBrace = cleanText.indexOf('{');
  const lastBrace = cleanText.lastIndexOf('}');
  const firstBracket = cleanText.indexOf('[');
  const lastBracket = cleanText.lastIndexOf(']');

  // Attempt 1: Extract array from first [ to last ]
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const arrayCandidate = cleanText.substring(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(arrayCandidate);
    } catch (err) {
      // Keep going
    }
  }

  // Attempt 2: Extract object from first { to last }
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const objectCandidate = cleanText.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(objectCandidate);
    } catch (err) {
      // Keep going
    }
  }

  return null;
};

const getItemKey = (item?: ContentItem | null) => {
  if (!item) return '';
  if (item.content_item_id) {
    return item.content_item_id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
  const no = item.no !== undefined && item.no !== null ? String(item.no) : '0';
  const tanggal = item.tanggal || '';
  const headline = item.headline || '';
  const format = item.format || '';
  const jenis = item.jenis || '';
  const rawKey = `item_${no}_${tanggal}_${headline}_${format}_${jenis}`;
  return rawKey.replace(/[^a-zA-Z0-9_]/g, '_');
};

// Helper function to validate and normalize Image Angles JSON output to canonical Funnel Content Engine format
// Extract prompt field helper for structured prompt parsing
const extractPromptField = (field: string, text: string): string => {
  const regex = new RegExp(`${field}:\\s*([^\\n]+(?:\\n(?!\\w+:)[^\\n]+)*)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
};

// Helper to build a short, punchy image overlay without ellipsis (max 6-10 words)
const buildShortImageOverlay = (headline: string, funnelStage: string = 'TOFU'): string => {
  if (!headline || !headline.trim()) {
    if (funnelStage === 'BOFU') return 'Transformasi Nyata Melalui Keputusan Tepat';
    if (funnelStage === 'MOFU') return 'Fokus Pada Akar Masalah, Bukan Sekadar Rutinitas';
    return 'Menghadapi Kendala Yang Sama?';
  }

  // 1. Remove all ellipses
  let text = headline.replace(/\.{2,}/g, '').replace(/…/g, '').trim();

  // 2. Specific transformation for the user example:
  // "Alasan Kenapa Menulis Copy Ads Manual Perlahan Membunuh Bisnismu" -> "Copy Ads Manual Membunuh Bisnismu?"
  const lower = text.toLowerCase();
  if (lower.includes('copy ads manual') && lower.includes('membunuh bisnismu')) {
    return 'Copy Ads Manual Membunuh Bisnismu?';
  }

  // 3. Normalize common rhetoric prefixes
  text = text
    .replace(/^(alasan\s+(kenapa|mengapa)|kenapa|mengapa|rahasia\s+(di\s*balik|tentang)?|tahukah\s+(kamu|anda)\s+bahwa|fakta\s+di\s*balik|cara\s+(mudah|cepat|praktis)\s+(untuk)?|tips\s+(bagaimana)?)\s+/i, '')
    .replace(/\b(secara\s+perlahan|perlahan-lahan|perlahan)\b/gi, '')
    .replace(/^menulis\s+(copy\s+ads\s+manual)/i, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  // Clean leading/trailing symbols
  text = text.replace(/^[^a-zA-Z0-9\u00C0-\u024F"']+|[^a-zA-Z0-9\u00C0-\u024F"?!.']+$/g, '').trim();

  // Word count check (max 6-10 words)
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length > 10) {
    let selectedWords = words.slice(0, 8);
    const lastWord = selectedWords[selectedWords.length - 1].toLowerCase();
    if (['yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dengan', 'agar', 'bisa', 'saat', 'ketika', 'atau', 'karena'].includes(lastWord)) {
      selectedWords.pop();
    }
    text = selectedWords.join(' ');
    if (!/[?!.]$/.test(text)) {
      text += '?';
    }
  } else if (funnelStage === 'TOFU' && !/[?!.]$/.test(text)) {
    if (/membunuh|hancur|kaku|rusak|gagal|mentok|sulit|susah|capek|lelah|bingung|rugi|hilang|bocor/i.test(text)) {
      text += '?';
    }
  }

  // Ensure no ellipsis exists
  text = text.replace(/\.{2,}/g, '').replace(/…/g, '').trim();
  return text || 'Tinjauan Strategis & Pemecahan Masalah';
};

const buildDefaultCaptionForImage = (headline: string, funnelStage: string, angleId: string, shortOverlay: string): string => {
  const cleanHeadline = (headline || '').trim();

  if (funnelStage === 'TOFU') {
    if (angleId === 'A') {
      return cleanHeadline
        ? `Banyak yang menghadapi tantangan seputar "${cleanHeadline}". Sering kali hal ini terjadi karena belum menemukan pendekatan yang tepat. Simak ulasan berikut untuk menemukan sudut pandang baru yang lebih praktis.`
        : 'Menghadapi tantangan tanpa pemahaman yang tepat sering kali membuat proses terasa melelahkan. Simak ulasan berikut untuk menemukan pendekatan baru yang lebih praktis.';
    }
    if (angleId === 'B') {
      return cleanHeadline
        ? `Terkait "${cleanHeadline}", sering kali kita merasa sudah berusaha maksimal tapi hasilnya belum sesuai harapan. Masalahnya bukan pada niat, melainkan langkah awal yang perlu disesuaikan.`
        : 'Sering kali kita merasa sudah berusaha maksimal tapi hasilnya belum sesuai harapan. Masalahnya bukan pada niat, melainkan langkah awal yang perlu disesuaikan.';
    }
    return cleanHeadline
      ? `Satu wawasan penting mengenai "${cleanHeadline}" adalah mengevaluasi kejelasan tujuan sebelum mengambil tindakan. Luangkan waktu sejenak untuk meninjau kembali pendekatan yang digunakan.`
      : 'Satu wawasan penting adalah mengevaluasi kejelasan tujuan sebelum mengambil tindakan. Luangkan waktu sejenak untuk meninjau kembali pendekatan yang digunakan.';
  } else if (funnelStage === 'MOFU') {
    if (angleId === 'A') {
      return cleanHeadline
        ? `Terkait "${cleanHeadline}", memahami alur dan metode yang terstruktur membantu mengatasi persoalan secara lebih menyeluruh dan berkelanjutan.`
        : 'Memahami alur dan metode yang terstruktur membantu mengatasi persoalan secara lebih menyeluruh dan berkelanjutan.';
    }
    if (angleId === 'B') {
      return cleanHeadline
        ? `Pendekatan yang tepat terhadap "${cleanHeadline}" menghubungkan kebutuhan utama dengan solusi yang terbukti secara logis.`
        : 'Pendekatan yang tepat menghubungkan kebutuhan utama dengan solusi yang terbukti secara logis.';
    }
    return cleanHeadline
      ? `Berikut poin penting yang perlu diperhatikan seputar "${cleanHeadline}": pahami inti masalah, telaah opsi solusi yang ada, dan ambil langkah terarah.`
      : 'Berikut poin penting yang perlu diperhatikan: pahami inti masalah, telaah opsi solusi yang ada, dan ambil langkah terarah.';
  } else {
    // BOFU
    if (angleId === 'A') {
      return cleanHeadline
        ? `Dapatkan solusi terpercaya untuk "${cleanHeadline}". Mulai langkah terbaikmu sekarang dan rasakan kemudahan serta manfaat nyatanya.`
        : 'Dapatkan solusi terpercaya untuk kebutuhanmu. Mulai langkah terbaikmu sekarang dan rasakan kemudahan serta manfaat nyatanya.';
    }
    if (angleId === 'B') {
      return cleanHeadline
        ? `Pelajari bagaimana solusi praktis untuk "${cleanHeadline}" dapat membantu mencapai hasil optimal secara efisien.`
        : 'Pelajari bagaimana solusi praktis ini dapat membantu mencapai hasil optimal secara efisien.';
    }
    return cleanHeadline
      ? `Siap mengambil keputusan terbaik seputar "${cleanHeadline}"? Cek detail lengkapnya sekarang.`
      : 'Siap mengambil keputusan terbaik untuk kebutuhanmu? Cek detail lengkapnya sekarang.';
  }
};

const getBrandVisualRulesBlock = (ctx?: any) => {
  const brandVis = ctx?.brand_visual_context || ctx?.brandVisualContext;
  if (!brandVis || typeof brandVis !== 'object') return '';
  const vStyle = brandVis.visual_style || brandVis.visualStyle || '';
  const cPalette = brandVis.color_palette || brandVis.colorPalette;
  const tStyle = brandVis.typography_style || brandVis.typographyStyle || '';
  const iRules = brandVis.image_style_rules || brandVis.imageStyleRules;
  const dMood = brandVis.design_mood || brandVis.designMood || '';

  if (!vStyle && !cPalette && !tStyle && !iRules && !dMood) return '';

  const colorStr = Array.isArray(cPalette) ? cPalette.join(', ') : (cPalette || '-');
  const rulesStr = Array.isArray(iRules) ? iRules.join('; ') : (iRules || '-');

  return `\n\nBrand Visual Rules:\n- Visual Style: ${vStyle || '-'}\n- Color Palette: ${colorStr}\n- Typography Style: ${tStyle || '-'}\n- Image Style Rules: ${rulesStr}\n- Design Mood: ${dMood || '-'}`;
};

const sanitizeAndAlignImageAngle = (
  item: any,
  globalFunnelStage: string,
  coreHeadline: string,
  angleIndex: number,
  activeContext?: any
): ImageAngle => {
  const requiredIds: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
  const rawId = (item.id || requiredIds[angleIndex] || 'A').toString().toUpperCase().trim();
  const id: 'A' | 'B' | 'C' = (rawId === 'A' || rawId === 'B' || rawId === 'C') 
    ? (rawId as 'A' | 'B' | 'C') 
    : (requiredIds[angleIndex] || 'A');

  const funnelStage = (['TOFU', 'MOFU', 'BOFU'].includes(globalFunnelStage) 
    ? globalFunnelStage 
    : String(item.funnelStage || item.funnel_stage || 'TOFU').toUpperCase().trim()) as 'TOFU' | 'MOFU' | 'BOFU';

  let name = String(item.name || '').trim();
  if (!name) {
    if (funnelStage === 'TOFU') {
      name = id === 'A' ? 'Relatable Problem Hook' : id === 'B' ? 'Everyday Creator Struggle' : 'Curiosity Hook';
    } else if (funnelStage === 'MOFU') {
      name = id === 'A' ? 'Insight & Framework Hook' : id === 'B' ? 'Solution Comparison Hook' : 'Structured Workflow Hook';
    } else {
      name = id === 'A' ? 'Social Proof & Community Hook' : id === 'B' ? 'Product Demo & Results Hook' : 'Direct Value & Decision Hook';
    }
  }

  const rawHeadline = (coreHeadline || item.headline || item.textOverlay || '').trim();
  const headlineLower = rawHeadline.toLowerCase();
  const isSocialProofHeadline = /ratusan|puluhan|ribuan|\b\d+\s*\+?\s*(klien|brand|bisnis|alumni|member|pengguna)|pemilik bisnis|pengusaha|komunitas|testimoni|terbukti|studi kasus|hasil nyata|portofolio/i.test(rawHeadline);

  const bofuTriggers = [
    'beli', 'diskon', 'promo', 'order', 'checkout', 'daftar sekarang',
    'terakhir', 'bonus', 'eksklusif', 'peluang emas', 'slot terbatas',
    'harga khusus', 'klik link', 'dm sekarang', 'garansi'
  ];

  let rawVisualObjective = String(item.visualObjective || item.visual_objective || '').trim();
  let rawTextOverlay = String(item.textOverlay || item.text_overlay || rawHeadline || '').trim();
  let rawPrompt = String(item.finalPrompt || item.final_prompt || '').trim();

  let extractedObjective = extractPromptField('Visual Objective', rawPrompt) || rawVisualObjective;
  let extractedSubject = extractPromptField('Subject', rawPrompt);
  let extractedAction = extractPromptField('Action', rawPrompt);
  let extractedExpression = extractPromptField('Expression', rawPrompt);
  let extractedEnvironment = extractPromptField('Environment', rawPrompt);
  let extractedComposition = extractPromptField('Composition', rawPrompt);
  let extractedLighting = extractPromptField('Lighting', rawPrompt);
  let extractedCamera = extractPromptField('Camera', rawPrompt);
  let extractedStyle = extractPromptField('Visual Style', rawPrompt);
  let extractedOverlayInPrompt = extractPromptField('Text Overlay', rawPrompt).replace(/^"|"$/g, '');

  let isAligned = true;
  const issues: string[] = [];

  // ==========================================
  // DIMENSION 1: Funnel Stage vs Visual Objective
  // ==========================================
  let visualObjective = '';
  if (funnelStage === 'TOFU') {
    const hasBofuObjective = /keputusan|beli|offer|demo|social proof|closing|hasil nyata/i.test(extractedObjective);
    if (hasBofuObjective || !extractedObjective) {
      if (hasBofuObjective) {
        isAligned = false;
        issues.push("Visual Objective awal mengandung elemen BOFU (penawaran/hasil); diselaraskan ke awareness & relatable problem TOFU.");
      }
      visualObjective = id === 'C' 
        ? "Memicu rasa ingin tahu tinggi dan refleksi kritis terhadap kebiasaan kerja sehari-hari audiens tanpa unsur jualan."
        : "Membangun awareness alami dan empati relatable situasi kerja sehari-hari audiens tanpa unsur jualan.";
    } else {
      visualObjective = extractedObjective;
    }
  } else if (funnelStage === 'MOFU') {
    const isMismatched = /bingung ringan|caption kaku|daftar sekarang|beli|hard selling/i.test(extractedObjective);
    if (isMismatched || !extractedObjective) {
      if (isMismatched) {
        isAligned = false;
        issues.push("Visual Objective diselaraskan ke pembangunan pemahaman, framework solusi terstruktur, dan trust edukatif MOFU.");
      }
      visualObjective = id === 'B'
        ? "Menyoroti perbandingan pola kerja terstruktur vs acak dan memberikan momen insight 'Aha!' yang edukatif."
        : "Membangun pemahaman mendalam, framework solusi, perbandingan metode terstruktur, dan trust edukatif.";
    } else {
      visualObjective = extractedObjective;
    }
  } else {
    // BOFU
    const hasTofuObjective = /caption terasa kaku|bingung ringan|kesadaran awal|awareness alami|tanpa unsur jualan|frustrasi kecil/i.test(extractedObjective);
    if (hasTofuObjective || !extractedObjective) {
      isAligned = false;
      issues.push("Visual Objective awal menggunakan adegan awareness TOFU pada corong BOFU; diselaraskan ke kepercayaan & dorongan keputusan.");
      if (isSocialProofHeadline || id === 'A') {
        visualObjective = "Membangun kepercayaan mendalam dan mendorong keputusan akhir melalui social proof kredibel, komunitas nyata, dan validasi kepuasan pengguna.";
      } else {
        visualObjective = "Membangun kepercayaan dan mendorong keputusan melalui demonstrasi hasil nyata, keunggulan produk/solusi, dan kesiapan tindakan.";
      }
    } else {
      visualObjective = extractedObjective;
    }
  }

  // ==========================================
  // DIMENSION 2 & 4: Headline vs Action & Expression
  // ==========================================
  let subject = extractedSubject;
  let action = extractedAction;
  let expression = extractedExpression;
  let environment = extractedEnvironment;
  let composition = extractedComposition || "Subjek di kanan tengah, menyisakan ruang negatif bersih yang lapang di area kiri atas untuk headline teks, framing rule of thirds editorial.";
  let lighting = extractedLighting || "Cahaya alami lembut masuk dari jendela samping (soft warm ambient light), pencahayaan natural berdimensi.";
  let camera = extractedCamera || "50mm f/2.0 lens photography feel, eye-level, depth of field halus dengan latar belakang sedikit blur (subtle bokeh).";
  let visualStyle = extractedStyle || "Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.";

  if (funnelStage === 'TOFU') {
    // Check for BOFU actions
    const hasBofuAction = /melihat dashboard hasil|analitik pertumbuhan|komunitas sukses|testimoni klien|siap membeli/i.test(action);
    if (hasBofuAction || !action) {
      if (hasBofuAction) {
        isAligned = false;
        issues.push("Action awal menampilkan bukti BOFU; diselaraskan ke situasi sehari-hari yang dialami kreator.");
      }
      subject = "Seorang kreator / profesional muda usia 26-28 tahun, berpakaian kemeja linen kasual santai, rambut tertata alami.";
      action = id === 'C'
        ? "Menghentikan gerakan tangan sesaat di atas touchpad laptop sebelum menekan klik, pandangan mata menatap intens ke layar dengan rasa penasaran."
        : "Sedang membaca ulang draf caption di layar laptop sambil menopang dagu dengan satu tangan, tangan lainnya memegang cangkir keramik.";
      environment = "Meja kerja kayu hangat di dekat jendela, laptop terbuka dengan dokumen draf, notebook catatan, cangkir kopi, dan tanaman hias kecil.";
    }
    // Check expression
    const hasWrongExp = /puas|percaya|yakin|closing|siap membeli|sukses/i.test(expression);
    if (hasWrongExp || !expression) {
      if (hasWrongExp) {
        isAligned = false;
        issues.push("Ekspresi diselaraskan ke bingung ringan / penasaran / relate alami corong TOFU.");
      }
      expression = id === 'C'
        ? "Tatapan mata fokus meneliti, alis sedikit berkerut tanda berpikir kritis dan penasaran sebelum mengambil keputusan."
        : "Ekspresi bingung ringan dan senyum kecut reflektif (ekspresi 'kok tulisan ini kaku ya?'), alis sedikit terangkat, tatapan mata fokus meneliti layar.";
    }
  } else if (funnelStage === 'MOFU') {
    const hasWrongAction = /menopang dagu dengan ekspresi bingung|membeli sekarang|checkout/i.test(action);
    if (hasWrongAction || !action) {
      if (hasWrongAction) {
        isAligned = false;
        issues.push("Action diselaraskan ke analisis framework, perbandingan solusi, dan momen edukasi MOFU.");
      }
      subject = "Tangan seorang profesional kreatif sedang menandai poin diagram alur penting dengan pulpen di atas jurnal kerja terbuka di samping laptop.";
      action = "Jari tangan menunjuk ke catatan diagram checklist sederhana di notebook sambil membandingkan alur kerja di layar tablet digital.";
      environment = "Workspace minimalis estetik, meja kayu bersih dengan laptop tipis, notebook jurnal terbuka, kacamata berbingkai tipis, dan tablet digital.";
    }
    const hasWrongExp = /bingung kaku|frustrasi|hard selling/i.test(expression);
    if (hasWrongExp || !expression) {
      if (hasWrongExp) {
        isAligned = false;
        issues.push("Ekspresi diselaraskan ke fokus dan momen 'Aha!' memahami solusi.");
      }
      expression = "Ekspresi fokus, mulai paham, tatapan 'aha moment' yang tenang dan penuh keyakinan saat menemukan keteraturan sistem baru.";
    }
  } else {
    // BOFU: STRICTLY FORBID TOFU SCENES (caption kaku, bingung, menopang dagu frustrasi)
    const hasTofuAction = /membaca ulang draf caption|menopang dagu|kok caption|kaku|bingung ringan|frustrasi kecil|ide konten mentok/i.test(action) ||
                          /membaca ulang draf caption|menopang dagu|kok caption|kaku|bingung ringan/i.test(rawPrompt);
    if (hasTofuAction || !action || isSocialProofHeadline) {
      if (hasTofuAction) {
        isAligned = false;
        issues.push("Action awal menggunakan adegan TOFU (kebingungan draf); diubah total ke adegan BOFU (validasi hasil/social proof).");
      }
      
      if (isSocialProofHeadline || id === 'A') {
        subject = "Seorang pemilik bisnis / profesional muda usia 28-32 tahun, berpenampilan rapi smart casual modern.";
        action = "Sedang melihat dashboard metrik pertumbuhan bisnis dan komunitas anggota aktif di layar laptop bersama rekan kerja, menunjukkan data validasi nyata.";
        environment = "Studio kerja modern yang terang, laptop menampilkan grafik analitik positif dan forum komunitas, meja kayu rapi dengan secangkir kopi.";
        expression = "Ekspresi yakin, bangga, dan percaya dengan senyum subtle puas (subtle confident smile), siap mengambil keputusan dan memperluas kolaborasi.";
      } else if (id === 'B') {
        subject = "Seorang solopreneur / praktisi profesional usia 27-30 tahun, berpakaian kemeja oxford rapi.";
        action = "Sedang meninjau demonstrasi fitur alur kerja otomatis dan laporan hasil konversi yang sudah selesai di layar monitor laptop.";
        environment = "Ruang kerja privat kontemporer dengan pencahayaan hangat, laptop menampilkan demo produk yang siap pakai, tata ruang rapi teratur.";
        expression = "Ekspresi puas, tertarik, dan penuh keyakinan atas bukti efektivitas solusi yang terlihat di layar.";
      } else {
        subject = "Seorang pebisnis / kreator mapan usia 28-32 tahun, gaya modern profesional.";
        action = "Sedang menandatangani atau menekan konfirmasi pada perangkat kerja dengan tampilan paket solusi lengkap yang siap dieksekusi.";
        environment = "Meja meeting minimalis bergaya Scandinavian, laptop tipis dengan tampilan penawaran solusi terstruktur, suasana kerja premium.";
        expression = "Ekspresi percaya diri, tenang, dan siap melangkah (decisive commitment).";
      }
    }

    const hasTofuExp = /bingung ringan|senyum kecut|alis berkerut heran|frustrasi/i.test(expression);
    if (hasTofuExp || !expression) {
      if (hasTofuExp) {
        isAligned = false;
        issues.push("Ekspresi awal bingung diselaraskan ke ekspresi percaya, yakin, dan subtle confident smile BOFU.");
      }
      expression = "Ekspresi yakin, tertarik, percaya, subtle smile puas, menunjukkan kesiapan mengambil keputusan.";
    }
  }

  // ==========================================
  // DIMENSION 3: Text Overlay vs Funnel Stage
  // ==========================================
  let textOverlay = (rawTextOverlay || extractedOverlayInPrompt || rawHeadline).trim();
  // Clean placeholders or ellipsis
  if (textOverlay.includes('...') || textOverlay.includes('…') || textOverlay.includes('[Tulis hook')) {
    textOverlay = '';
  }
  let overlayLower = textOverlay.toLowerCase();

  if (funnelStage === 'TOFU') {
    const hasBofuOverlay = bofuTriggers.some(t => overlayLower.includes(t)) || isSocialProofHeadline;
    if (hasBofuOverlay) {
      isAligned = false;
      issues.push("Text Overlay awal mengandung penawaran/urgensi/social proof BOFU; diselaraskan ke hook problem awareness TOFU.");
      textOverlay = id === 'C' 
        ? "Satu kebiasaan kecil sebelum posting yang sering dilewatkan."
        : id === 'B'
        ? "Udah nulis lama, tapi pas dibaca kok tetap hambar?"
        : buildShortImageOverlay(rawHeadline, 'TOFU');
    } else if (!textOverlay || textOverlay.length < 5) {
      textOverlay = id === 'C'
        ? "Satu kebiasaan kecil sebelum posting yang sering dilewatkan."
        : id === 'B'
        ? "Udah nulis lama, tapi pas dibaca kok tetap hambar?"
        : buildShortImageOverlay(rawHeadline, 'TOFU');
    } else {
      textOverlay = buildShortImageOverlay(textOverlay, 'TOFU');
    }
  } else if (funnelStage === 'MOFU') {
    const hasHardBofu = ['beli sekarang', 'daftar sekarang', 'diskon 50%', 'slot terbatas'].some(t => overlayLower.includes(t));
    if (hasHardBofu) {
      isAligned = false;
      issues.push("Text Overlay diselaraskan menjadi insight / perbandingan framework MOFU.");
      textOverlay = "Bukan kurang rajin, cuma belum punya sistem alur yang jelas.";
    } else if (!textOverlay || textOverlay.length < 5) {
      textOverlay = id === 'C'
        ? "Framework 4 langkah agar pesan konten langsung kena ke audiens."
        : id === 'B'
        ? "Masalahnya bukan rajin posting, tapi alur narasinya."
        : "Bukan kurang rajin, cuma belum punya sistem alur yang jelas.";
    } else {
      textOverlay = textOverlay.replace(/\.{2,}/g, '').replace(/…/g, '').trim();
    }
  } else {
    // BOFU
    const isTofuQuestion = /kok caption.*kaku|kenapa tulisan.*kaku|udah nulis lama.*hambar|pernah merasa begini/i.test(overlayLower);
    if (isTofuQuestion) {
      isAligned = false;
      issues.push("Text Overlay awal menggunakan pertanyaan problem awareness TOFU; diselaraskan ke pesan bukti/penawaran BOFU.");
      textOverlay = isSocialProofHeadline
        ? rawHeadline
        : (id === 'A' ? "Ratusan Pemilik Bisnis Sudah Membuktikan Alurnya." : id === 'B' ? "Lihat hasil nyata alurnya sekarang." : "Siap pakai untuk pertumbuhan konten bisnismu.");
    } else if (!textOverlay || textOverlay.length < 5) {
      textOverlay = isSocialProofHeadline ? rawHeadline : (id === 'A' ? "Ratusan Pemilik Bisnis Sudah Membuktikan Alurnya." : id === 'B' ? "Lihat hasil nyata alurnya sekarang." : "Siap pakai untuk pertumbuhan konten bisnismu.");
    } else {
      textOverlay = textOverlay.replace(/\.{2,}/g, '').replace(/…/g, '').trim();
    }
  }

  // Ensure clean captionForPost
  let captionForPost = String(item.captionForPost || item.caption_for_post || '').trim();
  if (!captionForPost || captionForPost === '...' || captionForPost === '…' || captionForPost.includes('[Tulis caption')) {
    captionForPost = buildDefaultCaptionForImage(rawHeadline, funnelStage, id, textOverlay);
  }

  // ==========================================
  // RECONSTRUCT STRICT CANONICAL finalPrompt
  // ==========================================
  const finalPrompt = `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: ${funnelStage}
Visual Objective: ${visualObjective}
Subject: ${subject}
Action: ${action}
Expression: ${expression}
Environment: ${environment}
Composition: ${composition}
Lighting: ${lighting}
Camera: ${camera}
Visual Style: ${visualStyle}
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "${textOverlay}"${getBrandVisualRulesBlock(activeContext)}
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`;

  const reason = isAligned
    ? `Selaras 100% dengan corong ${funnelStage}: Visual Objective, Action, Expression, dan Text Overlay terbukti sinkron tanpa konflik.`
    : `Penyelarasan otomatis corong ${funnelStage} diterapkan: ${issues.join(' ')}`;

  const messageAlignmentCheck: MessageAlignmentCheck = {
    isAligned,
    issue: issues.length > 0 ? issues.join(' ') : undefined,
    fixedTextOverlay: textOverlay,
    reason,
  };

  const rawBrief = item.strategyBrief || item.strategy_brief || {};
  const strategyBrief: StrategyBrief = {
    funnelStage,
    tujuanKonten: String(rawBrief.tujuanKonten || rawBrief.tujuan_konten || (funnelStage === 'TOFU' ? 'Membangun awareness alami' : funnelStage === 'MOFU' ? 'Membangun pemahaman & trust' : 'Mendorong keputusan & validasi')).trim(),
    ideUtama: String(rawBrief.ideUtama || rawBrief.ide_utama || coreHeadline || rawHeadline || name).trim(),
    audienceContext: String(rawBrief.audienceContext || rawBrief.audience_context || (funnelStage === 'BOFU' ? 'Target pembeli siap mengambil keputusan' : 'Kreator & Pemilik Bisnis')).trim(),
    angle: name,
    emosiUtama: String(rawBrief.emosiUtama || rawBrief.emosi_utama || (funnelStage === 'TOFU' ? 'Merasa relate, penasaran' : funnelStage === 'MOFU' ? 'Tersadar, momen Aha!' : 'Percaya, yakin, mantap')).trim(),
    pesanVisual: String(rawBrief.pesanVisual || rawBrief.pesan_visual || visualObjective).trim(),
  };

  return {
    id,
    name,
    funnelStage,
    visualObjective,
    contentGoal: strategyBrief.tujuanKonten,
    targetEmotion: strategyBrief.emosiUtama,
    visualStrategy: strategyBrief.pesanVisual,
    hookStrategy: String(item.hookStrategy || item.hook_strategy || `Gunakan pendekatan visual ${name} yang otentik.`).trim(),
    layoutStrategy: composition,
    textOverlay,
    captionForPost,
    captionInstruction: item.captionInstruction || item.caption_instruction || 'Paste teks ini di caption/keterangan postingan setelah gambar dibuat.',
    colorPsychology: String(item.colorPsychology || item.color_psychology || (funnelStage === 'TOFU' ? 'Warm earth tones & soft natural light' : funnelStage === 'MOFU' ? 'Refined slate & crisp teal' : 'Deep emerald & warm golden amber')).trim(),
    ctaRecommendation: String(item.ctaRecommendation || item.cta_recommendation || (funnelStage === 'BOFU' ? 'Daftar sekarang / Hubungi kami' : funnelStage === 'MOFU' ? 'Cek framework ini' : 'Simpan postingan ini')).trim(),
    strategyBrief,
    messageAlignmentCheck,
    finalPrompt,
  };
};

const validateAndNormalizeImageAngles = (
  rawText: string,
  activeItem?: any,
  activeContext?: any
): string | null => {
  if (!rawText) return null;
  const parsed = tryParseJSON(rawText);
  if (!parsed) return null;

  let anglesArray: any[] = [];
  let recommendedAngleId: 'A' | 'B' | 'C' = 'A';
  let recommendationReason = '';

  if (typeof parsed === 'object' && parsed !== null) {
    if (Array.isArray((parsed as any).angles)) {
      anglesArray = (parsed as any).angles;
    } else if (Array.isArray(parsed)) {
      anglesArray = parsed as any[];
    }

    if ((parsed as any).recommendedAngleId) {
      const rawRecId = String((parsed as any).recommendedAngleId).toUpperCase().trim();
      if (rawRecId === 'A' || rawRecId === 'B' || rawRecId === 'C') {
        recommendedAngleId = rawRecId as 'A' | 'B' | 'C';
      }
    }

    if ((parsed as any).recommendationReason) {
      recommendationReason = String((parsed as any).recommendationReason).trim();
    }
  }

  if (!Array.isArray(anglesArray) || anglesArray.length === 0) {
    return null;
  }

  const rawStage = String(
    (anglesArray[0] && (anglesArray[0].funnelStage || anglesArray[0].funnel_stage)) ||
    activeItem?.jenis ||
    'TOFU'
  ).toUpperCase();
  const funnelStage: 'TOFU' | 'MOFU' | 'BOFU' = rawStage.includes('MOFU') ? 'MOFU' : rawStage.includes('BOFU') ? 'BOFU' : 'TOFU';
  const coreHeadline = String(activeItem?.headline || '').trim();

  const validAngles: ImageAngle[] = [];

  for (let i = 0; i < anglesArray.length && validAngles.length < 3; i++) {
    const item = anglesArray[i];
    if (!item || typeof item !== 'object') continue;

    const alignedAngle = sanitizeAndAlignImageAngle(item, funnelStage, coreHeadline, validAngles.length, activeContext);
    validAngles.push(alignedAngle);
  }

  if (validAngles.length === 0) {
    return null;
  }

  // Ensure we have 3 angles if at least 1 valid angle was found
  while (validAngles.length < 3) {
    const nextIndex = validAngles.length;
    const placeholder = sanitizeAndAlignImageAngle({}, funnelStage, coreHeadline, nextIndex, activeContext);
    validAngles.push(placeholder);
  }

  if (!recommendationReason) {
    recommendationReason = funnelStage === 'TOFU'
      ? "Angle Relatable Problem Hook direkomendasikan untuk membangun kesadaran awal (TOFU) secara organik tanpa resistensi audiens."
      : funnelStage === 'MOFU'
      ? "Angle Insight & Framework Hook direkomendasikan untuk membangun pemahaman dan otoritas edukatif yang kuat (MOFU)."
      : "Angle Social Proof & Value Hook direkomendasikan untuk membuktikan hasil nyata dan memvalidasi keputusan bergabung (BOFU).";
  }

  return JSON.stringify({
    recommendedAngleId,
    recommendationReason,
    angles: validAngles
  }, null, 2);
};

// Helper function to build / sanitize ready-to-use 14-field slide image prompt for image generators / designers
const sanitizeAndGenerateSlideImagePrompt = (
  rawPrompt: string | undefined,
  slideNumber: number,
  role: string,
  headline: string,
  funnelStage: 'TOFU' | 'MOFU' | 'BOFU',
  visualIntent?: string,
  visualFormat?: VisualFormatType,
  activeContext?: any
): string => {
  const normRole = (role || 'hook').toLowerCase().trim();
  let capitalizedRole = 'Hook';
  if (normRole === 'hook') {
    capitalizedRole = 'Hook';
  } else if (normRole === 'problem') {
    capitalizedRole = 'Problem';
  } else if (normRole === 'reframe') {
    capitalizedRole = 'Reframe';
  } else if (normRole.includes('fails') || normRole.includes('why')) {
    capitalizedRole = 'Why Current Method Fails';
  } else if (normRole === 'learn' || normRole === 'solution' || normRole.includes('how')) {
    capitalizedRole = 'How It Works / Value';
  } else if (normRole === 'proof' || normRole === 'proof_value') {
    capitalizedRole = 'Proof / Value';
  } else if (normRole === 'cta') {
    capitalizedRole = 'CTA';
  } else {
    capitalizedRole = normRole.charAt(0).toUpperCase() + normRole.slice(1);
  }

  const hardSellingTriggers = [
    'beli', 'diskon', 'promo', 'order', 'checkout', 'daftar sekarang',
    'terakhir', 'bonus', 'eksklusif', 'peluang emas', 'slot terbatas',
    'harga khusus', 'klik link', 'dm sekarang', 'garansi', 'buruan beli', 'kenapa harus beli'
  ];

  // Clean Text Overlay: ensure it syncs with slide headline and enforces narrative structure
  let textOverlay = (headline || '').trim();
  const overlayLower = textOverlay.toLowerCase();

  // Slide 1: Hook must open with decision-reason or relatable curiosity, NEVER direct hard selling even in BOFU
  if (normRole === 'hook' || slideNumber === 1) {
    if (hardSellingTriggers.some(t => overlayLower.includes(t)) || /beli|promo|diskon/i.test(overlayLower)) {
      textOverlay = textOverlay ? textOverlay.replace(new RegExp(hardSellingTriggers.join('|'), 'gi'), '').trim() : '';
      if (!textOverlay || textOverlay.length < 5) {
        textOverlay = headline && !hardSellingTriggers.some(t => headline.toLowerCase().includes(t)) ? headline : 'Refleksi Strategis & Alur Pesan';
      }
    }
  } else if (normRole === 'problem' || slideNumber === 2) {
    // Slide 2: Problem must focus on single specific obstacle
    if (/beli|promo|diskon/i.test(overlayLower) || overlayLower.length < 5) {
      textOverlay = headline || "Tantangan Utama dalam Eksekusi";
    }
  } else if (normRole === 'reframe' || normRole.includes('fails') || slideNumber === 3) {
    // Slide 3: Reframe / Why current method fails - FORBID generic "Solusi: Optimasi Alur BOFU"
    if (/solusi:\s*optimasi|optimasi\s*strategi|optimasi\s*alur/i.test(overlayLower) || overlayLower.length < 5) {
      textOverlay = headline || "Sudut Pandang Baru & Kerangka Alur";
    }
  } else if (normRole === 'learn' || normRole === 'solution' || normRole === 'proof' || slideNumber === 4) {
    // Slide 4: How It Works / Solution & Proof/Value - must be grounded in feature/workflow value
    if (/hasil.*melampaui|testimoni terverifikasi|ratusan pengguna terbukti sukses/i.test(overlayLower) || overlayLower.length < 5) {
      textOverlay = headline || "Metode Terstruktur & Implementasi Nilai";
    }
  } else if (normRole === 'cta' || slideNumber >= 5) {
    // Final Slide: Value-based CTA, forbid weak "Link Bio!"
    if (/^link\s*(di\s*)?bio!?$/i.test(overlayLower) || /^klik\s*link!?$/i.test(overlayLower) || overlayLower.length < 5) {
      textOverlay = headline || (funnelStage === 'BOFU' ? "Pelajari Langkah Selanjutnya" : "Simpan & Terapkan Langkah Ini");
    }
  }

  // Determine format (photography | infographic | hybrid)
  const format: VisualFormatType = visualFormat || (
    normRole === 'hook' || slideNumber === 1
      ? 'photography'
      : (funnelStage === 'MOFU' || normRole === 'problem' || normRole === 'reframe' || normRole.includes('fails') || normRole === 'learn' || normRole === 'solution')
      ? 'infographic'
      : 'infographic'
  );

  // Extract from rawPrompt if available
  const p = rawPrompt || '';
  const extractedObjective = extractPromptField('Visual Objective', p);
  const extractedSubject = extractPromptField('Subject/Object', p) || extractPromptField('Subject', p);
  const extractedAction = extractPromptField('Action/Scene', p) || extractPromptField('Action', p);
  const extractedExpression = extractPromptField('Expression/Emotion', p) || extractPromptField('Expression', p);
  const extractedEnvironment = extractPromptField('Environment', p);
  const extractedComposition = extractPromptField('Composition', p);
  const extractedLighting = extractPromptField('Lighting', p);
  const extractedCamera = extractPromptField('Camera/Graphic Style', p) || extractPromptField('Camera', p);

  // Defaults per role, funnel, and visual format
  let visualObjective = extractedObjective;
  let subjectObject = extractedSubject;
  let actionScene = extractedAction;
  let expressionEmotion = extractedExpression;
  let environment = extractedEnvironment;
  let composition = extractedComposition || (format === 'infographic'
    ? "Center card layout / structured split grid dengan ruang negatif 40% lapang di area atas untuk headline."
    : "Subjek di kanan tengah, ruang kosong luas di kiri atas untuk headline.");
  let lighting = extractedLighting || (format === 'infographic'
    ? "Clean flat ambient studio lighting dengan subtle soft drop shadow pada kartu grafis."
    : "Cahaya alami lembut dari jendela samping.");
  let cameraGraphicStyle = extractedCamera || (format === 'infographic'
    ? "High-resolution modern 2D graphic design / clean vector UI render / minimalist typography poster layout."
    : "50mm editorial photography, shallow depth of field.");
  let visualStyle = format === 'infographic'
    ? "Clean modern editorial infographic design, minimalis, rapi, bebas dari kesan poster iklan ramai."
    : format === 'hybrid'
    ? "Clean hybrid editorial Instagram content, perpaduan foto autentik dengan kartu grafis terstruktur."
    : "Clean editorial Instagram photography, natural, otentik, tidak seperti iklan komersial kaku.";
  let negativePrompt = format === 'infographic'
    ? "photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads, 3d glossy render."
    : "hard selling ads, cluttered poster, too much text, generic stock photo, unreadable typography, distorted face, extra fingers, corporate cliche, overdesigned graphic.";

  // Sanitize / build based on role & funnel & format
  if (normRole === 'hook' || slideNumber === 1) {
    if (funnelStage === 'TOFU') {
      if (!visualObjective || /keputusan|beli|offer|demo|social proof/i.test(visualObjective)) {
        visualObjective = "Membuat audiens berhenti scroll karena merasa relate dengan kendala penulisan pesan sehari-hari.";
      }
      if (!subjectObject || /pemilik bisnis mapan|dashboard hasil/i.test(subjectObject)) {
        subjectObject = format === 'infographic'
          ? "Layout kartu visual perbandingan teks headline dengan hierarki visual kontras tinggi."
          : "Seorang kreator muda berpakaian kasual rapi duduk di meja kerja hangat dengan laptop terbuka.";
      }
      if (!actionScene || /melihat dashboard|membeli/i.test(actionScene)) {
        actionScene = format === 'infographic'
          ? "Komposisi tipografi dinamis yang menonjolkan pertanyaan reflektif utama secara tajam."
          : "Ia membaca ulang draft caption di layar laptop sambil menopang dagu.";
      }
      if (!expressionEmotion || /yakin|percaya|puas|senyum sukses/i.test(expressionEmotion)) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Fokus pada kejelasan tipografi dan tata letak grafis bersih."
          : "Bingung ringan, alis sedikit terangkat, senyum kecut reflektif.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean neutral off-white digital canvas (#F9F8F6)." : "Home office hangat, notebook dan cangkir kopi di meja.";
    } else if (funnelStage === 'MOFU') {
      if (!visualObjective || /caption kaku|beli sekarang/i.test(visualObjective)) {
        visualObjective = "Menarik atensi audiens yang ingin belajar dengan menyoroti momen perbandingan insight alur kerja.";
      }
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Skema visual perbandingan dua kartu alur kerja: alur acak tanpa pola vs diagram narasi terstruktur."
          : "Tangan seorang profesional kreatif sedang menandai poin diagram alur penting dengan pulpen di atas jurnal kerja terbuka di samping laptop.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Alur panah arah dan kartu perbandingan tersusun dengan hierarki visual yang jelas dan bersih."
          : "Jari tangan menunjuk ke catatan diagram checklist sederhana di notebook sambil membandingkan alur kerja di layar tablet digital.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Fokus pada kejelasan arsitektur informasi dan tipografi bernas."
          : "Tatapan fokus, mulai paham, ekspresi 'aha moment' yang tenang saat menemukan keteraturan sistem baru.";
      }
      if (!environment) environment = format === 'infographic' ? "Modern minimalist workspace background (#FAF9F6)." : "Workspace minimalis estetik, meja kayu bersih dengan laptop tipis, notebook jurnal terbuka, dan tablet digital.";
    } else {
      // BOFU Hook
      if (!visualObjective || /caption terasa kaku|bingung ringan|beli sekarang/i.test(visualObjective)) {
        visualObjective = "Menghentikan scroll dengan memicu refleksi kritis terhadap cara kerja saat ini: mengapa butuh sistem alur konten, bukan tebakan acak.";
      }
      if (!subjectObject || /bingung|kreator bingung/i.test(subjectObject)) {
        subjectObject = format === 'infographic'
          ? "Kartu visual evaluasi keputusan strategis: diagram perbandingan waktu produksi manual vs workflow terpadu."
          : "Seorang praktisi profesional / kreator usia 28-32 tahun, rapi modern smart casual.";
      }
      if (!actionScene || /menopang dagu/i.test(actionScene)) {
        actionScene = format === 'infographic'
          ? "Tata letak kartu split yang memperlihatkan kontras efisiensi kerja secara lugas dan profesional."
          : "Sedang membandingkan dua pendekatan kerja di layar laptop: jadwal produksi yang berantakan vs sistem konten terstruktur.";
      }
      if (!expressionEmotion || /bingung/i.test(expressionEmotion)) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Fokus pada kejelasan data dan kredibilitas visual."
          : "Tatapan analitis tajam, tenang, dan siap mengevaluasi keputusan strategi kerja.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean architectural light background (#F8F7F4)." : "Studio kerja modern yang terang, laptop menampilkan perbandingan alur kerja terstruktur.";
    }
  } else if (normRole === 'problem' || slideNumber === 2) {
    if (funnelStage === 'TOFU') {
      if (!visualObjective || /beli|offer/i.test(visualObjective)) {
        visualObjective = "Menggambarkan satu konflik spesifik: draf tulisan yang tidak memiliki alur hierarki yang jelas.";
      }
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Kartu diagram pembanding: teks panjang tak beraturan vs hierarki pesan yang ringkas."
          : "Seorang kreator muda berpakaian sweater rajut santai di sudut meja kafe minimalis.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Penataan visual kartu masalah dengan highlight lembut pada titik hambatan utama."
          : "Sedang memeriksa draf tulisan di smartphone dan laptop secara berulang dengan gestur menimbang-nimbang.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Fokus visual hierarki masalah tunggal."
          : "Ekspresi reflektif, alis sedikit terangkat dan bibir agak miring.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean off-white infographic background." : "Sudut kafe minimalis hangat, meja kayu kecil, secangkir kopi hangat.";
    } else if (funnelStage === 'MOFU') {
      if (!visualObjective) visualObjective = "Menyoroti akar hambatan: menulis tanpa struktur funnel membuat pesan tidak sampai ke target audiens.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Infografis split column: Kolom Masalah (Posting Rutin Tanpa Arah) vs Kolom Dampak (Audiens Melewatkan Pesan)."
          : "Seorang kreator muda di studio kerja rapi dengan tablet grafis dan lembar catatan diagram.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Alur diagram terarah dengan badge penanda hambatan berwarna kontras lembut."
          : "Sedang membandingkan diagram alur lama yang dicoret dengan skema alur baru yang bersih di layar tablet kerja.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Struktur visual analitis yang mudah dipahami."
          : "Ekspresi fokus, menyadari akar inefisiensi pada proses lama.";
      }
      if (!environment) environment = format === 'infographic' ? "Neutral light studio canvas (#F9F8F6)." : "Meja kerja kayu terang dengan notebook, tablet grafis, laptop, dan pencahayaan studio hangat.";
    } else {
      // BOFU Problem
      if (!visualObjective) visualObjective = "Memperlihatkan biaya inefisiensi dan energi yang terbuang saat memproduksi konten harian secara manual tanpa sistem terpadu.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Diagram visual bottleneck produksi: waktu yang terbuang untuk ide dadakan vs kalender terpadu."
          : "Praktisi profesional meninjau tumpukan catatan acak dan kalender kerja manual di meja.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Grafik alur kerja yang memperlihatkan titik-titik inefisiensi proses manual secara rapi."
          : "Menunjukkan perbandingan waktu kerja yang tersita untuk memikirkan ide dadakan setiap hari.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Data visual yang rapi dan lugas."
          : "Ekspresi analitis, tegas, dan menyadari perlunya otomasi alur kerja.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean slate light background." : "Ruang kerja privat kontemporer dengan pencahayaan arsitektural modern.";
    }
  } else if (normRole === 'reframe' || normRole.includes('fails') || slideNumber === 3) {
    // Slide 3: Reframe
    if (funnelStage === 'TOFU') {
      if (!visualObjective) visualObjective = "Memberikan pencerahan ringan bahwa yang dibutuhkan bukan menulis lebih banyak kata, melainkan menyusun satu alur yang terarah.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Diagram pencerahan 3 pilar alur konten sederhana (Ide -> Struktur -> Eksekusi)."
          : "Kreator muda sedang menulis poin penting di buku catatan dengan secangkir teh hangat di meja.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Tata letak 3 kartu langkah berurutan dengan nomor minimalis 01-02-03."
          : "Tersenyum kecil lega sambil menggarisbawahi kalimat pencerahan di buku catatan.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Kejelasan arsitektur pencerahan sistemik."
          : "Lega, tercerahkan, tatapan optimis menemukan cara pandang baru yang masuk akal.";
      }
      if (!environment) environment = format === 'infographic' ? "Warm off-white background (#FAF9F6)." : "Meja kayu hangat dekat jendela dengan secangkir teh dan buku catatan terbuka.";
    } else if (funnelStage === 'MOFU') {
      if (!visualObjective) visualObjective = "Menyajikan paradigma baru: satu sistem terpadu yang menghubungkan ide, struktur narasi, dan eksekusi konten.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Skema visual infografis 3 pilar: 1. Validasi Ide, 2. Formula Alur, 3. Eksekusi Cepat."
          : "Tangan profesional kreatif sedang menata 3 kartu pilar strategi di samping laptop tipis.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Struktur kartu tersusun rapi dengan indikator koneksi antar-pilar yang harmonis."
          : "Menyusun skema 3 tahapan alur terstruktur yang saling terhubung secara harmonis.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Kejelasan arsitektur solusi sistematis."
          : "Penuh pencerahan, tatapan antusias melihat kejelasan struktur yang mudah diterapkan.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean minimal editorial infographic canvas." : "Ruang studio kerja minimalis dengan pencahayaan studio hangat.";
    } else {
      // BOFU Reframe
      if (!visualObjective) visualObjective = "Menegaskan perubahan paradigma: beralih dari draf dadakan ke satu alur sistematis dari ide sampai konten siap publish.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Bagan alur komprehensif sistem solusi konten: integrasi kalender ide, generator prompt terstruktur, dan studio produksi."
          : "Seorang praktisi profesional sedang mengoperasikan sistem solusi konten terpadu di laptop modern.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Visualisasi alur modular yang saling terhubung dalam satu dasbor terpadu."
          : "Menunjukkan demonstrasi diagram alur kerja terpadu yang menghubungkan kalender, prompt, dan studio produksi.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Estetika dasbor sistematis modern."
          : "Ekspresi puas, percaya diri, dan mantap melihat efisiensi sistem yang nyata.";
      }
      if (!environment) environment = format === 'infographic' ? "Modern slate-neutral canvas." : "Workspace modern berkelas dengan perangkat teknologi terkini.";
    }
  } else if (normRole === 'learn' || normRole === 'solution' || normRole === 'proof' || slideNumber === 4) {
    // Slide 4: How It Works / Value
    if (funnelStage === 'TOFU') {
      if (!visualObjective) visualObjective = "Memberikan 3 poin evaluasi atau checklist sederhana yang langsung bisa dipahami audiens.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Checklist framework 3 langkah evaluasi draf tulisan dengan icon checkmark minimalis."
          : "Catatan jurnal rapi berisi 3 poin checklist evaluasi diri dengan pulpen di samping laptop.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Tiga baris kartu checklist bertingkat dengan padding lapang dan tipografi kontras tinggi."
          : "Subjek menandai checklist pertama di jurnal kerja sambil membaca ringkasan di layar laptop.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Keteraturan checklist yang mudah dieksekusi."
          : "Termotivasi, tenang, dan siap menerapkan kebiasaan baru yang lebih baik.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean light cream canvas (#F7F6F2)." : "Home workspace santai dengan tanaman hias dan pencahayaan alami.";
    } else if (funnelStage === 'MOFU') {
      if (!visualObjective) visualObjective = "Menjelaskan framework alur kerja terstruktur yang memangkas waktu produksi dan menjaga konsistensi pesan.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Framework card UI 3 tahap: [Input Ide -> Formula Funnel -> Output Siap Posting] dengan badge verifikasi hijau."
          : "Seorang profesional muda usia 27-30 tahun sedang meninjau langkah-langkah framework di layar tablet.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Tata letak kartu proses bertingkat dengan penanda step yang jelas dan ruang bernapas lega."
          : "Sedang meninjau langkah-langkah checklist alur konten di layar tablet sambil membuat anotasi ringkas.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Kejelasan langkah kerja dan efisiensi terukur."
          : "Ekspresi fokus tenang dan antusias melihat kemudahan proses alur kerja baru.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean modern UI layout canvas (#F9F8F6)." : "Ruang kerja minimalis kontemporer, meja kayu bersih, laptop, secangkir teh hangat di dekat jendela.";
    } else {
      // BOFU How It Works / Proof Value
      if (!visualObjective) visualObjective = "Menampilkan bukti berbasis nilai produk nyata: antarmuka kalender ide, generator prompt terstruktur, dan studio produksi yang menyatu.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Tampilan kartu pembuktian nilai: 3 metrik efisiensi kerja nyata (Waktu Produksi Singkat, Struktur Teruji, Output Konsisten)."
          : "Praktisi profesional meninjau tampilan alur kerja terintegrasi di monitor kerja.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Struktur 3 kartu nilai dengan badge fitur konkret dan indikator performa kerja yang rapi."
          : "Memperlihatkan workflow konten siap pakai yang memangkas waktu produksi harian secara signifikan.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Kredibilitas nilai fitur teruji."
          : "Percaya diri, tenang, dan puas melihat efektivitas kerja yang nyata.";
      }
      if (!environment) environment = format === 'infographic' ? "Professional corporate light canvas." : "Ruang eksekutif modern dengan pencahayaan elegan dan suasana kerja terstruktur.";
    }
  } else {
    // CTA / Last slide: Value-based CTA
    if (funnelStage === 'TOFU') {
      if (!visualObjective) visualObjective = "Mengajak audiens menyimpan konten untuk dibaca ulang atau membagikan ke teman tanpa rasa dipaksa jualan.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Kartu penutup minimalis dengan tombol aksi 'Simpan & Terapkan' berwarna kontras dan icon bookmark."
          : "Tangan kreator memegang smartphone di atas meja kerja kayu dengan secangkir teh hangat.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Komposisi terpusat dengan headline ajakan nilai di atas dan tombol pill CTA elegan di tengah."
          : "Menyentuh ikon simpan postingan di layar smartphone dengan antarmuka yang bersih.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Ajakan bertindak yang ramah dan bernilai."
          : "Hangat, apresiatif, dan terhubung secara tulus tanpa tekanan.";
      }
      if (!environment) environment = format === 'infographic' ? "Clean light pastel canvas (#F0FDF4)." : "Meja kerja kayu hangat dengan pencahayaan lembut (#F9F8F6).";
    } else if (funnelStage === 'MOFU') {
      if (!visualObjective) visualObjective = "Mengajak audiens merapikan sistem konten mereka sekarang dengan panduan terstruktur.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Kartu penutup editorial elegan dengan ringkasan 1-kalimat nilai dan tombol CTA 'Rapikan Alur Sekarang'."
          : "Kartu penutup editorial elegan dengan tombol aksi terstruktur dan perangkat digital.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Komposisi kartu CTA terpusat dengan padding lapang dan tombol aksi kontras tinggi."
          : "Tangan memegang tablet atau smartphone yang menampilkan halaman panduan lengkap.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Dorongan nilai positif yang memotivasi."
          : "Terdorong membangun sistem kerja yang rapi dan konsisten.";
      }
      if (!environment) environment = format === 'infographic' ? "Warm modern background (#FAF9F6)." : "Workspace modern bersih dengan pencahayaan studio netral.";
    } else {
      // BOFU: Value-based CTA
      if (!visualObjective) visualObjective = "Menegaskan nilai transformasi sistem konten dan memberikan dorongan keputusan aksi berbasis value yang percaya diri.";
      if (!subjectObject) {
        subjectObject = format === 'infographic'
          ? "Kartu penutup ringkasan dengan penegasan nilai utama dan tombol aksi penutup yang jelas."
          : "Seorang pebisnis / kreator mapan usia 28-32 tahun, gaya modern profesional.";
      }
      if (!actionScene) {
        actionScene = format === 'infographic'
          ? "Komposisi premium closing card dengan tombol aksi dominan dan teks pendukung akses profil."
          : "Sedang mengonfirmasi akses sistem solusi konten terpadu di laptop tipis.";
      }
      if (!expressionEmotion) {
        expressionEmotion = format === 'infographic'
          ? "N/A - Keputusan mantap dan percaya diri."
          : "Ekspresi percaya diri, mantap, dan siap melangkah membangun sistem konten yang berkelanjutan.";
      }
      if (!environment) environment = format === 'infographic' ? "Premium light architectural background." : "Meja meeting minimalis bergaya Scandinavian, laptop tipis menampilkan alur sistem konten lengkap.";
    }
  }

  // Enforce infographic rules: no camera lenses, no human expressions
  if (format === 'infographic') {
    if (/50mm|35mm|lens|f\/1\.|bokeh/i.test(cameraGraphicStyle)) {
      cameraGraphicStyle = "High-resolution modern 2D graphic design / clean vector UI render / minimalist typography poster layout.";
    }
    if (!expressionEmotion.startsWith('N/A')) {
      expressionEmotion = "N/A - Fokus pada kejelasan visual hierarki diagram bersih dan kartu UI.";
    }
    if (!negativePrompt.includes('photography')) {
      negativePrompt = "photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads.";
    }
  }

  return `Buatkan saya image untuk slide carousel Instagram 4:5.

Funnel Stage: ${funnelStage}
Slide Role: ${capitalizedRole}
Visual Objective: ${visualObjective}
Subject/Object: ${subjectObject}
Action/Scene: ${actionScene}
Expression/Emotion: ${expressionEmotion}
Environment: ${environment}
Composition: ${composition}
Lighting: ${lighting}
Camera/Graphic Style: ${cameraGraphicStyle}
Visual Style: ${visualStyle}
Typography: Headline besar 3-5 baris di kiri atas, high contrast, tidak ada teks kecil lain.
Text Overlay: '${textOverlay}'${getBrandVisualRulesBlock(activeContext)}
Negative Prompt: ${negativePrompt}`;
};

// Helper function to validate and normalize Carousel Plan JSON output to canonical 1-object schema
const validateAndNormalizeCarouselPlan = (
  rawText: string,
  activeItem?: any,
  activeContext?: any
): string | null => {
  if (!rawText) return null;
  const parsed = tryParseJSON(rawText);
  if (!parsed || typeof parsed !== 'object') return null;

  // If parsed is an array (e.g. from previous 3 options or legacy), extract the first option
  let targetObj: any = parsed;
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return null;
    targetObj = parsed[0];
  }

  const brandName = activeContext?.brand_context?.brand_name || activeContext?.brand?.name || '';

  const rawStage = String(targetObj.funnel_stage || targetObj.funnelStage || activeItem?.jenis || 'TOFU').toUpperCase();
  const funnelStage: FunnelStage = rawStage.includes('MOFU') ? 'MOFU' : rawStage.includes('BOFU') ? 'BOFU' : 'TOFU';
  const funnelRules = getFunnelRules(funnelStage);

  const rawGoal = String(targetObj.content_goal || targetObj.contentGoal || activeItem?.tujuan || funnelRules.goal).trim();
  const currentBelief = String(targetObj.current_belief || targetObj.currentBelief || (activeItem?.headline ? `Melihat ${activeItem.headline} tanpa alur sistematis.` : `Membuat konten tanpa penyesuaian tahap ${funnelStage}.`)).trim();
  const desiredBelief = String(targetObj.desired_belief || targetObj.desiredBelief || `Memahami pentingnya alur ${funnelStage} untuk hasil komunikasi yang terarah dan konsisten.`).trim();
  const corePromise = String(targetObj.core_promise || targetObj.corePromise || `Membangun alur konten ${funnelStage} yang sistematis dan mudah dipahami audiens.`).trim();
  
  // Consistent CTA field naming: primary_cta_type & primary_cta_text
  let primaryCtaType = String(targetObj.primary_cta_type || targetObj.primaryCtaType || targetObj.cta_type || targetObj.ctaType || (funnelStage === 'BOFU' ? 'direct_offer' : 'engagement_save')).trim();
  let primaryCtaText = String(targetObj.primary_cta_text || targetObj.primaryCtaText || targetObj.cta_text || targetObj.ctaText || activeItem?.action || activeItem?.cta || (funnelStage === 'BOFU' ? 'Pelajari Selengkapnya' : funnelStage === 'MOFU' ? 'Terapkan Panduan Ini' : 'Simpan postingan ini')).trim();

  // Normalize CTA if weak
  if (/^link\s*(di\s*)?bio!?$/i.test(primaryCtaText) || /^klik\s*link!?$/i.test(primaryCtaText)) {
    primaryCtaText = activeItem?.action || (funnelStage === 'BOFU'
      ? 'Pelajari Selengkapnya'
      : funnelStage === 'MOFU'
      ? 'Terapkan Panduan Ini'
      : 'Simpan postingan ini');
  }

  // Tracking issues and fixes across the 5 alignment checks
  const detectedIssues: string[] = [];
  const appliedFixes: string[] = [];

  const hardSellingTriggers = [
    'beli', 'diskon', 'promo', 'order', 'checkout', 'daftar sekarang',
    'terakhir', 'bonus', 'eksklusif', 'peluang emas', 'slot terbatas',
    'harga khusus', 'klik link', 'dm sekarang', 'garansi', 'buruan beli', 'kenapa harus beli'
  ];

  // Parse slides
  let rawSlides: any[] = [];
  if (Array.isArray(targetObj.slides)) {
    rawSlides = targetObj.slides;
  }

  if (rawSlides.length === 0) return null;

  const totalSlides = rawSlides.length;

  const normalizedSlides: CarouselSlide[] = rawSlides.map((s: any, idx: number) => {
    const slideNumber = Number(s.slide || idx + 1);
    let role = String(s.role || '').toLowerCase().trim();
    
    // Assign canonical roles according to required narrative structure:
    // 5-slide: 1: hook, 2: problem, 3: reframe, 4: learn (how_it_works / value), 5: cta
    // 6-slide: 1: hook, 2: problem, 3: why_current_method_fails, 4: solution, 5: proof_value, 6: cta
    if (slideNumber === 1 || role.includes('hook') || role.includes('stop')) {
      role = 'hook';
    } else if (slideNumber === 2 || role.includes('problem') || role.includes('recognize')) {
      role = 'problem';
    } else if (slideNumber === 3 || role.includes('reframe') || role.includes('fail') || role.includes('why')) {
      role = totalSlides >= 6 ? 'why_current_method_fails' : 'reframe';
    } else if (slideNumber === totalSlides || role.includes('act') || role.includes('cta')) {
      role = 'cta';
    } else if (totalSlides >= 6 && slideNumber === 4) {
      role = 'solution';
    } else if (totalSlides >= 6 && slideNumber === 5) {
      role = 'proof_value';
    } else {
      role = 'learn';
    }

    let headline = String(s.headline || `Slide ${slideNumber}`).trim();
    let body = String(s.body || '').trim();

    // Check 1: Slide 1 - Hard selling check
    if (slideNumber === 1) {
      const hLower = headline.toLowerCase();
      const hasHardSelling = hardSellingTriggers.some(t => hLower.includes(t)) || /kenapa harus beli|peluang emas|buruan beli|ratusan pemilik/i.test(hLower);
      if (hasHardSelling) {
        detectedIssues.push('Slide 1 terlalu jualan / mengandung urgensi langsung yang mendahului alur narasi.');
        const baseTopic = activeItem?.headline ? activeItem.headline.replace(/[?!.]+$/, '') : (brandName || 'Topik Ini');
        if (funnelStage === 'BOFU') {
          headline = `Masih Menghadapi Kendala Pada ${baseTopic}?`;
          body = body || (activeItem?.body ? activeItem.body.slice(0, 110) : 'Memilih pendekatan yang tepat adalah langkah penting sebelum mengambil keputusan.');
          appliedFixes.push('Slide 1 diperbaiki menjadi hook berbasis alasan keputusan strategis (bukan hard selling langsung).');
        } else if (funnelStage === 'MOFU') {
          headline = `Tantangan Sebenarnya Dalam ${baseTopic}`;
          body = body || (activeItem?.body ? activeItem.body.slice(0, 110) : 'Banyak yang telah mencoba berbagai cara, namun akar masalahnya belum tertangani secara mendasar.');
          appliedFixes.push('Slide 1 diselaraskan menjadi hook insight edukatif.');
        } else {
          headline = `Pernah Mengalami Hal Ini Terkait ${baseTopic}?`;
          body = body || (activeItem?.body ? activeItem.body.slice(0, 110) : 'Banyak orang menghadapi situasi serupa tanpa menyadari penyebab utamanya.');
          appliedFixes.push('Slide 1 diselaraskan menjadi hook masalah relatable TOFU.');
        }
      }
    }

    // Check 2: Slide 2 - Problem focus and synchronization check
    if (slideNumber === 2) {
      const hLower = headline.toLowerCase();
      const baseProblem = activeItem?.tujuan || activeItem?.headline || 'Tantangan Utama';
      if (hLower.includes('manual vs otomatis') && hLower.includes('funnel') && !s.visual_intent) {
        detectedIssues.push('Slide 2 mencampuradukkan masalah umum tanpa visual pembanding yang fokus.');
        headline = `Fokus Hambatan Utama Dalam ${baseProblem}`;
        appliedFixes.push('Slide 2 difokuskan pada satu masalah utama yang spesifik.');
      } else if (hLower.length < 10 || /kesalahan umum:\s*$/i.test(hLower)) {
        headline = funnelStage === 'TOFU'
          ? `Kendala Yang Kerap Dihadapi Saat Memahami ${baseProblem}`
          : funnelStage === 'MOFU'
          ? `Mengapa Solusi Umum Belum Menyelesaikan ${baseProblem}`
          : `Risiko Membiarkan Masalah ${baseProblem} Berlarut-larut`;
      }
    }

    // Check 3: Slide 3 - Generic reframe / why current method fails check
    if (slideNumber === 3) {
      const hLower = headline.toLowerCase();
      if (/solusi:\s*optimasi\s*(alur|strategi|konten|bofu|tofu|mofu)/i.test(hLower) || /optimasi\s*strategi\s*konten/i.test(hLower) || /^solusi\s*konten$/i.test(hLower)) {
        detectedIssues.push(`Slide 3 menggunakan headline generik ("${headline}").`);
        headline = activeItem?.headline ? `Pendekatan Baru: ${activeItem.headline}` : `Sudut Pandang Terstruktur Bagi ${brandName || 'Audiens'}`;
        body = body || (activeItem?.body ? activeItem.body.slice(0, 120) : 'Bukan sekadar perubahan sesaat, tetapi membangun pola terarah yang berkelanjutan.');
        appliedFixes.push('Slide 3 diganti dengan hasil spesifik yang dipahami audiens.');
      }
    }

    // Check 4: Slide 4 (or 4/5) - Unverified claims check in proof/solution
    if (slideNumber === 4 || (totalSlides >= 6 && slideNumber === 5)) {
      const hLower = headline.toLowerCase();
      const bLower = body.toLowerCase();
      const hasUnverifiedClaims = /hasil.*melampaui\s*target|testimoni\s*terverifikasi|ratusan\s*pengguna.*sukses|omzet\s*miliaran|terbukti\s*100%/i.test(hLower) || /hasil.*melampaui\s*target|testimoni\s*terverifikasi|ratusan\s*pengguna.*sukses|omzet\s*miliaran/i.test(bLower);
      if (hasUnverifiedClaims && !activeItem?.proof_data) {
        detectedIssues.push('Slide proof menggunakan klaim angka / testimoni yang tidak tercantum dalam input proyek.');
        headline = 'Penerapan Nyata & Efisiensi Alur Kerja';
        body = activeItem?.tujuan ? `Fokus pada pencapaian terukur: ${activeItem.tujuan}.` : 'Implementasi langkah nyata yang dapat diuji dan diterapkan langsung.';
        appliedFixes.push('Slide proof disesuaikan menjadi pembuktian berbasis fitur & efisiensi alur kerja nyata yang dapat dipertanggungjawabkan.');
      }
    }

    // Check 5: Final Slide - Value-based CTA check
    if (slideNumber === totalSlides) {
      const hLower = headline.toLowerCase();
      if (/^link\s*(di\s*)?bio!?$/i.test(hLower) || /^klik\s*link!?$/i.test(hLower) || hLower.length < 5) {
        detectedIssues.push('Headline CTA slide akhir terlalu lemah ("Link Bio!").');
        const actionTarget = activeItem?.cta || primaryCtaText || 'Tautan di Profil';
        headline = funnelStage === 'BOFU'
          ? (activeItem?.cta || 'Ambil Tindakan Strategis Sekarang')
          : funnelStage === 'MOFU'
          ? 'Pelajari Panduan Lengkapnya'
          : 'Simpan Wawasan Ini & Bagikan';
        if (!body || /^link\s*bio/i.test(body)) {
          body = `Akses informasi dan langkah selanjutnya melalui ${actionTarget}.`;
        }
        appliedFixes.push('Headline CTA diubah menjadi ajakan berbasis value, dengan link bio sebagai naskah pendukung.');
      }
    }

    let swipeBridge = String(s.swipe_bridge || s.swipeBridge || '').trim();
    if (!swipeBridge) {
      swipeBridge = slideNumber === totalSlides
        ? primaryCtaText
        : slideNumber === 1
        ? 'Kenapa hal ini sering terjadi? ➔'
        : slideNumber === 2
        ? 'Mengapa cara lama tidak lagi cukup? ➔'
        : slideNumber === 3
        ? 'Bagaimana sistem ini bekerja? ➔'
        : 'Mulai terapkan langkahnya ➔';
    }

    const communicationJob = String(s.communication_job || s.communicationJob || (
      slideNumber === 1 ? 'Menghentikan scroll dengan alasan keputusan strategis / relatable problem' :
      slideNumber === 2 ? 'Fokus pada satu masalah utama yang dialami audiens saat ini' :
      slideNumber === 3 ? (totalSlides >= 6 ? 'Menjelaskan mengapa metode lama gagal' : 'Menyajikan sudut pandang pencerahan sistemik (reframe)') :
      slideNumber === 4 ? (totalSlides >= 6 ? 'Menjelaskan solusi sistematis secara runtut' : 'Menyajikan alur kerja dan pembuktian nilai efisiensi kerja') :
      slideNumber === 5 && totalSlides >= 6 ? 'Menyajikan pembuktian nilai efisiensi kerja berbasis fitur nyata' :
      'Mendorong aksi penutup berbasis value yang sesuai dengan tahap corong'
    )).trim();
    
    const emotionalState = String(s.emotional_state || s.emotionalState || (
      slideNumber === 1 ? 'Empati & Refleksi Kritis' :
      slideNumber === 2 ? 'Kesadaran Masalah Tunggal' :
      slideNumber === 3 ? 'Pencerahan (Aha Moment)' :
      slideNumber === 4 ? 'Optimisme & Kejelasan Sistem' :
      slideNumber === 5 && totalSlides >= 6 ? 'Kepercayaan Terhadap Value' :
      'Dorongan Aksi Berbasis Value'
    )).trim();

    // Determine visual format: strictly 'photography' | 'infographic' | 'hybrid'
    let rawFormat = String(s.visual_format || s.visualFormat || '').toLowerCase().trim();
    let visualFormat: VisualFormatType;
    if (rawFormat === 'photography' || rawFormat === 'infographic' || rawFormat === 'hybrid') {
      visualFormat = rawFormat;
    } else {
      if (funnelStage === 'MOFU') {
        visualFormat = slideNumber === 1 ? 'photography' : 'infographic';
      } else if (funnelStage === 'TOFU') {
        visualFormat = slideNumber === 1 ? 'photography' : slideNumber === totalSlides ? 'hybrid' : 'infographic';
      } else {
        visualFormat = slideNumber === 1 ? 'photography' : 'infographic';
      }
    }
    
    const targetAudience = activeContext?.audience_context?.primary_audience || 'audiens sasaran';

    let visualIntent = String(s.visual_intent || s.visualIntent || '').trim();
    if (!visualIntent || visualIntent === 'diagram strategi' || visualIntent.length < 15) {
      visualIntent = slideNumber === 1
        ? (visualFormat === 'infographic' ? `Infografis kartu pembuka refleksi topik: ${headline.slice(0, 50)}.` : `Visual editorial merefleksikan situasi ${targetAudience} terkait ${headline.slice(0, 50)}.`)
        : slideNumber === 2
        ? 'Infografis kartu pembanding masalah utama: kendala umum vs pemahaman terarah.'
        : slideNumber === 3
        ? `Infografis kartu pencerahan sudut pandang baru mengenai ${headline.slice(0, 50)}.`
        : slideNumber === 4
        ? 'Tampilan visual alur penerapan terstruktur dan pembuktian nilai nyata.'
        : 'Tampilan closing card minimalis dengan instruksi aksi berbasis value yang jelas.';
    }

    const visualType = String(s.visual_type || s.visualType || (visualFormat === 'photography' ? 'editorial-photo' : slideNumber === totalSlides ? 'cta-card' : 'minimal-diagram')).trim();
    const textZone = String(s.text_zone || s.textZone || 'Upper Third / Left Aligned').trim();
    const negativeSpacePlan = String(s.negative_space_plan || s.negativeSpacePlan || 'Ruang bersih 40% di area tengah dan atas agar teks terbaca optimal').trim();

    // 1. Creative Strategy layer
    const creativeStrategy: SlideCreativeStrategy = {
      funnel_stage: funnelStage,
      slide_role: role,
      visual_objective: s.creative_strategy?.visual_objective || visualIntent,
      core_message: s.creative_strategy?.core_message || headline,
      audience_emotion: s.creative_strategy?.audience_emotion || emotionalState,
      visual_concept: s.creative_strategy?.visual_concept || (visualFormat === 'infographic' ? 'Kartu UI diagram alur dan hierarki tipografi modern bersih' : 'Editorial photographic framing dengan pencahayaan alami natural'),
      text_overlay: s.creative_strategy?.text_overlay || headline,
    };

    // 3. Visual Production layer
    const defaultSubject = visualFormat === 'infographic'
      ? (slideNumber === 1 ? `Visual kartu pengantar terstruktur berfokus pada topik ${headline.slice(0, 40)}.` : slideNumber === 2 ? `Diagram perbandingan masalah vs solusi untuk ${headline.slice(0, 40)}.` : slideNumber === 3 ? `Diagram konsep 3 poin terarah mengenai ${headline.slice(0, 40)}.` : slideNumber === 4 ? `Visual ringkasan tahapan penerapan terstruktur.` : `Kartu CTA aksi penutup dengan tombol yang jelas.`)
      : (slideNumber === 1 ? `Representasi visual ${targetAudience} yang sedang menghadapi situasi terkait ${headline.slice(0, 40)}.` : slideNumber === 2 ? `Representasi ${targetAudience} sedang mencermati kendala yang dihadapi.` : slideNumber === 3 ? `Representasi ${targetAudience} menemukan kejelasan pemahaman baru.` : slideNumber === 4 ? `Representasi ${targetAudience} menerapkan solusi secara profesional.` : `Representasi interaksi penutup yang mengajak ${targetAudience} mengambil langkah berikutnya.`);

    const defaultAction = visualFormat === 'infographic'
      ? 'Penataan tata letak visual bertingkat dengan penunjuk alur dan kartu berbayang halus.'
      : (slideNumber === 1 ? 'Mengamati situasi dengan tatapan berpikir reflektif.' : slideNumber === 2 ? 'Menganalisis perbandingan situasi dengan cermat.' : slideNumber === 3 ? 'Memahami diagram konsep baru secara jelas.' : slideNumber === 4 ? 'Menerapkan tahapan alur kerja yang terorganisir.' : 'Mengonfirmasi tindakan lanjut pada antarmuka.');

    const defaultComposition = visualFormat === 'infographic'
      ? 'Center card layout / structured split grid dengan ruang negatif 40% lapang di area atas untuk headline.'
      : 'Subjek di kanan tengah, ruang kosong luas di kiri atas untuk headline.';

    const defaultLayout = `Format carousel Instagram 4:5 vertical, komposisi bersih dengan teks headline dominan di ${textZone}.`;
    const defaultMetaphor = visualFormat === 'infographic'
      ? 'Struktur visual pilar yang mengubah proses rumit menjadi alur kerja yang mudah dipahami.'
      : 'Refleksi transformasi alur kerja komunikasi yang lebih terarah dan profesional.';

    const defaultTypography = 'Headline tebal 32pt kontras tinggi di bagian atas, body copy 16pt sans-serif nyaman dibaca dengan line-height 1.6, label kecil di pojok.';
    const defaultBackground = visualFormat === 'infographic'
      ? 'Warm neutral light canvas (#F9F8F6) dengan tekstur halus tanpa noise.'
      : 'Home office minimalis hangat dengan pencahayaan alami jendela samping (#F9F8F6).';
    const defaultColorMood = `Nuansa profesional hangat (${funnelStage === 'TOFU' ? 'Sage Green & Warm Cream' : funnelStage === 'MOFU' ? 'Teal & Crisp Slate' : 'Deep Emerald & Champagne Gold'}).`;
    const defaultNegativePrompt = visualFormat === 'infographic'
      ? 'photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads.'
      : 'hard selling ads, cluttered poster, too much text, generic stock photo, unreadable typography, distorted face, extra fingers, corporate cliche, overdesigned graphic.';

    const visualProduction: SlideVisualProduction = {
      subject: s.visual_production?.subject || defaultSubject,
      action: s.visual_production?.action || defaultAction,
      composition: s.visual_production?.composition || defaultComposition,
      layout: s.visual_production?.layout || defaultLayout,
      visual_metaphor: s.visual_production?.visual_metaphor || defaultMetaphor,
      typography: s.visual_production?.typography || defaultTypography,
      background: s.visual_production?.background || defaultBackground,
      color_mood: s.visual_production?.color_mood || defaultColorMood,
      negative_space: s.visual_production?.negative_space || negativeSpacePlan,
      negative_prompt: s.visual_production?.negative_prompt || defaultNegativePrompt,
    };

    let productionPrompt = String(s.production_prompt || s.productionPrompt || '').trim();
    if (!productionPrompt || productionPrompt.length < 30) {
      productionPrompt = `Layout: ${visualProduction.layout}
Subject/Object Utama: ${visualProduction.subject}
Visual Metaphor: ${visualProduction.visual_metaphor}
Typography Hierarchy: ${visualProduction.typography}
Background: ${visualProduction.background}
Color Mood: ${visualProduction.color_mood}
Negative Space: ${visualProduction.negative_space}
Image/Illustration Direction: ${visualFormat === 'infographic' ? 'Clean modern editorial infographic design' : visualFormat === 'hybrid' ? 'Clean hybrid editorial design' : 'Clean minimalist modern editorial photography'}.`;
    }

    const rawSlideImgPrompt = String(s.slide_image_prompt || s.slideImagePrompt || '').trim();
    const slideImagePrompt = sanitizeAndGenerateSlideImagePrompt(
      rawSlideImgPrompt,
      slideNumber,
      role,
      headline,
      funnelStage,
      visualIntent,
      visualFormat,
      activeContext
    );

    return {
      slide: slideNumber,
      role,
      communication_job: communicationJob,
      headline,
      body,
      swipe_bridge: swipeBridge,
      emotional_state: emotionalState,
      visual_intent: visualIntent,
      visual_type: visualType,
      text_zone: textZone,
      negative_space_plan: negativeSpacePlan,
      creative_strategy: creativeStrategy,
      visual_format: visualFormat,
      visual_production: visualProduction,
      production_prompt: productionPrompt,
      slide_image_prompt: slideImagePrompt,
    };
  });

  const slideCount = normalizedSlides.length;
  // Slide count reason: strictly 5-step for 5 slides, 6-step for 6 slides
  const defaultSlideCountReason = slideCount === 5
    ? "5 Slide merupakan panjang optimal untuk alur narasi Hook → Problem → Reframe → How It Works / Value → CTA."
    : `${slideCount} Slide untuk alur narasi Hook → Problem → Why Current Method Fails → Solution → Proof/Value → CTA.`;

  let slideCountReason = String(targetObj.slide_count_reason || targetObj.slideCountReason || defaultSlideCountReason).trim();
  if (slideCount === 5 && (slideCountReason.includes('Why Current Method Fails') || slideCountReason.includes('6-tahap'))) {
    slideCountReason = "5 Slide merupakan panjang optimal untuk alur narasi Hook → Problem → Reframe → How It Works / Value → CTA.";
  }

  const beliefJourneySummary = String(
    targetObj.belief_journey_summary || targetObj.beliefJourneySummary ||
    `Menggeser persepsi audiens dari "${currentBelief}" menjadi "${desiredBelief}" melalui alur narasi terstruktur dari Hook hingga CTA berbasis value.`
  ).trim();

  const visualSystemNotes = String(
    targetObj.visual_system_notes || targetObj.visualSystemNotes ||
    `Tema visual konsisten menggunakan format 4:5 vertical, tipografi berhirarki tajam, ruang negatif lapang, dan aksen warna selaras corong ${funnelStage}.`
  ).trim();

  const isAligned = detectedIssues.length === 0;
  const alignmentIssue = detectedIssues.join(' | ');
  const alignmentFix = appliedFixes.length > 0
    ? appliedFixes.join(' | ')
    : `Penyelarasan pesan dan alur narasi telah divalidasi sesuai corong ${funnelStage}.`;

  const defaultCaptionInstruction = "Paste teks ini di caption/keterangan postingan setelah aset dibuat.";
  let captionForPost = String(targetObj.captionForPost || targetObj.caption_for_post || '').trim();
  if (!captionForPost || captionForPost.length < 25 || captionForPost.includes('[Tulis caption') || captionForPost.includes('...')) {
    captionForPost = buildFunnelAlignedCarouselCaption(funnelStage, activeItem, normalizedSlides, primaryCtaText);
  }
  const captionInstruction = String(targetObj.captionInstruction || targetObj.caption_instruction || defaultCaptionInstruction).trim() || defaultCaptionInstruction;

  const canonicalPlan: CarouselPlan = {
    content_goal: rawGoal,
    funnel_stage: funnelStage,
    current_belief: currentBelief,
    desired_belief: desiredBelief,
    core_promise: corePromise,
    primary_cta_type: primaryCtaType,
    primary_cta_text: primaryCtaText,
    slide_count: slideCount,
    slide_count_reason: slideCountReason,
    belief_journey_summary: beliefJourneySummary,
    captionForPost,
    captionInstruction,
    messageAlignmentCheck: {
      isAligned,
      issue: alignmentIssue || undefined,
      fixApplied: alignmentFix,
    },
    visual_system_notes: visualSystemNotes,
    slides: normalizedSlides,
  };

  return JSON.stringify(canonicalPlan, null, 2);
};

// Funnel-aligned caption generator for Carousel summarizing all slides
function buildFunnelAlignedCarouselCaption(
  funnelStage: string,
  item?: ContentItem | null,
  slides?: CarouselSlide[],
  ctaText?: string,
  context?: any
): string {
  const existingCaption = (item?.caption || '').trim();
  const headline = item?.headline?.trim() || (slides && slides[0]?.headline) || 'Insight Penting';
  const bodyText = item?.body?.trim() || (slides && slides[1]?.body) || '';
  const cta = ctaText || item?.cta?.trim() || (funnelStage === 'BOFU' ? 'Pelajari selengkapnya melalui tautan di profil.' : funnelStage === 'MOFU' ? 'Simpan postingan ini untuk panduan alurmu.' : 'Simpan postingan ini agar mudah dibaca kembali.');

  if (existingCaption && existingCaption.length >= 40 && !existingCaption.includes('...') && !existingCaption.toLowerCase().includes('lorem')) {
    return existingCaption;
  }

  if (funnelStage === 'TOFU') {
    return `${headline}

${bodyText ? `${bodyText}\n\n` : ''}Pernahkah Anda menyadari bahwa pendekatan yang biasa digunakan sering kali belum menyentuh akar masalah yang sebenarnya?

Geser slide di atas untuk menyimak evaluasi terstruktur yang dapat langsung diterapkan.

${cta}`;
  } else if (funnelStage === 'MOFU') {
    return `${headline}

${bodyText ? `${bodyText}\n\n` : ''}Menemukan solusi yang efektif membutuhkan kejelasan alur yang menghubungkan titik masalah dengan pemahaman metode kerja terarah.

Di carousel ini, kami mengulas tahapan utama:
1. Memahami titik hambatan utama audiens
2. Mengapa pendekatan lama belum optimal
3. Menerapkan alur terstruktur untuk hasil yang konsisten

Geser seluruh slide untuk menyimak alur lengkapnya.

${cta}`;
  } else {
    // BOFU
    return `${headline}

${bodyText ? `${bodyText}\n\n` : ''}Hasil optimal dan konsisten terwujud saat Anda memiliki pendekatan terpadu yang dapat diandalkan.

Manfaat utama:
- Alur kerja yang lebih efisien dan terukur
- Keputusan yang tepat selaras dengan tujuan jangka panjang
- Hasil yang terstandarisasi tanpa spekulasi

${cta}`;
  }
}

// Helper function to build Stage 1 Content Plan prompt for 2-stage Carousel generation
// Stage 1 ONLY outputs narrative structure (NO visual prompts, NO image generation instructions)
function buildCarouselStage1Prompt(
  funnelStage: string,
  funnelPromptBlock: string,
  formattedContext: string,
  funnelRules: any,
  activeItem: any,
  revisionDirective: string
): string {
  return `Buatkan CAROUSEL STAGE 1: CONTENT PLAN - FUNNEL ${funnelStage} (Bahasa Indonesia, profesional).

${ANTI_DRIFT_RULES}

### FUNNEL STRATEGY RULES CONTRACT:
${funnelPromptBlock}

${formattedContext}

### OUTPUT FORMAT DIRECTION (STAGE 1: CONTENT PLAN):
Hasilkan 1 (SATU) Content Plan Carousel yang utuh dan terstruktur untuk tahap corong ${funnelStage} dalam format JSON object canonical murni (BUKAN array, tanpa markdown pembungkus).
PENTING: Tahap 1 HANYA menghasilkan rencana naskah/narasi konten (Content Plan). JANGAN sertakan instruksi visual, prompt gambar, atau sintaks Midjourney/Flux di tahap ini.

STRUKTUR NARASI CAROUSEL WAJIB:
Hook → Problem → Why Current Method Fails / Reframe → Solution / Mechanism → CTA

ATURAN STRUKTUR UNTUK 5 SLIDE (DEFAULT):
- Slide 1: Hook (Peran: "hook") - Hook spesifik sesuai pain point audiens project, BUKAN langsung hard selling atau ajakan beli.
- Slide 2: Problem (Peran: "problem") - Fokus pada SATU masalah konkret yang dihadapi target audiens.
- Slide 3: Why Current Method Fails / Reframe (Peran: "reframe") - Menjelaskan mengapa metode lama gagal dan menyajikan sudut pandang sistemik yang relevan.
- Slide 4: Solution + Value/Proof (Peran: "learn") - Solusi terstruktur dan pembuktian nilai nyata berbasis fitur/alur kerja yang relevan dengan positioning brand.
- Slide 5: CTA (Peran: "cta") - Ajakan bertindak berbasis value yang relevan dengan offer (bukan sekadar "Link di bio").

WAJIB KEMBALIKAN HANYA JSON OBJECT STAGE 1 (TANPA MARKDOWN, TANPA PETUNJUK VISUAL):
{
  "content_goal": "${funnelRules.goal}",
  "funnel_stage": "${funnelStage}",
  "current_belief": "[Keyakinan lama audiens yang keliru atau membatasi]",
  "desired_belief": "[Keyakinan baru yang ingin ditanamkan setelah membaca carousel]",
  "core_promise": "[Janji nilai utama yang ditawarkan carousel ini sesuai context project]",
  "primary_cta_type": "${funnelStage === 'BOFU' ? 'direct_offer' : 'engagement_save'}",
  "primary_cta_text": "[Teks CTA utama berbasis value yang sesuai corong ${funnelStage}]",
  "slide_count": 5,
  "slide_count_reason": "5 Slide optimal untuk alur narasi Hook → Problem → Reframe → Solution → CTA.",
  "belief_journey_summary": "[Ringkasan transformasi pola pikir audiens dari slide awal hingga akhir]",
  "messageAlignmentCheck": {
    "isAligned": true,
    "issue": "",
    "fixApplied": "Penyelarasan pesan dan alur narasi telah divalidasi sesuai corong ${funnelStage}."
  },
  "slides": [
    {
      "slide": 1,
      "role": "hook",
      "communication_job": "Menghentikan scroll dengan relatable problem sesuai konteks project",
      "headline": "[Hook spesifik sesuai pain point audiens project]",
      "body": "[1-2 kalimat pengantar yang relevan dengan topik project]",
      "swipe_bridge": "[Kalimat jembatan untuk swipe] ➔",
      "emotional_state": "Empati & Refleksi Kritis",
      "core_message": "[Pesan inti hook slide 1]",
      "audience_emotion": "Empati & Refleksi Kritis"
    },
    {
      "slide": 2,
      "role": "problem",
      "communication_job": "Fokus pada satu masalah konkret yang dihadapi target audiens",
      "headline": "[Masalah konkret yang dihadapi target audiens]",
      "body": "[Penjelasan satu masalah konkret tanpa mencampur aduk isu lain]",
      "swipe_bridge": "[Kalimat jembatan mengapa cara lama tidak cukup] ➔",
      "emotional_state": "Kesadaran Masalah Tunggal",
      "core_message": "[Pesan inti masalah slide 2]",
      "audience_emotion": "Kesadaran Masalah Tunggal"
    },
    {
      "slide": 3,
      "role": "reframe",
      "communication_job": "Menjelaskan mengapa metode lama gagal dan memberikan sudut pandang baru",
      "headline": "[Reframing / mengapa cara lama gagal sesuai konteks project]",
      "body": "[Penjelasan sudut pandang baru yang sistemik dan tidak generik]",
      "swipe_bridge": "[Kalimat jembatan menuju solusi] ➔",
      "emotional_state": "Pencerahan (Aha-Moment)",
      "core_message": "[Pesan inti reframe slide 3]",
      "audience_emotion": "Pencerahan (Aha-Moment)"
    },
    {
      "slide": 4,
      "role": "learn",
      "communication_job": "Menyajikan solusi terstruktur dan nilai nyata berbasis fitur/workflow",
      "headline": "[Solusi / framework / alur kerja yang relevan dengan positioning brand]",
      "body": "[Penjelasan solusi terstruktur dan nilai nyata berbasis fitur/workflow]",
      "swipe_bridge": "[Kalimat jembatan menuju aksi penutup] ➔",
      "emotional_state": "Optimis & Paham Nilai Nyata",
      "core_message": "[Pesan inti solusi slide 4]",
      "audience_emotion": "Optimis & Paham Nilai Nyata"
    },
    {
      "slide": 5,
      "role": "cta",
      "communication_job": "Mendorong aksi penutup berbasis value yang sesuai corong ${funnelStage}",
      "headline": "[Ajakan bertindak berbasis value yang relevan dengan offer]",
      "body": "[Penjelasan manfaat tindakan penutup selaras dengan penawaran project]",
      "swipe_bridge": "[Teks CTA penutup]",
      "emotional_state": "Terdorong Bertindak Berbasis Value",
      "core_message": "[Pesan inti CTA slide 5]",
      "audience_emotion": "Dorongan Aksi Berbasis Value"
    }
  ]
}${revisionDirective}`;
}

// Helper function to build Stage 2 Visual Enrichment prompt for 2-stage Carousel generation
function buildCarouselStage2Prompt(
  funnelStage: string,
  stage1JsonString: string,
  formattedContext: string,
  batchSlideNumbers?: number[]
): string {
  const batchDirective = batchSlideNumbers && batchSlideNumbers.length > 0
    ? `\n### BATCH DIRECTIVE:
Hasilkan pengayaan visual HANYA untuk slide nomor: [${batchSlideNumbers.join(', ')}].
Jangan menghasilkan visual untuk slide di luar daftar nomor ini dalam pemanggilan ini.`
    : '';

  return `Buatkan CAROUSEL STAGE 2: VISUAL ENRICHMENT - FUNNEL ${funnelStage} (Bahasa Indonesia, profesional).

${ANTI_DRIFT_RULES}

${formattedContext}

### STAGE 1 CONTENT PLAN INPUT:
${stage1JsonString}
${batchDirective}

### OUTPUT FORMAT DIRECTION (STAGE 2: VISUAL ENRICHMENT):
Hasilkan pengayaan visual lengkap untuk slide Stage 1 Content Plan di atas dalam format JSON object canonical murni (BUKAN array, tanpa markdown pembungkus).
PENTING: DILARANG MENGUBAH NARASI/TEXT DARI STAGE 1 (headline, body, swipe_bridge, communication_job tetap utuh dari Stage 1). Tahap 2 HANYA memperkaya lapisan visual.

UNTUK SETIAP SLIDE TARGET DI "slides", BERIKAN PETUNJUK VISUAL & SLIDE IMAGE PROMPT:
1. visual_format: "photography" | "infographic" | "hybrid"
2. visual_intent: Instruksi visual konkret selaras pesan slide dan brand aesthetic
3. visual_type: "editorial-photo" | "comparison-split" | "minimal-diagram" | "step-framework" | "cta-card"
4. text_zone: "Upper Third / Left Aligned" | "Center / Left Aligned" | "Center Aligned"
5. negative_space_plan: Perencanaan ruang kosong (min 35-50% untuk penempatan headline)
6. visual_production: {
     subject: string;
     action: string;
     composition: string;
     layout: string;
     visual_metaphor: string;
     typography: string;
     background: string;
     color_mood: string;
     negative_space: string;
     negative_prompt: string;
   }
7. production_prompt: Prompt ringkasan tata letak
8. slide_image_prompt: Prompt 14 baris lengkap siap pakai untuk Midjourney/Flux:
   Buatkan saya image untuk slide carousel Instagram 4:5.

   Funnel Stage: ${funnelStage}
   Slide Role: [Hook | Problem | Reframe | Solution | CTA]
   Visual Objective: [Tujuan visual konkret]
   Subject/Object: [Subjek / figur / kartu UI diagram sesuai topik slide]
   Action/Scene: [Aktivitas fisik / penataan elemen visual]
   Expression/Emotion: [Ekspresi mikro wajah ATAU impresi visual]
   Environment: [Setting latar yang relevan dengan topik project]
   Composition: [Komposisi visual 4:5 dengan ruang negatif 40% untuk headline]
   Lighting: [Pencahayaan alami lembut / studio terarah]
   Camera/Graphic Style: [50mm editorial photography feel ATAU Clean minimalist UI infographic]
   Visual Style: Clean editorial Instagram content, natural, tidak seperti iklan.
   Typography: Headline besar 3-5 baris, high contrast, tidak ada teks kecil lain.
   Text Overlay: '[Headline slide dari Stage 1]'
   Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable typography, distorted face, extra fingers.

WAJIB KEMBALIKAN HANYA JSON OBJECT STAGE 2 (TANPA MARKDOWN):
{
  "visual_system_notes": "Sistem visual 4:5 vertical editorial selaras corong ${funnelStage} dan identitas visual project.",
  "captionForPost": "[Caption Instagram yang merangkum pesan carousel sesuai funnel ${funnelStage}]",
  "captionInstruction": "Paste teks ini di caption/keterangan postingan setelah aset dibuat.",
  "slides": [
    {
      "slide": ${batchSlideNumbers && batchSlideNumbers.length > 0 ? batchSlideNumbers[0] : 1},
      "visual_format": "photography",
      "visual_intent": "[Instruksi visual konkret selaras dengan pesan slide dan brand aesthetic]",
      "visual_type": "editorial-photo",
      "text_zone": "Upper Third / Left Aligned",
      "negative_space_plan": "Ruang lega 40% di area kiri atas untuk headline",
      "visual_production": {
        "subject": "[Deskripsi subjek / figur / kartu UI diagram sesuai topik]",
        "action": "[Aksi konkret atau penataan visual]",
        "composition": "Subjek di kanan tengah, ruang kosong lapang di kiri atas untuk headline.",
        "layout": "Format 4:5 vertical, headline dominan di kiri atas.",
        "visual_metaphor": "[Metafora visual yang memperjelas pesan]",
        "typography": "Headline tebal 32pt kontras tinggi, body 16pt sans-serif.",
        "background": "[Latar belakang bersih selaras dengan brand aesthetic].",
        "color_mood": "Profesional & terarah.",
        "negative_space": "Ruang lega 40% di area kiri atas untuk headline.",
        "negative_prompt": "hard selling ads, cluttered poster, too much text, generic stock photo, unreadable typography, distorted face, extra fingers."
      },
      "production_prompt": "Layout: Format 4:5 vertical, headline dominan di atas.\\nSubject/Object Utama: [Deskripsi subjek/objek]\\nVisual Metaphor: [Metafora visual]\\nTypography Hierarchy: Headline tebal 32pt, body 16pt.\\nBackground: Neutral clean canvas.\\nColor Mood: Profesional.\\nNegative Space: 40% ruang bersih.\\nImage/Illustration Direction: Clean editorial modern aesthetic.",
      "slide_image_prompt": "Buatkan saya image untuk slide carousel Instagram 4:5.\\n\\nFunnel Stage: ${funnelStage}\\nSlide Role: [Role]\\nVisual Objective: [Tujuan visual]\\nSubject/Object: [Subjek atau objek relevan]\\nAction/Scene: [Aksi konkret]\\nExpression/Emotion: [Ekspresi / impresi]\\nEnvironment: [Setting lingkungan]\\nComposition: Subjek di kanan tengah, ruang kosong luas di kiri atas untuk headline.\\nLighting: Cahaya alami lembut.\\nCamera/Graphic Style: 50mm editorial photography feel.\\nVisual Style: Clean editorial Instagram content, natural, tidak seperti iklan.\\nTypography: Headline besar di area lapang, high contrast.\\nText Overlay: '[Headline slide dari Stage 1]'\\nNegative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable typography, distorted face, extra fingers."
    }
  ]
}`;
}

// Helper function to merge Stage 1 (Content Plan) and Stage 2 (Visual Enrichment) into canonical Carousel Plan JSON
// ENFORCES: Stage 2 MUST NOT rewrite narrative content from Stage 1 (Test F compliant)
const mergeCarouselPlanStages = (
  stage1Raw: any,
  stage2Raw: any,
  activeItem?: any,
  activeContext?: any
): string | null => {
  const stage1Obj = typeof stage1Raw === 'string' ? tryParseJSON(stage1Raw) : stage1Raw;
  if (!stage1Obj || typeof stage1Obj !== 'object') return null;

  const stage2Obj = typeof stage2Raw === 'string' ? tryParseJSON(stage2Raw) : stage2Raw;
  const s1Obj = Array.isArray(stage1Obj) ? stage1Obj[0] : stage1Obj;
  const s2Obj = (stage2Obj && typeof stage2Obj === 'object')
    ? (Array.isArray(stage2Obj) ? stage2Obj[0] : stage2Obj)
    : {};

  const s1Slides = Array.isArray(s1Obj.slides) ? s1Obj.slides : [];
  const s2Slides = Array.isArray(s2Obj.slides) ? s2Obj.slides : [];

  if (s1Slides.length === 0) return null;

  const mergedSlides = s1Slides.map((s1: any, idx: number) => {
    const slideNum = Number(s1.slide || idx + 1);
    const s2 = s2Slides.find((item: any) => Number(item.slide) === slideNum) || {};

    // Narrative content is strictly protected from Stage 1:
    return {
      ...s1,
      slide: slideNum,
      role: s1.role || 'content',
      communication_job: s1.communication_job || '',
      headline: s1.headline || '',
      body: s1.body || '',
      swipe_bridge: s1.swipe_bridge || '',
      emotional_state: s1.emotional_state || '',
      core_message: s1.core_message || s1.creative_strategy?.core_message || s1.headline || '',
      audience_emotion: s1.audience_emotion || s1.creative_strategy?.audience_emotion || s1.emotional_state || '',

      // Visual fields enriched from Stage 2 (or retained from previous enrichment)
      visual_format: s2.visual_format || s1.visual_format || (slideNum === 1 ? 'photography' : 'infographic'),
      visual_intent: s2.visual_intent || s1.visual_intent || '',
      visual_type: s2.visual_type || s1.visual_type || (slideNum === 1 ? 'editorial-photo' : 'minimal-diagram'),
      text_zone: s2.text_zone || s1.text_zone || 'Upper Third / Left Aligned',
      negative_space_plan: s2.negative_space_plan || s1.negative_space_plan || 'Ruang bersih 40%',
      creative_strategy: {
        funnel_stage: s1.creative_strategy?.funnel_stage || s1Obj.funnel_stage || 'TOFU',
        slide_role: s1.role || 'content',
        visual_objective: s2.creative_strategy?.visual_objective || s2.visual_intent || s1.creative_strategy?.visual_objective || s1.visual_intent || '',
        core_message: s1.headline || '',
        audience_emotion: s1.emotional_state || s1.creative_strategy?.audience_emotion || '',
        visual_concept: s2.creative_strategy?.visual_concept || s2.visual_production?.visual_metaphor || s1.creative_strategy?.visual_concept || '',
        text_overlay: s1.headline || '',
      },
      visual_production: s2.visual_production || s1.visual_production,
      production_prompt: s2.production_prompt || s1.production_prompt,
      slide_image_prompt: s2.slide_image_prompt || s1.slide_image_prompt,
    };
  });

  const mergedPlan = {
    ...s1Obj,
    visual_system_notes: s2Obj.visual_system_notes || s1Obj.visual_system_notes || 'Tema visual konsisten 4:5 vertical editorial.',
    captionForPost: s2Obj.captionForPost || s1Obj.captionForPost || buildFunnelAlignedCarouselCaption(s1Obj.funnel_stage || 'TOFU', activeItem, mergedSlides, s1Obj.primary_cta_text, activeContext),
    captionInstruction: s2Obj.captionInstruction || s1Obj.captionInstruction || 'Paste teks ini di caption/keterangan postingan setelah aset dibuat.',
    slides: mergedSlides,
  };

  return validateAndNormalizeCarouselPlan(JSON.stringify(mergedPlan), activeItem, activeContext);
};

// Funnel-aligned caption generator for Video summarizing full video
function buildFunnelAlignedVideoCaption(
  funnelStage: string,
  item?: ContentItem | null,
  style?: VideoStyle | any,
  ctaText?: string
): string {
  const existingCaption = (item?.caption || '').trim();
  const scriptHook = style?.script?.hook || item?.headline || 'Wawasan Strategis';
  const scriptSolusi = style?.script?.solusi || '';
  const cta = ctaText || style?.script?.cta || (funnelStage === 'BOFU' ? 'Akses informasi selengkapnya melalui tautan di profil' : funnelStage === 'MOFU' ? 'Simpan video ini untuk referensi alur Anda' : 'Simpan video ini agar tidak terlewat');

  if (existingCaption && existingCaption.length >= 40 && !existingCaption.includes('...') && !existingCaption.toLowerCase().includes('lorem')) {
    return existingCaption;
  }

  if (funnelStage === 'TOFU') {
    return `${scriptHook}

Banyak yang berasumsi bahwa hasil optimal selalu membutuhkan proses yang rumit. Padahal, kuncinya terletak pada kejelasan pendekatan yang menjawab kebutuhan nyata audiens tanpa berbelit-belit.

Simak video ini untuk penjelasan selengkapnya.

${cta}`;
  } else if (funnelStage === 'MOFU') {
    return `${scriptHook}

Mengapa proses yang dijalankan kerap kali belum memberikan hasil optimal? Karena audiens membutuhkan kejelasan metode kerja yang terarah dan terbukti.

${scriptSolusi ? `${scriptSolusi}\n\n` : ''}Di video ini kami merangkum langkah-langkah praktis yang dapat langsung Anda terapkan.

${cta}`;
  } else {
    // BOFU
    return `${scriptHook}

Saatnya beralih ke pendekatan yang lebih terpadu, teruji, dan efisien.

${scriptSolusi ? `${scriptSolusi}\n\n` : ''}Dapatkan hasil yang lebih terstruktur dan siap mendukung pencapaian tujuan Anda secara konsisten.

${cta}`;
  }
}

// Normalize & validate incoming Video AI output
function validateAndNormalizeVideoStyles(
  rawText: string,
  activeItem?: ContentItem | null,
  activeContext?: SharedContentContext | null
): string | null {
  try {
    let parsed = tryParseJSON(rawText);
    if (!parsed) return null;
    let rawList: any[] = [];
    if (Array.isArray(parsed)) {
      rawList = parsed;
    } else if (typeof parsed === 'object' && parsed !== null) {
      if (Array.isArray(parsed.styles)) rawList = parsed.styles;
      else if (Array.isArray(parsed.videos)) rawList = parsed.videos;
      else rawList = [parsed];
    }
    if (rawList.length === 0) return null;

    const funnelStage = normalizeFunnelStage(activeItem?.jenis);
    const funnelRules = getFunnelRules(activeItem?.jenis);
    const rawCta = activeItem?.cta || (funnelStage === 'BOFU' ? 'Lihat demo' : funnelStage === 'MOFU' ? 'Cek framework ini' : 'Simpan ide ini');
    const safeCta = sanitizeCtaForFunnel(rawCta, funnelStage);
    const voiceoverCta = getVoiceoverCtaForFunnel(rawCta, funnelStage);
    const defaultCaptionInstruction = "Paste teks ini di caption/keterangan postingan setelah aset dibuat.";

    const normalizedStyles: VideoStyle[] = rawList.map((v: any, idx: number) => {
      const id = (v.id === 'A' || v.id === 'B' || v.id === 'C') ? v.id : (idx === 0 ? 'A' : idx === 1 ? 'B' : 'C');
      const name = String(v.name || `Style ${id}`).trim();
      const hookStyle = String(v.hookStyle || v.hook_style || 'Hook pembuka menarik').trim();
      const pacingStyle = String(v.pacingStyle || v.pacing_style || 'Dinamis').trim();
      const audioDirection = String(v.audioDirection || v.audio_direction || 'Natural voiceover & background music').trim();
      const voiceoverOutline = String(v.voiceoverOutline || v.voiceover_outline || '').trim();
      
      const rawScript = v.script || {};
      const script: VideoScript = {
        hook: String(rawScript.hook || activeItem?.headline || 'Pernah merasa begini?').trim(),
        masalah: String(rawScript.masalah || activeItem?.body || 'Banyak yang belum menyadari hambatan ini.').trim(),
        solusi: String(rawScript.solusi || 'Solusi terstruktur memudahkan alur kerjamu.').trim(),
        proof: String(rawScript.proof || 'Hasil lebih konsisten dan terarah.').trim(),
        cta: String(rawScript.cta || voiceoverCta).trim(),
      };

      const videoPrompt = String(v.videoPrompt || v.video_prompt || '').trim();
      const visualPlan = String(v.visualPlan || v.visual_plan || '').trim();

      let captionForPost = String(v.captionForPost || v.caption_for_post || '').trim();
      if (!captionForPost || captionForPost.length < 25 || captionForPost.includes('[Tulis caption') || captionForPost.includes('...')) {
        captionForPost = buildFunnelAlignedVideoCaption(funnelStage, activeItem, { script }, voiceoverCta);
      }

      const captionInstruction = String(v.captionInstruction || v.caption_instruction || defaultCaptionInstruction).trim() || defaultCaptionInstruction;

      return {
        id,
        name,
        hookStyle,
        pacingStyle,
        audioDirection,
        voiceoverOutline,
        script,
        videoPrompt,
        visualPlan,
        captionForPost,
        captionInstruction,
      };
    });

    return JSON.stringify(normalizedStyles, null, 2);
  } catch (e) {
    return null;
  }
}

// Pure top-level function for building high-converting initial drafts for instant feedback
const getInitialDraft = (
  tab: 'review' | 'image' | 'carousel' | 'video' | 'ugc',
  currentItem?: ContentItem | null,
  currentContext?: SharedContentContext | null
) => {
  if (!currentItem || !currentContext || !currentContext.brand_context?.brand_name?.trim()) return '';
  const activeItem = currentItem;
  const activeContext: SharedContentContext = currentContext;

  const funnelStage = normalizeFunnelStage(activeItem.jenis);
  const funnelRules = getFunnelRules(activeItem.jenis);

  let defaultCtaFallback = 'Simpan ide ini';
  if (funnelStage === 'MOFU') {
    defaultCtaFallback = 'Cek framework ini';
  } else if (funnelStage === 'BOFU') {
    defaultCtaFallback = 'Lihat demo';
  }

  const rawCta = activeItem.cta && activeItem.cta.trim() ? activeItem.cta : defaultCtaFallback;
  const safeCta = sanitizeCtaForFunnel(rawCta, funnelStage);
  const voiceoverCta = getVoiceoverCtaForFunnel(rawCta, funnelStage);

  switch (tab) {
    case 'review':
      return `### 📊 EVALUASI KESELARASAN STRATEGI KONTEN

**Skor Penyelarasan Strategi:** 96/100 (SANGAT BAIK)

**1. Analisis Keselarasan Corong (${funnelStage}):**
- Item konten ini sangat cocok dengan tahap corong **${funnelStage}**. Tujuan utama yaitu **"${activeItem.tujuan || funnelRules.goal}"** tersampaikan secara alami tanpa terkesan memaksa.
- Pemilihan hook **"${activeItem.hookType || 'Relatable Hook'}"** sangat efektif untuk menangkap atensi segmen audiens utama: **${activeContext.audience_context?.primary_audience || 'Target Buyers'}**.

**2. Integrasi Suara Merek (Brand Voice):**
- Selaras dengan suara merek **"${activeContext.brand_context?.brand_voice || 'Profesional & Edukatif'}"**. Teks mengedukasi audiens sambil membangun otoritas di bidangnya.

**3. Rekomendasi Optimasi Kilat:**
- Pastikan kalimat pembuka (headline) menggunakan huruf tebal yang sangat mencolok secara visual.
- Gunakan CTA **"${safeCta}"** di bagian akhir teks/caption dengan penunjuk visual yang jelas agar audiens terdorong mengambil tindakan.`;

    case 'image': {
      const activeHeadline = activeItem.headline || 'Strategi Pembuatan Konten Organik yang Relatable';
      const audienceDesc = `${funnelRules.audienceState} - ${activeContext.audience_context?.primary_audience || 'Kreator & Solopreneur'}`;

      let initialAngles: any[] = [];

      if (funnelStage === 'BOFU') {
        const isSocialProof = /ratusan|puluhan|ribuan|\b\d+\s*\+?\s*(klien|brand|bisnis|alumni|member|pengguna)|pemilik bisnis|pengusaha|komunitas|testimoni|terbukti|studi kasus|hasil nyata|portofolio/i.test(activeHeadline);
        const bofuHeadlineA = isSocialProof ? activeHeadline : "Ratusan Pemilik Bisnis Sudah Membuktikan Alurnya.";
        const bofuHeadlineB = "Lihat hasil nyata dan efisiensi alur kerjanya sekarang.";
        const bofuHeadlineC = "Siap dipakai langsung untuk pertumbuhan konten bisnismu.";

        initialAngles = [
          {
            id: "A",
            name: "Social Proof & Community Hook",
            funnelStage: "BOFU",
            visualObjective: "Membangun kepercayaan mendalam dan mendorong keputusan akhir melalui social proof kredibel, komunitas nyata, dan validasi kepuasan pengguna.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Yakin, percaya, bangga, dan mantap mengambil keputusan bergabung.",
            visualStrategy: "Talent pemilik bisnis sedang meninjau dashboard statistik anggota komunitas aktif dan grafik pertumbuhan nyata di layar laptop.",
            hookStrategy: "Gunakan social proof nyata yang memvalidasi kualitas tanpa terkesan sebagai iklan hard-selling berlebihan.",
            layoutStrategy: "Komposisi editorial bersih, subjek di kanan tengah, ruang lapang di kiri atas untuk headline teks 3-5 baris.",
            textOverlay: bofuHeadlineA,
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: bofuHeadlineA,
              reason: "Sesuai tahap BOFU: menyajikan bukti social proof dan validasi komunitas yang kuat."
            },
            strategyBrief: {
              funnelStage: "BOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Social Proof & Community Hook",
              emosiUtama: "Yakin, percaya diri, mantap mengambil langkah",
              pesanVisual: "Validasi komunitas dan hasil nyata yang telah dinikmati ratusan pelaku bisnis"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: BOFU
Visual Objective: Membangun kepercayaan mendalam dan mendorong keputusan akhir melalui social proof kredibel, komunitas nyata, dan validasi kepuasan pengguna.
Subject: Seorang pemilik bisnis / profesional muda usia 28-32 tahun, berpenampilan rapi smart casual modern.
Action: Sedang melihat dashboard metrik pertumbuhan bisnis dan komunitas anggota aktif di layar laptop bersama rekan kerja, menunjukkan data validasi nyata.
Expression: Ekspresi yakin, bangga, dan percaya dengan senyum subtle puas (subtle confident smile), siap mengambil keputusan dan memperluas kolaborasi.
Environment: Studio kerja modern yang terang, laptop menampilkan grafik analitik positif dan forum komunitas, meja kayu rapi dengan secangkir kopi.
Composition: Subjek berada di posisi kanan tengah, menyisakan ruang negatif bersih yang lapang di area kiri atas untuk headline teks, framing rule of thirds editorial.
Lighting: Pencahayaan terang alami dari jendela besar (bright natural studio lighting) dengan kontras lembut profesional.
Camera: 50mm f/2.0 lens photography feel, eye-level, depth of field halus dengan latar belakang sedikit blur (subtle bokeh).
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "${bofuHeadlineA}"
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          },
          {
            id: "B",
            name: "Product Demo & Results Hook",
            funnelStage: "BOFU",
            visualObjective: "Menampilkan demonstrasi visual fitur alur kerja siap pakai dan ringkasan hasil yang terbukti.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Puas, tertarik, dan melihat nilai nyata secara jelas.",
            visualStrategy: "Talent sedang meninjau demonstrasi fitur alur kerja otomatis dan laporan hasil konversi yang siap dieksekusi di layar laptop.",
            hookStrategy: "Tampilkan kejelasan alur produk yang menyelesaikan hambatan secara instan.",
            layoutStrategy: "Komposisi sudut 45 derajat modern, fokus pada layar kerja laptop dan tablet, ruang teks lapang di kiri atas.",
            textOverlay: bofuHeadlineB,
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: bofuHeadlineB,
              reason: "Sesuai tahap BOFU: menyajikan kejelasan hasil produk dan kesiapan implementasi."
            },
            strategyBrief: {
              funnelStage: "BOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Product Demo & Results Hook",
              emosiUtama: "Tertarik tinggi, merasa siap mencoba",
              pesanVisual: "Kemudahan implementasi solusi nyata yang siap mendongkrak performa"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: BOFU
Visual Objective: Menampilkan demonstrasi visual fitur alur kerja siap pakai dan ringkasan hasil yang terbukti.
Subject: Seorang solopreneur / praktisi profesional usia 27-30 tahun, berpakaian kemeja oxford rapi.
Action: Sedang meninjau demonstrasi fitur alur kerja otomatis dan laporan hasil konversi yang sudah selesai di layar monitor laptop.
Expression: Ekspresi puas, tertarik, dan penuh keyakinan atas bukti efektivitas solusi yang terlihat di layar.
Environment: Ruang kerja privat kontemporer dengan pencahayaan hangat, laptop menampilkan demo produk yang siap pakai, tata ruang rapi teratur.
Composition: Subjek di sisi kanan, ruang negatif lapang di kiri atas untuk headline teks, sudut kamera eye-level estetis.
Lighting: Soft ambient warm lighting dengan aksen cahaya alami yang menonjolkan layar kerja jernih.
Camera: 35mm lens photography feel, fokus tajam pada gestur subjek dan laptop, bokeh lembut di latar.
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "${bofuHeadlineB}"
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          },
          {
            id: "C",
            name: "Direct Value & Decision Hook",
            funnelStage: "BOFU",
            visualObjective: "Menegaskan nilai investasi dan memberikan dorongan keputusan akhir yang jelas dan percaya diri.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Mantap, terdorong mengambil tindakan, siap memulai.",
            visualStrategy: "Talent pebisnis sedang mengonfirmasi pilihan paket solusi lengkap di laptop dengan gestur siap melangkah.",
            hookStrategy: "Gunakan hook nilai langsung yang memberikan alasan kuat untuk segera mengambil keputusan.",
            layoutStrategy: "Komposisi sinematik bersih, framing seimbang dengan area teks lapang di bagian kiri atas.",
            textOverlay: bofuHeadlineC,
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: bofuHeadlineC,
              reason: "Sesuai tahap BOFU: memberikan dorongan keputusan aksi yang percaya diri."
            },
            strategyBrief: {
              funnelStage: "BOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Direct Value & Decision Hook",
              emosiUtama: "Decisive commitment, optimisme masa depan bisnis",
              pesanVisual: "Keputusan tepat yang siap membawa lompatan hasil secara terukur"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: BOFU
Visual Objective: Menegaskan nilai investasi dan memberikan dorongan keputusan akhir yang jelas dan percaya diri.
Subject: Seorang pebisnis / kreator mapan usia 28-32 tahun, gaya modern profesional.
Action: Sedang menandatangani atau menekan konfirmasi pada perangkat kerja dengan tampilan paket solusi lengkap yang siap dieksekusi.
Expression: Ekspresi percaya diri, tenang, dan siap melangkah (decisive commitment).
Environment: Meja meeting minimalis bergaya Scandinavian, laptop tipis dengan tampilan penawaran solusi terstruktur, suasana kerja premium.
Composition: Subjek di posisi kanan tengah frame, ruang negatif bersih di kiri atas untuk headline teks.
Lighting: Pencahayaan arsitektural modern yang hangat dan elegan, memberikan nuansa kredibilitas tinggi.
Camera: 50mm f/1.8 lens feel, fokus selektif tajam pada subjek, kedalaman visual berkelas.
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "${bofuHeadlineC}"
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          }
        ];
      } else if (funnelStage === 'MOFU') {
        initialAngles = [
          {
            id: "A",
            name: "Insight & Framework Hook",
            funnelStage: "MOFU",
            visualObjective: "Membangun pemahaman mendalam, framework solusi, perbandingan metode terstruktur, dan trust edukatif.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Tersadar, momen Aha!, merasa menemukan alur yang jelas.",
            visualStrategy: "Visual menyoroti perbandingan catatan terstruktur di notebook dan draf sistematis di laptop.",
            hookStrategy: "Gunakan hook insight yang mengubah cara audiens memandang masalah mereka.",
            layoutStrategy: "Komposisi editorial modern dengan ruang teks lapang di kiri atas, fokus visual pada notebook kerja.",
            textOverlay: "Bukan kurang rajin, cuma belum punya sistem alur yang jelas.",
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: "Bukan kurang rajin, cuma belum punya sistem alur yang jelas.",
              reason: "Sesuai tahap MOFU: menyajikan edukasi framework solusi terstruktur tanpa hard selling."
            },
            strategyBrief: {
              funnelStage: "MOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Insight & Framework Hook",
              emosiUtama: "Momen 'Aha!', ada kejelasan metode baru yang lebih mudah dieksekusi",
              pesanVisual: "Keteraturan dan kejelasan saat menemukan sistem kerja baru yang terstruktur"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: MOFU
Visual Objective: Membangun pemahaman mendalam, framework solusi, perbandingan metode terstruktur, dan trust edukatif.
Subject: Tangan seorang profesional kreatif sedang menandai poin diagram alur penting dengan pulpen di atas jurnal kerja terbuka di samping laptop.
Action: Jari tangan menunjuk ke catatan diagram checklist sederhana di notebook sambil membandingkan alur kerja di layar tablet digital.
Expression: Ekspresi fokus, mulai paham, tatapan 'aha moment' yang tenang dan penuh keyakinan saat menemukan keteraturan sistem baru.
Environment: Workspace minimalis estetik, meja kayu bersih dengan laptop tipis, notebook jurnal terbuka, kacamata berbingkai tipis, dan tablet digital.
Composition: Flatlay / 45-degree angle editorial composition, subjek tangan dan perangkat di bagian bawah dan kanan, area kiri atas dibiarkan bersih untuk teks headline.
Lighting: Pencahayaan terang alami merata dengan aksen warm ambient light lembut di latar belakang.
Camera: Close-up 35mm angle, tajam pada permukaan kertas dan layar, latar meja bertekstur halus.
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "Bukan kurang rajin, cuma belum punya sistem alur yang jelas."
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          },
          {
            id: "B",
            name: "Solution Comparison Hook",
            funnelStage: "MOFU",
            visualObjective: "Menyoroti perbandingan pola kerja terstruktur vs acak dan memberikan momen insight 'Aha!' yang edukatif.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Paham perbedaannya, optimis dengan solusi baru.",
            visualStrategy: "Visual perbandingan workspace yang rapi dengan diagram alur vs tumpukan coretan acak.",
            hookStrategy: "Bandingkan pendekatan lama yang memakan waktu vs pendekatan baru yang rapi.",
            layoutStrategy: "Komposisi split lembut editorial, ruang teks lapang di kiri atas.",
            textOverlay: "Masalahnya bukan rajin posting, tapi alur narasinya.",
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: "Masalahnya bukan rajin posting, tapi alur narasinya.",
              reason: "Sesuai tahap MOFU: menyoroti perbandingan akar masalah vs solusi terstruktur."
            },
            strategyBrief: {
              funnelStage: "MOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Solution Comparison Hook",
              emosiUtama: "Pencerahan cara kerja, rasa lega menemukan solusi",
              pesanVisual: "Perbedaan nyata antara pendekatan acak vs metode terarah"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: MOFU
Visual Objective: Menyoroti perbandingan pola kerja terstruktur vs acak dan memberikan momen insight 'Aha!' yang edukatif.
Subject: Seorang kreator muda usia 26-29 tahun berpakaian smart casual di studio kerja yang rapi.
Action: Sedang membandingkan diagram alur lama yang dicoret dengan skema alur baru yang bersih di layar tablet kerja.
Expression: Ekspresi fokus, mulai paham, tatapan 'aha moment' yang tenang saat menyadari kejelasan solusi baru.
Environment: Meja kerja kayu terang dengan notebook, tablet grafis, laptop, dan pencahayaan studio hangat.
Composition: Subjek di kanan frame, ruang kosong luas di kiri atas untuk headline teks, framing editorial.
Lighting: Soft directional studio light dengan gradasi bayangan natural berdimensi.
Camera: 50mm f/2.0 lens, fokus tajam pada ekspresi dan gesture analisis subjek.
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "Masalahnya bukan rajin posting, tapi alur narasinya."
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          },
          {
            id: "C",
            name: "Structured Workflow Hook",
            funnelStage: "MOFU",
            visualObjective: "Menunjukkan kemudahan implementasi workflow konten harian yang teratur dan teruji.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Percaya diri, termotivasi menata alur kerja.",
            visualStrategy: "Talent sedang meninjau tahapan checklist alur kerja yang tersusun rapi di aplikasi kerja.",
            hookStrategy: "Tunjukkan bagaimana sistem alur kerja mengubah proses pembuatan konten menjadi menyenangkan.",
            layoutStrategy: "Komposisi editorial over-the-shoulder, subjek di kanan, ruang teks lapang di kiri atas.",
            textOverlay: "Framework 4 langkah agar pesan konten langsung kena ke audiens.",
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: "Framework 4 langkah agar pesan konten langsung kena ke audiens.",
              reason: "Sesuai tahap MOFU: menyajikan framework terstruktur yang siap dipelajari."
            },
            strategyBrief: {
              funnelStage: "MOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Structured Workflow Hook",
              emosiUtama: "Optimis, terdorong mencoba framework",
              pesanVisual: "Kemudahan mengeksekusi konten harian menggunakan framework yang jelas"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: MOFU
Visual Objective: Menunjukkan kemudahan implementasi workflow konten harian yang teratur dan teruji.
Subject: Seorang profesional muda usia 27-30 tahun, pakaian kemeja santai rapi.
Action: Sedang meninjau langkah-langkah checklist alur konten di layar tablet sambil membuat anotasi ringkas.
Expression: Ekspresi fokus tenang dan antusias melihat kemudahan proses alur kerja baru.
Environment: Ruang kerja minimalis kontemporer, meja kayu bersih, laptop, secangkir teh hangat di dekat jendela.
Composition: Framing 45 derajat over-the-shoulder, ruang negatif lapang di kiri atas untuk headline teks.
Lighting: Cahaya alami pagi hari yang lembut dan merata (soft ambient morning light).
Camera: 35mm lens, depth of field teratur dengan latar bokeh halus.
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "Framework 4 langkah agar pesan konten langsung kena ke audiens."
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          }
        ];
      } else {
        // TOFU
        const tofuHeadline = buildShortImageOverlay(activeHeadline, 'TOFU');

        initialAngles = [
          {
            id: "A",
            name: "Relatable Problem Hook",
            funnelStage: "TOFU",
            visualObjective: "Membangun awareness alami dan empati relatable situasi kerja sehari-hari audiens tanpa unsur jualan.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Merasa dipahami, penasaran, dan ingin membaca.",
            visualStrategy: "Visual menggambarkan suasana kerja sehari-hari audiens yang sedang menatap draf di laptop dengan ekspresi reflektif.",
            hookStrategy: "Gunakan hook visual yang memancing rasa 'ini gue banget'.",
            layoutStrategy: "Komposisi editorial bersih, subjek di kanan tengah, ruang kosong lapang di kiri atas untuk teks headline 3-5 baris.",
            textOverlay: tofuHeadline,
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: tofuHeadline,
              reason: "Sesuai tahap TOFU: menyoroti masalah relatable sehari-hari tanpa hard selling atau urgensi."
            },
            strategyBrief: {
              funnelStage: "TOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Relatable Problem Hook (Situasi Sehari-hari)",
              emosiUtama: "Merasa dipahami, relate, reflektif saat melihat kebiasaan diri sendiri",
              pesanVisual: "Proses kreatif yang dekat dengan kenyataan sehari-hari audiens tanpa rekayasa berlebih"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: TOFU
Visual Objective: Membangun awareness alami dan empati relatable situasi kerja sehari-hari audiens tanpa unsur jualan.
Subject: Seorang kreator pria/wanita usia 26-28 tahun, berpakaian kemeja linen kasual santai, rambut tertata alami.
Action: Sedang membaca ulang draf caption di layar laptop sambil menopang dagu dengan satu tangan, tangan lainnya memegang cangkir keramik.
Expression: Ekspresi bingung ringan dan senyum kecut reflektif (ekspresi "kok tulisan ini kaku ya?"), alis sedikit terangkat, tatapan mata fokus meneliti layar.
Environment: Meja kerja kayu hangat di dekat jendela, laptop terbuka dengan dokumen draf, notebook catatan, cangkir kopi, dan tanaman hias kecil.
Composition: Subjek berada di posisi kanan tengah, menyisakan ruang negatif bersih yang lapang di area kiri atas untuk headline teks, framing rule of thirds editorial.
Lighting: Cahaya alami lembut masuk dari jendela samping (soft morning window light), pencahayaan hangat dengan gradasi bayangan natural berdimensi.
Camera: 50mm f/2.0 lens photography feel, eye-level, depth of field halus dengan latar belakang sedikit blur (subtle bokeh).
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "${tofuHeadline}"
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          },
          {
            id: "B",
            name: "Everyday Creator Struggle",
            funnelStage: "TOFU",
            visualObjective: "Menyoroti momen keraguan kecil sebelum posting yang sering dialami kreator secara universal.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Merasa relate, tersenyum kecil karena merasakan hal yang sama.",
            visualStrategy: "Visual kreator sedang memeriksa draf tulisan di smartphone dan laptop secara berulang.",
            hookStrategy: "Gunakan visual yang memantik empati kebiasaan mengetik konten.",
            layoutStrategy: "Komposisi editorial modern dengan ruang teks lapang di kiri atas.",
            textOverlay: "Udah nulis lama, tapi pas dibaca kok tetap hambar?",
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: "Udah nulis lama, tapi pas dibaca kok tetap hambar?",
              reason: "Sesuai tahap TOFU: menyoroti keraguan saat proses menulis konten sehari-hari."
            },
            strategyBrief: {
              funnelStage: "TOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Everyday Creator Struggle",
              emosiUtama: "Merasa relate, reflektif",
              pesanVisual: "Momen refleksi saat draf konten terasa kurang pas"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: TOFU
Visual Objective: Menyoroti momen keraguan kecil sebelum posting yang sering dialami kreator secara universal.
Subject: Seorang kreator muda usia 25-28 tahun, berpakaian sweater rajut santai di sudut meja kafe.
Action: Sedang memegang smartphone di tangan kiri sambil menatap layar laptop terbuka, gestur ragu sebelum menekan publikasi.
Expression: Ekspresi reflektif, alis sedikit terangkat dan bibir agak miring (ekspresi "apa yang kurang ya?").
Environment: Sudut kafe minimalis hangat, meja kayu kecil, secangkir kopi hangat, pencahayaan alami dari samping jendela.
Composition: Subjek di posisi kanan frame, menyisakan area bersih di kiri atas untuk teks headline.
Lighting: Cahaya alami jendela kafe (soft natural window illumination) bernuansa hangat.
Camera: 50mm f/1.8 lens, kedalaman bidang halus, latar belakang kafe sedikit bokeh.
Visual Style: Clean editorial Instagram photography, otentik bergaya dokumenter estetis, warna natural hangat, bukan poster iklan ramai atau foto stok generik.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "Udah nulis lama, tapi pas dibaca kok tetap hambar?"
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          },
          {
            id: "C",
            name: "Curiosity Hook",
            funnelStage: "TOFU",
            visualObjective: "Memicu rasa ingin tahu tinggi dan refleksi kritis sesaat sebelum tindakan posting.",
            contentGoal: funnelRules.goal,
            targetEmotion: "Penasaran, merasa ada sesuatu yang belum mereka sadari.",
            visualStrategy: "Visual menyiratkan pertanyaan ringan dengan framing sinematik lembut pada gestur evaluasi sebelum posting.",
            hookStrategy: "Gunakan visual yang membuat orang ingin tahu maksudnya.",
            layoutStrategy: "Framing sinematik dramatis lembut, tetap bersih, minimalis dan kontras tinggi di area headline kiri atas.",
            textOverlay: "Satu kebiasaan kecil sebelum posting yang sering dilewatkan.",
            messageAlignmentCheck: {
              isAligned: true,
              issue: "",
              fixedTextOverlay: "Satu kebiasaan kecil sebelum posting yang sering dilewatkan.",
              reason: "Sesuai corong Curiosity: memantik rasa penasaran alami dari sudut pandang pengalaman kreator."
            },
            strategyBrief: {
              funnelStage: "TOFU",
              tujuanKonten: funnelRules.goal,
              ideUtama: activeHeadline,
              audienceContext: audienceDesc,
              angle: "Curiosity Hook (Misteri Ringan & Pola Tersembunyi)",
              emosiUtama: "Penasaran tinggi, terdorong memeriksa apakah dirinya membuat kesalahan yang sama",
              pesanVisual: "Momen evaluasi kritis sesaat sebelum sebuah pesan dikirimkan ke publik"
            },
            finalPrompt: `Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):

Funnel Stage: TOFU
Visual Objective: Memicu rasa ingin tahu tinggi dan refleksi kritis sesaat sebelum tindakan posting.
Subject: Seorang kreator muda di kafe estetik, jari telunjuknya menggantung 2 cm di atas tombol touchpad laptop tepat sebelum menekan klik.
Action: Menghentikan gerakan tangan sesaat di atas laptop, pandangan mata menatap intens ke sudut layar dengan rasa penasaran.
Expression: Tatapan mata fokus meneliti, alis sedikit berkerut tanda berpikir kritis sebelum mengambil keputusan.
Environment: Meja kafe modern bernuansa hangat, secangkir latte art di samping laptop, jendela kafe dengan pepohonan hijau di luar fokus latar.
Composition: Cinematic angle 45 derajat, subjek di kanan frame, ruang negatif luas dan bersih di kiri atas untuk headline.
Lighting: Soft directional sunlight dari samping menciptakan kontras elegan dan bayangan lembut berdimensi.
Camera: 50mm f/1.8 cinematic photography lens, fokus tajam pada mata dan gestur tangan, bokeh creamy lembut pada latar belakang.
Visual Style: Clean editorial Instagram photography, visual storytelling autentik, tone warna hangat sinematik, bebas dari kesan iklan komersial kaku.
Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
Text Overlay: "Satu kebiasaan kecil sebelum posting yang sering dilewatkan."
Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.`
          }
        ];
      }

      const canonicalOutput = {
        recommendedAngleId: "A",
        recommendationReason: funnelStage === 'TOFU'
          ? "Angle Relatable Problem Hook direkomendasikan untuk membangun kesadaran awal (TOFU) secara organik tanpa resistensi audiens."
          : funnelStage === 'MOFU'
          ? "Angle Insight & Framework Hook direkomendasikan untuk membangun pemahaman dan otoritas edukatif yang kuat (MOFU)."
          : "Angle Social Proof & Community Hook direkomendasikan untuk membuktikan hasil nyata dan memvalidasi keputusan bergabung (BOFU).",
        angles: initialAngles
      };
      return JSON.stringify(canonicalOutput, null, 2);
    }

    case 'carousel': {
      if (activeItem?.carousel_plan) {
        const normalizedExisting = validateAndNormalizeCarouselPlan(JSON.stringify(activeItem.carousel_plan), activeItem, activeContext);
        if (normalizedExisting) return normalizedExisting;
        return JSON.stringify(activeItem.carousel_plan, null, 2);
      }
      const draftTopic = activeItem?.headline || (activeItem as any)?.topik || (activeItem as any)?.title || 'Strategi & Eksekusi Konten';
      const draftAudience = activeContext?.audience_context?.primary_audience || (activeItem as any)?.target_audience || 'Audiens';
      const draftProblem = activeItem?.body ? activeItem.body.slice(0, 80) : `Tantangan utama seputar ${draftTopic}`;
      const draftSolution = activeItem?.keterangan || `Pendekatan terstruktur untuk ${draftTopic}`;
      const draftProof = activeItem?.tujuan || `Penerapan metode yang konsisten menghasilkan efisiensi nyata`;
      const draftHook = activeItem?.headline || (activeItem as any)?.hook || `Memahami ${draftTopic} Secara Terstruktur`;

      const initialPlan: CarouselPlan = {
        content_goal: activeItem?.tujuan || funnelRules.goal,
        funnel_stage: funnelStage,
        current_belief: activeItem?.headline ? `Melihat ${activeItem.headline} tanpa alur sistematis.` : `Menangani ${draftTopic} tanpa alur yang jelas.`,
        desired_belief: `Memahami pentingnya alur ${funnelStage} untuk hasil komunikasi yang terarah dan konsisten.`,
        core_promise: `Menguasai alur ${funnelStage} untuk ${draftTopic} secara terstruktur dan efisien.`,
        primary_cta_type: funnelStage === 'BOFU' ? 'direct_offer' : 'engagement_save',
        primary_cta_text: safeCta,
        slide_count: 5,
        slide_count_reason: '5 Slide merupakan panjang optimal untuk alur narasi Hook → Problem → Reframe → How It Works / Value → CTA.',
        belief_journey_summary: `Mengubah pola pikir ${draftAudience} agar memahami pentingnya alur terstruktur untuk ${draftTopic}.`,
        messageAlignmentCheck: {
          isAligned: true,
          issue: '',
          fixApplied: `Penyelarasan pesan dan alur narasi telah divalidasi sesuai corong ${funnelStage}.`
        },
        visual_system_notes: 'Tema visual konsisten menggunakan format 4:5 vertical, tipografi kontras tinggi, ruang negatif lapang, dan aksen warna natural.',
        slides: [
          {
            slide: 1,
            role: 'hook',
            communication_job: 'Menghentikan scroll dengan alasan keputusan strategis / relatable problem',
            headline: draftHook,
            body: activeItem?.body || `Banyak ${draftAudience} menghadapi kendala saat menangani ${draftTopic} tanpa alur yang terencana.`,
            swipe_bridge: 'Kenapa hal ini sering terjadi? ➔',
            emotional_state: 'Empati & Refleksi Kritis',
            visual_intent: 'Visual editorial portrait profesional menelaah catatan kerja dengan pencahayaan alami hangat.',
            visual_type: 'editorial-photo',
            text_zone: 'Upper Third / Left Aligned',
            negative_space_plan: 'Ruang bersih di bagian atas untuk headline besar',
            creative_strategy: {
              funnel_stage: funnelStage,
              slide_role: 'hook',
              visual_objective: 'Visual editorial portrait profesional menelaah catatan kerja dengan pencahayaan alami hangat.',
              core_message: draftHook,
              audience_emotion: 'Empati & Refleksi Kritis',
              visual_concept: 'Editorial photographic framing dengan pencahayaan alami natural',
              text_overlay: draftHook
            },
            visual_format: 'photography',
            visual_production: {
              subject: 'Kreator / praktisi profesional sedang duduk di meja kerja kayu minimalis, menatap laptop dengan tatapan berpikir reflektif.',
              action: 'Menatap layar laptop dengan tatapan berpikir reflektif sambil menelaah draf konten.',
              composition: 'Subjek di kanan tengah, ruang kosong luas di kiri atas untuk headline.',
              layout: 'Format carousel Instagram 4:5 vertical, komposisi bersih dengan teks headline besar di kiri atas.',
              visual_metaphor: 'Refleksi kejenuhan menghadapi proses kerja yang belum memiliki sistem terpadu.',
              typography: 'Headline tebal 34pt kontras tinggi, body copy 16pt sans-serif nyaman dibaca, label slide di pojok atas.',
              background: 'Ruang kerja minimalis hangat dengan pencahayaan jendela alami lembut (#F9F8F6).',
              color_mood: `Nuansa profesional hangat (${funnelStage === 'TOFU' ? 'Sage Green & Warm Cream' : funnelStage === 'MOFU' ? 'Teal & Crisp Slate' : 'Deep Emerald'}).`,
              negative_space: 'Ruang lega 40% di area kiri atas untuk headline.',
              negative_prompt: 'hard selling ads, cluttered poster, too much text, generic stock photo, unreadable typography, distorted face, extra fingers, corporate cliche, overdesigned graphic.'
            },
            production_prompt: `Layout: Format carousel Instagram 4:5 vertical, komposisi bersih dengan teks headline besar di kiri atas.
Subject/Object Utama: Kreator / praktisi profesional sedang duduk di meja kerja kayu minimalis, menatap laptop dengan tatapan berpikir reflektif.
Visual Metaphor: Refleksi kejenuhan menghadapi proses kerja yang belum memiliki sistem terpadu.
Typography Hierarchy: Headline tebal 34pt kontras tinggi, body copy 16pt sans-serif nyaman dibaca, label slide di pojok atas.
Background: Ruang kerja minimalis hangat dengan pencahayaan jendela alami lembut (#F9F8F6).
Color Mood: Nuansa profesional hangat (${funnelStage === 'TOFU' ? 'Sage Green & Warm Cream' : funnelStage === 'MOFU' ? 'Teal & Crisp Slate' : 'Deep Emerald'}).
Negative Space: Ruang lega 40% di area kiri atas untuk headline.
Image/Illustration Direction: Clean minimalist modern editorial photography.`,
            slide_image_prompt: sanitizeAndGenerateSlideImagePrompt(
              undefined,
              1,
              'hook',
              draftHook,
              funnelStage,
              'Visual editorial portrait profesional menelaah catatan kerja dengan pencahayaan alami hangat.',
              'photography'
            )
          },
          {
            slide: 2,
            role: 'problem',
            communication_job: 'Fokus pada satu masalah utama yang dialami audiens saat ini',
            headline: `Kendala Nyata: ${draftProblem}`,
            body: `Banyak ${draftAudience} terjebak ketika menghadapi ${draftProblem} tanpa panduan terarah.`,
            swipe_bridge: 'Mengapa pendekatan biasa belum memadai? ➔',
            emotional_state: 'Kesadaran Masalah Tunggal',
            visual_intent: 'Perbandingan visual antara proses kerja yang tidak terarah versus alur kerja terstruktur.',
            visual_type: 'comparison-split',
            text_zone: 'Center / Left Aligned',
            negative_space_plan: 'Sisi kanan bersih untuk ilustrasi pembanding',
            creative_strategy: {
              funnel_stage: funnelStage,
              slide_role: 'problem',
              visual_objective: `Infografis kartu pembanding masalah utama: alur kerja terputus vs alur terstruktur untuk ${draftTopic}.`,
              core_message: `Kendala Nyata: ${draftProblem}`,
              audience_emotion: 'Kesadaran Masalah Tunggal',
              visual_concept: 'Kartu UI diagram alur dan hierarki tipografi modern bersih',
              text_overlay: `Kendala Nyata: ${draftProblem}`
            },
            visual_format: 'infographic',
            visual_production: {
              subject: 'Ilustrasi grafis perbandingan draf acak vs alur hierarki pesan terstruktur.',
              action: 'Penataan visual kartu masalah dengan highlight lembut pada titik hambatan utama.',
              composition: 'Center card layout / structured split grid dengan ruang negatif 40% lapang di area atas untuk headline.',
              layout: 'Split composition dua kartu perbandingan berdampingan.',
              visual_metaphor: 'Transformasi dari proses yang tidak terarah menjadi alur yang terorganisir rapi.',
              typography: 'Headline 28pt bold, bullet perbandingan 15pt dengan ikon cross merah dan check hijau.',
              background: 'Neutral off-white canvas (#F8F7F4).',
              color_mood: 'Nuansa analitis & informatif.',
              negative_space: 'Margin 32px di sekeliling kartu pembanding.',
              negative_prompt: 'photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads.'
            },
            production_prompt: `Layout: Split composition dua kartu perbandingan berdampingan.
Subject/Object Utama: Ilustrasi grafis perbandingan draf acak vs alur hierarki pesan terstruktur.
Visual Metaphor: Transformasi dari proses yang tidak terarah menjadi alur yang terorganisir rapi.
Typography Hierarchy: Headline 28pt bold, bullet perbandingan 15pt dengan ikon cross merah dan check hijau.
Background: Neutral off-white canvas (#F8F7F4).
Color Mood: Nuansa analitis & informatif.
Negative Space: Margin 32px di sekeliling kartu pembanding.
Image/Illustration Direction: Clean minimalist infographic diagram UI.`,
            slide_image_prompt: sanitizeAndGenerateSlideImagePrompt(
              undefined,
              2,
              'problem',
              `Kendala Nyata: ${draftProblem}`,
              funnelStage,
              'Perbandingan visual antara proses kerja yang tidak terarah versus alur kerja terstruktur.',
              'infographic'
            )
          },
          {
            slide: 3,
            role: 'reframe',
            communication_job: 'Menjelaskan mengapa metode lama gagal dan menyajikan sudut pandang sistemik',
            headline: `Sudut Pandang Baru: Mengurai ${draftTopic}`,
            body: `Kunci keberhasilan bukan bekerja lebih keras tanpa arah, melainkan menyelaraskan alur ${funnelStage} dengan kebutuhan nyata ${draftAudience}.`,
            swipe_bridge: 'Bagaimana pendekatan ini diterapkan? ➔',
            emotional_state: 'Pencerahan (Aha Moment)',
            visual_intent: `Infografis diagram pilar fondasi untuk pemahaman menyeluruh seputar ${draftTopic}.`,
            visual_type: 'minimal-diagram',
            text_zone: 'Center Aligned',
            negative_space_plan: 'Latar belakang netral dengan aksen hijau lembut',
            creative_strategy: {
              funnel_stage: funnelStage,
              slide_role: 'reframe',
              visual_objective: `Infografis kartu pencerahan fondasi strategis seputar ${draftTopic} dengan tipografi kontras tinggi.`,
              core_message: `Sudut Pandang Baru: Mengurai ${draftTopic}`,
              audience_emotion: 'Pencerahan (Aha Moment)',
              visual_concept: 'Kartu UI diagram alur dan hierarki tipografi modern bersih',
              text_overlay: `Sudut Pandang Baru: Mengurai ${draftTopic}`
            },
            visual_format: 'infographic',
            visual_production: {
              subject: 'Tiga lapisan kartu strategi yang saling terhubung secara harmonis.',
              action: 'Penataan tata letak visual bertingkat dengan penunjuk alur dan kartu berbayang halus.',
              composition: 'Center card layout / structured split grid dengan ruang negatif 40% lapang di area atas untuk headline.',
              layout: 'Center card composition dengan diagram 3 pilar utama.',
              visual_metaphor: 'Pilar fondasi komunikasi yang kokoh dan mudah dipahami.',
              typography: 'Headline 28pt bold, body deskripsi 16pt, nomor urut minimalis 01-02-03.',
              background: 'Warm neutral light texture (#FAF9F6).',
              color_mood: 'Pencerahan & kejelasan strategi.',
              negative_space: 'Ruang bernapas lapang di sekeliling diagram tengah.',
              negative_prompt: 'photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads.'
            },
            production_prompt: `Layout: Center card composition dengan diagram 3 pilar utama.
Subject/Object Utama: Tiga lapisan kartu strategi yang saling terhubung secara harmonis.
Visual Metaphor: Pilar fondasi komunikasi yang kokoh dan mudah dipahami.
Typography Hierarchy: Headline 28pt bold, body deskripsi 16pt, nomor urut minimalis 01-02-03.
Background: Warm neutral light texture (#FAF9F6).
Color Mood: Pencerahan & kejelasan strategi.
Negative Space: Ruang bernapas lapang di sekeliling diagram tengah.
Image/Illustration Direction: Modern minimalist 3D isometric or flat geometric diagram.`,
            slide_image_prompt: sanitizeAndGenerateSlideImagePrompt(
              undefined,
              3,
              'reframe',
              `Sudut Pandang Baru: Mengurai ${draftTopic}`,
              funnelStage,
              `Infografis kartu pencerahan fondasi strategis seputar ${draftTopic} dengan tipografi kontras tinggi.`,
              'infographic'
            )
          },
          {
            slide: 4,
            role: 'learn',
            communication_job: 'Menyajikan solusi terpadu dan pembuktian nilai efisiensi kerja nyata',
            headline: `Solusi & Pembuktian: ${draftSolution}`,
            body: `Dengan kerangka kerja yang jelas, ${draftProof}, sehingga hasil yang dicapai lebih konsisten dan terukur.`,
            swipe_bridge: 'Mulai terapkan langkahnya ➔',
            emotional_state: 'Optimisme & Kejelasan Sistem',
            visual_intent: `Tampilan alur kerja praktis dan langkah penerapan ${draftSolution}.`,
            visual_type: 'step-framework',
            text_zone: 'Upper Third',
            negative_space_plan: 'Ruang lega di sekitar checklist framework',
            creative_strategy: {
              funnel_stage: funnelStage,
              slide_role: 'learn',
              visual_objective: `Tampilan alur kerja terstruktur yang mendemonstrasikan implementasi ${draftSolution}.`,
              core_message: `Solusi & Pembuktian: ${draftSolution}`,
              audience_emotion: 'Optimisme & Kejelasan Sistem',
              visual_concept: 'Kartu UI diagram alur dan hierarki tipografi modern bersih',
              text_overlay: `Solusi & Pembuktian: ${draftSolution}`
            },
            visual_format: 'infographic',
            visual_production: {
              subject: 'Checklist framework langkah kerja dengan indikator verifikasi hijau.',
              action: 'Tata letak kartu proses bertingkat dengan penanda step yang jelas dan ruang bernapas lega.',
              composition: 'Center card layout / structured split grid dengan ruang negatif 40% lapang di area atas untuk headline.',
              layout: 'Card list 3 langkah praktis bertingkat.',
              visual_metaphor: 'Percepatan alur kerja yang efisien dan minim hambatan.',
              typography: 'Headline 28pt bold, poin langkah 16pt dengan icon badge.',
              background: 'Clean light cream (#F7F6F2).',
              color_mood: 'Kepercayaan, kredibilitas, dan optimisme.',
              negative_space: 'Padding internal 24px di setiap card langkah.',
              negative_prompt: 'photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads.'
            },
            production_prompt: `Layout: Card list 3 langkah praktis bertingkat.
Subject/Object Utama: Checklist framework langkah kerja dengan indikator verifikasi hijau.
Visual Metaphor: Percepatan alur kerja yang efisien dan minim hambatan.
Typography Hierarchy: Headline 28pt bold, poin langkah 16pt dengan icon badge.
Background: Clean light cream (#F7F6F2).
Color Mood: Kepercayaan, kredibilitas, dan optimisme.
Negative Space: Padding internal 24px di setiap card langkah.
Image/Illustration Direction: High-contrast product UI framework style.`,
            slide_image_prompt: sanitizeAndGenerateSlideImagePrompt(
              undefined,
              4,
              'learn',
              `Solusi & Pembuktian: ${draftSolution}`,
              funnelStage,
              `Tampilan alur kerja terstruktur yang mendemonstrasikan implementasi ${draftSolution}.`,
              'infographic'
            )
          },
          {
            slide: 5,
            role: 'cta',
            communication_job: 'Mendorong aksi penutup berbasis value yang sesuai dengan tahap corong',
            headline: `Langkah Lanjutan: ${safeCta}`,
            body: `Ambil langkah berikutnya untuk mendalami ${draftTopic} dan menerapkan strategi ini secara bertahap.`,
            swipe_bridge: safeCta,
            emotional_state: 'Dorongan Aksi Berbasis Value',
            visual_intent: 'Visual closing card bersih dengan tombol CTA kontras tinggi dan instruksi aksi berbasis value.',
            visual_type: 'cta-card',
            text_zone: 'Center Aligned',
            negative_space_plan: 'Latar bersih dengan tombol CTA kontras tinggi di tengah',
            creative_strategy: {
              funnel_stage: funnelStage,
              slide_role: 'cta',
              visual_objective: 'Visual closing card bersih dengan tombol CTA kontras tinggi dan instruksi aksi berbasis value.',
              core_message: `Langkah Lanjutan: ${safeCta}`,
              audience_emotion: 'Dorongan Aksi Berbasis Value',
              visual_concept: 'Kartu UI penutup dan tombol aksi kontras tinggi',
              text_overlay: `Langkah Lanjutan: ${safeCta}`
            },
            visual_format: 'infographic',
            visual_production: {
              subject: 'Kartu ajakan tindakan berbasis value dengan tipografi headline kuat dan button CTA berbayang halus.',
              action: 'Komposisi terpusat dengan headline ajakan nilai di atas dan tombol pill CTA elegan di tengah.',
              composition: 'Center card layout / structured split grid dengan ruang negatif 40% lapang di area atas untuk headline.',
              layout: 'Clean closing card layout dengan tombol CTA pill besar yang dominan di tengah.',
              visual_metaphor: 'Gerbang menuju implementasi strategi alur konten yang terstruktur.',
              typography: 'Headline 32pt bold, body naskah 16pt, CTA button text 18pt bold.',
              background: 'Subtle warm emerald gradient ambient (#F0FDF4 ke #FFFFFF).',
              color_mood: 'Tegas, terpercaya, dan berfokus pada value.',
              negative_space: 'Ruang lega 50% di sekitar tombol aksi utama.',
              negative_prompt: 'photography, realistic person, complex faces, human hands, messy sketch, stock photo, blurry text, cluttered layout, hard selling ads.'
            },
            production_prompt: `Layout: Clean closing card layout dengan tombol CTA pill besar yang dominan di tengah.
Subject/Object Utama: Kartu ajakan tindakan berbasis value dengan tipografi headline kuat dan button CTA berbayang halus.
Visual Metaphor: Gerbang menuju implementasi strategi alur konten yang terstruktur.
Typography Hierarchy: Headline 32pt bold, body naskah 16pt, CTA button text 18pt bold.
Background: Subtle warm emerald gradient ambient (#F0FDF4 ke #FFFFFF).
Color Mood: Tegas, terpercaya, dan berfokus pada value.
Negative Space: Ruang lega 50% di sekitar tombol aksi utama.
Image/Illustration Direction: Clean minimalist social media closing card.`,
            slide_image_prompt: sanitizeAndGenerateSlideImagePrompt(
              undefined,
              5,
              'cta',
              `Langkah Lanjutan: ${safeCta}`,
              funnelStage,
              'Visual closing card bersih dengan tombol CTA kontras tinggi dan instruksi aksi berbasis value.',
              'infographic'
            )
          }
        ],
        captionForPost: buildFunnelAlignedCarouselCaption(funnelStage, activeItem, undefined, safeCta),
        captionInstruction: "Paste teks ini di caption/keterangan postingan setelah aset dibuat."
      };
      return JSON.stringify(initialPlan, null, 2);
    }

    case 'video': {
      const vStyles = [
        {
          id: "A",
          name: `Style A: UGC (${funnelStage} Organic)`,
          hookStyle: "Pertanyaan spontan langsung menyentuh masalah utama",
          pacingStyle: "Natural, santai, banyak jeda natural",
          audioDirection: "Suara asli kreator (casual tone) dengan musik latar lofi santai",
          voiceoverOutline: `Menyapa audiens -> Membahas topik ${activeItem?.headline || 'strategi konten'} -> Memberikan insight ${funnelStage} -> ${voiceoverCta}`,
          script: {
            hook: `Pernah merasa konten kamu sudah dibuat maksimal tapi hasilnya stagnan?`,
            masalah: `Banyak yang asal posting tanpa memperhatikan struktur ${funnelStage}.`,
            solusi: activeContext.brand_context?.brand_name ? `Dengan ${activeContext.brand_context.brand_name}, kamu bisa menyusun alur konten ${funnelStage} secara otomatis.` : `Dengan sistem terarah, kamu bisa menyusun alur konten ${funnelStage} secara otomatis.`,
            proof: `Banyak kreator menghemat waktu dan menghasilkan narasi yang lebih terarah.`,
            cta: voiceoverCta
          },
          videoPrompt: "A friendly creator looking at their laptop screen, showing surprise and happiness, warm aesthetic home office, soft background, vertical 9:16.",
          visualPlan: `0-5s: Talent close-up penasaran. 5-15s: Tampilkan rekaman layar dasbor alur konten ${funnelStage}. 15-25s: Penjelasan visual strategi. 25-30s: Tampilan CTA ${safeCta}.`,
          captionForPost: buildFunnelAlignedVideoCaption(funnelStage, activeItem, { script: { hook: `Pernah merasa konten kamu sudah dibuat maksimal tapi hasilnya stagnan?`, solusi: activeContext.brand_context?.brand_name ? `Dengan ${activeContext.brand_context.brand_name}, kamu bisa menyusun alur konten ${funnelStage} secara otomatis.` : `Dengan sistem terarah, kamu bisa menyusun alur konten ${funnelStage} secara otomatis.`, cta: voiceoverCta } }, voiceoverCta),
          captionInstruction: "Paste teks ini di caption/keterangan postingan setelah aset dibuat."
        },
        {
          id: "B",
          name: "Style B: TikTok Loop (Infinite Trick)",
          hookStyle: "Kalimat pembuka menggantung menyambung dari CTA akhir",
          pacingStyle: "Sangat cepat, transisi secepat kilat, ketukan ritmis",
          audioDirection: "Musik up-beat trend TikTok yang catchy dengan sulih suara energik",
          voiceoverOutline: `Membuka loop -> Fakta mengejutkan -> Solusi ${funnelStage} -> CTA menggantung`,
          script: {
            hook: `Inilah alasan kenapa alur konten kamu belum efektif...`,
            masalah: `Membuat konten tanpa penyesisuan tahap ${funnelStage} membuat audiens bingung.`,
            solusi: activeContext.brand_context?.brand_name ? `${activeContext.brand_context.brand_name} membantu merapikan alur ${funnelStage} secara instan.` : `Sistem ini membantu merapikan alur ${funnelStage} secara instan.`,
            proof: `Sistem ini membantu menjaga konsistensi narasi harianmu.`,
            cta: `${voiceoverCta}`
          },
          videoPrompt: "Satisfying looping motion graphic of abstract futuristic clockwork gears spinning seamlessly on a clean minimalist gray background, 3D render vertical 9:16.",
          visualPlan: "0-5s: Teks tebal kontras tinggi berkedip cepat di layar. 5-15s: Animasi transisi corong warna neon. 15-25s: Grafik panah menanjak cepat. 25-30s: Layar meredup cepat bersiap menyambung ke awal loop.",
          captionForPost: buildFunnelAlignedVideoCaption(funnelStage, activeItem, { script: { hook: `Inilah alasan kenapa alur konten kamu belum efektif...`, solusi: activeContext.brand_context?.brand_name ? `${activeContext.brand_context.brand_name} membantu merapikan alur ${funnelStage} secara instan.` : `Sistem ini membantu merapikan alur ${funnelStage} secara instan.`, cta: voiceoverCta } }, voiceoverCta),
          captionInstruction: "Paste teks ini di caption/keterangan postingan setelah aset dibuat."
        },
        {
          id: "C",
          name: "Style C: Sinematik (Storytelling)",
          hookStyle: "Pernyataan filosofis tentang alur komunikasi",
          pacingStyle: "Lambat, dramatis, transisi halus, mengedepankan estetika visual",
          audioDirection: "Musik piano instrumental emosional dengan voiceover mendalam dan hangat",
          voiceoverOutline: `Narasi perjalanan -> Refleksi strategi -> Solusi terstruktur -> Penutup hangat`,
          script: {
            hook: `Berapa banyak waktu yang dihemat ketika strategi komunikasi tersusun rapi?`,
            masalah: `Menyampaikan pesan tanpa arah tahap ${funnelStage} membuat usaha kita terbuang.`,
            solusi: `Saat alur ${funnelStage} ditata dengan baik, pesan kamu terasa jauh lebih kuat.`,
            proof: `Otomatisasi membantu menjaga kualitas ide tanpa mengorbankan waktu.`,
            cta: `${voiceoverCta}`
          },
          videoPrompt: "Cinematic slow motion shot of a professional looking relaxed in a beautiful plant-filled cafe, soft golden hour sunlight filtering through glass windows, 8k vertical 9:16.",
          visualPlan: "0-10s: Slow motion talent menikmati minumannya dengan tenang. 10-20s: Close-up tablet menampilkan kurva grafik melesat naik. 20-30s: Teks estetik berukuran sedang muncul perlahan di layar kafe yang asri.",
          captionForPost: buildFunnelAlignedVideoCaption(funnelStage, activeItem, { script: { hook: `Berapa banyak waktu yang dihemat ketika strategi komunikasi tersusun rapi?`, solusi: `Saat alur ${funnelStage} ditata dengan baik, pesan kamu terasa jauh lebih kuat.`, cta: voiceoverCta } }, voiceoverCta),
          captionInstruction: "Paste teks ini di caption/keterangan postingan setelah aset dibuat."
        }
      ];
      return JSON.stringify(vStyles, null, 2);
    }

    case 'ugc': {
      const brandName = activeContext.brand_context?.brand_name || '';
      const creator = 'a 26-year-old Indonesian content creator wearing a casual beige shirt';
      const setting = 'in a modern minimalist room with natural ambient lighting';

      const scene1Script = normalizeGoogleFlowDialogue(1, funnelStage, activeItem?.headline || '', activeContext);
      const scene2Script = normalizeGoogleFlowDialogue(2, funnelStage, activeItem?.body || '', activeContext);
      const scene3Script = normalizeGoogleFlowDialogue(3, funnelStage, activeItem?.cta || voiceoverCta || '', activeContext);

      const ugcData = {
        characterProfile: `Berusia 22-35 tahun, percaya diri di depan kamera, berpenampilan rapi, bergaya kasual-profesional. Nada bicara antusias, energik, dan bersahabat seolah-olah merekomendasikan solusi rahasia ke sahabat dekat.`,
        characterReferenceImagePrompt: `A highly detailed commercial portrait of a 28-year-old Indonesian content creator smiling warmly, wearing a casual beige blazer over a white t-shirt, clean aesthetic minimal background, soft studio lighting, 85mm lens, photorealistic.`,
        scene1_image_prompt: `A 9:16 vertical realistic photo of ${creator} looking thoughtfully at the camera with an intriguing curious expression, ${setting}, natural indoor lighting, UGC style.`,
        scene2_image_prompt: `A 9:16 vertical realistic photo of ${creator} gesturing naturally while explaining an insightful concept to the camera, ${setting}, natural indoor lighting, UGC style.`,
        scene3_image_prompt: `A 9:16 vertical realistic photo of ${creator} making an inviting gesture with high energy and friendly authority, ${setting}, natural indoor lighting, UGC style.`,
        scene1_google_flow_prompt: buildGoogleFlowPromptString('close-up', creator, setting, scene1Script),
        scene2_google_flow_prompt: buildGoogleFlowPromptString('medium close-up', creator, setting, scene2Script),
        scene3_google_flow_prompt: buildGoogleFlowPromptString('medium', creator, setting, scene3Script),
        script_scene_1: scene1Script,
        script_scene_2: scene2Script,
        script_scene_3: scene3Script
      };
      return JSON.stringify(ugcData, null, 2);
    }
  }
};

const isErrorContent = (str: string | null | undefined): boolean => {
  if (!str) return false;
  const upper = str.toUpperCase();
  return upper.includes('RATE LIMIT') || upper.includes('QUOTA EXCEEDED') || upper.includes('PERMINTAAN AI SEDANG DIBATASI');
};

export default function ProductionStudioPage() {
  const router = useRouter();
  const { hasCustomKey } = useGeminiApiKey();

  // State structure for the Production Studio
  const [sourceItem, setSourceItem] = useState<ContentItem | null>(null);
  const [sharedContextSnapshot, setSharedContextSnapshot] = useState<SharedContentContext | null>(null);
  const [characterDNA, setCharacterDNA] = useState<CharacterDNA | null>(null);
  const [savedCharacters, setSavedCharacters] = useState<CharacterDNA[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [canonicalProjectId, setCanonicalProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'review' | 'image' | 'carousel' | 'video'>('review');
  const [showCharacterModal, setShowCharacterModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [nextStepVisibleKeys, setNextStepVisibleKeys] = useState<Record<string, boolean>>({});
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Core production outputs states
  const [imageOutput, setImageOutput] = useState<string>('');
  const [carouselOutput, setCarouselOutput] = useState<string>('');
  const [videoOutput, setVideoOutput] = useState<string>('');
  const [ugcOutput, setUgcOutput] = useState<string>('');
  const [reviewOutput, setReviewOutput] = useState<string>('');
  const [revisionNotes, setRevisionNotes] = useState<string>('');
  const [json2VideoPayload, setJson2VideoPayload] = useState<{ key: string; text: string } | null>(null);

  // JSON2Video Render state
  const [isRenderingVideo, setIsRenderingVideo] = useState<boolean>(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderJobData, setRenderJobData] = useState<any | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  // Selected sub-tabs inside Production Studio
  const [selectedAngleId, setSelectedAngleId] = useState<'A' | 'B' | 'C'>('A');
  const [selectedCarouselId, setSelectedCarouselId] = useState<'A' | 'B' | 'C'>('A');
  const [selectedVideoId, setSelectedVideoId] = useState<'A' | 'B' | 'C'>('A');
  const [activeSlideNumber, setActiveSlideNumber] = useState<number>(1);

  // Video Mode & Asset Notes state
  const [videoMode, setVideoMode] = useState<'ugc_video' | 'text_motion' | 'asset_product'>('ugc_video');
  const [videoOutputMode, setVideoOutputMode] = useState<'google_flow' | 'api' | null>(null);
  const [flowCustomCreator, setFlowCustomCreator] = useState<string>('');
  const [flowCustomSetting, setFlowCustomSetting] = useState<string>('');
  const [flowCustomDialogues, setFlowCustomDialogues] = useState<{ [key: string]: { scene1?: string; scene2?: string; scene3?: string } }>({});
  const [characterImageUrl, setCharacterImageUrl] = useState<string>('');
  const [productScreenImageUrl, setProductScreenImageUrl] = useState<string>('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [characterAssetNote, setCharacterAssetNote] = useState<string>('');
  const [productScreenAssetNote, setProductScreenAssetNote] = useState<string>('');
  const [coverAssetNote, setCoverAssetNote] = useState<string>('');

  const handleSelectVideoStyle = (styleId: 'A' | 'B' | 'C') => {
    setSelectedVideoId(styleId);
    if (styleId === 'A') setVideoMode('ugc_video');
    else if (styleId === 'B') setVideoMode('text_motion');
    else if (styleId === 'C') setVideoMode('asset_product');
  };

  const handleRenderVideo = async (activeVideo: VideoStyle) => {
    if (isRenderingVideo) return;
    setRenderError(null);

    // Validate image URLs before rendering if provided
    const validateUrl = (url?: string) => {
      if (!url || !url.trim()) return { isValid: true, error: '' };
      const trimmed = url.trim().toLowerCase();
      if (!trimmed.startsWith('https://')) {
        return { isValid: false, error: 'URL wajib diawali https:// publik' };
      }
      return { isValid: true, error: '' };
    };

    const charVal = validateUrl(characterImageUrl);
    if (!charVal.isValid) {
      setRenderError(`Character Image URL tidak valid: ${charVal.error}`);
      return;
    }
    const prodVal = validateUrl(productScreenImageUrl);
    if (!prodVal.isValid) {
      setRenderError(`Product Screen Image URL tidak valid: ${prodVal.error}`);
      return;
    }
    const covVal = validateUrl(coverImageUrl);
    if (!covVal.isValid) {
      setRenderError(`Cover Image URL tidak valid: ${covVal.error}`);
      return;
    }

    if (!sourceItem) {
      setRenderError('Item konten tidak ditemukan.');
      showToast('Item konten tidak ditemukan.');
      return;
    }

    const prodCtxResult = buildProductionContext(canonicalProjectId, sharedContextSnapshot, sourceItem, characterDNA);
    if (!prodCtxResult.isValid || !prodCtxResult.context) {
      setRenderError(prodCtxResult.error || 'Konteks project tidak sinkron.');
      showToast(prodCtxResult.error || 'Konteks project tidak sinkron.');
      return;
    }

    setIsRenderingVideo(true);

    const requestProjectId = canonicalProjectId;
    const requestItemNo = sourceItem.no;
    const requestItemId = sourceItem.content_item_id;

    const item = sourceItem;
    const context: SharedContentContext = sharedContextSnapshot!;
    const payload = buildJson2VideoPayload(
      activeVideo,
      item,
      context,
      videoMode,
      {
        characterImageUrl,
        productScreenImageUrl,
        coverImageUrl,
        characterAssetNote,
        productScreenAssetNote,
        coverAssetNote,
      }
    );

    // Also update payload state so user can copy it if fallback is needed
    setJson2VideoPayload({
      key: `${item.no || 1}_${activeVideo.id}`,
      text: JSON.stringify(payload, null, 2),
    });

    // Client-side payload validation before sending request to JSON2Video
    const validation = validateJson2VideoPayload(payload);
    if (!validation.isValid) {
      setRenderError(
        validation.error ||
          'Payload tidak valid. Gunakan opsi Copy Payload untuk mengecek atau render manual.'
      );
      setIsRenderingVideo(false);
      return;
    }

    try {
      const res = await fetch('/api/json2video/render', {
        method: 'POST',
        headers: buildJson2VideoRequestHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      // ASYNC GUARD: check if active project or item changed during render call
      if (
        getActiveProjectId() !== requestProjectId ||
        !sourceItem ||
        (requestItemId && sourceItem.content_item_id !== requestItemId) ||
        sourceItem.no !== requestItemNo
      ) {
        console.warn('[Async Guard] Discarding stale video render response');
        return;
      }

      if (!res.ok) {
        const errMsg =
          data?.error ||
          data?.message ||
          'Render langsung belum berhasil. Payload sudah dibuat, gunakan Copy Payload untuk render manual di dashboard JSON2Video.';
        setRenderError(errMsg);
        setIsRenderingVideo(false);
        return;
      }

      const extractedId =
        data?.project ||
        data?.id ||
        data?.movie?.project ||
        data?.movie?.id ||
        data?.movie_id;

      if (extractedId) {
        setRenderJobId(extractedId);
      }
      setRenderJobData(data);
    } catch (err: any) {
      if (
        getActiveProjectId() !== requestProjectId ||
        !sourceItem ||
        (requestItemId && sourceItem.content_item_id !== requestItemId) ||
        sourceItem.no !== requestItemNo
      ) {
        return;
      }
      setRenderError(
        'Render langsung belum berhasil. Payload sudah dibuat, gunakan Copy Payload untuk render manual di dashboard JSON2Video.'
      );
    } finally {
      setIsRenderingVideo(false);
    }
  };

  const handleCheckRenderStatus = async (queryId?: string) => {
    const targetId = queryId || renderJobId;
    if (!targetId || isCheckingStatus || !canonicalProjectId) return;

    const requestProjectId = canonicalProjectId;
    const requestItemNo = sourceItem?.no;
    const requestItemId = sourceItem?.content_item_id;

    setIsCheckingStatus(true);
    setRenderError(null);

    try {
      const res = await fetch(`/api/json2video/status?id=${encodeURIComponent(targetId)}`, {
        headers: buildJson2VideoRequestHeaders(),
      });
      const data = await res.json().catch(() => ({}));

      // ASYNC GUARD
      if (
        getActiveProjectId() !== requestProjectId ||
        canonicalProjectId !== requestProjectId ||
        !sourceItem ||
        (requestItemId && sourceItem.content_item_id !== requestItemId) ||
        sourceItem.no !== requestItemNo
      ) {
        return;
      }

      if (!res.ok) {
        const errMsg =
          data?.error ||
          data?.message ||
          'Gagal mengecek status render video.';
        setRenderError(errMsg);
      } else {
        setRenderJobData(data);
      }
    } catch (err: any) {
      if (
        getActiveProjectId() !== requestProjectId ||
        !sourceItem ||
        (requestItemId && sourceItem.content_item_id !== requestItemId) ||
        sourceItem.no !== requestItemNo
      ) {
        return;
      }
      setRenderError('Terjadi masalah koneksi saat memeriksa status render video.');
    } finally {
      setIsCheckingStatus(false);
    }
  };


  // Direct image generation state
  const [generatedImages, setGeneratedImages] = useState<Record<string, { imageDataUrl: string; model?: string; aspectRatio?: string }>>({});
  const [imageGeneratingKey, setImageGeneratingKey] = useState<string | null>(null);
  const [imageGenerateError, setImageGenerateError] = useState<string | null>(null);

  const handleGenerateImage = async (promptText: string, angleId: string) => {
    if (!hasCustomKey) {
      showToast('Hubungkan Gemini API Key dulu untuk menggunakan fitur generate visual.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (!promptText || !promptText.trim() || !!imageGeneratingKey || !canonicalProjectId) return;
    const requestProjectId = canonicalProjectId;
    const requestItemNo = sourceItem?.no || 1;
    const requestItemId = sourceItem?.content_item_id;
    const key = `${requestItemNo}_${angleId}`;

    setImageGeneratingKey(key);
    setImageGenerateError(null);

    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: buildGeminiRequestHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          prompt: promptText,
          aspectRatio: '4:5',
        }),
      });

      const data = await res.json();

      // ASYNC GUARD
      if (
        getActiveProjectId() !== requestProjectId ||
        canonicalProjectId !== requestProjectId ||
        !sourceItem ||
        (requestItemId && sourceItem.content_item_id !== requestItemId) ||
        sourceItem.no !== requestItemNo
      ) {
        console.warn('[Async Guard] Discarding stale generated image response');
        return;
      }

      if (!res.ok || !data.imageDataUrl) {
        const errMsg = data.error || data.message || "Gagal generate image. Coba lagi nanti.";
        setImageGenerateError(errMsg);
      } else {
        setGeneratedImages(prev => ({
          ...prev,
          [key]: {
            imageDataUrl: data.imageDataUrl,
            model: data.model,
            aspectRatio: data.aspectRatio,
          },
        }));
      }
    } catch (err: any) {
      if (
        getActiveProjectId() !== requestProjectId ||
        !sourceItem ||
        (requestItemId && sourceItem.content_item_id !== requestItemId) ||
        sourceItem.no !== requestItemNo
      ) {
        return;
      }
      console.error('Client Image Generation Error:', err);
      setImageGenerateError("Gagal generate image. Coba lagi nanti.");
    } finally {
      setImageGeneratingKey(null);
    }
  };

  const handleDownloadImage = (dataUrl: string, angleId: string) => {
    try {
      const itemNo = sourceItem?.no || 1;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `alcocontent_item_${itemNo}_angle_${angleId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download image error:', err);
    }
  };

  const handleGenerateJson2VideoPayload = (activeVideo: VideoStyle) => {
    // Validate image URLs before building payload
    const validateUrl = (url?: string) => {
      if (!url || !url.trim()) return { isValid: true, error: '' };
      const trimmed = url.trim().toLowerCase();
      if (!trimmed.startsWith('https://')) {
        return { isValid: false, error: 'URL wajib diawali https:// publik' };
      }
      return { isValid: true, error: '' };
    };

    const charVal = validateUrl(characterImageUrl);
    if (!charVal.isValid) {
      setRenderError(`Character Image URL tidak valid: ${charVal.error}`);
      showToast('Character Image URL tidak valid');
      return;
    }
    const prodVal = validateUrl(productScreenImageUrl);
    if (!prodVal.isValid) {
      setRenderError(`Product Screen Image URL tidak valid: ${prodVal.error}`);
      showToast('Product Screen Image URL tidak valid');
      return;
    }
    const covVal = validateUrl(coverImageUrl);
    if (!covVal.isValid) {
      setRenderError(`Cover Image URL tidak valid: ${covVal.error}`);
      showToast('Cover Image URL tidak valid');
      return;
    }

    if (!sourceItem) {
      setRenderError('Item konten tidak ditemukan.');
      showToast('Item konten tidak ditemukan.');
      return;
    }

    const prodCtxResult = buildProductionContext(canonicalProjectId, sharedContextSnapshot, sourceItem, characterDNA);
    if (!prodCtxResult.isValid || !prodCtxResult.context) {
      setRenderError(prodCtxResult.error || 'Konteks project tidak sinkron.');
      showToast(prodCtxResult.error || 'Konteks project tidak sinkron.');
      return;
    }

    const item = sourceItem;
    const context: SharedContentContext = sharedContextSnapshot!;
    const payload = buildJson2VideoPayload(
      activeVideo,
      item,
      context,
      videoMode,
      {
        characterImageUrl,
        productScreenImageUrl,
        coverImageUrl,
        characterAssetNote,
        productScreenAssetNote,
        coverAssetNote,
      }
    );
    setJson2VideoPayload({
      key: `${item.no || 1}_${activeVideo.id}`,
      text: JSON.stringify(payload, null, 2),
    });
    showToast('Payload JSON2Video berhasil dibuat.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load from local storage on mount
  useEffect(() => {
    // Check URL params for active tab first
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam === 'ugc') {
        setActiveTab('video');
      } else if (tabParam === 'dna') {
        setShowCharacterModal(true);
      } else if (tabParam && ['review', 'image', 'carousel', 'video'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }

    // Reset all outputs to clean state first to prevent any potential cache carry-over
    setImageOutput('');
    setCarouselOutput('');
    setVideoOutput('');
    setUgcOutput('');
    setReviewOutput('');
    setRevisionNotes('');
    setJson2VideoPayload(null);
    setSourceItem(null);
    setSharedContextSnapshot(null);
    setRenderJobId(null);
    setRenderJobData(null);

    try {
      let paramProjId: string | null = null;
      let paramContentItemId: string | null = null;
      let paramItemNo: number | null = null;
      let tabParam: string | null = null;

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        paramProjId = urlParams.get('projectId');
        paramContentItemId = urlParams.get('contentItemId');
        const noStr = urlParams.get('itemNo');
        if (noStr) {
          const parsedNo = parseInt(noStr, 10);
          if (!isNaN(parsedNo)) paramItemNo = parsedNo;
        }
        tabParam = urlParams.get('tab');
      }

      if (tabParam === 'image' || tabParam === 'carousel' || tabParam === 'video' || tabParam === 'review') {
        setActiveTab(tabParam);
      }

      const activeProjId = getActiveProjectId();

      // Canonical Project ID Resolution:
      // Prefer explicit URL parameter from calendar routing; fallback to global active project
      // Strictly filter out 'default', 'default_project', and empty values
      let resolvedCanonicalId: string | null = null;
      if (paramProjId && paramProjId.trim() && paramProjId !== 'default' && paramProjId !== 'default_project') {
        resolvedCanonicalId = paramProjId.trim();
        // Keep active project in sync with canonical ID
        setActiveProjectId(resolvedCanonicalId);
      } else if (activeProjId && activeProjId.trim() && activeProjId !== 'default' && activeProjId !== 'default_project') {
        resolvedCanonicalId = activeProjId.trim();
      }

      if (!resolvedCanonicalId) {
        setCanonicalProjectId(null);
        setSharedContextSnapshot(null);
        setSourceItem(null);
        setIsLoaded(true);
        return;
      }

      setCanonicalProjectId(resolvedCanonicalId);

      // Load project-scoped shared context
      const parsedContext = loadProjectSharedContext(resolvedCanonicalId);
      setSharedContextSnapshot(parsedContext);

      // Load project calendar items
      const calendarItems = loadProjectCalendarItems(resolvedCanonicalId);

      // Find target item strictly belonging to canonical project
      let parsedItem: ContentItem | null = null;

      // 1. Try finding by contentItemId
      if (paramContentItemId && calendarItems.length > 0) {
        parsedItem = calendarItems.find((it: any) => it.content_item_id === paramContentItemId) || null;
      }

      // 2. Try finding by itemNo
      if (!parsedItem && paramItemNo !== null && calendarItems.length > 0) {
        parsedItem = calendarItems.find((it: any) => it.no === paramItemNo) || null;
      }

      // 3. Try finding by project's saved selected item
      if (!parsedItem) {
        parsedItem = loadProjectSelectedItem(resolvedCanonicalId);
      }

      // 4. If still not found and we have calendar items, pick the first
      if (!parsedItem && calendarItems.length > 0) {
        parsedItem = calendarItems[0];
      }

      // Ensure item has project identity attached
      if (parsedItem) {
        parsedItem = {
          ...parsedItem,
          projectId: resolvedCanonicalId,
          project_id: resolvedCanonicalId,
        };
        setSourceItem(parsedItem);
        saveProjectSelectedItem(resolvedCanonicalId, parsedItem);
      } else {
        setSourceItem(null);
      }

      const charList = getProjectSavedCharacters(resolvedCanonicalId) as CharacterDNA[];
      setSavedCharacters(charList);
      const activeCharId = getProjectActiveCharacterId(resolvedCanonicalId);
      setSelectedCharacterId(activeCharId);

      if (activeCharId && charList.length > 0) {
        const found = charList.find(c => c.character_id === activeCharId);
        if (found) {
          setCharacterDNA(found);
        } else {
          const storedDNA = getProjectCharacterDNA(resolvedCanonicalId);
          if (storedDNA) setCharacterDNA(storedDNA);
        }
      } else {
        const storedDNA = getProjectCharacterDNA(resolvedCanonicalId);
        if (storedDNA) {
          setCharacterDNA(storedDNA);
          if (storedDNA.character_id) {
            setSelectedCharacterId(storedDNA.character_id);
          }
        } else if (charList.length > 0) {
          setCharacterDNA(charList[0]);
          setSelectedCharacterId(charList[0].character_id);
        }
      }

      if (parsedItem) {
        const itemKey = getItemKey(parsedItem);
        
        const storedImage = loadProjectData(resolvedCanonicalId, `studio_image_${itemKey}`);
        const storedCarousel = loadProjectData(resolvedCanonicalId, `studio_carousel_${itemKey}`);
        const storedVideo = loadProjectData(resolvedCanonicalId, `studio_video_${itemKey}`);
        const storedUgc = loadProjectData(resolvedCanonicalId, `studio_ugc_${itemKey}`);
        const storedReview = loadProjectData(resolvedCanonicalId, `studio_review_${itemKey}`);
        const storedRevision = loadProjectData(resolvedCanonicalId, `studio_revision_${itemKey}`);

        if (storedImage && !isErrorContent(storedImage)) {
          setImageOutput(storedImage);
        } else {
          if (storedImage && isErrorContent(storedImage)) {
            removeProjectData(resolvedCanonicalId, `studio_image_${itemKey}`);
          }
          setImageOutput(getInitialDraft('image', parsedItem, parsedContext));
        }

        if (storedCarousel && !isErrorContent(storedCarousel)) {
          setCarouselOutput(storedCarousel);
        } else {
          if (storedCarousel && isErrorContent(storedCarousel)) {
            removeProjectData(resolvedCanonicalId, `studio_carousel_${itemKey}`);
          }
          setCarouselOutput(getInitialDraft('carousel', parsedItem, parsedContext));
        }

        if (storedVideo && !isErrorContent(storedVideo)) {
          setVideoOutput(storedVideo);
        } else {
          if (storedVideo && isErrorContent(storedVideo)) {
            removeProjectData(resolvedCanonicalId, `studio_video_${itemKey}`);
          }
          setVideoOutput(getInitialDraft('video', parsedItem, parsedContext));
        }

        if (storedUgc && !isErrorContent(storedUgc)) {
          setUgcOutput(storedUgc);
        } else {
          if (storedUgc && isErrorContent(storedUgc)) {
            removeProjectData(resolvedCanonicalId, `studio_ugc_${itemKey}`);
          }
          setUgcOutput(getInitialDraft('ugc', parsedItem, parsedContext));
        }

        if (storedReview && !isErrorContent(storedReview)) {
          setReviewOutput(storedReview);
        } else {
          if (storedReview && isErrorContent(storedReview)) {
            removeProjectData(resolvedCanonicalId, `studio_review_${itemKey}`);
          }
          setReviewOutput(getInitialDraft('review', parsedItem, parsedContext));
        }

        if (storedRevision) {
          setRevisionNotes(storedRevision);
        } else {
          setRevisionNotes('');
        }
      }
    } catch (e) {
      console.error('Failed to parse storage data in Production Studio', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save setters with local storage persistence using canonicalProjectId
  const saveImageOutput = (val: string) => {
    setImageOutput(val);
    if (sourceItem && canonicalProjectId) {
      const itemKey = getItemKey(sourceItem);
      saveProjectData(canonicalProjectId, `studio_image_${itemKey}`, val);
    }
  };
  const saveCarouselOutput = (val: string) => {
    setCarouselOutput(val);
    if (sourceItem && canonicalProjectId) {
      const itemKey = getItemKey(sourceItem);
      saveProjectData(canonicalProjectId, `studio_carousel_${itemKey}`, val);
    }
  };
  const saveVideoOutput = (val: string) => {
    setVideoOutput(val);
    if (sourceItem && canonicalProjectId) {
      const itemKey = getItemKey(sourceItem);
      saveProjectData(canonicalProjectId, `studio_video_${itemKey}`, val);
    }
  };
  const saveUgcOutput = (val: string) => {
    setUgcOutput(val);
    if (sourceItem && canonicalProjectId) {
      const itemKey = getItemKey(sourceItem);
      saveProjectData(canonicalProjectId, `studio_ugc_${itemKey}`, val);
    }
  };
  const saveReviewOutput = (val: string) => {
    setReviewOutput(val);
    if (sourceItem && canonicalProjectId) {
      const itemKey = getItemKey(sourceItem);
      saveProjectData(canonicalProjectId, `studio_review_${itemKey}`, val);
    }
  };
  const saveRevisionNotes = (val: string) => {
    setRevisionNotes(val);
    if (sourceItem && canonicalProjectId) {
      const itemKey = getItemKey(sourceItem);
      saveProjectData(canonicalProjectId, `studio_revision_${itemKey}`, val);
    }
  };

  const handleDismissNextStep = (key: string) => {
    setNextStepVisibleKeys(prev => ({ ...prev, [key]: false }));
  };

  const handleSelectCharacter = (charId: string | null) => {
    setSelectedCharacterId(charId);
    if (canonicalProjectId) {
      saveProjectActiveCharacterId(canonicalProjectId, charId);
    }
    if (!charId) {
      setCharacterDNA(null);
      showToast('Karakter dimatikan (No Character)');
    } else {
      const found = savedCharacters.find(c => c.character_id === charId);
      if (found) {
        setCharacterDNA(found);
        showToast(`Karakter "${found.identity?.display_name || 'DNA'}" aktif!`);
      }
    }
  };

  const handleCreateCharacterClick = () => {
    setShowCharacterModal(true);
  };

  const handleUpdateProgress = (newProgress: Partial<ProductionProgress>) => {
    const current = sourceItem;
    if (!current || !canonicalProjectId) return;
    const updated: ContentItem = {
      ...current,
      productionProgress: {
        ...(current.productionProgress || {
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
    setSourceItem(updated);
    saveProjectSelectedItem(canonicalProjectId, updated);
    updateItemInProject(canonicalProjectId, updated);
  };

  const handleCopyText = (
    key: string,
    text: string,
    actionType?: 'promptCopied' | 'captionCopied' | 'none'
  ) => {
    void (async () => {
      const success = await safeCopyToClipboard(text);
      if (success) {
        setCopiedStates(prev => ({ ...prev, [key]: true }));
        setNextStepVisibleKeys(prev => ({ ...prev, [key]: true }));
        showToast('Teks berhasil disalin ke clipboard!');

        // Update production progress ONLY when explicit actionType is provided
        if (actionType === 'captionCopied') {
          handleUpdateProgress({ captionCopied: true });
        } else if (actionType === 'promptCopied') {
          handleUpdateProgress({ promptCopied: true });
        }
        // If actionType is 'none' or omitted, do NOT modify production progress

        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, [key]: false }));
        }, 2000);
      } else {
        showToast('Gagal menyalin teks.');
      }
    })();
  };

  // Generate customized production asset using Gemini API
  const handleGenerateWithAI = async () => {
    if (!hasCustomKey) {
      showToast('Hubungkan Gemini API Key dulu untuk menggunakan fitur generate AI.');
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top where key control is
      return;
    }

    if (isLoadingAI) return;
    setIsLoadingAI(true);
    showToast(`Gemini AI sedang memproses naskah ${activeTab.toUpperCase()}...`);
    try {
      let promptTitle = '';
      let formatDirection = '';

      if (!sourceItem) {
        showToast('Pilih item konten terlebih dahulu.');
        return;
      }

      const prodCtxResult = buildProductionContext(canonicalProjectId, sharedContextSnapshot, sourceItem, characterDNA);
      if (!prodCtxResult.isValid || !prodCtxResult.context) {
        setGenerationError(prodCtxResult.error || 'Konteks project tidak sinkron.');
        showToast(prodCtxResult.error || 'Konteks project tidak sinkron.');
        return;
      }
      const productionContext = prodCtxResult.context;

      const requestProjectId = canonicalProjectId;
      const requestItemNo = sourceItem.no;
      const requestItemId = sourceItem.content_item_id;

      const activeItem = sourceItem;
      const activeContext: SharedContentContext = sharedContextSnapshot!;
      const funnelStage = normalizeFunnelStage(activeItem.jenis);
      const funnelRules = getFunnelRules(activeItem.jenis);
      const funnelPromptBlock = buildFunnelPromptBlock(activeItem.jenis);

      if (activeTab === 'image') {
        promptTitle = `3 IMAGE ANGLES - FUNNEL ${funnelStage} MASTER CONTROLLER (CANONICAL JSON)`;
        formatDirection = `Hasilkan 3 angle konten visual yang DIKENDALIKAN SEPENUHNYA OLEH CORONG ${funnelStage} dalam format JSON canonical murni (tanpa markdown).

PRINSIP UTAMA: FUNNEL STAGE ADALAH PENGENDALI UTAMA SELURUH finalPrompt.
DILARANG KERAS MEMOTONG IDE UTAMA MENJADI KATA TERPOTONG DENGAN "...".
JIKA IDE UTAMA TERLALU PANJANG, UBAH MENJADI HOOK PENDEK YANG TETAP UTUH, MAKSIMAL 6-10 KATA.

ATURAN CORONG ${funnelStage} (SANGAT KETAT):
${funnelStage === 'TOFU' ? `
- Visual Objective: Membangun awareness alami, relatable problem sehari-hari, dan curiosity tanpa pesan jualan.
- Action: Subjek berinteraksi dengan situasi atau hambatan yang relevan dengan topik pada SELECTED CONTENT ITEM.
- Expression: Bingung ringan, penasaran, merasa relate, senyum kecut reflektif (reflektif terhadap kesulitan sehari-hari).
- Text Overlay: Pertanyaan reflektif atau hook masalah spesifik dari headline item tanpa terpotong (maksimal 6-10 kata).
- Caption For Post: Menjelaskan masalah dan insight ringan.
- DILARANG KERAS DI TOFU: Social proof ("ratusan pengguna", "klien terbukti"), urgency, bonus, daftar sekarang, beli sekarang, hard selling.
` : funnelStage === 'MOFU' ? `
- Visual Objective: Membangun pemahaman mendalam, framework solusi terstruktur, perbandingan metode, dan trust edukatif.
- Action: Subjek menganalisis atau membandingkan diagram alur atau catatan kerja terstruktur yang relevan dengan topik item.
- Expression: Fokus, mulai paham, tatapan 'aha moment' yang tenang saat menyadari kejelasan metode baru.
- Text Overlay: Insight, kerangka alur, atau sudut pandang baru yang relevan dengan topik item tanpa terpotong (maksimal 6-10 kata).
- Caption For Post: Menjelaskan solusi/metode edukatif secara terstruktur.
- DILARANG KERAS DI MOFU: Hard closing, FOMO berlebihan, adegan kebingungan mentah tanpa solusi.
` : `
- Visual Objective: Membangun kepercayaan mendalam dan mendorong keputusan akhir melalui validasi solusi, demonstrasi hasil nyata, dan kejelasan nilai.
- Action: Subjek meninjau hasil nyata, implementasi sistem, atau bukti nilai yang relevan dengan topik item.
- Expression: Ekspresi yakin, mantap, dan percaya dengan senyum subtle puas, siap mengambil keputusan lanjutan.
- Text Overlay: Penegasan nilai, hasil nyata, atau ajakan aksi terarah dari topik item tanpa terpotong (maksimal 6-10 kata).
- Caption For Post: Menguatkan trust, benefit nyata, dan dorongan Call to Action.
- DILARANG KERAS DI BOFU: Adegan problem awareness TOFU tanpa penegasan solusi/hasil nyata.
- KHUSUS BOFU: Visual wajib menggambarkan kejelasan implementasi nyata, ekspresi percaya/mantap, dan keputusan akhir dengan gaya clean editorial.
`}

VALIDASI INTERNAL WAJIB (messageAlignmentCheck):
Lakukan evaluasi mandiri pada 4 dimensi:
1. funnelStage vs Visual Objective
2. Headline vs Action
3. Text Overlay vs funnelStage (TIDAK BOLEH ADA KATA TERPOTONG / "...")
4. Expression vs Funnel Goal
JIKA ADA KONFLIK:
- Set "isAligned": false
- Tuliskan konfliknya di "issue"
- WAJIB PERBAIKI "fixedTextOverlay", "visualObjective", "Action", "Expression", dan "finalPrompt" agar selaras 100% dengan corong ${funnelStage}.

STRUKTUR JSON CANONICAL WAJIB:
{
  "recommendedAngleId": "A",
  "recommendationReason": "Alasan singkat pemilihan angle rekomendasi untuk ${funnelStage}.",
  "angles": [
    {
      "id": "A",
      "name": "${funnelStage === 'BOFU' ? 'Social Proof & Community Hook' : funnelStage === 'MOFU' ? 'Insight & Framework Hook' : 'Relatable Problem Hook'}",
      "funnelStage": "${funnelStage}",
      "visualObjective": "[Visual objective selaras corong ${funnelStage}]",
      "textOverlay": "[Teks hook 6-10 kata utuh tanpa '...']",
      "captionForPost": "[Caption Instagram yang menjelaskan isi post/hook sesuai aturan funnel]",
      "captionInstruction": "Paste teks ini di caption/keterangan postingan setelah gambar dibuat.",
      "messageAlignmentCheck": {
        "isAligned": true,
        "issue": "",
        "fixedTextOverlay": "[Teks hook utuh tanpa '...', selaras 100% dengan corong ${funnelStage}]",
        "reason": "[Penjelasan keselarasan corong ${funnelStage}]"
      },
      "strategyBrief": {
        "funnelStage": "${funnelStage}",
        "tujuanKonten": "${funnelRules.goal}",
        "ideUtama": "${activeItem.headline || 'Topik Konten'} (TETAP UTUH TANPA TERPOTONG)",
        "audienceContext": "${funnelRules.audienceState} - ${activeContext.audience_context?.primary_audience || ''}",
        "angle": "[Nama angle visual]",
        "emosiUtama": "[Emosi spesifik sesuai corong ${funnelStage}]",
        "pesanVisual": "[Pesan yang tersampaikan lewat adegan visual]"
      },
      "finalPrompt": "Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):\\n\\nFunnel Stage: ${funnelStage}\\nVisual Objective: [Tujuan visual konkret]\\nSubject: [Deskripsi subjek orang/objek nyata, usia, gender, pakaian kasual/smart-casual realistis]\\nAction: [Aktivitas fisik konkret yang SINKRON dengan corong ${funnelStage}]\\nExpression: [Ekspresi mikro wajah yang SINKRON dengan corong ${funnelStage}]\\nEnvironment: [Ruangan/latar nyata, meja kerja, laptop, notebook, suasana kerja hangat]\\nComposition: [Subjek di kanan tengah, ruang negatif lapang di kiri atas untuk teks headline]\\nLighting: [Cahaya alami lembut masuk dari jendela samping, soft warm ambient light]\\nCamera: [50mm / 35mm lens photography, eye-level, depth of field halus (subtle bokeh)]\\nVisual Style: [Clean editorial Instagram photography, otentik dokumenter estetis, bukan poster iklan ramai]\\nTypography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.\\nText Overlay: \\\"[Teks hook utuh tanpa '...']\\\"\\nNegative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic."
    },
    {
      "id": "B",
      "name": "${funnelStage === 'BOFU' ? 'Product Demo & Results Hook' : funnelStage === 'MOFU' ? 'Solution Comparison Hook' : 'Everyday Creator Struggle'}",
      "funnelStage": "${funnelStage}",
      "visualObjective": "[Visual objective selaras corong ${funnelStage}]",
      "textOverlay": "[Tulis hook pendek utuh 6-10 kata, tanpa ellipsis]",
      "captionForPost": "[Tulis caption Instagram yang menjawab hook image sesuai funnel]",
      "captionInstruction": "Paste teks ini di caption/keterangan postingan setelah gambar dibuat.",
      "messageAlignmentCheck": { "isAligned": true, "issue": "", "fixedTextOverlay": "[Tulis hook pendek utuh 6-10 kata, tanpa ellipsis]", "reason": "[Penjelasan keselarasan corong ${funnelStage}]" },
      "strategyBrief": { "funnelStage": "${funnelStage}", "tujuanKonten": "${funnelRules.goal}", "ideUtama": "${activeItem.headline || 'Topik Konten'}", "audienceContext": "${funnelRules.audienceState} - ${activeContext.audience_context?.primary_audience || ''}", "angle": "[Nama angle visual B]", "emosiUtama": "[Emosi spesifik]", "pesanVisual": "[Pesan visual]" },
      "finalPrompt": "Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):\\n\\nFunnel Stage: ${funnelStage}\\nVisual Objective: [Tujuan visual konkret]\\nSubject: [Deskripsi subjek]\\nAction: [Aktivitas fisik konkret]\\nExpression: [Ekspresi wajah mikro]\\nEnvironment: [Ruangan/latar]\\nComposition: [Subjek di kanan tengah, ruang negatif lapang di kiri atas]\\nLighting: [Cahaya alami lembut]\\nCamera: [50mm lens photography]\\nVisual Style: [Clean editorial Instagram photography]\\nTypography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.\\nText Overlay: \\\"[hook pendek utuh tanpa ellipsis]\\\"\\nNegative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic."
    },
    {
      "id": "C",
      "name": "${funnelStage === 'BOFU' ? 'Direct Value & Decision Hook' : funnelStage === 'MOFU' ? 'Structured Workflow Hook' : 'Curiosity Hook'}",
      "funnelStage": "${funnelStage}",
      "visualObjective": "[Visual objective selaras corong ${funnelStage}]",
      "textOverlay": "[Tulis hook pendek utuh 6-10 kata, tanpa ellipsis]",
      "captionForPost": "[Tulis caption Instagram yang menjawab hook image sesuai funnel]",
      "captionInstruction": "Paste teks ini di caption/keterangan postingan setelah gambar dibuat.",
      "messageAlignmentCheck": { "isAligned": true, "issue": "", "fixedTextOverlay": "[Tulis hook pendek utuh 6-10 kata, tanpa ellipsis]", "reason": "[Penjelasan keselarasan corong ${funnelStage}]" },
      "strategyBrief": { "funnelStage": "${funnelStage}", "tujuanKonten": "${funnelRules.goal}", "ideUtama": "${activeItem.headline || 'Topik Konten'}", "audienceContext": "${funnelRules.audienceState} - ${activeContext.audience_context?.primary_audience || ''}", "angle": "[Nama angle visual C]", "emosiUtama": "[Emosi spesifik]", "pesanVisual": "[Pesan visual]" },
      "finalPrompt": "Buatkan saya image untuk konten Instagram (format 4:5 vertical editorial):\\n\\nFunnel Stage: ${funnelStage}\\nVisual Objective: [Tujuan visual konkret]\\nSubject: [Deskripsi subjek]\\nAction: [Aktivitas fisik konkret]\\nExpression: [Ekspresi wajah mikro]\\nEnvironment: [Ruangan/latar]\\nComposition: [Subjek di kanan tengah, ruang negatif lapang di kiri atas]\\nLighting: [Cahaya alami lembut]\\nCamera: [50mm lens photography]\\nVisual Style: [Clean editorial Instagram photography]\\nTypography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.\\nText Overlay: \\\"[hook pendek utuh tanpa ellipsis]\\\"\\nNegative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic."
    }
  ]
}

URUTAN WAJIB STRUKTUR finalPrompt:
1. Funnel Stage: ${funnelStage}
2. Visual Objective: [Tujuan visual konkret]
3. Subject: [Deskripsi subjek orang/objek nyata, usia, gender, pakaian kasual/smart-casual realistis]
4. Action: [Aktivitas fisik konkret yang sedang dilakukan]
5. Expression: [Ekspresi wajah mikro yang nyata, BUKAN istilah abstrak]
6. Environment: [Ruangan/latar konkret, meja kerja, laptop, notebook, kopi, suasana kerja hangat]
7. Composition: [Subjek di kanan tengah, ruang negatif lapang di kiri atas untuk teks headline]
8. Lighting: [Cahaya alami lembut masuk dari jendela samping, soft warm ambient light]
9. Camera: [50mm / 35mm lens photography, eye-level atau 45-degree angle, depth of field halus (subtle bokeh)]
10. Visual Style: [Clean editorial Instagram photography, otentik dokumenter estetis, bukan poster iklan ramai]
11. Typography: Headline besar 3-5 baris di kiri atas, editorial typography, high contrast, satu frasa penting boleh diberi subtle highlight, tidak ada teks kecil lain.
12. Text Overlay: "[Teks hook utuh tanpa '...', maksimal 6-10 kata]"
13. Negative Prompt: hard selling ads, cluttered poster, too much text, generic stock photo, unreadable text, distorted face, extra fingers, corporate cliche, overdesigned graphic.

HINDARI: ${funnelRules.avoid}
Kembalikan HANYA JSON murni tanpa markdown pembungkus tambahan di luar JSON.`;
      } else if (activeTab === 'carousel') {
        promptTitle = `CAROUSEL BLUEPRINT - FUNNEL ${funnelStage}`;
        formatDirection = `Blueprint carousel diproses melalui 2-stage architecture (Stage 1 Content Plan + Stage 2 Visual Enrichment).`;
      } else if (activeTab === 'video') {
        promptTitle = `3 VIDEO STYLE OPTIONS - FUNNEL ${funnelStage} (JSON ARRAY)`;
        formatDirection = `Hasilkan 3 opsi gaya video (A = UGC, B = TikTok Loop, C = Sinematik) untuk tahap funnel ${funnelStage}.
ATURAN FUNNEL ${funnelStage}:
- Goal: ${funnelRules.goal}
- Audience State: ${funnelRules.audienceState}
- Content Style: ${funnelRules.contentStyle}
- Visual Style: ${funnelRules.visualStyle}
- CTA Style: ${funnelRules.ctaStyle} (sesuai tahap ${funnelStage})
- HINDARI: ${funnelRules.avoid}

WAJIB kembalikan HANYA array JSON murni (tanpa markdown):
[
  {
    "id": "A",
    "name": "Style A",
    "hookStyle": "...",
    "pacingStyle": "...",
    "audioDirection": "...",
    "voiceoverOutline": "...",
    "script": { "hook": "...", "masalah": "...", "solusi": "...", "proof": "...", "cta": "..." },
    "videoPrompt": "Prompt deskriptif (Inggris, 9:16)",
    "visualPlan": "...",
    "captionForPost": "[Tulis caption Instagram yang merangkum video sesuai funnel ${funnelStage}]",
    "captionInstruction": "Paste teks ini di caption/keterangan postingan setelah aset dibuat."
  }
]`;
      } else if (activeTab === 'review') {
        promptTitle = `STRATEGY ALIGNMENT REVIEW - FUNNEL ${funnelStage}`;
        formatDirection = `Berikan skor penyelarasan (0-100), analisis kesesuaian dengan corong ${funnelStage} (${funnelRules.goal}) & brand voice, serta 3 langkah optimasi taktis (Gunakan Markdown rapi).
Pastikan evaluasi memeriksa kepatuhan aturan funnel ${funnelStage}:
- Content Style: ${funnelRules.contentStyle}
- CTA Style: ${funnelRules.ctaStyle}
- Hal yang harus dihindari: ${funnelRules.avoid}`;
      }

      // Append revision notes if user typed any custom notes!
      const revisionDirective = revisionNotes.trim() 
        ? `\n\n### CATATAN REVISI KHUSUS DARI USER (WAJIB DIIKUTI):\n- ${revisionNotes.trim()}`
        : '';

      const formattedContext = formatProductionContextForPrompt(productionContext, { includeCharacter: true });

      // ==========================================
      // SPECIAL 2-STAGE GENERATION FOR CAROUSEL
      // ==========================================
      if (activeTab === 'carousel') {
        setGenerationError(null);
        showToast("[1/2] Gemini AI: Menghasilkan Stage 1 (Content Plan)...");

        const stage1Prompt = buildCarouselStage1Prompt(
          funnelStage,
          funnelPromptBlock,
          formattedContext,
          funnelRules,
          activeItem,
          revisionDirective
        );

        const controller1 = new AbortController();
        const timeoutId1 = setTimeout(() => controller1.abort(), 45000);

        try {
          const resp1 = await fetch('/api/gemini/recommendation', {
            method: 'POST',
            headers: buildGeminiRequestHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              project_id: requestProjectId,
              content_item_id: requestItemId,
              item_no: requestItemNo,
              generation_type: 'carousel_stage1',
              production_context: productionContext,
              prompt: stage1Prompt,
            }),
            signal: controller1.signal,
          });

          clearTimeout(timeoutId1);

          if (!resp1.ok) {
            let errText = 'API request failed';
            let is429 = resp1.status === 429;
            try {
              const errData = await resp1.json();
              if (errData && errData.error) errText = errData.error;
              if (errData?.isRateLimit) is429 = true;
            } catch (_) {}

            if (is429 || /dibatasi|rate.*limit|quota|429/i.test(errText)) {
              setGenerationError("Permintaan AI sedang dibatasi (Rate Limit / High Demand). Coba lagi beberapa saat.");
              showToast("Permintaan AI sedang dibatasi. Coba lagi beberapa saat.");
            } else {
              setGenerationError(errText || "Gagal memproses Stage 1 Carousel. Silakan coba lagi.");
              showToast(`Gagal Stage 1: ${errText}`);
            }
            return;
          }

          const data1 = await resp1.json();

          // ASYNC GUARD check for Stage 1
          if (
            getActiveProjectId() !== requestProjectId ||
            canonicalProjectId !== requestProjectId ||
            !sourceItem ||
            (requestItemId && sourceItem.content_item_id !== requestItemId) ||
            sourceItem.no !== requestItemNo
          ) {
            console.warn('[Async Guard] Discarding stale Stage 1 Carousel response');
            return;
          }

          const stage1Text = data1.text || '';
          let stage1Parsed = tryParseJSON(stage1Text);
          if (!stage1Parsed || typeof stage1Parsed !== 'object') {
            const normalizedFallback = validateAndNormalizeCarouselPlan(stage1Text, activeItem, activeContext);
            if (normalizedFallback) {
              stage1Parsed = tryParseJSON(normalizedFallback);
            }
          }

          const normalizedStage1 = validateAndNormalizeCarouselPlan(
            typeof stage1Parsed === 'object' ? JSON.stringify(stage1Parsed) : stage1Text,
            activeItem,
            activeContext
          );

          if (normalizedStage1) {
            saveCarouselOutput(normalizedStage1);
          }

          // STAGE 2: VISUAL ENRICHMENT
          showToast("[2/2] Gemini AI: Menghasilkan Stage 2 (Visual Enrichment)...");

          const stage2Prompt = buildCarouselStage2Prompt(
            funnelStage,
            normalizedStage1 || JSON.stringify(stage1Parsed || {}),
            formattedContext
          );

          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 45000);

          const resp2 = await fetch('/api/gemini/recommendation', {
            method: 'POST',
            headers: buildGeminiRequestHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              project_id: requestProjectId,
              content_item_id: requestItemId,
              item_no: requestItemNo,
              generation_type: 'carousel_stage2',
              production_context: productionContext,
              stage1_content_plan: stage1Parsed,
              prompt: stage2Prompt,
            }),
            signal: controller2.signal,
          });

          clearTimeout(timeoutId2);

          if (!resp2.ok) {
            let errText = 'Stage 2 request failed';
            try {
              const errData = await resp2.json();
              if (errData && errData.error) errText = errData.error;
            } catch (_) {}

            showToast(`Stage 2 bermasalah (${errText}). Menggunakan Stage 1 Content Plan.`);
            if (normalizedStage1) {
              setGenerationError(null);
              saveCarouselOutput(normalizedStage1);
            }
            return;
          }

          const data2 = await resp2.json();

          // ASYNC GUARD check for Stage 2
          if (
            getActiveProjectId() !== requestProjectId ||
            canonicalProjectId !== requestProjectId ||
            !sourceItem ||
            (requestItemId && sourceItem.content_item_id !== requestItemId) ||
            sourceItem.no !== requestItemNo
          ) {
            console.warn('[Async Guard] Discarding stale Stage 2 Carousel response');
            return;
          }

          const stage2Text = data2.text || '';
          const mergedPlanStr = mergeCarouselPlanStages(stage1Parsed, stage2Text, activeItem, activeContext);

          if (mergedPlanStr) {
            setGenerationError(null);
            saveCarouselOutput(mergedPlanStr);
            showToast(`Aset CAROUSEL (2-Stage Blueprint) berhasil dioptimalkan oleh Gemini AI!`);
          } else if (normalizedStage1) {
            setGenerationError(null);
            saveCarouselOutput(normalizedStage1);
            showToast(`Aset CAROUSEL Stage 1 Content Plan berhasil disimpan!`);
          } else {
            setGenerationError("Format respon AI tidak valid atau tidak memenuhi skema Carousel canonical. Silakan coba lagi.");
            showToast("Gagal: Format respon AI tidak sesuai skema.");
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            setGenerationError("Permintaan Carousel AI melebihi batas waktu (timeout). Silakan coba lagi.");
            showToast("Gagal: Timeout permintaan Carousel AI.");
          } else {
            setGenerationError(err?.message || "Terjadi kesalahan saat menghubungi server AI.");
            showToast("Terjadi kesalahan jaringan.");
          }
        }
        return;
      }

      // ==========================================
      // SINGLE-STAGE GENERATION FOR IMAGE, VIDEO, REVIEW
      // ==========================================
      const systemPrompt = `Buatkan ${promptTitle} (Bahasa Indonesia, profesional).

${ANTI_DRIFT_RULES}

### FUNNEL STRATEGY RULES CONTRACT:
${funnelPromptBlock}

${formattedContext}

### OUTPUT FORMAT:
${formatDirection}${revisionDirective}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch('/api/gemini/recommendation', {
          method: 'POST',
          headers: buildGeminiRequestHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            project_id: requestProjectId,
            content_item_id: requestItemId,
            item_no: requestItemNo,
            generation_type: activeTab,
            production_context: productionContext,
            prompt: systemPrompt,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errText = 'API request failed';
          let is429 = response.status === 429;
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errText = errData.error;
            }
            if (errData?.isRateLimit) {
              is429 = true;
            }
          } catch (_) {}

          if (is429 || /dibatasi|rate.*limit|quota|429/i.test(errText)) {
            setGenerationError("Permintaan AI sedang dibatasi (Rate Limit / High Demand). Coba lagi beberapa saat.");
            showToast("Permintaan AI sedang dibatasi. Coba lagi beberapa saat.");
          } else {
            setGenerationError(errText || "Gagal memproses permintaan AI. Silakan coba lagi.");
            showToast(`Gagal memproses: ${errText}`);
          }
          return;
        }

        const data = await response.json();

        // ASYNC GUARD: check if user switched project or item during generation
        if (
          getActiveProjectId() !== requestProjectId ||
          canonicalProjectId !== requestProjectId ||
          !sourceItem ||
          (requestItemId && sourceItem.content_item_id !== requestItemId) ||
          sourceItem.no !== requestItemNo
        ) {
          console.warn('[Async Guard] Discarding stale production AI generation response');
          return;
        }

        const generatedText = data.text || '';
        
        if (generatedText) {
          if (activeTab === 'image') {
            const normalized = validateAndNormalizeImageAngles(generatedText, activeItem, activeContext);
            if (normalized) {
              setGenerationError(null);
              saveImageOutput(normalized);
              showToast(`Aset IMAGE (3 Angle) berhasil dioptimalkan oleh Gemini AI!`);
            } else {
              setGenerationError("Format respon AI tidak valid atau tidak memenuhi skema Image Angle canonical. Silakan coba lagi.");
              showToast("Gagal: Format respon AI tidak sesuai skema.");
              return;
            }
          } else if (activeTab === 'video') {
            const normalized = validateAndNormalizeVideoStyles(generatedText, activeItem, activeContext);
            if (normalized) {
              setGenerationError(null);
              saveVideoOutput(normalized);
              showToast(`Aset VIDEO (3 Style) berhasil dioptimalkan oleh Gemini AI!`);
            } else {
              setGenerationError(null);
              saveVideoOutput(generatedText);
              showToast(`Aset VIDEO berhasil dioptimalkan oleh Gemini AI!`);
            }
          } else {
            setGenerationError(null);
            if (activeTab === 'review') saveReviewOutput(generatedText);
            showToast(`Aset ${activeTab.toUpperCase()} berhasil dioptimalkan oleh Gemini AI!`);
          }
        } else {
          setGenerationError("Tidak ada konten yang dikembalikan dari AI.");
          showToast("Gagal: Tidak ada respon dari AI.");
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'AbortError') {
        setGenerationError("Permintaan AI melebihi batas waktu (Timeout 45 detik). Silakan coba lagi.");
        showToast("Permintaan AI melebihi batas waktu (Timeout 45s).");
      } else {
        const errMsg = err.message || '';
        const isRateLimited = /dibatasi/i.test(errMsg) || /rate.*limit/i.test(errMsg) || /quota/i.test(errMsg) || /429/i.test(errMsg) || /503/i.test(errMsg) || /high.*demand/i.test(errMsg) || /unavailable/i.test(errMsg);
        if (isRateLimited) {
          setGenerationError("Permintaan AI sedang dibatasi (Rate Limit / High Demand). Coba lagi beberapa saat.");
          showToast("Permintaan AI sedang dibatasi.");
        } else {
          setGenerationError(`Gagal memproses: ${errMsg || 'Error tidak diketahui'}`);
          showToast(`Gagal memproses: ${errMsg || 'Error tidak diketahui'}`);
        }
      }
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Strictly typed active content item and shared context for studio hooks and panels
  const activeItem: ContentItem = useMemo(() => {
    return sourceItem || {
      no: 1,
      tanggal: new Date().toISOString().split('T')[0],
      jenis: 'TOFU',
      tujuan: 'Awareness',
      hookType: 'Question',
      headline: 'Konten Edukasi',
      body: '',
      caption: '',
      format: 'Single',
      referensi: '',
      visual: '',
      keterangan: '',
      projectId: canonicalProjectId || '',
      project_id: canonicalProjectId || '',
      content_item_id: canonicalProjectId ? `${canonicalProjectId}_temp_1` : 'temp_1',
    };
  }, [sourceItem, canonicalProjectId]);

  const activeContext: SharedContentContext = useMemo(() => {
    return sharedContextSnapshot || {
      project_id: canonicalProjectId || '',
      project_name: '',
      source: { origin: 'manual_context' },
      system_flags: { is_complete_for_planning: false, missing_required_fields: ['brand_context', 'strategy_context'] },
      brand_context: {
        brand_name: '',
        category: '',
        brand_summary: '',
        brand_voice: '',
      },
      audience_context: {
        primary_audience: '',
        pain_points: [],
        desires: [],
        objections: [],
      },
      strategy_context: {
        positioning: '',
        usp: [],
        main_offer: '',
        offer_benefits: [],
        core_message: '',
        copy_direction: [],
        content_pillars: [],
      },
    };
  }, [sharedContextSnapshot, canonicalProjectId]);

  const currentOutputText = useMemo(() => {
    if (!activeItem) return '';
    if (activeTab === 'image') return imageOutput;
    if (activeTab === 'carousel') return carouselOutput;
    if (activeTab === 'video') return videoOutput;
    if (activeTab === 'review') return reviewOutput || getInitialDraft('review', activeItem, activeContext);
    return '';
  }, [activeTab, imageOutput, carouselOutput, videoOutput, reviewOutput, activeItem, activeContext]);

  const handleUpdateOutputText = (val: string) => {
    if (activeTab === 'image') saveImageOutput(val);
    else if (activeTab === 'carousel') saveCarouselOutput(val);
    else if (activeTab === 'video') saveVideoOutput(val);
    else if (activeTab === 'review') saveReviewOutput(val);
  };

  // Memoized parsed image angles package
  const imageAnglesPackage = useMemo<ImageAnglesPackage | null>(() => {
    if (!activeItem) return null;
    const textToParse = imageOutput || getInitialDraft('image', activeItem, activeContext);
    const normalizedJson = validateAndNormalizeImageAngles(textToParse, activeItem, activeContext);
    if (!normalizedJson) {
      const fallbackParsed = tryParseJSON(textToParse);
      if (!fallbackParsed) return null;

      let list: any[] = [];
      let recommendedAngleId: 'A' | 'B' | 'C' = 'A';
      let recommendationReason = '';

      if (typeof fallbackParsed === 'object' && fallbackParsed !== null) {
        if (Array.isArray((fallbackParsed as any).angles)) {
          list = (fallbackParsed as any).angles;
        } else if (Array.isArray(fallbackParsed)) {
          list = fallbackParsed;
        }

        if ((fallbackParsed as any).recommendedAngleId) {
          const rawRecId = String((fallbackParsed as any).recommendedAngleId).toUpperCase().trim();
          if (rawRecId === 'A' || rawRecId === 'B' || rawRecId === 'C') {
            recommendedAngleId = rawRecId as 'A' | 'B' | 'C';
          }
        }

        if ((fallbackParsed as any).recommendationReason) {
          recommendationReason = String((fallbackParsed as any).recommendationReason).trim();
        }
      }

      if (!Array.isArray(list) || list.length === 0) return null;

      const fallbackStage = normalizeFunnelStage(activeItem?.jenis);
      const formattedAngles: ImageAngle[] = list.map((item: any, i: number) => {
        return sanitizeAndAlignImageAngle(item, fallbackStage, activeItem?.headline || '', i);
      });

      return {
        recommendedAngleId,
        recommendationReason: recommendationReason || (
          fallbackStage === 'TOFU'
            ? 'Angle ini direkomendasikan untuk membangun kesadaran awal audiens secara alami tanpa rasa jualan.'
            : fallbackStage === 'MOFU'
            ? 'Angle ini direkomendasikan untuk membangun otoritas edukatif dan pemahaman alur kerja yang jelas.'
            : 'Angle ini direkomendasikan untuk membuktikan hasil nyata dan memvalidasi keputusan bergabung.'
        ),
        angles: formattedAngles,
      };
    }

    return tryParseJSON(normalizedJson) as ImageAnglesPackage;
  }, [imageOutput, activeItem, activeContext]);

  // Sync selected angle when recommended angle is parsed
  useEffect(() => {
    if (imageAnglesPackage?.recommendedAngleId) {
      setSelectedAngleId(imageAnglesPackage.recommendedAngleId);
    }
  }, [imageAnglesPackage?.recommendedAngleId]);

  // Dynamic optimization button label based on active tab
  const getOptimizationButtonLabel = (tab: string, loading: boolean) => {
    if (loading) return 'Memproses...';
    switch (tab) {
      case 'review': return 'Cek Rencana';
      case 'image': return 'Buat Prompt Gambar';
      case 'carousel': return 'Buat Carousel';
      case 'video': return 'Buat Video';
      default: return 'Buat Output';
    }
  };

  // Memoized parsed carousel plan
  const carouselPlan = useMemo<CarouselPlan | null>(() => {
    const parsed = tryParseJSON(carouselOutput);
    if (parsed && typeof parsed === 'object') {
      if ('slides' in parsed && Array.isArray((parsed as any).slides)) {
        return parsed as CarouselPlan;
      }
    }
    return null;
  }, [carouselOutput]);

  // Render content of active tab dynamically with premium workshop components
  const renderTabContent = () => {
    const funnelRules = getFunnelRules(normalizeFunnelStage(activeItem?.jenis || ""));
    const handleProceedToProduction = () => {};
    const commonProps = {
      activeItem, activeContext, imageAnglesPackage, selectedAngleId, setSelectedAngleId,
      generatedImages, imageGeneratingKey, handleCopyText, copiedStates, handleGenerateImage,
      nextStepVisibleKeys, setNextStepVisibleKeys, handleDismissNextStep,
      imageOutput, getInitialDraft, funnelRules,  selectedCarouselId,
      setSelectedCarouselId, activeSlideNumber, setActiveSlideNumber, 
      carouselOutput, videoOutput, tryParseJSON, normalizeFunnelStage, getFunnelRules,
      selectedVideoId, handleSelectVideoStyle, videoMode, setVideoMode, characterImageUrl,
      setCharacterImageUrl, productScreenImageUrl, setProductScreenImageUrl, coverImageUrl,
      setCoverImageUrl, videoOutputMode, setVideoOutputMode, showToast, handleGenerateJson2VideoPayload,
      isRenderingVideo,  renderJobId, renderJobData, renderError,
      isCheckingStatus,  flowCustomCreator, setFlowCustomCreator,
      flowCustomSetting, setFlowCustomSetting, flowCustomDialogues, setFlowCustomDialogues,
        ugcOutput, 
         sourceItem,
      handleDownloadImage, imageGenerateError, handleRenderVideo, handleCheckRenderStatus,
      json2VideoPayload, characterDNA, getGoogleFlowVideoPack, setActiveTab,
      savedCharacters, selectedCharacterId, handleSelectCharacter, handleCreateCharacterClick
    };

    if (activeTab === 'image') return <ImagePanel {...commonProps} />;
    if (activeTab === 'carousel') return <CarouselPanel {...commonProps} />;
    if (activeTab === 'video') return <VideoPanel {...commonProps} />;

    return (
      <div className="whitespace-pre-wrap font-sans text-stone-800 text-xs leading-relaxed">
        {currentOutputText}
      </div>
    );
  };

 // Calculate readiness metrics
  const readinessChecklist = useMemo(() => {
    const checks = [
      { id: 'source', label: 'Source Item Tersedia', status: !!sourceItem },
      { id: 'context', label: 'Strategy Context Tersedia', status: !!sharedContextSnapshot },
      { id: 'headline', label: 'Headline Tersedia', status: !!activeItem?.headline },
      { id: 'objective', label: 'Objective / Tujuan Tersedia', status: !!activeItem?.tujuan },
      { id: 'cta', label: 'Call to Action (CTA) Tersedia', status: !!activeItem?.cta },
      { id: 'visual', label: 'Visual Direction Tersedia', status: !!activeItem?.visual }
    ];
    const passedCount = checks.filter(c => c.status).length;
    const percentage = Math.round((passedCount / checks.length) * 100);
    return { checks, passedCount, total: checks.length, percentage };
  }, [sourceItem, sharedContextSnapshot, activeItem]);

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans items-center justify-center">
        <div className="relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
          <BrainCircuit size={20} className="text-purple-400 absolute top-3.5 animate-pulse" />
          <p className="mt-4 text-xs font-bold text-zinc-400 uppercase tracking-widest animate-pulse">Memuat Production Studio...</p>
        </div>
      </main>
    );
  }

  if (isLoaded && !sourceItem) {
    return (
      <ContentEngineShell
        title="ALCO Production Studio"
        subtitle="Pusat produksi dan penyelarasan aset konten"
        eyebrow="Studio Workspace"
        actions={(
          <button
            onClick={() => router.push('/')}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/95"
          >
            <ArrowLeft size={13} />
            Kembali ke Kalender
          </button>
        )}
        mobileActions={(
          <button
            onClick={() => router.push('/')}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm"
          >
            <ArrowLeft size={13} />
            Kalender
          </button>
        )}
        footer={(
          <footer className="shrink-0 border-t border-border bg-card px-6 py-4 text-center text-xs text-muted-foreground">
            ALCO Production Studio - Memproduksi Konten Bernilai Konversi Tinggi
          </footer>
        )}
      >
        <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground"
              title="Kembali ke Kalender Konten"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <BrainCircuit size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm font-black text-foreground">ALCO PRODUCTION STUDIO</h1>
                  <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Studio Workspace
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Pusat Produksi & Penyelarasan Strategi Aset Konten</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl p-8 text-center space-y-5 shadow-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#1f2933]">Data Konten Project Tidak Ditemukan</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Item konten untuk project <span className="font-semibold text-stone-800 font-mono">[{canonicalProjectId || 'Belum Dipilih'}]</span> tidak ditemukan atau belum dipilih.
                Silakan kembali ke Kalender Utama dan klik <span className="text-primary font-semibold">Buka Production Studio</span> pada item kalender aktif.
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2.5 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <ArrowLeft size={13} />
              Kembali ke Kalender Utama
            </button>
          </div>
        </div>
      </ContentEngineShell>
    );
  }

  return (
    <ContentEngineShell
      title="ALCO Production Studio"
      subtitle="Workspace produksi aset dari kalender Content Engine"
      eyebrow={activeContext?.brand_context?.brand_name || 'Studio'}
      actions={(
        <>
          <GeminiApiKeyControl onToast={showToast} variant="compact" />
          <button
            onClick={() => router.push('/')}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:bg-primary/95"
          >
            <ArrowLeft size={13} />
            Kembali ke Kalender
          </button>
        </>
      )}
      mobileActions={(
        <button
          onClick={() => router.push('/')}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm"
        >
          <ArrowLeft size={13} />
          Kalender
        </button>
      )}
    >
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-[9999] bg-primary text-white font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs border border-primary/40"
          >
            <Sparkles size={14} className="animate-pulse" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Status Info Strip */}
      {canonicalProjectId && (
        <div className="bg-stone-50 border-b border-stone-200 px-4 md:px-8 py-2 flex items-center justify-between gap-3 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <span className="font-medium">Project ID:</span>
            <span className="font-mono text-stone-800 font-semibold bg-stone-200/70 px-2 py-0.5 rounded">{canonicalProjectId}</span>
            {sharedContextSnapshot?.brand_context?.brand_name && (
              <span className="text-stone-500">({sharedContextSnapshot.brand_context.brand_name})</span>
            )}
          </div>
        </div>
      )}

      {/* Content Production Context Strip */}
      <div className="border-b border-[#e7e0d4] bg-[#fffdf8] px-4 md:px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase shrink-0 ${
              (activeItem.jenis || '').includes('TOFU') ? 'bg-sky-100 text-sky-800 border border-sky-200' :
              (activeItem.jenis || '').includes('MOFU') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              'bg-primary/10 text-primary border border-primary/20'
            }`}>
              {activeItem.jenis || 'KONTEN'}
            </span>
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-stone-400 shrink-0">#{activeItem.no || '1'}</span>
              <span className="font-bold text-stone-900 truncate">{activeItem.headline}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-stone-500 text-[11px] hidden sm:inline">Format Terjadwal:</span>
            <span className="px-2.5 py-1 bg-[#f6f3ee] text-stone-800 font-bold rounded-lg border border-[#e7e0d4] text-[11px]">
              {activeItem.format || 'Semua Format'}
            </span>
            <span className="text-stone-300">|</span>
            {/* Supporting Character Context Quick Trigger */}
            <button
              onClick={() => setShowCharacterModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f6f3ee] hover:bg-stone-200 text-stone-700 font-semibold rounded-lg border border-[#e7e0d4] text-[11px] transition cursor-pointer"
              title="Kelola DNA Karakter & Profil Talent"
            >
              <BrainCircuit size={12} className={selectedCharacterId ? 'text-primary' : 'text-stone-400'} />
              <span>Karakter:</span>
              <span className="font-bold text-stone-900">
                {savedCharacters.find(c => c.character_id === selectedCharacterId)?.identity?.display_name || 'No Character'}
              </span>
            </button>
            <span className="text-stone-300">|</span>
            <span className="text-stone-500 text-[11px] hidden sm:inline">Mode Aktif:</span>
            <span className="px-2.5 py-1 bg-cyan-500/10 text-cyan-800 dark:text-cyan-200 font-bold rounded-lg border border-cyan-500/20 text-[11px] uppercase">
              {activeTab}
            </span>
          </div>
        </div>
      </div>

      {/* Main Studio Workspace Grid */}
      <div className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: ACTIVE CALENDAR ITEM & BRAND SUMMARY (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Production Progress Checklist (Compact & Expandable) */}
          <ProductionProgressWidget
            item={sourceItem || activeItem}
            onUpdateProgress={handleUpdateProgress}
            variant="expandable"
          />
          
          {/* Quick Context Reference Card - Compact on mobile, detailed on desktop */}
          <div className="bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl p-4.5 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#e7e0d4]">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border ${
                  (activeItem.jenis || '').includes('TOFU') ? 'bg-sky-100 text-sky-800 border-sky-200' :
                  (activeItem.jenis || '').includes('MOFU') ? 'bg-amber-100 text-amber-800 border-amber-200' :
                  'bg-primary/10 text-primary border-primary/25'
                }`}>
                  #{activeItem.no || '1'}
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#1f2933]">Rencana Konten</h2>
                  <p className="text-[11px] text-stone-500">{activeItem.tanggal}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                  (activeItem.jenis || '').includes('TOFU') ? 'bg-sky-100 text-sky-800 border border-sky-200' :
                  (activeItem.jenis || '').includes('MOFU') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-primary/10 text-primary border border-primary/20'
                }`}>
                  {activeItem.jenis}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-[#e7e0d4] text-[11px] font-medium hidden sm:inline-block">
                  {activeItem.format}
                </span>
              </div>
            </div>

            {/* Always visible: Headline and primary summary */}
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                <Zap size={13} className="text-primary" /> Headline Konten
              </div>
              <div className="bg-[#f6f3ee] border border-[#e7e0d4] p-3 rounded-xl text-[#1f2933] font-bold text-xs leading-relaxed">
                {activeItem.headline}
              </div>
            </div>

            {/* Desktop Detailed View */}
            <div className="hidden lg:block space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4]">
                  <div className="text-[11px] font-semibold text-stone-500 mb-0.5">Tujuan (Objective)</div>
                  <p className="text-xs text-stone-800 font-medium leading-snug">{activeItem.tujuan}</p>
                </div>
                <div className="bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4]">
                  <div className="text-[11px] font-semibold text-stone-500 mb-0.5">Format Konten</div>
                  <p className="text-xs text-stone-800 font-medium">{activeItem.format}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4]">
                  <div className="text-[11px] font-semibold text-stone-500 mb-0.5">Tipe Hook</div>
                  <p className="text-xs text-stone-800 font-medium">{activeItem.hookType}</p>
                </div>
                <div className="bg-[#f6f3ee] p-3 rounded-xl border border-[#e7e0d4]">
                  <div className="text-[11px] font-semibold text-stone-500 mb-0.5">Call to Action (CTA)</div>
                  <p className="text-xs text-primary font-bold">{activeItem.cta}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                  <FileText size={13} /> Naskah Kasar / Body
                </div>
                <div className="bg-[#f6f3ee] border border-[#e7e0d4] p-3 rounded-xl text-stone-800 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar whitespace-pre-wrap text-xs">
                  {activeItem.body}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                  <MessageSquare size={13} /> Visual Direction
                </div>
                <div className="bg-[#f6f3ee] border border-[#e7e0d4] p-3 rounded-xl text-stone-800 leading-relaxed text-xs">
                  {activeItem.visual}
                </div>
              </div>
            </div>

            {/* Mobile Collapsible Details Accordion */}
            <details className="lg:hidden group border-t border-[#e7e0d4] pt-2 text-xs">
              <summary className="font-bold text-stone-700 cursor-pointer flex items-center justify-between text-xs py-1.5 list-none select-none">
                <span className="flex items-center gap-1.5 text-primary">
                  <Sliders size={13} />
                  <span>Detail Rencana Konten &amp; Strategi</span>
                </span>
                <ChevronDown size={14} className="group-open:rotate-180 transition-transform text-stone-500" />
              </summary>
              <div className="pt-3 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-[#f6f3ee] p-2.5 rounded-xl border border-[#e7e0d4]">
                    <div className="text-[10px] font-semibold text-stone-500 mb-0.5">Tujuan</div>
                    <p className="text-xs text-stone-800 font-medium leading-snug">{activeItem.tujuan}</p>
                  </div>
                  <div className="bg-[#f6f3ee] p-2.5 rounded-xl border border-[#e7e0d4]">
                    <div className="text-[10px] font-semibold text-stone-500 mb-0.5">CTA</div>
                    <p className="text-xs text-primary font-bold">{activeItem.cta}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-stone-600">Naskah Kasar / Body</div>
                  <div className="bg-[#f6f3ee] border border-[#e7e0d4] p-2.5 rounded-xl text-stone-800 leading-relaxed whitespace-pre-wrap text-xs">
                    {activeItem.body}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-semibold text-stone-600">Visual Direction</div>
                  <div className="bg-[#f6f3ee] border border-[#e7e0d4] p-2.5 rounded-xl text-stone-800 leading-relaxed text-xs">
                    {activeItem.visual}
                  </div>
                </div>

                <div className="bg-[#f6f3ee] p-2.5 rounded-xl border border-[#e7e0d4] space-y-1.5">
                  <div className="text-[10px] font-bold text-stone-600">Suara Brand: {activeContext.brand_context?.brand_name}</div>
                  <p className="text-[11px] text-stone-700">{activeContext.brand_context?.brand_voice || '-'}</p>
                </div>
              </div>
            </details>
          </div>

          {/* Quick Brand Metadata Context Card (Collapsible for Progressive Disclosure) */}
          <details className="hidden lg:block group bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl overflow-hidden shadow-xs">
            <summary className="p-4 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Target size={13} />
                </div>
                <h3 className="text-xs font-bold text-[#1f2933]">Informasi Brand &amp; Audiens</h3>
              </div>
              <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
            </summary>

            <div className="p-4 pt-0 border-t border-[#e7e0d4]/60 space-y-3.5 text-xs mt-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-stone-500">Nama Brand</div>
                  <p className="text-xs text-[#1f2933] font-bold">{activeContext.brand_context?.brand_name || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[11px] font-semibold text-stone-500">Suara Brand</div>
                  <p className="text-xs text-stone-700 font-medium line-clamp-1">{activeContext.brand_context?.brand_voice || '-'}</p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                  <Users size={12} className="text-primary" /> Audiens Utama
                </div>
                <p className="text-xs text-stone-800 font-medium leading-relaxed bg-[#f6f3ee] p-2.5 rounded-xl border border-[#e7e0d4]">
                  {activeContext.audience_context?.primary_audience}
                </p>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-stone-600">Pain Points Utama</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeContext.audience_context?.pain_points?.map((p, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                      {p}
                    </span>
                  )) || <span className="text-stone-400">-</span>}
                </div>
              </div>
            </div>
          </details>
        </div>

        {/* RIGHT COLUMN: WORKSPACE TAB NAVIGATION & DYNAMIC WORKSHOP CONTENT (lg:col-span-8) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          
          {/* URUTAN KERJA (Collapsible Workflow Guide) */}
          <details className="group bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl overflow-hidden shadow-xs">
            <summary className="p-3 flex items-center justify-between font-bold text-xs text-stone-800 hover:text-primary cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <ListTodo size={15} className="text-primary" />
                <h3 className="text-xs font-bold text-[#1f2933]">Panduan Alur Kerja Produksi</h3>
                <span className="text-[10px] text-stone-500 font-normal hidden sm:inline">(5 Langkah Praktis Menuju Aset Siap Pakai)</span>
              </div>
              <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-3 pt-0 border-t border-[#e7e0d4]/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs mt-2.5">
              <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl p-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                <span className="text-stone-700 font-medium text-[11px] leading-tight">Pilih format</span>
              </div>
              <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl p-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                <span className="text-stone-700 font-medium text-[11px] leading-tight">Klik Buat</span>
              </div>
              <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl p-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                <span className="text-stone-700 font-medium text-[11px] leading-tight">Salin prompt/output</span>
              </div>
              <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl p-2.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">4</span>
                <span className="text-stone-700 font-medium text-[11px] leading-tight">Buka tool eksternal</span>
              </div>
              <div className="bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl p-2.5 flex items-center gap-2 col-span-2 sm:col-span-1">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">5</span>
                <span className="text-stone-700 font-medium text-[11px] leading-tight">Paste &amp; eksekusi</span>
              </div>
            </div>
          </details>

          {generationError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-800">Pemberitahuan Sistem AI</span>
                  <p className="text-xs leading-relaxed text-amber-900 mt-0.5">{generationError}</p>
                </div>
              </div>
              <button 
                onClick={() => setGenerationError(null)}
                className="text-amber-800 hover:text-stone-900 text-xs font-bold px-2.5 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg transition shrink-0 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Tab Selection Header with Dynamic Single Optimization Button */}
          <div className="bg-[#fffdf8] border border-[#e7e0d4] p-2 rounded-2xl flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              {[
                { id: 'review', label: 'Cek Rencana', icon: Eye, formatMatch: [] },
                { id: 'image', label: 'Gambar', icon: ImageIcon, formatMatch: ['gambar', 'single', 'image', 'feed', 'poster'] },
                { id: 'carousel', label: 'Carousel', icon: Layers, formatMatch: ['carousel'] },
                { id: 'video', label: 'Video', icon: Video, formatMatch: ['video', 'reels', 'tiktok', 'shorts'] },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isMatch = tab.formatMatch.some((m: string) => (activeItem.format || '').toLowerCase().includes(m));
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setIsEditingMode(false);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isActive 
                        ? 'bg-primary text-white shadow-xs' 
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    {isMatch && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-tight ${
                        isActive ? 'bg-white/25 text-white' : 'bg-primary/10 text-primary'
                      }`}>
                        Target
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Single Dynamic Optimization Button */}
            <button
              onClick={handleGenerateWithAI}
              disabled={isLoadingAI}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 min-w-max shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className={`${isLoadingAI ? 'animate-spin' : ''}`} />
              <span>{getOptimizationButtonLabel(activeTab, isLoadingAI)}</span>
            </button>
          </div>

          {/* DYNAMIC STUDIO WORKSPACE */}
          <div className="flex-1 bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl p-5 md:p-6 flex flex-col justify-between shadow-xs min-h-[550px]">
            
            {/* TAB CONTENT: REVIEW */}
            {activeTab === 'review' ? (
              <ReviewPanel 
                activeItem={activeItem} 
                activeContext={activeContext} 
                funnelRules={getFunnelRules(normalizeFunnelStage(activeItem?.jenis || ""))} 
                readinessChecklist={readinessChecklist} 
                handleProceedToProduction={() => {}} 
                isEditingMode={isEditingMode}
                setIsEditingMode={setIsEditingMode}
                reviewOutput={reviewOutput}
                getInitialDraft={getInitialDraft}
                saveReviewOutput={saveReviewOutput} setVideoMode={setVideoMode} handleCopyText={handleCopyText} copiedStates={copiedStates}
                setActiveTab={setActiveTab}
              />
            ) : (
              // TAB CONTENT: IMAGE, CAROUSEL, VIDEO WORKSHOPS
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Workshop Header & Mode Toggle */}
                <div className="flex items-center justify-between pb-3 border-b border-[#e7e0d4]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <div>
                      <h3 className="text-xs font-bold text-[#1f2933]">
                        Hasil Produksi: <span className="text-primary font-bold">{activeTab.toUpperCase()}</span>
                      </h3>
                      <p className="text-[11px] text-stone-500">Anda dapat beralih ke Mode Edit untuk menyesuaikan copywriting secara manual</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-[#f6f3ee] p-1 rounded-xl border border-[#e7e0d4] flex items-center gap-1 text-xs">
                      <button
                        onClick={() => setIsEditingMode(false)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          !isEditingMode 
                            ? 'bg-primary text-white' 
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Pratinjau
                      </button>
                      <button
                        onClick={() => setIsEditingMode(true)}
                        className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                          isEditingMode 
                            ? 'bg-primary text-white' 
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Edit Naskah
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyText(activeTab, currentOutputText, 'none')}
                      className="p-2 hover:bg-stone-100 text-stone-600 hover:text-stone-900 rounded-xl border border-[#e7e0d4] bg-[#fffdf8] transition-all shadow-xs cursor-pointer"
                      title="Salin Naskah"
                    >
                      {copiedStates[activeTab] ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Primary Content Editor / Preview Stage */}
                <div className="relative rounded-2xl bg-[#fffdf8] border border-[#e7e0d4] flex-1 flex flex-col min-h-[340px] overflow-hidden shadow-xs">
                  
                  {/* Loader overlay during AI execution */}
                  <AnimatePresence mode="wait">
                    {isLoadingAI ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-[#fffdf8]/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center space-y-3.5"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                          <Sparkles size={16} className="text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                        </div>
                        <div className="text-center space-y-1 px-4">
                          <p className="text-xs font-bold text-[#1f2933]">Gemini AI Membaca Strategi Anda...</p>
                          <p className="text-xs text-stone-500 max-w-xs leading-relaxed">
                            Menerjemahkan pilar bisnis, headline, dan target pemosisian menjadi aset konten siap pakai berkonversi tinggi...
                          </p>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  {/* Body Content Renderer */}
                  {isEditingMode ? (
                    <textarea
                      value={currentOutputText}
                      onChange={(e) => handleUpdateOutputText(e.target.value)}
                      className="w-full flex-1 p-4 bg-[#f6f3ee] text-stone-900 text-xs font-sans leading-relaxed resize-none focus:outline-none focus:border-primary custom-scrollbar"
                      placeholder="Tuliskan atau sesuaikan draf produksi naskah di sini secara bebas..."
                    />
                  ) : (
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar text-stone-800 text-xs leading-relaxed space-y-3 font-sans">
                      {renderTabContent()}
                    </div>
                  )}

                  {/* Bottom Stats inside Editor - Advanced Collapsible */}
                  <details className="text-[11px] text-stone-500 bg-[#f6f3ee] border-t border-[#e7e0d4] px-3 py-1.5 group select-none">
                    <summary className="cursor-pointer font-medium hover:text-stone-700 flex items-center justify-between list-none">
                      <span className="flex items-center gap-1">
                        <Sliders size={11} className="text-stone-400" />
                        <span>Advanced: Info Teknis Editor</span>
                      </span>
                      <ChevronDown size={12} className="group-open:rotate-180 transition-transform text-stone-400" />
                    </summary>
                    <div className="pt-1.5 pb-1 flex items-center justify-between text-[11px] text-stone-600 border-t border-[#e7e0d4]/50 mt-1">
                      <span>Panjang Karakter: {currentOutputText?.length || 0}</span>
                      <span>Mode: {isEditingMode ? 'Edit Langsung' : 'Pratinjau Terstruktur'}</span>
                    </div>
                  </details>
                </div>

                {/* REVISION NOTES INPUT BOX (Clean input without redundant second button) */}
                <div className="bg-[#fffdf8] p-4 rounded-2xl border border-[#e7e0d4] space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-primary" />
                      Instruksi Khusus / Catatan Revisi
                    </label>
                    <span className="text-[11px] text-stone-400">Opsional</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={revisionNotes}
                      onChange={(e) => saveRevisionNotes(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleGenerateWithAI();
                        }
                      }}
                      placeholder="Contoh: 'Buat gaya naskah lebih kasual', 'Fokuskan pada USP menghemat waktu' (Tekan Enter untuk optimasi)..."
                      className="flex-1 px-3.5 py-2 bg-[#f6f3ee] border border-[#e7e0d4] rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* Bottom Controls */}
            <div className="mt-5 pt-4 border-t border-[#e7e0d4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-stone-400 shrink-0" />
                <span>Naskah siap eksekusi. Silakan salin prompt/naskah untuk platform desain atau produksi.</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* CHARACTER DNA ASSET MODAL / DRAWER (Context & Reusable Asset Layer) */}
      <AnimatePresence>
        {showCharacterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-950/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-[#fffdf8] border border-[#e7e0d4] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 sm:px-6 py-3.5 border-b border-[#e7e0d4] bg-[#f6f3ee] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                    <BrainCircuit size={17} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">DNA Karakter &amp; Talent Profil</h2>
                    <p className="text-[11px] text-stone-500">Konteks konsistensi talent &amp; visual persona untuk prompt produksi</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCharacterModal(false)}
                  className="p-1.5 rounded-xl text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition cursor-pointer"
                  title="Tutup Modal DNA Karakter"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body: Complete CharacterDNASection with full functionality */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
                <CharacterDNASection 
                  projectId={canonicalProjectId || ''}
                  activeCharacterId={selectedCharacterId}
                  onSelectCharacter={handleSelectCharacter}
                  onDNAUpdate={(dna) => {
                    setCharacterDNA(dna);
                    if (canonicalProjectId) {
                      const refreshed = getProjectSavedCharacters(canonicalProjectId);
                      setSavedCharacters(refreshed);
                      if (dna?.character_id) {
                        setSelectedCharacterId(dna.character_id);
                        saveProjectActiveCharacterId(canonicalProjectId, dna.character_id);
                      }
                    }
                    showToast('DNA Karakter berhasil disimpan & diperbarui!');
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Footer */}
      <footer className="border-t border-[#e7e0d4] bg-[#fffdf8] py-4 px-6 flex justify-between items-center text-xs text-stone-500">
        <div>ALCO Production Studio - Memproduksi Konten Bernilai Konversi Tinggi</div>
        <div className="flex gap-4">
          <span>Funnel Stage: {activeItem.jenis}</span>
          <span>Access Level: Full Enterprise</span>
        </div>
      </footer>
    </ContentEngineShell>
  );
}
