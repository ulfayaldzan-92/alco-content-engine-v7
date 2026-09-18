import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { AlcoLicensePayload, AlcoVerificationResult } from '@/lib/license/types';
import { canonicalize, base64UrlDecode } from '@/lib/license/canonical';
import { ALCO_APP_ID, ALCO_AUTHORITY_PUBLIC_KEY_SPKI } from '@/lib/license/authority-key';
import { validateLicensePayloadSchema, isLicenseExpired } from '@/lib/license/verification';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawLicenseCode, expectedDeviceId } = body;

    if (!rawLicenseCode || typeof rawLicenseCode !== 'string') {
      return NextResponse.json(
        { valid: false, status: 'unlicensed', error: 'Kode lisensi kosong' } satisfies AlcoVerificationResult,
        { status: 400 }
      );
    }

    const trimmed = rawLicenseCode.trim();
    const segments = trimmed.split('.');

    if (segments.length !== 3) {
      return NextResponse.json(
        { valid: false, status: 'malformed', error: 'Format kode lisensi tidak valid (harus 3 segmen ALCO-LIC-v1.*)' } satisfies AlcoVerificationResult,
        { status: 400 }
      );
    }

    const [prefix, base64Payload, signatureHex] = segments;

    if (prefix !== 'ALCO-LIC-v1') {
      return NextResponse.json(
        { valid: false, status: 'malformed', error: `Prefix lisensi tidak dikenali: ${prefix}. Diharapkan ALCO-LIC-v1` } satisfies AlcoVerificationResult,
        { status: 400 }
      );
    }

    // ALCO LICENSE STANDARD v1.0 Section 6: Signature wire representation MUST be exactly 128 hex chars
    if (!signatureHex || !/^[0-9a-fA-F]{128}$/.test(signatureHex)) {
      return NextResponse.json(
        {
          valid: false,
          status: 'malformed',
          error: 'Format signature lisensi tidak valid: wajib tepat 128 karakter hexadecimal sesuai ALCO LICENSE STANDARD v1.0 Section 6',
        } satisfies AlcoVerificationResult,
        { status: 400 }
      );
    }

    // 1. Decode payload
    let rawJson: string;
    let parsedPayload: unknown;
    try {
      rawJson = base64UrlDecode(base64Payload);
      parsedPayload = JSON.parse(rawJson);
    } catch {
      return NextResponse.json(
        { valid: false, status: 'malformed', error: 'Gagal mendecode data payload lisensi JSON' } satisfies AlcoVerificationResult,
        { status: 400 }
      );
    }

    // 2. Validate Schema
    const schemaCheck = validateLicensePayloadSchema(parsedPayload);
    if (!schemaCheck.valid || !schemaCheck.license) {
      return NextResponse.json(
        { valid: false, status: 'malformed', error: schemaCheck.error || 'Schema payload lisensi tidak valid' } satisfies AlcoVerificationResult,
        { status: 400 }
      );
    }

    const license = schemaCheck.license;

    // 3. Match App ID
    if (license.appId !== ALCO_APP_ID) {
      return NextResponse.json(
        {
          valid: false,
          status: 'app_mismatch',
          error: `Lisensi ini diterbitkan untuk aplikasi "${license.appId}", bukan "${ALCO_APP_ID}"`,
          license,
        } satisfies AlcoVerificationResult,
        { status: 200 }
      );
    }

    // 4. Match Device ID
    if (expectedDeviceId && license.deviceId !== expectedDeviceId) {
      return NextResponse.json(
        {
          valid: false,
          status: 'device_mismatch',
          error: `Device ID lisensi (${license.deviceId}) tidak cocok dengan perangkat ini (${expectedDeviceId})`,
          license,
          deviceId: license.deviceId,
        } satisfies AlcoVerificationResult,
        { status: 200 }
      );
    }

    // 5. Check Expiration
    if (isLicenseExpired(license)) {
      return NextResponse.json(
        {
          valid: false,
          status: 'expired',
          error: `Masa aktif langganan lisensi telah berakhir pada ${new Date(license.expiresAt!).toLocaleDateString('id-ID')}`,
          license,
          deviceId: license.deviceId,
        } satisfies AlcoVerificationResult,
        { status: 200 }
      );
    }

    // 6. Canonicalize payload
    const canonicalData = canonicalize(license);

    // 7. Verify Ed25519 Digital Signature with Node.js crypto
    const dataBuffer = Buffer.from(canonicalData, 'utf8');
    const sigBuffer = Buffer.from(signatureHex, 'hex');

    const publicKey = crypto.createPublicKey({
      key: ALCO_AUTHORITY_PUBLIC_KEY_SPKI,
      format: 'pem',
    });

    const isVerified = crypto.verify(null, dataBuffer, publicKey, sigBuffer);

    if (!isVerified) {
      return NextResponse.json(
        {
          valid: false,
          status: 'invalid_signature',
          error: 'Digital signature lisensi tidak valid. Lisensi ditolak.',
          license,
        } satisfies AlcoVerificationResult,
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        status: 'active',
        license,
        deviceId: license.deviceId,
      } satisfies AlcoVerificationResult,
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error('License verification route error:', err);
    return NextResponse.json(
      {
        valid: false,
        status: 'invalid_signature',
        error: `Terjadi kesalahan saat memverifikasi lisensi: ${err instanceof Error ? err.message : String(err)}`,
      } satisfies AlcoVerificationResult,
      { status: 500 }
    );
  }
}
