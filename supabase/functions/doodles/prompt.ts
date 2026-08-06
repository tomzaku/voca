// How a cell is described to the image model.
//
// Kept apart from the edge function (and free of any Deno API) so it can be
// unit tested — see prompt.test.ts.
//
// The word is handed to the model along with its meaning: naming it gives the
// model far more to draw from than a meaning alone. A model given a quoted word
// does tend to letter it under the picture, which the sheet prompt forbids
// outright — a caption is not a doodle, it eats the cell's white margin, and
// the crop cuts it into the thumbnail as a stray line of text.

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
