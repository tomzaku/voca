// Language preferences: the language the user is learning (default English) and
// their mother language used for translations (default Vietnamese). The mother
// language reuses the existing translate-target key so prior prefs carry over.

const LEARN_KEY = 'voca-learn-lang';
const MOTHER_KEY = 'voca-translate-lang';

export const LANGUAGES = [
  'English', 'Vietnamese', 'Spanish', 'French', 'German', 'Italian',
  'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Russian', 'Arabic',
  'Hindi', 'Indonesian', 'Thai', 'Dutch', 'Polish', 'Turkish',
];

export function getLearnLanguage(): string {
  return localStorage.getItem(LEARN_KEY) || 'English';
}

export function setLearnLanguage(lang: string): void {
  localStorage.setItem(LEARN_KEY, lang);
}

export function getMotherLanguage(): string {
  return localStorage.getItem(MOTHER_KEY) || 'Vietnamese';
}

export function setMotherLanguage(lang: string): void {
  localStorage.setItem(MOTHER_KEY, lang);
}
