import { NextRequest } from "next/server";

export const missingGeminiApiKeyMessage =
  "Gemini API key belum tersedia. Masukkan Gemini API Key pribadi di aplikasi, atau atur GEMINI_API_KEY di Environment Variables.";

/**
 * Resolves the Gemini API Key in order of precedence:
 * 1. Request header 'x-gemini-api-key'
 * 2. Request header 'x-api-key'
 * 3. Request header 'Authorization: Bearer <key>'
 * 4. Fallback to environment variable GEMINI_API_KEY or API_KEY
 */
export function resolveGeminiApiKey(req?: NextRequest | Request | null): string | null {
  if (req) {
    try {
      const headers = req.headers;

      // 1. Header x-gemini-api-key
      const customGeminiKey = headers.get("x-gemini-api-key")?.trim();
      if (customGeminiKey) return customGeminiKey;

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
      console.warn("Failed to extract API key from request headers:", e);
    }
  }

  // 4. Fallback to process.env.GEMINI_API_KEY or process.env.API_KEY
  const envKey = (process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
  if (envKey) return envKey;

  return null;
}
