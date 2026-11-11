import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { MouthDiagram } from '../MouthDiagram';
import { chartSymbol, ipaChartLink } from '../../lib/pronunciation';
import type { PhoneScore } from '../../lib/phonemeScore';
import type { IpaSound } from '../../data/ipa';
import { BAR, TEXT, TILE, tone } from './styles';

// The pieces of a pronunciation result, shared by the word card's check
// (flashcard/PronunciationCheck) and the sentence results (SentenceScore).

export function ScoreRing({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className={`relative w-16 h-16 shrink-0 ${TEXT[tone(score)]}`}>
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" stroke="currentColor" opacity="0.15" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round" stroke="currentColor"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display font-extrabold text-xl">{score}</span>
    </div>
  );
}

export function PhoneTile({ phone, active, onClick }: { phone: PhoneScore; active: boolean; onClick: () => void }) {
  const intl = useIntl();
  const title = phone.heard === null
    ? `/${phone.ipa}/ · ${phone.score}`
    : phone.heard
      ? intl.formatMessage({ id: 'pron.heardInstead' }, { expected: phone.ipa, heard: phone.heard, score: phone.score })
      : intl.formatMessage({ id: 'pron.notHeard' }, { expected: phone.ipa });
  return (
    <button
      role="listitem"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex flex-col items-center min-w-12 px-2 pt-1.5 pb-1 rounded-xl border-2 transition-transform cursor-pointer ${TILE[phone.status]} ${active ? 'ring-2 ring-current -translate-y-0.5' : 'hover:-translate-y-0.5'}`}
    >
      <span className="font-code font-bold text-lg leading-none">{phone.ipa}</span>
      <span className="w-full h-1 rounded-full bg-current/15 mt-1.5 overflow-hidden">
        <span className={`block h-full rounded-full ${BAR[phone.status]}`} style={{ width: `${Math.max(6, phone.score)}%` }} />
      </span>
      <span className="font-code text-[10px] leading-none mt-1 h-2.5">
        {phone.heard === null ? '' : `→${phone.heard || '∅'}`}
      </span>
    </button>
  );
}


// The chart's 44 sounds with their "how to" and tip — loaded when coaching
// first opens, since it's a large module most cards never need.
let soundsPromise: Promise<Map<string, IpaSound>> | null = null;
function loadSounds() {
  soundsPromise ??= import('../../data/ipa').then(({ IPA_SOUNDS }) => new Map(IPA_SOUNDS.map((s) => [s.symbol, s])));
  return soundsPromise;
}

/** Keyed by sound upstream, so a new pick starts empty rather than on the last one's text. */
export function Coaching({ phone }: { phone: PhoneScore }) {
  const symbol = chartSymbol(phone.ipa);
  const heardSymbol = phone.heard ? chartSymbol(phone.heard) : null;
  const [sound, setSound] = useState<IpaSound | null>(null);
  useEffect(() => {
    let live = true;
    if (symbol) void loadSounds().then((m) => { if (live) setSound(m.get(symbol) ?? null); });
    return () => { live = false; };
  }, [symbol]);
  const link = ipaChartLink(phone.ipa);
  const good = phone.status === 'good';

  return (
    <div className="mt-3 flex gap-3 sm:gap-4 rounded-xl bg-bg-card border border-border p-3 animate-fade-in">
      {symbol && (
        <div className="shrink-0 w-24 sm:w-28">
          {/* Your sound outlined over the one to make — the difference is
              often visible: the tongue tip that never left the ridge. */}
          <MouthDiagram symbol={symbol} ghost={heardSymbol && heardSymbol !== symbol ? heardSymbol : undefined} className="w-full" />
        </div>
      )}
      <div className="min-w-0 text-sm">
        <p className="font-bold text-text-primary">
          {good
            ? <FormattedMessage id="pron.coachGood" values={{ ipa: <span className="font-code text-accent-green">/{phone.ipa}/</span> }} />
            : phone.heard
              ? <FormattedMessage id="pron.coachHeard" values={{
                  ipa: <span className="font-code text-accent-green">/{phone.ipa}/</span>,
                  heard: <span className="font-code text-accent-red">/{phone.heard}/</span>,
                }} />
              : <FormattedMessage id="pron.coachMissing" values={{ ipa: <span className="font-code text-accent-red">/{phone.ipa}/</span> }} />}
        </p>
        {sound && (
          <>
            <p className="text-text-secondary mt-1 leading-snug">{sound.howTo}</p>
            {!good && (
              <p className="flex gap-1.5 text-text-muted text-xs mt-1.5 leading-snug">
                <Icon icon="lucide:lightbulb" className="shrink-0 mt-px text-accent-yellow" />
                <span>{sound.tip}</span>
              </p>
            )}
          </>
        )}
        {link && (
          <Link to={link} className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-accent-cyan hover:underline">
            <FormattedMessage id="pron.practise" values={{ ipa: `/${symbol}/` }} />
            <Icon icon="lucide:arrow-right" />
          </Link>
        )}
      </div>
    </div>
  );
}
