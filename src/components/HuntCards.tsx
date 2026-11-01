import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { FormattedMessage, useIntl } from 'react-intl';
import { fetchBoard, huntLink, type Board } from '../lib/huntsApi';
import { QrCode } from './hunt/QrCode';

/**
 * The classroom hunt's cards, ready to print, at /hunts/:id/cards: one per
 * station to hide around the room, each a QR that opens the station on a
 * student's phone and the same code in letters for a camera that won't scan.
 * A cheat sheet for the teacher comes first — which card goes where — and is
 * the only page that knows the clues and the letters.
 *
 * The cards carry no station number: each team visits them in its own order,
 * so "card 3" would mean different things to the two teams.
 */
export function HuntCards() {
  const { id = '' } = useParams<{ id: string }>();
  const intl = useIntl();
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoard(id).then(setBoard).catch((err) => setError((err as Error).message));
  }, [id]);

  if (!board) {
    return <div className="flex justify-center py-24 text-text-muted">{error ?? <div className="w-10 h-10 rounded-full border-2 border-accent-cyan/30 border-t-accent-cyan animate-spin" />}</div>;
  }

  const { hunt, stations } = board;
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 print:p-0 print:max-w-none">
      <div className="flex items-center gap-3 mb-5 print:hidden">
        <Link to={`/hunts/${hunt.id}`} className="p-2 rounded-xl bg-bg-tertiary text-text-muted" aria-label={intl.formatMessage({ id: 'hunt.teacher.back' })}>
          <Icon icon="lucide:arrow-left" />
        </Link>
        <h1 className="flex-1 text-xl font-display font-extrabold text-text-primary"><FormattedMessage id="hunt.cards.title" /></h1>
        <button onClick={() => window.print()} className="px-4 py-2.5 rounded-xl bg-accent-cyan text-bg-primary font-bold flex items-center gap-1.5">
          <Icon icon="lucide:printer" /> <FormattedMessage id="hunt.cards.print" />
        </button>
      </div>

      {/* The teacher's sheet: where each card goes. */}
      <section className="rounded-2xl border border-border bg-bg-card p-5 mb-6 print:border-black print:bg-white print:text-black print:break-after-page">
        <h2 className="font-display font-extrabold text-lg text-text-primary print:text-black">{hunt.title} — <FormattedMessage id="hunt.cards.teacherSheet" /></h2>
        <p className="text-sm text-text-muted print:text-black mb-3">
          <FormattedMessage id="hunt.cards.teacherSheetHint" values={{ code: hunt.code, word: hunt.treasure }} />
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted print:text-black">
              <th className="py-1 pr-2"><FormattedMessage id="hunt.cards.card" /></th>
              <th className="py-1 pr-2"><FormattedMessage id="hunt.cards.hideAt" /></th>
              <th className="py-1"><FormattedMessage id="hunt.cards.letter" /></th>
            </tr>
          </thead>
          <tbody>
            {stations.map((s) => (
              <tr key={s.card} className="border-t border-border print:border-black text-text-primary print:text-black">
                <td className="py-1.5 pr-2 font-mono font-bold">{s.card}</td>
                <td className="py-1.5 pr-2">{s.clue || <span className="text-text-muted">—</span>}</td>
                <td className="py-1.5 font-bold">{s.letter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid grid-cols-2 gap-4 print:gap-6">
        {stations.map((s) => (
          <div key={s.card} className="rounded-2xl border-4 border-dashed border-accent-yellow bg-white text-black p-4 flex flex-col items-center text-center break-inside-avoid">
            <p className="text-lg font-display font-extrabold">🗺️ <FormattedMessage id="hunt.cards.cardTitle" /></p>
            <QrCode text={huntLink(hunt.code, s.card)} size={170} className="my-2" />
            <p className="text-3xl font-mono font-extrabold tracking-[0.25em]">{s.card}</p>
            <p className="text-xs mt-1"><FormattedMessage id="hunt.cards.scanMe" /></p>
          </div>
        ))}
      </div>
    </div>
  );
}
