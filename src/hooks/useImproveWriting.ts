import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useIntl } from 'react-intl';
import { useAuth } from './useAuth';
import { useIsPro } from './useProStatus';
import { useWritingPrefs, WRITING_CORRECTION_CATEGORIES } from './useWritingPrefs';
import type { AnyWritingTemplate } from './useWritingTemplates';
import { ApiError } from '../lib/api';
import { improveWriting, type ImproveWritingResult } from '../lib/improveWritingApi';

// Revising a text with a template, headless — Improve Writing on the Writing
// page and the world's scribe at Văn Miếu both go through this. A paid Pro
// action: locked accounts get a nudge, failures a toast. It asks only for the
// correction kinds and the number of options the learner's prefs show.

export function useImproveWriting() {
  const intl = useIntl();
  const { user } = useAuth();
  const { isPro, loading: proLoading } = useIsPro();
  const locked = !proLoading && !isPro;
  const visibleCategories = useWritingPrefs((s) => s.visibleCategories);
  const hideOption2 = useWritingPrefs((s) => s.hideOption2);
  const [result, setResult] = useState<ImproveWritingResult | null>(null);
  // The text a result belongs to — captured at submit time, since the text
  // box keeps changing if the learner edits it afterwards.
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = async (template: AnyWritingTemplate | undefined, text: string) => {
    if (locked) {
      toast(intl.formatMessage({ id: user ? 'writing.improveProFeature' : 'writing.improveSignInPro' }), { icon: '👑' });
      return;
    }
    if (!text.trim()) { toast.error(intl.formatMessage({ id: 'writing.pasteFirst' })); return; }
    if (!template) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setResult(null);
    const submitted = text.trim();
    try {
      const categories = WRITING_CORRECTION_CATEGORIES.filter((c) => visibleCategories[c]);
      // One revision instead of two when Option 2 is hidden anyway — half the
      // tokens spent on a round the learner won't see.
      const res = await improveWriting(
        { instructions: template.instructions, text: submitted, categories, optionCount: hideOption2 ? 1 : 2 },
        { signal: controller.signal },
      );
      setResult(res);
      setSourceText(submitted);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else if ((err as Error).name !== 'AbortError') toast.error(intl.formatMessage({ id: 'writing.aiUnreachable' }));
    } finally {
      setLoading(false);
    }
  };

  const clear = () => { abortRef.current?.abort(); setResult(null); };

  return { submit, result, sourceText, loading, locked, clear };
}
