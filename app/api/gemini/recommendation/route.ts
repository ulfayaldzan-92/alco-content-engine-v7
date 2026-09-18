import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { resolveGeminiApiKey, missingGeminiApiKeyMessage } from "@/lib/gemini-api-key";
import { validateProductionGenerationRequest } from "@/lib/production-context";

export const dynamic = 'force-dynamic';

interface CacheEntry {
  text: string;
  expiresAt: number;
}

// In-memory success cache (10 min TTL) and in-flight request deduplication
const successCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<{ text: string }>>();

function getPromptHash(prompt: string): string {
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        { error: missingGeminiApiKeyMessage },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));

    // Fundamental 3: Generator Authority Mandate
    // Every generation request MUST provide an authoritative ProductionContext.
    // Generic, ungrounded prompts without valid ProductionContext and matching identities are strictly rejected.
    const validation = validateProductionGenerationRequest(body);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: validation.error || 'ProductionContext tidak valid atau belum disetel. Generator memerlukan konteks produksi terotorisasi.',
          isBlocked: true,
        },
        { status: 400 }
      );
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt wajib diisi untuk menghasilkan konten.' },
        { status: 400 }
      );
    }
    const hash = getPromptHash(prompt);

    // 1. Check successful response cache (10 mins TTL)
    const cached = successCache.get(hash);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({ text: cached.text, cached: true });
    } else if (cached) {
      successCache.delete(hash);
    }

    // 2. Request deduplication: reuse running request if identical prompt is in-flight
    let requestPromise = inFlightRequests.get(hash);

    if (!requestPromise) {
      requestPromise = (async () => {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        // Exactly 1 Gemini request per action (no auto retry loop on 429)
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        return { text: response?.text || "" };
      })();

      inFlightRequests.set(hash, requestPromise);
    }

    let result;
    try {
      result = await requestPromise;
      // Cache successful response for 10 minutes
      if (result?.text) {
        successCache.set(hash, {
          text: result.text,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
      }
    } finally {
      inFlightRequests.delete(hash);
    }

    return NextResponse.json({ text: result.text });
  } catch (error: any) {
    console.error("Recommendation API error:", error);

    const errMsg = String(error?.message || error || "");
    const errStatus = error?.status || error?.statusCode || 500;

    const isRateLimit = errStatus === 429 || errStatus === 503 ||
                         /429/i.test(errMsg) || /503/i.test(errMsg) ||
                         /rate.*exceed/i.test(errMsg) ||
                         /quota/i.test(errMsg) ||
                         /resource.*exhaust/i.test(errMsg) ||
                         /high.*demand/i.test(errMsg) ||
                         /overloaded/i.test(errMsg) ||
                         /unavailable/i.test(errMsg) ||
                         /limit.*exceed/i.test(errMsg);

    if (isRateLimit) {
      return NextResponse.json(
        { 
          error: "Permintaan AI sedang dibatasi (Rate Limit / High Demand). Coba lagi beberapa saat.",
          isRateLimit: true,
          retryAfterSeconds: 30,
          details: errMsg
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}
