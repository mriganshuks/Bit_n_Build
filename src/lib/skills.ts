/**
 * Single canonical skill normalization and URL decoding utility for PRAMAAN.
 */

/**
 * Safely decodes a URI-encoded skill name (e.g. "c%2B%2B" -> "c++", "c%23" -> "c#").
 * Does not throw on malformed strings and preserves already-decoded strings.
 */
export function safeDecodeSkill(raw: string): string {
  if (!raw) return "";
  let decoded = raw.trim();
  try {
    if (decoded.includes("%")) {
      decoded = decodeURIComponent(decoded);
    }
  } catch {
    // If decoding fails due to malformed URI sequence, keep current value
  }
  return decoded.trim();
}

/**
 * Normalizes a skill name for comparisons and database lookups.
 * Rules:
 * - URL decodes (e.g. "c%2B%2B" or "C%2B%2B" -> "c++")
 * - Collapses consecutive whitespace into single spaces
 * - Lowercases all characters
 * 
 * Distinct skills remain distinct:
 * - "C" !== "C++" !== "C#"
 */
export function normalizeSkillName(input: string): string {
  if (!input) return "";
  const decoded = safeDecodeSkill(input);
  return decoded
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Returns the canonical human-readable display string for a skill,
 * ensuring any URL encoding is safely decoded while preserving original casing.
 */
export function canonicalSkillDisplay(input: string): string {
  if (!input) return "";
  const decoded = safeDecodeSkill(input);
  return decoded.trim().replace(/\s+/g, " ");
}

/**
 * Compares two skill names for logical equivalence using the canonical normalization rule.
 */
export function isSkillMatch(skillA: string, skillB: string): boolean {
  return normalizeSkillName(skillA) === normalizeSkillName(skillB);
}
