// The server's copy of the built-in collections (made by `npm run
// export:collections`) must match the app's, or a learner studying a level
// would be asked about words from an older list.
import { describe, expect, it } from 'vitest';
import exported from '../../supabase/functions/_shared/systemCollections.json';
import { getCollections } from './collections';

describe('systemCollections.json', () => {
  it('matches every built-in collection, word for word — run `npm run export:collections` if not', () => {
    const app = Object.fromEntries(getCollections().map((c) => [c.id, c.words.map((w) => w.word)]));
    expect(exported).toEqual(app);
  });
});
