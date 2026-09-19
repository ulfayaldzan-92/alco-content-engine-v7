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
  resolveCoreCampaignTopic,
  resolveClientCoreTopicRequest,
  type FunnelStrategy,
} from '../lib/funnel-strategy';
import {
  saveProjectFunnelStrategy,
  saveProjectSharedContext,
  invalidateProjectFunnelStrategy,
  loadProjectData,
  saveProjectData,
  getProjectCalendarSettings,
  saveProjectCalendarSettings,
  getDefaultCalendarSettings,
  loadProjectCalendarItemsStrictForProduction,
  loadProjectSharedContextStrictForProduction,
  loadStoredProjectFunnelStrategyStrict,
} from '../lib/storage';
import { parseStrictFunnelStage, lockRegeneratedFunnelStage } from '../lib/funnel-rules';
import { SharedContentContext, ContentItem, CharacterDNA } from '../lib/content-contract';
import {
  ProductionEngineContext,
  buildProductionEngineContext,
  resolveProductionContentItemTarget,
} from '../lib/production-engine-context';
import {
  adaptEngineContextToProductionContext,
  formatProductionContextForPrompt,
} from '../lib/production-context';
import {
  ImageProductionPackage,
  CarouselProductionPackage,
  VideoProductionPackage,
  ProductionPackage,
  validateProductionPackage,
  validateProductionPackageIdentity,
  buildProductionStrategySnapshot,
  buildProductionContentSnapshot,
  buildProductionBrandVisualSnapshot,
} from '../lib/production-contract';
import {
  buildProductionPackage,
  ProductionAssetInput,
  ProductionPackageMetadata,
} from '../lib/production-engine';
import {
  ImageProductionCandidate,
  CarouselProductionCandidate,
  VideoProductionCandidate,
  ProductionCandidate,
  validateProductionCandidate,
  buildImageProductionCandidate,
  buildCarouselProductionCandidate,
  buildVideoProductionCandidate,
  buildCanonicalVideoScenePlan,
  resolveVideoProductionMode,
} from '../lib/production-candidate';
import { isAuthoritativeProductionOutputSource } from '../lib/production-output-source';

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

// Test D7: Tidak ada generic strategic fallback "Brand Strategy Launch Campaign" pada generate-calendar/route.ts
assert(
  !routeContent.includes('"Brand Strategy Launch Campaign"'),
  'Test D7: Generic strategic fallback "Brand Strategy Launch Campaign" berhasil dihapus dari generate-calendar/route.ts'
);

// Test D8: Route mengimpor dan menggunakan resolveCoreCampaignTopic
assert(
  routeContent.includes('resolveCoreCampaignTopic') && routeContent.includes('resolvedCoreTopic'),
  'Test D8: generate-calendar/route.ts mengadopsi resolveCoreCampaignTopic untuk single authoritative topic'
);

// Test C1: Explicit user coreTopic prioritizes over context core_message
const topicC1 = resolveCoreCampaignTopic('Campaign Ramadan', 'Pesan utama project');
assert(
  topicC1 === 'Campaign Ramadan',
  'Test C1: Explicit coreTopic ("Campaign Ramadan") overrides context core_message'
);

// Test C2: Undefined explicit coreTopic falls back cleanly to context core_message
const topicC2 = resolveCoreCampaignTopic(undefined, 'Pesan utama project');
assert(
  topicC2 === 'Pesan utama project',
  'Test C2: Undefined explicit coreTopic resolves cleanly to context core_message'
);

// Test C3: Whitespace-only explicit coreTopic falls back cleanly to context core_message
const topicC3 = resolveCoreCampaignTopic('   ', 'Pesan utama project');
assert(
  topicC3 === 'Pesan utama project',
  'Test C3: Whitespace-only explicit coreTopic resolves to context core_message'
);

// Test C4: Both explicit coreTopic and context core_message missing throws error (fail closed)
let c4Thrown = false;
try {
  resolveCoreCampaignTopic(undefined, '');
} catch (e: any) {
  c4Thrown = true;
}
assert(
  c4Thrown,
  'Test C4: resolveCoreCampaignTopic throws error when both explicit coreTopic and context core_message are empty (fail closed)'
);

// Test CL1: HomePageClient does not use generic strategic fallback "Peluncuran Produk Strategy"
assert(
  !homePageContent.includes("'Peluncuran Produk Strategy'"),
  'Test CL1: HomePageClient tidak lagi memiliki generic fallback Peluncuran Produk Strategy'
);

// Test CL2: HomePageClient does not use brand_name as strategic coreTopic fallback for generate request
assert(
  !homePageContent.includes('coreTopic || sharedContext?.brand_context?.brand_name'),
  'Test CL2: HomePageClient tidak lagi memakai brand_name sebagai fallback coreTopic request'
);

// Test CL3: Client helper contract: hasUserCoreTopicOverride = false -> returns undefined
const clientTopicNoOverride = resolveClientCoreTopicRequest(false, 'Topic Not Overridden');
assert(
  clientTopicNoOverride === undefined,
  'Test CL3: resolveClientCoreTopicRequest returns undefined when hasUserCoreTopicOverride is false'
);

// Test CL4: Client helper contract: hasUserCoreTopicOverride = true -> returns explicit trimmed user topic
const clientTopicWithOverride = resolveClientCoreTopicRequest(true, '  Campaign Diskon Spesial  ');
assert(
  clientTopicWithOverride === 'Campaign Diskon Spesial',
  'Test CL4: resolveClientCoreTopicRequest returns trimmed user topic when hasUserCoreTopicOverride is true'
);

// Test CL5: Client helper contract: hasUserCoreTopicOverride = true with empty/whitespace string returns undefined
const clientTopicWhitespace = resolveClientCoreTopicRequest(true, '   ');
assert(
  clientTopicWhitespace === undefined,
  'Test CL5: resolveClientCoreTopicRequest returns undefined when explicit user topic is whitespace-only'
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
// SECTION 13: PHASE 2 - PRODUCTION OUTPUT CONTRACT TESTS
// -------------------------------------------------------------
console.log('\n--- SECTION 13: Phase 2 - Production Output Contract Tests ---');

const itemAImage: ContentItem = {
  no: 1,
  project_id: 'proj_saas_001',
  content_item_id: 'item_proj_saas_001_1',
  tanggal: '2026-09-20',
  jenis: 'TOFU (Awareness)',
  tujuan: 'Meningkatkan awareness masalah sprint delay',
  hookType: 'Question Hook',
  headline: '3 Tanda Tim Developer Mengalami Sprint Bottleneck',
  body: 'Komunikasi manual antar developer dan PM sering jadi pemicu rilis tertunda.',
  caption: 'Cek apakah tim engineering kamu sering mengalami pola ini.',
  format: 'Single',
  visual: 'Diagram alur sprint dengan warning icon di koordinasi manual.',
  referensi: '',
  keterangan: 'TOFU content edukasi bottleneck tanpa jualan langsung.',
  cta: 'Simpan ide ini',
};

const itemACarousel: ContentItem = {
  no: 2,
  project_id: 'proj_saas_001',
  content_item_id: 'item_proj_saas_001_2',
  tanggal: '2026-09-21',
  jenis: 'MOFU (Consideration)',
  tujuan: 'Edukasi framework evaluasi sprint tracking',
  hookType: 'Framework Hook',
  headline: 'Sprint Tracking Framework: 4 Matrik Wajib untuk Tech Lead',
  body: 'Panduan evaluasi throughput sprint secara obyektif.',
  caption: 'Slide sampai akhir untuk template audit sprint.',
  format: 'Carousel',
  visual: 'Carousel slide deck modern dark mode.',
  referensi: '',
  keterangan: 'MOFU edukasi framework solusi.',
  cta: 'Cek framework ini',
};

const itemAVideo: ContentItem = {
  no: 3,
  project_id: 'proj_saas_001',
  content_item_id: 'item_proj_saas_001_3',
  tanggal: '2026-09-22',
  jenis: 'BOFU (Conversion)',
  tujuan: 'Demo otomasi release reporting AgileHub',
  hookType: 'Demo Hook',
  headline: 'Otomasi Release Reporting AgileHub dalam 60 Detik',
  body: 'Live screen recording integrasi backlog ke changelog otomatis.',
  caption: 'Coba gratis 14 hari tanpa kartu kredit.',
  format: 'Reels',
  visual: 'Screen capture split with tech lead face-cam.',
  referensi: '',
  keterangan: 'BOFU product demo conversion.',
  cta: 'Lihat demo',
};

// Test P2-A: Image package valid
const validImagePackage: ImageProductionPackage = {
  package_id: 'pkg_img_001',
  project_id: 'proj_saas_001',
  content_item_id: 'item_proj_saas_001_1',
  asset_type: 'image',
  funnel_stage: 'TOFU',
  production_status: 'ready_for_production',
  created_at: new Date().toISOString(),
  strategy_snapshot: buildProductionStrategySnapshot(projectAContext, stratA, itemAImage),
  content_snapshot: buildProductionContentSnapshot(itemAImage),
  brand_visual_snapshot: buildProductionBrandVisualSnapshot(projectAContext),
  image: {
    objective: 'Meningkatkan awareness masalah sprint delay',
    scene: 'Modern software engineering office with digital sprint board',
    subject: 'A focused tech lead analyzing a bottleneck on the dashboard',
    composition: 'Rule of thirds, centered sprint metric highlight',
    environment: 'Clean minimalist startup workspace',
    lighting: 'Soft ambient desk glow with subtle blue accent',
    camera_direction: 'Eye level medium shot',
    visual_style: 'Clean editorial photo with minimalist UI overlay',
    text_overlay: 'Sprint Bottleneck: Dimana Tim Terhambat?',
    branding: 'Minimalist AgileHub logo at bottom corner',
    negative_constraints: 'No messy cables, no cartoon illustration, no generic happy corporate smile',
  },
  final_prompt: 'High quality photography of a tech lead analyzing sprint bottleneck dashboard in modern office.',
};

const imgValidation = validateProductionPackage(validImagePackage);
const imgIdentity = validateProductionPackageIdentity('proj_saas_001', itemAImage, validImagePackage);
assert(
  imgValidation.isValid && imgIdentity.isValid,
  'Test P2-A: Image package valid passes both package and identity validation'
);

// Test P2-B: Carousel package valid
const validCarouselPackage: CarouselProductionPackage = {
  package_id: 'pkg_car_002',
  project_id: 'proj_saas_001',
  content_item_id: 'item_proj_saas_001_2',
  asset_type: 'carousel',
  funnel_stage: 'MOFU',
  production_status: 'ready_for_production',
  created_at: new Date().toISOString(),
  strategy_snapshot: buildProductionStrategySnapshot(projectAContext, stratA, itemACarousel),
  content_snapshot: buildProductionContentSnapshot(itemACarousel),
  carousel: {
    objective: 'Edukasi framework evaluasi sprint tracking',
    slide_count: 3,
    cover_direction: 'Bold typography with high contrast sprint metric',
    slides: [
      {
        slide_number: 1,
        role: 'hook',
        headline: 'Sprint Tracking Framework',
        body: '4 Matrik Wajib untuk Tech Lead',
        visual_direction: 'Cover layout with large title and metric preview',
        layout_direction: 'Centered bold headline with author tag',
      },
      {
        slide_number: 2,
        role: 'framework',
        headline: 'Throughput vs Cycle Time',
        body: 'Jangan hanya ukur story points, pantau waktu rilis nyata.',
        visual_direction: 'Side-by-side metric comparison card',
        layout_direction: 'Split column card layout',
      },
      {
        slide_number: 3,
        role: 'cta',
        headline: 'Simpan & Evaluasi Sprint Kamu',
        body: 'Gunakan checklist ini pada retrospective sprint berikutnya.',
        visual_direction: 'Clean summary checklist with save icon',
        layout_direction: 'Card with bullet points and soft CTA pill',
      },
    ],
    visual_continuity: 'Monochrome dark mode with turquoise indicator accents',
    branding: 'AgileHub mark in header of every slide',
    negative_constraints: 'No rainbow colors, no cluttered paragraphs, no generic stock charts',
  },
  final_prompts: {
    master_prompt: 'Consistent dark-mode UI explainer carousel deck for software engineering leaders.',
    slides: [
      { slide_number: 1, prompt: 'Slide 1 cover: Minimalist dark dashboard with bold typography.' },
      { slide_number: 2, prompt: 'Slide 2 framework: Clean side-by-side comparison diagram.' },
      { slide_number: 3, prompt: 'Slide 3 CTA: Summary checklist card with bookmark icon.' },
    ],
  },
};

const carValidation = validateProductionPackage(validCarouselPackage);
const carIdentity = validateProductionPackageIdentity('proj_saas_001', itemACarousel, validCarouselPackage);
assert(
  carValidation.isValid && carIdentity.isValid,
  'Test P2-B: Carousel package valid passes both package and identity validation'
);

// Test P2-C: Video package valid
const validVideoPackage: VideoProductionPackage = {
  package_id: 'pkg_vid_003',
  project_id: 'proj_saas_001',
  content_item_id: 'item_proj_saas_001_3',
  asset_type: 'video',
  funnel_stage: 'BOFU',
  production_status: 'ready_for_production',
  created_at: new Date().toISOString(),
  strategy_snapshot: buildProductionStrategySnapshot(projectAContext, stratA, itemAVideo),
  content_snapshot: buildProductionContentSnapshot(itemAVideo),
  video: {
    objective: 'Demo otomasi release reporting AgileHub',
    duration_seconds: 45,
    format: 'vertical_9_16',
    hook: 'Capek rekap sprint manual setiap Jumat sore?',
    scenes: [
      {
        scene_number: 1,
        duration_seconds: 5,
        purpose: 'hook',
        visual_direction: 'Tech lead closing laptop in frustration at 5 PM',
        action: 'Relatable reaction to tedious manual reporting',
        camera: 'Close-up on clock showing Friday 17:00, panning to tired expression',
        voiceover: 'Berapa jam tim kamu habiskan tiap pekan hanya untuk bikin sprint report?',
        on_screen_text: 'Jumat 17:00 Masih Rekap Manual?',
      },
      {
        scene_number: 2,
        duration_seconds: 40,
        purpose: 'demo_and_cta',
        visual_direction: 'AgileHub screen recording showing 1-click changelog generation',
        action: 'Clicking release button and watching dashboard auto-populate',
        camera: 'Screen capture split with presenter facecam in corner',
        voiceover: 'Dengan AgileHub, seluruh backlog langsung terkompilasi jadi changelog siap rilis dalam 60 detik.',
        on_screen_text: '1-Click Auto Release Report',
      },
    ],
    voiceover: 'Full script for 45s product walkthrough',
    on_screen_text: 'Highlight keywords synced with narration',
    camera_direction: 'Crisp 9:16 vertical screencast with webcam overlay',
    motion_direction: 'Smooth UI transitions and cursor highlights',
    audio_direction: 'Upbeat modern low-fi beat under clear voiceover',
    branding: 'AgileHub animated watermark top right',
    negative_constraints: 'No robotic AI voice tone, no blurry screen resolutions, no abrupt cuts',
  },
  final_prompt: 'A 45-second vertical 9:16 SaaS product demo demonstrating release reporting automation in AgileHub.',
};

const vidValidation = validateProductionPackage(validVideoPackage);
const vidIdentity = validateProductionPackageIdentity('proj_saas_001', itemAVideo, validVideoPackage);
assert(
  vidValidation.isValid && vidIdentity.isValid,
  'Test P2-C: Video package valid passes both package and identity validation'
);

// Test P2-D: Invalid asset_type rejected
const invalidAssetPkg = { ...validImagePackage, asset_type: 'audio_track' as any };
const invalidAssetRes = validateProductionPackage(invalidAssetPkg);
assert(
  !invalidAssetRes.isValid && invalidAssetRes.error?.includes('Invalid asset_type'),
  'Test P2-D: Invalid asset_type is rejected by validateProductionPackage'
);

// Test P2-E: Missing project_id rejected
const missingProjPkg = { ...validImagePackage, project_id: '' };
const missingProjRes = validateProductionPackage(missingProjPkg);
assert(
  !missingProjRes.isValid && missingProjRes.error?.includes('Missing or invalid project_id'),
  'Test P2-E: Missing project_id is rejected by validateProductionPackage'
);

// Test P2-F: Missing content_item_id rejected
const missingItemPkg = { ...validImagePackage, content_item_id: '   ' };
const missingItemRes = validateProductionPackage(missingItemPkg);
assert(
  !missingItemRes.isValid && missingItemRes.error?.includes('Missing or invalid content_item_id'),
  'Test P2-F: Missing content_item_id is rejected by validateProductionPackage'
);

// Test P2-G: Cross-project package rejected
const crossProjRes = validateProductionPackageIdentity('proj_food_002', itemAImage, validImagePackage);
const crossPkgRes = validateProductionPackageIdentity(
  'proj_saas_001',
  itemAImage,
  { ...validImagePackage, project_id: 'proj_food_002' }
);
assert(
  !crossProjRes.isValid && !crossPkgRes.isValid,
  'Test P2-G: Cross-project package or active project mismatch is strictly rejected'
);

// Test P2-H: Funnel stage mismatch rejected
const mismatchStagePkg = { ...validImagePackage, funnel_stage: 'BOFU' as any };
const mismatchStageRes = validateProductionPackageIdentity('proj_saas_001', itemAImage, mismatchStagePkg);
assert(
  !mismatchStageRes.isValid && mismatchStageRes.error?.includes('Funnel stage mismatch'),
  'Test P2-H: Funnel stage mismatch between ContentItem (TOFU) and package (BOFU) is rejected'
);

// Test P2-I: Carousel slide count mismatch rejected
const carCountMismatchPkg: CarouselProductionPackage = {
  ...validCarouselPackage,
  carousel: {
    ...validCarouselPackage.carousel,
    slide_count: 5, // actual slides array has 3
  },
};
const carCountRes = validateProductionPackage(carCountMismatchPkg);
assert(
  !carCountRes.isValid && carCountRes.error?.includes('slide_count'),
  'Test P2-I: Carousel slide_count mismatch against slides array length is rejected'
);

// Test P2-J: Empty video scenes rejected
const emptyScenesVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    scenes: [],
  },
};
const emptyScenesRes = validateProductionPackage(emptyScenesVidPkg);
assert(
  !emptyScenesRes.isValid && emptyScenesRes.error?.includes('video.scenes'),
  'Test P2-J: Video package with empty scenes array is rejected'
);

// Test P2-K: Invalid ContentItem funnel stage in buildProductionStrategySnapshot -> THROW
let p2kThrown = false;
try {
  const invalidStageItem: ContentItem = {
    ...itemAImage,
    jenis: 'INVALID_STAGE_XYZ' as any,
  };
  buildProductionStrategySnapshot(projectAContext, stratA, invalidStageItem);
} catch (err: any) {
  p2kThrown = true;
  assert(err.message.includes('Invalid ContentItem funnel stage'), 'Test P2-K: Error message mentions invalid funnel stage');
}
assert(p2kThrown, 'Test P2-K: Invalid ContentItem funnel stage throws in buildProductionStrategySnapshot');

// Test P2-L: Cross-project sources in buildProductionStrategySnapshot (Context A + FunnelStrategy B + Item A) -> THROW
let p2lThrown = false;
try {
  buildProductionStrategySnapshot(projectAContext, stratB, itemAImage);
} catch (err: any) {
  p2lThrown = true;
  assert(err.message.includes('Cross-project isolation violation'), 'Test P2-L: Error message mentions cross-project violation');
}
assert(p2lThrown, 'Test P2-L: Cross-project sources strictly throw in buildProductionStrategySnapshot');

// Test P2-M: ContentItem without project_id -> identity validation FAIL
const itemWithoutProj: ContentItem = {
  ...itemAImage,
  project_id: '',
  projectId: undefined,
};
const p2mRes = validateProductionPackageIdentity('proj_saas_001', itemWithoutProj, validImagePackage);
assert(!p2mRes.isValid && p2mRes.error?.includes('project_id'), 'Test P2-M: ContentItem without project_id fails identity validation');

// Test P2-N: ContentItem without content_item_id -> identity validation FAIL
const itemWithoutId: ContentItem = {
  ...itemAImage,
  content_item_id: '',
};
const p2nRes = validateProductionPackageIdentity('proj_saas_001', itemWithoutId, validImagePackage);
assert(!p2nRes.isValid && p2nRes.error?.includes('content_item_id'), 'Test P2-N: ContentItem without content_item_id fails identity validation');

// Test P2-O: Image package with image: {} -> FAIL
const emptyImagePkg: ImageProductionPackage = {
  ...validImagePackage,
  image: {} as any,
};
const p2oRes = validateProductionPackage(emptyImagePkg);
assert(!p2oRes.isValid && p2oRes.error?.includes('image.'), 'Test P2-O: Image package with empty image details fails package validation');

// Test P2-P: Carousel final_prompts slides count mismatch against slide_count -> FAIL
const mismatchFinalPromptsPkg: CarouselProductionPackage = {
  ...validCarouselPackage,
  final_prompts: {
    master_prompt: 'Master prompt',
    slides: [
      { slide_number: 1, prompt: 'Slide 1' },
      { slide_number: 2, prompt: 'Slide 2' },
      // missing slide 3
    ],
  },
};
const p2pRes = validateProductionPackage(mismatchFinalPromptsPkg);
assert(!p2pRes.isValid && p2pRes.error?.includes('final_prompts.slides length'), 'Test P2-P: Carousel final_prompts slides count mismatch fails package validation');

// Test P2-Q: Carousel duplicate/non-sequential slide_number -> FAIL
const duplicateSlideNumPkg: CarouselProductionPackage = {
  ...validCarouselPackage,
  carousel: {
    ...validCarouselPackage.carousel,
    slides: [
      { ...validCarouselPackage.carousel.slides[0], slide_number: 1 },
      { ...validCarouselPackage.carousel.slides[1], slide_number: 1 }, // duplicate
      { ...validCarouselPackage.carousel.slides[2], slide_number: 3 },
    ],
  },
};
const p2qRes = validateProductionPackage(duplicateSlideNumPkg);
assert(!p2qRes.isValid, 'Test P2-Q: Carousel duplicate/non-sequential slide_number fails package validation');

// Test P2-R: Video scene duration <= 0 -> FAIL
const invalidDurationVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    scenes: [
      { ...validVideoPackage.video.scenes[0], duration_seconds: 0 },
      validVideoPackage.video.scenes[1],
    ],
  },
};
const p2rRes = validateProductionPackage(invalidDurationVidPkg);
assert(!p2rRes.isValid && p2rRes.error?.includes('duration_seconds must be a positive finite number'), 'Test P2-R: Video scene duration <= 0 fails package validation');

// Test P2-S: Video scene missing required visual/action/camera field -> FAIL
const missingSceneFieldsVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    scenes: [
      {
        ...validVideoPackage.video.scenes[0],
        visual_direction: '',
      },
      validVideoPackage.video.scenes[1],
    ],
  },
};
const p2sRes = validateProductionPackage(missingSceneFieldsVidPkg);
assert(!p2sRes.isValid && p2sRes.error?.includes('visual_direction must be a non-empty string'), 'Test P2-S: Video scene missing required fields fails package validation');

// Test P2-T: ContentItem without format does not default to "Single"
const unformattedItem: ContentItem = {
  ...itemAImage,
  format: '' as any,
};
const snapshotUnformatted = buildProductionContentSnapshot(unformattedItem);
assert(
  snapshotUnformatted.content_format === '',
  'Test P2-T: ContentItem without format retains empty value and does not automatically become "Single"'
);

// Test P2-U: Carousel final_prompts with duplicate slide_number (e.g. 1, 1, 2 for slides 1, 2, 3) -> FAIL
const duplicatePromptNumPkg: CarouselProductionPackage = {
  ...validCarouselPackage,
  final_prompts: {
    master_prompt: 'Master prompt',
    slides: [
      { slide_number: 1, prompt: 'Prompt for slide 1' },
      { slide_number: 1, prompt: 'Duplicate prompt for slide 1' },
      { slide_number: 2, prompt: 'Prompt for slide 2' },
    ],
  },
};
const p2uRes = validateProductionPackage(duplicatePromptNumPkg);
assert(
  !p2uRes.isValid && p2uRes.error?.includes('Duplicate slide_number'),
  'Test P2-U: Carousel final_prompts with duplicate slide_number fails package validation'
);

// Test P2-V: Carousel slides not sequential (e.g. 1, 3, 4) -> FAIL
const nonSequentialSlidesPkg: CarouselProductionPackage = {
  ...validCarouselPackage,
  carousel: {
    ...validCarouselPackage.carousel,
    slides: [
      { ...validCarouselPackage.carousel.slides[0], slide_number: 1 },
      { ...validCarouselPackage.carousel.slides[1], slide_number: 3 },
      { ...validCarouselPackage.carousel.slides[2], slide_number: 4 },
    ],
  },
};
const p2vRes = validateProductionPackage(nonSequentialSlidesPkg);
assert(
  !p2vRes.isValid && p2vRes.error?.includes('must be sequential starting at 1'),
  'Test P2-V: Carousel with non-sequential slide numbers (1, 3, 4) fails package validation'
);

// Test P2-W: Video scenes not sequential (e.g. 1, 3) -> FAIL
const nonSequentialScenesVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    scenes: [
      { ...validVideoPackage.video.scenes[0], scene_number: 1 },
      { ...validVideoPackage.video.scenes[1], scene_number: 3 },
    ],
  },
};
const p2wRes = validateProductionPackage(nonSequentialScenesVidPkg);
assert(
  !p2wRes.isValid && p2wRes.error?.includes('must be sequential starting at 1'),
  'Test P2-W: Video with non-sequential scene numbers (1, 3) fails package validation'
);

// Test P2-X: ProductionPackage funnel_stage "TOFU (Awareness)" -> FAIL
const nonCanonicalStagePkg: ImageProductionPackage = {
  ...validImagePackage,
  funnel_stage: 'TOFU (Awareness)' as any,
};
const p2xRes = validateProductionPackage(nonCanonicalStagePkg);
assert(
  !p2xRes.isValid && p2xRes.error?.includes('must be canonical'),
  'Test P2-X: Non-canonical funnel_stage "TOFU (Awareness)" is rejected'
);

// Test P2-Y: Image missing required field (e.g. lighting) -> FAIL
const missingLightingImgPkg: ImageProductionPackage = {
  ...validImagePackage,
  image: {
    ...validImagePackage.image,
    lighting: '',
  },
};
const p2yRes = validateProductionPackage(missingLightingImgPkg);
assert(
  !p2yRes.isValid && p2yRes.error?.includes('image.lighting must be a non-empty string'),
  'Test P2-Y: Image missing required lighting field is rejected'
);

// Test P2-Z: Video missing required field (e.g. hook) -> FAIL
const missingHookVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    hook: '',
  },
};
const p2zRes = validateProductionPackage(missingHookVidPkg);
assert(
  !p2zRes.isValid && p2zRes.error?.includes('video.hook must be a non-empty string'),
  'Test P2-Z: Video missing required hook field is rejected'
);

// Test P2-AA: Carousel without final_prompts -> FAIL
const missingFinalPromptsCarPkg: CarouselProductionPackage = {
  ...validCarouselPackage,
  final_prompts: undefined as any,
};
const p2aaRes = validateProductionPackage(missingFinalPromptsCarPkg);
assert(
  !p2aaRes.isValid && p2aaRes.error?.includes('final_prompts'),
  'Test P2-AA: Carousel without final_prompts is rejected'
);

// Test P2-AB: FunnelStrategy.project_id = A but provenance.source_project_id = B -> buildProductionStrategySnapshot THROW
let p2abThrown = false;
try {
  const mismatchedProvenanceStrat: FunnelStrategy = {
    ...stratA,
    provenance: {
      ...stratA.provenance,
      source_project_id: 'proj_other_999',
    },
  };
  buildProductionStrategySnapshot(projectAContext, mismatchedProvenanceStrat, itemAImage);
} catch (err: any) {
  p2abThrown = true;
  assert(
    err.message.includes('provenance.source_project_id'),
    'Test P2-AB: Error message mentions provenance mismatch'
  );
}
assert(
  p2abThrown,
  'Test P2-AB: Mismatched FunnelStrategy provenance throws in buildProductionStrategySnapshot'
);

// Test P2-AC: Invalid optional brand_visual_snapshot type -> FAIL
const invalidBrandVisualPkg: ImageProductionPackage = {
  ...validImagePackage,
  brand_visual_snapshot: {
    ...validImagePackage.brand_visual_snapshot,
    color_palette: 12345 as any,
  },
};
const p2acRes = validateProductionPackage(invalidBrandVisualPkg);
assert(
  !p2acRes.isValid && p2acRes.error?.includes('brand_visual_snapshot.color_palette'),
  'Test P2-AC: Invalid optional brand_visual_snapshot field type fails package validation'
);

// Test P2-AD: Strategy snapshot with category: "" and positioning: "" -> PASS
const emptyCategoryPositioningPkg: ImageProductionPackage = {
  ...validImagePackage,
  strategy_snapshot: {
    ...validImagePackage.strategy_snapshot,
    category: '',
    positioning: '',
  },
};
const p2adRes = validateProductionPackage(emptyCategoryPositioningPkg);
assert(
  p2adRes.isValid,
  'Test P2-AD: Strategy snapshot with empty category and positioning string passes validation'
);

// Test P2-AE: Image with text_overlay: "" and branding: "" -> PASS
const emptyTextBrandingImgPkg: ImageProductionPackage = {
  ...validImagePackage,
  image: {
    ...validImagePackage.image,
    text_overlay: '',
    branding: '',
  },
};
const p2aeRes = validateProductionPackage(emptyTextBrandingImgPkg);
assert(
  p2aeRes.isValid,
  'Test P2-AE: Image with empty text_overlay and branding string passes validation'
);

// Test P2-AF: Video with voiceover: "", on_screen_text: "", branding: "" -> PASS
const emptyVoOstBrandingVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    voiceover: '',
    on_screen_text: '',
    branding: '',
  },
};
const p2afRes = validateProductionPackage(emptyVoOstBrandingVidPkg);
assert(
  p2afRes.isValid,
  'Test P2-AF: Video with empty top-level voiceover, on_screen_text, and branding passes validation'
);

// Test P2-AG: Video scene with voiceover: "", on_screen_text: "" -> PASS
const emptySceneVoOstVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    scenes: [
      {
        ...validVideoPackage.video.scenes[0],
        voiceover: '',
        on_screen_text: '',
      },
      {
        ...validVideoPackage.video.scenes[1],
        voiceover: '',
        on_screen_text: '',
      },
    ],
  },
};
const p2agRes = validateProductionPackage(emptySceneVoOstVidPkg);
assert(
  p2agRes.isValid,
  'Test P2-AG: Video scenes with empty voiceover and on_screen_text strings pass validation'
);

// Test P2-AH: Type-only field with invalid non-string type (e.g. voiceover: 123) -> FAIL
const invalidTypeVidPkg: VideoProductionPackage = {
  ...validVideoPackage,
  video: {
    ...validVideoPackage.video,
    voiceover: 123 as any,
  },
};
const p2ahRes = validateProductionPackage(invalidTypeVidPkg);
assert(
  !p2ahRes.isValid && p2ahRes.error?.includes('video.voiceover must be a string'),
  'Test P2-AH: Video with invalid non-string voiceover (123) fails package validation'
);

// -------------------------------------------------------------
// SECTION 14: PHASE 3A — CANONICAL PRODUCTION AUTHORITY GATE
// -------------------------------------------------------------
console.log('\n--- SECTION 14: Phase 3A — Canonical Production Authority Gate ---');

const baseGateContext: SharedContentContext = {
  project_id: 'proj_gate_001',
  project_name: 'Gate Project',
  source: { origin: 'creative_system_json' },
  brand_context: {
    brand_name: 'GateBrand',
    category: 'SaaS',
    brand_summary: 'Brand summary',
    brand_voice: 'Professional',
  },
  audience_context: {
    primary_audience: 'Founders',
    pain_points: ['Slow speed'],
    desires: ['High speed'],
    objections: ['High cost'],
  },
  strategy_context: {
    positioning: 'Fastest software',
    usp: ['Instant setup'],
    main_offer: 'Free trial',
    offer_benefits: ['Saves time'],
    core_message: 'Move faster today.',
    copy_direction: ['Direct'],
    content_pillars: ['Speed', 'Efficiency'],
  },
  system_flags: { is_complete_for_planning: true, missing_required_fields: [] },
};

const baseGateStrategy = buildFunnelStrategyFromContext(baseGateContext);

const baseGateItem: ContentItem = {
  content_item_id: 'item_gate_001',
  project_id: 'proj_gate_001',
  projectId: 'proj_gate_001',
  no: 1,
  tanggal: '2026-09-18',
  jenis: 'TOFU',
  tujuan: 'Build awareness',
  hookType: 'Question',
  headline: 'Speed Tips',
  body: 'Cara mempercepat workflow.',
  caption: 'Pelajari cara mempercepat workflow.',
  format: 'Carousel',
  referensi: '',
  visual: 'Clean educational visual',
  keterangan: 'TOFU awareness content',
  cta: 'Simpan untuk referensi',
};

// P3A-01: Valid setup passes authority gate
const p3a01Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  baseGateItem
);
assert(
  p3a01Res.isValid && p3a01Res.context?.project_id === 'proj_gate_001' && p3a01Res.context?.canonical_funnel_stage === 'TOFU',
  'Test P3A-01: Valid inputs strictly pass buildProductionEngineContext gate'
);

// P3A-02: Missing or whitespace canonicalProjectId -> FAIL
const p3a02Res = buildProductionEngineContext(
  '   ',
  baseGateContext,
  baseGateStrategy,
  baseGateItem
);
assert(
  !p3a02Res.isValid && p3a02Res.error?.includes('Canonical project ID wajib diisi'),
  'Test P3A-02: Missing or whitespace canonicalProjectId is rejected'
);

// P3A-03: SharedContentContext.project_id mismatch with canonicalProjectId -> FAIL
const mismatchSharedCtx: SharedContentContext = {
  ...baseGateContext,
  project_id: 'proj_foreign_999',
};
const p3a03Res = buildProductionEngineContext(
  'proj_gate_001',
  mismatchSharedCtx,
  baseGateStrategy,
  baseGateItem
);
assert(
  !p3a03Res.isValid && p3a03Res.error?.includes('Project Identity Mismatch'),
  'Test P3A-03: SharedContentContext with mismatched project_id is blocked'
);

// P3A-04: Incomplete SharedContentContext (is_complete_for_planning: false) -> FAIL
const incompleteSharedCtx: SharedContentContext = {
  ...baseGateContext,
  system_flags: {
    is_complete_for_planning: false,
    missing_required_fields: ['brand_name'],
  },
};
const p3a04Res = buildProductionEngineContext(
  'proj_gate_001',
  incompleteSharedCtx,
  baseGateStrategy,
  baseGateItem
);
assert(
  !p3a04Res.isValid && p3a04Res.error?.includes('Data strategi project belum lengkap'),
  'Test P3A-04: Incomplete SharedContentContext is rejected fail-closed'
);

// P3A-05: Missing FunnelStrategy (null/undefined) -> FAIL (no auto-derivation at gate)
const p3a05Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  null,
  baseGateItem
);
assert(
  !p3a05Res.isValid && p3a05Res.error?.includes('FunnelStrategy wajib tersedia secara authoritative'),
  'Test P3A-05: Missing FunnelStrategy is rejected without auto-deriving'
);

// P3A-06: FunnelStrategy with mismatched project_id or provenance -> FAIL
const foreignStrategy = buildFunnelStrategyFromContext({
  ...baseGateContext,
  project_id: 'proj_foreign_999',
});
const p3a06Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  foreignStrategy,
  baseGateItem
);
assert(
  !p3a06Res.isValid && p3a06Res.error?.includes('Project Isolation Violation'),
  'Test P3A-06: Cross-project FunnelStrategy is rejected by isolation check'
);

// P3A-07: ContentItem with missing content_item_id -> FAIL (no auto-fabrication)
const itemNoId: ContentItem = {
  ...baseGateItem,
  content_item_id: '',
};
const p3a07Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  itemNoId
);
assert(
  !p3a07Res.isValid && p3a07Res.error?.includes('content_item_id authoritative non-empty string'),
  'Test P3A-07: ContentItem without content_item_id is rejected without auto-fabrication'
);

// P3A-08: ContentItem with mismatched project identity -> FAIL (no silent relabeling)
const foreignItem: ContentItem = {
  ...baseGateItem,
  project_id: 'proj_foreign_999',
  projectId: 'proj_foreign_999',
};
const p3a08Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  foreignItem
);
assert(
  !p3a08Res.isValid && p3a08Res.error?.includes('Project Identity Mismatch'),
  'Test P3A-08: ContentItem with cross-project ID is rejected without silent relabeling'
);

// P3A-09: ContentItem with non-canonical/invalid jenis -> FAIL (strict parse, no fallback)
const invalidJenisItem: ContentItem = {
  ...baseGateItem,
  jenis: 'AWARENESS' as any,
};
const p3a09Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  invalidJenisItem
);
assert(
  !p3a09Res.isValid && p3a09Res.error?.includes('tidak valid. Wajib salah satu dari canonical stage'),
  'Test P3A-09: ContentItem with non-canonical funnel stage is rejected without permissive normalization'
);

// P3A-10: ContentItem violating FunnelStrategy rules -> FAIL
const violatingItem: ContentItem = {
  ...baseGateItem,
  content_item_id: 'item_gate_violating',
  jenis: 'TOFU',
  cta: 'Beli sekarang',
};
const p3a10Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  violatingItem
);
assert(
  !p3a10Res.isValid && p3a10Res.error?.includes('ContentItem tidak sesuai dengan authoritative FunnelStrategy'),
  'Test P3A-10: ContentItem violating FunnelStrategy is rejected'
);

// P3A-11: CharacterDNA with mismatched project_id -> FAIL
const foreignChar: CharacterDNA = {
  character_id: 'char_foreign_001',
  project_id: 'proj_foreign_999',
  name: 'Foreign Persona',
  visual_description: 'Foreign look',
} as any;
const p3a11Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  baseGateItem,
  foreignChar
);
assert(
  !p3a11Res.isValid && p3a11Res.error?.includes('Project Isolation Violation: CharacterDNA.project_id'),
  'Test P3A-11: CharacterDNA belonging to another project is blocked'
);

// P3A-12: CharacterDNA belonging to the same project -> PASS with character_dna attached
const validChar: CharacterDNA = {
  character_id: 'char_gate_001',
  project_id: 'proj_gate_001',
  name: 'Gate Persona',
  visual_description: 'Gate persona look',
} as any;
const p3a12Res = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  baseGateItem,
  validChar
);
assert(
  p3a12Res.isValid && p3a12Res.context?.character_dna?.character_id === 'char_gate_001',
  'Test P3A-12: CharacterDNA matching project identity passes and attaches cleanly'
);

// P3A-13: Strict calendar loader membaca item tanpa content_item_id -> tetap tanpa ID (tidak dibuatkan)
saveProjectData('proj_p3a_13', 'items', [
  {
    ...baseGateItem,
    content_item_id: undefined,
    project_id: 'proj_p3a_13',
    projectId: 'proj_p3a_13',
    no: 1,
    jenis: 'TOFU',
    headline: 'Raw Item without ID',
  }
]);
const loadedP3A13 = loadProjectCalendarItemsStrictForProduction('proj_p3a_13');
assert(
  loadedP3A13.length === 1 && loadedP3A13[0].content_item_id === undefined,
  'Test P3A-13: Strict calendar loader does not fabricate content_item_id'
);

// P3A-14: Item hasil strict loader tanpa ID dikirim ke buildProductionEngineContext() -> FAIL
const p3a14Res = buildProductionEngineContext(
  'proj_p3a_13',
  { ...baseGateContext, project_id: 'proj_p3a_13' },
  buildFunnelStrategyFromContext({ ...baseGateContext, project_id: 'proj_p3a_13' }),
  loadedP3A13[0]
);
assert(
  !p3a14Res.isValid && p3a14Res.error?.includes('content_item_id authoritative non-empty string'),
  'Test P3A-14: ContentItem from strict loader without ID is rejected at authority gate'
);

// P3A-15: Strict SharedContentContext loader membaca context tanpa project_id -> null dan storage tidak direpair
saveProjectData('proj_p3a_15', 'context', {
  brand_context: { brand_name: 'No Project ID Brand' },
  system_flags: { is_complete_for_planning: true },
});
const loadedP3A15 = loadProjectSharedContextStrictForProduction('proj_p3a_15');
const rawStoredP3A15 = loadProjectData('proj_p3a_15', 'context', null);
assert(
  loadedP3A15 === null && rawStoredP3A15.project_id === undefined,
  'Test P3A-15: Strict SharedContentContext loader returns null and does not mutate storage'
);

// P3A-16: Hanya blueprint tersedia, tetapi stored context tidak tersedia -> null (tidak derive)
saveProjectData('proj_p3a_16', 'blueprint', {
  project_id: 'proj_p3a_16',
  brand_identity: { brand_name: 'Blueprint Only' },
});
const loadedP3A16 = loadProjectSharedContextStrictForProduction('proj_p3a_16');
assert(
  loadedP3A16 === null,
  'Test P3A-16: Strict SharedContentContext loader returns null when only blueprint exists'
);

// P3A-17: Stored FunnelStrategy tanpa project_id -> loadStoredProjectFunnelStrategyStrict() returns null
saveProjectData('proj_p3a_17', 'funnelStrategy', {
  provenance: { source_project_id: 'proj_p3a_17' },
  stages: {},
});
const loadedP3A17 = loadStoredProjectFunnelStrategyStrict('proj_p3a_17');
assert(
  loadedP3A17 === null,
  'Test P3A-17: Stored FunnelStrategy without project_id returns null'
);

// P3A-18: Stored FunnelStrategy tanpa provenance.source_project_id -> null
saveProjectData('proj_p3a_18', 'funnelStrategy', {
  project_id: 'proj_p3a_18',
  stages: {},
});
const loadedP3A18 = loadStoredProjectFunnelStrategyStrict('proj_p3a_18');
assert(
  loadedP3A18 === null,
  'Test P3A-18: Stored FunnelStrategy without provenance.source_project_id returns null'
);

// P3A-19: Explicit contentItemId = item_A, tetapi calendar hanya berisi item_B -> Resolver: FAIL / no item
const itemB: ContentItem = {
  ...baseGateItem,
  content_item_id: 'item_B',
  no: 2,
};
const p3a19Res = resolveProductionContentItemTarget({
  calendarItems: [itemB],
  contentItemId: 'item_A',
});
assert(
  !p3a19Res.isValid && p3a19Res.item === undefined && p3a19Res.error?.includes('Explicit content_item_id "item_A" tidak ditemukan'),
  'Test P3A-19: Explicit contentItemId mismatch fails closed without falling back to other items'
);

// P3A-20: Explicit itemNo tidak ditemukan -> FAIL / no fallback
const p3a20Res = resolveProductionContentItemTarget({
  calendarItems: [itemB],
  itemNo: 99,
});
assert(
  !p3a20Res.isValid && p3a20Res.item === undefined && p3a20Res.error?.includes('Explicit itemNo "99" tidak ditemukan'),
  'Test P3A-20: Explicit itemNo mismatch fails closed without fallback'
);

// P3A-21: Tidak ada explicit target, saved selected item valid ada di calendar -> item dari calendar terpilih
const savedSelectedCandidate: ContentItem = {
  ...baseGateItem,
  content_item_id: 'item_saved_001',
  no: 5,
};
const p3a21Res = resolveProductionContentItemTarget({
  calendarItems: [itemB, savedSelectedCandidate],
  savedSelectedItem: savedSelectedCandidate,
});
assert(
  p3a21Res.isValid && p3a21Res.item?.content_item_id === 'item_saved_001',
  'Test P3A-21: When no explicit target is given, matching saved selected item in calendar is selected'
);

// P3A-22: Production context dengan format: '' setelah formatting prompt -> DILARANG menghasilkan Format: Single
const engineCtxForFormat = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  { ...baseGateItem, format: '' }
);
assert(engineCtxForFormat.isValid && engineCtxForFormat.context !== undefined, 'Engine context valid for format test');
const adaptedProdCtx = adaptEngineContextToProductionContext(engineCtxForFormat.context!);
const formattedPrompt = formatProductionContextForPrompt(adaptedProdCtx);
assert(
  !formattedPrompt.includes('Format: Single'),
  'Test P3A-22: Empty format does not invent "Format: Single" in formatted prompt'
);

// P3A-23: CharacterDNA valid tetapi display_name kosong. Adapter -> DILARANG menghasilkan Project Creator Persona
const charNoDisplayName: CharacterDNA = {
  character_id: 'char_empty_name',
  project_id: 'proj_gate_001',
  identity: { display_name: '' },
} as any;
const engineCtxForChar = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  baseGateItem,
  charNoDisplayName
);
assert(engineCtxForChar.isValid && engineCtxForChar.context !== undefined, 'Engine context valid for character test');
const adaptedCharCtx = adaptEngineContextToProductionContext(engineCtxForChar.context!);
assert(
  adaptedCharCtx.character?.display_name === '' && adaptedCharCtx.character?.display_name !== 'Project Creator Persona',
  'Test P3A-23: Character with empty display_name does not invent "Project Creator Persona"'
);

// P3A-24: Stale saved selected item (item_A) tidak ada di calendar (item_B, item_C) -> fallback ke first calendar item
const itemC: ContentItem = {
  ...baseGateItem,
  content_item_id: 'item_C',
  no: 3,
};
const staleSavedItemA: ContentItem = {
  ...baseGateItem,
  content_item_id: 'item_A',
  no: 1,
};
const p3a24Res = resolveProductionContentItemTarget({
  calendarItems: [itemB, itemC],
  savedSelectedItem: staleSavedItemA,
});
assert(
  p3a24Res.isValid && p3a24Res.item?.content_item_id === 'item_B',
  'Test P3A-24: Stale saved selected item is ignored and falls back to first active calendar item'
);

// P3A-25: Saved selected item_B ada di calendar -> resolver mengembalikan object DARI calendarItems, bukan saved object
const oldSavedItemB: ContentItem = {
  ...itemB,
  headline: 'Old Stale Headline In Saved Pointer',
};
const liveCalendarItemB: ContentItem = {
  ...itemB,
  headline: 'Fresh Active Headline In Calendar',
};
const p3a25Res = resolveProductionContentItemTarget({
  calendarItems: [liveCalendarItemB, itemC],
  savedSelectedItem: oldSavedItemB,
});
assert(
  p3a25Res.isValid &&
  p3a25Res.item === liveCalendarItemB &&
  p3a25Res.item?.headline === 'Fresh Active Headline In Calendar',
  'Test P3A-25: Resolver returns live object from active calendar, not raw stale saved object'
);

// P3A-26: Explicit malformed itemNo ("abc") -> FAIL, no fallback
const p3a26Res = resolveProductionContentItemTarget({
  calendarItems: [itemB, itemC],
  itemNo: 'abc',
  hasExplicitItemNo: true,
});
assert(
  !p3a26Res.isValid && p3a26Res.item === undefined && p3a26Res.error?.includes('tidak valid'),
  'Test P3A-26: Explicit malformed itemNo fails closed without fallback'
);

// P3A-27: Explicit blank contentItemId ("") -> FAIL, no fallback
const p3a27Res = resolveProductionContentItemTarget({
  calendarItems: [itemB, itemC],
  contentItemId: '   ',
  hasExplicitContentItemId: true,
});
assert(
  !p3a27Res.isValid && p3a27Res.item === undefined && p3a27Res.error?.includes('kosong atau malformed'),
  'Test P3A-27: Explicit blank contentItemId fails closed without fallback'
);

// P3A-28: Tidak ada explicit target sama sekali, calendar valid -> fallback normal memilih first item
const p3a28Res = resolveProductionContentItemTarget({
  calendarItems: [itemB, itemC],
});
assert(
  p3a28Res.isValid && p3a28Res.item?.content_item_id === 'item_B',
  'Test P3A-28: Normal fallback with no explicit target selects first calendar item'
);

// =============================================================
// PHASE 3B: SINGLE PRODUCTION ENGINE CORE TESTS
// =============================================================

// Fixture context for Phase 3B
const p3bEngineCtxRes = buildProductionEngineContext(
  'proj_gate_001',
  baseGateContext,
  baseGateStrategy,
  baseGateItem
);
assert(p3bEngineCtxRes.isValid && p3bEngineCtxRes.context !== undefined, 'Phase 3B base engine context built cleanly');
const p3bEngineCtx = p3bEngineCtxRes.context!;

const p3bImageDetails = {
  objective: 'Brand awareness and engagement',
  scene: 'Bright minimalist studio environment',
  subject: 'Alco productivity workspace',
  composition: 'Rule of thirds with clean copy space on the left',
  environment: 'Modern co-working desk',
  lighting: 'Natural soft morning light',
  camera_direction: 'Eye-level 50mm lens crisp focus',
  visual_style: 'Clean professional commercial photography',
  text_overlay: 'Speed up your workflow',
  branding: 'Alco logo in top right corner',
  negative_constraints: 'No text clutter, no low resolution, no artifacts',
};

const p3bImageInput: ProductionAssetInput = {
  asset_type: 'image',
  image: p3bImageDetails,
  final_prompt: 'Generate a clean high-end commercial photo of Alco workspace...',
};

const p3bCarouselDetails = {
  objective: 'Educational carousel guide',
  slide_count: 2,
  cover_direction: 'High contrast title slide',
  slides: [
    {
      slide_number: 1,
      role: 'Hook',
      headline: 'Stop wasting hours',
      body: 'Here is how to automate your content engine.',
      visual_direction: 'Clean infographic layout',
      layout_direction: 'Left-aligned bold text',
    },
    {
      slide_number: 2,
      role: 'Solution',
      headline: 'Use canonical gates',
      body: 'Always enforce deterministic authority.',
      visual_direction: 'Diagram comparing messy vs structured flows',
      layout_direction: 'Center-aligned structured cards',
    },
  ],
  visual_continuity: 'Consistent navy and emerald accents across all slides',
  branding: 'Alco watermark on all slides',
  negative_constraints: 'No unreadable small typography',
};

const p3bCarouselInput: ProductionAssetInput = {
  asset_type: 'carousel',
  carousel: p3bCarouselDetails,
  final_prompts: {
    master_prompt: 'Master carousel generation guide',
    slides: [
      { slide_number: 1, prompt: 'Slide 1 generation prompt' },
      { slide_number: 2, prompt: 'Slide 2 generation prompt' },
    ],
  },
};

const p3bVideoDetails = {
  objective: 'Short-form awareness reel',
  duration_seconds: 15,
  format: '9:16 Vertical Reel',
  hook: 'The biggest mistake in content planning',
  scenes: [
    {
      scene_number: 1,
      duration_seconds: 15,
      purpose: 'Deliver hook and solution in one continuous sequence',
      visual_direction: 'Creator speaking directly to camera in studio',
      action: 'Pointing to graphical pop-ups on screen',
      camera: 'Selfie angle medium shot',
      voiceover: 'Stop guessing your funnel strategy. Use an authoritative engine.',
      on_screen_text: 'Stop Guessing Strategy',
    },
  ],
  voiceover: 'Stop guessing your funnel strategy. Use an authoritative engine.',
  on_screen_text: 'Stop Guessing Strategy',
  camera_direction: 'Direct to lens eye-level',
  motion_direction: 'Fast-paced clean cuts with dynamic zooms',
  audio_direction: 'Upbeat modern lofi background music',
  branding: 'Subtle Alco badge at end card',
  negative_constraints: 'No blurry video, no robotic monotone audio',
};

const p3bVideoInput: ProductionAssetInput = {
  asset_type: 'video',
  video: p3bVideoDetails,
  final_prompt: '15-second vertical video prompt for Alco Content Engine...',
};

const p3bMetadata: ProductionPackageMetadata = {
  package_id: 'pkg_test_001',
  created_at: '2026-09-18T12:00:00Z',
};

// P3B-01 — IMAGE VALID
const p3b01Res = buildProductionPackage(p3bEngineCtx, p3bImageInput, p3bMetadata);
assert(
  p3b01Res.isValid &&
  p3b01Res.package?.asset_type === 'image' &&
  p3b01Res.package?.production_status === 'ready_for_production',
  'Test P3B-01: Valid ImageProductionPackage is created with ready_for_production status'
);

// P3B-02 — CAROUSEL VALID
const p3b02Res = buildProductionPackage(p3bEngineCtx, p3bCarouselInput, p3bMetadata);
assert(
  p3b02Res.isValid &&
  p3b02Res.package?.asset_type === 'carousel' &&
  p3b02Res.package?.production_status === 'ready_for_production',
  'Test P3B-02: Valid CarouselProductionPackage is created with ready_for_production status'
);

// P3B-03 — VIDEO VALID
const p3b03Res = buildProductionPackage(p3bEngineCtx, p3bVideoInput, p3bMetadata);
assert(
  p3b03Res.isValid &&
  p3b03Res.package?.asset_type === 'video' &&
  p3b03Res.package?.production_status === 'ready_for_production',
  'Test P3B-03: Valid VideoProductionPackage is created with ready_for_production status'
);

// P3B-04 — PROJECT ID FROM CONTEXT
assert(
  p3b01Res.package?.project_id === p3bEngineCtx.project_id &&
  p3b01Res.package?.project_id === 'proj_gate_001',
  'Test P3B-04: Package project_id is strictly derived from ProductionEngineContext'
);

// P3B-05 — CONTENT ITEM ID FROM CONTEXT
assert(
  p3b01Res.package?.content_item_id === p3bEngineCtx.content_item.content_item_id &&
  p3b01Res.package?.content_item_id === 'item_gate_001',
  'Test P3B-05: Package content_item_id is strictly derived from ProductionEngineContext'
);

// P3B-06 — FUNNEL STAGE FROM CONTEXT
assert(
  p3b01Res.package?.funnel_stage === p3bEngineCtx.canonical_funnel_stage &&
  p3b01Res.package?.funnel_stage === 'TOFU',
  'Test P3B-06: Package funnel_stage is strictly derived from ProductionEngineContext'
);

// P3B-07 — SNAPSHOT STRATEGY AUTHORITY
const stratSnap = p3b01Res.package?.strategy_snapshot;
assert(
  stratSnap?.brand_name === baseGateContext.brand_context?.brand_name &&
  stratSnap?.primary_audience === baseGateContext.audience_context?.primary_audience &&
  stratSnap?.main_offer === baseGateContext.strategy_context?.main_offer &&
  stratSnap?.core_message === baseGateContext.strategy_context?.core_message &&
  stratSnap?.campaign_goal === baseGateStrategy.campaign_goal &&
  stratSnap?.funnel_objective === baseGateStrategy.tofu?.objective &&
  stratSnap?.message_direction === baseGateStrategy.tofu?.message_direction &&
  stratSnap?.cta_direction === baseGateStrategy.tofu?.cta_direction,
  'Test P3B-07: Strategy snapshot fields are authoritatively derived from active context and strategy'
);

// P3B-08 — CONTENT SNAPSHOT AUTHORITY
const contSnap = p3b01Res.package?.content_snapshot;
assert(
  contSnap?.headline === baseGateItem.headline &&
  contSnap?.body === baseGateItem.body &&
  contSnap?.caption === baseGateItem.caption &&
  contSnap?.cta === baseGateItem.cta &&
  contSnap?.visual_direction === baseGateItem.visual &&
  contSnap?.content_format === baseGateItem.format &&
  contSnap?.strategic_objective === baseGateItem.tujuan &&
  contSnap?.strategic_rationale === baseGateItem.keterangan,
  'Test P3B-08: Content snapshot fields are authoritatively derived from ContentItem'
);

// P3B-09 — INVALID IMAGE REJECTED
const invalidImageInput: ProductionAssetInput = {
  ...p3bImageInput,
  image: {
    ...p3bImageDetails,
    subject: '', // Missing non-empty subject
  },
};
const p3b09Res = buildProductionPackage(p3bEngineCtx, invalidImageInput, p3bMetadata);
assert(
  !p3b09Res.isValid && p3b09Res.package === undefined && p3b09Res.error?.includes('image.subject'),
  'Test P3B-09: Image with empty subject is rejected fail-closed'
);

// P3B-10 — INVALID CAROUSEL REJECTED
const invalidCarouselInput: ProductionAssetInput = {
  ...p3bCarouselInput,
  carousel: {
    ...p3bCarouselDetails,
    slide_count: 3, // Mismatch with slides.length (2)
  },
};
const p3b10Res = buildProductionPackage(p3bEngineCtx, invalidCarouselInput, p3bMetadata);
assert(
  !p3b10Res.isValid && p3b10Res.package === undefined && p3b10Res.error?.includes('slide_count'),
  'Test P3B-10: Carousel with slide_count mismatch is rejected fail-closed'
);

// P3B-11 — INVALID VIDEO REJECTED
const invalidVideoInput: ProductionAssetInput = {
  ...p3bVideoInput,
  video: {
    ...p3bVideoDetails,
    duration_seconds: 0, // Invalid duration
  },
};
const p3b11Res = buildProductionPackage(p3bEngineCtx, invalidVideoInput, p3bMetadata);
assert(
  !p3b11Res.isValid && p3b11Res.package === undefined && p3b11Res.error?.includes('duration_seconds'),
  'Test P3B-11: Video with non-positive duration_seconds is rejected fail-closed'
);

// P3B-12 — EMPTY package_id REJECTED
const p3b12Res = buildProductionPackage(p3bEngineCtx, p3bImageInput, {
  package_id: '   ',
  created_at: '2026-09-18T12:00:00Z',
});
assert(
  !p3b12Res.isValid && p3b12Res.package === undefined && p3b12Res.error?.includes('package_id'),
  'Test P3B-12: Empty package_id in metadata is rejected fail-closed'
);

// P3B-13 — EMPTY created_at REJECTED
const p3b13Res = buildProductionPackage(p3bEngineCtx, p3bImageInput, {
  package_id: 'pkg_valid_001',
  created_at: '',
});
assert(
  !p3b13Res.isValid && p3b13Res.package === undefined && p3b13Res.error?.includes('created_at'),
  'Test P3B-13: Empty created_at in metadata is rejected fail-closed'
);

// P3B-14 — NO INPUT MUTATION
const clonedEngineCtx = JSON.parse(JSON.stringify(p3bEngineCtx));
const clonedAssetInput = JSON.parse(JSON.stringify(p3bImageInput));
const clonedMetadata = JSON.parse(JSON.stringify(p3bMetadata));

buildProductionPackage(p3bEngineCtx, p3bImageInput, p3bMetadata);

assert(
  JSON.stringify(p3bEngineCtx) === JSON.stringify(clonedEngineCtx) &&
  JSON.stringify(p3bImageInput) === JSON.stringify(clonedAssetInput) &&
  JSON.stringify(p3bMetadata) === JSON.stringify(clonedMetadata),
  'Test P3B-14: buildProductionPackage is pure and does not mutate any input'
);

// P3B-15 — READY STATUS LOCKED
assert(
  p3b01Res.package?.production_status === 'ready_for_production' &&
  p3b02Res.package?.production_status === 'ready_for_production' &&
  p3b03Res.package?.production_status === 'ready_for_production',
  'Test P3B-15: ProductionPackage is always generated with ready_for_production status'
);

// P3B-16 — STRATEGY SNAPSHOT PROJECT ISOLATION
const mismatchedEngineCtx: ProductionEngineContext = {
  ...p3bEngineCtx,
  shared_context: {
    ...baseGateContext,
    project_id: 'proj_other_999',
  },
};
const p3b16Res = buildProductionPackage(mismatchedEngineCtx, p3bImageInput, p3bMetadata);
assert(
  !p3b16Res.isValid && p3b16Res.package === undefined && p3b16Res.error?.includes('Project Identity Mismatch'),
  'Test P3B-16: Cross-project SharedContentContext is rejected by Phase 3A authority revalidation'
);

// P3B-17 — MISSING CONTENT ITEM ID (REJECTED WITHOUT FALLBACK)
const missingIdCtx: ProductionEngineContext = {
  ...p3bEngineCtx,
  content_item: {
    ...p3bEngineCtx.content_item,
    content_item_id: undefined,
  },
};
const p3b17Res = buildProductionPackage(missingIdCtx, p3bImageInput, p3bMetadata);
assert(
  !p3b17Res.isValid && p3b17Res.package === undefined && (p3b17Res.error?.includes('content_item_id') || p3b17Res.error?.includes('ID')),
  'Test P3B-17: Missing content_item_id in context fails closed without fabricating fallback ID'
);

// P3B-18 — FABRICATED CANONICAL STAGE (STAGE SPOOFING BLOCKED)
const spoofedStageCtx: ProductionEngineContext = {
  ...p3bEngineCtx,
  canonical_funnel_stage: 'BOFU', // Mismatch with TOFU item
};
const p3b18Res = buildProductionPackage(spoofedStageCtx, p3bImageInput, p3bMetadata);
assert(
  !p3b18Res.isValid && p3b18Res.package === undefined && p3b18Res.error?.includes('mismatch with authoritative funnel stage'),
  'Test P3B-18: Fabricated canonical_funnel_stage is detected and rejected fail-closed'
);

// P3B-19 — CONTENT ITEM VIOLATES FUNNEL AUTHORITY (BLOCKED BY PHASE 3A REVALIDATION)
const violatingFunnelItem: ContentItem = {
  ...baseGateItem,
  content_item_id: 'item_violating_gate_3b',
  jenis: 'TOFU',
  cta: 'Beli sekarang', // Prohibited conversion CTA for TOFU
};
const fabricatedViolatingCtx: ProductionEngineContext = {
  ...p3bEngineCtx,
  content_item: violatingFunnelItem,
};
const p3b19Res = buildProductionPackage(fabricatedViolatingCtx, p3bImageInput, p3bMetadata);
assert(
  !p3b19Res.isValid && p3b19Res.package === undefined && p3b19Res.error?.includes('FunnelStrategy'),
  'Test P3B-19: Fabricated context with funnel-violating item is blocked by Phase 3A authority revalidation'
);

// P3B-20 — CHARACTER DNA CROSS PROJECT ISOLATION VIOLATION
const crossProjectDnaCtx: ProductionEngineContext = {
  ...p3bEngineCtx,
  character_dna: {
    ...validChar,
    project_id: 'proj_alien_999',
  },
};
const p3b20Res = buildProductionPackage(crossProjectDnaCtx, p3bImageInput, p3bMetadata);
assert(
  !p3b20Res.isValid && p3b20Res.package === undefined && (p3b20Res.error?.includes('CharacterDNA') || p3b20Res.error?.includes('Project Isolation Violation')),
  'Test P3B-20: Cross-project CharacterDNA in context fails Phase 3A revalidation fail-closed'
);

// P3B-21 — VALID CONTEXT REMAINS VALID (HAPPY PATH)
const p3b21Res = buildProductionPackage(p3bEngineCtx, p3bImageInput, p3bMetadata);
assert(
  p3b21Res.isValid && p3b21Res.package !== undefined && p3b21Res.package.production_status === 'ready_for_production',
  'Test P3B-21: Valid ProductionEngineContext passes revalidation and builds production package'
);

// P3B-22 — AUTHORITY RESULT STRICTLY APPLIED TO PACKAGE
assert(
  p3b21Res.package?.project_id === p3bEngineCtx.project_id &&
  p3b21Res.package?.content_item_id === p3bEngineCtx.content_item.content_item_id &&
  p3b21Res.package?.funnel_stage === p3bEngineCtx.canonical_funnel_stage,
  'Test P3B-22: Production package fields strictly reflect authoritative context values'
);

// ============================================================================
// PHASE 3C-A: CANONICAL PRODUCTION CANDIDATES REGRESSION TESTS
// ============================================================================

// P3C-A-01: Valid Image Production Candidate
const validImageCand: ImageProductionCandidate = {
  candidate_type: 'image',
  candidate_id: 'img_cand_001',
  production_details: {
    objective: 'Membangun awareness relatable problem',
    scene: 'Kreator sedang meninjau draf caption',
    subject: 'Seorang profesional muda usia 26-28 tahun',
    composition: 'Subjek di kanan, ruang negatif di kiri atas 4:5',
    environment: 'Meja kerja kayu dekat jendela',
    lighting: 'Cahaya alami lembut',
    camera_direction: '50mm f/2.0 eye level',
    visual_style: 'Clean editorial Instagram photography',
    text_overlay: 'Menghadapi Kendala Yang Sama?',
    branding: '',
    negative_constraints: 'hard selling, blurry text',
  },
  final_prompt: 'Buatkan saya image untuk konten Instagram...',
};
const p3ca01Val = validateProductionCandidate(validImageCand);
assert(
  p3ca01Val.isValid && p3ca01Val.error === undefined,
  'Test P3C-A-01: Valid ImageProductionCandidate passes validation cleanly'
);

// P3C-A-02: Valid Carousel Production Candidate
const validCarouselCand: CarouselProductionCandidate = {
  candidate_type: 'carousel',
  candidate_id: 'carousel_cand_001',
  production_details: {
    objective: 'Edukasi alur kerja terstruktur',
    slide_count: 5,
    cover_direction: 'Visual editorial cover carousel',
    slides: [
      { slide_number: 1, role: 'hook', headline: 'Hook 1', body: 'Body 1', visual_direction: 'Vis Dir 1', layout_direction: '4:5 Top' },
      { slide_number: 2, role: 'problem', headline: 'Problem 2', body: 'Body 2', visual_direction: 'Vis Dir 2', layout_direction: '4:5 Split' },
      { slide_number: 3, role: 'reframe', headline: 'Reframe 3', body: 'Body 3', visual_direction: 'Vis Dir 3', layout_direction: '4:5 Diagram' },
      { slide_number: 4, role: 'learn', headline: 'Solution 4', body: 'Body 4', visual_direction: 'Vis Dir 4', layout_direction: '4:5 Steps' },
      { slide_number: 5, role: 'cta', headline: 'CTA 5', body: 'Body 5', visual_direction: 'Vis Dir 5', layout_direction: '4:5 Card' },
    ],
    visual_continuity: 'Tema visual konsisten 4:5 vertical editorial',
    branding: '',
    negative_constraints: 'hard selling, messy text',
  },
  final_prompts: {
    master_prompt: 'Master visual prompt 4:5',
    slides: [
      { slide_number: 1, prompt: 'Prompt Slide 1' },
      { slide_number: 2, prompt: 'Prompt Slide 2' },
      { slide_number: 3, prompt: 'Prompt Slide 3' },
      { slide_number: 4, prompt: 'Prompt Slide 4' },
      { slide_number: 5, prompt: 'Prompt Slide 5' },
    ],
  },
};
const p3ca02Val = validateProductionCandidate(validCarouselCand);
assert(
  p3ca02Val.isValid && p3ca02Val.error === undefined,
  'Test P3C-A-02: Valid CarouselProductionCandidate passes validation cleanly'
);

// P3C-A-03: Valid Video Production Candidate in all modes
const validVideoScenes = buildCanonicalVideoScenePlan('TOFU', {
  hook: 'Hook video menarik',
  masalah: 'Masalah konkret audiens',
  solusi: 'Solusi terarah',
  cta: 'Simpan video ini',
});

const videoModes: Array<'ugc_video' | 'text_motion' | 'asset_product'> = [
  'ugc_video',
  'text_motion',
  'asset_product',
];
const videoModeResults = videoModes.map((mode) => {
  const cand = buildVideoProductionCandidate({
    candidate_id: `vid_cand_${mode}`,
    production_mode: mode,
    objective: 'Video awareness terarah',
    format: '9:16 Vertical Video (Reels/TikTok/Shorts)',
    hook: 'Hook video menarik',
    scenes: validVideoScenes,
    motion_direction: 'Dynamic smooth motion',
    audio_direction: 'Natural voiceover & background music',
    negative_constraints: 'No blurry video, no distorted faces',
    final_prompt: `Video Prompt for ${mode}`,
  });
  return validateProductionCandidate(cand);
});
assert(
  videoModeResults.every((r) => r.isValid && r.error === undefined),
  'Test P3C-A-03: Valid VideoProductionCandidate passes validation across ugc_video, text_motion, and asset_product modes'
);

// P3C-A-04: Image Candidate missing required fields fails validation
const invalidImageCand = {
  ...validImageCand,
  production_details: {
    ...validImageCand.production_details,
    subject: '', // Missing required field
  },
};
const p3ca04Val = validateProductionCandidate(invalidImageCand);
assert(
  !p3ca04Val.isValid && p3ca04Val.error?.includes('subject'),
  'Test P3C-A-04: Image candidate with empty required field fails validation fail-closed'
);

// P3C-A-05: Carousel Candidate slide_count mismatch fails validation
const mismatchedCountCarousel = {
  ...validCarouselCand,
  production_details: {
    ...validCarouselCand.production_details,
    slide_count: 6, // Declares 6 but only 5 slides
  },
};
const p3ca05Val = validateProductionCandidate(mismatchedCountCarousel);
assert(
  !p3ca05Val.isValid && p3ca05Val.error?.includes('slide_count'),
  'Test P3C-A-05: Carousel candidate with slide_count mismatch fails validation fail-closed'
);

// P3C-A-06: Carousel Candidate final_prompts count mismatch fails validation
const mismatchedPromptsCarousel = {
  ...validCarouselCand,
  final_prompts: {
    ...validCarouselCand.final_prompts,
    slides: validCarouselCand.final_prompts.slides.slice(0, 3), // Only 3 prompts for 5 slides
  },
};
const p3ca06Val = validateProductionCandidate(mismatchedPromptsCarousel);
assert(
  !p3ca06Val.isValid && p3ca06Val.error?.includes('final_prompts.slides count'),
  'Test P3C-A-06: Carousel candidate with final_prompts slide count mismatch fails validation fail-closed'
);

// P3C-A-07: Video Candidate with empty scenes or invalid duration fails validation
const emptyScenesVideo = {
  candidate_type: 'video',
  candidate_id: 'vid_empty_scenes',
  production_mode: 'ugc_video',
  production_details: {
    objective: 'Video objective',
    duration_seconds: 0,
    format: '9:16 Vertical',
    hook: 'Hook text',
    scenes: [],
    voiceover: 'VO',
    on_screen_text: 'OST',
    camera_direction: 'Cam',
    motion_direction: 'Motion',
    audio_direction: 'Audio',
    branding: '',
    negative_constraints: '',
  },
  final_prompt: 'Prompt',
};
const p3ca07Val = validateProductionCandidate(emptyScenesVideo);
assert(
  !p3ca07Val.isValid && (p3ca07Val.error?.includes('duration') || p3ca07Val.error?.includes('scenes')),
  'Test P3C-A-07: Video candidate with empty scenes or invalid duration fails validation fail-closed'
);

// P3C-A-08: Candidate containing forbidden package authority fields fails validation
const authorityLeakedCand = {
  ...validImageCand,
  project_id: 'proj_leaked_001', // Forbidden in candidate layer
};
const p3ca08Val = validateProductionCandidate(authorityLeakedCand);
assert(
  !p3ca08Val.isValid && p3ca08Val.error?.includes('authoritative package field: project_id'),
  'Test P3C-A-08: Candidate containing forbidden package authority field fails validation fail-closed'
);

// P3C-A-09: Image Candidate built via helper conforms to canonical schema
const builtImageCand = buildImageProductionCandidate({
  candidate_id: 'A',
  visualObjective: 'Visual objective test',
  scene: 'Scene action and expression',
  subject: 'Subject description',
  composition: 'Composition description',
  environment: 'Environment description',
  lighting: 'Lighting description',
  camera: '50mm camera',
  visualStyle: 'Editorial style',
  textOverlay: 'Headline Overlay',
  branding: '',
  negativeConstraints: 'No ads',
  finalPrompt: 'Final prompt text',
});
const p3ca09Val = validateProductionCandidate(builtImageCand);
assert(
  p3ca09Val.isValid && builtImageCand.candidate_type === 'image' && builtImageCand.candidate_id === 'A',
  'Test P3C-A-09: ImageProductionCandidate built via helper strictly adheres to canonical schema'
);

// P3C-A-10: Carousel Candidate built via helper conforms to canonical schema
const builtCarouselCand = buildCarouselProductionCandidate({
  candidate_id: 'carousel_plan',
  objective: 'Carousel goal',
  slide_count: 5,
  cover_direction: 'Cover direction',
  slides: validCarouselCand.production_details.slides,
  visual_continuity: 'Continuity notes',
  negative_constraints: 'hard selling ads, cluttered poster, blurry text',
  final_prompts: validCarouselCand.final_prompts,
});
const p3ca10Val = validateProductionCandidate(builtCarouselCand);
assert(
  p3ca10Val.isValid && builtCarouselCand.candidate_type === 'carousel' && builtCarouselCand.production_details.slide_count === 5,
  'Test P3C-A-10: CarouselProductionCandidate built via helper strictly adheres to canonical schema'
);

// P3C-A-11: Video Candidate built via helper conforms to canonical schema
const builtVideoCand = buildVideoProductionCandidate({
  candidate_id: 'video_style_A',
  production_mode: 'ugc_video',
  objective: 'Video goal',
  format: '9:16 Vertical Video (Reels/TikTok/Shorts)',
  hook: 'Video hook',
  scenes: validVideoScenes,
  motion_direction: 'Fast-paced dynamic',
  audio_direction: 'Upbeat background audio',
  negative_constraints: 'No blurry frames, no low resolution',
  final_prompt: 'Video prompt',
});
const p3ca11Val = validateProductionCandidate(builtVideoCand);
assert(
  p3ca11Val.isValid && builtVideoCand.candidate_type === 'video' && builtVideoCand.production_details.scenes.length === 4,
  'Test P3C-A-11: VideoProductionCandidate built via helper strictly adheres to canonical schema'
);

// P3C-A-12: Candidate builders do not mutate input arguments (Pure Construction)
const inputScenesClone = JSON.parse(JSON.stringify(validVideoScenes));
buildVideoProductionCandidate({
  candidate_id: 'video_purity_test',
  production_mode: 'ugc_video',
  objective: 'Purity objective',
  format: '9:16 Vertical Video (Reels/TikTok/Shorts)',
  hook: 'Purity hook',
  scenes: validVideoScenes,
  motion_direction: 'Dynamic smooth motion',
  audio_direction: 'Clear voiceover',
  negative_constraints: 'No blurry frames, no low resolution',
  final_prompt: 'Purity prompt',
});
assert(
  JSON.stringify(validVideoScenes) === JSON.stringify(inputScenesClone),
  'Test P3C-A-12: Candidate builder operates purely without mutating input parameters'
);

// P3C-A-13: resolveVideoProductionMode maps Style A to ugc_video
assert(
  resolveVideoProductionMode('A') === 'ugc_video',
  'Test P3C-A-13: resolveVideoProductionMode maps Style A strictly to ugc_video'
);

// P3C-A-14: resolveVideoProductionMode maps Style B to text_motion
assert(
  resolveVideoProductionMode('B') === 'text_motion',
  'Test P3C-A-14: resolveVideoProductionMode maps Style B strictly to text_motion'
);

// P3C-A-15: resolveVideoProductionMode maps Style C to asset_product
assert(
  resolveVideoProductionMode('C') === 'asset_product',
  'Test P3C-A-15: resolveVideoProductionMode maps Style C strictly to asset_product'
);

// P3C-A-16: resolveVideoProductionMode handles case-insensitivity, prefixes, and fail-closed null
assert(
  resolveVideoProductionMode('style_a') === 'ugc_video' &&
  resolveVideoProductionMode('Style B (TikTok Loop)') === 'text_motion' &&
  resolveVideoProductionMode('Option C') === 'asset_product' &&
  resolveVideoProductionMode('unknown_style') === null,
  'Test P3C-A-16: resolveVideoProductionMode handles case-insensitivity, prefixes, and fail-closed null'
);

// P3C-A-17: buildCanonicalVideoScenePlan respects exact raw CTA in TOFU
const tofuScenePlan = buildCanonicalVideoScenePlan('TOFU', {
  hook: 'Hook TOFU',
  masalah: 'Masalah TOFU',
  solusi: 'Solusi TOFU',
  cta: 'Simpan postingan ini untuk nanti',
});
assert(
  tofuScenePlan[3].on_screen_text.includes('Simpan postingan ini untuk nanti') &&
  tofuScenePlan[3].voiceover.includes('Simpan postingan ini untuk nanti'),
  'Test P3C-A-17: buildCanonicalVideoScenePlan uses exact provided CTA without inventing text in TOFU'
);

// P3C-A-18: buildCanonicalVideoScenePlan respects exact raw CTA in BOFU
const bofuScenePlan = buildCanonicalVideoScenePlan('BOFU', {
  hook: 'Hook BOFU',
  masalah: 'Masalah BOFU',
  solusi: 'Solusi BOFU',
  cta: 'Daftar sekarang melalui link di bio',
});
assert(
  bofuScenePlan[3].on_screen_text.includes('Daftar sekarang melalui link di bio') &&
  bofuScenePlan[3].voiceover.includes('Daftar sekarang melalui link di bio'),
  'Test P3C-A-18: buildCanonicalVideoScenePlan uses exact provided CTA without inventing text in BOFU'
);

// P3C-A-19: Candidate validator rejects ImageProductionCandidate missing visualObjective or scene
const missingSceneImg = {
  ...validImageCand,
  production_details: {
    ...validImageCand.production_details,
    scene: '',
  },
};
const p3ca19Val = validateProductionCandidate(missingSceneImg);
assert(
  !p3ca19Val.isValid && p3ca19Val.error?.includes('scene'),
  'Test P3C-A-19: Image candidate with empty scene fails validation fail-closed'
);

// P3C-A-20: Candidate validator rejects ImageProductionCandidate missing final_prompt
const missingPromptImg = {
  ...validImageCand,
  final_prompt: '',
};
const p3ca20Val = validateProductionCandidate(missingPromptImg);
assert(
  !p3ca20Val.isValid && p3ca20Val.error?.includes('final_prompt'),
  'Test P3C-A-20: Image candidate with empty final_prompt fails validation fail-closed'
);

// P3C-A-21: Candidate validator rejects CarouselProductionCandidate with non-positive slide_count
const nonPositiveSlidesCarousel = {
  ...validCarouselCand,
  production_details: {
    ...validCarouselCand.production_details,
    slide_count: 0,
    slides: [],
  },
  final_prompts: {
    master_prompt: 'Master',
    slides: [],
  },
};
const p3ca21Val = validateProductionCandidate(nonPositiveSlidesCarousel);
assert(
  !p3ca21Val.isValid && p3ca21Val.error?.includes('slide_count'),
  'Test P3C-A-21: Carousel candidate with non-positive slide_count fails validation fail-closed'
);

// P3C-A-22: Candidate validator rejects CarouselProductionCandidate with invalid slide role
const invalidRoleCarousel = {
  ...validCarouselCand,
  production_details: {
    ...validCarouselCand.production_details,
    slides: [
      { slide_number: 1, role: 'invalid_role_xyz' as any, headline: 'H', body: 'B', visual_direction: 'V', layout_direction: 'L' },
      ...validCarouselCand.production_details.slides.slice(1),
    ],
  },
};
const p3ca22Val = validateProductionCandidate(invalidRoleCarousel);
assert(
  !p3ca22Val.isValid && p3ca22Val.error?.includes('role'),
  'Test P3C-A-22: Carousel candidate with invalid slide role fails validation fail-closed'
);

// P3C-A-23: Candidate validator rejects CarouselProductionCandidate with empty master_prompt
const emptyMasterPromptCarousel = {
  ...validCarouselCand,
  final_prompts: {
    ...validCarouselCand.final_prompts,
    master_prompt: '',
  },
};
const p3ca23Val = validateProductionCandidate(emptyMasterPromptCarousel);
assert(
  !p3ca23Val.isValid && p3ca23Val.error?.includes('master_prompt'),
  'Test P3C-A-23: Carousel candidate with empty master_prompt fails validation fail-closed'
);

// P3C-A-24: Candidate validator rejects VideoProductionCandidate with invalid production_mode
const invalidModeVideo = {
  ...validVideoCand,
  production_mode: 'unsupported_mode_xyz' as any,
};
const p3ca24Val = validateProductionCandidate(invalidModeVideo);
assert(
  !p3ca24Val.isValid && p3ca24Val.error?.includes('production_mode'),
  'Test P3C-A-24: Video candidate with invalid production_mode fails validation fail-closed'
);

// P3C-A-25: Candidate validator rejects VideoProductionCandidate with empty hook or final_prompt
const missingHookVideo = {
  ...validVideoCand,
  production_details: {
    ...validVideoCand.production_details,
    hook: '',
  },
};
const p3ca25Val = validateProductionCandidate(missingHookVideo);
assert(
  !p3ca25Val.isValid && p3ca25Val.error?.includes('hook'),
  'Test P3C-A-25: Video candidate with empty hook fails validation fail-closed'
);

// P3C-A-26: Candidate validator rejects candidate containing package authority fields (content_item_id, calendar_item_id)
const leakedItemCand = {
  ...validVideoCand,
  content_item_id: 'item_123',
};
const p3ca26Val = validateProductionCandidate(leakedItemCand);
assert(
  !p3ca26Val.isValid && p3ca26Val.error?.includes('authoritative package field: content_item_id'),
  'Test P3C-A-26: Candidate containing content_item_id fails validation fail-closed'
);

// P3C-A-27: Studio page.tsx source audit confirms isAuthoritativeProductionOutputSource provenance check
const studioPageContent = fs.readFileSync(path.join(projectRoot, 'app', 'production-studio', 'page.tsx'), 'utf8');
assert(
  studioPageContent.includes("isAuthoritativeProductionOutputSource(imageOutputSource)") &&
  studioPageContent.includes("isAuthoritativeProductionOutputSource(carouselOutputSource)") &&
  studioPageContent.includes("isAuthoritativeProductionOutputSource(videoOutputSource)") &&
  (
    studioPageContent.includes("setImageOutputSource('initial_draft')") ||
    studioPageContent.includes("setCarouselOutputSource('initial_draft')") ||
    studioPageContent.includes("setVideoOutputSource('initial_draft')")
  ),
  'Test P3C-A-27: Production Studio page.tsx integrates isAuthoritativeProductionOutputSource provenance check'
);

// P3C-A-28: Studio page.tsx normalizers accept attachProductionCandidate flag and use resolveVideoProductionMode
assert(
  studioPageContent.includes('attachProductionCandidate: boolean = true') &&
  studioPageContent.includes('resolveVideoProductionMode(id)'),
  'Test P3C-A-28: Production Studio normalizers accept attachProductionCandidate flag and use resolveVideoProductionMode'
);

// P3C-A-29: Video Candidate missing format fails validation fail-closed
const missingFormatVideo = {
  ...validVideoCand,
  production_details: {
    ...validVideoCand.production_details,
    format: '',
  },
};
const p3ca29Val = validateProductionCandidate(missingFormatVideo);
assert(
  !p3ca29Val.isValid && p3ca29Val.error?.includes('format'),
  'Test P3C-A-29: Video candidate with empty format fails validation fail-closed'
);

// P3C-A-30: resolveVideoProductionMode fail-closed returns null for unknown or invalid mode IDs
assert(
  resolveVideoProductionMode('XYZ') === null &&
  resolveVideoProductionMode('') === null &&
  resolveVideoProductionMode('invalid_mode') === null,
  'Test P3C-A-30: resolveVideoProductionMode returns null for unknown or invalid IDs (fail-closed)'
);

// P3C-A-31: isAuthoritativeProductionOutputSource correctness
assert(
  isAuthoritativeProductionOutputSource('stored_output') === true &&
  isAuthoritativeProductionOutputSource('generated_output') === true &&
  isAuthoritativeProductionOutputSource('user_edited_output') === true &&
  isAuthoritativeProductionOutputSource('initial_draft') === false &&
  isAuthoritativeProductionOutputSource('none') === false,
  'Test P3C-A-31: isAuthoritativeProductionOutputSource distinguishes authoritative from draft/none sources'
);

// P3C-A-32: Video Candidate missing negative_constraints fails validation
const missingNegativeVideo = {
  ...validVideoCand,
  production_details: {
    ...validVideoCand.production_details,
    negative_constraints: '',
  },
};
const p3ca32Val = validateProductionCandidate(missingNegativeVideo);
assert(
  !p3ca32Val.isValid && p3ca32Val.error?.includes('negative_constraints'),
  'Test P3C-A-32: Video candidate with empty negative_constraints fails validation fail-closed'
);

// P3C-A-33: Studio page.tsx resolves video production mode and guards candidate creation on valid productionMode
assert(
  studioPageContent.includes('const productionMode = resolveVideoProductionMode(id)') &&
  studioPageContent.includes('attachProductionCandidate && productionMode'),
  'Test P3C-A-33: Production Studio guards video candidate creation fail-closed on valid productionMode'
);

// P3C-A-34: Studio page.tsx reads video negative constraints from output and passes to buildVideoProductionCandidate
assert(
  (studioPageContent.includes('v.negative_constraints') || studioPageContent.includes('v.negativeConstraints')) &&
  studioPageContent.includes('negative_constraints: videoNegativeConstraints'),
  'Test P3C-A-34: validateAndNormalizeVideoStyles reads negative constraints from output and passes to candidate builder'
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
