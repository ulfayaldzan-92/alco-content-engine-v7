import { FunnelStage, FUNNEL_CONTENT_RULES, normalizeFunnelStage, parseStrictFunnelStage, sanitizeCtaForFunnel } from './funnel-rules';
import { SharedContentContext } from './content-contract';

export { normalizeFunnelStage, parseStrictFunnelStage, sanitizeCtaForFunnel };
export type FunnelStageType = FunnelStage;

export interface FunnelStageStrategy {
  stage: FunnelStageType;
  audience_state: string;
  objective: string;
  message_direction: string;
  content_direction: string;
  hook_direction: string;
  cta_direction: string;
  allowed_cta_types: string[];
  forbidden_elements: string[];
}

export interface FunnelDistributionStrategy {
  tofu: number;
  mofu: number;
  bofu: number;
  total_posts: number;
  reasoning: string;
  source: 'derived_from_strategy' | 'ai_recommendation' | 'user_override';
  requires_user_decision?: boolean;
}

export interface FunnelStrategyProvenance {
  source_project_id: string;
  source_blueprint_type?: string;
  generated_at: string;
  is_customized: boolean;
  notes?: string;
}

export interface FunnelStrategy {
  project_id: string;
  campaign_goal: string;
  tofu: FunnelStageStrategy;
  mofu: FunnelStageStrategy;
  bofu: FunnelStageStrategy;
  distribution: FunnelDistributionStrategy;
  provenance: FunnelStrategyProvenance;
}

export interface CalendarPlanningContext {
  project_id: string;
  shared_context: SharedContentContext;
  funnel_strategy: FunnelStrategy;
}

/**
 * Builds an authoritative, project-isolated FunnelStrategy strictly grounded
 * in the active project's SharedContentContext.
 * Zero hard-coded universal ratios or fictional business facts.
 */
export function buildFunnelStrategyFromContext(
  context: SharedContentContext,
  options?: {
    totalPosts?: number;
    campaignGoal?: string;
    userOverrides?: { tofu?: number; mofu?: number; bofu?: number };
  }
): FunnelStrategy {
  const projectId = context.project_id || 'unknown_project';
  const brandName = context.brand_context?.brand_name || 'Brand';
  const category = context.brand_context?.category || 'Bisnis & Layanan';
  const primaryAudience = context.audience_context?.primary_audience || 'Target Audiens';
  const painPoints = context.audience_context?.pain_points || [];
  const desires = context.audience_context?.desires || [];
  const objections = context.audience_context?.objections || [];

  const positioning = context.strategy_context?.positioning || '';
  const usp = context.strategy_context?.usp || [];
  const mainOffer = context.strategy_context?.main_offer || '';
  const offerBenefits = context.strategy_context?.offer_benefits || [];
  const coreMessage = context.strategy_context?.core_message || '';
  const contentPillars = context.strategy_context?.content_pillars || [];

  const firstPain = painPoints[0] || `kebutuhan seputar ${category}`;
  const firstUsp = usp[0] || positioning || `solusi terpercaya dari ${brandName}`;
  const firstBenefit = offerBenefits[0] || mainOffer || 'nilai nyata yang terukur';

  const campaignGoal =
    options?.campaignGoal ||
    (coreMessage ? `Membangun otoritas dan konversi seputar: ${coreMessage}` : `Pertumbuhan dan konversi untuk ${brandName}`);

  // 1. TOFU Strategy: Strictly awareness & relatable problem recognition
  const tofu: FunnelStageStrategy = {
    stage: 'TOFU',
    audience_state: painPoints.length > 0
      ? `Audiens (${primaryAudience}) sering menghadapi ${firstPain} namun belum menyadari pendekatan solusi terstruktur.`
      : `Audiens (${primaryAudience}) sedang mencari wawasan awal seputar ${category}.`,
    objective: `Membangun awareness awal dan problem recognition seputar ${category} tanpa unsur penjualan langsung.`,
    message_direction: coreMessage
      ? `Fokus pada kenyataan sehari-hari ${primaryAudience} yang relevan dengan pesan inti: "${coreMessage}".`
      : `Refleksi atas tantangan nyata yang dihadapi ${primaryAudience} dalam konteks ${category}.`,
    content_direction: `Edukasi ringan, validasi masalah, relatable moment, dan pembongkaran kesalahpahaman umum tanpa tekanan jualan.`,
    hook_direction: `Relational call-out pada situasi ${firstPain}, pertanyaan reflektif, atau rasa ingin tahu wajar tanpa sensasionalisme.`,
    cta_direction: `Soft CTA: simpan untuk dibaca lagi, renungkan, atau cek perspektif lanjutan di caption.`,
    allowed_cta_types: ['save', 'swipe', 'read_caption', 'reflect', 'share'],
    forbidden_elements: [
      'hard selling',
      'link bio agresif',
      'daftar sekarang',
      'ambil diskon',
      'beli sekarang',
      'urgency palsu',
      'testimoni klaim berlebihan'
    ],
  };

  // 2. MOFU Strategy: Framework, evaluation, education, and objection handling
  const mofu: FunnelStageStrategy = {
    stage: 'MOFU',
    audience_state: objections.length > 0
      ? `Audiens (${primaryAudience}) sudah sadar masalah namun ragu karena ${objections[0]} dan sedang mengevaluasi alternatif solusi.`
      : `Audiens (${primaryAudience}) sudah sadar masalah dan membutuhkan framework teruji untuk menyelesaikannya.`,
    objective: `Membantu audiens mengevaluasi solusi melalui framework terstruktur, mengedukasi keunggulan pendekatan (${firstUsp}), dan menjawab keraguan.`,
    message_direction: positioning
      ? `Menunjukkan framework kerja nyata berbasis positioning: "${positioning}", membuktikan mengapa pendekatan konvensional kurang efektif.`
      : `Menjelaskan metodologi terstruktur dalam menyelesaikan ${firstPain} menggunakan pendekatan profesional.`,
    content_direction: `Framework edukatif, checklist evaluasi, perbandingan opsi (comparison), studi alur, dan pembahasan keberatan (objection handling).`,
    hook_direction: `Pengenalan framework, perbandingan cara lama vs baru, atau identifikasi faktor penentu keberhasilan.`,
    cta_direction: `Soft action CTA: simpan checklist, pelajari framework lengkap, evaluasi alur saat ini, atau bookmark panduan.`,
    allowed_cta_types: ['save_framework', 'study_guide', 'compare_methods', 'audit_workflow'],
    forbidden_elements: [
      'hard closing',
      'diskon besar',
      'scarcity artifisial',
      'klaim hasil instan tanpa penjelasan alur'
    ],
  };

  // 3. BOFU Strategy: Proof, demo, offer clarity, and conversion
  const bofu: FunnelStageStrategy = {
    stage: 'BOFU',
    audience_state: mainOffer
      ? `Audiens (${primaryAudience}) telah memahami pendekatan solusi dan siap mengambil keputusan dengan kejelasan penawaran ${mainOffer}.`
      : `Audiens (${primaryAudience}) membutuhkan validasi akhir dan langkah nyata untuk mulai bertindak.`,
    objective: `Mendorong keputusan aksi melalui demonstrasi hasil nyata, transparansi manfaat (${firstBenefit}), dan kejelasan langkah aksi.`,
    message_direction: mainOffer
      ? `Menegaskan kepastian nilai melalui ${mainOffer}, menjawab keraguan implementasi, dan memfasilitasi onboarding yang mudah.`
      : `Menunjukkan bukti penerapan nyata dan mengarahkan audiens ke tindakan nyata selanjutnya.`,
    content_direction: `Demonstrasi solusi, studi kasus nyata, rincian penawaran (offer breakdown), FAQ keputusan, dan closing penawaran yang transparan.`,
    hook_direction: `Kejelasan hasil terukur, validasi bukti penerapan, atau ajakan mengambil keputusan tepat saat ini.`,
    cta_direction: `Direct conversion CTA: hubungi tim, amankan penawaran ${mainOffer}, konsultasi, atau mulai sekarang.`,
    allowed_cta_types: ['direct_conversion', 'book_demo', 'claim_offer', 'consultation', 'start_now'],
    forbidden_elements: [
      'konten terlalu abstrak tanpa penawaran',
      'edukasi berputar-putar tanpa ajakan tindakan jelas',
      'CTA ambigu'
    ],
  };

  // 4. Dynamic Distribution Calculation based on Strategic Context
  const totalPosts = Math.max(3, options?.totalPosts || 14);

  let distribution: FunnelDistributionStrategy;

  if (options?.userOverrides && (options.userOverrides.tofu !== undefined || options.userOverrides.mofu !== undefined || options.userOverrides.bofu !== undefined)) {
    const tofu = validateOverrideStageCount(options.userOverrides.tofu, 'TOFU');
    const mofu = validateOverrideStageCount(options.userOverrides.mofu, 'MOFU');
    const bofu = validateOverrideStageCount(options.userOverrides.bofu, 'BOFU');
    const explicitTotal = tofu + mofu + bofu;
    if (explicitTotal <= 0) {
      throw new Error('Manual funnel override must contain at least one content item.');
    }
    distribution = {
      tofu,
      mofu,
      bofu,
      total_posts: explicitTotal,
      reasoning: `Distribusi disesuaikan secara sadar oleh pengguna (User Override).`,
      source: 'user_override',
    };
  } else {
    // Determine strategic ratio dynamically from context facts:
    const isConversionDriven = Boolean(
      mainOffer && (
        /launch|promo|batch|penawaran|diskon|early|terbatas|daftar/i.test(campaignGoal) ||
        /launch|penawaran|paket|program/i.test(mainOffer)
      )
    );

    const isEducationOrNurtureDriven = Boolean(
      objections.length > 1 ||
      (contentPillars.length > 2 && /edukasi|framework|tutorial|panduan/i.test(contentPillars.join(' ')))
    );

    let tofuRatio = 0.45;
    let mofuRatio = 0.35;
    let bofuRatio = 0.20;
    let reasoning = '';

    if (isConversionDriven) {
      tofuRatio = 0.25;
      mofuRatio = 0.45;
      bofuRatio = 0.30;
      reasoning = `Kampanye berorientasi konversi/penawaran aktif (${mainOffer}). Porsi MOFU (45%) dan BOFU (30%) diperbesar untuk mematangkan pertimbangan dan memfasilitasi konversi langsung audiens ${primaryAudience}.`;
    } else if (isEducationOrNurtureDriven) {
      tofuRatio = 0.35;
      mofuRatio = 0.50;
      bofuRatio = 0.15;
      reasoning = `Audiens ${primaryAudience} memiliki pertimbangan penting seputar ${objections.slice(0, 2).join('; ') || 'metode'}. Porsi MOFU dominan (50%) untuk mengokohkan framework dan kredibilitas sebelum penawaran.`;
    } else {
      tofuRatio = 0.50;
      mofuRatio = 0.35;
      bofuRatio = 0.15;
      reasoning = `Kampanye difokuskan pada awareness alami dan pengenalan problem bagi audiens ${primaryAudience}. Porsi TOFU dominan (50%) untuk membangun resonansi awal tanpa tekanan jualan.`;
    }

    let calculatedTofu = Math.round(totalPosts * tofuRatio);
    let calculatedBofu = Math.max(1, Math.round(totalPosts * bofuRatio));
    let calculatedMofu = totalPosts - calculatedTofu - calculatedBofu;

    if (calculatedMofu < 1) {
      calculatedMofu = 1;
      calculatedTofu = Math.max(1, totalPosts - calculatedMofu - calculatedBofu);
    }

    distribution = {
      tofu: calculatedTofu,
      mofu: calculatedMofu,
      bofu: calculatedBofu,
      total_posts: calculatedTofu + calculatedMofu + calculatedBofu,
      reasoning,
      source: 'derived_from_strategy',
      requires_user_decision: !positioning && painPoints.length === 0,
    };
  }

  return {
    project_id: projectId,
    campaign_goal: campaignGoal,
    tofu,
    mofu,
    bofu,
    distribution,
    provenance: {
      source_project_id: projectId,
      source_blueprint_type: context.source?.origin || 'shared_content_context',
      generated_at: new Date().toISOString(),
      is_customized: distribution.source === 'user_override',
      notes: `Derived strictly from active project strategy context without generic hard-codes.`,
    },
  };
}

/**
 * Pre-calendar planning context.
 * Binds project_id, shared_context, and derived FunnelStrategy before any ContentItem exists.
 */
export function buildCalendarPlanningContext(
  projectId: string,
  sharedContext: SharedContentContext,
  customGoal?: string
): CalendarPlanningContext {
  if (sharedContext.project_id && sharedContext.project_id !== projectId) {
    throw new Error(
      `Project Isolation Violation: sharedContext.project_id (${sharedContext.project_id}) !== target projectId (${projectId})`
    );
  }

  const funnelStrategy = buildFunnelStrategyFromContext(sharedContext, { campaignGoal: customGoal });
  return {
    project_id: projectId,
    shared_context: sharedContext,
    funnel_strategy: funnelStrategy,
  };
}

/**
 * Validates project isolation for FunnelStrategy.
 * Project A CANNOT use FunnelStrategy belonging to Project B.
 */
export function validateFunnelStrategyProjectIsolation(
  funnelStrategy: FunnelStrategy,
  targetProjectId: string
): { isValid: boolean; error?: string } {
  if (!funnelStrategy) {
    return { isValid: false, error: 'FunnelStrategy is required.' };
  }
  if (!targetProjectId) {
    return { isValid: false, error: 'Target projectId is required.' };
  }
  if (funnelStrategy.project_id !== targetProjectId) {
    return {
      isValid: false,
      error: `Project Isolation Violation: FunnelStrategy.project_id (${funnelStrategy.project_id}) does not match target projectId (${targetProjectId}). Cross-project strategy leakage blocked.`,
    };
  }
  if (
    funnelStrategy.provenance?.source_project_id &&
    funnelStrategy.provenance.source_project_id !== targetProjectId
  ) {
    return {
      isValid: false,
      error: `Project Isolation Violation: FunnelStrategy provenance (${funnelStrategy.provenance.source_project_id}) does not match target projectId (${targetProjectId}).`,
    };
  }
  return { isValid: true };
}

/**
 * Formats the FunnelStrategy into a strict prompt instruction for AI generation.
 */
export function buildFunnelStrategyPromptBlock(funnelStrategy: FunnelStrategy): string {
  const { tofu, mofu, bofu, distribution, campaign_goal, project_id } = funnelStrategy;

  return `
### AUTHORITATIVE FUNNEL STRATEGY (PROJECT: ${project_id})
Campaign Goal: ${campaign_goal}
Funnel Allocation Plan: ${distribution.tofu} TOFU, ${distribution.mofu} MOFU, ${distribution.bofu} BOFU (Total: ${distribution.total_posts} posts)
Strategic Rationale: ${distribution.reasoning}

---
[TOFU STAGE - TOP OF FUNNEL: AWARENESS & RELATABILITY]
- Audience State: ${tofu.audience_state}
- Communication Objective: ${tofu.objective}
- Message Direction: ${tofu.message_direction}
- Content Style: ${tofu.content_direction}
- Hook Direction: ${tofu.hook_direction}
- CTA Direction: ${tofu.cta_direction}
- Permitted CTA Types: ${tofu.allowed_cta_types.join(', ')}
- Strictly Forbidden: ${tofu.forbidden_elements.join('; ')}

---
[MOFU STAGE - MIDDLE OF FUNNEL: EVALUATION & TRUST]
- Audience State: ${mofu.audience_state}
- Communication Objective: ${mofu.objective}
- Message Direction: ${mofu.message_direction}
- Content Style: ${mofu.content_direction}
- Hook Direction: ${mofu.hook_direction}
- CTA Direction: ${mofu.cta_direction}
- Permitted CTA Types: ${mofu.allowed_cta_types.join(', ')}
- Strictly Forbidden: ${mofu.forbidden_elements.join('; ')}

---
[BOFU STAGE - BOTTOM OF FUNNEL: PROOF & CONVERSION]
- Audience State: ${bofu.audience_state}
- Communication Objective: ${bofu.objective}
- Message Direction: ${bofu.message_direction}
- Content Style: ${bofu.content_direction}
- Hook Direction: ${bofu.hook_direction}
- CTA Direction: ${bofu.cta_direction}
- Permitted CTA Types: ${bofu.allowed_cta_types.join(', ')}
- Strictly Forbidden: ${bofu.forbidden_elements.join('; ')}
`;
}

/**
 * Validates a content item against the active project's FunnelStrategy.
 * Repairs soft CTA for TOFU/MOFU if sales language leaked, or flags violations.
 */
export function validateItemAgainstFunnelStrategy(
  item: { jenis: string; cta?: string; headline?: string; body?: string },
  funnelStrategy: FunnelStrategy
): { isValid: boolean; violations: string[]; repairedCta?: string } {
  const strictStage = parseStrictFunnelStage(item.jenis);
  const violations: string[] = [];
  let repairedCta = item.cta;

  if (!strictStage) {
    violations.push(`Invalid funnel stage "${item.jenis || ''}". Expected TOFU, MOFU, or BOFU.`);
    return {
      isValid: false,
      violations,
      repairedCta,
    };
  }

  const stage = strictStage;
  const stageStrategy = stage === 'TOFU' ? funnelStrategy.tofu : stage === 'MOFU' ? funnelStrategy.mofu : funnelStrategy.bofu;
  const lowerCta = (item.cta || '').toLowerCase();

  // 1. Check forbidden CTA elements for TOFU / MOFU
  if (stage === 'TOFU' || stage === 'MOFU') {
    const forbiddenPatterns = [
      'link bio', 'link di bio', 'klik bio', 'klik link', 'daftar sekarang',
      'beli sekarang', 'ambil penawaran', 'mumpung diskon', 'dm sekarang', 'dm kami'
    ];
    const hasForbidden = forbiddenPatterns.some((pattern) => lowerCta.includes(pattern));
    if (hasForbidden) {
      violations.push(`Stage ${stage} contains sales conversion CTA: "${item.cta}" which violates funnel objective.`);
      // Repair cleanly from strategy CTA direction
      repairedCta = sanitizeCtaForFunnel('', stage);
    }
  }

  // 2. Check BOFU CTA completeness
  if (stage === 'BOFU') {
    if (!item.cta || item.cta.trim().length === 0) {
      violations.push('BOFU item lacks a clear conversion CTA.');
      repairedCta = sanitizeCtaForFunnel('', 'BOFU');
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
    repairedCta,
  };
}

/**
 * Summarizes the distribution of TOFU, MOFU, and BOFU items in a calendar.
 */
export function summarizeFunnelDistribution(items: any[]): {
  tofu: number;
  mofu: number;
  bofu: number;
  unknown: number;
  total: number;
} {
  let tofu = 0;
  let mofu = 0;
  let bofu = 0;
  let unknown = 0;

  for (const item of items || []) {
    const stage = parseStrictFunnelStage(item?.jenis);
    if (stage === 'TOFU') tofu++;
    else if (stage === 'MOFU') mofu++;
    else if (stage === 'BOFU') bofu++;
    else unknown++;
  }

  return {
    tofu,
    mofu,
    bofu,
    unknown,
    total: tofu + mofu + bofu + unknown,
  };
}

/**
 * Strictly validates calendar items against the project's authoritative FunnelStrategy.
 */
export function validateCalendarAgainstFunnelStrategy(
  items: any[],
  funnelStrategy: FunnelStrategy
): {
  isValid: boolean;
  errors: string[];
  distribution: { tofu: number; mofu: number; bofu: number; unknown: number; total: number };
} {
  const errors: string[] = [];
  const dist = summarizeFunnelDistribution(items);

  if (!items || items.length === 0) {
    errors.push('Calendar does not contain any content items.');
    return { isValid: false, errors, distribution: dist };
  }

  const expectedTotal = funnelStrategy.distribution.total_posts;
  if (items.length !== expectedTotal) {
    errors.push(
      `Item count mismatch: generated ${items.length} items, but FunnelStrategy requires exactly ${expectedTotal} items.`
    );
  }

  if (dist.unknown > 0) {
    errors.push(
      `Invalid funnel stages: found ${dist.unknown} item(s) with unparseable or unauthorized funnel stages.`
    );
  }

  if (dist.tofu !== funnelStrategy.distribution.tofu) {
    errors.push(
      `TOFU allocation mismatch: generated ${dist.tofu} TOFU items, expected ${funnelStrategy.distribution.tofu}.`
    );
  }

  if (dist.mofu !== funnelStrategy.distribution.mofu) {
    errors.push(
      `MOFU allocation mismatch: generated ${dist.mofu} MOFU items, expected ${funnelStrategy.distribution.mofu}.`
    );
  }

  if (dist.bofu !== funnelStrategy.distribution.bofu) {
    errors.push(
      `BOFU allocation mismatch: generated ${dist.bofu} BOFU items, expected ${funnelStrategy.distribution.bofu}.`
    );
  }

  items.forEach((item, idx) => {
    const itemNo = item?.no ?? idx + 1;
    const strictStage = parseStrictFunnelStage(item?.jenis);
    if (!strictStage) {
      errors.push(`Item #${itemNo}: Invalid funnel stage "${item?.jenis || ''}". Expected TOFU, MOFU, or BOFU.`);
      return;
    }
    const itemValidation = validateItemAgainstFunnelStrategy(item, funnelStrategy);
    if (!itemValidation.isValid) {
      errors.push(`Item #${itemNo}: ${itemValidation.violations.join('; ')}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    distribution: dist,
  };
}

/**
 * Normalizes generated calendar items to strictly align with the project's authoritative FunnelStrategy.
 * Guarantees correct item numbering, content ID, harmless display formatting, CTA sanitization, and project isolation.
 * NOTE: NEVER mutates funnel stages (TOFU->MOFU etc). Stage validity must be enforced by validateCalendarAgainstFunnelStrategy.
 */
export function normalizeCalendarToFunnelDistribution(
  rawItems: any[],
  funnelStrategy: FunnelStrategy,
  projectId?: string
): any[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [];

  const targetProjectId = projectId || funnelStrategy.project_id || 'default_project';

  return rawItems.map((raw, idx) => {
    const itemNo = idx + 1;
    const stageType = parseStrictFunnelStage(raw.jenis);
    if (!stageType) {
      throw new Error(
        `Cannot normalize calendar item with invalid funnel stage: ${raw.jenis}`
      );
    }

    // Format funnel stage display text
    const displayStage =
      stageType === 'TOFU'
        ? 'TOFU (Awareness)'
        : stageType === 'MOFU'
        ? 'MOFU (Consideration)'
        : 'BOFU (Conversion)';

    const itemValidation = validateItemAgainstFunnelStrategy({ ...raw, jenis: stageType }, funnelStrategy);
    const finalCta = itemValidation.repairedCta || sanitizeCtaForFunnel(raw.cta, stageType);

    return {
      ...raw,
      no: itemNo,
      project_id: targetProjectId,
      projectId: targetProjectId,
      content_item_id: raw.content_item_id || `${targetProjectId}_item_${itemNo}_${Date.now()}_${idx + 1}`,
      jenis: displayStage,
      cta: finalCta,
    };
  });
}

export interface FunnelRatioInput {
  tofu?: number;
  mofu?: number;
  bofu?: number;
}

export interface FunnelPlanningInputOptions {
  hasUserFunnelOverride?: boolean;
  userOverrides?: FunnelRatioInput;
  ratio?: FunnelRatioInput;
  totalPosts?: number;
  defaultTotalPosts?: number;
}

/**
 * Strictly validates a single funnel stage count for manual overrides.
 * Must be a finite, non-negative integer.
 */
export function validateOverrideStageCount(val: any, stageName: string): number {
  const num = val ?? 0;
  if (typeof num !== 'number' || !Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    throw new Error(
      `Invalid manual funnel override for ${stageName}: must be a non-negative integer.`
    );
  }
  return num;
}

export interface ResolvedFunnelPlanningInput {
  explicitOverrides: { tofu: number; mofu: number; bofu: number } | undefined;
  totalPosts: number;
}

/**
 * Resolves production funnel planning input options cleanly.
 * When hasUserFunnelOverride is false, ratio and userOverrides are completely ignored.
 * When hasUserFunnelOverride is true, userOverrides or ratio is used as explicit override.
 * Throws an error if explicitOverrides has a total <= 0, or contains negative, NaN, or non-integer values.
 * When explicitOverrides is valid, totalPosts is strictly equal to explicitOverrides sum (tofu + mofu + bofu).
 */
export function resolveFunnelPlanningInput(
  options: FunnelPlanningInputOptions
): ResolvedFunnelPlanningInput {
  const {
    hasUserFunnelOverride = false,
    userOverrides,
    ratio,
    totalPosts,
    defaultTotalPosts = 14,
  } = options;

  if (hasUserFunnelOverride) {
    const rawOverride = userOverrides || ratio;
    if (!rawOverride) {
      throw new Error('Manual funnel override must contain at least one content item.');
    }

    const tofu = validateOverrideStageCount(rawOverride.tofu, 'TOFU');
    const mofu = validateOverrideStageCount(rawOverride.mofu, 'MOFU');
    const bofu = validateOverrideStageCount(rawOverride.bofu, 'BOFU');
    const explicitTotal = tofu + mofu + bofu;

    if (explicitTotal <= 0) {
      throw new Error('Manual funnel override must contain at least one content item.');
    }

    return {
      explicitOverrides: { tofu, mofu, bofu },
      totalPosts: explicitTotal,
    };
  }

  // When hasUserFunnelOverride is false, ratio/userOverrides are completely ignored.
  return {
    explicitOverrides: undefined,
    totalPosts: totalPosts || defaultTotalPosts,
  };
}

/**
 * Validates strict project isolation during item regeneration.
 * Requires requestProjectId to be present and non-empty.
 * Rejects if itemProjectId or contextProjectId conflicts with requestProjectId.
 */
export function validateRegenerateProjectIdentity(
  requestProjectId?: string,
  itemProjectId?: string,
  contextProjectId?: string
): { isValid: boolean; error?: string } {
  if (!requestProjectId || requestProjectId.trim() === '') {
    return {
      isValid: false,
      error: 'Project isolation violation during item regeneration.',
    };
  }

  const reqId = requestProjectId.trim();
  const itemId = itemProjectId ? itemProjectId.trim() : '';
  const ctxId = contextProjectId ? contextProjectId.trim() : '';

  if (itemId && itemId !== reqId) {
    return {
      isValid: false,
      error: 'Project isolation violation during item regeneration.',
    };
  }

  if (ctxId && ctxId !== reqId) {
    return {
      isValid: false,
      error: 'Project isolation violation during item regeneration.',
    };
  }

  return { isValid: true };
}

/**
 * Resolves the authoritative core campaign topic.
 * Authority precedence:
 * 1. Explicit user coreTopic (if non-empty string)
 * 2. Project context core_message (if non-empty string)
 * Throws an error if neither is available (fail-closed, no generic strategic fallbacks allowed).
 */
export function resolveCoreCampaignTopic(
  explicitCoreTopic?: string | null,
  contextCoreMessage?: string | null
): string {
  if (typeof explicitCoreTopic === 'string' && explicitCoreTopic.trim() !== '') {
    return explicitCoreTopic.trim();
  }

  if (typeof contextCoreMessage === 'string' && contextCoreMessage.trim() !== '') {
    return contextCoreMessage.trim();
  }

  throw new Error('Core campaign topic tidak tersedia dari project strategy context.');
}

/**
 * Resolves the explicit coreTopic to send from the client.
 * Returns the trimmed explicit topic only if hasUserCoreTopicOverride is true and explicit topic is non-empty.
 * Otherwise returns undefined so the server resolves from project context (strategy_context.core_message).
 */
export function resolveClientCoreTopicRequest(
  hasUserCoreTopicOverride: boolean,
  coreTopic?: string | null
): string | undefined {
  if (hasUserCoreTopicOverride && typeof coreTopic === 'string' && coreTopic.trim() !== '') {
    return coreTopic.trim();
  }
  return undefined;
}

