// Where each keeper stands, as a place with a story to tell (the `places`
// catalog). The map's own labels carry their story's id in the template
// (scripts/hue: each place's LABELS), so only keepers are listed here.
//
// Kept dependency-free like the rest of src/game/'s data.

/** Where each keeper stands — walking up to one tells that place's story.
 *  The skills' keepers stand at their rooms' places (ROOMS[…].place); this
 *  names the rest. */
export const KEEPER_PLACES: Record<string, string> = {
  collections: 'thaiHoa',
};
