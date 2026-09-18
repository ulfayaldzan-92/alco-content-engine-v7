import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { resolveGeminiApiKey, missingGeminiApiKeyMessage } from "@/lib/gemini-api-key";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = resolveGeminiApiKey(req);
    if (!apiKey) {
      return NextResponse.json(
        { error: missingGeminiApiKeyMessage },
        { status: 403 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const { images, prompt } = await req.json();

    const parts = images.map((img: { data: string; mimeType: string }) => ({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType,
      },
    }));

    parts.push({
      text: `Analyze these images and create a "Character DNA" JSON object that defines the visual identity of this character: 
      - Facial features, hair, build, clothing style, color palette, and visual vibe. 
      Also generate a preview image based on this DNA.
      
      Output JSON format: {
        "dna": { "description": "...", "features": [...] },
        "previewImagePrompt": "..."
      }
      
      Prompt: ${prompt}`,
    });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: { parts: parts },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    // Need to extract the image part and the text part (JSON)
    let dna = {};
    let previewImageBase64 = "";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.text) {
            // Extract JSON string from text
            const jsonMatch = part.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                dna = JSON.parse(jsonMatch[0]);
            }
        } else if (part.inlineData?.data) {
            previewImageBase64 = part.inlineData.data;
        }
    }

    return NextResponse.json({ dna, previewImageBase64 });
  } catch (error: any) {
    console.error("Generate DNA API Error:", error);

    const errString = String(error?.message || error?.status || error || "").toLowerCase();
    const isRateLimit =
      error?.status === 429 ||
      error?.statusCode === 429 ||
      errString.includes("429") ||
      errString.includes("quota") ||
      errString.includes("rate limit") ||
      errString.includes("rate_limit") ||
      errString.includes("rate exceed") ||
      errString.includes("resource_exhausted") ||
      errString.includes("resource exhausted") ||
      errString.includes("overloaded") ||
      errString.includes("high demand") ||
      errString.includes("503") ||
      errString.includes("unavailable");

    if (isRateLimit) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT",
          isRateLimit: true,
          message: "Kuota Gemini API Anda telah mencapai batas. Silakan coba kembali setelah kuota tersedia.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      {
        error: "GENERATE_DNA_FAILED",
        isRateLimit: false,
        message: "Gagal menganalisis Character DNA. Silakan periksa foto atau coba beberapa saat lagi.",
      },
      { status: 500 }
    );
  }
}
