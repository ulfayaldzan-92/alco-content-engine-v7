import {
  type ProductionPackage,
  type ProductionAssetType,
  validateProductionPackage,
} from './production-contract';
import {
  saveProjectData,
  loadProjectData,
  removeProjectData,
} from './storage';

// ============================================================================
// STRICT PROJECT-SCOPED PRODUCTION PACKAGE STORAGE (PHASE 3D-A)
// Deterministic storage boundary keyed strictly by:
// projectId + contentItemId + assetType
// ============================================================================

export interface SaveProductionPackageResult {
  ok: boolean;
  error?: string;
}

const CANONICAL_ASSET_TYPES: ProductionAssetType[] = ['image', 'carousel', 'video'];

/**
 * Builds the deterministic storage data type string for a package.
 * Key format: production_package_${contentItemId}_${assetType}
 */
export function getProductionPackageDataType(
  contentItemId: string,
  assetType: ProductionAssetType
): string {
  return `production_package_${contentItemId}_${assetType}`;
}

/**
 * Saves a validated ProductionPackage strictly scoped to its project_id, content_item_id, and asset_type.
 * FAIL-CLOSED: Rejects unvalidated packages, project identity mismatches, or missing parameters.
 * Does not repair, clone, or relabel packages.
 */
export function saveProductionPackage(
  projectId: string,
  productionPackage: ProductionPackage
): SaveProductionPackageResult {
  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    return {
      ok: false,
      error: 'Project ID must be a non-empty string',
    };
  }

  const cleanProjectId = projectId.trim();

  // Validate package structure and fields
  const validation = validateProductionPackage(productionPackage);
  if (!validation.isValid || !productionPackage) {
    return {
      ok: false,
      error: validation.error || 'ProductionPackage validation failed',
    };
  }

  // Strict project identity check
  if (productionPackage.project_id !== cleanProjectId) {
    return {
      ok: false,
      error: `Project Identity Mismatch: Package project_id ("${productionPackage.project_id}") does not match target projectId ("${cleanProjectId}")`,
    };
  }

  if (!productionPackage.content_item_id || !productionPackage.content_item_id.trim()) {
    return {
      ok: false,
      error: 'ProductionPackage content_item_id must be a non-empty string',
    };
  }

  if (!CANONICAL_ASSET_TYPES.includes(productionPackage.asset_type)) {
    return {
      ok: false,
      error: `Invalid asset_type "${productionPackage.asset_type}". Must be image, carousel, or video`,
    };
  }

  const dataType = getProductionPackageDataType(
    productionPackage.content_item_id,
    productionPackage.asset_type
  );

  saveProjectData(cleanProjectId, dataType, productionPackage);

  return { ok: true };
}

/**
 * Loads a ProductionPackage strictly by exact projectId, contentItemId, and assetType.
 * FAIL-CLOSED: Validates loaded payload and returns null on missing data,
 * project_id mismatch, content_item_id mismatch, or asset_type mismatch.
 * Does not attempt fallback to other projects, items, or asset types.
 */
export function loadProductionPackage(
  projectId: string,
  contentItemId: string,
  assetType: ProductionAssetType
): ProductionPackage | null {
  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    return null;
  }
  if (!contentItemId || typeof contentItemId !== 'string' || !contentItemId.trim()) {
    return null;
  }
  if (!CANONICAL_ASSET_TYPES.includes(assetType)) {
    return null;
  }

  const cleanProjectId = projectId.trim();
  const cleanContentItemId = contentItemId.trim();
  const dataType = getProductionPackageDataType(cleanContentItemId, assetType);

  const stored = loadProjectData(cleanProjectId, dataType, null);
  if (!stored || typeof stored !== 'object') {
    return null;
  }

  // Validate stored object against ProductionPackage schema
  const validation = validateProductionPackage(stored);
  if (!validation.isValid) {
    return null;
  }

  // Strict identity verification
  if (stored.project_id !== cleanProjectId) {
    return null;
  }
  if (stored.content_item_id !== cleanContentItemId) {
    return null;
  }
  if (stored.asset_type !== assetType) {
    return null;
  }

  return stored as ProductionPackage;
}

/**
 * Removes a ProductionPackage strictly matching exact projectId, contentItemId, and assetType.
 */
export function removeProductionPackage(
  projectId: string,
  contentItemId: string,
  assetType: ProductionAssetType
): boolean {
  if (!projectId || typeof projectId !== 'string' || !projectId.trim()) {
    return false;
  }
  if (!contentItemId || typeof contentItemId !== 'string' || !contentItemId.trim()) {
    return false;
  }
  if (!CANONICAL_ASSET_TYPES.includes(assetType)) {
    return false;
  }

  const cleanProjectId = projectId.trim();
  const cleanContentItemId = contentItemId.trim();
  const dataType = getProductionPackageDataType(cleanContentItemId, assetType);

  removeProjectData(cleanProjectId, dataType);
  return true;
}
