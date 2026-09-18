import { AlcoRequestCodePayload } from './types';
import { calculateChecksum, verifyChecksum } from './crc16';
import { base64UrlEncode, base64UrlDecode } from './canonical';
import { isValidAlcoDeviceId } from './device-fingerprint';

export const APP_ID = 'alco-content-engine';

export interface GenerateRequestCodeParams {
  name: string;
  email: string;
  deviceId: string;
  notes?: string;
  requestId?: string;
}

/**
 * Generates an ALCO Request Code v2 compliant with ALCO LICENSE STANDARD v1.0 Section 4:
 *
 * Format: ALCO-REQ-v2.<BASE64URL_PAYLOAD>.<CHECKSUM>
 *
 * HARD CONTRACT RULES:
 * 1. Serialization: Payload Object -> JSON.stringify -> UTF-8 -> Base64URL without padding
 * 2. Checksum Contract: Checksum is calculated ONLY from the Base64URL payload string.
 *    Dilarang menghitung checksum dari prefix, prefix+payload, JSON mentah, dll.
 * 3. Final Assembly: 'ALCO-REQ-v2' + '.' + Base64URL Payload + '.' + Checksum
 */
export function generateRequestCodeV2(params: GenerateRequestCodeParams): string {
  const { name, email, deviceId, notes, requestId } = params;

  if (!name || !name.trim()) {
    throw new Error('Customer name is required to generate Request Code');
  }
  if (!email || !email.trim()) {
    throw new Error('Customer email is required to generate Request Code');
  }
  if (!isValidAlcoDeviceId(deviceId)) {
    throw new Error(`Invalid Device ID format: ${deviceId}. Expected ALCO-DEV-XXXX-XXXX-XXXX`);
  }

  const reqId = requestId || `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const payload: AlcoRequestCodePayload = {
    v: '2.0',
    app: APP_ID,
    dev: deviceId.trim(),
    email: email.trim(),
    name: name.trim(),
    req: reqId,
    ts: new Date().toISOString(),
  };

  if (notes && notes.trim()) {
    payload.notes = notes.trim();
  }

  // 4.2 Serialization: JSON.stringify -> UTF-8 -> Base64URL without padding
  const payloadJson = JSON.stringify(payload);
  const base64UrlPayload = base64UrlEncode(payloadJson);

  // 4.3 Checksum Contract: Checksum dihitung HANYA dari string Base64URL payload
  const checksum = calculateChecksum(base64UrlPayload);

  // 4.5 Final Assembly
  return `ALCO-REQ-v2.${base64UrlPayload}.${checksum}`;
}

export interface ParseRequestCodeResult {
  valid: boolean;
  error?: string;
  payload?: AlcoRequestCodePayload;
}

/**
 * Validates and decodes an ALCO Request Code compliant with ALCO LICENSE STANDARD v1.0 Section 4.
 */
export function parseAndValidateRequestCode(code: string): ParseRequestCodeResult {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Request Code cannot be empty' };
  }

  const trimmed = code.trim();
  if (trimmed.length > 4096) {
    return { valid: false, error: 'Request Code exceeds maximum length' };
  }

  const segments = trimmed.split('.');
  if (segments.length !== 3) {
    return { valid: false, error: 'Invalid Request Code segment structure. Expected 3 segments.' };
  }

  const [prefix, base64Payload, checksum] = segments;

  if (prefix !== 'ALCO-REQ-v2') {
    return { valid: false, error: `Unsupported Request Code prefix: ${prefix}. Expected ALCO-REQ-v2` };
  }

  // Verify Checksum (HANYA dari string Base64URL payload sesuai ALCO LICENSE STANDARD v1.0 Section 4.3)
  if (!verifyChecksum(base64Payload, checksum)) {
    return { valid: false, error: 'Request Code checksum mismatch (data may be corrupted)' };
  }

  // Decode payload
  let payload: AlcoRequestCodePayload;
  try {
    const jsonStr = base64UrlDecode(base64Payload);
    payload = JSON.parse(jsonStr);
  } catch {
    return { valid: false, error: 'Failed to decode Request Code payload JSON' };
  }

  // Schema validation
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Malformed Request Code payload' };
  }

  if (payload.v !== '2.0') {
    return { valid: false, error: `Invalid Request Code version: ${payload.v}. Expected 2.0` };
  }

  if (payload.app !== APP_ID) {
    return { valid: false, error: `Request Code is for a different app: ${payload.app}. Expected ${APP_ID}` };
  }

  if (!isValidAlcoDeviceId(payload.dev)) {
    return { valid: false, error: `Invalid deviceId format in Request Code: ${payload.dev}` };
  }

  if (!payload.name || typeof payload.name !== 'string') {
    return { valid: false, error: 'Missing customer name in Request Code' };
  }

  if (!payload.email || typeof payload.email !== 'string') {
    return { valid: false, error: 'Missing customer email in Request Code' };
  }

  if (!payload.req || typeof payload.req !== 'string') {
    return { valid: false, error: 'Missing request ID in Request Code' };
  }

  if (!payload.ts || typeof payload.ts !== 'string') {
    return { valid: false, error: 'Missing timestamp in Request Code' };
  }

  return {
    valid: true,
    payload,
  };
}
