import type { SharedContentContext, ContentItem, CharacterDNA } from './content-contract';
import type { FunnelStrategy } from './funnel-strategy';
import type { ProductionCandidate } from './production-candidate';
import { selectProductionCandidate } from './production-candidate-adapter';
import { buildProductionEngineContext } from './production-engine-context';
import {
  type ProductionPackage,
  type ProductionPackageMetadata,
  buildProductionPackage,
} from './production-engine';

export interface PrepareProductionPackageInput {
  projectId: string;
  sharedContext: SharedContentContext;
  funnelStrategy: FunnelStrategy;
  contentItem: ContentItem;
  characterDNA?: CharacterDNA | null;
  candidates: ProductionCandidate[];
  selectedCandidateId: string;
  metadata: ProductionPackageMetadata;
}

export type PrepareProductionPackageResult =
  | {
      ok: true;
      package: ProductionPackage;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Pure canonical orchestration function for preparing a ProductionPackage.
 *
 * Flow:
 * 1. Validates & builds ProductionEngineContext via buildProductionEngineContext()
 * 2. Explicitly selects & adapts candidate via selectProductionCandidate()
 * 3. Delegates ProductionPackage creation strictly to Single Production Engine buildProductionPackage()
 *
 * FAIL-CLOSED: Does not repair, normalize, or fabricate inputs or metadata.
 * Does not generate timestamps, UUIDs, or fallback candidates.
 */
export function prepareProductionPackage(
  input: PrepareProductionPackageInput
): PrepareProductionPackageResult {
  if (!input || typeof input !== 'object') {
    return {
      ok: false,
      error: 'Input must be a valid non-null object',
    };
  }

  // 1. Build authoritative ProductionEngineContext
  const contextResult = buildProductionEngineContext(
    input.projectId,
    input.sharedContext,
    input.funnelStrategy,
    input.contentItem,
    input.characterDNA
  );

  if (!contextResult.isValid || !contextResult.context) {
    return {
      ok: false,
      error: contextResult.error || 'Failed to build ProductionEngineContext',
    };
  }

  // 2. Explicit candidate selection & adaptation
  const adapterResult = selectProductionCandidate(
    input.candidates,
    input.selectedCandidateId
  );

  if (!adapterResult.ok) {
    return {
      ok: false,
      error: adapterResult.error || 'Failed to select production candidate',
    };
  }

  // 3. Delegate package construction strictly to Single Production Engine
  const engineResult = buildProductionPackage(
    contextResult.context,
    adapterResult.assetInput,
    input.metadata
  );

  if (!engineResult.isValid || !engineResult.package) {
    return {
      ok: false,
      error: engineResult.error || 'Failed to build ProductionPackage',
    };
  }

  return {
    ok: true,
    package: engineResult.package,
  };
}
