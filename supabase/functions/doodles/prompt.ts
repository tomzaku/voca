// How a cell is described to the image model.
//
// Kept apart from the edge function (and free of any Deno API) so it can be
// unit tested — see prompt.test.ts.
//
// The word is handed to the model along with its meaning. It used to be
// withheld — a model given a quoted word letters that word under the picture,
// and the flash card showed the doodle while the learner was still guessing, so
// the caption was the answer. The card no longer shows the doodle until the
// word is revealed, so lettering costs nothing, and naming the word gives the
// model far more to draw from than a meaning alone.

/**
 * What to tell the model a cell should show: the word and, when we have one,
 * the meaning to draw. The meaning is what actually disambiguates ("bank" the
 * riverside vs the building), so it is sent whenever it exists.
 */
export function cellSubject(word: string, definition?: string): string {
  const meaning = definition?.trim();
  return meaning
    ? `the word "${word}" — ${meaning}`
    : `the meaning of the word "${word}"`;
}
