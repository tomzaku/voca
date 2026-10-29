import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocale, LOCALES } from '../i18n/locale';
import { useTtsSettings, KOKORO_VOICES, PIPER_VOICES, type TtsEngine, type TtsEnginePref, type TtsVoice } from '../hooks/useTtsSettings';
import { isHeavyFor } from '../lib/deviceTier';
import { isKokoroSupported, speakText, stopSpeaking } from '../lib/tts';

// The two preferences people change mid-session — what the app speaks in and
// what voice reads words aloud — one tap from any page, so trying a voice on
// the word in front of you doesn't mean a trip to Settings and back. Settings
// still owns the full set (speed, per-voice previews).

const ENGINES: { id: TtsEnginePref; labelId: string }[] = [
  { id: 'auto', labelId: 'quickPrefs.engineAuto' },
  { id: 'native', labelId: 'quickPrefs.engineNative' },
  { id: 'piper', labelId: 'quickPrefs.enginePiper' },
  { id: 'kokoro', labelId: 'quickPrefs.engineKokoro' },
];

const GROUPS: { accent: TtsVoice['accent']; gender: TtsVoice['gender']; labelId: string }[] = [
  { accent: 'American', gender: 'Female', labelId: 'settings.voiceAmericanFemale' },
  { accent: 'American', gender: 'Male', labelId: 'settings.voiceAmericanMale' },
  { accent: 'British', gender: 'Female', labelId: 'settings.voiceBritishFemale' },
  { accent: 'British', gender: 'Male', labelId: 'settings.voiceBritishMale' },
];

const ENGINE_NAME_ID: Record<TtsEngine, string> = {
  native: 'quickPrefs.engineNative',
  piper: 'quickPrefs.enginePiper',
  kokoro: 'quickPrefs.engineKokoro',
};

// Learning content, so English in every UI language.
const SAMPLE = 'The word "serendipity" means happy accident.';

export function QuickPrefs() {
  const intl = useIntl();
  const { locale, setLocale } = useLocale();
  const { enginePref, engine, recommended, setEngine, voice, setVoice, piperVoice, setPiperVoice } = useTtsSettings();
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // A click-away backdrop can't be used here: the header's backdrop-blur makes
  // it the containing block for `fixed`, so the backdrop would only cover the
  // header. Listen on the document instead.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const kokoroOk = isKokoroSupported();
  const isKokoro = engine === 'kokoro';
  const voices = isKokoro ? KOKORO_VOICES : PIPER_VOICES;
  const currentVoice = isKokoro ? voice : piperVoice;

  const preview = async () => {
    if (previewing) { stopSpeaking(); setPreviewing(false); return; }
    stopSpeaking();
    setPreviewing(true);
    try {
      await speakText(SAMPLE, {
        voice: engine === 'native' ? undefined : currentVoice,
        onEnd: () => setPreviewing(false),
      });
    } catch {
      setPreviewing(false);
    }
  };

  const pickVoice = (id: string) => {
    stopSpeaking();
    setPreviewing(false);
    (isKokoro ? setVoice : setPiperVoice)(id);
  };

  const pickEngine = (id: TtsEnginePref) => {
    stopSpeaking();
    setPreviewing(false);
    setEngine(id);
  };

  const label = intl.formatMessage({ id: 'quickPrefs.title' });

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={label}
        className="btn-3d flex items-center gap-1 h-9 pl-2.5 pr-3 rounded-full bg-bg-card text-text-secondary hover:text-text-primary"
      >
        <Icon icon={LOCALES.find((l) => l.id === locale)?.flag ?? 'lucide:languages'} className="text-base" />
        <span className="text-xs font-extrabold uppercase">{locale}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute right-0 top-full mt-2 z-40 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border-2 border-border bg-bg-card shadow-xl p-3 animate-fade-in"
        >
          <h3 className="text-[11px] font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">
            <FormattedMessage id="settings.uiLanguage" />
          </h3>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {LOCALES.map((l) => {
              const on = locale === l.id;
              return (
                <button
                  key={l.id}
                  type="button"
                  lang={l.id}
                  aria-pressed={on}
                  onClick={() => setLocale(l.id)}
                  className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border-2 text-xs font-bold transition-colors ${
                    on ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' : 'border-border text-text-secondary hover:border-border-light'
                  }`}
                >
                  <Icon icon={l.flag} className="text-base shrink-0" />
                  {l.label}
                </button>
              );
            })}
          </div>

          <h3 className="text-[11px] font-display font-bold text-text-muted uppercase tracking-wider mb-1.5">
            <FormattedMessage id="settings.voice" />
          </h3>
          <div className="grid grid-cols-4 gap-1">
            {ENGINES.map((e) => {
              const on = enginePref === e.id;
              const disabled = e.id === 'kokoro' && !kokoroOk;
              const heavy = e.id !== 'auto' && isHeavyFor(e.id, recommended);
              const title = disabled
                ? intl.formatMessage({ id: 'quickPrefs.kokoroUnavailable' })
                : heavy ? intl.formatMessage({ id: 'quickPrefs.heavy' }) : undefined;
              return (
                <button
                  key={e.id}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  title={title}
                  onClick={() => pickEngine(e.id)}
                  className={`relative px-1 py-1.5 rounded-lg border-2 text-[11px] font-bold truncate transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    on ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' : 'border-border text-text-secondary hover:border-border-light'
                  }`}
                >
                  {e.id === 'auto' && <Icon icon="lucide:sparkles" className="inline text-[10px] mr-0.5 -mt-0.5" />}
                  <FormattedMessage id={e.labelId} />
                  {heavy && !disabled && (
                    <Icon icon="lucide:triangle-alert" className="absolute -top-1.5 -right-1.5 text-xs text-accent-orange bg-bg-card rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          {/* Say what Auto settled on, or why a hand-picked engine may struggle —
              the whole point is not to discover that by the page freezing. */}
          <p className={`text-[11px] leading-snug mt-1.5 mb-2 ${enginePref !== 'auto' && isHeavyFor(engine, recommended) ? 'text-accent-orange' : 'text-text-muted'}`}>
            {enginePref === 'auto' ? (
              <FormattedMessage id="quickPrefs.autoUsing" values={{ engine: intl.formatMessage({ id: ENGINE_NAME_ID[engine] }) }} />
            ) : isHeavyFor(engine, recommended) ? (
              <FormattedMessage id="quickPrefs.heavyWarning" values={{ engine: intl.formatMessage({ id: ENGINE_NAME_ID[recommended] }) }} />
            ) : null}
          </p>

          <div className="flex items-center gap-1.5">
            {engine === 'native' ? (
              <p className="flex-1 text-[11px] text-text-muted leading-snug">
                <FormattedMessage id="quickPrefs.nativeHint" />
              </p>
            ) : (
              <select
                value={currentVoice}
                onChange={(e) => pickVoice(e.target.value)}
                aria-label={intl.formatMessage({ id: 'settings.voice' })}
                className="select-field flex-1 min-w-0 bg-bg-primary border border-border rounded-lg pl-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-cyan/50 cursor-pointer"
              >
                {GROUPS.map((g) => {
                  const list = voices.filter((v) => v.accent === g.accent && v.gender === g.gender);
                  if (!list.length) return null;
                  return (
                    <optgroup key={g.labelId} label={intl.formatMessage({ id: g.labelId })}>
                      {list.map((v) => <option key={v.id} value={v.id}>{v.name} · {v.grade}</option>)}
                    </optgroup>
                  );
                })}
              </select>
            )}
            <button
              type="button"
              onClick={preview}
              aria-label={intl.formatMessage({ id: previewing ? 'quickPrefs.stop' : 'quickPrefs.preview' })}
              title={intl.formatMessage({ id: previewing ? 'quickPrefs.stop' : 'quickPrefs.preview' })}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 transition-colors ${
                previewing
                  ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                  : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
              }`}
            >
              <Icon icon={previewing ? 'lucide:square' : 'lucide:volume-2'} className="text-sm" />
            </button>
          </div>

          <Link
            to="/settings"
            onClick={() => setOpen(false)}
            className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs font-bold text-text-muted hover:text-accent-cyan"
          >
            <FormattedMessage id="quickPrefs.allSettings" />
            <Icon icon="lucide:chevron-right" className="text-sm" />
          </Link>
        </div>
      )}
    </div>
  );
}
