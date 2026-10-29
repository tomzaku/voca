import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { useIsPro } from '../../hooks/useProStatus';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { WRITING_CORRECTION_CATEGORIES } from '../../hooks/useWritingPrefs';
import { ApiError } from '../../lib/api';
import { improveWriting, type ImproveWritingOption } from '../../lib/improveWritingApi';
import { diffOption } from '../../lib/textDiff';
import { generateWordData } from '../../lib/wordService';
import { DEFAULT_WRITING_TEMPLATES } from '../../lib/writingTemplates';
import { pickWritingWord, sentenceUsesWord } from '../../lib/writingPrompt';
import { playCorrect, playSelect } from '../../lib/sfx';
import type { VocabularyWord } from '../../types';
import { HudBanner, HudCenter, HudDock, PixelButton, PixelIcon, PixelLoader } from './pixel';

// The Writing building — Văn Miếu, whose stelae carry the names of past
// laureates. You're given one of the words you're learning (writingPrompt:
// in rotation or giving trouble first) and carve a sentence with it; the
// scholar corrects it with the Writing page's own Improve Writing call and
// General template, and the changes are marked word by word (textDiff).
// Producing a word, not just recognising it, is what fixes it in memory.
// Improve Writing is a Pro feature in the app, and here too.

const GENERAL = DEFAULT_WRITING_TEMPLATES.find((t) => t.id === 'default-general') ?? DEFAULT_WRITING_TEMPLATES[0];

export function VanMieuStele() {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, loading: proLoading } = useIsPro();
  const asked = useRef<Set<string>>(new Set());
  const [word, setWord] = useState<string | null>(() => pickWritingWord(useVocabularyStore.getState().progress));
  const [data, setData] = useState<VocabularyWord | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ original: string; option: ImproveWritingOption } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The word's meaning and family, for the prompt and for "did you use it".
  useEffect(() => {
    if (!word) return;
    let alive = true;
    generateWordData(word).then((d) => { if (alive) setData(d); }).catch(() => {});
    return () => { alive = false; };
  }, [word]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const shown = data?.headword || word || '';
  const family = data?.wordFamily?.map((f) => f.word) ?? [];
  const uses = text.trim() ? sentenceUsesWord(text, shown, family) : null;
  const locked = !proLoading && !isPro;

  const carve = async () => {
    if (!text.trim() || busy || locked) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    const original = text.trim();
    try {
      const res = await improveWriting(
        { instructions: GENERAL.instructions, text: original, categories: [...WRITING_CORRECTION_CATEGORIES], optionCount: 1 },
        { signal: ctrl.signal },
      );
      const option = res.options[0];
      if (option) {
        if (option.text.trim() === original) playCorrect();
        setResult({ original, option });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(err instanceof ApiError ? err.message : intl.formatMessage({ id: 'writing.aiUnreachable' }));
    } finally {
      setBusy(false);
    }
  };

  const nextWord = () => {
    playSelect();
    if (word) asked.current.add(word);
    setWord(pickWritingWord(useVocabularyStore.getState().progress, asked.current));
    setData(null);
    setText('');
    setResult(null);
    setError(null);
  };

  // Enter carves (Shift+Enter for a new line); after a result, Enter moves on.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    e.preventDefault();
    if (result) nextWord(); else void carve();
  };

  if (!word) {
    return <HudCenter><p className="text-center"><FormattedMessage id="world.steleNoWords" /></p></HudCenter>;
  }

  return (
    <>
      <HudBanner key={word} label={<FormattedMessage id="world.steleWrite" />} aside={data?.partOfSpeech}>
        <span className="px-num text-[30px] leading-none text-[var(--px-gold)]">{shown}</span>
        {data && <span className="block mt-1.5 text-[15px] text-[var(--px-muted)] leading-snug">{data.shortDefinition?.trim() || data.definition}</span>}
      </HudBanner>

      {busy && <HudCenter><PixelLoader label={<FormattedMessage id="world.steleCorrecting" />} /></HudCenter>}

      {result && !busy && (
        <HudCenter wide>
          <p className="px-title text-[var(--px-accent)] mb-2"><FormattedMessage id="world.steleRevised" /></p>
          {result.option.text.trim() === result.original ? (
            <p className="text-[var(--px-good)] flex items-center gap-2"><PixelIcon name="check" size={2} /><FormattedMessage id="world.steleNoChanges" /></p>
          ) : (
            <p className="px-inset px-notch p-3 text-[17px] leading-relaxed">
              {diffOption(result.original, result.option.text).map((seg, i) => (
                <span
                  key={i}
                  className={seg.added ? 'text-[var(--px-good)] font-bold' : seg.removed ? 'text-[var(--px-bad)] line-through opacity-80' : ''}
                >
                  {seg.value}
                </span>
              ))}
            </p>
          )}
          {result.option.corrections.length > 0 && (
            <ul className="mt-3 space-y-2">
              {result.option.corrections.map((c, i) => (
                <li key={i} className="text-[14px] leading-snug">
                  <span className="text-[var(--px-bad)] line-through">{c.original}</span>
                  {' → '}
                  <span className="text-[var(--px-good)] font-bold">{c.corrected}</span>
                  <span className="block text-[var(--px-muted)]">{c.explanation}</span>
                </li>
              ))}
            </ul>
          )}
        </HudCenter>
      )}

      <HudDock>
        {uses !== null && (
          <p className={`px-title flex items-center gap-1.5 ${uses ? 'text-[var(--px-good)]' : 'text-[var(--px-gold)]'}`}>
            <PixelIcon name={uses ? 'check' : 'close'} size={2} />
            <FormattedMessage id={uses ? 'world.steleUsed' : 'world.steleMissing'} />
          </p>
        )}
        {error && <p className="text-[14px] text-[var(--px-bad)]">{error}</p>}
        {locked && (
          <p className="text-[14px] text-[var(--px-gold)]">
            <FormattedMessage id={user ? 'writing.improveProFeature' : 'writing.improveSignInPro'} />
          </p>
        )}
        <textarea
          autoFocus
          value={text}
          onChange={(e) => { setText(e.target.value); if (result) setResult(null); }}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder={intl.formatMessage({ id: 'world.stelePlaceholder' })}
          className="px-inset px-notch w-full resize-none px-3 py-2.5 text-[18px] font-semibold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          {locked ? (
            <PixelButton tone="gold" className="flex-1" onClick={() => navigate('/pro')}>
              <PixelIcon name="star" size={2} /> <FormattedMessage id="world.stelePro" />
            </PixelButton>
          ) : (
            <PixelButton tone="red" className="flex-1" onClick={() => void carve()} disabled={!text.trim() || busy}>
              <PixelIcon name="sword" size={2} /> <FormattedMessage id="world.steleCarve" /> ↵
            </PixelButton>
          )}
          <PixelButton tone="paper" onClick={nextWord}><FormattedMessage id="world.steleNext" /></PixelButton>
        </div>
      </HudDock>
    </>
  );
}
