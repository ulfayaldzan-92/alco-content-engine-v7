export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';
export type SupportedChannel = 'instagram' | 'facebook';
export type PlanningHorizon = '7_days' | '14_days' | '30_days';

export type {
  FunnelStageType,
  FunnelStageStrategy,
  FunnelDistributionStrategy,
  FunnelStrategyProvenance,
  FunnelStrategy,
  CalendarPlanningContext,
} from './funnel-strategy';

export interface StrategyBlueprint {
  blueprint_type?: string;
  project_id?: string;
  project_name?: string;
  brand_identity?: {
    brand_name?: string;
    brand_summary?: string;
    category?: string;
  };
  brand_visual_identity?: {
    visual_style?: string;
    color_palette?: string | string[];
    typography_style?: string;
    image_style_rules?: string[];
    design_mood?: string;
    [key: string]: any;
  };
  target_audience?: {
    primary_audience?: string;
    audience_problem?: string[];
    audience_desire?: string[];
    objections?: string[];
  };
  positioning?: {
    core_positioning?: string;
    usp?: string[];
  };
  offer?: {
    main_offer?: string;
    offer_type?: string;
    offer_benefits?: string[];
  };
  messaging?: {
    core_message?: string;
    brand_voice?: string;
    copy_direction?: string[];
  };
  content_strategy?: {
    content_pillars?: string[];
    campaign_theme?: string;
    channel_notes?: string[];
  };
}

export interface ContextProvenance {
  brand_name?: 'IMPORTED' | 'EXTRACTED_FROM_SOURCE' | 'USER_PROVIDED' | 'MISSING';
  category?: 'IMPORTED' | 'EXTRACTED_FROM_SOURCE' | 'USER_PROVIDED' | 'MISSING';
  primary_audience?: 'IMPORTED' | 'EXTRACTED_FROM_SOURCE' | 'USER_PROVIDED' | 'MISSING';
  pain_points?: 'IMPORTED' | 'EXTRACTED_FROM_SOURCE' | 'USER_PROVIDED' | 'MISSING';
  positioning?: 'IMPORTED' | 'EXTRACTED_FROM_SOURCE' | 'USER_PROVIDED' | 'MISSING';
  main_offer?: 'IMPORTED' | 'EXTRACTED_FROM_SOURCE' | 'USER_PROVIDED' | 'MISSING';
  core_message?: 'IMPORTED' | 'EXTRACTED_FROM_SOURCE' | 'USER_PROVIDED' | 'MISSING';
}

export interface SharedContentContext {
  project_id: string;
  project_name: string;
  source: {
    origin: 'creative_system_json' | 'campaign_pack_converted' | 'paste_blueprint' | 'manual_context' | 'alco_ecosystem_blueprint';
    source_version?: string;
    import_note?: string;
    provenance?: ContextProvenance;
  };
  brand_context: {
    brand_name: string;
    category: string;
    brand_summary: string;
    brand_voice: string;
  };
  brand_visual_context?: {
    visual_style?: string;
    color_palette?: string | string[];
    typography_style?: string;
    image_style_rules?: string[];
    design_mood?: string;
  };
  audience_context: {
    primary_audience: string;
    pain_points: string[];
    desires: string[];
    objections: string[];
  };
  strategy_context: {
    positioning: string;
    usp: string[];
    main_offer: string;
    offer_benefits: string[];
    core_message: string;
    copy_direction: string[];
    content_pillars: string[];
  };
  system_flags: {
    is_complete_for_planning: boolean;
    missing_required_fields: string[];
    has_legacy_fallbacks?: boolean;
    legacy_fallback_warning?: string;
  };
}

export interface GenerateCalendarRequest {
  projectId?: string;
  coreTopic?: string;
  startDate?: string;
  skipDays?: string[];
  gender?: string;
  ageRange?: [number, number];
  ratio?: { tofu?: number; mofu?: number; bofu?: number };
  hasUserFunnelOverride?: boolean;
  userOverrides?: { tofu?: number; mofu?: number; bofu?: number };
  formats?: string[];
  carouselSlides?: number;
  reelsDuration?: string;
  selectedVoices?: string[];
  selectedFormula?: string;
  selectedCTAs?: string[];
  hookMix?: Array<{ type?: string; percentage?: number } | string>;
  referenceType?: string;
  isFastMode?: boolean;
  planningHorizon?: PlanningHorizon;
  channels?: SupportedChannel[];
  strategyBlueprint?: StrategyBlueprint;
  sharedContentContext?: SharedContentContext;
}

export interface ProductionProgress {
  briefReady?: boolean;       // Brief siap (default true saat konten dibuat)
  promptCopied?: boolean;     // Prompt disalin
  assetCreated?: boolean;     // Aset dibuat (manual checklist)
  captionCopied?: boolean;    // Caption disalin
  readyToPost?: boolean;      // Siap posting
  alreadyPosted?: boolean;    // Sudah diposting (manual checklist)
}

export type ProductionSummaryStatus = 'not_started' | 'in_production' | 'ready_to_post' | 'posted';

export function getProductionStatus(item?: ContentItem | null): ProductionSummaryStatus {
  if (!item) return 'not_started';
  const p = item.productionProgress;
  if (p?.alreadyPosted) return 'posted';
  if (p?.readyToPost) return 'ready_to_post';
  if (p?.promptCopied || p?.assetCreated || p?.captionCopied) return 'in_production';
  return 'not_started';
}

export function getProductionStatusBadge(status: ProductionSummaryStatus): {
  label: string;
  bgClass: string;
  dotClass: string;
} {
  switch (status) {
    case 'posted':
      return {
        label: 'Sudah diposting',
        bgClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
      };
    case 'ready_to_post':
      return {
        label: 'Siap posting',
        bgClass: 'bg-teal-100 text-teal-800 border-teal-200',
        dotClass: 'bg-teal-500',
      };
    case 'in_production':
      return {
        label: 'Sedang diproduksi',
        bgClass: 'bg-amber-100 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
      };
    case 'not_started':
    default:
      return {
        label: 'Belum mulai',
        bgClass: 'bg-stone-100 text-stone-600 border-stone-200',
        dotClass: 'bg-stone-400',
      };
  }
}

export interface ContentItem {
  no: number;
  content_item_id?: string;
  project_id?: string;
  projectId?: string;
  tanggal: string;
  jenis: string; // e.g. "TOFU (Awareness)", "MOFU (Consideration)", "BOFU (Conversion)"
  tujuan: string; // Daily strategic objective
  hookType: string;
  headline: string;
  body: string;
  caption: string;
  format: string; // Single, Carousel, Reels
  recommendedAssetTypes?: string[]; // e.g., ["image", "carousel", "video"]
  primaryAssetType?: string; // e.g., "video"
  assetTypeReason?: string; // strategic reasoning
  referensi: string;
  visual: string;
  keterangan: string; // Strategic reason for funnel placement
  channel?: string;
  cta?: string;
  isManualEdited?: boolean;
  carousel_plan?: CarouselPlan;
  productionProgress?: ProductionProgress;
}

export function ensureContentItemIdentity(
  item: ContentItem,
  projectId: string,
  itemNo?: number
): ContentItem {
  const no = item.no || itemNo || 1;
  const contentItemId = item.content_item_id || (item as any).contentItemId || `item_${projectId}_${no}`;
  return {
    ...item,
    project_id: item.project_id || item.projectId || projectId,
    content_item_id: contentItemId,
    no,
  };
}

export interface CarouselSlidePlan {
  slide: number;
  role:
    | 'hook'
    | 'recognition'
    | 'reframe'
    | 'mechanism'
    | 'insight'
    | 'framework'
    | 'proof'
    | 'cta'
    | 'custom'
    | string;
  communication_job: string;
  headline: string;
  body: string;
  swipe_bridge?: string;
  emotional_state?: string;
  visual_intent: string;
  visual_type?: 'scene' | 'diagram' | 'comparison' | 'checklist' | 'quote' | 'stat' | 'ui-mock' | 'custom' | string;
  text_zone?: string;
  negative_space_plan?: string;
  production_prompt?: string;
  slide_image_prompt?: string;
}

export interface CarouselPlan {
  content_goal: string;
  funnel_stage: string;
  current_belief: string;
  desired_belief: string;
  core_promise: string;
  primary_cta_type: 'save' | 'share' | 'comment' | 'follow' | 'click';
  primary_cta_text: string;
  slide_count: number;
  slide_count_reason: string;
  belief_journey_summary: string;
  visual_system_notes: string;
  slides: CarouselSlidePlan[];
}

export const horizonToCount: Record<PlanningHorizon, number> = {
  '7_days': 7,
  '14_days': 14,
  '30_days': 30,
};

export function inferPlanningHorizon(raw?: string): PlanningHorizon {
  if (raw === '7_days' || raw === '14_days' || raw === '30_days') {
    return raw;
  }
  return '30_days';
}

/**
 * Identifies known legacy fallback signatures that were previously generated by the application.
 */
export function detectLegacyFallbackSignatures(data: any): {
  hasLegacySignatures: boolean;
  detectedSignatures: string[];
} {
  if (!data || typeof data !== 'object') {
    return { hasLegacySignatures: false, detectedSignatures: [] };
  }

  const detected: string[] = [];

  const brandName = data.brand_identity?.brand_name || data.brand_context?.brand_name;
  if (brandName === 'ALCO Campaign Brand') {
    detected.push('Legacy Default Brand Name ("ALCO Campaign Brand")');
  }

  const category = data.brand_identity?.category || data.brand_context?.category;
  if (category === 'Software / Product Campaign') {
    detected.push('Legacy Default Category ("Software / Product Campaign")');
  }

  const audience = data.target_audience?.primary_audience || data.audience_context?.primary_audience;
  if (audience === 'Digital Marketer & Online Sellers') {
    detected.push('Legacy Default Audience ("Digital Marketer & Online Sellers")');
  }

  const brandVoice = data.messaging?.brand_voice || data.brand_context?.brand_voice;
  if (brandVoice === 'Direct, Practical, Urgent & Conversion-Focused') {
    detected.push('Legacy Default Brand Voice');
  }

  const problems = data.target_audience?.audience_problem || data.audience_context?.pain_points;
  if (Array.isArray(problems) && problems.length === 2 && 
      problems[0] === 'Kesulitan mengeksekusi campaign beriklan' && 
      problems[1] === 'Takut boncos karena tidak punya struktur iklan terarah') {
    detected.push('Legacy Default Pain Points');
  }

  const objections = data.target_audience?.objections || data.audience_context?.objections;
  if (Array.isArray(objections) && objections.length === 2 &&
      objections[0] === 'Apakah cara ini cocok untuk pemula?' &&
      objections[1] === 'Apakah hasilnya terbukti instan?') {
    detected.push('Legacy Default Objections');
  }

  const pillars = data.content_strategy?.content_pillars || data.strategy_context?.content_pillars;
  if (Array.isArray(pillars)) {
    if (pillars.length === 4 &&
        pillars[0] === 'Problem Awareness & Education' &&
        pillars[1] === 'Authority & Social Proof' &&
        pillars[2] === 'Offer Clarification & Objection Handling' &&
        pillars[3] === 'Direct Conversion Triggers') {
      detected.push('Legacy Default Content Pillars');
    } else if (pillars.length === 3 &&
        pillars[0] === 'TOFU: Problem Awareness & Visual Hooks' &&
        pillars[1] === 'MOFU: Creative Strategy Demo & Value Proposition' &&
        pillars[2] === 'BOFU: Direct Offer, Ad Assets & Conversion CTA') {
      detected.push('Legacy Default Campaign Content Pillars');
    }
  }

  return {
    hasLegacySignatures: detected.length > 0,
    detectedSignatures: detected,
  };
}

/**
 * Creates a clean, empty StrategyBlueprint for new manual projects or empty state without any synthetic assumptions.
 */
export function createEmptyStrategyBlueprint(projectId?: string, projectName?: string): StrategyBlueprint {
  const pid = projectId || `proj_${Date.now()}`;
  return {
    blueprint_type: 'manual_blueprint',
    project_id: pid,
    project_name: projectName || '',
    brand_identity: {
      brand_name: '',
      brand_summary: '',
      category: '',
    },
    target_audience: {
      primary_audience: '',
      audience_problem: [],
      audience_desire: [],
      objections: [],
    },
    positioning: {
      core_positioning: '',
      usp: [],
    },
    offer: {
      main_offer: '',
      offer_type: '',
      offer_benefits: [],
    },
    messaging: {
      core_message: '',
      brand_voice: '',
      copy_direction: [],
    },
    content_strategy: {
      content_pillars: [],
      campaign_theme: '',
      channel_notes: [],
    },
  };
}

/**
 * Validates a StrategyBlueprint against mandatory contract fields.
 */
export function validateBlueprint(blueprint: StrategyBlueprint): {
  isComplete: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];

  const brandName = blueprint.brand_identity?.brand_name?.trim();
  if (!brandName || brandName === 'ALCO Campaign Brand') {
    missing.push('Brand Name (brand_identity.brand_name)');
  }
  const primaryAudience = blueprint.target_audience?.primary_audience?.trim();
  if (!primaryAudience || primaryAudience === 'Digital Marketer & Online Sellers') {
    missing.push('Primary Audience (target_audience.primary_audience)');
  }
  const problems = blueprint.target_audience?.audience_problem;
  const hasRealProblem = Array.isArray(problems) && problems.some(
    p => p && typeof p === 'string' && p.trim() &&
    p !== 'Kesulitan mengeksekusi campaign beriklan' &&
    p !== 'Takut boncos karena tidak punya struktur iklan terarah'
  );
  if (!hasRealProblem) {
    missing.push('Audience Pain Points (target_audience.audience_problem)');
  }
  const corePositioning = blueprint.positioning?.core_positioning?.trim();
  const uspList = blueprint.positioning?.usp;
  const hasUsp = Array.isArray(uspList) && uspList.some(u => u && typeof u === 'string' && u.trim());
  if (!corePositioning && !hasUsp) {
    missing.push('Core Positioning or USP (positioning.core_positioning)');
  }
  const mainOffer = blueprint.offer?.main_offer?.trim();
  if (!mainOffer) {
    missing.push('Main Offer (offer.main_offer)');
  }
  const coreMessage = blueprint.messaging?.core_message?.trim();
  if (!coreMessage) {
    missing.push('Core Message (messaging.core_message)');
  }

  return {
    isComplete: missing.length === 0,
    missingFields: missing,
  };
}

export interface CharacterDNA {
  character_id: string;
  project_id: string;
  source_item_key?: string;

  reference_images: string[];
  preview_image?: string;
  additional_instructions?: string;

  identity: {
    display_name: string;
    gender_presentation?: string;
    estimated_age_range?: string;
    ethnicity_or_region_hint?: string;
    body_type?: string;
    facial_features?: string;
    hair_description?: string;
    skin_tone?: string;
    distinctive_characteristics?: string;
  };

  style: {
    wardrobe_style?: string;
    accessories?: string[];
    makeup_style?: string;
    visual_vibe?: string;
    brand_fit_reason?: string;
  };

  behavior: {
    speaking_tone?: string;
    expression_style?: string;
    pose_tendency?: string;
    gesture_style?: string;
    on_camera_persona?: string;
  };

  consistency_rules: {
    locked_traits: string[];
    avoid_traits: string[];
    continuity_notes?: string[];
  };

  prompt_assets: {
    dna_summary_prompt: string;
    locked_visual_prompt: string;
    preview_generation_prompt: string;
    scene_reuse_prompt_template: string;
  };

  timestamps: {
    created_at: string;
    updated_at: string;
  };
}

/**
 * Checks if a given raw JSON object resembles an ALCO Creative System Campaign Pack (e.g. Meta Ads campaign pack)
 * rather than a clean Strategy Blueprint.
 */
export function isCampaignPackJson(json: any): boolean {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false;

  // If it already contains explicit blueprint root keys, it's a standard blueprint
  if (json.brand_identity || json.target_audience || json.positioning || json.offer || json.messaging) {
    return false;
  }

  // Check for campaign pack signature fields
  return Boolean(
    json.campaignName ||
    json.campaign_name ||
    json.creative_strategy ||
    json.copy_assets ||
    json.image_ads ||
    json.carousel_ads ||
    json.video_ads ||
    json.targeting ||
    json.budget_recommendation
  );
}

export interface IntakeParseResult {
  blueprint: StrategyBlueprint;
  isConverted: boolean;
  conversionType: 'campaign_pack' | 'blueprint_json' | 'partial_json' | 'alco_ecosystem_blueprint';
  conversionNote: string;
}

/**
 * Maps a Campaign Pack JSON structure from ALCO Creative System into a normalized StrategyBlueprint.
 * Follows strict conservative mapping: never synthesizes or invents missing strategic business facts.
 */
export function mapCampaignPackToBlueprint(cp: any): IntakeParseResult {
  if (!isCampaignPackJson(cp)) {
    return {
      blueprint: cp as StrategyBlueprint,
      isConverted: false,
      conversionType: 'blueprint_json',
      conversionNote: 'Standard Strategy Blueprint JSON',
    };
  }

  const campaignName = cp.campaignName || cp.campaign_name || '';

  // 1. BRAND IDENTITY
  let brandName = cp.brand_identity?.brand_name || cp.brandName || '';
  if (!brandName && campaignName) {
    brandName = campaignName.replace(/^(Meta\s*Ads\s*[-–—]?\s*)/i, '').trim();
  }

  let category = cp.brand_identity?.category || '';
  if (!category && Array.isArray(cp.targeting?.interests) && cp.targeting.interests.length > 0) {
    category = String(cp.targeting.interests[0]);
  }
  if (!category && cp.creative_strategy?.primary_angle) {
    category = cp.creative_strategy.primary_angle;
  }

  let brandSummary = cp.brand_identity?.brand_summary || '';
  if (!brandSummary && cp.creative_strategy?.value_proposition) {
    brandSummary = cp.creative_strategy.value_proposition;
  }

  // 2. TARGET AUDIENCE
  let primaryAudience = cp.target_audience?.primary_audience || '';
  if (!primaryAudience) {
    const parts: string[] = [];
    if (Array.isArray(cp.targeting?.interests) && cp.targeting.interests.length > 0) {
      parts.push(cp.targeting.interests.join(', '));
    }
    if (cp.targeting?.ageMin || cp.targeting?.ageMax) {
      parts.push(`Usia ${cp.targeting.ageMin || 20}-${cp.targeting.ageMax || 45} tahun`);
    }
    if (Array.isArray(cp.video_ads) && cp.video_ads[0]?.persona) {
      parts.push(cp.video_ads[0].persona);
    }
    primaryAudience = parts.length > 0 ? parts.join(' | ') : '';
  }

  let audienceProblem: string[] = cp.target_audience?.audience_problem || [];
  if (!audienceProblem || audienceProblem.length === 0) {
    const extracted: string[] = [];
    if (Array.isArray(cp.copy_assets?.hooks)) {
      cp.copy_assets.hooks.forEach((h: any) => {
        const text = typeof h === 'string' ? h : h?.text;
        if (text) extracted.push(text);
      });
    }
    if (cp.creative_strategy?.emotional_trigger) {
      extracted.push(`Emotional Trigger: ${cp.creative_strategy.emotional_trigger}`);
    }
    if (Array.isArray(cp.video_ads)) {
      cp.video_ads.forEach((v: any) => {
        if (v.hook_script) extracted.push(v.hook_script);
      });
    }
    if (Array.isArray(cp.assumptions)) {
      cp.assumptions.forEach((a: any) => {
        if (typeof a === 'string') extracted.push(a);
      });
    }
    audienceProblem = Array.from(new Set(extracted)).slice(0, 4);
  }

  let audienceDesire: string[] = cp.target_audience?.audience_desire || [];
  if (!audienceDesire || audienceDesire.length === 0) {
    const extracted: string[] = [];
    if (cp.creative_strategy?.value_proposition) {
      extracted.push(cp.creative_strategy.value_proposition);
    }
    if (Array.isArray(cp.copy_assets?.headlines)) {
      cp.copy_assets.headlines.forEach((hl: any) => {
        const text = typeof hl === 'string' ? hl : hl?.text;
        if (text) extracted.push(text);
      });
    }
    audienceDesire = Array.from(new Set(extracted)).slice(0, 3);
  }

  let objections: string[] = cp.target_audience?.objections || [];
  if (!objections || objections.length === 0) {
    if (Array.isArray(cp.assumptions) && cp.assumptions.length > 0) {
      objections = cp.assumptions.slice(0, 2);
    }
  }

  // 3. POSITIONING
  let corePositioning = cp.positioning?.core_positioning || '';
  if (!corePositioning && cp.creative_strategy?.value_proposition) {
    corePositioning = cp.creative_strategy.value_proposition;
  }

  let usp: string[] = cp.positioning?.usp || [];
  if (!usp || usp.length === 0) {
    const extracted: string[] = [];
    if (cp.creative_strategy?.value_proposition) extracted.push(cp.creative_strategy.value_proposition);
    if (cp.creative_strategy?.visual_hook) extracted.push(`Visual Hook: ${cp.creative_strategy.visual_hook}`);
    if (Array.isArray(cp.copy_assets?.headlines) && cp.copy_assets.headlines[0]) {
      const text = typeof cp.copy_assets.headlines[0] === 'string' ? cp.copy_assets.headlines[0] : cp.copy_assets.headlines[0]?.text;
      if (text) extracted.push(text);
    }
    usp = Array.from(new Set(extracted)).slice(0, 3);
  }

  // 4. OFFER
  let mainOffer = cp.offer?.main_offer || cp.offer?.offer_name || '';
  let offerType = cp.offer?.offer_type || '';
  let offerBenefits: string[] = cp.offer?.offer_benefits || [];
  if (!offerBenefits || offerBenefits.length === 0) {
    if (cp.creative_strategy?.value_proposition) offerBenefits.push(cp.creative_strategy.value_proposition);
    if (Array.isArray(cp.copy_assets?.headlines)) {
      cp.copy_assets.headlines.slice(0, 2).forEach((h: any) => {
        const text = typeof h === 'string' ? h : h?.text;
        if (text) offerBenefits.push(text);
      });
    }
  }

  // 5. MESSAGING
  let coreMessage = cp.messaging?.core_message || '';
  if (!coreMessage && Array.isArray(cp.copy_assets?.headlines) && cp.copy_assets.headlines[0]) {
    coreMessage = typeof cp.copy_assets.headlines[0] === 'string' ? cp.copy_assets.headlines[0] : cp.copy_assets.headlines[0]?.text || '';
  }
  if (!coreMessage && cp.creative_strategy?.primary_angle) {
    coreMessage = `Fokus pada ${cp.creative_strategy.primary_angle}`;
  }

  let brandVoice = cp.messaging?.brand_voice || '';
  if (!brandVoice && cp.creative_strategy?.emotional_trigger) {
    brandVoice = `Emotional Trigger: ${cp.creative_strategy.emotional_trigger}`;
  }

  let copyDirection: string[] = cp.messaging?.copy_direction || [];
  if (!copyDirection || copyDirection.length === 0) {
    const directions: string[] = [];
    if (Array.isArray(cp.copy_assets?.hooks) && cp.copy_assets.hooks.length > 0) {
      const text = typeof cp.copy_assets.hooks[0] === 'string' ? cp.copy_assets.hooks[0] : cp.copy_assets.hooks[0]?.text;
      if (text) directions.push(`Hook Angle: ${text}`);
    }
    if (cp.creative_strategy?.emotional_trigger) {
      directions.push(`Trigger: ${cp.creative_strategy.emotional_trigger}`);
    }
    if (Array.isArray(cp.copy_assets?.ctas) && cp.copy_assets.length > 0) {
      const text = typeof cp.copy_assets.ctas[0] === 'string' ? cp.copy_assets.ctas[0] : cp.copy_assets.ctas[0]?.text;
      if (text) directions.push(`CTA: ${text}`);
    }
    copyDirection = directions;
  }

  // 6. CONTENT STRATEGY
  let contentPillars: string[] = cp.content_strategy?.content_pillars || [];

  const mappedBlueprint: StrategyBlueprint = {
    project_id: cp.project_id || `campaign_pack_${Date.now()}`,
    project_name: campaignName || brandName || 'Campaign Pack Project',
    brand_identity: {
      brand_name: brandName,
      brand_summary: brandSummary,
      category,
    },
    target_audience: {
      primary_audience: primaryAudience,
      audience_problem: audienceProblem,
      audience_desire: audienceDesire,
      objections,
    },
    positioning: {
      core_positioning: corePositioning,
      usp,
    },
    offer: {
      main_offer: mainOffer,
      offer_type: offerType,
      offer_benefits: offerBenefits,
    },
    messaging: {
      core_message: coreMessage,
      brand_voice: brandVoice,
      copy_direction: copyDirection,
    },
    content_strategy: {
      content_pillars: contentPillars,
      campaign_theme: campaignName || '',
      channel_notes: cp.targeting ? ['Meta Ads (Instagram & Facebook)'] : [],
    },
  };

  return {
    blueprint: mappedBlueprint,
    isConverted: true,
    conversionType: 'campaign_pack',
    conversionNote: 'Imported as Campaign Pack -> Mapped into Content Context',
  };
}

/**
 * Universal JSON intake function for both standard Strategy Blueprints & Campaign Packs.
 */
export function parseAndMapStrategyJson(rawJson: any): IntakeParseResult {
  if (!rawJson || typeof rawJson !== 'object' || Array.isArray(rawJson)) {
    return {
      blueprint: rawJson as StrategyBlueprint,
      isConverted: false,
      conversionType: 'blueprint_json',
      conversionNote: 'Invalid JSON format',
    };
  }

  // Task 1 & 5: Check if alco_ecosystem_blueprint or has brand_visual_identity (do not use campaign pack as primary source)
  if (rawJson.blueprint_type === 'alco_ecosystem_blueprint' || rawJson.brand_visual_identity) {
    const blueprint = rawJson as StrategyBlueprint;
    return {
      blueprint,
      isConverted: false,
      conversionType: 'alco_ecosystem_blueprint',
      conversionNote: 'Blueprint ALCO berhasil dibaca',
    };
  }

  if (isCampaignPackJson(rawJson)) {
    return mapCampaignPackToBlueprint(rawJson);
  }

  const blueprint = rawJson as StrategyBlueprint;
  return {
    blueprint,
    isConverted: false,
    conversionType: 'blueprint_json',
    conversionNote: 'Blueprint ALCO berhasil dibaca',
  };
}

export function validateProductionGenerationContext(
  activeProjectId: string | null,
  sharedContentContext: SharedContentContext | null,
  selectedContentItem: ContentItem | null
): { valid: boolean; reason?: string } {
  if (!activeProjectId || !activeProjectId.trim() || activeProjectId === 'default' || activeProjectId === 'default_project') {
    return { valid: false, reason: 'Pilih project aktif terlebih dahulu sebelum memproduksi konten.' };
  }
  if (!sharedContentContext || !sharedContentContext.brand_context?.brand_name?.trim()) {
    return { valid: false, reason: 'Data project tidak sinkron. Muat ulang project sebelum melanjutkan.' };
  }
  if (sharedContentContext.project_id !== activeProjectId) {
    return { valid: false, reason: 'Data project tidak sinkron. Muat ulang project sebelum melanjutkan.' };
  }
  if (!selectedContentItem) {
    return { valid: false, reason: 'Pilih item konten kalender sebelum melakukan generate.' };
  }
  const itemProjId = selectedContentItem.project_id || selectedContentItem.projectId;
  if (itemProjId && itemProjId !== activeProjectId) {
    return { valid: false, reason: 'Data project tidak sinkron. Muat ulang project sebelum melanjutkan.' };
  }
  return { valid: true };
}

/**
 * Converts a raw StrategyBlueprint into a normalized SharedContentContext.
 */
export function buildSharedContentContext(
  blueprint: StrategyBlueprint,
  origin: 'creative_system_json' | 'campaign_pack_converted' | 'paste_blueprint' | 'manual_context' | 'alco_ecosystem_blueprint' = 'creative_system_json',
  importNote?: string
): SharedContentContext {
  const validation = validateBlueprint(blueprint);
  const legacyCheck = detectLegacyFallbackSignatures(blueprint);
  const isAlco = blueprint.blueprint_type === 'alco_ecosystem_blueprint' || Boolean(blueprint.brand_visual_identity);
  const note = importNote || (isAlco ? 'Blueprint ALCO berhasil dibaca' : 'Direct Strategy Blueprint JSON');

  const provenanceOrigin = origin === 'campaign_pack_converted' ? 'EXTRACTED_FROM_SOURCE' : (origin === 'manual_context' ? 'USER_PROVIDED' : 'IMPORTED');

  return {
    project_id: blueprint.project_id || `proj_${Date.now()}`,
    project_name: blueprint.project_name || blueprint.brand_identity?.brand_name || '',
    source: {
      origin: isAlco ? 'alco_ecosystem_blueprint' : origin,
      source_version: '1.0.0',
      import_note: note,
      provenance: {
        brand_name: blueprint.brand_identity?.brand_name?.trim() ? provenanceOrigin : 'MISSING',
        category: blueprint.brand_identity?.category?.trim() ? provenanceOrigin : 'MISSING',
        primary_audience: blueprint.target_audience?.primary_audience?.trim() ? provenanceOrigin : 'MISSING',
        pain_points: (blueprint.target_audience?.audience_problem && blueprint.target_audience.audience_problem.length > 0) ? provenanceOrigin : 'MISSING',
        positioning: (blueprint.positioning?.core_positioning?.trim() || (blueprint.positioning?.usp && blueprint.positioning.usp.length > 0)) ? provenanceOrigin : 'MISSING',
        main_offer: blueprint.offer?.main_offer?.trim() ? provenanceOrigin : 'MISSING',
        core_message: blueprint.messaging?.core_message?.trim() ? provenanceOrigin : 'MISSING',
      },
    },
    brand_context: {
      brand_name: blueprint.brand_identity?.brand_name || '',
      category: blueprint.brand_identity?.category || '',
      brand_summary: blueprint.brand_identity?.brand_summary || '',
      brand_voice: blueprint.messaging?.brand_voice || '',
    },
    brand_visual_context: blueprint.brand_visual_identity ? {
      visual_style: blueprint.brand_visual_identity.visual_style,
      color_palette: blueprint.brand_visual_identity.color_palette,
      typography_style: blueprint.brand_visual_identity.typography_style,
      image_style_rules: blueprint.brand_visual_identity.image_style_rules,
      design_mood: blueprint.brand_visual_identity.design_mood,
    } : undefined,
    audience_context: {
      primary_audience: blueprint.target_audience?.primary_audience || '',
      pain_points: blueprint.target_audience?.audience_problem || [],
      desires: blueprint.target_audience?.audience_desire || [],
      objections: blueprint.target_audience?.objections || [],
    },
    strategy_context: {
      positioning: blueprint.positioning?.core_positioning || '',
      usp: blueprint.positioning?.usp || [],
      main_offer: blueprint.offer?.main_offer || '',
      offer_benefits: blueprint.offer?.offer_benefits || [],
      core_message: blueprint.messaging?.core_message || '',
      copy_direction: blueprint.messaging?.copy_direction || [],
      content_pillars: blueprint.content_strategy?.content_pillars || [],
    },
    system_flags: {
      is_complete_for_planning: validation.isComplete,
      missing_required_fields: validation.missingFields,
      has_legacy_fallbacks: legacyCheck.hasLegacySignatures,
      legacy_fallback_warning: legacyCheck.hasLegacySignatures ? 'Konteks terdeteksi mengandung nilai default lama. Disarankan untuk meninjau atau mengimpor ulang data strategi.' : undefined,
    },
  };
}

/**
 * Default sample strategy blueprint from ALCO Creative System for 1-click testing
 */
export const SAMPLE_STRATEGY_BLUEPRINT: StrategyBlueprint = {
  project_id: 'alco_creative_sys_001',
  project_name: 'Alco Academy Digital Course Launch',
  brand_identity: {
    brand_name: 'ALCO Media & Academy',
    brand_summary: 'Platform edukasi & software otomasi pemasaran konten untuk pemilik bisnis kecil dan digital marketer.',
    category: 'SaaS & Digital Education',
  },
  target_audience: {
    primary_audience: 'Pemilik bisnis online & Digital Marketer pemula (Usia 22-40 th)',
    audience_problem: [
      'Bingung membuat konten harian yang konsisten dan menghasilkan penjualan',
      'Konten terasa generik dan tidak mempunyai tujuan funnel yang jelas',
      'Menghabiskan waktu berjam-jam hanya untuk menentukan topik postingan hari ini',
    ],
    audience_desire: [
      'Mempunyai kalender konten otomatis yang tersinkronisasi dengan strategi penjualan',
      'Meningkatkan omset dari Instagram & Facebook tanpa iklan berbayar mahal',
      'Proses produksi konten beres dalam 15 menit per hari',
    ],
    objections: [
      'Apakah cara ini rumit diterapkan untuk orang awam?',
      'Apakah template kontennya sesuai dengan niche bisnis saya?',
    ],
  },
  positioning: {
    core_positioning: 'Satu-satunya Content Operating System berbasis Strategy-First yang menerjemahkan ide bisnis menjadi kalender & draft konten penjualan harian.',
    usp: [
      'Bukan sekadar AI generator caption biasa, tapi Content Engine berlandaskan Marketing Funnel (TOFU, MOFU, BOFU)',
      'Preserve manual edits: AI tidak menimpa editan user secara sepihak',
      'Terintegrasi langsung dari ALCO Creative System blueprint',
    ],
  },
  offer: {
    main_offer: 'Akses ALCO Content Engine Lifetime Pass + Playbook Strategy Blueprint 2026',
    offer_type: 'Digital Product & Software Access',
    offer_benefits: [
      'Hemat 10+ jam per minggu untuk perencanaan konten',
      'Draft caption, visual prompt, dan brief harian langsung siap pakai',
      'Sistem evaluasi funnel otomatis agar konten selalu mengarah ke closing',
    ],
  },
  messaging: {
    core_message: 'Jangan buat konten dari nol, buat konten dari strategi bisnis yang sudah teruji.',
    brand_voice: 'Empati, Praktis, Direct, dan Berorientasi pada Hasil Penjualan',
    copy_direction: [
      'Gunakan pendekatan Hook kuat di 3 detik pertama (Call-out / Negativity bias / Curiosity gap)',
      'Tegaskan perbandingan antara cara lama (pikirkan ide dadakan) vs cara baru (sistematis berbasis funnel)',
      'Sertakan Soft CTA di TOFU/MOFU dan Hard Direct CTA di BOFU',
    ],
  },
  content_strategy: {
    content_pillars: [
      'TOFU: Mitos & Kesalahan Umum Pembuatan Konten',
      'MOFU: Bedah Strategi Funnel & Case Study Hasil Usaha',
      'BOFU: Demo Produk, Penawaran Spesial & Jaminan Hasil',
    ],
    campaign_theme: 'Transformasi dari Penulis Caption Biasa Menjadi Content Operating System',
    channel_notes: ['Instagram Reels & Carousel', 'Facebook Page Feed & Stories'],
  },
};
