import { describe, expect, it } from 'vitest';
import { SKILLS } from '../../game/features';
import { ACTIVITIES, WORLD_SKILLS, findActivity } from './registry';

// The registry is files nobody lists by hand, so these are the checks a list
// would have made: every activity belongs to a real skill, none share an id,
// and each has its words in both languages (in any of the world's catalogs).

type Catalog = Record<string, string>;
const merge = (files: Record<string, { default: Catalog }>): Catalog => Object.assign({}, ...Object.values(files).map((m) => m.default));
const en = merge(import.meta.glob<{ default: Catalog }>('../../i18n/messages/en/world*.ts', { eager: true }));
const vi = merge(import.meta.glob<{ default: Catalog }>('../../i18n/messages/vi/world*.ts', { eager: true }));

describe('activity registry', () => {
  it('finds every activity file', () => {
    expect(ACTIVITIES.length).toBeGreaterThanOrEqual(22);
  });
  it('gives each activity its own id', () => {
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('puts each activity under a skill that exists', () => {
    const skills = new Set(SKILLS.map((s) => s.id));
    expect(ACTIVITIES.filter((a) => !skills.has(a.skill)).map((a) => a.id)).toEqual([]);
  });
  it('names each activity in English and Vietnamese', () => {
    const missing = ACTIVITIES.flatMap((a) => [a.nameId, a.blurbId]).filter((id) => !(id in en) || !(id in vi));
    expect(missing).toEqual([]);
  });
  it('lists a skill’s activities in their order', () => {
    for (const s of WORLD_SKILLS) {
      const orders = s.activities.map((a) => a.order);
      expect(orders).toEqual([...orders].sort((x, y) => x - y));
    }
  });
  it('finds an activity with its skill', () => {
    expect(findActivity('podcast')?.skill.id).toBe('listening');
    expect(findActivity('nope')).toBeNull();
  });
});

describe('keepers', () => {
  it('gives every skill a keeper, named in both languages', async () => {
    const { KEEPERS } = await import('./keepers');
    for (const s of SKILLS) {
      expect(KEEPERS[s.id], s.id).toBeDefined();
      expect(en[KEEPERS[s.id].nameId], s.id).toBeDefined();
      expect(vi[KEEPERS[s.id].nameId], s.id).toBeDefined();
    }
  });
});
