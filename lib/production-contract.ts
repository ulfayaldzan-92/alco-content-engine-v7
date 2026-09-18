import { FunnelStage, parseStrictFunnelStage } from './funnel-rules';
import { SharedContentContext, ContentItem, ensureContentItemIdentity } from './content-contract';
import { FunnelStrategy } from './funnel-strategy';

export type ProductionAssetType = 'image' | 'carousel' | 'video';

export type ProductionStatus =
  | 'draft'
  | 'ready_for_production'
  | 'generating'
  | 'completed'
  | 'failed';

/**
 * Authoritative snapshot of strategy context at the time the production package is created.
 * Grounded strictly in SharedContentContext, FunnelStrategy, and ContentItem.
 * Zero fictional or generic business defaults.
 */
export interface ProductionStrategySnapshot {
  brand_name: string;
  category: string;
  primary_audience: string;
  positioning: string;
  main_offer: string;
  core_message: string;
  campaign_goal: string;
  funnel_stage: FunnelStage;
  funnel_objective: string;
  message_direction: string;
  cta_direction: string;
}

/**
 * Authoritative snapshot of ContentItem fields at the time the production package is created.
 */
export interface ProductionContentSnapshot {
  headline: string;
  body: string;
  caption: string;
  cta: string;
  visual_direction: string;
  content_format: string;
  strategic_objective: string;
  strategic_rationale: string;
}

/**
 * Optional brand visual guidance captured from project context.
 * Fields remain optional/empty if not declared in blueprint; never invented.
 */
export interface ProductionBrandVisualSnapshot {
  visual_style?: string;
  color_palette?: string | string[];
  typography_style?: string;
  image_style_rules?: string[];
  design_mood?: string;
}

/**
 * Base metadata and context snapshots shared by all production packages.
 */
export interface ProductionPackageBase {
  package_id: string;
  project_id: string;
  content_item_id: string;
  asset_type: ProductionAssetType;
  funnel_stage: FunnelStage;
  production_status: ProductionStatus;
  created_at: string;
  strategy_snapshot: ProductionStrategySnapshot;
  content_snapshot: ProductionContentSnapshot;
  brand_visual_snapshot?: ProductionBrandVisualSnapshot;
}

/**
 * Production details for single image assets.
 */
export interface ImageProductionDetails {
  objective: string;
  scene: string;
  subject: string;
  composition: string;
  environment: string;
  lighting: string;
  camera_direction: string;
  visual_style: string;
  text_overlay: string;
  branding: string;
  negative_constraints: string;
}

export interface ImageProductionPackage extends ProductionPackageBase {
  asset_type: 'image';
  image: ImageProductionDetails;
  final_prompt: string;
}

/**
 * Production details for each slide in a carousel asset.
 */
export interface CarouselSlideProductionPlan {
  slide_number: number;
  role: string;
  headline: string;
  body: string;
  visual_direction: string;
  layout_direction: string;
}

export interface CarouselFinalPrompts {
  master_prompt: string;
  slides: {
    slide_number: number;
    prompt: string;
  }[];
}

export interface CarouselProductionDetails {
  objective: string;
  slide_count: number;
  cover_direction: string;
  slides: CarouselSlideProductionPlan[];
  visual_continuity: string;
  branding: string;
  negative_constraints: string;
}

export interface CarouselProductionPackage extends ProductionPackageBase {
  asset_type: 'carousel';
  carousel: CarouselProductionDetails;
  final_prompts: CarouselFinalPrompts;
  final_prompt?: string;
}

/**
 * Production details for each scene in a video / UGC asset.
 */
export interface VideoSceneProductionPlan {
  scene_number: number;
  duration_seconds: number;
  purpose: string;
  visual_direction: string;
  action: string;
  camera: string;
  voiceover: string;
  on_screen_text: string;
}

export interface VideoProductionDetails {
  objective: string;
  duration_seconds: number;
  format: string;
  hook: string;
  scenes: VideoSceneProductionPlan[];
  voiceover: string;
  on_screen_text: string;
  camera_direction: string;
  motion_direction: string;
  audio_direction: string;
  branding: string;
  negative_constraints: string;
}

export interface VideoProductionPackage extends ProductionPackageBase {
  asset_type: 'video';
  video: VideoProductionDetails;
  final_prompt: string;
}

/**
 * Discriminated union of all authoritative production packages.
 */
export type ProductionPackage =
  | ImageProductionPackage
  | CarouselProductionPackage
  | VideoProductionPackage;

/**
 * Pure validation contract for ProductionPackage.
 * Fail-closed: returns { isValid: false, error: ... } for any incomplete or invalid payload.
 */
export function validateProductionPackage(pkg: any): { isValid: boolean; error?: string } {
  if (!pkg || typeof pkg !== 'object' || pkg === null) {
    return { isValid: false, error: 'Production package must be a valid non-null object.' };
  }

  // 1. Basic identifiers
  if (typeof pkg.package_id !== 'string' || !pkg.package_id.trim()) {
    return { isValid: false, error: 'Missing or invalid package_id in production package.' };
  }
  if (typeof pkg.project_id !== 'string' || !pkg.project_id.trim()) {
    return { isValid: false, error: 'Missing or invalid project_id in production package.' };
  }
  if (typeof pkg.content_item_id !== 'string' || !pkg.content_item_id.trim()) {
    return { isValid: false, error: 'Missing or invalid content_item_id in production package.' };
  }

  // 2. Asset Type
  const validAssetTypes: ProductionAssetType[] = ['image', 'carousel', 'video'];
  if (!validAssetTypes.includes(pkg.asset_type)) {
    return {
      isValid: false,
      error: `Invalid asset_type "${pkg.asset_type}". Must be one of: ${validAssetTypes.join(', ')}.`,
    };
  }

  // 3. Strict Funnel Stage
  const parsedStage = parseStrictFunnelStage(pkg.funnel_stage);
  if (!parsedStage) {
    return {
      isValid: false,
      error: `Invalid or unparseable funnel_stage "${pkg.funnel_stage}". Must be TOFU, MOFU, or BOFU.`,
    };
  }

  // 4. Production status
  const validStatuses: ProductionStatus[] = [
    'draft',
    'ready_for_production',
    'generating',
    'completed',
    'failed',
  ];
  if (!validStatuses.includes(pkg.production_status)) {
    return {
      isValid: false,
      error: `Invalid production_status "${pkg.production_status}". Must be one of: ${validStatuses.join(', ')}.`,
    };
  }

  // 5. Created at
  if (typeof pkg.created_at !== 'string' || !pkg.created_at.trim()) {
    return { isValid: false, error: 'Missing or invalid created_at in production package.' };
  }

  // 6. Strategy Snapshot
  const strat = pkg.strategy_snapshot;
  if (!strat || typeof strat !== 'object') {
    return { isValid: false, error: 'Missing strategy_snapshot in production package.' };
  }
  const requiredStratFields: (keyof ProductionStrategySnapshot)[] = [
    'brand_name',
    'core_message',
    'campaign_goal',
    'funnel_stage',
    'funnel_objective',
    'message_direction',
    'cta_direction',
  ];
  for (const field of requiredStratFields) {
    if (typeof strat[field] !== 'string' || !(strat[field] as string).trim()) {
      return {
        isValid: false,
        error: `strategy_snapshot.${field} must be a non-empty string.`,
      };
    }
  }
  const stratStage = parseStrictFunnelStage(strat.funnel_stage);
  if (!stratStage || stratStage !== parsedStage) {
    return {
      isValid: false,
      error: `strategy_snapshot.funnel_stage (${strat.funnel_stage}) mismatch with package funnel_stage (${pkg.funnel_stage}).`,
    };
  }

  // 7. Content Snapshot
  const content = pkg.content_snapshot;
  if (!content || typeof content !== 'object') {
    return { isValid: false, error: 'Missing content_snapshot in production package.' };
  }
  const requiredContentFields: (keyof ProductionContentSnapshot)[] = [
    'headline',
    'body',
    'caption',
    'visual_direction',
    'content_format',
    'strategic_objective',
    'strategic_rationale',
  ];
  for (const field of requiredContentFields) {
    if (typeof content[field] !== 'string' || !(content[field] as string).trim()) {
      return {
        isValid: false,
        error: `content_snapshot.${field} must be a non-empty string.`,
      };
    }
  }

  // 8. Asset-specific validation
  if (pkg.asset_type === 'image') {
    const imgPkg = pkg as ImageProductionPackage;
    if (!imgPkg.image || typeof imgPkg.image !== 'object') {
      return { isValid: false, error: 'Missing image production details in ImageProductionPackage.' };
    }
    const requiredImageFields: (keyof ImageProductionDetails)[] = [
      'objective',
      'scene',
      'subject',
      'composition',
      'visual_style',
      'negative_constraints',
    ];
    for (const field of requiredImageFields) {
      if (typeof imgPkg.image[field] !== 'string' || !imgPkg.image[field].trim()) {
        return {
          isValid: false,
          error: `image.${field} must be a non-empty string in ImageProductionPackage.`,
        };
      }
    }
    if (typeof imgPkg.final_prompt !== 'string' || !imgPkg.final_prompt.trim()) {
      return { isValid: false, error: 'Missing or empty final_prompt in ImageProductionPackage.' };
    }
    return { isValid: true };
  }

  if (pkg.asset_type === 'carousel') {
    const carPkg = pkg as CarouselProductionPackage;
    if (!carPkg.carousel || typeof carPkg.carousel !== 'object') {
      return { isValid: false, error: 'Missing carousel production details in CarouselProductionPackage.' };
    }
    if (typeof carPkg.carousel.slide_count !== 'number' || carPkg.carousel.slide_count <= 0) {
      return {
        isValid: false,
        error: 'Carousel slide_count must be a positive number greater than 0.',
      };
    }
    if (!Array.isArray(carPkg.carousel.slides) || carPkg.carousel.slides.length !== carPkg.carousel.slide_count) {
      return {
        isValid: false,
        error: `Carousel slide_count (${carPkg.carousel.slide_count}) does not match slides array length (${carPkg.carousel?.slides?.length ?? 0}).`,
      };
    }

    const seenSlideNumbers = new Set<number>();
    for (let i = 0; i < carPkg.carousel.slides.length; i++) {
      const slide = carPkg.carousel.slides[i];
      if (!slide || typeof slide !== 'object') {
        return { isValid: false, error: `carousel.slides[${i}] must be a non-null object.` };
      }
      if (typeof slide.slide_number !== 'number' || !Number.isInteger(slide.slide_number) || slide.slide_number < 1) {
        return {
          isValid: false,
          error: `carousel.slides[${i}].slide_number must be an integer >= 1.`,
        };
      }
      if (seenSlideNumbers.has(slide.slide_number)) {
        return {
          isValid: false,
          error: `Duplicate slide_number ${slide.slide_number} detected in carousel.slides.`,
        };
      }
      seenSlideNumbers.add(slide.slide_number);

      const requiredSlideFields: (keyof CarouselSlideProductionPlan)[] = [
        'role',
        'headline',
        'body',
        'visual_direction',
        'layout_direction',
      ];
      for (const field of requiredSlideFields) {
        if (typeof slide[field] !== 'string' || !(slide[field] as string).trim()) {
          return {
            isValid: false,
            error: `carousel.slides[${i}].${field} must be a non-empty string.`,
          };
        }
      }
    }

    // Final prompts validation
    const hasFinalPrompts =
      carPkg.final_prompts &&
      typeof carPkg.final_prompts === 'object';

    if (hasFinalPrompts) {
      if (
        typeof carPkg.final_prompts.master_prompt !== 'string' ||
        !carPkg.final_prompts.master_prompt.trim()
      ) {
        return {
          isValid: false,
          error: 'final_prompts.master_prompt must be a non-empty string.',
        };
      }
      if (
        !Array.isArray(carPkg.final_prompts.slides) ||
        carPkg.final_prompts.slides.length !== carPkg.carousel.slide_count
      ) {
        return {
          isValid: false,
          error: `final_prompts.slides length (${carPkg.final_prompts?.slides?.length ?? 0}) must equal carousel.slide_count (${carPkg.carousel.slide_count}).`,
        };
      }

      for (let i = 0; i < carPkg.final_prompts.slides.length; i++) {
        const fpSlide = carPkg.final_prompts.slides[i];
        if (!fpSlide || typeof fpSlide !== 'object') {
          return { isValid: false, error: `final_prompts.slides[${i}] must be an object.` };
        }
        if (
          typeof fpSlide.slide_number !== 'number' ||
          !seenSlideNumbers.has(fpSlide.slide_number)
        ) {
          return {
            isValid: false,
            error: `final_prompts.slides[${i}].slide_number (${fpSlide.slide_number}) does not match any valid slide_number in carousel.slides.`,
          };
        }
        if (typeof fpSlide.prompt !== 'string' || !fpSlide.prompt.trim()) {
          return {
            isValid: false,
            error: `final_prompts.slides[${i}].prompt must be a non-empty string.`,
          };
        }
      }
    } else {
      const hasFinalPromptStr = typeof carPkg.final_prompt === 'string' && carPkg.final_prompt.trim() !== '';
      if (!hasFinalPromptStr) {
        return { isValid: false, error: 'Missing final_prompts or final_prompt in CarouselProductionPackage.' };
      }
    }

    return { isValid: true };
  }

  if (pkg.asset_type === 'video') {
    const vidPkg = pkg as VideoProductionPackage;
    if (!vidPkg.video || typeof vidPkg.video !== 'object') {
      return { isValid: false, error: 'Missing video production details in VideoProductionPackage.' };
    }
    if (typeof vidPkg.video.duration_seconds !== 'number' || !Number.isFinite(vidPkg.video.duration_seconds) || vidPkg.video.duration_seconds <= 0) {
      return { isValid: false, error: 'video.duration_seconds must be a positive finite number.' };
    }
    if (!Array.isArray(vidPkg.video.scenes) || vidPkg.video.scenes.length === 0) {
      return { isValid: false, error: 'VideoProductionPackage must contain at least one scene in video.scenes.' };
    }

    const seenSceneNumbers = new Set<number>();
    for (let i = 0; i < vidPkg.video.scenes.length; i++) {
      const scene = vidPkg.video.scenes[i];
      if (!scene || typeof scene !== 'object') {
        return { isValid: false, error: `video.scenes[${i}] must be a non-null object.` };
      }
      if (typeof scene.scene_number !== 'number' || !Number.isInteger(scene.scene_number) || scene.scene_number < 1) {
        return {
          isValid: false,
          error: `video.scenes[${i}].scene_number must be an integer >= 1.`,
        };
      }
      if (seenSceneNumbers.has(scene.scene_number)) {
        return {
          isValid: false,
          error: `Duplicate scene_number ${scene.scene_number} detected in video.scenes.`,
        };
      }
      seenSceneNumbers.add(scene.scene_number);

      if (typeof scene.duration_seconds !== 'number' || !Number.isFinite(scene.duration_seconds) || scene.duration_seconds <= 0) {
        return {
          isValid: false,
          error: `video.scenes[${i}].duration_seconds must be a positive finite number.`,
        };
      }

      const requiredSceneFields: (keyof VideoSceneProductionPlan)[] = [
        'purpose',
        'visual_direction',
        'action',
        'camera',
      ];
      for (const field of requiredSceneFields) {
        if (typeof scene[field] !== 'string' || !(scene[field] as string).trim()) {
          return {
            isValid: false,
            error: `video.scenes[${i}].${field} must be a non-empty string.`,
          };
        }
      }
    }

    if (typeof vidPkg.final_prompt !== 'string' || !vidPkg.final_prompt.trim()) {
      return { isValid: false, error: 'Missing or empty final_prompt in VideoProductionPackage.' };
    }
    return { isValid: true };
  }

  return { isValid: false, error: 'Unhandled asset_type in validation.' };
}

/**
 * Validates cross-project isolation and strict alignment between
 * active project, target ContentItem, and the candidate ProductionPackage.
 */
export function validateProductionPackageIdentity(
  activeProjectId: string,
  contentItem: ContentItem,
  productionPackage: ProductionPackage
): { isValid: boolean; error?: string } {
  if (!activeProjectId || typeof activeProjectId !== 'string' || !activeProjectId.trim()) {
    return { isValid: false, error: 'Active project_id must be a non-empty string.' };
  }

  // 1. Authoritative ContentItem project_id check (no fallback/empty)
  const itemProjectId = contentItem.project_id || contentItem.projectId;
  if (!itemProjectId || typeof itemProjectId !== 'string' || !itemProjectId.trim()) {
    return {
      isValid: false,
      error: 'ContentItem must have a non-empty project_id/projectId.',
    };
  }

  if (itemProjectId !== activeProjectId) {
    return {
      isValid: false,
      error: `Project isolation violation: ContentItem project_id (${itemProjectId}) does not match active project (${activeProjectId}).`,
    };
  }

  // 2. Authoritative ProductionPackage project_id check
  if (productionPackage.project_id !== activeProjectId) {
    return {
      isValid: false,
      error: `Project isolation violation: ProductionPackage project_id (${productionPackage.project_id}) does not match active project (${activeProjectId}).`,
    };
  }

  // 3. Authoritative content_item_id check (no invented fallback)
  if (!contentItem.content_item_id || typeof contentItem.content_item_id !== 'string' || !contentItem.content_item_id.trim()) {
    return {
      isValid: false,
      error: 'ContentItem must have an authoritative non-empty content_item_id.',
    };
  }

  if (productionPackage.content_item_id !== contentItem.content_item_id) {
    return {
      isValid: false,
      error: `Content item identity mismatch: ProductionPackage content_item_id (${productionPackage.content_item_id}) does not match ContentItem (${contentItem.content_item_id}).`,
    };
  }

  // 4. Strict Funnel Stage alignment
  const itemStage = parseStrictFunnelStage(contentItem.jenis);
  if (!itemStage) {
    return {
      isValid: false,
      error: `ContentItem has invalid or unparseable funnel stage: "${contentItem.jenis}".`,
    };
  }

  if (productionPackage.funnel_stage !== itemStage) {
    return {
      isValid: false,
      error: `Funnel stage mismatch: ProductionPackage (${productionPackage.funnel_stage}) does not match ContentItem stage (${itemStage}).`,
    };
  }

  return { isValid: true };
}

/**
 * Constructs an authoritative ProductionStrategySnapshot from project context and FunnelStrategy.
 * Pure function: No fabricated facts. Strictly project-isolated and fail-closed.
 */
export function buildProductionStrategySnapshot(
  sharedContext: SharedContentContext,
  funnelStrategy: FunnelStrategy,
  contentItem: ContentItem
): ProductionStrategySnapshot {
  const contextProjectId = sharedContext.project_id;
  const strategyProjectId = funnelStrategy.project_id;
  const itemProjectId = contentItem.project_id || contentItem.projectId;

  if (!contextProjectId || typeof contextProjectId !== 'string' || !contextProjectId.trim()) {
    throw new Error('SharedContentContext project_id is missing or empty in buildProductionStrategySnapshot.');
  }
  if (!strategyProjectId || typeof strategyProjectId !== 'string' || !strategyProjectId.trim()) {
    throw new Error('FunnelStrategy project_id is missing or empty in buildProductionStrategySnapshot.');
  }
  if (!itemProjectId || typeof itemProjectId !== 'string' || !itemProjectId.trim()) {
    throw new Error('ContentItem project_id is missing or empty in buildProductionStrategySnapshot.');
  }

  if (contextProjectId !== strategyProjectId || contextProjectId !== itemProjectId) {
    throw new Error(
      `Cross-project isolation violation in buildProductionStrategySnapshot: context(${contextProjectId}), strategy(${strategyProjectId}), item(${itemProjectId}) must all match.`
    );
  }

  const stage = parseStrictFunnelStage(contentItem.jenis);
  if (!stage) {
    throw new Error(`Invalid ContentItem funnel stage: "${contentItem.jenis}". Cannot build strategy snapshot.`);
  }

  const stageStrategy =
    stage === 'TOFU'
      ? funnelStrategy.tofu
      : stage === 'MOFU'
      ? funnelStrategy.mofu
      : funnelStrategy.bofu;

  return {
    brand_name: sharedContext.brand_context?.brand_name || '',
    category: sharedContext.brand_context?.category || '',
    primary_audience: sharedContext.audience_context?.primary_audience || '',
    positioning: sharedContext.strategy_context?.positioning || '',
    main_offer: sharedContext.strategy_context?.main_offer || '',
    core_message: sharedContext.strategy_context?.core_message || '',
    campaign_goal: funnelStrategy.campaign_goal || '',
    funnel_stage: stage,
    funnel_objective: stageStrategy?.objective || '',
    message_direction: stageStrategy?.message_direction || '',
    cta_direction: stageStrategy?.cta_direction || '',
  };
}

/**
 * Constructs an authoritative ProductionContentSnapshot from a ContentItem.
 * Does not invent default formats or values.
 */
export function buildProductionContentSnapshot(
  contentItem: ContentItem
): ProductionContentSnapshot {
  return {
    headline: contentItem.headline || '',
    body: contentItem.body || '',
    caption: contentItem.caption || '',
    cta: contentItem.cta || '',
    visual_direction: contentItem.visual || '',
    content_format: contentItem.format || '',
    strategic_objective: contentItem.tujuan || '',
    strategic_rationale: contentItem.keterangan || '',
  };
}

/**
 * Constructs an optional ProductionBrandVisualSnapshot from SharedContentContext if available.
 */
export function buildProductionBrandVisualSnapshot(
  sharedContext: SharedContentContext
): ProductionBrandVisualSnapshot | undefined {
  if (!sharedContext.brand_visual_context) return undefined;
  const bvc = sharedContext.brand_visual_context;
  return {
    visual_style: bvc.visual_style,
    color_palette: bvc.color_palette,
    typography_style: bvc.typography_style,
    image_style_rules: bvc.image_style_rules,
    design_mood: bvc.design_mood,
  };
}
