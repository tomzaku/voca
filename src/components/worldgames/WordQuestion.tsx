import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCollections } from '../../hooks/useCollections';
import { getCollection, listCollections } from '../../lib/collections';
import { checkAnswer, fetchQuestions, type AnswerResult, type WordQuestion, type WordReveal } from '../../lib/questionsApi';
import { playCorrect, playSelect, playWrong } from '../../lib/sfx';
import { speakText, stopSpeaking } from '../../lib/tts';
import { KIND_META } from './collectionKinds';
import { PixelButton, PixelIcon, PixelLoader, type PixelTone } from './pixel';

/**
 * One question: the prompt and four options. Choosing asks the server
 * whether it was right — this device doesn't know — then shows the answer
 * explained (its definition, how it's said, your own language's word for it,
 * an example), so even a wrong guess leaves something learned. `onAnswered`
 * waits for Continue — there's reading to do — unless there's nothing to read.
 *
 * Top right, the collection the question came from, and a way to change it:
 * a word that's far too hard is better swapped for an easier list than
 * guessed at. Switching makes that list the one you study (everywhere, as
 * the Collections page would) and puts a question from it in this one's
 * place — fetched here, unless the caller would rather refetch its own
 * (`onCollectionChanged`, for a game that holds a whole round).
 */
export function WordQuestionCard({ q, onAnswered, lead, onCollectionChanged }: {
  q: WordQuestion;
  onAnswered: (correct: boolean, answer: string) => void;
  /** A line above the prompt: what the question is for. */
  lead?: React.ReactNode;
  /** The caller brings the next question itself after a switch. */
  onCollectionChanged?: () => void;
}) {
  // A replacement fetched here after a switch, for as long as `q` is the
  // question it replaced.
  const [swap, setSwap] = useState<{ for: string; q: WordQuestion } | null>(null);
  const [picking, setPicking] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [answering, setAnswering] = useState(false);
  const shown = swap && swap.for === q.token ? swap.q : q;

  const switched = async (changed: boolean) => {
    setPicking(false);
    if (!changed) return;
    if (onCollectionChanged) { onCollectionChanged(); return; }
    setFetching(true);
    const [next] = await fetchQuestions(1);
    setFetching(false);
    // Nothing from the new list (no stored definitions yet): keep this one.
    if (next) setSwap({ for: q.token, q: next });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">{lead}</div>
        {!answering && <CollectionButton open={picking} onClick={() => { playSelect(); setPicking((p) => !p); }} />}
      </div>
      {picking
        ? <CollectionPicker onPicked={(changed) => void switched(changed)} />
        : fetching
          ? <PixelLoader label={<FormattedMessage id="world.questionSwitching" />} />
          : <Choices key={shown.token} q={shown} onChose={() => setAnswering(true)} onAnswered={onAnswered} />}
    </div>
  );
}

function Choices({ q, onChose, onAnswered }: { q: WordQuestion; onChose: () => void; onAnswered: (correct: boolean, answer: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerResult | null>(null);

  const pick = async (o: string) => {
    if (picked) return;
    setPicked(o);
    onChose();
    const r = await checkAnswer(q.token, o);
    setResult(r);
    if (r?.correct) playCorrect(); else playWrong();
    // Couldn't check (offline, expired): counted as wrong, with nothing to read — move on.
    if (!r) window.setTimeout(() => onAnswered(false, ''), 1100);
  };

  const tone = (o: string): PixelTone => {
    if (!picked) return 'paper';
    if (!result) return o === picked ? 'gold' : 'paper';
    if (result.answer && o.toLowerCase() === result.answer.toLowerCase()) return 'good';
    return o === picked ? 'bad' : 'paper';
  };

  return (
    <>
      <p className="px-inset px-notch p-3 text-[15px] leading-snug">{q.prompt}</p>
      <div className="grid grid-cols-2 gap-2">
        {q.options.map((o) => (
          <PixelButton key={o} tone={tone(o)} block onClick={() => void pick(o)} disabled={!!picked} className="!py-2 !text-[14px] !px-2">
            {o}
          </PixelButton>
        ))}
      </div>
      {result && (
        <>
          {result.reveal && <RevealCard r={result.reveal} />}
          <PixelButton tone="gold" block onClick={() => { stopSpeaking(); playSelect(); onAnswered(result.correct, result.answer); }} className="!py-2 !text-[14px]">
            <FormattedMessage id="world.questionContinue" />
          </PixelButton>
        </>
      )}
    </>
  );
}

/** The answer, explained: the word and how it sounds, then what it means in both languages. */
function RevealCard({ r }: { r: WordReveal }) {
  return (
    <div className="px-inset px-notch p-3 space-y-1.5 px-in-up">
      <div className="flex items-baseline flex-wrap gap-x-2">
        <span className="px-title !text-[18px] text-[var(--px-gold)]">{r.word}</span>
        {r.phonetic && <span className="text-[13px] text-[var(--px-muted)]">{r.phonetic}</span>}
        {r.partOfSpeech && <span className="text-[12px] italic text-[var(--px-muted)]">{r.partOfSpeech}</span>}
        <button onClick={() => { stopSpeaking(); void speakText(r.word); }} className="self-center text-[var(--px-sky)]" aria-label={r.word}>
          <PixelIcon name="speaker" size={2} />
        </button>
      </div>
      {r.translation && <p className="text-[15px] font-bold">{r.translation}</p>}
      {r.definition && <p className="text-[13px] leading-snug">{r.definition}</p>}
      {r.example && (
        <p className="text-[13px] leading-snug text-[var(--px-muted)] border-l-2 border-[#5a4630] pl-2">
          <span className="italic">“{r.example}”</span>
          {r.exampleTranslation && <span className="block">{r.exampleTranslation}</span>}
        </p>
      )}
    </div>
  );
}

/** The collection you're studying, as a small button: press it to change. */
function CollectionButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const intl = useIntl();
  const name = useActiveName();
  return (
    <button
      onClick={onClick}
      title={intl.formatMessage({ id: 'world.questionChangeHint' })}
      className={`shrink-0 max-w-[55%] inline-flex items-center gap-1.5 px-notch px-2 py-1 text-[12px] leading-none border-2 ${open ? 'bg-[var(--px-gold)] text-[#2a1a08] border-[var(--px-gold)]' : 'bg-[#0d0a08]/60 text-[var(--px-muted)] border-[#5a4630] hover:text-[var(--px-text)]'}`}
    >
      <PixelIcon name={open ? 'close' : 'sliders'} size={1} />
      <span className="truncate">{open ? <FormattedMessage id="world.questionKeep" /> : name}</span>
    </button>
  );
}

function useActiveName(): string {
  const activeId = useCollections((s) => s.activeId);
  const user = useCollections((s) => s.getUserCollection(s.activeId));
  return user?.name ?? getCollection(activeId).name;
}

/** Every list you could study instead, levels first — the usual way out of a too-hard word. */
function CollectionPicker({ onPicked }: { onPicked: (changed: boolean) => void }) {
  const activeId = useCollections((s) => s.activeId);
  const mine = useCollections((s) => s.mine);
  const shared = useCollections((s) => s.shared);
  const joinedIds = useCollections((s) => s.joinedIds);
  const setActive = useCollections((s) => s.setActive);

  const groups: { kind: keyof typeof KIND_META; rows: { id: string; name: string; count: number }[] }[] = [
    { kind: 'level', rows: listCollections('level') },
    { kind: 'mine', rows: mine.map((c) => ({ id: c.id, name: c.name, count: c.words.length })) },
    { kind: 'joined', rows: joinedIds.map((id) => shared[id]).filter((c) => c && !mine.some((m) => m.id === c.id)).map((c) => ({ id: c.id, name: c.name, count: c.words.length })) },
    { kind: 'topic', rows: listCollections('topic') },
  ];

  const choose = (id: string) => {
    playSelect();
    if (id !== activeId) setActive(id);
    onPicked(id !== activeId);
  };

  return (
    <div className="px-inset px-notch p-2 max-h-[260px] overflow-y-auto space-y-2">
      <p className="text-[12px] text-[var(--px-muted)] px-1"><FormattedMessage id="world.questionChangeLead" /></p>
      {groups.filter((g) => g.rows.length).map((g) => (
        <div key={g.kind}>
          <p className="px-title !text-[11px] px-1 mb-1 flex items-center gap-1.5" style={{ color: KIND_META[g.kind].color }}>
            <PixelIcon name={KIND_META[g.kind].icon} size={1} /> <FormattedMessage id={KIND_META[g.kind].groupId} />
          </p>
          <div className="grid grid-cols-2 gap-1">
            {g.rows.map((c) => (
              <button
                key={c.id}
                onClick={() => choose(c.id)}
                className={`text-left px-2 py-1.5 text-[13px] leading-tight border-2 ${c.id === activeId ? 'border-[var(--px-gold)] text-[var(--px-gold)]' : 'border-transparent hover:border-[#5a4630]'}`}
              >
                <span className="flex items-center gap-1">
                  {c.id === activeId && <PixelIcon name="check" size={1} />}
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="block text-[11px] opacity-60"><FormattedMessage id="world.wordCount" values={{ count: c.count }} /></span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
