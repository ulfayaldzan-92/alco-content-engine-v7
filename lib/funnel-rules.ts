export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU';

export const FUNNEL_CONTENT_RULES = {
  TOFU: {
    goal: 'Awareness, relate, curiosity, edukasi ringan.',
    audienceState: 'Audiens belum sadar penuh terhadap masalah atau belum mengenal solusi.',
    contentStyle: 'Natural, ringan, relatable, edukatif, tidak terasa jualan.',
    visualStyle: 'Organic social content, editorial lifestyle, simple hook, clean visual.',
    ctaStyle: 'Soft CTA: simpan, geser, baca caption, cek contoh, pikirkan ulang.',
    allowedCta: ['Simpan ide ini', 'Cek contoh lanjutannya', 'Baca sampai akhir', 'Geser untuk lihat pola'],
    forbiddenPhrases: ['link bio', 'link di bio', 'klik link bio', 'klik link di bio', 'daftar sekarang', 'ambil penawaran', 'mumpung gratis', 'beli sekarang', 'dm', 'dm kami'],
    avoid: 'Hard selling, diskon, klaim bombastis, urgency, link bio agresif, testimoni berlebihan.'
  },
  MOFU: {
    goal: 'Membantu audiens mengevaluasi masalah dan memahami framework solusi.',
    audienceState: 'Audiens sudah sadar masalah dan mulai mencari cara yang lebih masuk akal.',
    contentStyle: 'Edukasi, framework, checklist, comparison, myth-busting, objection handling.',
    visualStyle: 'Explainer visual, diagram, checklist, side-by-side comparison, step-by-step.',
    ctaStyle: 'Soft action CTA: cek framework, bandingkan, simpan checklist, pelajari detail.',
    allowedCta: ['Cek framework ini', 'Simpan checklist ini', 'Bandingkan opsinya', 'Pelajari detailnya'],
    forbiddenPhrases: ['link bio', 'link di bio', 'klik link bio', 'klik link di bio', 'daftar sekarang', 'ambil penawaran', 'mumpung gratis', 'beli sekarang', 'dm', 'dm kami'],
    avoid: 'Hard closing, diskon besar, scarcity berlebihan, klaim hasil instan.'
  },
  BOFU: {
    goal: 'Mendorong keputusan dengan bukti, demo, offer clarity, dan CTA jelas.',
    audienceState: 'Audiens sudah tertarik dan butuh alasan terakhir untuk bertindak.',
    contentStyle: 'Proof, demo, before-after, testimonial, case study, offer explanation.',
    visualStyle: 'Product/demo focused, proof card, testimonial layout, clear offer breakdown.',
    ctaStyle: 'Direct CTA: lihat demo, daftar, konsultasi, ambil penawaran, mulai sekarang.',
    allowedCta: ['Lihat demo', 'Daftar sekarang', 'Ambil penawaran', 'Konsultasi sekarang'],
    forbiddenPhrases: [],
    avoid: 'Konten terlalu abstrak, edukasi terlalu panjang, CTA terlalu lemah.'
  }
} as const;

export function parseStrictFunnelStage(value?: any): FunnelStage | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  // Strict valid stages:
  // * TOFU, TOFU (Awareness)
  // * MOFU, MOFU (Consideration)
  // * BOFU, BOFU (Conversion)
  // Reject words with prefixes/suffixes (e.g. NOTTOFU, TOFU_WRONG, XYZ-MOFU-XYZ)
  // Reject composite stage markers (e.g. BOFU_TOFU, ENGAGEMENT)
  if (/^TOFU(?:\s*[\(-:]?\s*(?:AWARENESS|TOP OF FUNNEL)[\)]?)?$/i.test(raw)) {
    return 'TOFU';
  }
  if (/^MOFU(?:\s*[\(-:]?\s*(?:CONSIDERATION|MIDDLE OF FUNNEL)[\)]?)?$/i.test(raw)) {
    return 'MOFU';
  }
  if (/^BOFU(?:\s*[\(-:]?\s*(?:CONVERSION|BOTTOM OF FUNNEL)[\)]?)?$/i.test(raw)) {
    return 'BOFU';
  }

  return null;
}

export function lockRegeneratedFunnelStage(originalStageInput: any, _generatedStageInput?: any): FunnelStage {
  const originalStage = parseStrictFunnelStage(originalStageInput);
  if (!originalStage) {
    throw new Error(`Cannot lock funnel stage: original item stage "${originalStageInput}" is invalid.`);
  }
  return originalStage;
}

export function normalizeFunnelStage(value?: string): FunnelStage {
  const parsed = parseStrictFunnelStage(value);
  if (parsed) return parsed;
  return 'TOFU';
}

export function getFunnelRules(value?: string) {
  return FUNNEL_CONTENT_RULES[normalizeFunnelStage(value)];
}

export function sanitizeCtaForFunnel(cta: string, stageInput?: string): string {
  const stage = normalizeFunnelStage(stageInput);
  const rules = FUNNEL_CONTENT_RULES[stage];
  const lower = (cta || '').toLowerCase();
  const hasForbidden = rules.forbiddenPhrases.some((phrase) => lower.includes(phrase));
  if (!cta || hasForbidden) return rules.allowedCta[0];
  return cta;
}

export function isRawOrShortCta(cta: string): boolean {
  if (!cta) return true;
  const cleaned = cta.trim();
  if (cleaned.length < 25) return true;
  const words = cleaned.split(/\s+/);
  if (words.length < 5) return true;

  const lower = cleaned.toLowerCase();
  const rawKeywords = [
    'link bio', 'link di bio', 'klik link', 'klik bio', 'cek bio',
    'cek link', 'dm kami', 'dm', 'pm', 'inbox', 'hubungi kami',
    'mumpung gratis', 'ambil sekarang', 'beli sekarang', 'daftar sekarang'
  ];
  if (rawKeywords.some((k) => lower.includes(k))) {
    if (cleaned.length < 40) return true;
  }
  return false;
}

export function getVoiceoverCtaForFunnel(ctaInput: string, stageInput?: string): string {
  const stage = normalizeFunnelStage(stageInput);
  const cleaned = (ctaInput || '').trim();

  if (cleaned && !isRawOrShortCta(cleaned)) {
    const lower = cleaned.toLowerCase();
    const rules = FUNNEL_CONTENT_RULES[stage];
    const hasForbidden = rules.forbiddenPhrases.some((phrase) => lower.includes(phrase));
    if (!hasForbidden) {
      return cleaned;
    }
  }

  if (stage === 'MOFU') {
    return 'Kalau kamu ingin mempelajari framework ini lebih detail, simpan video ini dan cek panduan lengkapnya.';
  }
  if (stage === 'BOFU') {
    return 'Kalau kamu ingin mulai mendapatkan solusi ini secara praktis, cek detail penawaran lengkap sekarang.';
  }
  // TOFU
  return 'Simpan postingan ini supaya kamu bisa mempelajarinya kembali saat butuh solusi praktis nanti.';
}

export function buildFunnelPromptBlock(stageInput?: string) {
  const stage = normalizeFunnelStage(stageInput);
  const rules = FUNNEL_CONTENT_RULES[stage];

  return `
FUNNEL STAGE: ${stage}
FUNNEL GOAL: ${rules.goal}
AUDIENCE STATE: ${rules.audienceState}
CONTENT STYLE: ${rules.contentStyle}
VISUAL STYLE: ${rules.visualStyle}
CTA STYLE: ${rules.ctaStyle}
ALLOWED CTA EXAMPLES: ${rules.allowedCta.join('; ')}
FORBIDDEN PHRASES: ${rules.forbiddenPhrases.join('; ') || '-'}
AVOID: ${rules.avoid}
`;
}

/**
 * Helper to count words in a dialogue or script string.
 */
export function countWords(text?: string | null): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Cleans markdown formatting, extra spacing, and dangerous quotes from dialogue strings.
 */
export function cleanDialogueText(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/[#*`_]/g, '')
    .replace(/[«»"“”]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Prevents duplicated brand phrases (e.g., "Dengan Brand, kamu dapat Dengan Brand, kamu bisa...").
 */
export function removeBrandDuplication(text?: string | null, brandName?: string): string {
  if (!text) return '';
  let cleaned = text;

  if (brandName) {
    const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern1 = new RegExp(`(?:dengan\\s+${escaped}[^,]*,?\\s*)+(?:dengan\\s+${escaped})`, 'gi');
    cleaned = cleaned.replace(pattern1, `Dengan ${brandName}`);

    const pattern2 = new RegExp(`(${escaped})\\s+(?:kamu\\s+(?:dapat|bisa)\\s+)?(?:dengan\\s+)?\\1`, 'gi');
    cleaned = cleaned.replace(pattern2, '$1');
  }

  // Generic phrase duplication: "Dengan X, kamu dapat Dengan X, kamu bisa"
  cleaned = cleaned.replace(/dengan\s+([a-zA-Z0-9\s]+?),\s*kamu\s+dapat\s+dengan\s+\1,?\s*kamu\s+bisa/gi, 'dengan $1, kamu bisa');
  cleaned = cleaned.replace(/dengan\s+([a-zA-Z0-9\s]+?),\s*dengan\s+\1/gi, 'dengan $1');

  // Duplicate consecutive words or phrases (e.g. "kamu bisa kamu bisa")
  cleaned = cleaned.replace(/\b(\w+(?:\s+\w+){1,3})\s+\1\b/gi, '$1');

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes 3-scene Google Flow UGC dialogues for 8-second video shots:
 * - Target: 24-30 words per scene (Min: 22 words, Max: 32 words)
 * - Natural spoken Indonesian, strictly grounded in the project facts
 * - Scene 1: Hook / Problem
 * - Scene 2: Solusi / Demo / Framework
 * - Scene 3: Proof / Value + Complete CTA (never just a short CTA)
 * - Safe against brand duplication and generic content-marketing placeholders
 */
export function normalizeGoogleFlowDialogue(
  scene: 1 | 2 | 3,
  stageInput?: string,
  rawDialogue?: string | null,
  context?: any
): string {
  const stage = normalizeFunnelStage(stageInput);
  const brandName =
    context?.brand?.name ||
    context?.brand_context?.brand_name ||
    '';
  const audience =
    context?.audience?.primary_audience ||
    context?.audience_context?.primary_audience ||
    '';
  const painPoint =
    (context?.audience?.pain_points && context?.audience.pain_points[0]) ||
    (context?.audience_context?.pain_points && context?.audience_context.pain_points[0]) ||
    '';
  const solutionOffer =
    context?.strategy?.main_offer ||
    context?.strategy_context?.main_offer ||
    context?.strategy?.positioning ||
    context?.strategy_context?.positioning ||
    '';
  const headlineTopic =
    context?.content?.headline ||
    context?.headline ||
    '';

  let cleaned = cleanDialogueText(rawDialogue || '');
  if (brandName) {
    cleaned = removeBrandDuplication(cleaned, brandName);
  }

  const currentCount = countWords(cleaned);
  const isTooShort = currentCount < 18;
  const isShortCta =
    scene === 3 &&
    (currentCount < 20 ||
      /^(simpan|follow|cek|lihat|klik|daftar|beli|link bio|dm|amankan|konsultasi|baca|ambil)/i.test(cleaned));

  // SCENE 1: Hook / Problem (Target: 24-30 kata, min 22, max 32)
  if (scene === 1) {
    if (!cleaned || isTooShort) {
      if (painPoint) {
        if (stage === 'TOFU') {
          cleaned = `Pernah merasa bingung saat menghadapi ${painPoint}? Seringkali kita mengira masalahnya rumit, padahal ada langkah awal yang jauh lebih sederhana untuk memahaminya.`;
        } else if (stage === 'MOFU') {
          cleaned = `Banyak yang mencoba mengatasi ${painPoint} dengan cara sementara yang kurang efektif. Padahal tanpa pemahaman akar masalah, hasilnya akan terus berulang.`;
        } else {
          cleaned = `Masih bingung mencari solusi paling terbukti untuk ${painPoint}? Saatnya berhenti coba-coba dan beralih ke pendekatan terstruktur yang memberikan hasil nyata.`;
        }
      } else if (headlineTopic) {
        cleaned = `Mengenai ${headlineTopic}, banyak yang belum menyadari pentingnya langkah yang tepat sejak awal agar tidak membuang waktu dan energi berharga.`;
      } else {
        cleaned = `Pernah merasa proses yang kamu jalani belum memberikan hasil optimal? Mari kita bedah penyebab utamanya dan cara praktis untuk mengatasinya secara efektif.`;
      }
    } else if (currentCount < 22) {
      if (stage === 'TOFU') {
        cleaned = `${cleaned.replace(/[.!?]+$/, '')}. Padahal jika dipahami dengan baik, kamu bisa menemukan langkah paling tepat secara lebih cepat.`;
      } else if (stage === 'MOFU') {
        cleaned = `${cleaned.replace(/[.!?]+$/, '')}. Hal ini penting diperhatikan agar kamu bisa mengevaluasi pilihan solusi dengan lebih objektif.`;
      } else {
        cleaned = `${cleaned.replace(/[.!?]+$/, '')}. Sekarang adalah momen yang tepat untuk mengambil langkah nyata menuju hasil terbaik.`;
      }
    }
  }

  // SCENE 2: Solusi / Demo / Framework (Target: 24-30 kata, min 22, max 32)
  else if (scene === 2) {
    if (!cleaned || isTooShort) {
      if (solutionOffer && brandName) {
        if (stage === 'TOFU') {
          cleaned = `Kuncinya adalah memahami polanya: kenali kebutuhan utamamu, temukan solusi terpercaya seperti ${brandName}, dan terapkan secara konsisten untuk hasil maksimal.`;
        } else if (stage === 'MOFU') {
          cleaned = `Melalui pendekatan ${brandName}, kamu mendapatkan ${solutionOffer} yang dirancang khusus untuk mempermudah setiap langkah secara terstruktur dan jelas.`;
        } else {
          cleaned = `Dengan ${solutionOffer} dari ${brandName}, kamu tidak perlu bingung lagi karena seluruh proses sudah terbukti efektif dan siap digunakan langsung.`;
        }
      } else if (brandName) {
        cleaned = `Bersama ${brandName}, kami memberikan panduan terarah dan solusi praktis yang dirancang sesuai kebutuhanmu tanpa proses yang berbelit-belit.`;
      } else {
        cleaned = `Kuncinya ada pada penerapan langkah yang tepat: pahami inti persoalan, gunakan metode teruji, lalu evaluasi perkembangannya secara berkala.`;
      }
    } else if (currentCount < 22) {
      if (stage === 'TOFU') {
        cleaned = `Solusinya jelas: ${cleaned.replace(/[.!?]+$/, '')}, sehingga kamu bisa memahaminya dengan mudah dan langsung mengambil tindakan.`;
      } else if (stage === 'MOFU') {
        cleaned = `Dengan metode ini: ${cleaned.replace(/[.!?]+$/, '')}, membantu kamu membandingkan dan memilih solusi yang paling sesuai.`;
      } else {
        cleaned = `Hasilnya terbukti nyata: ${cleaned.replace(/[.!?]+$/, '')}, memastikan langkah yang kamu ambil memberikan manfaat maksimal.`;
      }
    }
  }

  // SCENE 3: Proof / Value + Complete CTA (Target: 24-30 kata, min 22, max 32)
  else if (scene === 3) {
    if (!cleaned || isShortCta) {
      if (stage === 'TOFU') {
        cleaned = `Simpan informasi ini sekarang agar kamu bisa membacanya kembali saat butuh, dan bagikan kepada orang terdekat yang membutuhkan tips bermanfaat ini.`;
      } else if (stage === 'MOFU') {
        cleaned = `Pelajari framework dan panduan lengkapnya sekarang juga untuk memahami bagaimana solusi ini bisa membantu menyelesaikan tantangan yang kamu hadapi.`;
      } else {
        cleaned = `Jangan tunda lagi untuk mendapatkan solusi terbaik bagi kebutuhanmu. Cek informasi selengkapnya sekarang dan mulai langkah pertamamu hari ini.`;
      }
    } else if (currentCount < 22) {
      if (stage === 'TOFU') {
        cleaned = `Simpan postingan ini sekarang biar tidak lupa, dan ikuti kami untuk mendapatkan wawasan serta tips bermanfaat lainnya setiap hari.`;
      } else if (stage === 'MOFU') {
        cleaned = `Pelajari detail lengkapnya sekarang juga, dan simpan panduan ini agar kamu bisa menerapkannya langsung saat dibutuhkan nanti.`;
      } else {
        cleaned = `Ambil keputusan terbaik untuk kebutuhanmu sekarang juga. Cek penawaran lengkap dan mulai nikmati hasilnya secara nyata hari ini.`;
      }
    }
  }

  if (brandName) {
    cleaned = removeBrandDuplication(cleaned, brandName);
  }

  // If word count > 32 words, trim gracefully to 26-28 words with proper sentence ending
  const words = cleaned.trim().split(/\s+/).filter(Boolean);
  if (words.length > 32) {
    const trimmedWords = words.slice(0, 28);
    let trimmed = trimmedWords.join(' ');
    if (!/[.!?]$/.test(trimmed)) {
      trimmed += '.';
    }
    cleaned = trimmed;
  }

  return cleaned.trim();
}

