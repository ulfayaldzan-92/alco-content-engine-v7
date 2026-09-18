import { AlcoLicensePayload, AlcoVerificationResult } from './types';
import { canonicalize, base64UrlDecode, hexToUint8Array } from './canonical';
import { ALCO_APP_ID, ALCO_AUTHORITY_PUBLIC_KEY_SPKI } from './authority-key';
import { isValidAlcoDeviceId } from './device-fingerprint';

/**
 * Validates the schema of an ALCO License payload
 */
export function validateLicensePayloadSchema(payload: unknown): { valid: boolean; error?: string; license?: AlcoLicensePayload } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'License payload is not a valid object' };
  }

  const p = payload as Partial<AlcoLicensePayload>;

  if (p.licenseVersion !== '1.0') {
    return { valid: false, error: `Unsupported licenseVersion: ${p.licenseVersion}. Expected 1.0` };
  }

  if (!p.licenseId || typeof p.licenseId !== 'string') {
    return { valid: false, error: 'Missing or invalid licenseId in payload' };
  }

  if (p.appId !== ALCO_APP_ID) {
    return { valid: false, error: `License is for app "${p.appId}", expected "${ALCO_APP_ID}"` };
  }

  if (!p.deviceId || !isValidAlcoDeviceId(p.deviceId)) {
    return { valid: false, error: `Invalid deviceId in license: ${p.deviceId}` };
  }

  if (!p.plan || !['starter', 'pro', 'enterprise', 'custom'].includes(p.plan)) {
    return { valid: false, error: `Invalid plan in license: ${p.plan}` };
  }

  if (!p.licenseType || !['lifetime', 'subscription'].includes(p.licenseType)) {
    return { valid: false, error: `Invalid licenseType in license: ${p.licenseType}` };
  }

  if (!Array.isArray(p.features)) {
    return { valid: false, error: 'License features must be an array' };
  }

  if (!p.issuedAt || isNaN(Date.parse(p.issuedAt))) {
    return { valid: false, error: 'Invalid issuedAt timestamp in license' };
  }

  if (p.licenseType === 'lifetime') {
    if (p.expiresAt !== null && p.expiresAt !== undefined) {
      return { valid: false, error: 'Lifetime license must have expiresAt = null' };
    }
  } else if (p.licenseType === 'subscription') {
    if (!p.expiresAt || isNaN(Date.parse(p.expiresAt))) {
      return { valid: false, error: 'Subscription license must have a valid expiresAt timestamp' };
    }
  }

  return {
    valid: true,
    license: p as AlcoLicensePayload,
  };
}

/**
 * Checks if a subscription license has expired
 */
export function isLicenseExpired(license: AlcoLicensePayload): boolean {
  if (license.licenseType === 'lifetime' || !license.expiresAt) {
    return false;
  }
  const expiry = new Date(license.expiresAt).getTime();
  return expiry < Date.now();
}

/**
 * Parses and verifies an ALCO License Code string.
 * ALCO LICENSE STANDARD v1.0 Section 6 Official Wire Format:
 * Format: ALCO-LIC-v1.<BASE64URL_CANONICAL_PAYLOAD>.<SIGNATURE_HEX>
 * Signature Contract:
 * - Algoritma: Ed25519
 * - Signature: 64 bytes
 * - Representasi wire: HEX
 * - Panjang: tepat 128 karakter hexadecimal (/^[0-9a-fA-F]{128}$/)
 * - DILARANG mengubah SIGNATURE_HEX menjadi Base64, Base64URL, atau encoding lain.
 */
export async function verifyLicenseCode(
  rawLicenseCode: string,
  expectedDeviceId?: string
): Promise<AlcoVerificationResult> {
  if (!rawLicenseCode || typeof rawLicenseCode !== 'string') {
    return { valid: false, status: 'unlicensed', error: 'Kode lisensi kosong' };
  }

  const trimmed = rawLicenseCode.trim();
  const segments = trimmed.split('.');

  if (segments.length !== 3) {
    return { valid: false, status: 'malformed', error: 'Format kode lisensi tidak valid (harus 3 segmen ALCO-LIC-v1.<payload>.<signature_hex>)' };
  }

  const [prefix, base64Payload, signatureHex] = segments;

  if (prefix !== 'ALCO-LIC-v1') {
    return { valid: false, status: 'malformed', error: `Prefix lisensi tidak dikenali: ${prefix}. Diharapkan ALCO-LIC-v1` };
  }

  // ALCO LICENSE STANDARD v1.0 Section 6: Signature wire representation MUST be exactly 128 hex chars
  if (!signatureHex || !/^[0-9a-fA-F]{128}$/.test(signatureHex)) {
    return {
      valid: false,
      status: 'malformed',
      error: 'Format signature lisensi tidak valid: wajib tepat 128 karakter hexadecimal sesuai ALCO LICENSE STANDARD v1.0 Section 6',
    };
  }

  // 1. Decode payload
  let rawJson: string;
  let parsedPayload: unknown;
  try {
    rawJson = base64UrlDecode(base64Payload);
    parsedPayload = JSON.parse(rawJson);
  } catch {
    return { valid: false, status: 'malformed', error: 'Gagal mendecode data payload lisensi' };
  }

  // 2. Validate Schema
  const schemaCheck = validateLicensePayloadSchema(parsedPayload);
  if (!schemaCheck.valid || !schemaCheck.license) {
    return { valid: false, status: 'malformed', error: schemaCheck.error || 'Schema lisensi tidak valid' };
  }

  const license = schemaCheck.license;

  // 3. Match App ID
  if (license.appId !== ALCO_APP_ID) {
    return {
      valid: false,
      status: 'app_mismatch',
      error: `Lisensi ini ditujukan untuk aplikasi "${license.appId}", bukan "${ALCO_APP_ID}"`,
      license,
    };
  }

  // 4. Match Device ID (if expectedDeviceId provided)
  if (expectedDeviceId && license.deviceId !== expectedDeviceId) {
    return {
      valid: false,
      status: 'device_mismatch',
      error: `Device ID lisensi (${license.deviceId}) tidak cocok dengan perangkat ini (${expectedDeviceId})`,
      license,
      deviceId: license.deviceId,
    };
  }

  // 5. Check Expiration
  if (isLicenseExpired(license)) {
    return {
      valid: false,
      status: 'expired',
      error: `Masa aktif langganan lisensi telah berakhir pada ${new Date(license.expiresAt!).toLocaleDateString('id-ID')}`,
      license,
      deviceId: license.deviceId,
    };
  }

  // 6. Verify Ed25519 Digital Signature over Canonical JSON
  const canonicalData = canonicalize(license);

  // If in browser, we can send to /api/license/verify or use WebCrypto if available
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/license/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawLicenseCode: trimmed,
          expectedDeviceId,
        }),
      });

      if (response.ok) {
        const result = (await response.json()) as AlcoVerificationResult;
        return result;
      }
    } catch {
      // Fallback to local crypto if API fails or offline
    }
  }

  // Server-side / Node.js Ed25519 verification
  try {
    const nodeCrypto = await import('crypto');
    const dataBuffer = Buffer.from(canonicalData, 'utf8');
    const sigBuffer = Buffer.from(signatureHex, 'hex');

    const publicKey = nodeCrypto.createPublicKey({
      key: ALCO_AUTHORITY_PUBLIC_KEY_SPKI,
      format: 'pem',
    });

    const isVerified = nodeCrypto.verify(null, dataBuffer, publicKey, sigBuffer);

    if (!isVerified) {
      return {
        valid: false,
        status: 'invalid_signature',
        error: 'Digital signature lisensi tidak valid atau telah dimodifikasi',
        license,
      };
    }

    return {
      valid: true,
      status: 'active',
      license,
      deviceId: license.deviceId,
    };
  } catch (err: unknown) {
    return {
      valid: false,
      status: 'invalid_signature',
      error: `Gagal memverifikasi signature: ${err instanceof Error ? err.message : String(err)}`,
      license,
    };
  }
}
