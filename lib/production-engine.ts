import {
  ProductionPackage,
  ProductionAssetType,
  ImageProductionDetails,
  CarouselProductionDetails,
  CarouselFinalPrompts,
  VideoProductionDetails,
  buildProductionStrategySnapshot,
  buildProductionContentSnapshot,
  buildProductionBrandVisualSnapshot,
  validateProductionPackage,
  validateProductionPackageIdentity,
} from './production-contract';
import {
  ProductionEngineContext,
  buildProductionEngineContext,
} from './production-engine-context';

/**
 * Pure discriminated union for structured production asset inputs.
 * Strict boundary: does NOT accept project_id, content_item_id, funnel_stage,
 * strategy snapshots, content snapshots, brand snapshots, or production status.
 * All authoritative context and metadata must be derived from ProductionEngineContext.
 */
export type ProductionAssetInput =
  | {
      asset_type: 'image';
      image: ImageProductionDetails;
      final_prompt: string;
    }
  | {
      asset_type: 'carousel';
      carousel: CarouselProductionDetails;
      final_prompts: CarouselFinalPrompts;
    }
  | {
      asset_type: 'video';
      video: VideoProductionDetails;
      final_prompt: string;
    };

/**
 * Explicit deterministic system metadata.
 * Engine does NOT generate Date.now(), Math.random(), or crypto UUIDs internally.
 */
export interface ProductionPackageMetadata {
  package_id: string;
  created_at: string;
}

/**
 * Return contract for the Single Production Engine.
 */
export interface BuildProductionPackageResult {
  isValid: boolean;
  package?: ProductionPackage;
  error?: string;
}

/**
 * Single Production Engine Core.
 * 
 * Transforms authoritative ProductionEngineContext + structured ProductionAssetInput + system metadata
 * into a strictly validated, project-isolated ProductionPackage with status 'ready_for_production'.
 * 
 * PURE & IMMUTABLE:
 * - Does not mutate any input argument.
 * - Does not accept legacy unstructured prompts for parsing.
 * - Does not invent missing identity or strategic fields.
 * - Fails closed if any validation step fails.
 */
export function buildProductionPackage(
  engineContext: ProductionEngineContext,
  assetInput: ProductionAssetInput,
  metadata: ProductionPackageMetadata
): BuildProductionPackageResult {
  // 1. Validate System Metadata (deterministic, non-empty)
  if (!metadata || typeof metadata !== 'object') {
    return {
      isValid: false,
      error: 'Metadata must be a valid non-null object.',
    };
  }
  if (typeof metadata.package_id !== 'string' || !metadata.package_id.trim()) {
    return {
      isValid: false,
      error: 'Metadata package_id must be a non-empty string.',
    };
  }
  if (typeof metadata.created_at !== 'string' || !metadata.created_at.trim()) {
    return {
      isValid: false,
      error: 'Metadata created_at must be a non-empty string.',
    };
  }

  // 2. Validate ProductionEngineContext presence
  if (!engineContext || typeof engineContext !== 'object') {
    return {
      isValid: false,
      error: 'ProductionEngineContext must be a valid non-null object.',
    };
  }
  if (!engineContext.project_id || typeof engineContext.project_id !== 'string' || !engineContext.project_id.trim()) {
    return {
      isValid: false,
      error: 'ProductionEngineContext must contain a valid project_id.',
    };
  }
  if (!engineContext.content_item || typeof engineContext.content_item !== 'object') {
    return {
      isValid: false,
      error: 'ProductionEngineContext must contain a valid content_item.',
    };
  }
  if (!engineContext.shared_context || typeof engineContext.shared_context !== 'object') {
    return {
      isValid: false,
      error: 'ProductionEngineContext must contain a valid shared_context.',
    };
  }
  if (!engineContext.funnel_strategy || typeof engineContext.funnel_strategy !== 'object') {
    return {
      isValid: false,
      error: 'ProductionEngineContext must contain a valid funnel_strategy.',
    };
  }

  // 3. Revalidate ProductionEngineContext through Phase 3A authority gate
  const authorityCheck = buildProductionEngineContext(
    engineContext.project_id,
    engineContext.shared_context,
    engineContext.funnel_strategy,
    engineContext.content_item,
    engineContext.character_dna
  );

  if (!authorityCheck.isValid || !authorityCheck.context) {
    return {
      isValid: false,
      error: authorityCheck.error || 'ProductionEngineContext failed authority validation.',
    };
  }

  const authoritativeContext = authorityCheck.context;

  // 4. Check canonical_funnel_stage consistency (cannot be spoofed/fabricated)
  if (engineContext.canonical_funnel_stage !== authoritativeContext.canonical_funnel_stage) {
    return {
      isValid: false,
      error: `ProductionEngineContext canonical_funnel_stage ("${engineContext.canonical_funnel_stage}") mismatch with authoritative funnel stage ("${authoritativeContext.canonical_funnel_stage}").`,
    };
  }

  // 5. Strict content_item_id validation + type narrowing
  const authoritativeContentItemId = authoritativeContext.content_item.content_item_id;
  if (
    typeof authoritativeContentItemId !== 'string' ||
    !authoritativeContentItemId.trim()
  ) {
    return {
      isValid: false,
      error: 'Authoritative ContentItem content_item_id is missing or invalid.',
    };
  }

  // 6. Validate ProductionAssetInput structure
  if (!assetInput || typeof assetInput !== 'object') {
    return {
      isValid: false,
      error: 'ProductionAssetInput must be a valid non-null object.',
    };
  }
  const validAssetTypes: ProductionAssetType[] = ['image', 'carousel', 'video'];
  if (!validAssetTypes.includes(assetInput.asset_type)) {
    return {
      isValid: false,
      error: `Invalid or unsupported asset_type: "${(assetInput as any)?.asset_type}".`,
    };
  }

  // 7. Build authoritative snapshots from authoritative context (fail-closed on error)
  let strategySnapshot;
  let contentSnapshot;
  let brandVisualSnapshot;
  try {
    strategySnapshot = buildProductionStrategySnapshot(
      authoritativeContext.shared_context,
      authoritativeContext.funnel_strategy,
      authoritativeContext.content_item
    );
    contentSnapshot = buildProductionContentSnapshot(
      authoritativeContext.content_item
    );
    brandVisualSnapshot = buildProductionBrandVisualSnapshot(
      authoritativeContext.shared_context
    );
  } catch (err: any) {
    return {
      isValid: false,
      error: err?.message || 'Failed to construct production snapshots from authoritative context.',
    };
  }

  // 8. Construct base package from authoritative context and metadata
  const basePackage = {
    package_id: metadata.package_id.trim(),
    project_id: authoritativeContext.project_id,
    content_item_id: authoritativeContentItemId.trim(),
    funnel_stage: authoritativeContext.canonical_funnel_stage,
    production_status: 'ready_for_production' as const,
    created_at: metadata.created_at.trim(),
    strategy_snapshot: strategySnapshot,
    content_snapshot: contentSnapshot,
    ...(brandVisualSnapshot ? { brand_visual_snapshot: brandVisualSnapshot } : {}),
  };

  // 9. Build typed candidate based on asset_type
  let candidate: ProductionPackage;
  if (assetInput.asset_type === 'image') {
    candidate = {
      ...basePackage,
      asset_type: 'image',
      image: assetInput.image,
      final_prompt: assetInput.final_prompt,
    };
  } else if (assetInput.asset_type === 'carousel') {
    candidate = {
      ...basePackage,
      asset_type: 'carousel',
      carousel: assetInput.carousel,
      final_prompts: assetInput.final_prompts,
    };
  } else if (assetInput.asset_type === 'video') {
    candidate = {
      ...basePackage,
      asset_type: 'video',
      video: assetInput.video,
      final_prompt: assetInput.final_prompt,
    };
  } else {
    return {
      isValid: false,
      error: `Unsupported asset_type: "${(assetInput as any)?.asset_type}".`,
    };
  }

  // 10. Step A: Validate complete ProductionPackage schema & fields
  const packageValidation = validateProductionPackage(candidate);
  if (!packageValidation.isValid) {
    return {
      isValid: false,
      error: packageValidation.error || 'Production package validation failed.',
    };
  }

  // 11. Step B: Validate strict identity alignment with active project and content item
  const identityValidation = validateProductionPackageIdentity(
    authoritativeContext.project_id,
    authoritativeContext.content_item,
    candidate
  );
  if (!identityValidation.isValid) {
    return {
      isValid: false,
      error: identityValidation.error || 'Production package identity validation failed.',
    };
  }

  return {
    isValid: true,
    package: candidate,
  };
}
