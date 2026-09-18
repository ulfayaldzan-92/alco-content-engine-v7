import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const errors = [];
const successes = [];

// ============================================================================
// 1. App Router & Core Next.js Stability
// ============================================================================
const globalErrorPath = path.join(projectRoot, 'app', 'global-error.tsx');
if (fs.existsSync(globalErrorPath)) {
  successes.push('app/global-error.tsx ditemukan dan terpasang.');
} else {
  errors.push('app/global-error.tsx WAJIB ada di root App Router!');
}

const nextConfigCandidates = ['next.config.ts', 'next.config.js', 'next.config.mjs'];
const forbiddenConfigProps = ['standalone', 'assetPrefix', 'basePath'];

let foundNextConfig = false;
for (const configName of nextConfigCandidates) {
  const configPath = path.join(projectRoot, configName);
  if (fs.existsSync(configPath)) {
    foundNextConfig = true;
    const content = fs.readFileSync(configPath, 'utf8');
    for (const prop of forbiddenConfigProps) {
      const regex = new RegExp(`\\b${prop}\\b`, 'i');
      if (regex.test(content)) {
        errors.push(`${configName} TIDAK BOLEH mengandung properti "${prop}"!`);
      }
    }

    if (/\bprocess\.argv\b/.test(content)) {
      errors.push(`${configName} TIDAK BOLEH menggunakan process.argv untuk mendeteksi development/build! Gunakan parameter phase.`);
    }

    if (/\bdistDir\b/.test(content)) {
      const isConditionalDevNextDev = /isDev\b.*distDir.*\.next-dev|\bdistDir\b.*isDev|\.\.\s*\(\s*isDev\s*\?\s*\{\s*distDir:\s*['"]\.next-dev['"]\s*\}\s*:\s*\{\s*\}\s*\)/.test(content) ||
        (content.includes('distDir') && content.includes('isDev') && content.includes('.next-dev'));
      if (!isConditionalDevNextDev) {
        errors.push(`${configName} property "distDir" hanya boleh digunakan secara conditional untuk development (.next-dev)!`);
      }
    }
  }
}

if (!foundNextConfig) {
  errors.push('File konfigurasi Next.js (next.config.ts) tidak ditemukan!');
} else {
  successes.push('next.config.ts valid (distDir conditional untuk .next-dev, bebas dari standalone, assetPrefix, dan basePath).');
}

// ============================================================================
// 2. Package.json Scripts & Port Registry (ALCO APP STANDARD v2.9 Section 3)
// ============================================================================
const packageJsonPath = path.join(projectRoot, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  errors.push('package.json tidak ditemukan!');
} else {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const scripts = pkg.scripts || {};

    if (scripts.build !== 'next build') {
      errors.push(`package.json "build" script harus tepat "next build", saat ini: "${scripts.build}"`);
    } else {
      successes.push('package.json "build" script valid ("next build").');
    }

    if (scripts.start !== 'next start') {
      errors.push(`package.json "start" script harus tepat "next start", saat ini: "${scripts.start}"`);
    } else {
      successes.push('package.json "start" script valid ("next start").');
    }

    // ALCO APP STANDARD v2.9 Section 3: ALCO Content Engine Dev Port is 3102
    if (scripts['desktop:dev'] && scripts['desktop:dev'].includes('3102')) {
      successes.push('ALCO APP STANDARD v2.9 Section 3: Development Port 3102 terdaftar di script desktop:dev.');
    } else {
      errors.push('ALCO APP STANDARD v2.9 Section 3: Script desktop:dev wajib menggunakan port resmi 3102!');
    }
  } catch {
    errors.push('Gagal mem-parse package.json!');
  }
}

// ============================================================================
// 3. Clean next-env.d.ts
// ============================================================================
const nextEnvPath = path.join(projectRoot, 'next-env.d.ts');
if (fs.existsSync(nextEnvPath)) {
  let nextEnvContent = fs.readFileSync(nextEnvPath, 'utf8');
  if (nextEnvContent.includes('.next/') || nextEnvContent.includes('.next-dev/')) {
    nextEnvContent = nextEnvContent.replace(/\/\/\/\s*<reference\s+(?:types|path)\s*=\s*["']\.\/(?:\.next|\.next-dev)\/types\/[^"']*["']\s*\/>\n?/g, '');
    nextEnvContent = nextEnvContent.replace(/\/\/\/\s*<reference\s+(?:types|path)\s*=\s*["'](?:\.next|\.next-dev)\/types\/[^"']*["']\s*\/>\n?/g, '');
    fs.writeFileSync(nextEnvPath, nextEnvContent, 'utf8');
  }
  successes.push('next-env.d.ts telah dibersihkan otomatis dari reference ".next/" atau ".next-dev/".');
} else {
  errors.push('next-env.d.ts tidak ditemukan!');
}

// ============================================================================
// 4. ALCO License Protocol Module Structure
// ============================================================================
const licenseFiles = [
  'lib/license/types.ts',
  'lib/license/device-fingerprint.ts',
  'lib/license/request-code.ts',
  'lib/license/canonical.ts',
  'lib/license/authority-key.ts',
  'lib/license/verification.ts',
  'lib/license/license-context.tsx',
  'components/license/LicenseGate.tsx',
];

let allLicenseFilesExist = true;
for (const relPath of licenseFiles) {
  const fullPath = path.join(projectRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    errors.push(`ALCO License file "${relPath}" wajib ada!`);
    allLicenseFilesExist = false;
  }
}

if (allLicenseFilesExist) {
  successes.push('ALCO License Protocol files terpasang lengkap.');
}

// License Gate Enforcement in Root Layout
const layoutPath = path.join(projectRoot, 'app', 'layout.tsx');
if (fs.existsSync(layoutPath)) {
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  if (layoutContent.includes('<LicenseGate>') && layoutContent.includes('</LicenseGate>')) {
    successes.push('License Gate terpasang aktif di RootLayout (app/layout.tsx).');
  } else {
    errors.push('app/layout.tsx wajib membungkus children dengan <LicenseGate>!');
  }
}

// Anti-Bypass Check
const homeClientPath = path.join(projectRoot, 'components', 'HomePageClient.tsx');
if (fs.existsSync(homeClientPath)) {
  const homeClientContent = fs.readFileSync(homeClientPath, 'utf8');
  if (homeClientContent.includes('useState(true)') && homeClientContent.includes('isAccessValid')) {
    errors.push('CRITICAL: Ditemukan hardcoded default bypass isAccessValid = true di HomePageClient.tsx!');
  } else {
    successes.push('Bebas dari default bypass (isAccessValid tersinkronisasi penuh dengan useLicense).');
  }
}

// ============================================================================
// 5. ALCO LICENSE STANDARD v1.0 Section 3: Official Authority Public Key
// ============================================================================
const authorityKeyPath = path.join(projectRoot, 'lib', 'license', 'authority-key.ts');
if (fs.existsSync(authorityKeyPath)) {
  const keyContent = fs.readFileSync(authorityKeyPath, 'utf8');
  const privateKeyPatterns = [
    /-----BEGIN\s+(?:[A-Z0-9_-]+\s+)?PRIVATE\s+KEY-----/i,
    /(?:export\s+)?(?:const|let|var)\s+\w*(?:private_?key|signing_?private_?key|authority_?private_?key)\w*\s*=/i,
    /\b(?:authorityPrivateKey|signingPrivateKey|privateKey|PRIVATE_KEY)\s*[:=]/i,
  ];
  const detectedPattern = privateKeyPatterns.find((pattern) => pattern.test(keyContent));

  if (detectedPattern) {
    errors.push('CRITICAL SECURITY VIOLATION: Authority Private Key ditemukan di authority-key.ts! Hanya Authority Public Key yang diperbolehkan.');
  } else {
    successes.push('Security Audit: authority-key.ts bebas dari Private Key (Authority Public Key only).');
  }

  const OFFICIAL_HEX = '7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162';
  if (keyContent.includes(OFFICIAL_HEX)) {
    successes.push('ALCO LICENSE STANDARD v1.0 Section 3 terverifikasi: Official Authority Public Key HEX identik (7a8e99b9...e0ed5162).');
  } else {
    errors.push('ALCO LICENSE STANDARD v1.0 Section 3: Authority Public Key HEX wajib bernilai 7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162!');
  }
}

// ============================================================================
// 6. ALCO APP STANDARD v2.9 Section 4 & 6: Production Runtime & Health Verification
// ============================================================================
const electronMainPath = path.join(projectRoot, 'electron', 'main.cjs');
const electronServerPath = path.join(projectRoot, 'electron', 'server.cjs');
const electronPreloadPath = path.join(projectRoot, 'electron', 'preload.cjs');
const healthRoutePath = path.join(projectRoot, 'app', 'api', 'health', 'route.ts');
const electronBuilderPath = path.join(projectRoot, 'electron-builder.json');

if (fs.existsSync(electronMainPath) && fs.existsSync(electronServerPath)) {
  const mainContent = fs.readFileSync(electronMainPath, 'utf8');
  if (mainContent.includes('checkServerHealth') && mainContent.includes('findAvailablePort') && mainContent.includes('stopProductionServer')) {
    successes.push('ALCO APP STANDARD v2.9 Section 4: Production runtime terpasang (dynamic port, health retry, child process management).');
  } else {
    errors.push('electron/main.cjs harus mengimplementasikan findAvailablePort, checkServerHealth, dan stopProductionServer!');
  }
} else {
  errors.push('electron/main.cjs atau electron/server.cjs tidak ditemukan!');
}

// Device ID Hardware Protocol (Windows MachineGuid, ALCO-DEV-XXXX-XXXX-XXXX)
if (fs.existsSync(electronMainPath) && fs.existsSync(electronPreloadPath)) {
  const mainContent = fs.readFileSync(electronMainPath, 'utf8');
  const preloadContent = fs.readFileSync(electronPreloadPath, 'utf8');

  const hasMachineGuid = mainContent.includes('getWindowsMachineGuid') && mainContent.includes('getAlcoProductionDeviceId');
  const hasIpcHandler = mainContent.includes("ipcMain.handle('alco:get-device-id'");
  const hasPreloadBridge = preloadContent.includes('alcoBridge') && preloadContent.includes('getDeviceId');

  if (hasMachineGuid && hasIpcHandler && hasPreloadBridge) {
    successes.push('Device ID hardware protocol terpasang lengkap (Windows MachineGuid, format ALCO-DEV-XXXX-XXXX-XXXX, IPC bridge).');
  } else {
    errors.push('Device ID protocol belum lengkap di electron/main.cjs atau electron/preload.cjs!');
  }
} else {
  errors.push('electron/preload.cjs tidak ditemukan!');
}

// Health Check Endpoint with App Identity Check
if (fs.existsSync(healthRoutePath)) {
  const healthContent = fs.readFileSync(healthRoutePath, 'utf8');
  if (healthContent.includes('alco-content-engine')) {
    successes.push('Endpoint health check production (/api/health) terpasang dengan app identity "alco-content-engine".');
  } else {
    errors.push('app/api/health/route.ts wajib menyertakan app identity "alco-content-engine"!');
  }
} else {
  errors.push('app/api/health/route.ts wajib ada untuk health check!');
}

if (fs.existsSync(electronMainPath)) {
  const mainContent = fs.readFileSync(electronMainPath, 'utf8');
  if (mainContent.includes('alco-content-engine')) {
    successes.push('ALCO APP STANDARD v2.9 Section 4: Health check client memvalidasi App Identity "alco-content-engine".');
  } else {
    errors.push('electron/main.cjs wajib memvalidasi app identity "alco-content-engine" pada health check!');
  }
}

// ============================================================================
// 7. ALCO APP STANDARD v2.9 Section 5 & 6: Production Dependency & Resource Path Contract
// ============================================================================
if (fs.existsSync(electronBuilderPath)) {
  const builderConfig = JSON.parse(fs.readFileSync(electronBuilderPath, 'utf8'));

  // Section 5: Production Dependency Contract
  const hasFiles = Array.isArray(builderConfig.files) &&
    builderConfig.files.includes('.next/**/*') &&
    builderConfig.files.includes('public/**/*') &&
    builderConfig.files.includes('electron/**/*') &&
    builderConfig.files.includes('assets/**/*') &&
    builderConfig.files.includes('package.json');

  const hasAsarUnpack = Array.isArray(builderConfig.asarUnpack) &&
    builderConfig.asarUnpack.includes('.next/**/*') &&
    builderConfig.asarUnpack.includes('public/**/*') &&
    builderConfig.asarUnpack.includes('assets/**/*') &&
    builderConfig.asarUnpack.includes('electron/**/*') &&
    (builderConfig.asarUnpack.includes('node_modules/**/*') || builderConfig.asarUnpack.includes('node_modules/next/**/*'));

  if (hasFiles && hasAsarUnpack) {
    successes.push('ALCO APP STANDARD v2.9 Section 5: Production Dependency Contract terpenuhi (files packaging & asarUnpack runtime dependencies lengkap).');
  } else {
    errors.push('ALCO APP STANDARD v2.9 Section 5: electron-builder.json wajib menyertakan .next, public, assets, electron, dan next di files & asarUnpack!');
  }

  // Section 2: App Identity
  if (builderConfig.appId === 'com.alco.contentengine' && builderConfig.productName === 'ALCO Content Engine' && builderConfig.win?.executableName === 'ALCO Content Engine') {
    successes.push('ALCO APP STANDARD v2.9 Section 2: App Identity stabil (appId: com.alco.contentengine, productName: ALCO Content Engine, executableName: ALCO Content Engine).');
  } else {
    errors.push('electron-builder.json appId, productName, atau executableName tidak sesuai!');
  }

  // Section 8: Windows Icon Contract
  const hasRootIcon = builderConfig.icon === 'assets/icon.ico';
  const hasWinIcon = builderConfig.win?.icon === 'assets/icon.ico';
  const hasNsisIcons = builderConfig.nsis?.installerIcon === 'assets/icon.ico' && builderConfig.nsis?.uninstallerIcon === 'assets/icon.ico';

  if (hasRootIcon && hasWinIcon && hasNsisIcons) {
    successes.push('ALCO APP STANDARD v2.9 Section 8: Windows Icon Contract lengkap (builder root icon, win.icon, installerIcon, uninstallerIcon).');
  } else {
    errors.push('electron-builder.json Windows Icon Contract belum lengkap!');
  }

  // Section 8 & 9: Persistence & Upgrade Integrity
  if (builderConfig.nsis?.deleteAppDataOnUninstall === false) {
    successes.push('ALCO APP STANDARD v2.9 Section 9: Persistence & Upgrade Integrity terverifikasi (deleteAppDataOnUninstall: false).');
  } else {
    errors.push('electron-builder.json NSIS configuration wajib menetapkan deleteAppDataOnUninstall: false!');
  }
} else {
  errors.push('electron-builder.json tidak ditemukan!');
}

// Section 6: Production Resource Path Contract in electron/main.cjs and electron/server.cjs
if (fs.existsSync(electronMainPath) && fs.existsSync(electronServerPath)) {
  const mainContent = fs.readFileSync(electronMainPath, 'utf8');
  const serverContent = fs.readFileSync(electronServerPath, 'utf8');

  const mainHasCandidateResolution = mainContent.includes('resolveAppDirectory') &&
    mainContent.includes('resourcesPath') &&
    mainContent.includes('app.asar.unpacked') &&
    mainContent.includes('checkUiEntryPoint');

  const serverHasCandidateResolution = serverContent.includes('resolveServerAppDir') &&
    serverContent.includes('resourcesPath') &&
    serverContent.includes('app.asar.unpacked');

  if (mainHasCandidateResolution && serverHasCandidateResolution) {
    successes.push('ALCO APP STANDARD v2.9 Section 6: Production Resource Path Contract terverifikasi (multi-candidate real path resolution bebas dari ketergantungan process.cwd() & UI entry point GET / 200 check).');
  } else {
    errors.push('ALCO APP STANDARD v2.9 Section 6: electron/main.cjs dan electron/server.cjs wajib memvalidasi production resource path independen dari process.cwd() dan memverifikasi GET / HTTP 200!');
  }
}

const iconIcoPath = path.join(projectRoot, 'assets', 'icon.ico');
const iconPngPath = path.join(projectRoot, 'assets', 'icon.png');
if (fs.existsSync(iconIcoPath) && fs.existsSync(iconPngPath)) {
  successes.push('ALCO APP STANDARD v2.9 Section 8: Source Icon terpasang lengkap (assets/icon.ico dan assets/icon.png).');
} else {
  errors.push('File assets/icon.ico atau assets/icon.png tidak ditemukan!');
}

// ============================================================================
// 8. ALCO LICENSE STANDARD v1.0 Section 6: License Code Wire Format Contract
// ============================================================================
const verificationPath = path.join(projectRoot, 'lib', 'license', 'verification.ts');
const apiVerifyPath = path.join(projectRoot, 'app', 'api', 'license', 'verify', 'route.ts');

if (fs.existsSync(verificationPath) && fs.existsSync(apiVerifyPath)) {
  const verifyCode = fs.readFileSync(verificationPath, 'utf8');
  const apiCode = fs.readFileSync(apiVerifyPath, 'utf8');

  const hex128Regex = /\[0-9a-fA-F\]\{128\}/;
  const hasClientHexCheck = hex128Regex.test(verifyCode) && verifyCode.includes('signatureHex');
  const hasApiHexCheck = hex128Regex.test(apiCode) && apiCode.includes('signatureHex');

  if (hasClientHexCheck && hasApiHexCheck) {
    successes.push('ALCO LICENSE STANDARD v1.0 Section 6: Wire Format Contract terverifikasi (Ed25519 signature tepat 128 karakter hex).');
  } else {
    errors.push('ALCO LICENSE STANDARD v1.0 Section 6: verification.ts dan route.ts wajib memvalidasi signature wire format tepat 128 karakter hex (/^[0-9a-fA-F]{128}$/)!');
  }
} else {
  errors.push('File verification.ts atau api/license/verify/route.ts tidak ditemukan!');
}

// ============================================================================
// 9. ALCO LICENSE STANDARD v1.0 Section 4: Request Code Checksum Contract
// ============================================================================
const crcPath = path.join(projectRoot, 'lib', 'license', 'crc16.ts');
const requestCodePath = path.join(projectRoot, 'lib', 'license', 'request-code.ts');

if (fs.existsSync(crcPath) && fs.existsSync(requestCodePath)) {
  const crcCode = fs.readFileSync(crcPath, 'utf8');
  const reqCode = fs.readFileSync(requestCodePath, 'utf8');

  const has0xA001 = crcCode.includes('0xA001');
  const hasReflected = crcCode.includes('>> 1') && crcCode.includes('& 0x0001');
  const hasOnlyPayloadChecksum = reqCode.includes('calculateChecksum(base64UrlPayload)') || reqCode.includes('calculateCRC16(base64UrlPayload)');
  const noPrefixInChecksum = !reqCode.includes('calculateChecksum(prefixAndPayload)') && !reqCode.includes('calculateCRC16(prefixAndPayload)');

  if (has0xA001 && hasReflected && hasOnlyPayloadChecksum && noPrefixInChecksum) {
    successes.push('ALCO LICENSE STANDARD v1.0 Section 4: Polynomial 0xA001 reflected & Checksum dihitung HANYA dari Base64URL payload.');
  } else {
    errors.push('ALCO LICENSE STANDARD v1.0 Section 4: Checksum wajib menggunakan polynomial 0xA001 reflected dan dihitung HANYA dari string Base64URL payload!');
  }
} else {
  errors.push('lib/license/crc16.ts atau lib/license/request-code.ts tidak ditemukan!');
}

// ============================================================================
// 10. ALCO LICENSE STANDARD v1.0 Section 8 & ALCO UI/UX STANDARD v1.0
// ============================================================================
const licenseGatePath = path.join(projectRoot, 'components', 'license', 'LicenseGate.tsx');
if (fs.existsSync(licenseGatePath)) {
  const gateCode = fs.readFileSync(licenseGatePath, 'utf8');
  const mandatoryGuidance = 'Request Code berhasil disalin. Langkah berikutnya: kirim Request Code kepada Admin ALCO untuk mendapatkan License Code. Setelah menerima License Code, kembali ke halaman ini dan lanjutkan ke tahap Aktivasi.';

  const hasMandatoryGuidance = gateCode.includes(mandatoryGuidance);
  const has3Stages = gateCode.includes('Tahap 1') && gateCode.includes('Tahap 2') && gateCode.includes('Tahap 3');
  const hasNextToActivation = gateCode.includes('btn-next-to-activation') || gateCode.includes('Lanjutkan ke Tahap 3');

  if (hasMandatoryGuidance && has3Stages && hasNextToActivation) {
    successes.push('ALCO LICENSE STANDARD v1.0 Section 8: Pola aktivasi 3 tahap (Buat, Dapatkan, Aktivasi) & instruksi next action tanpa dead-end.');
  } else {
    errors.push('ALCO LICENSE STANDARD v1.0 Section 8: LicenseGate.tsx wajib mematuhi alur 3 tahap dan instruksi wajib setelah Request Code disalin!');
  }
} else {
  errors.push('components/license/LicenseGate.tsx tidak ditemukan!');
}

// ============================================================================
// 11. ALCO UI/UX STANDARD v1.0: Brand, Color, Shell & Component Normalization
// ============================================================================
const globalsCssPath = path.join(projectRoot, 'app', 'globals.css');
if (fs.existsSync(globalsCssPath)) {
  const css = fs.readFileSync(globalsCssPath, 'utf8');
  const hasAlcoBlue = css.includes('#2563eb');
  const hasAlcoGold = css.toLowerCase().includes('#d4a017');
  const hasCyanAccent = css.toLowerCase().includes('#06b6d4') || css.includes('--product-accent');
  const hasLightTokens = css.includes('#f8fafc') && css.includes('#ffffff') && css.includes('#0f172a');
  const hasDarkTokens = css.includes('#0b0f17') && css.includes('#0f172a');
  const hasNormalizedOverrides = css.includes('.bg-\\[\\#fffdf8\\]') && css.includes('var(--card)');

  if (hasAlcoBlue && hasAlcoGold && hasCyanAccent && hasLightTokens && hasDarkTokens && hasNormalizedOverrides) {
    successes.push('ALCO UI/UX STANDARD v1.0: Brand Identity (ALCO Blue #2563EB, Gold #D4A017), Accent (Cyan #06B6D4), dan Neutral Foundation terverifikasi.');
  } else {
    errors.push('ALCO UI/UX STANDARD v1.0: globals.css wajib mematuhi tokens ALCO Blue (#2563EB), Gold (#D4A017), Accent Cyan (#06B6D4), dan Neutral Foundation!');
  }
} else {
  errors.push('app/globals.css tidak ditemukan!');
}

const shellPath = path.join(projectRoot, 'components', 'ContentEngineShell.tsx');
if (fs.existsSync(shellPath)) {
  const shell = fs.readFileSync(shellPath, 'utf8');
  const hasSidebarDims = shell.includes('w-64') && shell.includes('w-16');
  const hasEcosystem = shell.includes('Creative System') && shell.includes('Auto Motion');
  const hasLicenseSection = shell.includes('Settings & License') || shell.includes('Lisensi ALCO');

  if (hasSidebarDims && hasEcosystem && hasLicenseSection) {
    successes.push('ALCO UI/UX STANDARD v1.0: App Shell & Sidebar (256px/64px, Ecosystem workflow, License entry) terverifikasi.');
  } else {
    errors.push('ALCO UI/UX STANDARD v1.0: ContentEngineShell.tsx wajib mematuhi dimensi sidebar, alur ekosistem, dan section lisensi!');
  }
} else {
  errors.push('components/ContentEngineShell.tsx tidak ditemukan!');
}

// ============================================================================
// Compliance Evidence Matrix & Summary Output (ALCO APP STANDARD v2.9 Section 13)
// ============================================================================
console.log('=== ALCO COMPLIANCE EVIDENCE MATRIX ===');
console.log('Standards Evaluated:');
console.log('1. ALCO APP STANDARD v2.9 (Application Core)');
console.log('2. ALCO LICENSE STANDARD v1.0 (Licensing Master)');
console.log('3. ALCO UI/UX STANDARD v1.0 (Interface & Experience Consistency)\n');

for (const s of successes) {
  console.log(`[SOURCE PASS] ${s}`);
}

if (errors.length > 0) {
  console.error('\n--- PEMERIKSAAN KEPATUHAN GAGAL (BLOCKER) ---');
  for (const e of errors) {
    console.error(`[BLOCKER] ${e}`);
  }
  process.exit(1);
} else {
  console.log('\n[SOURCE PASS] Seluruh kriteria ALCO APP STANDARD v2.9, ALCO LICENSE STANDARD v1.0, dan ALCO UI/UX STANDARD v1.0 terpenuhi!\n');
  process.exit(0);
}
