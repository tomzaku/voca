import { useState, useMemo, useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { ieltsConversations, ieltsTopics, type IeltsConversation } from '../data/englishIelts';
import { useSpeakingProgress, isPracticed } from '../hooks/useSpeakingProgress';
import { PracticeButton } from './PracticeButton';
import {
  useScriptPlayer, PlayerBar, Transcript, YourTurnBar, ProgressCard, PracticedButton, PhraseChips,
  type Mode, type ScriptLine,
} from './scriptPractice';

// "IELTS Speaking" — model exam conversations, read like a chat. A list grouped
// by exam part beside one open conversation, which can be listened to or taken
// as the candidate: the model answers are hidden and a timer runs on each turn
// (with the one-minute prep on Part 2). Progress shares `useSpeakingProgress`
// with the other speaking tabs — ids here are `ielts-*`.

type Part = IeltsConversation['part'];

// Examiner: British female (Emma), candidate: American male (Michael).
const VOICE = { examiner: 'bf_emma', candidate: 'am_michael' } as const;
const NAME_IDS = { a: 'speaking.ieltsExaminer', b: 'speaking.ieltsCandidate' } as const;
const TONES = { a: 'orange', b: 'cyan' } as const;

const PARTS: Part[] = ['Part 1', 'Part 2', 'Part 3'];
// Spelled out in full — Tailwind only keeps classes it finds as whole strings.
const PART_META: Record<Part, { nameId: string; blurbId: string; aimId: string; chip: string; dot: string; turnSeconds: number }> = {
  'Part 1': {
    nameId: 'speaking.ieltsPart1Name',
    blurbId: 'speaking.ieltsPart1Blurb',
    aimId: 'speaking.ieltsPart1Aim',
    chip: 'text-accent-green bg-accent-green/10 border-accent-green/20',
    dot: 'bg-accent-green',
    turnSeconds: 30,
  },
  'Part 2': {
    nameId: 'speaking.ieltsPart2Name',
    blurbId: 'speaking.ieltsPart2Blurb',
    aimId: 'speaking.ieltsPart2Aim',
    chip: 'text-accent-orange bg-accent-orange/10 border-accent-orange/20',
    dot: 'bg-accent-orange',
    turnSeconds: 120,
  },
  'Part 3': {
    nameId: 'speaking.ieltsPart3Name',
    blurbId: 'speaking.ieltsPart3Blurb',
    aimId: 'speaking.ieltsPart3Aim',
    chip: 'text-accent-red bg-accent-red/10 border-accent-red/20',
    dot: 'bg-accent-red',
    turnSeconds: 60,
  },
};

const TOPIC_ICON: Record<(typeof ieltsTopics)[number], string> = {
  'Home & Living': 'lucide:house',
  'Work & Study': 'lucide:graduation-cap',
  'Technology': 'lucide:smartphone',
  'Travel & Places': 'lucide:plane',
  'Health & Lifestyle': 'lucide:heart-pulse',
  'Media & Entertainment': 'lucide:clapperboard',
  'Environment': 'lucide:leaf',
  'Society & Culture': 'lucide:landmark',
  'Food & Culture': 'lucide:utensils',
  'Sports & Leisure': 'lucide:trophy',
  'Arts & Culture': 'lucide:palette',
};
const topicIcon = (t: string) => TOPIC_ICON[t as keyof typeof TOPIC_ICON] ?? 'lucide:message-circle';

/** "Part 2 — Describe a Skill…" → "Describe a Skill…"; the part is shown anyway. */
const shortTitle = (c: IeltsConversation) => c.title.replace(/^Part \d\s*[—-]\s*/, '');

/**
 * What the AI partner should open an IELTS practice session with: the
 * examiner's first question, or the card's title when that question is a long
 * Part 2 cue card (the server only keeps the first 400 characters).
 */
function ieltsOpener(c: IeltsConversation): string {
  const question = c.exchanges.find((ex) => ex.role === 'examiner')?.text ?? '';
  return question && question.length <= 300 ? question : `${c.part}: ${c.title}`;
}

/** Splits a Part 2 prompt into the task and its "You should say" points. */
function parseCueCard(text: string): { task: string; points: string[]; prep: boolean } | null {
  const m = text.match(/^(.*?)\s*You should say:\s*(.*?)\s*(You have one minute to prepare\.?)?\s*$/s);
  if (!m) return null;
  const points = m[2]
    .replace(/\.$/, '')
    .split(/,\s*(?:and\s+)?/)
    .map((p) => p.trim())
    .filter(Boolean);
  return { task: m[1], points, prep: !!m[3] };
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ─── Turn timer ─────────────────────────────────────────────── */
/** Counts a candidate turn; Part 2 counts down a minute's prep first. Mounted
 *  per turn, so each one starts from zero. */
function TurnTimer({ part }: { part: Part }) {
  const intl = useIntl();
  const prepSeconds = part === 'Part 2' ? 60 : 0;
  const [elapsed, setElapsed] = useState(0);
  const [skippedPrep, setSkippedPrep] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const inPrep = !skippedPrep && elapsed < prepSeconds;
  const target = PART_META[part].turnSeconds;
  const talking = skippedPrep ? elapsed : Math.max(0, elapsed - prepSeconds);
  const pct = Math.min(100, (talking / target) * 100);
  const over = talking > target;

  if (inPrep) {
    return (
      <span className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-orange/10 text-accent-orange text-xs font-bold tabular-nums">
          <Icon icon="lucide:notebook-pen" width={13} /> <FormattedMessage id="speaking.ieltsPrep" values={{ time: clock(prepSeconds - elapsed) }} />
        </span>
        <button
          onClick={() => { setSkippedPrep(true); setElapsed(0); }}
          className="text-[11px] font-semibold text-text-muted hover:text-text-primary underline-offset-2 hover:underline cursor-pointer"
        >
          <FormattedMessage id="speaking.ieltsStartTalking" />
        </button>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 shrink-0" title={intl.formatMessage({ id: 'speaking.ieltsAimFor' }, { time: clock(target) })}>
      <span className={`text-xs font-bold tabular-nums ${over ? 'text-accent-green' : 'text-text-primary'}`}>{clock(talking)}</span>
      <span className="w-16 h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
        <span className={`block h-full rounded-full transition-all duration-1000 ${over ? 'bg-accent-green' : 'bg-accent-yellow'}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] tabular-nums text-text-muted">~{clock(target)}</span>
    </span>
  );
}

/* ─── List ───────────────────────────────────────────────────── */
function ConversationList({ items, activeId, onSelect }: {
  items: IeltsConversation[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const progress = useSpeakingProgress((s) => s.questions);
  const groups = PARTS
    .map((p) => ({ part: p, items: items.filter((c) => c.part === p) }))
    .filter((g) => g.items.length > 0);

  if (!groups.length) {
    return <p className="px-3 py-8 text-center text-sm text-text-muted"><FormattedMessage id="speaking.noMatches" /></p>;
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.part}>
          <p className="flex items-center gap-1.5 px-2.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span className={`w-1.5 h-1.5 rounded-full ${PART_META[g.part].dot}`} />
            {g.part} · <FormattedMessage id={PART_META[g.part].nameId} />
          </p>
          <div className="space-y-0.5">
            {g.items.map((c) => {
              const on = c.id === activeId;
              const done = isPracticed(progress[c.id]);
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  aria-current={on ? 'true' : undefined}
                  className={`w-full flex items-start gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer ${
                    on ? 'bg-accent-cyan/10' : 'hover:bg-bg-hover/60'
                  }`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${
                    done ? 'bg-accent-green text-bg-primary border-accent-green' : on ? 'border-accent-cyan/40 text-accent-cyan' : 'border-border text-text-muted'
                  }`}>
                    <Icon icon={done ? 'lucide:check' : topicIcon(c.topic)} width={13} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className={`block text-[13px] leading-snug ${on ? 'font-semibold text-text-primary' : 'font-medium text-text-secondary'}`}>
                      {shortTitle(c)}
                    </span>
                    <span className="block mt-0.5 text-[11px] text-text-muted truncate">{c.topic} · {c.duration}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── The open conversation ──────────────────────────────────── */
function ConversationView({ conv, onBack, onNext }: {
  conv: IeltsConversation;
  onBack: () => void;
  onNext: () => void;
}) {
  const intl = useIntl();
  const progress = useSpeakingProgress((s) => s.questions[conv.id]);
  const { markPracticed, clearPracticed } = useSpeakingProgress();
  const done = isPracticed(progress);
  const [mode, setMode] = useState<Mode>('listen');
  // Per conversation — the parent keys this view by id, so switching resets it.
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const meta = PART_META[conv.part];

  // Memoised: the player stops whenever its lines change identity.
  const lines = useMemo<ScriptLine[]>(
    () => conv.exchanges.map((ex) => ({ speaker: ex.role === 'examiner' ? 'a' : 'b', text: ex.text, voice: VOICE[ex.role] })),
    [conv],
  );

  const finish = useCallback(() => {
    if (mode === 'listen') return;
    markPracticed(conv.id);
    toast.success(intl.formatMessage({ id: 'speaking.ieltsMockComplete' }));
  }, [mode, conv.id, markPracticed, intl]);

  const player = useScriptPlayer(lines, mode === 'listen' ? null : mode, finish);

  const reveal = (i: number) => setRevealed((prev) => new Set(prev).add(i));
  const continueTurn = () => { reveal(player.index); player.resume(); };
  const pickMode = (m: Mode) => { setMode(m); setRevealed(new Set()); };

  const renderText = useCallback((line: ScriptLine) => {
    if (conv.part !== 'Part 2' || line.speaker !== 'a') return null;
    const card = parseCueCard(line.text);
    if (!card) return null;
    return (
      <span className="block whitespace-normal">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-accent-orange mb-1.5">
          <Icon icon="lucide:id-card" width={12} /> <FormattedMessage id="speaking.ieltsCueCard" />
        </span>
        <span className="block font-semibold text-text-primary">{card.task}</span>
        <span className="block mt-2 text-xs text-text-muted">You should say:</span>
        {card.points.map((p) => (
          <span key={p} className="flex items-start gap-2 mt-1 text-[13px] text-text-secondary">
            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-accent-orange/70 shrink-0" />
            {p}
          </span>
        ))}
        {card.prep && (
          <span className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border text-[11px] text-text-muted">
            <Icon icon="lucide:timer" width={12} /> <FormattedMessage id="speaking.ieltsCuePrep" />
          </span>
        )}
      </span>
    );
  }, [conv.part]);

  return (
    <article className="min-w-0">
      <button
        onClick={onBack}
        className="lg:hidden flex items-center gap-1 mb-3 text-xs font-semibold text-text-muted hover:text-text-primary cursor-pointer"
      >
        <Icon icon="lucide:arrow-left" width={14} /> <FormattedMessage id="speaking.allConversations" />
      </button>

      {/* Header */}
      <header className="rounded-xl border border-border bg-bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-muted">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.chip}`}>{conv.part} · <FormattedMessage id={meta.nameId} /></span>
          <span className="flex items-center gap-1 font-semibold text-text-secondary">
            <Icon icon={topicIcon(conv.topic)} width={13} /> {conv.topic}
          </span>
          <span className="flex items-center gap-1"><Icon icon="lucide:clock" width={11} />{conv.duration}</span>
        </div>
        <h2 className="mt-2 text-xl font-extrabold text-text-primary leading-tight">{shortTitle(conv)}</h2>
        <p className="mt-1.5 text-sm text-text-secondary leading-relaxed">{conv.description}</p>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-bg-tertiary/60 px-3 py-2 text-xs text-text-secondary leading-relaxed">
          <Icon icon="lucide:target" width={14} className="text-accent-cyan shrink-0 mt-px" />
          <span><span className="font-semibold text-text-primary"><FormattedMessage id="speaking.ieltsAimLabel" /> </span><FormattedMessage id={meta.aimId} /></span>
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PracticedButton done={done} onToggle={() => (done ? clearPracticed(conv.id) : markPracticed(conv.id))} />
          <PracticeButton
            topic={`IELTS ${conv.part} — ${conv.topic}`}
            focus={ieltsOpener(conv)}
            label={intl.formatMessage({ id: 'speaking.ieltsMockWithAi' })}
            onStart={() => markPracticed(conv.id)}
          />
        </div>
      </header>

      <PlayerBar
        modes={[
          { id: 'listen', label: intl.formatMessage({ id: 'speaking.listen' }), icon: 'lucide:headphones' },
          { id: 'b', label: intl.formatMessage({ id: 'speaking.ieltsBeCandidate' }), icon: 'lucide:mic' },
        ]}
        mode={mode}
        onMode={pickMode}
        player={player}
        total={lines.length}
      />

      {mode === 'b' && (
        <p className="mt-3 px-1 text-xs text-text-muted leading-relaxed">
          <FormattedMessage id="speaking.ieltsCandidateHint" />
        </p>
      )}

      <Transcript
        lines={lines}
        names={{ a: intl.formatMessage({ id: NAME_IDS.a }), b: intl.formatMessage({ id: NAME_IDS.b }) }}
        tones={TONES}
        mode={mode}
        player={player}
        revealed={revealed}
        onReveal={(i) => (player.status === 'waiting' && player.index === i ? continueTurn() : reveal(i))}
        renderText={renderText}
      />

      {player.status === 'waiting' && (
        <YourTurnBar
          key={player.index}
          title={intl.formatMessage({ id: 'speaking.ieltsYourAnswer' })}
          hint={intl.formatMessage({ id: conv.part === 'Part 2' ? 'speaking.ieltsHintPart2' : 'speaking.ieltsHintDefault' })}
          onContinue={continueTurn}
        >
          <TurnTimer part={conv.part} />
        </YourTurnBar>
      )}

      {/* Tips + phrases */}
      {(conv.tips?.length || conv.keyPhrases?.length) ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {conv.tips && conv.tips.length > 0 && (
            <section className="rounded-xl border border-accent-green/15 bg-accent-green/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-accent-green mb-2.5">
                <Icon icon="lucide:lightbulb" width={13} /> <FormattedMessage id="speaking.ieltsExaminerTips" />
              </p>
              <ul className="space-y-1.5">
                {conv.tips.map((tip) => (
                  <li key={tip} className="text-xs text-text-secondary leading-relaxed flex items-start gap-2">
                    <span className="text-accent-green/60 shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {conv.keyPhrases && conv.keyPhrases.length > 0 && (
            <section className="rounded-xl border border-accent-yellow/15 bg-accent-yellow/5 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-accent-yellow mb-2.5">
                <Icon icon="lucide:quote" width={13} /> <FormattedMessage id="speaking.keyPhrases" />
              </p>
              <PhraseChips phrases={conv.keyPhrases} voice={VOICE.candidate} />
            </section>
          )}
        </div>
      ) : null}

      <div className="mt-4 flex justify-end">
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-text-secondary bg-bg-tertiary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
        >
          <FormattedMessage id="speaking.nextConversation" /> <Icon icon="lucide:arrow-right" width={14} />
        </button>
      </div>
    </article>
  );
}

/* ─── The tab ────────────────────────────────────────────────── */
export function IeltsSpeakingTab() {
  const intl = useIntl();
  const progress = useSpeakingProgress((s) => s.questions);
  const [part, setPart] = useState<Part | 'all'>('all');
  const [topic, setTopic] = useState<string>('all');
  // The first unpractised conversation, so desktop never opens on an empty pane.
  const [activeId, setActiveId] = useState<string>(
    () => (ieltsConversations.find((c) => !isPracticed(useSpeakingProgress.getState().questions[c.id])) ?? ieltsConversations[0]).id,
  );
  // Mobile shows the list or the conversation, not both; desktop ignores this.
  const [reading, setReading] = useState(false);

  const visible = useMemo(
    () => ieltsConversations.filter((c) => (part === 'all' || c.part === part) && (topic === 'all' || c.topic === topic)),
    [part, topic],
  );
  const partStats = useMemo(() => {
    const s = Object.fromEntries(PARTS.map((p) => [p, { done: 0, total: 0 }])) as Record<Part, { done: number; total: number }>;
    for (const c of ieltsConversations) {
      s[c.part].total++;
      if (isPracticed(progress[c.id])) s[c.part].done++;
    }
    return s;
  }, [progress]);
  const practiced = PARTS.reduce((n, p) => n + partStats[p].done, 0);
  const topicsInView = ieltsTopics.filter((t) => ieltsConversations.some((c) => c.topic === t && (part === 'all' || c.part === part)));
  const active = ieltsConversations.find((c) => c.id === activeId) ?? ieltsConversations[0];

  const select = useCallback((id: string) => {
    setActiveId(id);
    setReading(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /** The next conversation in list order, preferring ones not yet practiced. */
  const next = useCallback(() => {
    const pool = visible.length ? visible : ieltsConversations;
    const at = pool.findIndex((c) => c.id === activeId);
    const ordered = [...pool.slice(at + 1), ...pool.slice(0, Math.max(at, 0))];
    const pick = ordered.find((c) => !isPracticed(progress[c.id])) ?? ordered[0];
    if (pick) select(pick.id);
  }, [visible, activeId, progress, select]);

  return (
    <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
      <aside className={`${reading ? 'hidden lg:block' : ''} lg:sticky lg:top-[calc(4.75rem+env(safe-area-inset-top))] lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 space-y-4`}>
        <ProgressCard done={practiced} total={ieltsConversations.length}>
          {/* Doubles as the part filter — tap a part to narrow the list. */}
          <div className="mt-3 space-y-1">
            {PARTS.map((p) => {
              const on = part === p;
              const s = partStats[p];
              return (
                <button
                  key={p}
                  onClick={() => { setPart(on ? 'all' : p); setTopic('all'); }}
                  aria-pressed={on}
                  title={intl.formatMessage({ id: PART_META[p].blurbId })}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                    on ? 'bg-accent-cyan/10' : 'hover:bg-bg-hover/60'
                  }`}
                >
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${PART_META[p].chip}`}>{p}</span>
                  <span className={`text-xs flex-1 truncate ${on ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}><FormattedMessage id={PART_META[p].nameId} /></span>
                  <span className="w-12 h-1 rounded-full bg-bg-tertiary overflow-hidden shrink-0">
                    <span className={`block h-full rounded-full ${PART_META[p].dot}`} style={{ width: `${s.total ? (s.done / s.total) * 100 : 0}%` }} />
                  </span>
                  <span className="text-[11px] tabular-nums text-text-muted w-9 text-right shrink-0">{s.done}/{s.total}</span>
                </button>
              );
            })}
          </div>
        </ProgressCard>

        <div>
          <p className="px-1 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted"><FormattedMessage id="speaking.topic" /></p>
          <div className="flex flex-wrap gap-1">
            {['all', ...topicsInView].map((t) => {
              const on = topic === t;
              return (
                <button
                  key={t}
                  onClick={() => setTopic(on && t !== 'all' ? 'all' : t)}
                  aria-pressed={on}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                    on ? 'bg-accent-cyan text-bg-primary border-accent-cyan' : 'bg-bg-tertiary text-text-muted border-transparent hover:text-text-secondary'
                  }`}
                >
                  {t !== 'all' && <Icon icon={topicIcon(t)} width={11} />}
                  {t === 'all' ? intl.formatMessage({ id: 'speaking.allTopics' }) : t}
                </button>
              );
            })}
          </div>
        </div>

        <PracticeButton
          topic={topic === 'all' ? 'IELTS Speaking' : `IELTS Speaking — ${topic}`}
          focus={part === 'all' ? undefined : `Run a mock IELTS Speaking ${part} on this topic.`}
          label={part === 'all'
            ? intl.formatMessage({ id: 'speaking.ieltsFullMockWithAi' })
            : intl.formatMessage({ id: 'speaking.ieltsPartMockWithAi' }, { part })}
        />

        <ConversationList items={visible} activeId={activeId} onSelect={select} />
      </aside>

      <section className={`${reading ? '' : 'hidden lg:block'} min-w-0`}>
        <ConversationView key={active.id} conv={active} onBack={() => setReading(false)} onNext={next} />
      </section>
    </div>
  );
}
