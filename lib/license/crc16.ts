/**
 * ALCO Request Code Checksum Implementation
 * HARD CONTRACT (ALCO LICENSE STANDARD v1.0 Section 4.3 & 4.4)
 *
 * Source of Truth: ALCO License Generator request-code.ts calculateChecksum()
 * - Reflected CRC style
 * - Polynomial 0xA001
 * - Input: ONLY the Base64URL payload string
 * - Output: 4-character uppercase hexadecimal string
 */
export function calculateChecksum(payloadBase64Url: string): string {
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

/**
 * Backward compatibility alias for calculateChecksum
 */
export function calculateCRC16(payloadBase64Url: string): string {
  return calculateChecksum(payloadBase64Url);
}

export function verifyChecksum(payloadBase64Url: string, expectedHex: string): boolean {
  if (!expectedHex || expectedHex.length !== 4) return false;
  const calculated = calculateChecksum(payloadBase64Url);
  return calculated.toUpperCase() === expectedHex.toUpperCase();
}

export function verifyCRC16(payloadBase64Url: string, expectedHex: string): boolean {
  return verifyChecksum(payloadBase64Url, expectedHex);
}
