import type { ReactElement } from 'react';
import { getAnimal, type AnimalId } from '../lib/companion';

interface Props {
  animalId: AnimalId;
  /** Growth stage 0–4 — scales the creature up and adds a Master crown. */
  stage?: number;
  mood?: 'idle' | 'happy';
  /** Overrides the idle/happy animation — a one-shot CSS class (skill preview). */
  anim?: string;
  size?: number;
}

const EYE = '#2b2540';

/**
 * The companion's face, drawn as an animated SVG. Kept behind this one component
 * so a richer renderer (e.g. Lottie) can drop in later without touching callers.
 */
export function AnimalAvatar({ animalId, stage = 0, mood = 'idle', anim, size = 160 }: Props) {
  const a = getAnimal(animalId);
  const scale = 0.82 + stage * 0.045; // Baby → Master grows a little each stage
  const isMaster = stage >= STAGE_MASTER;
  const wrapperClass = anim || (mood === 'happy' ? 'companion-happy' : 'companion-idle');

  return (
    <div
      className={wrapperClass}
      style={{
        width: size,
        height: size,
        filter: isMaster ? `drop-shadow(0 0 14px ${a.colors.primary}bb)` : undefined,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label={a.name}>
        <g transform={`translate(50 54) scale(${scale}) translate(-50 -54)`}>
          {isMaster && <Crown />}
          {FACES[animalId](a.colors)}
        </g>
      </svg>
    </div>
  );
}

const STAGE_MASTER = 4;

function Crown() {
  return (
    <path
      d="M36 20 L42 12 L50 18 L58 12 L64 20 L62 26 L38 26 Z"
      fill="#ffd23f"
      stroke="#e8a90a"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  );
}

type Colors = { primary: string; secondary: string; belly: string };

const FACES: Record<AnimalId, (c: Colors) => ReactElement> = {
  fox: ({ primary, secondary, belly }) => (
    <>
      {/* ears */}
      <path d="M28 34 L34 8 L50 28 Z" fill={secondary} />
      <path d="M72 34 L66 8 L50 28 Z" fill={secondary} />
      <path d="M33 30 L36 16 L45 27 Z" fill={belly} />
      <path d="M67 30 L64 16 L55 27 Z" fill={belly} />
      {/* head */}
      <ellipse cx="50" cy="52" rx="27" ry="24" fill={primary} />
      {/* white muzzle */}
      <path d="M50 46 Q32 52 40 70 Q50 78 50 78 Q50 78 60 70 Q68 52 50 46 Z" fill={belly} />
      {/* eyes */}
      <g className="companion-eye"><circle cx="40" cy="50" r="3.4" fill={EYE} /></g>
      <g className="companion-eye" style={{ animationDelay: '.2s' }}><circle cx="60" cy="50" r="3.4" fill={EYE} /></g>
      {/* nose */}
      <path d="M50 64 l-3.5 -4 h7 z" fill={EYE} />
    </>
  ),

  owl: ({ primary, secondary, belly }) => (
    <>
      {/* ear tufts */}
      <path d="M30 24 L36 10 L44 26 Z" fill={secondary} />
      <path d="M70 24 L64 10 L56 26 Z" fill={secondary} />
      {/* body */}
      <ellipse cx="50" cy="54" rx="28" ry="26" fill={primary} />
      <ellipse cx="50" cy="60" rx="17" ry="18" fill={belly} />
      {/* eye discs */}
      <circle cx="40" cy="48" r="11" fill="#fff" stroke={secondary} strokeWidth="2" />
      <circle cx="60" cy="48" r="11" fill="#fff" stroke={secondary} strokeWidth="2" />
      <g className="companion-eye"><circle cx="41" cy="49" r="4.5" fill={EYE} /></g>
      <g className="companion-eye" style={{ animationDelay: '.18s' }}><circle cx="59" cy="49" r="4.5" fill={EYE} /></g>
      {/* beak */}
      <path d="M50 54 l-4 6 h8 z" fill="#ff9f43" />
    </>
  ),

  cat: ({ primary, secondary, belly }) => (
    <>
      {/* ears */}
      <path d="M27 34 L30 12 L48 26 Z" fill={primary} />
      <path d="M73 34 L70 12 L52 26 Z" fill={primary} />
      <path d="M32 30 L33 18 L44 27 Z" fill={secondary} />
      <path d="M68 30 L67 18 L56 27 Z" fill={secondary} />
      {/* head */}
      <ellipse cx="50" cy="52" rx="26" ry="23" fill={primary} />
      <ellipse cx="50" cy="60" rx="13" ry="11" fill={belly} />
      {/* eyes */}
      <g className="companion-eye"><ellipse cx="41" cy="50" rx="3.2" ry="4.2" fill={EYE} /></g>
      <g className="companion-eye" style={{ animationDelay: '.22s' }}><ellipse cx="59" cy="50" rx="3.2" ry="4.2" fill={EYE} /></g>
      {/* nose + whiskers */}
      <path d="M50 60 l-2.5 -3 h5 z" fill="#ff6ec7" />
      <g stroke={secondary} strokeWidth="1.3" strokeLinecap="round">
        <line x1="34" y1="58" x2="22" y2="55" /><line x1="34" y1="61" x2="22" y2="62" />
        <line x1="66" y1="58" x2="78" y2="55" /><line x1="66" y1="61" x2="78" y2="62" />
      </g>
    </>
  ),

  turtle: ({ primary, secondary, belly }) => (
    <>
      {/* feet */}
      <ellipse cx="30" cy="74" rx="7" ry="5" fill={secondary} />
      <ellipse cx="70" cy="74" rx="7" ry="5" fill={secondary} />
      {/* head */}
      <circle cx="50" cy="34" r="12" fill={secondary} />
      <g className="companion-eye"><circle cx="45" cy="33" r="2.6" fill={EYE} /></g>
      <g className="companion-eye" style={{ animationDelay: '.2s' }}><circle cx="55" cy="33" r="2.6" fill={EYE} /></g>
      <path d="M46 40 Q50 43 54 40" stroke={EYE} strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* shell */}
      <path d="M22 62 Q22 44 50 44 Q78 44 78 62 Q78 74 50 74 Q22 74 22 62 Z" fill={primary} stroke={secondary} strokeWidth="2.5" />
      <ellipse cx="50" cy="60" rx="10" ry="9" fill={belly} opacity="0.65" />
      <g stroke={secondary} strokeWidth="2" strokeLinecap="round">
        <line x1="50" y1="46" x2="40" y2="53" /><line x1="50" y1="46" x2="60" y2="53" />
        <line x1="40" y1="53" x2="34" y2="66" /><line x1="60" y1="53" x2="66" y2="66" />
        <line x1="40" y1="53" x2="50" y2="69" /><line x1="60" y1="53" x2="50" y2="69" />
      </g>
    </>
  ),
};
