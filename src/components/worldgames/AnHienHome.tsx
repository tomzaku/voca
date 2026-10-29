import { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCompanion, useWordsKnown } from '../../hooks/useCompanion';
import { useGameScore } from '../../hooks/useGameScore';
import { ANIMALS, SKILL_THRESHOLDS, getAnimal, growth, type AnimalId } from '../../lib/companion';
import { playSelect } from '../../lib/sfx';
import { HudCenter, HudSide, PixelBar, PixelButton, PixelIcon, PixelSprite, PixelStat } from './pixel';

// The Buddy building — An Hiên, the garden house that is your home. The same
// companion as the Buddy page (useCompanion: the chosen animal and its name,
// saved to settings; lib/companion: growth stages, skills and perks from the
// words you know), drawn with the world's pixel sprite of your buddy — the
// one walking the map — instead of the page's illustrated avatar.

/** The pixel sprite sheets: 32px frames, four to a row, idle facing down
 *  first (public/game/animals/README.md). */
const SHEET_WIDTH = 128;
const sheet = (id: AnimalId) => `${import.meta.env.BASE_URL}game/animals/${id}.png`;

export function AnHienHome() {
  const { animalId, name, choose, rename } = useCompanion();
  const known = useWordsKnown();
  const [picking, setPicking] = useState(false);

  if (!animalId || picking) {
    return (
      <Picker
        current={animalId}
        onPick={(id) => { playSelect(); choose(id); setPicking(false); }}
        onCancel={animalId ? () => setPicking(false) : undefined}
      />
    );
  }
  return <Buddy animalId={animalId} name={name} known={known} onRename={rename} onChange={() => setPicking(true)} />;
}

function Picker({ current, onPick, onCancel }: { current: AnimalId | null; onPick: (id: AnimalId) => void; onCancel?: () => void }) {
  return (
    <HudCenter wide>
      <p className="px-title !text-[18px] text-[var(--px-gold)] text-center"><FormattedMessage id="companion.chooseTitle" /></p>
      <p className="text-[15px] text-[var(--px-muted)] text-center mt-1 mb-4 leading-snug"><FormattedMessage id="companion.chooseIntro" /></p>
      <div className="grid grid-cols-2 gap-2">
        {ANIMALS.map((a) => (
          <button key={a.id} onClick={() => onPick(a.id)} data-on={current === a.id} className="px-pick px-notch p-3 flex items-center gap-3 text-left">
            <PixelSprite src={sheet(a.id)} sheetWidth={SHEET_WIDTH} scale={2} />
            <span className="min-w-0">
              <span className="block px-title">{a.name}</span>
              <span className="block text-[13px] text-[var(--px-muted)]">{a.tagline}</span>
              <span className="block text-[13px] text-[var(--px-gold)] mt-0.5">{a.perkTitle} · {a.perkDesc}</span>
            </span>
          </button>
        ))}
      </div>
      {onCancel && (
        <PixelButton tone="paper" block className="mt-4" onClick={onCancel}><FormattedMessage id="world.close" /></PixelButton>
      )}
    </HudCenter>
  );
}

function Buddy({ animalId, name, known, onRename, onChange }: {
  animalId: AnimalId;
  name: string;
  known: number;
  onRename: (n: string) => void;
  onChange: () => void;
}) {
  const intl = useIntl();
  const a = getAnimal(animalId);
  const { points, best } = useGameScore();
  const { stage, next, toNext, pct } = growth(known);

  return (
    <HudSide title={<FormattedMessage id="world.featureBuddy" />}>
      <div className="flex flex-col items-center text-center">
        <span className="px-inset px-notch p-3">
          <PixelSprite src={sheet(animalId)} sheetWidth={SHEET_WIDTH} scale={4} />
        </span>
        <input
          value={name}
          onChange={(e) => onRename(e.target.value)}
          placeholder={intl.formatMessage({ id: 'companion.namePlaceholder' }, { animal: a.name.toLocaleLowerCase(intl.locale) })}
          className="px-inset px-notch mt-3 w-full max-w-[16rem] text-center px-3 py-2 text-[20px] font-bold text-[var(--px-text)] placeholder:text-[var(--px-muted)] focus:outline-none"
        />
        <p className="mt-1.5 text-[14px] text-[var(--px-muted)]">
          {a.name} · <span className="text-[var(--px-gold)]">{stage.name}</span>
        </p>
      </div>

      <section>
        <PixelBar
          pct={pct}
          color="var(--px-jade)"
          label={next
            ? intl.formatMessage({ id: 'companion.wordsToNext' }, { count: toNext, stage: next.name })
            : intl.formatMessage({ id: 'companion.fullyGrown' })}
        />
      </section>

      <div className="grid grid-cols-3 gap-2">
        <PixelStat icon="check" label={intl.formatMessage({ id: 'companion.statWordsLearned' })} value={String(known)} color="text-[var(--px-good)]" />
        <PixelStat icon="star" label={intl.formatMessage({ id: 'companion.statPoints' })} value={String(points)} color="text-[var(--px-gold)]" />
        <PixelStat icon="flame" label={intl.formatMessage({ id: 'companion.statBestStreak' })} value={String(best)} color="text-[var(--px-bad)]" />
      </div>

      <div className="px-inset px-notch p-3">
        <p className="px-title text-[var(--px-gold)]">{a.emoji} {a.perkTitle}</p>
        <p className="text-[14px] text-[var(--px-muted)] mt-0.5">{a.perkDesc}</p>
      </div>

      <section>
        <p className="px-title text-[var(--px-accent)] mb-2"><FormattedMessage id="companion.skills" /></p>
        <ul className="space-y-1.5">
          {a.skills.map((skill, i) => {
            const need = SKILL_THRESHOLDS[i];
            const unlocked = known >= need;
            return (
              <li key={skill.name} className={`px-pick px-notch px-3 py-2 cursor-default ${unlocked ? '' : 'opacity-60'}`} data-on={unlocked}>
                <span className="flex items-center gap-2">
                  <span className={`text-[18px] ${unlocked ? '' : 'grayscale'}`}>{skill.icon}</span>
                  <span className="flex-1 px-title">{skill.name}</span>
                  {unlocked
                    ? <PixelIcon name="check" size={2} className="text-[var(--px-good)]" />
                    : <span className="text-[12px] text-[var(--px-muted)]"><FormattedMessage id="companion.skillNeed" values={{ count: need }} /></span>}
                </span>
                <span className="block text-[13px] text-[var(--px-muted)] mt-0.5 leading-snug">{skill.desc}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <PixelButton tone="paper" block onClick={onChange}><FormattedMessage id="companion.change" /></PixelButton>
    </HudSide>
  );
}
