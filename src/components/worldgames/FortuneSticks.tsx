import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { useVocabularyStore } from '../../hooks/useVocabulary';
import { drawFortune, todaysFortune, type Fortune } from '../../lib/fortunes';
import { playSelect, playWin } from '../../lib/sfx';
import { speakText } from '../../lib/tts';
import { PixelButton, PixelIcon } from './pixel';

const LUCK_TONE: Record<Fortune['luck'], string> = {
  great: 'text-[var(--px-gold)]',
  good: 'text-[var(--px-jade,#6fd39a)]',
  fair: 'text-[var(--px-sky)]',
};

/**
 * Xin xăm before Thiên Mụ's hall: shake the bamboo cup until a numbered stick
 * falls, then read its fortune — a line of luck in English and Vietnamese,
 * and a word to carry for the day (lib/fortunes). One stick a day; come back
 * the same day and it's the stick you already drew.
 */
export function FortuneSticks({ onClose }: { onClose: () => void }) {
  const intl = useIntl();
  const { user } = useAuth();
  const triageWord = useVocabularyStore((s) => s.triageWord);
  const [fortune, setFortune] = useState<Fortune | null>(() => todaysFortune(new Date()));
  const [shaking, setShaking] = useState(false);
  const [kept, setKept] = useState(false);
  const already = useState(() => todaysFortune(new Date()) !== null)[0];

  const shake = () => {
    if (shaking || fortune) return;
    setShaking(true);
    // The rattle of sticks in the cup, then one falls.
    for (let i = 0; i < 6; i++) window.setTimeout(playSelect, i * 180);
    window.setTimeout(() => {
      setFortune(drawFortune(new Date()));
      setShaking(false);
      playWin();
    }, 1400);
  };

  const keep = (f: Fortune) => {
    triageWord(f.word, false, user?.id);
    setKept(true);
    toast.success(intl.formatMessage({ id: 'world.fortuneKept' }, { word: f.word }));
  };

  return (
    <div className="px absolute inset-0 z-40 flex items-end sm:items-center justify-center p-3 bg-black/25" onKeyDown={(e) => e.stopPropagation()}>
      <div className="px-notch px-frame w-full max-w-[460px] p-5 px-in-up">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="px-title !text-[18px] text-[var(--px-gold)] flex items-center gap-2">
              <PixelIcon name="sticks" size={2} /> <FormattedMessage id="world.fortuneTitle" />
            </p>
            <p className="text-[12px] opacity-80"><FormattedMessage id="world.fortuneHow" /></p>
          </div>
          <PixelButton tone="paper" onClick={onClose} className="!px-2.5 !py-1 !text-[13px]"><FormattedMessage id="world.close" /></PixelButton>
        </div>

        {!fortune && (
          <div className="flex flex-col items-center gap-4 py-2">
            <span className={`text-[#c9a066] ${shaking ? 'animate-shake [animation-iteration-count:4]' : 'animate-bob'}`}>
              <PixelIcon name="sticks" size={9} />
            </span>
            <PixelButton tone="gold" onClick={shake} disabled={shaking}>
              <FormattedMessage id={shaking ? 'world.fortuneShaking' : 'world.fortuneShake'} />
            </PixelButton>
          </div>
        )}

        {fortune && (
          <div className="space-y-3 px-in-up">
            <div className="flex items-center gap-3">
              <span className="px-notch px-inset px-3 py-2 px-title !text-[22px] text-[#e8d8a8]">{fortune.n}</span>
              <div>
                <p className={`px-title !text-[15px] ${LUCK_TONE[fortune.luck]}`}><FormattedMessage id={`world.fortuneLuck.${fortune.luck}`} /></p>
                {already && <p className="text-[11px] opacity-70"><FormattedMessage id="world.fortuneAlready" /></p>}
              </div>
            </div>
            <p className="text-[15px] leading-snug">{fortune.en}</p>
            <p className="text-[13px] leading-snug opacity-80 italic">{fortune.vi}</p>

            <div className="px-notch px-inset p-3 space-y-1">
              <p className="text-[11px] uppercase tracking-wider opacity-70"><FormattedMessage id="world.fortuneWord" /></p>
              <div className="flex items-center gap-2">
                <p className="px-title !text-[20px] text-[var(--px-gold)]">{fortune.word}</p>
                <PixelButton tone="paper" onClick={() => void speakText(fortune.word)} className="!px-2 !py-1 !text-[12px]" aria-label={intl.formatMessage({ id: 'world.fortuneListen' })}>
                  <PixelIcon name="mic" size={1} /> <FormattedMessage id="world.fortuneListen" />
                </PixelButton>
              </div>
              <p className="text-[13px]">{fortune.meaning.en} · <span className="opacity-80">{fortune.meaning.vi}</span></p>
              <p className="text-[13px] opacity-80 italic">“{fortune.example}”</p>
            </div>

            <PixelButton tone={kept ? 'paper' : 'jade'} block onClick={() => keep(fortune)} disabled={kept}>
              <FormattedMessage id={kept ? 'world.fortuneKeptShort' : 'world.fortuneKeep'} />
            </PixelButton>
          </div>
        )}
      </div>
    </div>
  );
}
