import {
  SharedContentContext,
  ContentItem,
  CharacterDNA,
  CarouselPlan,
  ContextProvenance,
  ensureContentItemIdentity,
} from './content-contract';
import { normalizeFunnelStage } from './funnel-rules';

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
 * Validates authoritative inputs and constructs a strict ProductionContext.
 * Returns failure if identity is mismatched, missing, or if strategic planning context is incomplete.
 */
export function buildProductionContext(
  canonicalProjectId: string | null | undefined,
  sharedContext: SharedContentContext | null | undefined,
  selectedItem: ContentItem | null | undefined,
  characterDNA?: CharacterDNA | null | undefined
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

  if (sharedContext.project_id !== canonicalProjectId) {
    return {
      isValid: false,
      error: `Project Strategy mismatch: context (${sharedContext.project_id}) berbeda dari active project (${canonicalProjectId}).`,
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

  const itemProjectId = selectedItem.project_id || selectedItem.projectId;
  if (itemProjectId && itemProjectId !== canonicalProjectId) {
    return {
      isValid: false,
      error: `Project Item mismatch: item (${itemProjectId}) berbeda dari active project (${canonicalProjectId}).`,
    };
  }

  const stampedItem = ensureContentItemIdentity(selectedItem, canonicalProjectId, selectedItem.no || 1);
  const contentItemId = stampedItem.content_item_id || `item_${canonicalProjectId}_${selectedItem.no || 1}`;

  // Process Character DNA with strict project isolation
  let characterBlock: ProductionContext['character'] = null;
  if (characterDNA) {
    if (characterDNA.project_id && characterDNA.project_id !== canonicalProjectId) {
      console.warn(
        `[ProductionContext] Discarding CharacterDNA belonging to project ${characterDNA.project_id} because active project is ${canonicalProjectId}`
      );
    } else {
      characterBlock = {
        character_id: characterDNA.character_id,
        display_name: characterDNA.identity?.display_name || 'Project Creator Persona',
        prompt_summary:
          characterDNA.prompt_assets?.dna_summary_prompt ||
          characterDNA.prompt_assets?.locked_visual_prompt ||
          characterDNA.identity?.display_name ||
          '',
        dna_summary_prompt: characterDNA.prompt_assets?.dna_summary_prompt,
        locked_visual_prompt: characterDNA.prompt_assets?.locked_visual_prompt,
        preview_generation_prompt: characterDNA.prompt_assets?.preview_generation_prompt,
        scene_reuse_prompt_template: characterDNA.prompt_assets?.scene_reuse_prompt_template,
        reference_images: characterDNA.reference_images || [],
        preview_image: characterDNA.preview_image,
        identity: characterDNA.identity,
        style: characterDNA.style,
        behavior: characterDNA.behavior,
        consistency_rules: characterDNA.consistency_rules,
      };
    }
  }

  const funnelStage = normalizeFunnelStage(stampedItem.jenis);

  const context: ProductionContext = {
    identity: {
      project_id: canonicalProjectId,
      content_item_id: contentItemId,
      item_no: stampedItem.no || 1,
      project_name: sharedContext.project_name || sharedContext.brand_context.brand_name,
    },
    brand: {
      name: sharedContext.brand_context.brand_name,
      category: sharedContext.brand_context.category || '',
      summary: sharedContext.brand_context.brand_summary || '',
      voice: sharedContext.brand_context.brand_voice || '',
      visual_identity: sharedContext.brand_visual_context ? {
        visual_style: sharedContext.brand_visual_context.visual_style,
        color_palette: sharedContext.brand_visual_context.color_palette,
        typography_style: sharedContext.brand_visual_context.typography_style,
        image_style_rules: sharedContext.brand_visual_context.image_style_rules,
        design_mood: sharedContext.brand_visual_context.design_mood,
      } : undefined,
    },
    audience: {
      primary_audience: sharedContext.audience_context?.primary_audience || '',
      pain_points: sharedContext.audience_context?.pain_points || [],
      desires: sharedContext.audience_context?.desires || [],
      objections: sharedContext.audience_context?.objections || [],
    },
    strategy: {
      positioning: sharedContext.strategy_context?.positioning || '',
      usp: sharedContext.strategy_context?.usp || [],
      main_offer: sharedContext.strategy_context?.main_offer || '',
      offer_benefits: sharedContext.strategy_context?.offer_benefits || [],
      core_message: sharedContext.strategy_context?.core_message || '',
      copy_direction: sharedContext.strategy_context?.copy_direction || [],
      content_pillars: sharedContext.strategy_context?.content_pillars || [],
    },
    content: {
      funnel_stage: funnelStage,
      objective: stampedItem.tujuan || '',
      hook_type: stampedItem.hookType || '',
      headline: stampedItem.headline || '',
      body: stampedItem.body || '',
      caption: stampedItem.caption || '',
      format: stampedItem.format || 'Single',
      referensi: stampedItem.referensi || '',
      visual_direction: stampedItem.visual || '',
      cta: stampedItem.cta || '',
      recommended_asset_types: stampedItem.recommendedAssetTypes,
      primary_asset_type: stampedItem.primaryAssetType,
      channel: stampedItem.channel,
      carousel_plan: stampedItem.carousel_plan,
    },
    character: characterBlock,
    source: {
      context_origin: sharedContext.source?.origin || 'creative_system_json',
      provenance: sharedContext.source?.provenance,
      is_complete_for_planning: Boolean(sharedContext.system_flags?.is_complete_for_planning),
    },
  };

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
- Format: ${ctx.content.format || 'Single'}`;
}
