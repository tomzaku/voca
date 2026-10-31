import { useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PLACE_DETAILS } from '../../game/placeDetails';
import { PixelIcon } from './pixel';

// A place's story at length — opened from its card — made up as a tấu sớ, a
// memorial to the throne: a folded paper in an imperial-yellow brocade cover
// edged in vermilion, the place written in ink, its photos pasted in, the
// "did you know" written in the margin in red as the emperor's own note
// (châu phê), and the seal that says he has read it (御覽, "seen by the
// emperor"). Photos and links are game/placeDetails; a place without them
// still has its memorial, with its story alone.

const INK = '#2b1a10';
const VERMILION = '#a8261b';
// The memorial's hand: a serif with Vietnamese's stacked marks, not bold.
const SERIF = "font-['Noto_Serif',Georgia,serif] font-normal";

export function PlaceMemorial({ id, onClose }: { id: string; onClose: () => void }) {
  const intl = useIntl();
  const detail = PLACE_DETAILS[id];
  const has = (key: string) => key in intl.messages;
  const wiki = detail?.wiki && (intl.locale.startsWith('vi') ? detail.wiki.vi : detail.wiki.en ?? detail.wiki.vi);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/55" onClick={onClose} onKeyDown={(e) => e.stopPropagation()}>
      {/* The cover: brocade, a vermilion band, then the paper. */}
      <div
        className="px-in-up w-full max-w-[760px] max-h-full flex p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        style={{ background: 'repeating-linear-gradient(45deg, #d6a21e 0 6px, #c99419 6px 12px)', border: '3px solid #4a160c' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={intl.formatMessage({ id: `places.${id}` })}
      >
        <div className="flex-1 min-h-0 flex p-1" style={{ background: VERMILION }}>
          <div
            className="relative flex-1 min-h-0 overflow-y-auto px-5 sm:px-8 py-5"
            style={{
              color: INK,
              backgroundColor: '#f2e4c2',
              // The accordion folds of the paper.
              backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 128px, rgba(110,70,20,0.07) 128px 130px, rgba(255,255,255,0.3) 130px 131px)',
              boxShadow: 'inset 0 0 0 1px #c9a24a, inset 0 0 30px rgba(120,80,20,0.18)',
            }}
          >
            <button onClick={onClose} aria-label={intl.formatMessage({ id: 'places.close' })} className="absolute top-3 right-3 p-1 opacity-60 hover:opacity-100">
              <PixelIcon name="close" size={2} />
            </button>

            {/* The heading: the memorial's cartouche, and the place in ink. */}
            <div className="flex items-start gap-4 pr-8">
              <span className="shrink-0 w-12 py-2 flex items-center justify-center font-serif text-[28px] leading-none text-[#f6e3a8]" style={{ background: VERMILION, boxShadow: 'inset 0 0 0 2px #e2b84a' }}>
                奏
              </span>
              <div className="min-w-0">
                <p className="px-title !text-[12px] tracking-[0.2em] uppercase" style={{ color: VERMILION }}><FormattedMessage id="places.memorial" /></p>
                <p className="px-title !text-[26px] leading-tight"><FormattedMessage id={`places.${id}`} /></p>
                <p className={`${SERIF} italic text-[15px] opacity-75`}><FormattedMessage id={`places.${id}En`} /></p>
              </div>
            </div>
            <div className="my-4 h-[3px]" style={{ background: `linear-gradient(90deg, ${VERMILION}, ${VERMILION} 30%, transparent)` }} />

            {/* The photos, pasted in, each with who took it and its licence. */}
            {detail && detail.photos.length > 0 && (
              <div className={`grid gap-4 mb-5 ${detail.photos.length > 1 ? 'sm:grid-cols-2' : ''}`}>
                {detail.photos.map((p) => (
                  <figure key={p.src} className="m-0">
                    <img
                      src={`${import.meta.env.BASE_URL}${p.src}`}
                      alt=""
                      width={p.w}
                      height={p.h}
                      loading="lazy"
                      className={`w-full ${detail.photos.length > 1 ? 'aspect-[4/3]' : 'aspect-[16/9]'} object-cover p-1.5 bg-[#fbf4e2] shadow-[0_2px_6px_rgba(60,30,0,0.35)]`}
                    />
                    <figcaption className="mt-1 text-[11px] leading-snug opacity-70">
                      <a href={p.page} target="_blank" rel="noreferrer" className="underline decoration-dotted hover:opacity-100">
                        <FormattedMessage id="places.photoBy" values={{ author: p.author, license: p.license }} />
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            {/* The memorial's text, in ink. */}
            <div className={`${SERIF} text-[16px] leading-relaxed space-y-3`}>
              <p><FormattedMessage id={`places.${id}About`} /></p>
              {has(`places.${id}More`) && <p><FormattedMessage id={`places.${id}More`} /></p>}
            </div>

            {/* The emperor's note in the margin, in vermilion. */}
            <div className="mt-5 pl-3 border-l-[3px]" style={{ borderColor: VERMILION, color: VERMILION }}>
              <p className="px-title !text-[12px] tracking-[0.15em] uppercase"><FormattedMessage id="places.imperialNote" /></p>
              <p className={`${SERIF} italic text-[16px] leading-relaxed`}><FormattedMessage id={`places.${id}Fact`} /></p>
            </div>

            {/* Where to read on, and the seal: seen by the emperor. */}
            <div className="mt-6 flex items-end justify-between gap-4">
              {wiki ? (
                <a href={wiki} target="_blank" rel="noreferrer" className={`${SERIF} text-[14px] underline`} style={{ color: INK }}>
                  <FormattedMessage id="places.readMore" /> ↗
                </a>
              ) : <span />}
              <span
                aria-hidden
                className="shrink-0 w-16 h-16 grid grid-cols-2 place-items-center font-serif font-bold text-[22px] leading-none text-[#f6e9cf] -rotate-6 opacity-90"
                style={{ background: VERMILION, boxShadow: 'inset 0 0 0 3px #f2e4c2, inset 0 0 0 5px #a8261b' }}
              >
                <span className="[writing-mode:vertical-rl] col-span-2">御覽</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
