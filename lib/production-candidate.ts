import {
  ImageProductionDetails,
  CarouselProductionDetails,
  CarouselSlideProductionPlan,
  CarouselFinalPrompts,
  VideoProductionDetails,
  VideoSceneProductionPlan,
} from './production-contract';
import { FunnelStage } from './content-contract';

// ============================================================================
// CANONICAL PRODUCTION CANDIDATES (PHASE 3C-A)
// Vendor-neutral, structured production candidates before package creation
// ============================================================================

export interface ImageProductionCandidate {
  candidate_type: 'image';
  candidate_id: string;
  production_details: ImageProductionDetails;
  final_prompt: string;
}

export interface CarouselProductionCandidate {
  candidate_type: 'carousel';
  candidate_id: string;
  production_details: CarouselProductionDetails;
  final_prompts: CarouselFinalPrompts;
}

export interface VideoProductionCandidate {
  candidate_type: 'video';
  candidate_id: string;
  production_mode: 'ugc_video' | 'text_motion' | 'asset_product';
  production_details: VideoProductionDetails;
  final_prompt: string;
}

export type ProductionCandidate =
  | ImageProductionCandidate
  | CarouselProductionCandidate
  | VideoProductionCandidate;

export interface ProductionCandidateValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Maps Video Style ID (A, B, C) deterministically to canonical production mode.
 */
export function resolveVideoProductionMode(
  id: string
): 'ugc_video' | 'text_motion' | 'asset_product' {
  if (!id || typeof id !== 'string') return 'ugc_video';
  const cleanId = id.trim().toUpperCase();
  if (
    cleanId === 'A' ||
    cleanId.startsWith('STYLE A') ||
    cleanId.startsWith('STYLE_A') ||
    cleanId.startsWith('OPTION A') ||
    cleanId.startsWith('A:') ||
    cleanId.startsWith('A -')
  ) {
    return 'ugc_video';
  }
  if (
    cleanId === 'B' ||
    cleanId.startsWith('STYLE B') ||
    cleanId.startsWith('STYLE_B') ||
    cleanId.startsWith('OPTION B') ||
    cleanId.startsWith('B:') ||
    cleanId.startsWith('B -')
  ) {
    return 'text_motion';
  }
  if (
    cleanId === 'C' ||
    cleanId.startsWith('STYLE C') ||
    cleanId.startsWith('STYLE_C') ||
    cleanId.startsWith('OPTION C') ||
    cleanId.startsWith('C:') ||
    cleanId.startsWith('C -')
  ) {
    return 'asset_product';
  }
  return 'ugc_video';
}

// Forbidden fields that belong strictly to ProductionPackage authority layer (Phase 3B)
const FORBIDDEN_AUTHORITY_FIELDS = [
  'project_id',
  'content_item_id',
  'calendar_item_id',
  'strategy_snapshot',
  'content_snapshot',
  'brand_visual_snapshot',
  'production_status',
  'package_id',
  'created_at',
];

/**
 * Validates a candidate against the canonical schema.
 * Rejects any candidate containing package authority fields or malformed data.
 */
export function validateProductionCandidate(
  candidate: unknown
): ProductionCandidateValidationResult {
  if (!candidate || typeof candidate !== 'object') {
    return { isValid: false, error: 'Candidate must be a non-null object' };
  }

  const obj = candidate as Record<string, any>;

  // Check forbidden authority fields
  for (const field of FORBIDDEN_AUTHORITY_FIELDS) {
    if (field in obj && obj[field] !== undefined) {
      return {
        isValid: false,
        error: `Candidate must not contain authoritative package field: ${field}`,
      };
    }
  }

  const candidateType = obj.candidate_type;
  if (!candidateType || !['image', 'carousel', 'video'].includes(candidateType)) {
    return {
      isValid: false,
      error: `Invalid candidate_type: ${candidateType}. Must be 'image', 'carousel', or 'video'`,
    };
  }

  const candidateId = obj.candidate_id;
  if (typeof candidateId !== 'string' || candidateId.trim().length === 0) {
    return { isValid: false, error: 'candidate_id must be a non-empty string' };
  }

  const details = obj.production_details;
  if (!details || typeof details !== 'object') {
    return { isValid: false, error: 'production_details must be a non-null object' };
  }

  // IMAGE CANDIDATE VALIDATION
  if (candidateType === 'image') {
    const finalPrompt = obj.final_prompt;
    if (typeof finalPrompt !== 'string' || finalPrompt.trim().length === 0) {
      return { isValid: false, error: 'final_prompt must be a non-empty string for image candidate' };
    }

    const nonEmptyImageFields: Array<keyof ImageProductionDetails> = [
      'objective',
      'scene',
      'subject',
      'composition',
      'environment',
      'lighting',
      'camera_direction',
      'visual_style',
      'negative_constraints',
    ];

    for (const field of nonEmptyImageFields) {
      const val = details[field];
      if (typeof val !== 'string' || val.trim().length === 0) {
        return {
          isValid: false,
          error: `Missing or empty required image production detail: ${field}`,
        };
      }
    }

    const allowedEmptyImageFields: Array<keyof ImageProductionDetails> = [
      'text_overlay',
      'branding',
    ];

    for (const field of allowedEmptyImageFields) {
      if (typeof details[field] !== 'string') {
        return {
          isValid: false,
          error: `image.${field} must be a string in ImageProductionCandidate`,
        };
      }
    }

    return { isValid: true };
  }

  // CAROUSEL CANDIDATE VALIDATION
  if (candidateType === 'carousel') {
    const nonEmptyCarouselFields: Array<keyof CarouselProductionDetails> = [
      'objective',
      'cover_direction',
      'visual_continuity',
      'negative_constraints',
    ];

    for (const field of nonEmptyCarouselFields) {
      const val = details[field];
      if (typeof val !== 'string' || val.trim().length === 0) {
        return {
          isValid: false,
          error: `Missing or empty required carousel production detail: ${field}`,
        };
      }
    }

    if (typeof details.branding !== 'string') {
      return {
        isValid: false,
        error: 'carousel.branding must be a string in CarouselProductionCandidate',
      };
    }

    const slideCount = details.slide_count;
    if (typeof slideCount !== 'number' || !Number.isInteger(slideCount) || slideCount <= 0) {
      return { isValid: false, error: 'slide_count must be a positive integer' };
    }

    const slides = details.slides;
    if (!Array.isArray(slides) || slides.length !== slideCount) {
      return {
        isValid: false,
        error: `Carousel slides count (${Array.isArray(slides) ? slides.length : 0}) does not match slide_count (${slideCount})`,
      };
    }

    const validSlideRoles = new Set([
      'hook',
      'problem',
      'reframe',
      'solution',
      'how_it_works',
      'framework',
      'proof',
      'value',
      'cta',
      'learn',
      'content',
      'bridge',
      'case_study',
      'comparison',
      'action',
      'checklist',
      'takeaway',
      'quote',
      'cover',
    ]);

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      if (!slide || typeof slide !== 'object') {
        return { isValid: false, error: `Invalid slide object at index ${i}` };
      }
      if (slide.slide_number !== i + 1) {
        return {
          isValid: false,
          error: `Slide at index ${i} has invalid slide_number ${slide.slide_number}, expected ${i + 1}`,
        };
      }
      if (typeof slide.role !== 'string' || !validSlideRoles.has(slide.role.toLowerCase().trim())) {
        return { isValid: false, error: `Slide ${i + 1} has invalid role: ${slide.role}` };
      }
      const requiredSlideFields: Array<keyof CarouselSlideProductionPlan> = [
        'role',
        'headline',
        'body',
        'visual_direction',
        'layout_direction',
      ];
      for (const field of requiredSlideFields) {
        const val = slide[field];
        if (typeof val !== 'string' || val.trim().length === 0) {
          return { isValid: false, error: `Slide ${i + 1} missing or empty ${field}` };
        }
      }
    }

    const finalPrompts = obj.final_prompts;
    if (!finalPrompts || typeof finalPrompts !== 'object') {
      return { isValid: false, error: 'final_prompts must be a non-null object for carousel candidate' };
    }
    if (typeof finalPrompts.master_prompt !== 'string' || finalPrompts.master_prompt.trim().length === 0) {
      return { isValid: false, error: 'final_prompts.master_prompt must be a non-empty string' };
    }
    if (!Array.isArray(finalPrompts.slides) || finalPrompts.slides.length !== slideCount) {
      return {
        isValid: false,
        error: `final_prompts.slides count (${Array.isArray(finalPrompts.slides) ? finalPrompts.slides.length : 0}) does not match slide_count (${slideCount})`,
      };
    }

    for (let i = 0; i < finalPrompts.slides.length; i++) {
      const sp = finalPrompts.slides[i];
      if (!sp || typeof sp !== 'object') {
        return { isValid: false, error: `Invalid slide prompt at index ${i}` };
      }
      if (sp.slide_number !== i + 1) {
        return {
          isValid: false,
          error: `final_prompts.slides at index ${i} has invalid slide_number ${sp.slide_number}, expected ${i + 1}`,
        };
      }
      if (typeof sp.prompt !== 'string' || sp.prompt.trim().length === 0) {
        return { isValid: false, error: `final_prompts.slides at slide ${i + 1} has empty prompt` };
      }
    }

    return { isValid: true };
  }

  // VIDEO CANDIDATE VALIDATION
  if (candidateType === 'video') {
    const validModes = ['ugc_video', 'text_motion', 'asset_product'];
    const mode = obj.production_mode;
    if (!mode || !validModes.includes(mode)) {
      return {
        isValid: false,
        error: `Invalid production_mode: ${mode}. Must be 'ugc_video', 'text_motion', or 'asset_product'`,
      };
    }

    const finalPrompt = obj.final_prompt;
    if (typeof finalPrompt !== 'string' || finalPrompt.trim().length === 0) {
      return { isValid: false, error: 'final_prompt must be a non-empty string for video candidate' };
    }

    const duration = details.duration_seconds;
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
      return { isValid: false, error: 'duration_seconds must be a positive finite number' };
    }

    const scenes = details.scenes;
    if (!Array.isArray(scenes) || scenes.length === 0) {
      return { isValid: false, error: 'scenes must be a non-empty array' };
    }

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      if (!scene || typeof scene !== 'object') {
        return { isValid: false, error: `Invalid scene object at index ${i}` };
      }
      if (scene.scene_number !== i + 1) {
        return {
          isValid: false,
          error: `Scene at index ${i} has invalid scene_number ${scene.scene_number}, expected ${i + 1}`,
        };
      }
      if (typeof scene.duration_seconds !== 'number' || !Number.isFinite(scene.duration_seconds) || scene.duration_seconds <= 0) {
        return { isValid: false, error: `Scene ${i + 1} has invalid duration_seconds` };
      }
      const nonEmptySceneFields: Array<keyof VideoSceneProductionPlan> = [
        'purpose',
        'visual_direction',
        'action',
        'camera',
      ];
      for (const field of nonEmptySceneFields) {
        const val = scene[field];
        if (typeof val !== 'string' || val.trim().length === 0) {
          return { isValid: false, error: `Scene ${i + 1} missing or empty ${field}` };
        }
      }
      const allowedEmptySceneFields: Array<keyof VideoSceneProductionPlan> = [
        'voiceover',
        'on_screen_text',
      ];
      for (const field of allowedEmptySceneFields) {
        if (typeof scene[field] !== 'string') {
          return { isValid: false, error: `Scene ${i + 1} ${field} must be a string` };
        }
      }
    }

    const nonEmptyStringFields: Array<keyof VideoProductionDetails> = [
      'objective',
      'format',
      'hook',
      'camera_direction',
      'motion_direction',
      'audio_direction',
      'negative_constraints',
    ];

    for (const field of nonEmptyStringFields) {
      const val = details[field];
      if (typeof val !== 'string' || val.trim().length === 0) {
        return {
          isValid: false,
          error: `Missing or empty required video production detail: ${field}`,
        };
      }
    }

    const allowedEmptyStringFields: Array<keyof VideoProductionDetails> = [
      'voiceover',
      'on_screen_text',
      'branding',
    ];

    for (const field of allowedEmptyStringFields) {
      if (typeof details[field] !== 'string') {
        return {
          isValid: false,
          error: `video.${field} must be a string in VideoProductionCandidate`,
        };
      }
    }

    return { isValid: true };
  }

  return { isValid: false, error: 'Unknown candidate type' };
}

/**
 * Builds an ImageProductionCandidate from clean structured values.
 */
export function buildImageProductionCandidate(params: {
  candidate_id: string;
  visualObjective: string;
  scene: string;
  subject: string;
  composition: string;
  environment: string;
  lighting: string;
  camera: string;
  visualStyle: string;
  textOverlay: string;
  branding?: string;
  negativeConstraints?: string;
  finalPrompt: string;
}): ImageProductionCandidate {
  return {
    candidate_type: 'image',
    candidate_id: params.candidate_id,
    production_details: {
      objective: params.visualObjective,
      scene: params.scene,
      subject: params.subject,
      composition: params.composition,
      environment: params.environment,
      lighting: params.lighting,
      camera_direction: params.camera,
      visual_style: params.visualStyle,
      text_overlay: params.textOverlay,
      branding: params.branding ?? '',
      negative_constraints:
        typeof params.negativeConstraints === 'string'
          ? params.negativeConstraints
          : '',
    },
    final_prompt: params.finalPrompt,
  };
}

/**
 * Builds a CarouselProductionCandidate from clean structured values.
 */
export function buildCarouselProductionCandidate(params: {
  candidate_id: string;
  objective: string;
  slide_count: number;
  cover_direction: string;
  slides: CarouselSlideProductionPlan[];
  visual_continuity: string;
  branding?: string;
  negative_constraints?: string;
  final_prompts: CarouselFinalPrompts;
}): CarouselProductionCandidate {
  return {
    candidate_type: 'carousel',
    candidate_id: params.candidate_id,
    production_details: {
      objective: params.objective,
      slide_count: params.slide_count,
      cover_direction: params.cover_direction,
      slides: params.slides,
      visual_continuity: params.visual_continuity,
      branding: params.branding ?? '',
      negative_constraints: params.negative_constraints ?? '',
    },
    final_prompts: params.final_prompts,
  };
}

/**
 * Helper to build vendor-neutral structured scene plan for videos.
 */
export function buildCanonicalVideoScenePlan(
  funnelStage: FunnelStage,
  script?: {
    hook?: string;
    masalah?: string;
    solusi?: string;
    proof?: string;
    cta?: string;
  }
): VideoSceneProductionPlan[] {
  const stage = funnelStage;
  const voiceoverCta = typeof script?.cta === 'string' ? script.cta : '';

  if (stage === 'BOFU') {
    return [
      {
        scene_number: 1,
        duration_seconds: 5,
        purpose: 'Proof Hook',
        visual_direction: 'Testimonial highlight or metric dashboard card',
        action: 'Talent tampil percaya diri dan meyakinkan saat menyampaikan bukti hasil.',
        camera: 'Medium close-up vertikal, tatapan mata langsung ke kamera dengan pencahayaan terang.',
        voiceover: script?.hook ?? '',
        on_screen_text: script?.hook ?? '',
      },
      {
        scene_number: 2,
        duration_seconds: 6,
        purpose: 'Problem Context',
        visual_direction: 'Product close-up / before-after demonstration',
        action: 'Talent menunjukkan gestur menunjuk titik hambatan di layar atau produk.',
        camera: 'Close-up produk / antarmuka aplikasi dengan gerakan pan perlahan.',
        voiceover: script?.masalah ?? '',
        on_screen_text: script?.masalah ?? '',
      },
      {
        scene_number: 3,
        duration_seconds: 7,
        purpose: 'Offer Demo',
        visual_direction: 'Product feature walkthrough / workflow animation',
        action: 'Talent tersenyum puas menunjukkan alur eksekusi cepat.',
        camera: 'Over-the-shoulder shot memperlihatkan kemudahan penggunaan fitur utama.',
        voiceover: script?.solusi ?? '',
        on_screen_text: script?.solusi ?? '',
      },
      {
        scene_number: 4,
        duration_seconds: 6,
        purpose: 'Decision CTA',
        visual_direction: 'Special offer card with call-to-action button highlight',
        action: 'Talent memberikan gestur menunjuk tombol CTA di layar dengan ramah.',
        camera: 'Static eye-level shot berpusat pada tombol penawaran dan brand logo.',
        voiceover: voiceoverCta,
        on_screen_text: voiceoverCta,
      },
    ];
  }

  if (stage === 'MOFU') {
    return [
      {
        scene_number: 1,
        duration_seconds: 5,
        purpose: 'Insight Hook',
        visual_direction: 'Screen capture / diagram highlight with bold text overlay',
        action: 'Talent terlihat penasaran dan sedikit reflektif saat menganalisis performa.',
        camera: 'Close-up vertikal, kamera sedikit handheld agar terasa natural.',
        voiceover: script?.hook ?? '',
        on_screen_text: script?.hook ?? '',
      },
      {
        scene_number: 2,
        duration_seconds: 7,
        purpose: 'Problem Breakdown',
        visual_direction: 'Side-by-side comparison diagram showing stagnant vs optimized funnel',
        action: 'Voiceover menjelaskan titik hambatan tanpa pergerakan berlebihan.',
        camera: 'Screen capture jernih dengan efek zoom halus pada grafik/diagram perbandingan.',
        voiceover: script?.masalah ?? '',
        on_screen_text: script?.masalah ?? '',
      },
      {
        scene_number: 3,
        duration_seconds: 8,
        purpose: 'Framework',
        visual_direction: 'Step-by-step checklist graphic',
        action: 'Talent memberikan penekanan verbal pada setiap poin framework.',
        camera: 'Tampilan vertikal bersih dengan animasi daftar checklist bergerak berurutan.',
        voiceover: script?.solusi ?? '',
        on_screen_text: script?.solusi ?? '',
      },
      {
        scene_number: 4,
        duration_seconds: 5,
        purpose: 'Checklist CTA',
        visual_direction: 'Interactive checklist badge with save prompt',
        action: 'Talent mengajak audiens menyimpan postingan secara ramah.',
        camera: 'Static vertical layout memperlihatkan ikon simpan dan panduan.',
        voiceover: voiceoverCta,
        on_screen_text: voiceoverCta,
      },
    ];
  }

  // Default: TOFU
  return [
    {
      scene_number: 1,
      duration_seconds: 5,
      purpose: 'Relatable Hook',
      visual_direction: 'Dynamic energetic opening visual with high contrast text overlay',
      action: 'Ekspresi ekspresif dan santai memicu rasa penasaran audiens.',
      camera: 'Medium shot casual vertikal, pencahayaan alami dari jendela.',
      voiceover: script?.hook ?? '',
      on_screen_text: script?.hook ?? '',
    },
    {
      scene_number: 2,
      duration_seconds: 7,
      purpose: 'Problem Awareness',
      visual_direction: 'Split screen or visual contrast illustrating the core friction',
      action: 'Talent menggambarkan rasa kewalahan saat membuat konten sehari-hari.',
      camera: 'Dynamic split-screen vertikal membandingkan dua situasi.',
      voiceover: script?.masalah ?? '',
      on_screen_text: script?.masalah ?? '',
    },
    {
      scene_number: 3,
      duration_seconds: 7,
      purpose: 'Light Insight',
      visual_direction: 'Clean graphic animation breaking down the single insight',
      action: 'Talent mengangguk yakin saat memberikan satu solusi sederhana.',
      camera: 'Close-up hangat dengan kedalaman bidang halus (bokeh).',
      voiceover: script?.solusi ?? '',
      on_screen_text: script?.solusi ?? '',
    },
    {
      scene_number: 4,
      duration_seconds: 6,
      purpose: 'Curiosity CTA',
      visual_direction: 'CTA screen with bookmark icon animation and brand watermark',
      action: 'Talent memberikan senyuman hangat dan isyarat menyimpan video.',
      camera: 'Static vertical frame fokus pada animasi ikon bookmark dan logo.',
      voiceover: voiceoverCta,
      on_screen_text: voiceoverCta,
    },
  ];
}

/**
 * Builds a VideoProductionCandidate from clean structured values.
 */
export function buildVideoProductionCandidate(params: {
  candidate_id: string;
  production_mode: 'ugc_video' | 'text_motion' | 'asset_product';
  objective: string;
  format?: string;
  hook: string;
  scenes: VideoSceneProductionPlan[];
  voiceover?: string;
  on_screen_text?: string;
  camera_direction?: string;
  motion_direction?: string;
  audio_direction?: string;
  branding?: string;
  negative_constraints?: string;
  final_prompt: string;
}): VideoProductionCandidate {
  const totalDuration = params.scenes.reduce((acc, s) => acc + s.duration_seconds, 0);
  const combinedVoiceover = params.voiceover ?? params.scenes.map((s) => s.voiceover).join(' ');
  const combinedOverlay = params.on_screen_text ?? params.scenes.map((s) => s.on_screen_text).join(' | ');

  return {
    candidate_type: 'video',
    candidate_id: params.candidate_id,
    production_mode: params.production_mode,
    production_details: {
      objective: params.objective,
      duration_seconds: totalDuration,
      format: params.format ?? '9:16 Vertical Video (Reels/TikTok/Shorts)',
      hook: params.hook,
      scenes: params.scenes,
      voiceover: combinedVoiceover,
      on_screen_text: combinedOverlay,
      camera_direction: params.camera_direction ?? params.scenes[0]?.camera ?? '',
      motion_direction: params.motion_direction ?? '',
      audio_direction: params.audio_direction ?? '',
      branding: params.branding ?? '',
      negative_constraints: params.negative_constraints ?? '',
    },
    final_prompt: params.final_prompt,
  };
}

