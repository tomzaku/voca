import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PixelButton, PixelIcon, type PixelIconName } from './pixel';

// The welcome for someone new who hasn't signed in: what the world is for, in
// four short pages — Huế itself, then learning English with the keepers, the
// real history behind every landmark, and the mini games. Each of the last
// three can take you straight there; the end asks you to sign in (to keep
// progress and meet other players) or just start walking.

export type IntroStop = 'keeper' | 'history' | 'games';

const PAGES: { id: string; icon: PixelIconName; color: string; stop?: IntroStop }[] = [
  { id: 'welcome', icon: 'compass', color: 'var(--px-gold)' },
  { id: 'english', icon: 'cap', color: 'var(--px-jade)', stop: 'keeper' },
  { id: 'history', icon: 'gate', color: 'var(--px-bad)', stop: 'history' },
  { id: 'games', icon: 'play', color: 'var(--px-sky)', stop: 'games' },
];

export function WorldIntro({ onGo, onSignIn, onClose }: {
  onGo: (stop: IntroStop) => void;
  onSignIn: () => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const [i, setI] = useState(0);
  const page = PAGES[i];
  const last = i === PAGES.length - 1;

  // ← → page through, Esc skips. Captured first, so the world doesn't walk.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI((n) => Math.min(PAGES.length - 1, n + 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const m = (key: string) => `world.intro.${page.id}.${key}`;
  return (
    <div className="px absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="world-intro-title"
        className="px-notch px-frame px-in-up w-[min(100%,440px)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="px-inset px-notch w-12 h-12 shrink-0 flex items-center justify-center" style={{ color: page.color }}>
            <PixelIcon name={page.icon} size={3} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-[var(--px-muted)] px-num">{i + 1} / {PAGES.length}</p>
            <h2 id="world-intro-title" className="px-title !text-[18px] leading-tight" style={{ color: page.color }}>
              <FormattedMessage id={m('title')} />
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-[12px] text-[var(--px-muted)] underline underline-offset-2 self-start">
            <FormattedMessage id="world.intro.skip" />
          </button>
        </div>

        <p className="text-[15px] leading-snug mb-3"><FormattedMessage id={m('body')} /></p>
        <ul className="space-y-1.5 mb-4">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex items-start gap-2 text-[14px] leading-snug">
              <span className="mt-[5px] shrink-0" style={{ color: page.color }}><PixelIcon name="star" size={1} /></span>
              <FormattedMessage id={m(`point${n}`)} />
            </li>
          ))}
        </ul>

        {page.stop && (
          <PixelButton tone="jade" block onClick={() => onGo(page.stop!)} className="!text-[14px] mb-2">
            <PixelIcon name="compass" size={2} /> <FormattedMessage id={m('go')} />
          </PixelButton>
        )}
        {last && (
          <PixelButton tone="gold" block onClick={onSignIn} className="!text-[14px] mb-2">
            <PixelIcon name="people" size={2} /> <FormattedMessage id="world.intro.signIn" />
          </PixelButton>
        )}

        <div className="flex items-center gap-2">
          <PixelButton tone="paper" disabled={i === 0} onClick={() => setI(i - 1)} className="!px-3 !py-0 !h-[2.4rem] !text-[13px]" aria-label={intl.formatMessage({ id: 'world.intro.back' })}>
            ◀
          </PixelButton>
          <div className="flex-1 flex justify-center gap-1.5" aria-hidden>
            {PAGES.map((p, n) => (
              <button key={p.id} type="button" tabIndex={-1} onClick={() => setI(n)} className="w-2.5 h-2.5" style={{ background: n === i ? page.color : 'var(--px-muted)', opacity: n === i ? 1 : 0.4 }} />
            ))}
          </div>
          {last ? (
            <PixelButton tone="paper" onClick={onClose} className="!px-3 !py-0 !h-[2.4rem] !text-[13px]">
              <FormattedMessage id="world.intro.explore" /> ▶
            </PixelButton>
          ) : (
            <PixelButton tone="gold" onClick={() => setI(i + 1)} className="!px-3 !py-0 !h-[2.4rem] !text-[13px]">
              <FormattedMessage id="world.intro.next" /> ▶
            </PixelButton>
          )}
        </div>
      </div>
    </div>
  );
}
