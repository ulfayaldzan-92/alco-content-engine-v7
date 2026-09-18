import { GoogleGenAI } from "@google/genai";
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

    const { projectId, sourceItemKey, referenceImages, draft } = await req.json();

    const parts = referenceImages.map((img: string) => ({
      inlineData: {
        data: img.split(',')[1],
        mimeType: img.split(';')[0].split(':')[1],
      },
    }));

    parts.push({
      text: `Analyze these images and the following draft character details to generate a "Character DNA" and prompt templates.
      
      Draft Details: ${JSON.stringify(draft)}
      
      Output JSON format: {
        "preview_image": "base64_encoded_string",
        "dna_summary_prompt": "...",
        "locked_visual_prompt": "...",
        "scene_reuse_prompt_template": "..."
      }`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: { parts: parts },
      config: {
        imageConfig: { aspectRatio: "1:1" },
      },
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Generate Character Preview API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
