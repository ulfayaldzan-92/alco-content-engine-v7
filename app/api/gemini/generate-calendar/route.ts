import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import {
  GenerateCalendarRequest,
  horizonToCount,
  inferPlanningHorizon,
  buildSharedContentContext,
  validateBlueprint,
  SharedContentContext
} from "@/lib/content-contract";
import { buildFunnelPromptBlock, sanitizeCtaForFunnel } from "@/lib/funnel-rules";
import {
  FunnelStrategy,
  buildFunnelStrategyFromContext,
  buildFunnelStrategyPromptBlock,
  validateItemAgainstFunnelStrategy,
  validateCalendarAgainstFunnelStrategy,
  normalizeCalendarToFunnelDistribution,
  resolveFunnelPlanningInput,
} from "@/lib/funnel-strategy";
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
        },
      },
    });

    const bodyData = await req.json() as GenerateCalendarRequest & {
      hasUserCtaOverride?: boolean;
      hasUserHookOverride?: boolean;
      hasUserFormulaOverride?: boolean;
      totalPosts?: number;
    };
    const {
      coreTopic = "Brand Strategy Launch Campaign",
      startDate = new Date().toISOString().split('T')[0],
      skipDays = [],
      gender = "Both",
      ageRange = [18, 45],
      ratio,
      hasUserFunnelOverride = false,
      hasUserCtaOverride = false,
      hasUserHookOverride = false,
      hasUserFormulaOverride = false,
      userOverrides,
      formats = ["Single", "Carousel", "Reels"],
      carouselSlides = 5,
      reelsDuration = "30s",
      selectedVoices = ["Empathetic & Authoritative"],
      selectedFormula,
      selectedCTAs,
      hookMix = [],
      referenceType = "ALCO Engine Logic",
      planningHorizon,
      channels = ["instagram", "facebook"],
      strategyBlueprint,
      sharedContentContext: providedContext,
    } = bodyData;

    // Build or refine Shared Content Context - Strictly require valid Blueprint or Context
    let context: SharedContentContext;
    if (providedContext && providedContext.brand_context?.brand_name) {
      context = providedContext;
    } else if (strategyBlueprint && (strategyBlueprint.brand_identity?.brand_name || strategyBlueprint.messaging?.core_message)) {
      context = buildSharedContentContext(strategyBlueprint, 'creative_system_json');
    } else {
      return NextResponse.json(
        {
          error: "Project context tidak valid atau belum diimpor. Silakan impor Strategy Blueprint terlebih dahulu sebelum membuat kalender konten.",
          isBlocked: true,
        },
        { status: 400 }
      );
    }

    // Gate against incomplete strategy contexts
    const missingFields = context.system_flags?.missing_required_fields || [];
    if (context.system_flags?.is_complete_for_planning === false || missingFields.length > 0) {
      return NextResponse.json(
        {
          error: `Strategi project belum lengkap (${missingFields.join(', ')}). Lengkapi atau impor ulang data strategi sebelum membuat kalender konten.`,
          isBlocked: true,
          missingFields,
        },
        { status: 400 }
      );
    }

    const resolvedProjectId = bodyData.projectId || context.project_id || (strategyBlueprint as any)?.project_id;
    if (bodyData.projectId && context.project_id && bodyData.projectId !== context.project_id) {
      return NextResponse.json(
        {
          error: `Mismatch Project Context: Request project (${bodyData.projectId}) berbeda dengan context (${context.project_id}).`,
          isBlocked: true,
        },
        { status: 400 }
      );
    }

    // Single source of authority for total posts and funnel strategy via production helper
    const planningInput = resolveFunnelPlanningInput({
      hasUserFunnelOverride,
      userOverrides,
      ratio,
      totalPosts: bodyData.totalPosts,
    });

    // Establish authoritative FunnelStrategy for the active project strictly on the server
    const activeFunnelStrategy = buildFunnelStrategyFromContext(context, {
      totalPosts: planningInput.totalPosts,
      campaignGoal: coreTopic,
      userOverrides: planningInput.explicitOverrides,
    });

    // Synchronize totalPosts with the authoritative FunnelStrategy
    const totalPosts = activeFunnelStrategy.distribution.total_posts;

    // Distinguish explicit user overrides from derived context recommendations
    const resolvedFormula = (hasUserFormulaOverride && selectedFormula)
      ? selectedFormula
      : (context.strategy_context?.positioning
          ? `Framework: ${context.strategy_context.positioning.slice(0, 50)}`
          : (context.strategy_context?.core_message
              ? `Core Message: ${context.strategy_context.core_message.slice(0, 50)}`
              : ''));

    const visualCtx = context.brand_visual_context;
    const visualContextBlock = visualCtx ? `
### BRAND VISUAL STYLE & GUIDELINES (GLOBAL VISUAL RULES):
- Brand Visual Style: ${visualCtx.visual_style || '-'}
- Color Palette: ${Array.isArray(visualCtx.color_palette) ? visualCtx.color_palette.join(', ') : (visualCtx.color_palette || '-')}
- Typography Style: ${visualCtx.typography_style || '-'}
- Image Style Rules: ${Array.isArray(visualCtx.image_style_rules) ? visualCtx.image_style_rules.join('; ') : (visualCtx.image_style_rules || '-')}
- Design Mood: ${visualCtx.design_mood || '-'}
` : '';

    const hookMixText = (hasUserHookOverride && Array.isArray(hookMix) && hookMix.length > 0)
      ? hookMix.map((h: any) => `${h.type || h} (${h.percentage || 0}%)`).join(', ')
      : `TOFU: ${activeFunnelStrategy.tofu.hook_direction} | MOFU: ${activeFunnelStrategy.mofu.hook_direction} | BOFU: ${activeFunnelStrategy.bofu.hook_direction}`;

    const ctaConstraintLine = (hasUserCtaOverride && Array.isArray(selectedCTAs) && selectedCTAs.length > 0)
      ? `\n- Primary CTAs Allowed (Explicit User Preference): ${selectedCTAs.join(', ')}`
      : '';

    const formulaConstraintLine = resolvedFormula ? `\n- Primary Formula / Angle: ${resolvedFormula}` : '';

    const prompt = `Act as an Elite Brand Content Director for ALCO Content Engine.

Your task is to synthesize a high-converting, strategy-first Content Calendar Matrix based on the provided Shared Content Context, Authoritative Funnel Strategy, and parameters.

### STRATEGY BLUEPRINT & SHARED CONTENT CONTEXT:
- Brand Name: ${context.brand_context.brand_name}
- Category: ${context.brand_context.category}
- Brand Voice & Tone: ${context.brand_context.brand_voice}
- Core Positioning / USP: ${context.strategy_context.positioning} | USP: ${context.strategy_context.usp.join('; ')}
- Target Audience: ${context.audience_context.primary_audience}
- Audience Pain Points: ${context.audience_context.pain_points.join('; ')}
- Audience Desires: ${context.audience_context.desires.join('; ')}
- Audience Objections: ${context.audience_context.objections.join('; ')}
- Core Message: ${context.strategy_context.core_message}
- Main Offer & Benefits: ${context.strategy_context.main_offer} (${context.strategy_context.offer_benefits.join('; ')})
- Content Pillars: ${context.strategy_context.content_pillars.join('; ')}
- Copy Direction: ${context.strategy_context.copy_direction.join('; ')}${visualContextBlock}

### AUTHORITATIVE FUNNEL STRATEGY (ACTIVE PROJECT BACKBONE):
${buildFunnelStrategyPromptBlock(activeFunnelStrategy)}

### CAMPAIGN EXECUTION PARAMETERS:
- Core Topic / Focus: ${coreTopic}
- Start Date: ${startDate}
- Skip Days of Week: ${skipDays.join(', ') || 'None'}
- Target Channels: ${channels.join(', ')}
- Target Funnel Allocation: ${activeFunnelStrategy.distribution.tofu} TOFU, ${activeFunnelStrategy.distribution.mofu} MOFU, ${activeFunnelStrategy.distribution.bofu} BOFU (Total: ${totalPosts} posts)
- Allowed Formats: ${formats.join(', ')} (Carousel slides: ${carouselSlides}, Reels duration: ${reelsDuration})${formulaConstraintLine}${ctaConstraintLine}
- Hook Strategy: ${hookMixText}
- Reference Logic: ${referenceType}

### MANDATORY GUIDELINES:
1. Generate EXACTLY ${totalPosts} post items in sequential order (1 to ${totalPosts}).
2. Calculate dates strictly starting from "${startDate}", skipping excluded days (${skipDays.join(', ') || 'none'}). Format: "YYYY-MM-DD".
3. Maintain the authoritative funnel allocation: exactly ${activeFunnelStrategy.distribution.tofu} TOFU, ${activeFunnelStrategy.distribution.mofu} MOFU, and ${activeFunnelStrategy.distribution.bofu} BOFU items.
   - TOFU (Awareness): Focus on audience pain points, myths, relational hooks, and broad problem recognition. Soft or zero sales pressure. CTA MUST be soft (e.g., 'Simpan ide ini', 'Cek contoh lanjutannya'). Absolutely NO sales or conversion CTAs ('klik link bio', 'daftar sekarang', 'mumpung gratis', 'beli sekarang').
   - MOFU (Consideration): Focus on positioning, core message, USP, framework/how-to, handling objections, and building trust. CTA MUST be soft action (e.g., 'Cek framework ini', 'Simpan checklist ini', 'Audit alur kontenmu'). Absolutely NO sales/hard closing ('klik link bio', 'daftar sekarang', 'mumpung gratis', 'beli sekarang').
   - BOFU (Conversion): Focus directly on main offer, product benefits, social proof, urgency, and direct CTA ('Lihat demo', 'Daftar sekarang', 'Ambil penawaran', 'Konsultasi sekarang').
4. Every single item MUST have a clear strategic daily objective ("tujuan") specifying what business/funnel goal this post accomplishes today.
5. Every single item MUST have a strategic rationale ("keterangan") explaining why this specific content belongs in its designated funnel stage.
6. Headlines, Body, Visual Prompt, and Captions MUST be written in natural, persuasive Bahasa Indonesia matching the Brand Voice.
7. Avoid generic filler captions, repetitive headlines, or random CTAs that don't match the funnel stage.
8. Visual prompt ("visual") should be an actionable instruction for graphic design or video creation (e.g., slide breakdown for Carousel, scene script for Reels).
9. For each item, recommend the best asset types for production (choose from: "image", "carousel", "video"). You may recommend 1-3 types in \`recommendedAssetTypes\`, but you MUST select exactly one \`primaryAssetType\`, and provide strategic reasoning in \`assetTypeReason\`.

Return ONLY the JSON matching the specified schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the ALCO Content Engine AI. You convert business strategy blueprints into detailed, funnel-aware content calendars. Output structured JSON strictly adhering to the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.INTEGER },
                  tanggal: { type: Type.STRING },
                  jenis: { type: Type.STRING, description: "Funnel Stage e.g. TOFU (Awareness), MOFU (Consideration), or BOFU (Conversion)" },
                  tujuan: { type: Type.STRING, description: "Daily strategic funnel objective" },
                  hookType: { type: Type.STRING, description: "e.g. Call-Out, Curiosity Gap, Negativity Bias, Social Proof" },
                  headline: { type: Type.STRING, description: "Catchy headline / hook text" },
                  body: { type: Type.STRING, description: "Detailed script, slide breakdown, or main body copy" },
                  caption: { type: Type.STRING, description: "Ready-to-publish caption with hashtags & line breaks" },
                  format: { type: Type.STRING, description: "Single, Carousel, or Reels" },
                  recommendedAssetTypes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "e.g. ['image', 'carousel', 'video']" },
                  primaryAssetType: { type: Type.STRING, description: "The single best asset type (image, carousel, or video)" },
                  assetTypeReason: { type: Type.STRING, description: "Strategic reasoning for the primary asset type" },
                  referensi: { type: Type.STRING, description: "Formula or reference strategy used" },
                  visual: { type: Type.STRING, description: "Visual prompt / video scene design direction" },
                  keterangan: { type: Type.STRING, description: "Strategic explanation for why this item fits its funnel stage" },
                  channel: { type: Type.STRING, description: "Instagram, Facebook, or Instagram & Facebook" },
                  cta: { type: Type.STRING, description: "Call to Action text" },
                  carousel_plan: {
                    type: Type.OBJECT,
                    description: "Structured plan for carousel items",
                    properties: {
                      content_goal: { type: Type.STRING },
                      funnel_stage: { type: Type.STRING },
                      current_belief: { type: Type.STRING },
                      desired_belief: { type: Type.STRING },
                      core_promise: { type: Type.STRING },
                      primary_cta_type: { type: Type.STRING, description: "save, share, comment, follow, or click" },
                      primary_cta_text: { type: Type.STRING },
                      slide_count: { type: Type.INTEGER },
                      slide_count_reason: { type: Type.STRING },
                      belief_journey_summary: { type: Type.STRING },
                      visual_system_notes: { type: Type.STRING },
                      slides: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            slide: { type: Type.INTEGER },
                            role: { type: Type.STRING, description: "hook, recognition, reframe, mechanism, insight, framework, proof, cta, or custom" },
                            communication_job: { type: Type.STRING },
                            headline: { type: Type.STRING },
                            body: { type: Type.STRING },
                            swipe_bridge: { type: Type.STRING },
                            emotional_state: { type: Type.STRING },
                            visual_intent: { type: Type.STRING },
                            visual_type: { type: Type.STRING, description: "scene, diagram, comparison, checklist, quote, stat, ui-mock, or custom" },
                            text_zone: { type: Type.STRING },
                            negative_space_plan: { type: Type.STRING },
                          },
                          required: ["slide", "role", "communication_job", "headline", "body", "visual_intent"]
                        }
                      }
                    },
                    required: ["content_goal", "funnel_stage", "current_belief", "desired_belief", "core_promise", "primary_cta_type", "primary_cta_text", "slide_count", "slide_count_reason", "belief_journey_summary", "visual_system_notes", "slides"]
                  }
                },
                required: ["no", "tanggal", "jenis", "tujuan", "headline", "body", "caption", "format", "visual", "keterangan", "recommendedAssetTypes", "primaryAssetType", "assetTypeReason"]
              }
            }
          },
          required: ["items"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{"items":[]}');
    if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return NextResponse.json(
        {
          error: "AI tidak menghasilkan item kalender yang valid. Silakan coba kembali.",
        },
        { status: 500 }
      );
    }

    // Gate: Validate generated items strictly against authoritative FunnelStrategy
    const validation = validateCalendarAgainstFunnelStrategy(
      parsed.items,
      activeFunnelStrategy
    );

    if (!validation.isValid) {
      return NextResponse.json(
        {
          isBlocked: true,
          error: "Generated calendar does not match authoritative FunnelStrategy.",
          validationErrors: validation.errors,
          generatedDistribution: validation.distribution,
          expectedDistribution: activeFunnelStrategy.distribution,
        },
        { status: 422 }
      );
    }

    const sanitizedItems = normalizeCalendarToFunnelDistribution(
      parsed.items,
      activeFunnelStrategy,
      resolvedProjectId
    );

    return NextResponse.json({
      items: sanitizedItems,
      funnelStrategy: activeFunnelStrategy,
      contextSummary: {
        brandName: context.brand_context.brand_name,
        primaryAudience: context.audience_context.primary_audience,
        mainOffer: context.strategy_context.main_offer,
        isComplete: context.system_flags.is_complete_for_planning,
      }
    });
  } catch (error: any) {
    console.error("Generate Calendar API Error:", error);

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
          details: errMsg
        },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to generate content calendar" },
      { status: 500 }
    );
  }
}
