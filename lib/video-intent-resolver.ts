import { ContentItem, SharedContentContext } from './content-contract';
import { FunnelStrategy } from './funnel-strategy';
import { VideoProductionMode } from './production-contract';

export interface VideoIntentDecision {
  recommended_mode: VideoProductionMode;
  recommendation_reason: string;
  required_inputs: string[];
  optional_inputs: string[];
}

export function getVideoProductionModeLabel(mode: VideoProductionMode): string {
  switch (mode) {
    case 'human_led':
      return 'Video dengan Talent';
    case 'product_demo':
      return 'Demo Produk / Aplikasi';
    case 'motion_explainer':
      return 'Video Penjelasan Visual';
  }
}

export function getVideoProductionModeDescription(mode: VideoProductionMode): string {
  switch (mode) {
    case 'human_led':
      return 'Talent menjelaskan pesan langsung ke audiens. Cocok untuk trust, edukasi, dan komunikasi personal.';
    case 'product_demo':
      return 'Menunjukkan produk, aplikasi, fitur, atau workflow secara langsung.';
    case 'motion_explainer':
      return 'Menjelaskan konsep, langkah, framework, data, atau checklist melalui visual dan motion.';
  }
}

export function resolveVideoIntent(params: {
  contentItem: ContentItem;
  sharedContext: SharedContentContext;
  funnelStrategy: FunnelStrategy;
}): VideoIntentDecision {
  const { contentItem, sharedContext, funnelStrategy } = params;

  // Symmetrical scan across actual strategy and content data
  const itemText = [
    contentItem.tujuan,
    contentItem.headline,
    contentItem.body,
    contentItem.visual,
    contentItem.keterangan,
    contentItem.cta,
    contentItem.format,
  ].filter(Boolean).join(' ').toLowerCase();

  const contextText = [
    sharedContext.strategy_context?.main_offer,
    sharedContext.strategy_context?.offer_benefits,
    sharedContext.strategy_context?.core_message,
    sharedContext.audience_context?.primary_audience,
    sharedContext.brand_context?.brand_name,
  ].filter(Boolean).join(' ').toLowerCase();

  const combinedText = `${itemText} ${contextText}`;

  // Deterministic checks
  // 1. Product Demo signals
  const productDemoKeywords = [
    'demo', 'aplikasi', 'fitur', 'produk', 'app', 'dashboard', 'screen', 'tampilan',
    'sistem', 'software', 'situs', 'website', 'interaktif', 'mockup', 'screenshot',
    'preview', 'uji coba', 'fitur utama', 'alur kerja', 'tombol', 'walkthrough'
  ];
  const hasProductDemoSignal = productDemoKeywords.some(keyword => combinedText.includes(keyword));

  // 2. Motion Explainer signals
  const motionExplainerKeywords = [
    'framework', 'tahap', 'langkah', 'step', 'proses', 'diagram', 'checklist',
    'matriks', 'formula', 'pola', 'kategori', 'perbandingan', 'studi kasus',
    'data', 'grafik', 'klasifikasi', '3 cara', '5 alur', '3 poin', '4 pilar',
    'edukasi', 'education', 'konsep', 'pembagian'
  ];
  const hasMotionExplainerSignal = motionExplainerKeywords.some(keyword => combinedText.includes(keyword));

  // Deterministic Priority:
  // - strong explicit product/demo signal -> product_demo
  // - strong framework/list/process signal -> motion_explainer
  // - otherwise -> human_led

  if (hasProductDemoSignal) {
    return {
      recommended_mode: 'product_demo',
      recommendation_reason: 'Konten ini akan lebih jelas jika audiens melihat langsung produk atau alur penggunaannya.',
      required_inputs: ['product_screenshot'],
      optional_inputs: ['logo', 'screen_recording']
    };
  }

  if (hasMotionExplainerSignal) {
    return {
      recommended_mode: 'motion_explainer',
      recommendation_reason: 'Konten berupa framework sehingga lebih mudah dipahami melalui visual, diagram, dan motion dibanding talent berbicara terus-menerus.',
      required_inputs: [],
      optional_inputs: ['brand_visual']
    };
  }

  // Fallback to human_led
  return {
    recommended_mode: 'human_led',
    recommendation_reason: 'Konten ini lebih kuat jika dijelaskan langsung oleh talent karena fokusnya membangun kedekatan dan kepercayaan audiens.',
    required_inputs: ['character'],
    optional_inputs: ['b_roll_visual']
  };
}
