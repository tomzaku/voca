import type { Catalog } from '../..';

export default {
  'common.close': 'Close',
  'common.back': 'Back',
  'common.copy': 'Copy',
  'common.clear': 'Clear',
  'common.more': '+{count} more',
  'common.wordCount': '{count, plural, one {# word} other {# words}}',
  'common.previewSample': '{shown} of {total, plural, one {# word} other {# words}}, picked at random',
  'common.previewReshuffle': 'Show different words',
  'common.searchPlaceholder': 'Search {learn} or {mother}…',
  'common.searchTry': 'Try “{example}”',
  'common.searchEnterHint': 'Enter to look up a word',
  'common.searchEscHint': '<kbd>Esc</kbd> to close',
  'common.filterRecent': 'Recent',
  'common.filterSaved': 'Saved',
  'common.noResponse': 'No response received.',
  'common.errNotConnected': 'Not connected.',
  'common.errUnreachable': 'Couldn\'t reach the server.',
  'common.errSignIn': 'Sign in to use this — it’s free, and your progress syncs across devices.',
  'common.errRequestFailed': 'Request failed ({status}).',
} satisfies Catalog;
