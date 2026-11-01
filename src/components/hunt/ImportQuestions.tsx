import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { MAX_QUESTIONS, sameQuestion, type EditableQuestion } from '../../lib/hunt';
import { fetchSet, type SetSummary } from '../../lib/questionSetsApi';

type Loaded = EditableQuestion[] | 'loading' | 'failed';

/**
 * Picking questions from her other saved sets, one by one, to add to this
 * hunt's. Each set is a group she can open; its questions are fetched only
 * then, so a teacher with many sets doesn't download them all to pick three.
 * Questions she already has here are shown, but can't be picked twice.
 */
export function ImportQuestions({ sets, current, onImport, onClose }: {
  sets: SetSummary[];
  current: EditableQuestion[];
  onImport: (picked: EditableQuestion[]) => void;
  onClose: () => void;
}) {
  const intl = useIntl();
  const [loaded, setLoaded] = useState<Record<string, Loaded>>({});
  const [open, setOpen] = useState<Set<string>>(() => new Set(sets.slice(0, 1).map((s) => s.id)));
  // Picked, in the order she ticked them: `${setId}:${questionId}`.
  const [picked, setPicked] = useState<string[]>([]);
  const started = useRef(new Set<string>());
  // Groups ticked whole before their questions arrived: tick them on arrival.
  const [wantAll, setWantAll] = useState<Set<string>>(() => new Set());
  const wantAllRef = useRef(new Set<string>());

  const load = (id: string) => {
    if (started.current.has(id)) return;
    started.current.add(id);
    setLoaded((l) => ({ ...l, [id]: 'loading' }));
    fetchSet(id)
      .then((set) => {
        setLoaded((l) => ({ ...l, [id]: set.questions }));
        if (!wantAllRef.current.has(id)) return;
        wantAllRef.current.delete(id);
        setWantAll(new Set(wantAllRef.current));
        const keys = set.questions.filter((q) => !current.some((c) => sameQuestion(c, q))).map((q) => `${id}:${q.id}`);
        setPicked((p) => [...p, ...keys.filter((k) => !p.includes(k))]);
      })
      .catch(() => {
        started.current.delete(id);
        wantAllRef.current.delete(id);
        setWantAll(new Set(wantAllRef.current));
        setLoaded((l) => ({ ...l, [id]: 'failed' }));
      });
  };
  useEffect(() => { open.forEach(load); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const have = (q: EditableQuestion) => current.some((c) => sameQuestion(c, q));
  const keyOf = (setId: string, q: EditableQuestion) => `${setId}:${q.id}`;

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const toggleOpen = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const room = Math.max(0, MAX_QUESTIONS - current.length);
  const tooMany = picked.length > room;

  const submit = () => {
    const byKey = new Map<string, EditableQuestion>();
    for (const [setId, qs] of Object.entries(loaded)) if (Array.isArray(qs)) qs.forEach((q) => byKey.set(keyOf(setId, q), q));
    onImport(picked.map((k) => byKey.get(k)).filter((q): q is EditableQuestion => !!q));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className="w-full max-w-xl rounded-2xl border border-border bg-bg-card shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-3">
          <div>
            <h3 id="import-title" className="font-display font-extrabold text-text-primary"><FormattedMessage id="hunt.import.title" /></h3>
            <p className="text-xs text-text-muted mt-0.5"><FormattedMessage id="hunt.import.hint" /></p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 shrink-0 rounded-full bg-bg-tertiary text-text-muted flex items-center justify-center hover:text-text-primary"
            aria-label={intl.formatMessage({ id: 'common.close' })}
          >
            <Icon icon="lucide:x" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-2">
          {sets.length === 0 && <p className="text-sm text-text-muted py-6 text-center"><FormattedMessage id="hunt.import.none" /></p>}
          {sets.map((s) => {
            const qs = loaded[s.id];
            const isOpen = open.has(s.id);
            const pickable = Array.isArray(qs) ? qs.filter((q) => !have(q)) : [];
            const mine = pickable.filter((q) => picked.includes(keyOf(s.id, q))).length;
            const all = pickable.length > 0 && mine === pickable.length;
            return (
              <div key={s.id} className="rounded-xl border border-border">
                <div className="flex items-center gap-2 px-3 py-2.5">
                  {/* The whole group at once — only once its questions are here. */}
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[var(--color-accent-cyan)]"
                    disabled={Array.isArray(qs) ? !pickable.length : qs === 'loading' && !wantAll.has(s.id)}
                    checked={all || wantAll.has(s.id)}
                    ref={(el) => { if (el) el.indeterminate = mine > 0 && !all; }}
                    onChange={() => {
                      if (!Array.isArray(qs)) {
                        wantAllRef.current.add(s.id);
                        setWantAll(new Set(wantAllRef.current));
                        setOpen((o) => new Set(o).add(s.id));
                        return;
                      }
                      setPicked((p) => {
                        const keys = pickable.map((q) => keyOf(s.id, q));
                        return all ? p.filter((k) => !keys.includes(k)) : [...p, ...keys.filter((k) => !p.includes(k))];
                      });
                    }}
                    aria-label={intl.formatMessage({ id: 'hunt.import.all' }, { title: s.title })}
                  />
                  <button type="button" onClick={() => toggleOpen(s.id)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                    <span className="flex-1 min-w-0 font-bold text-sm text-text-primary truncate">{s.title}</span>
                    <span className="text-xs text-text-muted shrink-0">
                      {mine > 0 && <span className="text-accent-cyan font-bold">{mine} / </span>}
                      <FormattedMessage id="hunt.editor.questionsN" values={{ n: s.questionCount }} />
                    </span>
                    <Icon icon={isOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'} className="text-text-muted shrink-0" />
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-border px-3 py-2 space-y-0.5">
                    {qs === 'loading' && <div className="py-3 flex justify-center"><div className="w-5 h-5 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" /></div>}
                    {qs === 'failed' && (
                      <button type="button" onClick={() => load(s.id)} className="py-2 text-xs font-bold text-accent-red">
                        <FormattedMessage id="hunt.import.failed" />
                      </button>
                    )}
                    {Array.isArray(qs) && qs.length === 0 && <p className="py-2 text-xs text-text-muted"><FormattedMessage id="hunt.import.empty" /></p>}
                    {Array.isArray(qs) && qs.map((q) => {
                      const k = keyOf(s.id, q);
                      const already = have(q);
                      return (
                        <label key={q.id} className={`flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 ${already ? 'opacity-50' : 'cursor-pointer hover:bg-bg-tertiary'}`}>
                          <input
                            type="checkbox"
                            className="mt-0.5 w-4 h-4 shrink-0 accent-[var(--color-accent-cyan)]"
                            disabled={already}
                            checked={already || picked.includes(k)}
                            onChange={() => toggle(k)}
                          />
                          <span className="flex-1 min-w-0 text-sm">
                            <span className="text-[11px] font-bold px-1.5 py-0.5 mr-1.5 rounded-full bg-accent-cyan/15 text-accent-cyan whitespace-nowrap">
                              <FormattedMessage id={`hunt.typeName.${q.type}`} />
                            </span>
                            <span className="text-text-primary">{summary(q)}</span>
                            <span className="text-accent-green font-bold"> → {q.slots?.length ? q.slots.join(', ') : q.answer}</span>
                            {already && <span className="text-xs text-text-muted"> · <FormattedMessage id="hunt.import.already" /></span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-border">
          <p className={`flex-1 text-xs ${tooMany ? 'text-accent-red font-bold' : 'text-text-muted'}`}>
            {tooMany
              ? <FormattedMessage id="hunt.import.tooMany" values={{ room }} />
              : <FormattedMessage id="hunt.import.picked" values={{ n: picked.length }} />}
          </p>
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary">
            <FormattedMessage id="hunt.teacher.cancel" />
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!picked.length || tooMany}
            className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-display font-extrabold disabled:opacity-40 flex items-center gap-1.5"
          >
            <Icon icon="lucide:download" /> <FormattedMessage id="hunt.import.button" values={{ n: picked.length }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** A question in one line: what it asks. */
function summary(q: EditableQuestion): string {
  if (q.type === 'match') return (q.slotPrompts ?? []).join(' · ');
  return q.prompt || q.scrambled || q.say || q.imageWord || '';
}
