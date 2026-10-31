import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useFocus } from '../../hooks/useFocus';
import { PRESETS, clock, minutesToday, phaseAt, secondsCounted, secondsLeft } from '../../lib/focusTimer';
import { playSelect } from '../../lib/sfx';
import { PixelButton, PixelChip } from './pixel';

// The Focus Zone on Ngự Bình: a pomodoro (work and breaks in turn, every
// third break long) or free focus (a stopwatch), a note for what you're on,
// and rain if you like. Closing it leaves the timer running — the status bar
// shows it — and it's kept on this device. The rules are lib/focusTimer's.

const PHASE_ID = { work: 'world.focusWork', short: 'world.focusShort', long: 'world.focusLong' } as const;

export function FocusZone({ onClose }: { onClose: () => void }) {
  const intl = useIntl();
  const f = useFocus();
  const { timer } = f;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const pomodoro = timer.mode === 'pomodoro';
  const kind = phaseAt(timer.phase);
  const shown = pomodoro ? secondsLeft(timer, now) : secondsCounted(timer, now);
  const round = Math.floor(timer.phase / 2) % 3;          // where in the three rounds to a long break
  const tap = (fn: () => void) => () => { playSelect(); fn(); };

  return (
    <div className="px absolute inset-0 z-40 flex items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[440px] p-5 px-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)]">🧘 <FormattedMessage id="world.focusTitle" /></p>
            <p className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id="places.nguBinh" /></p>
          </div>
          <button onClick={onClose} className="px-title !text-[12px] text-[var(--px-muted)] hover:text-[var(--px-text)] mt-1">
            <FormattedMessage id="world.focusLeave" />
          </button>
        </div>

        {/* Pomodoro or free focus. */}
        <div className="flex gap-1.5 mb-4">
          <PixelChip on={pomodoro} onClick={() => f.setMode('pomodoro')}><FormattedMessage id="world.focusPomodoro" /></PixelChip>
          <PixelChip on={!pomodoro} onClick={() => f.setMode('free')}><FormattedMessage id="world.focusFree" /></PixelChip>
        </div>

        {/* The clock. */}
        <div className="px-inset px-notch py-5 mb-3 text-center">
          <p className="px-title !text-[13px] mb-1" style={{ color: !pomodoro || kind === 'work' ? 'var(--px-gold)' : 'var(--px-jade)' }}>
            {pomodoro ? <FormattedMessage id={PHASE_ID[kind]} /> : <FormattedMessage id="world.focusCounting" />}
          </p>
          <p className="px-title px-num !text-[56px] leading-none tracking-wider">{clock(shown)}</p>
          {pomodoro && (
            <div className="flex justify-center gap-1.5 mt-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-3 h-3" style={{ background: i < round || (i === round && kind !== 'work') ? 'var(--px-gold)' : '#3a2e26' }} />
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {timer.running
            ? <PixelButton tone="paper" onClick={tap(f.pause)} className="col-span-1"><FormattedMessage id="world.focusPause" /></PixelButton>
            : <PixelButton tone="jade" onClick={tap(f.start)} className="col-span-1"><FormattedMessage id="world.focusStart" /></PixelButton>}
          <PixelButton tone="paper" onClick={tap(f.reset)}><FormattedMessage id="world.focusReset" /></PixelButton>
          {pomodoro
            ? <PixelButton tone="paper" onClick={tap(f.skip)}><FormattedMessage id="world.focusSkip" /></PixelButton>
            : <span />}
        </div>

        {pomodoro && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {PRESETS.map((p, i) => (
              <PixelChip key={i} on={timer.preset === i} onClick={() => f.setPreset(i)}>{p.work}/{p.short}</PixelChip>
            ))}
          </div>
        )}

        <input
          value={timer.note}
          onChange={(e) => f.setNote(e.target.value)}
          placeholder={intl.formatMessage({ id: 'world.focusNote' })}
          className="px-inset px-notch w-full px-3 py-2 text-[14px] bg-transparent mb-3 outline-none"
        />

        <div className="flex items-center justify-between gap-2">
          <PixelChip on={f.rain} onClick={() => f.setRain(!f.rain)}>🌧 <FormattedMessage id="world.focusRain" /></PixelChip>
          <span className="text-[13px] text-[var(--px-muted)]">
            <FormattedMessage id="world.focusToday" values={{ minutes: minutesToday(timer, now) }} />
          </span>
        </div>
      </div>
    </div>
  );
}
