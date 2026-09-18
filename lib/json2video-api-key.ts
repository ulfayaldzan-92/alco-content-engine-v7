import { NextRequest } from "next/server";

export const missingJson2VideoApiKeyMessage =
  "JSON2Video API key belum tersedia. Masukkan JSON2Video API Key pribadi atau gunakan Copy Payload.";

/**
 * Resolves the JSON2Video API Key in order of precedence:
 * 1. Request header 'x-json2video-api-key'
 * 2. Request header 'x-api-key'
 * 3. Request header 'Authorization: Bearer <key>'
 * 4. Fallback to environment variable JSON2VIDEO_API_KEY
 */
export function resolveJson2VideoApiKey(req?: NextRequest | Request | null): string | null {
  if (req) {
    try {
      const headers = req.headers;

      // 1. Header x-json2video-api-key
      const customJson2VideoKey = headers.get("x-json2video-api-key")?.trim();
      if (customJson2VideoKey) return customJson2VideoKey;

      // 2. Header x-api-key
      const customApiKey = headers.get("x-api-key")?.trim();
      if (customApiKey) return customApiKey;

      // 3. Header Authorization: Bearer ...
      const authHeader = headers.get("authorization") || headers.get("Authorization");
      if (authHeader) {
        const match = authHeader.match(/^Bearer\s+(.+)$/i);
        if (match && match[1]?.trim()) {
          return match[1].trim();
        }
      }
    } catch (e) {
      console.warn("Failed to extract JSON2Video API key from request headers:", e);
    }
  }

  // 4. Fallback to process.env.JSON2VIDEO_API_KEY
  const envKey = (process.env.JSON2VIDEO_API_KEY || "").trim();
  if (envKey) return envKey;

  return null;
}
