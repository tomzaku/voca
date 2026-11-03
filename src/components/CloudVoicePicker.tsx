import { useEffect, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useTtsSettings } from '../hooks/useTtsSettings';
import { useAuth } from '../hooks/useAuth';
import { listCloudVoices, type CloudVoice, type CloudVoiceList } from '../lib/speechApi';
import { speakText, stopSpeaking } from '../lib/tts';

// Voice list for the Cloud engine. The list comes from the server (GET
// /speech/voices) — it's also what the server will accept — grouped by Google's
// voice families, each labelled with its free monthly allowance, because that
// allowance is the real difference between them: the server stops each family
// at its own free limit, so a cheaper family simply lasts longer.

const SAMPLE = 'The word "serendipity" means happy accident. What a beautiful discovery!';

const TIERS: { tier: CloudVoice['tier']; noteId: string }[] = [
  { tier: 'Chirp 3 HD', noteId: 'settings.cloudTierChirp' },
  { tier: 'Neural2', noteId: 'settings.cloudTierNeural2' },
  { tier: 'WaveNet', noteId: 'settings.cloudTierWavenet' },
  { tier: 'Standard', noteId: 'settings.cloudTierStandard' },
];

export function CloudVoicePicker() {
  const { cloudVoice, setCloudVoice } = useTtsSettings();
  const { user } = useAuth();
  const [list, setList] = useState<CloudVoiceList | null | undefined>(undefined);
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listCloudVoices().then((l) => { if (live) setList(l); });
    return () => { live = false; };
  }, []);

  const preview = (id: string) => {
    stopSpeaking();
    setPlaying(id);
    speakText(SAMPLE, { voice: id, onEnd: () => setPlaying(null) }).catch(() => setPlaying(null));
  };
  const stop = () => { stopSpeaking(); setPlaying(null); };

  if (list === undefined) return null;

  // A stored pick the server no longer offers reads as the default.
  const selected = list?.voices.some((v) => v.id === cloudVoice) ? cloudVoice : (list?.defaults.female ?? '');

  return (
    <section className="mb-8">
      <h2 className="text-sm font-display font-bold text-text-secondary uppercase tracking-wider mb-3"><FormattedMessage id="settings.voice" /></h2>
      <p className="text-xs text-text-muted mb-4">
        <FormattedMessage id={user ? 'settings.cloudVoiceHint' : 'settings.cloudVoiceHintGuest'} />
      </p>
      {!list ? (
        <p className="text-xs text-text-muted"><FormattedMessage id="settings.cloudVoiceOffline" /></p>
      ) : (
        <div className="space-y-5">
          {TIERS.map(({ tier, noteId }) => {
            const voices = list.voices.filter((v) => v.tier === tier);
            if (!voices.length) return null;
            return (
              <div key={tier}>
                <h3 className="text-xs font-medium text-text-muted mb-2">
                  {tier} · <FormattedMessage id={noteId} />
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {voices.map((v) => {
                    const isSelected = selected === v.id;
                    const isPlaying = playing === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setCloudVoice(v.id === list.defaults.female ? '' : v.id)}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-accent-cyan/5 border-accent-cyan/30' : 'bg-bg-card border-border hover:border-text-muted/30'}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? 'border-accent-cyan' : 'border-text-muted/40'}`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium truncate block ${isSelected ? 'text-accent-cyan' : 'text-text-primary'}`}>{v.name}</span>
                          <span className="text-[11px] text-text-muted truncate block">{v.accent} · {v.gender}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (isPlaying) stop(); else preview(v.id); }}
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
