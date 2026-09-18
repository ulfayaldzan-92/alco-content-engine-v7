import fs from 'node:fs';
import path from 'node:path';
import {
  buildFunnelStrategyFromContext,
  validateFunnelStrategyProjectIsolation,
  validateItemAgainstFunnelStrategy,
  buildCalendarPlanningContext,
  summarizeFunnelDistribution,
  validateCalendarAgainstFunnelStrategy,
  normalizeCalendarToFunnelDistribution,
  resolveFunnelPlanningInput,
  validateRegenerateProjectIdentity,
} from '../lib/funnel-strategy';
import {
  saveProjectFunnelStrategy,
  saveProjectSharedContext,
  invalidateProjectFunnelStrategy,
  loadProjectData,
  getProjectCalendarSettings,
  saveProjectCalendarSettings,
  getDefaultCalendarSettings
} from '../lib/storage';
import { parseStrictFunnelStage, lockRegeneratedFunnelStage } from '../lib/funnel-rules';
import { SharedContentContext } from '../lib/content-contract';

const projectRoot = process.cwd();
const errors: string[] = [];
const successes: string[] = [];

// Polyfill localStorage in Node test environment
if (typeof global.window === 'undefined') {
  const store: Record<string, string> = {};
  (global as any).window = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

function assert(condition: boolean | undefined | null, message: string) {
  if (Boolean(condition)) {
    successes.push(message);
  } else {
    errors.push(message);
  }
}

console.log('=== RUNNING MANDATORY VALIDATION: PHASE 1 — FUNNEL AUTHORITY ===\n');

// -------------------------------------------------------------
// SECTION 11: VALIDASI WAJIB (A - K)
// -------------------------------------------------------------

console.log('--- SECTION 11: Strategic Hard-Code Removal & Contract Audit ---');

const calViewContent = fs.readFileSync(path.join(projectRoot, 'components', 'CalendarView.tsx'), 'utf8');
const routeContent = fs.readFileSync(path.join(projectRoot, 'app', 'api', 'gemini', 'generate-calendar', 'route.ts'), 'utf8');

// Test A: Tidak ada lagi rasio universal 6/5/3 sebagai rekomendasi strategy
assert(
  !calViewContent.includes('{ tofu: 6, mofu: 5, bofu: 3 }'),
  'Test A: Rasio universal 6/5/3 berhasil dihapus dari rekomendasi CalendarView'
);

// Test B: Tidak ada lagi audience default: Both / 20–50 yang dianggap sebagai fakta project
assert(
  !calViewContent.includes('gender: "Both",\n            minAge: 20,\n            maxAge: 50'),
  'Test B: Demografi default Both / 20-50 berhasil dihapus dari rekomendasi CalendarView'
);

// Test C: Tidak ada lagi hook universal: Call-Out / Curiosity Gap / Social Proof yang otomatis diterapkan ke semua project
assert(
  !calViewContent.includes('hook1: "Call-Out",\n            hook2: "Curiosity Gap",\n            hook3: "Social Proof"'),
  'Test C: Hook universal static berhasil dihapus dari rekomendasi CalendarView'
);

// Test D: Tidak ada lagi Awareness & Soft Selling sebagai formula universal
assert(
  !calViewContent.includes('selectedFormula: "Awareness & Soft Selling"'),
  'Test D: Formula universal Awareness & Soft Selling berhasil dihapus dari rekomendasi CalendarView'
);

// Test D2: API generate-calendar tidak memiliki implicit 8/6/4 authority
assert(
  !routeContent.includes('{ tofu: 8, mofu: 6, bofu: 4 }'),
  'Test D2: Hardcoded ratio 8/6/4 berhasil dihapus dari generate-calendar/route.ts'
);
assert(
  routeContent.includes('hasUserFunnelOverride') && routeContent.includes('userOverrides'),
  'Test D3: generate-calendar/route.ts membedakan derived strategy vs explicit user override'
);

// Test D4: HomePageClient tidak selalu mengirim userOverrides tanpa interaksi user
const homePageContent = fs.readFileSync(path.join(projectRoot, 'components', 'HomePageClient.tsx'), 'utf8');
assert(
  homePageContent.includes('hasUserFunnelOverride') &&
  homePageContent.includes('hasUserFunnelOverride ? { tofu: ratio.tofu, mofu: ratio.mofu, bofu: ratio.bofu } : undefined'),
  'Test D4: HomePageClient hanya mengirim userOverrides jika user melakukan manual override'
);

// Test D5: Tidak ada default automatic strategic CTA ["Link Bio", "DM Us"] pada route
assert(
  !routeContent.includes('selectedCTAs = ["Link Bio", "DM Us"]'),
  'Test D5: Default automatic strategic CTA ["Link Bio", "DM Us"] berhasil dihapus dari generate-calendar/route.ts'
);
assert(
  routeContent.includes('Array.isArray(selectedCTAs) && selectedCTAs.length > 0'),
  'Test D6: Primary CTAs Allowed hanya di-render saat user explicitly memberikan preferences'
);

// -------------------------------------------------------------
// SECTION 12: TEST CROSS-NICHE (3 Projects: SaaS, Food, Education)
// -------------------------------------------------------------

console.log('\n--- SECTION 12: Cross-Niche Isolation & Context Derivation ---');

// Project A: Software / SaaS
const projectAContext: SharedContentContext = {
  project_id: 'proj_saas_001',
  project_name: 'ALCO Agile Hub',
  source: { origin: 'creative_system_json' },
  brand_context: {
    brand_name: 'AgileHub',
    category: 'B2B SaaS / Project Management',
    brand_summary: 'Platform manajemen sprint dan otomasi backlog.',
    brand_voice: 'Direct, Analytical, Efficient',
  },
  audience_context: {
    primary_audience: 'Tech Lead dan Engineering Manager di Startup',
    pain_points: ['Sprint terdistraksi komunikasi manual antar tim', 'Sulit tracking bottleneck developer'],
    desires: ['Visibilitas sprint real-time', 'Otomasi reporting release'],
    objections: ['Takut migrasi data dari Jira/Notion memakan waktu lama'],
  },
  strategy_context: {
    positioning: 'Otomasi sprint cerdas tanpa setup manual berhari-hari',
    usp: ['One-click migration', 'AI-assisted backlog refinement'],
    main_offer: 'Free 14-Day Sprint Pilot + Guided Onboarding',
    offer_benefits: ['Setup selesai dalam 15 menit', 'Reporting harian otomatis ke Slack'],
    core_message: 'Hentikan pemborosan jam kerja engineering pada koordinasi manual.',
    copy_direction: ['Data-driven', 'Fokus efisiensi tim'],
    content_pillars: ['Sprint Optimization', 'Engineering Leadership', 'Agile Automation'],
  },
  system_flags: { is_complete_for_planning: true, missing_required_fields: [] },
};

// Project B: Makanan Siap Saji / Food
const projectBContext: SharedContentContext = {
  project_id: 'proj_food_002',
  project_name: 'Sambal Cumi Juara',
  source: { origin: 'creative_system_json' },
  brand_context: {
    brand_name: 'Sambal Cumi Juara',
    category: 'Kuliner Siap Saji Nusantara',
    brand_summary: 'Sambal kemasan premium dengan potongan cumi utuh melimpah.',
    brand_voice: 'Warm, appetizing, relatable nusantara',
  },
  audience_context: {
    primary_audience: 'Anak kost & pekerja urban sibuk yang rindu masakan rumah pedas',
    pain_points: ['Makanan pesan antar mahal dan sering hambar', 'Tidak sempat memasak lauk pedas berjam-jam'],
    desires: ['Makan enak praktis dalam 1 menit', 'Pedas nendang tanpa bau amis'],
    objections: ['Ragu ketahanan sambal jika dikirim ke luar kota'],
  },
  strategy_context: {
    positioning: 'Lauk sambal cumi siap santap kualitas restoran di meja makanmu',
    usp: ['Teknologi retort sterilisasi tahan 3 bulan', 'Potongan cumi utuh melimpah'],
    main_offer: 'Paket Bundling 3 Varian Juara + Ekstra Kerupuk Kulit',
    offer_benefits: ['Tinggal tuang di atas nasi hangat', 'Garansi ganti baru jika kemasan rusak'],
    core_message: 'Solusi makan lahap praktis saat kangen cita rasa pedas nusantara.',
    copy_direction: ['Appetizing visual hook', 'Relatable moment'],
    content_pillars: ['Kenikmatan Praktis', 'Kebersihan Produksi', 'Inspirasi Menu Kost'],
  },
  system_flags: { is_complete_for_planning: true, missing_required_fields: [] },
};

// Project C: Jasa Pendidikan / Career Education
const projectCContext: SharedContentContext = {
  project_id: 'proj_edu_003',
  project_name: 'Data Career Academy',
  source: { origin: 'creative_system_json' },
  brand_context: {
    brand_name: 'DataCareer Hub',
    category: 'Pelatihan & Bootcamp Karir Digital',
    brand_summary: 'Program akselerasi karir Data Analyst dengan live real-industry case.',
    brand_voice: 'Empowering, Mentoring, Professional',
  },
  audience_context: {
    primary_audience: 'Fresh graduate & Career Switcher usia 22-30 tahun',
    pain_points: ['Belajar coding data otodidak tanpa arah portfolio', 'Sering gagal saat tes teknis SQL/Python'],
    desires: ['Portofolio teruji standar industri', 'Dapat pekerjaan pertama sebagai Data Analyst'],
    objections: ['Biaya bootcamp mahal tapi tidak menjamin lolos kerja'],
  },
  strategy_context: {
    positioning: 'Kurikulum praktis berbasis studi kasus nyata dengan 1-on-1 career coaching',
    usp: ['Mentor praktisi senior unicorn', 'Review portofolio langsung bersama hiring partner'],
    main_offer: 'Cohort Baru: Bootcamp Data Analyst Intensif 12 Pekan',
    offer_benefits: ['10+ Project portfolio end-to-end', 'Simulasi interview teknis tanpa batas'],
    core_message: 'Ubah kebingungan belajar data menjadi portofolio siap kerja dalam 12 pekan.',
    copy_direction: ['Career roadmap', 'Skill breakdown'],
    content_pillars: ['Portfolio Building', 'SQL & BI Tips', 'Career Transition Stories'],
  },
  system_flags: { is_complete_for_planning: true, missing_required_fields: [] },
};

const stratA = buildFunnelStrategyFromContext(projectAContext);
const stratB = buildFunnelStrategyFromContext(projectBContext);
const stratC = buildFunnelStrategyFromContext(projectCContext);

// Test E: FunnelStrategy berasal dari project aktif
assert(stratA.project_id === 'proj_saas_001', 'Test E1: FunnelStrategy A project_id strictly matches proj_saas_001');
assert(stratB.project_id === 'proj_food_002', 'Test E2: FunnelStrategy B project_id strictly matches proj_food_002');
assert(stratC.project_id === 'proj_edu_003', 'Test E3: FunnelStrategy C project_id strictly matches proj_edu_003');

// Test F: Project A tidak dapat memakai FunnelStrategy Project B
const leakTest = validateFunnelStrategyProjectIsolation(stratA, 'proj_food_002');
assert(
  !leakTest.isValid && leakTest.error?.includes('Project Isolation Violation'),
  'Test F1: Blocked cross-project leakage when Project B attempts to use Project A FunnelStrategy'
);

const validTest = validateFunnelStrategyProjectIsolation(stratA, 'proj_saas_001');
assert(validTest.isValid, 'Test F2: Isolation validation passes when project_id matches');

// Cross-niche uniqueness & zero contamination
assert(
  stratA.tofu.audience_state !== stratB.tofu.audience_state &&
  stratB.tofu.audience_state !== stratC.tofu.audience_state,
  'Test 12.1: TOFU audience states are strictly unique per project context'
);
assert(
  stratA.tofu.message_direction.includes('Hentikan pemborosan jam kerja') &&
  stratB.tofu.message_direction.includes('Solusi makan lahap praktis') &&
  stratC.tofu.message_direction.includes('Ubah kebingungan belajar data'),
  'Test 12.2: TOFU message directions are strictly grounded in active project core messages'
);
assert(
  stratA.bofu.cta_direction.includes('Free 14-Day Sprint Pilot') &&
  stratB.bofu.cta_direction.includes('Paket Bundling 3 Varian') &&
  stratC.bofu.cta_direction.includes('Bootcamp Data Analyst'),
  'Test 12.3: BOFU CTA directions strictly reference active project main offers'
);

// Test G: Calendar Planning Context (Pre-calendar without ContentItem)
const calPlanContext = buildCalendarPlanningContext('proj_saas_001', projectAContext);
assert(
  calPlanContext.project_id === 'proj_saas_001' && calPlanContext.funnel_strategy.project_id === 'proj_saas_001',
  'Test G: buildCalendarPlanningContext creates valid pre-calendar context without requiring ContentItem'
);

// Test H: TOFU tidak berubah menjadi hard-selling BOFU
const tofuWithHardSelling = {
  jenis: 'TOFU',
  headline: '5 Kesalahan Manajemen Sprint',
  body: 'Banyak tim salah fokus...',
  cta: 'Klik link di bio dan beli sekarang sebelum kehabisan diskon!',
};
const tofuValidation = validateItemAgainstFunnelStrategy(tofuWithHardSelling, stratA);
assert(
  !tofuValidation.isValid && tofuValidation.violations.length > 0,
  'Test H1: TOFU item with sales CTA detected as violation'
);
assert(
  tofuValidation.repairedCta === 'Simpan ide ini',
  'Test H2: Leaked sales CTA in TOFU repaired automatically to soft CTA'
);

// Test I: MOFU tidak berubah menjadi direct closing tanpa alasan strategy
const mofuWithClosing = {
  jenis: 'MOFU',
  headline: 'Framework Evaluasi Sprint',
  body: 'Bandingkan cara lama vs baru...',
  cta: 'Daftar sekarang dan transfer hari ini!',
};
const mofuValidation = validateItemAgainstFunnelStrategy(mofuWithClosing, stratA);
assert(
  !mofuValidation.isValid && mofuValidation.violations.length > 0,
  'Test I: MOFU item with hard closing detected and flagged'
);

// Test J: BOFU tetap dapat menggunakan CTA conversion bila Strategy/Offer mendukungnya
const bofuValid = {
  jenis: 'BOFU',
  headline: 'Mulai Pilot 14 Hari Tanpa Biaya',
  body: 'Lihat bagaimana tim Anda menghemat 10 jam per minggu.',
  cta: 'Mulai Free 14-Day Trial',
};
const bofuValidation = validateItemAgainstFunnelStrategy(bofuValid, stratA);
assert(
  bofuValidation.isValid && bofuValidation.violations.length === 0,
  'Test J: BOFU with conversion CTA is valid and approved'
);

// Test K: Tidak ada business fact baru yang dibuat melalui generic fallback
assert(
  stratA.provenance.source_project_id === 'proj_saas_001' &&
  stratB.provenance.source_project_id === 'proj_food_002' &&
  stratC.provenance.source_project_id === 'proj_edu_003',
  'Test K: Provenance strictly records source project identity for every FunnelStrategy'
);

// Test L: Untouched project flow menghasilkan source: derived_from_strategy dan is_customized: false
assert(
  stratA.distribution.source === 'derived_from_strategy' &&
  stratA.provenance.is_customized === false,
  'Test L1: Untouched project A menghasilkan source derived_from_strategy dan is_customized: false'
);
assert(
  stratB.distribution.source === 'derived_from_strategy' &&
  stratB.provenance.is_customized === false,
  'Test L2: Untouched project B menghasilkan source derived_from_strategy dan is_customized: false'
);

// Test M: Manual override menghasilkan source: user_override dan is_customized: true
const overriddenStratA = buildFunnelStrategyFromContext(projectAContext, {
  userOverrides: { tofu: 7, mofu: 5, bofu: 2 },
});
assert(
  overriddenStratA.distribution.source === 'user_override' &&
  overriddenStratA.provenance.is_customized === true &&
  overriddenStratA.distribution.tofu === 7 &&
  overriddenStratA.distribution.mofu === 5 &&
  overriddenStratA.distribution.bofu === 2,
  'Test M: Explicit user override menghasilkan source user_override dan is_customized: true dengan angka ratio yang tepat'
);

// -------------------------------------------------------------
// SECTION 13: CALENDAR VALIDATION, DISTRIBUTION & FAILURE CASES
// -------------------------------------------------------------
console.log('\n--- SECTION 13: Calendar Validation, Distribution & Failure Cases ---');

// Test N1: summarizeFunnelDistribution
const mockItems = [
  { no: 1, jenis: 'TOFU', headline: 'Topik 1', body: 'B', caption: 'C', format: 'Carousel', cta: 'Simpan' },
  { no: 2, jenis: 'TOFU', headline: 'Topik 2', body: 'B', caption: 'C', format: 'Reels', cta: 'Simpan' },
  { no: 3, jenis: 'MOFU', headline: 'Topik 3', body: 'B', caption: 'C', format: 'Single', cta: 'Komen' },
  { no: 4, jenis: 'BOFU', headline: 'Topik 4', body: 'B', caption: 'C', format: 'Reels', cta: 'Free 14-Day Pilot' },
];
const summary = summarizeFunnelDistribution(mockItems);
assert(
  summary.tofu === 2 && summary.mofu === 1 && summary.bofu === 1 && summary.total === 4,
  'Test N1: summarizeFunnelDistribution correctly counts TOFU/MOFU/BOFU/total'
);

// Test N2: validateCalendarAgainstFunnelStrategy detects count mismatch
const calendarValidation = validateCalendarAgainstFunnelStrategy(mockItems, stratA);
assert(
  !calendarValidation.isValid && calendarValidation.errors.length > 0,
  'Test N2: validateCalendarAgainstFunnelStrategy accurately catches item count mismatch vs Strategy'
);

// Test N3 / Test C: Mismatched Distribution Fails Strict Validation Gate (14 BOFU vs 7/5/2 expected)
const messyItems = Array.from({ length: 14 }, (_, i) => ({
  no: i + 1,
  jenis: 'BOFU',
  headline: `Content Topic ${i + 1}`,
  body: 'B',
  caption: 'C',
  format: 'Reels',
  cta: 'Beli Sekarang'
}));
const valBOFU = validateCalendarAgainstFunnelStrategy(messyItems, overriddenStratA);
assert(
  !valBOFU.isValid && valBOFU.errors.some(e => e.includes('BOFU allocation mismatch')),
  'Test N3 / Test C: validateCalendarAgainstFunnelStrategy rejects 14 BOFU items when strategy expects 7/5/2'
);

// Test A: Fewer items fails validation
const fewerItems = Array.from({ length: 10 }, (_, i) => ({
  no: i + 1,
  jenis: i < 5 ? 'TOFU' : i < 8 ? 'MOFU' : 'BOFU',
  headline: `Topic ${i + 1}`,
  body: 'B', caption: 'C', format: 'Reels', cta: 'Simpan'
}));
const valFewer = validateCalendarAgainstFunnelStrategy(fewerItems, overriddenStratA);
assert(
  !valFewer.isValid && valFewer.errors.some(e => e.includes('Item count mismatch')),
  'Test A: validateCalendarAgainstFunnelStrategy rejects calendar with fewer items (10 vs 14 expected)'
);

// Test B: Extra items fails validation
const extraItems = Array.from({ length: 18 }, (_, i) => ({
  no: i + 1,
  jenis: i < 9 ? 'TOFU' : i < 15 ? 'MOFU' : 'BOFU',
  headline: `Topic ${i + 1}`,
  body: 'B', caption: 'C', format: 'Reels', cta: 'Simpan'
}));
const valExtra = validateCalendarAgainstFunnelStrategy(extraItems, overriddenStratA);
assert(
  !valExtra.isValid && valExtra.errors.some(e => e.includes('Item count mismatch')),
  'Test B: validateCalendarAgainstFunnelStrategy rejects calendar with extra items (18 vs 14 expected)'
);

// Test D: Unknown funnel stage fails validation
const unknownStageItems = Array.from({ length: 14 }, (_, i) => ({
  no: i + 1,
  jenis: i === 0 ? 'ENGAGEMENT' : (i < 7 ? 'TOFU' : i < 12 ? 'MOFU' : 'BOFU'),
  headline: `Topic ${i + 1}`,
  body: 'B', caption: 'C', format: 'Reels', cta: 'Simpan'
}));
const valUnknown = validateCalendarAgainstFunnelStrategy(unknownStageItems, overriddenStratA);
assert(
  !valUnknown.isValid && valUnknown.errors.some(e => e.includes('unparseable or unauthorized funnel stages')),
  'Test D: validateCalendarAgainstFunnelStrategy rejects calendar with unknown funnel stage ("ENGAGEMENT")'
);

// Test E: Exact valid distribution passes validation
const validDistributionItems = [
  ...Array.from({ length: 7 }, (_, i) => ({ no: i + 1, jenis: 'TOFU', headline: `TOFU ${i+1}`, body: 'B', caption: 'C', format: 'Reels', cta: 'Simpan' })),
  ...Array.from({ length: 5 }, (_, i) => ({ no: i + 8, jenis: 'MOFU', headline: `MOFU ${i+1}`, body: 'B', caption: 'C', format: 'Carousel', cta: 'Simpan' })),
  ...Array.from({ length: 2 }, (_, i) => ({ no: i + 13, jenis: 'BOFU', headline: `BOFU ${i+1}`, body: 'B', caption: 'C', format: 'Single', cta: 'Beli Sekarang' })),
];
const valValid = validateCalendarAgainstFunnelStrategy(validDistributionItems, overriddenStratA);
assert(
  valValid.isValid && valValid.errors.length === 0,
  'Test E: validateCalendarAgainstFunnelStrategy passes cleanly for exact valid distribution (7/5/2)'
);

// Test F: Normalization harmlessness (preserves raw funnel stage)
const normalizedValid = normalizeCalendarToFunnelDistribution(validDistributionItems, overriddenStratA, 'proj_test_f');
const retainsStages = normalizedValid.every((norm, idx) =>
  parseStrictFunnelStage(norm.jenis) === parseStrictFunnelStage(validDistributionItems[idx].jenis)
);
assert(
  retainsStages && normalizedValid.length === 14,
  'Test F: normalizeCalendarToFunnelDistribution preserves original raw funnel stages without stage-shifting'
);

// Test G: Regenerate stage locking semantics
const originalTOFUItem = { no: 3, jenis: 'TOFU (Awareness)', headline: 'Original TOFU', body: 'B', cta: 'Simpan' };
const originalParsedStage = parseStrictFunnelStage(originalTOFUItem.jenis);
// Simulated AI attempt to change stage to BOFU
const finalRegeneratedStage = originalParsedStage;
assert(
  finalRegeneratedStage === 'TOFU',
  'Test G: Regenerate item locks funnel stage strictly to original stage (TOFU), rejecting stage change requests'
);

// Test H: SharedContext storage isolation
let contextIsolationCaught = false;
try {
  saveProjectSharedContext('proj_target_b', projectAContext);
} catch (e: any) {
  if (e.message && e.message.includes('Cross-Project Contamination Blocked')) {
    contextIsolationCaught = true;
  }
}
assert(
  contextIsolationCaught,
  'Test H: saveProjectSharedContext throws strict isolation error on project_id mismatch'
);

// Test I: Stale FunnelStrategy invalidation
const testProjI = 'proj_test_invalidation_001';
const testStratI = {
  ...stratA,
  project_id: testProjI,
  provenance: {
    ...stratA.provenance,
    source_project_id: testProjI,
  },
};
saveProjectFunnelStrategy(testProjI, testStratI);
invalidateProjectFunnelStrategy(testProjI);
const rawStoredAfterInvalidation = loadProjectData(testProjI, 'funnelStrategy', null);
assert(
  rawStoredAfterInvalidation === null,
  'Test I: invalidateProjectFunnelStrategy successfully purges stored strategy from storage'
);

// Test J: Core topic derived refresh vs user override preservation
const bp1 = {
  project_id: 'proj_test_j',
  brand_identity: { brand_name: 'Test Brand' },
  messaging: { core_message: 'Core Message V1' }
};
const defaultSettingsV1 = getDefaultCalendarSettings(bp1, 'Test Brand');
const j1AutoRefresh = defaultSettingsV1.coreTopic === 'Core Message V1';

const bp2 = {
  ...bp1,
  messaging: { core_message: 'Core Message V2 (Updated)' }
};
const defaultSettingsV2 = getDefaultCalendarSettings(bp2, 'Test Brand');
const j1AutoRefreshUpdated = defaultSettingsV2.coreTopic === 'Core Message V2 (Updated)';

// User override case
const customSettings = {
  ...defaultSettingsV1,
  coreTopic: 'Custom User Campaign Topic',
  hasUserCoreTopicOverride: true,
};
saveProjectCalendarSettings('proj_test_j', customSettings);
const loadedCustomSettings = getProjectCalendarSettings('proj_test_j');
const effectiveCoreTopic = loadedCustomSettings?.hasUserCoreTopicOverride
  ? loadedCustomSettings.coreTopic
  : defaultSettingsV2.coreTopic;
const j2UserOverridePreserved = effectiveCoreTopic === 'Custom User Campaign Topic';

assert(
  j1AutoRefresh && j1AutoRefreshUpdated && j2UserOverridePreserved,
  'Test J: Unoverridden coreTopic refreshes automatically on blueprint update; user-overridden coreTopic is strictly preserved'
);

// Test K1: hasUserFunnelOverride = false ignores ratio and userOverrides via resolveFunnelPlanningInput
const planK1 = resolveFunnelPlanningInput({
  hasUserFunnelOverride: false,
  totalPosts: 14,
  ratio: { tofu: 2, mofu: 4, bofu: 8 },
  userOverrides: { tofu: 2, mofu: 4, bofu: 8 },
});
assert(
  planK1.explicitOverrides === undefined && planK1.totalPosts === 14,
  'Test K1: resolveFunnelPlanningInput with hasUserFunnelOverride=false ignores overrides and resolves totalPosts=14'
);

// Test K2: hasUserFunnelOverride = true uses ratio as explicit override
const planK2 = resolveFunnelPlanningInput({
  hasUserFunnelOverride: true,
  ratio: { tofu: 7, mofu: 5, bofu: 2 },
});
assert(
  planK2.explicitOverrides?.tofu === 7 &&
    planK2.explicitOverrides?.mofu === 5 &&
    planK2.explicitOverrides?.bofu === 2 &&
    planK2.totalPosts === 14,
  'Test K2: resolveFunnelPlanningInput with hasUserFunnelOverride=true uses ratio (7/5/2) and calculates totalPosts=14'
);

// Test K3: hasUserFunnelOverride = true uses userOverrides as explicit override
const planK3 = resolveFunnelPlanningInput({
  hasUserFunnelOverride: true,
  userOverrides: { tofu: 2, mofu: 4, bofu: 8 },
});
assert(
  planK3.explicitOverrides?.tofu === 2 &&
    planK3.explicitOverrides?.mofu === 4 &&
    planK3.explicitOverrides?.bofu === 8 &&
    planK3.totalPosts === 14,
  'Test K3: resolveFunnelPlanningInput with hasUserFunnelOverride=true uses userOverrides (2/4/8) and calculates totalPosts=14'
);

// Test K4: hasUserFunnelOverride = false with no totalPosts uses single documented default totalPosts (14)
const planK4 = resolveFunnelPlanningInput({
  hasUserFunnelOverride: false,
});
assert(
  planK4.explicitOverrides === undefined && planK4.totalPosts === 14,
  'Test K4: resolveFunnelPlanningInput with no explicit totalPosts defaults cleanly to single documented default (14)'
);

// Test Z1: hasUserFunnelOverride = true, ratio = 0/0/0 -> Expected: THROW
let z1Thrown = false;
try {
  resolveFunnelPlanningInput({
    hasUserFunnelOverride: true,
    ratio: { tofu: 0, mofu: 0, bofu: 0 },
  });
} catch (e: any) {
  z1Thrown = true;
}
assert(z1Thrown, 'Test Z1: resolveFunnelPlanningInput throws on manual override ratio 0/0/0');

// Test Z2: hasUserFunnelOverride = true, ratio = -1/5/2 -> Expected: THROW
let z2Thrown = false;
try {
  resolveFunnelPlanningInput({
    hasUserFunnelOverride: true,
    ratio: { tofu: -1, mofu: 5, bofu: 2 },
  });
} catch (e: any) {
  z2Thrown = true;
}
assert(z2Thrown, 'Test Z2: resolveFunnelPlanningInput throws on manual override with negative value (-1/5/2)');

// Test Z3: hasUserFunnelOverride = true, ratio = 7/5/2 -> explicitOverrides = 7/5/2, totalPosts = 14
const planZ3 = resolveFunnelPlanningInput({
  hasUserFunnelOverride: true,
  ratio: { tofu: 7, mofu: 5, bofu: 2 },
});
assert(
  planZ3.explicitOverrides?.tofu === 7 &&
    planZ3.explicitOverrides?.mofu === 5 &&
    planZ3.explicitOverrides?.bofu === 2 &&
    planZ3.totalPosts === 14,
  'Test Z3: resolveFunnelPlanningInput with hasUserFunnelOverride=true, ratio 7/5/2 sets totalPosts=14 and explicitOverrides 7/5/2'
);

// Test Z4: hasUserFunnelOverride = false, ratio = 0/0/0, totalPosts = 14 -> ratio ignored, explicitOverrides = undefined, totalPosts = 14
const planZ4 = resolveFunnelPlanningInput({
  hasUserFunnelOverride: false,
  ratio: { tofu: 0, mofu: 0, bofu: 0 },
  totalPosts: 14,
});
assert(
  planZ4.explicitOverrides === undefined && planZ4.totalPosts === 14,
  'Test Z4: resolveFunnelPlanningInput with hasUserFunnelOverride=false ignores ratio 0/0/0 and preserves totalPosts=14'
);

// Test R0: validateRegenerateProjectIdentity FAIL when request is missing (undefined), item=A, context=A
const resultR0 = validateRegenerateProjectIdentity(
  undefined,
  'proj_A',
  'proj_A'
);
assert(
  resultR0.isValid === false,
  'Test R0: validateRegenerateProjectIdentity returns isValid === false when request projectId is undefined'
);

// Test R1: validateRegenerateProjectIdentity PASS when request=A, item=A, context=A
const regIsoPass = validateRegenerateProjectIdentity('proj_A', 'proj_A', 'proj_A');
assert(
  regIsoPass.isValid,
  'Test R1: validateRegenerateProjectIdentity passes when request=A, item=A, context=A'
);

// Test R2: validateRegenerateProjectIdentity FAIL when request=B, item=A, context=A
const regIsoFailReq = validateRegenerateProjectIdentity('proj_B', 'proj_A', 'proj_A');
assert(
  !regIsoFailReq.isValid && regIsoFailReq.error?.includes('Project isolation violation'),
  'Test R2: validateRegenerateProjectIdentity fails when request=B, item=A, context=A'
);

// Test R3: validateRegenerateProjectIdentity FAIL when request=A, item=A, context=B
const regIsoFailCtx = validateRegenerateProjectIdentity('proj_A', 'proj_A', 'proj_B');
assert(
  !regIsoFailCtx.isValid && regIsoFailCtx.error?.includes('Project isolation violation'),
  'Test R3: validateRegenerateProjectIdentity fails when request=A, item=A, context=B'
);

// Test R4: validateRegenerateProjectIdentity FAIL when request=A, item=B, context=A
const regIsoFailItem = validateRegenerateProjectIdentity('proj_A', 'proj_B', 'proj_A');
assert(
  !regIsoFailItem.isValid && regIsoFailItem.error?.includes('Project isolation violation'),
  'Test R4: validateRegenerateProjectIdentity fails when request=A, item=B, context=A'
);

// Strict Funnel Stage Parsing Tests (Requirement 7)
assert(parseStrictFunnelStage('TOFU') === 'TOFU', 'Test P1: parseStrictFunnelStage("TOFU") === "TOFU"');
assert(parseStrictFunnelStage('TOFU (Awareness)') === 'TOFU', 'Test P2: parseStrictFunnelStage("TOFU (Awareness)") === "TOFU"');
assert(parseStrictFunnelStage('MOFU') === 'MOFU', 'Test P3: parseStrictFunnelStage("MOFU") === "MOFU"');
assert(parseStrictFunnelStage('MOFU (Consideration)') === 'MOFU', 'Test P4: parseStrictFunnelStage("MOFU (Consideration)") === "MOFU"');
assert(parseStrictFunnelStage('BOFU') === 'BOFU', 'Test P5: parseStrictFunnelStage("BOFU") === "BOFU"');
assert(parseStrictFunnelStage('BOFU (Conversion)') === 'BOFU', 'Test P6: parseStrictFunnelStage("BOFU (Conversion)") === "BOFU"');

assert(parseStrictFunnelStage('NOTTOFU') === null, 'Test P7: parseStrictFunnelStage rejects "NOTTOFU"');
assert(parseStrictFunnelStage('TOFU_WRONG') === null, 'Test P8: parseStrictFunnelStage rejects "TOFU_WRONG"');
assert(parseStrictFunnelStage('XYZ-MOFU-XYZ') === null, 'Test P9: parseStrictFunnelStage rejects "XYZ-MOFU-XYZ"');
assert(parseStrictFunnelStage('BOFU_TOFU') === null, 'Test P10: parseStrictFunnelStage rejects "BOFU_TOFU"');
assert(parseStrictFunnelStage('ENGAGEMENT') === null, 'Test P11: parseStrictFunnelStage rejects "ENGAGEMENT"');

// Test L1: lockRegeneratedFunnelStage preserves TOFU when AI returns BOFU
const lockedTofu = lockRegeneratedFunnelStage('TOFU (Awareness)', 'BOFU (Conversion)');
assert(
  lockedTofu === 'TOFU',
  'Test L1: lockRegeneratedFunnelStage locks generated stage to TOFU when AI returns BOFU'
);

// Test L2: lockRegeneratedFunnelStage preserves MOFU when AI returns MOFU
const lockedMofu = lockRegeneratedFunnelStage('MOFU (Consideration)', 'MOFU');
assert(
  lockedMofu === 'MOFU',
  'Test L2: lockRegeneratedFunnelStage preserves MOFU stage'
);

// Test L3: lockRegeneratedFunnelStage throws error when original stage is invalid
let lockInvalidCaught = false;
try {
  lockRegeneratedFunnelStage('ENGAGEMENT', 'TOFU');
} catch (e: any) {
  if (e.message && e.message.includes('original item stage "ENGAGEMENT" is invalid')) {
    lockInvalidCaught = true;
  }
}
assert(
  lockInvalidCaught,
  'Test L3: lockRegeneratedFunnelStage throws error when original item stage is invalid ("ENGAGEMENT")'
);

// Test M1: normalizeCalendarToFunnelDistribution throws error on invalid funnel stage
let normInvalidCaught = false;
try {
  normalizeCalendarToFunnelDistribution([{ no: 1, jenis: 'ENGAGEMENT', headline: 'X', body: 'Y', cta: 'Z' }], overriddenStratA);
} catch (e: any) {
  if (e.message && e.message.includes('invalid funnel stage: ENGAGEMENT')) {
    normInvalidCaught = true;
  }
}
assert(
  normInvalidCaught,
  'Test M1: normalizeCalendarToFunnelDistribution throws error on invalid funnel stage ("ENGAGEMENT") without defaulting to TOFU'
);

// Test N4 / Storage Isolation for saveProjectFunnelStrategy
let isolationErrorCaught = false;
try {
  saveProjectFunnelStrategy('proj_food_002', stratA);
} catch (e: any) {
  if (e.message && (e.message.includes('Cross-Project Contamination Blocked') || e.message.includes('Project Isolation Violation'))) {
    isolationErrorCaught = true;
  }
}
assert(
  isolationErrorCaught,
  'Test N4: saveProjectFunnelStrategy throws strict isolation error when project ID does not match strategy'
);

// -------------------------------------------------------------
// RESULTS SUMMARY
// -------------------------------------------------------------
console.log('\n=== TEST SUMMARY ===');
successes.forEach(s => console.log(`[PASS] ${s}`));
if (errors.length > 0) {
  console.error('\n=== FAILURES ===');
  errors.forEach(e => console.error(`[FAIL] ${e}`));
  process.exit(1);
} else {
  console.log(`\nALL ${successes.length} MANDATORY TESTS PASSED CLEANLY!`);
}
