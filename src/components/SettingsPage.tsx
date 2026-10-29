import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { useTheme, type Theme } from '../hooks/useTheme';
import { useTtsSettings, KOKORO_VOICES, PIPER_VOICES, type TtsEngine, type TtsEnginePref } from '../hooks/useTtsSettings';
import { isHeavyFor } from '../lib/deviceTier';
import { speakText, stopSpeaking } from '../lib/tts';
import { isSfxEnabled, setSfxEnabled, playCorrect } from '../lib/sfx';
import { ToggleSwitch } from './ToggleSwitch';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocale, LOCALES, type Locale } from '../i18n/locale';
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
import { useVocabularyStore } from '../hooks/useVocabulary';
import toast from 'react-hot-toast';

const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);

// Labels are message ids, formatted at render time so the language can change.
const THEMES: { id: Theme; labelId: string; descId: string; icon: string }[] = [
  { id: 'light', labelId: 'settings.themeLight', descId: 'settings.themeLightDesc', icon: 'lucide:sun' },
  { id: 'dark', labelId: 'settings.themeDark', descId: 'settings.themeDarkDesc', icon: 'lucide:moon' },
];

const engines: { id: TtsEnginePref; labelId: string; descId: string; badgeId?: string }[] = [
  { id: 'auto', labelId: 'settings.engineAuto', descId: 'settings.engineAutoDesc', badgeId: 'settings.badgeRecommended' },
  { id: 'native', labelId: 'settings.engineNative', descId: 'settings.engineNativeDesc', badgeId: 'settings.badgeFast' },
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

export function SettingsPage() {
  const intl = useIntl();
  const { theme, setTheme } = useTheme();
  const { enginePref, engine, recommended, setEngine, voice, setVoice, piperVoice, setPiperVoice, speed, setSpeed } = useTtsSettings();
  const { user, signInWithGoogle, signOut } = useAuth();
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

  return (
    <div className="max-w-page mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1"><FormattedMessage id="settings.title" /></h1>
      <p className="text-sm text-text-muted mb-8"><FormattedMessage id="settings.subtitle" /></p>

      {/* Account */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.account" /></h2>
        {user ? (
          <div className="p-4 rounded-lg border border-border bg-bg-card flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">{user.email}</p>
              <p className="text-xs text-text-muted mt-0.5">
                <FormattedMessage
                  id="settings.accountStats"
                  values={{ known: store.knownWords().size, saved: store.bookmarkedWords().length }}
                />
              </p>
            </div>
            <button
              onClick={signOut}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-colors"
            >
              <FormattedMessage id="settings.signOut" />
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-border bg-bg-card">
            <p className="text-sm text-text-secondary mb-3">
              <FormattedMessage id="settings.signInPrompt" />
            </p>
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-gray-800 text-sm font-medium hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <FormattedMessage id="auth.continueGoogle" />
            </button>
          </div>
        )}
      </section>

      {/* Theme */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-1"><FormattedMessage id="settings.theme" /></h2>
        <p className="text-xs text-text-muted mb-3"><FormattedMessage id="settings.themeHint" /></p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {THEMES.map((t) => {
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  toast.success(intl.formatMessage({ id: 'settings.themeToast' }, { theme: intl.formatMessage({ id: t.labelId }) }));
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected
                    ? 'bg-accent-cyan/5 border-accent-cyan/30 ring-1 ring-accent-cyan/20'
                    : 'bg-bg-card border-border hover:border-border-light'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`flex items-center gap-1.5 text-sm font-display font-bold ${selected ? 'text-accent-cyan' : 'text-text-primary'}`}>
                    <Icon icon={t.icon} className="text-base" />
                    <FormattedMessage id={t.labelId} />
                  </span>
                  {selected && <span className="text-[10px] text-accent-cyan"><FormattedMessage id="settings.active" /></span>}
                </div>
                <p className="text-xs text-text-muted"><FormattedMessage id={t.descId} /></p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Languages */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-1"><FormattedMessage id="settings.languages" /></h2>
        <p className="text-xs text-text-muted mb-3">
          <FormattedMessage id="settings.languagesHint" />
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              <FormattedMessage id="settings.uiLanguage" />
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className="select-field w-full bg-bg-card border border-border rounded-lg pl-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan/50 cursor-pointer"
            >
              {LOCALES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
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
      </section>

      {/* Vocabulary Pack */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-1"><FormattedMessage id="settings.collection" /></h2>
        <p className="text-xs text-text-muted mb-3"><FormattedMessage id="settings.collectionHint" /></p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {collections.map((c) => {
            const selected = activeCollection === c.id;
            return (
              <button
                key={c.id}
                onClick={() => handlePackChange(c.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected
                    ? 'bg-accent-cyan/5 border-accent-cyan/30 ring-1 ring-accent-cyan/20'
                    : 'bg-bg-card border-border hover:border-border-light'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-display font-bold ${selected ? 'text-accent-cyan' : 'text-text-primary'}`}>
                    {c.name}
                  </span>
                  {selected && <span className="text-[10px] text-accent-cyan"><FormattedMessage id="settings.active" /></span>}
                </div>
                <p className="text-xs text-text-muted">{c.description}</p>
                <p className="text-xs font-code text-text-muted/60 mt-1"><FormattedMessage id="common.wordCount" values={{ count: c.count }} /></p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-muted mt-3">
          {getCollection(activeCollection).kind === 'topic' && getCollection(activeCollection).id === activeCollection
            ? <><FormattedMessage
                id="settings.studyingTopic"
                values={{ name: getCollection(activeCollection).name, b: (chunks) => <span className="font-bold text-accent-cyan">{chunks}</span> }}
              />{' '}</>
            : <><FormattedMessage id="settings.wantTopic" />{' '}</>}
          <Link to="/collections" className="font-bold text-accent-cyan hover:underline"><FormattedMessage id="settings.browseTopics" /></Link>
        </p>
      </section>

      {/* World Game */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-1"><FormattedMessage id="settings.worldGame" /></h2>
        <p className="text-xs text-text-muted mb-3">
          <FormattedMessage id="settings.worldGameHint" />
        </p>
        <button
          onClick={() => {
            const next = !gameEnabled;
            setGameEnabled(next);
            toast.success(intl.formatMessage({ id: next ? 'settings.worldGameOn' : 'settings.worldGameOff' }));
          }}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all cursor-pointer"
        >
          <div className="flex-1 text-left">
            <span className="text-sm font-medium text-text-primary block"><FormattedMessage id="settings.enableWorldGame" /></span>
            <span className="text-xs text-text-muted mt-0.5 block"><FormattedMessage id="settings.enableWorldGameHint" /></span>
          </div>
          <ToggleSwitch checked={gameEnabled} />
        </button>
      </section>

      {/* Guess Game */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-1"><FormattedMessage id="settings.guessGame" /></h2>
        <p className="text-xs text-text-muted mb-3"><FormattedMessage id="settings.guessGameHint" /></p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {GUESS_GAMES.map((g) => {
            const selected = guessGame === g.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setGuessGame(g.id);
                  toast.success(intl.formatMessage({ id: 'settings.defaultGameToast' }, { game: intl.formatMessage({ id: g.labelId }) }));
                }}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selected
                    ? 'bg-accent-cyan/5 border-accent-cyan/30 ring-1 ring-accent-cyan/20'
                    : 'bg-bg-card border-border hover:border-border-light'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-display font-bold ${selected ? 'text-accent-cyan' : 'text-text-primary'}`}>
                    <FormattedMessage id={g.labelId} />
                  </span>
                  {selected && <span className="text-[10px] text-accent-cyan"><FormattedMessage id="settings.active" /></span>}
                </div>
                <p className="text-xs text-text-muted"><FormattedMessage id={g.descriptionId} /></p>
              </button>
            );
          })}
        </div>
      </section>

      {/* TTS Engine */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.ttsEngine" /></h2>
        <div className="space-y-3">
          {engines.map((e) => {
            const disabled = e.id === 'kokoro' && isSafari;
            const on = enginePref === e.id;
            const heavy = !disabled && e.id !== 'auto' && isHeavyFor(e.id, recommended);
            return (
              <button
                key={e.id}
                onClick={() => !disabled && setEngine(e.id)}
                disabled={disabled}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
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
                  <FormattedMessage
                    id={e.descId}
                    values={{ engine: intl.formatMessage({ id: ENGINE_NAME_ID[engine] }) }}
                  />
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Speed */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.playbackSpeed" /></h2>
        <div className="flex items-center gap-4">
          <span className="text-xs text-text-muted w-8 text-right">0.5x</span>
          <input
            type="range" min="0.5" max="2" step="0.1" value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="flex-1 h-1.5 accent-accent-cyan cursor-pointer"
          />
          <span className="text-xs text-text-muted w-8">2x</span>
          <span className="text-sm font-code font-medium text-accent-cyan w-12 text-center">{speed.toFixed(1)}x</span>
        </div>
      </section>

      {/* Voice Picker */}
      {(engine === 'kokoro' || engine === 'piper') && (() => {
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
          <section className="mb-8">
            <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.voice" /></h2>
            <p className="text-xs text-text-muted mb-4"><FormattedMessage id="settings.voiceHint" values={{ engine: isKokoro ? 'Kokoro' : 'Piper' }} /></p>
            <div className="space-y-5">
              {voiceGroups.map((group) => (
                <div key={group.labelId}>
                  <h3 className="text-xs font-medium text-text-muted mb-2"><FormattedMessage id={group.labelId} /></h3>
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
                            className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                              isPlaying || isLoading
                                ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                                : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
                            }`}
                          >
                            {isLoading ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                            ) : isPlaying ? (
                              <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><rect x="0" y="0" width="10" height="10" rx="1" /></svg>
                            ) : (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Sound effects toggle */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.soundEffects" /></h2>
        <button
          onClick={() => {
            const next = !sfxOn;
            setSfxEnabled(next);
            setSfxOn(next);
            if (next) playCorrect(); // preview the sound when turning it on
            toast.success(intl.formatMessage({ id: next ? 'settings.sfxOn' : 'settings.sfxOff' }));
          }}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all cursor-pointer"
        >
          <div className="flex-1 text-left">
            <span className="text-sm font-medium text-text-primary block"><FormattedMessage id="settings.gameSounds" /></span>
            <span className="text-xs text-text-muted mt-0.5 block"><FormattedMessage id="settings.gameSoundsHint" /></span>
          </div>
          <ToggleSwitch checked={sfxOn} />
        </button>
      </section>

      {/* Auto-speak toggle */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.autoSpeak" /></h2>
        <button
          onClick={() => {
            const next = !autoSpeakOn;
            localStorage.setItem('voca-auto-speak', String(next));
            setAutoSpeakOn(next);
            toast.success(intl.formatMessage({ id: next ? 'settings.autoSpeakOn' : 'settings.autoSpeakOff' }));
          }}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all cursor-pointer"
        >
          <div className="flex-1 text-left">
            <span className="text-sm font-medium text-text-primary block"><FormattedMessage id="settings.speakAutomatically" /></span>
            <span className="text-xs text-text-muted mt-0.5 block"><FormattedMessage id="settings.speakAutomaticallyHint" /></span>
          </div>
          <ToggleSwitch checked={autoSpeakOn} />
        </button>
      </section>

      {/* Danger zone */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.data" /></h2>
        <button
          onClick={handleResetProgress}
          className="w-full p-4 rounded-lg border border-accent-red/20 bg-accent-red/5 text-accent-red text-sm font-medium hover:bg-accent-red/10 transition-colors cursor-pointer text-left"
        >
          <FormattedMessage id="settings.resetProgress" />
          <span className="block text-xs font-normal text-accent-red/60 mt-0.5"><FormattedMessage id="settings.resetProgressHint" /></span>
        </button>
      </section>

      {/* Developer */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.developer" /></h2>
        <Link
          to="/debug/network"
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all"
        >
          <div className="flex-1 text-left">
            <span className="text-sm font-medium text-text-primary block"><FormattedMessage id="settings.networkDebug" /></span>
            <span className="text-xs text-text-muted mt-0.5 block">
              <FormattedMessage id="settings.networkDebugHint" />
            </span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </section>

      <p className="text-xs text-text-muted/50 text-center mt-8">v{__APP_VERSION__}</p>
    </div>
  );
}
