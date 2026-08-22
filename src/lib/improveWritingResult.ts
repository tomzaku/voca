// Parses the JSON the `improve_writing` AI action returns (see
// supabase/functions/ai-improve-writing/index.ts) into revised options, each
// carrying its own corrections — categorized with the same taxonomy English
// Practice uses (see ./learningCategories.ts) so both features render
// corrections the same way.
//
// Corrections are scoped per option (not shared) because the two options are
// meaningfully different revisions: Option 2 rephrasing "I are Tri" into "My
// name is Tri" isn't the same edit as Option 1's "I are" → "I am", so each
// option's "what changed" list has to describe its own edits, not a list
// borrowed from the other.

import type { LearningCategory } from './learningCategories';

export interface WritingCorrection {
  category: LearningCategory;
  original: string;
  corrected: string;
  explanation: string;
}

export interface ImproveWritingOption {
  text: string;
  corrections: WritingCorrection[];
}

export interface ImproveWritingResult {
  options: ImproveWritingOption[];
}

const CORRECTION_CATEGORIES = new Set<LearningCategory>(['grammar', 'vocabulary', 'rephrase']);

function parseCorrections(v: unknown): WritingCorrection[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      category: c.category as LearningCategory,
      original: typeof c.original === 'string' ? c.original.trim() : '',
      corrected: typeof c.corrected === 'string' ? c.corrected.trim() : '',
      explanation: typeof c.explanation === 'string' ? c.explanation.trim() : '',
    }))
    .filter((c) => CORRECTION_CATEGORIES.has(c.category) && c.corrected);
}

/**
 * Best-effort parse: a model that ignores the JSON instruction still shouldn't
 * break the feature, so a failure falls back to treating the raw reply as a
 * single option with no corrections rather than throwing.
 *
 * Also accepts the older flat shape (`options: string[]`, one shared
 * `corrections` array) in case a cached/in-flight response predates the
 * per-option format — that shared list is applied to every option rather
 * than lost.
 */
export function parseImproveWritingResult(raw: string): ImproveWritingResult {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as { options?: unknown; corrections?: unknown };
    if (!Array.isArray(parsed.options) || parsed.options.length === 0) {
      throw new Error('no options in response');
    }

    const legacySharedCorrections = parseCorrections(parsed.corrections);

    const options = parsed.options
      .map((o): ImproveWritingOption | null => {
        if (typeof o === 'string') {
          // Legacy flat shape: a bare string option, sharing the top-level list.
          const t = o.trim();
          return t ? { text: t, corrections: legacySharedCorrections } : null;
        }
        if (o && typeof o === 'object') {
          const row = o as Record<string, unknown>;
          const t = typeof row.text === 'string' ? row.text.trim() : '';
          if (!t) return null;
          return { text: t, corrections: parseCorrections(row.corrections) };
        }
        return null;
      })
      .filter((o): o is ImproveWritingOption => o !== null)
      .slice(0, 2);
    if (options.length === 0) throw new Error('no usable options in response');

    return { options };
  } catch {
    return { options: [{ text: cleaned, corrections: [] }] };
  }
}
