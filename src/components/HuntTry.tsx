import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { fetchRehearsal } from '../lib/huntsApi';
import { doodleKey, fetchDoodles, readLocalDoodle } from '../lib/doodles';
import {
  answer,
  currentAnswer,
  currentQuestion,
  currentStation,
  found,
  rehearsalLetters,
  startRehearsal,
  type Rehearsal,
} from '../lib/rehearsal';
import { HuntQuestion, TreasureLock } from './hunt/HuntQuestion';
import { RaceTrack, TEAM_COLOR } from './hunt/teams';

/**
 * The teacher plays her own hunt through as a student, at /hunts/:id/try —
 * Team Red's route, the real questions and clues, graded by the real rules
 * (src/lib/rehearsal.ts). The screens are the phone's own components, so what
 * she sees is what a student sees. Nothing is joined or recorded.
 */
export function HuntTry() {
  const { id = '' } = useParams<{ id: string }>();
  const intl = useIntl();
  const [hunt, setHunt] = useState<Rehearsal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState(startRehearsal);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    fetchRehearsal(id).then(setHunt).catch((err) => setError((err as Error).message));
  }, [id]);

  // A picture question's picture: by the question's word, from the app's own
  // doodles — the teacher is signed in, so no student token is needed.
  const loadImage = useCallback(async (key: string) => {
    const word = hunt?.stations.flatMap((s) => s.questions).find((q) => q.id === key)?.imageWord;
    if (!word) throw new Error('No picture.');
    const local = readLocalDoodle(doodleKey(word));
    if (local) return local;
    const got = await fetchDoodles([{ word }]);
    const src = got[doodleKey(word)];
    if (!src) throw new Error('No picture.');
    return src;
  }, [hunt]);

  if (!hunt) {
    return (
      <div className="flex justify-center py-24 text-text-muted">
        {error ?? <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />}
      </div>
    );
  }

  const station = currentStation(hunt, state);
  const question = currentQuestion(hunt, state);
  const n = hunt.stations.length;
  const act = (next: typeof state) => { setState(next); setReveal(false); };
  const onAnswer = (a: string | string[]) => act(answer(hunt, state, a));

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Link to={`/hunts/${id}`} className="p-2 rounded-xl bg-bg-tertiary text-text-muted" aria-label={intl.formatMessage({ id: 'hunt.teacher.back' })}>
          <Icon icon="lucide:arrow-left" />
        </Link>
        <h1 className="flex-1 font-display font-extrabold text-text-primary truncate">
          <FormattedMessage id="hunt.try.title" />
        </h1>
        <button onClick={() => act(startRehearsal())} className="px-3 py-2 rounded-xl bg-bg-tertiary text-xs font-bold text-text-primary flex items-center gap-1">
          <Icon icon="lucide:rotate-ccw" /> <FormattedMessage id="hunt.try.restart" />
        </button>
      </div>

      <p className="rounded-xl bg-accent-yellow/10 border border-accent-yellow/40 px-3 py-2 text-xs text-text-secondary leading-relaxed">
        <FormattedMessage id="hunt.try.note" values={{ need: hunt.need }} />
      </p>

      {/* What a Red student's phone shows. */}
      <div className="rounded-2xl p-4 text-white" style={{ background: TEAM_COLOR[0] }}>
        <p className="text-xs font-bold uppercase tracking-wider opacity-80"><FormattedMessage id="hunt.youAreOn" /></p>
        <p className="text-2xl font-display font-extrabold">{hunt.teamNames[0]}</p>
      </div>
      <div className="rounded-2xl border border-border bg-bg-card p-4">
        <RaceTrack name={hunt.teamNames[0]} team={0} stations={n} position={state.position} phase={state.phase} compact />
      </div>

      <div className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
        {state.phase === 'find' && station && (
          <div className="text-center space-y-3">
            <div className="text-5xl" aria-hidden>{hunt.mode === 'world' ? '🧭' : '🔎'}</div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
              <FormattedMessage id={hunt.mode === 'world' ? 'hunt.goTo' : 'hunt.findCard'} values={{ n: state.position + 1 }} />
            </p>
            <p className="font-display font-extrabold text-xl text-text-primary">
              {hunt.mode === 'world'
                ? station.place ? intl.formatMessage({ id: `places.${station.place}` }) : '…'
                : station.clue || intl.formatMessage({ id: 'hunt.noClue' })}
            </p>
            <p className="text-xs text-text-muted">
              <FormattedMessage id={hunt.mode === 'world' ? 'hunt.try.worldStep' : 'hunt.try.cardStep'} />
            </p>
            <button onClick={() => act(found(state))} className="px-5 py-3 rounded-xl bg-accent-cyan text-bg-primary font-display font-extrabold">
              <FormattedMessage id={hunt.mode === 'world' ? 'hunt.try.arrived' : 'hunt.try.foundCard'} />
            </button>
          </div>
        )}

        {state.phase === 'solve' && question && (
          <>
            <p className="font-display font-extrabold text-text-primary">
              <FormattedMessage id="hunt.stationN" values={{ n: state.position + 1, total: n }} />
            </p>
            <HuntQuestion question={question} cooldown={0} busy={false} onAnswer={onAnswer} loadImage={loadImage} />
          </>
        )}

        {state.phase === 'final' && (
          <>
            <div className="text-center">
              <div className="text-5xl mb-2" aria-hidden>🧰</div>
              <p className="font-display font-extrabold text-xl text-text-primary"><FormattedMessage id="hunt.finalTitle" /></p>
              <p className="text-sm text-text-muted mt-1"><FormattedMessage id="hunt.finalBody" values={{ n }} /></p>
            </div>
            <TreasureLock letters={rehearsalLetters(state)} cooldown={0} busy={false} onAnswer={onAnswer} />
          </>
        )}

        {state.phase === 'done' && (
          <div className="text-center py-4 space-y-3">
            <div className="text-6xl" aria-hidden>🏆</div>
            <p className="font-display font-extrabold text-2xl text-text-primary"><FormattedMessage id="hunt.youWon" /></p>
            <p className="text-sm text-text-muted"><FormattedMessage id="hunt.try.doneBody" /></p>
            <div className="flex justify-center gap-2">
              <button onClick={() => act(startRehearsal())} className="px-4 py-2.5 rounded-xl bg-bg-tertiary text-sm font-bold text-text-primary">
                <FormattedMessage id="hunt.try.again" />
              </button>
              <Link to={`/hunts/${id}`} className="px-4 py-2.5 rounded-xl bg-accent-cyan text-bg-primary text-sm font-bold">
                <FormattedMessage id="hunt.try.backToBoard" />
              </Link>
            </div>
          </div>
        )}

        {state.last && state.phase !== 'done' && (
          <p className={`text-sm font-bold ${state.last === 'right' ? 'text-accent-green' : 'text-accent-red'}`}>
            <FormattedMessage id={state.last === 'right' ? 'hunt.try.right' : state.phase === 'final' ? 'hunt.try.wrongWord' : 'hunt.wrong'} />
          </p>
        )}

        {(state.phase === 'solve' || state.phase === 'final') && (
          <button onClick={() => setReveal((r) => !r)} className="text-xs font-bold text-text-muted hover:text-text-primary flex items-center gap-1">
            <Icon icon={reveal ? 'lucide:eye-off' : 'lucide:eye'} />
            {reveal
              ? <FormattedMessage id="hunt.try.answerIs" values={{ answer: <b className="text-accent-green">{currentAnswer(hunt, state)}</b> }} />
              : <FormattedMessage id="hunt.try.showAnswer" />}
          </button>
        )}
      </div>
    </div>
  );
}
