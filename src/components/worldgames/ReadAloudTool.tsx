import { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { speakText, stopSpeaking } from '../../lib/tts';
import { HudCenter, PixelButton, PixelIcon } from './pixel';

// Read aloud on Cồn Hến — the Speak page's Read Aloud: type or paste
// anything and hear it in the voice chosen in Settings (lib/tts).

export function ReadAloudTool() {
  const intl = useIntl();
  const [text, setText] = useState('');
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);

  const toggle = () => {
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    if (!text.trim()) return;
    setPlaying(true);
    void speakText(text, { onEnd: () => setPlaying(false) }).catch(() => setPlaying(false));
  };

  return (
    <HudCenter wide>
      <p className="px-title !text-[18px] text-[var(--px-gold)] mb-3"><FormattedMessage id="world.actReadAloud" /></p>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={intl.formatMessage({ id: 'world.readPlaceholder' })}
        className="px-inset px-notch w-full resize-none px-3 py-2.5 text-[17px] font-semibold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
      />
      <PixelButton tone={playing ? 'bad' : 'sky'} block className="mt-3" onClick={toggle} disabled={!text.trim() && !playing}>
        <PixelIcon name={playing ? 'close' : 'speaker'} size={2} />
        <FormattedMessage id={playing ? 'listening.stop' : 'listening.play'} />
      </PixelButton>
    </HudCenter>
  );
}
