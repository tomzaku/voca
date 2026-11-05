import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useTheme, type Theme } from '../hooks/useTheme';
import { useFestive } from '../hooks/useFestive';
import { FESTIVE_MODES, nextLunarNewYear } from '../lib/festive';
import { useTtsSettings, KOKORO_VOICES, PIPER_VOICES, type TtsEngine, type TtsEnginePref } from '../hooks/useTtsSettings';
import { isHeavyFor } from '../lib/deviceTier';
import { speakText, stopSpeaking } from '../lib/tts';
import { isSfxEnabled, setSfxEnabled, playCorrect } from '../lib/sfx';
import { ToggleSwitch } from './ToggleSwitch';
import { Tabs } from './Tabs';
import { CloudVoicePicker } from './CloudVoicePicker';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocale, LOCALES } from '../i18n/locale';
import {
  LANGUAGES,
  getLearnLanguage,
  setLearnLanguage,
  getMotherLanguage,
  setMotherLanguage,
} from '../lib/languages';
import { GUESS_GAMES, useGuessGame } from '../hooks/useGuessGame';
import { useGameMode } from '../hooks/useGameMode';
import { useCollections } from '../hooks/useCollections';
import { listCollections, getCollection } from '../lib/collections';
import { clearPrefetchQueue } from '../lib/prefetchService';
import { useAuth } from '../hooks/useAuth';
import { GOAL_OPTIONS, useDailyGoal } from '../hooks/useDailyGoal';
import { useVocabularyStore } from '../hooks/useVocabulary';
import toast from 'react-hot-toast';
import type { ReactNode } from 'react';

const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);

// Labels are message ids, formatted at render time so the language can change.
const THEMES: { id: Theme; labelId: string; descId: string; icon: string }[] = [
  { id: 'light', labelId: 'settings.themeLight', descId: 'settings.themeLightDesc', icon: 'lucide:sun' },
  { id: 'dark', labelId: 'settings.themeDark', descId: 'settings.themeDarkDesc', icon: 'lucide:moon' },
];

const engines: { id: TtsEnginePref; labelId: string; descId: string; badgeId?: string }[] = [
  { id: 'auto', labelId: 'settings.engineAuto', descId: 'settings.engineAutoDesc', badgeId: 'settings.badgeRecommended' },
  { id: 'native', labelId: 'settings.engineNative', descId: 'settings.engineNativeDesc', badgeId: 'settings.badgeFast' },
  { id: 'cloud', labelId: 'settings.engineCloud', descId: 'settings.engineCloudDesc', badgeId: 'settings.badgeMobile' },
  { id: 'piper', labelId: 'settings.enginePiper', descId: 'settings.enginePiperDesc', badgeId: 'settings.badgeSafari' },
  {
    id: 'kokoro',
    labelId: 'settings.engineKokoro',
    descId: isSafari ? 'settings.engineKokoroDescSafari' : 'settings.engineKokoroDesc',
    badgeId: isSafari ? 'settings.badgeUnavailable' : 'settings.badgeBestVoice',
  },
];

const ENGINE_NAME_ID: Record<TtsEngine, string> = {
  native: 'settings.engineNative',
  cloud: 'settings.engineCloud',
  piper: 'settings.enginePiper',
  kokoro: 'settings.engineKokoro',
};

const gradeColor: Record<string, string> = {
  'A': 'text-green-400', 'A-': 'text-green-400',
  'B': 'text-blue-400', 'B-': 'text-blue-400',
  'C+': 'text-yellow-400', 'C': 'text-yellow-400', 'C-': 'text-yellow-400',
  'D+': 'text-orange-400', 'D': 'text-orange-400', 'D-': 'text-orange-400',
  'F+': 'text-red-400',
};


// The page is four tabs rather than one long scroll: a learner looking for
// "daily goal" shouldn't have to scroll past voice engines and festive lanterns
// to find it. The tab is in the URL (?tab=sound) so a link can open one.
const TABS = [
  { value: 'learning', labelId: 'settings.tabLearning', icon: 'lucide:graduation-cap' },
  { value: 'sound', labelId: 'settings.tabSound', icon: 'lucide:volume-2' },
  { value: 'look', labelId: 'settings.tabLook', icon: 'lucide:palette' },
  { value: 'account', labelId: 'settings.tabAccount', icon: 'lucide:user-round' },
] as const;
type SettingsTab = (typeof TABS)[number]['value'];
const isTab = (v: string | null): v is SettingsTab => TABS.some((t) => t.value === v);

function Section({ title, hint, children }: { title: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className={`text-sm font-display font-bold text-text-secondary uppercase tracking-wider ${hint ? 'mb-1' : 'mb-3'}`}>{title}</h2>
      {hint && <p className="text-xs text-text-muted mb-3">{hint}</p>}
      {children}
    </section>
  );
}

/** A row of mutually exclusive options — the compact form of the old card grids. */
function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T;
  options: { value: T; label: ReactNode; icon?: string; sub?: ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1 p-1 rounded-xl bg-bg-tertiary">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`flex-1 min-w-[4.5rem] flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
              on ? 'bg-bg-card text-accent-cyan shadow-sm' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {o.icon && <Icon icon={o.icon} className="text-base" />}
              {o.label}
            </span>
            {o.sub && <span className="text-[10px] font-medium opacity-80">{o.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({ title, hint, checked, onToggle }: { title: ReactNode; hint: ReactNode; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all cursor-pointer"
    >
      <div className="flex-1 text-left">
        <span className="text-sm font-medium text-text-primary block">{title}</span>
        <span className="text-xs text-text-muted mt-0.5 block">{hint}</span>
      </div>
      <ToggleSwitch checked={checked} />
    </button>
  );
}

/** Sits at the top of every tab for a visitor: everything here works signed
 *  out, but only on this device — worth saying before they set it all up. */
function GuestNote({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3 p-3 rounded-xl border border-accent-green/30 bg-accent-green/5">
      <Icon icon="lucide:hard-drive" className="text-lg text-accent-green shrink-0" />
      <p className="flex-1 text-xs text-text-secondary"><FormattedMessage id="settings.guestNote" /></p>
      <button onClick={onSignIn} className="btn-3d shrink-0 px-3 py-1.5 rounded-lg bg-accent-green text-bg-primary text-xs font-bold">
        <FormattedMessage id="navbar.signIn" />
      </button>
    </div>
  );
}

export function SettingsPage() {
  const intl = useIntl();
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab: SettingsTab = isTab(tabParam) ? tabParam : 'learning';
  const setTab = (t: SettingsTab) => setParams(t === 'learning' ? {} : { tab: t }, { replace: true });
  const { theme, setTheme } = useTheme();
  const { mode: festiveMode, active: festiveOn, setMode: setFestiveMode } = useFestive();
  const [nextTet] = useState(() => nextLunarNewYear(new Date()));
  const { enginePref, engine, recommended, setEngine, voice, setVoice, piperVoice, setPiperVoice, speed, setSpeed } = useTtsSettings();
  const { user, signInWithGoogle, signOut } = useAuth();
  const dailyGoal = useDailyGoal((s) => s.goal);
  const setDailyGoal = useDailyGoal((s) => s.setGoal);
  const store = useVocabularyStore();

  const { game: guessGame, setGame: setGuessGame } = useGuessGame();

  const gameEnabled = useGameMode((s) => s.enabled);
  const setGameEnabled = useGameMode((s) => s.setEnabled);

  const [previewState, setPreviewState] = useState<{ id: string; phase: 'loading' | 'playing' } | null>(null);
  const activeCollection = useCollections((s) => s.activeId);
  const setActiveCollection = useCollections((s) => s.setActive);
  const collections = listCollections('level');

  const { locale, setLocale } = useLocale();
  const [learnLang, setLearnLangState] = useState(getLearnLanguage);
  const [motherLang, setMotherLangState] = useState(getMotherLanguage);
  const [sfxOn, setSfxOn] = useState(isSfxEnabled);
  const [autoSpeakOn, setAutoSpeakOn] = useState(
    () => localStorage.getItem('voca-auto-speak') === 'true',
  );

  const handleLearnLangChange = (lang: string) => {
    setLearnLanguage(lang);
    setLearnLangState(lang);
    clearPrefetchQueue(); // upcoming words are generated in the new language
    toast.success(intl.formatMessage({ id: 'settings.learningToast' }, { lang }));
  };

  const handleMotherLangChange = (lang: string) => {
    setMotherLanguage(lang);
    setMotherLangState(lang);
    clearPrefetchQueue(); // translations are regenerated for the new language
    toast.success(intl.formatMessage({ id: 'settings.translationsToast' }, { lang }));
  };

  const handlePackChange = (id: string) => {
    setActiveCollection(id);
    clearPrefetchQueue();
    toast.success(intl.formatMessage({ id: 'settings.switchedToast' }, { name: getCollection(id).name }));
  };

  const preview = async (voiceId: string) => {
    stopSpeaking();
    setPreviewState({ id: voiceId, phase: 'loading' });
    try {
      await speakText('The word "serendipity" means happy accident. What a beautiful discovery!', {
        voice: voiceId,
        onStart: () => setPreviewState({ id: voiceId, phase: 'playing' }),
        onEnd: () => setPreviewState(null),
      });
    } catch {
      setPreviewState(null);
    }
  };

  const stopPreview = () => { stopSpeaking(); setPreviewState(null); };

  const handleResetProgress = () => {
    if (!confirm(intl.formatMessage({ id: 'settings.resetConfirm' }))) return;
    localStorage.removeItem('voca-progress');
    window.location.reload();
  };

  const activeEntry = getCollection(activeCollection);
  const selectedGame = GUESS_GAMES.find((g) => g.id === guessGame) ?? GUESS_GAMES[0];

  const voicePicker = (engine === 'kokoro' || engine === 'piper') && (() => {
    const isKokoro = engine === 'kokoro';
    const voices = isKokoro ? KOKORO_VOICES : PIPER_VOICES;
    const currentVoice = isKokoro ? voice : piperVoice;
    const setCurrentVoice = isKokoro ? setVoice : setPiperVoice;
    const voiceGroups = [
      { labelId: 'settings.voiceAmericanFemale', voices: voices.filter((v) => v.accent === 'American' && v.gender === 'Female') },
      { labelId: 'settings.voiceAmericanMale', voices: voices.filter((v) => v.accent === 'American' && v.gender === 'Male') },
      { labelId: 'settings.voiceBritishFemale', voices: voices.filter((v) => v.accent === 'British' && v.gender === 'Female') },
      { labelId: 'settings.voiceBritishMale', voices: voices.filter((v) => v.accent === 'British' && v.gender === 'Male') },
    ].filter((g) => g.voices.length > 0);

    return (
      <div className="mt-5">
        <h3 className="text-xs font-bold text-text-secondary mb-1"><FormattedMessage id="settings.voice" /></h3>
        <p className="text-xs text-text-muted mb-3"><FormattedMessage id="settings.voiceHint" values={{ engine: isKokoro ? 'Kokoro' : 'Piper' }} /></p>
        <div className="space-y-4">
          {voiceGroups.map((group) => (
            <div key={group.labelId}>
              <h4 className="text-xs font-medium text-text-muted mb-2"><FormattedMessage id={group.labelId} /></h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.voices.map((v) => {
                  const selected = currentVoice === v.id;
                  const isLoading = previewState?.id === v.id && previewState.phase === 'loading';
                  const isPlaying = previewState?.id === v.id && previewState.phase === 'playing';
                  return (
                    <div
                      key={v.id}
                      onClick={() => setCurrentVoice(v.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${selected ? 'bg-accent-cyan/5 border-accent-cyan/30' : 'bg-bg-card border-border hover:border-text-muted/30'}`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-accent-cyan' : 'border-text-muted/40'}`}>
                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />}
                      </span>
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`text-sm font-medium ${selected ? 'text-accent-cyan' : 'text-text-primary'}`}>{v.name}</span>
                        <span className={`text-[10px] font-code font-bold ${gradeColor[v.grade] ?? 'text-text-muted'}`}>{v.grade}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); (isPlaying || isLoading) ? stopPreview() : preview(v.id); }}
                        aria-label={v.name}
                        className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                          isPlaying || isLoading
                            ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                            : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
                        }`}
                      >
                        <Icon icon={isLoading ? 'lucide:loader-circle' : isPlaying ? 'lucide:square' : 'lucide:play'} className={`text-xs ${isLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  })();

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-4"><FormattedMessage id="settings.title" /></h1>

      <div className="overflow-x-auto -mx-4 px-4 mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          items={TABS.map((t) => ({ value: t.value, label: intl.formatMessage({ id: t.labelId }), icon: t.icon }))}
        />
      </div>

      {!user && tab !== 'account' && <GuestNote onSignIn={signInWithGoogle} />}

      {tab === 'learning' && (
        <>
          <Section title={<FormattedMessage id="settings.dailyGoal" />} hint={<FormattedMessage id="settings.dailyGoalHint" />}>
            <Segmented
              label={intl.formatMessage({ id: 'settings.dailyGoal' })}
              value={dailyGoal}
              onChange={setDailyGoal}
              options={GOAL_OPTIONS.map((n) => ({ value: n, label: n, sub: <FormattedMessage id={`flashcard.start.goal${n}`} /> }))}
            />
          </Section>

          <Section title={<FormattedMessage id="settings.collection" />} hint={<FormattedMessage id="settings.collectionHint" />}>
            <div className="flex items-center gap-3 p-3 mb-3 rounded-lg border border-border bg-bg-card">
              <Icon icon={activeEntry.icon ?? 'lucide:library'} className="text-xl text-accent-cyan shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-text-primary truncate">{activeEntry.name}</p>
                <p className="text-xs text-text-muted truncate">{activeEntry.description}</p>
              </div>
              <Link to="/collections" className="shrink-0 text-xs font-bold text-accent-cyan hover:underline">
                <FormattedMessage id="settings.browseTopics" />
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {collections.map((c) => {
                const on = activeCollection === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    title={c.description}
                    onClick={() => handlePackChange(c.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                      on ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' : 'border-border bg-bg-card text-text-secondary hover:border-border-light'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title={<FormattedMessage id="settings.guessGame" />} hint={<FormattedMessage id="settings.guessGameHint" />}>
            <div className="flex flex-wrap gap-1.5">
              {GUESS_GAMES.map((g) => {
                const on = guessGame === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setGuessGame(g.id);
                      toast.success(intl.formatMessage({ id: 'settings.defaultGameToast' }, { game: intl.formatMessage({ id: g.labelId }) }));
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-colors ${
                      on ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan' : 'border-border bg-bg-card text-text-secondary hover:border-border-light'
                    }`}
                  >
                    <Icon icon={g.icon} className="text-sm" />
                    <FormattedMessage id={g.labelId} />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-text-muted mt-2"><FormattedMessage id={selectedGame.descriptionId} /></p>
          </Section>

          <Section title={<FormattedMessage id="settings.languages" />} hint={<FormattedMessage id="settings.languagesHint" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5"><FormattedMessage id="settings.learnLanguage" /></label>
                <select
                  value={learnLang}
                  onChange={(e) => handleLearnLangChange(e.target.value)}
                  className="select-field w-full bg-bg-card border border-border rounded-lg pl-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan/50 cursor-pointer"
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5"><FormattedMessage id="settings.motherLanguage" /></label>
                <select
                  value={motherLang}
                  onChange={(e) => handleMotherLangChange(e.target.value)}
                  className="select-field w-full bg-bg-card border border-border rounded-lg pl-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan/50 cursor-pointer"
                >
                  {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </Section>
        </>
      )}

      {tab === 'sound' && (
        <>
          <div className="mb-7">
            <div className="space-y-2">
              <ToggleRow
                title={<FormattedMessage id="settings.speakAutomatically" />}
                hint={<FormattedMessage id="settings.speakAutomaticallyHint" />}
                checked={autoSpeakOn}
                onToggle={() => {
                  const next = !autoSpeakOn;
                  localStorage.setItem('voca-auto-speak', String(next));
                  setAutoSpeakOn(next);
                  toast.success(intl.formatMessage({ id: next ? 'settings.autoSpeakOn' : 'settings.autoSpeakOff' }));
                }}
              />
              <ToggleRow
                title={<FormattedMessage id="settings.gameSounds" />}
                hint={<FormattedMessage id="settings.gameSoundsHint" />}
                checked={sfxOn}
                onToggle={() => {
                  const next = !sfxOn;
                  setSfxEnabled(next);
                  setSfxOn(next);
                  if (next) playCorrect(); // preview the sound when turning it on
                  toast.success(intl.formatMessage({ id: next ? 'settings.sfxOn' : 'settings.sfxOff' }));
                }}
              />
            </div>
          </div>

          <Section title={<FormattedMessage id="settings.playbackSpeed" />}>
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-muted w-8 text-right">0.5x</span>
              <input
                type="range" min="0.5" max="2" step="0.1" value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                aria-label={intl.formatMessage({ id: 'settings.playbackSpeed' })}
                className="flex-1 h-1.5 accent-accent-cyan cursor-pointer"
              />
              <span className="text-xs text-text-muted w-8">2x</span>
              <span className="text-sm font-code font-medium text-accent-cyan w-12 text-center">{speed.toFixed(1)}x</span>
            </div>
          </Section>

          {/* Engines and voices are for the curious — "Automatic" is right for
              nearly everyone, so the list waits behind a disclosure. Opened
              already when someone has picked an engine by hand. */}
          <details className="group mb-7 rounded-xl border border-border bg-bg-card" open={enginePref !== 'auto'}>
            <summary className="flex items-center gap-3 p-4 cursor-pointer list-none">
              <Icon icon="lucide:audio-lines" className="text-lg text-text-muted shrink-0" />
              <span className="flex-1">
                <span className="block text-sm font-medium text-text-primary"><FormattedMessage id="settings.advancedVoice" /></span>
                <span className="block text-xs text-text-muted">
                  <FormattedMessage id="settings.advancedVoiceHint" values={{ engine: intl.formatMessage({ id: ENGINE_NAME_ID[engine] }) }} />
                </span>
              </span>
              <Icon icon="lucide:chevron-down" className="text-text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-4 pb-4">
              <div className="space-y-2">
                {engines.map((e) => {
                  const disabled = e.id === 'kokoro' && isSafari;
                  const on = enginePref === e.id;
                  const heavy = !disabled && e.id !== 'auto' && isHeavyFor(e.id, recommended);
                  return (
                    <button
                      key={e.id}
                      onClick={() => !disabled && setEngine(e.id)}
                      disabled={disabled}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        disabled
                          ? 'opacity-40 cursor-not-allowed bg-bg-card border-border'
                          : on
                            ? 'bg-accent-cyan/5 border-accent-cyan/30 ring-1 ring-accent-cyan/20 cursor-pointer'
                            : 'bg-bg-card border-border hover:border-text-muted/30 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'border-accent-cyan' : 'border-text-muted/40'}`}>
                          {on && <span className="w-2 h-2 rounded-full bg-accent-cyan" />}
                        </span>
                        <span className={`text-sm font-medium ${on ? 'text-accent-cyan' : 'text-text-primary'}`}><FormattedMessage id={e.labelId} /></span>
                        {e.badgeId && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${on ? 'bg-accent-cyan/15 text-accent-cyan' : 'bg-bg-tertiary text-text-muted'}`}>
                            <FormattedMessage id={e.badgeId} />
                          </span>
                        )}
                        {heavy && (
                          <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-orange/10 text-accent-orange">
                            <Icon icon="lucide:triangle-alert" className="text-[11px]" />
                            <FormattedMessage id="settings.badgeHeavy" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted ml-7">
                        <FormattedMessage id={e.descId} values={{ engine: intl.formatMessage({ id: ENGINE_NAME_ID[engine] }) }} />
                      </p>
                    </button>
                  );
                })}
              </div>
              {engine === 'cloud' && <div className="mt-5"><CloudVoicePicker /></div>}
              {voicePicker}
            </div>
          </details>
        </>
      )}

      {tab === 'look' && (
        <>
          <Section title={<FormattedMessage id="settings.uiLanguage" />}>
            <Segmented
              label={intl.formatMessage({ id: 'settings.uiLanguage' })}
              value={locale}
              onChange={setLocale}
              options={LOCALES.map((l) => ({ value: l.id, label: l.label, icon: l.flag }))}
            />
          </Section>

          <Section title={<FormattedMessage id="settings.theme" />}>
            <Segmented
              label={intl.formatMessage({ id: 'settings.theme' })}
              value={theme}
              onChange={(id) => setTheme(id)}
              options={THEMES.map((t) => ({ value: t.id, label: <FormattedMessage id={t.labelId} />, icon: t.icon }))}
            />
          </Section>

          <Section
            title={<FormattedMessage id="settings.festive" />}
            hint={<FormattedMessage
              id="settings.festiveHint"
              values={{ date: nextTet ? intl.formatDate(nextTet, { day: 'numeric', month: 'long', year: 'numeric' }) : '—' }}
            />}
          >
            <Segmented
              label={intl.formatMessage({ id: 'settings.festive' })}
              value={festiveMode}
              onChange={setFestiveMode}
              options={FESTIVE_MODES.map((m) => ({
                value: m,
                label: <FormattedMessage id={`settings.festive.${m}`} />,
                icon: m === 'auto' ? 'lucide:calendar-heart' : m === 'on' ? 'game-icons:paper-lantern' : 'lucide:circle-off',
              }))}
            />
            <p className="text-xs text-text-muted mt-2">
              <FormattedMessage id={festiveOn ? 'settings.festiveNowOn' : 'settings.festiveNowOff'} />
            </p>
          </Section>

          <Section title={<FormattedMessage id="settings.worldGame" />}>
            <ToggleRow
              title={<FormattedMessage id="settings.enableWorldGame" />}
              hint={<FormattedMessage id="settings.worldGameHint" />}
              checked={gameEnabled}
              onToggle={() => {
                const next = !gameEnabled;
                setGameEnabled(next);
                toast.success(intl.formatMessage({ id: next ? 'settings.worldGameOn' : 'settings.worldGameOff' }));
              }}
            />
          </Section>
        </>
      )}

      {tab === 'account' && (
        <>
          <Section title={<FormattedMessage id="settings.account" />}>
            {user ? (
              <div className="p-4 rounded-lg border border-border bg-bg-card flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{user.email}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    <FormattedMessage
                      id="settings.accountStats"
                      values={{ known: store.knownWords().size, saved: store.bookmarkedWords().length }}
                    />
                  </p>
                </div>
                <button
                  onClick={signOut}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-colors"
                >
                  <FormattedMessage id="settings.signOut" />
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-border bg-bg-card">
                <p className="text-sm text-text-secondary mb-3"><FormattedMessage id="settings.signInPrompt" /></p>
                <button
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <FormattedMessage id="auth.continueGoogle" />
                </button>
              </div>
            )}
          </Section>

          <Section title={<FormattedMessage id="settings.data" />}>
            <button
              onClick={handleResetProgress}
              className="w-full p-4 rounded-lg border border-accent-red/20 bg-accent-red/5 text-accent-red text-sm font-medium hover:bg-accent-red/10 transition-colors cursor-pointer text-left"
            >
              <FormattedMessage id="settings.resetProgress" />
              <span className="block text-xs font-normal text-accent-red/60 mt-0.5"><FormattedMessage id="settings.resetProgressHint" /></span>
            </button>
          </Section>

          {/* Developer tools — kept, but folded away from learners. */}
          <details className="group mb-7">
            <summary className="flex items-center gap-1.5 text-xs font-bold text-text-muted cursor-pointer list-none">
              <Icon icon="lucide:chevron-right" className="transition-transform group-open:rotate-90" />
              <FormattedMessage id="settings.developer" />
            </summary>
            <Link
              to="/debug/network"
              className="mt-3 w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all"
            >
              <div className="flex-1 text-left">
                <span className="text-sm font-medium text-text-primary block"><FormattedMessage id="settings.networkDebug" /></span>
                <span className="text-xs text-text-muted mt-0.5 block"><FormattedMessage id="settings.networkDebugHint" /></span>
              </div>
              <Icon icon="lucide:chevron-right" className="text-text-muted shrink-0" />
            </Link>
          </details>

          <p className="text-xs text-text-muted/50 text-center mt-8">v{__APP_VERSION__}</p>
        </>
      )}
    </div>
  );
}
