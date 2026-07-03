import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchOnboardingPrefs,
  hasOnboarded,
  saveOnboardingPrefs,
} from '../lib/userSettings';
import { WORD_PACKS, getWordPack, setWordPack, type PackId } from '../lib/wordLists';
import { LANGUAGES, getMotherLanguage, setMotherLanguage } from '../lib/languages';
import { isKokoroSupported } from '../lib/tts';
import { setTtsEngine, setTtsVoice } from '../hooks/useTtsSettings';
import { buildPlacementTest, scorePlacement, type TestWord } from '../lib/placementTest';

// Kokoro's male "Fenrir" voice — the preferred default when the browser can run
// the AI model. Otherwise we fall back to the browser's built-in speech.
const FENRIR_VOICE = 'am_fenrir';

/**
 * First-run onboarding. After a user signs in, if they've never picked a
 * vocabulary pack / mother language (checked against the DB, so it's a one-time
 * thing across devices), ask them. The voice engine is chosen automatically:
 * Kokoro AI (Fenrir) where supported, else the browser's native speech.
 */
export function OnboardingModal() {
  const { user, loading } = useAuth();
  const [show, setShow] = useState(false);
  const [pack, setPack] = useState<PackId>(getWordPack);
  const [mother, setMother] = useState<string>(getMotherLanguage);
  const [saving, setSaving] = useState(false);

  // Placement test ("Find your level").
  const [mode, setMode] = useState<'setup' | 'test'>('setup');
  const [testWords, setTestWords] = useState<TestWord[]>([]);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [recommended, setRecommended] = useState<PackId | null>(null);

  const startTest = () => {
    setTestWords(buildPlacementTest());
    setKnown(new Set());
    setMode('test');
  };

  const toggleKnown = (word: string) => {
    setKnown((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word); else next.add(word);
      return next;
    });
  };

  const finishTest = () => {
    const { pack: rec } = scorePlacement(known, testWords);
    setPack(rec);
    setRecommended(rec);
    setMode('setup');
  };

  useEffect(() => {
    if (loading || !user) {
      setShow(false);
      return;
    }
    let cancelled = false;
    fetchOnboardingPrefs(user.id).then((prefs) => {
      if (!cancelled) setShow(!hasOnboarded(prefs));
    });
    return () => { cancelled = true; };
  }, [user, loading]);

  if (!show || !user) return null;

  const kokoro = isKokoroSupported();

  const handleSubmit = async () => {
    setSaving(true);
    const engine = kokoro ? 'kokoro' : 'native';
    const voice = kokoro ? FENRIR_VOICE : null;

    // Apply locally so the app (which reads localStorage) picks it up right away.
    setWordPack(pack);
    setMotherLanguage(mother);
    setTtsEngine(engine);
    if (voice) setTtsVoice(voice);

    // Persist so we don't ask again (on this or any other device).
    await saveOnboardingPrefs(user.id, {
      word_pack: pack,
      mother_language: mother,
      tts_engine: engine,
      tts_voice: voice,
    });
    setShow(false);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {mode === 'test' ? (
            <PlacementTestView
              words={testWords}
              known={known}
              onToggle={toggleKnown}
              onBack={() => setMode('setup')}
              onFinish={finishTest}
            />
          ) : (
          <>
          <h2 className="text-xl font-display font-bold text-text-primary">Welcome to Voca 👋</h2>
          <p className="text-sm text-text-muted mt-1 mb-6">
            Let's set up your learning. You can change these anytime in Settings.
          </p>

          {/* Vocabulary pack / level */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Your level
              </label>
              <button
                onClick={startTest}
                className="text-xs font-bold text-accent-cyan hover:underline"
              >
                Not sure? Find your level →
              </button>
            </div>
            {recommended && (
              <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20">
                <span className="text-sm leading-none mt-0.5">✨</span>
                <p className="text-xs text-text-secondary">
                  Based on your test, we suggest{' '}
                  <span className="font-bold text-accent-cyan">
                    {WORD_PACKS.find((p) => p.id === recommended)?.label}
                  </span>. You can change it below.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              {WORD_PACKS.map((p) => {
                const active = pack === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPack(p.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      active
                        ? 'border-accent-cyan/50 bg-accent-cyan/10'
                        : 'border-border bg-bg-tertiary hover:border-border-light'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}>
                        {p.label}
                      </span>
                      {active && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent-cyan">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{p.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mother language */}
          <div className="mb-6">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Mother language
            </label>
            <select
              value={mother}
              onChange={(e) => setMother(e.target.value)}
              className="select-field w-full bg-bg-tertiary border border-border rounded-lg pl-3 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-cyan/50 cursor-pointer"
            >
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <p className="text-xs text-text-muted mt-1.5">Used for translations.</p>
          </div>

          {/* Voice (auto) */}
          <div className="mb-6 flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-bg-tertiary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-accent-purple">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            <p className="text-xs text-text-secondary">
              Voice: <span className="font-bold text-text-primary">
                {kokoro ? 'Fenrir (Kokoro AI)' : 'Browser voice'}
              </span>
              <span className="block text-text-muted mt-0.5">
                {kokoro
                  ? 'High-quality AI voice, ready on this browser.'
                  : "Your browser doesn't support the AI voice — using the built-in one."}
              </span>
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Get started'}
          </button>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlacementTestView({
  words,
  known,
  onToggle,
  onBack,
  onFinish,
}: {
  words: TestWord[];
  known: Set<string>;
  onToggle: (word: string) => void;
  onBack: () => void;
  onFinish: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-xs font-bold text-text-muted hover:text-text-primary mb-3"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <h2 className="text-xl font-display font-bold text-text-primary">Find your level</h2>
      <p className="text-sm text-text-muted mt-1 mb-5">
        Tap every word you know. We'll pick a starting pack for you.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {words.map((t) => {
          const sel = known.has(t.word);
          return (
            <button
              key={t.word}
              onClick={() => onToggle(t.word)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-bold transition-all ${
                sel
                  ? 'border-accent-cyan/50 bg-accent-cyan/15 text-accent-cyan'
                  : 'border-border bg-bg-tertiary text-text-primary hover:border-border-light'
              }`}
            >
              {t.word}
            </button>
          );
        })}
      </div>

      <button
        onClick={onFinish}
        className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold"
      >
        See my level{known.size > 0 ? ` (${known.size} known)` : ''}
      </button>
    </div>
  );
}
