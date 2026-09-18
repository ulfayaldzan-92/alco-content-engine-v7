import {
  SharedContentContext,
  ContentItem,
  CharacterDNA,
} from './content-contract';
import {
  FunnelStrategy,
  validateFunnelStrategyProjectIsolation,
  validateItemAgainstFunnelStrategy,
} from './funnel-strategy';
import { parseStrictFunnelStage, FunnelStage } from './funnel-rules';

export interface ProductionEngineContext {
  project_id: string;

  shared_context: SharedContentContext;
  funnel_strategy: FunnelStrategy;
  content_item: ContentItem;

  canonical_funnel_stage: FunnelStage;
  character_dna?: CharacterDNA | null;
}

export interface BuildProductionEngineContextResult {
  isValid: boolean;
  context?: ProductionEngineContext;
  error?: string;
}

/**
 * Builds the canonical, authoritative ProductionEngineContext.
 * FAIL-CLOSED: Rejects immediately if project identity mismatches,
 * content item ID is missing, funnel stage is non-canonical,
 * strategy is missing/mismatched, or CharacterDNA belongs to another project.
 * 
 * STRICT RULES:
 * - NO automatic ID fabrication (e.g. item_${projectId}_${no}).
 * - NO silent project relabeling.
 * - NO silent funnel stage normalization (parseStrictFunnelStage only).
 * - NO format invented (no format || 'Single').
 * - NO auto-derivation of FunnelStrategy at the gate.
 */
export function buildProductionEngineContext(
  canonicalProjectId: string | null | undefined,
  sharedContext: SharedContentContext | null | undefined,
  funnelStrategy: FunnelStrategy | null | undefined,
  contentItem: ContentItem | null | undefined,
  characterDNA?: CharacterDNA | null | undefined
): BuildProductionEngineContextResult {
  // 1. Canonical Project ID must be non-empty string
  if (!canonicalProjectId || typeof canonicalProjectId !== 'string' || !canonicalProjectId.trim()) {
    return {
      isValid: false,
      error: 'Project ID tidak ditemukan atau kosong. Canonical project ID wajib diisi.',
    };
  }
  const cleanProjectId = canonicalProjectId.trim();

  // 2. SharedContentContext must exist and match canonicalProjectId
  if (!sharedContext || typeof sharedContext !== 'object') {
    return {
      isValid: false,
      error: 'SharedContentContext belum tersedia untuk project ini. Lengkapi data strategi terlebih dahulu.',
    };
  }

  if (!sharedContext.project_id || typeof sharedContext.project_id !== 'string' || !sharedContext.project_id.trim()) {
    return {
      isValid: false,
      error: 'SharedContentContext.project_id kosong atau tidak valid.',
    };
  }

  if (sharedContext.project_id !== cleanProjectId) {
    return {
      isValid: false,
      error: `Project Identity Mismatch: SharedContentContext.project_id ("${sharedContext.project_id}") berbeda dari canonical project ID ("${cleanProjectId}").`,
    };
  }

  if (sharedContext.system_flags?.is_complete_for_planning === false) {
    const missing = sharedContext.system_flags.missing_required_fields || [];
    return {
      isValid: false,
      error: `Data strategi project belum lengkap (${missing.join(', ')}). Lengkapi data di Strategy Intake sebelum melanjutkan produksi.`,
    };
  }

  if (!sharedContext.brand_context?.brand_name?.trim()) {
    return {
      isValid: false,
      error: 'Nama brand pada strategi project kosong. Lengkapi data brand terlebih dahulu.',
    };
  }

  // 3. FunnelStrategy must exist, be authoritative, and match canonicalProjectId & provenance
  if (!funnelStrategy || typeof funnelStrategy !== 'object') {
    return {
      isValid: false,
      error: 'FunnelStrategy wajib tersedia secara authoritative. Production gate dilarang auto-derive generic funnel strategy.',
    };
  }

  const isolationCheck = validateFunnelStrategyProjectIsolation(funnelStrategy, cleanProjectId);
  if (!isolationCheck.isValid) {
    return {
      isValid: false,
      error: isolationCheck.error || 'FunnelStrategy project isolation violation.',
    };
  }

  // Provenance check: provenance.source_project_id must match cleanProjectId
  if (!funnelStrategy.provenance?.source_project_id || funnelStrategy.provenance.source_project_id !== cleanProjectId) {
    return {
      isValid: false,
      error: `Project Identity Mismatch: FunnelStrategy.provenance.source_project_id ("${funnelStrategy.provenance?.source_project_id}") berbeda dari canonical project ID ("${cleanProjectId}").`,
    };
  }

  // 4. ContentItem must exist
  if (!contentItem || typeof contentItem !== 'object') {
    return {
      isValid: false,
      error: 'ContentItem belum dipilih atau tidak valid.',
    };
  }

  // ContentItem project identity must match canonicalProjectId
  // Check both project_id and projectId
  const itemProjectId = contentItem.project_id || contentItem.projectId;
  if (!itemProjectId || typeof itemProjectId !== 'string' || !itemProjectId.trim()) {
    return {
      isValid: false,
      error: 'ContentItem tidak memiliki project_id / projectId authoritative. Silent relabeling dilarang.',
    };
  }

  if (itemProjectId !== cleanProjectId) {
    return {
      isValid: false,
      error: `Project Identity Mismatch: ContentItem project ID ("${itemProjectId}") berbeda dari canonical project ID ("${cleanProjectId}"). Cross-project item leakage diblokir.`,
    };
  }

  // If both exist, neither should conflict with canonicalProjectId
  if (contentItem.project_id && contentItem.project_id !== cleanProjectId) {
    return {
      isValid: false,
      error: `Project Identity Mismatch: ContentItem.project_id ("${contentItem.project_id}") tidak cocok dengan canonical project ID ("${cleanProjectId}").`,
    };
  }
  if (contentItem.projectId && contentItem.projectId !== cleanProjectId) {
    return {
      isValid: false,
      error: `Project Identity Mismatch: ContentItem.projectId ("${contentItem.projectId}") tidak cocok dengan canonical project ID ("${cleanProjectId}").`,
    };
  }

  // 5. ContentItem content_item_id MUST be authoritative and non-empty string
  // DILARANG membuat ID baru di production gate (tidak boleh item_${projectId}_${no}, tidak boleh random ID)
  if (!contentItem.content_item_id || typeof contentItem.content_item_id !== 'string' || !contentItem.content_item_id.trim()) {
    return {
      isValid: false,
      error: 'ContentItem wajib memiliki content_item_id authoritative non-empty string. Pembuatan ID baru di production gate dilarang.',
    };
  }

  // 6. Strict Funnel Stage parsing (parseStrictFunnelStage ONLY, do NOT use normalizeFunnelStage)
  const parsedStage = parseStrictFunnelStage(contentItem.jenis);
  if (!parsedStage) {
    return {
      isValid: false,
      error: `ContentItem funnel stage "${contentItem.jenis || ''}" tidak valid. Wajib salah satu dari canonical stage: TOFU, MOFU, atau BOFU. Normalisasi permisif dinonaktifkan.`,
    };
  }

  // 7. Validate ContentItem against FunnelStrategy
  const strategyValidation = validateItemAgainstFunnelStrategy(contentItem, funnelStrategy);
  if (!strategyValidation.isValid) {
    return {
      isValid: false,
      error: `ContentItem tidak sesuai dengan authoritative FunnelStrategy: ${strategyValidation.violations.join('; ')}`,
    };
  }

  // 8. Format check: do not invent 'Single' if empty. Preserve or reject if required
  // If format is present and non-empty, it must be string
  if (contentItem.format !== undefined && contentItem.format !== null && typeof contentItem.format !== 'string') {
    return {
      isValid: false,
      error: 'ContentItem.format tidak valid (harus bertipe string).',
    };
  }

  // 9. CharacterDNA check: optional, but project-scoped
  let resolvedCharacterDNA: CharacterDNA | null = null;
  if (characterDNA !== undefined && characterDNA !== null) {
    if (!characterDNA.project_id || characterDNA.project_id !== cleanProjectId) {
      return {
        isValid: false,
        error: `Project Isolation Violation: CharacterDNA.project_id ("${characterDNA.project_id}") tidak cocok dengan canonical project ID ("${cleanProjectId}"). Menggunakan persona project lain atau generic persona dilarang.`,
      };
    }
    resolvedCharacterDNA = characterDNA;
  }

  const context: ProductionEngineContext = {
    project_id: cleanProjectId,
    shared_context: sharedContext,
    funnel_strategy: funnelStrategy,
    content_item: contentItem,
    canonical_funnel_stage: parsedStage,
    character_dna: resolvedCharacterDNA,
  };

  return {
    isValid: true,
    context,
  };
}
