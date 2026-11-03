import { useState, useSyncExternalStore } from 'react';
import { FormattedMessage } from 'react-intl';
import { useTtsSettings } from '../hooks/useTtsSettings';
import { getNativeVoices, isAppleDevice, rankEnglishVoices, subscribeNativeVoices, voiceTier, type VoiceTier } from '../lib/nativeVoices';
import { speakText, stopSpeaking } from '../lib/tts';

// Voice list for the native engine — the one iPhones run on Auto. The voices
// are whatever this device has installed, so the list is read live, and the
// tip about downloading better ones is the real fix on an iPhone.

const SAMPLE = 'The word "serendipity" means happy accident. What a beautiful discovery!';

const TIER_BADGE: Partial<Record<VoiceTier, { id: string; cls: string }>> = {
  premium: { id: 'settings.nativeTierPremium', cls: 'text-green-400' },
  enhanced: { id: 'settings.nativeTierEnhanced', cls: 'text-blue-400' },
};

/** The badge says the quality, so drop it from the name. */
function displayName(name: string): string {
  return name.replace(/\s*\((enhanced|premium)\)/i, '');
}

const AUTO = '';

export function NativeVoicePicker() {
  const { nativeVoice, setNativeVoice } = useTtsSettings();
  const all = useSyncExternalStore(subscribeNativeVoices, getNativeVoices);
  const voices = rankEnglishVoices(all);
  const best = voices[0];
  const [playing, setPlaying] = useState<string | null>(null);

  // A pick that's been uninstalled reads as Auto, which is what tts.ts does.
  const selected = voices.some((v) => v.voiceURI === nativeVoice) ? nativeVoice : AUTO;
  const missingGood = !voices.some((v) => voiceTier(v) !== 'standard');

  const preview = (id: string) => {
    const uri = id === AUTO ? best?.voiceURI : id;
    stopSpeaking();
    setPlaying(id);
    speakText(SAMPLE, { voice: uri, onEnd: () => setPlaying(null) }).catch(() => setPlaying(null));
  };
  const stop = () => { stopSpeaking(); setPlaying(null); };

  const rows = [
    { id: AUTO, label: <FormattedMessage id="settings.nativeVoiceAuto" />, sub: best ? displayName(best.name) : null, tier: best && voiceTier(best) },
    ...voices.map((v) => ({ id: v.voiceURI, label: <>{displayName(v.name)}</>, sub: v.lang.replace('_', '-'), tier: voiceTier(v) })),
  ];

  return (
    <section className="mb-8">
      <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.voice" /></h2>
      {isAppleDevice() && (
        <p className={`text-xs mb-4 ${missingGood ? 'text-accent-cyan' : 'text-text-muted'}`}>
          <FormattedMessage id="settings.nativeVoiceAppleTip" />
        </p>
      )}
      {voices.length === 0 ? (
        <p className="text-xs text-text-muted"><FormattedMessage id="settings.nativeVoiceNone" /></p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {rows.map((r) => {
            const isSelected = selected === r.id;
            const isPlaying = playing === r.id;
            const badge = r.tier ? TIER_BADGE[r.tier] : undefined;
            return (
              <div
                key={r.id || 'auto'}
                onClick={() => setNativeVoice(r.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-accent-cyan/5 border-accent-cyan/30' : 'bg-bg-card border-border hover:border-text-muted/30'}`}
              >
                <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-accent-cyan' : 'border-text-muted/40'}`}>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium truncate ${isSelected ? 'text-accent-cyan' : 'text-text-primary'}`}>{r.label}</span>
                    {badge && <span className={`text-[10px] font-code font-bold shrink-0 ${badge.cls}`}><FormattedMessage id={badge.id} /></span>}
                  </div>
                  {r.sub && <span className="text-[11px] text-text-muted truncate block">{r.sub}</span>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (isPlaying) stop(); else preview(r.id); }}
                  className={`w-7 h-7 rounded-md flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                    isPlaying
                      ? 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20'
                      : 'bg-bg-tertiary text-text-muted border-border hover:text-accent-cyan hover:border-accent-cyan/30'
                  }`}
                >
                  {isPlaying ? (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><rect x="0" y="0" width="10" height="10" rx="1" /></svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
