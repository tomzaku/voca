import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { CATEGORY_LABEL_IDS, CATEGORY_ORDER, IPA_SOUNDS, type IpaCategory, type IpaSound } from '../../data/ipa';
import { IPA_RECORDINGS } from '../../data/ipaAudio';
import { sayWord, saySound, stopIpa } from '../../lib/ipaPlayback';
import { HudCenter, PixelButton, PixelIcon } from './pixel';

// Learning the sounds in the royal theatre: every sound of English the IPA
// page teaches (data/ipa), laid out as a chart by kind — short vowels, long
// vowels, diphthongs, consonants. Tap one to hear it and open it: how to make
// it, the slip to avoid, and words that have it, grouped by the letters that
// spell it (tap a word to hear it). Playback is lib/ipaPlayback, shared with
// the page.

// Each kind its colour, as on the IPA page. Symbols are never upper-cased —
// /v/ and /V/, /ð/ and /Ð/ aren't the same thing.
const KIND_COLOR: Record<IpaCategory, string> = {
  'vowel-short': 'var(--px-sky)',
  'vowel-long': 'var(--px-jade)',
  diphthong: '#c79cff',
  consonant: 'var(--px-gold)',
};

export function IpaChart() {
  const [open, setOpen] = useState<IpaSound | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => stopIpa, []);

  const hearSound = (symbol: string) => {
    const key = `/${symbol}/`;
    if (saySound(symbol, () => setPlaying((p) => (p === key ? null : p)))) setPlaying(key);
  };
  const hearWord = (word: string) => { setPlaying(word); sayWord(word, () => setPlaying((p) => (p === word ? null : p))); };
  const openSound = (s: IpaSound) => { setOpen(s); hearSound(s.symbol); };

  return open
    ? <SoundPage sound={open} playing={playing} onHear={hearSound} onWord={hearWord} onOpen={openSound} onBack={() => { stopIpa(); setOpen(null); }} />
    : <Chart onOpen={openSound} />;
}

function Chart({ onOpen }: { onOpen: (s: IpaSound) => void }) {
  return (
    <HudCenter wide>
      <p className="px-title !text-[20px] text-[var(--px-gold)]"><FormattedMessage id="world.actIpaLearn" /></p>
      <p className="text-[14px] text-[var(--px-muted)] mb-4"><FormattedMessage id="world.ipaLearnTap" /></p>
      <div className="space-y-4">
        {CATEGORY_ORDER.map((cat) => (
          <section key={cat}>
            <p className="px-title !text-[14px] mb-1.5" style={{ color: KIND_COLOR[cat] }}><FormattedMessage id={CATEGORY_LABEL_IDS[cat]} /></p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
              {IPA_SOUNDS.filter((s) => s.category === cat).map((s) => (
                <button key={s.symbol} onClick={() => onOpen(s)} className="px-pick px-notch px-1.5 py-2 text-center">
                  <span className="block text-[22px] leading-none font-bold" style={{ color: KIND_COLOR[cat] }}>/{s.symbol}/</span>
                  <span className="block mt-1 text-[12px] text-[var(--px-muted)] truncate">{s.examples[0]}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </HudCenter>
  );
}

function SoundPage({ sound, playing, onHear, onWord, onOpen, onBack }: {
  sound: IpaSound;
  playing: string | null;
  onHear: (symbol: string) => void;
  onWord: (word: string) => void;
  onOpen: (s: IpaSound) => void;
  onBack: () => void;
}) {
  const intl = useIntl();
  const i = IPA_SOUNDS.indexOf(sound);
  const prev = IPA_SOUNDS[(i - 1 + IPA_SOUNDS.length) % IPA_SOUNDS.length];
  const next = IPA_SOUNDS[(i + 1) % IPA_SOUNDS.length];
  const rec = IPA_RECORDINGS[sound.symbol];
  const color = KIND_COLOR[sound.category];
  return (
    <HudCenter wide>
      <div className="flex items-center justify-between gap-2 mb-3">
        <button onClick={onBack} className="px-title !text-[13px] text-[var(--px-muted)] hover:text-[var(--px-text)]">
          ← <FormattedMessage id="world.ipaAllSounds" />
        </button>
        <span className="flex gap-1.5">
          <PixelButton tone="paper" onClick={() => onOpen(prev)} aria-label={`/${prev.symbol}/`} className="!px-2.5 !py-1 !text-[13px] !normal-case">‹ /{prev.symbol}/</PixelButton>
          <PixelButton tone="paper" onClick={() => onOpen(next)} aria-label={`/${next.symbol}/`} className="!px-2.5 !py-1 !text-[13px] !normal-case">/{next.symbol}/ ›</PixelButton>
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <span className="px-inset px-notch w-24 h-24 shrink-0 flex items-center justify-center text-[44px] font-bold" style={{ color }}>/{sound.symbol}/</span>
        <div className="min-w-0">
          <p className="px-title !text-[13px]" style={{ color }}><FormattedMessage id={CATEGORY_LABEL_IDS[sound.category]} /></p>
          <PixelButton tone={playing === `/${sound.symbol}/` ? 'sky' : 'gold'} onClick={() => onHear(sound.symbol)} className="mt-2">
            <PixelIcon name="speaker" size={2} /> <FormattedMessage id="world.ipaHear" />
          </PixelButton>
        </div>
      </div>

      <div className="space-y-3 text-[15px] leading-snug">
        <div>
          <p className="px-title !text-[12px] text-[var(--px-muted)]"><FormattedMessage id="world.ipaHow" /></p>
          <p>{sound.howTo}</p>
        </div>
        <div>
          <p className="px-title !text-[12px] text-[var(--px-bad)]"><FormattedMessage id="world.ipaWatch" /></p>
          <p>{sound.tip}</p>
        </div>
        <div>
          <p className="px-title !text-[12px] text-[var(--px-muted)] mb-1"><FormattedMessage id="world.ipaWords" /></p>
          <div className="space-y-1.5">
            {sound.spellings.map(([letters, words]) => (
              <div key={letters} className="flex flex-wrap items-center gap-1.5">
                <span className="px-inset px-notch px-2 py-0.5 text-[13px] font-bold" style={{ color }}>{letters}</span>
                {words.slice(0, 8).map((w) => (
                  <button
                    key={w}
                    onClick={() => onWord(w)}
                    title={intl.formatMessage({ id: 'world.ipaHearWord' }, { word: w })}
                    data-on={playing === w}
                    className="px-pick px-notch px-2 py-0.5 text-[14px]"
                  >
                    {w}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11px] text-[var(--px-muted)]">
        {rec
          ? <><FormattedMessage id="ipa.recordingCredit" /> <a href={rec.page} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">{rec.author}</a> · {rec.license} · Wikimedia Commons</>
          : <FormattedMessage id="world.ipaNoRecording" values={{ symbol: sound.symbol, word: sound.examples[0] }} />}
      </p>
    </HudCenter>
  );
}
