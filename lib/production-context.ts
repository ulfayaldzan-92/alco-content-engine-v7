import {
  SharedContentContext,
  ContentItem,
  CharacterDNA,
  CarouselPlan,
  ContextProvenance,
} from './content-contract';
import { FunnelStrategy } from './funnel-strategy';
import {
  ProductionEngineContext,
  buildProductionEngineContext,
} from './production-engine-context';

export interface ProductionGenerationRequest {
  project_id: string;
  content_item_id: string;
  item_no?: number;
  generation_type: 'image' | 'carousel_plan' | 'carousel_stage1' | 'carousel_stage2' | 'video' | 'review';
  stage?: 'stage1_plan' | 'stage2_enrichment' | 'full';
  production_context: ProductionContext;
  revision_notes?: string;
  stage1_content_plan?: any;
}

export function validateProductionGenerationRequest(
  reqBody: any
): { isValid: boolean; error?: string } {
  if (!reqBody || typeof reqBody !== 'object' || reqBody === null) {
    return { isValid: false, error: 'Request body must be a valid JSON object.' };
  }
  const { project_id, content_item_id, production_context } = reqBody;
  if (!project_id || typeof project_id !== 'string' || !project_id.trim()) {
    return { isValid: false, error: 'Missing or invalid project_id in request.' };
  }
  if (!content_item_id || typeof content_item_id !== 'string' || !content_item_id.trim()) {
    return { isValid: false, error: 'Missing or invalid content_item_id in request.' };
  }
  if (!production_context || typeof production_context !== 'object') {
    return { isValid: false, error: 'Missing production_context in request.' };
  }
  if (production_context.identity?.project_id !== project_id) {
    return {
      isValid: false,
      error: `Request project_id (${project_id}) mismatch with production_context.identity.project_id (${production_context.identity?.project_id}).`,
    };
  }
  if (production_context.identity?.content_item_id !== content_item_id) {
    return {
      isValid: false,
      error: `Request content_item_id (${content_item_id}) mismatch with production_context.identity.content_item_id (${production_context.identity?.content_item_id}).`,
    };
  }
  return { isValid: true };
}

export interface ProductionContext {
  identity: {
    project_id: string;
    content_item_id: string;
    item_no: number;
    project_name: string;
  };

  brand: {
    name: string;
    category: string;
    summary: string;
    voice: string;
    visual_identity?: {
      visual_style?: string;
      color_palette?: string | string[];
      typography_style?: string;
      image_style_rules?: string[];
      design_mood?: string;
    };
  };

  audience: {
    primary_audience: string;
    pain_points: string[];
    desires: string[];
    objections: string[];
  };

  strategy: {
    positioning: string;
    usp: string[];
    main_offer: string;
    offer_benefits: string[];
    core_message: string;
    copy_direction: string[];
    content_pillars: string[];
  };

  content: {
    funnel_stage: string;
    objective: string;
    hook_type: string;
    headline: string;
    body: string;
    caption: string;
    format: string;
    referensi: string;
    visual_direction: string;
    cta: string;
    recommended_asset_types?: string[];
    primary_asset_type?: string;
    channel?: string;
    carousel_plan?: CarouselPlan;
  };

  character?: {
    character_id: string;
    display_name: string;
    prompt_summary: string;
    dna_summary_prompt?: string;
    locked_visual_prompt?: string;
    preview_generation_prompt?: string;
    scene_reuse_prompt_template?: string;
    reference_images?: string[];
    preview_image?: string;
    identity?: CharacterDNA['identity'];
    style?: CharacterDNA['style'];
    behavior?: CharacterDNA['behavior'];
    consistency_rules?: CharacterDNA['consistency_rules'];
  } | null;

  source: {
    context_origin: string;
    provenance?: ContextProvenance;
    is_complete_for_planning: boolean;
  };
}

export interface ProductionContextValidationResult {
  isValid: boolean;
  error?: string;
  context?: ProductionContext;
  missingFields?: string[];
}

/**
 * Adapter from the canonical ProductionEngineContext to the legacy ProductionContext.
 * ProductionEngineContext is the authoritative gate.
 */
export function adaptEngineContextToProductionContext(
  engineCtx: ProductionEngineContext
): ProductionContext {
  const { shared_context, content_item, canonical_funnel_stage, character_dna, project_id } = engineCtx;

  let characterBlock: ProductionContext['character'] = null;
  if (character_dna) {
    characterBlock = {
      character_id: character_dna.character_id,
      display_name: character_dna.identity?.display_name || '',
      prompt_summary:
        character_dna.prompt_assets?.dna_summary_prompt ||
        character_dna.prompt_assets?.locked_visual_prompt ||
        character_dna.identity?.display_name ||
        '',
      dna_summary_prompt: character_dna.prompt_assets?.dna_summary_prompt,
      locked_visual_prompt: character_dna.prompt_assets?.locked_visual_prompt,
      preview_generation_prompt: character_dna.prompt_assets?.preview_generation_prompt,
      scene_reuse_prompt_template: character_dna.prompt_assets?.scene_reuse_prompt_template,
      reference_images: character_dna.reference_images || [],
      preview_image: character_dna.preview_image,
      identity: character_dna.identity,
      style: character_dna.style,
      behavior: character_dna.behavior,
      consistency_rules: character_dna.consistency_rules,
    };
  }

  return {
    identity: {
      project_id: project_id,
      content_item_id: content_item.content_item_id!,
      item_no: content_item.no || 1,
      project_name: shared_context.project_name || shared_context.brand_context.brand_name,
    },
    brand: {
      name: shared_context.brand_context.brand_name,
      category: shared_context.brand_context.category || '',
      summary: shared_context.brand_context.brand_summary || '',
      voice: shared_context.brand_context.brand_voice || '',
      visual_identity: shared_context.brand_visual_context ? {
        visual_style: shared_context.brand_visual_context.visual_style,
        color_palette: shared_context.brand_visual_context.color_palette,
        typography_style: shared_context.brand_visual_context.typography_style,
        image_style_rules: shared_context.brand_visual_context.image_style_rules,
        design_mood: shared_context.brand_visual_context.design_mood,
      } : undefined,
    },
    audience: {
      primary_audience: shared_context.audience_context?.primary_audience || '',
      pain_points: shared_context.audience_context?.pain_points || [],
      desires: shared_context.audience_context?.desires || [],
      objections: shared_context.audience_context?.objections || [],
    },
    strategy: {
      positioning: shared_context.strategy_context?.positioning || '',
      usp: shared_context.strategy_context?.usp || [],
      main_offer: shared_context.strategy_context?.main_offer || '',
      offer_benefits: shared_context.strategy_context?.offer_benefits || [],
      core_message: shared_context.strategy_context?.core_message || '',
      copy_direction: shared_context.strategy_context?.copy_direction || [],
      content_pillars: shared_context.strategy_context?.content_pillars || [],
    },
    content: {
      funnel_stage: canonical_funnel_stage,
      objective: content_item.tujuan || '',
      hook_type: content_item.hookType || '',
      headline: content_item.headline || '',
      body: content_item.body || '',
      caption: content_item.caption || '',
      format: content_item.format || '',
      referensi: content_item.referensi || '',
      visual_direction: content_item.visual || '',
      cta: content_item.cta || '',
      recommended_asset_types: content_item.recommendedAssetTypes,
      primary_asset_type: content_item.primaryAssetType,
      channel: content_item.channel,
      carousel_plan: content_item.carousel_plan,
    },
    character: characterBlock,
    source: {
      context_origin: shared_context.source?.origin || 'creative_system_json',
      provenance: shared_context.source?.provenance,
      is_complete_for_planning: Boolean(shared_context.system_flags?.is_complete_for_planning),
    },
  };
}

/**
 * Validates authoritative inputs and constructs a strict ProductionContext.
 * Delegated to ProductionEngineContext as the authoritative gate.
 * 
 * In Phase 3A:
 * - NO automatic ID fabrication (no item_${projectId}_${no}).
 * - NO silent project relabeling.
 * - NO normalizeFunnelStage (parseStrictFunnelStage only).
 * - NO format || 'Single'.
 * - NO auto-derivation of FunnelStrategy at the gate.
 */
export function buildProductionContext(
  canonicalProjectId: string | null | undefined,
  sharedContext: SharedContentContext | null | undefined,
  selectedItem: ContentItem | null | undefined,
  characterDNA?: CharacterDNA | null | undefined,
  funnelStrategy?: FunnelStrategy | null | undefined
): ProductionContextValidationResult {
  if (!canonicalProjectId || !canonicalProjectId.trim()) {
    return {
      isValid: false,
      error: 'Project ID tidak ditemukan. Muat ulang project sebelum melanjutkan.',
    };
  }

  if (!sharedContext) {
    return {
      isValid: false,
      error: 'Shared Strategy Context belum diimpor untuk project ini. Silakan lengkapi Strategy Blueprint.',
    };
  }

  if (sharedContext.system_flags?.is_complete_for_planning === false) {
    const missing = sharedContext.system_flags.missing_required_fields || [];
    return {
      isValid: false,
      error: `Data strategi project belum lengkap (${missing.join(', ')}). Lengkapi data di Strategy Intake sebelum melanjutkan produksi.`,
      missingFields: missing,
    };
  }

  if (!sharedContext.brand_context?.brand_name?.trim()) {
    return {
      isValid: false,
      error: 'Nama brand pada strategi project kosong. Lengkapi data brand terlebih dahulu.',
      missingFields: ['Brand Name'],
    };
  }

  if (!selectedItem) {
    return {
      isValid: false,
      error: 'Item konten belum dipilih. Silakan pilih satu item dari kalender konten.',
    };
  }

  if (!funnelStrategy) {
    return {
      isValid: false,
      error: 'Authoritative FunnelStrategy belum dimuat untuk project ini. Produksi dilarang berjalan tanpa strategy resmi.',
    };
  }

  const engineResult = buildProductionEngineContext(
    canonicalProjectId,
    sharedContext,
    funnelStrategy,
    selectedItem,
    characterDNA
  );

  if (!engineResult.isValid || !engineResult.context) {
    return {
      isValid: false,
      error: engineResult.error || 'ProductionEngineContext validation failed.',
    };
  }

  const context = adaptEngineContextToProductionContext(engineResult.context);

  return {
    isValid: true,
    context,
  };
}

/**
 * Standardized Context Integrity Rules block appended to all AI prompts.
 * Strictly prevents niche drift, hallucinated audiences, and unsolicited generic marketing topics.
 */
export const ANTI_DRIFT_RULES = `### CONTEXT INTEGRITY & ANTI-DRIFT MANDATES (STRICTLY ENFORCED):
1. STRICT FACT BOUNDARY: Use ONLY the brand name, industry, audience, pain points, positioning, and offer specified in PROJECT FACTS and SELECTED CONTENT ITEM.
2. ZERO NICHE DRIFT: NEVER introduce an unrelated business, SaaS/course terminology, or content-marketing tools unless the project facts explicitly state that is the business niche.
3. ZERO AUDIENCE DRIFT: Speak directly to the specific target audience defined in PROJECT FACTS. Do NOT invent unrelated personas.
4. ZERO UNSOLICITED OFFERS: Do NOT invent unmentioned product features, prices, discounts, or guarantees not listed in PROJECT FACTS.
5. ZERO GENERIC METAPHORS: Avoid clichéd marketing jargon (e.g., "Pernah merasa bikin konten sia-sia", "dashboard alur konten", "sistem terarah") unless genuinely applicable to this specific project facts.
6. GROUNDED CREATIVITY: Creative expression (visuals, phrasing, analogies) MUST serve the specific project facts and the selected post topic.`;

/**
 * Formats the authoritative ProductionContext into a structured, unambiguous prompt block for AI generators.
 */
export function formatProductionContextForPrompt(
  ctx: ProductionContext,
  options?: { includeCharacter?: boolean }
): string {
  const brandVisual = ctx.brand.visual_identity;
  const visualBlock = brandVisual ? `
- Visual Style: ${brandVisual.visual_style || '-'}
- Color Palette: ${Array.isArray(brandVisual.color_palette) ? brandVisual.color_palette.join(', ') : (brandVisual.color_palette || '-')}
- Typography Style: ${brandVisual.typography_style || '-'}
- Image Style Rules: ${Array.isArray(brandVisual.image_style_rules) ? brandVisual.image_style_rules.join('; ') : (brandVisual.image_style_rules || '-')}
- Design Mood: ${brandVisual.design_mood || '-'}` : '';

  const characterBlock = (options?.includeCharacter !== false && ctx.character) ? `
### PROJECT CREATOR / TALENT PERSONA (PROJECT-SCOPED):
- Name: ${ctx.character.display_name}
- Visual DNA Prompt: ${ctx.character.prompt_summary}
- Wardrobe & Style: ${ctx.character.style?.wardrobe_style || '-'}
- On-Camera Persona: ${ctx.character.behavior?.on_camera_persona || '-'}
` : '';

  return `### PROJECT FACTS (AUTHORITATIVE STRATEGY - DO NOT DEVIATE):
- Project ID: ${ctx.identity.project_id}
- Project / Brand Name: ${ctx.brand.name}
- Industry / Category: ${ctx.brand.category || '-'}
- Brand Summary: ${ctx.brand.summary || '-'}
- Brand Voice: ${ctx.brand.voice || '-'}
- Target Audience: ${ctx.audience.primary_audience || '-'}
- Audience Pain Points: ${ctx.audience.pain_points.length > 0 ? ctx.audience.pain_points.join('; ') : '-'}
- Audience Desires: ${ctx.audience.desires.length > 0 ? ctx.audience.desires.join('; ') : '-'}
- Audience Objections: ${ctx.audience.objections.length > 0 ? ctx.audience.objections.join('; ') : '-'}
- Core Positioning: ${ctx.strategy.positioning || '-'}
- USP: ${ctx.strategy.usp.length > 0 ? ctx.strategy.usp.join('; ') : '-'}
- Main Offer: ${ctx.strategy.main_offer || '-'}
- Offer Benefits: ${ctx.strategy.offer_benefits.length > 0 ? ctx.strategy.offer_benefits.join('; ') : '-'}
- Core Message: ${ctx.strategy.core_message || '-'}
- Content Pillars: ${ctx.strategy.content_pillars.length > 0 ? ctx.strategy.content_pillars.join('; ') : '-'}${visualBlock}${characterBlock}

### SELECTED CONTENT ITEM (SPECIFIC POST TOPIC):
- Item No: ${ctx.identity.item_no}
- Funnel Stage: ${ctx.content.funnel_stage}
- Strategic Objective: ${ctx.content.objective || '-'}
- Hook Type: ${ctx.content.hook_type || '-'}
- Headline: ${ctx.content.headline || '-'}
- Core Body / Idea: ${ctx.content.body || '-'}
- Visual Direction: ${ctx.content.visual_direction || '-'}
- Reference: ${ctx.content.referensi || '-'}
- Call to Action (CTA): ${ctx.content.cta || '-'}
- Format: ${ctx.content.format || '-'}`;
}
