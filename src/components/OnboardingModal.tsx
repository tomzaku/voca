import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchMe } from '../lib/meApi';
import {
  fetchOnboardingPrefs,
  hasOnboarded,
  saveOnboardingPrefs,
} from '../lib/userSettings';
import { LANGUAGES, getMotherLanguage, setMotherLanguage } from '../lib/languages';
import { isKokoroSupported } from '../lib/tts';
import { setTtsEngine, setTtsVoice } from '../hooks/useTtsSettings';
import { LevelPicker } from './LevelPicker';
import { useCompanion } from '../hooks/useCompanion';
import { ANIMALS } from '../lib/companion';
import { useCollections } from '../hooks/useCollections';
import { listCollections, getCollection } from '../lib/collections';

// Kokoro's male "Fenrir" voice — the preferred default when the browser can run
// the AI model. Otherwise we fall back to the browser's built-in speech.
const FENRIR_VOICE = 'am_fenrir';

/**
 * First-run flow. After a user signs in:
 *
 * 1. If they've never seen the trial welcome (tracked locally, since it's a
 *    one-shot announcement rather than a preference), and they currently have
 *    the automatic 5-day Pro trial (`me.isTrial`), greet them with that alone
 *    — the setup step is deliberately skipped this pass.
 * 2. Otherwise, if they've never picked a vocabulary pack / mother language
 *    (checked against the DB, so it's a one-time thing across devices), ask
 *    them. The voice engine is chosen automatically: Kokoro AI (Fenrir) where
 *    supported, else the browser's native speech.
 *
 * So a brand-new user sees the welcome step on their first load and the setup
 * step on their next one, never both at once.
 */
export function OnboardingModal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const collections = listCollections();
  const [collectionId, setCollectionId] = useState<string>(() => useCollections.getState().activeId);
  const [mother, setMother] = useState<string>(getMotherLanguage);
  const [saving, setSaving] = useState(false);
  const { animalId, choose } = useCompanion();

  // 'welcome' (trial announcement) → 'setup' (pack/language/buddy) → 'test'
  // (the "find your level" side-quest launched from setup).
  const [mode, setMode] = useState<'welcome' | 'setup' | 'test'>('setup');
  const [recommended, setRecommended] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) {
      setShow(false);
      return;
    }
    let cancelled = false;
    const welcomeKey = `voca-trial-welcome-shown-${user.id}`;
    (async () => {
      let welcomeSeen = true;
      try {
        welcomeSeen = localStorage.getItem(welcomeKey) === 'true';
      } catch {
        welcomeSeen = true; // storage unavailable — fall straight through to setup
      }
      if (!welcomeSeen) {
        const me = await fetchMe();
        if (cancelled) return;
        if (me?.isTrial) {
          setMode('welcome');
          setShow(true);
          return;
        }
        // Not trial-eligible (existing account, or the call failed) — don't
        // keep re-checking `me` on every load.
        try { localStorage.setItem(welcomeKey, 'true'); } catch { /* ignore */ }
      }
      const prefs = await fetchOnboardingPrefs();
      if (!cancelled) {
        setMode('setup');
        setShow(!hasOnboarded(prefs));
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  if (!show || !user) return null;

  if (mode === 'welcome') {
    const dismiss = () => {
      try {
        if (user) localStorage.setItem(`voca-trial-welcome-shown-${user.id}`, 'true');
      } catch { /* ignore */ }
      setShow(false);
    };
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl">
          <div className="p-6 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-xl font-display font-bold text-text-primary">Welcome to Voca!</h2>
            <p className="text-sm text-text-secondary mt-2">
              You're starting with <span className="font-bold text-accent-cyan">5 days of Pro</span>, free —
              every feature unlocked, no card required.
            </p>
            <button
              onClick={dismiss}
              className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold mt-6"
            >
              Let's go
            </button>
            <button
              onClick={() => { dismiss(); navigate('/pro'); }}
              className="text-xs text-text-muted hover:text-accent-cyan transition-colors mt-3"
            >
              See what's included →
            </button>
          </div>
        </div>
      </div>
    );
  }

  const kokoro = isKokoroSupported();

  const handleSubmit = async () => {
    setSaving(true);
    const engine = kokoro ? 'kokoro' : 'native';
    const voice = kokoro ? FENRIR_VOICE : null;

    // Apply locally so the app picks it up right away.
    useCollections.getState().setActive(collectionId);
    setMotherLanguage(mother);
    setTtsEngine(engine);
    if (voice) setTtsVoice(voice);

    // Persist so we don't ask again (on this or any other device).
    await saveOnboardingPrefs({
      wordPack: collectionId,
      motherLanguage: mother,
      ttsEngine: engine,
      ttsVoice: voice,
    });
    setShow(false);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {mode === 'test' ? (
            <LevelPicker
              onBack={() => setMode('setup')}
              onDone={({ collectionId: rec }) => {
                setCollectionId(rec);
                setRecommended(rec);
                setMode('setup');
              }}
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
                onClick={() => setMode('test')}
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
                  <span className="font-bold text-accent-cyan">{getCollection(recommended).name}</span>.
                  You can change it below.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              {collections.map((c) => {
                const active = collectionId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCollectionId(c.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                      active
                        ? 'border-accent-cyan/50 bg-accent-cyan/10'
                        : 'border-border bg-bg-tertiary hover:border-border-light'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-bold ${active ? 'text-accent-cyan' : 'text-text-primary'}`}>
                        {c.name}
                      </span>
                      {active && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent-cyan">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{c.description}</p>
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

          {/* Companion */}
          <div className="mb-6">
            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">
              Pick a learning buddy
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ANIMALS.map((a) => {
                const active = animalId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => choose(a.id)}
                    className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all ${
                      active ? 'border-accent-cyan bg-accent-cyan/10' : 'border-border bg-bg-tertiary hover:border-border-light'
                    }`}
                  >
                    <span className="text-2xl">{a.emoji}</span>
                    <span className={`text-[11px] font-bold ${active ? 'text-accent-cyan' : 'text-text-muted'}`}>{a.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-1.5">It grows as you learn. Change it anytime.</p>
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
            disabled={saving || !animalId}
            className="btn-3d w-full py-3 bg-accent-cyan text-bg-primary font-bold disabled:opacity-60"
          >
            {saving ? 'Saving…' : animalId ? 'Get started' : 'Pick a buddy to continue'}
          </button>
          </>
          )}
        </div>
      </div>
    </div>
  );
}

