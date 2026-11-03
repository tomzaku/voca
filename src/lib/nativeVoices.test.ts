import { describe, expect, it } from 'vitest';
import { chooseVoice, rankEnglishVoices, voiceTier } from './nativeVoices';

// voiceURIs as iOS 17 / macOS Safari, Edge and Android Chrome report them.
const samantha = { name: 'Samantha', voiceURI: 'com.apple.voice.compact.en-US.Samantha', lang: 'en-US' };
const avaEnhanced = { name: 'Ava (Enhanced)', voiceURI: 'com.apple.voice.enhanced.en-US.Ava', lang: 'en-US' };
const zoePremium = { name: 'Zoe (Premium)', voiceURI: 'com.apple.voice.premium.en-US.Zoe', lang: 'en-US' };
const danielPremium = { name: 'Daniel (Premium)', voiceURI: 'com.apple.voice.premium.en-GB.Daniel', lang: 'en-GB' };
const eddy = { name: 'Eddy (English (US))', voiceURI: 'com.apple.eloquence.en-US.Eddy', lang: 'en-US' };
const bubbles = { name: 'Bubbles', voiceURI: 'com.apple.speech.synthesis.voice.Bubbles', lang: 'en-US' };
const thomas = { name: 'Thomas', voiceURI: 'com.apple.voice.compact.fr-FR.Thomas', lang: 'fr-FR' };
const aria = { name: 'Microsoft Aria Online (Natural) - English (United States)', voiceURI: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US' };
const android = { name: 'English United States', voiceURI: 'English United States', lang: 'en_US' };

describe('voiceTier', () => {
  it('reads Apple quality from the voiceURI', () => {
    expect(voiceTier(samantha)).toBe('standard');
    expect(voiceTier(avaEnhanced)).toBe('enhanced');
    expect(voiceTier(zoePremium)).toBe('premium');
  });
  it('treats Edge natural voices as enhanced', () => {
    expect(voiceTier(aria)).toBe('enhanced');
  });
  it('flags Eloquence and joke voices', () => {
    expect(voiceTier(eddy)).toBe('novelty');
    expect(voiceTier(bubbles)).toBe('novelty');
  });
});

describe('rankEnglishVoices', () => {
  it('puts premium first, US before UK, and drops novelty and non-English', () => {
    const ranked = rankEnglishVoices([samantha, eddy, thomas, danielPremium, avaEnhanced, bubbles, zoePremium]);
    expect(ranked.map((v) => v.name)).toEqual(['Zoe (Premium)', 'Daniel (Premium)', 'Ava (Enhanced)', 'Samantha']);
  });
  it('accepts Android underscore langs', () => {
    expect(rankEnglishVoices([android])).toEqual([android]);
  });
});

describe('chooseVoice', () => {
  it('keeps the user pick when installed', () => {
    expect(chooseVoice([samantha, zoePremium], samantha.voiceURI)).toBe(samantha);
  });
  it('falls back to the best when the pick is gone', () => {
    expect(chooseVoice([samantha, zoePremium], 'gone')).toBe(zoePremium);
  });
  it('returns null before voices load', () => {
    expect(chooseVoice([])).toBeNull();
  });
});
