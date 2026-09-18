import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { resolveGeminiApiKey, missingGeminiApiKeyMessage } from "@/lib/gemini-api-key";
import { validateProductionGenerationRequest } from "@/lib/production-context";

export const dynamic = 'force-dynamic';

function normalizeAspectRatio(rawRatio?: string): string {
  const r = (rawRatio || "1:1").trim();
  if (r === "4:5" || r === "portrait") return "3:4";
  if (r === "square") return "1:1";
  if (r === "landscape") return "16:9";
  if (r === "story" || r === "reel") return "9:16";
  const valid = ["1:1", "3:4", "4:3", "9:16", "16:9"];
  return valid.includes(r) ? r : "1:1";
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { prompt, aspectRatio = "1:1" } = body || {};

    if (body.production_context || body.project_id || body.content_item_id) {
      const validation = validateProductionGenerationRequest(body);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error || 'ProductionContext tidak valid.', isBlocked: true },
          { status: 400 }
        );
      }
    }

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt image belum tersedia." },
        { status: 400 }
      );
    }

    const targetAspectRatio = normalizeAspectRatio(aspectRatio);
    const configuredModel = process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-lite-image";
    const primaryModel = configuredModel.includes("preview-image")
      ? "gemini-3.1-flash-lite-image"
      : configuredModel;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const generateWithModel = async (modelName: string) => {
      // Try interactions.create first
      try {
        const interaction = await (ai as any).interactions.create({
          model: modelName,
          input: prompt,
          response_modalities: ['image', 'text'],
          generation_config: {
            image_config: {
              aspect_ratio: targetAspectRatio,
            },
          },
        });

        let base64 = interaction?.output_image?.data;
        if (!base64 && Array.isArray(interaction?.steps)) {
          for (const step of interaction.steps) {
            if (step.type === 'model_output') {
              const imgPart = step.content?.find((c: any) => c.type === 'image');
              if (imgPart?.data) {
                base64 = imgPart.data;
                break;
              }
            }
          }
        }
        if (base64) return { base64Data: base64, model: modelName };
      } catch (interactionErr: any) {
        console.warn(`interactions.create failed with ${modelName}, trying generateContent:`, interactionErr?.message);
      }

      // Fallback to generateContent
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: targetAspectRatio,
          },
        },
      });

      let base64 = "";
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          base64 = part.inlineData.data;
          break;
        }
      }

      return { base64Data: base64, model: modelName };
    };

    let result: { base64Data: string; model: string } | null = null;
    let lastError: any = null;

    try {
      result = await generateWithModel(primaryModel);
    } catch (err: any) {
      lastError = err;
      // If primary model was gemini-3.1-flash-image and hit quota error, try fallback to flash-lite
      if (primaryModel !== "gemini-3.1-flash-lite-image") {
        try {
          console.log("Retrying image generation with gemini-3.1-flash-lite-image fallback...");
          result = await generateWithModel("gemini-3.1-flash-lite-image");
        } catch (fallbackErr: any) {
          lastError = fallbackErr;
        }
      }
    }

    if (!result?.base64Data) {
      if (lastError) throw lastError;
      return NextResponse.json(
        { error: 'Gemini tidak mengembalikan gambar. Coba prompt yang lebih deskriptif.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageDataUrl: `data:image/jpeg;base64,${result.base64Data}`,
      model: result.model,
      aspectRatio: targetAspectRatio,
    });
  } catch (err: any) {
    console.error("Generate Image API Error:", err);
    const errMsg = String(err?.message || err?.stack || err || "");
    const errStatus = err?.status || err?.statusCode;

    const isQuotaOrRateLimit =
      errStatus === 429 ||
      errStatus === 503 ||
      errMsg.includes("429") ||
      errMsg.includes("503") ||
      /quota.*exceed/i.test(errMsg) ||
      /rate.*exceed/i.test(errMsg) ||
      /too_many_requests/i.test(errMsg) ||
      /limit: 0/i.test(errMsg) ||
      /resource.*exhaust/i.test(errMsg);

    if (isQuotaOrRateLimit) {
      let retryMsg = "Kuota gratis Gemini untuk model gambar telah mencapai batas atau sedang dibatasi rate limit.";
      const retryMatch = errMsg.match(/retry in ([0-9.]+)s/i);
      if (retryMatch) {
        const secs = Math.ceil(parseFloat(retryMatch[1]));
        retryMsg += ` Silakan coba lagi dalam ${secs} detik.`;
      } else {
        retryMsg += " Silakan coba lagi beberapa saat kemudian atau pastikan kuota API Key Anda aktif.";
      }

      return NextResponse.json(
        {
          error: retryMsg,
          isRateLimit: true,
          details: errMsg,
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Gagal generate image. Coba lagi nanti." },
      { status: 500 }
    );
  }
}
