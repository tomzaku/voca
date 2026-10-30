import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '../../hooks/useAuth';
import { useIeltsWritingScore, wordCount, IELTS_MIN_TO_SCORE } from '../../hooks/useIeltsWritingScore';
import { randomIeltsWritingQuestion, type IeltsTask, type IeltsWritingQuestion } from '../../data/ieltsWriting';
import { IELTS_CATEGORY_TIPS, IELTS_TASK_TIPS } from '../../data/ieltsWritingTips';
import { chartTables } from '../../lib/ieltsChartTable';
import { listIeltsSubmissions, type IeltsSubmission } from '../../lib/ieltsSubmissionsApi';
import { playCorrect, playSelect } from '../../lib/sfx';
import { HudCenter, PixelBar, PixelButton, PixelChip, PixelIcon, PixelLoader } from './pixel';

// IELTS Writing in the Quốc Học exam hall — the Writing page's question bank,
// tips and model answers, with the exam clock running once you start. Marked
// by the same examiner call (useIeltsWritingScore: Pro, saved to your
// history), one band per criterion. Task 1 data is shown as a table — the
// numbers behind the app's chart (lib/ieltsChartTable).

type Extra = null | 'tips' | 'model';

/** Band colours, banded the way examiners talk about scores. */
const bandColor = (b: number) => (b >= 7 ? 'var(--px-good)' : b >= 5.5 ? 'var(--px-gold)' : 'var(--px-bad)');

export function IeltsWriting() {
  const [task, setTask] = useState<IeltsTask | undefined>(undefined);
  const [question, setQuestion] = useState<IeltsWritingQuestion | null>(() => randomIeltsWritingQuestion());
  // A different question each time, where the bank has one.
  const next = (t: IeltsTask | undefined) => {
    playSelect();
    let q = randomIeltsWritingQuestion(t);
    for (let i = 0; i < 5 && q?.id === question?.id; i++) q = randomIeltsWritingQuestion(t);
    setTask(t);
    setQuestion(q);
  };
  if (!question) return null;
  return <Paper key={question.id} question={question} task={task} onTask={next} />;
}

function Paper({ question, task, onTask }: { question: IeltsWritingQuestion; task: IeltsTask | undefined; onTask: (t: IeltsTask | undefined) => void }) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { score, scoring, result, locked } = useIeltsWritingScore();
  const [essay, setEssay] = useState('');
  const [extra, setExtra] = useState<Extra>(null);
  const [sample, setSample] = useState(1);
  const words = wordCount(essay);

  // The exam clock starts with your first word.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (startedAt === null || result) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, result]);
  const total = question.timeMinutes * 60;
  const left = startedAt === null ? total : Math.max(0, total - Math.floor((now - startedAt) / 1000));
  const clock = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;

  const [history, setHistory] = useState<IeltsSubmission[]>([]);
  useEffect(() => {
    if (!user || locked) return;
    let alive = true;
    void listIeltsSubmissions(undefined, 5).then((p) => { if (alive) setHistory(p.submissions); });
    return () => { alive = false; };
  }, [user, locked, result]);

  useEffect(() => { if (result && result.bandOverall >= 7) playCorrect(); }, [result]);

  const write = (v: string) => {
    if (startedAt === null && v.trim()) { const t = Date.now(); setStartedAt(t); setNow(t); }
    setEssay(v.slice(0, 8000));
  };

  const tips = IELTS_CATEGORY_TIPS[question.category];
  const category = question.category.replace(/-/g, ' ');

  return (
    <HudCenter wide>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {([undefined, 1, 2] as const).map((t) => (
          <PixelChip key={t ?? 'any'} on={task === t} onClick={() => onTask(t)}>
            <FormattedMessage id={t === undefined ? 'writing.ieltsEitherTask' : t === 1 ? 'writing.ieltsTask1Short' : 'writing.ieltsTask2Short'} />
          </PixelChip>
        ))}
        <span className="flex-1" />
        <PixelButton tone="paper" className="!py-1.5 !px-3" onClick={() => onTask(task)}>
          <PixelIcon name="retry" size={2} /> <FormattedMessage id="writing.ieltsNewQuestion" />
        </PixelButton>
      </div>

      <p className="px-title !text-[11px] text-[var(--px-muted)]">
        <FormattedMessage id={question.task === 1 ? 'writing.ieltsTask1Label' : 'writing.ieltsTask2Label'} /> · {category} ·{' '}
        <FormattedMessage id="writing.ieltsPromptLimits" values={{ minWords: question.minWords, minutes: question.timeMinutes }} />
      </p>
      <p className="text-[17px] leading-snug mt-1">{question.prompt}</p>

      {question.chartData && chartTables(question.chartData).map((t, ti) => (
        <div key={ti} className="mt-3 overflow-x-auto">
          {(t.title || t.unit) && (
            <p className="px-title !text-[12px] text-[var(--px-accent)] mb-1">
              {[t.title, t.unit && `(${t.unit})`].filter(Boolean).join(' ')}
            </p>
          )}
          <table className="px-inset px-notch w-full text-[13px] tabular-nums">
            <thead>
              <tr>{t.columns.map((c, i) => <th key={i} className="px-2 py-1 text-left px-title !text-[11px] text-[var(--px-gold)]">{c}</th>)}</tr>
            </thead>
            <tbody>
              {t.rows.map((r, ri) => (
                <tr key={ri} className="border-t border-[#3a2e24]">
                  {r.map((v, i) => <td key={i} className={`px-2 py-1 ${i === 0 ? 'font-bold' : ''}`}>{v}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {question.dataDescription && (
        <p className="mt-3 text-[14px] text-[var(--px-muted)] leading-snug">{question.dataDescription}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mt-3">
        <PixelChip on={extra === 'tips'} onClick={() => setExtra(extra === 'tips' ? null : 'tips')}><FormattedMessage id="writing.ieltsTips" /></PixelChip>
        <PixelChip on={extra === 'model'} onClick={() => setExtra(extra === 'model' ? null : 'model')}><FormattedMessage id="writing.ieltsModelAnswer" /></PixelChip>
      </div>
      {extra === 'tips' && (
        <div className="px-inset px-notch p-3 mt-2 text-[14px] leading-snug space-y-2">
          <ul className="list-disc pl-5 space-y-1">{IELTS_TASK_TIPS[question.task].map((t) => <li key={t}>{t}</li>)}</ul>
          {tips && (
            <>
              <p className="px-title !text-[11px] text-[var(--px-accent)]">
                <FormattedMessage id="writing.ieltsCategoryStructure" values={{ category }} />
              </p>
              <ul className="list-disc pl-5 space-y-1">{tips.structure.map((t) => <li key={t}>{t}</li>)}</ul>
              <p className="px-title !text-[11px] text-[var(--px-accent)]"><FormattedMessage id="writing.ieltsUsefulPhrases" /></p>
              <div className="flex flex-wrap gap-1.5">
                {tips.phrases.map((p) => <span key={p} className="px-notch bg-[var(--px-paper-2)] px-2 py-0.5 italic">{p}</span>)}
              </div>
            </>
          )}
        </div>
      )}
      {extra === 'model' && (
        <div className="px-inset px-notch p-3 mt-2">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {question.sampleAnswers.map((s, i) => (
              <PixelChip key={i} on={sample === i} onClick={() => setSample(i)}>
                <FormattedMessage id="writing.ieltsBand" values={{ band: s.band }} />
              </PixelChip>
            ))}
          </div>
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{question.sampleAnswers[sample]?.text}</p>
          <p className="px-title !text-[11px] text-[var(--px-accent)] mt-3">
            <FormattedMessage id="writing.ieltsWhyBand" values={{ band: question.sampleAnswers[sample]?.band }} />
          </p>
          <p className="text-[13px] text-[var(--px-muted)] leading-snug">{question.sampleAnswers[sample]?.explanation}</p>
        </div>
      )}

      {scoring && <PixelLoader label={<FormattedMessage id="writing.ieltsScoring" />} />}
      {result && !scoring && (
        <div className="px-inset px-notch p-3 mt-3">
          <div className="flex items-center gap-4">
            <div className="text-center shrink-0">
              <div className="px-num text-[40px] leading-none" style={{ color: bandColor(result.bandOverall) }}>{result.bandOverall.toFixed(1)}</div>
              <div className="px-title !text-[10px] text-[var(--px-muted)] mt-1"><FormattedMessage id="writing.ieltsOverallBand" /></div>
            </div>
            <p className="text-[14px] leading-snug">{result.summary}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3">
            {([
              [question.task === 1 ? 'writing.ieltsTaskAchievement' : 'writing.ieltsTaskResponse', result.bandTask],
              ['writing.ieltsCoherence', result.bandCoherence],
              ['writing.ieltsLexical', result.bandLexical],
              ['writing.ieltsGrammar', result.bandGrammar],
            ] as const).map(([id, band]) => (
              <div key={id} className="px-notch bg-[var(--px-paper-2)] p-2 text-center">
                <div className="px-num text-[22px] leading-none" style={{ color: bandColor(band) }}>{band.toFixed(1)}</div>
                <div className="px-title !text-[10px] text-[var(--px-muted)] mt-1 leading-tight">{intl.formatMessage({ id })}</div>
              </div>
            ))}
          </div>
          {result.strengths.length > 0 && (
            <>
              <p className="px-title !text-[11px] text-[var(--px-good)] mt-3"><FormattedMessage id="writing.ieltsStrengths" /></p>
              <ul className="list-disc pl-5 text-[14px] leading-snug space-y-0.5">{result.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
            </>
          )}
          {result.improvements.length > 0 && (
            <>
              <p className="px-title !text-[11px] text-[var(--px-gold)] mt-3"><FormattedMessage id="writing.ieltsToImprove" /></p>
              <ul className="list-disc pl-5 text-[14px] leading-snug space-y-0.5">{result.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
            </>
          )}
        </div>
      )}

      <textarea
        value={essay}
        onChange={(e) => write(e.target.value)}
        rows={8}
        placeholder={intl.formatMessage({ id: 'writing.ieltsEssayPlaceholder' })}
        className="px-inset px-notch w-full resize-y mt-3 px-3 py-2.5 text-[16px] leading-relaxed text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span className="px-title !text-[12px]" style={{ color: words < question.minWords ? 'var(--px-gold)' : 'var(--px-good)' }}>
          <FormattedMessage id="writing.ieltsWordCountAim" values={{ count: words, minWords: question.minWords }} />
        </span>
        <PixelBar
          className="flex-1 min-w-[120px]"
          pct={(left / total) * 100}
          color={left < 300 ? 'var(--px-bad)' : 'var(--px-sky)'}
          label={clock}
        />
        {locked ? (
          <PixelButton tone="gold" onClick={() => navigate('/pro')}>
            <PixelIcon name="star" size={2} /> <FormattedMessage id="world.stelePro" />
          </PixelButton>
        ) : (
          <PixelButton tone="red" onClick={() => void score(question, essay)} disabled={scoring || words < IELTS_MIN_TO_SCORE}>
            <PixelIcon name="cap" size={2} /> <FormattedMessage id="writing.ieltsGetScore" />
          </PixelButton>
        )}
      </div>
      {locked && (
        <p className="text-[14px] text-[var(--px-gold)] mt-2">
          <FormattedMessage id={user ? 'writing.ieltsProFeature' : 'writing.ieltsSignInPro'} />
        </p>
      )}
      {history.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="px-title !text-[11px] text-[var(--px-muted)]"><FormattedMessage id="writing.ieltsRecentScores" /></span>
          {history.map((h) => (
            <span key={h.id} className="px-notch bg-[var(--px-paper-2)] px-2 py-0.5 px-num text-[15px]" style={{ color: bandColor(h.bandOverall) }}>
              {h.bandOverall.toFixed(1)}
            </span>
          ))}
        </div>
      )}
    </HudCenter>
  );
}
