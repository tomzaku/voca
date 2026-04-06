import { useState } from 'react';
import { useTtsSettings, KOKORO_VOICES, PIPER_VOICES, type TtsEngine } from '../hooks/useTtsSettings';
import { speakWithKokoro, stopKokoroAudio } from '../lib/kokoroTts';
import { ToggleSwitch } from './ToggleSwitch';
import {
  AI_PROVIDERS,
  getProvider,
  setProvider as setProviderStorage,
  getModel,
  setModel as setModelStorage,
  getApiKeyForProvider,
  setApiKeyForProvider,
  type ProviderId,
} from '../lib/aiProviders';
import { useAuth } from '../hooks/useAuth';
import { useVocabularyStore } from '../hooks/useVocabulary';
import toast from 'react-hot-toast';

const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome|Chromium|Edg/.test(navigator.userAgent);

const engines: { id: TtsEngine; label: string; desc: string; badge?: string }[] = [
  { id: 'native', label: 'Browser Native', desc: 'Uses your OS/browser built-in speech synthesis. Instant, no download.', badge: 'Fast' },
  { id: 'piper', label: 'Piper AI', desc: 'Neural TTS via WASM. Good quality, works on all browsers including Safari.', badge: 'Safari-friendly' },
  {
    id: 'kokoro',
    label: 'Kokoro AI',
    desc: isSafari
      ? 'High-quality neural TTS (82M params). Not available on Safari — use Piper AI instead.'
      : 'High-quality neural TTS (82M params) via WebGPU/WASM. ~160MB download on first use.',
    badge: isSafari ? 'Unavailable' : 'Best voice',
  },
];

const gradeColor: Record<string, string> = {
  'A': 'text-green-400', 'A-': 'text-green-400',
  'B': 'text-blue-400', 'B-': 'text-blue-400',
  'C+': 'text-yellow-400', 'C': 'text-yellow-400', 'C-': 'text-yellow-400',
  'D+': 'text-orange-400', 'D': 'text-orange-400', 'D-': 'text-orange-400',
  'F+': 'text-red-400',
};

export function SettingsPage() {
  const { engine, setEngine, voice, setVoice, piperVoice, setPiperVoice, speed, setSpeed } = useTtsSettings();
  const { user, signInWithGoogle, signOut } = useAuth();
  const store = useVocabularyStore();

  const [previewState, setPreviewState] = useState<{ id: string; phase: 'loading' | 'playing' } | null>(null);

  // AI Provider state
  const [aiProvider, setAiProvider] = useState<ProviderId>(getProvider);
  const [aiModel, setAiModel] = useState(getModel);
  const [aiApiKeyInput, setAiApiKeyInput] = useState('');
  const [aiApiKeySaved, setAiApiKeySaved] = useState(false);
  const hasAiKey = !!getApiKeyForProvider(aiProvider);

  const handleProviderChange = (id: ProviderId) => {
    setAiProvider(id);
    setProviderStorage(id);
    const provider = AI_PROVIDERS.find((p) => p.id === id)!;
    setAiModel(provider.defaultModel);
    setModelStorage(provider.defaultModel);
    setAiApiKeyInput('');
    setAiApiKeySaved(false);
  };

  const handleModelChange = (model: string) => {
    setAiModel(model);
    setModelStorage(model);
  };

  const handleSaveAiKey = () => {
    const key = aiApiKeyInput.trim();
    if (key) {
      setApiKeyForProvider(aiProvider, key);
      setAiApiKeyInput('');
      setAiApiKeySaved(true);
      setTimeout(() => setAiApiKeySaved(false), 2000);
    }
  };

  const preview = async (voiceId: string) => {
    stopKokoroAudio();
    setPreviewState({ id: voiceId, phase: 'loading' });
    try {
      await speakWithKokoro('The word "serendipity" means happy accident. What a beautiful discovery!', {
        voice: voiceId,
        onStart: () => setPreviewState({ id: voiceId, phase: 'playing' }),
        onEnd: () => setPreviewState(null),
      });
    } catch {
      setPreviewState(null);
    }
  };

  const stopPreview = () => { stopKokoroAudio(); setPreviewState(null); };

  const handleResetProgress = () => {
    if (!confirm('Reset all learning progress? This cannot be undone.')) return;
    localStorage.removeItem('voca-progress');
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-1">Settings</h1>
      <p className="text-sm text-text-muted mb-8">Configure your learning preferences.</p>

      {/* Account */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">Account</h2>
        {user ? (
          <div className="p-4 rounded-lg border border-border bg-bg-card flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-text-primary">{user.email}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {store.knownWords().size} words known · {store.bookmarkedWords().length} saved
              </p>
            </div>
            <button
              onClick={signOut}
              className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted hover:text-accent-red hover:border-accent-red/30 transition-colors"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-border bg-bg-card">
            <p className="text-sm text-text-secondary mb-3">
              Sign in to sync your progress across devices.
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
              Continue with Google
            </button>
          </div>
        )}
      </section>

      {/* AI Provider */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">AI Provider</h2>
        <p className="text-xs text-text-muted mb-3">Used to generate word definitions and examples.</p>

        <div className="space-y-2 mb-4">
          {AI_PROVIDERS.map((p) => {
            const selected = aiProvider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`w-full text-left p-4 rounded-lg border transition-all cursor-pointer ${
                  selected
                    ? 'bg-accent-purple/5 border-accent-purple/30 ring-1 ring-accent-purple/20'
                    : 'bg-bg-card border-border hover:border-text-muted/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? 'border-accent-purple' : 'border-text-muted/40'}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-accent-purple" />}
                  </span>
                  <span className={`text-sm font-medium ${selected ? 'text-accent-purple' : 'text-text-primary'}`}>{p.label}</span>
                  {p.badge && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">
                      {p.badge}
                    </span>
                  )}
                  {hasAiKey && selected && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-green/15 text-accent-green">Key set</span>
                  )}
                </div>
                <p className="text-xs text-text-muted ml-7">{p.description}</p>
              </button>
            );
          })}
        </div>

        {/* Model picker */}
        {(() => {
          const provider = AI_PROVIDERS.find((p) => p.id === aiProvider)!;
          return (
            <div className="mb-4">
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Model</label>
              <select
                value={aiModel}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple/50 cursor-pointer"
              >
                {provider.models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          );
        })()}

        {/* API Key input */}
        {(() => {
          const provider = AI_PROVIDERS.find((p) => p.id === aiProvider)!;
          return (
            <div>
              <label className="text-xs font-medium text-text-secondary block mb-1.5">
                API Key {hasAiKey && <span className="text-accent-green ml-1.5">(saved)</span>}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={aiApiKeyInput}
                  onChange={(e) => setAiApiKeyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveAiKey()}
                  placeholder={hasAiKey ? '••••••••' : provider.placeholder}
                  className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary font-code focus:outline-none focus:border-accent-purple/50 placeholder:text-text-muted"
                />
                <button
                  onClick={handleSaveAiKey}
                  disabled={!aiApiKeyInput.trim()}
                  className="px-3 py-2 bg-accent-purple text-bg-primary text-xs font-semibold rounded-lg hover:bg-accent-purple/90 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {aiApiKeySaved ? 'Saved!' : 'Save'}
                </button>
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">
                Get your key from{' '}
                <a href={provider.keysUrl} target="_blank" rel="noopener noreferrer" className="text-accent-purple hover:underline">
                  {provider.keysLabel}
                </a>
                . Stored locally in your browser only.
              </p>
            </div>
          );
        })()}
      </section>

      {/* TTS Engine */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">Text-to-Speech Engine</h2>
        <div className="space-y-3">
          {engines.map((e) => {
            const disabled = e.id === 'kokoro' && isSafari;
            return (
              <button
                key={e.id}
                onClick={() => !disabled && setEngine(e.id)}
                disabled={disabled}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed bg-bg-card border-border'
                    : engine === e.id
                      ? 'bg-accent-cyan/5 border-accent-cyan/30 ring-1 ring-accent-cyan/20 cursor-pointer'
                      : 'bg-bg-card border-border hover:border-text-muted/30 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${engine === e.id ? 'border-accent-cyan' : 'border-text-muted/40'}`}>
                    {engine === e.id && <span className="w-2 h-2 rounded-full bg-accent-cyan" />}
                  </span>
                  <span className={`text-sm font-medium ${engine === e.id ? 'text-accent-cyan' : 'text-text-primary'}`}>{e.label}</span>
                  {e.badge && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${engine === e.id ? 'bg-accent-cyan/15 text-accent-cyan' : 'bg-bg-tertiary text-text-muted'}`}>
                      {e.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted ml-7">{e.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Speed */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">Playback Speed</h2>
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
          { label: 'American Female', voices: voices.filter((v) => v.accent === 'American' && v.gender === 'Female') },
          { label: 'American Male', voices: voices.filter((v) => v.accent === 'American' && v.gender === 'Male') },
          { label: 'British Female', voices: voices.filter((v) => v.accent === 'British' && v.gender === 'Female') },
          { label: 'British Male', voices: voices.filter((v) => v.accent === 'British' && v.gender === 'Male') },
        ].filter((g) => g.voices.length > 0);

        return (
          <section className="mb-8">
            <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">Voice</h2>
            <p className="text-xs text-text-muted mb-4">Pick a voice for {isKokoro ? 'Kokoro' : 'Piper'} AI.</p>
            <div className="space-y-5">
              {voiceGroups.map((group) => (
                <div key={group.label}>
                  <h3 className="text-xs font-medium text-text-muted mb-2">{group.label}</h3>
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

      {/* Auto-speak toggle */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">Auto-Speak</h2>
        <button
          onClick={() => {
            const key = 'voca-auto-speak';
            const current = localStorage.getItem(key) === 'true';
            localStorage.setItem(key, String(!current));
            toast.success(!current ? 'Auto-speak enabled' : 'Auto-speak disabled');
          }}
          className="w-full flex items-center gap-3 p-4 rounded-lg border border-border bg-bg-card hover:border-border-light transition-all cursor-pointer"
        >
          <div className="flex-1 text-left">
            <span className="text-sm font-medium text-text-primary block">Speak word automatically</span>
            <span className="text-xs text-text-muted mt-0.5 block">Pronounce the word aloud when a new card appears.</span>
          </div>
          <ToggleSwitch checked={localStorage.getItem('voca-auto-speak') === 'true'} />
        </button>
      </section>

      {/* Danger zone */}
      <section className="mb-8">
        <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3">Data</h2>
        <button
          onClick={handleResetProgress}
          className="w-full p-4 rounded-lg border border-accent-red/20 bg-accent-red/5 text-accent-red text-sm font-medium hover:bg-accent-red/10 transition-colors cursor-pointer text-left"
        >
          Reset learning progress
          <span className="block text-xs font-normal text-accent-red/60 mt-0.5">Clears all known words and skipped words locally.</span>
        </button>
      </section>

      <p className="text-xs text-text-muted/50 text-center mt-8">v{__APP_VERSION__}</p>
    </div>
  );
}
