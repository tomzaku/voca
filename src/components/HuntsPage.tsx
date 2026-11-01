import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../hooks/useAuth';
import {
  HUNT_PLACES,
  picturesInUse,
  pickPlaces,
  problemOf,
  stationsFromQuestions,
  TREASURE_IDEAS,
  type EditableQuestion,
} from '../lib/hunt';
import { QuestionEditor } from './hunt/QuestionEditor';
import { createHunt, deleteHunt, listHunts, type HuntMode, type HuntSummary } from '../lib/huntsApi';

const DURATIONS = [10, 15, 20, 30, 45, 60];

/**
 * A teacher's treasure hunts, at /hunts: the ones they've made, and the form
 * to make another. A hunt's questions are built and reviewed here (see
 * QuestionEditor), while the teacher is signed in to look the words up — so
 * students, who have no accounts, never need the word service at all.
 */
export function HuntsPage() {
  const intl = useIntl();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [hunts, setHunts] = useState<HuntSummary[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    let alive = true;
    listHunts()
      .then((h) => { if (alive) { setHunts(h); if (!h.length) setCreating(true); } })
      .catch((err) => { if (alive) { setHunts([]); toast.error((err as Error).message); } });
    return () => { alive = false; };
  }, [user, authLoading]);

  if (authLoading) return <div className="flex justify-center py-24"><div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" /></div>;

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3" aria-hidden>🗺️</div>
        <h1 className="text-xl font-display font-extrabold text-text-primary mb-2"><FormattedMessage id="hunt.teacher.signInTitle" /></h1>
        <p className="text-sm text-text-muted mb-4"><FormattedMessage id="hunt.teacher.signInBody" /></p>
        <button onClick={signInWithGoogle} className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-bold"><FormattedMessage id="quiz.share.signIn" /></button>
      </div>
    );
  }

  const remove = async (h: HuntSummary) => {
    if (!window.confirm(intl.formatMessage({ id: 'hunt.teacher.confirmDelete' }, { title: h.title }))) return;
    try {
      await deleteHunt(h.id);
      setHunts((list) => (list ?? []).filter((x) => x.id !== h.id));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="max-w-page mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-extrabold text-text-primary"><FormattedMessage id="hunt.teacher.title" /></h1>
          <p className="text-sm text-text-muted mt-1"><FormattedMessage id="hunt.teacher.subtitle" /></p>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} className="shrink-0 px-4 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-bold flex items-center gap-1.5">
            <Icon icon="lucide:plus" /> <FormattedMessage id="hunt.teacher.new" />
          </button>
        )}
      </div>

      {creating && <CreateHunt onCancel={hunts?.length ? () => setCreating(false) : undefined} />}

      {hunts === null ? null : hunts.length > 0 && (
        <div className="space-y-2">
          {hunts.map((h) => (
            <div key={h.id} className="rounded-2xl border border-border bg-bg-card p-4 flex items-center gap-3">
              <div className="text-2xl" aria-hidden>{h.mode === 'world' ? '🏯' : '🏫'}</div>
              <Link to={`/hunts/${h.id}`} className="flex-1 min-w-0">
                <p className="font-display font-extrabold text-text-primary truncate">{h.title}</p>
                <p className="text-xs text-text-muted">
                  <FormattedMessage id={`hunt.status.${h.status}`} /> · <FormattedMessage id="hunt.teacher.stations" values={{ n: h.stations }} /> · <span className="font-mono">{h.code}</span>
                </p>
              </Link>
              <Link to={`/hunts/${h.id}`} className="px-3 py-2 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary"><FormattedMessage id="hunt.teacher.open" /></Link>
              <button onClick={() => void remove(h)} className="p-2 rounded-xl text-text-muted hover:text-accent-red" aria-label={intl.formatMessage({ id: 'hunt.teacher.delete' })}>
                <Icon icon="lucide:trash-2" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateHunt({ onCancel }: { onCancel?: () => void }) {
  const intl = useIntl();
  const navigate = useNavigate();

  const [title, setTitle] = useState(() => intl.formatMessage({ id: 'hunt.title' }));
  const [mode, setMode] = useState<HuntMode>('qr');
  const [treasure, setTreasure] = useState('GOLD');
  const [need, setNeed] = useState(2);
  const [duration, setDuration] = useState(20);
  const [teamNames, setTeamNames] = useState<[string, string]>(() => [
    intl.formatMessage({ id: 'hunt.teamRed' }),
    intl.formatMessage({ id: 'hunt.teamBlue' }),
  ]);
  const [clues, setClues] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>(() => pickPlaces(8));
  const [saving, setSaving] = useState(false);
  const [questions, setQuestions] = useState<EditableQuestion[]>([]);
  const [pictures, setPictures] = useState<Record<string, string>>({});

  const cleanTreasure = treasure.toUpperCase().replace(/[^A-Z]/g, '');
  const count = cleanTreasure.length;
  const treasureOk = count >= 3 && count <= 8;
  const askable = questions.filter((q) => !problemOf(q));
  const ready = title.trim() && treasureOk && askable.length >= count && !saving;

  const create = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      const stations = stationsFromQuestions(questions, count, {
        places: mode === 'world' ? places.slice(0, count) : undefined,
        clues: mode === 'qr' ? clues : undefined,
      });
      const hunt = await createHunt({
        title: title.trim(),
        mode,
        treasure: cleanTreasure,
        stations,
        images: picturesInUse(askable, pictures),
        need,
        durationMin: duration,
        teamNames,
      });
      navigate(`/hunts/${hunt.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const label = 'block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5';
  const input = 'w-full bg-bg-tertiary border-2 border-border rounded-xl px-3 py-2.5 text-text-primary font-semibold focus:outline-none focus:border-accent-cyan';
  const chip = (on: boolean) => `px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-colors ${on ? 'border-accent-cyan bg-accent-cyan/15 text-text-primary' : 'border-border text-text-muted'}`;

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-5">
      <div>
        <label className={label} htmlFor="hunt-title"><FormattedMessage id="hunt.teacher.name" /></label>
        <input id="hunt-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={input} />
      </div>

      <div>
        <span className={label}><FormattedMessage id="hunt.teacher.where" /></span>
        <div className="grid sm:grid-cols-2 gap-2">
          {(['qr', 'world'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`text-left p-3 rounded-xl border-2 ${mode === m ? 'border-accent-cyan bg-accent-cyan/10' : 'border-border'}`}>
              <p className="font-bold text-text-primary">{m === 'qr' ? '🏫' : '🏯'} <FormattedMessage id={`hunt.mode.${m}`} /></p>
              <p className="text-xs text-text-muted mt-0.5"><FormattedMessage id={`hunt.mode.${m}Hint`} /></p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={label} htmlFor="hunt-treasure"><FormattedMessage id="hunt.teacher.treasure" /></label>
        <input
          id="hunt-treasure"
          value={treasure}
          onChange={(e) => setTreasure(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          maxLength={8}
          className={input + ' tracking-[0.3em] font-display font-extrabold uppercase'}
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {TREASURE_IDEAS.map((t) => (
            <button key={t} type="button" onClick={() => setTreasure(t)} className={chip(cleanTreasure === t)}>{t}</button>
          ))}
        </div>
        <p className={`text-xs mt-1 ${treasureOk ? 'text-text-muted' : 'text-accent-red'}`}>
          <FormattedMessage id="hunt.teacher.treasureHint" values={{ n: count }} />
        </p>
      </div>

      {treasureOk && mode === 'qr' && (
        <div>
          <span className={label}><FormattedMessage id="hunt.teacher.clues" /></span>
          <p className="text-xs text-text-muted mb-2"><FormattedMessage id="hunt.teacher.cluesHint" /></p>
          <div className="space-y-1.5">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-xs font-bold text-text-muted"><FormattedMessage id="hunt.teacher.cardN" values={{ n: i + 1 }} /></span>
                <input
                  value={clues[i] ?? ''}
                  onChange={(e) => setClues((c) => { const next = [...c]; next[i] = e.target.value; return next; })}
                  maxLength={160}
                  placeholder={intl.formatMessage({ id: 'hunt.teacher.cluePlaceholder' })}
                  className={input + ' !py-2 font-normal'}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {treasureOk && mode === 'world' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className={label + ' !mb-0'}><FormattedMessage id="hunt.teacher.places" /></span>
            <button type="button" onClick={() => setPlaces(pickPlaces(8))} className="text-xs font-bold text-accent-cyan flex items-center gap-1">
              <Icon icon="lucide:shuffle" /> <FormattedMessage id="hunt.teacher.shuffle" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-xs font-bold text-text-muted">{i + 1}</span>
                <select
                  value={places[i]}
                  onChange={(e) => setPlaces((p) => {
                    const next = [...p];
                    // Swap rather than duplicate: two stations can't share a place.
                    const j = next.indexOf(e.target.value);
                    if (j >= 0) next[j] = next[i];
                    next[i] = e.target.value;
                    return next;
                  })}
                  className="flex-1 bg-bg-tertiary border border-border rounded-lg px-2 py-1.5 text-sm text-text-primary"
                >
                  {HUNT_PLACES.map((p) => <option key={p} value={p}>{intl.formatMessage({ id: `places.${p}` })}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className={label}><FormattedMessage id="hunt.editor.title" /></span>
        <p className="text-xs text-text-muted mb-3"><FormattedMessage id="hunt.editor.hint" /></p>
        <QuestionEditor
          questions={questions}
          onChange={setQuestions}
          pictures={pictures}
          onPictures={(add) => setPictures((p) => ({ ...p, ...add }))}
          needed={treasureOk ? count : 3}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <span className={label}><FormattedMessage id="hunt.teacher.need" /></span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => <button key={n} type="button" onClick={() => setNeed(n)} className={chip(need === n)}>{n}</button>)}
          </div>
          <p className="text-xs text-text-muted mt-1"><FormattedMessage id="hunt.teacher.needHint" /></p>
        </div>
        <div>
          <span className={label}><FormattedMessage id="hunt.teacher.duration" /></span>
          <div className="flex flex-wrap gap-1.5">
            {DURATIONS.map((d) => <button key={d} type="button" onClick={() => setDuration(d)} className={chip(duration === d)}>{d}′</button>)}
          </div>
        </div>
      </div>

      <div>
        <span className={label}><FormattedMessage id="hunt.teacher.teamNames" /></span>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <input
              key={i}
              value={teamNames[i]}
              onChange={(e) => setTeamNames((n) => (i === 0 ? [e.target.value, n[1]] : [n[0], e.target.value]))}
              maxLength={24}
              className={input}
              style={{ borderColor: i === 0 ? 'var(--color-accent-red)' : 'var(--color-accent-blue)' }}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary">
            <FormattedMessage id="hunt.teacher.cancel" />
          </button>
        )}
        <button
          type="button"
          onClick={() => void create()}
          disabled={!ready}
          className="px-5 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-display font-extrabold disabled:opacity-40 flex items-center gap-2"
        >
          {saving
            ? <><span className="w-4 h-4 rounded-full border-2 border-bg-primary/30 border-t-bg-primary animate-spin" /> <FormattedMessage id="hunt.teacher.saving" /></>
            : <><Icon icon="lucide:map" /> <FormattedMessage id="hunt.teacher.create" /></>}
        </button>
      </div>
    </div>
  );
}
