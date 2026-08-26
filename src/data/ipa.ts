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
  text: string;
  /** The word in `text` that carries the target sound, highlighted in the
   *  UI. Must appear in `text` verbatim (case-insensitive substring match) —
   *  use the exact inflected form ("laughed", not "laugh") so the whole word
   *  highlights instead of just its stem. */
  target: string;
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
  /** Exactly 3 short sentences for sentence-practice mode — read aloud,
   *  record yourself, and (on request) see the IPA for. */
  sentences: IpaSentence[];
  /** Longer, more complex sentences for the same mode's "Long" pool — every
   *  `sentences` above is deliberately short, so a learner who wants a real
   *  challenge needs different sentences, not just a slower reading of the
   *  same short one. At least 4 per sound. */
  longSentences: IpaSentence[];
}

export const IPA_SOUNDS: IpaSound[] = [
  // ── Short vowels ──
  { symbol: 'ɪ', category: 'vowel-short', examples: ['sit', 'pin', 'dish'], moreExamples: ['bit', 'kiss', 'lip', 'big', 'fish', 'drink', 'ill', 'sing'],
    howTo: 'Tongue high and toward the front, lips relaxed and slightly spread — shorter and looser than /iː/.',
    sentences: [
      { text: 'Please sit on this chair.', target: 'sit' },
      { text: 'I caught a big fish today.', target: 'fish' },
      { text: 'She felt ill this morning.', target: 'ill' },
    ],
    longSentences: [
      { text: 'After we finished dinner, she suddenly felt ill and had to sit down for a while.', target: 'ill' },
      { text: 'Every Sunday morning, my grandmother likes to sit by the window and drink her tea slowly.', target: 'sit' },
      { text: 'The big fish swam quickly beneath the bridge before anyone even noticed it was there.', target: 'fish' },
      { text: 'She practiced how to sing that difficult song until she finally got every note right.', target: 'sing' },
    ] },
  { symbol: 'e', category: 'vowel-short', examples: ['bed', 'pen', 'red'], moreExamples: ['bell', 'ten', 'get', 'went', 'yes', 'egg', 'seven', 'help'],
    howTo: 'Mouth half-open, tongue mid and forward, lips relaxed — like /ɪ/ but with the jaw dropped a little more.',
    sentences: [
      { text: 'I need a pen to write.', target: 'pen' },
      { text: 'We went to the market.', target: 'went' },
      { text: 'Can you help me now?', target: 'help' },
    ],
    longSentences: [
      { text: 'Even though the weather looked bad, we still went outside and asked our neighbor for help.', target: 'help' },
      { text: 'By the time we finally went to bed, it was already well past midnight outside.', target: 'went' },
      { text: 'Could you please get me a pen from the drawer before the meeting starts this afternoon.', target: 'pen' },
      { text: 'We rang the bell seven times before anyone finally came to open the front door.', target: 'bell' },
    ] },
  { symbol: 'æ', category: 'vowel-short', examples: ['cat', 'hat', 'bag'], moreExamples: ['bad', 'man', 'apple', 'black', 'hand', 'bank', 'sad', 'add'],
    howTo: 'Jaw drops low, lips spread wide, tongue low and forward — the widest smile of the short vowels.',
    sentences: [
      { text: 'The cat is sleeping on the bag.', target: 'cat' },
      { text: 'He wore a black hat.', target: 'black' },
      { text: 'She raised her hand slowly.', target: 'hand' },
    ],
    longSentences: [
      { text: 'The black cat jumped onto the bag and knocked it off the table before anyone could react.', target: 'black' },
      { text: 'The old man walked slowly down the street, carrying a black bag in his hand.', target: 'black' },
      { text: 'It made her sad to see the little cat wandering alone near the empty bank.', target: 'sad' },
      { text: 'Please add another apple to the bag before we leave for the picnic this afternoon.', target: 'add' },
    ] },
  { symbol: 'ʌ', category: 'vowel-short', examples: ['cup', 'run', 'luck'], moreExamples: ['love', 'mother', 'come', 'blood', 'sun', 'money', 'young', 'done'],
    howTo: 'Mouth barely open, tongue central and relaxed, lips neutral — a short, clipped "uh".',
    sentences: [
      { text: 'I love a hot cup of tea.', target: 'love' },
      { text: 'Come and see the sun.', target: 'come' },
      { text: 'We are finally done with lunch.', target: 'done' },
    ],
    longSentences: [
      { text: 'Once the sun came up, we finally finished our long journey and were glad it was done.', target: 'done' },
      { text: 'My mother always says that hard work brings more luck than money ever could.', target: 'mother' },
      { text: 'Once the sun rose above the hills, the young runners finally began their long race.', target: 'young' },
      { text: 'We were so happy when we finally came to see how much progress had been made.', target: 'came' },
    ] },
  { symbol: 'ɒ', category: 'vowel-short', examples: ['hot', 'dog', 'top'], moreExamples: ['box', 'watch', 'shop', 'lot', 'stop', 'clock', 'want', 'wash'],
    howTo: 'Lips rounded, jaw dropped, tongue low and back — the British "o" in "hot" (many American speakers merge this with /ɑː/).',
    sentences: [
      { text: 'The dog sat on top of the box.', target: 'box' },
      { text: "Let's stop at the shop.", target: 'shop' },
      { text: 'I want to wash the clock.', target: 'want' },
    ],
    longSentences: [
      { text: 'We decided to stop at the small shop on the corner before heading back to wash the car.', target: 'shop' },
      { text: 'After a lot of walking, we finally stopped to rest and watch the clock on the wall.', target: 'stopped' },
      { text: 'The little dog jumped onto the box and refused to get down no matter what.', target: 'dog' },
      { text: 'I want to wash the car before we drive all the way across town tomorrow.', target: 'want' },
    ] },
  { symbol: 'ʊ', category: 'vowel-short', examples: ['book', 'put', 'foot'], moreExamples: ['good', 'look', 'wood', 'cook', 'full', 'push', 'sugar', 'woman'],
    howTo: 'Lips loosely rounded, tongue high and back, short and relaxed — not as tense or rounded as /uː/.',
    sentences: [
      { text: 'Please put the book down.', target: 'put' },
      { text: 'That was a good cook.', target: 'cook' },
      { text: 'Push the door open, please.', target: 'Push' },
    ],
    longSentences: [
      { text: 'She had to push the heavy door and put all the books back before the library closed.', target: 'push' },
      { text: 'The woman carefully put the heavy book back onto the shelf before anyone could notice.', target: 'put' },
      { text: 'It took a good cook nearly an hour to prepare such a full and delicious meal.', target: 'cook' },
      { text: 'Please look carefully before you push that old wooden door open all the way.', target: 'push' },
    ] },
  { symbol: 'ə', category: 'vowel-short', examples: ['about', 'sofa', 'banana'], moreExamples: ['doctor', 'upon', 'common', 'camera', 'ago', 'taken', 'paper', 'support'],
    howTo: 'The most relaxed vowel in English (the "schwa") — the mouth barely moves, tongue central. Only appears in unstressed syllables.',
    sentences: [
      { text: 'I read about it a moment ago.', target: 'ago' },
      { text: 'The doctor gave her some support.', target: 'support' },
      { text: 'She sat on the sofa with a banana.', target: 'sofa' },
    ],
    longSentences: [
      { text: 'The doctor explained the results a moment ago, and everyone agreed to offer their full support.', target: 'support' },
      { text: 'The doctor asked about the results again, and everyone quietly waited for an answer.', target: 'about' },
      { text: 'It\'s quite common for people to forget where they left their camera or their paper.', target: 'common' },
      { text: 'A few years ago, my family bought a comfortable sofa for our small living room.', target: 'sofa' },
    ] },

  // ── Long vowels ──
  { symbol: 'iː', category: 'vowel-long', examples: ['see', 'tree', 'sheep'], moreExamples: ['three', 'key', 'cheese', 'please', 'green', 'sleep', 'people', 'believe'],
    howTo: 'Lips spread into a tight smile, tongue high and forward, held longer and tenser than /ɪ/.',
    sentences: [
      { text: 'I can see three green trees.', target: 'see' },
      { text: 'Please pass the cheese.', target: 'Please' },
      { text: 'Many people believe this story.', target: 'believe' },
    ],
    longSentences: [
      { text: 'Many people who visited the coast that summer said they could see the green trees for miles.', target: 'see' },
      { text: 'As the sun rose, we could finally see the green fields stretching out for miles.', target: 'see' },
      { text: 'Please believe me when I say that three of the sheep escaped through the broken fence.', target: 'believe' },
      { text: 'Many people find it hard to sleep when the city outside is still so noisy.', target: 'sleep' },
    ] },
  { symbol: 'ɜː', category: 'vowel-long', examples: ['bird', 'girl', 'learn'], moreExamples: ['word', 'nurse', 'work', 'first', 'turn', 'shirt', 'early', 'herself'],
    howTo: 'Lips neutral, tongue mid-central, jaw slightly open — held long, like a British "er".',
    sentences: [
      { text: 'The girl heard a bird sing.', target: 'girl' },
      { text: 'I need to learn this word.', target: 'learn' },
      { text: 'She left work early today.', target: 'early' },
    ],
    longSentences: [
      { text: 'The young girl practiced every morning until she could finally play the whole song without a single mistake.', target: 'girl' },
      { text: 'My sister left for work early, hoping to finish everything before her shift began.', target: 'early' },
      { text: 'The nurse carefully explained what the first symptoms of the illness usually looked like.', target: 'nurse' },
      { text: 'It took her nearly a whole year to finally learn how to surf properly.', target: 'learn' },
    ] },
  { symbol: 'ɑː', category: 'vowel-long', examples: ['car', 'father', 'class'], moreExamples: ['park', 'heart', 'palm', 'dark', 'fast', 'start', 'laugh', 'bath'],
    howTo: 'Mouth wide open, tongue low and back, lips relaxed — a long, open "ah".',
    sentences: [
      { text: 'My father parked the car.', target: 'father' },
      { text: 'We laughed in the dark park.', target: 'laughed' },
      { text: "Let's start class after the bath.", target: 'start' },
    ],
    longSentences: [
      { text: 'My father always laughed when we told him stories about our childhood adventures in the old park.', target: 'father' },
      { text: 'My father drove the car quite fast through the dark streets to get us home.', target: 'father' },
      { text: 'We walked through the quiet park and laughed about something that happened in class earlier.', target: 'laughed' },
      { text: 'Before the sun went down, we managed to start our long journey across the valley.', target: 'start' },
    ] },
  { symbol: 'ɔː', category: 'vowel-long', examples: ['door', 'saw', 'ball'], moreExamples: ['more', 'walk', 'thought', 'sport', 'talk', 'law', 'morning', 'small'],
    howTo: 'Lips rounded and pushed forward, tongue mid-back, jaw dropped — held long.',
    sentences: [
      { text: 'I saw a ball at the door.', target: 'saw' },
      { text: 'We talked about the law.', target: 'talked' },
      { text: "Let's walk more this morning.", target: 'walk' },
    ],
    longSentences: [
      { text: 'We stopped to talk about the new law before walking further along the road toward the market.', target: 'talk' },
      { text: 'Every morning, my brother likes to walk to the small park before school starts.', target: 'morning' },
      { text: 'I never thought that such a small sport could bring so much joy to everyone.', target: 'thought' },
      { text: 'We saw the ball fly straight through the open door and land on the porch.', target: 'saw' },
    ] },
  { symbol: 'uː', category: 'vowel-long', examples: ['blue', 'food', 'moon'], moreExamples: ['two', 'shoe', 'true', 'school', 'soon', 'group', 'juice', 'through'],
    howTo: 'Lips tightly rounded and pushed forward, tongue high and back, held long and tense.',
    sentences: [
      { text: 'The blue moon looked true tonight.', target: 'true' },
      { text: 'We drank juice at school.', target: 'juice' },
      { text: 'Two students walked through the group.', target: 'through' },
    ],
    longSentences: [
      { text: 'The whole group agreed that the food tasted better after they added a little more fresh fruit.', target: 'food' },
      { text: 'A large group of tourists walked through the old school gates just as the moon appeared.', target: 'group' },
      { text: 'It\'s true that two students finished their juice before the bell rang for class.', target: 'true' },
      { text: 'We will soon travel through the countryside to visit our old family friends.', target: 'soon' },
    ] },

  // ── Diphthongs — two vowels gliding together, named by their start -> end ──
  { symbol: 'eɪ', category: 'diphthong', examples: ['day', 'name', 'rain'], moreExamples: ['play', 'wait', 'they', 'eight', 'face', 'table', 'break', 'weight'],
    howTo: 'Starts at /e/ and glides up toward /ɪ/ — lips move from relaxed to slightly spread as you say it.',
    sentences: [
      { text: 'They played all day.', target: 'played' },
      { text: 'Wait for the rain to stop.', target: 'Wait' },
      { text: 'She sat at the table for a break.', target: 'break' },
    ],
    longSentences: [
      { text: 'They played outside all day until it started to rain, and then they waited inside for it to stop.', target: 'played' },
      { text: 'By eight o\'clock, everyone had already gathered around the table for a big breakfast.', target: 'eight' },
      { text: 'Her face lit up the moment she heard her name called across the crowded stage.', target: 'face' },
      { text: 'We need to take a short break before continuing this long and tiring hike today.', target: 'break' },
    ] },
  { symbol: 'aɪ', category: 'diphthong', examples: ['my', 'time', 'light'], moreExamples: ['fly', 'night', 'buy', 'five', 'like', 'smile', 'high', 'right'],
    howTo: 'Starts open and low, glides up toward /ɪ/ — the jaw closes as the sound finishes.',
    sentences: [
      { text: 'I like my bright smile.', target: 'smile' },
      { text: "It's time to buy five apples.", target: 'buy' },
      { text: 'The light was too high at night.', target: 'night' },
    ],
    longSentences: [
      { text: 'It was already getting dark outside, so we decided it was time to turn on every light in the house.', target: 'light' },
      { text: 'I like to smile every time I see the bright light shining through my window.', target: 'smile' },
      { text: 'We finally decided to buy five new bicycles before the price went up again.', target: 'buy' },
      { text: 'The kite flew unusually high in the sky right before the sun began to rise.', target: 'high' },
    ] },
  { symbol: 'ɔɪ', category: 'diphthong', examples: ['boy', 'coin', 'noise'], moreExamples: ['toy', 'voice', 'join', 'enjoy', 'point', 'choice', 'oil', 'boil'],
    howTo: 'Starts rounded like /ɔː/, glides toward /ɪ/ — the lips unround as the tongue rises.',
    sentences: [
      { text: 'The boy dropped a coin.', target: 'coin' },
      { text: 'Please join us and enjoy the toy.', target: 'enjoy' },
      { text: 'Boil the oil to this point.', target: 'Boil' },
    ],
    longSentences: [
      { text: 'The little boy was so excited that he could hardly wait to join his friends and enjoy the new toy.', target: 'enjoy' },
      { text: 'The little boy dropped an old coin and made quite a bit of noise doing it.', target: 'noise' },
      { text: 'She had to make a difficult choice between joining the team or staying home to study.', target: 'choice' },
      { text: 'We could hear his voice from far away as he tried to enjoy the noisy party.', target: 'voice' },
    ] },
  { symbol: 'aʊ', category: 'diphthong', examples: ['now', 'house', 'town'], moreExamples: ['cow', 'mouth', 'sound', 'out', 'about', 'down', 'found', 'loud'],
    howTo: 'Starts open and low, glides toward /ʊ/ — the lips round as the sound closes.',
    sentences: [
      { text: 'The cow walked around the house.', target: 'cow' },
      { text: 'We heard a loud sound downtown.', target: 'loud' },
      { text: 'I found my way out now.', target: 'found' },
    ],
    longSentences: [
      { text: 'We heard a loud noise coming from the house next door, so we quickly ran outside to see what happened.', target: 'loud' },
      { text: 'We finally found our way out of the crowded market after wandering around for nearly an hour.', target: 'found' },
      { text: 'The brown cow walked slowly down the hill while the farmer watched from the porch.', target: 'cow' },
      { text: 'About a dozen students gathered downtown to watch the annual summer parade go by.', target: 'About' },
    ] },
  { symbol: 'əʊ', category: 'diphthong', examples: ['go', 'home', 'boat'], moreExamples: ['no', 'road', 'phone', 'know', 'over', 'only', 'most', 'though'],
    howTo: 'Starts central (schwa), glides toward /ʊ/ — the lips round only at the end.',
    sentences: [
      { text: "Let's go home slowly.", target: 'go' },
      { text: 'I know the road well.', target: 'know' },
      { text: 'She only called on the phone.', target: 'phone' },
    ],
    longSentences: [
      { text: 'I know most people would rather stay home and relax than go out in such cold weather.', target: 'know' },
      { text: 'Most people know that the road home gets quite busy right around this time.', target: 'know' },
      { text: 'Even though it started to rain, we decided to go over to the lake anyway.', target: 'though' },
      { text: 'She answered the phone only after checking who was calling from the strange number.', target: 'phone' },
    ] },
  { symbol: 'ɪə', category: 'diphthong', examples: ['near', 'ear', 'here'], moreExamples: ['idea', 'beer', 'weird', 'clear', 'year', 'really', 'appear', 'fear'],
    howTo: 'Starts at /ɪ/, glides toward schwa — common before "r" in non-rhotic British English.',
    sentences: [
      { text: 'Come near and listen here.', target: 'near' },
      { text: "That's a really clear idea.", target: 'clear' },
      { text: "It sounds weird, but it's true this year.", target: 'weird' },
    ],
    longSentences: [
      { text: 'As we walked nearer to the village, we could hear people cheering somewhere near the square.', target: 'near' },
      { text: 'It was a really good idea to build the new library somewhere near the school.', target: 'idea' },
      { text: 'Every year, strange lights seem to appear somewhere near the old abandoned pier.', target: 'appear' },
      { text: 'Nothing seemed clear until she finally explained the whole idea to everyone standing here.', target: 'clear' },
    ] },
  { symbol: 'eə', category: 'diphthong', examples: ['hair', 'chair', 'care'], moreExamples: ['bear', 'where', 'fair', 'stairs', 'there', 'airport', 'wear', 'square'],
    howTo: 'Starts at /e/, glides toward schwa — the jaw opens slightly as it fades.',
    sentences: [
      { text: 'Sit on that chair over there.', target: 'there' },
      { text: 'Take care on the stairs.', target: 'care' },
      { text: 'Where did you leave your hair brush?', target: 'Where' },
    ],
    longSentences: [
      { text: 'Please take extra care on the stairs, because they can be quite slippery whenever it rains outside.', target: 'care' },
      { text: 'We waited near the square, unsure exactly where the fair was supposed to begin.', target: 'square' },
      { text: 'They arrived at the airport early, hoping to avoid the long lines near the gate.', target: 'airport' },
      { text: 'Wherever we travel, she always insists on wearing something warm and comfortable.', target: 'Wherever' },
    ] },
  { symbol: 'ʊə', category: 'diphthong', examples: ['pure', 'tour', 'sure'], moreExamples: ['cure', 'moor', 'endure', 'during', 'jury'],
    howTo: 'Starts at /ʊ/, glides toward schwa — increasingly rare in modern speech, often replaced by /ɔː/, so genuine examples are thin on the ground.',
    sentences: [
      { text: "I'm sure we found a cure.", target: 'cure' },
      { text: 'We took a tour during summer.', target: 'during' },
      { text: 'The jury seemed sure of the truth.', target: 'jury' },
    ],
    longSentences: [
      { text: 'The jury seemed fairly sure of their decision, even though the lawyer wasn\'t entirely sure himself.', target: 'sure' },
      { text: 'During the long tour, our guide explained how scientists finally found a cure for the illness.', target: 'during' },
      { text: 'It takes real patience and courage to endure such a difficult journey across the misty moor.', target: 'endure' },
      { text: 'The countryside near the old moor stays remarkably pure and quiet long after the tourists leave.', target: 'moor' },
    ] },

  // ── Consonants ──
  { symbol: 'p', category: 'consonant', examples: ['pen', 'map', 'apple'], moreExamples: ['park', 'stop', 'paper', 'pepper', 'play', 'sleep', 'happy', 'up'],
    howTo: 'Lips press together, then release with a puff of air — voiceless, no vibration in the throat.',
    sentences: [
      { text: 'Please pick up the pen.', target: 'pen' },
      { text: 'The paper is on the park bench.', target: 'paper' },
      { text: 'We stopped to play in the park.', target: 'play' },
    ],
    longSentences: [
      { text: 'We stopped by the park to pick up some paper before heading to the printing shop downtown.', target: 'paper' },
      { text: 'The children were happy to play in the park until it was finally time to stop.', target: 'happy' },
      { text: 'She picked up a pen and began drawing a rough map of the old town.', target: 'pen' },
      { text: 'A little pepper on the paper plate made the simple meal taste much better.', target: 'pepper' },
    ] },
  { symbol: 'b', category: 'consonant', examples: ['bad', 'cab', 'table'], moreExamples: ['boy', 'rabbit', 'bubble', 'robot', 'club', 'baby'],
    howTo: 'Lips press together, then release — same spot as /p/ but with the vocal cords vibrating (voiced).',
    sentences: [
      { text: 'The boy blew a big bubble.', target: 'bubble' },
      { text: 'A baby rabbit sat by the table.', target: 'baby' },
      { text: 'We took a cab to the club.', target: 'cab' },
    ],
    longSentences: [
      { text: 'The little boy blew a huge bubble that floated all the way across the busy playground.', target: 'bubble' },
      { text: 'We took an old yellow cab across town just to visit the new robot exhibit downtown.', target: 'cab' },
      { text: 'A tiny baby rabbit hopped quietly across the garden while everyone watched from the porch.', target: 'baby' },
      { text: 'The members of the local club gathered early to plan a surprise birthday party.', target: 'club' },
    ] },
  { symbol: 't', category: 'consonant', examples: ['ten', 'sit', 'better'], moreExamples: ['top', 'cat', 'letter', 'tent', 'little', 'water', 'night', 'invite'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases with a puff of air — voiceless.',
    sentences: [
      { text: 'Please sit at the table.', target: 'sit' },
      { text: 'I wrote a letter last night.', target: 'letter' },
      { text: 'The cat drank a little water.', target: 'little' },
    ],
    longSentences: [
      { text: 'She sat quietly at the table, writing a letter to her best friend late into the night.', target: 'letter' },
      { text: 'It took a little water and plenty of patience to finally set up the tent.', target: 'little' },
      { text: 'She sent out invitations, hoping to invite all her closest friends to the party.', target: 'invite' },
      { text: 'The cat quietly climbed to the top of the tent and refused to come down.', target: 'top' },
    ] },
  { symbol: 'd', category: 'consonant', examples: ['dog', 'red', 'ladder'], moreExamples: ['day', 'bed', 'dad', 'road', 'body', 'good'],
    howTo: 'Tongue tip taps the ridge behind your top teeth, then releases — same spot as /t/ but voiced.',
    sentences: [
      { text: 'The red dog ran down the road.', target: 'red' },
      { text: 'Dad went to bed early today.', target: 'Dad' },
      { text: 'It was a good day overall.', target: 'good' },
    ],
    longSentences: [
      { text: 'Dad drove down the road toward the old wooden bridge before it finally got dark outside.', target: 'Dad' },
      { text: 'It felt good to finally rest after walking down that long and dusty road all afternoon.', target: 'good' },
      { text: 'The red dog ran happily down the road, chasing after every car that passed by.', target: 'red' },
      { text: 'Her whole body ached after spending the entire day helping to move heavy furniture.', target: 'body' },
    ] },
  { symbol: 'k', category: 'consonant', examples: ['cat', 'sick', 'kitchen'], moreExamples: ['key', 'back', 'cookie', 'kick', 'milk', 'week', 'cake', 'black'],
    howTo: 'The back of the tongue touches the soft palate, then releases with a puff of air — voiceless.',
    sentences: [
      { text: 'The cat sat in the kitchen.', target: 'kitchen' },
      { text: 'She baked a cake last week.', target: 'cake' },
      { text: 'He kicked the black key back.', target: 'kicked' },
    ],
    longSentences: [
      { text: 'She carefully baked a chocolate cake in the kitchen while her brother cleaned the counter.', target: 'kitchen' },
      { text: 'The hungry cat wandered into the kitchen, meowing loudly for a bowl of warm milk.', target: 'milk' },
      { text: 'He accidentally kicked the old black key off the piano while rushing to answer the door.', target: 'kicked' },
      { text: 'We spent the entire week planning a surprise party complete with balloons and a huge cake.', target: 'week' },
    ] },
  { symbol: 'g', category: 'consonant', examples: ['go', 'big', 'garden'], moreExamples: ['get', 'bag', 'giggle', 'dog', 'game', 'guest', 'egg', 'ago'],
    howTo: 'The back of the tongue touches the soft palate, then releases — same spot as /k/ but voiced.',
    sentences: [
      { text: "Let's go play a game in the garden.", target: 'game' },
      { text: 'The dog dug a big hole.', target: 'dog' },
      { text: 'Our guest brought a bag of eggs.', target: 'guest' },
    ],
    longSentences: [
      { text: 'Our guests brought a big bag of eggs and vegetables from their garden for the weekend.', target: 'guests' },
      { text: 'Not long ago, we decided to go outside and play a quick game in the garden.', target: 'ago' },
      { text: 'The children began to giggle the moment the dog jumped straight into the garden pond.', target: 'giggle' },
      { text: 'It took a great deal of effort to get the heavy gate open before the storm arrived.', target: 'get' },
    ] },
  { symbol: 'f', category: 'consonant', examples: ['fan', 'leaf', 'coffee'], moreExamples: ['fun', 'life', 'phone', 'laugh', 'half', 'family'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through the gap — voiceless.',
    sentences: [
      { text: 'We had fun drinking coffee.', target: 'fun' },
      { text: 'My family laughed at the joke.', target: 'family' },
      { text: 'A leaf fell off the fan.', target: 'leaf' },
    ],
    longSentences: [
      { text: 'My whole family laughed for a long time after we watched that funny film together.', target: 'family' },
      { text: 'A single leaf drifted slowly past the window while the old fan spun quietly above.', target: 'leaf' },
      { text: 'We had so much fun catching up on life during our long phone call last night.', target: 'fun' },
      { text: 'Half the class arrived late because their bus broke down halfway through the journey.', target: 'Half' },
    ] },
  { symbol: 'v', category: 'consonant', examples: ['van', 'love', 'seven'], moreExamples: ['very', 'live', 'view', 'give', 'travel', 'movie'],
    howTo: 'Top teeth rest lightly on the bottom lip, air pushes through — same as /f/ but voiced, felt as a buzz on the lip.',
    sentences: [
      { text: 'I love watching a good movie.', target: 'movie' },
      { text: 'We travel in a van very often.', target: 'travel' },
      { text: 'Please give me a nice view.', target: 'view' },
    ],
    longSentences: [
      { text: 'We decided to travel across the country in a van so we could enjoy the whole view.', target: 'travel' },
      { text: 'I would really love to give you a better view of the mountains from up here.', target: 'love' },
      { text: 'They live very close to the cinema, so watching a movie is always convenient for them.', target: 'live' },
      { text: 'Please give the new employee a proper tour of the office before her first shift.', target: 'give' },
    ] },
  { symbol: 'θ', category: 'consonant', examples: ['think', 'bath', 'three'], moreExamples: ['thumb', 'tooth', 'birthday', 'math', 'nothing', 'thick', 'throw', 'mouth'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — voiceless, as in "think".',
    sentences: [
      { text: 'I think math is fun.', target: 'think' },
      { text: 'She hurt her thumb during the bath.', target: 'thumb' },
      { text: 'Nothing hurts more than a bad tooth.', target: 'tooth' },
    ],
    longSentences: [
      { text: 'I think most people agree that nothing feels worse than a sudden toothache in the morning.', target: 'think' },
      { text: 'She hurt her thumb while trying to throw a thick blanket over the old couch.', target: 'thumb' },
      { text: 'After a long, relaxing bath, he finally sat down to finish his difficult math homework.', target: 'bath' },
      { text: 'Nothing about the thin, narrow path through the woods felt safe once it got dark.', target: 'Nothing' },
    ] },
  { symbol: 'ð', category: 'consonant', examples: ['this', 'mother', 'weather'], moreExamples: ['that', 'brother', 'smooth', 'the', 'father', 'other'],
    howTo: 'Tongue tip pokes gently between the teeth, air hisses past it — same spot as /θ/ but voiced, as in "this".',
    sentences: [
      { text: 'This weather is lovely today.', target: 'weather' },
      { text: 'My mother and brother came together.', target: 'brother' },
      { text: 'That song sounded smooth and calm.', target: 'smooth' },
    ],
    longSentences: [
      { text: 'My mother always says that this kind of weather makes everyone feel a little tired.', target: 'mother' },
      { text: 'My brother borrowed the other jacket without asking anyone else in the house.', target: 'brother' },
      { text: 'That old song still sounds just as smooth and calm as it did years ago.', target: 'smooth' },
      { text: 'Rather than argue further, they decided to let the whole matter rest for now.', target: 'Rather' },
    ] },
  { symbol: 's', category: 'consonant', examples: ['sun', 'bus', 'city'], moreExamples: ['see', 'listen', 'sister', 'nice', 'sound', 'face'],
    howTo: 'Tongue tip near the ridge behind the teeth, a narrow channel hisses air out — voiceless.',
    sentences: [
      { text: 'The sun rose over the city.', target: 'sun' },
      { text: 'Listen to that nice sound.', target: 'Listen' },
      { text: 'My sister took the bus to see me.', target: 'sister' },
    ],
    longSentences: [
      { text: 'My little sister took the early bus into the city just to see her favorite singer perform.', target: 'sister' },
      { text: 'It was nice to finally listen to that calming sound while relaxing near the window.', target: 'listen' },
      { text: 'The bright sun lit up her face as she walked slowly through the busy city streets.', target: 'sun' },
      { text: 'Some students stayed after class simply to see the science experiment succeed.', target: 'Some' },
    ] },
  { symbol: 'z', category: 'consonant', examples: ['zoo', 'buzz', 'lazy'], moreExamples: ['zip', 'easy', 'music', 'zero', 'busy', 'these'],
    howTo: 'Same tongue position as /s/ — but voiced, felt as a buzz.',
    sentences: [
      { text: 'We visited the zoo on a lazy day.', target: 'lazy' },
      { text: "Zip up your bag, it's easy.", target: 'Zip' },
      { text: 'These days I stay busy with music.', target: 'busy' },
    ],
    longSentences: [
      { text: 'These days everyone seems far too busy to visit the zoo, even on a lazy weekend.', target: 'busy' },
      { text: 'It wasn\'t easy to zip up the tent while the music blared loudly nearby.', target: 'easy' },
      { text: 'The temperature dropped to nearly zero just as the buzzing insects finally went quiet outside.', target: 'zero' },
      { text: 'She seemed puzzled by how quickly the busy street had suddenly gone completely silent.', target: 'puzzled' },
    ] },
  { symbol: 'ʃ', category: 'consonant', examples: ['she', 'wash', 'sugar'], moreExamples: ['shop', 'wish', 'nation', 'sure', 'shoe', 'fish', 'station', 'special'],
    howTo: 'Tongue pulled back a little further than /s/, lips slightly rounded — voiceless "sh".',
    sentences: [
      { text: 'She went to the shop for sugar.', target: 'shop' },
      { text: 'I wish I could wash my shoe.', target: 'wish' },
      { text: 'We waited at the station this morning.', target: 'station' },
    ],
    longSentences: [
      { text: 'She wished she could wash her new shoes before wearing them to the special occasion.', target: 'wished' },
      { text: 'We waited at the station, unsure whether the shop would still be open that late.', target: 'station' },
      { text: 'The whole nation watched closely as the fishing boats finally returned to the shore.', target: 'nation' },
      { text: 'He was too shy to share his honest opinion during the noisy school assembly.', target: 'shy' },
    ] },
  { symbol: 'ʒ', category: 'consonant', examples: ['vision', 'treasure', 'usual'], moreExamples: ['pleasure', 'measure', 'garage', 'decision', 'casual', 'television', 'occasion', 'leisure'],
    howTo: 'Same tongue position as /ʃ/ — but voiced. Rare in English, and almost never at the start of a word.',
    sentences: [
      { text: 'It was a pleasure to make this decision.', target: 'pleasure' },
      { text: 'We watched television for leisure.', target: 'television' },
      { text: 'The treasure was hidden in the garage.', target: 'treasure' },
    ],
    longSentences: [
      { text: 'It was a genuine pleasure to watch the decision bring so much pleasure to everyone in the room.', target: 'pleasure' },
      { text: 'We spent a casual evening watching television and talking about our shared vision for the future.', target: 'casual' },
      { text: 'The old treasure map had been hidden somewhere inside the garage for nearly thirty years.', target: 'treasure' },
      { text: 'Her sudden decision to move overseas came as quite a surprise to her closest friends.', target: 'decision' },
    ] },
  { symbol: 'h', category: 'consonant', examples: ['hat', 'house', 'ahead'], moreExamples: ['hello', 'home', 'behind', 'hope', 'happy', 'help', 'who', 'hand'],
    howTo: 'A light puff of breath from the throat, with no contact between tongue and mouth — voiceless.',
    sentences: [
      { text: 'Hello, is anyone home?', target: 'Hello' },
      { text: 'I hope you are happy at the house.', target: 'happy' },
      { text: 'Hurry home before it gets dark.', target: 'Hurry' },
    ],
    longSentences: [
      { text: 'I really hope you feel happy and healthy at home once the holidays finally arrive.', target: 'hope' },
      { text: 'Hurry home before it gets dark, because the road ahead can be quite dangerous at night.', target: 'Hurry' },
      { text: 'Hello again, is anyone still waiting behind the old house near the hill?', target: 'Hello' },
      { text: 'He hoped his handwriting would look neat enough for the teacher to read easily.', target: 'hoped' },
    ] },
  { symbol: 'tʃ', category: 'consonant', examples: ['chair', 'watch', 'teacher'], moreExamples: ['church', 'catch', 'cheese', 'kitchen', 'much', 'teach', 'match', 'question'],
    howTo: 'A /t/ released straight into /ʃ/ in one quick motion — voiceless, as in "church".',
    sentences: [
      { text: 'The teacher sat on a chair.', target: 'teacher' },
      { text: "Let's watch the football match.", target: 'match' },
      { text: 'I have a question about the church.', target: 'church' },
    ],
    longSentences: [
      { text: 'The teacher watched the exciting match from her chair while grading a stack of questions.', target: 'teacher' },
      { text: 'We walked past the old church just before the football match finally began downtown.', target: 'church' },
      { text: 'It took much longer than expected to teach the children how to catch a ball.', target: 'teach' },
      { text: 'The kitchen smelled of fresh cheese while everyone waited eagerly for lunch to start.', target: 'kitchen' },
    ] },
  { symbol: 'dʒ', category: 'consonant', examples: ['jump', 'bridge', 'danger'], moreExamples: ['judge', 'age', 'giant', 'gym', 'large', 'magic', 'enjoy', 'general'],
    howTo: 'A /d/ released straight into /ʒ/ in one quick motion — voiced, as in "judge".',
    sentences: [
      { text: 'The judge crossed the large bridge.', target: 'judge' },
      { text: 'We enjoy going to the gym.', target: 'gym' },
      { text: 'The giant jumped over the huge bridge.', target: 'giant' },
    ],
    longSentences: [
      { text: 'The judge slowly crossed the enormous bridge on her way to the courthouse downtown.', target: 'judge' },
      { text: 'Even at a young age, she truly seemed to enjoy every single visit to the gym.', target: 'enjoy' },
      { text: 'A giant crane towered over the bridge while workers finished the large construction project.', target: 'giant' },
      { text: 'The general manager announced some major changes during the meeting this morning.', target: 'general' },
    ] },
  { symbol: 'm', category: 'consonant', examples: ['man', 'summer', 'drum'], moreExamples: ['mum', 'animal', 'moon', 'family', 'time', 'room'],
    howTo: 'Lips press together, air hums out through the nose — voiced.',
    sentences: [
      { text: 'My mum plays the drum in summer.', target: 'mum' },
      { text: 'The man walked into the room.', target: 'room' },
      { text: 'We spent family time under the moon.', target: 'moon' },
    ],
    longSentences: [
      { text: 'My mum spent the whole summer teaching me how to play the drum in our tiny room.', target: 'mum' },
      { text: 'The whole family gathered in the small room to watch the bright full moon rise.', target: 'family' },
      { text: 'It always takes time for a wild animal to feel comfortable around new people.', target: 'animal' },
      { text: 'Every summer, tomatoes grow quickly in the small garden behind my mother\'s old house.', target: 'summer' },
    ] },
  { symbol: 'n', category: 'consonant', examples: ['no', 'sun', 'dinner'], moreExamples: ['nine', 'banana', 'name', 'window', 'morning', 'run'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air hums out through the nose — voiced.',
    sentences: [
      { text: 'We had dinner at nine tonight.', target: 'nine' },
      { text: 'Say your name near the window.', target: 'name' },
      { text: 'I run every morning under the sun.', target: 'run' },
    ],
    longSentences: [
      { text: "We finally had dinner near nine o'clock, long after the sun had set behind the mountains.", target: 'dinner' },
      { text: 'Every morning she likes to run past the window before eating a banana for breakfast.', target: 'morning' },
      { text: 'Nobody could remember the name of the singer whose song played through the open window.', target: 'name' },
      { text: 'Nine of the students arrived early, eager to begin the new science project.', target: 'Nine' },
    ] },
  { symbol: 'ŋ', category: 'consonant', examples: ['sing', 'king', 'morning'], moreExamples: ['thing', 'long', 'singer', 'tongue', 'bank', 'think', 'young', 'english'],
    howTo: 'Back of the tongue touches the soft palate, air hums out through the nose — never appears at the start of an English word.',
    sentences: [
      { text: 'The king sang a long song this morning.', target: 'king' },
      { text: 'That singer is still very young.', target: 'young' },
      { text: 'I think English is an interesting thing.', target: 'thing' },
    ],
    longSentences: [
      { text: 'The young king sang a surprisingly long song during the morning ceremony in the palace.', target: 'king' },
      { text: 'I think the strangest thing about learning English is how differently some words are pronounced.', target: 'think' },
      { text: 'The old king ruled for such a long time that most people forgot the previous ruler.', target: 'long' },
      { text: 'She hopes to become a professional singer someday, even though she\'s still quite young.', target: 'singer' },
    ] },
  { symbol: 'l', category: 'consonant', examples: ['leg', 'ball', 'yellow'], moreExamples: ['love', 'tell', 'apple', 'light', 'people', 'well'],
    howTo: 'Tongue tip touches the ridge behind the teeth, air flows around the sides of the tongue — voiced.',
    sentences: [
      { text: 'She kicked the yellow ball.', target: 'yellow' },
      { text: 'Tell people you love the light.', target: 'light' },
      { text: 'He hurt his leg quite badly.', target: 'leg' },
    ],
    longSentences: [
      { text: 'Tell everyone you love that the light in the old hallway finally works again.', target: 'light' },
      { text: 'People often kick a yellow ball across the field long after the sun goes down.', target: 'yellow' },
      { text: 'He hurt his leg quite badly, yet he still finished the entire race extremely well.', target: 'leg' },
      { text: 'Little by little, she learned to love the quiet little town she now called home.', target: 'Little' },
    ] },
  { symbol: 'r', category: 'consonant', examples: ['red', 'carry', 'sorry'], moreExamples: ['run', 'very', 'road', 'right', 'green', 'story'],
    howTo: 'Tongue curls back slightly without touching the roof of the mouth — voiced, no trill in English.',
    sentences: [
      { text: 'She carried a red bag down the road.', target: 'carried' },
      { text: "I'm very sorry about the story.", target: 'sorry' },
      { text: 'Run right along the green path.', target: 'right' },
    ],
    longSentences: [
      { text: 'I\'m terribly sorry I carried the wrong bag all the way down the long road home.', target: 'sorry' },
      { text: 'She told a very strange story about running through a green field at midnight.', target: 'story' },
      { text: 'Run right along the narrow road until you reach the old red farmhouse ahead.', target: 'right' },
      { text: 'Every runner carried a small red flag while racing around the muddy track.', target: 'runner' },
    ] },
  { symbol: 'j', category: 'consonant', examples: ['yes', 'yellow', 'use'], moreExamples: ['you', 'few', 'music', 'year', 'university', 'yesterday'],
    howTo: 'Tongue high and forward like /iː/, then glides quickly into the next vowel — voiced, as in "yes".',
    sentences: [
      { text: 'Yes, you can use my yellow pen.', target: 'use' },
      { text: 'I met few people at the university.', target: 'university' },
      { text: 'We listened to music yesterday.', target: 'yesterday' },
    ],
    longSentences: [
      { text: 'Yes, you can absolutely use my notes from the university lecture we attended yesterday.', target: 'university' },
      { text: 'Only a few students stayed late to listen to music after the yellow bus left.', target: 'few' },
      { text: 'This year, you should really consider studying music somewhere far from your hometown.', target: 'year' },
      { text: 'Use your imagination whenever you write a story for your university writing class.', target: 'Use' },
    ] },
  { symbol: 'w', category: 'consonant', examples: ['wet', 'away', 'swim'], moreExamples: ['window', 'sweet', 'quick', 'one', 'work', 'west', 'always', 'twenty'],
    howTo: 'Lips round tightly like /uː/, then glide quickly into the next vowel — voiced, as in "wet".',
    sentences: [
      { text: 'The window got wet in the west wind.', target: 'wet' },
      { text: 'We always swim away quickly.', target: 'swim' },
      { text: 'Work always starts at one.', target: 'Work' },
    ],
    longSentences: [
      { text: 'We always swim away from the wet window whenever the weather suddenly turns windy.', target: 'swim' },
      { text: 'Work always starts early on weekdays, long before the sun rises over the western hills.', target: 'Work' },
      { text: 'The quick fox darted away just as the twenty children ran past the old well.', target: 'quick' },
      { text: 'She waited by the window, watching the wet leaves swirl around in the westerly wind.', target: 'window' },
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
 *  sentence-practice pool. Each sound's short and long sentences are pooled
 *  together (not split by a filter), so a round can land on either. An empty
 *  list means no focus: every sound's sentences are fair game, same
 *  convention as `pairsForSymbol`'s callers falling back to the full
 *  `MINIMAL_PAIRS` list. */
export function sentencesForSymbols(symbols: string[]): IpaSentenceRound[] {
  const sounds = symbols.length > 0 ? IPA_SOUNDS.filter((s) => symbols.includes(s.symbol)) : IPA_SOUNDS;
  return sounds.flatMap((s) => [...s.sentences, ...s.longSentences].map((sentence) => ({ symbol: s.symbol, sentence })));
}

// No curated video ID here — a wrong/dead link would be worse than a search.
// A YouTube search for the symbol reliably surfaces real pronunciation guides.
export function youtubeSearchUrl(symbol: string): string {
  const query = `how to pronounce IPA ${symbol} sound English`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
