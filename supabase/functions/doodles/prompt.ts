// How a cell is described to the image model.
//
// Kept apart from the edge function (and free of any Deno API) so it can be
// unit tested — see prompt.test.ts.
//
// The word goes WITH its meaning: `R2C3: dormitory — large shared bedroom`.
// Naming it gives the model far more to draw from than a definition alone,
// which matters most for the abstract ones — "cheap enough for most people to
// buy" is hard to picture, `affordable` is a word the model has seen drawn.
//
// It was withheld for a while, because a model handed a quoted word letters
// that word under the picture. That turned out to be the wrong lever: with the
// word withheld the model captioned a two-word summary of the meaning instead,
// so the lettering was never really about having the string. What did move the
// needle was shortening the prompt and giving each cell ONE drawable idea —
// hence the first-sense cut below. The word is unquoted here for the same
// reason: quotation marks read as "set this in type".
//
// Only the FIRST sense is sent. A dictionary definition often carries two
// unrelated ones ("Storage unit; a group of government ministers"), and asked
// to draw both in a cell the model either crams in two pictures or gives up and
// letters the words instead. One sense is one doodle, which is all a 1cm
// thumbnail can carry anyway.

/** What to tell the model a cell should show: the word, and the first sense of
 *  its meaning. Just the word when there is no definition to add. */
export function cellSubject(word: string, definition?: string): string {
  const meaning = definition?.trim();
  if (!meaning) return word;
  return `${word} — ${meaning.split(';')[0].trim() || meaning}`;
}
