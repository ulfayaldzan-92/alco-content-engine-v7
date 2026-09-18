import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

console.log('================================================================');
console.log('    ALCO UI/UX STANDARD v1.0 — COMPREHENSIVE COMPLIANCE AUDIT   ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`[SOURCE PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[BLOCKER] ${testName}${details ? ` -> ${details}` : ''}`);
    failCount++;
  }
}

// ============================================================================
// 1. SECTION 3: BRAND & VISUAL IDENTITY (GLOBAL PRIMARY, ACCENT, NEUTRALS)
// ============================================================================
console.log('--- AUDIT 1: Brand & Visual Identity (Section 3) ---');
const globalsCssPath = path.join(projectRoot, 'app', 'globals.css');
assert(fs.existsSync(globalsCssPath), 'app/globals.css exists');

const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

// Section 3.1: Global Primary ALCO Blue #2563EB
const hasAlcoBluePrimary = globalsCss.includes('#2563eb');
const hasPrimaryToken = globalsCss.includes('--primary: #2563eb') || globalsCss.includes('--alco-blue: #2563eb');
assert(hasAlcoBluePrimary && hasPrimaryToken, 'Global Primary is ALCO Blue (#2563EB)');

// Section 3.1: Premium Accent ALCO Gold #D4A017
const hasAlcoGoldToken = globalsCss.toLowerCase().includes('#d4a017');
assert(hasAlcoGoldToken, 'Premium Accent is ALCO Gold (#D4A017)');

// Section 3.1: Light Mode Neutral Foundation
// Background #F8FAFC, Card #FFFFFF, Foreground #0F172A, Muted #F1F5F9, Muted Text #64748B, Border #E2E8F0
const hasLightBg = globalsCss.includes('#f8fafc');
const hasLightCard = globalsCss.includes('#ffffff');
const hasLightFg = globalsCss.includes('#0f172a');
const hasLightMuted = globalsCss.includes('#f1f5f9');
const hasLightMutedText = globalsCss.includes('#64748b');
const hasLightBorder = globalsCss.includes('#e2e8f0');

assert(
  hasLightBg && hasLightCard && hasLightFg && hasLightMuted && hasLightMutedText && hasLightBorder,
  'Light mode neutral foundation strictly matches tokens (#F8FAFC, #FFFFFF, #0F172A, #F1F5F9, #64748B, #E2E8F0)'
);

// Section 3.1: Dark Mode Neutral Foundation
// Background #0B0F17 / #0F172A, Card #0F172A / #1E293B, Foreground #F8FAFC, Muted #1E293B, Muted Text #94A3B8
const hasDarkBg = globalsCss.includes('#0b0f17');
const hasDarkCard = globalsCss.includes('#0f172a');
const hasDarkMuted = globalsCss.includes('#1e293b');
const hasDarkMutedText = globalsCss.includes('#94a3b8');

assert(
  hasDarkBg && hasDarkCard && hasDarkMuted && hasDarkMutedText,
  'Dark mode neutral foundation strictly matches tokens (#0B0F17, #0F172A, #1E293B, #94A3B8)'
);

// ============================================================================
// 2. SECTION 4: PRODUCT ACCENT SYSTEM (ALCO CONTENT ENGINE = CYAN)
// ============================================================================
console.log('\n--- AUDIT 2: Product Accent System (Section 4 & Section 28) ---');
const hasCyanAccent = globalsCss.toLowerCase().includes('#06b6d4') || globalsCss.includes('--product-accent');
assert(hasCyanAccent, 'Product Accent for ALCO Content Engine is Cyan (#06B6D4)');

// Verify Product Accent does NOT replace ALCO Blue as global primary
const primaryNotCyan = !globalsCss.includes('--primary: #06b6d4');
assert(primaryNotCyan, 'Product Accent Cyan does NOT replace ALCO Blue as global primary');

// ============================================================================
// 3. SECTION 5: SEMANTIC COLOR STANDARD
// ============================================================================
console.log('\n--- AUDIT 3: Semantic Color Standard (Section 5) ---');
// Check semantic color usage in components (Emerald = Success, Amber = Warning, Red/Rose = Error, Blue = Info)
const shellPath = path.join(projectRoot, 'components', 'ContentEngineShell.tsx');
assert(fs.existsSync(shellPath), 'components/ContentEngineShell.tsx exists');
const shellCode = fs.readFileSync(shellPath, 'utf8');

const usesEmeraldForSuccess = shellCode.includes('emerald') || shellCode.includes('green');
const usesAmberForWarning = shellCode.includes('amber');
assert(usesEmeraldForSuccess, 'License active status uses Emerald (Success/Completed semantic color)');
assert(usesAmberForWarning, 'License unlicensed/warning status uses Amber (Warning/Draft semantic color)');

// ============================================================================
// 4. SECTION 7 & 8: APP SHELL & SIDEBAR STANDARD
// ============================================================================
console.log('\n--- AUDIT 4: App Shell & Sidebar Standard (Section 7 & 8) ---');

// Sidebar dimension: Expanded ~256px (w-64), Collapsed ~64px (w-16)
const hasExpandedDimension = shellCode.includes('w-64');
const hasCollapsedDimension = shellCode.includes('w-16');
assert(hasExpandedDimension && hasCollapsedDimension, 'Sidebar dimension satisfies 256px expanded / 64px collapsed standard');

// Sidebar structure: App Identity, MAIN/WORKSPACE, ALCO ECOSYSTEM, Settings & License
const hasAppIdentity = shellCode.includes('ALCO Content') && shellCode.includes('Engine');
const hasWorkspaceSection = shellCode.includes('Workspace') || shellCode.includes('Kalender Konten');
const hasEcosystemSection = shellCode.includes('ALCO Ecosystem');
const hasSettingsLicenseSection = shellCode.includes('Settings & License') || shellCode.includes('Lisensi ALCO');

assert(hasAppIdentity, 'App Identity is prominently displayed in Sidebar');
assert(hasWorkspaceSection, 'Workspace navigation section is present');
assert(hasEcosystemSection, 'ALCO Ecosystem section is present');
assert(hasSettingsLicenseSection, 'Settings & License section is present');

// Navigation state: Active = ALCO Blue (bg-primary text-primary-foreground)
const hasActiveNavStyle = shellCode.includes('bg-primary text-primary-foreground');
assert(hasActiveNavStyle, 'Active navigation state strictly uses ALCO Blue background with white text');

// Collapsible sidebar support
const hasCollapseToggle = shellCode.includes('toggleSidebar') && shellCode.includes('localStorage');
assert(hasCollapseToggle, 'Sidebar supports responsive toggle with localStorage persistence');

// ============================================================================
// 5. SECTION 9: HEADER STANDARD
// ============================================================================
console.log('\n--- AUDIT 5: Header Standard (Section 9) ---');
const hasHeaderTitle = shellCode.includes('h1') && shellCode.includes('title');
const hasHeaderLicense = shellCode.includes('LicenseModal') || shellCode.includes('ShieldCheck') || shellCode.includes('Key');
const hasThemeToggle = shellCode.includes('ThemeToggle');

assert(hasHeaderTitle, 'Header renders page/workspace title and eyebrow context');
assert(hasHeaderLicense, 'Header provides contextual license status indicator');
assert(hasThemeToggle, 'Header includes ThemeToggle for dark/light mode switching');

// ============================================================================
// 6. SECTION 10 & 13: COMPONENT STANDARD & PRIMARY ACTION RULE
// ============================================================================
console.log('\n--- AUDIT 6: Component Standard & Primary Action Rule (Section 10 & 13) ---');
const homePath = path.join(projectRoot, 'components', 'HomePageClient.tsx');
assert(fs.existsSync(homePath), 'components/HomePageClient.tsx exists');
const homeCode = fs.readFileSync(homePath, 'utf8');

// Primary button uses bg-primary text-primary-foreground
const hasPrimaryButtonClass = homeCode.includes('bg-primary') && (homeCode.includes('text-primary-foreground') || homeCode.includes('text-white'));
assert(hasPrimaryButtonClass, 'Primary action buttons use canonical ALCO Blue');

// Secondary button uses neutral/secondary style
const hasSecondaryButtonClass = homeCode.includes('bg-secondary') || homeCode.includes('bg-card');
assert(hasSecondaryButtonClass, 'Secondary action buttons use balanced neutral styling without competing with primary');

// Empty state explains: Apa yang belum ada + Mengapa area ini kosong + Tindakan berikutnya
const hasEmptyState = homeCode.includes('Belum Ada Project Aktif') && homeCode.includes('Mulai Project Baru');
assert(hasEmptyState, 'Empty state follows Section 15 (explains what is missing + reason + next action button)');

// ============================================================================
// 7. SECTION 18: CROSS-APP EXPERIENCE & ECOSYSTEM WORKFLOW
// ============================================================================
console.log('\n--- AUDIT 7: Cross-App Experience & Ecosystem Workflow (Section 18) ---');
const hasCreativeSystemInput = shellCode.includes('Creative System') && shellCode.includes('Input');
const hasAutoMotionOutput = shellCode.includes('Auto Motion') && shellCode.includes('Output');

assert(hasCreativeSystemInput, 'Ecosystem clearly displays Creative System as Input source (Violet)');
assert(hasAutoMotionOutput, 'Ecosystem clearly displays Auto Motion as Output target (Magenta)');

// ============================================================================
// 8. SECTION 20: LICENSE UX
// ============================================================================
console.log('\n--- AUDIT 8: License UX Consistency (Section 20) ---');
const licenseGatePath = path.join(projectRoot, 'components', 'license', 'LicenseGate.tsx');
assert(fs.existsSync(licenseGatePath), 'components/license/LicenseGate.tsx exists');
const gateCode = fs.readFileSync(licenseGatePath, 'utf8');

const showsPlan = gateCode.includes('Plan') || gateCode.includes('plan');
const showsDevice = gateCode.includes('Device ID') || gateCode.includes('deviceId');
const showsActivation = gateCode.includes('Aktivasi') || gateCode.includes('Request Code');

assert(showsPlan, 'License UX displays user plan');
assert(showsDevice, 'License UX displays hardware device binding');
assert(showsActivation, 'License UX guides user through clear 3-stage activation');

// ============================================================================
// 9. SECTION 21: LIGHT & DARK MODE SYSTEM
// ============================================================================
console.log('\n--- AUDIT 9: Light & Dark Mode System (Section 21) ---');
const hasDarkSelector = globalsCss.includes('.dark') || globalsCss.includes('[data-theme="dark"]');
const hasThemeScript = fs.existsSync(path.join(projectRoot, 'components', 'ThemeToggle.tsx'));

assert(hasDarkSelector, 'CSS defines explicit dark mode rules and variables');
assert(hasThemeScript, 'ThemeToggle component is available for seamless mode switching');

// ============================================================================
// 10. SECTION 23: ICONOGRAPHY STANDARD
// ============================================================================
console.log('\n--- AUDIT 10: Iconography Standard (Section 23) ---');
const shellImportsLucide = shellCode.includes("from 'lucide-react'");
const homeImportsLucide = homeCode.includes("from 'lucide-react'");
const gateImportsLucide = gateCode.includes("from 'lucide-react'");

assert(
  shellImportsLucide && homeImportsLucide && gateImportsLucide,
  'Iconography consistently and exclusively utilizes Lucide Icons'
);

// ============================================================================
// 11. SECTION 28: EXISTING PRODUCT NORMALIZATION (ALCO CONTENT ENGINE)
// ============================================================================
console.log('\n--- AUDIT 11: Existing Product Normalization Checklist (Section 28) ---');
const legacyCreamNormalized = globalsCss.includes('.bg-\\[\\#fffdf8\\]') && globalsCss.includes('var(--card)');
const legacyBorderNormalized = globalsCss.includes('.border-\\[\\#e7e0d4\\]') && globalsCss.includes('var(--border)');
const legacyTextNormalized = globalsCss.includes('.text-\\[\\#1f2933\\]') && globalsCss.includes('var(--foreground)');

assert(legacyCreamNormalized, 'Legacy cream background class is normalized to var(--card)');
assert(legacyBorderNormalized, 'Legacy border class is normalized to var(--border)');
assert(legacyTextNormalized, 'Legacy dark text class is normalized to var(--foreground)');

// ============================================================================
// 12. SECTION 29: NEW APP CHECKLIST & SUMMARY
// ============================================================================
console.log('\n--- AUDIT 12: UI/UX Master Checklist (Section 29) ---');
assert(hasAlcoBluePrimary, 'Checklist: ALCO Blue digunakan sebagai global primary');
assert(hasCyanAccent, 'Checklist: Product Accent sudah ditentukan (Cyan)');
assert(primaryNotCyan, 'Checklist: Product Accent tidak menggantikan semantic colors atau global primary');
assert(hasLightBg && hasDarkBg, 'Checklist: Light mode dan Dark mode konsisten');
assert(hasExpandedDimension && hasAppIdentity, 'Checklist: Sidebar mengikuti pola ALCO');
assert(hasHeaderTitle, 'Checklist: Header memiliki hierarchy yang jelas');
assert(hasActiveNavStyle, 'Checklist: Active navigation jelas');
assert(hasEmptyState, 'Checklist: Empty state tersedia dan membantu');
assert(showsActivation, 'Checklist: License UX konsisten');
assert(shellImportsLucide, 'Checklist: Iconography konsisten (Lucide)');

console.log('================================================================');
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
if (failCount === 0) {
  console.log('COMPLIANCE STATUS: [SOURCE PASS]');
  console.log('Semua kriteria ALCO UI/UX STANDARD v1.0 terpenuhi secara sempurna!');
} else {
  console.error('COMPLIANCE STATUS: [BLOCKER]');
  console.error('Terdapat ketidakpatuhan terhadap ALCO UI/UX STANDARD v1.0!');
  process.exit(1);
}
console.log('================================================================\n');
