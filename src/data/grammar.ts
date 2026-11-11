// The Grammar course: lessons in the order they're meant to be learned, each
// a short rule, a few examples, a note on why Vietnamese speakers tend to get
// it wrong, and a round of drills. Static content, the same for everyone, so
// it lives here rather than being generated — progress is the only per-user
// part (useGrammarProgress / the `grammar` resource).
//
// Lesson ids are stored server-side as slugs: renaming one orphans everyone's
// progress on it. Add new lessons anywhere; never reuse an id.
//
// Prose is `{ en, vi }` — content keyed by lesson, not UI strings, so it sits
// beside the data like ipaVi.ts rather than in the message catalogs. English
// example sentences and drills stay English in both: they're what's learned.
// `**word**` in an example marks the part the lesson is about.

export type GrammarLevel = 'A1' | 'A2';

export interface Text { en: string; vi: string }

export type Drill =
  /** Fill the gap: `prompt` contains `___`, `answer` indexes `options`. */
  | { kind: 'choice'; prompt: string; options: string[]; answer: number }
  /** Tap the wrong word: `wrong` is one word of `sentence` (unique in it,
   *  ignoring punctuation), `correct` the whole sentence put right. */
  | { kind: 'error'; sentence: string; wrong: string; correct: string }
  /** Build the sentence: `chunks` in the right order — shuffled for display. */
  | { kind: 'order'; chunks: string[] };

export interface GrammarLesson {
  id: string;
  level: GrammarLevel;
  title: Text;
  /** One line for the course list. */
  summary: Text;
  /** The form, as formula lines — English, since it's the English form. */
  pattern: string[];
  rule: Text;
  examples: string[];
  /** Why this trips up Vietnamese speakers, and what to watch for. */
  viNote: Text;
  drills: Drill[];
}

export const GRAMMAR_LEVELS: { level: GrammarLevel; title: Text }[] = [
  { level: 'A1', title: { en: 'Beginner', vi: 'Sơ cấp' } },
  { level: 'A2', title: { en: 'Elementary', vi: 'Cơ bản' } },
];

export const GRAMMAR_LESSONS: GrammarLesson[] = [
  // ─── A1 ───────────────────────────────────────────────────────────
  {
    id: 'be-present',
    level: 'A1',
    title: { en: 'am / is / are', vi: 'am / is / are' },
    summary: { en: 'The verb "to be" in the present', vi: 'Động từ "to be" ở hiện tại' },
    pattern: ['I + am', 'he / she / it + is', 'you / we / they + are'],
    rule: {
      en: 'Use "be" to say who or what something is, and to describe it with an adjective, a place or an age. Every English sentence needs a verb, so "be" can’t be left out.',
      vi: 'Dùng "be" để nói ai/cái gì là gì, và để mô tả bằng tính từ, nơi chốn hay tuổi. Câu tiếng Anh nào cũng cần động từ, nên không được bỏ "be".',
    },
    examples: ['I **am** a student.', 'She **is** tired today.', 'They **are** at home.', 'My brother **is** 20 years old.'],
    viNote: {
      en: 'Vietnamese says "Tôi mệt" (I tired) and "Cô ấy đẹp" (she beautiful) with no verb. English needs one: "I am tired", "She is beautiful". Also, age uses "be": "I am 20", not "I have 20".',
      vi: 'Tiếng Việt nói "Tôi mệt", "Cô ấy đẹp" mà không cần động từ. Tiếng Anh thì phải có: "I am tired", "She is beautiful". Tuổi cũng dùng "be": "I am 20", không phải "I have 20".',
    },
    drills: [
      { kind: 'choice', prompt: 'My parents ___ teachers.', options: ['is', 'are', 'am'], answer: 1 },
      { kind: 'choice', prompt: 'I ___ very hungry now.', options: ['am', 'is', 'are'], answer: 0 },
      { kind: 'choice', prompt: 'The weather ___ nice today.', options: ['are', 'be', 'is'], answer: 2 },
      { kind: 'error', sentence: 'She very happy today.', wrong: 'very', correct: 'She is very happy today.' },
      { kind: 'error', sentence: 'We is from Vietnam.', wrong: 'is', correct: 'We are from Vietnam.' },
      { kind: 'order', chunks: ['My sister', 'is', 'a nurse', 'in Hanoi.'] },
      { kind: 'order', chunks: ['The children', 'are', 'in the garden.'] },
    ],
  },
  {
    id: 'plural-nouns',
    level: 'A1',
    title: { en: 'Plural nouns', vi: 'Danh từ số nhiều' },
    summary: { en: 'one book → two books', vi: 'one book → two books' },
    pattern: ['noun + s  (book → books)', 'noun + es  after s, sh, ch, x  (box → boxes)', 'consonant + y → ies  (city → cities)', 'irregular: man → men, child → children, person → people'],
    rule: {
      en: 'When there is more than one, the noun changes — usually by adding -s. Numbers and words like "many", "some", "a lot of" still need the plural.',
      vi: 'Khi có nhiều hơn một, danh từ phải đổi — thường là thêm -s. Dù đã có số hay "many", "some", "a lot of" thì danh từ vẫn phải ở số nhiều.',
    },
    examples: ['I have two **brothers**.', 'There are many **buses** on this road.', 'Three **children** are playing.', 'She visited five **cities**.'],
    viNote: {
      en: 'Vietnamese marks "more than one" with words like "những", "các" or a number, and the noun stays the same. In English the noun itself must change: "two book" is wrong, it’s "two books" — and say the final /s/.',
      vi: 'Tiếng Việt dùng "những", "các" hoặc con số, còn danh từ giữ nguyên. Tiếng Anh thì chính danh từ phải đổi: "two book" là sai, phải là "two books" — và nhớ phát âm âm /s/ cuối.',
    },
    drills: [
      { kind: 'choice', prompt: 'I bought three ___ yesterday.', options: ['book', 'books', 'bookes'], answer: 1 },
      { kind: 'choice', prompt: 'There are ten ___ in the class.', options: ['childs', 'child', 'children'], answer: 2 },
      { kind: 'choice', prompt: 'Put the ___ on the table.', options: ['boxes', 'boxs', 'box'], answer: 0 },
      { kind: 'error', sentence: 'She has two cat and a dog.', wrong: 'cat', correct: 'She has two cats and a dog.' },
      { kind: 'error', sentence: 'Many people live in big citys.', wrong: 'citys', correct: 'Many people live in big cities.' },
      { kind: 'order', chunks: ['We need', 'four', 'chairs', 'for the meeting.'] },
      { kind: 'order', chunks: ['Those', 'women', 'are', 'doctors.'] },
    ],
  },
  {
    id: 'articles-a-an',
    level: 'A1',
    title: { en: 'a / an', vi: 'a / an' },
    summary: { en: 'One of something: a cat, an apple', vi: 'Một cái gì đó: a cat, an apple' },
    pattern: ['a + consonant sound  (a car, a university)', 'an + vowel sound  (an egg, an hour)'],
    rule: {
      en: 'Use "a" or "an" before one countable thing, the first time you mention it, and for jobs. Choose by the first sound, not the first letter: "a university" (/j/), "an hour" (silent h).',
      vi: 'Dùng "a" hoặc "an" trước một vật đếm được, khi nhắc đến lần đầu, và trước nghề nghiệp. Chọn theo âm đầu, không theo chữ cái: "a university" (âm /j/), "an hour" (h câm).',
    },
    examples: ['I have **a** car.', 'She is **an** engineer.', 'Wait **an** hour.', 'He studies at **a** university.'],
    viNote: {
      en: 'Vietnamese has no word like "a/an", so it’s easy to drop: "I am student", "She has car". A single countable noun almost never stands alone in English. Jobs need it too: "I am a teacher".',
      vi: 'Tiếng Việt không có từ như "a/an", nên rất dễ bỏ sót: "I am student", "She has car". Danh từ đếm được số ít gần như không bao giờ đứng một mình. Nghề nghiệp cũng cần: "I am a teacher".',
    },
    drills: [
      { kind: 'choice', prompt: 'She eats ___ apple every morning.', options: ['a', 'an', '—'], answer: 1 },
      { kind: 'choice', prompt: 'My father is ___ doctor.', options: ['—', 'an', 'a'], answer: 2 },
      { kind: 'choice', prompt: 'It takes ___ hour to get there.', options: ['an', 'a', '—'], answer: 0 },
      { kind: 'error', sentence: 'I am student at this school.', wrong: 'student', correct: 'I am a student at this school.' },
      { kind: 'error', sentence: 'He bought an new phone.', wrong: 'an', correct: 'He bought a new phone.' },
      { kind: 'order', chunks: ['She', 'is', 'an', 'English teacher.'] },
      { kind: 'order', chunks: ['I', 'want', 'a', 'cup of coffee.'] },
    ],
  },
  {
    id: 'article-the',
    level: 'A1',
    title: { en: 'the', vi: 'the' },
    summary: { en: 'The one we both know', vi: 'Cái mà cả hai đều biết' },
    pattern: ['a / an + first mention', 'the + something already known or the only one', 'no article + things in general (plural / uncountable)'],
    rule: {
      en: 'Use "the" when the listener knows which one you mean: you mentioned it before, there is only one (the sun), or it’s clear from the situation (close the door). For things in general, use no article: "Dogs are friendly", "I like music".',
      vi: 'Dùng "the" khi người nghe biết bạn nói cái nào: đã nhắc trước đó, chỉ có một (the sun), hoặc rõ từ ngữ cảnh (close the door). Khi nói chung chung thì không dùng mạo từ: "Dogs are friendly", "I like music".',
    },
    examples: ['I saw a dog. **The** dog was black.', '**The** sun is very hot today.', 'Please open **the** window.', 'I like coffee. (coffee in general)'],
    viNote: {
      en: 'Vietnamese "cái", "con" or "này/đó" sometimes work like "the", but often nothing is said. Ask yourself: does the listener know which one? Yes → "the". Talking in general → nothing.',
      vi: '"cái", "con" hay "này/đó" đôi khi giống "the", nhưng thường tiếng Việt không nói gì cả. Hãy tự hỏi: người nghe có biết là cái nào không? Có → "the". Nói chung chung → không dùng.',
    },
    drills: [
      { kind: 'choice', prompt: 'I bought a shirt and a hat. ___ hat was cheap.', options: ['A', 'The', '—'], answer: 1 },
      { kind: 'choice', prompt: '___ moon looks big tonight.', options: ['The', 'A', '—'], answer: 0 },
      { kind: 'choice', prompt: 'I love ___ music.', options: ['the', 'a', '—'], answer: 2 },
      { kind: 'error', sentence: 'Can you close a door, please?', wrong: 'a', correct: 'Can you close the door, please?' },
      { kind: 'error', sentence: 'The cats are cute animals.', wrong: 'The', correct: 'Cats are cute animals.' },
      { kind: 'order', chunks: ['The', 'teacher', 'is', 'in', 'the', 'classroom.'] },
      { kind: 'order', chunks: ['I', 'like', 'books', 'about', 'history.'] },
    ],
  },
  {
    id: 'present-simple',
    level: 'A1',
    title: { en: 'Present simple', vi: 'Thì hiện tại đơn' },
    summary: { en: 'I work, she works', vi: 'I work, she works' },
    pattern: ['I / you / we / they + verb', 'he / she / it + verb + s  (works, goes, watches, studies)', 'have → has'],
    rule: {
      en: 'Use the present simple for habits, routines and facts. With he, she, it — or one person or thing — add -s to the verb.',
      vi: 'Dùng hiện tại đơn cho thói quen, việc thường ngày và sự thật. Với he, she, it — hoặc một người/vật — thêm -s vào động từ.',
    },
    examples: ['I **work** in an office.', 'She **works** in a hospital.', 'My son **goes** to school by bus.', 'Water **boils** at 100 degrees.'],
    viNote: {
      en: 'Vietnamese verbs never change: "tôi làm", "cô ấy làm". In English the -s after he/she/it is required, and it’s one of the most common mistakes: "He go", "She like". Say the final /s/ or /z/ out loud too.',
      vi: 'Động từ tiếng Việt không bao giờ đổi: "tôi làm", "cô ấy làm". Trong tiếng Anh, -s sau he/she/it là bắt buộc, và đây là lỗi rất hay gặp: "He go", "She like". Nhớ phát âm cả âm /s/ hoặc /z/ cuối.',
    },
    drills: [
      { kind: 'choice', prompt: 'My mother ___ breakfast at 6 a.m.', options: ['cook', 'cooks', 'cooking'], answer: 1 },
      { kind: 'choice', prompt: 'They ___ football every Sunday.', options: ['play', 'plays', 'playing'], answer: 0 },
      { kind: 'choice', prompt: 'He ___ English at university.', options: ['study', 'studys', 'studies'], answer: 2 },
      { kind: 'error', sentence: 'She go to work by motorbike.', wrong: 'go', correct: 'She goes to work by motorbike.' },
      { kind: 'error', sentence: 'My brother have a new job.', wrong: 'have', correct: 'My brother has a new job.' },
      { kind: 'order', chunks: ['He', 'watches', 'TV', 'every evening.'] },
      { kind: 'order', chunks: ['We', 'live', 'near', 'the river.'] },
    ],
  },
  {
    id: 'present-simple-questions',
    level: 'A1',
    title: { en: 'do / does: questions and negatives', vi: 'do / does: câu hỏi và phủ định' },
    summary: { en: 'Do you…? She doesn’t…', vi: 'Do you…? She doesn’t…' },
    pattern: ['Do / Does + subject + verb?', 'subject + don’t / doesn’t + verb', 'does / doesn’t + base verb (no -s)'],
    rule: {
      en: 'Questions and negatives in the present simple need "do" or "does". With he/she/it the -s moves to "does", so the main verb goes back to its base form: "Does she like…?", "She doesn’t like…".',
      vi: 'Câu hỏi và phủ định ở hiện tại đơn cần "do" hoặc "does". Với he/she/it, -s chuyển sang "does", nên động từ chính trở về dạng gốc: "Does she like…?", "She doesn’t like…".',
    },
    examples: ['**Do** you speak English?', '**Does** he live here?', 'I **don’t** eat meat.', 'She **doesn’t** like coffee.'],
    viNote: {
      en: 'Vietnamese makes questions by adding "không?" at the end and negatives with "không" before the verb. English needs the helper verb: "You like it?" → "Do you like it?", "He not like it" → "He doesn’t like it".',
      vi: 'Tiếng Việt đặt câu hỏi bằng "…không?" ở cuối và phủ định bằng "không" trước động từ. Tiếng Anh cần trợ động từ: "You like it?" → "Do you like it?", "He not like it" → "He doesn’t like it".',
    },
    drills: [
      { kind: 'choice', prompt: '___ your sister work here?', options: ['Do', 'Does', 'Is'], answer: 1 },
      { kind: 'choice', prompt: 'I ___ understand this word.', options: ['don’t', 'doesn’t', 'not'], answer: 0 },
      { kind: 'choice', prompt: 'He doesn’t ___ spicy food.', options: ['likes', 'liking', 'like'], answer: 2 },
      { kind: 'error', sentence: 'Does she speaks French?', wrong: 'speaks', correct: 'Does she speak French?' },
      { kind: 'error', sentence: 'My father not drink coffee.', wrong: 'not', correct: 'My father doesn’t drink coffee.' },
      { kind: 'order', chunks: ['Do', 'you', 'live', 'near here?'] },
      { kind: 'order', chunks: ['She', 'doesn’t', 'work', 'on Saturdays.'] },
    ],
  },
  {
    id: 'this-that',
    level: 'A1',
    title: { en: 'this / that / these / those', vi: 'this / that / these / those' },
    summary: { en: 'Near or far, one or many', vi: 'Gần hay xa, một hay nhiều' },
    pattern: ['near: this + singular · these + plural', 'far: that + singular · those + plural'],
    rule: {
      en: 'Use "this/these" for things near you and "that/those" for things further away. The word must match the noun: one thing → this/that, more than one → these/those.',
      vi: 'Dùng "this/these" cho vật ở gần và "that/those" cho vật ở xa. Phải hợp với danh từ: một vật → this/that, nhiều vật → these/those.',
    },
    examples: ['**This** bag is mine.', '**These** shoes are new.', 'Look at **that** bird!', '**Those** people are my neighbours.'],
    viNote: {
      en: 'Vietnamese "này" and "đó/kia" don’t change for plural ("những cái này"). In English they do: "this books" is wrong — it’s "these books". And remember the noun needs -s too.',
      vi: '"này" và "đó/kia" trong tiếng Việt không đổi theo số nhiều ("những cái này"). Tiếng Anh thì có: "this books" là sai — phải là "these books". Và danh từ cũng phải thêm -s.',
    },
    drills: [
      { kind: 'choice', prompt: '___ apples here are very sweet.', options: ['This', 'These', 'That'], answer: 1 },
      { kind: 'choice', prompt: 'Who is ___ man over there?', options: ['that', 'those', 'these'], answer: 0 },
      { kind: 'choice', prompt: 'Can you see ___ mountains in the distance?', options: ['this', 'that', 'those'], answer: 2 },
      { kind: 'error', sentence: 'This shoes are too small.', wrong: 'This', correct: 'These shoes are too small.' },
      { kind: 'error', sentence: 'Those car is very expensive.', wrong: 'Those', correct: 'That car is very expensive.' },
      { kind: 'order', chunks: ['These', 'flowers', 'are', 'for you.'] },
      { kind: 'order', chunks: ['Is', 'that', 'your', 'house?'] },
    ],
  },
  {
    id: 'possessives',
    level: 'A1',
    title: { en: 'my / your / his… and ’s', vi: 'my / your / his… và ’s' },
    summary: { en: 'Saying who something belongs to', vi: 'Nói vật gì thuộc về ai' },
    pattern: ['I → my · you → your · he → his · she → her', 'it → its · we → our · they → their', 'person + ’s + thing  (Lan’s phone)'],
    rule: {
      en: 'Put the owner before the thing: "my book", "Lan’s phone". "His" is for a man, "her" for a woman — it follows the owner, not the thing.',
      vi: 'Người sở hữu đứng trước vật: "my book", "Lan’s phone". "His" dùng cho nam, "her" cho nữ — theo người sở hữu, không theo đồ vật.',
    },
    examples: ['This is **my** brother.', '**Her** car is red.', '**Nam’s** house is near the park.', 'The dog is eating **its** food.'],
    viNote: {
      en: 'Vietnamese puts the owner after the thing: "điện thoại của Lan". English flips it: "Lan’s phone", not "phone of Lan". And Vietnamese "anh ấy/cô ấy" are easy to mix up as "he/she" and "his/her" when speaking fast — check which one you mean.',
      vi: 'Tiếng Việt đặt người sở hữu sau: "điện thoại của Lan". Tiếng Anh thì ngược lại: "Lan’s phone", không phải "phone of Lan". Khi nói nhanh rất dễ nhầm "he/she" và "his/her" — hãy kiểm tra mình đang nói về ai.',
    },
    drills: [
      { kind: 'choice', prompt: 'Linh lost ___ keys this morning.', options: ['his', 'her', 'their'], answer: 1 },
      { kind: 'choice', prompt: 'We love ___ new apartment.', options: ['our', 'us', 'we'], answer: 0 },
      { kind: 'choice', prompt: 'This is ___ bike.', options: ['Minh', 'of Minh', 'Minh’s'], answer: 2 },
      { kind: 'error', sentence: 'My son brushes her teeth every morning.', wrong: 'her', correct: 'My son brushes his teeth every morning.' },
      { kind: 'error', sentence: 'They forgot they passports.', wrong: 'they', correct: 'They forgot their passports.' },
      { kind: 'order', chunks: ['My', 'friend’s', 'name', 'is', 'Hoa.'] },
      { kind: 'order', chunks: ['Is', 'this', 'your', 'umbrella?'] },
    ],
  },
  {
    id: 'there-is-are',
    level: 'A1',
    title: { en: 'there is / there are', vi: 'there is / there are' },
    summary: { en: 'Saying something exists', vi: 'Nói có cái gì đó' },
    pattern: ['there is + a / an + singular', 'there is + uncountable  (there is some milk)', 'there are + plural'],
    rule: {
      en: 'Use "there is / there are" to say something exists or is in a place. The verb matches the first noun after it.',
      vi: 'Dùng "there is / there are" để nói có cái gì đó tồn tại hoặc ở đâu đó. Động từ hợp với danh từ đứng ngay sau.',
    },
    examples: ['**There is** a bank near my house.', '**There are** two cafés on this street.', '**There is** some water in the bottle.', '**Are there** any questions?'],
    viNote: {
      en: 'Vietnamese uses "có": "Có một ngân hàng gần nhà tôi". Translating it as "have" is a common mistake: "Have a bank near my house". Use "there is" when something exists; "have" is for owning.',
      vi: 'Tiếng Việt dùng "có": "Có một ngân hàng gần nhà tôi". Dịch thành "have" là lỗi phổ biến: "Have a bank near my house". Dùng "there is" khi nói cái gì tồn tại; "have" là để nói sở hữu.',
    },
    drills: [
      { kind: 'choice', prompt: '___ three bedrooms in our house.', options: ['There is', 'There are', 'Have'], answer: 1 },
      { kind: 'choice', prompt: '___ a cat on the roof.', options: ['There is', 'There are', 'It has'], answer: 0 },
      { kind: 'choice', prompt: 'Is there ___ milk in the fridge?', options: ['many', 'a', 'any'], answer: 2 },
      { kind: 'error', sentence: 'Have many students in my class.', wrong: 'Have', correct: 'There are many students in my class.' },
      { kind: 'error', sentence: 'There is five books on the desk.', wrong: 'is', correct: 'There are five books on the desk.' },
      { kind: 'order', chunks: ['There', 'is', 'a', 'park', 'near here.'] },
      { kind: 'order', chunks: ['Are', 'there', 'any', 'shops', 'nearby?'] },
    ],
  },
  {
    id: 'can-cant',
    level: 'A1',
    title: { en: 'can / can’t', vi: 'can / can’t' },
    summary: { en: 'Ability and permission', vi: 'Khả năng và sự cho phép' },
    pattern: ['subject + can / can’t + base verb', 'Can + subject + base verb?', 'no -s, no "to": she can swim'],
    rule: {
      en: 'Use "can" for ability ("I can swim") and to ask or give permission ("Can I sit here?"). The verb after "can" is always the base form — no -s, no "to", no -ing.',
      vi: 'Dùng "can" để nói khả năng ("I can swim") và để xin/cho phép ("Can I sit here?"). Động từ sau "can" luôn ở dạng gốc — không -s, không "to", không -ing.',
    },
    examples: ['She **can** speak three languages.', 'I **can’t** drive.', '**Can** you help me?', '**Can** I open the window?'],
    viNote: {
      en: 'Vietnamese "có thể" and "biết" (biết bơi) both often become "can". Watch the verb after it: "She can sings" and "I can to swim" are both wrong. Ask with "Can you…?", not "You can…?".',
      vi: '"có thể" và "biết" (biết bơi) thường đều dịch là "can". Chú ý động từ theo sau: "She can sings" và "I can to swim" đều sai. Hỏi bằng "Can you…?", không phải "You can…?".',
    },
    drills: [
      { kind: 'choice', prompt: 'My grandmother can ___ very well.', options: ['cooks', 'cook', 'to cook'], answer: 1 },
      { kind: 'choice', prompt: '___ I use your phone?', options: ['Can', 'Do', 'Am'], answer: 0 },
      { kind: 'choice', prompt: 'I’m sorry, I ___ come tomorrow.', options: ['don’t can', 'not can', 'can’t'], answer: 2 },
      { kind: 'error', sentence: 'He can plays the guitar.', wrong: 'plays', correct: 'He can play the guitar.' },
      { kind: 'error', sentence: 'We can to see the sea from here.', wrong: 'to', correct: 'We can see the sea from here.' },
      { kind: 'order', chunks: ['Can', 'you', 'speak', 'more slowly?'] },
      { kind: 'order', chunks: ['She', 'can’t', 'ride', 'a bike.'] },
    ],
  },
  {
    id: 'present-continuous',
    level: 'A1',
    title: { en: 'Present continuous', vi: 'Thì hiện tại tiếp diễn' },
    summary: { en: 'I am working right now', vi: 'I am working — đang làm' },
    pattern: ['am / is / are + verb-ing', 'Are you + verb-ing?', 'make → making · sit → sitting'],
    rule: {
      en: 'Use the present continuous for something happening now or around now. It needs both parts: "be" and the -ing verb.',
      vi: 'Dùng hiện tại tiếp diễn cho việc đang xảy ra lúc này hoặc trong khoảng thời gian này. Cần đủ hai phần: "be" và động từ -ing.',
    },
    examples: ['I **am reading** a book.', 'She **is cooking** dinner now.', 'They **are waiting** for the bus.', 'What **are** you **doing**?'],
    viNote: {
      en: 'Vietnamese just adds "đang": "Tôi đang đọc". English needs "be" + -ing — "I reading" and "I am read" are both incomplete. Also, verbs like "like", "want", "know" don’t usually take -ing: "I want", not "I am wanting".',
      vi: 'Tiếng Việt chỉ cần thêm "đang": "Tôi đang đọc". Tiếng Anh cần "be" + -ing — "I reading" và "I am read" đều thiếu. Các động từ như "like", "want", "know" thường không dùng -ing: "I want", không phải "I am wanting".',
    },
    drills: [
      { kind: 'choice', prompt: 'Be quiet! The baby ___.', options: ['sleeps', 'is sleeping', 'sleeping'], answer: 1 },
      { kind: 'choice', prompt: 'Look! It ___ outside.', options: ['is raining', 'rains', 'raining'], answer: 0 },
      { kind: 'choice', prompt: 'We ___ for the exam this week.', options: ['studying', 'is studying', 'are studying'], answer: 2 },
      { kind: 'error', sentence: 'She watching TV in her room.', wrong: 'watching', correct: 'She is watching TV in her room.' },
      { kind: 'error', sentence: 'I am want a glass of water.', wrong: 'am', correct: 'I want a glass of water.' },
      { kind: 'order', chunks: ['What', 'are', 'you', 'doing', 'now?'] },
      { kind: 'order', chunks: ['My parents', 'are', 'having', 'lunch.'] },
    ],
  },
  {
    id: 'prepositions-time',
    level: 'A1',
    title: { en: 'in / on / at for time', vi: 'in / on / at chỉ thời gian' },
    summary: { en: 'at 7, on Monday, in May', vi: 'at 7, on Monday, in May' },
    pattern: ['at + clock time · night · the weekend', 'on + day · date  (on Monday, on 2 May)', 'in + month · year · season · the morning'],
    rule: {
      en: 'Go from small to big: "at" for an exact time, "on" for a day or date, "in" for longer periods. No preposition before "next", "last", "every", "this", "today", "tomorrow".',
      vi: 'Đi từ nhỏ đến lớn: "at" cho giờ cụ thể, "on" cho ngày, "in" cho khoảng dài hơn. Không dùng giới từ trước "next", "last", "every", "this", "today", "tomorrow".',
    },
    examples: ['The class starts **at** 8 o’clock.', 'I’m free **on** Friday.', 'She was born **in** 1998.', 'I go jogging **in** the morning.'],
    viNote: {
      en: 'Vietnamese uses "vào" or "lúc" for all of these, so it’s hard to pick. Learn them as chunks: "at 7", "on Monday", "in July". And drop the preposition with "next/last": "next week", not "in next week".',
      vi: 'Tiếng Việt dùng "vào" hoặc "lúc" cho tất cả nên khó chọn. Hãy học theo cụm: "at 7", "on Monday", "in July". Và bỏ giới từ với "next/last": "next week", không phải "in next week".',
    },
    drills: [
      { kind: 'choice', prompt: 'My birthday is ___ June.', options: ['on', 'in', 'at'], answer: 1 },
      { kind: 'choice', prompt: 'Let’s meet ___ half past six.', options: ['at', 'on', 'in'], answer: 0 },
      { kind: 'choice', prompt: 'We don’t have school ___ Sundays.', options: ['in', 'at', 'on'], answer: 2 },
      { kind: 'error', sentence: 'I will call you in next week.', wrong: 'in', correct: 'I will call you next week.' },
      { kind: 'error', sentence: 'He usually sleeps late in night.', wrong: 'in', correct: 'He usually sleeps late at night.' },
      { kind: 'order', chunks: ['The shop', 'opens', 'at', '9 a.m.'] },
      { kind: 'order', chunks: ['We', 'go', 'to the beach', 'in', 'summer.'] },
    ],
  },

  // ─── A2 ───────────────────────────────────────────────────────────
  {
    id: 'past-be',
    level: 'A2',
    title: { en: 'was / were', vi: 'was / were' },
    summary: { en: 'The verb "to be" in the past', vi: 'Động từ "to be" ở quá khứ' },
    pattern: ['I / he / she / it + was', 'you / we / they + were', 'wasn’t / weren’t · Was…? / Were…?'],
    rule: {
      en: '"Was" and "were" are the past of am/is/are. Use them for states and descriptions in the past: where you were, how you felt.',
      vi: '"Was" và "were" là quá khứ của am/is/are. Dùng để nói trạng thái, mô tả trong quá khứ: bạn ở đâu, cảm thấy thế nào.',
    },
    examples: ['I **was** tired yesterday.', 'They **were** at the cinema.', 'The film **wasn’t** very good.', '**Were** you at home last night?'],
    viNote: {
      en: 'Vietnamese shows the past with "đã" or a time word, and "be" is often missing completely: "Hôm qua tôi mệt". English needs "was": "I was tired yesterday" — not "I tired" and not "I am tired yesterday".',
      vi: 'Tiếng Việt diễn tả quá khứ bằng "đã" hoặc từ chỉ thời gian, và thường không có "be": "Hôm qua tôi mệt". Tiếng Anh cần "was": "I was tired yesterday" — không phải "I tired" hay "I am tired yesterday".',
    },
    drills: [
      { kind: 'choice', prompt: 'We ___ very busy last week.', options: ['was', 'were', 'are'], answer: 1 },
      { kind: 'choice', prompt: 'It ___ cold yesterday morning.', options: ['was', 'were', 'is'], answer: 0 },
      { kind: 'choice', prompt: '___ your parents at the party?', options: ['Was', 'Did', 'Were'], answer: 2 },
      { kind: 'error', sentence: 'I am sick last Monday.', wrong: 'am', correct: 'I was sick last Monday.' },
      { kind: 'error', sentence: 'The students was late this morning.', wrong: 'was', correct: 'The students were late this morning.' },
      { kind: 'order', chunks: ['Where', 'were', 'you', 'last night?'] },
      { kind: 'order', chunks: ['The hotel', 'wasn’t', 'very', 'clean.'] },
    ],
  },
  {
    id: 'past-simple-regular',
    level: 'A2',
    title: { en: 'Past simple: -ed verbs', vi: 'Quá khứ đơn: động từ -ed' },
    summary: { en: 'I worked, she studied', vi: 'I worked, she studied' },
    pattern: ['verb + ed  (work → worked)', 'e → d  (live → lived)', 'consonant + y → ied  (study → studied)', 'short vowel + consonant → double  (stop → stopped)'],
    rule: {
      en: 'Use the past simple for finished actions at a time in the past (yesterday, last year, in 2020). Regular verbs add -ed, the same for every person.',
      vi: 'Dùng quá khứ đơn cho hành động đã xong tại một thời điểm trong quá khứ (yesterday, last year, in 2020). Động từ có quy tắc thêm -ed, giống nhau với mọi ngôi.',
    },
    examples: ['I **worked** late yesterday.', 'She **studied** in Australia.', 'We **watched** a film last night.', 'The bus **stopped** suddenly.'],
    viNote: {
      en: 'Vietnamese verbs don’t change for the past — "hôm qua tôi làm việc". Even with "yesterday" in the sentence, English still needs -ed: "I work yesterday" is wrong. Pronounce it, too: worked /t/, lived /d/, wanted /ɪd/.',
      vi: 'Động từ tiếng Việt không đổi ở quá khứ — "hôm qua tôi làm việc". Dù đã có "yesterday", tiếng Anh vẫn cần -ed: "I work yesterday" là sai. Nhớ phát âm: worked /t/, lived /d/, wanted /ɪd/.',
    },
    drills: [
      { kind: 'choice', prompt: 'We ___ our grandparents last weekend.', options: ['visit', 'visited', 'visiting'], answer: 1 },
      { kind: 'choice', prompt: 'She ___ for the test all night.', options: ['studied', 'studyed', 'studies'], answer: 0 },
      { kind: 'choice', prompt: 'The rain ___ at 5 o’clock.', options: ['stoped', 'stop', 'stopped'], answer: 2 },
      { kind: 'error', sentence: 'Yesterday I play badminton with my friends.', wrong: 'play', correct: 'Yesterday I played badminton with my friends.' },
      { kind: 'error', sentence: 'They move to Da Nang in 2019.', wrong: 'move', correct: 'They moved to Da Nang in 2019.' },
      { kind: 'order', chunks: ['I', 'cleaned', 'my room', 'this morning.'] },
      { kind: 'order', chunks: ['He', 'arrived', 'late', 'for the meeting.'] },
    ],
  },
  {
    id: 'past-simple-irregular',
    level: 'A2',
    title: { en: 'Past simple: irregular verbs and did', vi: 'Quá khứ đơn: động từ bất quy tắc và did' },
    summary: { en: 'went, saw, didn’t go, did you see?', vi: 'went, saw, didn’t go, did you see?' },
    pattern: ['go → went · see → saw · eat → ate · buy → bought', 'didn’t + base verb', 'Did + subject + base verb?'],
    rule: {
      en: 'Many common verbs have their own past form — learn them as pairs. In questions and negatives use "did", and the main verb goes back to its base form: "Did you go?", "I didn’t see".',
      vi: 'Nhiều động từ thông dụng có dạng quá khứ riêng — hãy học theo cặp. Câu hỏi và phủ định dùng "did", và động từ chính trở về dạng gốc: "Did you go?", "I didn’t see".',
    },
    examples: ['I **went** to Hue last summer.', 'She **bought** a new dress.', 'We **didn’t eat** breakfast.', '**Did** you **see** the news?'],
    viNote: {
      en: 'After "did" or "didn’t", the past is already shown — so don’t mark it twice: "Did you went?" and "I didn’t saw" are wrong. And without "did", don’t forget the past form: "I go there last year" → "I went there last year".',
      vi: 'Sau "did" hoặc "didn’t", quá khứ đã được thể hiện — nên đừng chia hai lần: "Did you went?" và "I didn’t saw" là sai. Còn khi không có "did", đừng quên dạng quá khứ: "I go there last year" → "I went there last year".',
    },
    drills: [
      { kind: 'choice', prompt: 'We ___ a great film last night.', options: ['see', 'saw', 'seed'], answer: 1 },
      { kind: 'choice', prompt: 'Did you ___ your homework?', options: ['finish', 'finished', 'finishing'], answer: 0 },
      { kind: 'choice', prompt: 'He ___ come to class yesterday.', options: ['wasn’t', 'not', 'didn’t'], answer: 2 },
      { kind: 'error', sentence: 'I didn’t went to work on Monday.', wrong: 'went', correct: 'I didn’t go to work on Monday.' },
      { kind: 'error', sentence: 'She eat pho for breakfast yesterday.', wrong: 'eat', correct: 'She ate pho for breakfast yesterday.' },
      { kind: 'order', chunks: ['Did', 'you', 'buy', 'any', 'fruit?'] },
      { kind: 'order', chunks: ['They', 'took', 'a taxi', 'to the airport.'] },
    ],
  },
  {
    id: 'countable-uncountable',
    level: 'A2',
    title: { en: 'Countable and uncountable nouns', vi: 'Danh từ đếm được và không đếm được' },
    summary: { en: 'many / much, some / any', vi: 'many / much, some / any' },
    pattern: ['countable: a book, two books, many books', 'uncountable: water, rice, money, information, advice — no a/an, no -s', 'many + countable · much + uncountable · a lot of + both', 'some (positive) · any (questions, negatives)'],
    rule: {
      en: 'Countable nouns can be counted one by one and have a plural. Uncountable nouns are seen as a mass — they take no "a/an" and no -s. "How many" asks about countable, "how much" about uncountable.',
      vi: 'Danh từ đếm được có thể đếm từng cái và có số nhiều. Danh từ không đếm được được xem là một khối — không dùng "a/an" và không thêm -s. "How many" hỏi danh từ đếm được, "how much" hỏi danh từ không đếm được.',
    },
    examples: ['How **many** students are there?', 'How **much** money do you have?', 'I need **some** information.', 'There isn’t **any** milk.'],
    viNote: {
      en: 'Some words are countable in Vietnamese thinking but uncountable in English: information, advice, homework, furniture, luggage, news. So it’s "some advice" or "a piece of advice", never "an advice" or "advices".',
      vi: 'Một số từ người Việt nghĩ là đếm được nhưng trong tiếng Anh lại không: information, advice, homework, furniture, luggage, news. Nên nói "some advice" hoặc "a piece of advice", không bao giờ "an advice" hay "advices".',
    },
    drills: [
      { kind: 'choice', prompt: 'How ___ water do you drink a day?', options: ['many', 'much', 'a lot'], answer: 1 },
      { kind: 'choice', prompt: 'There aren’t ___ eggs in the fridge.', options: ['any', 'some', 'much'], answer: 0 },
      { kind: 'choice', prompt: 'Can you give me some ___?', options: ['advices', 'an advice', 'advice'], answer: 2 },
      { kind: 'error', sentence: 'I have many homeworks tonight.', wrong: 'homeworks', correct: 'I have a lot of homework tonight.' },
      { kind: 'error', sentence: 'How much people came to the party?', wrong: 'much', correct: 'How many people came to the party?' },
      { kind: 'order', chunks: ['We', 'need', 'some', 'rice', 'and', 'eggs.'] },
      { kind: 'order', chunks: ['Is', 'there', 'any', 'news', 'about the job?'] },
    ],
  },
  {
    id: 'comparatives',
    level: 'A2',
    title: { en: 'Comparatives', vi: 'So sánh hơn' },
    summary: { en: 'bigger than, more expensive than', vi: 'bigger than, more expensive than' },
    pattern: ['short adjective + er + than  (cheap → cheaper)', 'more + long adjective + than  (more expensive)', 'good → better · bad → worse · far → further'],
    rule: {
      en: 'To compare two things, add -er to short adjectives and use "more" before longer ones — never both. Follow it with "than".',
      vi: 'Để so sánh hai thứ, thêm -er vào tính từ ngắn và dùng "more" trước tính từ dài — không dùng cả hai. Theo sau là "than".',
    },
    examples: ['Hanoi is **colder than** Ho Chi Minh City in winter.', 'This phone is **more expensive than** that one.', 'Her English is **better than** mine.', 'The bus is **slower than** the train.'],
    viNote: {
      en: 'Vietnamese uses "hơn" after the adjective for every word: "đắt hơn", "tốt hơn". English splits short and long adjectives, and "good/bad" are irregular. "More cheaper" and "gooder" are common mistakes.',
      vi: 'Tiếng Việt chỉ cần "hơn" sau mọi tính từ: "đắt hơn", "tốt hơn". Tiếng Anh chia ra tính từ ngắn và dài, còn "good/bad" là bất quy tắc. "More cheaper" và "gooder" là lỗi hay gặp.',
    },
    drills: [
      { kind: 'choice', prompt: 'My room is ___ than yours.', options: ['more big', 'bigger', 'biger'], answer: 1 },
      { kind: 'choice', prompt: 'English is ___ than I thought.', options: ['more difficult', 'difficulter', 'more difficulter'], answer: 0 },
      { kind: 'choice', prompt: 'Today’s weather is ___ than yesterday’s.', options: ['gooder', 'more good', 'better'], answer: 2 },
      { kind: 'error', sentence: 'This shirt is more cheaper than that one.', wrong: 'more', correct: 'This shirt is cheaper than that one.' },
      { kind: 'error', sentence: 'My brother is taller then me.', wrong: 'then', correct: 'My brother is taller than me.' },
      { kind: 'order', chunks: ['A plane', 'is', 'faster', 'than', 'a train.'] },
      { kind: 'order', chunks: ['This book', 'is', 'more interesting', 'than', 'the film.'] },
    ],
  },
  {
    id: 'superlatives',
    level: 'A2',
    title: { en: 'Superlatives', vi: 'So sánh nhất' },
    summary: { en: 'the biggest, the most beautiful', vi: 'the biggest, the most beautiful' },
    pattern: ['the + short adjective + est  (the tallest)', 'the most + long adjective  (the most beautiful)', 'good → the best · bad → the worst'],
    rule: {
      en: 'Use the superlative to say one thing is at the top of a group of three or more. It nearly always takes "the". Often followed by "in" + a place or group, or "of" + a number.',
      vi: 'Dùng so sánh nhất để nói một thứ đứng đầu trong nhóm từ ba trở lên. Gần như luôn có "the". Thường đi với "in" + nơi chốn/nhóm, hoặc "of" + số lượng.',
    },
    examples: ['Mount Fansipan is **the highest** mountain in Vietnam.', 'This is **the most beautiful** beach I know.', 'She is **the best** student in our class.', 'That was **the worst** day of the year.'],
    viNote: {
      en: 'Vietnamese says "cao nhất", "đẹp nhất" with no word like "the". In English "the" is needed: "She is best student" → "She is the best student". And use "in" for places: "the biggest city in Vietnam", not "of Vietnam".',
      vi: 'Tiếng Việt nói "cao nhất", "đẹp nhất" mà không cần từ nào như "the". Tiếng Anh thì cần "the": "She is best student" → "She is the best student". Và dùng "in" với nơi chốn: "the biggest city in Vietnam", không phải "of Vietnam".',
    },
    drills: [
      { kind: 'choice', prompt: 'This is ___ restaurant in town.', options: ['the cheaper', 'the cheapest', 'cheapest'], answer: 1 },
      { kind: 'choice', prompt: 'It was ___ day of my life.', options: ['the happiest', 'the most happy', 'happiest'], answer: 0 },
      { kind: 'choice', prompt: 'Who is ___ singer in your country?', options: ['the most famousest', 'the famousest', 'the most famous'], answer: 2 },
      { kind: 'error', sentence: 'He is best player on the team.', wrong: 'best', correct: 'He is the best player on the team.' },
      { kind: 'error', sentence: 'It is the most hot month of the year.', wrong: 'most', correct: 'It is the hottest month of the year.' },
      { kind: 'order', chunks: ['Hanoi', 'is', 'the oldest', 'city', 'I have visited.'] },
      { kind: 'order', chunks: ['This', 'is', 'the most expensive', 'hotel', 'in the city.'] },
    ],
  },
  {
    id: 'adverbs-frequency',
    level: 'A2',
    title: { en: 'always / usually / never', vi: 'always / usually / never' },
    summary: { en: 'How often, and where it goes', vi: 'Bao lâu một lần, và đặt ở đâu' },
    pattern: ['always · usually · often · sometimes · rarely · never', 'before the main verb  (I often walk)', 'after "be"  (She is always late)'],
    rule: {
      en: 'These adverbs say how often something happens. Put them before the main verb but after "be". "Never" is already negative — don’t add "not".',
      vi: 'Các trạng từ này nói mức độ thường xuyên. Đặt trước động từ chính nhưng sau "be". "Never" đã mang nghĩa phủ định — đừng thêm "not".',
    },
    examples: ['I **usually** get up at 6.', 'She **is always** busy.', 'We **sometimes** eat out.', 'He **never** drinks coffee.'],
    viNote: {
      en: 'Vietnamese word order is more flexible here. In English the place is fixed: "I usually get up", not "I get up usually". Double negatives like "I don’t never" are wrong in standard English.',
      vi: 'Tiếng Việt khá linh hoạt về vị trí. Tiếng Anh thì cố định: "I usually get up", không phải "I get up usually". Phủ định kép như "I don’t never" là sai trong tiếng Anh chuẩn.',
    },
    drills: [
      { kind: 'choice', prompt: 'My boss ___ in a good mood on Mondays.', options: ['never is', 'is never', 'never'], answer: 1 },
      { kind: 'choice', prompt: 'We ___ go to the cinema on Fridays.', options: ['often', 'are often', 'often are'], answer: 0 },
      { kind: 'choice', prompt: 'I ___ eat meat. I’m vegetarian.', options: ['don’t never', 'not ever', 'never'], answer: 2 },
      { kind: 'error', sentence: 'She is late always for class.', wrong: 'always', correct: 'She is always late for class.' },
      { kind: 'error', sentence: 'I don’t never forget my keys.', wrong: 'don’t', correct: 'I never forget my keys.' },
      { kind: 'order', chunks: ['He', 'usually', 'walks', 'to work.'] },
      { kind: 'order', chunks: ['They', 'are', 'sometimes', 'late.'] },
    ],
  },
  {
    id: 'going-to',
    level: 'A2',
    title: { en: 'be going to', vi: 'be going to' },
    summary: { en: 'Plans you’ve already made', vi: 'Kế hoạch đã định sẵn' },
    pattern: ['am / is / are + going to + base verb', 'Are you going to + verb?', 'also: a prediction from what you can see  (It’s going to rain)'],
    rule: {
      en: 'Use "be going to" for plans and intentions you decided before speaking, and for predictions based on what you can see now. Don’t forget "be", and keep the verb in its base form.',
      vi: 'Dùng "be going to" cho kế hoạch, dự định đã quyết từ trước khi nói, và cho dự đoán dựa vào điều đang thấy. Đừng quên "be", và giữ động từ ở dạng gốc.',
    },
    examples: ['I**’m going to** study abroad next year.', 'We **are going to** visit Da Lat this summer.', 'Look at those clouds — it**’s going to** rain.', '**Are** you **going to** take the job?'],
    viNote: {
      en: 'Vietnamese "sẽ" and "định" both become future in English, and "be" is easy to drop: "I going to travel". It must be "I am going to travel". After "to", use the base verb: "going to buy", not "going to bought".',
      vi: '"sẽ" và "định" đều là tương lai trong tiếng Anh, và rất dễ bỏ sót "be": "I going to travel". Phải là "I am going to travel". Sau "to" dùng động từ gốc: "going to buy", không phải "going to bought".',
    },
    drills: [
      { kind: 'choice', prompt: 'She ___ start a new job next month.', options: ['going to', 'is going to', 'goes to'], answer: 1 },
      { kind: 'choice', prompt: 'Be careful! You ___ fall.', options: ['are going to', 'going to', 'go to'], answer: 0 },
      { kind: 'choice', prompt: 'What are you going ___ this weekend?', options: ['do', 'doing', 'to do'], answer: 2 },
      { kind: 'error', sentence: 'We going to have a party on Saturday.', wrong: 'going', correct: 'We are going to have a party on Saturday.' },
      { kind: 'error', sentence: 'They are going to moved house soon.', wrong: 'moved', correct: 'They are going to move house soon.' },
      { kind: 'order', chunks: ['I', 'am', 'going to', 'learn', 'to drive.'] },
      { kind: 'order', chunks: ['Is', 'he', 'going to', 'call', 'you?'] },
    ],
  },
  {
    id: 'will-future',
    level: 'A2',
    title: { en: 'will', vi: 'will' },
    summary: { en: 'Decisions now, promises, predictions', vi: 'Quyết định tức thì, lời hứa, dự đoán' },
    pattern: ['subject + will (’ll) + base verb', 'won’t = will not', 'Will + subject + base verb?'],
    rule: {
      en: 'Use "will" for decisions made at the moment of speaking ("I’ll get it!"), offers and promises, and predictions based on opinion ("I think it will be fine"). For plans made earlier, "going to" is more natural.',
      vi: 'Dùng "will" cho quyết định ngay lúc nói ("I’ll get it!"), lời đề nghị, lời hứa, và dự đoán theo ý kiến ("I think it will be fine"). Với kế hoạch đã định từ trước, "going to" tự nhiên hơn.',
    },
    examples: ['The phone’s ringing — I**’ll** answer it.', 'I **will** call you tomorrow, I promise.', 'I think she **will** pass the exam.', 'It **won’t** take long.'],
    viNote: {
      en: 'Vietnamese uses "sẽ" for all future meaning. English chooses: a plan you already made → "going to"; a decision right now → "will". The verb after "will" never takes -s or -ed: "She will comes" is wrong.',
      vi: 'Tiếng Việt dùng "sẽ" cho mọi ý tương lai. Tiếng Anh phải chọn: kế hoạch đã có → "going to"; quyết định ngay lúc nói → "will". Động từ sau "will" không bao giờ thêm -s hay -ed: "She will comes" là sai.',
    },
    drills: [
      { kind: 'choice', prompt: 'It’s cold in here. — I ___ close the window.', options: ['am going to', '’ll', 'will to'], answer: 1 },
      { kind: 'choice', prompt: 'Don’t worry, I ___ tell anyone.', options: ['won’t', 'don’t will', 'willn’t'], answer: 0 },
      { kind: 'choice', prompt: 'I think it ___ sunny tomorrow.', options: ['will is', 'will being', 'will be'], answer: 2 },
      { kind: 'error', sentence: 'He will helps you with your bags.', wrong: 'helps', correct: 'He will help you with your bags.' },
      { kind: 'error', sentence: 'I will to finish it tonight.', wrong: 'to', correct: 'I will finish it tonight.' },
      { kind: 'order', chunks: ['I', 'will', 'send', 'you', 'the photos.'] },
      { kind: 'order', chunks: ['Will', 'you', 'be', 'home', 'for dinner?'] },
    ],
  },
];

/** Strip punctuation so "today." matches a `wrong` of "today". */
export const bareWord = (token: string) => token.replace(/^[^\p{L}\p{N}’']+|[^\p{L}\p{N}’']+$/gu, '');

/** The finished sentence a drill is about — shown once it's answered. */
export function drillAnswer(drill: Drill): string {
  switch (drill.kind) {
    case 'choice': {
      const word = drill.options[drill.answer];
      // "—" is the "no word here" option: close the gap instead of printing it.
      return word === '—'
        ? drill.prompt.replace(/\s*___\s*/, ' ').replace(/^\s+/, '').replace(/^./, (c) => c.toUpperCase())
        : drill.prompt.replace('___', word);
    }
    case 'error':
      return drill.correct;
    case 'order':
      return drill.chunks.join(' ');
  }
}

export const lessonById = (id: string) => GRAMMAR_LESSONS.find((l) => l.id === id);
