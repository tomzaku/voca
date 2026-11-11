import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Link } from 'react-router-dom';
import { usePronunciationCheck } from '../../hooks/usePronunciationCheck';
import { ipaChartLink, pronunciationModelCached } from '../../lib/pronunciation';
import { PHONEME_MODEL_MB } from '../../lib/pronunciationModel';
import type { PhoneStatus } from '../../lib/phonemeScore';

// "Say it" on the word card: record one try, and see each sound of the word
// coloured by how well it came out, with the sound that was heard instead on
// the ones that missed — each a link to that sound on the IPA chart. Shown
// only where canScorePronunciation() says the device can run the model.

const PHONE_STYLE: Record<PhoneStatus, string> = {
  good: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  close: 'bg-accent-orange/15 text-accent-orange border-accent-orange/40',
  wrong: 'bg-accent-red/15 text-accent-red border-accent-red/40',
};
const SCORE_STYLE = (score: number) =>
  score >= 85 ? 'text-accent-green' : score >= 60 ? 'text-accent-orange' : 'text-accent-red';

export function PronunciationCheck({ ipas }: { ipas: string[] }) {
  const intl = useIntl();
  const { phase, progress, result, empty, start, stop } = usePronunciationCheck(ipas);
  const recording = phase === 'recording';
  const working = phase === 'working';

  return (
    <div className="mt-3">
      <div className="flex items-center flex-wrap gap-2">
        <button
          onClick={recording ? stop : start}
          disabled={working}
          className={`btn-3d flex items-center gap-2 px-3 py-1.5 text-sm ${recording
            ? 'bg-accent-red text-bg-primary animate-pulse'
            : 'bg-bg-tertiary text-text-secondary hover:text-accent-cyan'
          } disabled:opacity-60`}
        >
          <Icon icon={recording ? 'lucide:square' : 'lucide:mic'} className="shrink-0" />
          <FormattedMessage id={recording ? 'pron.stop' : result ? 'pron.tryAgain' : 'pron.check'} />
        </button>
        {working && (
          <span className="flex items-center gap-2 text-xs text-text-muted">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />
            {progress !== null && progress < 100
              ? <FormattedMessage id="pron.downloading" values={{ pct: Math.round(progress) }} />
              : <FormattedMessage id="pron.checking" />}
          </span>
        )}
        {phase === 'idle' && !result && !empty && !pronunciationModelCached() && (
          <span className="text-xs text-text-muted"><FormattedMessage id="pron.firstTime" values={{ mb: PHONEME_MODEL_MB }} /></span>
        )}
        {recording && <span className="text-xs text-text-muted"><FormattedMessage id="pron.sayNow" /></span>}
        {phase === 'denied' && <span className="text-xs text-accent-red"><FormattedMessage id="pron.denied" /></span>}
        {phase === 'error' && <span className="text-xs text-accent-red"><FormattedMessage id="pron.error" /></span>}
        {empty && phase === 'idle' && <span className="text-xs text-text-muted"><FormattedMessage id="pron.nothingHeard" /></span>}
      </div>

      {result && phase === 'idle' && (
        <div className="mt-2.5 flex items-center flex-wrap gap-x-3 gap-y-2 animate-fade-in">
          <span className={`text-2xl font-display font-extrabold ${SCORE_STYLE(result.score)}`}>{result.score}</span>
          <div className="flex flex-wrap gap-1">
            {result.phones.map((p, i) => {
              const href = p.status !== 'good' ? ipaChartLink(p.ipa) : null;
              const title = p.heard === null
                ? `/${p.ipa}/ ${p.score}`
                : p.heard
                  ? intl.formatMessage({ id: 'pron.heardInstead' }, { expected: p.ipa, heard: p.heard, score: p.score })
                  : intl.formatMessage({ id: 'pron.notHeard' }, { expected: p.ipa });
              const chip = (
                <>
                  <span className="font-code font-bold">{p.ipa}</span>
                  {p.heard !== null && <span className="font-code text-[10px] opacity-80">→{p.heard || '∅'}</span>}
                </>
              );
              const cls = `inline-flex items-baseline gap-0.5 px-1.5 py-0.5 rounded-md border text-sm ${PHONE_STYLE[p.status]}`;
              return href
                ? <Link key={i} to={href} title={title} className={`${cls} hover:underline`}>{chip}</Link>
                : <span key={i} title={title} className={cls}>{chip}</span>;
            })}
          </div>
          {result.heard && (
            <span className="text-xs text-text-muted">
              <FormattedMessage id="pron.weHeard" values={{ ipa: <span className="font-code">/{result.heard}/</span> }} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
