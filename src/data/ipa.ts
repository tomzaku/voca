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
  /** Extra words shown only on the detail page — chart stays uncluttered. */
  moreExamples: string[];
  /** One line on tongue/lip/jaw position and voicing — the detail page's
   *  answer to "how do I actually make this sound". */
  howTo: string;
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
  { symbol: 'ɪ', category: 'vowel-short', examples: ['sit', 'pin', 'dish'], moreExamples: ['bit', 'kiss', 'lip', 'big', 'fish', 'drink', 'ill', 'sing'],
    howTo: 'Tongue high and toward the front, lips relaxed and slightly spread — shorter and looser than /iː/.',
    sentences: [
      { text: 'Six little pigs sit in a big pit, kicking their thin legs with a quick flick.' },
      { text: 'Jim\'s quick kitten sits still, sniffing a dish of fish while its whiskers twitch and wiggle.' },
      { text: 'The king\'s six ministers sipped fizzy drinks and listened to the silly singer\'s quick, witty jingle.' },
    ] },
  { symbol: 'e', category: 'vowel-short', examples: ['bed', 'pen', 'red'], moreExamples: ['bell', 'ten', 'get', 'went', 'yes', 'egg', 'seven', 'help'],
    howTo: 'Mouth half-open, tongue mid and forward, lips relaxed — like /ɪ/ but with the jaw dropped a little more.',
    sentences: [
      { text: 'Ten fresh eggs and red bread were left on the bed for Ben\'s best friend\'s breakfast.' },
      { text: 'Every guest said yes when Jenny\'s clever pet fetched seven wet pebbles from the wet, empty well.' },
      { text: 'The best chef spent ten pleasant hours preparing fresh bread, tender eggs, and heavy red lentils.' },
    ] },
  { symbol: 'æ', category: 'vowel-short', examples: ['cat', 'hat', 'bag'], moreExamples: ['bad', 'man', 'apple', 'black', 'hand', 'bank', 'sad', 'add'],
    howTo: 'Jaw drops low, lips spread wide, tongue low and forward — the widest smile of the short vowels.',
    sentences: [
      { text: 'The fat cat sat on a black mat, snatching a snack from the sad man\'s bag.' },
      { text: 'Mad Sam packed his backpack with apples, jam, and a plastic map before the camping trip.' },
      { text: 'Happy Andy\'s family ran across the grassy land, clapping their hands at the fantastic band\'s happy party.' },
    ] },
  { symbol: 'ʌ', category: 'vowel-short', examples: ['cup', 'run', 'luck'], moreExamples: ['love', 'mother', 'come', 'blood', 'sun', 'money', 'young', 'done'],
    howTo: 'Mouth barely open, tongue central and relaxed, lips neutral — a short, clipped "uh".',
    sentences: [
      { text: 'My young cousin Russell loves lunch, munching a dozen crunchy buns under the sunny summer sun.' },
      { text: 'The lucky young duck jumped up, tumbled in the mud, and hunted for crumbs under the rusty trucks.' },
      { text: 'Uncle Gus was suddenly overcome with love, hugging his mother and brother in front of the sunny front porch.' },
    ] },
  { symbol: 'ɒ', category: 'vowel-short', examples: ['hot', 'dog', 'top'], moreExamples: ['box', 'watch', 'shop', 'lot', 'stop', 'clock', 'want', 'wash'],
    howTo: 'Lips rounded, jaw dropped, tongue low and back — the British "o" in "hot" (many American speakers merge this with /ɑː/).',
    sentences: [
      { text: 'Tom\'s dog hopped onto the box, knocked over the pot, and stopped to watch the clock on top of the shop.' },
      { text: 'A long, strong fox trotted off the rocky spot, hopping past the wobbly socks that had dropped from the washing line.' },
      { text: 'The cross boss lost his watch, knocked a pot off the shop counter, and stomped off in a hot temper.' },
    ] },
  { symbol: 'ʊ', category: 'vowel-short', examples: ['book', 'put', 'foot'], moreExamples: ['good', 'look', 'wood', 'cook', 'full', 'push', 'sugar', 'woman'],
    howTo: 'Lips loosely rounded, tongue high and back, short and relaxed — not as tense or rounded as /uː/.',
    sentences: [
      { text: 'The good cook put a full pot of pudding on the wooden hook, then pulled the woolly cushion closer.' },
      { text: 'A woman with a good foot took a look, then pushed the heavy wooden bookcase back to its proper spot.' },
      { text: 'The butcher could barely pull the full basket of wool, so he stood and took another good look.' },
    ] },
  { symbol: 'ə', category: 'vowel-short', examples: ['about', 'sofa', 'banana'], moreExamples: ['doctor', 'upon', 'common', 'camera', 'ago', 'taken', 'paper', 'support'],
    howTo: 'The most relaxed vowel in English (the "schwa") — the mouth barely moves, tongue central. Only appears in unstressed syllables.',
    sentences: [
      { text: 'A banana, an apple, and a bit of sugar were taken to the doctor\'s office upon arrival this morning.' },
      { text: 'The popular actor\'s mother borrowed a camera from another neighbor to photograph the opera about an hour ago.' },
      { text: 'The teacher\'s computer suggested a particular answer that seemed common to almost every other student in the classroom.' },
    ] },

  // ── Long vowels ──
  { symbol: 'iː', category: 'vowel-long', examples: ['see', 'tree', 'sheep'], moreExamples: ['three', 'key', 'cheese', 'please', 'green', 'sleep', 'people', 'believe'],
    howTo: 'Lips spread into a tight smile, tongue high and forward, held longer and tenser than /ɪ/.',
    sentences: [
      { text: 'Pete\'s elite team sees three sweet, neat, green bees eat crisp treats in the breeze.' },
      { text: 'We need to clean the green kitchen, sweep beneath the sheets, and feed the sleepy sheep some wheat.' },
      { text: 'Each week, the eager teacher reads a brief speech to the sleepy children before the evening meal.' },
    ] },
  { symbol: 'ɜː', category: 'vowel-long', examples: ['bird', 'girl', 'learn'], moreExamples: ['word', 'nurse', 'work', 'first', 'turn', 'shirt', 'early', 'herself'],
    howTo: 'Lips neutral, tongue mid-central, jaw slightly open — held long, like a British "er".',
    sentences: [
      { text: 'The nervous nurse in the purple shirt worked her first early turn, learning new words she\'d heard on her journey.' },
      { text: 'On Thursday, the thirsty girl heard a bird chirping, then returned to her work with a curious, stirring urge to learn.' },
      { text: 'The stern professor\'s certain words disturbed the girl, but she stayed calm, turning her thirty-first journal page.' },
    ] },
  { symbol: 'ɑː', category: 'vowel-long', examples: ['car', 'father', 'class'], moreExamples: ['park', 'heart', 'palm', 'dark', 'fast', 'start', 'laugh', 'bath'],
    howTo: 'Mouth wide open, tongue low and back, lips relaxed — a long, open "ah".',
    sentences: [
      { text: 'Grandfather calmly parked the car in the large, dark garden, past the half-grown palm trees near the farm.' },
      { text: 'After the fast car dashed past, my aunt laughed heartily and asked the class to start the dance at last.' },
      { text: 'The dark-hearted master of the castle marched past the marble arch with his heart pounding hard and fast.' },
    ] },
  { symbol: 'ɔː', category: 'vowel-long', examples: ['door', 'saw', 'ball'], moreExamples: ['more', 'walk', 'thought', 'sport', 'talk', 'law', 'morning', 'small'],
    howTo: 'Lips rounded and pushed forward, tongue mid-back, jaw dropped — held long.',
    sentences: [
      { text: 'Before dawn, the tall lawyer walked across the hall, thoughtfully talking about the court\'s important morning report.' },
      { text: 'The small boy caught the ball, threw it toward the wall, and watched it fall onto the wooden floor.' },
      { text: 'All autumn morning, the tall horse galloped across the north lawn before pausing near the old wooden door.' },
    ] },
  { symbol: 'uː', category: 'vowel-long', examples: ['blue', 'food', 'moon'], moreExamples: ['two', 'shoe', 'true', 'school', 'soon', 'group', 'juice', 'through'],
    howTo: 'Lips tightly rounded and pushed forward, tongue high and back, held long and tense.',
    sentences: [
      { text: 'Sue tried on two smooth blue shoes and a cool new suit to wear to school this beautiful June afternoon.' },
      { text: 'The goose flew loose through the room, knocking a spoon and a blue balloon off the smooth wooden stool.' },
      { text: 'We chewed cool fruit soup and drank juice while the group of youths tuned their smooth blue guitars in June.' },
    ] },

  // ── Diphthongs — two vowels gliding together, named by their start -> end ──
  { symbol: 'eɪ', category: 'diphthong', examples: ['day', 'name', 'rain'], moreExamples: ['play', 'wait', 'they', 'eight', 'face', 'table', 'break', 'weight'],
    howTo: 'Starts at /e/ and glides up toward /ɪ/ — lips move from relaxed to slightly spread as you say it.',
    sentences: [
      { text: 'Kate and Jake baked a great cake, then placed it on a plate to wait for their favorite neighbors\' arrival that day.' },
      { text: 'On a rainy day, they gave the strange stray snake a plate of grapes and stayed to play a strange game.' },
      { text: 'The famous chef baked eight layered cakes, arranged them neatly on the table, and later gave a taste to every eager stranger.' },
    ] },
  { symbol: 'aɪ', category: 'diphthong', examples: ['my', 'time', 'light'], moreExamples: ['fly', 'night', 'buy', 'five', 'like', 'smile', 'high', 'right'],
    howTo: 'Starts open and low, glides up toward /ɪ/ — the jaw closes as the sound finishes.',
    sentences: [
      { text: 'I like to ride my bike at twilight, admiring the bright white sky and the quiet, shining stars each night.' },
      { text: 'Five wild tigers quietly climbed the high, icy cliffside while the shy child tried to write a diary by firelight.' },
      { text: 'Why did the kind knight decide to fight beside his loyal tribe under the bright, shining midnight sky?' },
    ] },
  { symbol: 'ɔɪ', category: 'diphthong', examples: ['boy', 'coin', 'noise'], moreExamples: ['toy', 'voice', 'join', 'enjoy', 'point', 'choice', 'oil', 'boil'],
    howTo: 'Starts rounded like /ɔː/, glides toward /ɪ/ — the lips unround as the tongue rises.',
    sentences: [
      { text: 'The noisy boy joined his loyal friends to enjoy a royal feast, tossing coins and toys with pure joy.' },
      { text: 'A moist, oily coin spoiled the toy\'s paint, annoying the royal boy who was pointing and making noise.' },
      { text: 'Roy avoided the boiling oil, choosing instead to enjoy the noisy, joyful voices of the boys destroying their old toys.' },
    ] },
  { symbol: 'aʊ', category: 'diphthong', examples: ['now', 'house', 'town'], moreExamples: ['cow', 'mouth', 'sound', 'out', 'about', 'down', 'found', 'loud'],
    howTo: 'Starts open and low, glides toward /ʊ/ — the lips round as the sound closes.',
    sentences: [
      { text: 'The proud brown cow wandered down the crowded town, mooing loudly about the round, gray clouds above the house.' },
      { text: 'How now, the loud clown shouted, bowing around the crowd and pounding the ground with a thousand proud sounds.' },
      { text: 'Our house was surrounded by a powerful shower of pounding rain, and the flowers drowned beneath the gray clouds outside.' },
    ] },
  { symbol: 'əʊ', category: 'diphthong', examples: ['go', 'home', 'boat'], moreExamples: ['no', 'road', 'phone', 'know', 'over', 'only', 'most', 'though'],
    howTo: 'Starts central (schwa), glides toward /ʊ/ — the lips round only at the end.',
    sentences: [
      { text: 'So, the old golden boat slowly rowed home over the cold, snowy coast, hoping to know the road ahead.' },
      { text: 'Only the bold coach chose to hold his post, though the whole roadside was closed and covered in slow, blowing snow.' },
      { text: 'Rosie slowly opened the old wooden window, hoping the golden sunshine would show over the frozen, snowy slopes below.' },
    ] },
  { symbol: 'ɪə', category: 'diphthong', examples: ['near', 'ear', 'here'], moreExamples: ['idea', 'beer', 'weird', 'clear', 'year', 'really', 'appear', 'fear'],
    howTo: 'Starts at /ɪ/, glides toward schwa — common before "r" in non-rhotic British English.',
    sentences: [
      { text: 'My dear career as an engineer began here, near the pier, where I first appeared with sincere fear and cheer.' },
      { text: 'It\'s clear that every year, weird deer appear near here, disappearing into the eerie atmosphere without any real fear.' },
      { text: 'The sincere volunteer cheered loudly, steering clear of the weird, gloomy atmosphere near the pier this dreary year.' },
    ] },
  { symbol: 'eə', category: 'diphthong', examples: ['hair', 'chair', 'care'], moreExamples: ['bear', 'where', 'fair', 'stairs', 'there', 'airport', 'wear', 'square'],
    howTo: 'Starts at /e/, glides toward schwa — the jaw opens slightly as it fades.',
    sentences: [
      { text: 'Claire carefully compared a rare pair of chairs upstairs, unaware that a bear was staring from the doorway downstairs.' },
      { text: 'Wherever we travel by air, we take great care to share fair prices and prepare spare pairs of hairbrushes.' },
      { text: 'The parents stared in despair, aware that their careless daughter had left her fair share of scary chairs bare and unrepaired.' },
    ] },
  { symbol: 'ʊə', category: 'diphthong', examples: ['pure', 'tour', 'sure'], moreExamples: ['cure', 'moor', 'endure', 'during', 'jury'],
    howTo: 'Starts at /ʊ/, glides toward schwa — increasingly rare in modern speech, often replaced by /ɔː/, so genuine examples are thin on the ground.',
    sentences: [
      { text: 'During the tour, the jury seemed sure a pure, secure cure existed, though nobody could truly endure the tourists\' curious questions.' },
      { text: 'Are you sure the tour guide can endure such a long, obscure journey through the moor during a storm?' },
    ] },

  // ── Consonants ──
  { symbol: 'p', category: 'consonant', examples: ['pen', 'map', 'apple'], moreExamples: ['park', 'stop', 'paper', 'pepper', 'play', 'sleep', 'happy', 'up'],
    howTo: 'Lips press together, then release with a puff of air — voiceless, no vibration in the throat.',
    sentences: [
      { text: 'Peter\'s purple puppy hopped up the steep path, popping open a paper bag of crispy pepper crisps.' },
      { text: 'A plump pig napped peacefully in the purple pumpkin patch, hoping to escape the playful puppies\' quick pounce.' },
      { text: 'Please help pack the purple picnic supplies properly before the happy people appear at the park entrance.' },
    ] },
  { symbol: 'b', category: 'consonant', examples: ['bad', 'cab', 'table'], moreExamples: ['boy', 'rabbit', 'bubble', 'robot', 'club', 'baby'],
    howTo: 'Lips press together, then release — same spot as /p/ but with the vocal cords vibrating (voiced).',
    sentences: [
      { text: 'Bobby\'s baby rabbit nibbled a big, bubbly cabbage before bouncing back into its cozy, wobbly basket.' },
      { text: 'The clumsy robber grabbed a bag of ribbons, but stumbled badly and tumbled into a bubbling barrel of blueberries.' },
      { text: 'A brave boy built a wobbly table from bamboo, then blew bubbles beside his baby brother by the barn.' },
    ] },
  { symbol: 't', category: 'consonant', examples: ['ten', 'sit', 'better'], moreExamples: ['top', 'cat', 'letter', 'tent', 'little', 'water', 'night', 'invite'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases with a puff of air — voiceless.',
    sentences: [
      { text: 'Tom\'s tiny kitten tiptoed toward the tall table, tasting the tomato tart before tipping the teapot over.' },
      { text: 'Twenty tired tourists tried to catch the twelve-thirty train, but the ticket counter was totally shut until eight.' },
      { text: 'The little waiter carefully set out ten plates, twenty forks, and a pot of hot tea for the guests tonight.' },
    ] },
  { symbol: 'd', category: 'consonant', examples: ['dog', 'red', 'ladder'], moreExamples: ['day', 'bed', 'dad', 'road', 'body', 'good'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases — same spot as /t/ but voiced.',
    sentences: [
      { text: 'Dad dashed down the dusty road, dodging a wandering dog before deciding to head toward the wooden garden shed.' },
      { text: 'David decided to drag the wooden ladder down the driveway, dropping muddy dust beside the darkened old shed doorway.' },
      { text: 'The wide-eyed toddler waddled toward the sudden puddle, giggling as muddy droplets dripped down her rounded, dimpled cheeks.' },
    ] },
  { symbol: 'k', category: 'consonant', examples: ['cat', 'sick', 'kitchen'], moreExamples: ['key', 'back', 'cookie', 'kick', 'milk', 'week', 'cake', 'black'],
    howTo: 'The back of the tongue touches the soft palate, then releases with a puff of air — voiceless.',
    sentences: [
      { text: 'The quick brown cat crept back into the kitchen, cracking a cookie and knocking the clock off the counter.' },
      { text: 'Uncle Jack cooked crispy chicken and corn cakes in the kitchen while cracking jokes about the crooked, clanking clock.' },
      { text: 'A clumsy duck quacked and kicked a rocket-shaped kite across the cracked concrete, knocking over a stack of coconuts.' },
    ] },
  { symbol: 'g', category: 'consonant', examples: ['go', 'big', 'garden'], moreExamples: ['get', 'bag', 'giggle', 'dog', 'game', 'guest', 'egg', 'ago'],
    howTo: 'The back of the tongue touches the soft palate, then releases — same spot as /k/ but voiced.',
    sentences: [
      { text: 'The eager guest grabbed a big bag of grapes, giggling as the goofy dog dug through the garden gate.' },
      { text: 'A gigantic golden dragon galloped through the green garden, guarding a glowing golden egg beside the grassy gate.' },
      { text: 'Greg dragged a heavy wagon full of goats, luggage, and gadgets, grumbling and giggling all the way to the garage.' },
    ] },
  { symbol: 'f', category: 'consonant', examples: ['fan', 'leaf', 'coffee'], moreExamples: ['fun', 'life', 'phone', 'laugh', 'half', 'family'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through the gap — voiceless.',
    sentences: [
      { text: 'Fred\'s five fluffy elephants fed on fresh figs and fluffy flowers before falling asleep near the forest fence.' },
      { text: 'The forgetful farmer fried fifty fish for his family, laughing at how fast the fluffy flames flared.' },
      { text: 'Fiona found it funny that the office phone kept ringing off before anyone could finish their morning coffee.' },
    ] },
  { symbol: 'v', category: 'consonant', examples: ['van', 'love', 'seven'], moreExamples: ['very', 'live', 'view', 'give', 'travel', 'movie'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through — same as /f/ but voiced, felt as a buzz on the lip.',
    sentences: [
      { text: 'Vera\'s seven brave divers eagerly dived into the river, waving at every vehicle driving past the village.' },
      { text: 'The heavy driver never gave up, saving every valuable, velvet-covered vase from the vibrating delivery van.' },
      { text: 'Olivia loves traveling to visit her favorite village every seven or eleven evenings during the summer, driving her old silver van.' },
    ] },
  { symbol: 'θ', category: 'consonant', examples: ['think', 'bath', 'three'], moreExamples: ['thumb', 'tooth', 'birthday', 'math', 'nothing', 'thick', 'throw', 'mouth'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — voiceless, as in "think".',
    sentences: [
      { text: 'Beth thought the thick, thorny thistle beneath the bathtub was something worth thanking her healthy, athletic brother for.' },
      { text: 'The three thirsty thieves thought nothing of throwing thirty thin, toothless fish through the theater\'s south entrance.' },
      { text: 'On her birthday, Ruth thanked both her mother and father for the healthy, thoughtful gift they thoughtfully threw together with strength and faith.' },
    ] },
  { symbol: 'ð', category: 'consonant', examples: ['this', 'mother', 'weather'], moreExamples: ['that', 'brother', 'smooth', 'the', 'father', 'other'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — same spot as /θ/ but voiced, as in "this".',
    sentences: [
      { text: 'This weather bothers my mother and father, though they\'d rather gather together beneath the smooth, southern trees.' },
      { text: 'Either my brother or my other neighbor will smoothly clothe themselves in leather before gathering with the others outside.' },
      { text: 'Rather than bother with those feathers, they breathed together, soothing each other with soft, worthy, brotherly words.' },
    ] },
  { symbol: 's', category: 'consonant', examples: ['sun', 'bus', 'city'], moreExamples: ['see', 'listen', 'sister', 'nice', 'sound', 'face'],
    howTo: 'Tongue tip near the ridge behind the teeth, a narrow channel hisses air out — voiceless.',
    sentences: [
      { text: 'Sam\'s sister Sally sipped sour lemonade beside the sunny seaside in the soft summer sunshine.' },
      { text: 'Six sleepy snails slowly slid across the silver street, searching for a small, safe space to rest.' },
      { text: 'The scientist carefully observed the silent stars, noticing a strange, sparkling substance spreading slowly across the surface.' },
    ] },
  { symbol: 'z', category: 'consonant', examples: ['zoo', 'buzz', 'lazy'], moreExamples: ['zip', 'easy', 'music', 'zero', 'busy', 'these'],
    howTo: 'Same tongue position as /s/ — but voiced, felt as a buzz.',
    sentences: [
      { text: 'The lazy zebra zigzagged dizzily across the hazy zoo, buzzing bees chasing its fuzzy nose as visitors watched.' },
      { text: 'Zoe\'s cousins always chose easy, breezy music, closing their eyes and singing as the busy zoo buzzed nearby.' },
      { text: 'Business was surprisingly busy at the bazaar, where dozens of customers browsed rows of shiny, dazzling prizes and jewelry.' },
    ] },
  { symbol: 'ʃ', category: 'consonant', examples: ['she', 'wash', 'sugar'], moreExamples: ['shop', 'wish', 'nation', 'sure', 'shoe', 'fish', 'station', 'special'],
    howTo: 'Tongue pulled back a little further than /s/, lips slightly rounded — voiceless "sh".',
    sentences: [
      { text: 'She wished to shop for a shiny seashell and a fresh fish dish at the seaside shore this sunshine-filled afternoon.' },
      { text: 'The ambitious, fashionable chef prepared a delicious dish of fresh shrimp, sharing his special recipe with the anxious, patient guests.' },
      { text: 'The shy fisherman pushed his wooden ship toward the shore, wishing for a smooth, official passage through the shallow ocean.' },
    ] },
  { symbol: 'ʒ', category: 'consonant', examples: ['vision', 'treasure', 'usual'], moreExamples: ['pleasure', 'measure', 'garage', 'decision', 'casual', 'television', 'occasion', 'leisure'],
    howTo: 'Same tongue position as /ʃ/ — but voiced. Rare in English, and almost never at the start of a word.',
    sentences: [
      { text: 'With great pleasure, the television host revealed his casual decision to measure the usual leisurely treasure collection.' },
      { text: 'The sudden explosion caused confusion and a strange illusion of visual invasion, leading to an unexpected division of opinion.' },
    ] },
  { symbol: 'h', category: 'consonant', examples: ['hat', 'house', 'ahead'], moreExamples: ['hello', 'home', 'behind', 'hope', 'happy', 'help', 'who', 'hand'],
    howTo: 'A light puff of breath from the throat, with no contact between tongue and mouth — voiceless.',
    sentences: [
      { text: 'Harry happily hurried home, hoping his husband had hidden a huge, healthy ham behind the hallway heater.' },
      { text: 'The hungry hero hiked up the hilly highway, hunting for a hidden hut where he hoped to find his horse.' },
      { text: 'Helen\'s happy hound hopped onto the high hammock, howling heartily whenever her husband hummed a hopeful little hymn.' },
    ] },
  { symbol: 'tʃ', category: 'consonant', examples: ['chair', 'watch', 'teacher'], moreExamples: ['church', 'catch', 'cheese', 'kitchen', 'much', 'teach', 'match', 'question'],
    howTo: 'A /t/ released straight into /ʃ/ in one quick motion — voiceless, as in "church".',
    sentences: [
      { text: 'The cheerful teacher watched each child chew their cheese sandwich, checking their charts before the chemistry lecture.' },
      { text: 'Charlie chased the mischievous chicken across the orchard, chuckling as it charged toward the kitchen chimney with a chunk of cheese.' },
      { text: 'A cheerful coach cheered as the champion\'s team charged toward the beach, chasing the ball to reach the final match.' },
    ] },
  { symbol: 'dʒ', category: 'consonant', examples: ['jump', 'bridge', 'danger'], moreExamples: ['judge', 'age', 'giant', 'gym', 'large', 'magic', 'enjoy', 'general'],
    howTo: 'A /d/ released straight into /ʒ/ in one quick motion — voiced, as in "judge".',
    sentences: [
      { text: 'The giant, gentle giraffe jumped joyfully across the jungle bridge, enjoying a juicy orange and a large ginger jellybean.' },
      { text: 'The courageous village judge managed to arrange an urgent journey, imagining the danger of the strange, damaged bridge ahead.' },
      { text: 'Gemma juggled oranges and ginger biscuits in the gym, joking with her genius roommate about the huge budget for the college pageant.' },
    ] },
  { symbol: 'm', category: 'consonant', examples: ['man', 'summer', 'drum'], moreExamples: ['mum', 'animal', 'moon', 'family', 'time', 'room'],
    howTo: 'Lips press together, air hums out through the nose — voiced.',
    sentences: [
      { text: 'My mother made a marvelous meal for the whole family, mixing mushrooms, mashed lemon, and creamy tomato soup at home.' },
      { text: 'The mysterious monkey munched on a mountain of mixed melons, making a mess in the moonlit museum garden this morning.' },
      { text: 'Emma\'s grandma remembered summer mornings swimming in the calm mountain stream, humming a mellow melody with her old friends.' },
    ] },
  { symbol: 'n', category: 'consonant', examples: ['no', 'sun', 'dinner'], moreExamples: ['nine', 'banana', 'name', 'window', 'morning', 'run'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air hums out through the nose — voiced.',
    sentences: [
      { text: 'Nine funny kittens ran across the sunny garden, chasing a shiny green banana under the wooden window at noon.' },
      { text: 'Nancy\'s neighbor never noticed the ninety noisy geese wandering near the narrow tunnel beneath the northern mountain station.' },
      { text: 'In the evening, nine nervous nurses gently nursed newborn puppies near the sunny corner of the animal nursery.' },
    ] },
  { symbol: 'ŋ', category: 'consonant', examples: ['sing', 'king', 'morning'], moreExamples: ['thing', 'long', 'singer', 'tongue', 'bank', 'think', 'young', 'english'],
    howTo: 'Back of the tongue touches the soft palate, air hums out through the nose — never appears at the start of an English word.',
    sentences: [
      { text: 'Every morning, the young singer sang a long, ringing song while swinging happily along the strong, winding riverbank.' },
      { text: 'The angry king brought his hungry, growling dragon along, watching it swing its tongue and sing a strange, booming song.' },
      { text: 'During the opening evening meeting, everyone kept talking, thinking, and bringing exciting things about the upcoming spring gathering.' },
    ] },
  { symbol: 'l', category: 'consonant', examples: ['leg', 'ball', 'yellow'], moreExamples: ['love', 'tell', 'apple', 'light', 'people', 'well'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air flows around the sides of the tongue — voiced.',
    sentences: [
      { text: 'Little Lily loves to play alone, lazily collecting yellow leaves and lovely purple apples along the quiet local lane.' },
      { text: 'The lonely lion slowly limped along the long, lifeless valley, hoping to locate a lively little village nearby.' },
      { text: 'Lily\'s simple little library holds millions of colorful, lovely legends about lonely lands full of magical light.' },
    ] },
  { symbol: 'r', category: 'consonant', examples: ['red', 'carry', 'sorry'], moreExamples: ['run', 'very', 'road', 'right', 'green', 'story'],
    howTo: 'Tongue curls back slightly without touching the roof of the mouth — voiced, no trill in English.',
    sentences: [
      { text: 'Rory carried a rusty red umbrella through the roaring rainstorm, hurrying toward the river before the road grew rough.' },
      { text: 'The rich farmer\'s rooster roamed around the rural garden, waking everyone with a horribly loud, terrifying roar each morning.' },
      { text: 'Rita worried that her horrible story about the rare, mysterious river creature would frighten everyone at the reunion.' },
    ] },
  { symbol: 'j', category: 'consonant', examples: ['yes', 'yellow', 'use'], moreExamples: ['you', 'few', 'music', 'year', 'university', 'yesterday'],
    howTo: 'Tongue high and forward like /iː/, then glides quickly into the next vowel — voiced, as in "yes".',
    sentences: [
      { text: 'Yesterday, a young university student used a unique, yellow unicycle to view the beautiful yard full of yellow tulips.' },
      { text: 'You yelled at the yellow-uniformed youth for using useless yarn instead of the usual, valuable music equipment.' },
      { text: 'Few young musicians argued over the unique value of the university\'s beautiful, unusual yearly music festival.' },
    ] },
  { symbol: 'w', category: 'consonant', examples: ['wet', 'away', 'swim'], moreExamples: ['window', 'sweet', 'quick', 'one', 'work', 'west', 'always', 'twenty'],
    howTo: 'Lips round tightly like /uː/, then glide quickly into the next vowel — voiced, as in "wet".',
    sentences: [
      { text: 'We watched the wild white whale swim away, wondering why the water was so warm and wonderfully wavy this weekend.' },
      { text: 'William wisely waited by the window, watching the winter wind whistle while wearing a warm, woolen sweater and wool socks.' },
      { text: 'Wendy wondered whether the wealthy woman would welcome her wonderful, well-written wedding invitation this coming week.' },
    ] },
];

export interface MinimalPair {
  a: { symbol: string; word: string };
  b: { symbol: string; word: string };
}

// Classic minimal pairs for the listening exercise — two words that differ
// by exactly the one sound being contrasted, so hearing them apart is a
// direct test of that contrast. Covers a mix of commonly-confused vowel and
// consonant pairs, not every symbol above.
export const MINIMAL_PAIRS: MinimalPair[] = [
  { a: { symbol: 'iː', word: 'sheep' }, b: { symbol: 'ɪ', word: 'ship' } },
  { a: { symbol: 'e', word: 'pen' }, b: { symbol: 'æ', word: 'pan' } },
  { a: { symbol: 'æ', word: 'cat' }, b: { symbol: 'ʌ', word: 'cut' } },
  { a: { symbol: 'ɒ', word: 'cot' }, b: { symbol: 'ɔː', word: 'caught' } },
  { a: { symbol: 'ʊ', word: 'full' }, b: { symbol: 'uː', word: 'fool' } },
  { a: { symbol: 'p', word: 'pat' }, b: { symbol: 'b', word: 'bat' } },
  { a: { symbol: 't', word: 'town' }, b: { symbol: 'd', word: 'down' } },
  { a: { symbol: 'k', word: 'coat' }, b: { symbol: 'g', word: 'goat' } },
  { a: { symbol: 'f', word: 'fan' }, b: { symbol: 'v', word: 'van' } },
  { a: { symbol: 'θ', word: 'teeth' }, b: { symbol: 'ð', word: 'teethe' } },
  { a: { symbol: 's', word: 'sip' }, b: { symbol: 'z', word: 'zip' } },
  { a: { symbol: 'ʃ', word: 'share' }, b: { symbol: 'tʃ', word: 'chair' } },
  { a: { symbol: 'l', word: 'light' }, b: { symbol: 'r', word: 'right' } },
  { a: { symbol: 'n', word: 'sin' }, b: { symbol: 'ŋ', word: 'sing' } },
  { a: { symbol: 'dʒ', word: 'jet' }, b: { symbol: 'j', word: 'yet' } },
  { a: { symbol: 'v', word: 'vest' }, b: { symbol: 'w', word: 'west' } },
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
