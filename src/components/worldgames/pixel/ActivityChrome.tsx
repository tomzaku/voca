import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { FormattedMessage } from 'react-intl';
import { PixelButton } from './index';
import { PixelIcon, type PixelIconName } from './PixelIcon';

// Back, and an activity's tabs (its modes — learn the sounds, practise them),
// inside the activity's own popup rather than up in the skill bar. The open
// activity provides them (WorldGame); the popups (HudCenter, HudSide, HudTop)
// each offer to hold the row, and the first one mounted does — the next one
// taking over if it closes — so a screen built from several never shows it
// twice. A screen with none of them gets the row floating at the top left.

export interface Chrome {
  back: () => void;
  modes: { id: string; label: string; icon: PixelIconName }[];
  current?: string;
  setMode: (id: string) => void;
}

interface Slot { chrome: Chrome; owner: string | null; claim: (id: string) => void; release: (id: string) => void }

const Ctx = createContext<Slot | null>(null);

export function ActivityChromeProvider({ chrome, children }: { chrome: Chrome; children: ReactNode }) {
  const [owner, setOwner] = useState<string | null>(null);
  const claimants = useRef<string[]>([]);
  const claim = useCallback((id: string) => {
    if (!claimants.current.includes(id)) claimants.current.push(id);
    setOwner(claimants.current[0]);
  }, []);
  const release = useCallback((id: string) => {
    claimants.current = claimants.current.filter((c) => c !== id);
    setOwner(claimants.current[0] ?? null);
  }, []);
  // Give the popups a moment to claim the row before floating it.
  const [settled, setSettled] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSettled(true), 0); return () => clearTimeout(t); }, []);
  const slot = useMemo(() => ({ chrome, owner, claim, release }), [chrome, owner, claim, release]);
  return (
    <Ctx.Provider value={slot}>
      {children}
      {settled && owner === null && (
        <div className="px absolute top-[3.75rem] left-2 z-20 px-notch px-frame px-3 py-2 pointer-events-auto">
          <ChromeRow chrome={chrome} />
        </div>
      )}
    </Ctx.Provider>
  );
}

/** For a popup: the row, if this popup is the one holding it. */
export function useChromeSlot(inline = false): ReactNode {
  const slot = useContext(Ctx);
  const id = useId();
  const claim = slot?.claim, release = slot?.release;
  useLayoutEffect(() => {
    if (!claim || !release) return;
    claim(id);
    return () => release(id);
  }, [claim, release, id]);
  return slot && slot.owner === id ? <ChromeRow chrome={slot.chrome} inline={inline} /> : null;
}

/** Back as a game button, the modes as a game's menu tabs: chunky pixel
 *  buttons in a sunken track, the one you're on raised in gold. */
function ChromeRow({ chrome, inline = false }: { chrome: Chrome; inline?: boolean }) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${inline ? 'shrink-0' : 'mb-4'}`}>
      <PixelButton tone="paper" onClick={chrome.back} className="!px-2.5 !py-1.5 !text-[13px]">
        <PixelIcon name="back" size={2} /> <FormattedMessage id="world.activityBack" />
      </PixelButton>
      {chrome.modes.length > 1 && (
        <div className="px-inset px-notch p-1 flex gap-1" role="tablist">
          {chrome.modes.map((m) => {
            const on = m.id === chrome.current;
            return (
              <PixelButton
                key={m.id}
                tone={on ? 'gold' : 'paper'}
                onClick={() => chrome.setMode(m.id)}
                role="tab"
                aria-selected={on}
                className={`!px-2.5 !py-1.5 !text-[13px] ${on ? '' : 'opacity-75'}`}
              >
                <PixelIcon name={m.icon} size={2} /> {m.label}
              </PixelButton>
            );
          })}
        </div>
      )}
    </div>
  );
}
