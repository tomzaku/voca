import { useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { ActivityKind, WorldActivity, WorldSkill } from '../../game/features';
import { playSelect } from '../../lib/sfx';
import { HudCenter, PixelButton, PixelIcon, type PixelIconName } from './pixel';

// What a skill's keeper offers: its activities, grouped the way a game would —
// Learn (battle the creeps), Practice (face the boss), Tools — each with the
// landmark it belongs to. Every option is on a number key, in reading order.
// Tools live in the skill bar instead (SkillToolbar), reachable from any of
// the skill's screens — unless they're all the skill has.

const KINDS: { kind: ActivityKind; icon: PixelIconName; color: string }[] = [
  { kind: 'learn', icon: 'sword', color: 'var(--px-jade)' },
  { kind: 'practice', icon: 'skull', color: 'var(--px-bad)' },
  { kind: 'tool', icon: 'search', color: 'var(--px-sky)' },
];
const KIND_KEY: Record<ActivityKind, string> = { learn: 'Learn', practice: 'Practice', tool: 'Tool' };

/** Whether a skill's tools sit in the skill bar rather than its menu. */
const toolsInBar = (skill: WorldSkill) => skill.activities.some((a) => a.kind !== 'tool');

export function SkillMenu({ skill, onPick }: { skill: WorldSkill; onPick: (a: WorldActivity) => void }) {
  const intl = useIntl();
  const kinds = toolsInBar(skill) ? KINDS.filter((k) => k.kind !== 'tool') : KINDS;
  // Reading order = number keys: Learn first, then Practice, then Tools.
  const ordered = kinds.flatMap(({ kind }) => skill.activities.filter((a) => a.kind === kind));
  const pick = (a: WorldActivity) => { playSelect(); onPick(a); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = ordered[Number(e.key) - 1];
      if (a) { e.preventDefault(); pick(a); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <HudCenter wide>
      <div className="flex items-center gap-3 mb-4">
        <span className="px-inset px-notch w-12 h-12 flex items-center justify-center text-[24px]">{skill.emoji}</span>
        <div>
          <p className="px-title !text-[20px] text-[var(--px-gold)]"><FormattedMessage id={skill.nameId} /></p>
          <p className="text-[14px] text-[var(--px-muted)]"><FormattedMessage id="world.menuChoose" /></p>
        </div>
      </div>
      <div className="space-y-4">
        {kinds.map(({ kind, icon, color }) => {
          const list = skill.activities.filter((a) => a.kind === kind);
          if (list.length === 0) return null;
          return (
            <section key={kind}>
              <p className="flex items-baseline gap-2 mb-1.5">
                <span className="px-title flex items-center gap-1.5" style={{ color }}>
                  <PixelIcon name={icon} size={2} /> <FormattedMessage id={`world.kind${KIND_KEY[kind]}`} />
                </span>
                <span className="text-[13px] text-[var(--px-muted)]"><FormattedMessage id={`world.kind${KIND_KEY[kind]}Blurb`} /></span>
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {list.map((a) => (
                  <button key={a.id} onClick={() => pick(a)} className="px-pick px-notch relative text-left px-3 py-2.5 flex items-start gap-3">
                    <span className="absolute top-1 right-1.5 px-title !text-[11px] text-[var(--px-gold)]">{ordered.indexOf(a) + 1}</span>
                    <span className="text-[22px] leading-none mt-0.5">{a.emoji}</span>
                    <span className="min-w-0">
                      <span className="block px-title !text-[15px]">{intl.formatMessage({ id: a.nameId })}</span>
                      <span className="block text-[13px] text-[var(--px-muted)] leading-snug">{intl.formatMessage({ id: a.blurbId })}</span>
                      <span className="block text-[12px] text-[var(--px-gold)] mt-0.5">{a.place}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </HudCenter>
  );
}

/** A skill's tools as buttons in the skill bar. `labels` overrides a tool's
 *  name (Collections shows the list you're studying); `attention` marks one
 *  that needs you (no collection picked yet). */
export function SkillToolbar({ skill, current, labels = {}, attention, onPick }: {
  skill: WorldSkill;
  /** The activity open now, if it's one of these. */
  current?: string;
  labels?: Record<string, string>;
  attention?: string;
  onPick: (a: WorldActivity) => void;
}) {
  const intl = useIntl();
  if (!toolsInBar(skill)) return null;
  return (
    <>
      {skill.activities.filter((a) => a.kind === 'tool').map((a) => {
        const label = labels[a.id] ?? intl.formatMessage({ id: a.nameId });
        return (
          <PixelButton
            key={a.id}
            tone={a.id === attention ? 'gold' : a.id === current ? 'sky' : 'paper'}
            onClick={() => { playSelect(); onPick(a); }}
            title={label}
            aria-label={label}
            className="!py-2 !px-3 max-w-[11rem]"
          >
            <span className="text-[15px] leading-none">{a.emoji}</span>
            <span className="hidden md:inline truncate">{label}</span>
          </PixelButton>
        );
      })}
    </>
  );
}
