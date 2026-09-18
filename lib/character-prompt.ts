import { CharacterDNA } from './content-contract';

/**
 * Builds a natural-language [CHARACTER CONSISTENCY] prompt block from a CharacterDNA object.
 * Returns empty string if no character is provided (No Character mode).
 * Uses only relevant information and strictly avoids raw JSON.
 */
export function buildCharacterConsistencyPrompt(dna: CharacterDNA | null | undefined): string {
  if (!dna || !dna.identity?.display_name) {
    return '';
  }

  const name = dna.identity.display_name.trim();
  const gender = dna.identity.gender_presentation?.trim() || 'woman';
  const age = dna.identity.estimated_age_range?.trim() || 'around 28 years old';
  const region = dna.identity.ethnicity_or_region_hint?.trim() || 'Indonesian';
  const skin = dna.identity.skin_tone?.trim();
  const hair = dna.identity.hair_description?.trim();
  const body = dna.identity.body_type?.trim();
  const facial = dna.identity.facial_features?.trim();
  const distinctive = dna.identity.distinctive_characteristics?.trim();

  const wardrobe = dna.style?.wardrobe_style?.trim();
  const visualVibe = dna.style?.visual_vibe?.trim();
  const accessories = dna.style?.accessories?.filter(Boolean) || [];

  const persona = dna.behavior?.on_camera_persona?.trim();
  const expression = dna.behavior?.expression_style?.trim();

  const lockedTraits = dna.consistency_rules?.locked_traits?.filter(Boolean) || [];
  const avoidTraits = dna.consistency_rules?.avoid_traits?.filter(Boolean) || [];

  const additionalInstructions = dna.additional_instructions?.trim();

  const sections: string[] = [];

  // Header & Subject Declaration
  sections.push('[CHARACTER CONSISTENCY]');
  sections.push(`Use saved character "${name}".`);

  // Identity Summary Line
  const identityLine = `${region} ${gender.toLowerCase()}, visually ${age.startsWith('around') || age.startsWith('usia') ? age : `around ${age}`} with consistent facial identity and physical characteristics.`;
  sections.push(identityLine);

  // Style & Wardrobe Details
  const styleLines: string[] = [];
  if (wardrobe) {
    styleLines.push(wardrobe.endsWith('.') ? wardrobe : `${wardrobe}.`);
  }
  if (accessories.length > 0) {
    styleLines.push(`Signature accessories: ${accessories.join(', ')}.`);
  }
  if (visualVibe) {
    styleLines.push(`Visual vibe: ${visualVibe}.`);
  }

  // Physical & Facial Details
  const physicalLines: string[] = [];
  if (hair) physicalLines.push(`Hair & head styling: ${hair}.`);
  if (skin) physicalLines.push(`Skin tone: ${skin}.`);
  if (body) physicalLines.push(`Body build: ${body}.`);
  if (facial) physicalLines.push(`Facial features: ${facial}.`);
  if (distinctive) physicalLines.push(`Distinctive traits: ${distinctive}.`);

  const combinedAppearance = [...styleLines, ...physicalLines].join(' ');
  if (combinedAppearance) {
    sections.push(combinedAppearance);
  }

  // Persona & Expression
  const behaviorLines: string[] = [];
  if (expression) behaviorLines.push(`Expression style: ${expression}.`);
  if (persona) behaviorLines.push(`On-camera persona: ${persona}.`);
  if (behaviorLines.length > 0) {
    sections.push(behaviorLines.join(' '));
  }

  // Core Consistency Directives
  const consistencyNote =
    'Use a natural, approachable appearance and maintain consistent facial features, age appearance, skin tone and visual identity across scenes.';
  sections.push(consistencyNote);

  // Locked & Avoid Rules
  const rulesLines: string[] = [];
  if (lockedTraits.length > 0) {
    rulesLines.push(`Consistency rules (Locked): ${lockedTraits.join('; ')}.`);
  }
  if (avoidTraits.length > 0) {
    rulesLines.push(`Consistency rules (Avoid): ${avoidTraits.join('; ')}.`);
  }
  if (rulesLines.length > 0) {
    sections.push(rulesLines.join(' '));
  }

  // Explicit User Additional Instructions (HIGH PRIORITY OVERRIDE)
  if (additionalInstructions) {
    sections.push(`User Additional Instructions:\n"${additionalInstructions}"`);
  }

  return sections.join('\n\n');
}

/**
 * Checks if a given visual format or context requires/supports a human talent character.
 * Returns FALSE for non-human content: infographic, diagram, chart, product-only visuals.
 */
export function isCharacterApplicable(formatOrContext?: string, promptText?: string): boolean {
  const combined = `${formatOrContext || ''} ${promptText || ''}`.toLowerCase();

  // If clearly non-human visual formats
  const isPureGraphic =
    combined.includes('infographic') ||
    combined.includes('infografis') ||
    combined.includes('diagram') ||
    combined.includes('chart') ||
    combined.includes('product-only') ||
    combined.includes('hanya produk') ||
    combined.includes('flat vector illustration') ||
    combined.includes('3d icon illustration') ||
    combined.includes('ui mockup only');

  if (isPureGraphic) {
    // Only allow if prompt explicitly has a talent/human subject defined
    const hasExplicitHuman =
      combined.includes('subject: seorang') ||
      combined.includes('talent ') ||
      combined.includes('creator ') ||
      combined.includes('model ');
    return hasExplicitHuman;
  }

  return true;
}

/**
 * Injects [CHARACTER CONSISTENCY] into a final production prompt if a character is selected.
 * If dna is null/undefined (No Character), returns basePrompt unaltered.
 * If content does not require character, returns basePrompt unaltered.
 */
export function injectCharacterToPrompt(
  basePrompt: string,
  dna: CharacterDNA | null | undefined,
  formatOrContext?: string
): string {
  if (!dna || !dna.identity?.display_name) {
    return basePrompt;
  }

  if (!isCharacterApplicable(formatOrContext, basePrompt)) {
    return basePrompt;
  }

  const consistencyBlock = buildCharacterConsistencyPrompt(dna);
  if (!consistencyBlock) {
    return basePrompt;
  }

  // Prevent duplicate injection
  if (basePrompt.includes('[CHARACTER CONSISTENCY]')) {
    return basePrompt;
  }

  return `${basePrompt}\n\n${consistencyBlock}`;
}
