// Recordings of each sound on its own, for the IPA page's 🔊 buttons — a
// speech model asked for a bare /p/ or /iː/ guesses, so these are real
// voices instead. From Wikimedia Commons, downloaded as Commons' own MP3
// transcodes (Safari can't play the Ogg originals) and served from
// public/ipa-audio/. Every file keeps its licence; most are CC BY-SA, which
// requires the credit the detail page shows from `author` and `page`.
//
// Vowels are the cardinal-vowel recordings nearest the RP sound (e.g. /ʌ/ is
// the near-open central vowel, which is how modern RP says "cup").
// Diphthongs have no standard recording, so they're absent here and their
// button falls back to an example word.

export interface IpaRecording {
  file: string;
  author: string;
  license: string;
  /** The file's Commons page — the attribution link. */
  page: string;
}

export const IPA_RECORDINGS: Record<string, IpaRecording> = {
  "ɪ": { file: 'near-close-near-front-unrounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Near-close_near-front_unrounded_vowel.ogg' },
  "e": { file: 'close-mid-front-unrounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Close-mid_front_unrounded_vowel.ogg' },
  "æ": { file: 'near-open-front-unrounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Near-open_front_unrounded_vowel.ogg' },
  "ʌ": { file: 'near-open-central-unrounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Near-open_central_unrounded_vowel.ogg' },
  "ɒ": { file: 'pr-open-back-rounded-vowel.mp3', author: "RoachPeter", license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:PR-open_back_rounded_vowel.ogg' },
  "ʊ": { file: 'near-close-near-back-rounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Near-close_near-back_rounded_vowel.ogg' },
  "ə": { file: 'mid-central-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Mid-central_vowel.ogg' },
  "iː": { file: 'close-front-unrounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Close_front_unrounded_vowel.ogg' },
  "ɜː": { file: 'open-mid-central-unrounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Open-mid_central_unrounded_vowel.ogg' },
  "ɑː": { file: 'open-back-unrounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Open_back_unrounded_vowel.ogg' },
  "ɔː": { file: 'open-mid-back-rounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Open-mid_back_rounded_vowel.ogg' },
  "uː": { file: 'close-back-rounded-vowel.mp3', author: "Denelson83", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Close_back_rounded_vowel.ogg' },
  "p": { file: 'voiceless-bilabial-plosive.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_bilabial_plosive.ogg' },
  "b": { file: 'voiced-bilabial-plosive.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_bilabial_plosive.ogg' },
  "t": { file: 'voiceless-alveolar-plosive.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_plosive.ogg' },
  "d": { file: 'voiced-alveolar-plosive.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_alveolar_plosive.ogg' },
  "k": { file: 'voiceless-velar-plosive.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_velar_plosive.ogg' },
  "g": { file: 'voiced-velar-plosive-02.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_velar_plosive_02.ogg' },
  "f": { file: 'voiceless-labiodental-fricative.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_labiodental_fricative.ogg' },
  "v": { file: 'voiced-labiodental-fricative.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_labiodental_fricative.ogg' },
  "θ": { file: 'voiceless-dental-fricative.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_dental_fricative.ogg' },
  "ð": { file: 'voiced-dental-fricative.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_dental_fricative.ogg' },
  "s": { file: 'voiceless-alveolar-sibilant.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_sibilant.ogg' },
  "z": { file: 'voiced-alveolar-sibilant.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_alveolar_sibilant.ogg' },
  "ʃ": { file: 'voiceless-palato-alveolar-sibilant.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_palato-alveolar_sibilant.ogg' },
  "ʒ": { file: 'voiced-palato-alveolar-sibilant.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_palato-alveolar_sibilant.ogg' },
  "h": { file: 'voiceless-glottal-fricative.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_glottal_fricative.ogg' },
  "tʃ": { file: 'voiceless-palato-alveolar-affricate.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiceless_palato-alveolar_affricate.ogg' },
  "dʒ": { file: 'voiced-palato-alveolar-affricate.mp3', author: "Octane (English Wikipedia)", license: 'Public domain', page: 'https://commons.wikimedia.org/wiki/File:Voiced_palato-alveolar_affricate.ogg' },
  "m": { file: 'bilabial-nasal.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Bilabial_nasal.ogg' },
  "n": { file: 'alveolar-nasal.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Alveolar_nasal.ogg' },
  "ŋ": { file: 'velar-nasal.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Velar_nasal.ogg' },
  "l": { file: 'alveolar-lateral-approximant.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Alveolar_lateral_approximant.ogg' },
  "r": { file: 'alveolar-approximant.mp3', author: "Erutuon", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Alveolar_approximant.ogg' },
  "j": { file: 'palatal-approximant.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Palatal_approximant.ogg' },
  "w": { file: 'voiced-labio-velar-approximant.mp3', author: "Peter Isotalo", license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Voiced_labio-velar_approximant.ogg' },
};

export const recordingUrl = (r: IpaRecording) => `/ipa-audio/${r.file}`;
