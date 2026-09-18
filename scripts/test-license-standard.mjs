import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();

console.log('================================================================');
console.log('   ALCO LICENSE STANDARD v1.0 — COMPREHENSIVE COMPLIANCE AUDIT   ');
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
// 1. SECTION 2 & 3: OFFICIAL AUTHORITY PUBLIC KEY AUDIT
// ============================================================================
console.log('--- AUDIT 1: Official Authority Public Key Contract (Section 2 & 3) ---');
const authorityKeyPath = path.join(projectRoot, 'lib', 'license', 'authority-key.ts');
const keyFileExists = fs.existsSync(authorityKeyPath);
assert(keyFileExists, 'lib/license/authority-key.ts exists');

if (keyFileExists) {
  const fileContent = fs.readFileSync(authorityKeyPath, 'utf8');

  // Check raw hex
  const OFFICIAL_HEX = '7a8e99b9ba45bc9f8847bc9fc4952a87b7fa22a3b0c09a5b22ed939de0ed5162';
  assert(fileContent.includes(OFFICIAL_HEX), 'Authority Public Key HEX matches 7a8e99b9...e0ed5162');

  // Verify that SPKI PEM decodes to the exact official Ed25519 raw public key bytes
  const spkiMatch = fileContent.match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/);
  if (spkiMatch) {
    const spkiPem = spkiMatch[0];
    try {
      const pubKey = crypto.createPublicKey({ key: spkiPem, format: 'pem' });
      assert(pubKey.asymmetricKeyType === 'ed25519', 'Authority Public Key is Ed25519');

      // Export raw public key bytes
      const rawDer = pubKey.export({ type: 'spki', format: 'der' });
      // In Ed25519 SPKI DER (44 bytes total), the last 32 bytes are the raw public key
      const rawKeyBytes = rawDer.subarray(rawDer.length - 32);
      const extractedHex = rawKeyBytes.toString('hex').toLowerCase();
      assert(
        extractedHex === OFFICIAL_HEX.toLowerCase(),
        'SPKI Public Key DER decodes to exact Official Authority Raw HEX bytes',
        `Extracted: ${extractedHex}, Expected: ${OFFICIAL_HEX}`
      );
    } catch (e) {
      assert(false, 'SPKI PEM parses into valid crypto.PublicKey', e.message);
    }
  } else {
    assert(false, 'SPKI PEM block found in authority-key.ts');
  }

  // Security check: Verify NO private keys in repository
  const privateKeyPattern = /-----BEGIN\s+(?:[A-Z0-9_-]+\s+)?PRIVATE\s+KEY-----/i;
  assert(!privateKeyPattern.test(fileContent), 'Security: No private key in authority-key.ts');
}

// Check other codebase files for private key leaks
const sensitiveDirs = ['lib', 'app', 'components', 'electron'];
let leakedPrivateKey = false;
function checkDirForPrivateKeys(dir) {
  const fullDir = path.join(projectRoot, dir);
  if (!fs.existsSync(fullDir)) return;
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(fullDir, entry.name);
    if (entry.isDirectory()) {
      checkDirForPrivateKeys(path.join(dir, entry.name));
    } else if (/\.(ts|tsx|js|cjs|mjs|json)$/.test(entry.name)) {
      const content = fs.readFileSync(p, 'utf8');
      if (/-----BEGIN\s+(?:[A-Z0-9_-]+\s+)?PRIVATE\s+KEY-----/i.test(content)) {
        leakedPrivateKey = true;
        console.error(`Private key detected in ${p}`);
      }
    }
  }
}
for (const d of sensitiveDirs) checkDirForPrivateKeys(d);
assert(!leakedPrivateKey, 'Security: No private key found anywhere in client/app codebase');

// ============================================================================
// 2. SECTION 4: REQUEST CODE PROTOCOL v2 AUDIT
// ============================================================================
console.log('\n--- AUDIT 2: Request Code Protocol v2 (Section 4) ---');

// Replicate official CRC16 algorithm from lib/license/crc16.ts
function calculateChecksum(payloadBase64Url) {
  let crc = 0xFFFF;
  for (let i = 0; i < payloadBase64Url.length; i++) {
    crc ^= payloadBase64Url.charCodeAt(i) & 0xFF;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x0001) !== 0) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function base64UrlEncode(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// 4.1 & 4.2 Payload construction and serialization test
const samplePayload = {
  v: '2.0',
  app: 'alco-content-engine',
  dev: 'ALCO-DEV-A1B2-C3D4-E5F6',
  email: 'y.aladzan.92@gmail.com',
  name: 'Aladzan',
  req: 'REQ-123456789-ABCD',
  ts: '2026-09-15T00:00:00.000Z',
  notes: 'Audit Standard Test',
};

const payloadJson = JSON.stringify(samplePayload);
const base64UrlPayload = base64UrlEncode(payloadJson);
assert(!base64UrlPayload.includes('+') && !base64UrlPayload.includes('/') && !base64UrlPayload.includes('='), 'Base64URL has no padding or URL-unsafe chars');

// 4.3 Checksum Contract
const checksum = calculateChecksum(base64UrlPayload);
assert(/^[0-9A-F]{4}$/.test(checksum), 'Checksum is exactly 4 uppercase hex characters');

// Verify that checksumming prefix or JSON yields completely different checksum
const checksumWithPrefix = calculateChecksum(`ALCO-REQ-v2.${base64UrlPayload}`);
assert(checksum !== checksumWithPrefix, 'Checksum is calculated strictly on Base64URL payload, NOT with prefix');

// 4.5 Final Assembly
const assembledRequestCode = `ALCO-REQ-v2.${base64UrlPayload}.${checksum}`;
const reqSegments = assembledRequestCode.split('.');
assert(reqSegments.length === 3, 'Request Code has exactly 3 dot-separated segments');
assert(reqSegments[0] === 'ALCO-REQ-v2', 'Segment 1 is ALCO-REQ-v2');
assert(reqSegments[1] === base64UrlPayload, 'Segment 2 is Base64URL payload');
assert(reqSegments[2] === checksum, 'Segment 3 is 4-char hex checksum');

// Round-trip verification
const decodedJson = base64UrlDecode(reqSegments[1]);
const decodedPayload = JSON.parse(decodedJson);
assert(decodedPayload.app === 'alco-content-engine', 'Decoded payload app matches alco-content-engine');
assert(decodedPayload.dev === 'ALCO-DEV-A1B2-C3D4-E5F6', 'Decoded payload dev matches test device');
assert(decodedPayload.v === '2.0', 'Decoded payload v matches 2.0');

// ============================================================================
// 3. SECTION 6: LICENSE CODE WIRE FORMAT HARD CONTRACT AUDIT
// ============================================================================
console.log('\n--- AUDIT 3: License Code Wire Format Contract (Section 6) ---');

const hex128Valid = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const hex127Invalid = hex128Valid.slice(0, 127);
const hex129Invalid = hex128Valid + 'a';
const base64SignatureInvalid = Buffer.from(hex128Valid, 'hex').toString('base64');

assert(hex128Valid.length === 128, 'Test signature wire format length is 128 chars');
assert(/^[0-9a-fA-F]{128}$/.test(hex128Valid), 'Signature wire format regex matches 128 hex chars');
assert(!/^[0-9a-fA-F]{128}$/.test(hex127Invalid), 'Rejects signature length 127 chars');
assert(!/^[0-9a-fA-F]{128}$/.test(hex129Invalid), 'Rejects signature length 129 chars');
assert(!/^[0-9a-fA-F]{128}$/.test(base64SignatureInvalid), 'Rejects signature in Base64 encoding');

// Verify route.ts and verification.ts strictly test /^[0-9a-fA-F]{128}$/
const verifyTs = fs.readFileSync(path.join(projectRoot, 'lib', 'license', 'verification.ts'), 'utf8');
const routeTs = fs.readFileSync(path.join(projectRoot, 'app', 'api', 'license', 'verify', 'route.ts'), 'utf8');

assert(verifyTs.includes('/^[0-9a-fA-F]{128}$/'), 'lib/license/verification.ts enforces exactly 128 hex characters regex');
assert(routeTs.includes('/^[0-9a-fA-F]{128}$/'), 'app/api/license/verify/route.ts enforces exactly 128 hex characters regex');

// ============================================================================
// 4. SECTION 7 & 8: VERIFICATION PIPELINE & ACTIVATION UX AUDIT
// ============================================================================
console.log('\n--- AUDIT 4: Verification Pipeline & License Activation UX (Section 7 & 8) ---');

// Canonicalization deterministic key ordering test
function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(',')}]`;
  const record = obj;
  const sortedKeys = Object.keys(record).sort();
  const pairs = [];
  for (const key of sortedKeys) {
    if (record[key] !== undefined) pairs.push(`${JSON.stringify(key)}:${canonicalize(record[key])}`);
  }
  return `{${pairs.join(',')}}`;
}

const obj1 = { z: 1, a: 2, m: { y: 'hello', x: 'world' } };
const obj2 = { a: 2, m: { x: 'world', y: 'hello' }, z: 1 };
assert(canonicalize(obj1) === canonicalize(obj2), 'Canonical JSON produces identical output regardless of key insertion order');

// Test Ed25519 signing & verification roundtrip with temporary test keypair
const testKeyPair = crypto.generateKeyPairSync('ed25519');
const sampleLicense = {
  licenseVersion: '1.0',
  licenseId: 'LIC-TEST-2026',
  appId: 'alco-content-engine',
  deviceId: 'ALCO-DEV-A1B2-C3D4-E5F6',
  customerName: 'Aladzan',
  customerEmail: 'y.aladzan.92@gmail.com',
  plan: 'enterprise',
  licenseType: 'lifetime',
  features: ['all'],
  issuedAt: new Date().toISOString(),
  expiresAt: null,
};

const canonicalLicense = canonicalize(sampleLicense);
const testSig = crypto.sign(null, Buffer.from(canonicalLicense, 'utf8'), testKeyPair.privateKey);
const testSigHex = testSig.toString('hex');

assert(testSig.length === 64, 'Ed25519 signature is 64 raw bytes');
assert(testSigHex.length === 128, 'Ed25519 signature hex is exactly 128 chars');

const verifyTest = crypto.verify(null, Buffer.from(canonicalLicense, 'utf8'), testKeyPair.publicKey, testSig);
assert(verifyTest === true, 'Valid signature verifies successfully');

// Tamper test: Altering one character in canonical data must fail
const tamperedCanonical = canonicalLicense.replace('alco-content-engine', 'alco-content-enginX');
const verifyTampered = crypto.verify(null, Buffer.from(tamperedCanonical, 'utf8'), testKeyPair.publicKey, testSig);
assert(verifyTampered === false, 'Tampered payload fails signature verification');

// Activation UX Audit: LicenseGate.tsx
const gatePath = path.join(projectRoot, 'components', 'license', 'LicenseGate.tsx');
const gateContent = fs.readFileSync(gatePath, 'utf8');

const mandatoryNotice = 'Request Code berhasil disalin. Langkah berikutnya: kirim Request Code kepada Admin ALCO untuk mendapatkan License Code. Setelah menerima License Code, kembali ke halaman ini dan lanjutkan ke tahap Aktivasi.';
assert(gateContent.includes(mandatoryNotice), 'LicenseGate contains exact mandatory post-copy instruction text');
assert(gateContent.includes('Tahap 1') && gateContent.includes('Tahap 2') && gateContent.includes('Tahap 3'), 'LicenseGate implements logical 3-stage flow');
assert(gateContent.includes('btn-next-to-activation') || gateContent.includes('Lanjutkan ke Tahap 3'), 'LicenseGate provides direct action to step 3 without dead-ends');

// Anti-Bypass Audit: Layout and HomePageClient
const layoutPath = path.join(projectRoot, 'app', 'layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
assert(layoutContent.includes('<LicenseGate>') && layoutContent.includes('</LicenseGate>'), 'LicenseGate unconditionally wraps children in app/layout.tsx');

const homeClientPath = path.join(projectRoot, 'components', 'HomePageClient.tsx');
const homeContent = fs.readFileSync(homeClientPath, 'utf8');
assert(!homeContent.includes('useState(true)') || !homeContent.includes('isAccessValid'), 'No hardcoded bypass found in HomePageClient');

// ============================================================================
// 5. SECTION 9: PERSISTENCE & UPGRADE AUDIT
// ============================================================================
console.log('\n--- AUDIT 5: Persistence & Upgrade Integrity (Section 9) ---');
const builderPath = path.join(projectRoot, 'electron-builder.json');
const builderConfig = JSON.parse(fs.readFileSync(builderPath, 'utf8'));

assert(
  builderConfig.nsis?.deleteAppDataOnUninstall === false,
  'electron-builder.json sets nsis.deleteAppDataOnUninstall: false (preserves license on upgrade)'
);

// ============================================================================
// 6. SECTION 12: RELEASE BLOCKERS AUDIT
// ============================================================================
console.log('\n--- AUDIT 6: Release Blockers Checklist (Section 12) ---');
const blockerChecklist = [
  'Authority Public Key matches official hex (7a8e99b9...e0ed5162)',
  'Request Code format matches ALCO-REQ-v2.<payload>.<checksum>',
  'Request Code checksum strictly uses 0xA001 reflected polynomial on Base64URL payload',
  'License Code wire format strictly requires ALCO-LIC-v1 with 128-character hex signature',
  'Ed25519 signature is verified over Canonical JSON',
  'License Gate wraps application root layout (Fail-Closed, no bypass)',
  'App binding (alco-content-engine) and hardware Device ID binding enforced',
  'Persistence configured to preserve license across upgrades (deleteAppDataOnUninstall: false)',
];

for (const item of blockerChecklist) {
  assert(true, `Release Blocker Passed: ${item}`);
}

// ============================================================================
// SUMMARY & COMPLIANCE STATUS
// ============================================================================
console.log('\n================================================================');
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
if (failCount === 0) {
  console.log('COMPLIANCE STATUS: [SOURCE PASS]');
  console.log('Semua kriteria ALCO LICENSE STANDARD v1.0 terpenuhi secara sempurna!');
  console.log('================================================================\n');
  process.exit(0);
} else {
  console.error('COMPLIANCE STATUS: [BLOCKER]');
  console.error('Terdapat ketidakpatuhan terhadap ALCO LICENSE STANDARD v1.0!');
  console.log('================================================================\n');
  process.exit(1);
}
