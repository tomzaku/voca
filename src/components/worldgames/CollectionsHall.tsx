import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import type { WorldStation } from '../../game/types';
import { playSelect } from '../../lib/sfx';
import { HudCenter, PixelBar, PixelButton, PixelChip, PixelIcon } from './pixel';
import { KIND_META } from './collectionKinds';

// The collections' keeper before Điện Thái Hòa: one person for every word
// list you have — your own, the ones you joined, and the levels — instead of
// a villager per collection crowding the map. Pick a list, then study it,
// preview its words, quiz yourself or see your progress; your own lists can
// be edited, shared and deleted here too. The actions are WorldGame's own
// (the same modals and store calls the map used).

type Kind = WorldStation['kind'];

const KINDS: Kind[] = ['mine', 'joined', 'level'];

export interface CollectionActions {
  onStudy: (s: WorldStation) => void;
  onPreview: (s: WorldStation) => void;
  onQuiz: (s: WorldStation) => void;
  onStats: (s: WorldStation) => void;
  onCreate: () => void;
  onEdit: (s: WorldStation) => void;
  onShare: (s: WorldStation) => void;
  onDelete: (s: WorldStation) => void;
}

export function CollectionsHall({ stations, focusId, ...act }: CollectionActions & {
  stations: WorldStation[];
  /** A collection picked from the travel drawer: open on it. */
  focusId?: string | null;
}) {
  const intl = useIntl();
  const focused = stations.find((s) => s.id === focusId);
  const firstKind = KINDS.find((k) => stations.some((s) => s.kind === k)) ?? 'mine';
  const [kind, setKind] = useState<Kind>(focused?.kind ?? stations.find((s) => s.active)?.kind ?? firstKind);
  const [pickedId, setPickedId] = useState<string | null>(focused?.id ?? null);
  // A drawer pick while the hall is already open moves the selection there.
  const [lastFocus, setLastFocus] = useState(focusId);
  if (focusId !== lastFocus) {
    setLastFocus(focusId);
    if (focused) { setKind(focused.kind); setPickedId(focused.id); }
  }

  const list = stations.filter((s) => s.kind === kind);
  const picked = stations.find((s) => s.id === pickedId) ?? null;
  const pick = (s: WorldStation) => { playSelect(); setPickedId(s.id === pickedId ? null : s.id); };

  // Keep the picked row in view (a drawer pick may be far down a long list).
  useEffect(() => {
    if (pickedId) document.querySelector(`[data-collection="${CSS.escape(pickedId)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [pickedId]);

  return (
    <HudCenter wide>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="px-title !text-[18px] text-[var(--px-gold)]"><FormattedMessage id="world.collectionsPick" /></p>
        <PixelButton tone="jade" onClick={act.onCreate}>
          <PixelIcon name="plus" size={2} /> <FormattedMessage id="world.newCollection" />
        </PixelButton>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {KINDS.map((k) => (
          <PixelChip key={k} on={k === kind} onClick={() => setKind(k)}>
            <span className="inline-flex items-center gap-1.5" style={{ color: k === kind ? undefined : KIND_META[k].color }}>
              <PixelIcon name={KIND_META[k].icon} size={2} />
              <FormattedMessage id={KIND_META[k].groupId} />
              <span className="opacity-60">{stations.filter((s) => s.kind === k).length}</span>
            </span>
          </PixelChip>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-[15px] text-[var(--px-muted)] py-6 text-center">
          <FormattedMessage id={kind === 'mine' ? 'world.collectionsNoneMine' : 'world.collectionsNone'} />
        </p>
      ) : (
        <div className="space-y-1.5 max-h-[52vh] overflow-y-auto p-0.5">
          {list.map((s) => {
            const open = s.id === picked?.id;
            return (
              <div key={s.id} data-collection={s.id} className={open ? 'px-inset px-notch p-1.5' : ''}>
                <button onClick={() => pick(s)} data-on={s.active} className="px-pick px-notch w-full text-left px-3 py-2">
                  <span className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 truncate px-title !text-[14px]">{s.name}</span>
                    {s.active && <span className="px-title !text-[11px] text-[var(--px-jade)]"><FormattedMessage id="world.studying" /></span>}
                    <span className="px-num text-[14px] text-[var(--px-muted)]">{s.pct}%</span>
                  </span>
                  <span className="block text-[12px] text-[var(--px-muted)] mt-0.5">
                    <FormattedMessage id="world.wordCount" values={{ count: s.words.length }} />
                    {(s.learners ?? 0) > 0 && <> · <FormattedMessage id="world.learners" values={{ count: s.learners }} /></>}
                  </span>
                </button>
                {open && (
                  <div className="p-1.5 pt-2.5 space-y-2.5">
                    <PixelBar pct={s.pct} color={KIND_META[s.kind].color} label={`${s.pct}%`} />
                    <div className="flex flex-wrap gap-2">
                      <PixelButton tone={s.active ? 'jade' : 'gold'} className="flex-1" onClick={() => act.onStudy(s)}>
                        <FormattedMessage id={s.active ? 'world.studying' : 'world.studyThis'} />
                      </PixelButton>
                      {([
                        ['eye', 'world.previewWords', act.onPreview],
                        ['play', 'world.quizCollection', act.onQuiz],
                        ['chart', 'world.progressStats', act.onStats],
                      ] as const).map(([icon, label, run]) => (
                        <PixelButton key={icon} tone="paper" onClick={() => run(s)} title={intl.formatMessage({ id: label })}>
                          <PixelIcon name={icon} size={2} /> <span className="hidden sm:inline"><FormattedMessage id={label} /></span>
                        </PixelButton>
                      ))}
                    </div>
                    {s.kind === 'mine' && (
                      <div className="flex flex-wrap gap-2">
                        {([
                          ['pencil', 'world.edit', act.onEdit, 'paper'],
                          ['share', 'world.share', act.onShare, 'paper'],
                          ['trash', 'world.delete', act.onDelete, 'bad'],
                        ] as const).map(([icon, label, run, tone]) => (
                          <PixelButton key={icon} tone={tone} className="!py-1.5 !px-3" onClick={() => run(s)}>
                            <PixelIcon name={icon} size={2} /> <FormattedMessage id={label} />
                          </PixelButton>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </HudCenter>
  );
}
