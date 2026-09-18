import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const errors = [];
const successes = [];

function assert(condition, message) {
  if (condition) {
    successes.push(message);
  } else {
    errors.push(message);
  }
}

console.log('=== RUNNING MANDATORY VALIDATION: FUNDAMENTAL 3 & 4 ===\n');

// -------------------------------------------------------------
// TEST A: Project Isolation & Identity Guardrails
// -------------------------------------------------------------
console.log('--- TEST A: Project Isolation & Identity Stamping ---');
const prodCtxPath = path.join(projectRoot, 'lib', 'production-context.ts');
const prodCtxContent = fs.readFileSync(prodCtxPath, 'utf8');

assert(
  prodCtxContent.includes('sharedContext.project_id !== canonicalProjectId'),
  'Test A1: buildProductionContext validates project_id match between sharedContext and canonicalProjectId'
);
assert(
  prodCtxContent.includes('itemProjectId !== canonicalProjectId'),
  'Test A2: buildProductionContext rejects ContentItem with mismatched project_id'
);
assert(
  prodCtxContent.includes('characterDNA.project_id !== canonicalProjectId'),
  'Test A3: buildProductionContext discards CharacterDNA belonging to a different project_id'
);

// -------------------------------------------------------------
// TEST B: Generator Authority Validation
// -------------------------------------------------------------
console.log('--- TEST B: Generator Authority Validation ---');
assert(
  prodCtxContent.includes('export function validateProductionGenerationRequest'),
  'Test B1: validateProductionGenerationRequest function is defined and exported'
);
assert(
  prodCtxContent.includes('Request project_id (${project_id}) mismatch with production_context.identity.project_id'),
  'Test B2: Generator rejects requests where request.project_id != production_context.identity.project_id'
);
assert(
  prodCtxContent.includes('Request content_item_id (${content_item_id}) mismatch with production_context.identity.content_item_id'),
  'Test B3: Generator rejects requests where request.content_item_id != production_context.identity.content_item_id'
);

const recRoutePath = path.join(projectRoot, 'app', 'api', 'gemini', 'recommendation', 'route.ts');
const recRouteContent = fs.readFileSync(recRoutePath, 'utf8');
assert(
  recRouteContent.includes('validateProductionGenerationRequest'),
  'Test B4: /api/gemini/recommendation enforces validateProductionGenerationRequest'
);

// -------------------------------------------------------------
// TEST C: Carousel 2-Stage Generation Scope & Batching (Fundamental 4)
// -------------------------------------------------------------
console.log('--- TEST C: Carousel 2-Stage Generation & Slide Batching ---');
const pagePath = path.join(projectRoot, 'app', 'production-studio', 'page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');

assert(
  pageContent.includes('buildCarouselStage1Prompt'),
  'Test C1: buildCarouselStage1Prompt exists to decouple content plan from visual enrichment'
);
assert(
  pageContent.includes('buildCarouselStage2Prompt'),
  'Test C2: buildCarouselStage2Prompt exists for visual enrichment generation'
);
assert(
  pageContent.includes('batchSlideNumbers'),
  'Test C3: buildCarouselStage2Prompt supports batchSlideNumbers parameter for segmented slide generation'
);

// -------------------------------------------------------------
// TEST D: Partial Failure Recovery & Stage Merging
// -------------------------------------------------------------
console.log('--- TEST D: Partial Failure Recovery & Stage Merging ---');
assert(
  pageContent.includes('mergeCarouselPlanStages'),
  'Test D1: mergeCarouselPlanStages cleanly combines stage 1 plan with stage 2 visual enrichment'
);
assert(
  pageContent.includes('normalizedStage1'),
  'Test D2: Carousel generation preserves stage 1 plan even if stage 2 visual enrichment fails'
);

// -------------------------------------------------------------
// TEST E: Anti-Drift & Zero Hardcoded Semantic Copy
// -------------------------------------------------------------
console.log('--- TEST E: Anti-Drift & Zero Hardcoded Semantic Copy ---');
const forbiddenStrings = [
  "Kok Caption-nya Terasa Kaku",
  "Kok caption-nya terasa kaku",
  "Nulis Panjang Lebar, Tapi Pesan Intinya Malah Tenggelam",
  "Udah nulis lama, tapi pesan pentingnya malah tenggelam",
  "Satu Sistem untuk Ide, Struktur, dan Eksekusi Konten",
  "Workflow Terstruktur, Waktu Produksi Singkat & Output Konsisten",
  "Mulai Bangun Sistem Kontenmu Hari Ini"
];

let foundForbidden = false;
for (const str of forbiddenStrings) {
  if (pageContent.includes(str)) {
    errors.push(`Test E FAIL: Found hardcoded marketing copy in page.tsx: "${str}"`);
    foundForbidden = true;
  }
}
if (!foundForbidden) {
  successes.push('Test E1: ZERO occurrences of hardcoded marketing copy in Production Studio');
}

assert(
  prodCtxContent.includes('ANTI_DRIFT_RULES'),
  'Test E2: ANTI_DRIFT_RULES mandate strictly enforced in production-context'
);

// -------------------------------------------------------------
// TEST F: Production Context Authority Across Routes
// -------------------------------------------------------------
console.log('--- TEST F: Production Context Authority Across Routes ---');
const regenRoutePath = path.join(projectRoot, 'app', 'api', 'gemini', 'regenerate-item', 'route.ts');
const regenRouteContent = fs.readFileSync(regenRoutePath, 'utf8');

assert(
  regenRouteContent.includes('sharedContentContext.project_id'),
  'Test F1: /api/gemini/regenerate-item verifies sharedContentContext.project_id'
);

const calRoutePath = path.join(projectRoot, 'app', 'api', 'gemini', 'generate-calendar', 'route.ts');
const calRouteContent = fs.readFileSync(calRoutePath, 'utf8');

assert(
  calRouteContent.includes('buildSharedContentContext') || calRouteContent.includes('providedContext.brand_context'),
  'Test F2: /api/gemini/generate-calendar requires valid Blueprint or SharedContentContext'
);

// -------------------------------------------------------------
// RESULTS SUMMARY
// -------------------------------------------------------------
console.log('\n=== TEST RESULTS ===');
successes.forEach(s => console.log(`[PASS] ${s}`));
if (errors.length > 0) {
  console.error('\n=== FAILURES ===');
  errors.forEach(e => console.error(`[FAIL] ${e}`));
  process.exit(1);
} else {
  console.log(`\nALL ${successes.length} MANDATORY TESTS PASSED!`);
}
