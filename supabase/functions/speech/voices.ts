// The Google voices the cloud engine offers, and the free allowance each draws
// on. Served to the client by GET /speech/voices, so the picker in Settings
// and the server's validation can never disagree.
//
// A curated few per family, not Google's whole catalogue: enough to compare
// families and pick a favourite, and every id here is one the server will
// synthesize — POST /speech rejects anything else.
//
// `family` is the pricing SKU, which is what Google's free allowance is
// counted against (cloud.google.com/text-to-speech/pricing): WaveNet and
// Standard share one SKU, so they share one budget.

export type Family = 'chirp3' | 'neural2' | 'wavenet-standard';

export interface CloudVoice {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  accent: 'American' | 'British';
  /** Shown as the group heading in the picker. */
  tier: 'Chirp 3 HD' | 'Neural2' | 'WaveNet' | 'Standard';
  family: Family;
}

/** Google's free characters per month for each family. */
export const FREE_CHARS: Record<Family, number> = {
  chirp3: 1_000_000,
  neural2: 1_000_000,
  'wavenet-standard': 4_000_000,
};

/**
 * Our ceiling per family: 90% of the free allowance, leaving room for the
 * hours where Google's month (Pacific) and ours (UTC) overlap. Overridable,
 * e.g. SPEECH_MONTHLY_CHAR_LIMIT_CHIRP3.
 */
export function monthlyLimit(family: Family): number {
  const env = Number(Deno.env.get(`SPEECH_MONTHLY_CHAR_LIMIT_${family.replace('-', '_').toUpperCase()}`));
  return env > 0 ? env : Math.floor(FREE_CHARS[family] * 0.9);
}

function v(id: string, gender: CloudVoice['gender'], tier: CloudVoice['tier'], family: Family): CloudVoice {
  const accent = id.startsWith('en-GB') ? 'British' : 'American';
  // en-US-Chirp3-HD-Aoede → Aoede; en-US-Neural2-F → Neural2 F
  const tail = id.split('-').slice(2);
  const name = family === 'chirp3' ? tail[tail.length - 1] : `${tier} ${tail[tail.length - 1]}`;
  return { id, name, gender, accent, tier, family };
}

export const CLOUD_VOICES: CloudVoice[] = [
  v('en-US-Chirp3-HD-Aoede', 'Female', 'Chirp 3 HD', 'chirp3'),
  v('en-US-Chirp3-HD-Kore', 'Female', 'Chirp 3 HD', 'chirp3'),
  v('en-US-Chirp3-HD-Leda', 'Female', 'Chirp 3 HD', 'chirp3'),
  v('en-US-Chirp3-HD-Zephyr', 'Female', 'Chirp 3 HD', 'chirp3'),
  v('en-US-Chirp3-HD-Charon', 'Male', 'Chirp 3 HD', 'chirp3'),
  v('en-US-Chirp3-HD-Puck', 'Male', 'Chirp 3 HD', 'chirp3'),
  v('en-US-Chirp3-HD-Fenrir', 'Male', 'Chirp 3 HD', 'chirp3'),
  v('en-US-Chirp3-HD-Orus', 'Male', 'Chirp 3 HD', 'chirp3'),
  v('en-GB-Chirp3-HD-Aoede', 'Female', 'Chirp 3 HD', 'chirp3'),
  v('en-GB-Chirp3-HD-Charon', 'Male', 'Chirp 3 HD', 'chirp3'),

  v('en-US-Neural2-F', 'Female', 'Neural2', 'neural2'),
  v('en-US-Neural2-H', 'Female', 'Neural2', 'neural2'),
  v('en-US-Neural2-D', 'Male', 'Neural2', 'neural2'),
  v('en-US-Neural2-J', 'Male', 'Neural2', 'neural2'),
  v('en-GB-Neural2-A', 'Female', 'Neural2', 'neural2'),
  v('en-GB-Neural2-B', 'Male', 'Neural2', 'neural2'),

  v('en-US-Wavenet-F', 'Female', 'WaveNet', 'wavenet-standard'),
  v('en-US-Wavenet-H', 'Female', 'WaveNet', 'wavenet-standard'),
  v('en-US-Wavenet-D', 'Male', 'WaveNet', 'wavenet-standard'),
  v('en-US-Wavenet-J', 'Male', 'WaveNet', 'wavenet-standard'),
  v('en-GB-Wavenet-A', 'Female', 'WaveNet', 'wavenet-standard'),
  v('en-GB-Wavenet-B', 'Male', 'WaveNet', 'wavenet-standard'),

  v('en-US-Standard-F', 'Female', 'Standard', 'wavenet-standard'),
  v('en-US-Standard-D', 'Male', 'Standard', 'wavenet-standard'),
  v('en-GB-Standard-A', 'Female', 'Standard', 'wavenet-standard'),
  v('en-GB-Standard-B', 'Male', 'Standard', 'wavenet-standard'),
];

/**
 * Which budget a Google voice name draws on — from the name, so the env
 * defaults (GOOGLE_TTS_VOICE_*) work for any voice in these families. Null for
 * a family with no free allowance (Studio, Polyglot…), which we never call.
 */
export function familyOf(id: string): Family | null {
  if (/-Chirp3-HD-/.test(id)) return 'chirp3';
  if (/-Neural2-/.test(id)) return 'neural2';
  if (/-(Wavenet|Standard)-/.test(id)) return 'wavenet-standard';
  return null;
}

/** Whether a client may ask for this voice by name. */
export function isOffered(id: string): boolean {
  return CLOUD_VOICES.some((x) => x.id === id);
}
