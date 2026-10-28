// Easy = concrete/descriptive, answerable in the present tense with no real
// planning. Medium = needs a comparison, a short narrative, or a "why".
// Hard = abstract, hypothetical, or asks for a reflective opinion.
export type SpeakingDifficulty = 'easy' | 'medium' | 'hard';

export interface SpeakingQuestion {
  id: string;
  topic: string;
  difficulty: SpeakingDifficulty;
  question: string;
  sampleAnswers: {
    label: string;
    answer: string;
  }[];
  usefulPhrases?: string[];
}

// General, everyday small talk — deliberately not framed around any one job,
// industry, or city, so the sample answers suit any learner.
export const speakingTopics = [
  'Self Introduction',
  'Childhood & Memories',
  'Relationships & Family',
  'Future Plans',
  'Feelings & Emotions',
  'Friends & Social Life',
  'Daily Life',
  'Home & Neighborhood',
  'Food & Culture',
  'Shopping & Fashion',
  'Money & Finance',
  'Health & Wellness',
  'Manners & Etiquette',
  'Hobbies & Interests',
  'Movies, Music & Books',
  'Sports & Games',
  'Animals & Pets',
  'Celebrations & Holidays',
  'Art & Creativity',
  'Hometown & Travel',
  'Environment & Nature',
  'Weather & Seasons',
  'Getting Around',
  'Opinions & Ideas',
  'Education & Learning',
  'Problem Solving',
  'What If',
  'Society & Community',
  'Languages & Communication',
] as const;

export type SpeakingTopic = (typeof speakingTopics)[number];

// How the topic list is organised in the UI — every topic belongs to exactly
// one group (the `SpeakingTopic` type makes a typo a compile error).
export const speakingTopicGroups: { label: string; topics: SpeakingTopic[] }[] = [
  { label: 'About You', topics: ['Self Introduction', 'Childhood & Memories', 'Relationships & Family', 'Future Plans', 'Feelings & Emotions', 'Friends & Social Life'] },
  { label: 'Everyday Life', topics: ['Daily Life', 'Home & Neighborhood', 'Food & Culture', 'Shopping & Fashion', 'Money & Finance', 'Health & Wellness', 'Manners & Etiquette'] },
  { label: 'Free Time', topics: ['Hobbies & Interests', 'Movies, Music & Books', 'Sports & Games', 'Animals & Pets', 'Celebrations & Holidays', 'Art & Creativity'] },
  { label: 'Places & Nature', topics: ['Hometown & Travel', 'Environment & Nature', 'Weather & Seasons', 'Getting Around'] },
  { label: 'Ideas & Opinions', topics: ['Opinions & Ideas', 'Education & Learning', 'Problem Solving', 'What If', 'Society & Community', 'Languages & Communication'] },
];

export const speakingQuestions: SpeakingQuestion[] = [
  // ── Self Introduction ─────────────────────────────────
  {
    id: 'sp-1',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: 'Tell me about yourself.',
    sampleAnswers: [
      {
        label: 'Friendly & Relaxed',
        answer:
          "Sure. I'd describe myself as fairly easy-going. I like a calm routine during the week and getting outdoors at the weekend — a walk in the park, a swim, or just a long coffee with a friend. I love trying new food and I'm always happy to talk to new people. Right now I'm working on my English because I'd love to travel more and feel confident chatting with people wherever I go.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I'm a friendly, easy-going person. I love good food, long walks, and meeting new people. Right now I'm practising my English so I can speak more naturally.",
      },
    ],
    usefulPhrases: [
      "I'd describe myself as...",
      'I really enjoy...',
      "Right now I'm working on...",
      'In my free time, I...',
    ],
  },
  {
    id: 'sp-25',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: 'How would you describe your personality?',
    sampleAnswers: [
      {
        label: 'Honest Self-Assessment',
        answer:
          "I'd describe myself as pretty easygoing but also quite driven when it comes to things I care about. I'm the kind of person who likes to plan things out before jumping in. My friends say I'm a good listener — I tend to think before I speak, which sometimes makes me seem quiet in groups. But once I'm comfortable, I can talk for hours. I'm also a bit of a perfectionist, which is both a strength and a weakness.",
      },
    ],
    usefulPhrases: [
      "I'd describe myself as...",
      "I'm the kind of person who...",
      'My friends say I\'m...',
      'which is both a strength and a weakness',
      'once I\'m comfortable...',
    ],
  },
  {
    id: 'sp-26',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: "What's something most people don't know about you?",
    sampleAnswers: [
      {
        label: 'Fun Fact',
        answer:
          "Most people don't know that I used to want to be a singer. I sang in a choir all through school and even performed at a few local events. I eventually chose a more practical path, but I still sing when I'm cooking or driving, usually very loudly. Every now and then I go to karaoke with friends and, for one night, I get to be the star again.",
      },
    ],
    usefulPhrases: [
      "Most people don't know that...",
      'I used to want to be...',
      'I eventually chose...',
      'every now and then',
    ],
  },
  {
    id: 'sp-112',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: 'How would your close friends describe you in three words?',
    sampleAnswers: [
      {
        label: 'What Friends Notice',
        answer:
          "I've actually asked a couple of them this before, half-jokingly, and the words that kept coming up were 'reliable,' 'quiet,' and 'stubborn.' Reliable I'll happily take. Quiet is fair — I'm not the loudest person in a group, I tend to listen more than talk until I know people well. Stubborn stung a little at first, but they meant it more as 'once I've decided something, good luck changing my mind,' which, fair enough, is true.",
      },
    ],
    usefulPhrases: [
      "I've actually asked... this before",
      'the words that kept coming up were...',
      "I'll happily take",
      'is fair',
      'stung a little at first, but...',
      'good luck changing my mind',
    ],
  },
  {
    id: 'sp-113',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: "What's a compliment you received that you still remember?",
    sampleAnswers: [
      {
        label: 'An Unexpected One',
        answer:
          "A teacher once told me I asked good questions, not that I gave good answers — that I asked good questions. At the time it didn't feel like much, but it stuck with me for years, probably because it wasn't about being smart, it was about being curious, which felt like something I actually had control over. I still think about that distinction a lot, especially when I'm learning something new and feel behind everyone else.",
      },
    ],
    usefulPhrases: [
      'not that... but that...',
      "it didn't feel like much, but...",
      'it stuck with me for years',
      'something I actually had control over',
      'I still think about that a lot',
    ],
  },
  {
    id: 'sp-179',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: 'What do you like to be called, and is there a story behind your name?',
    sampleAnswers: [
      {
        label: 'A Family Name',
        answer:
          "Most people just call me by my first name, but my family has a nickname for me that means 'little bean', because I was a very small baby. My real name was chosen by my grandfather — it means 'bright' or 'clever', which I think was a lot of pressure! I like it, though. It feels like a little wish from him that I carry around.",
      },
    ],
    usefulPhrases: [
      'Most people just call me...',
      "there's a story behind it",
      'was chosen by...',
      'which I think was a lot of pressure',
    ],
  },
  {
    id: 'sp-180',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: 'What are three things that make you happy?',
    sampleAnswers: [
      {
        label: 'Simple Things',
        answer:
          "First, good food shared with people I like — a long dinner where nobody looks at the clock. Second, being near water, whether it's the sea, a lake, or even a river in the city. And third, finishing something I've been putting off for weeks. That feeling of crossing it off the list is surprisingly satisfying.",
      },
      {
        label: 'Short & Simple',
        answer:
          "Good food with friends, being near water, and finishing something I've been putting off.",
      },
    ],
    usefulPhrases: [
      'First..., Second..., And third...',
      'nobody looks at the clock',
      "I've been putting off",
      'surprisingly satisfying',
    ],
  },
  {
    id: 'sp-181',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: 'Are you more of an introvert or an extrovert?',
    sampleAnswers: [
      {
        label: 'Somewhere in Between',
        answer:
          "I'd say I'm somewhere in between — people sometimes call it an 'ambivert'. I really enjoy going out and meeting people, and at a party I'm usually happy to start conversations. But after a busy weekend, I need a quiet day alone to recharge. If I don't get it, I get tired and a bit grumpy. So I like people, but in doses.",
      },
    ],
    usefulPhrases: [
      "I'd say I'm somewhere in between",
      "I'm usually happy to...",
      'to recharge',
      'in doses',
    ],
  },
  {
    id: 'sp-248',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: 'How do you usually spend your free time?',
    sampleAnswers: [
      {
        label: 'A Bit of Everything',
        answer:
          "It depends on how much energy I have. If I'm feeling active, I go for a swim or meet friends. If I'm tired, I read, cook something new, or watch a series. I try to spend at least a little time outside every day, even if it's just a short walk in the evening.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I read, cook, meet friends, and go for walks.',
      },
    ],
    usefulPhrases: [
      'It depends on how much energy I have.',
      "If I'm feeling active...",
      'at least a little time',
      "even if it's just...",
    ],
  },
  {
    id: 'sp-269',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: 'Where do you live at the moment, and what do you like about the area?',
    sampleAnswers: [
      {
        label: 'A Quiet Neighbourhood',
        answer:
          "Right now I live in a fairly quiet neighbourhood not far from the centre of my hometown. What I like most is that everything I need is within walking distance — there's a little market, a park, and a couple of cafés I go to all the time. It's not the most exciting place, honestly, but it feels safe and friendly. The neighbours say hello, and in the evenings you can hear kids playing outside. For me, that kind of calm is worth a lot.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I live in a quiet area near the centre. I like it because it's calm and everything is close by.",
      },
    ],
    usefulPhrases: [
      'within walking distance',
      "it's not the most exciting place, but...",
      'what I like most is that...',
      '... is worth a lot to me',
    ],
  },
  {
    id: 'sp-270',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: 'What does a typical morning look like for you?',
    sampleAnswers: [
      {
        label: 'Slow and Steady',
        answer:
          "My mornings are pretty simple. I usually wake up around half past six, and the first thing I do is open the window and drink a big glass of water. Then I make a cup of tea and sit for a few minutes without doing anything — that's my favourite part of the day, to be honest. After that I have a quick breakfast, usually bread and eggs, get dressed, and head out. I'm not a morning person, so I keep things slow and easy.",
      },
    ],
    usefulPhrases: [
      'the first thing I do is...',
      "that's my favourite part of the day",
      "I'm not a morning person",
      'I keep things slow and easy',
    ],
  },
  {
    id: 'sp-271',
    topic: 'Self Introduction',
    difficulty: 'easy',
    question: "What's your favourite food, and how often do you eat it?",
    sampleAnswers: [
      {
        label: 'Noodle Soup Lover',
        answer:
          "I'd have to say a hot bowl of noodle soup. I could honestly eat it every day, but I try to limit myself to two or three times a week. There's a small place near my home that makes it exactly the way I like — lots of herbs, a bit of chilli, and a really rich broth. Whenever I've had a long day or I'm feeling under the weather, that's what I crave. It's comfort food for me.",
      },
    ],
    usefulPhrases: [
      "I'd have to say...",
      'I could honestly eat it every day',
      'I try to limit myself to...',
      "it's comfort food for me",
      'feeling under the weather',
    ],
  },
  {
    id: 'sp-272',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: 'How are you different now compared with five years ago?',
    sampleAnswers: [
      {
        label: 'More Patient Now',
        answer:
          "Quite a lot, actually. Five years ago I was much more impatient — I wanted everything to happen right away, and I'd get frustrated easily. These days I'm calmer and I don't take things so personally. I think that's partly because I've been through a few difficult moments and realised most problems aren't as big as they seem. I've also become more organised; back then my room was a mess and I was always late. I still have bad days, but overall I'm a more relaxed version of myself.",
      },
    ],
    usefulPhrases: [
      'quite a lot, actually',
      "I don't take things so personally",
      "most problems aren't as big as they seem",
      'back then...',
      'a more relaxed version of myself',
    ],
  },
  {
    id: 'sp-273',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: "What's a habit you're proud of, and why did you start it?",
    sampleAnswers: [
      {
        label: 'The Evening Walk',
        answer:
          "I'm quite proud that I go for a walk almost every evening. I started about two years ago because I was spending too much time sitting down and I always felt tired and a bit low. At first it was just ten minutes around the block, but now it's closer to forty. It clears my head, and I often come back with a better mood and fresh ideas. The hardest part was the first month — once it became routine, I actually started looking forward to it.",
      },
    ],
    usefulPhrases: [
      "I'm quite proud that...",
      'at first it was just...',
      'it clears my head',
      'once it became routine',
      'I actually started looking forward to it',
    ],
  },
  {
    id: 'sp-274',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: 'What is something you are trying to get better at right now?',
    sampleAnswers: [
      {
        label: 'Listening Properly',
        answer:
          "Honestly, listening. I've noticed that in conversations I'm often thinking about what I'll say next instead of really hearing the other person. So I'm trying to slow down, ask more follow-up questions, and not jump in with my own story straight away. It's harder than it sounds, but people seem to open up more when I do it.",
      },
    ],
    usefulPhrases: [
      "I've noticed that...",
      'instead of really hearing...',
      "It's harder than it sounds",
      'people seem to open up more',
    ],
  },
  {
    id: 'sp-275',
    topic: 'Self Introduction',
    difficulty: 'medium',
    question: 'Tell me about a hobby you picked up recently. How did you get into it?',
    sampleAnswers: [
      {
        label: 'Learning to Bake',
        answer:
          "A few months ago I started baking bread, which I never expected. It began when a friend of mine brought homemade bread to a picnic and I couldn't believe how good it was. She showed me the basics, and I was hooked. My first few loaves were a disaster — flat and hard as a rock — but I kept trying. Now I bake almost every weekend, and there's something really satisfying about making something with your hands from scratch.",
      },
    ],
    usefulPhrases: [
      'I never expected...',
      'I was hooked',
      '... were a disaster',
      'there is something really satisfying about...',
      'from scratch',
    ],
  },
  {
    id: 'sp-276',
    topic: 'Self Introduction',
    difficulty: 'hard',
    question: 'Do you think personality is something we are born with, or something we build over time?',
    sampleAnswers: [
      {
        label: 'Nature Plus Practice',
        answer:
          "Honestly, I think it's a mix. I believe we're born with certain tendencies — some babies are calm, others are restless from day one. But I don't think those tendencies are a life sentence. The people we spend time with, the challenges we face, and the choices we keep making all shape us. I was a very shy child, for instance, yet I deliberately pushed myself to speak up, and now I'm fairly confident. So we start with raw material, but we're the ones who build the house.",
      },
    ],
    usefulPhrases: [
      "honestly, I think it's a mix",
      'certain tendencies',
      "... isn't a life sentence",
      'I deliberately pushed myself to...',
      'we start with raw material',
    ],
  },
  {
    id: 'sp-277',
    topic: 'Self Introduction',
    difficulty: 'hard',
    question: 'If you could change one thing about yourself, what would it be and why?',
    sampleAnswers: [
      {
        label: 'Worrying Less',
        answer:
          "If I could change one thing, I'd worry less about what other people think. I spend far too much energy replaying conversations in my head and wondering if I said something wrong. It holds me back — sometimes I don't share an idea or try something new just because I'm afraid of looking silly. That said, I'm not sure I'd want to lose it completely, because caring about others also makes me considerate. I'd just like to turn the volume down a bit.",
      },
    ],
    usefulPhrases: [
      'I spend far too much energy...',
      'replaying conversations in my head',
      'it holds me back',
      "that said, I'm not sure...",
      'turn the volume down a bit',
    ],
  },
  {
    id: 'sp-278',
    topic: 'Self Introduction',
    difficulty: 'hard',
    question: 'How much do you think the place you grew up has shaped who you are?',
    sampleAnswers: [
      {
        label: 'Small Town Roots',
        answer:
          'More than I used to admit. I grew up in a small town where everybody knew everybody, and for a long time I wanted to escape that. But looking back, it taught me a lot — to greet people, to help neighbours without being asked, and to appreciate a slower pace of life. When I moved somewhere bigger, I noticed I was the one chatting to strangers at the bus stop. I guess you can leave a place, but it never really leaves you.',
      },
    ],
    usefulPhrases: [
      'more than I used to admit',
      'everybody knew everybody',
      'looking back, it taught me...',
      'appreciate a slower pace of life',
      'you can leave a place, but it never really leaves you',
    ],
  },

  // ── Childhood & Memories ──────────────────────────────
  {
    id: 'sp-163',
    topic: 'Childhood & Memories',
    difficulty: 'easy',
    question: 'What was your favourite thing to do as a child?',
    sampleAnswers: [
      {
        label: 'Flying Kites',
        answer:
          "Flying kites with my older brother. In the summer we'd make our own kites from bamboo and old newspaper, and then run along the beach trying to get them up into the wind. Half the time they crashed after a few seconds, but when one finally flew high, we felt like heroes. I still smile every time I see kids flying kites on the beach.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Flying kites on the beach with my brother. We made them ourselves, and they usually crashed, but it was so much fun.',
      },
    ],
    usefulPhrases: [
      "we'd make our own...",
      'Half the time...',
      'we felt like heroes',
      'I still smile every time...',
    ],
  },
  {
    id: 'sp-164',
    topic: 'Childhood & Memories',
    difficulty: 'easy',
    question: 'Who was your best friend when you were a kid?',
    sampleAnswers: [
      {
        label: 'The Boy Next Door',
        answer:
          'A boy who lived next door called Sam. We were in the same class from age six to twelve and did everything together — walking to school, swapping comics, getting into trouble. Then his family moved to another city and we slowly lost touch. A few years ago we found each other on Facebook and met for coffee. It was strange at first, but after ten minutes it felt like no time had passed.',
      },
    ],
    usefulPhrases: [
      'did everything together',
      'getting into trouble',
      'we slowly lost touch',
      'it felt like no time had passed',
    ],
  },
  {
    id: 'sp-165',
    topic: 'Childhood & Memories',
    difficulty: 'medium',
    question: 'What is one of your earliest memories?',
    sampleAnswers: [
      {
        label: 'Rain on the Roof',
        answer:
          "I remember sitting on my grandmother's lap during a huge storm. Her house had a tin roof, so the rain was incredibly loud, and I was a bit scared. She told me the sky was just washing the streets, and she peeled a mango for me while we waited. I must have been about four. I don't remember much else from that age, but I can still picture that kitchen and hear that rain.",
      },
    ],
    usefulPhrases: [
      'I must have been about...',
      "I don't remember much else from...",
      'I can still picture...',
      'while we waited',
    ],
  },
  {
    id: 'sp-166',
    topic: 'Childhood & Memories',
    difficulty: 'medium',
    question: 'How was your childhood different from children today?',
    sampleAnswers: [
      {
        label: 'Outside vs Indoors',
        answer:
          "The biggest difference is that we were outside all the time. After school, kids from the whole street played together until dinner, and parents didn't worry much about where we were. Today, kids I know spend a lot more time indoors, often on tablets, and their days are more organised — extra classes, lessons, activities. They have more opportunities than we did, but I think they have less free, unplanned time to just be bored and invent games.",
      },
    ],
    usefulPhrases: [
      'The biggest difference is that...',
      'all the time',
      'They have more... than we did, but...',
      'to just be bored',
    ],
  },
  {
    id: 'sp-167',
    topic: 'Childhood & Memories',
    difficulty: 'hard',
    question: 'Is there anything from your childhood that you wish you could experience again?',
    sampleAnswers: [
      {
        label: 'Long Summer Holidays',
        answer:
          "Those long summer holidays when there was nothing to do and no rush. Three months with no real plans — I'd spend whole afternoons reading old comics or lying on the floor under the fan. As an adult, even holidays are scheduled; you have a list of places to see. I don't think I can get that exact feeling back, because part of it was not having any responsibilities. But I try to create small versions of it, like a Sunday with no plans at all.",
      },
    ],
    usefulPhrases: [
      'nothing to do and no rush',
      'whole afternoons...',
      "I don't think I can get... back",
      'I try to create small versions of it',
    ],
  },
  {
    id: 'sp-254',
    topic: 'Childhood & Memories',
    difficulty: 'medium',
    question: 'What did you want to be when you were a child?',
    sampleAnswers: [
      {
        label: 'An Astronaut',
        answer:
          "An astronaut, like many kids. I had glow-in-the-dark stars on my ceiling and a book about planets I read until it fell apart. Later I realised I get sick on boats, so space probably wasn't for me! But I still love looking at the night sky, and I think that childhood curiosity never really left.",
      },
    ],
    usefulPhrases: [
      'like many kids',
      'until it fell apart',
      "probably wasn't for me",
      'never really left',
    ],
  },
  {
    id: 'sp-279',
    topic: 'Childhood & Memories',
    difficulty: 'easy',
    question: 'What was your favourite toy when you were little?',
    sampleAnswers: [
      {
        label: 'The Old Teddy Bear',
        answer:
          "My favourite toy was a brown teddy bear that my grandmother gave me. He was missing one eye and his fur was really worn out, but I took him everywhere — to school, on holiday, even to the dentist. I used to tell him all my secrets. My mum tried to wash him once and I cried the whole time because I thought he'd be ruined. Believe it or not, I still have him in a box somewhere.",
      },
      {
        label: 'Short & Simple',
        answer:
          'It was a teddy bear from my grandmother. I took it everywhere with me.',
      },
    ],
    usefulPhrases: [
      'my favourite ... was...',
      'I took him everywhere',
      'I used to tell him...',
      'believe it or not',
      'I still have ... somewhere',
    ],
  },
  {
    id: 'sp-280',
    topic: 'Childhood & Memories',
    difficulty: 'easy',
    question: 'What games did you play outside with other kids in your neighbourhood?',
    sampleAnswers: [
      {
        label: 'Hide-and-Seek Till Dark',
        answer:
          "We played all sorts of things, but hide-and-seek was definitely the favourite. There were about eight of us on our street, and after school we'd meet up and play until it got dark and our parents started calling us home. We also played tag, skipped rope, and made up our own games with chalk on the ground. None of it cost anything, but we had so much fun. I really miss that feeling of being outside all afternoon.",
      },
    ],
    usefulPhrases: [
      'all sorts of things',
      'was definitely the favourite',
      'until it got dark',
      'we made up our own games',
      'none of it cost anything',
    ],
  },
  {
    id: 'sp-281',
    topic: 'Childhood & Memories',
    difficulty: 'easy',
    question: 'What did you usually eat for breakfast as a child?',
    sampleAnswers: [
      {
        label: "Mum's Rice Porridge",
        answer:
          'Most mornings my mum made rice porridge, sometimes with a little fish or an egg on top. It was quick, warm, and cheap, so it was perfect before school. On weekends we sometimes got a treat — sweet bread from the bakery down the road. I remember standing in line with my dad and choosing the one with the most sugar on it. Even now, the smell of fresh bread takes me straight back.',
      },
    ],
    usefulPhrases: [
      'most mornings...',
      'it was quick, warm, and cheap',
      'on weekends we sometimes got a treat',
      'down the road',
      '... takes me straight back',
    ],
  },
  {
    id: 'sp-282',
    topic: 'Childhood & Memories',
    difficulty: 'medium',
    question: 'Tell me about a time you got into trouble as a kid.',
    sampleAnswers: [
      {
        label: 'The Broken Vase',
        answer:
          "When I was about seven, my cousin and I were playing football inside the house, which we'd been told a hundred times not to do. Of course, I kicked the ball too hard and it smashed my mum's favourite vase. We panicked and tried to glue it back together, but it looked terrible. When she found out, she wasn't angry about the vase so much as the fact that we'd hidden it. I learned that day that telling the truth straight away is always easier.",
      },
    ],
    usefulPhrases: [
      "we'd been told a hundred times not to...",
      'of course, ...',
      'we panicked and tried to...',
      'not so much ... as...',
      'I learned that day that...',
    ],
  },
  {
    id: 'sp-283',
    topic: 'Childhood & Memories',
    difficulty: 'medium',
    question: 'Describe a teacher from primary school you still remember. Why did they stand out?',
    sampleAnswers: [
      {
        label: 'The Storytelling Teacher',
        answer:
          "I'll never forget my teacher in the third grade. She had this amazing way of turning every lesson into a story. Even maths problems became little adventures with characters and silly names. What really made her stand out, though, was how patient she was. I struggled with reading, and instead of making me feel stupid, she'd stay a few minutes after class to practise with me. I think a lot of my love for books comes from her.",
      },
    ],
    usefulPhrases: [
      "I'll never forget...",
      'she had this amazing way of...',
      'what really made her stand out, though, was...',
      'instead of making me feel...',
      'a lot of my ... comes from her',
    ],
  },
  {
    id: 'sp-284',
    topic: 'Childhood & Memories',
    difficulty: 'medium',
    question: 'What is a family trip from your childhood that you still remember clearly?',
    sampleAnswers: [
      {
        label: 'First Time at the Sea',
        answer:
          "The one that comes to mind is the first time we went to the beach. I must have been five or six. We took a long overnight bus, and I barely slept because I was so excited. When I finally saw the sea, I just stood there with my mouth open — I couldn't believe how big it was. We spent the whole day building sandcastles and collecting shells. It wasn't a fancy trip at all, but it felt like magic.",
      },
    ],
    usefulPhrases: [
      'the one that comes to mind is...',
      'I must have been...',
      'I barely slept because...',
      "I couldn't believe how...",
      "it wasn't fancy at all, but...",
    ],
  },
  {
    id: 'sp-285',
    topic: 'Childhood & Memories',
    difficulty: 'medium',
    question: 'Were you a shy child or an outgoing one? Have you changed since then?',
    sampleAnswers: [
      {
        label: 'From Shy to Social',
        answer:
          "I was incredibly shy. I used to hide behind my mum's legs whenever visitors came, and I hated being asked to speak in class. Things started to change when I was a teenager and joined a drama club — mostly because my best friend dragged me there. Pretending to be someone else on stage somehow made it easier to be myself off stage. I'm still a bit quiet in big groups, but I'm far more comfortable than I used to be.",
      },
    ],
    usefulPhrases: [
      'I was incredibly shy',
      'I used to hide behind...',
      'things started to change when...',
      'somehow made it easier to...',
      "I'm far more comfortable than I used to be",
    ],
  },
  {
    id: 'sp-286',
    topic: 'Childhood & Memories',
    difficulty: 'hard',
    question: 'Do you think we remember our childhood accurately, or do we tend to romanticise it?',
    sampleAnswers: [
      {
        label: 'Rose-Tinted Memories',
        answer:
          "I'm pretty sure we romanticise it, at least a little. When I think about my childhood summers, I remember endless sunshine and freedom, but my parents remind me that I was often bored and complained constantly. I think our brains hold on to the emotional highlights and quietly drop the boring or painful bits. That isn't necessarily a bad thing — it helps us feel grateful. But it does mean we should be careful when we say things were 'better back then'.",
      },
    ],
    usefulPhrases: [
      "I'm pretty sure...",
      'at least a little',
      'hold on to the emotional highlights',
      "that isn't necessarily a bad thing",
      'things were better back then',
    ],
  },
  {
    id: 'sp-287',
    topic: 'Childhood & Memories',
    difficulty: 'hard',
    question: 'Should children today be given more freedom to play without adults watching them?',
    sampleAnswers: [
      {
        label: 'Room to Explore',
        answer:
          "On the whole, I'd say yes. When I was a kid, we wandered around the neighbourhood for hours, and that taught us to solve problems, take small risks, and sort out arguments on our own. Many children now have every minute organised and supervised, which I understand — parents want them to be safe. But if kids never fall over or get a bit lost, how do they learn to cope? Of course, it depends on the age and the area, but a bit more freedom would do most kids good.",
      },
    ],
    usefulPhrases: [
      "on the whole, I'd say yes",
      'sort out arguments on our own',
      'take small risks',
      'how do they learn to cope?',
      'would do most kids good',
    ],
  },
  {
    id: 'sp-288',
    topic: 'Childhood & Memories',
    difficulty: 'hard',
    question: 'Which experience from your childhood do you think shaped you the most?',
    sampleAnswers: [
      {
        label: 'Moving House at Ten',
        answer:
          "Probably moving to a new town when I was ten. At the time it felt like the end of the world — I had to leave all my friends and start at a school where I didn't know a single person. The first few months were lonely. But slowly I learned how to introduce myself, join in, and adapt. Looking back, it made me much more flexible. Whenever I face a big change now, I remind myself that I've done it before and it turned out fine.",
      },
    ],
    usefulPhrases: [
      'at the time it felt like the end of the world',
      "I didn't know a single person",
      'looking back, it made me...',
      'whenever I face a big change',
      'it turned out fine',
    ],
  },

  // ── Relationships & Family ────────────────────────────
  {
    id: 'sp-51',
    topic: 'Relationships & Family',
    difficulty: 'easy',
    question: 'Tell me about your family.',
    sampleAnswers: [
      {
        label: 'A Close Family',
        answer:
          "There are four of us — my parents, my younger sister, and me. My dad is quiet and funny in a dry way, and my mum is the organiser who knows everyone's plans. My sister and I argued all the time as kids, but now we're close and talk almost every day. My grandparents live nearby too, so we often have big meals together on Sundays. It can be noisy, but I wouldn't change it.",
      },
      {
        label: 'Short & Simple',
        answer:
          "There are four of us. We're close, and we eat together every Sunday.",
      },
    ],
    usefulPhrases: [
      'There are... of us',
      'funny in a dry way',
      'we argued all the time as kids',
      "I wouldn't change it",
    ],
  },
  {
    id: 'sp-52',
    topic: 'Relationships & Family',
    difficulty: 'medium',
    question: 'How do you maintain friendships as an adult?',
    sampleAnswers: [
      {
        label: 'Keeping in Touch',
        answer:
          "It's definitely harder than when you're in school, where you see your friends every day. Now everyone has different schedules, some friends have moved to other cities. What works for me is having regular routines — like I play badminton with a group every Wednesday, and I have a Telegram group with my close friends where we chat daily. I also try to make an effort to meet up in person at least once or twice a month. It takes more effort as an adult, but it's worth it.",
      },
    ],
    usefulPhrases: [
      "It's definitely harder than when...",
      'What works for me is having regular routines.',
      'I also try to make an effort to...',
      'It takes more effort as an adult.',
      "but it's worth it.",
    ],
  },
  {
    id: 'sp-80',
    topic: 'Relationships & Family',
    difficulty: 'easy',
    question: 'How do you stay in touch with family and friends who live far away?',
    sampleAnswers: [
      {
        label: 'Video Calls & Small Messages',
        answer:
          'Mostly through small, regular contact rather than long catch-ups. I have a family group chat where we share photos and silly things every day, and I video-call my parents every Sunday. With friends far away, I try to send a quick message when something reminds me of them. It sounds small, but those little messages keep the connection alive between the times we actually see each other.',
      },
    ],
    usefulPhrases: [
      'small, regular contact',
      'every Sunday',
      'when something reminds me of them',
      'keep the connection alive',
    ],
  },
  {
    id: 'sp-81',
    topic: 'Relationships & Family',
    difficulty: 'medium',
    question: 'What qualities do you look for in a close friend?',
    sampleAnswers: [
      {
        label: 'Honesty & Consistency',
        answer:
          "The first thing is honesty — someone who'll tell me when they think I'm wrong, not just agree with me. That's rarer than it sounds. The second is consistency. I'd much rather have a friend who reliably shows up than one who's very warm when they're in the mood and unreachable the rest of the time. And I think a sense of humour is underrated. Some of my closest friendships are built on being able to laugh at ourselves. What I don't need is someone who has everything in common with me — some of my best conversations are with people who see things completely differently.",
      },
    ],
    usefulPhrases: [
      "That's rarer than it sounds",
      "I'd much rather have... than...",
      'reliably shows up',
      'is underrated',
      'being able to laugh at ourselves',
      'see things completely differently',
    ],
  },
  {
    id: 'sp-82',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: 'How has your relationship with your parents changed as you got older?',
    sampleAnswers: [
      {
        label: 'From Authority to Equals',
        answer:
          "It's shifted from being quite strict to something much closer to equals. When I was younger, conversations were mostly my parents advising and me listening. Now they ask my opinion, especially about health or money, and I've started to see them as people with their own worries rather than just as parents. I've also become more forgiving — things that frustrated me as a teenager, like how much they worry, I now understand much better.",
      },
    ],
    usefulPhrases: [
      "It's shifted from... to...",
      'people with their own worries',
      "I've become more forgiving",
      'I now understand much better',
    ],
  },
  {
    id: 'sp-109',
    topic: 'Relationships & Family',
    difficulty: 'easy',
    question: 'How do you usually spend time with your family on weekends?',
    sampleAnswers: [
      {
        label: 'A Regular Lunch',
        answer:
          "It's pretty simple, actually — I go to my parents' place for lunch most Sundays. Nothing is really planned, we just sit around the table for a couple of hours, and my mom always cooks way more than we need. My sister usually comes too if she's free. It's not exciting to describe, but it's become the one fixed point in my week that I'd genuinely be upset to miss.",
      },
    ],
    usefulPhrases: [
      "it's pretty simple, actually",
      'nothing is really planned',
      'we just sit around and...',
      "it's not exciting to describe, but...",
      "the one fixed point in my week",
    ],
  },
  {
    id: 'sp-110',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: 'Who has had the biggest influence on the person you are today?',
    sampleAnswers: [
      {
        label: 'A Quiet Influence',
        answer:
          "I'd probably say my grandmother, even though she'd never describe herself as an influence on anyone. She never lectured, she just did things a certain way — patient, generous with her time, never in a rush to judge people. I didn't notice it growing up, but a lot of how I try to treat people now, I can trace straight back to just watching how she was with everyone around her. It's strange how the biggest influences are often the quiet ones, not the dramatic advice-giving kind.",
      },
    ],
    usefulPhrases: [
      "I'd probably say...",
      "even though she'd never describe herself as...",
      'she never lectured, she just...',
      'I can trace straight back to...',
      'the biggest influences are often the quiet ones',
    ],
  },
  {
    id: 'sp-111',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: "Is there a family tradition you'd like to pass on?",
    sampleAnswers: [
      {
        label: 'The Sunday Meal',
        answer:
          "Probably the Sunday family lunch I mentioned before — it sounds small, but I think it's the thing that's actually kept us close as everyone's gotten busier with their own lives. Nobody has to be anywhere else, nobody's checking their phone. I'd want to keep that going myself someday, even if the food or the day changes. I think what matters isn't the specific tradition, it's just having some fixed, low-effort reason for everyone to be in the same room regularly.",
      },
    ],
    usefulPhrases: [
      'it sounds small, but...',
      "the thing that's actually kept us close",
      "as everyone's gotten busier with...",
      "I'd want to keep that going myself",
      "what matters isn't... it's...",
    ],
  },
  {
    id: 'sp-122',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: "What's a lesson your parents taught you that you didn't appreciate until later?",
    sampleAnswers: [
      {
        label: 'Delayed Understanding',
        answer:
          "My dad always insisted on saving a fixed amount every month, no matter how small my allowance was as a kid, and at the time it just felt like a rule I had to follow for no reason. It wasn't until I had my own income and my own emergencies that I understood what he was actually teaching me — not the amount, but the habit of not spending everything just because you have it. I wish I'd told him that at some point, instead of only realizing it years later.",
      },
    ],
    usefulPhrases: [
      'no matter how small...',
      'it just felt like a rule I had to follow',
      'it wasn\'t until... that I understood...',
      'not the amount, but the habit of...',
      "I wish I'd told him that",
    ],
  },
  {
    id: 'sp-123',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: 'How do you usually resolve an argument with someone close to you?',
    sampleAnswers: [
      {
        label: 'Cooling Off First',
        answer:
          "I've learned I'm not good at resolving anything in the heat of the moment, so my first move is usually to say I need a bit of time rather than push through it right away. Once I've actually cooled down, I try to go back to them instead of waiting for them to come to me, because the person who waits usually waits too long. What helps most is asking what they actually needed from the situation, rather than just defending my side of it.",
      },
    ],
    usefulPhrases: [
      "I'm not good at... in the heat of the moment",
      'my first move is usually to...',
      'rather than push through it right away',
      "the person who waits usually waits too long",
      'rather than just defending my side of it',
    ],
  },
  {
    id: 'sp-193',
    topic: 'Relationships & Family',
    difficulty: 'easy',
    question: 'Do you have any brothers or sisters?',
    sampleAnswers: [
      {
        label: 'One Older Brother',
        answer:
          "Yes, I have one older brother. When we were kids, he loved to tease me, and we fought about everything — the TV, the last piece of cake, who sat in the front seat. Now we get along really well. He lives in another city, so we don't see each other often, but we message almost every day, mostly sending each other funny videos.",
      },
    ],
    usefulPhrases: [
      'he loved to tease me',
      'we fought about everything',
      'we get along really well',
      "we don't see each other often, but...",
    ],
  },
  {
    id: 'sp-194',
    topic: 'Relationships & Family',
    difficulty: 'medium',
    question: 'How do you make new friends as an adult?',
    sampleAnswers: [
      {
        label: 'Through Activities',
        answer:
          "Honestly, it's much harder than when you're at school, where you're with the same people every day. What works for me is joining things that happen regularly — a sports club, a language exchange, a cooking class. Seeing the same faces every week makes it natural to start talking. The other trick is to be the one who suggests coffee afterwards. Most people want new friends too; they're just waiting for someone else to ask.",
      },
    ],
    usefulPhrases: [
      "it's much harder than when...",
      'What works for me is...',
      'the same faces every week',
      "they're just waiting for someone else to ask",
    ],
  },
  {
    id: 'sp-289',
    topic: 'Relationships & Family',
    difficulty: 'easy',
    question: 'Who do you live with at the moment?',
    sampleAnswers: [
      {
        label: 'Home with My Parents',
        answer:
          "At the moment I live with my parents and my younger brother. It's a fairly small house, so we're always bumping into each other, but it's lively and there's always someone to talk to. My mum does most of the cooking, and my brother and I take turns washing up — though he tries to get out of it whenever he can. It can be noisy, but honestly, I'd miss it if I moved out.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I live with my parents and my younger brother. It's noisy, but I like it.",
      },
    ],
    usefulPhrases: [
      'at the moment I live with...',
      "we're always bumping into each other",
      'we take turns ...-ing',
      'he tries to get out of it',
      "I'd miss it if...",
    ],
  },
  {
    id: 'sp-290',
    topic: 'Relationships & Family',
    difficulty: 'easy',
    question: 'What do you and your family usually talk about at meal times?',
    sampleAnswers: [
      {
        label: 'Dinner Table Chat',
        answer:
          "Mostly everyday stuff — what happened during the day, who we bumped into, what's going on with the neighbours. My dad loves to talk about the news, and he always asks for everyone's opinion, which sometimes turns into a friendly debate. My grandmother tells the same old stories, but we still laugh every time. We have a rule that nobody looks at their phone during dinner, so it's really the one time we're all properly together.",
      },
    ],
    usefulPhrases: [
      'mostly everyday stuff',
      "what's going on with...",
      'turns into a friendly debate',
      'we still laugh every time',
      "it's the one time we're all properly together",
    ],
  },
  {
    id: 'sp-291',
    topic: 'Relationships & Family',
    difficulty: 'easy',
    question: 'Which relative do you see most often, and what do you do together?',
    sampleAnswers: [
      {
        label: 'Sundays with My Aunt',
        answer:
          "That would be my aunt — my mum's sister. She lives just ten minutes away, so we see her almost every Sunday. Usually she comes over for lunch, and afterwards we go for a walk or sit in the garden drinking tea. She's really funny and a bit nosy, so she always wants to know what's new in my life. I don't mind, though; she gives great advice.",
      },
    ],
    usefulPhrases: [
      'that would be...',
      'she comes over for...',
      'a bit nosy',
      "what's new in my life",
      "I don't mind, though",
    ],
  },
  {
    id: 'sp-292',
    topic: 'Relationships & Family',
    difficulty: 'medium',
    question: 'Do you take after your mother or your father more? In what ways?',
    sampleAnswers: [
      {
        label: "My Father's Temper, My Mother's Laugh",
        answer:
          "People always say I look like my dad, and I suppose I've got his stubbornness too — once I've decided something, it's hard to change my mind. But in terms of personality, I take after my mum much more. We're both chatty, we laugh at the same silly things, and we both get emotional at sad films. My friends say when they hear me on the phone, they can't tell if it's me or her. It's quite funny, actually.",
      },
    ],
    usefulPhrases: [
      'people always say...',
      'I take after my mum/dad',
      'in terms of personality',
      "once I've decided something, it's hard to...",
      "it's quite funny, actually",
    ],
  },
  {
    id: 'sp-293',
    topic: 'Relationships & Family',
    difficulty: 'medium',
    question: 'Tell me about a family celebration that was especially memorable.',
    sampleAnswers: [
      {
        label: "Grandpa's 80th Birthday",
        answer:
          "A couple of years ago we threw a surprise party for my grandfather's eightieth birthday. Relatives came from all over, some of whom I hadn't seen in a decade. We secretly decorated the house while my uncle took him out for a long walk. When he came back and everyone shouted 'Surprise!', he was speechless, and then he started crying. Later that night he gave a little speech about each of us. It was one of those evenings you never forget.",
      },
    ],
    usefulPhrases: [
      'we threw a surprise party for...',
      "some of whom I hadn't seen in...",
      'he was speechless',
      'he gave a little speech about...',
      'one of those evenings you never forget',
    ],
  },
  {
    id: 'sp-294',
    topic: 'Relationships & Family',
    difficulty: 'medium',
    question: "How are family roles in your home different from those in your grandparents' generation?",
    sampleAnswers: [
      {
        label: 'Sharing the Load',
        answer:
          "They're quite different. In my grandparents' time, my grandfather was the one who earned money and my grandmother did literally everything at home — cooking, cleaning, raising five children. In my house now, my parents share things much more equally. My dad cooks at least half the meals, and decisions are made together. My grandmother sometimes jokes that she was born too early. I think the change is a good one, even if it took a long time.",
      },
    ],
    usefulPhrases: [
      "they're quite different",
      "in my grandparents' time...",
      'share things much more equally',
      'she was born too early',
      'even if it took a long time',
    ],
  },
  {
    id: 'sp-295',
    topic: 'Relationships & Family',
    difficulty: 'medium',
    question: 'Tell me about a time a family member really supported you.',
    sampleAnswers: [
      {
        label: 'My Sister Had My Back',
        answer:
          "When I failed an important exam a few years ago, I was devastated and didn't want to tell anyone. My older sister noticed something was wrong and practically forced me to talk. Instead of lecturing me, she just listened, and then she helped me make a study plan for the retake. She even quizzed me every evening for a month. I passed the second time, and I honestly don't think I would have without her. She really had my back.",
      },
    ],
    usefulPhrases: [
      'I was devastated',
      'noticed something was wrong',
      'instead of lecturing me, she just listened',
      "I don't think I would have without her",
      'she really had my back',
    ],
  },
  {
    id: 'sp-296',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: 'Is it better for young adults to live with their parents or move out on their own?',
    sampleAnswers: [
      {
        label: 'It Depends on the Family',
        answer:
          "I don't think there's one right answer. Moving out teaches you to be independent — you learn to manage money, cook, and solve your own problems, which is hugely valuable. On the other hand, staying at home can make a lot of sense financially, and in many cultures it's simply normal and keeps families close. For me, the key is whether you're growing as a person. If living at home means you never take responsibility, that's a problem. If you contribute and respect each other, it can work really well.",
      },
    ],
    usefulPhrases: [
      "I don't think there's one right answer",
      'which is hugely valuable',
      'on the other hand, ...',
      'it can make a lot of sense financially',
      'for me, the key is whether...',
    ],
  },
  {
    id: 'sp-297',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: 'Do you think family is defined by blood, or by the people who are there for you?',
    sampleAnswers: [
      {
        label: 'Chosen Family',
        answer:
          "I'd lean towards the second. Blood relatives matter, of course, and I'm lucky to be close to mine. But I know people whose relatives have hurt them badly, and it would be strange to tell them that's their 'real' family. To me, family means the people who show up when things go wrong — who remember your birthday and sit with you in hospital. Sometimes that's a parent, and sometimes it's a friend you met at twenty. Both count.",
      },
    ],
    usefulPhrases: [
      "I'd lean towards...",
      "I'm lucky to be close to...",
      'it would be strange to...',
      'the people who show up when things go wrong',
      'both count',
    ],
  },
  {
    id: 'sp-298',
    topic: 'Relationships & Family',
    difficulty: 'hard',
    question: 'How can families stay close while still giving each other personal space?',
    sampleAnswers: [
      {
        label: 'Closeness with Boundaries',
        answer:
          "It's a tricky balance. In my experience, the closest families aren't the ones who spend every minute together, but the ones who respect each other's boundaries. That might mean knocking before you enter a room, or not asking a hundred questions when someone's in a bad mood. At the same time, you need some shared rituals — a weekly dinner, a phone call — so you don't drift apart. Space without connection becomes distance, but connection without space becomes suffocating.",
      },
    ],
    usefulPhrases: [
      "it's a tricky balance",
      'in my experience, ...',
      "respect each other's boundaries",
      "so you don't drift apart",
      'without ... becomes ...',
    ],
  },

  // ── Future Plans ──────────────────────────────────────
  {
    id: 'sp-20',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: 'What are your goals for learning English?',
    sampleAnswers: [
      {
        label: 'Speaking With Confidence',
        answer:
          "My main goal is to feel relaxed when I speak, not just correct. I can read and write pretty well, but speaking is where I struggle — especially when people talk fast or use a lot of slang. I want to get to the point where I can tell a funny story or make a joke in English, not just translate in my head. I'd also love to travel and chat with locals without needing an app.",
      },
    ],
    usefulPhrases: [
      'My main goal is to...',
      '... is where I struggle',
      'I want to get to the point where...',
      'not just translate in my head',
    ],
  },
  {
    id: 'sp-47',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: 'Do you think you will live in the same place long-term?',
    sampleAnswers: [
      {
        label: 'Thoughtful Answer',
        answer:
          "For now, yes. Where I live has most of what I need — good weather, affordable living, and my family nearby. But I wouldn't rule out living somewhere else for a year or two just for the experience, maybe even abroad. I think living away changes how you see your own home. Still, I always imagine coming back eventually. Home is hard to beat.",
      },
    ],
    usefulPhrases: [
      'For now, yes.',
      "I wouldn't rule out...",
      'just for the experience',
      'is hard to beat',
    ],
  },
  {
    id: 'sp-201',
    topic: 'Future Plans',
    difficulty: 'easy',
    question: "What's something you're looking forward to this year?",
    sampleAnswers: [
      {
        label: 'A Trip With Friends',
        answer:
          "A trip with my old school friends. We've been talking about it for three years and finally booked it — five days in the mountains in December. It'll be the first time all of us have been together since we were students. I'm looking forward to the scenery, but mostly to staying up late talking like we used to.",
      },
    ],
    usefulPhrases: [
      "We've been talking about it for...",
      'finally booked it',
      "It'll be the first time...",
      'like we used to',
    ],
  },
  {
    id: 'sp-202',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: 'Is there a skill you want to learn in the next few years?',
    sampleAnswers: [
      {
        label: 'Swimming Properly',
        answer:
          "I'd like to learn to swim properly. I can keep myself above water, but my technique is terrible and I get tired after one length. I'd love to be able to swim a kilometre in the sea comfortably. I think I'll take a few lessons this summer and then practise twice a week. It's a skill that keeps you safe and that you can enjoy your whole life.",
      },
    ],
    usefulPhrases: [
      "I'd like to learn to...",
      'my technique is terrible',
      "I think I'll...",
      'you can enjoy your whole life',
    ],
  },
  {
    id: 'sp-203',
    topic: 'Future Plans',
    difficulty: 'hard',
    question: 'Do you think it is important to have a long-term plan for your life?',
    sampleAnswers: [
      {
        label: 'Direction, Not a Map',
        answer:
          "I think it's important to have a direction, but not a detailed map. If you plan every step for ten years, life will surprise you anyway and you might feel like a failure when things change. But having no idea at all where you're going makes it easy to drift. So I try to know roughly what matters to me — health, family, learning, seeing the world — and make decisions that move me that way, while staying open to surprises.",
      },
    ],
    usefulPhrases: [
      'a direction, but not a detailed map',
      'life will surprise you anyway',
      'makes it easy to drift',
      'staying open to surprises',
    ],
  },
  {
    id: 'sp-260',
    topic: 'Future Plans',
    difficulty: 'easy',
    question: 'Where would you like to travel next?',
    sampleAnswers: [
      {
        label: 'Somewhere With Mountains',
        answer:
          "Somewhere with mountains and cool weather, maybe a few days of hiking. I've spent most of my holidays at the beach, so I want to try something different. I'd love to stay in a small guesthouse, wake up to a view of the hills, and do absolutely nothing in the evening.",
      },
    ],
    usefulPhrases: [
      'I want to try something different',
      'wake up to a view of...',
      "I'd love to...",
      'do absolutely nothing',
    ],
  },
  {
    id: 'sp-261',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: 'What is one thing you want to do before you turn fifty?',
    sampleAnswers: [
      {
        label: 'Live Abroad for a While',
        answer:
          "I'd like to live in another country for at least six months — not as a tourist, but properly, shopping at the local market and learning the language. I think you only really understand a place when you have a routine there. It would also be a good test of how adaptable I am.",
      },
    ],
    usefulPhrases: [
      'for at least...',
      'not as a tourist, but properly',
      'you only really understand... when...',
      'a good test of...',
    ],
  },
  {
    id: 'sp-299',
    topic: 'Future Plans',
    difficulty: 'easy',
    question: 'What are your plans for this weekend?',
    sampleAnswers: [
      {
        label: 'A Lazy Saturday',
        answer:
          "Nothing too exciting, to be honest. On Saturday I'm planning to sleep in, then meet a friend for brunch at a new café that just opened near my place. In the afternoon I'll probably do some cleaning, because my room is a complete mess. Sunday is family day, so I'll have lunch with my parents. If the weather's nice, we might go for a walk by the river in the evening.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I'm going to relax, see a friend, and have lunch with my family.",
      },
    ],
    usefulPhrases: [
      'nothing too exciting, to be honest',
      "I'm planning to sleep in",
      'a complete mess',
      'if the weather is nice, we might...',
    ],
  },
  {
    id: 'sp-300',
    topic: 'Future Plans',
    difficulty: 'easy',
    question: 'Is there something you are saving up for right now?',
    sampleAnswers: [
      {
        label: 'Saving for a Trip',
        answer:
          "Yes, I'm saving up for a trip to the mountains next spring. I've wanted to go hiking there for ages, so I put a little money aside every month. I've also cut back on eating out and buying coffee every day, which has actually made a big difference. I've got about half of what I need so far. It feels good to have a goal — it makes saving much less painful.",
      },
    ],
    usefulPhrases: [
      "I'm saving up for...",
      "I've wanted to ... for ages",
      'I put a little money aside',
      "I've cut back on...",
      'it makes ... much less painful',
    ],
  },
  {
    id: 'sp-301',
    topic: 'Future Plans',
    difficulty: 'easy',
    question: "What's on your to-do list for the next month?",
    sampleAnswers: [
      {
        label: 'Getting Organised',
        answer:
          "Quite a few things, actually. First, I need to renew some documents before they expire, which I keep putting off. I also want to sort out my wardrobe and give away clothes I never wear. My best friend's birthday is coming up, so I have to find a present. And I've promised myself I'll read at least two books this month. Writing it all down helps, otherwise I'd forget half of it.",
      },
    ],
    usefulPhrases: [
      'quite a few things, actually',
      'I keep putting it off',
      'sort out my wardrobe',
      '... is coming up',
      "I've promised myself I'll...",
    ],
  },
  {
    id: 'sp-302',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: 'How do you usually make big decisions about your future?',
    sampleAnswers: [
      {
        label: 'Lists and Long Walks',
        answer:
          "I'm quite methodical about it. First, I write a list of pros and cons — it sounds old-fashioned, but seeing everything on paper really helps. Then I talk it through with one or two people I trust, usually my mum and my closest friend. Finally, I go for a long walk on my own and see how I feel. Often my gut already knows the answer, and the list just confirms it. I try not to rush, because I've regretted quick decisions before.",
      },
    ],
    usefulPhrases: [
      "I'm quite methodical about it",
      'a list of pros and cons',
      'I talk it through with...',
      'my gut already knows the answer',
      "I've regretted quick decisions before",
    ],
  },
  {
    id: 'sp-303',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: "Tell me about a plan that didn't go the way you expected.",
    sampleAnswers: [
      {
        label: 'The Rainy Camping Trip',
        answer:
          "Last year a group of us planned a camping trip for months. We booked a spot by a lake, bought new tents, the whole thing. Then on the first night it started pouring with rain, and one of the tents leaked so badly we had to squeeze into the car to sleep. At the time we were miserable, but now it's the story we tell more than any other. It taught me that plans are just a starting point.",
      },
    ],
    usefulPhrases: [
      'we planned ... for months',
      'the whole thing',
      'it started pouring with rain',
      'at the time we were miserable, but...',
      'plans are just a starting point',
    ],
  },
  {
    id: 'sp-304',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: 'When you travel, do you prefer to plan every detail or decide things on the spot? Why?',
    sampleAnswers: [
      {
        label: 'Rough Plan, Open Days',
        answer:
          "I go for a rough plan. I always book where I'm staying and check how to get around, because I hate arriving somewhere late at night with no bed. But I don't like having every hour scheduled. Some of my favourite travel moments came from wandering down a random street or taking a local's recommendation. If everything is fixed, you miss those little surprises. So: book the essentials, then leave the days open.",
      },
    ],
    usefulPhrases: [
      'I go for a rough plan',
      'check how to get around',
      "I don't like having every hour scheduled",
      "taking a local's recommendation",
      'book the essentials',
    ],
  },
  {
    id: 'sp-305',
    topic: 'Future Plans',
    difficulty: 'medium',
    question: 'What kind of home would you like to live in one day, and why?',
    sampleAnswers: [
      {
        label: 'A House with a Garden',
        answer:
          "Ideally, a small house with a garden somewhere a bit outside the city. I don't need anything big or fancy, but I'd love a space to grow vegetables and maybe keep a dog. Growing up, we lived in a cramped apartment, so having some outdoor space feels like a real luxury to me. I'd also want a big kitchen table, because I picture friends coming over for long dinners. That's my idea of a happy home.",
      },
    ],
    usefulPhrases: [
      'ideally, ...',
      "I don't need anything big or fancy",
      'feels like a real luxury to me',
      'I picture ... -ing',
      "that's my idea of...",
    ],
  },
  {
    id: 'sp-306',
    topic: 'Future Plans',
    difficulty: 'hard',
    question: 'If you could know one thing about your future, what would you want to know?',
    sampleAnswers: [
      {
        label: 'Better Not to Know?',
        answer:
          "That's a tough one. My first instinct is to ask whether the people I love will be healthy and happy — that's what really matters to me. But the more I think about it, the less sure I am that I'd want to know anything at all. If the answer were bad, I'd spend years dreading it; if it were good, I might stop trying. Part of what makes life meaningful is not knowing. So maybe I'd just ask whether I'll still be learning new things at eighty.",
      },
    ],
    usefulPhrases: [
      "that's a tough one",
      'my first instinct is to...',
      'the more I think about it, the less sure I am',
      "I'd spend years dreading it",
      'part of what makes life meaningful is...',
    ],
  },
  {
    id: 'sp-307',
    topic: 'Future Plans',
    difficulty: 'hard',
    question: 'Is it better to set ambitious goals or realistic ones?',
    sampleAnswers: [
      {
        label: 'Aim High, Step Small',
        answer:
          "I think you need both, working at different levels. An ambitious goal gives you direction and excitement — it's the thing that gets you out of bed. But if that's all you have, you can easily feel like a failure because progress seems so slow. So I like to set one big, slightly crazy goal and then break it down into small, realistic steps. Each step feels achievable, and together they add up. Even if you never reach the big goal, you end up much further than if you'd aimed low.",
      },
    ],
    usefulPhrases: [
      'you need both',
      'it gets you out of bed',
      'break it down into small steps',
      'together they add up',
      "much further than if you'd aimed low",
    ],
  },
  {
    id: 'sp-308',
    topic: 'Future Plans',
    difficulty: 'hard',
    question: 'How do you imagine your everyday life will look in twenty years?',
    sampleAnswers: [
      {
        label: 'Slower and Fuller',
        answer:
          "I hope it'll be slower but fuller, if that makes sense. I imagine waking up without rushing, maybe tending a garden, and having more time for the people I care about. I'd like to have kept up my hobbies and picked up a few new ones. Of course, life rarely goes to plan, and twenty years is a long time. But whatever happens, I hope I'm still curious and still laughing with old friends. That matters more to me than where I live or what I own.",
      },
    ],
    usefulPhrases: [
      'if that makes sense',
      'I imagine ... -ing',
      'life rarely goes to plan',
      "whatever happens, I hope I'm still...",
      'that matters more to me than...',
    ],
  },

  // ── Feelings & Emotions ───────────────────────────────
  {
    id: 'sp-208',
    topic: 'Feelings & Emotions',
    difficulty: 'easy',
    question: 'What usually puts you in a good mood?',
    sampleAnswers: [
      {
        label: 'Sunshine and Music',
        answer:
          "A sunny morning and a good song. If I wake up and the light is coming through the window, I'm already halfway to a good day. Then if the right song comes on while I'm making breakfast, that's it — nothing can ruin my mood. Small surprises help too, like a message from an old friend.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Sunshine, good music, and hearing from friends.',
      },
    ],
    usefulPhrases: [
      "I'm already halfway to...",
      'the right song comes on',
      'nothing can ruin my mood',
      'Small surprises help too',
    ],
  },
  {
    id: 'sp-209',
    topic: 'Feelings & Emotions',
    difficulty: 'easy',
    question: 'What do you do when you feel sad?',
    sampleAnswers: [
      {
        label: 'Give It Time',
        answer:
          "First, I let myself feel it instead of pretending everything's fine. Then I usually do something simple and comforting — make a hot drink, take a long shower, or go for a walk. If it lasts more than a day, I call someone I trust. Just saying it out loud often makes it feel smaller.",
      },
    ],
    usefulPhrases: [
      'I let myself feel it',
      'instead of pretending...',
      'something simple and comforting',
      'makes it feel smaller',
    ],
  },
  {
    id: 'sp-210',
    topic: 'Feelings & Emotions',
    difficulty: 'medium',
    question: 'When was the last time you felt really proud of yourself?',
    sampleAnswers: [
      {
        label: 'Finishing a Long Walk',
        answer:
          "A few months ago I finished a twenty-kilometre charity walk. I'm not very sporty, and around kilometre fifteen my feet hurt so much I wanted to quit. But a stranger walking next to me started chatting, and before I knew it we could see the finish line. I wasn't proud because it was impressive — lots of people did it — but because I didn't give up when I really wanted to.",
      },
    ],
    usefulPhrases: [
      'before I knew it',
      'I wanted to quit',
      "I wasn't proud because..., but because...",
      "I didn't give up",
    ],
  },
  {
    id: 'sp-211',
    topic: 'Feelings & Emotions',
    difficulty: 'medium',
    question: 'Do you find it easy to talk about your feelings?',
    sampleAnswers: [
      {
        label: 'Getting Better',
        answer:
          "Not really, but I'm getting better. I grew up in a family where people showed love by doing things — cooking for you, fixing your bike — rather than saying it. So I'm much more comfortable showing I care than explaining how I feel. With close friends I've learned to be more open, and I've noticed it actually makes the friendship stronger, not weaker.",
      },
    ],
    usefulPhrases: [
      "Not really, but I'm getting better.",
      'showed love by doing things',
      "I'm much more comfortable... than...",
      'makes... stronger, not weaker',
    ],
  },
  {
    id: 'sp-212',
    topic: 'Feelings & Emotions',
    difficulty: 'hard',
    question: 'Is it always good to show your emotions?',
    sampleAnswers: [
      {
        label: 'It Depends on the Moment',
        answer:
          "I don't think it's always good, but hiding them all the time is worse. Emotions are information — they tell you and the people around you what matters. But timing is important. If I'm angry in the middle of an argument, saying everything I feel right then usually makes it worse. I think the healthy way is to notice the feeling, give it a little time, and then share it calmly.",
      },
    ],
    usefulPhrases: [
      "I don't think it's always..., but...",
      'Emotions are information',
      'timing is important',
      'give it a little time',
    ],
  },
  {
    id: 'sp-309',
    topic: 'Feelings & Emotions',
    difficulty: 'easy',
    question: 'How are you feeling today, and why?',
    sampleAnswers: [
      {
        label: 'Pretty Good, Actually',
        answer:
          "Pretty good, actually! I slept really well last night, which doesn't happen often, so I've got plenty of energy. The weather's lovely too — sunny but not too hot. I'm also a bit excited because I'm meeting an old friend for dinner tonight and we haven't seen each other in months. The only thing is I'm slightly tired of studying, but overall it's a good day.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I'm feeling good today. I slept well and I'm seeing a friend tonight.",
      },
    ],
    usefulPhrases: [
      'pretty good, actually',
      "which doesn't happen often",
      "I've got plenty of energy",
      'the only thing is...',
      "overall it's a good day",
    ],
  },
  {
    id: 'sp-310',
    topic: 'Feelings & Emotions',
    difficulty: 'easy',
    question: 'What do you like to listen to when you feel stressed?',
    sampleAnswers: [
      {
        label: 'Calm Piano Music',
        answer:
          "When I'm stressed, I usually put on some calm piano music or the sound of rain. Anything with lyrics tends to make my mind even busier, so I avoid it. I'll lie down, close my eyes, and just breathe for ten minutes. It sounds simple, but it really works for me. Sometimes, if I need cheering up instead, I'll switch to old songs from my teenage years and sing along loudly.",
      },
    ],
    usefulPhrases: [
      'I usually put on...',
      'tends to make my mind even busier',
      'it sounds simple, but it really works for me',
      'if I need cheering up',
      'sing along loudly',
    ],
  },
  {
    id: 'sp-311',
    topic: 'Feelings & Emotions',
    difficulty: 'easy',
    question: 'What makes you laugh the most?',
    sampleAnswers: [
      {
        label: 'Silly Animals and Old Friends',
        answer:
          "Definitely animals doing silly things — a cat falling off a sofa gets me every time. But what really makes me laugh until I cry is spending time with my oldest friends. We have so many inside jokes that just one word can set us off. Sometimes we can't even explain to other people what's so funny. I think laughing like that is one of the best feelings in the world.",
      },
    ],
    usefulPhrases: [
      '... gets me every time',
      'laugh until I cry',
      'inside jokes',
      'just one word can set us off',
      'one of the best feelings in the world',
    ],
  },
  {
    id: 'sp-312',
    topic: 'Feelings & Emotions',
    difficulty: 'medium',
    question: 'Tell me about a time you felt really nervous.',
    sampleAnswers: [
      {
        label: 'My First Speech',
        answer:
          "The most nervous I've ever been was when I had to give a speech at my cousin's wedding. I'd practised for weeks, but when I stood up and saw everyone looking at me, my hands were shaking and my mind went blank. I had to look down at my notes for the first minute. Then someone laughed at one of my jokes, and suddenly I relaxed. In the end it went well, but I've never felt my heart beat so fast.",
      },
    ],
    usefulPhrases: [
      "the most nervous I've ever been was...",
      'my mind went blank',
      'my hands were shaking',
      'suddenly I relaxed',
      'in the end it went well',
    ],
  },
  {
    id: 'sp-313',
    topic: 'Feelings & Emotions',
    difficulty: 'medium',
    question: 'How do you calm yourself down when you are angry?',
    sampleAnswers: [
      {
        label: 'Step Away First',
        answer:
          "The main thing I've learned is to step away before I say something I'll regret. If I'm angry, I usually leave the room and go for a quick walk or wash my face with cold water. Counting slowly to ten sounds like a cliché, but it genuinely helps. Once I've cooled down, I try to work out what actually upset me, because often it's not the thing I was shouting about. Then I come back and talk calmly.",
      },
    ],
    usefulPhrases: [
      "the main thing I've learned is...",
      "before I say something I'll regret",
      'it sounds like a cliché, but...',
      "once I've cooled down",
      'work out what actually upset me',
    ],
  },
  {
    id: 'sp-314',
    topic: 'Feelings & Emotions',
    difficulty: 'medium',
    question: 'Describe a moment when you felt truly grateful.',
    sampleAnswers: [
      {
        label: 'Kindness from a Stranger',
        answer:
          "A few years ago I got lost in a town I was visiting, it was getting dark, and my phone had died. An elderly woman noticed I looked worried and not only gave me directions but walked me all the way to my hostel, even though it was twenty minutes out of her way. She wouldn't accept anything in return. I remember feeling such a wave of gratitude. Since then I try to do the same for lost travellers whenever I can.",
      },
    ],
    usefulPhrases: [
      'I got lost in...',
      'twenty minutes out of her way',
      "she wouldn't accept anything in return",
      'a wave of gratitude',
      'I try to do the same whenever I can',
    ],
  },
  {
    id: 'sp-315',
    topic: 'Feelings & Emotions',
    difficulty: 'medium',
    question: 'Has a film or book ever made you emotional? Why do you think it affected you?',
    sampleAnswers: [
      {
        label: 'The Ending That Got Me',
        answer:
          'Yes, more than once! The one I remember most is a film about an old man who loses his wife and goes on an adventure in his flying house — Up. The first ten minutes, showing their whole life together, made me cry like a baby. I think it hit me because it reminded me of my grandparents and how quickly a lifetime passes. Stories like that work because they make you think about your own people.',
      },
    ],
    usefulPhrases: [
      'more than once!',
      'the one I remember most is...',
      'made me cry like a baby',
      'it hit me because...',
      'how quickly a lifetime passes',
    ],
  },
  {
    id: 'sp-316',
    topic: 'Feelings & Emotions',
    difficulty: 'hard',
    question: 'Can we really control our emotions, or only how we react to them?',
    sampleAnswers: [
      {
        label: 'Feel It, Choose the Response',
        answer:
          "I'd argue we mostly control our reactions, not the feelings themselves. If someone insults you, you'll probably feel a flash of anger — that just happens. What we can choose is what we do next: shout back, walk away, or try to understand why they said it. That said, I think over time our habits can change our feelings too. If you practise seeing things more calmly, eventually the anger arrives a little softer. So it's a slow, indirect kind of control.",
      },
    ],
    usefulPhrases: [
      "I'd argue...",
      'a flash of anger',
      'what we can choose is...',
      'over time our habits can change...',
      'a slow, indirect kind of control',
    ],
  },
  {
    id: 'sp-317',
    topic: 'Feelings & Emotions',
    difficulty: 'hard',
    question: 'Do you think it is possible, or even desirable, to be happy all the time?',
    sampleAnswers: [
      {
        label: 'Happiness Needs Contrast',
        answer:
          "I don't think it's possible, and I'm not even sure it would be good. Sadness, frustration and boredom all tell us something — that we've lost something important, or that we need a change. If we felt cheerful no matter what, we'd probably stop noticing problems. Also, happy moments feel special partly because of the contrast. For me, a better goal is contentment: a general sense that life is okay, even on the bad days.",
      },
    ],
    usefulPhrases: [
      "I'm not even sure it would be good",
      'they all tell us something',
      'no matter what',
      'partly because of the contrast',
      'a better goal is...',
    ],
  },
  {
    id: 'sp-318',
    topic: 'Feelings & Emotions',
    difficulty: 'hard',
    question: 'Why do you think some people find it so hard to say sorry?',
    sampleAnswers: [
      {
        label: 'Pride Gets in the Way',
        answer:
          "I think it's mostly pride and fear. For some people, apologising feels like admitting they're a bad person, rather than just admitting they made a mistake. They worry it'll make them look weak, or that the other person will use it against them. Ironically, a sincere apology usually makes people respect you more. I also think it depends on how you grew up — if your parents never apologised to you, you might never have learned how.",
      },
    ],
    usefulPhrases: [
      "I think it's mostly...",
      'rather than just admitting...',
      'use it against them',
      'ironically, ...',
      'it depends on how you grew up',
    ],
  },

  // ── Friends & Social Life ─────────────────────────────
  {
    id: 'sp-213',
    topic: 'Friends & Social Life',
    difficulty: 'easy',
    question: 'What do you usually do when you meet your friends?',
    sampleAnswers: [
      {
        label: 'Food and Long Talks',
        answer:
          "Most of the time we eat. We pick a new restaurant or a street food place, order too much, and talk for hours. Sometimes we go to karaoke or play board games at someone's home. Honestly, the activity doesn't matter much — the best evenings are the ones where we lose track of time just chatting.",
      },
      {
        label: 'Short & Simple',
        answer:
          'We usually eat together and talk for hours.',
      },
    ],
    usefulPhrases: [
      'Most of the time we...',
      'order too much',
      "the activity doesn't matter much",
      'lose track of time',
    ],
  },
  {
    id: 'sp-214',
    topic: 'Friends & Social Life',
    difficulty: 'easy',
    question: 'Do you prefer having a few close friends or many friends?',
    sampleAnswers: [
      {
        label: 'A Few Close Ones',
        answer:
          "A few close friends, definitely. I like knowing that there are three or four people I can call at midnight if something goes wrong. Having lots of friends is fun at parties, but it's hard to stay really close to everyone. I'd rather have deep friendships than a big group I only see now and then.",
      },
    ],
    usefulPhrases: [
      '..., definitely',
      'I can call at midnight',
      "it's hard to stay really close to...",
      "I'd rather have... than...",
    ],
  },
  {
    id: 'sp-215',
    topic: 'Friends & Social Life',
    difficulty: 'medium',
    question: 'Tell me about how you met one of your best friends.',
    sampleAnswers: [
      {
        label: 'A Missed Train',
        answer:
          "We met because we both missed the same train. It was late at night, the next one was in two hours, and we were the only two people on the platform. We started complaining together, then found a little noodle shop nearby and ended up talking about everything. By the time the train came, it felt like we'd known each other for years. That was almost ten years ago.",
      },
    ],
    usefulPhrases: [
      'We met because...',
      'we ended up...',
      "it felt like we'd known each other for years",
      'That was almost... ago',
    ],
  },
  {
    id: 'sp-216',
    topic: 'Friends & Social Life',
    difficulty: 'medium',
    question: 'Is it okay to lend money to friends?',
    sampleAnswers: [
      {
        label: 'Small Amounts Only',
        answer:
          "I think it's okay for small amounts, but I'm careful with big ones. Money can change a friendship very quickly — if they can't pay it back, both people feel awkward. My rule is to only lend what I could afford to lose. That way, if it comes back, great, and if it doesn't, I haven't lost the friend as well as the money.",
      },
    ],
    usefulPhrases: [
      "I'm careful with...",
      'feel awkward',
      'My rule is to only...',
      'as well as',
    ],
  },
  {
    id: 'sp-217',
    topic: 'Friends & Social Life',
    difficulty: 'hard',
    question: 'Can people from very different backgrounds become close friends?',
    sampleAnswers: [
      {
        label: 'Often the Best Ones',
        answer:
          "Absolutely, and sometimes those friendships are the most interesting. When you come from different places or generations, you see things differently, so you learn a lot from each other. It might take longer to understand each other's jokes or habits, but what really matters is shared values — honesty, kindness, a similar sense of humour. Background is just the starting point, not the whole story.",
      },
    ],
    usefulPhrases: [
      'Absolutely, and sometimes...',
      'you learn a lot from each other',
      'what really matters is...',
      'just the starting point, not the whole story',
    ],
  },
  {
    id: 'sp-319',
    topic: 'Friends & Social Life',
    difficulty: 'easy',
    question: 'What did you do the last time you went out with your friends?',
    sampleAnswers: [
      {
        label: 'Street Food and a Long Chat',
        answer:
          "Last Friday, a few of us met up at a night market. We wandered around trying different street food — grilled corn, spring rolls, and some sweet pancakes. Then we found a quiet spot by the water and just sat and talked for hours. Nothing special, really, but it was exactly what I needed after a busy week. We didn't get home until nearly midnight.",
      },
      {
        label: 'Short & Simple',
        answer:
          'We went to a night market, ate street food, and talked for hours.',
      },
    ],
    usefulPhrases: [
      'a few of us met up at...',
      'we wandered around ... -ing',
      'sat and talked for hours',
      'it was exactly what I needed',
    ],
  },
  {
    id: 'sp-320',
    topic: 'Friends & Social Life',
    difficulty: 'easy',
    question: 'Where do you and your friends usually like to hang out?',
    sampleAnswers: [
      {
        label: 'Our Usual Café',
        answer:
          "Most of the time we end up at the same little café near the park. The owner knows us by now, so she starts making our drinks as soon as we walk in. It's cosy and not too loud, so we can actually hear each other. When the weather's good, we sometimes take snacks to the park instead and sit on the grass. We're not really into clubs or noisy places.",
      },
    ],
    usefulPhrases: [
      'most of the time we end up at...',
      'knows us by now',
      'as soon as we walk in',
      "it's cosy and not too loud",
      "we're not really into...",
    ],
  },
  {
    id: 'sp-321',
    topic: 'Friends & Social Life',
    difficulty: 'easy',
    question: 'How often do you keep in touch with your close friends?',
    sampleAnswers: [
      {
        label: 'Every Day, Somehow',
        answer:
          "Pretty much every day, in some way. We have a group chat where we share funny pictures and little updates, so it never really goes quiet. With my best friend I usually have a proper phone call once a week, especially if something big has happened. In person, it's harder because everyone's busy, but we try to meet up at least twice a month. Even a quick coffee keeps us connected.",
      },
    ],
    usefulPhrases: [
      'pretty much every day',
      'it never really goes quiet',
      'a proper phone call',
      "in person, it's harder because...",
      'keeps us connected',
    ],
  },
  {
    id: 'sp-322',
    topic: 'Friends & Social Life',
    difficulty: 'medium',
    question: 'How have your friendships changed since you were a teenager?',
    sampleAnswers: [
      {
        label: 'Fewer but Deeper',
        answer:
          "They've changed a lot. As a teenager I had a huge group of friends, and we did everything together — mostly because we were in the same class. Now my circle is much smaller, but the friendships are deeper. We don't see each other every day anymore, yet when we do meet, we talk about real things rather than just gossip. I've also become better at letting go of friendships that only made me feel bad.",
      },
    ],
    usefulPhrases: [
      "they've changed a lot",
      'we did everything together',
      'my circle is much smaller',
      'we talk about real things',
      'letting go of friendships that...',
    ],
  },
  {
    id: 'sp-323',
    topic: 'Friends & Social Life',
    difficulty: 'medium',
    question: 'Tell me about a time a friend surprised you.',
    sampleAnswers: [
      {
        label: 'The Secret Party',
        answer:
          "On my birthday last year, I was convinced everyone had forgotten. Nobody had messaged me all day and I was honestly a bit hurt. In the evening, a friend asked me to help her carry something from her flat. When I opened the door, about fifteen people jumped out and shouted 'Happy birthday!' She'd organised the whole thing in secret for weeks. I felt so silly for doubting them, but mostly I just felt loved.",
      },
    ],
    usefulPhrases: [
      'I was convinced...',
      'I was honestly a bit hurt',
      'jumped out and shouted...',
      'organised the whole thing in secret',
      'I felt so silly for doubting them',
    ],
  },
  {
    id: 'sp-324',
    topic: 'Friends & Social Life',
    difficulty: 'medium',
    question: 'Do you prefer inviting friends to your home or meeting them somewhere outside? Why?',
    sampleAnswers: [
      {
        label: 'Home Is Cosier',
        answer:
          "I'd much rather have people over at my place. Going out is fun, but it gets expensive, and in restaurants you often feel rushed or have to shout over the noise. At home we can cook together, play board games, and stay as late as we like. It feels more personal too. The only downside is the washing-up afterwards — but usually someone stays behind to help, and that's often when the best conversations happen.",
      },
    ],
    usefulPhrases: [
      "I'd much rather...",
      'have people over',
      'shout over the noise',
      'stay as late as we like',
      'the only downside is...',
    ],
  },
  {
    id: 'sp-325',
    topic: 'Friends & Social Life',
    difficulty: 'medium',
    question: 'What would you do if two of your friends had a serious argument?',
    sampleAnswers: [
      {
        label: 'Staying in the Middle',
        answer:
          "My first rule would be not to take sides, at least not straight away. I'd talk to each of them separately and mostly just listen, because people usually need to let off steam before they can think clearly. I'd avoid passing messages between them — that almost always makes things worse. If they both seemed ready, I might suggest they meet and talk it out. But in the end, it's their friendship to fix, not mine.",
      },
    ],
    usefulPhrases: [
      'not to take sides',
      'let off steam',
      'that almost always makes things worse',
      'talk it out',
      "it's their ... to fix, not mine",
    ],
  },
  {
    id: 'sp-326',
    topic: 'Friends & Social Life',
    difficulty: 'hard',
    question: 'Is it healthy to rely on one best friend for everything?',
    sampleAnswers: [
      {
        label: 'Spread the Support',
        answer:
          "I'd say it's risky. Having one person who knows you completely is wonderful, but it puts a lot of pressure on them. They can't always be available, and if they move away or the friendship changes, you could be left with nobody. I think it's healthier to have a small network — one friend for deep talks, another for adventures, family for practical help. That way no single relationship has to carry the whole weight.",
      },
    ],
    usefulPhrases: [
      "I'd say it's risky",
      'it puts a lot of pressure on...',
      'you could be left with nobody',
      'a small network',
      'carry the whole weight',
    ],
  },
  {
    id: 'sp-327',
    topic: 'Friends & Social Life',
    difficulty: 'hard',
    question: 'Should you always be completely honest with your friends, even when it might hurt them?',
    sampleAnswers: [
      {
        label: 'Kind Honesty',
        answer:
          "Mostly, yes — but how you say it matters as much as what you say. If a friend is about to make a big mistake, I think you owe them the truth, even if it's uncomfortable. A real friend isn't someone who only tells you what you want to hear. That said, there's no need to be brutal about small things, like a haircut they already love. I'd choose honesty for anything important and kindness for everything else.",
      },
    ],
    usefulPhrases: [
      'how you say it matters as much as what you say',
      'you owe them the truth',
      'what you want to hear',
      "there's no need to be brutal about...",
      "I'd choose ... for ... and ... for everything else",
    ],
  },
  {
    id: 'sp-328',
    topic: 'Friends & Social Life',
    difficulty: 'hard',
    question: 'Why do some friendships slowly fade even when there has been no argument?',
    sampleAnswers: [
      {
        label: 'Drifting Apart',
        answer:
          "I think it's usually because life takes people in different directions. You move to a new area, start new routines, and suddenly you have less in common to talk about. Nobody does anything wrong; it's just that the effort stops being shared. One person waits for the other to call, and the other does the same. It's a bit sad, but I don't think it means the friendship wasn't real. Some friends are there for a chapter, not the whole book.",
      },
    ],
    usefulPhrases: [
      'life takes people in different directions',
      'less in common',
      'nobody does anything wrong',
      'the effort stops being shared',
      'there for a chapter, not the whole book',
    ],
  },

  // ── Daily Life ────────────────────────────────────────
  {
    id: 'sp-8',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'What do you usually do on weekends?',
    sampleAnswers: [
      {
        label: 'Slow Weekends',
        answer:
          "It depends on the weather. If it's nice out, I like to get outside in the morning — a jog in the park or a bike ride. In the afternoon, I might sit in a cafe with a book or meet a friend for lunch. Saturday evenings are usually for dinner with friends or family. On rainy weekends, I just stay home, cook something nice, and watch movies.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I relax. I go for a walk, meet friends, and watch a movie at home.',
      },
    ],
    usefulPhrases: [
      'It depends on the weather.',
      'get outside',
      'hang out at...',
      'On rainy weekends, I just...',
    ],
  },
  {
    id: 'sp-9',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'How do you stay healthy?',
    sampleAnswers: [
      {
        label: 'Active Lifestyle',
        answer:
          "I try to keep it simple. I walk as much as I can instead of driving, and I go swimming or play badminton a couple of times a week. I also try to eat home-cooked food most days and drink plenty of water. The hardest part for me is sleep — I'm trying to go to bed before eleven, but it doesn't always happen.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I walk a lot, eat home-cooked food, and try to sleep enough.',
      },
    ],
    usefulPhrases: [
      'I try to keep it simple.',
      'as much as I can',
      'a couple of times a week',
      'The hardest part for me is...',
    ],
  },
  {
    id: 'sp-31',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'Do you prefer mornings or evenings? Why?',
    sampleAnswers: [
      {
        label: 'Night Owl',
        answer:
          "I'm definitely more of a night owl. My brain just works better in the evening for some reason. In the morning, I need at least two cups of coffee before I can think straight. But at night I feel focused and creative. The downside is that I sometimes stay up too late reading or watching videos and then struggle to wake up. I've been trying to shift my schedule earlier, but old habits die hard.",
      },
    ],
    usefulPhrases: [
      "I'm definitely more of a...",
      'for some reason',
      'before I can think straight',
      'old habits die hard',
    ],
  },
  {
    id: 'sp-33',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: "What's the first thing you do when you wake up?",
    sampleAnswers: [
      {
        label: 'Honest Morning Routine',
        answer:
          "Honestly, the very first thing I do is check my phone — I know it's a bad habit, but I just look at messages and the weather. Then I get up, open the curtains, brush my teeth, and make coffee. I can't function without coffee. If I have time, I'll stretch for a few minutes or read the news. Then I have a shower and get ready for the day.",
      },
    ],
    usefulPhrases: [
      'the very first thing I do is...',
      "I know it's a bad habit, but...",
      "I can't function without...",
      "If I have time, I'll...",
    ],
  },
  {
    id: 'sp-74',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'How do you feel about public transport in your city?',
    sampleAnswers: [
      {
        label: 'Room to Improve',
        answer:
          "Honestly, it could be a lot better. There are some bus routes, but they're not frequent or convenient enough, so most people use their own motorbike or car. That means a lot of traffic and pollution at rush hour. I'd love to see more buses, proper bike lanes, and maybe a train line someday — it would make the city cleaner and cheaper to get around for people who can't afford a vehicle.",
      },
    ],
    usefulPhrases: [
      'it could be a lot better',
      'not frequent or convenient enough',
      'at rush hour',
      "I'd love to see...",
    ],
  },
  {
    id: 'sp-96',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'What is your morning routine like?',
    sampleAnswers: [
      {
        label: 'Early Start',
        answer:
          "I'm up around six, which took real effort to build — I'm not naturally a morning person. The first thing I do is make coffee, and I deliberately don't look at my phone until after that, because once I open messages the morning belongs to other people. A few days a week I go for a swim or a run. Then I have a proper breakfast and spend a few minutes planning the day. The whole routine is designed to protect that first quiet hour.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I wake up at six, make coffee, go for a short walk, then have breakfast and plan my day.',
      },
    ],
    usefulPhrases: [
      'which took real effort to build',
      "I'm not naturally a morning person",
      'the morning belongs to other people',
      'designed to...',
    ],
  },
  {
    id: 'sp-100',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: "What's a small thing that instantly makes your day better?",
    sampleAnswers: [
      {
        label: 'Simple Pleasures',
        answer:
          "Honestly, it's the small stuff. A good cup of coffee first thing in the morning can set the tone for the whole day. So can a text from a friend I haven't heard from in a while, or finding an empty seat by the window on the bus. None of it is a big deal on its own, but a few of those in one day and I notice I'm in a genuinely good mood by the evening. I think we underestimate how much these tiny things add up.",
      },
    ],
    usefulPhrases: [
      "it's the small stuff",
      'can set the tone for the whole day',
      "none of it is a big deal on its own",
      'a few of those in one day and...',
      'we underestimate how much... add up',
    ],
  },
  {
    id: 'sp-101',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'If you had an extra hour every day, how would you spend it?',
    sampleAnswers: [
      {
        label: 'Honest About the Hour',
        answer:
          "My first instinct is to say I'd read more, but if I'm honest, that hour would probably get eaten by my phone like most spare time does. So let me answer it more carefully — I'd want to spend it outside, away from a screen. Maybe a proper walk, no destination, no podcast even. I think what I actually want isn't more time, it's more time where nothing is asking for my attention.",
      },
    ],
    usefulPhrases: [
      'my first instinct is to say...',
      'if I\'m honest...',
      'gets eaten by...',
      'let me answer it more carefully',
      "what I actually want isn't... it's...",
    ],
  },
  {
    id: 'sp-102',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: "What's one habit you'd like to build or break this year?",
    sampleAnswers: [
      {
        label: 'Building, Not Breaking',
        answer:
          "I'd rather focus on building something than breaking something — it's easier to crowd out a bad habit than to just stop it cold. So my goal is to read for twenty minutes before bed instead of scrolling my phone. I've tried it a few times and it always slips after a week or two, usually when I'm tired and the phone is just easier. What's worked best so far is leaving the book on the pillow, so it's literally in the way.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I want to stop checking my phone right when I wake up. So far the only thing that's actually worked is charging it in the kitchen overnight instead of next to the bed.",
      },
    ],
    usefulPhrases: [
      "I'd rather focus on... than...",
      "it's easier to crowd out a bad habit than to just stop it",
      'it always slips after...',
      "what's worked best so far is...",
      "it's literally in the way",
    ],
  },
  {
    id: 'sp-114',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'What does your ideal Sunday look like?',
    sampleAnswers: [
      {
        label: 'Slow and Unplanned',
        answer:
          "No alarm, that's the first requirement. After that, something with a bit of movement in the morning — a walk or a swim while it's still quiet outside — then a long, slow breakfast rather than rushing through it. The rest of the day I try to leave genuinely open. Not lazy exactly, just unscheduled — maybe I read, maybe I meet someone, maybe I do nothing at all. The ideal version is one where I don't check the time once until the evening.",
      },
    ],
    usefulPhrases: [
      "that's the first requirement",
      'something with a bit of movement',
      "rather than rushing through it",
      'I try to leave genuinely open',
      "I don't check the time once until..."
    ],
  },
  {
    id: 'sp-115',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'Are you a planner, or do you prefer to go with the flow?',
    sampleAnswers: [
      {
        label: 'Planner Who Wants to Relax',
        answer:
          "I'm a planner by instinct, even when I don't want to be. I make lists for things that honestly don't need a list. But I've noticed the moments I actually enjoy most are the unplanned ones, so I've been trying to consciously leave gaps — an afternoon with nothing decided, a trip with one day left completely open. It doesn't come naturally, and I sometimes catch myself trying to plan the spontaneity, which kind of defeats the point.",
      },
    ],
    usefulPhrases: [
      'by instinct, even when I don\'t want to be',
      "that honestly don't need a list",
      "I've been trying to consciously...",
      "It doesn't come naturally",
      'which kind of defeats the point',
    ],
  },
  {
    id: 'sp-128',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: "What's the most relaxing part of your day?",
    sampleAnswers: [
      {
        label: 'A Specific Window',
        answer:
          "It's a pretty narrow window, actually — right after dinner, before I start thinking about tomorrow. I'm not doing anything special, usually just sitting outside for ten or fifteen minutes with a drink, not looking at my phone. If I skip it and go straight from dinner to the couch to scroll, the evening feels rushed even though nothing actually happened. It's less about the activity and more about there being a clear line between the day being done and the evening starting.",
      },
    ],
    usefulPhrases: [
      "it's a pretty narrow window, actually",
      'right after..., before...',
      'nothing special, usually just...',
      'the evening feels rushed even though nothing actually happened',
      "it's less about... and more about...",
    ],
  },
  {
    id: 'sp-182',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'How do you usually get around your town?',
    sampleAnswers: [
      {
        label: 'Mostly on Foot',
        answer:
          "Mostly on foot or by bike for short trips, because it's cheap and I like being outside. For longer distances I take the bus, which is slow but lets me read or listen to music. I only take a taxi when it's raining heavily or I'm running late — which happens more often than I'd like.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I walk or cycle for short trips and take the bus for longer ones.',
      },
    ],
    usefulPhrases: [
      'Mostly on foot',
      'for short trips',
      'which is slow but...',
      "more often than I'd like",
    ],
  },
  {
    id: 'sp-183',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'What household chore do you hate the most?',
    sampleAnswers: [
      {
        label: 'Ironing',
        answer:
          "Ironing, without question. It takes forever, it's hot, and as soon as I put the shirt on, it gets creased again. I don't mind washing up or cleaning the floor — I can put a podcast on and it's almost relaxing. But ironing feels pointless. These days I just buy clothes that don't need it.",
      },
    ],
    usefulPhrases: [
      '..., without question',
      'It takes forever',
      "I don't mind...",
      'feels pointless',
    ],
  },
  {
    id: 'sp-184',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'Describe a typical evening for you.',
    sampleAnswers: [
      {
        label: 'Quiet Evenings',
        answer:
          "Most evenings are pretty quiet. I get home around six, change into comfortable clothes, and cook something simple — rice, vegetables, maybe some fish. After dinner I'll call my family or reply to messages, then read or watch an episode of something. Twice a week I go to play badminton instead. I try to switch off screens by ten thirty, but honestly that only works about half the time.",
      },
    ],
    usefulPhrases: [
      'Most evenings are pretty quiet.',
      'change into comfortable clothes',
      'switch off',
      'that only works about half the time',
    ],
  },
  {
    id: 'sp-329',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'What do you usually have for breakfast?',
    sampleAnswers: [
      {
        label: 'A Simple Breakfast',
        answer:
          "On most days I keep it pretty simple. I'll have a bowl of oats with some fruit, usually a banana, and a big cup of tea. If I've got a bit more time, I like to make eggs on toast, which feels like a real treat. Honestly, I can't skip breakfast — if I do, I get grumpy by mid-morning. At the weekend, though, I sometimes go out for a proper breakfast with a friend, and that's one of my favourite little rituals.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I usually have oats with fruit and a cup of tea. I can't skip breakfast!",
      },
    ],
    usefulPhrases: [
      'I keep it pretty simple',
      "if I've got a bit more time",
      'feels like a real treat',
      "I can't skip ...",
      'one of my favourite little rituals',
    ],
  },
  {
    id: 'sp-330',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: 'What time do you usually go to bed?',
    sampleAnswers: [
      {
        label: 'A Bit Too Late',
        answer:
          "I'd like to say ten o'clock, but realistically it's more like half past eleven. I always plan to go to bed early, and then I start reading or tidying up and suddenly it's late. On weeknights I try to be in bed before midnight, because I feel terrible the next day if I'm not. At the weekend I'm a lot more relaxed about it and sometimes stay up chatting or watching a film until one or two.",
      },
    ],
    usefulPhrases: [
      "realistically it's more like ...",
      'I always plan to ..., and then ...',
      "suddenly it's late",
      'I feel terrible the next day if ...',
      "I'm a lot more relaxed about it",
    ],
  },
  {
    id: 'sp-331',
    topic: 'Daily Life',
    difficulty: 'easy',
    question: "What's one thing you do every single day without fail?",
    sampleAnswers: [
      {
        label: 'My Daily Walk',
        answer:
          "Every day, rain or shine, I go for a walk. It doesn't have to be long — sometimes it's just twenty minutes around the block — but I never skip it. It clears my head and gives me a chance to notice little things, like a new café opening or the trees changing colour. If I miss it, I feel restless for the rest of the day. It's become a bit of an anchor for me.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I go for a walk every day, even if it's only twenty minutes. It clears my head.",
      },
    ],
    usefulPhrases: [
      'rain or shine',
      "it doesn't have to be long",
      'it clears my head',
      'I feel restless for the rest of the day',
      "it's become a bit of an anchor for me",
    ],
  },
  {
    id: 'sp-332',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'How is your routine on weekdays different from your routine at weekends?',
    sampleAnswers: [
      {
        label: 'Two Different Rhythms',
        answer:
          "They're almost like two different lives, to be honest. During the week everything runs to a timetable — I get up at the same time, eat at the same time, and I'm usually quite efficient. At the weekend I let all that go. I sleep in, have a long, lazy breakfast and decide what to do as the day goes on. I think I need both, though. Without the structure I'd feel lost, and without the freedom I'd burn out.",
      },
    ],
    usefulPhrases: [
      "they're almost like two different ...",
      'everything runs to a timetable',
      'I let all that go',
      'decide ... as the day goes on',
      "without ..., I'd ...",
    ],
  },
  {
    id: 'sp-333',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'Tell me about a day when nothing went according to plan.',
    sampleAnswers: [
      {
        label: 'The Day Everything Went Wrong',
        answer:
          "Oh, I remember one day really clearly. My alarm didn't go off, so I woke up late, then I spilled coffee all over my shirt while rushing out the door. The bus was cancelled, so I had to walk in the pouring rain. By the afternoon I just started laughing because it was so ridiculous. In the end, a friend invited me over for dinner and the evening was lovely. It taught me that one bad morning doesn't have to ruin a whole day.",
      },
    ],
    usefulPhrases: [
      'I remember one day really clearly',
      'while rushing out the door',
      'in the pouring rain',
      'it was so ridiculous',
      "... doesn't have to ruin a whole day",
    ],
  },
  {
    id: 'sp-334',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'Why do you think so many people find it hard to stick to a routine?',
    sampleAnswers: [
      {
        label: 'Life Gets in the Way',
        answer:
          "I'd say the main reason is that real life is messy. You plan to exercise every morning, but then you sleep badly, or someone needs your help, and the plan falls apart. Once you miss a day or two, it's really easy to give up completely. I also think people set routines that are far too ambitious. In my experience, it's much better to start small — something you can do even on a bad day — and build up from there.",
      },
    ],
    usefulPhrases: [
      'real life is messy',
      'the plan falls apart',
      "it's really easy to give up completely",
      'far too ambitious',
      'start small and build up from there',
    ],
  },
  {
    id: 'sp-335',
    topic: 'Daily Life',
    difficulty: 'medium',
    question: 'How has your daily life changed compared to five years ago?',
    sampleAnswers: [
      {
        label: 'Slower and Calmer',
        answer:
          "Quite a lot, actually. Five years ago I was always rushing around, trying to fit as much as possible into every day. These days I've slowed down a bit. I cook more at home, I go to bed earlier, and I'm much pickier about how I spend my free time. I also see fewer people, but the friendships I have are closer. Honestly, I think I'm happier now, even if my life looks a bit less exciting from the outside.",
      },
    ],
    usefulPhrases: [
      'quite a lot, actually',
      'always rushing around',
      "I've slowed down a bit",
      "I'm much pickier about ...",
      'looks a bit less exciting from the outside',
    ],
  },
  {
    id: 'sp-336',
    topic: 'Daily Life',
    difficulty: 'hard',
    question: 'Does having a strict routine make life better, or just more boring?',
    sampleAnswers: [
      {
        label: 'Structure Creates Freedom',
        answer:
          "I used to think routines were boring, but I've changed my mind. When the small, repetitive things are on autopilot — when I eat, when I sleep, when I clean — I actually have more energy for the interesting stuff. That said, a routine that's too strict can make you rigid and anxious when something changes. So I'd say the sweet spot is a loose framework: a few fixed habits, with plenty of room for spontaneity around them.",
      },
    ],
    usefulPhrases: [
      "I've changed my mind",
      'on autopilot',
      'that said, ...',
      'the sweet spot is ...',
      'plenty of room for spontaneity',
    ],
  },
  {
    id: 'sp-337',
    topic: 'Daily Life',
    difficulty: 'hard',
    question: 'In fifty years, what do you think people will find strange about how we live day to day now?',
    sampleAnswers: [
      {
        label: 'Looking Back at Us',
        answer:
          "That's a fun one to imagine. I suspect they'll find it odd how much time we spend travelling back and forth in traffic, sitting alone in our cars. They might also be shocked by how much we throw away — food, packaging, clothes we've worn twice. And maybe they'll wonder why we were always so busy and tired. Every generation looks back and thinks the previous one was a bit mad, so I'm sure we'll be no exception.",
      },
    ],
    usefulPhrases: [
      "that's a fun one to imagine",
      "I suspect they'll find it odd how ...",
      'back and forth',
      'they might also be shocked by ...',
      "we'll be no exception",
    ],
  },
  {
    id: 'sp-338',
    topic: 'Daily Life',
    difficulty: 'hard',
    question: 'How much of your daily life is shaped by habits you never consciously chose?',
    sampleAnswers: [
      {
        label: 'Running on Autopilot',
        answer:
          "Probably far more than I'd like to admit. When I really think about it, things like the way I make my coffee, the route I walk, even the time I feel hungry — none of those were decisions. I just picked them up from my family or drifted into them. Most of them are harmless, but some aren't. Every now and then it's worth stepping back and asking, 'Do I actually want to do this, or is it just habit?'",
      },
    ],
    usefulPhrases: [
      "far more than I'd like to admit",
      'when I really think about it',
      'I just picked them up from ...',
      'drifted into ...',
      "every now and then it's worth stepping back",
    ],
  },

  // ── Home & Neighborhood ───────────────────────────────
  {
    id: 'sp-138',
    topic: 'Home & Neighborhood',
    difficulty: 'easy',
    question: 'Can you describe the place where you live?',
    sampleAnswers: [
      {
        label: 'A Small Apartment',
        answer:
          "I live in a small apartment on the fourth floor of an old building. It's not big — just a bedroom, a living room, and a tiny kitchen — but it gets a lot of light in the morning, which I love. My favourite spot is the balcony. I've put a few plants and a little chair out there, and that's where I drink my coffee. It's simple, but it feels like mine.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I live in a small apartment with a balcony. It's not big, but it's bright and quiet, and I really like it.",
      },
    ],
    usefulPhrases: [
      "It's not big, but...",
      'it gets a lot of light',
      'My favourite spot is...',
      'it feels like mine',
    ],
  },
  {
    id: 'sp-139',
    topic: 'Home & Neighborhood',
    difficulty: 'easy',
    question: 'What do you like most about your neighborhood?',
    sampleAnswers: [
      {
        label: 'The Morning Market',
        answer:
          "Definitely the morning market at the end of my street. From about six o'clock it's full of people selling fresh vegetables, fish, and fruit, and everyone seems to know each other. The lady who sells bread always saves me one when it's busy. There's also a quiet park nearby where older people do exercises at sunrise. It makes the neighborhood feel like a small village inside a big city.",
      },
    ],
    usefulPhrases: [
      'Definitely the...',
      'everyone seems to know each other',
      "There's also... nearby",
      'It makes... feel like...',
    ],
  },
  {
    id: 'sp-140',
    topic: 'Home & Neighborhood',
    difficulty: 'medium',
    question: 'If you could change one thing about your home, what would it be?',
    sampleAnswers: [
      {
        label: 'More Space to Cook',
        answer:
          "I'd make the kitchen bigger. Right now there's barely room for one person, so when friends come over we end up cooking in shifts, which is a bit silly. I love having people over for dinner, so a kitchen with a big table in the middle would be a dream. Everything else I can live with — the small bedroom, the noisy street — but the kitchen is where I spend most of my time at home.",
      },
    ],
    usefulPhrases: [
      "I'd make the... bigger",
      "there's barely room for...",
      'we end up...',
      'Everything else I can live with',
    ],
  },
  {
    id: 'sp-141',
    topic: 'Home & Neighborhood',
    difficulty: 'medium',
    question: 'Do you know your neighbors well? Do you think it matters?',
    sampleAnswers: [
      {
        label: 'Friendly but Not Close',
        answer:
          "I know them well enough to say hello and chat for a minute, but we're not really close. The family next door sometimes gives me fruit from their garden, and I water their plants when they go away. I do think it matters, though. When there was a big storm last year, it was the neighbors who checked on each other first, not anyone else. You don't need to be best friends, but knowing the people around you makes a place feel safer.",
      },
    ],
    usefulPhrases: [
      'well enough to...',
      "we're not really close",
      'I do think it matters, though.',
      'makes a place feel safer',
    ],
  },
  {
    id: 'sp-142',
    topic: 'Home & Neighborhood',
    difficulty: 'hard',
    question: 'Would you rather live in a house or an apartment? Why?',
    sampleAnswers: [
      {
        label: 'Weighing It Up',
        answer:
          "Right now an apartment suits me better. It's cheaper, there's less to clean and repair, and I can just lock the door and travel without worrying. But if I had a family someday, I think I'd want a house with a small yard — somewhere kids can play outside and I could grow a few vegetables. So I guess my answer changes with my stage of life. What I'd never want is something too big to look after; a home should make life easier, not become a second job.",
      },
    ],
    usefulPhrases: [
      'suits me better',
      'without worrying',
      'my answer changes with my stage of life',
      'should make life easier, not...',
    ],
  },
  {
    id: 'sp-249',
    topic: 'Home & Neighborhood',
    difficulty: 'easy',
    question: 'What is your favourite room in your home, and why?',
    sampleAnswers: [
      {
        label: 'The Kitchen',
        answer:
          "The kitchen, because that's where everything happens. It's where I cook, where friends end up standing and chatting at parties, and where I drink my coffee in the morning. It's not big or fancy, but it's warm and it always smells good.",
      },
    ],
    usefulPhrases: [
      "that's where everything happens",
      'end up...',
      "It's not big or fancy, but...",
      'it always smells good',
    ],
  },
  {
    id: 'sp-339',
    topic: 'Home & Neighborhood',
    difficulty: 'easy',
    question: 'How long have you lived in your current home?',
    sampleAnswers: [
      {
        label: 'About Three Years',
        answer:
          "I've been here for about three years now. When I first moved in, it felt a bit strange and empty, but little by little I've made it my own. I've put up some pictures, bought a few plants and rearranged the furniture more times than I can count. It's not perfect — the kitchen is tiny — but it feels like home now, and I'm in no hurry to move.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I've lived here for about three years. It really feels like home now.",
      },
    ],
    usefulPhrases: [
      "I've been here for about ... now",
      'little by little',
      'made it my own',
      'more times than I can count',
      "I'm in no hurry to ...",
    ],
  },
  {
    id: 'sp-340',
    topic: 'Home & Neighborhood',
    difficulty: 'easy',
    question: 'What can you see from your window?',
    sampleAnswers: [
      {
        label: 'A View of the Street',
        answer:
          "From my bedroom window I can see a quiet street lined with trees, and a small park on the corner. In the mornings there are people walking their dogs, and in the afternoon you can hear kids playing. It's not a spectacular view, but I really like it. In autumn, when the leaves turn orange, it's genuinely beautiful, and I often just stand there with a cup of tea and watch the world go by.",
      },
    ],
    usefulPhrases: [
      'a quiet street lined with trees',
      'on the corner',
      "it's not a spectacular view, but ...",
      'genuinely beautiful',
      'watch the world go by',
    ],
  },
  {
    id: 'sp-341',
    topic: 'Home & Neighborhood',
    difficulty: 'easy',
    question: 'What places can you walk to from your home?',
    sampleAnswers: [
      {
        label: 'Everything Nearby',
        answer:
          "I'm quite lucky, actually. Within ten minutes on foot there's a supermarket, a bakery, a pharmacy and a little café I go to a lot. There's also a park where I go running. The only thing that's a bit far is the library, which takes about twenty minutes. Being able to walk everywhere makes a huge difference — I hardly ever need to take the bus for everyday things.",
      },
    ],
    usefulPhrases: [
      "I'm quite lucky, actually",
      'within ten minutes on foot',
      "the only thing that's a bit far is ...",
      'makes a huge difference',
      'I hardly ever need to ...',
    ],
  },
  {
    id: 'sp-342',
    topic: 'Home & Neighborhood',
    difficulty: 'medium',
    question: 'How is the area you live in now different from the place you grew up?',
    sampleAnswers: [
      {
        label: 'Quiet Town, Busy Street',
        answer:
          "They're really different. I grew up in a small, quiet town where everybody knew everybody, and you couldn't go to the shop without stopping to chat three times. Where I live now is much busier and more anonymous. There's more to do — restaurants, cinemas, events — but people mostly keep to themselves. I enjoy the convenience, but I do miss that sense of community sometimes, especially around the holidays.",
      },
    ],
    usefulPhrases: [
      'everybody knew everybody',
      "you couldn't ... without ...",
      'much busier and more anonymous',
      'people mostly keep to themselves',
      'I do miss that sense of community',
    ],
  },
  {
    id: 'sp-343',
    topic: 'Home & Neighborhood',
    difficulty: 'medium',
    question: 'Tell me about a time a neighbor helped you, or you helped a neighbor.',
    sampleAnswers: [
      {
        label: 'The Locked-Out Evening',
        answer:
          "A couple of years ago I locked myself out late in the evening. I was standing outside feeling pretty silly when my neighbour from downstairs came out and invited me in. She made me a cup of tea and let me wait at her place until the locksmith arrived, which took nearly two hours. We'd only ever said hello before, but after that we became quite friendly. Now we swap spare keys, just in case.",
      },
    ],
    usefulPhrases: [
      'I locked myself out',
      'feeling pretty silly',
      'let me wait at her place',
      "we'd only ever said hello before",
      'just in case',
    ],
  },
  {
    id: 'sp-344',
    topic: 'Home & Neighborhood',
    difficulty: 'medium',
    question: 'What do you think makes a house feel like a home?',
    sampleAnswers: [
      {
        label: "It's the People and the Details",
        answer:
          "For me, it's less about the building and more about what's inside it. Things like photos on the walls, a favourite blanket on the sofa, the smell of something cooking — those little details make a place feel lived in. But mostly I think it's about the people. A tiny flat full of laughter feels more like home than a huge, perfect house where nobody talks. And it takes time, too. You can't rush that feeling.",
      },
    ],
    usefulPhrases: [
      "it's less about ... and more about ...",
      'make a place feel lived in',
      "mostly I think it's about ...",
      'feels more like home than ...',
      "you can't rush that feeling",
    ],
  },
  {
    id: 'sp-345',
    topic: 'Home & Neighborhood',
    difficulty: 'medium',
    question: 'Why do some people move house often while others stay in one place for decades?',
    sampleAnswers: [
      {
        label: 'Roots or Restlessness',
        answer:
          "I think it's partly personality and partly circumstances. Some people are naturally restless — they get bored and love the excitement of a fresh start. Others feel safest when they have deep roots and know every corner of their street. Of course, sometimes there's no choice: rent goes up, families grow, or someone needs to look after a parent. Personally, I'm somewhere in between. I like stability, but I'd hate to feel stuck.",
      },
    ],
    usefulPhrases: [
      'partly ... and partly ...',
      'the excitement of a fresh start',
      'deep roots',
      "sometimes there's no choice",
      "I'm somewhere in between",
    ],
  },
  {
    id: 'sp-346',
    topic: 'Home & Neighborhood',
    difficulty: 'hard',
    question: 'Should old buildings in a neighborhood be preserved, or replaced with modern ones?',
    sampleAnswers: [
      {
        label: 'Keep the Character',
        answer:
          "It's a tricky balance. On the one hand, old buildings give a neighbourhood its character — they hold memories and tell you something about the place's history. Once they're gone, you can't get them back. On the other hand, some are unsafe or simply don't meet people's needs anymore. I'd say the best approach is to keep the ones with real historical or community value and renovate them carefully, rather than tearing everything down for identical blocks.",
      },
    ],
    usefulPhrases: [
      "it's a tricky balance",
      'give a neighbourhood its character',
      "once they're gone, you can't get them back",
      "don't meet people's needs anymore",
      'rather than tearing everything down',
    ],
  },
  {
    id: 'sp-347',
    topic: 'Home & Neighborhood',
    difficulty: 'hard',
    question: 'If you could design your ideal neighborhood from scratch, what would it be like?',
    sampleAnswers: [
      {
        label: 'Green and Walkable',
        answer:
          "First of all, it would be really walkable — shops, schools and parks all within a short stroll, so you wouldn't need a car for daily life. There'd be lots of trees and a big shared garden where neighbours could grow vegetables together. I'd also want a mix of people: young families, older residents, students. And there'd definitely be a cosy little café where everyone ends up bumping into each other. Basically, somewhere that encourages people to slow down and connect.",
      },
    ],
    usefulPhrases: [
      'first of all, it would be ...',
      'within a short stroll',
      'a mix of people',
      'everyone ends up bumping into each other',
      'encourages people to slow down and connect',
    ],
  },
  {
    id: 'sp-348',
    topic: 'Home & Neighborhood',
    difficulty: 'hard',
    question: 'Should cities build more parks and green spaces, even if it means fewer new homes?',
    sampleAnswers: [
      {
        label: 'Both Are Needed',
        answer:
          "It's a difficult balance. Cities need homes, and if there aren't enough, prices go up and young people can't afford to live there. But a city with no green space is unhealthy — parks give people somewhere to exercise, relax, and meet each other. I think the answer is smarter planning: taller buildings in some areas, so there's room left for parks between them.",
      },
    ],
    usefulPhrases: [
      "It's a difficult balance.",
      "can't afford to...",
      'give people somewhere to...',
      'the answer is smarter planning',
    ],
  },

  // ── Food & Culture ────────────────────────────────────
  {
    id: 'sp-18',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: "What's your favorite dish from your country?",
    sampleAnswers: [
      {
        label: 'Comfort Food',
        answer:
          "It has to be a simple noodle soup that my grandmother used to make. It's not fancy at all — just a rich broth that cooks for hours, soft noodles, fresh herbs, and a squeeze of lime. You can find it at street stalls everywhere, and every family has its own version. I love it most on a cold or rainy morning. Whenever I'm away from home for a while, it's the first thing I want to eat when I get back.",
      },
      {
        label: 'Short & Simple',
        answer:
          "A noodle soup my grandmother used to make. It's simple but delicious.",
      },
    ],
    usefulPhrases: [
      'It has to be...',
      "It's not fancy at all.",
      'every family has its own version',
      "it's the first thing I want to... when...",
    ],
  },
  {
    id: 'sp-43',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: "What's the best meal you've ever had?",
    sampleAnswers: [
      {
        label: 'Memorable Experience',
        answer:
          "The best meal I've ever had wasn't in a fancy restaurant. It was grilled fish at a tiny place by the sea, on a trip with friends. We'd been walking all day, we were starving, and the owner just brought us whatever had been caught that morning with some rice and a spicy dipping sauce. We sat on plastic chairs and watched the sunset. I think the food was great, but the moment made it unforgettable.",
      },
    ],
    usefulPhrases: [
      "The best... I've ever had wasn't...",
      'we were starving',
      'whatever had been caught that morning',
      'the moment made it unforgettable',
    ],
  },
  {
    id: 'sp-44',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'How is café culture in your country different from other places?',
    sampleAnswers: [
      {
        label: 'Slow vs Quick',
        answer:
          "Where I'm from, a café is somewhere you stay for hours. People meet friends, read, or just sit and watch the street, and nobody rushes you to leave. In some other countries I've seen, coffee is more of a quick thing — you order at the counter, take it away, and drink it while walking. Both make sense for their lifestyle, but I prefer the slow version. For me, coffee is more about the time than the drink.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Here, people sit in cafés for hours. In some places, coffee is a quick takeaway.',
      },
    ],
    usefulPhrases: [
      "Where I'm from...",
      'nobody rushes you to leave',
      'more of a quick thing',
      'is more about... than...',
    ],
  },
  {
    id: 'sp-45',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: 'Are there any holidays or festivals that are special to you?',
    sampleAnswers: [
      {
        label: 'New Year',
        answer:
          "New Year is the most special for me. Everyone goes back to their family home, we clean the house together, cook traditional food, and visit relatives. Children get small gifts of money, and people try to say only positive things for luck. It's busy and tiring, but it's the one time of year when the whole family is together in one place.",
      },
    ],
    usefulPhrases: [
      '... is the most special for me',
      'goes back to their family home',
      'for luck',
      "it's the one time of year when...",
    ],
  },
  {
    id: 'sp-95',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: 'Can you cook? What is your signature dish?',
    sampleAnswers: [
      {
        label: 'Home Cook',
        answer:
          "Yes, I enjoy cooking, though I'm not a great cook. My signature dish is a simple chicken curry — I learned it from my mother and I've adjusted it over the years. It's cheap, it makes enough for three days, and friends always ask for it when they come over. I think the secret is cooking it slowly and adding the herbs right at the end.",
      },
      {
        label: 'Learning to Cook',
        answer:
          "Not really yet! I can make eggs and fried rice, and that's about it. But I'm trying to learn one new dish a month, mostly from videos.",
      },
    ],
    usefulPhrases: [
      'My signature dish is...',
      "I've adjusted it over the years",
      'friends always ask for it',
      'the secret is...',
    ],
  },
  {
    id: 'sp-105',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'Do you prefer eating out or cooking at home?',
    sampleAnswers: [
      {
        label: 'It Depends on the Day',
        answer:
          "It really depends on my mood and how tired I am. Cooking at home is nice when I actually have the energy for it — there's something calming about chopping vegetables after a long day, and I know exactly what's going into the food. But eating out wins more often than I'd like to admit, mostly out of convenience. I think the honest answer is I like the idea of cooking more than the reality of doing it every single day.",
      },
    ],
    usefulPhrases: [
      'it really depends on my mood',
      "there's something calming about...",
      'wins more often than I\'d like to admit',
      'out of convenience',
      'I like the idea of... more than the reality of...',
    ],
  },
  {
    id: 'sp-118',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: 'What\'s a food you disliked as a kid but love now, or the other way around?',
    sampleAnswers: [
      {
        label: 'An Acquired Taste',
        answer:
          "As a kid I couldn't stand bitter melon — I'd pick it out of every dish my mom made. Now it's genuinely one of my favorite things to eat, and I actually crave the bitterness, which makes no sense to my younger self. I think my taste just needed time to catch up to it. It's a good reminder not to permanently write off a food after one bad experience, because your palate isn't fixed the way it feels like it is at ten years old.",
      },
    ],
    usefulPhrases: [
      "I couldn't stand...",
      "which makes no sense to my younger self",
      'my taste just needed time to catch up',
      'not to permanently write off...',
      "isn't fixed the way it feels like it is",
    ],
  },
  {
    id: 'sp-119',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'If you could only eat one dish for the rest of your life, what would it be?',
    sampleAnswers: [
      {
        label: 'The Practical Choice',
        answer:
          "I'd have to pick something with enough variety inside it to not go insane, so I'd go with a good bowl of noodle soup — broth, noodles, herbs, meat, all in one place, and every restaurant makes it slightly differently, so it wouldn't really be the exact same meal twice. If I picked something too specific, like one particular dessert, I think I'd regret it within a month. So my answer is really a loophole — one dish that secretly contains a lot of small variation.",
      },
    ],
    usefulPhrases: [
      "I'd have to pick something with enough variety",
      'to not go insane',
      'all in one place',
      "I'd regret it within a month",
      'my answer is really a loophole',
    ],
  },
  {
    id: 'sp-190',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: "What's your favourite snack?",
    sampleAnswers: [
      {
        label: 'Something Salty',
        answer:
          "I'm more of a salty-snack person than a sweet one. My favourite is roasted peanuts or crispy rice crackers — something crunchy I can eat while watching a movie. I try not to keep them at home, though, because once I open a bag, it's gone in ten minutes.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Something salty and crunchy, like roasted peanuts.',
      },
    ],
    usefulPhrases: [
      "I'm more of a... person than...",
      'something crunchy',
      "it's gone in ten minutes",
    ],
  },
  {
    id: 'sp-191',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'What food from another country would you like to try?',
    sampleAnswers: [
      {
        label: 'Real Mexican Food',
        answer:
          "I'd love to try real Mexican food in Mexico. I've had tacos at restaurants abroad, but I've read that the food there is completely different — lots of fresh corn, different chillies, and sauces that take hours to make. I also love spicy food, so I think I'd be in heaven. Trying a country's food at a street stall, made by someone whose family has cooked it for generations, is my favourite part of travelling.",
      },
    ],
    usefulPhrases: [
      "I'd love to try...",
      "I've read that...",
      "I think I'd be in heaven",
      'my favourite part of...',
    ],
  },
  {
    id: 'sp-192',
    topic: 'Food & Culture',
    difficulty: 'hard',
    question: 'Do you think fast food is changing the way people eat?',
    sampleAnswers: [
      {
        label: 'Convenience Wins',
        answer:
          "Definitely. The biggest change isn't just what we eat but how — more people eat alone, quickly, and while doing something else. Fast food and delivery apps make that very easy. Families used to sit down together every evening, and now in many homes everyone eats at different times. I don't think fast food is evil, and it's useful sometimes. But I think we lose something when meals become fuel rather than a time to connect.",
      },
    ],
    usefulPhrases: [
      "The biggest change isn't just... but...",
      'while doing something else',
      "I don't think... is evil",
      'when meals become fuel',
    ],
  },
  {
    id: 'sp-349',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: "What's a dish your family often makes at home?",
    sampleAnswers: [
      {
        label: "Mum's Soup",
        answer:
          "There's a chicken and vegetable soup that my mum makes almost every week, especially when it's cold. It's nothing fancy — just chicken, carrots, potatoes, some herbs — but it's incredibly comforting. Whenever I'm feeling under the weather, it's the first thing I crave. I've tried making it myself, and it's good, but somehow it never tastes quite the same as hers.",
      },
      {
        label: 'Short & Simple',
        answer:
          "My mum makes a simple chicken soup every week. It's really comforting.",
      },
    ],
    usefulPhrases: [
      "it's nothing fancy",
      'incredibly comforting',
      'under the weather',
      "it's the first thing I crave",
      'it never tastes quite the same as ...',
    ],
  },
  {
    id: 'sp-350',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: 'Do you like spicy food?',
    sampleAnswers: [
      {
        label: 'The More Chilli, the Better',
        answer:
          "Oh yes, I love it. I add chilli to almost everything — noodles, eggs, even some salads. I wasn't always like this, though. As a kid I couldn't handle anything spicy at all, but I slowly built up a tolerance. Now food without a bit of heat tastes kind of boring to me. That said, I've definitely ordered dishes that were far too hot, and I've had to drink a whole glass of milk to survive!",
      },
    ],
    usefulPhrases: [
      'I add ... to almost everything',
      "I wasn't always like this, though",
      'built up a tolerance',
      'a bit of heat',
      'far too hot',
    ],
  },
  {
    id: 'sp-351',
    topic: 'Food & Culture',
    difficulty: 'easy',
    question: 'What do you usually drink with your meals?',
    sampleAnswers: [
      {
        label: 'Just Water, Mostly',
        answer:
          "Most of the time I just drink water, to be honest. It's the healthiest option and it doesn't fight with the taste of the food. With certain meals, though, I like a pot of green tea, especially after something heavy or oily. On special occasions, like a birthday dinner, I might have a fruit juice or something a bit more festive. But day to day, it's water all the way.",
      },
    ],
    usefulPhrases: [
      'most of the time I just ...',
      'the healthiest option',
      'after something heavy',
      'on special occasions',
      "day to day, it's ... all the way",
    ],
  },
  {
    id: 'sp-352',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'Tell me about a meal that was special because of the people you shared it with.',
    sampleAnswers: [
      {
        label: 'A Picnic to Remember',
        answer:
          "A few summers ago, some old friends and I had a picnic in the park. Everyone brought one dish, so the food was a bit random — sandwiches, a curry, a cake that had half collapsed. Honestly, none of it was amazing. But we hadn't all been together for years, and we sat there talking and laughing until it got dark. I don't remember the taste of anything, but I'll never forget that evening.",
      },
    ],
    usefulPhrases: [
      'everyone brought one dish',
      'a bit random',
      'none of it was amazing',
      'until it got dark',
      "I'll never forget that ...",
    ],
  },
  {
    id: 'sp-353',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'Why do you think people in different places eat at such different times of day?',
    sampleAnswers: [
      {
        label: 'Climate and Custom',
        answer:
          "I think a lot of it comes down to climate. In hot places, it makes sense to eat a big lunch and rest in the afternoon, then have dinner late when it's cooler. In colder places, people often eat earlier because it gets dark sooner. Tradition plays a part too — if your grandparents ate at six, you probably do as well. It's one of those things you don't notice until you travel and suddenly you're starving while everyone else is still at the beach.",
      },
    ],
    usefulPhrases: [
      'a lot of it comes down to ...',
      'it makes sense to ...',
      'tradition plays a part too',
      "one of those things you don't notice until ...",
      "you're starving while everyone else is ...",
    ],
  },
  {
    id: 'sp-354',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'How are family meals today different from when you were a child?',
    sampleAnswers: [
      {
        label: 'Fewer Shared Dinners',
        answer:
          "When I was little, we always ate dinner together at the table — no exceptions. My parents would ask about our day, and it was the one time everyone was in the same room. Nowadays, in a lot of families I know, people eat at different times or grab something quickly on their way out. It's more flexible, I suppose, but I think something's been lost. Those dinners were where we really talked.",
      },
    ],
    usefulPhrases: [
      'no exceptions',
      'it was the one time ...',
      'grab something quickly',
      "it's more flexible, I suppose",
      "I think something's been lost",
    ],
  },
  {
    id: 'sp-355',
    topic: 'Food & Culture',
    difficulty: 'medium',
    question: 'Have you ever tried a food that completely surprised you?',
    sampleAnswers: [
      {
        label: 'Unexpectedly Delicious',
        answer:
          "Yes! A friend once convinced me to try a dish made with fermented beans. It smelled really strong and, to be honest, it looked a bit off-putting. I almost said no, but I didn't want to be rude. Then I took a bite and was genuinely shocked — it was rich and savoury and really delicious. Now I order it whenever I can. It taught me not to judge food by how it looks or smells.",
      },
    ],
    usefulPhrases: [
      'convinced me to try ...',
      'a bit off-putting',
      "I didn't want to be rude",
      'I was genuinely shocked',
      'not to judge ... by how it looks',
    ],
  },
  {
    id: 'sp-356',
    topic: 'Food & Culture',
    difficulty: 'hard',
    question: 'Should traditional recipes be protected, or is it fine for people to change them?',
    sampleAnswers: [
      {
        label: 'Respect, Then Experiment',
        answer:
          "I can see both sides. Traditional recipes carry a lot of history, and when people change them carelessly — then still use the original name — it can feel disrespectful. On the other hand, food has always evolved. Most 'traditional' dishes were once new ideas that mixed ingredients from somewhere else. So I'd say it's fine to experiment, as long as you understand and respect the original first, and you're honest about what you've changed.",
      },
    ],
    usefulPhrases: [
      'I can see both sides',
      'carry a lot of history',
      'food has always evolved',
      'as long as you ...',
      "be honest about what you've changed",
    ],
  },
  {
    id: 'sp-357',
    topic: 'Food & Culture',
    difficulty: 'hard',
    question: 'How much can you learn about a culture through its food?',
    sampleAnswers: [
      {
        label: 'A Window Into a Culture',
        answer:
          "Quite a lot, I'd say. Food shows you what grows locally, what the climate is like, and even what the history was — which spices arrived through trade, or which dishes came from times when people had very little. The way people eat tells you something too: whether meals are shared from one big plate or served individually, how long they last. But it's only a starting point. You'd need to talk to people to understand what's really going on.",
      },
    ],
    usefulPhrases: [
      "quite a lot, I'd say",
      'what grows locally',
      'came from times when people had very little',
      'tells you something too',
      "it's only a starting point",
    ],
  },
  {
    id: 'sp-358',
    topic: 'Food & Culture',
    difficulty: 'hard',
    question: 'Whose responsibility is it to reduce food waste — shops, restaurants, or ordinary people?',
    sampleAnswers: [
      {
        label: 'Everyone Has a Part',
        answer:
          "Honestly, I don't think you can put it all on one group. Shops throw away huge amounts because of strict rules about how food should look, so they could definitely do more, like selling 'ugly' vegetables cheaply. Restaurants could offer smaller portions. But households waste a lot too — I'm guilty of letting things go off at the back of the fridge. Real change probably needs everyone, maybe with a push from clearer laws.",
      },
    ],
    usefulPhrases: [
      "you can't put it all on one group",
      'they could definitely do more',
      "I'm guilty of ...",
      'let things go off',
      'a push from ...',
    ],
  },

  // ── Shopping & Fashion ────────────────────────────────
  {
    id: 'sp-153',
    topic: 'Shopping & Fashion',
    difficulty: 'easy',
    question: 'Do you enjoy shopping? Why or why not?',
    sampleAnswers: [
      {
        label: 'Only for Food',
        answer:
          "Honestly, not really — except for food. Shopping for clothes makes me tired very quickly; I usually know what I want, buy it, and leave. But I could spend an hour walking around a market looking at fruit and snacks. I think I enjoy shopping when it's about discovering something, not when I feel like I have to make the right decision.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Not really. I buy what I need and leave. The only shopping I enjoy is at food markets.',
      },
    ],
    usefulPhrases: [
      'Honestly, not really — except for...',
      'makes me tired very quickly',
      'I could spend an hour...',
      "when it's about...",
    ],
  },
  {
    id: 'sp-154',
    topic: 'Shopping & Fashion',
    difficulty: 'easy',
    question: 'Do you prefer shopping online or in stores?',
    sampleAnswers: [
      {
        label: 'A Bit of Both',
        answer:
          "For everyday things like shampoo or batteries, online is easier — it comes to my door and I don't have to fight traffic. But for clothes and shoes, I prefer stores, because I need to try things on. I've bought too many shirts online that looked great in the photo and terrible on me. So I'd say online for convenience, stores for anything where the fit or feel matters.",
      },
    ],
    usefulPhrases: [
      'For everyday things...',
      'it comes to my door',
      'looked great in the photo',
      'online for..., stores for...',
    ],
  },
  {
    id: 'sp-155',
    topic: 'Shopping & Fashion',
    difficulty: 'medium',
    question: 'How would you describe your personal style?',
    sampleAnswers: [
      {
        label: 'Simple and Comfortable',
        answer:
          "Simple and comfortable, mostly. I wear a lot of plain T-shirts, linen shirts, and sandals, partly because it's hot most of the year where I live. I don't follow trends much — I'd rather have a few things I really like and wear them until they fall apart. If I'm going somewhere nice, I'll make a bit more effort, but I still choose comfort first. I think you look better when you feel relaxed in what you're wearing.",
      },
    ],
    usefulPhrases: [
      'Simple and comfortable, mostly.',
      "I don't follow trends much",
      'wear them until they fall apart',
      'make a bit more effort',
    ],
  },
  {
    id: 'sp-156',
    topic: 'Shopping & Fashion',
    difficulty: 'medium',
    question: 'Have you ever bought something and regretted it straight away?',
    sampleAnswers: [
      {
        label: 'The Expensive Jacket',
        answer:
          "Yes — a very expensive winter jacket that I bought on sale, even though I live somewhere it never gets cold. I told myself I'd wear it when I travelled. I've worn it exactly twice in three years. The lesson for me was that a discount can make you buy things you'd never buy at full price. Now I ask myself, 'Would I still want this if it weren't on sale?' Usually the answer is no.",
      },
    ],
    usefulPhrases: [
      'I told myself...',
      "I've worn it exactly... times",
      'The lesson for me was that...',
      'Would I still want this if...?',
    ],
  },
  {
    id: 'sp-157',
    topic: 'Shopping & Fashion',
    difficulty: 'hard',
    question: 'Do you think people buy too many things today?',
    sampleAnswers: [
      {
        label: 'Buying Is Too Easy',
        answer:
          "I think buying has become too easy. With one tap on your phone, something arrives the next day, so there's no time to ask whether you really need it. And a lot of what we buy is designed to break or go out of fashion quickly. I'm not against shopping — buying good things can make life better. But I think we'd be happier owning fewer, better things and spending more on experiences. Most of the stuff in my cupboard I could live without.",
      },
    ],
    usefulPhrases: [
      'buying has become too easy',
      "there's no time to ask whether...",
      "I'm not against..., but...",
      'I could live without',
    ],
  },
  {
    id: 'sp-252',
    topic: 'Shopping & Fashion',
    difficulty: 'easy',
    question: 'Do you like buying second-hand things?',
    sampleAnswers: [
      {
        label: 'Yes, Especially Books',
        answer:
          "Yes, especially books and furniture. Second-hand things are cheaper, often better made than new ones, and they have a bit of history. I once found an old wooden chair at a market for almost nothing, and it's still my favourite chair. It also feels good not to buy something brand new every time.",
      },
    ],
    usefulPhrases: [
      'especially...',
      'better made than...',
      'for almost nothing',
      'It also feels good not to...',
    ],
  },
  {
    id: 'sp-359',
    topic: 'Shopping & Fashion',
    difficulty: 'easy',
    question: 'Where do you usually buy your clothes?',
    sampleAnswers: [
      {
        label: 'A Mix of Places',
        answer:
          "It's a bit of a mix. For basics like T-shirts and socks, I usually go to a big high-street shop because it's cheap and easy. For anything special, I like browsing small boutiques or markets, where you find things that nobody else has. I don't buy clothes very often, though. I'd rather have a few things I really love than a wardrobe full of stuff I never wear.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Basics from big shops, special things from small boutiques or markets.',
      },
    ],
    usefulPhrases: [
      "it's a bit of a mix",
      'for basics like ...',
      'browsing small boutiques',
      'things that nobody else has',
      "I'd rather have ... than ...",
    ],
  },
  {
    id: 'sp-360',
    topic: 'Shopping & Fashion',
    difficulty: 'easy',
    question: "What's your favourite piece of clothing right now?",
    sampleAnswers: [
      {
        label: 'My Old Denim Jacket',
        answer:
          "At the moment it has to be my old denim jacket. I've had it for years, and it's faded in all the right places. It goes with almost everything, so I wear it nearly every day when the weather's mild. It's also got a little story behind it — I found it in a second-hand shop on a trip with friends. Whenever I put it on, I feel a bit more like myself.",
      },
    ],
    usefulPhrases: [
      'at the moment it has to be ...',
      'faded in all the right places',
      'it goes with almost everything',
      "it's got a little story behind it",
      'I feel a bit more like myself',
    ],
  },
  {
    id: 'sp-361',
    topic: 'Shopping & Fashion',
    difficulty: 'easy',
    question: 'How often do you go grocery shopping?',
    sampleAnswers: [
      {
        label: 'Once a Week, Plus Extras',
        answer:
          "I try to do one big shop every weekend, usually on Saturday morning before it gets too busy. I make a list beforehand so I don't end up buying random things. But realistically, I also pop into the little shop round the corner two or three times a week for fresh bread, milk or whatever I've forgotten. It's quite nice, actually — the owner knows me by now.",
      },
    ],
    usefulPhrases: [
      'one big shop every weekend',
      'before it gets too busy',
      "so I don't end up ...",
      'pop into the shop round the corner',
      'knows me by now',
    ],
  },
  {
    id: 'sp-362',
    topic: 'Shopping & Fashion',
    difficulty: 'medium',
    question: 'Tell me about the last gift you bought for someone.',
    sampleAnswers: [
      {
        label: 'A Thoughtful Present',
        answer:
          "The last thing I bought was a birthday present for my sister. She'd mentioned months ago that she wanted to get back into painting, so I put together a little kit — good brushes, some paints and a nice sketchbook. When she opened it, she was really touched that I'd remembered. That's my favourite kind of gift, honestly. It doesn't have to be expensive; it just has to show you've been listening.",
      },
    ],
    usefulPhrases: [
      "she'd mentioned months ago that ...",
      'get back into ...',
      'put together a little kit',
      'she was really touched that ...',
      "it just has to show you've been listening",
    ],
  },
  {
    id: 'sp-363',
    topic: 'Shopping & Fashion',
    difficulty: 'medium',
    question: 'Why do you think some people care so much about brand names?',
    sampleAnswers: [
      {
        label: 'Status and Trust',
        answer:
          "I think there are a couple of reasons. For some people, it's about status — wearing a famous logo is a quick way to show you're doing well. For others, it's more about trust. If a brand has always made good shoes, you feel safer paying more. And I suppose it's also about belonging; when everyone around you wears a certain brand, you want to fit in. Personally, I'm not that bothered, as long as something's well made.",
      },
    ],
    usefulPhrases: [
      'there are a couple of reasons',
      "it's about status",
      'a quick way to show ...',
      'you want to fit in',
      "I'm not that bothered, as long as ...",
    ],
  },
  {
    id: 'sp-364',
    topic: 'Shopping & Fashion',
    difficulty: 'medium',
    question: 'How has your style changed since you were a teenager?',
    sampleAnswers: [
      {
        label: 'From Loud to Simple',
        answer:
          "Oh, massively. As a teenager I wore really bright colours and big, baggy clothes, mostly because that's what my friends wore. Looking back at old photos is pretty embarrassing! These days my style is much simpler — neutral colours, clothes that fit properly and feel comfortable. I think I've just got more confident. I don't need my clothes to shout anymore; I'd rather they quietly suit me.",
      },
    ],
    usefulPhrases: [
      'oh, massively',
      "mostly because that's what ...",
      'looking back at old photos',
      "I've just got more confident",
      "I'd rather they quietly suit me",
    ],
  },
  {
    id: 'sp-365',
    topic: 'Shopping & Fashion',
    difficulty: 'medium',
    question: 'Do you prefer small local shops or big shopping centres? Why?',
    sampleAnswers: [
      {
        label: 'Small Shops Win',
        answer:
          "I definitely prefer small local shops. The staff usually know what they're talking about, and they actually have time to help you. You also find more unusual things there. Big shopping centres are convenient — everything's under one roof and you can park easily — but I find them tiring after an hour. Too many people, too much noise. Plus, I like the idea that my money is staying in the neighbourhood.",
      },
    ],
    usefulPhrases: [
      'I definitely prefer ...',
      "know what they're talking about",
      "everything's under one roof",
      'I find them tiring after an hour',
      'I like the idea that ...',
    ],
  },
  {
    id: 'sp-366',
    topic: 'Shopping & Fashion',
    difficulty: 'hard',
    question: 'Do the clothes we wear really say anything about who we are?',
    sampleAnswers: [
      {
        label: 'More Than We Admit',
        answer:
          "I think they say something, but probably less than people assume. Clothes can show your mood, your taste, maybe your values — like if someone only buys second-hand. But they can also be misleading. Someone in a smart suit might be completely chaotic, and someone in an old jumper might be the most organised person you know. So I'd say clothes are a first impression, not the full story, and it's a mistake to judge people on them.",
      },
    ],
    usefulPhrases: [
      'they say something, but probably less than ...',
      'they can also be misleading',
      'might be completely chaotic',
      'a first impression, not the full story',
      "it's a mistake to judge people on ...",
    ],
  },
  {
    id: 'sp-367',
    topic: 'Shopping & Fashion',
    difficulty: 'hard',
    question: 'Should cheap, fast fashion be more strictly controlled because of its impact on the planet?',
    sampleAnswers: [
      {
        label: 'Some Rules, Some Choice',
        answer:
          "I lean towards yes, but carefully. Fast fashion creates a huge amount of waste, and a lot of it ends up in landfill after being worn a handful of times. Some rules — like making brands responsible for recycling what they sell — seem fair. The tricky part is that cheap clothes help families on tight budgets. So I don't think banning it is the answer. It's more about making the true cost visible and encouraging better habits.",
      },
    ],
    usefulPhrases: [
      'I lean towards yes, but carefully',
      'ends up in landfill',
      'worn a handful of times',
      'the tricky part is that ...',
      'making the true cost visible',
    ],
  },
  {
    id: 'sp-368',
    topic: 'Shopping & Fashion',
    difficulty: 'hard',
    question: 'If physical shops disappeared and everything was delivered to your door, what would we lose?',
    sampleAnswers: [
      {
        label: 'More Than Just Shops',
        answer:
          "I think we'd lose much more than we realise. Shops aren't just places to buy things — they're part of what makes a street feel alive. You bump into people, chat to the shopkeeper, discover things you weren't looking for. Without them, town centres would become empty and pretty lonely. We'd also lose the chance to touch and try things before buying. Delivery is convenient, sure, but convenience isn't everything.",
      },
    ],
    usefulPhrases: [
      "we'd lose much more than we realise",
      'make a street feel alive',
      "discover things you weren't looking for",
      'pretty lonely',
      "convenience isn't everything",
    ],
  },

  // ── Money & Finance ───────────────────────────────────
  {
    id: 'sp-54',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'How do you manage your money?',
    sampleAnswers: [
      {
        label: 'Practical Approach',
        answer:
          "I try to follow the 50-30-20 rule — 50% for necessities, 30% for wants, and 20% for savings. I use a simple note on my phone to track my spending each month. I'm not super strict about it, but it helps me see where my money is going. I also keep a small emergency fund, and I put a little aside every month for travel.",
      },
    ],
    usefulPhrases: [
      'I try to follow the... rule',
      "I'm not super strict about it, but...",
      'where my money is going',
      'put a little aside',
    ],
  },
  {
    id: 'sp-55',
    topic: 'Money & Finance',
    difficulty: 'easy',
    question: "What's the best purchase you've ever made?",
    sampleAnswers: [
      {
        label: 'A Good Bicycle',
        answer:
          "Probably my bicycle. It was more expensive than I planned — I almost bought a cheaper one — but it completely changed my routine. I ride it to the market, around the park in the evening, and on long rides at the weekend. I've had it for three years and it still rides perfectly. I think spending money on things you use every single day is always worth it.",
      },
    ],
    usefulPhrases: [
      'It was more expensive than I planned.',
      'it completely changed my routine',
      'it still... perfectly',
      'is always worth it',
    ],
  },
  {
    id: 'sp-56',
    topic: 'Money & Finance',
    difficulty: 'hard',
    question: 'Do you think money can buy happiness?',
    sampleAnswers: [
      {
        label: 'Thoughtful Answer',
        answer:
          "I think money can buy comfort and security, which are prerequisites for happiness. If you're worrying about rent or food, it's really hard to be happy. So up to a certain point, more money definitely helps. But beyond that, it's diminishing returns. Some of the happiest moments in my life didn't cost anything — hanging out with friends, a good conversation, a sunset at the beach. I'd say money removes obstacles to happiness, but it doesn't create happiness by itself.",
      },
    ],
    usefulPhrases: [
      'are prerequisites for happiness.',
      'up to a certain point...',
      "it's diminishing returns.",
      "didn't cost anything",
      "removes obstacles to... but doesn't create... by itself.",
    ],
  },
  {
    id: 'sp-83',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'How do you manage your monthly budget?',
    sampleAnswers: [
      {
        label: 'Simple System',
        answer:
          "I keep it fairly simple, because complicated systems never last for me. As soon as money comes in, I move a fixed amount into savings, so I'm not hoping there's something left at the end of the month. The rest covers rent, food, and everything else, and I don't track every coffee. Once a month I check my bank app for subscriptions I've forgotten about. The one rule I stick to is waiting a few days before any big purchase.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I save first, then spend what's left. I check once a month and always wait before buying something expensive.",
      },
    ],
    usefulPhrases: [
      'complicated systems never last for me',
      'As soon as money comes in...',
      "more often than I'd like to admit",
      'The one rule I stick to is...',
    ],
  },
  {
    id: 'sp-84',
    topic: 'Money & Finance',
    difficulty: 'hard',
    question: 'Do you think it is better to save money or spend it on experiences?',
    sampleAnswers: [
      {
        label: 'Balanced View',
        answer:
          "I don't think it has to be one or the other, but if I had to lean one way, I'd say experiences — with a safety net in place first. Having a few months of expenses saved gives you options: you can take a break when you need one, or handle an emergency without panicking. That peace of mind is worth a lot. Beyond that, I've noticed that the things I remember are almost never purchases. I can't tell you what I bought two years ago, but I remember a motorbike trip to Hue in detail. So my approach is: save enough to be secure, then spend fairly freely on things that create memories.",
      },
    ],
    usefulPhrases: [
      "I don't think it has to be one or the other",
      'if I had to lean one way',
      'with a safety net in place',
      'That peace of mind is worth a lot',
      'things that create memories',
    ],
  },
  {
    id: 'sp-85',
    topic: 'Money & Finance',
    difficulty: 'easy',
    question: 'What was the best purchase you have ever made?',
    sampleAnswers: [
      {
        label: 'Something Unglamorous',
        answer:
          "Honestly, a really good mattress. It was expensive enough that I hesitated for weeks, and I assumed the difference was mostly marketing. But I sleep so much better now — no sore back, and more energy all day. If you calculate the cost per night, it's probably the cheapest thing I own. Now that's my test for a big purchase: how often will I actually use it?",
      },
      {
        label: 'An Experience',
        answer:
          "It wasn't an object — it was a cooking class I took on holiday. It wasn't cheap, but I still make three of the dishes we learned, and every time I cook them for friends I remember that day.",
      },
    ],
    usefulPhrases: [
      'I hesitated for weeks',
      'I assumed... was mostly marketing',
      'the cost per...',
      "That's my test for...",
    ],
  },
  {
    id: 'sp-124',
    topic: 'Money & Finance',
    difficulty: 'hard',
    question: 'Would you rather have more money or more free time?',
    sampleAnswers: [
      {
        label: 'Time, With a Catch',
        answer:
          "If I had to choose right now, I'd say time — I already feel like the bottleneck in my life isn't money, it's not having enough hours to use what I have well. But I'll admit that answer is easy for me to give because I'm not struggling financially. If money were tight enough that it was limiting basic choices, I think the honest answer would flip completely. So it's less a fixed preference and more a question of which one is actually scarce for you right now.",
      },
    ],
    usefulPhrases: [
      'if I had to choose right now',
      "the bottleneck in my life isn't... it's...",
      "I'll admit that answer is easy for me to give because...",
      'the honest answer would flip completely',
      'which one is actually scarce for you',
    ],
  },
  {
    id: 'sp-134',
    topic: 'Money & Finance',
    difficulty: 'easy',
    question: "What's something you regret spending money on?",
    sampleAnswers: [
      {
        label: 'The Gym Membership',
        answer:
          "A year-long gym membership I used maybe five times. It felt like a smart decision when I paid for it — cheaper per session if I committed upfront, that kind of logic — but I completely overestimated how motivated future-me would be. Now I just go somewhere I pay per visit, which costs more per session on paper but actually gets used, so it works out better in practice. I've learned to be suspicious of any purchase that depends on me becoming a slightly different person.",
      },
    ],
    usefulPhrases: [
      'It felt like a smart decision when...',
      'I completely overestimated...',
      'costs more... but actually gets used',
      'works out better in practice',
      "I've learned to be suspicious of...",
    ],
  },
  {
    id: 'sp-195',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'Should children get pocket money? Why or why not?',
    sampleAnswers: [
      {
        label: 'Yes, With Lessons',
        answer:
          "I think so, yes. Pocket money teaches children that money is limited and that you have to make choices. If they spend it all on sweets on Monday, they learn by Friday that it's gone — and that lesson is much cheaper at eight than at twenty-five. I'd give a small amount every week and encourage them to save part of it for something bigger they really want.",
      },
    ],
    usefulPhrases: [
      'I think so, yes.',
      'teaches children that...',
      'that lesson is much cheaper at... than at...',
      'encourage them to...',
    ],
  },
  {
    id: 'sp-256',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'Do you prefer paying with cash or by card?',
    sampleAnswers: [
      {
        label: 'Card, Mostly',
        answer:
          "Mostly card or my phone, because it's faster and I don't need to carry coins. But I always keep a little cash for small street stalls and markets, where cards aren't always accepted. I also find that when I pay with cash, I'm more careful — handing over real money makes you feel how much you're spending.",
      },
    ],
    usefulPhrases: [
      'Mostly...',
      "aren't always accepted",
      "I'm more careful",
      "makes you feel how much you're spending",
    ],
  },
  {
    id: 'sp-369',
    topic: 'Money & Finance',
    difficulty: 'easy',
    question: 'What do you spend most of your money on?',
    sampleAnswers: [
      {
        label: 'Rent and Food',
        answer:
          "Like most people, the biggest chunk goes on rent and bills — that's just unavoidable. After that, it's mainly food. I cook at home a lot, but I also love eating out with friends, so that adds up quickly. Whatever's left, I try to put aside for travelling. I'm not really someone who buys a lot of things; I'd much rather spend money on experiences.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Mostly rent and food. The rest I save for travelling.',
      },
    ],
    usefulPhrases: [
      'the biggest chunk goes on ...',
      "that's just unavoidable",
      'that adds up quickly',
      'put aside for ...',
      "I'd much rather spend money on ...",
    ],
  },
  {
    id: 'sp-370',
    topic: 'Money & Finance',
    difficulty: 'easy',
    question: 'Do you like getting money as a gift, or would you rather get a present?',
    sampleAnswers: [
      {
        label: 'I Prefer a Present',
        answer:
          "Honestly, I prefer a real present, even a small one. Money is useful, of course, and I'm always grateful, but it feels a bit impersonal. A present shows that someone thought about me and what I'd like. Having said that, for big occasions like a wedding, I think money makes a lot of sense, because the couple can spend it on what they actually need.",
      },
    ],
    usefulPhrases: [
      "I'm always grateful, but ...",
      'it feels a bit impersonal',
      'shows that someone thought about ...',
      'having said that',
      'makes a lot of sense',
    ],
  },
  {
    id: 'sp-371',
    topic: 'Money & Finance',
    difficulty: 'easy',
    question: "What's something small you're always happy to spend money on?",
    sampleAnswers: [
      {
        label: 'Good Coffee',
        answer:
          "For me, it's definitely good coffee. I know I could make it at home for much less, but sitting in a nice café with a really good flat white is one of my little pleasures. It's not just about the drink — it's the atmosphere and the break from everything. I'm quite careful with money in other areas, so I don't feel guilty about this one at all.",
      },
    ],
    usefulPhrases: [
      "for me, it's definitely ...",
      'for much less',
      'one of my little pleasures',
      "it's not just about ... — it's ...",
      "I don't feel guilty about this one at all",
    ],
  },
  {
    id: 'sp-372',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'Who taught you about money when you were growing up?',
    sampleAnswers: [
      {
        label: 'Lessons From My Grandmother',
        answer:
          "It was mainly my grandmother, actually. She'd lived through some really hard times, so she was very careful with money. She taught me to always save a little, no matter how small, and never to buy something just because it's on sale. As a kid I thought she was a bit strict, but now I really appreciate it. Those simple rules have kept me out of trouble more than once.",
      },
    ],
    usefulPhrases: [
      'it was mainly ..., actually',
      'lived through some really hard times',
      'no matter how small',
      "just because it's on sale",
      'kept me out of trouble more than once',
    ],
  },
  {
    id: 'sp-373',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'Tell me about a time you saved up for something special.',
    sampleAnswers: [
      {
        label: 'Saving for a Bike',
        answer:
          "When I was about fifteen, I really wanted a proper bike. My parents said they'd pay half if I saved the rest, so I spent almost a year putting away birthday money and doing odd jobs for neighbours. It felt like forever! When I finally bought it, I looked after it so carefully. I think that's the thing about saving up — you value something so much more when you've worked hard for it.",
      },
    ],
    usefulPhrases: [
      'I spent almost a year ...',
      'putting away ...',
      'doing odd jobs',
      'it felt like forever',
      'you value something so much more when ...',
    ],
  },
  {
    id: 'sp-374',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'Why do you think so many people find it hard to save money?',
    sampleAnswers: [
      {
        label: 'Temptation and Pressure',
        answer:
          "There are a few reasons, I think. Firstly, for a lot of people, life is just expensive, and there's simply nothing left at the end of the month. But even when there is, it's hard because the reward for saving is far away, while the fun of spending is right now. There's also a lot of pressure to keep up with friends. What's helped me is saving automatically on payday, so the money disappears before I can spend it.",
      },
    ],
    usefulPhrases: [
      "there's simply nothing left at the end of the month",
      'the reward ... is far away',
      'right now',
      'keep up with friends',
      'before I can spend it',
    ],
  },
  {
    id: 'sp-375',
    topic: 'Money & Finance',
    difficulty: 'medium',
    question: 'Do you think it is important to talk about money openly?',
    sampleAnswers: [
      {
        label: 'More Than We Do',
        answer:
          "I think we should talk about it more than we usually do. In many families money is a bit of a secret, so young people grow up not knowing how to budget or what things really cost. Being open doesn't mean telling everyone how much you have — it means being able to ask for advice and admit when you're struggling. Talking about it makes it less stressful.",
      },
    ],
    usefulPhrases: [
      'is a bit of a secret',
      "doesn't mean..., it means...",
      "admit when you're struggling",
      'makes it less stressful',
    ],
  },
  {
    id: 'sp-376',
    topic: 'Money & Finance',
    difficulty: 'hard',
    question: 'Should schools teach children how to manage money?',
    sampleAnswers: [
      {
        label: 'An Essential Life Skill',
        answer:
          "Absolutely, and I'm surprised it isn't standard everywhere. We spend years learning things most of us never use again, yet nobody teaches us how to make a budget, how interest works, or why borrowing can be dangerous. Kids whose parents happen to be good with money get a huge advantage. Teaching it in school would make things fairer. It doesn't need to be complicated — just the basics, taught in a practical way.",
      },
    ],
    usefulPhrases: [
      "I'm surprised it isn't standard everywhere",
      'yet nobody teaches us how to ...',
      'happen to be good with money',
      'a huge advantage',
      "it doesn't need to be complicated",
    ],
  },
  {
    id: 'sp-377',
    topic: 'Money & Finance',
    difficulty: 'hard',
    question: 'If you suddenly received a very large sum of money, how do you think it would change you?',
    sampleAnswers: [
      {
        label: 'Hopefully Not Too Much',
        answer:
          "I'd like to believe it wouldn't change me much, but I'm not naive. At first I'd probably pay off any debts, help my family and travel a lot. The risk is that you start getting used to luxury, and suddenly normal things don't feel good enough. I've also heard that sudden wealth can make relationships complicated — people start seeing you differently. So I think I'd try to keep living fairly simply and avoid telling too many people!",
      },
    ],
    usefulPhrases: [
      "I'd like to believe ..., but I'm not naive",
      'pay off any debts',
      'you start getting used to ...',
      'people start seeing you differently',
      'keep living fairly simply',
    ],
  },
  {
    id: 'sp-378',
    topic: 'Money & Finance',
    difficulty: 'hard',
    question: 'Do you think people judge each other too much by how much money they have?',
    sampleAnswers: [
      {
        label: "Money Isn't Character",
        answer:
          "Sadly, yes. People make quick assumptions based on someone's car, clothes or where they live, and they often treat them differently because of it. The problem is that money tells you very little about who someone really is. Some of the kindest, wisest people I know have very little, and I've met wealthy people who were incredibly generous too. I think we'd all be better off if we judged people on how they treat others instead.",
      },
    ],
    usefulPhrases: [
      'make quick assumptions based on ...',
      'treat them differently because of it',
      'tells you very little about ...',
      'some of the kindest people I know ...',
      "we'd all be better off if ...",
    ],
  },

  // ── Health & Wellness ─────────────────────────────────
  {
    id: 'sp-59',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: 'What would you do if you had a whole week off with no responsibilities?',
    sampleAnswers: [
      {
        label: 'Dream Week',
        answer:
          "Oh, that sounds amazing. The first two days I'd just sleep in and do absolutely nothing — no alarm, no plans. Then I'd take a short road trip along the coast, stopping at random places along the way with a good book. On the last couple of days I'd come home, cook a big meal for my family, and catch up with friends. Honestly, I think everyone needs a week like that at least once a year.",
      },
    ],
    usefulPhrases: [
      'sleep in',
      'do absolutely nothing',
      'catch up with friends',
      'everyone needs... at least once a year',
    ],
  },
  {
    id: 'sp-93',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: 'How do you deal with stress?',
    sampleAnswers: [
      {
        label: 'What Actually Works',
        answer:
          "Physical activity is the thing that reliably works for me — a swim or a long walk resets my head better than anything else. Beyond that, I've learned that most of my stress comes from vagueness: a large problem I haven't broken down yet. Writing it out and turning it into three specific tasks usually removes half the weight of it. What doesn't work, though I still do it sometimes, is scrolling on my phone to escape — it feels like rest but I always feel worse afterwards. And when it's serious, talking to someone helps far more than trying to reason my way out alone.",
      },
      {
        label: 'Short & Simple',
        answer:
          "Exercise first — a walk or a swim clears my head. Then I write down exactly what's worrying me, because it's usually less overwhelming once it's specific. And I try to protect my sleep, since everything feels much worse when I'm tired.",
      },
    ],
    usefulPhrases: [
      'resets my head',
      'most of my stress comes from vagueness',
      'removes half the weight of it',
      'it feels like rest but I always feel worse afterwards',
      'reason my way out alone',
      'protect my sleep',
    ],
  },
  {
    id: 'sp-94',
    topic: 'Health & Wellness',
    difficulty: 'easy',
    question: 'How important is sleep to you, and do you get enough?',
    sampleAnswers: [
      {
        label: 'The Foundation',
        answer:
          "I've come to see it as the foundation everything else sits on. When I sleep badly, my diet slips, I skip exercise, and I'm noticeably less patient with people — so it's not just one thing going wrong, it's everything degrading slightly. I get around seven hours on a normal night, which is enough, though I went through a period of sleeping five or six and telling myself I was fine. I wasn't. What helped most was a walk after dinner and keeping my phone out of the bedroom. The phone rule sounds trivial but it made the biggest difference.",
      },
    ],
    usefulPhrases: [
      'the foundation everything else sits on',
      'my diet slips',
      'everything degrading slightly',
      'telling myself I was fine',
      'sounds trivial but it made the biggest difference',
    ],
  },
  {
    id: 'sp-125',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: 'What does a healthy lifestyle mean to you personally?',
    sampleAnswers: [
      {
        label: 'Sustainable Over Strict',
        answer:
          "For me it's less about strict rules and more about not being able to tell I'm 'on' a routine at all — meals that don't feel like punishment, movement that fits into the day instead of being a separate chore, sleep that I actually protect. I've tried the stricter version before, cutting out whole food groups, rigid gym schedules, and it always fell apart within a couple of months. So now my standard is just: can I keep doing this without willpower running out? If not, it's probably not sustainable.",
      },
    ],
    usefulPhrases: [
      "it's less about... and more about...",
      "meals that don't feel like punishment",
      'instead of being a separate chore',
      'it always fell apart within...',
      "can I keep doing this without willpower running out?",
    ],
  },
  {
    id: 'sp-135',
    topic: 'Health & Wellness',
    difficulty: 'easy',
    question: 'How do you make sure you get enough exercise?',
    sampleAnswers: [
      {
        label: 'Attaching It to Something Else',
        answer:
          "Honestly, I don't rely on motivation for it, because that runs out. What works is attaching it to something I'm already going to do — I walk or cycle instead of taking a ride wherever that's realistic, so it happens without being a separate decision. I do have one proper workout most weeks, but that's the part I'm least consistent about. The daily movement is what actually adds up, even if none of it looks like 'exercise' on its own.",
      },
    ],
    usefulPhrases: [
      "I don't rely on motivation for it",
      'attaching it to something I\'m already going to do',
      'without being a separate decision',
      "that's the part I'm least consistent about",
      "what actually adds up",
    ],
  },
  {
    id: 'sp-196',
    topic: 'Health & Wellness',
    difficulty: 'easy',
    question: 'Do you drink enough water every day?',
    sampleAnswers: [
      {
        label: 'Trying To',
        answer:
          "Probably not, if I'm honest. I drink a lot of coffee and tea, and I forget about water until I get a headache in the afternoon. Recently I started keeping a big bottle on the table and trying to finish it by lunchtime. It's helped a lot — I feel less tired — but I still forget on busy days.",
      },
      {
        label: 'Short & Simple',
        answer:
          "Not really. I'm trying to keep a bottle with me so I remember.",
      },
    ],
    usefulPhrases: [
      "Probably not, if I'm honest.",
      'I forget about...',
      "It's helped a lot",
      'on busy days',
    ],
  },
  {
    id: 'sp-197',
    topic: 'Health & Wellness',
    difficulty: 'hard',
    question: 'Is it more important to be physically healthy or mentally healthy?',
    sampleAnswers: [
      {
        label: 'They Are Connected',
        answer:
          "I don't think you can really separate them. When I exercise and sleep well, my mood is better and I handle stress more easily. When I'm anxious or sad for a long time, I stop eating well and moving, and my body suffers too. If I had to choose, I'd say mental health comes first, because it affects whether you have the energy to look after your body at all. But really they're two sides of the same coin.",
      },
    ],
    usefulPhrases: [
      "I don't think you can really separate them",
      'handle stress more easily',
      'If I had to choose...',
      'two sides of the same coin',
    ],
  },
  {
    id: 'sp-257',
    topic: 'Health & Wellness',
    difficulty: 'easy',
    question: 'What healthy food do you actually enjoy?',
    sampleAnswers: [
      {
        label: 'Fruit and Soup',
        answer:
          "I really enjoy fresh fruit — mango, papaya, watermelon — especially when it's cold from the fridge. I also love vegetable soups. People think healthy food has to be boring, but a good soup with fresh herbs is one of my favourite meals.",
      },
    ],
    usefulPhrases: [
      'especially when...',
      'People think... has to be boring',
      'one of my favourite meals',
    ],
  },
  {
    id: 'sp-258',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: 'How do you feel about going to the doctor?',
    sampleAnswers: [
      {
        label: 'I Put It Off',
        answer:
          "Honestly, I tend to put it off until something really hurts, which I know isn't smart. Waiting rooms make me nervous, and I always worry they'll find something. But I've started doing a yearly check-up, and it's actually reassuring. It's better to find a small problem early than a big one late.",
      },
    ],
    usefulPhrases: [
      'I tend to put it off',
      "which I know isn't smart",
      "it's actually reassuring",
      "It's better to... than...",
    ],
  },
  {
    id: 'sp-379',
    topic: 'Health & Wellness',
    difficulty: 'easy',
    question: 'What do you do when you feel a cold coming on?',
    sampleAnswers: [
      {
        label: 'Rest and Ginger Tea',
        answer:
          "As soon as I feel that scratchy throat, I go straight into recovery mode. I drink loads of hot ginger tea with honey and lemon, and I try to get to bed early. If I can, I cancel any plans and just stay in with a blanket and a good book. I'm not one for taking medicine unless I really need it. Usually, a couple of days of proper rest sorts me out.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I drink hot ginger tea, rest a lot and go to bed early.',
      },
    ],
    usefulPhrases: [
      'as soon as I feel ...',
      'go straight into recovery mode',
      "I'm not one for ...",
      'stay in with a blanket',
      'sorts me out',
    ],
  },
  {
    id: 'sp-380',
    topic: 'Health & Wellness',
    difficulty: 'easy',
    question: 'Do you prefer exercising alone or with other people?',
    sampleAnswers: [
      {
        label: 'Better With a Friend',
        answer:
          "I'd say with other people, definitely. When I exercise alone, it's far too easy to talk myself out of it. But if I've arranged to go running with a friend, I can't let them down, so I show up. It's also more fun — we chat the whole time and the time flies by. That said, I do enjoy a quiet swim on my own now and then to clear my head.",
      },
    ],
    usefulPhrases: [
      'far too easy to talk myself out of it',
      "I can't let them down",
      'the time flies by',
      'now and then',
      'to clear my head',
    ],
  },
  {
    id: 'sp-381',
    topic: 'Health & Wellness',
    difficulty: 'easy',
    question: "What's one healthy habit you have?",
    sampleAnswers: [
      {
        label: 'Stretching Every Morning',
        answer:
          "Every morning I spend about ten minutes stretching before I do anything else. It's nothing intense, just gentle movements for my back and neck. I started doing it a couple of years ago because I kept waking up stiff, and it's made a real difference. Now my body almost feels strange if I skip it. It's such a small thing, but it sets a nice, calm tone for the day.",
      },
    ],
    usefulPhrases: [
      'before I do anything else',
      "it's nothing intense",
      "it's made a real difference",
      'my body almost feels strange if ...',
      'sets a nice, calm tone for the day',
    ],
  },
  {
    id: 'sp-382',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: 'Tell me about a time you were ill and how you got better.',
    sampleAnswers: [
      {
        label: 'A Long Recovery',
        answer:
          "A few years ago I had a really bad flu that knocked me out for almost two weeks. I couldn't eat much and I slept most of the day. What really helped was my roommate, who kept bringing me soup and checking I was drinking enough. Once the fever went, I still felt weak for ages, so I had to be patient and build my energy back up slowly. It made me appreciate just feeling normal.",
      },
    ],
    usefulPhrases: [
      'knocked me out for ...',
      'I slept most of the day',
      'once the fever went',
      'build my energy back up slowly',
      'it made me appreciate ...',
    ],
  },
  {
    id: 'sp-383',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: 'Why do you think many people find it hard to eat healthily?',
    sampleAnswers: [
      {
        label: 'Convenience Wins',
        answer:
          "I think the biggest problem is convenience. Unhealthy food is everywhere, it's cheap, and it's ready in seconds, while cooking a healthy meal takes time and planning. When you're tired at the end of the day, the easy option usually wins. There's also a lot of confusing advice — one week something's good for you, the next week it isn't. No wonder people just give up and eat whatever's quickest.",
      },
    ],
    usefulPhrases: [
      'the biggest problem is ...',
      "it's ready in seconds",
      'the easy option usually wins',
      'a lot of confusing advice',
      'no wonder people just give up',
    ],
  },
  {
    id: 'sp-384',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: "How has your attitude toward your health changed as you've got older?",
    sampleAnswers: [
      {
        label: 'From Careless to Careful',
        answer:
          "It's changed completely. When I was younger, I didn't think about my health at all — I'd stay up all night, eat terribly and still feel fine the next day. Now my body definitely lets me know when I've overdone it. So I've become much more careful. I pay attention to sleep, I try to move every day, and I actually go for check-ups. I suppose I've realised health isn't something you can take for granted.",
      },
    ],
    usefulPhrases: [
      "it's changed completely",
      "I didn't think about ... at all",
      "lets me know when I've overdone it",
      'I pay attention to ...',
      'something you can take for granted',
    ],
  },
  {
    id: 'sp-385',
    topic: 'Health & Wellness',
    difficulty: 'medium',
    question: 'Why do you think so many people start exercising and then give up?',
    sampleAnswers: [
      {
        label: 'Too Much, Too Soon',
        answer:
          "In my experience, people usually try to do too much, too soon. They decide to go to the gym every single day, get really sore, and then lose motivation within a couple of weeks. Another reason is that they choose exercise they don't actually enjoy, just because it's popular. I think the trick is finding something you look forward to — dancing, cycling, whatever — and starting at a level that feels almost too easy.",
      },
    ],
    usefulPhrases: [
      'too much, too soon',
      'lose motivation within ...',
      "they don't actually enjoy",
      'the trick is finding something you look forward to',
      'a level that feels almost too easy',
    ],
  },
  {
    id: 'sp-386',
    topic: 'Health & Wellness',
    difficulty: 'hard',
    question: 'Should governments do more to push people towards healthier lifestyles?',
    sampleAnswers: [
      {
        label: "Nudge, Don't Force",
        answer:
          "I think governments have a role, but there's a fine line. Things like taxing sugary drinks, building safe cycle paths and making healthy food cheaper seem sensible, because they make the healthy choice the easy choice. But I'm uncomfortable when it starts to feel like the state is telling adults how to live. People should still be free to make their own decisions. So I'd support gentle nudges, not strict rules.",
      },
    ],
    usefulPhrases: [
      "there's a fine line",
      'seem sensible',
      'make the healthy choice the easy choice',
      "I'm uncomfortable when ...",
      'gentle nudges, not strict rules',
    ],
  },
  {
    id: 'sp-387',
    topic: 'Health & Wellness',
    difficulty: 'hard',
    question: 'Is it harder to stay healthy in modern life than it was in the past?',
    sampleAnswers: [
      {
        label: 'Different, Not Simply Harder',
        answer:
          "In some ways, yes. We sit much more than previous generations, we're surrounded by processed food, and many of us are constantly stressed. But it's easy to romanticise the past. People used to have much less access to doctors, clean water or medicine, and lots of them did exhausting physical labour that wrecked their bodies. So I'd say the challenges are different rather than simply bigger. Today the hard part is mostly making good choices consistently.",
      },
    ],
    usefulPhrases: [
      'in some ways, yes',
      "we're surrounded by ...",
      "it's easy to romanticise the past",
      'different rather than simply bigger',
      'making good choices consistently',
    ],
  },
  {
    id: 'sp-388',
    topic: 'Health & Wellness',
    difficulty: 'hard',
    question: 'How much of our health is in our own hands, and how much comes down to luck?',
    sampleAnswers: [
      {
        label: 'Luck Deals the Cards',
        answer:
          "It's a bit of both, and I think people underestimate the luck part. Your genes, where you grew up, whether you could afford good food as a child — none of that is your choice. Some people do everything right and still get seriously ill. At the same time, our daily habits clearly matter a lot. I'd put it like this: luck deals the cards, but we decide how to play them. And we shouldn't blame people who were dealt a bad hand.",
      },
    ],
    usefulPhrases: [
      "it's a bit of both",
      'people underestimate ...',
      'none of that is your choice',
      "I'd put it like this",
      'dealt a bad hand',
    ],
  },

  // ── Manners & Etiquette ───────────────────────────────
  {
    id: 'sp-218',
    topic: 'Manners & Etiquette',
    difficulty: 'easy',
    question: 'What are good table manners where you live?',
    sampleAnswers: [
      {
        label: 'Respect at the Table',
        answer:
          "The most important one is to wait for the oldest person to start eating before you do. You also offer food to others before taking it yourself, and you don't leave the table until everyone has finished. Talking loudly with your mouth full is considered rude. They're small things, but they show respect for the people you're eating with.",
      },
    ],
    usefulPhrases: [
      'The most important one is...',
      'is considered rude',
      "They're small things, but...",
      'show respect for...',
    ],
  },
  {
    id: 'sp-219',
    topic: 'Manners & Etiquette',
    difficulty: 'easy',
    question: 'Do you think saying "please" and "thank you" is important?',
    sampleAnswers: [
      {
        label: 'Yes, Always',
        answer:
          "Yes, always. They're the easiest way to be kind, and they cost nothing. I notice when people say thank you to waiters or bus drivers — it tells me a lot about them. Even at home with my family, I try to say thanks for small things. It makes everyday life feel a little warmer.",
      },
      {
        label: 'Short & Simple',
        answer:
          "Yes. It's an easy way to be kind, and it costs nothing.",
      },
    ],
    usefulPhrases: [
      'They cost nothing',
      'it tells me a lot about them',
      'for small things',
      'a little warmer',
    ],
  },
  {
    id: 'sp-220',
    topic: 'Manners & Etiquette',
    difficulty: 'medium',
    question: 'What is something that people do in public that annoys you?',
    sampleAnswers: [
      {
        label: 'Loud Phone Calls',
        answer:
          "People who have loud phone calls on speaker in quiet places, like buses or cafes. I don't need to hear both sides of someone's argument with their cousin! I understand that sometimes you have to take a call, but using headphones or speaking quietly is easy. I think in public spaces we all have to remember we're sharing them.",
      },
    ],
    usefulPhrases: [
      "I don't need to hear...",
      'I understand that sometimes...',
      'is easy',
      "we're sharing them",
    ],
  },
  {
    id: 'sp-221',
    topic: 'Manners & Etiquette',
    difficulty: 'medium',
    question: 'Have you ever made a cultural mistake when visiting somewhere new?',
    sampleAnswers: [
      {
        label: 'Shoes On',
        answer:
          "Yes — once I walked into someone's home with my shoes on, and everyone went quiet. I didn't realise that taking them off at the door was expected there. The host laughed it off kindly, but I was so embarrassed. Since then, I always read a little about local customs before I travel, and when I'm not sure, I just watch what others do first.",
      },
    ],
    usefulPhrases: [
      'everyone went quiet',
      'laughed it off',
      'I was so embarrassed',
      "when I'm not sure, I just...",
    ],
  },
  {
    id: 'sp-222',
    topic: 'Manners & Etiquette',
    difficulty: 'hard',
    question: 'Are good manners less important today than in the past?',
    sampleAnswers: [
      {
        label: 'Changed, Not Gone',
        answer:
          "I think manners have changed rather than disappeared. Some old rules, like very formal greetings, are less common now, and people are more relaxed. But we've also created new manners — like not texting during dinner or replying to messages in a reasonable time. The basic idea hasn't changed: making people around you feel comfortable and respected. As long as we keep that, the details can change.",
      },
    ],
    usefulPhrases: [
      'have changed rather than disappeared',
      'are less common now',
      "The basic idea hasn't changed",
      'As long as we keep that...',
    ],
  },
  {
    id: 'sp-389',
    topic: 'Manners & Etiquette',
    difficulty: 'easy',
    question: "What do you usually bring when you visit someone's home?",
    sampleAnswers: [
      {
        label: 'Never Empty-Handed',
        answer:
          "I never like to arrive empty-handed. Usually I'll bring something small, like a box of pastries, some fruit or a bunch of flowers. If it's a dinner, I might ask beforehand whether I can bring a dessert. It's not about the gift itself — it's just a way of saying thank you for having me. My parents always did it, so it feels completely natural to me now.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I always bring something small, like fruit or flowers, to say thank you.',
      },
    ],
    usefulPhrases: [
      'I never like to arrive empty-handed',
      'something small, like ...',
      'I might ask beforehand whether ...',
      'a way of saying thank you for having me',
      'it feels completely natural to me',
    ],
  },
  {
    id: 'sp-390',
    topic: 'Manners & Etiquette',
    difficulty: 'easy',
    question: 'How do people usually greet each other where you live?',
    sampleAnswers: [
      {
        label: 'A Smile and a Nod',
        answer:
          "It depends on how well you know someone. With strangers or older people, it's usually a polite smile, a nod and a simple hello. Friends might hug, especially if they haven't seen each other for a while. Handshakes are more for formal situations. One thing I've noticed is that people always ask whether you've eaten — it's not really a question about food, just a friendly way of saying 'How are you?'",
      },
    ],
    usefulPhrases: [
      'it depends on how well you know someone',
      'a polite smile and a nod',
      "if they haven't seen each other for a while",
      'more for formal situations',
      'a friendly way of saying ...',
    ],
  },
  {
    id: 'sp-391',
    topic: 'Manners & Etiquette',
    difficulty: 'easy',
    question: 'What manners did your parents teach you when you were young?',
    sampleAnswers: [
      {
        label: 'Mind Your Manners',
        answer:
          "Quite a lot! I was always told to say please and thank you, to greet older relatives first, and never to start eating until everyone was at the table. My mum was also very strict about not interrupting when adults were talking. At the time some of it felt a bit old-fashioned, but now I'm really grateful. Those little habits make a good impression without you even thinking about it.",
      },
    ],
    usefulPhrases: [
      'I was always told to ...',
      'never to start ... until ...',
      'very strict about ...',
      'felt a bit old-fashioned',
      'make a good impression',
    ],
  },
  {
    id: 'sp-392',
    topic: 'Manners & Etiquette',
    difficulty: 'medium',
    question: 'Tell me about a time a stranger was unexpectedly polite or kind to you.',
    sampleAnswers: [
      {
        label: 'The Umbrella',
        answer:
          "Once I got caught in a sudden downpour without an umbrella, and I was standing under a tiny shelter looking miserable. An older man walked past, saw me, and just handed me his umbrella. He said he lived nearby and didn't need it. I tried to say no, but he insisted and walked off before I could argue. It was such a small gesture, but it completely changed my mood. I still think about it.",
      },
    ],
    usefulPhrases: [
      'got caught in a sudden downpour',
      'looking miserable',
      'he insisted',
      'before I could argue',
      'such a small gesture',
    ],
  },
  {
    id: 'sp-393',
    topic: 'Manners & Etiquette',
    difficulty: 'medium',
    question: 'Why do you think manners vary so much from place to place?',
    sampleAnswers: [
      {
        label: 'Shaped by History',
        answer:
          "I think manners grow out of each place's history and values. In some cultures, respect for elders is central, so there are lots of rules about how you speak to older people. In others, being direct is seen as honest, not rude. Even things like whether you finish everything on your plate can mean opposite things in different places. The goal is usually the same — showing respect — it's just expressed differently.",
      },
    ],
    usefulPhrases: [
      'grow out of ...',
      'is central',
      'is seen as honest, not rude',
      'can mean opposite things',
      "it's just expressed differently",
    ],
  },
  {
    id: 'sp-394',
    topic: 'Manners & Etiquette',
    difficulty: 'medium',
    question: "How do you politely say no when someone offers you something you don't want?",
    sampleAnswers: [
      {
        label: 'Kind but Clear',
        answer:
          "I try to be kind but clear. Usually I'll smile and say something like, 'That's really kind of you, but I'm fine, thanks.' If it's food, I might say I've just eaten, so they don't feel rejected. The tricky part is that in some situations, people offer two or three times to be polite, so you have to say no more than once. I think tone matters more than the exact words.",
      },
    ],
    usefulPhrases: [
      "that's really kind of you, but ...",
      "so they don't feel rejected",
      'the tricky part is that ...',
      'more than once',
      'tone matters more than the exact words',
    ],
  },
  {
    id: 'sp-395',
    topic: 'Manners & Etiquette',
    difficulty: 'medium',
    question: 'Is it rude to be late? How late is too late?',
    sampleAnswers: [
      {
        label: 'The Ten-Minute Rule',
        answer:
          "I think it depends on the situation. For a casual get-together with friends, being ten minutes late isn't a big deal, especially if you send a quick message. But for something like a dinner someone's cooked, or an appointment, being late feels disrespectful, as if your time matters more than theirs. Personally, anything over fifteen minutes without warning is too late. I'd rather arrive early and wait.",
      },
    ],
    usefulPhrases: [
      'it depends on the situation',
      "isn't a big deal",
      'as if your time matters more than theirs',
      'anything over ... is too late',
      "I'd rather arrive early and wait",
    ],
  },
  {
    id: 'sp-396',
    topic: 'Manners & Etiquette',
    difficulty: 'hard',
    question: 'Is it ever acceptable to be rude?',
    sampleAnswers: [
      {
        label: 'Sometimes Necessary',
        answer:
          "In rare cases, I think it is. If someone keeps ignoring polite signals — say, they're harassing someone or refusing to respect a clear 'no' — then being blunt, even rude, might be the only thing that works. Politeness relies on both people playing by the same rules. When one person stops doing that, you're not obliged to keep smiling. But it should be a last resort, not an excuse for bad temper.",
      },
    ],
    usefulPhrases: [
      'in rare cases, I think it is',
      'being blunt',
      'the only thing that works',
      "you're not obliged to ...",
      'it should be a last resort',
    ],
  },
  {
    id: 'sp-397',
    topic: 'Manners & Etiquette',
    difficulty: 'hard',
    question: 'Should children call adults by their first names, or use more formal titles?',
    sampleAnswers: [
      {
        label: 'It Depends on the Setting',
        answer:
          "I'm a bit torn on this. Using first names can make relationships feel warmer and more equal, and kids may feel more comfortable speaking up. But formal titles teach children that respect is something you show, especially to people older than you. I think the answer probably depends on the setting. In a family friend's home, first names feel fine; in a classroom, I'd still lean towards something more formal.",
      },
    ],
    usefulPhrases: [
      "I'm a bit torn on this",
      'feel warmer and more equal',
      'speaking up',
      'the answer probably depends on the setting',
      "I'd still lean towards ...",
    ],
  },
  {
    id: 'sp-398',
    topic: 'Manners & Etiquette',
    difficulty: 'hard',
    question: 'If everyone were completely honest all the time, would the world be more polite or less?',
    sampleAnswers: [
      {
        label: 'Honesty Needs Tact',
        answer:
          "I think it would be a lot less polite, at least at first! So much of good manners involves small, kind white lies — saying the meal was delicious, or that you love a gift. Without those, people would get hurt constantly. That said, maybe we'd get better at being honest gently. Ideally, honesty and politeness aren't opposites; tact is what lets you tell the truth without being cruel.",
      },
    ],
    usefulPhrases: [
      'at least at first',
      'kind white lies',
      'people would get hurt constantly',
      'being honest gently',
      'tell the truth without being cruel',
    ],
  },

  // ── Hobbies & Interests ───────────────────────────────
  {
    id: 'sp-16',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'What do you do to unwind after a long day?',
    sampleAnswers: [
      {
        label: 'Relaxed Evening',
        answer:
          "After a long day, the last thing I want is to look at another screen. So I usually go for a walk, especially if the weather is nice — even twenty minutes outside helps. Sometimes I cook dinner and listen to a podcast. If I'm really tired, I just lie on the couch and watch a show. Nothing fancy, just simple things to recharge.",
      },
    ],
    usefulPhrases: [
      'the last thing I want is...',
      'especially if the weather is nice',
      'Nothing fancy, just...',
      'to recharge',
    ],
  },
  {
    id: 'sp-40',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: "What's the last book or article that really stuck with you?",
    sampleAnswers: [
      {
        label: 'A Book About Habits',
        answer:
          "I recently read 'Atomic Habits' by James Clear, and it really changed how I think about building habits. The idea that stuck with me most is that you don't rise to the level of your goals, you fall to the level of your systems. I've started applying that to my English — instead of saying 'I want to speak better,' I listen to a short podcast every morning while I make breakfast. It's small, but it's been really effective.",
      },
    ],
    usefulPhrases: [
      'it really changed how I think about...',
      'The idea that stuck with me most is...',
      "I've started applying that to...",
      "instead of saying..., I...",
      "It's been really effective.",
    ],
  },
  {
    id: 'sp-41',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'Are you into any sports?',
    sampleAnswers: [
      {
        label: 'Casual Athlete',
        answer:
          "I play badminton a couple of times a week with some friends. We're not super competitive or anything, it's just a fun way to exercise and catch up. I also got into swimming last year, which I really enjoy because it's so calm — no music, no phone, just the water. I'm not very fast, but I feel great afterwards.",
      },
    ],
    usefulPhrases: [
      "We're not super competitive or anything.",
      "It's just a fun way to...",
      'I also got into...',
      'I feel great afterwards',
    ],
  },
  {
    id: 'sp-42',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: "What's something you've always wanted to learn but haven't yet?",
    sampleAnswers: [
      {
        label: 'Wishlist',
        answer:
          "I've always wanted to learn how to cook Thai food properly. I love Thai cuisine — the balance of sweet, sour, salty, and spicy is just incredible. I've tried making pad thai and green curry at home, but it never tastes quite right. I think I need to take an actual cooking class. I'd also love to learn to play piano someday, but that's a much bigger commitment. Maybe when I have more free time.",
      },
    ],
    usefulPhrases: [
      "I've always wanted to learn how to...",
      'the balance of... is just incredible.',
      'it never tastes quite right.',
      'I think I need to take an actual...',
      "that's a much bigger commitment.",
    ],
  },
  {
    id: 'sp-72',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'How important is music in your daily life?',
    sampleAnswers: [
      {
        label: 'Music as Background',
        answer:
          "Music is a constant backdrop to my day. I have different playlists for different activities — calm piano when I'm reading, upbeat music when I'm exercising, and mellow acoustic songs when I'm winding down. It genuinely affects my mood; the right song at the right moment can completely change how I feel. A day without any music feels strangely empty.",
      },
    ],
    usefulPhrases: [
      'a constant backdrop to...',
      'winding down',
      'genuinely affects my mood',
      'feels strangely empty',
    ],
  },
  {
    id: 'sp-103',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'What kind of movies or shows do you enjoy watching?',
    sampleAnswers: [
      {
        label: 'Genre Mix',
        answer:
          "I go through phases, honestly. For a while I was really into slow, quiet dramas — the kind where not much happens but you're completely absorbed anyway. Lately I've swung the other way and I'm watching a lot of mystery series, the kind where you're trying to guess the ending before the show gets there. I don't really watch things for background noise — if I put something on, I actually want to be watching it. My one rule is I won't start a show with more than three seasons unless someone I trust says it's worth it.",
      },
    ],
    usefulPhrases: [
      'I go through phases',
      "the kind where... but you're completely absorbed anyway",
      "I've swung the other way",
      "I don't really watch things for background noise",
      'unless someone I trust says...',
    ],
  },
  {
    id: 'sp-104',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: 'Is there a hobby you used to enjoy but stopped doing? What happened?',
    sampleAnswers: [
      {
        label: 'Drifted Away',
        answer:
          "I used to draw a lot, all through my teens. It wasn't anything serious, just sketching in notebooks. I don't remember deciding to stop — it just quietly disappeared once I got busier with school and then everything else, and one day I realized it had been years. I don't think anything dramatic happened, it just lost the daily habit that kept it alive. I've thought about picking it back up, but I think what's stopping me now is expecting to be as good as I was, which of course I'm not anymore.",
      },
    ],
    usefulPhrases: [
      "I don't remember deciding to stop",
      'it just quietly disappeared',
      'one day I realized...',
      'lost the daily habit that kept it alive',
      "what's stopping me now is..."
    ],
  },
  {
    id: 'sp-116',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: "What's a hobby you'd love to pick up if money and time weren't an issue?",
    sampleAnswers: [
      {
        label: 'The Fantasy Hobby',
        answer:
          "Sailing, easily. I've never done it, I don't know anyone who has a boat, and I have no idea how hard it actually is — which is probably exactly why it still sounds so appealing. There's something about being that dependent on wind and weather, having to actually read the conditions instead of ignoring them, that seems like the opposite of most of my normal life. It's very possible I'd try it once and hate it, but I like having at least one hobby I've never tested against reality.",
      },
    ],
    usefulPhrases: [
      'easily',
      "which is probably exactly why it still sounds so appealing",
      "there's something about...",
      'the opposite of most of my normal life',
      "I've never tested against reality",
    ],
  },
  {
    id: 'sp-117',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'Do you collect anything?',
    sampleAnswers: [
      {
        label: 'An Accidental Collection',
        answer:
          "Not on purpose, but I've realized I have a small pile of ticket stubs and boarding passes from trips, going back years. I never set out to collect them, I just kept not throwing them away, and at some point it became a thing I do on purpose. I like that it's completely useless as an object but means something to look through. I don't think I'll ever display them anywhere, they just live in a drawer.",
      },
    ],
    usefulPhrases: [
      'not on purpose, but...',
      "I never set out to..., I just...",
      'at some point it became a thing I do on purpose',
      "completely useless as an object but means something",
      'they just live in a drawer',
    ],
  },
  {
    id: 'sp-129',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: 'If you had to teach someone a skill you have, what would it be?',
    sampleAnswers: [
      {
        label: 'Something Practical',
        answer:
          "Probably how to negotiate a price when you're buying something — it's a small skill but it comes up constantly here, and most people I know are uncomfortable doing it. I'd teach them that it's mostly about being relaxed and willing to walk away, not about being aggressive. The couple of times I've tried explaining it, the hardest part for people isn't the words, it's getting comfortable with an awkward silence after naming a lower price. I think that applies to more than just negotiating, honestly.",
      },
    ],
    usefulPhrases: [
      "it's a small skill but it comes up constantly",
      'uncomfortable doing it',
      "it's mostly about... not about...",
      "the hardest part for people isn't... it's...",
      'applies to more than just...',
    ],
  },
  {
    id: 'sp-188',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'Do you like gardening or looking after plants?',
    sampleAnswers: [
      {
        label: 'A Small Balcony Garden',
        answer:
          "I do, though I'm still learning. I have about ten plants on my balcony — some herbs like basil and mint, a chilli plant, and a few flowers. I've killed more plants than I'd like to admit, usually by giving them too much water. But there's something calming about checking on them every morning and noticing a new leaf. And cooking with herbs I grew myself feels great.",
      },
    ],
    usefulPhrases: [
      "I do, though I'm still learning.",
      "more... than I'd like to admit",
      "there's something calming about...",
      'feels great',
    ],
  },
  {
    id: 'sp-189',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: 'Do you enjoy taking photos? What do you like to photograph?',
    sampleAnswers: [
      {
        label: 'Everyday Details',
        answer:
          "Yes, but mostly on my phone. I don't really take photos of myself — I prefer small everyday details, like light coming through a window, an old man reading a newspaper, or a colourful market stall. I think ordinary moments are often more interesting than famous landmarks, which everyone has already photographed a million times.",
      },
    ],
    usefulPhrases: [
      'mostly on my phone',
      'I prefer...',
      'ordinary moments are often more interesting than...',
      'a million times',
    ],
  },
  {
    id: 'sp-399',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'Do you enjoy cooking as a hobby?',
    sampleAnswers: [
      {
        label: 'Weekend Cook',
        answer:
          "Yes, I really do, but mostly at the weekend. During the week I just make something quick, but on Saturdays I like to try a new recipe and take my time. I put some music on, chop everything slowly, and it feels very relaxing. It doesn't always turn out perfectly, honestly, but that's part of the fun. And the best bit is sharing the food with friends or family afterwards.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Yes, I love cooking at the weekend. I like trying new recipes and sharing the food.',
      },
    ],
    usefulPhrases: [
      'try a new recipe',
      'take my time',
      "it doesn't always turn out perfectly",
      "that's part of the fun",
      'the best bit is ...',
    ],
  },
  {
    id: 'sp-400',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'Do you prefer spending your free time indoors or outdoors?',
    sampleAnswers: [
      {
        label: 'Outdoors When I Can',
        answer:
          "Honestly, it depends on the weather, but I'd say outdoors when I can. If it's sunny, I love going for a long walk, sitting in a park, or riding my bike somewhere new. Being outside clears my head. When it's cold or raining, though, I'm happy to stay in with a book and a hot drink. So I guess I enjoy both, just at different times.",
      },
    ],
    usefulPhrases: [
      'it depends on the weather',
      "I'd say ... when I can",
      'clears my head',
      'stay in with ...',
      'I guess I enjoy both',
    ],
  },
  {
    id: 'sp-401',
    topic: 'Hobbies & Interests',
    difficulty: 'easy',
    question: 'Do you like doing puzzles, such as crosswords or jigsaws?',
    sampleAnswers: [
      {
        label: 'A Puzzle Fan',
        answer:
          "I do, especially jigsaws. There's something really calming about sorting the pieces and slowly watching the picture come together. I usually do one on the living room table and leave it there for a week or so, adding a few pieces whenever I walk past. Crosswords are a bit harder for me, but I like the easy ones in the newspaper. They keep my brain busy in a nice way.",
      },
    ],
    usefulPhrases: [
      "there's something really calming about ...",
      'come together',
      'whenever I walk past',
      'a bit harder for me',
      'keep my brain busy',
    ],
  },
  {
    id: 'sp-402',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: 'How did you get into your favourite hobby?',
    sampleAnswers: [
      {
        label: 'Started by Accident',
        answer:
          "It actually started by accident. A few years ago a friend asked me to join a beginner's climbing class because she didn't want to go alone. I wasn't keen at first, to be honest, because I'm not very sporty. But after the first session I was completely hooked. I loved the feeling of solving each wall like a puzzle. My friend gave up after a month, funnily enough, but I'm still going twice a week.",
      },
    ],
    usefulPhrases: [
      'it started by accident',
      "I wasn't keen at first",
      'I was completely hooked',
      'funnily enough',
      "I'm still going ...",
    ],
  },
  {
    id: 'sp-403',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: 'Is it better to have one hobby you take seriously or lots of hobbies you try a little?',
    sampleAnswers: [
      {
        label: 'A Bit of Both',
        answer:
          "I'd say there are advantages to both. Having one main hobby means you can really get good at it, and there's a lot of satisfaction in seeing yourself improve. On the other hand, trying lots of things keeps life interesting and you meet different kinds of people. Personally, I've got one hobby I'm quite committed to, and then I dip in and out of a few others. That balance works well for me.",
      },
    ],
    usefulPhrases: [
      'there are advantages to both',
      'really get good at it',
      'on the other hand',
      'dip in and out of ...',
      'that balance works well for me',
    ],
  },
  {
    id: 'sp-404',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: 'Tell me about a time a hobby helped you make new friends.',
    sampleAnswers: [
      {
        label: 'The Choir',
        answer:
          "A couple of years ago I joined a local choir, mainly because I liked singing in the shower. I didn't know anyone there, and I was really nervous. But singing together breaks the ice so quickly. After a few weeks we started going for drinks after rehearsals, and now some of those people are among my closest friends. We've even been on holiday together. I never expected a hobby to change my social life that much.",
      },
    ],
    usefulPhrases: [
      'I was really nervous',
      'breaks the ice',
      'among my closest friends',
      'I never expected ...',
      'change my social life',
    ],
  },
  {
    id: 'sp-405',
    topic: 'Hobbies & Interests',
    difficulty: 'medium',
    question: 'Why do you think some people get bored of new hobbies so quickly?',
    sampleAnswers: [
      {
        label: 'The Hard Middle Part',
        answer:
          "I think a lot of it is about expectations. At the start, everything is exciting and you improve fast. Then you hit a point where progress slows down, and it starts to feel like hard work. That's usually when people give up. Some people also buy all the equipment before they know if they even like it, which puts pressure on them. I've done that myself, actually, with a guitar that's now gathering dust.",
      },
    ],
    usefulPhrases: [
      'a lot of it is about ...',
      'you hit a point where ...',
      'it starts to feel like hard work',
      'puts pressure on them',
      'gathering dust',
    ],
  },
  {
    id: 'sp-406',
    topic: 'Hobbies & Interests',
    difficulty: 'hard',
    question: 'Does a hobby lose its magic when you start setting goals for it?',
    sampleAnswers: [
      {
        label: 'Goals Can Help or Hurt',
        answer:
          "It can, definitely. I used to run just for fun, but once I started tracking every kilometre and chasing faster times, it began to feel like an obligation. On the other hand, a small goal can give you a reason to keep going on days you don't feel like it. So I'd say the key is whether the goal serves the enjoyment or replaces it. If you dread doing it, that's a sign to loosen up.",
      },
    ],
    usefulPhrases: [
      'it began to feel like an obligation',
      "on days you don't feel like it",
      'the key is whether ...',
      'serves the enjoyment',
      "that's a sign to ...",
    ],
  },
  {
    id: 'sp-407',
    topic: 'Hobbies & Interests',
    difficulty: 'hard',
    question: 'If you could only keep one hobby for the rest of your life, which would it be?',
    sampleAnswers: [
      {
        label: 'Reading, Without Doubt',
        answer:
          "That's a tough one, but I think I'd keep reading. Other hobbies depend on my body, the weather, or having other people around, whereas reading works anywhere and at any age. It's also endlessly varied: one week I'm in a detective story, the next I'm learning about history. I'd really miss being active, of course. But if I had to choose, reading is the one that would keep my mind alive the longest.",
      },
    ],
    usefulPhrases: [
      "that's a tough one",
      'whereas ...',
      "it's endlessly varied",
      'if I had to choose',
      'keep my mind alive',
    ],
  },
  {
    id: 'sp-408',
    topic: 'Hobbies & Interests',
    difficulty: 'hard',
    question: 'Do people today have less free time than in the past, or do they just use it differently?',
    sampleAnswers: [
      {
        label: 'Different, Not Less',
        answer:
          "Honestly, I suspect we have about the same amount, but we use it in a more scattered way. Our grandparents might have spent a whole evening on one thing, like playing cards or mending something. Now our free time gets broken into lots of little pieces, and it's easy to fill each piece with scrolling. So it feels like we have less. I think protecting longer blocks of time is what makes free time feel real.",
      },
    ],
    usefulPhrases: [
      'I suspect ...',
      'in a more scattered way',
      'gets broken into lots of little pieces',
      'it feels like we have less',
      'protecting longer blocks of time',
    ],
  },

  // ── Movies, Music & Books ─────────────────────────────
  {
    id: 'sp-143',
    topic: 'Movies, Music & Books',
    difficulty: 'easy',
    question: "What's a movie you could watch again and again?",
    sampleAnswers: [
      {
        label: 'A Comfort Movie',
        answer:
          "For me it's 'Spirited Away'. I first watched it as a kid and I've probably seen it ten times since. Every time I notice something new — a small detail in the background or a line I missed before. It's beautiful to look at, a bit strange, and a little sad, but it always makes me feel calm. It's my go-to movie on a rainy evening.",
      },
      {
        label: 'Short & Simple',
        answer:
          "Spirited Away. It's beautiful and calm, and I notice something new every time I watch it.",
      },
    ],
    usefulPhrases: [
      "For me it's...",
      "I've probably seen it... times",
      'Every time I notice something new',
      "It's my go-to... on...",
    ],
  },
  {
    id: 'sp-144',
    topic: 'Movies, Music & Books',
    difficulty: 'easy',
    question: 'What kind of music do you listen to most?',
    sampleAnswers: [
      {
        label: 'A Bit of Everything',
        answer:
          "A bit of everything, honestly, but mostly acoustic and indie music. I like songs where you can actually hear the lyrics. I also listen to a lot of old love songs from the nineties because my parents played them when I was growing up, so they feel nostalgic. When I'm cleaning the house, though, it has to be something loud and upbeat, otherwise I just give up halfway.",
      },
    ],
    usefulPhrases: [
      'A bit of everything, honestly',
      'mostly...',
      'they feel nostalgic',
      'it has to be something...',
    ],
  },
  {
    id: 'sp-145',
    topic: 'Movies, Music & Books',
    difficulty: 'medium',
    question: 'Tell me about a book that changed the way you think.',
    sampleAnswers: [
      {
        label: 'A Small Book, a Big Idea',
        answer:
          "'Man's Search for Meaning' by Viktor Frankl. It's quite short, but it stayed with me for months. He describes surviving terrible conditions, and his main idea is that even when you can't control what happens to you, you can still choose how you respond. Since reading it, when something goes wrong I try to ask, 'What can I still choose here?' It sounds simple, but it's helped me stay calmer in difficult moments.",
      },
    ],
    usefulPhrases: [
      'It stayed with me for months.',
      'his main idea is that...',
      'Since reading it...',
      'It sounds simple, but...',
    ],
  },
  {
    id: 'sp-146',
    topic: 'Movies, Music & Books',
    difficulty: 'medium',
    question: 'Do you prefer watching movies at home or at the cinema?',
    sampleAnswers: [
      {
        label: 'Depends on the Film',
        answer:
          "It depends on the film. For big action movies or anything with amazing visuals, the cinema is worth it — the huge screen and the sound make it a completely different experience. But for dramas or comedies, I prefer home. I can pause it, make snacks, and talk about it with whoever I'm watching with. Plus, cinema tickets aren't cheap anymore, so I save them for films that really deserve it.",
      },
    ],
    usefulPhrases: [
      'It depends on the...',
      'is worth it',
      'a completely different experience',
      'I save them for... that really deserve it',
    ],
  },
  {
    id: 'sp-147',
    topic: 'Movies, Music & Books',
    difficulty: 'hard',
    question: 'Do you think films based on books are ever better than the original?',
    sampleAnswers: [
      {
        label: 'Sometimes, Surprisingly',
        answer:
          "Usually the book wins, because it can take its time and show you what characters are thinking. A two-hour film has to cut a lot. But sometimes the film is better, and I think it happens when the director understands that a film is a different language, not just pictures of the book. A good adaptation changes things on purpose. 'The Lord of the Rings' films, for example, made some long, slow parts of the books much more exciting. So I don't think loyalty to the book is the point — the question is whether it works as a film.",
      },
    ],
    usefulPhrases: [
      'Usually the book wins, because...',
      'it can take its time',
      'changes things on purpose',
      'the question is whether...',
    ],
  },
  {
    id: 'sp-250',
    topic: 'Movies, Music & Books',
    difficulty: 'easy',
    question: 'Do you prefer reading paper books or e-books?',
    sampleAnswers: [
      {
        label: 'Paper Books',
        answer:
          "Paper books, definitely. I like the feel of the pages and seeing how much I've read. I also remember the story better when I read on paper. E-books are useful for travelling because they're light, but at home I always choose a real book.",
      },
    ],
    usefulPhrases: [
      '..., definitely',
      'the feel of...',
      "they're light",
      'I always choose...',
    ],
  },
  {
    id: 'sp-409',
    topic: 'Movies, Music & Books',
    difficulty: 'easy',
    question: "What's a song you can't stop listening to at the moment?",
    sampleAnswers: [
      {
        label: 'On Repeat',
        answer:
          "At the moment I've got an old soul song on repeat. I heard it in a café last week and had to look it up straight away. It's got a really warm, happy feeling, and it puts me in a good mood every morning. I've probably played it about fifty times now, so my family is getting a bit tired of it! I'm sure I'll move on to something else soon.",
      },
      {
        label: 'Short & Simple',
        answer:
          "There's an old soul song I play every day right now. It makes me feel happy.",
      },
    ],
    usefulPhrases: [
      'have ... on repeat',
      'look it up straight away',
      'puts me in a good mood',
      'getting a bit tired of it',
      "I'll move on to something else",
    ],
  },
  {
    id: 'sp-410',
    topic: 'Movies, Music & Books',
    difficulty: 'easy',
    question: 'Do you prefer reading fiction or non-fiction?',
    sampleAnswers: [
      {
        label: 'Mostly Fiction',
        answer:
          "Mostly fiction, I'd say. I love getting lost in a story and spending time with characters I care about. Novels help me switch off at the end of the day in a way that non-fiction doesn't. That said, I do read the odd history or science book, especially if a friend recommends it. But if I'm choosing something for a holiday, it's always a good novel.",
      },
    ],
    usefulPhrases: [
      'getting lost in a story',
      'help me switch off',
      'that said, ...',
      'the odd ...',
      "it's always a good ...",
    ],
  },
  {
    id: 'sp-411',
    topic: 'Movies, Music & Books',
    difficulty: 'easy',
    question: 'Do you listen to music while you do other things?',
    sampleAnswers: [
      {
        label: 'Music in the Background',
        answer:
          "All the time, really. I listen to music when I'm cooking, cleaning, or walking somewhere. It makes boring jobs go much faster. The only time I can't have music on is when I'm reading, because I end up listening to the lyrics instead of the words on the page. For that I need complete silence, or maybe some quiet piano at most.",
      },
    ],
    usefulPhrases: [
      'all the time, really',
      'makes boring jobs go faster',
      "the only time I can't ... is when ...",
      'I end up ...',
      'at most',
    ],
  },
  {
    id: 'sp-412',
    topic: 'Movies, Music & Books',
    difficulty: 'medium',
    question: 'Tell me about a concert or live show you went to.',
    sampleAnswers: [
      {
        label: 'An Outdoor Concert',
        answer:
          "Last summer I went to an outdoor concert in a big park with a few friends. We brought a picnic and sat on the grass while the sun went down. The band wasn't very famous, but they were brilliant live, much better than on their recordings. By the end, everyone was standing up and dancing, even people who'd been sitting quietly all evening. It's one of those nights I still think about.",
      },
    ],
    usefulPhrases: [
      'while the sun went down',
      'brilliant live',
      'much better than ...',
      'by the end, ...',
      'one of those nights I still think about',
    ],
  },
  {
    id: 'sp-413',
    topic: 'Movies, Music & Books',
    difficulty: 'medium',
    question: 'Why do you think some people love scary movies?',
    sampleAnswers: [
      {
        label: 'A Safe Kind of Fear',
        answer:
          "I think it's because they get to feel fear in a completely safe way. Your heart races, you jump, maybe you scream a bit, but you know you're sitting on your sofa and nothing can actually hurt you. Afterwards there's a kind of relief that feels good. It's also fun to watch them with friends and laugh at each other's reactions. Personally, though, I'm a big coward, so I usually watch through my fingers.",
      },
    ],
    usefulPhrases: [
      'in a completely safe way',
      'your heart races',
      'a kind of relief',
      "laugh at each other's reactions",
      'watch through my fingers',
    ],
  },
  {
    id: 'sp-414',
    topic: 'Movies, Music & Books',
    difficulty: 'medium',
    question: "Is there a book you started but couldn't finish? What happened?",
    sampleAnswers: [
      {
        label: 'A Classic I Gave Up On',
        answer:
          "Yes, there's a famous long classic that I've started three times and never finished. Everyone told me it was a masterpiece, so I felt I should read it. But the first hundred pages were so slow that I kept falling asleep. In the end I decided life's too short to force myself through a book I'm not enjoying. Maybe I'll try again when I'm older and more patient.",
      },
    ],
    usefulPhrases: [
      'I felt I should ...',
      'I kept falling asleep',
      'in the end I decided ...',
      "life's too short to ...",
      "when I'm older and more patient",
    ],
  },
  {
    id: 'sp-415',
    topic: 'Movies, Music & Books',
    difficulty: 'medium',
    question: 'How have your tastes in music changed since you were a teenager?',
    sampleAnswers: [
      {
        label: 'Softer Now',
        answer:
          "Quite a lot, actually. As a teenager I only listened to loud rock music, and I thought anything else was boring. These days I'm much more open. I listen to jazz, a bit of classical, and even some of the pop songs I used to make fun of. I think when you're young, music is part of your identity, so you stick to one thing. Now I just listen to whatever makes me feel good.",
      },
    ],
    usefulPhrases: [
      'quite a lot, actually',
      "these days I'm much more open",
      'I used to make fun of ...',
      'part of your identity',
      'whatever makes me feel good',
    ],
  },
  {
    id: 'sp-416',
    topic: 'Movies, Music & Books',
    difficulty: 'hard',
    question: 'Can a sad film or song actually make people feel better?',
    sampleAnswers: [
      {
        label: 'A Good Cry',
        answer:
          "I really believe it can. When you're feeling down and you hear a song that matches your mood, it's like someone understands you. That can be more comforting than a cheerful song telling you to smile. And sometimes a sad film lets you have a good cry about something that's been building up inside you. Afterwards you feel lighter. So sadness in art isn't just depressing; it can be a release.",
      },
    ],
    usefulPhrases: [
      "when you're feeling down",
      'matches your mood',
      'have a good cry',
      'building up inside you',
      'it can be a release',
    ],
  },
  {
    id: 'sp-417',
    topic: 'Movies, Music & Books',
    difficulty: 'hard',
    question: 'If you could step into the world of any story for a day, which would you choose?',
    sampleAnswers: [
      {
        label: 'A Magical World',
        answer:
          "I'd probably choose a world full of magic, like the one in a big fantasy series I loved as a child. I'd want to wander around the castle, try the strange sweets, and maybe attempt a simple spell. Though I'd only want a day, to be fair, because most story worlds are actually quite dangerous! It'd be amazing to see whether it matched the picture I'd built in my head while reading.",
      },
    ],
    usefulPhrases: [
      "I'd probably choose ...",
      "I'd want to wander around ...",
      'to be fair',
      "it'd be amazing to see whether ...",
      "the picture I'd built in my head",
    ],
  },
  {
    id: 'sp-418',
    topic: 'Movies, Music & Books',
    difficulty: 'hard',
    question: 'Should children be allowed to read and watch whatever they want?',
    sampleAnswers: [
      {
        label: 'Guidance, Not Bans',
        answer:
          "Not completely, no, but I don't think strict bans work well either. Some content really can upset or confuse young children, so age limits make sense. But as kids get older, I think it's better to talk with them about what they're watching rather than just forbidding things. If you ban something, it often becomes more attractive. Honestly, the conversation afterwards is probably more valuable than the rule itself.",
      },
    ],
    usefulPhrases: [
      "I don't think ... work well either",
      '... make sense',
      'rather than just ...',
      'it often becomes more attractive',
      'more valuable than ...',
    ],
  },

  // ── Sports & Games ────────────────────────────────────
  {
    id: 'sp-148',
    topic: 'Sports & Games',
    difficulty: 'easy',
    question: 'Did you play any sports when you were younger?',
    sampleAnswers: [
      {
        label: 'Football in the Street',
        answer:
          "Yes, mostly football with the kids in my neighborhood. We didn't have a proper field, so we used two sandals as goalposts and played in the alley after school until it got dark. My mother had to shout my name three times before I'd come home for dinner. I wasn't very good, but I loved it. I still think those games were more fun than any real match I've watched since.",
      },
    ],
    usefulPhrases: [
      'We used... as...',
      'until it got dark',
      "I wasn't very good, but I loved it.",
      'more fun than any... since',
    ],
  },
  {
    id: 'sp-149',
    topic: 'Sports & Games',
    difficulty: 'easy',
    question: 'Do you like board games or card games?',
    sampleAnswers: [
      {
        label: 'Family Card Nights',
        answer:
          'I love them, especially card games. During the New Year holiday, my whole family plays cards for hours — nothing serious, just small coins and lots of laughing and arguing about the rules. I also like simple board games with friends, like Uno or Codenames. I think games are a great way to spend time with people, because everyone puts their phone down and actually talks to each other.',
      },
    ],
    usefulPhrases: [
      'I love them, especially...',
      'nothing serious, just...',
      'arguing about the rules',
      'everyone puts their phone down',
    ],
  },
  {
    id: 'sp-150',
    topic: 'Sports & Games',
    difficulty: 'medium',
    question: 'Do you prefer watching sports or playing them?',
    sampleAnswers: [
      {
        label: 'Playing, Definitely',
        answer:
          "Playing, definitely. I find it hard to sit and watch a whole football match unless it's a big game with friends, like the World Cup. But I'll happily play badminton for two hours without noticing the time. When you're playing, your mind is completely on the game, so you forget everything else. When you're watching, I always end up checking my phone. That said, watching a final with a big group in a cafe, everyone shouting at the screen, is a great feeling.",
      },
    ],
    usefulPhrases: [
      'Playing, definitely.',
      'I find it hard to...',
      'without noticing the time',
      'That said...',
    ],
  },
  {
    id: 'sp-151',
    topic: 'Sports & Games',
    difficulty: 'medium',
    question: 'What sport would you like to try that you never have?',
    sampleAnswers: [
      {
        label: 'Surfing',
        answer:
          "Surfing. I live by the sea and I see people surfing at the local beach all the time, but I've never actually tried. Part of me is a bit scared — the waves look much bigger when you're in the water. But I think this is the year. There are a few schools on the beach that do beginner lessons, and I've promised a friend we'll go together so neither of us can back out.",
      },
    ],
    usefulPhrases: [
      "I've never actually tried",
      'Part of me is a bit scared',
      'I think this is the year',
      'so neither of us can back out',
    ],
  },
  {
    id: 'sp-152',
    topic: 'Sports & Games',
    difficulty: 'hard',
    question: 'Do professional athletes earn too much money?',
    sampleAnswers: [
      {
        label: 'It Is the Market',
        answer:
          "It feels unfair when you compare a footballer's salary to a nurse's, and I understand why people get angry. But athletes don't set their own pay — fans, TV companies, and advertisers do. Millions of people pay to watch them, so the money follows. Also, most careers in sport are very short, and only a tiny number of players earn those huge amounts. What I'd question is not the athletes, but what we as a society choose to value and pay for.",
      },
    ],
    usefulPhrases: [
      'It feels unfair when you compare...',
      'I understand why...',
      'the money follows',
      "What I'd question is not... but...",
    ],
  },
  {
    id: 'sp-251',
    topic: 'Sports & Games',
    difficulty: 'medium',
    question: 'Do you think children should play competitive sports?',
    sampleAnswers: [
      {
        label: 'Yes, With Balance',
        answer:
          "Yes, I think competition can teach children a lot — how to win politely, how to lose without giving up, and how to work in a team. But it should still be fun. When parents or coaches push too hard, kids can start to hate the sport. I'd say the goal at a young age should be enjoying it, with competition as a bonus.",
      },
    ],
    usefulPhrases: [
      'can teach children a lot',
      'how to lose without giving up',
      'push too hard',
      'as a bonus',
    ],
  },
  {
    id: 'sp-419',
    topic: 'Sports & Games',
    difficulty: 'easy',
    question: 'What do you do to stay active?',
    sampleAnswers: [
      {
        label: 'Walking and Cycling',
        answer:
          "Nothing too intense, to be honest. I walk almost everywhere, and I try to get at least eight thousand steps a day. At the weekend I often go cycling along the river for an hour or two. I also do a short stretching routine in the mornings, which helps a lot with my back. I'm not a gym person, but small habits like these keep me feeling healthy.",
      },
      {
        label: 'Short & Simple',
        answer:
          "I walk a lot and go cycling at the weekend. I'm not a gym person.",
      },
    ],
    usefulPhrases: [
      'nothing too intense',
      'I try to get at least ...',
      'helps a lot with ...',
      "I'm not a gym person",
      'keep me feeling healthy',
    ],
  },
  {
    id: 'sp-420',
    topic: 'Sports & Games',
    difficulty: 'easy',
    question: 'Do you know how to swim?',
    sampleAnswers: [
      {
        label: 'Learned as a Kid',
        answer:
          "Yes, I do. My parents sent me to swimming lessons when I was about seven, and I remember hating the cold water at first. Now I'm really glad they did. I'm not a fast swimmer, but I feel comfortable in the sea and in pools. I try to go swimming once a week in the summer because it's gentle on the body and very refreshing.",
      },
    ],
    usefulPhrases: [
      'I remember hating ... at first',
      "now I'm really glad they did",
      'I feel comfortable in ...',
      'gentle on the body',
      'very refreshing',
    ],
  },
  {
    id: 'sp-421',
    topic: 'Sports & Games',
    difficulty: 'easy',
    question: 'Do you support a sports team?',
    sampleAnswers: [
      {
        label: 'A Loyal Fan',
        answer:
          "I do, yes. I support my local football team, mostly because my dad took me to matches when I was little. They're not very good, honestly, and they lose more often than they win! But I still watch every game I can and check the score straight away if I miss one. Supporting them is more about feeling part of a community than about winning.",
      },
    ],
    usefulPhrases: [
      'mostly because ...',
      'they lose more often than they win',
      'check the score',
      'is more about ... than ...',
      'feeling part of a community',
    ],
  },
  {
    id: 'sp-422',
    topic: 'Sports & Games',
    difficulty: 'medium',
    question: 'Tell me about a time you won or lost an important game.',
    sampleAnswers: [
      {
        label: 'A Painful Final',
        answer:
          "When I was at school, our basketball team reached the final of a local tournament. We were winning for most of the game, and then in the last minute the other team scored twice. I was absolutely gutted, and I remember sitting in the changing room in total silence. But our coach told us to be proud of how far we'd come. Looking back, it taught me how to lose with a bit of dignity.",
      },
    ],
    usefulPhrases: [
      'for most of the game',
      'I was absolutely gutted',
      'in total silence',
      "be proud of how far we'd come",
      'looking back, it taught me ...',
    ],
  },
  {
    id: 'sp-423',
    topic: 'Sports & Games',
    difficulty: 'medium',
    question: 'Why do you think team sports are so popular?',
    sampleAnswers: [
      {
        label: 'Belonging',
        answer:
          "I think it's mainly about belonging. When you play in a team, you're part of something bigger than yourself, and you share the highs and lows together. Even fans feel that, which is why stadiums are so emotional. Team sports also teach you to rely on other people and to deal with not always being the star. Plus, let's be honest, celebrating a goal with your teammates is just a brilliant feeling.",
      },
    ],
    usefulPhrases: [
      "it's mainly about ...",
      'part of something bigger than yourself',
      'share the highs and lows',
      'rely on other people',
      "let's be honest, ...",
    ],
  },
  {
    id: 'sp-424',
    topic: 'Sports & Games',
    difficulty: 'medium',
    question: 'Is it better to exercise alone or with other people?',
    sampleAnswers: [
      {
        label: 'Depends on My Mood',
        answer:
          "For me, it depends on what kind of day I've had. When I'm stressed, I like to run alone with my headphones in, because it's my thinking time. But when I need motivation, exercising with friends is much better. If someone's waiting for me at the park, I can't just stay in bed! So I'd say exercising with others is better for consistency, and alone is better for clearing your head.",
      },
    ],
    usefulPhrases: [
      "it depends on what kind of day I've had",
      'my thinking time',
      'when I need motivation',
      "I can't just stay in bed",
      'better for consistency',
    ],
  },
  {
    id: 'sp-425',
    topic: 'Sports & Games',
    difficulty: 'medium',
    question: 'Do you prefer games of skill or games of luck?',
    sampleAnswers: [
      {
        label: 'A Mix Is Best',
        answer:
          "I actually prefer games with a bit of both. Pure luck games, like simple dice games, can feel a bit pointless because nothing you do matters. But pure skill games, like chess, can be stressful, especially if one person is much better than everyone else. A mix keeps it fair and fun. Even a beginner has a chance of winning, and that's what makes family game nights enjoyable for everyone.",
      },
    ],
    usefulPhrases: [
      'a bit of both',
      'feel a bit pointless',
      'nothing you do matters',
      'keeps it fair and fun',
      'has a chance of winning',
    ],
  },
  {
    id: 'sp-426',
    topic: 'Sports & Games',
    difficulty: 'hard',
    question: 'Does sport bring people together, or does it divide them?',
    sampleAnswers: [
      {
        label: 'Both Sides of the Coin',
        answer:
          "Honestly, it does both, and that's what makes it so powerful. At its best, sport lets complete strangers hug each other in the street after a big win, and it gives people from very different backgrounds something to share. But that same passion can turn into rivalry and even hostility between fans. I'd say sport just amplifies whatever feelings people already have. The real question is how we choose to channel them.",
      },
    ],
    usefulPhrases: [
      'it does both',
      'at its best, ...',
      'from very different backgrounds',
      'turn into rivalry',
      'how we choose to channel ...',
    ],
  },
  {
    id: 'sp-427',
    topic: 'Sports & Games',
    difficulty: 'hard',
    question: 'If you could be world-class at one sport overnight, which would you choose?',
    sampleAnswers: [
      {
        label: 'Surfing',
        answer:
          "I think I'd choose surfing. It's not just about the competition; it's about being out in nature and reading the ocean, which seems almost spiritual. I've tried it a couple of times and spent most of the time falling off, so being brilliant at it would feel like a dream. I'd also love the lifestyle that comes with it: early mornings, beaches, and a very relaxed pace of life.",
      },
    ],
    usefulPhrases: [
      "it's not just about ...; it's about ...",
      'out in nature',
      'seems almost spiritual',
      'would feel like a dream',
      'the lifestyle that comes with it',
    ],
  },
  {
    id: 'sp-428',
    topic: 'Sports & Games',
    difficulty: 'hard',
    question: 'Is cheating ever understandable in sport or games?',
    sampleAnswers: [
      {
        label: 'Understandable, Not Acceptable',
        answer:
          "I'd say it can be understandable, but it's never acceptable. When people are under enormous pressure, or when they believe everyone else is cheating, I can see why they might be tempted. But the whole point of a game is that everyone agrees to the same rules. Once you break that agreement, the win means nothing. Even in a friendly card game, I'd much rather lose honestly than win by cheating.",
      },
    ],
    usefulPhrases: [
      'understandable, but never acceptable',
      'under enormous pressure',
      'I can see why ...',
      'the whole point of ... is ...',
      "I'd much rather ... than ...",
    ],
  },

  // ── Animals & Pets ────────────────────────────────────
  {
    id: 'sp-168',
    topic: 'Animals & Pets',
    difficulty: 'easy',
    question: 'Do you have a pet? Tell me about it.',
    sampleAnswers: [
      {
        label: 'A Lazy Cat',
        answer:
          "Yes, I have a cat called Mochi. She's orange, a bit overweight, and extremely lazy. She sleeps about twenty hours a day, usually in the sunniest spot in the apartment. But every evening at exactly six, she sits by her bowl and stares at me until I feed her. She isn't very affectionate, but when she does decide to sit on my lap, it feels like a great honour.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Yes, a lazy orange cat called Mochi. She sleeps all day and only gets excited at dinner time.',
      },
    ],
    usefulPhrases: [
      'I have a... called...',
      'extremely lazy',
      'stares at me until...',
      'it feels like a great honour',
    ],
  },
  {
    id: 'sp-169',
    topic: 'Animals & Pets',
    difficulty: 'easy',
    question: 'Are you a cat person or a dog person?',
    sampleAnswers: [
      {
        label: 'Dog Person, Mostly',
        answer:
          "I'd say a dog person, mostly. I like how dogs are always happy to see you — you come home and they act like you've been gone for years. Cats are more independent, which is easier, but I like that kind of energy and loyalty. Living in an apartment, though, a dog isn't really practical for me right now. Maybe one day when I have a house with a yard.",
      },
    ],
    usefulPhrases: [
      "I'd say a... person, mostly",
      "act like you've been gone for years",
      "isn't really practical for me right now",
      'Maybe one day when...',
    ],
  },
  {
    id: 'sp-170',
    topic: 'Animals & Pets',
    difficulty: 'medium',
    question: "What's your favourite animal, and why?",
    sampleAnswers: [
      {
        label: 'Elephants',
        answer:
          "Elephants. I saw a documentary about them years ago and I couldn't believe how emotional they are. They remember family members for decades, and they even seem to mourn when one of them dies. They're huge and powerful, but also gentle and very social. I'd love to see them in the wild one day — in a national park, not in a circus or riding camp.",
      },
    ],
    usefulPhrases: [
      "I couldn't believe how...",
      'They even seem to...',
      'but also...',
      "I'd love to see them in the wild",
    ],
  },
  {
    id: 'sp-171',
    topic: 'Animals & Pets',
    difficulty: 'medium',
    question: 'What do you think is the hardest part of having a pet?',
    sampleAnswers: [
      {
        label: 'Being Tied Down',
        answer:
          "For me it's being tied down. Every time I want to travel, even for a weekend, I have to find someone to feed my cat. And when she got sick last year, the vet bills were much more than I expected. People see the cute photos online but forget it's a commitment for ten or fifteen years. I don't regret it at all, but I think everyone should think carefully before getting a pet.",
      },
    ],
    usefulPhrases: [
      "For me it's...",
      'being tied down',
      'much more than I expected',
      "it's a commitment for...",
    ],
  },
  {
    id: 'sp-172',
    topic: 'Animals & Pets',
    difficulty: 'hard',
    question: 'Should zoos still exist?',
    sampleAnswers: [
      {
        label: 'Better Zoos, Not No Zoos',
        answer:
          "I think good zoos still have a role, but many shouldn't exist in their current form. Small cages and animals doing tricks for tourists are cruel. On the other hand, some modern zoos protect endangered species, breed animals that would otherwise disappear, and teach children to care about wildlife. So I'd say we need fewer, better zoos — with large natural spaces and a real focus on conservation, not entertainment.",
      },
    ],
    usefulPhrases: [
      'still have a role',
      'in their current form',
      'On the other hand...',
      "I'd say we need fewer, better...",
    ],
  },
  {
    id: 'sp-255',
    topic: 'Animals & Pets',
    difficulty: 'easy',
    question: 'Did you have any pets when you were a child?',
    sampleAnswers: [
      {
        label: 'A Goldfish Called Lucky',
        answer:
          "Just a goldfish called Lucky. I won him at a fair, and everyone said he'd only last a week. He lived for six years! I used to tell him about my day after school. It sounds silly, but he taught me how to look after something every day.",
      },
    ],
    usefulPhrases: [
      'everyone said...',
      'It sounds silly, but...',
      'look after something',
      'used to tell him about my day',
    ],
  },
  {
    id: 'sp-429',
    topic: 'Animals & Pets',
    difficulty: 'easy',
    question: 'Are there any animals you are afraid of?',
    sampleAnswers: [
      {
        label: 'Not a Fan of Spiders',
        answer:
          "Yes, I'm quite scared of spiders, even small ones. I know most of them are harmless, but the way they move just makes me jump. If I find one in the bathroom, I usually ask someone else to take it outside. I'm also a little nervous around big dogs I don't know, although I'm fine once I see that they're friendly.",
      },
      {
        label: 'Short & Simple',
        answer:
          "Yes, I'm scared of spiders. Big dogs make me a bit nervous too.",
      },
    ],
    usefulPhrases: [
      "I'm quite scared of ...",
      'most of them are harmless',
      'just makes me jump',
      'a little nervous around ...',
      "I'm fine once ...",
    ],
  },
  {
    id: 'sp-430',
    topic: 'Animals & Pets',
    difficulty: 'easy',
    question: 'Do you enjoy watching nature documentaries?',
    sampleAnswers: [
      {
        label: 'A Big Fan',
        answer:
          "I love them! They're one of my favourite things to watch on a quiet evening. The camera work is incredible, and I always learn something surprising, like how some birds dance to find a partner. The ocean ones are my favourite, because there are creatures down there that look like they're from another planet. Sometimes they're a bit sad, though, when a baby animal gets caught.",
      },
    ],
    usefulPhrases: [
      'one of my favourite things to watch',
      'I always learn something surprising',
      "look like they're from another planet",
      'a bit sad, though',
      'on a quiet evening',
    ],
  },
  {
    id: 'sp-431',
    topic: 'Animals & Pets',
    difficulty: 'easy',
    question: 'What animals do you often see around where you live?',
    sampleAnswers: [
      {
        label: 'City Wildlife',
        answer:
          "Mostly birds, to be honest. There are lots of pigeons and sparrows, and in the mornings I can hear them singing outside my window. There are also a few street cats that the neighbours feed, and one of them likes to sleep on our doorstep. Sometimes I see squirrels in the park nearby, which always makes me smile. It's nice to have a bit of nature around.",
      },
    ],
    usefulPhrases: [
      'mostly ..., to be honest',
      'that the neighbours feed',
      'always makes me smile',
      'in the park nearby',
      'a bit of nature around',
    ],
  },
  {
    id: 'sp-432',
    topic: 'Animals & Pets',
    difficulty: 'medium',
    question: 'Tell me about a memorable experience you had with an animal.',
    sampleAnswers: [
      {
        label: 'The Lost Dog',
        answer:
          'One rainy evening I found a little dog sitting outside a shop, shaking and clearly lost. It had a collar but no phone number. I took it home, gave it some food and a towel, and put up notices around the neighbourhood. Two days later a very emotional family turned up at my door. The kids were crying with happiness. It was such a lovely moment, and I still think about that dog.',
      },
    ],
    usefulPhrases: [
      'clearly lost',
      'put up notices',
      'turned up at my door',
      'crying with happiness',
      'such a lovely moment',
    ],
  },
  {
    id: 'sp-433',
    topic: 'Animals & Pets',
    difficulty: 'medium',
    question: 'Why do so many people treat their pets like members of the family?',
    sampleAnswers: [
      {
        label: 'Unconditional Love',
        answer:
          "I think it's because pets give you love without any conditions. They don't care if you've had a bad day or if you look terrible. They're just happy you're home. When you share your daily life with an animal for years, it's natural to feel deeply attached. Also, for people who live alone, a pet can be their main companion. So calling them family doesn't seem strange to me at all.",
      },
    ],
    usefulPhrases: [
      'without any conditions',
      "they're just happy you're home",
      'feel deeply attached',
      'their main companion',
      "doesn't seem strange to me at all",
    ],
  },
  {
    id: 'sp-434',
    topic: 'Animals & Pets',
    difficulty: 'medium',
    question: 'Would you rather adopt a pet from a shelter or buy one?',
    sampleAnswers: [
      {
        label: 'Adopt, Definitely',
        answer:
          "I'd definitely adopt from a shelter. There are so many animals waiting for a home, and it feels good to give one a second chance. My cousin adopted an older cat a few years ago, and it's the calmest, sweetest pet I've ever met. I understand why some people want a particular breed, but I think adopting is the kinder choice, especially if you just want a loving companion.",
      },
    ],
    usefulPhrases: [
      'waiting for a home',
      'give ... a second chance',
      "the calmest, sweetest ... I've ever met",
      'I understand why ..., but ...',
      'the kinder choice',
    ],
  },
  {
    id: 'sp-435',
    topic: 'Animals & Pets',
    difficulty: 'medium',
    question: 'What can children learn from looking after an animal?',
    sampleAnswers: [
      {
        label: 'Responsibility and Empathy',
        answer:
          "Quite a lot, I think. First of all, responsibility, because a pet needs feeding and care every single day, even when you don't feel like it. They also learn empathy, since they have to notice how the animal is feeling without it being able to talk. And sadly, pets can teach children about loss, too. I had a hamster as a kid, and losing it was my first experience of grief.",
      },
    ],
    usefulPhrases: [
      'first of all, ...',
      "even when you don't feel like it",
      'notice how ... is feeling',
      'teach children about loss',
      'my first experience of ...',
    ],
  },
  {
    id: 'sp-436',
    topic: 'Animals & Pets',
    difficulty: 'hard',
    question: 'Do you think animals have feelings in the same way people do?',
    sampleAnswers: [
      {
        label: 'Similar, Not Identical',
        answer:
          "I'm fairly sure they have feelings, but maybe not in exactly the same way. Anyone who's had a dog has seen it look excited, guilty, or sad. Some animals even seem to grieve when they lose a companion. Whether they experience those feelings as deeply as we do is hard to know, since we can't ask them. But I'd rather assume they feel more than less, because that makes us treat them better.",
      },
    ],
    usefulPhrases: [
      "I'm fairly sure ...",
      'not in exactly the same way',
      'seem to grieve',
      'is hard to know',
      "I'd rather assume ...",
    ],
  },
  {
    id: 'sp-437',
    topic: 'Animals & Pets',
    difficulty: 'hard',
    question: 'If you could understand what one animal was thinking, which would you choose?',
    sampleAnswers: [
      {
        label: 'An Octopus',
        answer:
          "I think I'd pick an octopus. They're incredibly clever, they can change colour and solve puzzles, and yet their brains are organised so differently from ours. I'd love to know what the world feels like to them. Would it be anything like human thought, or completely alien? Choosing my own pet would be sweet, but I suspect I already know what a cat is thinking: mostly about food.",
      },
    ],
    usefulPhrases: [
      "I think I'd pick ...",
      'incredibly clever',
      'organised so differently from ours',
      "I'd love to know what ... feels like",
      'I suspect I already know ...',
    ],
  },
  {
    id: 'sp-438',
    topic: 'Animals & Pets',
    difficulty: 'hard',
    question: 'Is it right to keep wild or exotic animals as pets?',
    sampleAnswers: [
      {
        label: 'Generally Not',
        answer:
          "Generally, I don't think it is. Animals like parrots, snakes, or monkeys have very specific needs that are really hard to meet in an ordinary home. Many of them end up stressed or bored, and some are abandoned when they get too big or difficult. Of course, there are owners who are genuinely experts and care for them well. But for most people, admiring these animals in the wild is the more responsible choice.",
      },
    ],
    usefulPhrases: [
      "generally, I don't think ...",
      'very specific needs',
      'hard to meet',
      'end up stressed',
      'the more responsible choice',
    ],
  },

  // ── Celebrations & Holidays ───────────────────────────
  {
    id: 'sp-158',
    topic: 'Celebrations & Holidays',
    difficulty: 'easy',
    question: 'How do you usually celebrate your birthday?',
    sampleAnswers: [
      {
        label: 'Small and Simple',
        answer:
          "I keep it small. Usually I have dinner with my family on the day, and my mother insists on making a cake even though I tell her not to. Then at the weekend I'll go out with a few close friends — maybe hotpot and karaoke. I don't really like big parties where I'm the centre of attention. A good meal with people I love is all I need.",
      },
    ],
    usefulPhrases: [
      'I keep it small.',
      'insists on...',
      "I don't really like...",
      '... is all I need',
    ],
  },
  {
    id: 'sp-159',
    topic: 'Celebrations & Holidays',
    difficulty: 'easy',
    question: "What's your favourite holiday of the year?",
    sampleAnswers: [
      {
        label: 'New Year',
        answer:
          "New Year, without a doubt. The whole country slows down, and everyone goes home to their families. The week before is busy — cleaning the house, buying flowers, cooking special food — but that's part of the fun. On the first day we visit relatives, and kids get red envelopes with lucky money. It's the only time of year I see all my cousins in one place.",
      },
    ],
    usefulPhrases: [
      'without a doubt',
      'The whole country slows down',
      "that's part of the fun",
      "It's the only time of year...",
    ],
  },
  {
    id: 'sp-160',
    topic: 'Celebrations & Holidays',
    difficulty: 'medium',
    question: 'Describe a wedding or big celebration you went to.',
    sampleAnswers: [
      {
        label: 'A Countryside Wedding',
        answer:
          "Last year I went to my cousin's wedding in the countryside. It was very different from city weddings — instead of a hotel, the whole village set up tents in the garden, and the cooking started the day before. There must have been three hundred guests. The food just kept coming, the uncles kept toasting, and the karaoke went on until midnight. It was loud and chaotic, but everyone was so happy that it felt really special.",
      },
    ],
    usefulPhrases: [
      'It was very different from...',
      'There must have been...',
      'The food just kept coming',
      'It was loud and chaotic, but...',
    ],
  },
  {
    id: 'sp-161',
    topic: 'Celebrations & Holidays',
    difficulty: 'medium',
    question: 'Do you prefer celebrating with a big group or a few close people?',
    sampleAnswers: [
      {
        label: 'Small Group',
        answer:
          "A few close people, definitely. With a big group I spend the whole time moving between conversations and never really talk to anyone. With four or five friends, we can actually catch up, tell stories, and laugh until late. That said, I enjoy big celebrations like weddings once in a while — the energy is fun. But for my own events, I'd choose small every time.",
      },
    ],
    usefulPhrases: [
      'A few close people, definitely.',
      'I spend the whole time...',
      'once in a while',
      "I'd choose... every time",
    ],
  },
  {
    id: 'sp-162',
    topic: 'Celebrations & Holidays',
    difficulty: 'hard',
    question: 'Are traditional holidays losing their meaning?',
    sampleAnswers: [
      {
        label: 'Changing, Not Disappearing',
        answer:
          "I think they're changing rather than losing their meaning. My grandparents spent weeks preparing for New Year; now many families buy ready-made food and some even travel abroad over the holiday. Older people see that as a loss, and I understand why. But the heart of it — coming together as a family — is still there. Traditions have always changed over time. The danger is only when we stop remembering why we celebrate at all.",
      },
    ],
    usefulPhrases: [
      "I think they're changing rather than...",
      'I understand why',
      'the heart of it is still there',
      'The danger is only when...',
    ],
  },
  {
    id: 'sp-253',
    topic: 'Celebrations & Holidays',
    difficulty: 'medium',
    question: 'What is the best gift you have ever received?',
    sampleAnswers: [
      {
        label: 'A Handwritten Book',
        answer:
          "A small notebook my friends made for my birthday. Each of them wrote a page — memories, jokes, things they liked about me — and added old photos. It probably cost almost nothing, but it's the thing I'd save first in a fire. It taught me that the best gifts show you how much someone pays attention.",
      },
    ],
    usefulPhrases: [
      'It probably cost almost nothing, but...',
      "the thing I'd save first",
      'It taught me that...',
      'pays attention',
    ],
  },
  {
    id: 'sp-439',
    topic: 'Celebrations & Holidays',
    difficulty: 'easy',
    question: 'What food do you usually eat at celebrations?',
    sampleAnswers: [
      {
        label: 'A Big Shared Meal',
        answer:
          "We usually have a big shared meal with lots of different dishes on the table. Everyone brings something, so there's always way too much food. My favourite part is dessert, especially homemade cake. There's always one relative who makes the same dish every year, and if they forgot, everyone would be disappointed! The leftovers usually last us for days afterwards.",
      },
      {
        label: 'Short & Simple',
        answer:
          'We have a big meal with lots of dishes. My favourite part is the cake.',
      },
    ],
    usefulPhrases: [
      "there's always way too much food",
      'my favourite part is ...',
      'the same dish every year',
      'everyone would be disappointed',
      'last us for days',
    ],
  },
  {
    id: 'sp-440',
    topic: 'Celebrations & Holidays',
    difficulty: 'easy',
    question: 'Do you enjoy giving presents?',
    sampleAnswers: [
      {
        label: 'More Than Receiving',
        answer:
          "Honestly, I enjoy giving presents more than getting them. I love the moment someone opens a gift and you can see they really like it. I try to choose something personal, even if it's small, like a book I think they'll enjoy or something homemade. The hardest part is buying for people who already have everything. For them, I usually go for an experience, like a nice dinner.",
      },
    ],
    usefulPhrases: [
      'more than getting them',
      'something personal',
      "even if it's small",
      'people who already have everything',
      'I usually go for ...',
    ],
  },
  {
    id: 'sp-441',
    topic: 'Celebrations & Holidays',
    difficulty: 'easy',
    question: 'Do you decorate your home for special occasions?',
    sampleAnswers: [
      {
        label: 'Lights and Flowers',
        answer:
          "Yes, a little bit. I'm not someone who covers the whole house in decorations, but I like putting up some lights in winter and buying fresh flowers for special days. It makes the place feel cosy and festive straight away. When I was a kid, decorating with my family was one of my favourite traditions, so I guess I'm keeping a small part of that alive.",
      },
    ],
    usefulPhrases: [
      "I'm not someone who ...",
      'putting up some lights',
      'feel cosy and festive',
      'one of my favourite traditions',
      'keeping a small part of that alive',
    ],
  },
  {
    id: 'sp-442',
    topic: 'Celebrations & Holidays',
    difficulty: 'medium',
    question: 'Tell me about a surprise you planned or received for a celebration.',
    sampleAnswers: [
      {
        label: 'The Surprise Party',
        answer:
          "For my best friend's thirtieth, a group of us organised a surprise party. We told her we were just going for a quiet dinner, but when she walked into the restaurant, about twenty people jumped out and shouted. She was so shocked she actually burst into tears. Keeping it secret for a whole month was really difficult, and I nearly gave it away twice! But seeing her face made it completely worth it.",
      },
    ],
    usefulPhrases: [
      'organised a surprise party',
      'burst into tears',
      'keeping it secret',
      'I nearly gave it away',
      'made it completely worth it',
    ],
  },
  {
    id: 'sp-443',
    topic: 'Celebrations & Holidays',
    difficulty: 'medium',
    question: 'How is the way you celebrate holidays now different from when you were a child?',
    sampleAnswers: [
      {
        label: 'Less Magic, More Meaning',
        answer:
          "When I was a child, holidays were all about presents, sweets, and staying up late. Everything felt magical. Now I'm older, I'm more involved in the cooking and organising, so it's a bit more tiring! But I appreciate different things. I care more about having everyone together, especially older relatives, because I know those moments won't last forever. So it's less magical, maybe, but more meaningful.",
      },
    ],
    usefulPhrases: [
      'were all about ...',
      'everything felt magical',
      'more involved in ...',
      "won't last forever",
      'less ..., but more ...',
    ],
  },
  {
    id: 'sp-444',
    topic: 'Celebrations & Holidays',
    difficulty: 'medium',
    question: "Do you make New Year's resolutions? Why or why not?",
    sampleAnswers: [
      {
        label: 'Small Ones Only',
        answer:
          "I used to make big ones, like 'get fit' or 'read fifty books', and I always gave up by February. So now I keep them small and specific, like drinking more water or calling my grandmother every Sunday. Those are much easier to stick to. I still like the idea of a fresh start, though. There's something motivating about a new year, even if it's just a date on the calendar.",
      },
    ],
    usefulPhrases: [
      'I always gave up by ...',
      'small and specific',
      'much easier to stick to',
      'the idea of a fresh start',
      "even if it's just ...",
    ],
  },
  {
    id: 'sp-445',
    topic: 'Celebrations & Holidays',
    difficulty: 'medium',
    question: "Tell me about a celebration that didn't go to plan.",
    sampleAnswers: [
      {
        label: 'The Rained-Out Picnic',
        answer:
          "Last year we planned a big birthday picnic for my sister in the park. We'd prepared everything: food, games, balloons. Then, just as everyone arrived, it started pouring with rain. We all squeezed into my small flat, soaking wet, with food everywhere. It was chaos, but honestly it turned out to be one of the funniest days we've had. Everyone still talks about it, much more than any perfect party.",
      },
    ],
    usefulPhrases: [
      "we'd prepared everything",
      'it started pouring with rain',
      'it was chaos',
      'it turned out to be ...',
      'everyone still talks about it',
    ],
  },
  {
    id: 'sp-446',
    topic: 'Celebrations & Holidays',
    difficulty: 'hard',
    question: 'Are big, expensive celebrations worth the money?',
    sampleAnswers: [
      {
        label: 'Not Usually',
        answer:
          "In most cases, I'd say no. People often feel pressure to spend a fortune on weddings or parties because of what others expect, and then they're paying for it for years. What guests remember isn't the expensive decorations; it's whether they felt welcome and had fun. That said, if someone can easily afford it and it brings them real joy, I don't think it's my place to judge.",
      },
    ],
    usefulPhrases: [
      "in most cases, I'd say ...",
      'feel pressure to ...',
      'spend a fortune on ...',
      'what guests remember is ...',
      "it's not my place to judge",
    ],
  },
  {
    id: 'sp-447',
    topic: 'Celebrations & Holidays',
    difficulty: 'hard',
    question: 'If you could create a new public holiday, what would it celebrate?',
    sampleAnswers: [
      {
        label: 'A Day for Neighbours',
        answer:
          "I'd create a day to celebrate neighbours. Everyone would be encouraged to share food on the street, help an elderly neighbour, or just introduce themselves to the people next door. So many of us live just metres away from people we've never spoken to. A holiday like that could build a real sense of community. And unlike some holidays, it wouldn't need to cost anything at all.",
      },
    ],
    usefulPhrases: [
      "I'd create a day to celebrate ...",
      'would be encouraged to ...',
      "people we've never spoken to",
      'a real sense of community',
      "it wouldn't need to cost anything",
    ],
  },
  {
    id: 'sp-448',
    topic: 'Celebrations & Holidays',
    difficulty: 'hard',
    question: 'Why do you think humans need celebrations and rituals at all?',
    sampleAnswers: [
      {
        label: 'Marking Time',
        answer:
          "I think celebrations help us mark time and make sense of our lives. Without them, every year would just blur into the next. Birthdays, weddings, and festivals give us moments to stop, look back, and feel connected to the people around us. Rituals also give comfort, because they're familiar and repeated. Even during hard times, lighting a candle or sharing a meal can remind people that they belong somewhere.",
      },
    ],
    usefulPhrases: [
      'mark time',
      'make sense of our lives',
      'blur into the next',
      'feel connected to ...',
      'remind people that they belong',
    ],
  },

  // ── Art & Creativity ──────────────────────────────────
  {
    id: 'sp-223',
    topic: 'Art & Creativity',
    difficulty: 'easy',
    question: 'Do you like drawing or painting?',
    sampleAnswers: [
      {
        label: 'Just for Fun',
        answer:
          "I'm not very good, but I enjoy it. I sometimes doodle in a small notebook while I'm on the bus or waiting for someone — mostly faces and buildings. It's relaxing because nobody's judging it. I've thought about taking a watercolour class one day, just to learn the basics properly.",
      },
      {
        label: 'Short & Simple',
        answer:
          "A little. I doodle when I'm waiting for something, just for fun.",
      },
    ],
    usefulPhrases: [
      "I'm not very good, but I enjoy it.",
      "nobody's judging it",
      "I've thought about...",
      'learn the basics properly',
    ],
  },
  {
    id: 'sp-224',
    topic: 'Art & Creativity',
    difficulty: 'easy',
    question: 'Have you ever been to an art gallery or museum you loved?',
    sampleAnswers: [
      {
        label: 'A Small Museum',
        answer:
          "Yes, a small history museum in an old house. It wasn't famous, but each room was set up like a real home from a hundred years ago, with old photos, kitchen tools, and letters. It felt like stepping back in time. I spent three hours there and I'd planned to spend one.",
      },
    ],
    usefulPhrases: [
      "It wasn't famous, but...",
      'It felt like stepping back in time.',
      "I'd planned to spend one",
      'set up like...',
    ],
  },
  {
    id: 'sp-225',
    topic: 'Art & Creativity',
    difficulty: 'medium',
    question: 'Do you think everyone is creative in some way?',
    sampleAnswers: [
      {
        label: 'Yes, Just Differently',
        answer:
          "Yes, I really do. People often say 'I'm not creative' because they can't draw or play an instrument. But creativity is also cooking without a recipe, solving a problem in a new way, decorating your room, or telling a funny story. I think most people just haven't found their own kind of creativity yet, or they stopped trying because someone criticised them as a child.",
      },
    ],
    usefulPhrases: [
      'Yes, I really do.',
      'People often say... because...',
      'creativity is also...',
      "haven't found their own kind of... yet",
    ],
  },
  {
    id: 'sp-226',
    topic: 'Art & Creativity',
    difficulty: 'medium',
    question: 'Would you rather make something with your hands or create something digital?',
    sampleAnswers: [
      {
        label: 'With My Hands',
        answer:
          "With my hands, I think. There's something satisfying about holding a finished thing — a cake, a piece of pottery, a painted wall. You can touch it and show it to people. Digital things can be amazing too, but I spend enough time looking at screens. Making something physical feels more like a break.",
      },
    ],
    usefulPhrases: [
      "There's something satisfying about...",
      'show it to people',
      'I spend enough time...',
      'feels more like a break',
    ],
  },
  {
    id: 'sp-227',
    topic: 'Art & Creativity',
    difficulty: 'hard',
    question: 'Should governments spend money on art?',
    sampleAnswers: [
      {
        label: 'Yes, In Moderation',
        answer:
          "I think so, yes, though not before basics like health and education. Art is part of what makes a society worth living in — it records our history, helps us understand each other, and brings people together. Without public money, only art that sells well would survive, and a lot of important work isn't commercial. So I'd support funding for public museums, local theatres, and art in schools.",
      },
    ],
    usefulPhrases: [
      'though not before...',
      'is part of what makes...',
      'Without..., only... would survive',
      "I'd support...",
    ],
  },
  {
    id: 'sp-449',
    topic: 'Art & Creativity',
    difficulty: 'easy',
    question: 'Do you have any art or pictures on your walls at home?',
    sampleAnswers: [
      {
        label: 'A Few Favourites',
        answer:
          "Yes, I've got a few. There's a big print of a seaside painting in the living room, and some framed photos from trips in the hallway. My favourite, though, is a little watercolour a friend painted for me. It's not perfect, but it means a lot more than anything I could buy. I think walls without pictures feel a bit cold, so I like adding things over time.",
      },
    ],
    usefulPhrases: [
      "I've got a few",
      'my favourite, though, is ...',
      'means a lot more than ...',
      'feel a bit cold',
      'adding things over time',
    ],
  },
  {
    id: 'sp-450',
    topic: 'Art & Creativity',
    difficulty: 'easy',
    question: 'Have you ever tried a craft like knitting, pottery or sewing?',
    sampleAnswers: [
      {
        label: 'A Pottery Class',
        answer:
          "Yes, I tried a pottery class once with a friend. It was much harder than it looks! My first bowl collapsed completely, and everyone laughed, including me. By the end of the course, though, I'd made a slightly wonky mug that I still use every morning. It was really satisfying to make something useful with my own hands, and very relaxing too.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Yes, I did a pottery class. It was hard, but I made a mug I still use.',
      },
    ],
    usefulPhrases: [
      'much harder than it looks',
      'collapsed completely',
      'slightly wonky',
      'with my own hands',
      'really satisfying',
    ],
  },
  {
    id: 'sp-451',
    topic: 'Art & Creativity',
    difficulty: 'easy',
    question: "What's your favourite colour, and do you use it a lot?",
    sampleAnswers: [
      {
        label: 'Deep Green',
        answer:
          "My favourite colour is a deep, dark green, like a forest. I find it really calming. I don't wear it that often, funnily enough, but you can see it all over my home: cushions, plants, even my kitchen cups. I think colours really affect your mood, so I like surrounding myself with ones that make me feel peaceful rather than bright, loud ones.",
      },
    ],
    usefulPhrases: [
      'I find it really calming',
      "I don't ... that often, funnily enough",
      'you can see it all over ...',
      'colours really affect your mood',
      'surrounding myself with ...',
    ],
  },
  {
    id: 'sp-452',
    topic: 'Art & Creativity',
    difficulty: 'medium',
    question: 'Tell me about something creative you made that you were proud of.',
    sampleAnswers: [
      {
        label: 'A Handmade Photo Album',
        answer:
          "For my parents' anniversary, I made them a photo album by hand. I collected old photos from relatives, wrote little stories under each one, and decorated the pages with drawings. It took me about two months of evenings. When they opened it, my mum went very quiet and then started laughing and crying at the same time. It's definitely the thing I've made that I'm proudest of.",
      },
    ],
    usefulPhrases: [
      'made ... by hand',
      'it took me about ...',
      'went very quiet',
      'laughing and crying at the same time',
      "the thing I'm proudest of",
    ],
  },
  {
    id: 'sp-453',
    topic: 'Art & Creativity',
    difficulty: 'medium',
    question: 'Why do you think many adults stop drawing, even though they loved it as children?',
    sampleAnswers: [
      {
        label: 'Fear of Being Bad',
        answer:
          "I think somewhere around the age of ten or eleven, we start comparing ourselves to others. Kids draw purple horses and are totally happy with them, but then someone tells you your drawing doesn't look real, and you decide you're 'not good at art'. After that, it's easier to just stop. It's a real shame, because drawing was never meant to be about being good. It was about having fun.",
      },
    ],
    usefulPhrases: [
      'somewhere around the age of ...',
      'comparing ourselves to others',
      "decide you're not good at ...",
      "it's a real shame",
      'never meant to be about ...',
    ],
  },
  {
    id: 'sp-454',
    topic: 'Art & Creativity',
    difficulty: 'medium',
    question: 'Do you prefer realistic art or abstract art? Why?',
    sampleAnswers: [
      {
        label: 'Realistic, Mostly',
        answer:
          "I usually prefer realistic art, I have to admit. I'm amazed when someone can paint a face or a landscape that looks almost like a photo. With abstract art, I sometimes feel like I'm missing the point. That said, I once saw a huge abstract painting that was just layers of blue, and I stood in front of it for ages. It made me feel calm in a way I can't explain.",
      },
    ],
    usefulPhrases: [
      'I have to admit',
      'looks almost like a photo',
      "I'm missing the point",
      'I stood in front of it for ages',
      "in a way I can't explain",
    ],
  },
  {
    id: 'sp-455',
    topic: 'Art & Creativity',
    difficulty: 'medium',
    question: 'Is graffiti real art, or is it just vandalism?',
    sampleAnswers: [
      {
        label: 'It Depends on Permission',
        answer:
          "For me, it depends on whether there's permission. Some street art is absolutely beautiful and makes a grey neighbourhood feel alive. I've seen huge murals that are as impressive as anything in a gallery. But if someone sprays their name on a family's front door, that's just damaging someone else's property. So the skill can be real art, but where and how it's done really matters.",
      },
    ],
    usefulPhrases: [
      'it depends on whether ...',
      'absolutely beautiful',
      'feel alive',
      'as impressive as anything in ...',
      "where and how it's done really matters",
    ],
  },
  {
    id: 'sp-456',
    topic: 'Art & Creativity',
    difficulty: 'hard',
    question: 'Does art need to be beautiful to be good?',
    sampleAnswers: [
      {
        label: 'Not Necessarily',
        answer:
          "Not necessarily, no. Some of the most powerful paintings and films I've seen are actually quite disturbing or uncomfortable to look at. Their goal isn't to be pretty; it's to make you feel something or think about something you'd normally avoid. I'd say good art is honest and has an effect on you. Beauty is one way to do that, but it's definitely not the only one.",
      },
    ],
    usefulPhrases: [
      'not necessarily, no',
      'uncomfortable to look at',
      "their goal isn't to ...; it's to ...",
      "something you'd normally avoid",
      "it's definitely not the only one",
    ],
  },
  {
    id: 'sp-457',
    topic: 'Art & Creativity',
    difficulty: 'hard',
    question: 'If you could instantly master any art form, which would you choose?',
    sampleAnswers: [
      {
        label: 'Playing the Piano',
        answer:
          "I'd choose playing the piano. I've always envied people who can sit down at a piano at a party and just play anything. It seems like such a generous skill, because it brings joy to everyone in the room, not just you. I'd also love to be able to express feelings through music when I can't find the right words. Learning it properly would take years, so instantly would be a dream.",
      },
    ],
    usefulPhrases: [
      "I've always envied people who ...",
      'such a generous skill',
      'brings joy to everyone in the room',
      "when I can't find the right words",
      'would take years',
    ],
  },
  {
    id: 'sp-458',
    topic: 'Art & Creativity',
    difficulty: 'hard',
    question: "Can creativity be taught, or is it something you're born with?",
    sampleAnswers: [
      {
        label: 'Mostly Learned',
        answer:
          "I believe it can be taught, at least to a large extent. Some people might have a natural spark, but creativity is mostly a habit: noticing things, asking 'what if', and being willing to make mistakes. Those are all things you can practise. What kills creativity, I think, is the fear of looking silly. If a teacher creates a safe space to experiment, almost anyone can surprise themselves.",
      },
    ],
    usefulPhrases: [
      'to a large extent',
      'a natural spark',
      'being willing to make mistakes',
      'the fear of looking silly',
      'surprise themselves',
    ],
  },

  // ── Hometown & Travel ─────────────────────────────────
  {
    id: 'sp-10',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: 'Tell me about your hometown.',
    sampleAnswers: [
      {
        label: 'A Medium-Sized Town',
        answer:
          "I grew up in a medium-sized town by a river. It's not famous, but it has a really relaxed feel — people walk everywhere, and everyone seems to know the owner of their favourite noodle shop. The best thing about it is the food; it's simple and cheap but amazing. It's changed a lot in recent years, with more cafes and new buildings, but the old market in the centre is still exactly the same as when I was a kid.",
      },
      {
        label: 'Short & Simple',
        answer:
          'My hometown is a quiet town by a river. The food is great and the people are friendly.',
      },
    ],
    usefulPhrases: [
      'I grew up in...',
      'It has a really relaxed feel.',
      'The best thing about it is...',
      'is still exactly the same as...',
    ],
  },
  {
    id: 'sp-11',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: "What's a place in your country you'd recommend visiting?",
    sampleAnswers: [
      {
        label: 'Somewhere Off the Main Route',
        answer:
          "I'd recommend going somewhere a bit away from the big cities — a small coastal or mountain town. The big cities are exciting, but they're crowded and everything is aimed at tourists. In a smaller place you can eat where the locals eat, walk around without a plan, and actually talk to people. My advice is to spend at least two nights, so you can see the place early in the morning before the day-trippers arrive.",
      },
      {
        label: 'Short & Simple',
        answer:
          "Go to a small town, not just the big cities. It's quieter, cheaper, and more authentic.",
      },
    ],
    usefulPhrases: [
      "I'd recommend...",
      'a bit away from...',
      'everything is aimed at tourists',
      'My advice is to...',
    ],
  },
  {
    id: 'sp-12',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'Have you traveled abroad? Where would you like to go?',
    sampleAnswers: [
      {
        label: 'Aspiring Traveler',
        answer:
          "I haven't traveled abroad much yet, but I'd really love to visit Japan. I'm a big fan of the food, the old temples, and the attention to detail in everything. I'd like to go in spring to see the cherry blossoms. After that, maybe somewhere completely different, like New Zealand, for the mountains and lakes. I think travelling somewhere that's nothing like home teaches you a lot about yourself.",
      },
    ],
    usefulPhrases: [
      "I haven't traveled abroad much yet, but...",
      "I'm a big fan of...",
      "I'd really love to visit...",
      'teaches you a lot about yourself',
    ],
  },
  {
    id: 'sp-34',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'How has your town or city changed over the years?',
    sampleAnswers: [
      {
        label: 'Growing Fast',
        answer:
          "It's changed dramatically. When I was a child it was quite quiet — a few main roads, small shops, and fields not far from the centre. Now there are new buildings everywhere, lots of cafes and restaurants, and much more traffic. Life is more convenient, and there are more jobs and things to do. But sometimes I miss how quiet it used to be, when you could ride your bike in the middle of the road and see almost nobody.",
      },
    ],
    usefulPhrases: [
      'has changed dramatically',
      'It used to be...',
      'much more...',
      'Sometimes I miss how...',
    ],
  },
  {
    id: 'sp-35',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: "What's the best time of year to visit your city?",
    sampleAnswers: [
      {
        label: 'Spring',
        answer:
          "I'd say spring. The weather is warm but not too hot, there's not much rain, and the trees are green again. It's also before the summer holidays, so it's not too crowded or expensive. In summer it can get uncomfortably hot, and in the rainy season some days you can't really go out at all. So if a friend asked me, I'd definitely tell them to come in March or April.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Spring — warm, not too hot, and not too crowded.',
      },
    ],
    usefulPhrases: [
      "I'd say...",
      'warm but not too hot',
      'it can get uncomfortably...',
      "I'd definitely tell them to...",
    ],
  },
  {
    id: 'sp-36',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'Do you prefer traveling alone or with others?',
    sampleAnswers: [
      {
        label: 'It Depends',
        answer:
          "It depends on the trip. For a beach holiday or a city break, I prefer going with friends — it's more fun to share meals and laugh about things that go wrong. But I've done a couple of trips alone and they were amazing in a different way. You talk to more strangers, you can change your plans whenever you want, and you notice more. So ideally I'd do both: most trips with people I love, and one trip alone every few years.",
      },
    ],
    usefulPhrases: [
      'It depends on the trip.',
      "it's more fun to...",
      'amazing in a different way',
      "ideally I'd do both",
    ],
  },
  {
    id: 'sp-70',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: 'Do you prefer living in a city or the countryside? Why?',
    sampleAnswers: [
      {
        label: 'City Person',
        answer:
          "I'm definitely a city person. I love the convenience — everything is close, whether it's restaurants, shops, or hospitals. Cities also keep you curious; you're always meeting different people and seeing new things. The countryside is beautiful to visit, and I love a weekend away in the fresh air, but I think I'd find it too quiet and isolated to live there long-term.",
      },
    ],
    usefulPhrases: [
      "I'm definitely a... person",
      'everything is close',
      'keep you curious',
      "I'd find it too... long-term",
    ],
  },
  {
    id: 'sp-97',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'If a friend visited your city for two days, what would you show them?',
    sampleAnswers: [
      {
        label: 'Two Days Like a Local',
        answer:
          "On the first day I'd skip the famous sights in the morning and take them to a local market for breakfast — that's where you really feel a city. Then a walk through the old part of town and a long lunch. In the evening, somewhere with a view for the sunset. On the second day I'd take them out of the city to the nearest nature spot, a beach or a hill, and finish with dinner at my favourite street food place. Less sightseeing, more eating and walking.",
      },
    ],
    usefulPhrases: [
      "I'd skip... and...",
      "that's where you really feel a city",
      'somewhere with a view',
      'Less..., more...',
    ],
  },
  {
    id: 'sp-106',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: "What's the most memorable trip you've ever taken?",
    sampleAnswers: [
      {
        label: 'Unplanned Detour',
        answer:
          "The one that sticks with me wasn't even the destination I planned for. I was heading somewhere else and got stuck overnight in a small town because of a delayed bus, and it ended up being one of the best nights of that whole trip — I met people at a tiny restaurant and we just talked for hours. It taught me that the trips I remember most aren't usually the ones that go exactly to plan, they're the ones with a good story attached.",
      },
    ],
    usefulPhrases: [
      'the one that sticks with me',
      "wasn't even the destination I planned for",
      'ended up being...',
      'it taught me that...',
      'a good story attached',
    ],
  },
  {
    id: 'sp-107',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'Do you prefer planning a trip in detail or traveling spontaneously?',
    sampleAnswers: [
      {
        label: 'A Bit of Both',
        answer:
          "I like having the big things sorted — flights, where I'm sleeping the first couple of nights — but I leave the rest open. Whenever I've planned every single day in advance, I end up rushing between things just to keep to the schedule, and I miss whatever's actually happening around me. But zero planning stresses me out too, especially arriving somewhere late at night with nowhere booked. So I've settled on planning the bones of a trip and leaving the middle completely loose.",
      },
    ],
    usefulPhrases: [
      'I like having the big things sorted',
      'I leave the rest open',
      'I end up rushing between things',
      'stresses me out',
      "I've settled on...",
    ],
  },
  {
    id: 'sp-108',
    topic: 'Hometown & Travel',
    difficulty: 'hard',
    question: 'If you could live in any city in the world for a year, where would you choose?',
    sampleAnswers: [
      {
        label: 'Weighing the Trade-off',
        answer:
          "I go back and forth on this, but I think I'd pick somewhere in Japan, maybe Kyoto — I like the idea of a place that's calm but still has real culture and history around every corner. Part of me knows I'd probably miss the beach and the weather I'm used to within a couple of months, but that's kind of the point of doing it for a year and not forever. It would be uncomfortable in a good way — not knowing the language properly, having to figure out the basics again.",
      },
    ],
    usefulPhrases: [
      'I go back and forth on this',
      'I like the idea of a place that\'s...',
      'part of me knows I\'d probably...',
      "that's kind of the point",
      'uncomfortable in a good way',
    ],
  },
  {
    id: 'sp-120',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: "What's something about your hometown that surprises visitors?",
    sampleAnswers: [
      {
        label: 'Not What They Expected',
        answer:
          "People usually expect it to feel small and sleepy, and then they're surprised by how much is actually going on — good restaurants, a decent nightlife, new buildings going up constantly. The other thing that surprises people is how close everything is. Someone visiting can go from the beach to the mountains to the old town in under an hour, which isn't something you can say about most cities their size. I think the reputation lags a bit behind what the place has actually become.",
      },
    ],
    usefulPhrases: [
      'people usually expect it to...',
      "they're surprised by how much...",
      'the other thing that surprises people is...',
      "isn't something you can say about most...",
      'the reputation lags a bit behind...',
    ],
  },
  {
    id: 'sp-121',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'Have you ever gotten lost somewhere? What happened?',
    sampleAnswers: [
      {
        label: 'Lost, Then Fine',
        answer:
          "Once, in a city where I didn't speak a word of the language, my phone died right as I was trying to find my way back to where I was staying. I ended up just walking in what I hoped was the right direction and pointing at a photo of the building to a few different strangers until someone understood. It was stressful for about twenty minutes and then it became one of my favorite memories of the trip, mostly because of how kind the strangers were about it.",
      },
    ],
    usefulPhrases: [
      "I didn't speak a word of...",
      'right as I was trying to...',
      'I ended up just...',
      'stressful for about... and then it became...',
      'one of my favorite memories of the trip',
    ],
  },
  {
    id: 'sp-185',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: 'What do you always pack when you travel?',
    sampleAnswers: [
      {
        label: 'The Essentials',
        answer:
          "A light jacket, even if I'm going somewhere hot, because buses and planes are always freezing. A small first-aid kit, a reusable water bottle, and a book — a real paper one, because it doesn't need charging. I've learned to pack less over the years. Now I bring half the clothes I think I need, and it's always enough.",
      },
    ],
    usefulPhrases: [
      'I always pack...',
      'are always freezing',
      "I've learned to pack less",
      "it's always enough",
    ],
  },
  {
    id: 'sp-186',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: "What's the most beautiful place you've ever seen?",
    sampleAnswers: [
      {
        label: 'A Mountain Lake',
        answer:
          "A lake high up in the mountains that I visited a few years ago. We hiked for about four hours, and just as we arrived, the clouds cleared and the whole lake turned bright blue, with the peaks reflected perfectly in the water. Nobody spoke for about a minute. I've seen photos of it since, but none of them come close to how it felt to be there.",
      },
    ],
    usefulPhrases: [
      'just as we arrived...',
      'Nobody spoke for about a minute.',
      "I've seen photos of it since, but...",
      'none of them come close to...',
    ],
  },
  {
    id: 'sp-187',
    topic: 'Hometown & Travel',
    difficulty: 'hard',
    question: 'Does tourism do more good or harm to a place?',
    sampleAnswers: [
      {
        label: 'Both, Depending on Scale',
        answer:
          'It does both, and the difference is mostly about scale and control. Tourism brings jobs, keeps local crafts alive, and pays for old buildings to be protected. But when too many visitors arrive, rents go up, locals get pushed out, and the place starts to exist only for tourists. I think the best destinations limit numbers or spread visitors across the year. As a traveller, I try to stay in local guesthouses and eat at family-run places, so my money stays in the community.',
      },
    ],
    usefulPhrases: [
      'It does both, and the difference is...',
      'keeps... alive',
      'get pushed out',
      'so my money stays in the community',
    ],
  },
  {
    id: 'sp-459',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: "What's your favourite place to eat in your hometown?",
    sampleAnswers: [
      {
        label: 'A Little Noodle Shop',
        answer:
          "Honestly, it's a tiny noodle shop on the corner near my old school. It's nothing fancy — plastic stools, a few tables, and a really loud fan — but the soup is amazing. The owner has been cooking the same recipe for about twenty years, and she still remembers how I like it. Whenever I go back home, it's the first place I visit. It just tastes like my childhood.",
      },
      {
        label: 'Short & Simple',
        answer:
          "My favourite is a small noodle shop near my old school. It's cheap, simple, and delicious.",
      },
    ],
    usefulPhrases: [
      'nothing fancy',
      "it's the first place I visit",
      'has been ... for about twenty years',
      'it just tastes like my childhood',
      'whenever I go back home',
    ],
  },
  {
    id: 'sp-460',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: 'What do people in your hometown usually do at the weekend?',
    sampleAnswers: [
      {
        label: 'Markets and Family Meals',
        answer:
          "Most people take it pretty easy. On Saturday mornings, the local market gets really busy, so lots of families go shopping together and grab breakfast there. In the afternoon, you'll see kids playing in the park and older people chatting in front of their houses. Sunday is usually for family — a big lunch at someone's place that goes on for hours. It's slow, but I like that rhythm.",
      },
    ],
    usefulPhrases: [
      'take it pretty easy',
      'gets really busy',
      'grab breakfast',
      'goes on for hours',
      'I like that rhythm',
    ],
  },
  {
    id: 'sp-461',
    topic: 'Hometown & Travel',
    difficulty: 'easy',
    question: 'Is there a quiet spot in your hometown that you like to go to?',
    sampleAnswers: [
      {
        label: 'A Bench by the River',
        answer:
          "Yes, there's a bench by the river, just behind the old temple. Not many people know about it, so it's usually peaceful. I like going there in the late afternoon when the sun is going down and the water turns orange. I'll just sit, listen to the birds, and clear my head for a while. It's my little escape whenever things feel busy.",
      },
    ],
    usefulPhrases: [
      'not many people know about it',
      'when the sun is going down',
      'clear my head',
      'for a while',
      'my little escape',
    ],
  },
  {
    id: 'sp-462',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'Would you like to live in your hometown for the rest of your life? Why or why not?',
    sampleAnswers: [
      {
        label: 'Maybe Later, Not Yet',
        answer:
          "Hmm, not right now, to be honest. I love my hometown, but it's quite small, and I feel like there's a lot of the world I haven't seen yet. I'd like to live somewhere different for a few years and see how other people live. That said, I can definitely imagine moving back when I'm older. It's calm, my family is there, and life feels a lot less rushed.",
      },
    ],
    usefulPhrases: [
      'to be honest',
      "there's a lot of the world I haven't seen yet",
      'that said',
      'I can definitely imagine ...',
      'life feels a lot less rushed',
    ],
  },
  {
    id: 'sp-463',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: "Tell me about a trip that didn't go as planned.",
    sampleAnswers: [
      {
        label: 'The Rainy Beach Weekend',
        answer:
          "A couple of years ago, some friends and I booked a beach weekend. We'd been looking forward to it for months. Then, on the first morning, a storm rolled in and it rained non-stop for two days. At first we were pretty disappointed, but we ended up playing card games in our guesthouse, cooking together, and laughing way too much. Funnily enough, it's one of my favourite trips now.",
      },
    ],
    usefulPhrases: [
      "we'd been looking forward to it for months",
      'a storm rolled in',
      'it rained non-stop',
      'we ended up ...',
      'funnily enough',
    ],
  },
  {
    id: 'sp-464',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'Do you prefer beach holidays or city breaks? Why?',
    sampleAnswers: [
      {
        label: 'Team City Break',
        answer:
          "I'd say city breaks, mostly because I get bored lying on the sand after about an hour. I love wandering around new streets, trying street food, and popping into little shops and museums. There's always something to discover around the next corner. Having said that, after a really tiring month, a few lazy days by the sea do sound pretty tempting. So it depends on my mood.",
      },
    ],
    usefulPhrases: [
      'I get bored ... after about an hour',
      'wandering around',
      'popping into',
      'around the next corner',
      'it depends on my mood',
    ],
  },
  {
    id: 'sp-465',
    topic: 'Hometown & Travel',
    difficulty: 'medium',
    question: 'Is there a local festival or tradition in your hometown that you really enjoy?',
    sampleAnswers: [
      {
        label: 'The Lantern Night',
        answer:
          "Yeah, every year we have a lantern festival by the river. On that night, the whole town switches off the street lights, and people float paper lanterns on the water. When I was little, my grandmother used to help me write a wish on mine. I still go back for it whenever I can. It's quiet and kind of magical — it really brings everyone together.",
      },
    ],
    usefulPhrases: [
      'every year we have ...',
      'when I was little',
      'used to help me ...',
      'whenever I can',
      'it really brings everyone together',
    ],
  },
  {
    id: 'sp-466',
    topic: 'Hometown & Travel',
    difficulty: 'hard',
    question: 'Do you think travelling really changes people, or is that just a cliché?',
    sampleAnswers: [
      {
        label: 'It Depends How You Travel',
        answer:
          "I think it can change people, but not automatically. If you just stay in a fancy hotel and take photos, you probably come home exactly the same. But if you actually talk to locals, try to understand how they live, and get a bit uncomfortable, it definitely shifts your perspective. For me, travelling made me more patient and less quick to judge. So it's not the plane ticket that changes you — it's how open you are.",
      },
    ],
    usefulPhrases: [
      'not automatically',
      'come home exactly the same',
      'get a bit uncomfortable',
      'it shifts your perspective',
      'less quick to judge',
    ],
  },
  {
    id: 'sp-467',
    topic: 'Hometown & Travel',
    difficulty: 'hard',
    question: 'If you could keep one thing about your hometown from ever changing, what would it be?',
    sampleAnswers: [
      {
        label: 'The Way Neighbours Talk',
        answer:
          "Honestly, it wouldn't be a building or a view. It'd be the way people talk to each other. In my hometown, neighbours still stop to chat, they notice if you've been away, and they bring food over when someone's sick. Buildings can be rebuilt, but that kind of closeness is really hard to get back once it's gone. I'd hate for it to disappear as the town grows.",
      },
    ],
    usefulPhrases: [
      "it wouldn't be ...",
      'stop to chat',
      'bring food over',
      "really hard to get back once it's gone",
      "I'd hate for it to disappear",
    ],
  },
  {
    id: 'sp-468',
    topic: 'Hometown & Travel',
    difficulty: 'hard',
    question: "What does 'home' mean to you — is it a place, or the people?",
    sampleAnswers: [
      {
        label: 'Mostly the People',
        answer:
          "For me, home is mostly about people. I've lived in a few different places, and some of them never really felt like home, even after a year. But whenever I'm with my family or close friends, I feel at home almost instantly, wherever we are. That said, places matter too — certain smells or streets can bring back a feeling of belonging. So I'd say it's people first, and places second.",
      },
    ],
    usefulPhrases: [
      'never really felt like home',
      'I feel at home almost instantly',
      'wherever we are',
      'bring back a feeling of belonging',
      "it's ... first, and ... second",
    ],
  },

  // ── Environment & Nature ──────────────────────────────
  {
    id: 'sp-63',
    topic: 'Environment & Nature',
    difficulty: 'hard',
    question: 'Are you concerned about climate change?',
    sampleAnswers: [
      {
        label: 'Seeing It Up Close',
        answer:
          "Yes, I am. It doesn't feel like a distant problem anymore — summers seem hotter every year, and storms and floods are more serious than when I was a child. What worries me most is that the people who are affected first are often the ones who did least to cause it. I try to do small things, like using less plastic and taking public transport, but I know the big changes have to come from governments and companies.",
      },
    ],
    usefulPhrases: [
      "It doesn't feel like a distant problem anymore.",
      'What worries me most is...',
      'I try to do small things, like...',
      'the big changes have to come from...',
    ],
  },
  {
    id: 'sp-64',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'Do you enjoy spending time in nature?',
    sampleAnswers: [
      {
        label: 'Nature Lover',
        answer:
          "Absolutely. Whenever I need to clear my head, I try to get out of the city — even just to a park or a hill nearby. I love sitting somewhere high and just looking at the view, or walking on a beach early in the morning. There's something about being in nature that resets your brain. It's the best antidote to a busy week.",
      },
    ],
    usefulPhrases: [
      'Whenever I need to clear my head...',
      "There's something about... that...",
      'resets your brain',
      'the best antidote to...',
    ],
  },
  {
    id: 'sp-76',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'What small things do you personally do to help the environment?',
    sampleAnswers: [
      {
        label: 'Practical Habits',
        answer:
          "I try to keep it realistic rather than performative. I use a reusable bottle and coffee cup, I don't buy things I don't need, and I eat less meat than I used to — not zero, but less. I take my motorbike rather than a car, which means my carbon footprint for commuting is quite low. I also try to think about the longevity of the things I buy — choosing a quality item that lasts five years over a cheap one I'll throw away in six months. That said, I'm aware that individual actions are limited. The structural changes need to come from governments and corporations.",
      },
    ],
    usefulPhrases: [
      'I try to keep it realistic rather than performative.',
      "I don't buy things I don't need",
      'think about the longevity of the things I buy',
      'individual actions are limited',
      'The structural changes need to come from...',
    ],
  },
  {
    id: 'sp-91',
    topic: 'Environment & Nature',
    difficulty: 'medium',
    question: 'What do you do in your daily life to reduce your environmental impact?',
    sampleAnswers: [
      {
        label: 'Honest Answer',
        answer:
          "Honestly, less than I'd like to. I carry a reusable bottle and bag, I try to walk or cycle for short trips, and I've cut down on meat a bit. But I still buy too many things in plastic, and I travel by plane more than I should. I think the trick is to stop aiming for perfect and just make a few changes you can actually keep.",
      },
    ],
    usefulPhrases: [
      "less than I'd like to",
      "I've cut down on...",
      'more than I should',
      'stop aiming for perfect',
    ],
  },
  {
    id: 'sp-92',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'How much time do you spend in nature, and how does it affect you?',
    sampleAnswers: [
      {
        label: 'Sea & Mountains',
        answer:
          "Not as much as I'd like — maybe a few hours a week, mostly walking in a park or by the water. But I notice a big difference when I do. After even a short walk among trees I sleep better and feel less anxious. When I go months without a proper trip to the mountains or the sea, I get restless and irritable. So I've started to treat time in nature less like a treat and more like something I need.",
      },
    ],
    usefulPhrases: [
      "Not as much as I'd like",
      'I notice a big difference',
      'I get restless',
      'less like a treat and more like...',
    ],
  },
  {
    id: 'sp-127',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'What is your favorite season, and why?',
    sampleAnswers: [
      {
        label: 'A Seasonal Preference',
        answer:
          "I'd say the stretch right before the rainy season starts, when it's still warm but the air hasn't gotten heavy yet. There's a particular light in the late afternoon during those weeks that I look forward to every year without really planning to. I think part of why I like it is that it doesn't last long — maybe three or four weeks — so I actually pay attention to it while it's happening, instead of taking it for granted the way I do with the seasons that stick around for months.",
      },
    ],
    usefulPhrases: [
      "I'd say the stretch right before...",
      'a particular light in the late afternoon',
      'I look forward to... without really planning to',
      "it doesn't last long",
      'instead of taking it for granted',
    ],
  },
  {
    id: 'sp-137',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'Do you recycle or try to reduce waste at home?',
    sampleAnswers: [
      {
        label: 'Modest but Consistent',
        answer:
          "A bit, though I wouldn't call myself especially disciplined about it. I separate out obvious recyclables, and I've gotten better about not buying things with excessive packaging when there's a simpler option. What I'm honestly bad at is food waste — I still cook too much sometimes and end up throwing food out, which probably matters more than the plastic sorting I'm careful about. I think most people, myself included, are consistent about the visible, easy habits and inconsistent about the ones that actually take more effort.",
      },
    ],
    usefulPhrases: [
      "I wouldn't call myself especially disciplined about it",
      "I've gotten better about...",
      'what I\'m honestly bad at is...',
      'probably matters more than...',
      'consistent about the visible, easy habits',
    ],
  },
  {
    id: 'sp-200',
    topic: 'Environment & Nature',
    difficulty: 'medium',
    question: 'What kind of weather do you like the most?',
    sampleAnswers: [
      {
        label: 'Cool and Cloudy',
        answer:
          "I know it's not a popular answer, but I love cool, cloudy days, especially just after rain. The air smells fresh, the streets are quieter, and it's the perfect weather for a long walk or a hot bowl of soup. Very hot, sunny days make me tired and lazy. A light rain while I'm inside with a book is my idea of a perfect afternoon.",
      },
    ],
    usefulPhrases: [
      "I know it's not a popular answer, but...",
      'especially just after rain',
      'make me tired and lazy',
      'my idea of a perfect...',
    ],
  },
  {
    id: 'sp-469',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'Do you have any plants at home?',
    sampleAnswers: [
      {
        label: 'A Few on the Balcony',
        answer:
          "Yeah, I've got a few on my balcony — some herbs like basil and mint, and a couple of small flowers. I water them every morning before breakfast. Honestly, I'm not the best gardener, and I've killed a few plants by accident. But I love having something green around. It makes the place feel more alive, and it's nice to pick fresh herbs when I cook.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Yes, I have some herbs and flowers on my balcony. I water them every morning.',
      },
    ],
    usefulPhrases: [
      "I've got a few ...",
      "I'm not the best ...",
      'by accident',
      'it makes the place feel more alive',
      'having something green around',
    ],
  },
  {
    id: 'sp-470',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'Do you prefer watching the sunrise or the sunset?',
    sampleAnswers: [
      {
        label: 'Sunset, Easily',
        answer:
          "Sunset, easily — mostly because I'm rarely awake for the sunrise! I love sitting somewhere high or by the water at the end of the day and watching the sky turn orange and pink. It feels like a natural full stop for the day. The few times I've watched a sunrise, though, it was magical and very quiet.",
      },
    ],
    usefulPhrases: [
      '..., easily',
      "I'm rarely awake for...",
      'a natural full stop',
      'it was magical',
    ],
  },
  {
    id: 'sp-471',
    topic: 'Environment & Nature',
    difficulty: 'easy',
    question: 'What kind of trees grow near your home?',
    sampleAnswers: [
      {
        label: 'Big Shady Trees',
        answer:
          "There's a row of big old trees along my street. I don't know their exact name, but they're really tall and give loads of shade, which is perfect in summer. In spring, one of them gets these tiny yellow flowers that fall everywhere. It's a bit messy, but it looks lovely. I think the street would feel much hotter and emptier without them.",
      },
      {
        label: 'Short & Simple',
        answer:
          'There are tall, shady trees on my street. They keep it cool in summer.',
      },
    ],
    usefulPhrases: [
      "I don't know their exact name",
      'give loads of shade',
      'it looks lovely',
      'a bit messy',
      'would feel much ... without them',
    ],
  },
  {
    id: 'sp-472',
    topic: 'Environment & Nature',
    difficulty: 'medium',
    question: 'Do you prefer the mountains or the sea? Why?',
    sampleAnswers: [
      {
        label: 'Mountains, Every Time',
        answer:
          "I'd go for the mountains. The sea is beautiful, but it's usually crowded and really hot. In the mountains, the air feels fresher, it's quieter, and there's something about being up high that makes my problems feel smaller. I also like that you have to work a bit to get the view — a long hike makes the top feel like a reward. Plus, the evenings are cool enough for a jacket.",
      },
    ],
    usefulPhrases: [
      "I'd go for ...",
      "there's something about ...",
      'makes my problems feel smaller',
      'feel like a reward',
      'cool enough for ...',
    ],
  },
  {
    id: 'sp-473',
    topic: 'Environment & Nature',
    difficulty: 'medium',
    question: 'Tell me about a time you saw something amazing in nature.',
    sampleAnswers: [
      {
        label: 'Fireflies in the Field',
        answer:
          "A few years ago, I was staying with relatives in the countryside. One evening, after dinner, my cousin took me to a field near their house. As it got darker, hundreds of fireflies started lighting up around us. I'd never seen anything like it — it was like tiny stars floating in the grass. We just stood there in silence. I still think about that night.",
      },
    ],
    usefulPhrases: [
      'I was staying with ...',
      'as it got darker',
      "I'd never seen anything like it",
      'we just stood there in silence',
      'I still think about ...',
    ],
  },
  {
    id: 'sp-474',
    topic: 'Environment & Nature',
    difficulty: 'medium',
    question: 'Why do you think some people still throw rubbish on the street?',
    sampleAnswers: [
      {
        label: 'Habit and Convenience',
        answer:
          "I think it's mostly habit and convenience. If there aren't enough bins nearby, some people just drop things wherever they are. And if everyone around them does it, it starts to feel normal. There's also a feeling that someone else will clean it up. Personally, I think more bins and a bit of social pressure would help — people usually behave better when others are watching.",
      },
    ],
    usefulPhrases: [
      "it's mostly habit and convenience",
      'wherever they are',
      'it starts to feel normal',
      'someone else will clean it up',
      'a bit of social pressure',
    ],
  },
  {
    id: 'sp-475',
    topic: 'Environment & Nature',
    difficulty: 'medium',
    question: 'Is it easier to live an eco-friendly life in the city or in the countryside?',
    sampleAnswers: [
      {
        label: 'Each Has Its Advantages',
        answer:
          "It's a tricky one. In the city, you can walk or take public transport, and recycling is usually better organised. But you also buy more packaged food and use more electricity. In the countryside, people often grow their own vegetables and waste less, but they need a car for almost everything. So I'd say each has its own advantages — it really comes down to your habits.",
      },
    ],
    usefulPhrases: [
      "it's a tricky one",
      'better organised',
      'grow their own vegetables',
      'for almost everything',
      'it really comes down to ...',
    ],
  },
  {
    id: 'sp-476',
    topic: 'Environment & Nature',
    difficulty: 'hard',
    question: 'Should people pay more for products that are better for the environment?',
    sampleAnswers: [
      {
        label: 'Yes, But It Should Be Fair',
        answer:
          "In principle, yes — cheap products often have a hidden cost that nature ends up paying. But realistically, not everyone can afford to pay extra. It doesn't seem fair to expect a struggling family to choose between saving money and saving the planet. I'd rather see governments make the greener option cheaper, so it becomes the obvious choice rather than a luxury for people who can afford it.",
      },
    ],
    usefulPhrases: [
      'in principle',
      'a hidden cost',
      'not everyone can afford ...',
      "I'd rather see ...",
      'the obvious choice rather than a luxury',
    ],
  },
  {
    id: 'sp-477',
    topic: 'Environment & Nature',
    difficulty: 'hard',
    question: 'If you could protect one natural place in the world forever, which would you choose?',
    sampleAnswers: [
      {
        label: 'The Rainforests',
        answer:
          "I'd probably choose the Amazon rainforest. It's not just beautiful — it's home to an incredible number of plants and animals, and it helps keep the whole planet's climate stable. Once a forest like that is cut down, you can't just replant it and get the same thing back. It took thousands of years to grow. Losing it would affect everyone, not just the people living nearby.",
      },
    ],
    usefulPhrases: [
      "it's not just ... — it's ...",
      'home to an incredible number of ...',
      "you can't just ... and get the same thing back",
      'it took thousands of years to ...',
      'would affect everyone',
    ],
  },
  {
    id: 'sp-478',
    topic: 'Environment & Nature',
    difficulty: 'hard',
    question: 'Who has more responsibility for protecting nature — individuals or governments?',
    sampleAnswers: [
      {
        label: 'Mostly Governments, Honestly',
        answer:
          "Honestly, I think governments carry most of the weight. One person recycling helps, but one law about factory pollution can make a far bigger difference. That said, individuals aren't off the hook. Governments usually act when enough people care and push for change. So I see it as a cycle — people change their habits and expectations, and that pressure eventually turns into real policy.",
      },
    ],
    usefulPhrases: [
      'carry most of the weight',
      'a far bigger difference',
      "aren't off the hook",
      'push for change',
      'eventually turns into ...',
    ],
  },

  // ── Weather & Seasons ─────────────────────────────────
  {
    id: 'sp-228',
    topic: 'Weather & Seasons',
    difficulty: 'easy',
    question: "What's the weather like today?",
    sampleAnswers: [
      {
        label: 'Describing the Day',
        answer:
          "It's warm and a bit cloudy this morning, around twenty-eight degrees. There's a light breeze, which makes it pleasant to be outside. The forecast says it might rain in the afternoon, so I've got an umbrella in my bag, just in case.",
      },
      {
        label: 'Short & Simple',
        answer:
          "It's warm and cloudy, and it might rain later.",
      },
    ],
    usefulPhrases: [
      "It's warm and a bit cloudy",
      'a light breeze',
      'The forecast says...',
      'just in case',
    ],
  },
  {
    id: 'sp-229',
    topic: 'Weather & Seasons',
    difficulty: 'easy',
    question: 'Do you prefer hot weather or cold weather?',
    sampleAnswers: [
      {
        label: 'Cool Over Hot',
        answer:
          "I prefer cooler weather. When it's very hot, I feel tired and sticky and I don't want to do anything. When it's cool, I can walk for hours, drink hot tea, and wear a jacket, which I love. That said, I wouldn't enjoy freezing winters with snow every day — mild and cool is perfect for me.",
      },
    ],
    usefulPhrases: [
      'I feel tired and sticky',
      'I can walk for hours',
      'That said...',
      '... is perfect for me',
    ],
  },
  {
    id: 'sp-230',
    topic: 'Weather & Seasons',
    difficulty: 'medium',
    question: 'How does the weather affect your mood?',
    sampleAnswers: [
      {
        label: 'More Than I Expected',
        answer:
          "More than I'd like to admit. On grey, rainy days I feel slower and want to stay in bed. A bright sunny morning makes me more energetic and positive straight away. I've learned to plan around it a bit — on gloomy days I make sure to get outside for at least a short walk and see some daylight, because it really helps.",
      },
    ],
    usefulPhrases: [
      "More than I'd like to admit.",
      'straight away',
      "I've learned to plan around it",
      'it really helps',
    ],
  },
  {
    id: 'sp-231',
    topic: 'Weather & Seasons',
    difficulty: 'medium',
    question: 'Describe a time when bad weather changed your plans.',
    sampleAnswers: [
      {
        label: 'The Storm Picnic',
        answer:
          "Last summer a group of us planned a big picnic by a lake. We'd made sandwiches, packed games, everything. Then, ten minutes after we arrived, a huge storm came out of nowhere. We ran to the car completely soaked. In the end we had the picnic on the floor of a friend's living room, which turned out to be really fun. Sometimes the plan B is better than the plan A.",
      },
    ],
    usefulPhrases: [
      'came out of nowhere',
      'completely soaked',
      'In the end...',
      'turned out to be...',
    ],
  },
  {
    id: 'sp-232',
    topic: 'Weather & Seasons',
    difficulty: 'hard',
    question: 'Do you think the weather where you live has changed over the years?',
    sampleAnswers: [
      {
        label: 'Noticeably',
        answer:
          "Yes, noticeably. The older people I know say summers used to be cooler and the rainy season used to start at the same time every year. Now it's harder to predict — we get very hot spells, sudden heavy rain, and sometimes storms out of season. One year isn't proof of anything, but when everyone notices the same pattern for years, it's hard to ignore.",
      },
    ],
    usefulPhrases: [
      'Yes, noticeably.',
      'used to...',
      "it's harder to predict",
      "it's hard to ignore",
    ],
  },
  {
    id: 'sp-479',
    topic: 'Weather & Seasons',
    difficulty: 'easy',
    question: 'What do you usually wear when it rains?',
    sampleAnswers: [
      {
        label: 'Raincoat and Sandals',
        answer:
          "I usually throw on a light raincoat and wear sandals instead of shoes, because my shoes always end up soaked anyway. I also keep a small umbrella in my bag, just in case. If it's really pouring, I'll wear shorts, since wet trousers are the worst. It's not the most stylish look, but it's practical, and I stay mostly dry.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I wear a raincoat and sandals, and I always carry a small umbrella.',
      },
    ],
    usefulPhrases: [
      'throw on ...',
      'end up soaked',
      'just in case',
      "if it's really pouring",
      "it's not the most stylish look, but ...",
    ],
  },
  {
    id: 'sp-480',
    topic: 'Weather & Seasons',
    difficulty: 'easy',
    question: 'What do you like to do on a sunny day?',
    sampleAnswers: [
      {
        label: 'Out the Door Early',
        answer:
          "On a sunny day, I try to get outside as early as possible, before it gets too hot. I love going for a walk in the park or riding my bike around the lake. In the afternoon, I'll usually find a café with some shade and have an iced drink. And if friends are free, a picnic is always a good idea.",
      },
    ],
    usefulPhrases: [
      'get outside as early as possible',
      'before it gets too hot',
      'go for a walk',
      'find a café with some shade',
      'is always a good idea',
    ],
  },
  {
    id: 'sp-481',
    topic: 'Weather & Seasons',
    difficulty: 'easy',
    question: 'What is the hottest month like where you live?',
    sampleAnswers: [
      {
        label: 'Sticky and Slow',
        answer:
          "The hottest month is really sticky. It's humid from early morning, and by lunchtime the streets are almost empty because everyone's hiding from the sun. I drink a lot of water and take cold showers twice a day. In the evening it cools down a little, so that's when people come out to eat and chat. Life just slows down for a few weeks.",
      },
    ],
    usefulPhrases: [
      'really sticky',
      "everyone's hiding from the sun",
      'it cools down a little',
      "that's when people come out",
      'life just slows down',
    ],
  },
  {
    id: 'sp-482',
    topic: 'Weather & Seasons',
    difficulty: 'medium',
    question: 'On a rainy day, do you prefer to stay in or go out anyway? Why?',
    sampleAnswers: [
      {
        label: 'Staying In, Happily',
        answer:
          "I definitely prefer staying in. There's something really cosy about listening to rain on the window with a hot drink and a good book. Going out means wet shoes, traffic, and everyone in a bad mood. That said, if I've already made plans with friends, I'll still go — a bit of rain isn't a good enough excuse to cancel. But if the day is free, I'm on the sofa.",
      },
    ],
    usefulPhrases: [
      "there's something really cosy about ...",
      'in a bad mood',
      "I've already made plans with ...",
      "isn't a good enough excuse to ...",
      "I'm on the sofa",
    ],
  },
  {
    id: 'sp-483',
    topic: 'Weather & Seasons',
    difficulty: 'medium',
    question: "Tell me about the most extreme weather you've ever experienced.",
    sampleAnswers: [
      {
        label: 'The Big Storm',
        answer:
          "When I was about twelve, a huge storm hit my town. The wind was so strong that it knocked down trees all along our street, and the power was out for three days. My family and I stayed in the living room together, listening to the wind howl. It was scary at the time, but afterwards, the whole neighbourhood came out to help clean up. I'll never forget that.",
      },
    ],
    usefulPhrases: [
      'a huge storm hit ...',
      'knocked down trees',
      'the power was out for ...',
      'it was scary at the time',
      "I'll never forget that",
    ],
  },
  {
    id: 'sp-484',
    topic: 'Weather & Seasons',
    difficulty: 'medium',
    question: 'How does what you eat change with the seasons?',
    sampleAnswers: [
      {
        label: 'Soups in Winter, Fruit in Summer',
        answer:
          "Quite a lot, actually. When it's hot, I hardly feel hungry, so I eat lighter things — salads, cold noodles, and loads of fruit like mango and watermelon. When it gets cooler, I start craving warm, heavy food, especially soups and stews. My mum always says that eating with the seasons is healthier, and I think she's got a point. The food just tastes better when it's in season.",
      },
    ],
    usefulPhrases: [
      'quite a lot, actually',
      'I hardly feel hungry',
      'I start craving ...',
      "she's got a point",
      "when it's in season",
    ],
  },
  {
    id: 'sp-485',
    topic: 'Weather & Seasons',
    difficulty: 'medium',
    question: 'Do you trust the weather forecast? Why or why not?',
    sampleAnswers: [
      {
        label: 'Only Half',
        answer:
          "I'd say I trust it about half the time. For the next day or two, it's usually pretty accurate. But anything beyond that feels like a guess. I've been caught in the rain so many times on days that were supposed to be sunny. So now I check the forecast, but I always bring an umbrella anyway. Better safe than sorry.",
      },
    ],
    usefulPhrases: [
      'about half the time',
      'pretty accurate',
      'feels like a guess',
      "I've been caught in the rain",
      'better safe than sorry',
    ],
  },
  {
    id: 'sp-486',
    topic: 'Weather & Seasons',
    difficulty: 'hard',
    question: 'Would you rather live somewhere with the same weather all year, or with four distinct seasons?',
    sampleAnswers: [
      {
        label: 'Give Me Four Seasons',
        answer:
          "I'd choose four seasons. Having the same weather all year sounds nice at first, but I think I'd lose track of time. Seasons give the year a shape — you look forward to the first cold morning, or the first warm day after winter. Each one has its own food, clothes, and mood. Even the season you don't love makes you appreciate the next one more.",
      },
    ],
    usefulPhrases: [
      'sounds nice at first, but ...',
      "I'd lose track of time",
      'give the year a shape',
      'you look forward to ...',
      'makes you appreciate ... more',
    ],
  },
  {
    id: 'sp-487',
    topic: 'Weather & Seasons',
    difficulty: 'hard',
    question: "Do you think the climate of a place shapes people's personalities?",
    sampleAnswers: [
      {
        label: 'In Small Ways, Yes',
        answer:
          'I think it does, at least a little. In hot places, life often moves more slowly, and a lot of social life happens outdoors, so people can seem more relaxed and open. In colder places, people spend more time indoors, and maybe they plan ahead more. Of course, these are huge generalisations, and every person is different. But I do believe the environment quietly shapes daily habits, and habits shape character.',
      },
    ],
    usefulPhrases: [
      'at least a little',
      'life moves more slowly',
      'plan ahead',
      'these are huge generalisations',
      'quietly shapes ...',
    ],
  },
  {
    id: 'sp-488',
    topic: 'Weather & Seasons',
    difficulty: 'hard',
    question: 'Why do you think people talk about the weather so much?',
    sampleAnswers: [
      {
        label: 'The Safest Topic',
        answer:
          "I think it's because the weather is something everyone shares. It doesn't matter who you are — you both just walked through the same rain. It's a safe topic, too; nobody gets offended by a comment about the heat. So it works as a kind of social warm-up. You start with the weather, and if the conversation goes well, you move on to something more personal. It's a small way of saying, 'I'm friendly.'",
      },
    ],
    usefulPhrases: [
      'something everyone shares',
      "it doesn't matter who you are",
      'nobody gets offended by ...',
      'a kind of social warm-up',
      'move on to something more personal',
    ],
  },

  // ── Getting Around ────────────────────────────────────
  {
    id: 'sp-233',
    topic: 'Getting Around',
    difficulty: 'easy',
    question: 'How do you usually get to places in your town?',
    sampleAnswers: [
      {
        label: 'Bike and Bus',
        answer:
          "For short trips I walk or ride a bike — it's cheap, healthy, and often faster than driving in traffic. For longer trips I take the bus. I only use a taxi when it's late at night or I'm carrying something heavy. I like that I don't really need a car for everyday life.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I walk or cycle, and take the bus for longer trips.',
      },
    ],
    usefulPhrases: [
      'For short trips I...',
      'often faster than...',
      'I only use... when...',
      "I don't really need...",
    ],
  },
  {
    id: 'sp-234',
    topic: 'Getting Around',
    difficulty: 'easy',
    question: 'Do you like long journeys by bus or train?',
    sampleAnswers: [
      {
        label: 'Trains, Yes',
        answer:
          'Trains, yes — I love them. You can walk around, look out of the window, read, or just think. Buses are fine for a couple of hours, but on long trips I start to feel squashed and a bit sick. A night train is my favourite: you fall asleep in one city and wake up in another.',
      },
    ],
    usefulPhrases: [
      'I love them',
      'feel squashed',
      'is my favourite',
      'fall asleep in one... and wake up in another',
    ],
  },
  {
    id: 'sp-235',
    topic: 'Getting Around',
    difficulty: 'medium',
    question: 'What would make transport in your city better?',
    sampleAnswers: [
      {
        label: 'More Options',
        answer:
          "More buses that run often and on time, and safe lanes for bicycles. Right now a lot of people drive because the other options aren't reliable, which makes traffic worse for everyone. If you knew a bus would come every ten minutes, many people would leave their car at home. Also, more trees and shade on the pavements would make walking much more pleasant.",
      },
    ],
    usefulPhrases: [
      'run often and on time',
      "aren't reliable",
      'makes... worse for everyone',
      'would make... much more pleasant',
    ],
  },
  {
    id: 'sp-236',
    topic: 'Getting Around',
    difficulty: 'medium',
    question: 'Have you ever had a funny or strange experience on public transport?',
    sampleAnswers: [
      {
        label: 'The Singing Driver',
        answer:
          "Once I took an early morning bus where the driver sang along to the radio the whole journey — loudly and not very well. At first everyone looked annoyed, but by the third song an old lady started singing too, and then a few others joined in. By the end, half the bus was singing. It was the happiest commute I've ever had.",
      },
    ],
    usefulPhrases: [
      'the whole journey',
      'At first..., but by...',
      'joined in',
      "the happiest... I've ever had",
    ],
  },
  {
    id: 'sp-237',
    topic: 'Getting Around',
    difficulty: 'hard',
    question: 'Should cars be banned from city centres?',
    sampleAnswers: [
      {
        label: 'Mostly, With Exceptions',
        answer:
          "I think many city centres would be better with far fewer cars — cleaner air, less noise, and more space for people to walk and sit. Cities that have tried it often see shops doing better, not worse. But a total ban could be unfair to older or disabled people and to deliveries. So I'd support car-free centres with good public transport and exceptions for people who really need to drive.",
      },
    ],
    usefulPhrases: [
      'would be better with far fewer...',
      'often see... doing better, not worse',
      'could be unfair to...',
      'exceptions for people who...',
    ],
  },
  {
    id: 'sp-489',
    topic: 'Getting Around',
    difficulty: 'easy',
    question: 'Do you ride a bicycle? How often?',
    sampleAnswers: [
      {
        label: 'A Weekend Rider',
        answer:
          "Yes, I do, but mostly at weekends. During the week the roads are just too busy, and I don't feel safe. On Saturday or Sunday mornings, though, I like riding around the lake when it's still quiet. It's great exercise and a really nice way to see the city slowly. I'd ride more if there were proper bike lanes in my area.",
      },
      {
        label: 'Short & Simple',
        answer:
          'Yes, mostly at weekends, when the roads are quiet.',
      },
    ],
    usefulPhrases: [
      'mostly at weekends',
      "I don't feel safe",
      "when it's still quiet",
      'a really nice way to ...',
      "I'd ... more if there were ...",
    ],
  },
  {
    id: 'sp-490',
    topic: 'Getting Around',
    difficulty: 'easy',
    question: 'What do you usually do while you travel on a bus or train?',
    sampleAnswers: [
      {
        label: 'Window Seat, Always',
        answer:
          "I always try to get a window seat. Most of the time, I just look outside and let my mind wander — it's weirdly relaxing. If the trip is longer, I'll read a book or listen to music. Sometimes I end up chatting with the person next to me, which can be really interesting. I almost never sleep, though; I'm scared I'll miss my stop.",
      },
    ],
    usefulPhrases: [
      'I always try to get ...',
      'let my mind wander',
      "it's weirdly relaxing",
      'I end up chatting with ...',
      "I'm scared I'll miss my stop",
    ],
  },
  {
    id: 'sp-491',
    topic: 'Getting Around',
    difficulty: 'easy',
    question: 'How far is the nearest shop or market from your home?',
    sampleAnswers: [
      {
        label: 'Just Around the Corner',
        answer:
          "It's really close, actually — about a five-minute walk. There's a small corner shop at the end of my street, and a bigger market a bit further on. I usually walk there in the evening to pick up fruit or eggs. It's so convenient that I rarely do a big shop; I just pop in whenever I need something. I really like that.",
      },
    ],
    usefulPhrases: [
      "it's really close, actually",
      'about a five-minute walk',
      'a bit further on',
      'pick up ...',
      'I just pop in whenever ...',
    ],
  },
  {
    id: 'sp-492',
    topic: 'Getting Around',
    difficulty: 'medium',
    question: 'Have you ever missed a bus, train, or flight? What happened?',
    sampleAnswers: [
      {
        label: 'The Train That Left Without Me',
        answer:
          "Yes, once, and it was totally my fault. I was taking a train to visit my aunt, and I thought it left at ten-thirty. I strolled into the station at ten-fifteen, feeling relaxed, and then saw that it had actually left at ten. I couldn't believe it. I had to buy another ticket and wait four hours. Now I check the time on my ticket about three times before I leave home.",
      },
    ],
    usefulPhrases: [
      'it was totally my fault',
      'I strolled into ...',
      "I couldn't believe it",
      'I had to ... and wait ...',
      'about three times before I leave home',
    ],
  },
  {
    id: 'sp-493',
    topic: 'Getting Around',
    difficulty: 'medium',
    question: 'Why do some people prefer to drive even when public transport is available?',
    sampleAnswers: [
      {
        label: 'Comfort and Control',
        answer:
          "I think it's mostly about comfort and control. In your own car, you leave when you want, you don't have to stand next to strangers, and you can carry shopping easily. Public transport can also be slow if you need to change lines a few times. For some people, it's a matter of status, too. Personally, I understand it, but it does make traffic worse for everyone.",
      },
    ],
    usefulPhrases: [
      "it's mostly about ...",
      'you leave when you want',
      'change lines',
      "it's a matter of status",
      'make traffic worse for everyone',
    ],
  },
  {
    id: 'sp-494',
    topic: 'Getting Around',
    difficulty: 'medium',
    question: 'Is your city a good place for walking? Why or why not?',
    sampleAnswers: [
      {
        label: 'Not Really, Sadly',
        answer:
          "Sadly, not really. A lot of the pavements are narrow or blocked by parked motorbikes and food stalls, so you often end up walking in the road. Crossing big streets can feel a bit risky, too. The old town is the exception — it's lovely and shady, and there's plenty to look at. If the whole city were like that, I'd walk everywhere.",
      },
    ],
    usefulPhrases: [
      'sadly, not really',
      'blocked by ...',
      'you often end up ...',
      'is the exception',
      "I'd walk everywhere",
    ],
  },
  {
    id: 'sp-495',
    topic: 'Getting Around',
    difficulty: 'medium',
    question: 'How did you get to school as a child, and how is it different for children today?',
    sampleAnswers: [
      {
        label: 'On the Back of a Bike',
        answer:
          "When I was a kid, my dad took me to school on the back of his bicycle. Later, I walked with my friends, and that was the best part of the day — we'd chat and buy snacks on the way. These days, most kids I see are dropped off by car right at the gate. It's safer, I suppose, but I think they miss out on a bit of freedom.",
      },
    ],
    usefulPhrases: [
      'on the back of his bicycle',
      'the best part of the day',
      'on the way',
      'dropped off by car',
      'they miss out on ...',
    ],
  },
  {
    id: 'sp-496',
    topic: 'Getting Around',
    difficulty: 'hard',
    question: 'If everything you needed was within a fifteen-minute walk, how would your life change?',
    sampleAnswers: [
      {
        label: 'More Time, Less Stress',
        answer:
          "I think I'd be a lot calmer. I'd save so much time that I currently spend sitting in traffic, and I'd probably walk every day without even trying. I'd also bump into neighbours more, which might make the area feel more like a community. On the other hand, I might get a bit lazy about exploring other parts of the city. But overall, it sounds like a much healthier way to live.",
      },
    ],
    usefulPhrases: [
      "I'd be a lot calmer",
      'sitting in traffic',
      'without even trying',
      'bump into ...',
      'a much healthier way to live',
    ],
  },
  {
    id: 'sp-497',
    topic: 'Getting Around',
    difficulty: 'hard',
    question: 'Do you think owning a car will still be normal in thirty years?',
    sampleAnswers: [
      {
        label: 'Less Normal Than Now',
        answer:
          "I suspect it'll be less common, at least in big cities. Parking is getting harder, roads are more crowded, and lots of young people already seem less interested in owning a car. If public transport and shared options keep improving, owning one might feel like more trouble than it's worth. In the countryside, though, I can't see people giving up their cars anytime soon.",
      },
    ],
    usefulPhrases: [
      'I suspect ...',
      'at least in ...',
      "more trouble than it's worth",
      "I can't see ... anytime soon",
      'giving up ...',
    ],
  },
  {
    id: 'sp-498',
    topic: 'Getting Around',
    difficulty: 'hard',
    question: 'Is cheap air travel a good thing overall?',
    sampleAnswers: [
      {
        label: 'Good for People, Hard on the Planet',
        answer:
          "It's a bit of a mixed blessing. On one hand, it's opened up the world to people who could never afford to fly before — families can visit each other, and students can see new places. That's genuinely wonderful. On the other hand, flying is terrible for the environment, and super-cheap tickets encourage people to fly for a weekend without thinking twice. I'd say it's good, as long as we don't treat it as disposable.",
      },
    ],
    usefulPhrases: [
      'a mixed blessing',
      "it's opened up the world to ...",
      'genuinely wonderful',
      'without thinking twice',
      "as long as we don't ...",
    ],
  },

  // ── Opinions & Ideas ──────────────────────────────────
  {
    id: 'sp-48',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Is social media more helpful or harmful?',
    sampleAnswers: [
      {
        label: 'Nuanced View',
        answer:
          "I think it's both, and it really depends on how you use it. Social media is great for staying connected with family and friends who live far away, and for discovering new ideas, recipes, or places to visit. But it can also be a huge time waster, and it's bad for your mood if you're constantly comparing yourself to others. I try to be intentional — I follow people who make me laugh or teach me something, and I limit my scrolling time.",
      },
    ],
    usefulPhrases: [
      'it really depends on how you use it',
      "it's great for...",
      'a huge time waster',
      'I try to be intentional about it',
    ],
  },
  {
    id: 'sp-71',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'What do you think about advertising? Does it have more benefits or drawbacks?',
    sampleAnswers: [
      {
        label: 'Balanced Take',
        answer:
          "I think advertising has become so pervasive that it's hard to have a neutral view on it. On the positive side, it funds a lot of free content — without advertising, most of the internet we use for free wouldn't exist. It also connects people with products they genuinely need. But the downsides are real. Advertising increasingly uses psychological techniques to manipulate rather than inform. It creates insecurity — making people feel they need things they don't. And the sheer volume of ads is exhausting. I use an ad blocker and honestly, my mental health is better for it.",
      },
    ],
    usefulPhrases: [
      'has become so pervasive that...',
      'On the positive side...',
      'creates insecurity',
      'the sheer volume of... is exhausting',
      'my mental health is better for it',
    ],
  },
  {
    id: 'sp-75',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Describe a time you changed your mind about something important.',
    sampleAnswers: [
      {
        label: 'Big City vs Smaller City',
        answer:
          'I used to think living in a huge city was the dream — the energy, the endless things to do. Then I spent a few months in one and found it exhausting: the traffic, the noise, the time it took to get anywhere. After that I completely flipped my view. Now I think a smaller city, where you can reach nature easily and still have a social life, is much better for me. It was a lesson I only learned by actually living it.',
      },
    ],
    usefulPhrases: [
      'I used to think... was the dream',
      'found it exhausting',
      'I completely flipped my view.',
      'by actually living it',
    ],
  },
  {
    id: 'sp-77',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'How important is it to learn about other cultures? How do you do it?',
    sampleAnswers: [
      {
        label: 'Curious Learner',
        answer:
          "I think it's extremely important. Understanding how other cultures approach food, family, and politeness prevents a lot of misunderstandings — and it makes travelling much richer. I learn mostly through films, books, and podcasts, and by talking to travellers whenever I can. You quickly realise that what feels 'normal' to you is just one way of doing things.",
      },
    ],
    usefulPhrases: [
      "I think it's extremely important.",
      'prevents a lot of misunderstandings',
      'makes... much richer',
      'is just one way of doing things',
    ],
  },
  {
    id: 'sp-99',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Do you think people should always tell the truth?',
    sampleAnswers: [
      {
        label: 'Nuanced View',
        answer:
          "As a general rule, yes — honesty should be the default, and lying should need a very good reason. But I'd stop short of saying always. There's a difference between a lie that protects yourself and one that spares someone unnecessary pain. If a friend cooks me a meal they're proud of and it's a bit salty, I won't pretend it's amazing, but I'll start with what's genuinely good. That's not dishonesty; it's kindness about timing. Honesty and bluntness aren't the same thing.",
      },
    ],
    usefulPhrases: [
      'As a general rule...',
      "I'd stop short of saying...",
      "There's a difference between... and...",
      "Honesty and bluntness aren't the same thing.",
    ],
  },
  {
    id: 'sp-126',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Do you think people are generally getting busier, or does it just feel that way?',
    sampleAnswers: [
      {
        label: 'Perceived vs Real',
        answer:
          "I think it's partly real and partly a feeling created by how connected we are now. People probably don't have objectively less free time than a couple of generations ago, but that free time gets constantly interrupted by notifications, so it never feels like proper rest. It's death by a thousand small interruptions rather than a genuine lack of hours. I notice this in myself — I can have a completely open evening and still end it feeling like I never actually stopped.",
      },
    ],
    usefulPhrases: [
      "it's partly real and partly a feeling created by...",
      "don't have objectively less... than...",
      'gets constantly interrupted by...',
      'death by a thousand small interruptions',
      'I notice this in myself',
    ],
  },
  {
    id: 'sp-136',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Do you think being on time really matters, or is being a little late usually fine?',
    sampleAnswers: [
      {
        label: 'Depends What It Signals',
        answer:
          "I think it matters less for the minutes themselves and more for what it signals about whether you value someone else's time as much as your own. A few minutes late because of traffic, nobody reasonably minds. But someone who's late everywhere, every time, is usually telling you something about their priorities whether they mean to or not. I try to be on time as a kind of respect rather than a rule, which also means I don't get too worked up when someone else is occasionally late — I try to notice the pattern, not the single instance.",
      },
    ],
    usefulPhrases: [
      "it matters less for... and more for what it signals",
      'nobody reasonably minds',
      'whether they mean to or not',
      'as a kind of respect rather than a rule',
      'the pattern, not the single instance',
    ],
  },
  {
    id: 'sp-204',
    topic: 'Opinions & Ideas',
    difficulty: 'medium',
    question: 'Is it better to be a leader or a follower?',
    sampleAnswers: [
      {
        label: 'Both Have Value',
        answer:
          "I don't think one is always better. Leaders get the attention, but nothing happens without good followers who do the work and give honest feedback. Personally, I'm happy to lead when I know a lot about something, and happy to follow when someone else knows more. The worst situation is when everyone wants to lead, or nobody does.",
      },
    ],
    usefulPhrases: [
      "I don't think one is always better.",
      'nothing happens without...',
      "I'm happy to... when...",
      'The worst situation is when...',
    ],
  },
  {
    id: 'sp-205',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Do you think people are kinder in small towns than in big cities?',
    sampleAnswers: [
      {
        label: 'Different, Not Kinder',
        answer:
          "I'm not sure they're kinder — I think kindness just looks different. In a small town, people know each other, so they stop to chat and help their neighbours, but they can also gossip and judge more. In a big city, people seem colder because everyone is busy and anonymous, but when something goes wrong, strangers often help immediately. So I'd say small towns are friendlier on the surface, while cities can be surprisingly kind when it counts.",
      },
    ],
    usefulPhrases: [
      "I'm not sure they're...",
      'just looks different',
      'on the surface',
      'when it counts',
    ],
  },
  {
    id: 'sp-262',
    topic: 'Opinions & Ideas',
    difficulty: 'medium',
    question: 'Is it better to live in the moment or plan for the future?',
    sampleAnswers: [
      {
        label: 'A Bit of Both',
        answer:
          "I think you need both, in the right amounts. If you only live in the moment, you might regret it later — no savings, no direction. But if you're always planning, you miss what's happening right now. I try to plan the big things, like money and health, and then let the small daily things be spontaneous.",
      },
    ],
    usefulPhrases: [
      'in the right amounts',
      'you might regret it later',
      "you miss what's happening right now",
      'let the small things be spontaneous',
    ],
  },
  {
    id: 'sp-499',
    topic: 'Opinions & Ideas',
    difficulty: 'easy',
    question: 'Would you rather give advice or ask for it?',
    sampleAnswers: [
      {
        label: 'Better at Giving',
        answer:
          "Honestly, I'm much better at giving advice than asking for it. When a friend has a problem, I can see the answer clearly. When it's my own problem, I try to solve it alone because asking feels like admitting I'm stuck. I'm slowly learning that asking is actually smart — other people often see what you can't.",
      },
    ],
    usefulPhrases: [
      "I'm much better at... than...",
      'feels like admitting...',
      "I'm slowly learning that...",
      "other people often see what you can't",
    ],
  },
  {
    id: 'sp-500',
    topic: 'Opinions & Ideas',
    difficulty: 'easy',
    question: 'Are you more of a morning person or a night person?',
    sampleAnswers: [
      {
        label: 'Definitely a Night Owl',
        answer:
          "I'm definitely a night owl. My brain just seems to wake up after dinner, and that's when I have my best ideas. In the morning I'm pretty slow and I need a while before I can hold a proper conversation. The downside is that I often stay up too late and regret it the next day. I keep promising myself I'll go to bed earlier, but it never really lasts.",
      },
    ],
    usefulPhrases: [
      "I'm definitely a night owl",
      'my brain just seems to wake up...',
      'the downside is that...',
      'I keep promising myself...',
      'it never really lasts',
    ],
  },
  {
    id: 'sp-501',
    topic: 'Opinions & Ideas',
    difficulty: 'easy',
    question: "What's one habit you think everyone should try?",
    sampleAnswers: [
      {
        label: 'Going for a Daily Walk',
        answer:
          "I'd say everyone should try going for a short walk every day. It doesn't have to be long, even twenty minutes is enough. It clears your head, gets you moving and you notice things around you that you'd normally miss. Whenever I'm stuck on something or feeling stressed, a walk usually helps me see it more clearly. And the best part is that it's completely free.",
      },
    ],
    usefulPhrases: [
      "I'd say everyone should try...",
      "it doesn't have to be long",
      'it clears your head',
      "things you'd normally miss",
      "the best part is that it's completely free",
    ],
  },
  {
    id: 'sp-502',
    topic: 'Opinions & Ideas',
    difficulty: 'medium',
    question: 'Is it better to have a few close friends or lots of friends?',
    sampleAnswers: [
      {
        label: 'Quality Over Quantity',
        answer:
          "For me, it's definitely quality over quantity. When I was younger I wanted to know everyone, but I've realised that a big group of friends can feel quite shallow. A few close friends are the people who actually show up when things go wrong. That said, I don't think having lots of friends is bad. It's nice to have people to chat with at parties. But the ones I can call at midnight are the ones that really matter.",
      },
    ],
    usefulPhrases: [
      "it's definitely quality over quantity",
      "I've realised that...",
      'show up when things go wrong',
      "that said, I don't think...",
      'the ones that really matter',
    ],
  },
  {
    id: 'sp-503',
    topic: 'Opinions & Ideas',
    difficulty: 'medium',
    question: 'Why do you think people enjoy watching sad films?',
    sampleAnswers: [
      {
        label: 'A Safe Way to Feel',
        answer:
          "It sounds strange, but I think sad films give us a safe way to feel big emotions. In real life we often hold our feelings in, so having a good cry over a story can actually be a relief. I remember watching a film about an old man and his dog, and I cried for about twenty minutes. Afterwards, though, I felt lighter, and I called my parents just to say hello. Sad stories remind us what's important.",
      },
    ],
    usefulPhrases: [
      'it sounds strange, but...',
      'hold our feelings in',
      'having a good cry',
      'can actually be a relief',
      "remind us what's important",
    ],
  },
  {
    id: 'sp-504',
    topic: 'Opinions & Ideas',
    difficulty: 'medium',
    question: 'Is it better to buy cheap things or things that last a long time?',
    sampleAnswers: [
      {
        label: 'Buy Once, Buy Well',
        answer:
          "These days I try to buy things that last. I used to go for the cheapest option every time, but then I'd end up replacing it a few months later. For example, I bought three cheap pairs of shoes in one year, and they all fell apart. Then I spent more on one good pair, and I've had them for four years now. So in the long run, the more expensive choice actually saved me money.",
      },
    ],
    usefulPhrases: [
      'I used to go for the cheapest option',
      "I'd end up replacing it",
      'they all fell apart',
      'in the long run',
      'actually saved me money',
    ],
  },
  {
    id: 'sp-505',
    topic: 'Opinions & Ideas',
    difficulty: 'medium',
    question: 'Do you think first impressions are usually right?',
    sampleAnswers: [
      {
        label: 'Not Always',
        answer:
          "Not always, in my experience. I once met someone who seemed really cold and unfriendly, and I decided I didn't like her. Later we ended up in the same cooking class, and it turned out she was just shy. Now she's one of my closest friends. Since then, I try to give people a second chance. First impressions tell you something, but people are much more complicated than a five-minute conversation.",
      },
    ],
    usefulPhrases: [
      'not always, in my experience',
      'it turned out (that)...',
      'give people a second chance',
      'first impressions tell you something, but...',
      'much more complicated than...',
    ],
  },
  {
    id: 'sp-506',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Is it ever right to break a rule?',
    sampleAnswers: [
      {
        label: 'Sometimes, for the Right Reasons',
        answer:
          "I'd argue that sometimes it is. Rules are made to protect people, but no rule can predict every situation. If following a rule would clearly hurt someone, I think breaking it can be the right thing to do. Imagine a sign that says don't walk on the grass, and someone has collapsed in the middle of it. Of course you'd go and help. The tricky part is being honest with yourself about whether your reason is genuinely good or just convenient.",
      },
    ],
    usefulPhrases: [
      "I'd argue that...",
      'no rule can predict every situation',
      'can be the right thing to do',
      'the tricky part is...',
      'genuinely good or just convenient',
    ],
  },
  {
    id: 'sp-507',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Do you think happiness is something you find or something you create?',
    sampleAnswers: [
      {
        label: 'Mostly Something We Build',
        answer:
          "I've come to believe it's mostly something we create. If you wait for happiness to arrive, like a perfect holiday or a big change, you can wait forever. For me, it's built from small choices, like who I spend time with, how I look after myself, and what I pay attention to. That said, I don't want to pretend luck doesn't matter. Some people face real hardship. But within whatever we're given, I think we have more control than we realise.",
      },
    ],
    usefulPhrases: [
      "I've come to believe (that)...",
      'you can wait forever',
      "it's built from small choices",
      "I don't want to pretend... doesn't matter",
      'more control than we realise',
    ],
  },
  {
    id: 'sp-508',
    topic: 'Opinions & Ideas',
    difficulty: 'hard',
    question: 'Is it more important to be respected or to be liked?',
    sampleAnswers: [
      {
        label: 'Respect Lasts Longer',
        answer:
          "If I had to choose, I'd go with respect. Being liked is lovely, but it can depend on keeping everyone happy, and you can lose yourself trying to please people. Respect usually comes from being honest and consistent, even when it's uncomfortable. Ideally, of course, you'd have both. But I've noticed the people I admire most aren't always the most popular. They're the ones who stick to their values, and over time people tend to like them for that too.",
      },
    ],
    usefulPhrases: [
      "if I had to choose, I'd go with...",
      'you can lose yourself trying to...',
      'honest and consistent',
      'ideally, of course, ...',
      'stick to their values',
    ],
  },

  // ── Education & Learning ──────────────────────────────
  {
    id: 'sp-61',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: 'Do you prefer learning from videos, books, or hands-on practice?',
    sampleAnswers: [
      {
        label: 'Learning Style',
        answer:
          "For me, it's a mix. I usually start with a video to get a general idea — I like seeing someone actually do it. Then I'll read for the details. But the real learning happens when I try it myself. I could watch a hundred cooking videos, but I won't really learn a dish until I've burned it once or twice. Books are great for things you need to think about slowly, like history or psychology.",
      },
    ],
    usefulPhrases: [
      "it's a mix",
      'to get a general idea',
      'the real learning happens when...',
      "I won't really... until...",
    ],
  },
  {
    id: 'sp-62',
    topic: 'Education & Learning',
    difficulty: 'hard',
    question: 'What do you think about the education system in your country?',
    sampleAnswers: [
      {
        label: 'Constructive Criticism',
        answer:
          "I think it's strong in some areas and weak in others. Students work very hard and are usually good at maths and science, because the system focuses on memorising and practice. But it doesn't encourage critical thinking or creativity enough — we were taught to remember answers, not to ask questions. I think that's slowly changing, with more group work and discussion. I'd also love to see more time for art, music, and sport, not just exams.",
      },
    ],
    usefulPhrases: [
      "it's strong in some areas and weak in others",
      'focuses on...',
      "it doesn't encourage... enough",
      "that's slowly changing",
    ],
  },
  {
    id: 'sp-73',
    topic: 'Education & Learning',
    difficulty: 'hard',
    question: 'Do you think people read less now than in the past? Is that a problem?',
    sampleAnswers: [
      {
        label: 'Nuanced View',
        answer:
          "It depends on what we mean by reading. People are probably reading more text than ever — messages, social media, articles, emails. But long-form reading — books, long essays — has definitely declined. Whether that's a problem is debatable. I'd argue that reading long-form content trains a kind of sustained attention that you don't get from short-form content. When everything is optimised for a 30-second attention span, it becomes harder to sit with complex ideas for extended periods. That's a loss worth taking seriously.",
      },
    ],
    usefulPhrases: [
      'It depends on what we mean by...',
      'long-form reading has definitely declined',
      'Whether that\'s a problem is debatable',
      'trains a kind of sustained attention',
      'That\'s a loss worth taking seriously',
    ],
  },
  {
    id: 'sp-89',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: 'What is the best way to learn a new skill as an adult?',
    sampleAnswers: [
      {
        label: 'Learning by Doing',
        answer:
          "For me, the most effective thing is having a real reason to use the skill rather than just studying it. With languages, vocabulary lists did very little for me — what worked was travelling and having to order food and ask for directions, because the stakes made it stick. The second thing is accepting that you'll be bad at it for a while, which adults find much harder than children. And fifteen minutes a day beats three hours on a Sunday almost every time.",
      },
    ],
    usefulPhrases: [
      'the most effective thing is...',
      'the stakes made it stick',
      "accepting that you'll be bad at it for a while",
      '... beats ... almost every time',
    ],
  },
  {
    id: 'sp-90',
    topic: 'Education & Learning',
    difficulty: 'hard',
    question: 'Do you think university education is still worth it?',
    sampleAnswers: [
      {
        label: 'Depends on the Path',
        answer:
          "It depends heavily on what you want to do. For medicine, law, or teaching, it's essential — there's no other route. For some other paths, people can learn through short courses or on their own, and what you can actually do matters more than a certificate. Still, I think university teaches you how to think carefully, and the friendships people make there are often worth as much as the studying.",
      },
      {
        label: 'Short & Simple',
        answer:
          "For some paths it's necessary, for others it isn't. But it's still valuable for the way of thinking and the people you meet.",
      },
    ],
    usefulPhrases: [
      'It depends heavily on...',
      "there's no other route",
      'matters more than...',
      'are worth as much as...',
    ],
  },
  {
    id: 'sp-131',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: "What's something you learned outside of school that turned out to be really useful?",
    sampleAnswers: [
      {
        label: 'A Practical Lesson',
        answer:
          "How to actually listen in a conversation, rather than just waiting for my turn to talk. Nobody taught me that in school — if anything, school rewards having the right answer ready, not listening carefully to the question. I picked it up mostly from watching one particular person who was genuinely good at conversations and noticing what they did differently. It sounds like a small thing, but it's changed almost every relationship in my life, which is more than I can say for most of what I studied formally.",
      },
    ],
    usefulPhrases: [
      'rather than just waiting for my turn to talk',
      'if anything, ... rewards...',
      'I picked it up mostly from...',
      'noticing what they did differently',
      "it's changed almost every... in my life",
    ],
  },
  {
    id: 'sp-198',
    topic: 'Education & Learning',
    difficulty: 'easy',
    question: 'What was your favourite subject at school?',
    sampleAnswers: [
      {
        label: 'Geography',
        answer:
          "Geography, because of my teacher. She had travelled a lot and would bring in photos, coins, and even food from different countries. Instead of memorising capitals, we planned imaginary trips around the world. I think that's where my love of travelling started. It showed me that a good teacher can make any subject exciting.",
      },
    ],
    usefulPhrases: [
      '..., because of my teacher',
      'Instead of memorising...',
      "that's where my love of... started",
      'a good teacher can make any subject exciting',
    ],
  },
  {
    id: 'sp-199',
    topic: 'Education & Learning',
    difficulty: 'hard',
    question: 'Should students wear school uniforms?',
    sampleAnswers: [
      {
        label: 'Mostly For',
        answer:
          "Mostly yes, I think. Uniforms reduce the pressure on students to wear expensive brands and make it harder to see who's rich and who isn't, which matters a lot to teenagers. They also save time in the morning. The downside is they limit self-expression, and some uniforms are uncomfortable in hot weather. So I'd keep uniforms, but make them simple, comfortable, and give students some freedom with things like shoes or bags.",
      },
    ],
    usefulPhrases: [
      'Mostly yes, I think.',
      'reduce the pressure on...',
      'The downside is...',
      "So I'd keep..., but...",
    ],
  },
  {
    id: 'sp-259',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: 'Who was the best teacher you ever had?',
    sampleAnswers: [
      {
        label: 'The Patient One',
        answer:
          "My maths teacher in secondary school. Maths was my worst subject, but she never made me feel stupid. She'd explain the same thing three different ways until one of them clicked. Because of her, I went from failing to actually enjoying it. I think the best teachers believe in you before you believe in yourself.",
      },
    ],
    usefulPhrases: [
      'was my worst subject',
      'never made me feel stupid',
      'until one of them clicked',
      'believe in you before you believe in yourself',
    ],
  },
  {
    id: 'sp-509',
    topic: 'Education & Learning',
    difficulty: 'easy',
    question: 'Where do you like to study or learn new things?',
    sampleAnswers: [
      {
        label: 'A Quiet Café',
        answer:
          "I really like studying in a quiet café. At home there are too many distractions, like the bed, the fridge, or the washing that needs doing. In a café there's a bit of background noise, but it's somehow relaxing. I usually order a drink, put my headphones on and focus for about two hours. It makes studying feel less like a chore and more like a little treat.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I like studying in a quiet café. My home has too many distractions.',
      },
    ],
    usefulPhrases: [
      'there are too many distractions',
      'a bit of background noise',
      'put my headphones on',
      'feel less like a chore and more like a treat',
    ],
  },
  {
    id: 'sp-510',
    topic: 'Education & Learning',
    difficulty: 'easy',
    question: "What's something you're learning at the moment?",
    sampleAnswers: [
      {
        label: 'Learning to Cook Properly',
        answer:
          "Right now I'm learning to cook properly. I used to make the same three dishes over and over, so I decided it was time to try something new. Every weekend I pick one recipe and give it a go. Some of them are a disaster, to be honest, but I'm slowly getting better. Last week I made fresh bread for the first time, and I was really proud of it.",
      },
    ],
    usefulPhrases: [
      "right now I'm learning to...",
      'over and over',
      'give it a go',
      'some of them are a disaster',
      "I'm slowly getting better",
    ],
  },
  {
    id: 'sp-511',
    topic: 'Education & Learning',
    difficulty: 'easy',
    question: 'Do you prefer taking notes by hand or typing them?',
    sampleAnswers: [
      {
        label: 'Pen and Paper',
        answer:
          "I definitely prefer writing by hand. It's slower, but that's kind of the point. When I write something down, I have to think about it and put it in my own words, so I remember it much better. I also like drawing little arrows and boxes to connect ideas. My notebooks are a bit messy, but when I look back at them, I can usually remember exactly what I was learning.",
      },
    ],
    usefulPhrases: [
      'I definitely prefer...',
      "that's kind of the point",
      'put it in my own words',
      'look back at them',
      'a bit messy, but...',
    ],
  },
  {
    id: 'sp-512',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: 'Tell me about a time you did badly on a test. What did you learn from it?',
    sampleAnswers: [
      {
        label: 'The Maths Test I Failed',
        answer:
          "When I was about fifteen, I failed a maths test really badly. I'd assumed I understood everything because the homework felt easy, but I'd been copying the method without really getting it. I was embarrassed, and I didn't want to show my parents. In the end, I asked my teacher for help, and she showed me where I'd gone wrong. The lesson I took away was that feeling confident and actually understanding something aren't the same thing.",
      },
    ],
    usefulPhrases: [
      "I'd assumed (that)...",
      'without really getting it',
      "where I'd gone wrong",
      'the lesson I took away was...',
      "aren't the same thing",
    ],
  },
  {
    id: 'sp-513',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: 'Why do you think some people learn faster than others?',
    sampleAnswers: [
      {
        label: 'Curiosity Makes the Difference',
        answer:
          "I think talent plays a part, but curiosity makes a bigger difference. People who genuinely want to know how something works ask more questions, and they don't give up as easily. Practice matters too. Someone who does a little every day will usually overtake someone who studies all night once a week. And honestly, confidence is huge. If you believe you're bad at something, you stop trying long before you actually reach your limit.",
      },
    ],
    usefulPhrases: [
      'plays a part, but...',
      "they don't give up as easily",
      'a little every day',
      'confidence is huge',
      'reach your limit',
    ],
  },
  {
    id: 'sp-514',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: 'Is it better to study alone or in a group?',
    sampleAnswers: [
      {
        label: 'A Bit of Both',
        answer:
          "It depends on what I'm doing. For reading or memorising things, I need to be on my own, otherwise I just end up chatting. But groups are great for understanding difficult ideas. When I study with friends, someone always explains things in a way I hadn't thought of. And explaining something to others is a brilliant way to check if you really understand it. So I usually start alone, then meet up with a group to go over things.",
      },
    ],
    usefulPhrases: [
      "it depends on what I'm doing",
      'I just end up chatting',
      "in a way I hadn't thought of",
      'a brilliant way to check if...',
      'go over things',
    ],
  },
  {
    id: 'sp-515',
    topic: 'Education & Learning',
    difficulty: 'medium',
    question: 'How has the way you learn changed since you were a child?',
    sampleAnswers: [
      {
        label: 'From Memorising to Understanding',
        answer:
          "As a child, I mostly learned by memorising. The teacher told us facts, and we repeated them until we could pass the test. Now I learn much more by doing and asking questions. If I want to understand something, I'll try it, make mistakes and figure it out as I go. I'm also more patient with myself. When I was younger, I thought being slow meant being stupid, but now I know it's just part of the process.",
      },
    ],
    usefulPhrases: [
      'I mostly learned by...',
      'figure it out as I go',
      "I'm also more patient with myself",
      "it's just part of the process",
      'learn by doing',
    ],
  },
  {
    id: 'sp-516',
    topic: 'Education & Learning',
    difficulty: 'hard',
    question: 'Should exams be the main way to measure what students know?',
    sampleAnswers: [
      {
        label: 'Only Part of the Picture',
        answer:
          "I don't think they should be the main way. Exams are useful because they're fair and easy to compare, but they only show what someone can do in two hours under pressure. Some students know a lot but panic in exams, while others are just good at cramming. I'd rather see a mix: projects, presentations and ongoing work alongside a few exams. That way you get a fuller picture of what a student can actually do.",
      },
    ],
    usefulPhrases: [
      'they only show what...',
      'under pressure',
      'good at cramming',
      "I'd rather see a mix",
      'a fuller picture of...',
    ],
  },
  {
    id: 'sp-517',
    topic: 'Education & Learning',
    difficulty: 'hard',
    question: 'Do you think making mistakes is necessary for learning?',
    sampleAnswers: [
      {
        label: 'Mistakes Are the Teacher',
        answer:
          "I'd say they're not just necessary, they're where most of the learning happens. When everything goes smoothly, you don't really notice how you did it. But when you get something wrong, you have to stop and ask why, and that question is what makes it stick. The problem is that many of us grow up being afraid of mistakes. If we could treat them as information rather than failure, I think people would learn far more and enjoy it a lot more too.",
      },
    ],
    usefulPhrases: [
      "they're not just necessary, they're...",
      'goes smoothly',
      'what makes it stick',
      'treat them as information rather than failure',
      'far more',
    ],
  },
  {
    id: 'sp-518',
    topic: 'Education & Learning',
    difficulty: 'hard',
    question: 'If schools could add one new subject, what life skill should they teach?',
    sampleAnswers: [
      {
        label: 'Managing Money',
        answer:
          "If I could add one subject, it would be managing money. So many people leave school knowing complicated formulas but not how to make a budget or understand a loan. I learned the hard way, by spending too much in my first year living alone. A practical class on saving, spending and avoiding debt could save young people a lot of stress. It's not as exciting as other subjects, but it would probably affect their lives more than almost anything else.",
      },
    ],
    usefulPhrases: [
      'if I could add one subject, it would be...',
      'I learned the hard way',
      'save ... a lot of stress',
      "it's not as exciting as..., but...",
      'affect their lives more than...',
    ],
  },

  // ── Problem Solving ───────────────────────────────────
  {
    id: 'sp-67',
    topic: 'Problem Solving',
    difficulty: 'hard',
    question: 'Tell me about a decision you made that you later regretted.',
    sampleAnswers: [
      {
        label: 'Honest Reflection',
        answer:
          "A few years ago, a friend invited me on a month-long backpacking trip. I said no because I was worried about money and about being away from home for so long. They went anyway and came back with incredible stories, and I could see how much it had changed them. Looking back, the money would have been fine. It taught me that staying comfortable isn't always the safe choice. Sometimes the bigger risk is not taking any risk at all.",
      },
    ],
    usefulPhrases: [
      'Looking back...',
      'I should have...',
      'It taught me that...',
      'the bigger risk is not taking any risk at all',
    ],
  },
  {
    id: 'sp-68',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'How do you prioritize when everything seems urgent?',
    sampleAnswers: [
      {
        label: 'Practical Framework',
        answer:
          "When everything feels urgent, I stop and write it all down — just getting it out of my head calms me down. Then I ask myself: what will happen if I don't do this today? If the answer is 'nothing much,' it's not really urgent, it just feels that way. Things like paying a bill or helping a family member come first. Everything else can wait a day. Trying to do everything at once usually means doing nothing well.",
      },
    ],
    usefulPhrases: [
      'When everything feels urgent...',
      'getting it out of my head',
      "what will happen if I don't...?",
      'doing nothing well',
    ],
  },
  {
    id: 'sp-132',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'Do you prefer solving problems on your own, or asking for help right away?',
    sampleAnswers: [
      {
        label: 'Try First, Then Ask',
        answer:
          "I give myself a limited amount of time on my own first — enough to actually understand what the problem is, but not so long that I'm just stuck out of stubbornness. After that, I'll ask. I used to think asking early made me look like I hadn't tried, but I've come around to the opposite view — struggling silently for hours usually just wastes everyone's time, mine included. The one exception is anything I actually want to get better at myself; for those, I'll sit with it longer, because the struggling is kind of the point.",
      },
    ],
    usefulPhrases: [
      'I give myself a limited amount of time',
      'not so long that I\'m just stuck out of stubbornness',
      "I've come around to the opposite view",
      'wastes everyone\'s time, mine included',
      'the struggling is kind of the point',
    ],
  },
  {
    id: 'sp-206',
    topic: 'Problem Solving',
    difficulty: 'easy',
    question: 'What do you do when you feel bored?',
    sampleAnswers: [
      {
        label: 'Go Outside',
        answer:
          "My first reaction is to pick up my phone, but that usually makes it worse. What actually helps is going outside, even just for a walk around the block, or doing something with my hands, like cooking or tidying. I've also started to think boredom isn't always bad — some of my best ideas come when I let myself be bored for a while.",
      },
    ],
    usefulPhrases: [
      'My first reaction is to...',
      'that usually makes it worse',
      'What actually helps is...',
      "isn't always bad",
    ],
  },
  {
    id: 'sp-207',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'Tell me about a time you got lost or something went wrong on a trip.',
    sampleAnswers: [
      {
        label: 'The Missed Bus',
        answer:
          "Once I missed the last bus back from a small town because I'd read the timetable wrong. It was getting dark, my phone was almost dead, and there were no hotels nearby. I went into a little shop to ask for help, and the owner called her cousin, who drove me back to the city for a small fee. I was stressed at the time, but now it's one of my favourite travel stories. It taught me that asking for help is usually the fastest solution.",
      },
    ],
    usefulPhrases: [
      "I'd read the... wrong",
      'my phone was almost dead',
      'I was stressed at the time, but...',
      'asking for help is usually...',
    ],
  },
  {
    id: 'sp-263',
    topic: 'Problem Solving',
    difficulty: 'easy',
    question: 'What do you do when you lose something important?',
    sampleAnswers: [
      {
        label: 'Stay Calm, Retrace',
        answer:
          'First, I try not to panic, because panicking makes me look in the same place five times. Then I retrace my steps — where was I last, what was I doing? Usually it turns up somewhere silly, like in the fridge or in a jacket pocket. Now I have a small bowl by the door for my keys and wallet, which has saved me many times.',
      },
    ],
    usefulPhrases: [
      'I try not to panic',
      'retrace my steps',
      'it turns up somewhere silly',
      'has saved me many times',
    ],
  },
  {
    id: 'sp-264',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'How do you make a difficult decision?',
    sampleAnswers: [
      {
        label: 'Write It Down',
        answer:
          "I write down the options and, for each one, what's the best and worst thing that could happen. Seeing it on paper makes it less scary. Then I talk to one or two people I trust — not too many, or I get confused. And if I'm still stuck, I sleep on it. Usually I know the answer in the morning.",
      },
    ],
    usefulPhrases: [
      "what's the best and worst thing that could happen",
      'makes it less scary',
      'I sleep on it',
      'I know the answer in the morning',
    ],
  },
  {
    id: 'sp-265',
    topic: 'Problem Solving',
    difficulty: 'hard',
    question: 'Tell me about a time you had to deal with a difficult person.',
    sampleAnswers: [
      {
        label: 'Listening First',
        answer:
          'I once shared a flat with someone who complained about everything — the noise, the dishes, the temperature. At first I argued back, which made it worse. Then I tried just listening and asking what would actually help. It turned out she was very stressed about other things in her life. We made a few simple rules together, and things got much calmer. I learned that difficult people are often just people having a difficult time.',
      },
    ],
    usefulPhrases: [
      'At first I..., which made it worse',
      'It turned out...',
      'things got much calmer',
      'having a difficult time',
    ],
  },
  {
    id: 'sp-519',
    topic: 'Problem Solving',
    difficulty: 'easy',
    question: "What do you do when you can't fall asleep?",
    sampleAnswers: [
      {
        label: 'Get Up and Read',
        answer:
          "If I can't fall asleep after about twenty minutes, I get up instead of lying there getting frustrated. I usually make a cup of herbal tea and read a few pages of a book under a soft light. Nothing too exciting, otherwise I'll keep reading all night. After a while I start to feel sleepy, and then I go back to bed. It works much better than staring at the ceiling.",
      },
      {
        label: 'Short & Simple',
        answer:
          'I get up, drink some tea and read for a bit. Then I usually feel sleepy.',
      },
    ],
    usefulPhrases: [
      'instead of lying there getting frustrated',
      'nothing too exciting',
      'after a while I start to feel...',
      'staring at the ceiling',
    ],
  },
  {
    id: 'sp-520',
    topic: 'Problem Solving',
    difficulty: 'easy',
    question: "What do you do when you forget someone's name?",
    sampleAnswers: [
      {
        label: 'Buy Some Time',
        answer:
          "Oh, this happens to me all the time. Usually I try to buy some time by chatting and hoping their name comes up in the conversation. If someone else joins us, I'll introduce them and let the other person say their own name. But if that doesn't work, I just admit it. I say something like, I'm so sorry, I'm terrible with names. Most people are really understanding about it.",
      },
    ],
    usefulPhrases: [
      'this happens to me all the time',
      'buy some time',
      "if that doesn't work, I just admit it",
      "I'm terrible with names",
      'really understanding about it',
    ],
  },
  {
    id: 'sp-521',
    topic: 'Problem Solving',
    difficulty: 'easy',
    question: 'How do you remember all the things you need to do?',
    sampleAnswers: [
      {
        label: 'Lists Everywhere',
        answer:
          "I'm a big fan of lists. Every evening I write down the three most important things for the next day on a little piece of paper. If I try to keep everything in my head, I always forget something. I also stick notes on the front door for things like taking the rubbish out. It might look a bit messy, but it really works for me.",
      },
    ],
    usefulPhrases: [
      "I'm a big fan of...",
      'write down',
      'keep everything in my head',
      'it really works for me',
    ],
  },
  {
    id: 'sp-522',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'Tell me about a time you fixed something by yourself.',
    sampleAnswers: [
      {
        label: 'The Leaking Tap',
        answer:
          "Last year the kitchen tap started leaking, and I didn't want to pay someone to come and fix it. So I watched a few guides, turned off the water and took it apart. At first I put it back together the wrong way, and water sprayed everywhere. I had to laugh. On the second try, though, I replaced a tiny rubber ring and it stopped completely. It felt amazing to solve it on my own.",
      },
    ],
    usefulPhrases: [
      'started leaking',
      'took it apart',
      'put it back together the wrong way',
      'I had to laugh',
      'on the second try, though...',
    ],
  },
  {
    id: 'sp-523',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'Tell me about a time a plan went wrong at the last minute.',
    sampleAnswers: [
      {
        label: 'The Rained-Out Picnic',
        answer:
          "I once organised a birthday picnic for a friend in the park. I'd planned everything, the food, the games, the decorations. Then, an hour before, it started pouring with rain. I panicked for a minute, but then I called everyone and moved the whole thing to my flat. We ate on the living room floor like it was still a picnic. Honestly, it turned out even better, because it felt cosy and a bit silly.",
      },
    ],
    usefulPhrases: [
      'it started pouring with rain',
      'I panicked for a minute, but...',
      'moved the whole thing to...',
      'it turned out even better',
      'cosy and a bit silly',
    ],
  },
  {
    id: 'sp-524',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'Why do you think some people avoid dealing with problems?',
    sampleAnswers: [
      {
        label: "Fear of What They'll Find",
        answer:
          "I think a lot of the time it's fear. If you don't open the letter or have the difficult conversation, you can pretend the problem isn't real. I've done it myself, like ignoring a strange noise in my bike until the chain snapped. The trouble is that problems rarely disappear by themselves. They usually get bigger. Once you finally face them, they're often less scary than you imagined.",
      },
    ],
    usefulPhrases: [
      "a lot of the time it's...",
      "pretend the problem isn't real",
      "I've done it myself",
      'problems rarely disappear by themselves',
      'less scary than you imagined',
    ],
  },
  {
    id: 'sp-525',
    topic: 'Problem Solving',
    difficulty: 'medium',
    question: 'When a problem comes up, is it better to act quickly or take your time?',
    sampleAnswers: [
      {
        label: 'Pause First, Then Act',
        answer:
          "It really depends on the problem. If something's urgent, like a pan catching fire, obviously you act right away. But for most everyday problems, I've learned that a short pause helps. When I react too fast, I often make things worse, like sending an angry message I regret. Now I try to take a few minutes, calm down and think about my options. Usually the best solution becomes much clearer once I'm not in a hurry.",
      },
    ],
    usefulPhrases: [
      'it really depends on...',
      'act right away',
      'make things worse',
      'think about my options',
      "once I'm not in a hurry",
    ],
  },
  {
    id: 'sp-526',
    topic: 'Problem Solving',
    difficulty: 'hard',
    question: 'Do you think every problem has a solution?',
    sampleAnswers: [
      {
        label: 'Not a Solution, but a Response',
        answer:
          "I don't think every problem can be solved, but I do think every problem has a response. Some things, like losing someone or getting older, can't be fixed. What we can choose is how we deal with them. Sometimes the answer is acceptance rather than a solution. I find that quite freeing, actually. When I stop trying to fix something that can't be fixed, I have more energy for the things I can change.",
      },
    ],
    usefulPhrases: [
      "I don't think..., but I do think...",
      'acceptance rather than a solution',
      'I find that quite freeing',
      'the things I can change',
      "can't be fixed",
    ],
  },
  {
    id: 'sp-527',
    topic: 'Problem Solving',
    difficulty: 'hard',
    question: 'Do you think problems can sometimes turn out to be opportunities?',
    sampleAnswers: [
      {
        label: 'Blessings in Disguise',
        answer:
          "Absolutely, though usually only when you look back. A few years ago I had to move out of a flat I loved at very short notice. It felt like a disaster. But the new place was near a lake, I started swimming every morning, and I met some of my best friends there. Not every problem becomes an opportunity, of course. Still, I've learned to ask myself, what could this make possible, even when I'm upset.",
      },
    ],
    usefulPhrases: [
      'only when you look back',
      'at very short notice',
      'it felt like a disaster',
      'not every... of course',
      "I've learned to ask myself...",
    ],
  },
  {
    id: 'sp-528',
    topic: 'Problem Solving',
    difficulty: 'hard',
    question: 'How do you know when to give up on something and when to keep trying?',
    sampleAnswers: [
      {
        label: 'Listening to the Signs',
        answer:
          "That's a hard one. I think it's time to stop when you've tried several different approaches and nothing has changed, or when the cost to your health and happiness is bigger than the reward. Giving up has a bad reputation, but sometimes it's the brave choice. I kept going with piano lessons for years just because I didn't want to quit, and I was miserable. Letting go gave me time for things I actually loved.",
      },
    ],
    usefulPhrases: [
      "that's a hard one",
      'tried several different approaches',
      'the cost to... is bigger than the reward',
      'has a bad reputation',
      "sometimes it's the brave choice",
    ],
  },

  // ── What If ───────────────────────────────────────────
  {
    id: 'sp-173',
    topic: 'What If',
    difficulty: 'easy',
    question: 'If you could have any superpower, what would it be?',
    sampleAnswers: [
      {
        label: 'Teleporting',
        answer:
          "Teleportation, easily. I'd never sit in traffic again, I could have breakfast in Tokyo and dinner in Paris, and visiting my family would take one second. I think it's the most useful superpower for everyday life. Flying sounds fun, but it would be cold and windy. Invisibility is cool for about a day, but then what?",
      },
      {
        label: 'Short & Simple',
        answer:
          'Teleportation. No traffic, and I could visit any country for dinner.',
      },
    ],
    usefulPhrases: [
      '..., easily',
      "I'd never... again",
      'sounds fun, but...',
      'is cool for about a day, but then what?',
    ],
  },
  {
    id: 'sp-174',
    topic: 'What If',
    difficulty: 'easy',
    question: 'If you won a lot of money tomorrow, what would you do first?',
    sampleAnswers: [
      {
        label: 'Family First',
        answer:
          "The first thing I'd do is pay for my parents to renovate their house — the roof has been leaking for years. Then I'd put a big part in savings so I don't do anything silly. After that, honestly, I'd take a long trip, maybe three months around South America. I don't think I'd change my life completely; I'd just worry less about money.",
      },
    ],
    usefulPhrases: [
      "The first thing I'd do is...",
      "so I don't do anything silly",
      'After that, honestly...',
      "I'd just worry less about...",
    ],
  },
  {
    id: 'sp-175',
    topic: 'What If',
    difficulty: 'medium',
    question: 'If you could live in any time period, which would you choose?',
    sampleAnswers: [
      {
        label: 'Right Now, Actually',
        answer:
          "It's tempting to say something romantic, like Paris in the 1920s. But honestly, I'd choose now. In almost any earlier time, life was harder — less medicine, more danger, fewer chances for ordinary people. Today I can call my family across the world for free and read almost any book ever written. Maybe I'd visit the past for a week as a tourist, but I'd definitely want a return ticket.",
      },
    ],
    usefulPhrases: [
      "It's tempting to say...",
      "But honestly, I'd choose...",
      'In almost any earlier time...',
      "I'd definitely want a return ticket",
    ],
  },
  {
    id: 'sp-176',
    topic: 'What If',
    difficulty: 'medium',
    question: 'If you could have dinner with anyone, living or dead, who would it be?',
    sampleAnswers: [
      {
        label: 'My Great-Grandmother',
        answer:
          "I'd choose my great-grandmother. I never met her, but my family still tells stories about her — she raised six children mostly on her own through the war and opened a small noodle shop that kept everyone fed. I'd love to ask her how she stayed so strong, and what she'd think of our lives now. Famous people are interesting, but I think I'd learn more about myself from her.",
      },
    ],
    usefulPhrases: [
      "I'd choose...",
      'I never met her, but...',
      "I'd love to ask her...",
      "I think I'd learn more about...",
    ],
  },
  {
    id: 'sp-177',
    topic: 'What If',
    difficulty: 'hard',
    question: 'If you could change one thing about the world, what would it be?',
    sampleAnswers: [
      {
        label: 'Access to Education',
        answer:
          "It's a big question, but I'd choose giving every child a good education. So many other problems — poverty, health, even conflict — get better when people can read, think critically, and have more choices. Education doesn't fix everything overnight, but it's the thing that keeps paying back for generations. My own grandparents never finished primary school, and I can see how much my family's life changed just one generation later.",
      },
    ],
    usefulPhrases: [
      "It's a big question, but...",
      'get better when...',
      "doesn't fix everything overnight",
      'keeps paying back for generations',
    ],
  },
  {
    id: 'sp-178',
    topic: 'What If',
    difficulty: 'hard',
    question: 'If you had to live without your phone for a month, how would your life change?',
    sampleAnswers: [
      {
        label: 'Hard, Then Better',
        answer:
          "The first week would be really hard — I'd keep reaching for it out of habit, and I'd probably get lost a few times without maps. But I think after that I'd be happier. I'd read more, sleep better, and actually look around when I'm sitting in a cafe. The hardest part would be staying in touch with family, so I'd probably write letters, which my grandmother would love. Honestly, I'm a bit tempted to try it.",
      },
    ],
    usefulPhrases: [
      'The first week would be...',
      'out of habit',
      "I think after that I'd...",
      "I'm a bit tempted to try it",
    ],
  },
  {
    id: 'sp-266',
    topic: 'What If',
    difficulty: 'easy',
    question: 'If you could speak any language fluently tomorrow, which would you choose?',
    sampleAnswers: [
      {
        label: 'Japanese',
        answer:
          "Japanese, because it looks so hard to learn and I'd love to skip all that work! I'd also love to watch Japanese films and read manga without translations. And when I visit, I could actually talk to people instead of pointing at menus.",
      },
    ],
    usefulPhrases: [
      "I'd love to skip all that work",
      'without translations',
      'instead of pointing at menus',
    ],
  },
  {
    id: 'sp-267',
    topic: 'What If',
    difficulty: 'medium',
    question: 'If you could open any small business, what would it be?',
    sampleAnswers: [
      {
        label: 'A Bookshop Café',
        answer:
          "A small bookshop with a café inside. People could buy a coffee, sit in a comfy chair, and read for as long as they like. I'd host book clubs and language exchange evenings. I know it probably wouldn't make much money, but it would be the kind of place I'd want to spend every day in.",
      },
    ],
    usefulPhrases: [
      'for as long as they like',
      "I'd host...",
      "it probably wouldn't make much money, but...",
      "the kind of place I'd want to...",
    ],
  },
  {
    id: 'sp-268',
    topic: 'What If',
    difficulty: 'hard',
    question: 'If you could relive one day of your life, which day would you choose?',
    sampleAnswers: [
      {
        label: 'An Ordinary Good Day',
        answer:
          "I wouldn't choose a big event. I'd choose an ordinary Sunday from my childhood, when my whole family was at home, my grandparents were still healthy, and we spent the afternoon cooking together. Nothing special happened, but I'd love to notice it properly this time — the voices, the smells — because I didn't know then how precious it was.",
      },
    ],
    usefulPhrases: [
      "I wouldn't choose...",
      'Nothing special happened, but...',
      'notice it properly this time',
      "I didn't know then how precious it was",
    ],
  },
  {
    id: 'sp-529',
    topic: 'What If',
    difficulty: 'easy',
    question: 'If you could be any animal for a day, what would you be?',
    sampleAnswers: [
      {
        label: 'A Bird, Obviously',
        answer:
          "I'd be a bird, probably an eagle. I've always dreamed about flying, so just being able to soar over mountains and the sea would be incredible. I'd love to see everything from above and feel the wind. The only thing I wouldn't enjoy is eating raw fish or mice, so maybe I'd skip lunch that day!",
      },
      {
        label: 'Short & Simple',
        answer:
          "A bird, because I've always wanted to fly.",
      },
    ],
    usefulPhrases: [
      "I've always dreamed about...",
      'would be incredible',
      "I'd love to see...",
      "the only thing I wouldn't enjoy is...",
    ],
  },
  {
    id: 'sp-530',
    topic: 'What If',
    difficulty: 'easy',
    question: 'If you could only eat one food for a whole week, what would it be?',
    sampleAnswers: [
      {
        label: 'Noodle Soup Every Day',
        answer:
          "That's easy, it would be noodle soup. It's warm, filling, and you can change it every day by adding different vegetables, meat or spices, so I don't think I'd get bored. It's my comfort food, too. Whenever I'm tired or a bit sad, a big bowl of soup makes everything feel better. Ask me again after seven days, though, and I might have a different answer!",
      },
    ],
    usefulPhrases: [
      "that's easy, it would be...",
      "I don't think I'd get bored",
      "it's my comfort food",
      'ask me again after..., though',
    ],
  },
  {
    id: 'sp-531',
    topic: 'What If',
    difficulty: 'easy',
    question: 'If you could instantly play any musical instrument, which would you choose?',
    sampleAnswers: [
      {
        label: 'The Piano',
        answer:
          "I'd choose the piano without a doubt. It sounds beautiful on its own, and you can play almost any kind of music on it, from classical to pop. I tried to learn as a kid, but I gave up because practising scales was so boring. If I could just sit down and play, I'd fill the house with music every evening and probably annoy my neighbours a little.",
      },
    ],
    usefulPhrases: [
      'without a doubt',
      'on its own',
      'I gave up because...',
      "I'd fill the house with...",
      'annoy my neighbours a little',
    ],
  },
  {
    id: 'sp-532',
    topic: 'What If',
    difficulty: 'medium',
    question: 'If you could instantly become an expert in one skill, what would you choose?',
    sampleAnswers: [
      {
        label: 'Playing the Piano',
        answer:
          "I'd choose playing the piano. I've always loved the sound, but I know it takes years of practice to play well, and I've never had the patience. If I could suddenly play anything, I'd sit down at every piano I found — in hotels, train stations, at friends' homes. It's a skill that makes people happy, not just the person playing.",
      },
    ],
    usefulPhrases: [
      "I'd choose...",
      "I've never had the patience",
      "I'd sit down at every...",
      'not just the person...',
    ],
  },
  {
    id: 'sp-533',
    topic: 'What If',
    difficulty: 'medium',
    question: 'If you could spend just one day anywhere in the world, where would you go?',
    sampleAnswers: [
      {
        label: 'Somewhere With Northern Lights',
        answer:
          "I'd go somewhere really far north to see the northern lights. I've seen photos, but I've heard that in real life they're completely different, like the sky is moving. Since I'd only have one day, I wouldn't waste time shopping or sightseeing. I'd find a quiet spot away from the lights of town, wrap up warm and just wait. Even if it was freezing, I think it would be worth it.",
      },
    ],
    usefulPhrases: [
      "I've heard that...",
      "I wouldn't waste time...",
      'wrap up warm',
      'it would be worth it',
      "since I'd only have one day",
    ],
  },
  {
    id: 'sp-534',
    topic: 'What If',
    difficulty: 'medium',
    question: 'If you could meet your younger self, what advice would you give?',
    sampleAnswers: [
      {
        label: 'Stop Worrying So Much',
        answer:
          "I'd tell my younger self to stop worrying so much about what other people think. As a teenager, I didn't try lots of things because I was scared of looking silly, like joining the drama club or singing. Looking back, nobody was really paying attention to me anyway. I'd also say, be nicer to your parents, because they were doing their best. I think my younger self would roll their eyes, but maybe they'd listen.",
      },
    ],
    usefulPhrases: [
      'stop worrying so much about...',
      'scared of looking silly',
      'looking back,...',
      'they were doing their best',
      'roll their eyes',
    ],
  },
  {
    id: 'sp-535',
    topic: 'What If',
    difficulty: 'medium',
    question: 'If you could only keep three things you own, what would they be?',
    sampleAnswers: [
      {
        label: 'Photos, a Jacket and a Notebook',
        answer:
          "First, I'd keep my box of old family photos, because those can never be replaced. Second, probably my warm winter jacket. It's not exciting, but it's practical and I've had it for years. And third, my notebook where I write down ideas and memories. It's interesting, because when I think about it, the things I'd keep are about memories rather than money. Most of my stuff I wouldn't really miss.",
      },
    ],
    usefulPhrases: [
      'can never be replaced',
      "it's not exciting, but it's practical",
      'when I think about it,...',
      'about memories rather than money',
      "I wouldn't really miss",
    ],
  },
  {
    id: 'sp-536',
    topic: 'What If',
    difficulty: 'hard',
    question: 'If nobody could tell a lie for a whole day, what do you think would happen?',
    sampleAnswers: [
      {
        label: 'Chaos, Then Relief',
        answer:
          "I think the morning would be total chaos. People would hear what friends really think of their cooking or their haircut, and there'd be a lot of hurt feelings. But by the evening, I imagine something interesting might happen. People might feel relieved, because they wouldn't have to pretend. Some honest conversations that people have avoided for years would finally happen. Still, I'm glad it would only be one day. A little bit of kindness sometimes needs a white lie.",
      },
    ],
    usefulPhrases: [
      'total chaos',
      "there'd be a lot of hurt feelings",
      'I imagine something interesting might happen',
      "they wouldn't have to pretend",
      'a white lie',
    ],
  },
  {
    id: 'sp-537',
    topic: 'What If',
    difficulty: 'hard',
    question: 'If you knew you could not fail, what would you try?',
    sampleAnswers: [
      {
        label: 'Writing a Novel',
        answer:
          "I'd write a novel. I've had a story in my head for years, but every time I start, I think it won't be good enough and stop. If I knew it would definitely work out, I'd sit down and write every day. What's interesting about this question is that it shows how much fear holds us back. The thing stopping me isn't time or ability, it's the risk of being disappointed. Maybe I should just start anyway.",
      },
    ],
    usefulPhrases: [
      "I've had... in my head for years",
      "it won't be good enough",
      'how much fear holds us back',
      "the thing stopping me isn't..., it's...",
      'just start anyway',
    ],
  },
  {
    id: 'sp-538',
    topic: 'What If',
    difficulty: 'hard',
    question: 'If people regularly lived to 150, how would society change?',
    sampleAnswers: [
      {
        label: 'A Very Different Life Plan',
        answer:
          "I think almost everything would change. People might study several times in their lives and completely reinvent themselves in their sixties or seventies. Families would be huge, with five generations alive at once. On the other hand, there'd be serious challenges, like where everyone would live and how we'd look after so many older people. Personally, I'm not sure I'd want to live that long unless I stayed healthy. A long life only matters if it's a good one.",
      },
    ],
    usefulPhrases: [
      'completely reinvent themselves',
      "on the other hand, there'd be...",
      'serious challenges',
      "personally, I'm not sure I'd want to...",
      'only matters if...',
    ],
  },

  // ── Society & Community ───────────────────────────────
  {
    id: 'sp-238',
    topic: 'Society & Community',
    difficulty: 'easy',
    question: 'Have you ever done volunteer work?',
    sampleAnswers: [
      {
        label: 'Cleaning the Beach',
        answer:
          "Yes, a few times. The one I remember most was a beach clean-up on a Sunday morning. About fifty people came, and in three hours we filled more than a hundred bags with plastic. It was tiring but really satisfying, and I met some lovely people. I'd like to volunteer more regularly, maybe once a month.",
      },
    ],
    usefulPhrases: [
      'The one I remember most was...',
      'tiring but really satisfying',
      'I met some lovely people',
      'more regularly',
    ],
  },
  {
    id: 'sp-239',
    topic: 'Society & Community',
    difficulty: 'medium',
    question: 'What makes a good neighbour?',
    sampleAnswers: [
      {
        label: 'Friendly but Respectful',
        answer:
          "A good neighbour is friendly but respects your privacy. They say hello, help if you need something, and keep an eye on your home when you're away. But they don't make too much noise late at night or ask too many personal questions. I think it's about balance — being there when needed, and giving space when not.",
      },
    ],
    usefulPhrases: [
      'keep an eye on...',
      'respects your privacy',
      "it's about balance",
      'giving space',
    ],
  },
  {
    id: 'sp-240',
    topic: 'Society & Community',
    difficulty: 'medium',
    question: 'How do people in your community help each other?',
    sampleAnswers: [
      {
        label: 'Small, Practical Help',
        answer:
          "Mostly in small, practical ways. When someone is sick, neighbours bring food. When a family has a wedding or a funeral, people help with cooking and setting up. There's also a group chat for the street where people share things like 'Does anyone have a ladder?' It's not organised, but it works surprisingly well.",
      },
    ],
    usefulPhrases: [
      'Mostly in small, practical ways.',
      'help with...',
      "It's not organised, but...",
      'works surprisingly well',
    ],
  },
  {
    id: 'sp-241',
    topic: 'Society & Community',
    difficulty: 'hard',
    question: 'Should older people live with their families or in care homes?',
    sampleAnswers: [
      {
        label: 'It Depends on the Family',
        answer:
          "In many cultures, living with family is expected, and it can be wonderful — grandparents help raise children and nobody is lonely. But it can also be very hard when someone needs medical care that the family can't give. I don't think there's one right answer. What matters most is that older people feel respected, safe, and connected, wherever they live.",
      },
    ],
    usefulPhrases: [
      'is expected',
      'it can also be very hard when...',
      "I don't think there's one right answer",
      'What matters most is...',
    ],
  },
  {
    id: 'sp-242',
    topic: 'Society & Community',
    difficulty: 'hard',
    question: 'What is one problem in society that you would like to see solved?',
    sampleAnswers: [
      {
        label: 'Loneliness',
        answer:
          "Loneliness. It doesn't get as much attention as poverty or crime, but it affects so many people — older people living alone, young people who've moved to a new city, even people surrounded by others online. It's bad for both mental and physical health. I'd love to see more community spaces, clubs, and events that make it easy for strangers to connect.",
      },
    ],
    usefulPhrases: [
      "It doesn't get as much attention as...",
      'it affects so many people',
      "It's bad for both... and...",
      'make it easy for...',
    ],
  },
  {
    id: 'sp-539',
    topic: 'Society & Community',
    difficulty: 'easy',
    question: "What's your favourite place in your neighbourhood?",
    sampleAnswers: [
      {
        label: 'The Little Bakery',
        answer:
          "My favourite place is a small bakery on the corner of my street. The owner knows everyone by name, and the smell of fresh bread in the morning is amazing. I usually stop there on Saturdays to buy something sweet and have a quick chat. It's not fancy, but it feels like the heart of the neighbourhood. Everyone ends up there at some point.",
      },
      {
        label: 'Short & Simple',
        answer:
          'A small bakery near my home. The owner is really friendly.',
      },
    ],
    usefulPhrases: [
      'on the corner of my street',
      'knows everyone by name',
      'have a quick chat',
      "it's not fancy, but...",
      'the heart of the neighbourhood',
    ],
  },
  {
    id: 'sp-540',
    topic: 'Society & Community',
    difficulty: 'easy',
    question: 'Do you know many of your neighbours?',
    sampleAnswers: [
      {
        label: 'Just a Few',
        answer:
          "To be honest, I only know a few of them. There's an older lady next door who always waves and sometimes gives me fruit from her garden, and a family upstairs with two noisy kids. We say hello in the stairs, but we don't really spend time together. I'd actually like to know them better. Maybe I should bake something and knock on a few doors.",
      },
    ],
    usefulPhrases: [
      'to be honest, I only know...',
      'we say hello',
      "we don't really spend time together",
      "I'd actually like to...",
      'knock on a few doors',
    ],
  },
  {
    id: 'sp-541',
    topic: 'Society & Community',
    difficulty: 'easy',
    question: 'What local events or festivals do you enjoy?',
    sampleAnswers: [
      {
        label: 'The Night Market',
        answer:
          "My favourite is the night market that happens every summer weekend. The whole street is closed to cars, and it fills up with food stalls, music and people selling handmade things. I love just wandering around with friends, trying different snacks and listening to local bands. It's always crowded, but the atmosphere is so lively and friendly that I don't mind.",
      },
    ],
    usefulPhrases: [
      'it fills up with...',
      'wandering around with friends',
      'the atmosphere is so lively',
      "I don't mind",
      'closed to cars',
    ],
  },
  {
    id: 'sp-542',
    topic: 'Society & Community',
    difficulty: 'medium',
    question: 'How has your neighbourhood changed over the years?',
    sampleAnswers: [
      {
        label: 'Busier and Newer',
        answer:
          "It's changed quite a lot. When I was a kid, it was mostly small houses and there was a big empty field where we played football. Now there are blocks of flats, a supermarket and a lot more traffic. Some changes are good, like the new park and better buses. But I miss the old field, and it feels like people don't know each other as well as they used to. It's more convenient, but a bit less personal.",
      },
    ],
    usefulPhrases: [
      "it's changed quite a lot",
      'when I was a kid,...',
      'a lot more traffic',
      "don't know each other as well as they used to",
      'more convenient, but a bit less personal',
    ],
  },
  {
    id: 'sp-543',
    topic: 'Society & Community',
    difficulty: 'medium',
    question: 'Why do you think some people feel lonely even when they live in a busy place?',
    sampleAnswers: [
      {
        label: 'Surrounded but Alone',
        answer:
          "I think being around people and feeling connected to them are two very different things. In a busy area, everyone's rushing, and you can go a whole day without a real conversation. People also tend to keep to themselves because they assume others are too busy. I felt like this when I first moved to a bigger town. It only got better when I joined a weekly running group and started seeing the same faces regularly.",
      },
    ],
    usefulPhrases: [
      'two very different things',
      'go a whole day without...',
      'keep to themselves',
      'it only got better when...',
      'seeing the same faces regularly',
    ],
  },
  {
    id: 'sp-544',
    topic: 'Society & Community',
    difficulty: 'medium',
    question: 'What do you think makes people trust each other in a community?',
    sampleAnswers: [
      {
        label: 'Small Repeated Actions',
        answer:
          "I think trust comes from small things repeated over time. When the same neighbours say hello every morning, return what they borrow, and help when someone's in trouble, people slowly start to rely on each other. Shared spaces help too — a market, a park, a community event — places where you see the same faces again and again. Trust is hard to build quickly but very easy to lose.",
      },
    ],
    usefulPhrases: [
      'comes from small things repeated over time',
      'start to rely on each other',
      'the same faces again and again',
      'hard to build quickly but very easy to lose',
    ],
  },
  {
    id: 'sp-545',
    topic: 'Society & Community',
    difficulty: 'medium',
    question: 'Why are public spaces like parks and libraries important?',
    sampleAnswers: [
      {
        label: 'Places for Everyone',
        answer:
          "They're one of the few places where everyone is welcome and you don't have to spend money. In a café you're expected to buy something, but in a park or a library anyone can just sit, read, or meet friends. That's especially important for families without much money, older people living alone, and students. They also bring people from different backgrounds together, which I think makes a community feel more connected.",
      },
    ],
    usefulPhrases: [
      'one of the few places where...',
      "you don't have to spend money",
      "you're expected to...",
      'especially important for...',
      'from different backgrounds',
    ],
  },
  {
    id: 'sp-546',
    topic: 'Society & Community',
    difficulty: 'hard',
    question: 'What responsibilities do we have toward people we will never meet?',
    sampleAnswers: [
      {
        label: 'Small Choices, Wide Effects',
        answer:
          "I believe we have more than we usually think. Lots of our everyday choices, like what we buy, how much we waste, or whether we pick up litter, affect people we'll never see. We can't solve every problem in the world, of course. But I think we have a basic responsibility not to make life harder for others and, where we can, to make it a bit easier. Being decent shouldn't only apply to people we know personally.",
      },
    ],
    usefulPhrases: [
      'more than we usually think',
      "affect people we'll never see",
      "we can't solve every problem, of course",
      'where we can,...',
      "shouldn't only apply to...",
    ],
  },
  {
    id: 'sp-547',
    topic: 'Society & Community',
    difficulty: 'hard',
    question: 'Do you think people today feel less connected to their communities than in the past?',
    sampleAnswers: [
      {
        label: 'Connected Differently',
        answer:
          "In some ways, yes. People move more often, and many of us don't stay in one place long enough to put down roots. In the past, you'd see the same neighbours for decades. However, I'm not sure it's simply worse. People now build communities around shared interests, like sports clubs or choirs, rather than just where they live. So maybe we're not less connected, just connected differently. Still, I think we've lost something by not knowing the people right next door.",
      },
    ],
    usefulPhrases: [
      'in some ways, yes',
      'put down roots',
      "I'm not sure it's simply worse",
      'around shared interests',
      "we've lost something by...",
    ],
  },
  {
    id: 'sp-548',
    topic: 'Society & Community',
    difficulty: 'hard',
    question: 'How should a community balance keeping its traditions with accepting change?',
    sampleAnswers: [
      {
        label: 'Keep the Meaning, Update the Form',
        answer:
          "I think the key is to keep the meaning of a tradition while being flexible about the form. For example, a festival might have started as a way to bring families together after the harvest. Even if hardly anyone farms now, the idea of gathering together still matters. Problems start when people hold on to traditions that exclude others, or when they throw everything away just because it's old. A healthy community asks why a tradition exists before deciding to keep or change it.",
      },
    ],
    usefulPhrases: [
      'the key is to...',
      'flexible about the form',
      'still matters',
      'problems start when...',
      'hold on to traditions',
    ],
  },

  // ── Languages & Communication ─────────────────────────
  {
    id: 'sp-243',
    topic: 'Languages & Communication',
    difficulty: 'easy',
    question: 'Why are you learning English?',
    sampleAnswers: [
      {
        label: 'To Connect',
        answer:
          "Mainly to connect with more people. English lets me talk to travellers, understand films without subtitles, and read things that aren't translated. I also just enjoy the feeling of improving — understanding a joke or a song I couldn't understand a year ago is really rewarding.",
      },
      {
        label: 'Short & Simple',
        answer:
          'To talk with more people and enjoy films and books in English.',
      },
    ],
    usefulPhrases: [
      'Mainly to...',
      'without subtitles',
      'I also just enjoy...',
      'is really rewarding',
    ],
  },
  {
    id: 'sp-244',
    topic: 'Languages & Communication',
    difficulty: 'easy',
    question: 'What other language would you like to learn?',
    sampleAnswers: [
      {
        label: 'Spanish',
        answer:
          "Spanish, I think. It's spoken in so many countries, and it sounds warm and fun. I'd love to travel around South America one day and be able to chat with people, not just order food. I've heard it's easier than many languages for beginners, which is a nice bonus.",
      },
    ],
    usefulPhrases: [
      "It's spoken in so many countries",
      'not just...',
      "I've heard it's...",
      'a nice bonus',
    ],
  },
  {
    id: 'sp-245',
    topic: 'Languages & Communication',
    difficulty: 'medium',
    question: 'What is the hardest part of learning a new language?',
    sampleAnswers: [
      {
        label: 'Speaking Without Fear',
        answer:
          "For me it's speaking without being afraid of mistakes. I can understand a lot and even write quite well, but when I have to speak, I worry about sounding silly and my mind goes blank. The only cure I've found is practice — lots of small, low-pressure conversations until it starts to feel normal.",
      },
    ],
    usefulPhrases: [
      "For me it's...",
      'my mind goes blank',
      "The only cure I've found is...",
      'until it starts to feel normal',
    ],
  },
  {
    id: 'sp-246',
    topic: 'Languages & Communication',
    difficulty: 'medium',
    question: 'Do you prefer texting or talking on the phone?',
    sampleAnswers: [
      {
        label: 'Texting, Mostly',
        answer:
          "Mostly texting, because I can answer when it suits me and think about what I want to say. But for anything important or emotional, I prefer a call — or better, meeting in person. Text messages are easy to misunderstand because you can't hear someone's tone. A two-minute call can solve what twenty messages can't.",
      },
    ],
    usefulPhrases: [
      'when it suits me',
      'for anything important',
      'easy to misunderstand',
      "can solve what... can't",
    ],
  },
  {
    id: 'sp-247',
    topic: 'Languages & Communication',
    difficulty: 'hard',
    question: 'Will people still need to learn foreign languages in the future?',
    sampleAnswers: [
      {
        label: 'Yes, for Connection',
        answer:
          "I think so. Translation tools will get better and make simple things like ordering food very easy. But learning a language isn't only about exchanging information. It changes how you think, lets you understand jokes and culture, and shows respect to the people you're talking to. A conversation through a translator is never quite the same as one where you really understand each other.",
      },
    ],
    usefulPhrases: [
      "isn't only about...",
      'It changes how you think',
      'shows respect to...',
      'is never quite the same as...',
    ],
  },
  {
    id: 'sp-549',
    topic: 'Languages & Communication',
    difficulty: 'easy',
    question: "What's your favourite word in English, and why?",
    sampleAnswers: [
      {
        label: 'Cosy',
        answer:
          "My favourite word is cosy. I love how it sounds, soft and warm, just like its meaning. It makes me think of a blanket, a cup of tea and rain outside the window. In my own language, there isn't one word that describes that feeling so perfectly. I use it all the time now, sometimes too much!",
      },
      {
        label: 'Short & Simple',
        answer:
          'Cosy. It sounds warm and soft, like a blanket and a cup of tea.',
      },
    ],
    usefulPhrases: [
      'my favourite word is...',
      'I love how it sounds',
      'it makes me think of...',
      "there isn't one word that...",
      'I use it all the time',
    ],
  },
  {
    id: 'sp-550',
    topic: 'Languages & Communication',
    difficulty: 'easy',
    question: 'How do you practise English in your daily life?',
    sampleAnswers: [
      {
        label: 'Little and Often',
        answer:
          "I try to practise a little every day. In the morning I listen to an English podcast while I'm getting ready, and in the evening I watch a series with English subtitles. I also talk to myself in English sometimes, which probably sounds strange, but it really helps me think faster. At the weekend I meet a friend and we try to speak only English for an hour.",
      },
    ],
    usefulPhrases: [
      'a little every day',
      "while I'm getting ready",
      'which probably sounds strange, but...',
      'it really helps me...',
    ],
  },
  {
    id: 'sp-551',
    topic: 'Languages & Communication',
    difficulty: 'easy',
    question: 'Are you more of a talker or a listener?',
    sampleAnswers: [
      {
        label: 'Mostly a Listener',
        answer:
          "I'm mostly a listener. In a group, I usually let other people do most of the talking, and I jump in when I've got something useful to say. My friends often come to me when they need to talk about a problem, because they know I won't interrupt. But with close friends I can be really chatty. I suppose it depends on how comfortable I feel.",
      },
    ],
    usefulPhrases: [
      "I'm mostly a...",
      'do most of the talking',
      'I jump in when...',
      "I won't interrupt",
      'it depends on how comfortable I feel',
    ],
  },
  {
    id: 'sp-552',
    topic: 'Languages & Communication',
    difficulty: 'medium',
    question: 'Tell me about a misunderstanding caused by language.',
    sampleAnswers: [
      {
        label: 'The Embarrassing Mix-up',
        answer:
          "When I'd just started learning English, I was at a dinner and wanted to say I was full. But I accidentally said something that sounded completely different, and everyone burst out laughing. I went bright red. Luckily, someone kindly explained my mistake, and now it's a funny story I tell. It taught me that mistakes like that are part of learning, and that most people are much more patient than you expect.",
      },
    ],
    usefulPhrases: [
      "when I'd just started learning...",
      'everyone burst out laughing',
      'I went bright red',
      "it's a funny story I tell",
      'much more patient than you expect',
    ],
  },
  {
    id: 'sp-553',
    topic: 'Languages & Communication',
    difficulty: 'medium',
    question: 'Why is it often easier to write in another language than to speak it?',
    sampleAnswers: [
      {
        label: 'Time to Think',
        answer:
          "Mainly because writing gives you time. When I write, I can stop, check a word, and fix my grammar before anyone sees it. Speaking happens in real time, so you have to think, choose your words and pronounce them all at once. On top of that, there's the pressure of someone looking at you. That's why I sometimes freeze in conversations, even though I can write a pretty good email or essay.",
      },
    ],
    usefulPhrases: [
      'mainly because...',
      'in real time',
      'all at once',
      'on top of that,...',
      'I sometimes freeze',
    ],
  },
  {
    id: 'sp-554',
    topic: 'Languages & Communication',
    difficulty: 'medium',
    question: 'How important is body language when you communicate?',
    sampleAnswers: [
      {
        label: 'More Than Words',
        answer:
          "I think it's incredibly important, maybe even more than the words. You can say something nice, but if you're crossing your arms and not looking at the person, they won't believe you. When I'm speaking English and I can't find a word, I use my hands and face a lot, and people usually understand. I've also noticed that gestures don't mean the same thing everywhere, so I try to watch how others do it before copying.",
      },
    ],
    usefulPhrases: [
      "it's incredibly important",
      'maybe even more than...',
      "I can't find a word",
      "don't mean the same thing everywhere",
      "I've also noticed that...",
    ],
  },
  {
    id: 'sp-555',
    topic: 'Languages & Communication',
    difficulty: 'medium',
    question: 'Is it more important to speak correctly or to speak confidently?',
    sampleAnswers: [
      {
        label: 'Confidence First',
        answer:
          "For me, confidence comes first, especially at the beginning. If you're too worried about making mistakes, you just won't speak, and then you'll never improve. I used to plan every sentence in my head and the conversation would move on before I said anything. Accuracy still matters, of course, but it comes with practice. Once you're comfortable speaking, you can start polishing the details.",
      },
    ],
    usefulPhrases: [
      'confidence comes first',
      "you'll never improve",
      'the conversation would move on',
      'it comes with practice',
      'polishing the details',
    ],
  },
  {
    id: 'sp-556',
    topic: 'Languages & Communication',
    difficulty: 'hard',
    question: 'Do you think speaking another language changes how you think or feel?',
    sampleAnswers: [
      {
        label: 'A Slightly Different Me',
        answer:
          "I genuinely think it does. When I speak English, I feel a bit more direct and maybe more relaxed, partly because I don't carry the same social rules I have in my first language. Some emotions are also easier to express in a second language, because the words feel less heavy. It's not that I become a different person, but I definitely notice a slightly different side of myself. It's one of the most interesting parts of learning a language.",
      },
    ],
    usefulPhrases: [
      'I genuinely think it does',
      'partly because...',
      'the words feel less heavy',
      "it's not that..., but...",
      'a slightly different side of myself',
    ],
  },
  {
    id: 'sp-557',
    topic: 'Languages & Communication',
    difficulty: 'hard',
    question: 'What do you think is lost when a language disappears?',
    sampleAnswers: [
      {
        label: 'A Whole Way of Seeing',
        answer:
          "I think we lose much more than just words. A language carries stories, songs, jokes and a whole way of understanding the world. Some languages have words for things that others can't describe at all, like particular kinds of weather or family relationships. When the last speakers are gone, that knowledge often disappears with them. It's a bit like losing a library that was never written down. That's why I admire people who work to record and teach endangered languages.",
      },
    ],
    usefulPhrases: [
      'much more than just words',
      'a whole way of understanding the world',
      'disappears with them',
      "it's a bit like losing...",
      'I admire people who...',
    ],
  },
  {
    id: 'sp-558',
    topic: 'Languages & Communication',
    difficulty: 'hard',
    question: 'Should learners try to lose their accent, or is it part of who they are?',
    sampleAnswers: [
      {
        label: 'Clear, Not Perfect',
        answer:
          "Personally, I don't think the goal should be to sound like a native speaker. An accent tells people where you come from, and there's nothing wrong with that. What really matters is being easy to understand. So if part of my accent makes certain words confusing, I'll work on those sounds. But I'm not going to spend years trying to hide it completely. Lots of brilliant speakers have strong accents, and nobody thinks less of them.",
      },
    ],
    usefulPhrases: [
      "I don't think the goal should be...",
      "there's nothing wrong with that",
      'what really matters is...',
      "I'll work on those sounds",
      'nobody thinks less of them',
    ],
  },
];
