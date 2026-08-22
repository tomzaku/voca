// Parses the JSON the `ielts_writing` AI action returns (see
// supabase/functions/ai-ielts-writing/index.ts) into band scores plus brief
// feedback. Same best-effort convention as ./improveWritingApi.ts: a model
// that ignores the JSON instruction shouldn't break the feature, it should
// just come back with nothing to show.

export interface IeltsScoreResult {
  bandOverall: number;
  bandTask: number;
  bandCoherence: number;
  bandLexical: number;
  bandGrammar: number;
  summary: string;
  strengths: string[];
  improvements: string[];
}

function readBand(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 9) return null;
  return Math.round(v * 2) / 2;
}

function readStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim());
}

/** Returns null on any parse failure — there's no partial-score fallback worth showing. */
export function parseIeltsScoreResult(raw: string): IeltsScoreResult | null {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    const bandOverall = readBand(parsed.bandOverall);
    const bandTask = readBand(parsed.bandTask);
    const bandCoherence = readBand(parsed.bandCoherence);
    const bandLexical = readBand(parsed.bandLexical);
    const bandGrammar = readBand(parsed.bandGrammar);
    const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
    if (bandOverall == null || bandTask == null || bandCoherence == null
      || bandLexical == null || bandGrammar == null || !summary) {
      return null;
    }
    return {
      bandOverall,
      bandTask,
      bandCoherence,
      bandLexical,
      bandGrammar,
      summary,
      strengths: readStringList(parsed.strengths),
      improvements: readStringList(parsed.improvements),
    };
  } catch {
    return null;
  }
}
