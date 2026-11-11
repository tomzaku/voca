import type { Catalog } from '../..';

// On-device pronunciation scoring (flashcard/PronunciationCheck.tsx).
export default {
  'pron.check': 'Check my pronunciation',
  'pron.tryAgain': 'Try again',
  'pron.stop': 'Stop',
  'pron.sayNow': 'Say the word now…',
  'pron.firstTime': 'Runs on your computer — a one-time {mb}MB download',
  'pron.downloading': 'Downloading the model… {pct}%',
  'pron.checking': 'Checking…',
  'pron.denied': 'Microphone access was blocked.',
  'pron.error': 'Couldn’t check that one — try again.',
  'pron.nothingHeard': 'We didn’t hear anything — try again a little louder.',
  'pron.heardInstead': '/{expected}/ sounded like /{heard}/ ({score}) — open this sound',
  'pron.notHeard': '/{expected}/ wasn’t heard — open this sound',
  'pron.weHeard': 'We heard {ipa}',
} satisfies Catalog;
