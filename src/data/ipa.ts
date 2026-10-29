// The 44 sounds of English, as commonly taught in ESL/IPA charts (RP-leaning
// symbols — e.g. /ɒ/, /əʊ/ — since that's the standard reference set most
// learners meet first). Static, hand-checked reference data: unlike a
// looked-up word's phonetics (word/phonemize.ts, generated per word via
// eSpeak), this list of sounds and their example words never changes, so
// there's nothing here worth a round trip to an edge function.
//
// Example-word audio plays through the same TTS pipeline as everywhere else
// (src/lib/tts.ts) — phonemizer produces text transcriptions, not audio, and
// these symbol -> example-word mappings are fixed by construction, so a
// per-word phonemize call would be pure overhead here.

export type IpaCategory = 'vowel-short' | 'vowel-long' | 'diphthong' | 'consonant';

export const CATEGORY_LABELS: Record<IpaCategory, string> = {
  'vowel-short': 'Short vowels',
  'vowel-long': 'Long vowels',
  diphthong: 'Diphthongs',
  consonant: 'Consonants',
};

// Display order for the chart — vowels simple-to-complex, then consonants.
export const CATEGORY_ORDER: IpaCategory[] = ['vowel-short', 'vowel-long', 'diphthong', 'consonant'];

export interface IpaSentence {
  /** Written to pack in as many instances of the sound as natural English
   *  allows (a "tongue twister"), not just one example word — e.g. /iː/'s
   *  "Pete's elite team sees three sweet, neat, green bees eat crisp treats
   *  in the breeze." No single word is singled out for highlighting: with
   *  this much repetition, near enough the whole sentence carries the sound. */
  text: string;
}

export interface IpaSound {
  symbol: string;
  category: IpaCategory;
  /** Shown on the chart card — kept short (3) so every card is the same size. */
  examples: string[];
  /** One line on tongue/lip/jaw position and voicing — the detail page's
   *  answer to "how do I actually make this sound". */
  howTo: string;
  /** Every example word on the detail page, grouped by the letters that
   *  spell the sound in it — English spelling is the main reason a learner
   *  says the wrong sound, so the words teach the patterns. Hand-sorted:
   *  "pretty" is /ɪ/ through its e, not its y. */
  spellings: [letters: string, words: string[]][];
  /** The usual mistake and how to avoid it, often naming the sound it
   *  slides into. */
  tip: string;
  /** Sound-loaded practice sentences — read aloud, record yourself, and (on
   *  by default) see the IPA for. 3 per sound, except /ʒ/ and /ʊə/'s 2 —
   *  both are genuinely rare in English (/ʒ/ almost never starts a word;
   *  /ʊə/ is a dying sound eSpeak's own RP voice realizes most of its few
   *  remaining words, "tour"/"sure"/"moor", as /ɔː/ anyway), so a third
   *  sentence for either would only be padding. */
  sentences: IpaSentence[];
}

export const IPA_SOUNDS: IpaSound[] = [
  // ── Short vowels ──
  { symbol: 'ɪ', category: 'vowel-short', examples: ['sit', 'pin', 'dish'],
    howTo: 'Tongue high and toward the front, lips relaxed and slightly spread — shorter and looser than /iː/.',
    spellings: [
      ['i', ['sit', 'pin', 'dish', 'bit', 'kiss', 'lip', 'big', 'fish', 'drink', 'ill', 'sing', 'hit', 'milk', 'sister', 'give', 'live', 'river', 'winter', 'little', 'finish', 'quick', 'gift', 'chicken', 'minute', 'wish', 'listen']],
      ['y', ['hymn', 'myth', 'gym']],
      ['e', ['pretty', 'English', 'return', 'decide', 'begin']],
      ['ui', ['build']],
      ['o', ['women']],
      ['u', ['busy']],
      ['ie', ['sieve']],
      ['ei', ['foreign', 'forfeit']],
    ],
    tip: 'Don\'t stretch it into /iː/ — "ship" is short and loose, "sheep" is long and tense.',
    sentences: [
      { text: 'Six little pigs sit in a big pit, kicking their thin legs with a quick flick.' },
      { text: 'Jim\'s quick kitten sits still, sniffing a dish of fish while its whiskers twitch and wiggle.' },
      { text: 'The king\'s six ministers sipped fizzy drinks and listened to the silly singer\'s quick, witty jingle.' },
    ] },
  { symbol: 'e', category: 'vowel-short', examples: ['bed', 'pen', 'red'],
    howTo: 'Mouth half-open, tongue mid and forward, lips relaxed — like /ɪ/ but with the jaw dropped a little more.',
    spellings: [
      ['e', ['bed', 'pen', 'red', 'bell', 'ten', 'get', 'went', 'yes', 'egg', 'seven', 'help', 'leg', 'desk', 'dress', 'chest', 'west', 'spend', 'every', 'never', 'letter', 'check', 'twelve']],
      ['ea', ['bread', 'head', 'heavy', 'weather', 'breakfast']],
      ['ai', ['said']],
      ['a', ['many', 'any', 'anyone', 'anything']],
      ['ie', ['friend']],
    ],
    tip: 'Don\'t drop the jaw as far as /æ/ — "pen", not "pan".',
    sentences: [
      { text: 'Ten fresh eggs and red bread were left on the bed for Ben\'s best friend\'s breakfast.' },
      { text: 'Every guest said yes when Jenny\'s clever pet fetched seven wet pebbles from the wet, empty well.' },
      { text: 'The best chef spent ten pleasant hours preparing fresh bread, tender eggs, and heavy red lentils.' },
    ] },
  { symbol: 'æ', category: 'vowel-short', examples: ['cat', 'hat', 'bag'],
    howTo: 'Jaw drops low, lips spread wide, tongue low and forward — the widest smile of the short vowels.',
    spellings: [
      ['a', ['cat', 'hat', 'bag', 'bad', 'man', 'apple', 'black', 'hand', 'bank', 'sad', 'add', 'map', 'cap', 'back', 'fat', 'lamp', 'jacket', 'happy', 'family', 'rabbit', 'travel', 'catch', 'thank', 'plan', 'camp', 'stand', 'track', 'snack', 'chat', 'flag', 'match']],
      ['ai', ['plaid', 'plait']],
    ],
    tip: 'Drop the jaw further than for /e/ and spread the lips. It isn\'t /ʌ/ — "cat", not "cut".',
    sentences: [
      { text: 'The fat cat sat on a black mat, snatching a snack from the sad man\'s bag.' },
      { text: 'Mad Sam packed his backpack with apples, jam, and a plastic map before the camping trip.' },
      { text: 'Happy Andy\'s family ran across the grassy land, clapping their hands at the fantastic band\'s happy party.' },
    ] },
  { symbol: 'ʌ', category: 'vowel-short', examples: ['cup', 'run', 'luck'],
    howTo: 'Mouth barely open, tongue central and relaxed, lips neutral — a short, clipped "uh".',
    spellings: [
      ['u', ['cup', 'run', 'luck', 'sun', 'but', 'bus', 'mud', 'duck', 'fun', 'much', 'hungry', 'uncle', 'jump']],
      ['o', ['love', 'mother', 'come', 'money', 'done', 'brother', 'other', 'nothing', 'Monday', 'month']],
      ['ou', ['young', 'enough', 'touch', 'country', 'double', 'trouble', 'cousin']],
      ['oo', ['blood']],
    ],
    tip: 'Keep the mouth relaxed and central — less open than /ɑː/, further back than /æ/.',
    sentences: [
      { text: 'My young cousin Russell loves lunch, munching a dozen crunchy buns under the sunny summer sun.' },
      { text: 'The lucky young duck jumped up, tumbled in the mud, and hunted for crumbs under the rusty trucks.' },
      { text: 'Uncle Gus was suddenly overcome with love, hugging his mother and brother in front of the sunny front porch.' },
    ] },
  { symbol: 'ɒ', category: 'vowel-short', examples: ['hot', 'dog', 'top'],
    howTo: 'Lips rounded, jaw dropped, tongue low and back — the British "o" in "hot" (many American speakers merge this with /ɑː/).',
    spellings: [
      ['o', ['hot', 'dog', 'top', 'box', 'shop', 'lot', 'stop', 'clock', 'not', 'job', 'rock', 'sock', 'hop', 'pot', 'cost', 'soft', 'lost', 'body', 'coffee', 'doctor', 'problem', 'often', 'holiday', 'bottle', 'possible', 'knowledge']],
      ['a', ['watch', 'want', 'wash', 'quality']],
      ['au', ['sausage', 'because', 'Australia', 'cauliflower']],
      ['ough', ['cough', 'trough']],
      ['or', ['sorry', 'orange', 'horrible', 'borrow', 'florist']],
    ],
    tip: 'Short, with rounded lips — hold it and it turns into /ɔː/ ("cot" → "caught").',
    sentences: [
      { text: 'Tom\'s dog hopped onto the box, knocked over the pot, and stopped to watch the clock on top of the shop.' },
      { text: 'A long, strong fox trotted off the rocky spot, hopping past the wobbly socks that had dropped from the washing line.' },
      { text: 'The cross boss lost his watch, knocked a pot off the shop counter, and stomped off in a hot temper.' },
    ] },
  { symbol: 'ʊ', category: 'vowel-short', examples: ['book', 'put', 'foot'],
    howTo: 'Lips loosely rounded, tongue high and back, short and relaxed — not as tense or rounded as /uː/.',
    spellings: [
      ['oo', ['book', 'foot', 'good', 'look', 'wood', 'cook', 'wool', 'hood', 'hook', 'cookie', 'football', 'childhood', 'goodbye', 'understood', 'bookshelf', 'neighbourhood']],
      ['u', ['put', 'full', 'push', 'sugar', 'cushion', 'bush', 'bull', 'pull', 'butcher', 'pudding']],
      ['ou', ['could', 'would', 'should']],
      ['o', ['woman', 'wolf']],
    ],
    tip: 'Short and loose — tense, pushed-out lips make /uː/ ("full" vs "fool").',
    sentences: [
      { text: 'The good cook put a full pot of pudding on the wooden hook, then pulled the woolly cushion closer.' },
      { text: 'A woman with a good foot took a look, then pushed the heavy wooden bookcase back to its proper spot.' },
      { text: 'The butcher could barely pull the full basket of wool, so he stood and took another good look.' },
    ] },
  { symbol: 'ə', category: 'vowel-short', examples: ['about', 'sofa', 'banana'],
    howTo: 'The most relaxed vowel in English (the "schwa") — the mouth barely moves, tongue central. Only appears in unstressed syllables.',
    spellings: [
      ['a', ['about', 'sofa', 'banana', 'camera', 'ago', 'again', 'away', 'alone', 'chocolate', 'around']],
      ['e', ['taken', 'problem', 'children']],
      ['or', ['doctor']],
      ['u', ['upon', 'support']],
      ['er', ['paper', 'river', 'water', 'teacher', 'letter', 'better']],
      ['our', ['colour']],
      ['o', ['common', 'method', 'today', 'tomorrow', 'police']],
      ['ou', ['famous']],
      ['i', ['possible']],
      ['ur', ['Saturday']],
    ],
    tip: 'Only ever in unstressed syllables — say it quick and weak, and never stress it.',
    sentences: [
      { text: 'A banana, an apple, and a bit of sugar were taken to the doctor\'s office upon arrival this morning.' },
      { text: 'The popular actor\'s mother borrowed a camera from another neighbor to photograph the opera about an hour ago.' },
      { text: 'The teacher\'s computer suggested a particular answer that seemed common to almost every other student in the classroom.' },
    ] },

  // ── Long vowels ──
  { symbol: 'iː', category: 'vowel-long', examples: ['see', 'tree', 'sheep'],
    howTo: 'Lips spread into a tight smile, tongue high and forward, held longer and tenser than /ɪ/.',
    spellings: [
      ['ee', ['see', 'tree', 'sheep', 'three', 'cheese', 'green', 'sleep', 'meet', 'street', 'week', 'feel', 'keep']],
      ['ea', ['please', 'eat', 'team', 'read', 'leave', 'speak', 'beach', 'seat', 'sea', 'teacher']],
      ['ie', ['believe', 'field', 'piece']],
      ['ei', ['receive']],
      ['e', ['these', 'evening', 'me', 'he', 'she', 'we']],
      ['i', ['machine', 'police', 'pizza', 'ski', 'magazine', 'unique']],
      ['ey', ['key']],
      ['eo', ['people']],
    ],
    tip: 'Hold it longer and smile more than /ɪ/ — "leave", not "live".',
    sentences: [
      { text: 'Pete\'s elite team sees three sweet, neat, green bees eat crisp treats in the breeze.' },
      { text: 'We need to clean the green kitchen, sweep beneath the sheets, and feed the sleepy sheep some wheat.' },
      { text: 'Each week, the eager teacher reads a brief speech to the sleepy children before the evening meal.' },
    ] },
  { symbol: 'ɜː', category: 'vowel-long', examples: ['bird', 'girl', 'learn'],
    howTo: 'Lips neutral, tongue mid-central, jaw slightly open — held long, like a British "er".',
    spellings: [
      ['er', ['herself', 'her', 'term', 'verb', 'person', 'perfect']],
      ['ir', ['bird', 'girl', 'first', 'shirt', 'dirty', 'third', 'circle']],
      ['ur', ['nurse', 'turn', 'church', 'hurt', 'burn', 'Thursday', 'purple']],
      ['ear', ['learn', 'early', 'heard', 'search', 'earth']],
      ['or', ['word', 'work', 'world', 'worse', 'worth']],
      ['our', ['journey']],
    ],
    tip: 'In British English there\'s no r — just a long, central vowel with relaxed lips.',
    sentences: [
      { text: 'The nervous nurse in the purple shirt worked her first early turn, learning new words she\'d heard on her journey.' },
      { text: 'On Thursday, the thirsty girl heard a bird chirping, then returned to her work with a curious, stirring urge to learn.' },
      { text: 'The stern professor\'s certain words disturbed the girl, but she stayed calm, turning her thirty-first journal page.' },
    ] },
  { symbol: 'ɑː', category: 'vowel-long', examples: ['car', 'father', 'class'],
    howTo: 'Mouth wide open, tongue low and back, lips relaxed — a long, open "ah".',
    spellings: [
      ['ar', ['car', 'park', 'dark', 'start', 'arm', 'art', 'star', 'farm', 'card', 'hard', 'garden', 'party', 'large']],
      ['a', ['father', 'class', 'fast', 'bath', 'glass', 'grass', 'ask', 'after', 'answer', 'castle', 'branch', 'tomato']],
      ['al', ['palm', 'half', 'calm']],
      ['au', ['laugh', 'aunt']],
      ['ear', ['heart']],
    ],
    tip: 'Open wide and pull the tongue back — longer and further back than /ʌ/.',
    sentences: [
      { text: 'Grandfather calmly parked the car in the large, dark garden, past the half-grown palm trees near the farm.' },
      { text: 'After the fast car dashed past, my aunt laughed heartily and asked the class to start the dance at last.' },
      { text: 'The dark-hearted master of the castle marched past the marble arch with his heart pounding hard and fast.' },
    ] },
  { symbol: 'ɔː', category: 'vowel-long', examples: ['door', 'saw', 'ball'],
    howTo: 'Lips rounded and pushed forward, tongue mid-back, jaw dropped — held long.',
    spellings: [
      ['or', ['more', 'sport', 'morning', 'horse', 'short', 'born', 'north']],
      ['oor', ['door', 'floor']],
      ['our', ['four', 'course']],
      ['aw', ['saw', 'law', 'draw', 'yawn']],
      ['au', ['daughter', 'caught', 'taught', 'August', 'autumn']],
      ['al', ['ball', 'walk', 'talk', 'small', 'call', 'tall', 'fall']],
      ['ough', ['thought', 'bought']],
      ['ar', ['warm']],
      ['a', ['water']],
    ],
    tip: 'Round the lips firmly and hold it — longer and higher than /ɒ/.',
    sentences: [
      { text: 'Before dawn, the tall lawyer walked across the hall, thoughtfully talking about the court\'s important morning report.' },
      { text: 'The small boy caught the ball, threw it toward the wall, and watched it fall onto the wooden floor.' },
      { text: 'All autumn morning, the tall horse galloped across the north lawn before pausing near the old wooden door.' },
    ] },
  { symbol: 'uː', category: 'vowel-long', examples: ['blue', 'food', 'moon'],
    howTo: 'Lips tightly rounded and pushed forward, tongue high and back, held long and tense.',
    spellings: [
      ['oo', ['food', 'moon', 'school', 'soon', 'room', 'cool', 'pool', 'tooth', 'choose', 'boot', 'spoon', 'noon', 'cartoon', 'balloon', 'kangaroo']],
      ['u', ['rule', 'June', 'flute']],
      ['ue', ['blue', 'true']],
      ['ew', ['new']],
      ['ui', ['juice', 'fruit', 'suit']],
      ['o', ['two', 'lose', 'move', 'whose']],
      ['ou', ['group', 'through']],
      ['oe', ['shoe']],
    ],
    tip: 'Push the lips into a tight round and hold — "pool", not "pull".',
    sentences: [
      { text: 'Sue tried on two smooth blue shoes and a cool new suit to wear to school this beautiful June afternoon.' },
      { text: 'The goose flew loose through the room, knocking a spoon and a blue balloon off the smooth wooden stool.' },
      { text: 'We chewed cool fruit soup and drank juice while the group of youths tuned their smooth blue guitars in June.' },
    ] },

  // ── Diphthongs — two vowels gliding together, named by their start -> end ──
  { symbol: 'eɪ', category: 'diphthong', examples: ['day', 'name', 'rain'],
    howTo: 'Starts at /e/ and glides up toward /ɪ/ — lips move from relaxed to slightly spread as you say it.',
    spellings: [
      ['a', ['name', 'face', 'table', 'same', 'late', 'game', 'paper', 'baby', 'change', 'plane', 'space', 'station', 'lady', 'cake', 'safe']],
      ['ai', ['rain', 'wait', 'train', 'straight', 'mail']],
      ['ay', ['day', 'play', 'say', 'way']],
      ['ey', ['they', 'grey']],
      ['ei', ['eight', 'weight', 'neighbour']],
      ['ea', ['break', 'great']],
    ],
    tip: 'Glide from /e/ up to /ɪ/ — a flat /e/ turns "late" into "let".',
    sentences: [
      { text: 'Kate and Jake baked a great cake, then placed it on a plate to wait for their favorite neighbors\' arrival that day.' },
      { text: 'On a rainy day, they gave the strange stray snake a plate of grapes and stayed to play a strange game.' },
      { text: 'The famous chef baked eight layered cakes, arranged them neatly on the table, and later gave a taste to every eager stranger.' },
    ] },
  { symbol: 'aɪ', category: 'diphthong', examples: ['my', 'time', 'light'],
    howTo: 'Starts open and low, glides up toward /ɪ/ — the jaw closes as the sound finishes.',
    spellings: [
      ['i', ['time', 'five', 'like', 'smile', 'ice', 'kind', 'mind', 'find', 'side', 'wide', 'ride', 'white', 'write', 'price', 'nice', 'child', 'island', 'quiet']],
      ['y', ['my', 'fly', 'by', 'sky', 'try', 'why']],
      ['igh', ['light', 'night', 'high', 'right']],
      ['ie', ['tie']],
      ['uy', ['buy']],
      ['eye', ['eye']],
    ],
    tip: 'Start with the jaw open, then glide up — a flat vowel turns "like" into "lack".',
    sentences: [
      { text: 'I like to ride my bike at twilight, admiring the bright white sky and the quiet, shining stars each night.' },
      { text: 'Five wild tigers quietly climbed the high, icy cliffside while the shy child tried to write a diary by firelight.' },
      { text: 'Why did the kind knight decide to fight beside his loyal tribe under the bright, shining midnight sky?' },
    ] },
  { symbol: 'ɔɪ', category: 'diphthong', examples: ['boy', 'coin', 'noise'],
    howTo: 'Starts rounded like /ɔː/, glides toward /ɪ/ — the lips unround as the tongue rises.',
    spellings: [
      ['oi', ['coin', 'noise', 'voice', 'join', 'point', 'choice', 'oil', 'boil', 'soil', 'spoil', 'coil', 'foil', 'avoid', 'poison', 'moist', 'joint', 'noisy', 'appoint', 'toilet']],
      ['oy', ['boy', 'toy', 'enjoy', 'royal', 'loyal', 'employ', 'annoy', 'destroy', 'voyage', 'oyster', 'boycott', 'cowboy']],
    ],
    tip: 'Start with rounded lips, then spread them as the tongue rises to /ɪ/.',
    sentences: [
      { text: 'The noisy boy joined his loyal friends to enjoy a royal feast, tossing coins and toys with pure joy.' },
      { text: 'A moist, oily coin spoiled the toy\'s paint, annoying the royal boy who was pointing and making noise.' },
      { text: 'Roy avoided the boiling oil, choosing instead to enjoy the noisy, joyful voices of the boys destroying their old toys.' },
    ] },
  { symbol: 'aʊ', category: 'diphthong', examples: ['now', 'house', 'town'],
    howTo: 'Starts open and low, glides toward /ʊ/ — the lips round as the sound closes.',
    spellings: [
      ['ou', ['house', 'mouth', 'sound', 'out', 'about', 'found', 'loud', 'count', 'mountain', 'round', 'ground', 'south', 'shout', 'cloud', 'proud', 'hour', 'our', 'account']],
      ['ow', ['now', 'town', 'cow', 'down', 'how', 'brown', 'crowd', 'flower', 'power', 'shower', 'tower', 'owl', 'allow']],
    ],
    tip: 'Open first, then round the lips — the closing /ʊ/ is what keeps "now" from sounding like "nah".',
    sentences: [
      { text: 'The proud brown cow wandered down the crowded town, mooing loudly about the round, gray clouds above the house.' },
      { text: 'How now, the loud clown shouted, bowing around the crowd and pounding the ground with a thousand proud sounds.' },
      { text: 'Our house was surrounded by a powerful shower of pounding rain, and the flowers drowned beneath the gray clouds outside.' },
    ] },
  { symbol: 'əʊ', category: 'diphthong', examples: ['go', 'home', 'boat'],
    howTo: 'Starts central (schwa), glides toward /ʊ/ — the lips round only at the end.',
    spellings: [
      ['o', ['go', 'home', 'no', 'phone', 'over', 'only', 'most', 'open', 'cold', 'gold', 'old', 'nose', 'close', 'joke', 'rope', 'bone', 'stone', 'alone', 'hello', 'potato']],
      ['oa', ['boat', 'road', 'coat', 'goat']],
      ['ow', ['know', 'slow', 'show', 'snow', 'below']],
      ['oe', ['toe']],
      ['ough', ['though']],
    ],
    tip: 'Start central and relaxed, then round — a pure /ɔː/ makes "low" sound like "law".',
    sentences: [
      { text: 'So, the old golden boat slowly rowed home over the cold, snowy coast, hoping to know the road ahead.' },
      { text: 'Only the bold coach chose to hold his post, though the whole roadside was closed and covered in slow, blowing snow.' },
      { text: 'Rosie slowly opened the old wooden window, hoping the golden sunshine would show over the frozen, snowy slopes below.' },
    ] },
  { symbol: 'ɪə', category: 'diphthong', examples: ['near', 'ear', 'here'],
    howTo: 'Starts at /ɪ/, glides toward schwa — common before "r" in non-rhotic British English.',
    spellings: [
      ['ear', ['near', 'ear', 'clear', 'year', 'appear', 'fear', 'dear', 'beard', 'tear', 'hear', 'gear']],
      ['eer', ['beer', 'deer', 'cheer', 'steer', 'career', 'engineer', 'volunteer']],
      ['ere', ['here']],
      ['ier', ['pier']],
      ['ea', ['idea', 'really']],
      ['ei', ['weird']],
      ['er', ['period', 'serious', 'hero', 'zero', 'experience', 'material', 'mysterious']],
      ['eo', ['theory']],
    ],
    tip: 'Glide from /ɪ/ to a weak /ə/ — two parts, and no r at the end in British English.',
    sentences: [
      { text: 'My dear career as an engineer began here, near the pier, where I first appeared with sincere fear and cheer.' },
      { text: 'It\'s clear that every year, weird deer appear near here, disappearing into the eerie atmosphere without any real fear.' },
      { text: 'The sincere volunteer cheered loudly, steering clear of the weird, gloomy atmosphere near the pier this dreary year.' },
    ] },
  { symbol: 'eə', category: 'diphthong', examples: ['hair', 'chair', 'care'],
    howTo: 'Starts at /e/, glides toward schwa — the jaw opens slightly as it fades.',
    spellings: [
      ['air', ['hair', 'chair', 'fair', 'stairs', 'airport', 'pair', 'repair', 'upstairs', 'dairy', 'fairy', 'millionaire']],
      ['are', ['care', 'square', 'rare', 'share', 'scare', 'dare', 'stare', 'aware', 'prepare', 'compare', 'parent', 'careful']],
      ['ear', ['bear', 'wear', 'pear']],
      ['ere', ['where', 'there', 'wherever']],
      ['eir', ['their']],
      ['ar', ['various']],
    ],
    tip: 'Start at /e/ and relax toward /ə/ — no strong r at the end.',
    sentences: [
      { text: 'Claire carefully compared a rare pair of chairs upstairs, unaware that a bear was staring from the doorway downstairs.' },
      { text: 'Wherever we travel by air, we take great care to share fair prices and prepare spare pairs of hairbrushes.' },
      { text: 'The parents stared in despair, aware that their careless daughter had left her fair share of scary chairs bare and unrepaired.' },
    ] },
  { symbol: 'ʊə', category: 'diphthong', examples: ['pure', 'tour', 'sure'],
    howTo: 'Starts at /ʊ/, glides toward schwa — increasingly rare in modern speech, often replaced by /ɔː/, so genuine examples are thin on the ground.',
    spellings: [
      ['ure', ['pure', 'sure', 'cure', 'endure', 'mature', 'secure', 'obscure', 'ensure', 'insure', 'assure', 'lure', 'manure', 'brochure']],
      ['our', ['tour', 'tourist']],
      ['ur', ['during', 'jury', 'curious', 'furious', 'fury', 'rural', 'plural', 'mural', 'security']],
      ['oor', ['moor', 'poor']],
      ['eu', ['Europe', 'euro']],
    ],
    tip: 'Rare in modern British English — many speakers say /ɔː/ in "poor" and "sure". Both are fine.',
    sentences: [
      { text: 'During the tour, the jury seemed sure a pure, secure cure existed, though nobody could truly endure the tourists\' curious questions.' },
      { text: 'Are you sure the tour guide can endure such a long, obscure journey through the moor during a storm?' },
    ] },

  // ── Consonants ──
  { symbol: 'p', category: 'consonant', examples: ['pen', 'map', 'apple'],
    howTo: 'Lips press together, then release with a puff of air — voiceless, no vibration in the throat.',
    spellings: [
      ['p', ['pen', 'map', 'park', 'stop', 'paper', 'play', 'sleep', 'up', 'pig', 'put', 'pass', 'page', 'pay', 'pull', 'open', 'cup', 'top', 'ship', 'jump', 'help', 'deep', 'keep', 'carpet', 'price', 'spoon']],
      ['pp', ['apple', 'pepper', 'happy', 'happen', 'shopping', 'puppy']],
    ],
    tip: 'At the start of a stressed word, add a puff of air — without it "pen" sounds like "Ben".',
    sentences: [
      { text: 'Peter\'s purple puppy hopped up the steep path, popping open a paper bag of crispy pepper crisps.' },
      { text: 'A plump pig napped peacefully in the purple pumpkin patch, hoping to escape the playful puppies\' quick pounce.' },
      { text: 'Please help pack the purple picnic supplies properly before the happy people appear at the park entrance.' },
    ] },
  { symbol: 'b', category: 'consonant', examples: ['bad', 'cab', 'table'],
    howTo: 'Lips press together, then release — same spot as /p/ but with the vocal cords vibrating (voiced).',
    spellings: [
      ['b', ['bad', 'cab', 'table', 'boy', 'robot', 'club', 'baby', 'bed', 'big', 'ball', 'book', 'boat', 'bus', 'bird', 'banana', 'about', 'number', 'neighbour', 'job', 'rob', 'tub', 'web', 'globe', 'grab', 'crab', 'describe']],
      ['bb', ['rabbit', 'bubble', 'hobby']],
    ],
    tip: 'Voice it from the start, with no puff of air. Silent after m: "climb", "comb".',
    sentences: [
      { text: 'Bobby\'s baby rabbit nibbled a big, bubbly cabbage before bouncing back into its cozy, wobbly basket.' },
      { text: 'The clumsy robber grabbed a bag of ribbons, but stumbled badly and tumbled into a bubbling barrel of blueberries.' },
      { text: 'A brave boy built a wobbly table from bamboo, then blew bubbles beside his baby brother by the barn.' },
    ] },
  { symbol: 't', category: 'consonant', examples: ['ten', 'sit', 'better'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases with a puff of air — voiceless.',
    spellings: [
      ['t', ['ten', 'sit', 'top', 'cat', 'tent', 'water', 'night', 'invite', 'tea', 'take', 'talk', 'time', 'tree', 'two', 'tall', 'today', 'hotel', 'eight', 'meet', 'coat', 'fat', 'foot', 'hat', 'street', 'student', 'sometimes', 'tomato']],
      ['tt', ['better', 'letter', 'little', 'butter']],
      ['ed', ['walked', 'stopped', 'laughed', 'watched', 'kissed']],
    ],
    tip: 'Tip on the gum ridge, not the teeth, with a puff of air at the start of a stressed word.',
    sentences: [
      { text: 'Tom\'s tiny kitten tiptoed toward the tall table, tasting the tomato tart before tipping the teapot over.' },
      { text: 'Twenty tired tourists tried to catch the twelve-thirty train, but the ticket counter was totally shut until eight.' },
      { text: 'The little waiter carefully set out ten plates, twenty forks, and a pot of hot tea for the guests tonight.' },
    ] },
  { symbol: 'd', category: 'consonant', examples: ['dog', 'red', 'ladder'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases — same spot as /t/ but voiced.',
    spellings: [
      ['d', ['dog', 'red', 'day', 'bed', 'dad', 'road', 'body', 'good', 'door', 'desk', 'down', 'dance', 'dinner', 'doctor', 'did', 'idea', 'garden', 'window', 'Sunday', 'hand', 'food', 'bread', 'side', 'old', 'cold', 'kind']],
      ['dd', ['ladder', 'middle']],
      ['ed', ['played', 'lived', 'called', 'cleaned', 'opened']],
    ],
    tip: 'Keep the voice on at the end of a word — "bed", not "bet".',
    sentences: [
      { text: 'Dad dashed down the dusty road, dodging a wandering dog before deciding to head toward the wooden garden shed.' },
      { text: 'David decided to drag the wooden ladder down the driveway, dropping muddy dust beside the darkened old shed doorway.' },
      { text: 'The wide-eyed toddler waddled toward the sudden puddle, giggling as muddy droplets dripped down her rounded, dimpled cheeks.' },
    ] },
  { symbol: 'k', category: 'consonant', examples: ['cat', 'sick', 'kitchen'],
    howTo: 'The back of the tongue touches the soft palate, then releases with a puff of air — voiceless.',
    spellings: [
      ['c', ['cat', 'cookie', 'cake', 'cold', 'car', 'cup', 'cook', 'coffee']],
      ['k', ['key', 'milk', 'week', 'kite', 'king', 'book', 'look', 'park', 'take', 'walk', 'bike', 'monkey']],
      ['ck', ['sick', 'back', 'kick', 'black', 'pocket', 'chicken', 'clock']],
      ['ch', ['kitchen', 'school', 'chemistry']],
      ['qu', ['quick']],
    ],
    tip: 'A puff of air at the start of a stressed word. Silent before n: "knee", "know".',
    sentences: [
      { text: 'The quick brown cat crept back into the kitchen, cracking a cookie and knocking the clock off the counter.' },
      { text: 'Uncle Jack cooked crispy chicken and corn cakes in the kitchen while cracking jokes about the crooked, clanking clock.' },
      { text: 'A clumsy duck quacked and kicked a rocket-shaped kite across the cracked concrete, knocking over a stack of coconuts.' },
    ] },
  { symbol: 'g', category: 'consonant', examples: ['go', 'big', 'garden'],
    howTo: 'The back of the tongue touches the soft palate, then releases — same spot as /k/ but voiced.',
    spellings: [
      ['g', ['go', 'big', 'garden', 'get', 'bag', 'dog', 'game', 'ago', 'gas', 'girl', 'give', 'gold', 'goose', 'good', 'gift', 'again', 'begin', 'tiger', 'finger', 'sugar', 'hug', 'leg', 'flag', 'frog']],
      ['gg', ['giggle', 'egg', 'bigger']],
      ['gu', ['guest', 'guitar', 'dialogue']],
      ['gh', ['ghost']],
    ],
    tip: 'Keep the voice on at the end of a word — "bag", not "back".',
    sentences: [
      { text: 'The eager guest grabbed a big bag of grapes, giggling as the goofy dog dug through the garden gate.' },
      { text: 'A gigantic golden dragon galloped through the green garden, guarding a glowing golden egg beside the grassy gate.' },
      { text: 'Greg dragged a heavy wagon full of goats, luggage, and gadgets, grumbling and giggling all the way to the garage.' },
    ] },
  { symbol: 'f', category: 'consonant', examples: ['fan', 'leaf', 'coffee'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through the gap — voiceless.',
    spellings: [
      ['f', ['fan', 'leaf', 'fun', 'life', 'half', 'family', 'face', 'fast', 'feet', 'fire', 'fish', 'five', 'food', 'foot', 'four', 'friend', 'after', 'safety', 'knife', 'chef', 'beef']],
      ['ff', ['coffee', 'offer']],
      ['ph', ['phone', 'photo', 'elephant']],
      ['gh', ['laugh', 'enough', 'cough']],
    ],
    tip: 'Top teeth on the lower lip — use both lips and it slides toward /p/.',
    sentences: [
      { text: 'Fred\'s five fluffy elephants fed on fresh figs and fluffy flowers before falling asleep near the forest fence.' },
      { text: 'The forgetful farmer fried fifty fish for his family, laughing at how fast the fluffy flames flared.' },
      { text: 'Fiona found it funny that the office phone kept ringing off before anyone could finish their morning coffee.' },
    ] },
  { symbol: 'v', category: 'consonant', examples: ['van', 'love', 'seven'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through — same as /f/ but voiced, felt as a buzz on the lip.',
    spellings: [
      ['v', ['van', 'love', 'seven', 'very', 'live', 'view', 'give', 'travel', 'movie', 'vase', 'vest', 'voice', 'visit', 'village', 'vegetable', 'video', 'violin', 'never', 'river', 'over', 'every', 'eleven', 'heavy', 'five', 'have', 'glove', 'move', 'wave']],
      ['f', ['of']],
      ['ph', ['Stephen']],
    ],
    tip: 'Like /f/ with a buzz. Don\'t round the lips, or it becomes /w/ ("vest" vs "west").',
    sentences: [
      { text: 'Vera\'s seven brave divers eagerly dived into the river, waving at every vehicle driving past the village.' },
      { text: 'The heavy driver never gave up, saving every valuable, velvet-covered vase from the vibrating delivery van.' },
      { text: 'Olivia loves traveling to visit her favorite village every seven or eleven evenings during the summer, driving her old silver van.' },
    ] },
  { symbol: 'θ', category: 'consonant', examples: ['think', 'bath', 'three'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — voiceless, as in "think".',
    spellings: [
      ['th', ['think', 'bath', 'three', 'thumb', 'tooth', 'birthday', 'math', 'nothing', 'thick', 'throw', 'mouth', 'thank', 'thing', 'thin', 'thirty', 'thousand', 'Thursday', 'theatre', 'theory', 'thought', 'throat', 'author', 'healthy', 'method', 'everything', 'anything', 'earth', 'both', 'month', 'north', 'health']],
    ],
    tip: 'Tongue tip between the teeth, then blow — not /s/ ("think" → "sink") or /t/ ("tree" for "three").',
    sentences: [
      { text: 'Beth thought the thick, thorny thistle beneath the bathtub was something worth thanking her healthy, athletic brother for.' },
      { text: 'The three thirsty thieves thought nothing of throwing thirty thin, toothless fish through the theater\'s south entrance.' },
      { text: 'On her birthday, Ruth thanked both her mother and father for the healthy, thoughtful gift they thoughtfully threw together with strength and faith.' },
    ] },
  { symbol: 'ð', category: 'consonant', examples: ['this', 'mother', 'weather'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — same spot as /θ/ but voiced, as in "this".',
    spellings: [
      ['th', ['this', 'mother', 'weather', 'that', 'brother', 'smooth', 'the', 'father', 'other', 'there', 'they', 'then', 'them', 'these', 'those', 'though', 'than', 'their', 'without', 'together', 'rather', 'either', 'neither', 'clothes', 'breathe', 'bathe', 'with', 'gather', 'northern']],
    ],
    tip: 'The same tongue as /θ/, with voice — not /d/ ("they" → "day") or /z/.',
    sentences: [
      { text: 'This weather bothers my mother and father, though they\'d rather gather together beneath the smooth, southern trees.' },
      { text: 'Either my brother or my other neighbor will smoothly clothe themselves in leather before gathering with the others outside.' },
      { text: 'Rather than bother with those feathers, they breathed together, soothing each other with soft, worthy, brotherly words.' },
    ] },
  { symbol: 's', category: 'consonant', examples: ['sun', 'bus', 'city'],
    howTo: 'Tongue tip near the ridge behind the teeth, a narrow channel hisses air out — voiceless.',
    spellings: [
      ['s', ['sun', 'bus', 'see', 'listen', 'sister', 'sound', 'sad', 'seven', 'sing', 'snake', 'small', 'smile', 'star', 'inside', 'person', 'answer', 'horse', 'mouse', 'house', 'cats', 'books']],
      ['ss', ['class', 'glass', 'kiss']],
      ['c', ['city', 'nice', 'face', 'rice', 'cinema', 'centre']],
      ['sc', ['science']],
      ['z', ['waltz', 'quartz']],
    ],
    tip: 'A thin, sharp hiss with the tongue behind the top teeth — not between them.',
    sentences: [
      { text: 'Sam\'s sister Sally sipped sour lemonade beside the sunny seaside in the soft summer sunshine.' },
      { text: 'Six sleepy snails slowly slid across the silver street, searching for a small, safe space to rest.' },
      { text: 'The scientist carefully observed the silent stars, noticing a strange, sparkling substance spreading slowly across the surface.' },
    ] },
  { symbol: 'z', category: 'consonant', examples: ['zoo', 'buzz', 'lazy'],
    howTo: 'Same tongue position as /s/ — but voiced, felt as a buzz.',
    spellings: [
      ['z', ['zoo', 'lazy', 'zip', 'zero', 'zone', 'zebra', 'lizard', 'dozen', 'size', 'prize', 'freeze', 'amazing']],
      ['zz', ['buzz', 'puzzle']],
      ['s', ['easy', 'music', 'busy', 'these', 'cousin', 'reason', 'season', 'present', 'nose', 'rose', 'cheese', 'those', 'was', 'has', 'eyes', 'dogs', 'days']],
      ['ss', ['scissors', 'possess', 'dessert', 'dissolve']],
    ],
    tip: 'Keep the buzz going to the very end — a final /z/ often slips into /s/ ("eyes" vs "ice").',
    sentences: [
      { text: 'The lazy zebra zigzagged dizzily across the hazy zoo, buzzing bees chasing its fuzzy nose as visitors watched.' },
      { text: 'Zoe\'s cousins always chose easy, breezy music, closing their eyes and singing as the busy zoo buzzed nearby.' },
      { text: 'Business was surprisingly busy at the bazaar, where dozens of customers browsed rows of shiny, dazzling prizes and jewelry.' },
    ] },
  { symbol: 'ʃ', category: 'consonant', examples: ['she', 'wash', 'sugar'],
    howTo: 'Tongue pulled back a little further than /s/, lips slightly rounded — voiceless "sh".',
    spellings: [
      ['sh', ['she', 'wash', 'shop', 'wish', 'shoe', 'fish', 'shape', 'share', 'sheep', 'shirt', 'short', 'should', 'show', 'shower', 'sharp', 'shadow', 'cash', 'push', 'brush', 'fresh']],
      ['ti', ['nation', 'station', 'information']],
      ['ci', ['special', 'delicious']],
      ['ch', ['machine', 'chef', 'chalet', 'brochure', 'parachute', 'moustache']],
      ['ss', ['mission']],
      ['s', ['sugar', 'sure']],
      ['ce', ['ocean']],
    ],
    tip: 'Round the lips a little and pull the tongue back — flatter and further forward gives /s/ ("she" vs "see").',
    sentences: [
      { text: 'She wished to shop for a shiny seashell and a fresh fish dish at the seaside shore this sunshine-filled afternoon.' },
      { text: 'The ambitious, fashionable chef prepared a delicious dish of fresh shrimp, sharing his special recipe with the anxious, patient guests.' },
      { text: 'The shy fisherman pushed his wooden ship toward the shore, wishing for a smooth, official passage through the shallow ocean.' },
    ] },
  { symbol: 'ʒ', category: 'consonant', examples: ['vision', 'treasure', 'usual'],
    howTo: 'Same tongue position as /ʃ/ — but voiced. Rare in English, and almost never at the start of a word.',
    spellings: [
      ['s', ['vision', 'treasure', 'usual', 'pleasure', 'measure', 'decision', 'casual', 'television', 'occasion', 'leisure', 'explosion', 'confusion', 'conclusion', 'invasion', 'division', 'revision', 'illusion', 'usually', 'visual', 'closure', 'exposure', 'Asia', 'precision']],
      ['g', ['garage', 'beige', 'genre', 'massage', 'collage', 'mirage', 'camouflage', 'prestige']],
      ['z', ['azure']],
    ],
    tip: 'Like /ʃ/ with voice. It almost never starts an English word.',
    sentences: [
      { text: 'With great pleasure, the television host revealed his casual decision to measure the usual leisurely treasure collection.' },
      { text: 'The sudden explosion caused confusion and a strange illusion of visual invasion, leading to an unexpected division of opinion.' },
    ] },
  { symbol: 'h', category: 'consonant', examples: ['hat', 'house', 'ahead'],
    howTo: 'A light puff of breath from the throat, with no contact between tongue and mouth — voiceless.',
    spellings: [
      ['h', ['hat', 'house', 'ahead', 'hello', 'home', 'behind', 'hope', 'happy', 'help', 'hand', 'hair', 'half', 'hall', 'hard', 'have', 'head', 'hear', 'heart', 'heavy', 'high', 'hill', 'holiday', 'horse', 'hot', 'hungry', 'hurry', 'behave', 'perhaps', 'rehearse']],
      ['wh', ['who', 'whole']],
    ],
    tip: 'Just breath from the throat, with no scrape. Silent in "hour", "honest" and "honour".',
    sentences: [
      { text: 'Harry happily hurried home, hoping his husband had hidden a huge, healthy ham behind the hallway heater.' },
      { text: 'The hungry hero hiked up the hilly highway, hunting for a hidden hut where he hoped to find his horse.' },
      { text: 'Helen\'s happy hound hopped onto the high hammock, howling heartily whenever her husband hummed a hopeful little hymn.' },
    ] },
  { symbol: 'tʃ', category: 'consonant', examples: ['chair', 'watch', 'teacher'],
    howTo: 'A /t/ released straight into /ʃ/ in one quick motion — voiceless, as in "church".',
    spellings: [
      ['ch', ['chair', 'teacher', 'church', 'cheese', 'much', 'teach', 'cheap', 'check', 'chess', 'chicken', 'child', 'chin', 'chips', 'choose', 'chocolate', 'lunch', 'beach', 'bench', 'French', 'rich', 'peach', 'sandwich']],
      ['tch', ['watch', 'catch', 'kitchen', 'match']],
      ['t', ['picture', 'future', 'nature', 'adventure']],
      ['ti', ['question', 'suggestion', 'digestion']],
    ],
    tip: 'Start with a full stop, then release into /ʃ/ — "watch", not "wash".',
    sentences: [
      { text: 'The cheerful teacher watched each child chew their cheese sandwich, checking their charts before the chemistry lecture.' },
      { text: 'Charlie chased the mischievous chicken across the orchard, chuckling as it charged toward the kitchen chimney with a chunk of cheese.' },
      { text: 'A cheerful coach cheered as the champion\'s team charged toward the beach, chasing the ball to reach the final match.' },
    ] },
  { symbol: 'dʒ', category: 'consonant', examples: ['jump', 'bridge', 'danger'],
    howTo: 'A /d/ released straight into /ʒ/ in one quick motion — voiced, as in "judge".',
    spellings: [
      ['j', ['jump', 'enjoy', 'jacket', 'jam', 'January', 'jeans', 'job', 'joke', 'journey', 'juice', 'July', 'June', 'jungle', 'just']],
      ['g', ['danger', 'giant', 'gym', 'magic', 'general', 'gentle', 'giraffe', 'engine']],
      ['dge', ['bridge', 'judge']],
      ['ge', ['age', 'large', 'orange', 'page', 'village', 'change']],
      ['di', ['soldier']],
    ],
    tip: 'A full stop then a buzz, like /tʃ/ with voice — not /j/ ("jet" vs "yet").',
    sentences: [
      { text: 'The giant, gentle giraffe jumped joyfully across the jungle bridge, enjoying a juicy orange and a large ginger jellybean.' },
      { text: 'The courageous village judge managed to arrange an urgent journey, imagining the danger of the strange, damaged bridge ahead.' },
      { text: 'Gemma juggled oranges and ginger biscuits in the gym, joking with her genius roommate about the huge budget for the college pageant.' },
    ] },
  { symbol: 'm', category: 'consonant', examples: ['man', 'summer', 'drum'],
    howTo: 'Lips press together, air hums out through the nose — voiced.',
    spellings: [
      ['m', ['man', 'drum', 'mum', 'animal', 'moon', 'family', 'time', 'room', 'make', 'meat', 'milk', 'money', 'month', 'mouse', 'mountain', 'music', 'lamp', 'smile', 'camera', 'lemon', 'woman', 'home', 'game', 'swim', 'warm']],
      ['mm', ['summer', 'hammer']],
      ['mb', ['comb', 'climb']],
    ],
    tip: 'Close the lips fully and hum through the nose.',
    sentences: [
      { text: 'My mother made a marvelous meal for the whole family, mixing mushrooms, mashed lemon, and creamy tomato soup at home.' },
      { text: 'The mysterious monkey munched on a mountain of mixed melons, making a mess in the moonlit museum garden this morning.' },
      { text: 'Emma\'s grandma remembered summer mornings swimming in the calm mountain stream, humming a mellow melody with her old friends.' },
    ] },
  { symbol: 'n', category: 'consonant', examples: ['no', 'sun', 'dinner'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air hums out through the nose — voiced.',
    spellings: [
      ['n', ['no', 'sun', 'nine', 'banana', 'name', 'window', 'morning', 'run', 'nose', 'net', 'new', 'near', 'night', 'never', 'number', 'nurse', 'money', 'any', 'rain', 'green', 'train', 'phone', 'ten', 'open']],
      ['nn', ['dinner', 'funny']],
      ['kn', ['know', 'knee', 'knife']],
      ['ng', ['danger', 'change', 'strange', 'angel']],
    ],
    tip: 'Tip on the gum ridge, air through the nose — don\'t drop it at the end of a word.',
    sentences: [
      { text: 'Nine funny kittens ran across the sunny garden, chasing a shiny green banana under the wooden window at noon.' },
      { text: 'Nancy\'s neighbor never noticed the ninety noisy geese wandering near the narrow tunnel beneath the northern mountain station.' },
      { text: 'In the evening, nine nervous nurses gently nursed newborn puppies near the sunny corner of the animal nursery.' },
    ] },
  { symbol: 'ŋ', category: 'consonant', examples: ['sing', 'king', 'morning'],
    howTo: 'Back of the tongue touches the soft palate, air hums out through the nose — never appears at the start of an English word.',
    spellings: [
      ['ng', ['sing', 'king', 'morning', 'thing', 'long', 'singer', 'tongue', 'young', 'english', 'ring', 'song', 'wing', 'swing', 'strong', 'wrong', 'hungry', 'finger', 'angry', 'lung', 'bring', 'spring', 'evening', 'building']],
      ['n', ['bank', 'think', 'uncle', 'monkey', 'pink', 'drink', 'ink', 'thank']],
    ],
    tip: 'Back of the tongue up, tip down — in "sing", don\'t add a hard /g/ at the end.',
    sentences: [
      { text: 'Every morning, the young singer sang a long, ringing song while swinging happily along the strong, winding riverbank.' },
      { text: 'The angry king brought his hungry, growling dragon along, watching it swing its tongue and sing a strange, booming song.' },
      { text: 'During the opening evening meeting, everyone kept talking, thinking, and bringing exciting things about the upcoming spring gathering.' },
    ] },
  { symbol: 'l', category: 'consonant', examples: ['leg', 'ball', 'yellow'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air flows around the sides of the tongue — voiced.',
    spellings: [
      ['l', ['leg', 'love', 'apple', 'light', 'people', 'lake', 'lamp', 'last', 'late', 'leaf', 'learn', 'letter', 'lion', 'look', 'lunch', 'black', 'blue', 'glass', 'family', 'school', 'milk', 'smile', 'table']],
      ['ll', ['ball', 'yellow', 'tell', 'well', 'hello', 'hill']],
    ],
    tip: 'Tip on the gum ridge; at the end of a word ("ball") the back of the tongue rises too — the "dark l".',
    sentences: [
      { text: 'Little Lily loves to play alone, lazily collecting yellow leaves and lovely purple apples along the quiet local lane.' },
      { text: 'The lonely lion slowly limped along the long, lifeless valley, hoping to locate a lively little village nearby.' },
      { text: 'Lily\'s simple little library holds millions of colorful, lovely legends about lonely lands full of magical light.' },
    ] },
  { symbol: 'r', category: 'consonant', examples: ['red', 'carry', 'sorry'],
    howTo: 'Tongue curls back slightly without touching the roof of the mouth — voiced, no trill in English.',
    spellings: [
      ['r', ['red', 'run', 'very', 'road', 'right', 'green', 'story', 'rabbit', 'rain', 'read', 'ready', 'rice', 'ring', 'river', 'rock', 'rose', 'round', 'bread', 'bring', 'dress', 'friend', 'tree', 'around']],
      ['rr', ['carry', 'sorry', 'arrive', 'tomorrow']],
      ['wr', ['write', 'wrong']],
    ],
    tip: 'Curl the tip back without touching anything. In British English it\'s silent unless a vowel follows: "car" vs "carry".',
    sentences: [
      { text: 'Rory carried a rusty red umbrella through the roaring rainstorm, hurrying toward the river before the road grew rough.' },
      { text: 'The rich farmer\'s rooster roamed around the rural garden, waking everyone with a horribly loud, terrifying roar each morning.' },
      { text: 'Rita worried that her horrible story about the rare, mysterious river creature would frighten everyone at the reunion.' },
    ] },
  { symbol: 'j', category: 'consonant', examples: ['yes', 'yellow', 'use'],
    howTo: 'Tongue high and forward like /iː/, then glides quickly into the next vowel — voiced, as in "yes".',
    spellings: [
      ['y', ['yes', 'yellow', 'you', 'year', 'university', 'yesterday', 'yard', 'yawn', 'yell', 'yoga', 'yogurt', 'young', 'youth', 'your', 'yet', 'yolk', 'beyond']],
      ['u', ['use', 'music', 'unit', 'usual', 'union', 'cute', 'huge', 'menu']],
      ['ew', ['few', 'view']],
      ['i', ['onion', 'opinion']],
    ],
    tip: 'A quick glide from an /iː/ position — not /dʒ/ ("yet" vs "jet").',
    sentences: [
      { text: 'Yesterday, a young university student used a unique, yellow unicycle to view the beautiful yard full of yellow tulips.' },
      { text: 'You yelled at the yellow-uniformed youth for using useless yarn instead of the usual, valuable music equipment.' },
      { text: 'Few young musicians argued over the unique value of the university\'s beautiful, unusual yearly music festival.' },
    ] },
  { symbol: 'w', category: 'consonant', examples: ['wet', 'away', 'swim'],
    howTo: 'Lips round tightly like /uː/, then glide quickly into the next vowel — voiced, as in "wet".',
    spellings: [
      ['w', ['wet', 'away', 'swim', 'window', 'sweet', 'work', 'west', 'always', 'twenty', 'wait', 'walk', 'wall', 'warm', 'wash', 'watch', 'water', 'way', 'wear', 'week', 'will', 'win', 'wind', 'wing', 'woman', 'word', 'between']],
      ['wh', ['white']],
      ['u', ['quick', 'language', 'queen']],
      ['o', ['one', 'once']],
    ],
    tip: 'Round the lips tightly, then open — the top teeth never touch the lip, or it becomes /v/.',
    sentences: [
      { text: 'We watched the wild white whale swim away, wondering why the water was so warm and wonderfully wavy this weekend.' },
      { text: 'William wisely waited by the window, watching the winter wind whistle while wearing a warm, woolen sweater and wool socks.' },
      { text: 'Wendy wondered whether the wealthy woman would welcome her wonderful, well-written wedding invitation this coming week.' },
    ] },
];

export interface MinimalPair {
  a: { symbol: string; word: string };
  b: { symbol: string; word: string };
  /** More word pairs for the same contrast, each `[a's word, b's word]` —
   *  shown under the comparison so the difference is heard in several
   *  words, not just the one headline pair. */
  more: [a: string, b: string][];
}

// Classic minimal pairs for the listening exercise — two words that differ
// by exactly the one sound being contrasted, so hearing them apart is a
// direct test of that contrast. Covers a mix of commonly-confused vowel and
// consonant pairs, not every symbol above.
export const MINIMAL_PAIRS: MinimalPair[] = [
  { a: { symbol: 'iː', word: 'sheep' }, b: { symbol: 'ɪ', word: 'ship' },
    more: [['leave', 'live'], ['feel', 'fill'], ['seat', 'sit'], ['heel', 'hill'], ['beat', 'bit'], ['eat', 'it'], ['green', 'grin'], ['sleep', 'slip']] },
  { a: { symbol: 'e', word: 'pen' }, b: { symbol: 'æ', word: 'pan' },
    more: [['bed', 'bad'], ['men', 'man'], ['said', 'sad'], ['met', 'mat'], ['head', 'had'], ['bet', 'bat'], ['send', 'sand'], ['beg', 'bag']] },
  { a: { symbol: 'æ', word: 'cat' }, b: { symbol: 'ʌ', word: 'cut' },
    more: [['cap', 'cup'], ['hat', 'hut'], ['bag', 'bug'], ['ran', 'run'], ['match', 'much'], ['bat', 'but'], ['fan', 'fun'], ['ankle', 'uncle']] },
  { a: { symbol: 'ɒ', word: 'cot' }, b: { symbol: 'ɔː', word: 'caught' },
    more: [['pot', 'port'], ['spot', 'sport'], ['shot', 'short'], ['cod', 'cord'], ['don', 'dawn'], ['stock', 'stalk'], ['wok', 'walk']] },
  { a: { symbol: 'ʊ', word: 'full' }, b: { symbol: 'uː', word: 'fool' },
    more: [['pull', 'pool'], ['look', 'Luke'], ['should', 'shooed'], ['wood', 'wooed'], ['soot', 'suit']] },
  { a: { symbol: 'p', word: 'pat' }, b: { symbol: 'b', word: 'bat' },
    more: [['pea', 'bee'], ['cap', 'cab'], ['rope', 'robe'], ['pie', 'buy'], ['pig', 'big'], ['pull', 'bull'], ['pear', 'bear'], ['mop', 'mob']] },
  { a: { symbol: 't', word: 'town' }, b: { symbol: 'd', word: 'down' },
    more: [['tie', 'die'], ['ten', 'den'], ['tear', 'dear'], ['bet', 'bed'], ['cart', 'card'], ['write', 'ride'], ['train', 'drain'], ['try', 'dry']] },
  { a: { symbol: 'k', word: 'coat' }, b: { symbol: 'g', word: 'goat' },
    more: [['cold', 'gold'], ['back', 'bag'], ['curl', 'girl'], ['class', 'glass'], ['came', 'game'], ['lock', 'log'], ['pick', 'pig'], ['crow', 'grow']] },
  { a: { symbol: 'f', word: 'fan' }, b: { symbol: 'v', word: 'van' },
    more: [['fine', 'vine'], ['ferry', 'very'], ['leaf', 'leave'], ['safe', 'save'], ['fail', 'veil'], ['proof', 'prove'], ['fast', 'vast']] },
  { a: { symbol: 'θ', word: 'teeth' }, b: { symbol: 'ð', word: 'teethe' },
    more: [['thigh', 'thy'], ['ether', 'either'], ['wreath', 'wreathe'], ['loath', 'loathe'], ['sheath', 'sheathe']] },
  { a: { symbol: 's', word: 'sip' }, b: { symbol: 'z', word: 'zip' },
    more: [['sue', 'zoo'], ['bus', 'buzz'], ['rice', 'rise'], ['place', 'plays'], ['price', 'prize'], ['ice', 'eyes'], ['face', 'phase'], ['loose', 'lose']] },
  { a: { symbol: 'ʃ', word: 'share' }, b: { symbol: 'tʃ', word: 'chair' },
    more: [['ship', 'chip'], ['shoes', 'choose'], ['wash', 'watch'], ['cash', 'catch'], ['sheep', 'cheap'], ['shop', 'chop'], ['wish', 'witch']] },
  { a: { symbol: 'l', word: 'light' }, b: { symbol: 'r', word: 'right' },
    more: [['lead', 'read'], ['glass', 'grass'], ['fly', 'fry'], ['long', 'wrong'], ['collect', 'correct'], ['lock', 'rock'], ['play', 'pray'], ['cloud', 'crowd']] },
  { a: { symbol: 'n', word: 'sin' }, b: { symbol: 'ŋ', word: 'sing' },
    more: [['thin', 'thing'], ['ban', 'bang'], ['ran', 'rang'], ['win', 'wing'], ['kin', 'king'], ['sun', 'sung'], ['ton', 'tongue'], ['run', 'rung']] },
  { a: { symbol: 'dʒ', word: 'jet' }, b: { symbol: 'j', word: 'yet' },
    more: [['jaw', 'your'], ['jam', 'yam'], ['Jess', 'yes'], ['joke', 'yolk'], ['jeer', 'year'], ['jello', 'yellow']] },
  { a: { symbol: 'v', word: 'vest' }, b: { symbol: 'w', word: 'west' },
    more: [['vine', 'wine'], ['veil', 'whale'], ['vet', 'wet'], ['verse', 'worse'], ['viper', 'wiper'], ['vow', 'wow'], ['vent', 'went']] },
];

/** Every pair that exercises a given symbol — feeds the detail page's
 *  "Practice this sound" link, which narrows Practice mode to just these. */
export function pairsForSymbol(symbol: string): MinimalPair[] {
  return MINIMAL_PAIRS.filter((p) => p.a.symbol === symbol || p.b.symbol === symbol);
}

export interface IpaSentenceRound {
  symbol: string;
  sentence: IpaSentence;
}

/** Every sentence across the given symbols, flattened — feeds the
 *  sentence-practice pool. An empty list means no focus: every sound's
 *  sentences are fair game, same convention as `pairsForSymbol`'s callers
 *  falling back to the full `MINIMAL_PAIRS` list. */
export function sentencesForSymbols(symbols: string[]): IpaSentenceRound[] {
  const sounds = symbols.length > 0 ? IPA_SOUNDS.filter((s) => symbols.includes(s.symbol)) : IPA_SOUNDS;
  return sounds.flatMap((s) => s.sentences.map((sentence) => ({ symbol: s.symbol, sentence })));
}

// No curated video ID here — a wrong/dead link would be worse than a search.
// A YouTube search for the symbol reliably surfaces real pronunciation guides.
export function youtubeSearchUrl(symbol: string): string {
  const query = `how to pronounce IPA ${symbol} sound English`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
