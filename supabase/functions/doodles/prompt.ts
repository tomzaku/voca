// How a cell is described to the image model.
//
// Kept apart from the edge function (and free of any Deno API) so it can be
// unit tested — see prompt.test.ts.
//
// The MEANING is sent, not the word. Naming the word gives the model more to
// draw from, and it was sent for a while for exactly that reason — but a model
// handed a quoted word letters that word onto the picture, and no wording of
// "no text anywhere" stops it. The definition alone is enough to draw from: it
// is what disambiguates anyway ("bank" the riverside vs the building). Only a
// word with no definition at all falls back to sending its name.
//
// Nothing frames the meaning — the prompt's cell list is `R2C3: <this>`, and
// every extra word here is one the model reads sixteen times over.

/** What to tell the model a cell should show: the meaning to draw. */
export function cellSubject(word: string, definition?: string): string {
  return definition?.trim() || word;
}
