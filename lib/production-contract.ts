import { FunnelStage, parseStrictFunnelStage } from './funnel-rules';
import { SharedContentContext, ContentItem } from './content-contract';
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
}

export type VideoProductionMode =
  | 'human_led'
  | 'product_demo'
  | 'motion_explainer';

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
  scene_type:
    | 'talking_head'
    | 'product_screen'
    | 'graphic_motion'
    | 'b_roll'
    | 'end_card';
  required_assets: string[];
}

export interface VideoProductionDetails {
  production_mode: VideoProductionMode;
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

  // 3. Strict Canonical Funnel Stage (must be exactly 'TOFU' | 'MOFU' | 'BOFU')
  const canonicalStages: FunnelStage[] = ['TOFU', 'MOFU', 'BOFU'];
  if (!canonicalStages.includes(pkg.funnel_stage)) {
    return {
      isValid: false,
      error: `Invalid funnel_stage "${pkg.funnel_stage}". ProductionPackage funnel_stage must be canonical: TOFU, MOFU, or BOFU.`,
    };
  }
  const parsedStage = pkg.funnel_stage as FunnelStage;

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

  // Fields that must be typeof 'string' and NON-EMPTY
  const nonEmptyStratFields: (keyof ProductionStrategySnapshot)[] = [
    'brand_name',
    'primary_audience',
    'main_offer',
    'core_message',
    'campaign_goal',
    'funnel_stage',
    'funnel_objective',
    'message_direction',
    'cta_direction',
  ];
  for (const field of nonEmptyStratFields) {
    if (typeof strat[field] !== 'string' || !(strat[field] as string).trim()) {
      return {
        isValid: false,
        error: `strategy_snapshot.${field} must be a non-empty string.`,
      };
    }
  }

  // Fields that must be typeof 'string' but MAY BE EMPTY
  const allowedEmptyStratFields: (keyof ProductionStrategySnapshot)[] = [
    'category',
    'positioning',
  ];
  for (const field of allowedEmptyStratFields) {
    if (typeof strat[field] !== 'string') {
      return {
        isValid: false,
        error: `strategy_snapshot.${field} must be a string.`,
      };
    }
  }

  if (!canonicalStages.includes(strat.funnel_stage)) {
    return {
      isValid: false,
      error: `strategy_snapshot.funnel_stage (${strat.funnel_stage}) must be canonical: TOFU, MOFU, or BOFU.`,
    };
  }
  if (strat.funnel_stage !== parsedStage) {
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
  if (typeof content.cta !== 'string') {
    return {
      isValid: false,
      error: 'content_snapshot.cta must be a string.',
    };
  }

  // 8. Optional Brand Visual Snapshot
  if (pkg.brand_visual_snapshot !== undefined && pkg.brand_visual_snapshot !== null) {
    const bvs = pkg.brand_visual_snapshot;
    if (typeof bvs !== 'object') {
      return { isValid: false, error: 'brand_visual_snapshot must be an object if provided.' };
    }
    const optionalStringFields: (keyof ProductionBrandVisualSnapshot)[] = [
      'visual_style',
      'typography_style',
      'design_mood',
    ];
    for (const f of optionalStringFields) {
      if (bvs[f] !== undefined && typeof bvs[f] !== 'string') {
        return {
          isValid: false,
          error: `brand_visual_snapshot.${f} must be a string if provided.`,
        };
      }
    }
    if (bvs.color_palette !== undefined) {
      const isStr = typeof bvs.color_palette === 'string';
      const isStrArr =
        Array.isArray(bvs.color_palette) &&
        bvs.color_palette.every((item: any) => typeof item === 'string');
      if (!isStr && !isStrArr) {
        return {
          isValid: false,
          error: 'brand_visual_snapshot.color_palette must be a string or array of strings if provided.',
        };
      }
    }
    if (bvs.image_style_rules !== undefined) {
      if (
        !Array.isArray(bvs.image_style_rules) ||
        !bvs.image_style_rules.every((item: any) => typeof item === 'string')
      ) {
        return {
          isValid: false,
          error: 'brand_visual_snapshot.image_style_rules must be an array of strings if provided.',
        };
      }
    }
  }

  // 9. Asset-specific validation
  if (pkg.asset_type === 'image') {
    const imgPkg = pkg as ImageProductionPackage;
    if (!imgPkg.image || typeof imgPkg.image !== 'object') {
      return { isValid: false, error: 'Missing image production details in ImageProductionPackage.' };
    }
    const nonEmptyImageFields: (keyof ImageProductionDetails)[] = [
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
      if (typeof imgPkg.image[field] !== 'string' || !imgPkg.image[field].trim()) {
        return {
          isValid: false,
          error: `image.${field} must be a non-empty string in ImageProductionPackage.`,
        };
      }
    }
    const allowedEmptyImageFields: (keyof ImageProductionDetails)[] = [
      'text_overlay',
      'branding',
    ];
    for (const field of allowedEmptyImageFields) {
      if (typeof imgPkg.image[field] !== 'string') {
        return {
          isValid: false,
          error: `image.${field} must be a string in ImageProductionPackage.`,
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
    if (typeof carPkg.carousel.objective !== 'string' || !carPkg.carousel.objective.trim()) {
      return { isValid: false, error: 'carousel.objective must be a non-empty string in CarouselProductionPackage.' };
    }
    if (typeof carPkg.carousel.cover_direction !== 'string' || !carPkg.carousel.cover_direction.trim()) {
      return { isValid: false, error: 'carousel.cover_direction must be a non-empty string in CarouselProductionPackage.' };
    }
    if (typeof carPkg.carousel.visual_continuity !== 'string' || !carPkg.carousel.visual_continuity.trim()) {
      return { isValid: false, error: 'carousel.visual_continuity must be a non-empty string in CarouselProductionPackage.' };
    }
    if (typeof carPkg.carousel.branding !== 'string') {
      return { isValid: false, error: 'carousel.branding must be a string in CarouselProductionPackage.' };
    }
    if (typeof carPkg.carousel.negative_constraints !== 'string' || !carPkg.carousel.negative_constraints.trim()) {
      return { isValid: false, error: 'carousel.negative_constraints must be a non-empty string in CarouselProductionPackage.' };
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
      const expectedSlideNum = i + 1;
      if (slide.slide_number !== expectedSlideNum) {
        return {
          isValid: false,
          error: `carousel.slides[${i}].slide_number must be sequential starting at 1. Expected ${expectedSlideNum}, got ${slide.slide_number}.`,
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

    // Final prompts validation (Strict single final_prompts contract)
    if (!carPkg.final_prompts || typeof carPkg.final_prompts !== 'object') {
      return {
        isValid: false,
        error: 'Missing required final_prompts object in CarouselProductionPackage.',
      };
    }

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

    const seenFinalPromptNumbers = new Set<number>();
    for (let i = 0; i < carPkg.final_prompts.slides.length; i++) {
      const fpSlide = carPkg.final_prompts.slides[i];
      if (!fpSlide || typeof fpSlide !== 'object') {
        return { isValid: false, error: `final_prompts.slides[${i}] must be an object.` };
      }
      if (
        typeof fpSlide.slide_number !== 'number' ||
        !Number.isInteger(fpSlide.slide_number) ||
        fpSlide.slide_number < 1
      ) {
        return {
          isValid: false,
          error: `final_prompts.slides[${i}].slide_number must be an integer >= 1.`,
        };
      }
      if (!seenSlideNumbers.has(fpSlide.slide_number)) {
        return {
          isValid: false,
          error: `final_prompts.slides[${i}].slide_number (${fpSlide.slide_number}) does not match any valid slide_number in carousel.slides.`,
        };
      }
      if (seenFinalPromptNumbers.has(fpSlide.slide_number)) {
        return {
          isValid: false,
          error: `Duplicate slide_number ${fpSlide.slide_number} in final_prompts.slides. Each carousel slide must have exactly one final prompt.`,
        };
      }
      seenFinalPromptNumbers.add(fpSlide.slide_number);

      if (typeof fpSlide.prompt !== 'string' || !fpSlide.prompt.trim()) {
        return {
          isValid: false,
          error: `final_prompts.slides[${i}].prompt must be a non-empty string.`,
        };
      }
    }

    // Ensure every slide in carousel.slides has a corresponding final prompt
    for (const slideNum of seenSlideNumbers) {
      if (!seenFinalPromptNumbers.has(slideNum)) {
        return {
          isValid: false,
          error: `Missing final prompt for carousel slide_number ${slideNum}.`,
        };
      }
    }

    return { isValid: true };
  }

  if (pkg.asset_type === 'video') {
    const vidPkg = pkg as VideoProductionPackage;
    if (!vidPkg.video || typeof vidPkg.video !== 'object') {
      return { isValid: false, error: 'Missing video production details in VideoProductionPackage.' };
    }
    const validVideoModes: VideoProductionMode[] = ['human_led', 'product_demo', 'motion_explainer'];
    if (!validVideoModes.includes(vidPkg.video.production_mode)) {
      return { isValid: false, error: `Invalid video.production_mode "${vidPkg.video.production_mode}". Must be human_led, product_demo, or motion_explainer.` };
    }
    const nonEmptyVideoFields: (keyof VideoProductionDetails)[] = [
      'objective',
      'format',
      'hook',
      'camera_direction',
      'motion_direction',
      'audio_direction',
      'negative_constraints',
    ];
    for (const field of nonEmptyVideoFields) {
      if (typeof vidPkg.video[field] !== 'string' || !(vidPkg.video[field] as string).trim()) {
        return {
          isValid: false,
          error: `video.${field} must be a non-empty string in VideoProductionPackage.`,
        };
      }
    }
    const allowedEmptyVideoFields: (keyof VideoProductionDetails)[] = [
      'voiceover',
      'on_screen_text',
      'branding',
    ];
    for (const field of allowedEmptyVideoFields) {
      if (typeof vidPkg.video[field] !== 'string') {
        return {
          isValid: false,
          error: `video.${field} must be a string in VideoProductionPackage.`,
        };
      }
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
      const expectedSceneNum = i + 1;
      if (scene.scene_number !== expectedSceneNum) {
        return {
          isValid: false,
          error: `video.scenes[${i}].scene_number must be sequential starting at 1. Expected ${expectedSceneNum}, got ${scene.scene_number}.`,
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

      const validSceneTypes = ['talking_head', 'product_screen', 'graphic_motion', 'b_roll', 'end_card'];
      if (!validSceneTypes.includes(scene.scene_type)) {
        return {
          isValid: false,
          error: `video.scenes[${i}].scene_type "${scene.scene_type}" is invalid. Must be talking_head, product_screen, graphic_motion, b_roll, or end_card.`,
        };
      }

      if (!Array.isArray(scene.required_assets)) {
        return {
          isValid: false,
          error: `video.scenes[${i}].required_assets must be a valid array of strings.`,
        };
      }

      const nonEmptySceneFields: (keyof VideoSceneProductionPlan)[] = [
        'purpose',
        'visual_direction',
        'action',
        'camera',
      ];
      for (const field of nonEmptySceneFields) {
        if (typeof scene[field] !== 'string' || !(scene[field] as string).trim()) {
          return {
            isValid: false,
            error: `video.scenes[${i}].${field} must be a non-empty string.`,
          };
        }
      }

      const allowedEmptySceneFields: (keyof VideoSceneProductionPlan)[] = [
        'voiceover',
        'on_screen_text',
      ];
      for (const field of allowedEmptySceneFields) {
        if (typeof scene[field] !== 'string') {
          return {
            isValid: false,
            error: `video.scenes[${i}].${field} must be a string.`,
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

  // Authoritative FunnelStrategy provenance check
  const provenanceSource = funnelStrategy.provenance?.source_project_id;
  if (!provenanceSource || typeof provenanceSource !== 'string' || !provenanceSource.trim()) {
    throw new Error('FunnelStrategy provenance.source_project_id is missing or empty in buildProductionStrategySnapshot.');
  }
  if (provenanceSource !== strategyProjectId) {
    throw new Error(
      `Cross-project isolation violation in buildProductionStrategySnapshot: FunnelStrategy.provenance.source_project_id (${provenanceSource}) does not match strategy.project_id (${strategyProjectId}).`
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
