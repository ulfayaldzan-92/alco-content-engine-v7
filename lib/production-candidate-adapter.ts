import {
  ProductionCandidate,
  validateProductionCandidate,
} from './production-candidate';
import { ProductionAssetInput } from './production-engine';

// ============================================================================
// PRODUCTION CANDIDATE ADAPTER BOUNDARY (PHASE 3C-B)
// Pure boundary for explicitly selecting and adapting validated ProductionCandidate
// into ProductionAssetInput without repair, fallbacks, or package authority fields.
// ============================================================================

export type ProductionCandidateAdapterResult =
  | {
      ok: true;
      assetInput: ProductionAssetInput;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Validates and converts a single canonical ProductionCandidate to ProductionAssetInput.
 * Strict boundary: returns error on validation failure without attempting repair or fallbacks.
 */
export function adaptProductionCandidateToAssetInput(
  candidate: ProductionCandidate
): ProductionCandidateAdapterResult {
  const validation = validateProductionCandidate(candidate);
  if (!validation.isValid) {
    return {
      ok: false,
      error: validation.error || 'Invalid production candidate',
    };
  }

  if (candidate.candidate_type === 'image') {
    return {
      ok: true,
      assetInput: {
        asset_type: 'image',
        image: candidate.production_details,
        final_prompt: candidate.final_prompt,
      },
    };
  }

  if (candidate.candidate_type === 'carousel') {
    return {
      ok: true,
      assetInput: {
        asset_type: 'carousel',
        carousel: candidate.production_details,
        final_prompts: candidate.final_prompts,
      },
    };
  }

  if (candidate.candidate_type === 'video') {
    return {
      ok: true,
      assetInput: {
        asset_type: 'video',
        video: candidate.production_details,
        final_prompt: candidate.final_prompt,
      },
    };
  }

  return {
    ok: false,
    error: 'Unsupported candidate type',
  };
}

/**
 * Explicitly selects a candidate by ID from candidates array and adapts it to ProductionAssetInput.
 * Strict fail-closed rules:
 * - Empty selectedCandidateId fails
 * - Unknown selectedCandidateId fails
 * - Duplicate candidate IDs in candidates list fail
 * - No fallback to first candidate or default
 */
export function selectProductionCandidate(
  candidates: ProductionCandidate[],
  selectedCandidateId: string
): ProductionCandidateAdapterResult {
  if (!selectedCandidateId || typeof selectedCandidateId !== 'string' || selectedCandidateId.trim().length === 0) {
    return {
      ok: false,
      error: 'Selected candidate ID must be a non-empty string',
    };
  }

  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      ok: false,
      error: 'Candidates list must be a non-empty array',
    };
  }

  const cleanSelectedId = selectedCandidateId.trim();

  // Validate candidate object structures and check for duplicate candidate IDs
  const idCounts = new Map<string, number>();
  for (const c of candidates) {
    if (!c || typeof c !== 'object' || typeof c.candidate_id !== 'string') {
      return {
        ok: false,
        error: 'Candidates list contains invalid or malformed candidate object',
      };
    }
    const id = c.candidate_id;
    idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }

  const matchingCandidates = candidates.filter((c) => c.candidate_id === cleanSelectedId);

  if (matchingCandidates.length === 0) {
    return {
      ok: false,
      error: `Selected candidate ID '${cleanSelectedId}' not found in candidates list`,
    };
  }

  for (const [id, count] of idCounts.entries()) {
    if (count > 1) {
      return {
        ok: false,
        error: `Duplicate candidate ID found: '${id}'`,
      };
    }
  }

  return adaptProductionCandidateToAssetInput(matchingCandidates[0]);
}

/**
 * Specialized explicit selection helper for single Carousel candidate ('carousel_plan').
 */
export function selectSingleCarouselCandidate(
  candidates: ProductionCandidate[],
  selectedCandidateId: string = 'carousel_plan'
): ProductionCandidateAdapterResult {
  return selectProductionCandidate(candidates, selectedCandidateId);
}
