// Parses the JSON the `improve_writing` AI action returns (see
// supabase/functions/ai/index.ts) into two revised options plus a list of
// corrections, categorized with the same taxonomy English Practice uses
// (see ./learningCategories.ts) so both features render corrections the
// same way.

import type { LearningCategory } from './learningCategories';

export interface WritingCorrection {
  category: LearningCategory;
  original: string;
  corrected: string;
  explanation: string;
}

export interface ImproveWritingResult {
  options: string[];
  corrections: WritingCorrection[];
}

const CORRECTION_CATEGORIES = new Set<LearningCategory>(['grammar', 'vocabulary', 'rephrase']);

/**
 * Best-effort parse: a model that ignores the JSON instruction still shouldn't
 * break the feature, so a failure falls back to treating the raw reply as a
 * single option with no corrections rather than throwing.
 */
export function parseImproveWritingResult(raw: string): ImproveWritingResult {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as { options?: unknown; corrections?: unknown };
    const options = Array.isArray(parsed.options)
      ? parsed.options.filter((o): o is string => typeof o === 'string' && o.trim().length > 0).slice(0, 2)
      : [];
    if (options.length === 0) throw new Error('no options in response');

    const corrections = Array.isArray(parsed.corrections)
      ? parsed.corrections
          .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
          .map((c) => ({
            category: c.category as LearningCategory,
            original: typeof c.original === 'string' ? c.original.trim() : '',
            corrected: typeof c.corrected === 'string' ? c.corrected.trim() : '',
            explanation: typeof c.explanation === 'string' ? c.explanation.trim() : '',
          }))
          .filter((c) => CORRECTION_CATEGORIES.has(c.category) && c.corrected)
      : [];

    return { options, corrections };
  } catch {
    return { options: [cleaned], corrections: [] };
  }
}
