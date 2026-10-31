// Content for the Listening page (src/components/EnglishListeningPage.tsx).
// `podcasts`/`podcastTopics` used to live in englishPodcasts.ts, sitting under
// Speak — moved here because listening to a script and picking it apart is a
// listening exercise, not a speaking one. Mirrors englishSpeaking.ts /
// englishIelts.ts / englishDialogues.ts in shape: a flat array of items plus
// a `topics` tuple used to build filter pills. Not a table, not user-created:
// no id collisions with anything server-side, and nothing here is written by
// a user, so there's no edge function backing it — see ieltsWriting.ts for
// the same reasoning applied to Writing prompts.

/* ─── Podcast: script + audio, read and picked apart ────────────── */
export interface Podcast {
  id: string;
  title: string;
  topic: string;
  description: string;
  duration: string; // e.g. "12 min"
  level: 'Intermediate' | 'Upper-Intermediate' | 'Advanced';
  script: string;
  vocabulary?: { word: string; definition: string }[];
  discussionQuestions?: string[];
}

export const podcastTopics = [
  'Technology',
  'Culture & Society',
  'Science',
  'Business',
  'Psychology',
  'Environment',
  'Health',
  'History',
] as const;

export const podcasts: Podcast[] = [
  {
    id: 'pod-1',
    title: 'Why We Procrastinate — And How to Stop',
    topic: 'Psychology',
    description: 'Exploring the science behind procrastination, why our brains prefer instant gratification, and practical strategies to overcome it.',
    duration: '12 min',
    level: 'Intermediate',
    script: `Have you ever sat down to work on something important, only to find yourself scrolling through your phone thirty minutes later? If so, you're not alone. Procrastination is one of the most universal human experiences, and yet most of us don't really understand why we do it.

Let's start with a common misconception. Many people think procrastination is about laziness or poor time management. But research shows it's actually an emotional regulation problem. When we face a task that makes us feel anxious, bored, or overwhelmed, our brain looks for an escape. It wants to feel better right now, so it pushes us toward something more pleasant — checking social media, watching a video, or making another cup of coffee.

Doctor Timothy Pychyl, a professor at Carleton University in Canada, has spent decades studying procrastination. He describes it as "giving in to feel good." Our present self prioritizes immediate mood repair over our future self's goals. It's not that we don't know what we should be doing — we just don't feel like doing it.

This is where it gets interesting. The part of our brain responsible for this behavior is the amygdala, which processes emotions and triggers our fight-or-flight response. When we encounter a difficult task, the amygdala can perceive it as a threat. Our prefrontal cortex — the rational, planning part of our brain — is supposed to override this impulse. But when we're tired, stressed, or feeling low, the prefrontal cortex loses the battle.

So what can we actually do about it? Let's talk about some strategies that are backed by science.

The first strategy is called the "two-minute rule." If a task takes less than two minutes, do it immediately. This comes from David Allen's Getting Things Done methodology. The idea is simple: by completing small tasks right away, you reduce the mental load of having them on your to-do list. And once you start doing things, momentum builds naturally.

The second strategy is to break large tasks into tiny, specific actions. Instead of "write the report," try "open the document and write the first paragraph." Our brains are much better at handling concrete, small steps than vague, large goals. This reduces the feeling of being overwhelmed, which is one of the main triggers for procrastination.

The third approach is something called "implementation intentions." This means deciding in advance exactly when and where you'll do something. For example, "After I finish lunch, I'll sit at my desk and work on the presentation for thirty minutes." Research by Peter Gollwitzer shows that people who form implementation intentions are significantly more likely to follow through on their goals.

Another powerful technique is to forgive yourself for past procrastination. This might sound strange, but studies show that self-forgiveness actually reduces future procrastination. When we feel guilty about procrastinating, that guilt becomes another negative emotion we want to escape — which leads to more procrastination. It's a vicious cycle. Breaking it with self-compassion is surprisingly effective.

Now, let's talk about the role of technology. Our devices are literally designed to capture our attention. Social media platforms use variable reward schedules — the same psychological mechanism that makes slot machines addictive. Every time you check your phone, there might be something exciting, or there might not. That uncertainty keeps you checking again and again.

To combat this, many people find it helpful to use website blockers during work hours, keep their phone in another room, or use apps that track their screen time. Some people even use a separate "work" phone with no social media installed. The key is to make the tempting alternative harder to access while making the productive choice easier.

There's also the concept of "temptation bundling," developed by researcher Katy Milkman. The idea is to pair something you need to do with something you enjoy. For example, only listen to your favorite podcast while exercising, or only drink your favorite coffee while working on a challenging project. This creates a positive association with the task you've been avoiding.

Let's also consider the environment. Our physical surroundings have a huge impact on our behavior. If you always procrastinate at your home desk, try working at a library or a café. Sometimes a change of scenery is all it takes to break the cycle. Keep your workspace clean and organized — clutter can increase stress and make it harder to focus.

One last thing worth mentioning is the difference between procrastination and strategic delay. Sometimes, waiting to start a task is actually the right decision. Maybe you need more information, or maybe the deadline is far away and you have more urgent priorities. The key difference is intentionality. If you're consciously choosing to delay something for a good reason, that's planning. If you're avoiding it because it makes you uncomfortable, that's procrastination.

To wrap up, remember that procrastination is deeply human. Even the most productive people procrastinate sometimes. The goal isn't to eliminate it completely — that's unrealistic. Instead, aim to recognize when it's happening, understand why, and have a toolkit of strategies ready to get yourself back on track.

The next time you catch yourself avoiding an important task, try this: acknowledge the discomfort, remind yourself that starting is the hardest part, and commit to working on it for just five minutes. More often than not, once you start, you'll keep going. That first step is everything.`,
    vocabulary: [
      { word: 'procrastination', definition: 'The action of delaying or postponing something' },
      { word: 'amygdala', definition: 'A part of the brain that processes emotions, especially fear' },
      { word: 'prefrontal cortex', definition: 'The front part of the brain responsible for planning and decision-making' },
      { word: 'implementation intentions', definition: 'Specific plans about when, where, and how to perform a behavior' },
      { word: 'temptation bundling', definition: 'Pairing a pleasurable activity with a beneficial one' },
      { word: 'variable reward schedule', definition: 'Unpredictable timing of rewards that increases addictive behavior' },
    ],
    discussionQuestions: [
      'What tasks do you procrastinate on the most? Why do you think that is?',
      'Which strategy from the podcast do you think would work best for you?',
      'Do you think technology makes procrastination worse? How do you manage distractions?',
      'Have you ever experienced "strategic delay" that turned out to be the right choice?',
    ],
  },
  {
    id: 'pod-2',
    title: 'The Rise of Remote Work — Is the Office Dead?',
    topic: 'Business',
    description: 'How the pandemic transformed work culture, the debate between remote and office work, and what the future of work might look like.',
    duration: '14 min',
    level: 'Intermediate',
    script: `If you'd told someone in 2019 that within a year, millions of office workers around the world would be working from their bedrooms, kitchens, and living rooms, they probably wouldn't have believed you. But that's exactly what happened. The COVID-19 pandemic forced one of the biggest experiments in work history, and the results have been fascinating.

Before the pandemic, remote work was a niche arrangement. About 5 percent of full-time employees in the United States worked from home. By April 2020, that number had jumped to over 60 percent. And here's the interesting part — even after offices reopened, many workers didn't want to go back. A survey by McKinsey found that 87 percent of workers offered flexible work arrangements chose to take them.

So what happened? Did we discover that remote work is simply better? Well, it's complicated.

Let's look at the arguments in favor of remote work first. The most obvious benefit is the elimination of commuting. The average American spends about 27 minutes each way commuting to work. That's nearly an hour a day, five hours a week, spent sitting in traffic or on a crowded train. When you work from home, you get that time back. You can use it to exercise, spend time with family, or simply sleep a bit longer.

Remote work also offers more flexibility. Parents can adjust their schedules around school pickups. People can work during their most productive hours, whether that's early morning or late at night. And for people with disabilities or chronic health conditions, working from home can remove significant barriers.

From a business perspective, companies discovered that remote work could actually save money. Less office space means lower rent, utilities, and maintenance costs. Tech companies in Silicon Valley, where office space is incredibly expensive, were some of the first to embrace permanent remote or hybrid policies.

But it's not all positive. One of the biggest challenges of remote work is isolation. Humans are social creatures, and for many people, the office provided a sense of community and belonging. Water cooler conversations, lunch with colleagues, the energy of a busy office — these things matter more than we realized.

There's also the "always on" problem. When your home is your office, it can be hard to disconnect. Many remote workers report working longer hours than they did in the office, and the boundary between work life and personal life becomes blurred. Burnout rates actually increased during the pandemic, partly because people couldn't turn off work mode.

Collaboration is another concern. While video calls and chat tools like Slack and Teams have improved dramatically, they still can't fully replicate the experience of being in the same room. Brainstorming sessions, spontaneous conversations that lead to new ideas, mentoring junior employees — these things are harder to do through a screen.

Let's talk about the hybrid model, which many companies have settled on as a compromise. In a hybrid arrangement, employees might come to the office two or three days a week and work from home the rest of the time. Companies like Google, Microsoft, and Apple have all adopted some version of this approach.

The hybrid model tries to give workers the best of both worlds — the focus and flexibility of home with the collaboration and social connection of the office. But it comes with its own challenges. Scheduling can be complicated. If half the team is in the office on Monday and the other half on Wednesday, you lose the benefit of in-person collaboration. Some companies have solved this by designating specific "anchor days" when everyone comes in.

There's also the question of fairness. Research suggests that remote workers are sometimes overlooked for promotions compared to their in-office peers. This is known as "proximity bias" — the tendency to favor people who are physically present. It's an unconscious bias, but it can have real career consequences. Companies need to actively work to ensure that remote employees are evaluated fairly.

Now, let's consider the global implications. Remote work has made it possible for companies to hire talent from anywhere in the world. A startup in San Francisco can now hire a developer in Vietnam, a designer in Brazil, and a marketer in Poland. This is incredibly exciting for workers in countries where local salaries might be much lower than in tech hubs like San Francisco or London.

However, this also creates new forms of competition. If a company can hire talented developers anywhere, workers in high-cost cities may face pressure on their salaries. Why pay San Francisco rates when you can get equally good work from someone in a lower-cost location? This dynamic is already playing out in the tech industry, and it's likely to intensify.

The impact on cities is another important consideration. When millions of people stopped commuting to offices, the ripple effects were enormous. Downtown areas that depended on office workers — restaurants, coffee shops, dry cleaners, parking garages — saw dramatic drops in business. Some of these businesses have never fully recovered.

On the other hand, smaller cities and rural areas have seen an influx of remote workers looking for more space and lower costs of living. This has revitalized some communities but also driven up housing prices in previously affordable areas, creating tension with long-time residents.

What about the future? Most experts believe that some form of flexible work is here to stay. The genie is out of the bottle — workers have experienced the benefits of flexibility, and many would quit rather than return to a full-time office arrangement. A study by Stanford economist Nick Bloom found that hybrid work has settled at about 25 to 30 percent of paid working days being done from home.

Artificial intelligence is adding another layer to this story. As AI tools become more powerful, some predict that they will make remote collaboration even easier. Real-time translation could remove language barriers in global teams. AI assistants could summarize meetings for people in different time zones. Virtual reality might eventually make remote meetings feel almost as natural as being in the same room.

But let's be honest — we're not there yet. For now, the future of work seems to be hybrid, messy, and still evolving. Every company and every worker is figuring out what works best for them.

One thing is clear: the traditional nine-to-five, five-days-a-week office model is no longer the default. Whether you love working from home or miss the buzz of the office, the fact that we have more choices than ever before is, on balance, a positive development.

The key for all of us is to be intentional about how we work. If you work remotely, make an effort to stay connected with colleagues and set boundaries between work and personal time. If you work in an office, appreciate the collaboration and social interaction it offers. And whatever your arrangement, remember that the best work setup is the one that helps you do your best work while maintaining your wellbeing.`,
    vocabulary: [
      { word: 'niche', definition: 'Specialized; appealing to a small, specific group' },
      { word: 'hybrid model', definition: 'A work arrangement combining remote and in-office work' },
      { word: 'proximity bias', definition: 'The tendency to favor people who are physically nearby' },
      { word: 'ripple effects', definition: 'The spreading consequences of an event or action' },
      { word: 'influx', definition: 'A large number of people arriving in a place' },
      { word: 'revitalized', definition: 'Given new life or energy to something' },
    ],
    discussionQuestions: [
      'Do you prefer working from home or in an office? What are the main reasons?',
      'How has remote work affected your industry or country?',
      'What do you think the ideal work arrangement looks like?',
      'Do you think remote work creates more opportunities or more competition for workers in your country?',
    ],
  },
  {
    id: 'pod-3',
    title: 'How Languages Shape the Way We Think',
    topic: 'Science',
    description: 'The fascinating relationship between language and thought — does the language you speak change how you see the world?',
    duration: '13 min',
    level: 'Upper-Intermediate',
    script: `Imagine you're standing in an open field. Someone asks you to point north. Could you do it without a compass? Most English speakers would struggle. But for speakers of Kuuk Thaayorre, an Aboriginal language in Australia, this would be trivial. Their language doesn't use words like "left" and "right." Instead, they describe everything using cardinal directions — north, south, east, and west. They might say "move your cup to the northeast a little" or "the boy standing to the south of Mary is my brother."

As a result, speakers of Kuuk Thaayorre always know which direction they're facing. They have an internal compass that stays active at all times. This is just one example of how the language we speak can shape the way we think — a concept that linguists call "linguistic relativity."

The idea isn't new. In the 1930s, linguist Benjamin Lee Whorf proposed that the structure of a language determines how its speakers perceive the world. This became known as the Sapir-Whorf hypothesis, named after Whorf and his teacher Edward Sapir. In its strongest form, the hypothesis suggests that language completely determines thought — that you literally cannot think about something if your language doesn't have words for it.

This strong version has been largely rejected by modern linguists. After all, we can all experience things we don't have words for — that bittersweet feeling when you finish a great book, the frustration of a word being on the tip of your tongue. But the weaker version of the hypothesis — that language influences thought without determining it — has gained a lot of scientific support in recent decades.

Let's look at some of the most compelling evidence.

Color perception is one of the best-studied areas. Different languages divide the color spectrum in different ways. Russian, for example, has separate basic words for light blue, which they call "goluboy," and dark blue, called "siniy." English speakers just say "blue" for both. In experiments, Russian speakers were faster at distinguishing between light and dark blue than English speakers. The extra word in their language seemed to sharpen their perception of the difference.

The Pirahã people of the Amazon have a language with no exact number words — they only have terms roughly meaning "small amount," "somewhat larger amount," and "many." When researchers tested their ability to match exact quantities, they struggled with numbers above three. This doesn't mean they can't learn to count — it means their language doesn't push them to track exact numbers in daily life.

Now, you might wonder — does learning a new language change how you think? The answer appears to be yes. Bilingual and multilingual people often report feeling like they have a slightly different personality in each language. Research supports this. Studies show that bilinguals make different decisions depending on which language they're thinking in.

There are also cognitive benefits to speaking multiple languages. Bilinguals tend to be better at tasks that require attention and cognitive control. The constant practice of managing two language systems seems to strengthen executive function — the mental skills that help us plan, focus, and multitask.

So what does all of this mean for us? First, it means that learning a language is about more than vocabulary and grammar. When you learn a new language, you're also gaining access to a new way of seeing the world. And finally, for those of you learning English as a second language — congratulations. You're not just adding a communication tool to your repertoire. You're literally expanding your mind.

Language is far more than a way to exchange information. It's a lens through which we see reality. And the more lenses we have, the richer our understanding of the world becomes.`,
    vocabulary: [
      { word: 'linguistic relativity', definition: 'The idea that language structure influences how speakers perceive the world' },
      { word: 'cardinal directions', definition: 'The four main compass directions: north, south, east, west' },
      { word: 'executive function', definition: 'Mental skills for planning, focusing, remembering, and managing tasks' },
      { word: 'repertoire', definition: 'The range of skills, abilities, or items someone has' },
    ],
    discussionQuestions: [
      'Do you feel like you think differently when using English versus your native language?',
      'Can you think of concepts in your language that are hard to translate into English?',
      'Do you agree that bilinguals have a cognitive advantage? Why or why not?',
    ],
  },
  {
    id: 'pod-4',
    title: 'Digital Minimalism — Reclaiming Your Attention',
    topic: 'Technology',
    description: 'Why our attention is under siege, the true cost of constant connectivity, and how to build a healthier relationship with technology.',
    duration: '11 min',
    level: 'Intermediate',
    script: `How many times have you picked up your phone today? If you're like the average person, the answer is somewhere around 96 times. That's once every ten minutes during waking hours. And each time, there's a cost — not just in time, but in something far more valuable: your attention.

In his book "Digital Minimalism," computer science professor Cal Newport argues that we've sleepwalked into a toxic relationship with technology. We didn't consciously choose to spend four hours a day staring at our phones. Instead, we were nudged there by apps designed to be as addictive as possible.

Let's start with the attention economy. This is the idea that in the modern world, human attention is a scarce resource, and companies compete aggressively to capture it. Every notification, every autoplay video, every infinite scroll feed is engineered to keep you engaged for as long as possible.

Tristan Harris, a former design ethicist at Google, has been one of the most vocal critics of this system. He compares the tech industry to the tobacco industry — both profit from something that harms their users.

So what does this constant distraction actually cost us? First, there's the impact on deep work — the kind of focused, distraction-free concentration that produces your most valuable output. Studies show that even having your phone visible on your desk reduces cognitive capacity.

Second, there's the impact on relationships. This behavior has a name: phubbing — phone snubbing. Research shows that phubbing reduces the quality of conversations and makes people feel less connected.

Third, there's the impact on mental health. The link between social media use and anxiety, depression, and loneliness has been extensively studied.

So what can we do? The first principle is to define your values and then evaluate technology against them. The second principle is to embrace boredom — when we're bored, our mind wanders, and this is when some of our most creative thinking happens. The third principle is to prioritize real-world connections.

The goal isn't perfection. The goal is autonomy — to make sure that you're using technology because you've chosen to, not because it's using you. Your attention is the most precious resource you have. Spend it wisely.`,
    vocabulary: [
      { word: 'attention economy', definition: 'An economic model where human attention is treated as a scarce, valuable resource' },
      { word: 'phubbing', definition: 'The act of ignoring someone in favor of looking at your phone' },
      { word: 'deep work', definition: 'Focused, distraction-free work that produces high-value output' },
      { word: 'autonomy', definition: 'The ability to make your own choices independently' },
    ],
    discussionQuestions: [
      'How many hours a day do you spend on your phone? Does that number surprise you?',
      'Have you ever tried a "digital detox"? What was the experience like?',
      'Do you think social media does more harm or good overall?',
    ],
  },
  {
    id: 'pod-5',
    title: 'The Science of Happiness — What Actually Works',
    topic: 'Psychology',
    description: 'What decades of research tell us about what truly makes people happy — and what surprisingly doesn\'t.',
    duration: '13 min',
    level: 'Intermediate',
    script: `What makes you happy? For most of human history, we only had philosophy and personal experience to guide our answers. But over the past few decades, the science of happiness — or "positive psychology" — has exploded, giving us real data about what actually contributes to human wellbeing.

Let's start with what doesn't make us as happy as we think it will. Money is the classic example. Happiness increases with income, but only up to a certain point — beyond that, more money doesn't make you significantly happier. This happens because of "hedonic adaptation." Humans are remarkably good at adapting to new circumstances. When you get a raise or buy a new car, there's an initial burst of happiness, but within a few months your expectations adjust and you return to roughly the same level as before.

So if money isn't the answer, what is? The number one factor associated with happiness is the quality of our relationships. The Harvard Study of Adult Development, one of the longest-running studies of human wellbeing, has been tracking hundreds of individuals since 1938. Its central finding: "Good relationships keep us happier and healthier. Period."

The second major factor is having a sense of purpose or meaning — a career, a creative pursuit, volunteering, or working toward a personal goal.

The third factor is gratitude. Regularly noticing and appreciating the good things in your life genuinely increases happiness, because it counteracts our natural negativity bias — the tendency to focus more on what's wrong than what's right.

The fourth factor is "flow" — a state of complete absorption in an activity, where you lose track of time and feel a deep sense of satisfaction.

Exercise also consistently shows up in happiness research, and acts of kindness and generosity contribute too — spending money on others makes people happier than spending it on themselves.

To bring this all together, the science of happiness tells us that the good life isn't about accumulating more. It's about connection, meaning, gratitude, engagement, and presence — things that are available to almost everyone, regardless of their circumstances.`,
    vocabulary: [
      { word: 'hedonic adaptation', definition: 'The tendency to return to a baseline level of happiness after positive or negative changes' },
      { word: 'negativity bias', definition: 'The tendency to pay more attention to negative experiences than positive ones' },
      { word: 'flow', definition: 'A state of complete absorption and engagement in an activity' },
    ],
    discussionQuestions: [
      'What makes you happiest in your daily life? Does it match what the research suggests?',
      'Do you practice gratitude? If so, how?',
      'When do you experience "flow" — complete absorption in an activity?',
    ],
  },
  {
    id: 'pod-6',
    title: 'Artificial Intelligence — Hype vs Reality',
    topic: 'Technology',
    description: 'Separating facts from fiction in the AI revolution — what AI can really do, what it can\'t, and what it means for our future.',
    duration: '14 min',
    level: 'Upper-Intermediate',
    script: `In the last few years, artificial intelligence has gone from a technical curiosity to front-page news. ChatGPT, image generators, self-driving cars — the headlines make it sound like we're living in science fiction. But how much of this is real, and how much is hype?

What most people are excited or worried about right now is "generative AI" — systems like large language models that can produce text, images, code, and other content. These models don't understand meaning the way humans do. Instead, they're incredibly good at predicting what should come next, whether that's the next word in a sentence or the next pixel in an image.

Let's talk about what AI is genuinely good at. Pattern recognition is perhaps its greatest strength — medical AI systems can detect certain cancers in scans with accuracy equal to or better than human radiologists. Large language models have demonstrated remarkable abilities in text generation, summarization, and coding assistance.

Now let's talk about what AI is not good at. The most fundamental limitation is that current AI doesn't truly understand anything — which means it can confidently state things that are completely wrong, a phenomenon called "hallucination." Common sense reasoning is another major weakness. AI systems, which learn from text and images rather than lived experience, often struggle with basic reasoning that humans take for granted.

Let's address the biggest fear: "AI will take all our jobs." The reality is more nuanced — technology has historically created more jobs than it's destroyed, just different ones. That said, the transition can be painful, and it may happen faster than previous technological shifts.

Perhaps the most important thing to understand about AI is that it's a tool — like fire or electricity. Tools are neither good nor bad; what matters is how they're used. For individuals, the practical advice is straightforward: learn to use AI tools effectively, but don't rely on them blindly. Use them to augment your work, not replace your thinking.`,
    vocabulary: [
      { word: 'generative AI', definition: 'AI systems that can create new content like text, images, or code' },
      { word: 'hallucination', definition: 'When an AI confidently produces false or fabricated information' },
      { word: 'augment', definition: 'To enhance or add to something' },
    ],
    discussionQuestions: [
      'How do you use AI tools in your daily work or life?',
      'Which jobs do you think are most at risk from AI? Which are safest?',
      'What excites you most about AI? What concerns you most?',
    ],
  },
];

/* ─── Dictation: hear it, type it, check it ──────────────────────── */
export interface DictationSentence {
  id: string;
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  text: string;
}

export const dictationTopics = [
  'Daily Life',
  'Travel',
  'Work',
  'Technology',
  'Food',
  'Health',
] as const;

export const dictationSentences: DictationSentence[] = [
  { id: 'dict-1', topic: 'Daily Life', level: 'Beginner', text: "I usually wake up at seven o'clock in the morning." },
  { id: 'dict-2', topic: 'Daily Life', level: 'Beginner', text: 'She takes the bus to work every day.' },
  { id: 'dict-3', topic: 'Food', level: 'Beginner', text: 'Could you pass me the salt, please?' },
  { id: 'dict-4', topic: 'Travel', level: 'Beginner', text: 'The train to the airport leaves in ten minutes.' },
  { id: 'dict-5', topic: 'Work', level: 'Intermediate', text: 'We need to finish the report before the meeting on Friday.' },
  { id: 'dict-6', topic: 'Technology', level: 'Intermediate', text: 'My phone battery dies faster than it used to.' },
  { id: 'dict-7', topic: 'Health', level: 'Intermediate', text: 'Getting enough sleep is just as important as eating well.' },
  { id: 'dict-8', topic: 'Travel', level: 'Intermediate', text: 'We got lost on the way back to the hotel, but a local showed us the way.' },
  { id: 'dict-9', topic: 'Daily Life', level: 'Intermediate', text: "I've been meaning to call my parents, but I keep forgetting." },
  { id: 'dict-10', topic: 'Work', level: 'Advanced', text: 'The company decided to postpone the product launch until the supply chain issues were resolved.' },
  { id: 'dict-11', topic: 'Technology', level: 'Advanced', text: 'Even experienced developers underestimate how much time debugging actually takes.' },
  { id: 'dict-12', topic: 'Health', level: 'Advanced', text: "It wasn't until she stopped drinking coffee in the afternoon that her sleep finally improved." },
  { id: 'dict-13', topic: 'Food', level: 'Intermediate', text: 'This restaurant is famous for its spicy noodles, but the portions are surprisingly small.' },
  { id: 'dict-14', topic: 'Daily Life', level: 'Advanced', text: "By the time I realized I'd left my keys at the office, the building was already locked for the night." },
  { id: 'dict-15', topic: 'Travel', level: 'Advanced', text: 'Had we booked the tickets a week earlier, we would have saved almost half the price.' },
];

/* ─── Comprehension: short clip, then multiple-choice questions ─── */
export interface ComprehensionQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ComprehensionClip {
  id: string;
  title: string;
  topic: string;
  level: 'Intermediate' | 'Upper-Intermediate' | 'Advanced';
  duration: string;
  script: string;
  questions: ComprehensionQuestion[];
}

export const comprehensionTopics = [
  'Daily Life',
  'Announcements',
  'Work',
  'Travel',
  'Science',
  'Health',
  'Culture',
] as const;

export const comprehensionClips: ComprehensionClip[] = [
  {
    id: 'comp-1',
    title: 'Voicemail: Rescheduling a Dentist Appointment',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Hi, this is Karen from Bright Smile Dental calling for Mark. I'm calling about your appointment that was scheduled for this Thursday at two thirty in the afternoon. Unfortunately, Doctor Lee has a scheduling conflict that day, so we need to move your appointment. We have an opening this Friday at ten in the morning, or next Monday at three thirty in the afternoon, whichever works better for you. Please give us a call back at the clinic to confirm, or you can reply to the text message we sent. Sorry for the inconvenience, and we look forward to seeing you soon. Thanks, bye.`,
    questions: [
      { question: 'Who is calling, and from where?', options: ['Mark, from Bright Smile Dental', 'Karen, from Bright Smile Dental', 'Doctor Lee, from the clinic', 'Karen, from an insurance company'], correctIndex: 1 },
      { question: 'Why is the appointment being changed?', options: ['Mark asked to reschedule', 'The clinic is closed on Thursday', 'The doctor has a scheduling conflict', 'The appointment time was booked twice'], correctIndex: 2 },
      { question: 'What was the original appointment day and time?', options: ['Thursday at 2:30 PM', 'Friday at 10:00 AM', 'Monday at 3:30 PM', 'Thursday at 10:00 AM'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-2',
    title: 'Airport Announcement: Gate Change',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '35 sec',
    script: `Attention, passengers. This is a boarding announcement for flight AA two-two-seven with service to Chicago. The departure gate for this flight has been changed from gate twelve to gate twenty-three. Please proceed to gate twenty-three immediately, as boarding is now underway. Passengers requiring special assistance should see a member of staff at the gate. We apologize for any inconvenience this change may have caused. Thank you for flying with us.`,
    questions: [
      { question: 'What has changed about the flight?', options: ['The departure time', 'The destination city', 'The gate number', 'The flight number'], correctIndex: 2 },
      { question: 'What is the new gate number?', options: ['Gate 12', 'Gate 22', 'Gate 23', 'Gate 27'], correctIndex: 2 },
      { question: 'Where is the flight going?', options: ['New York', 'Chicago', 'Boston', 'Denver'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-3',
    title: 'Team Meeting: Project Deadline Update',
    topic: 'Work',
    level: 'Upper-Intermediate',
    duration: '55 sec',
    script: `Okay everyone, quick update before we wrap up. So, the client pushed back on the timeline again — they want the new dashboard feature ready by the fifteenth instead of the twentieth. I know that's tight, but the good news is they've agreed to drop the export-to-PDF feature from this release, so we can push that to phase two. I need the design team to finalize the mockups by Wednesday at the latest, and engineering, I'd like a rough build ready for internal testing by Friday. If anyone thinks the new deadline genuinely isn't realistic, tell me now rather than on the fourteenth. We'll do a check-in every morning at nine starting tomorrow until this ships.`,
    questions: [
      { question: 'What did the client change?', options: ['They canceled the project', 'They moved the deadline earlier', 'They added a new feature', 'They asked for a discount'], correctIndex: 1 },
      { question: 'What feature was dropped from this release?', options: ['The dashboard', 'User login', 'Export to PDF', 'Dark mode'], correctIndex: 2 },
      { question: 'What does the speaker ask the team to do starting tomorrow?', options: ['Work overtime', 'Send a daily report', 'Have a morning check-in', 'Skip the design review'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-4',
    title: 'Hotel Front Desk: Checking In',
    topic: 'Travel',
    level: 'Intermediate',
    duration: '45 sec',
    script: `Good evening, welcome to the Riverside Hotel. Do you have a reservation with us? Great, could I get your last name and a form of ID? ... Thank you. I see you've booked a deluxe room with a city view for three nights. Breakfast is included and served in the lobby restaurant from six thirty to ten. Checkout is at eleven, but if you need a late checkout, just let the front desk know the morning of. Your room is on the seventh floor, room seven-twelve, and here are two key cards. The elevator is just around the corner to your left. Is there anything else I can help you with before you head up?`,
    questions: [
      { question: 'What type of room did the guest book?', options: ['A standard single room', 'A deluxe room with a city view', 'A suite with a sea view', 'A shared dormitory room'], correctIndex: 1 },
      { question: 'What time does breakfast end?', options: ['9:00', '10:00', '10:30', '11:00'], correctIndex: 1 },
      { question: 'What room number is the guest given?', options: ['617', '712', '721', '117'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-5',
    title: 'Science Brief: Why Leaves Change Color',
    topic: 'Science',
    level: 'Intermediate',
    duration: '50 sec',
    script: `Every autumn, leaves across many parts of the world turn brilliant shades of red, orange, and yellow. But why does this happen? During spring and summer, leaves are green because they're full of chlorophyll, the pigment that captures sunlight for photosynthesis. As days get shorter and temperatures drop, trees start preparing for winter by sealing off the veins that carry water and nutrients to their leaves. Without a fresh supply, chlorophyll breaks down, and the green color fades. This reveals other pigments that were in the leaf all along but were hidden by the chlorophyll — yellow and orange carotenoids, the same pigments found in carrots. Red colors come from anthocyanins, which some trees actually produce in autumn, possibly to protect the leaf while it reabsorbs nutrients before falling.`,
    questions: [
      { question: 'Why are leaves green in spring and summer?', options: ['They are full of carotenoids', 'They are full of chlorophyll', 'They lack sunlight', 'They are full of anthocyanins'], correctIndex: 1 },
      { question: 'What causes the chlorophyll to break down in autumn?', options: ['Trees seal off the veins carrying water and nutrients', 'Insects eat the chlorophyll', 'Leaves absorb more sunlight', 'Rain washes it away'], correctIndex: 0 },
      { question: 'What pigment is responsible for red leaves?', options: ['Chlorophyll', 'Carotenoids', 'Anthocyanins', 'Melanin'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-6',
    title: 'Voicemail: The Package You Missed',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '35 sec',
    script: `Hello, this is a message for Ms. Nguyen at forty-two Elm Street. This is Tom from City Couriers. I tried to deliver a package to you this morning at about nine fifteen, but no one was home and it needs a signature. I've left a card in your mailbox. You can pick the package up from our office on Baker Road any time after four o'clock today, or we can try again tomorrow between eight and noon. Just bring the card and a photo ID if you come to the office. Thanks.`,
    questions: [
      { question: 'Why couldn\'t the package be delivered?', options: ['The address was wrong', 'It needed a signature and no one was home', 'The package was damaged', 'The courier was late'], correctIndex: 1 },
      { question: 'When can Ms. Nguyen collect it from the office?', options: ['After four o\'clock today', 'Tomorrow before noon', 'Any time today', 'Only on Monday'], correctIndex: 0 },
      { question: 'What should she bring to the office?', options: ['The tracking number only', 'Her receipt and phone', 'Cash for the delivery fee', 'The card and a photo ID'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-7',
    title: 'Neighbours: Borrowing a Ladder',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Hey, sorry to bother you on a Sunday. I'm Lucy, I just moved into number eight next door. I was wondering if I could borrow a ladder for an hour or so? The light in my hallway is way up on the ceiling and I can't reach it, even standing on a chair. I'd buy one, but the hardware store is closed until tomorrow. Oh, you have a folding one in the garage? That would be perfect. I'll bring it straight back, I promise. And if you ever need anything, a cup of sugar or help moving furniture, just knock.`,
    questions: [
      { question: 'Why does Lucy need a ladder?', options: ['To paint her bedroom', 'To clean the windows', 'To reach a light on the ceiling', 'To fix the roof'], correctIndex: 2 },
      { question: 'Why doesn\'t she buy one?', options: ['Ladders are too expensive', 'The hardware store is closed until tomorrow', 'She has no car', 'She only needs it once a year'], correctIndex: 1 },
      { question: 'Where does the neighbour keep the ladder?', options: ['In the garage', 'In the hallway', 'In the garden shed', 'In the basement'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-8',
    title: 'At the Pharmacy',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '45 sec',
    script: `Okay, here's your prescription. These are antibiotics, so it's really important that you finish the whole course, even if you start feeling better after a few days. Take one tablet three times a day, with food, so roughly breakfast, lunch, and dinner. Try not to drink alcohol while you're taking them. Some people get a slightly upset stomach. That's normal, but if you get a rash or have trouble breathing, stop taking them and call your doctor straight away. There are enough tablets here for seven days. Do you have any questions?`,
    questions: [
      { question: 'How often should the tablets be taken?', options: ['Once a day', 'Twice a day', 'Every four hours', 'Three times a day'], correctIndex: 3 },
      { question: 'What should the patient do if they feel better after a few days?', options: ['Stop taking the tablets', 'Take half a tablet instead', 'Finish the whole course anyway', 'Call the pharmacy'], correctIndex: 2 },
      { question: 'Which side effect means they should call the doctor straight away?', options: ['A slightly upset stomach', 'A rash or trouble breathing', 'Feeling tired', 'A mild headache'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-9',
    title: 'Ordering at a Café',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '35 sec',
    script: `Hi, what can I get you? A medium latte with oat milk, sure. Anything to eat? The banana bread is fresh this morning, and the chicken sandwiches are on offer today, two for the price of one. Just the banana bread? Okay. Is that for here or to take away? For here, great. That comes to six dollars eighty. You can tap your card on the machine. Perfect. Take this number and grab a seat anywhere, we'll bring it over to you in a few minutes. The Wi-Fi password is on the back of the menu.`,
    questions: [
      { question: 'What drink does the customer order?', options: ['A medium latte with oat milk', 'A large cappuccino', 'A small black coffee', 'An iced tea'], correctIndex: 0 },
      { question: 'What is on offer today?', options: ['Banana bread', 'Free coffee refills', 'Half-price muffins', 'Chicken sandwiches, two for one'], correctIndex: 3 },
      { question: 'How much does the order cost?', options: ['$6.18', '$8.60', '$6.80', '$16.80'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-10',
    title: 'Booking a Haircut by Phone',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Good afternoon, Studio Nine hair salon. You'd like to book a cut? Of course. Do you have a stylist you usually see? Anna? Let me check. Anna's fully booked this week, I'm afraid, but she has an opening next Tuesday at eleven, or Wednesday at five thirty. Or if you'd like to come sooner, Mike has time tomorrow at two. Next Tuesday at eleven with Anna, perfect. Can I take a phone number? And just so you know, we ask for twenty-four hours' notice if you need to cancel, otherwise there's a ten-dollar fee.`,
    questions: [
      { question: 'Why can\'t the customer see Anna this week?', options: ['Anna is on holiday', 'Anna is fully booked', 'Anna no longer works there', 'The salon is closed'], correctIndex: 1 },
      { question: 'Which appointment does the customer choose?', options: ['Next Tuesday at eleven with Anna', 'Wednesday at five thirty with Anna', 'Tomorrow at two with Mike', 'Next Tuesday at two with Mike'], correctIndex: 0 },
      { question: 'What happens if you cancel with less than 24 hours\' notice?', options: ['You lose your stylist', 'Nothing happens', 'You can\'t book again', 'You pay a ten-dollar fee'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-11',
    title: 'Train Station: Delay Announcement',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '35 sec',
    script: `Good morning. We're sorry to announce that the eight fifteen service to Manchester Piccadilly is delayed by approximately twenty-five minutes. This is due to a signalling problem near Stockport. The train will now depart from platform four instead of platform two. Passengers for Stockport may also take the eight thirty service from platform six, which is running on time. Tickets for the delayed train will be accepted on the eight thirty service. We apologise for the delay and any inconvenience this may cause to your journey.`,
    questions: [
      { question: 'Why is the train delayed?', options: ['Bad weather', 'A staff shortage', 'A signalling problem', 'A broken-down train'], correctIndex: 2 },
      { question: 'Which platform will the delayed train now leave from?', options: ['Platform two', 'Platform four', 'Platform six', 'Platform eight'], correctIndex: 1 },
      { question: 'What can passengers going to Stockport do?', options: ['Take the 8:30 train from platform six', 'Take a bus instead', 'Get a full refund', 'Wait for the next day'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-12',
    title: 'Museum: Closing Time',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '30 sec',
    script: `Ladies and gentlemen, may I have your attention, please. The museum will be closing in thirty minutes, at five thirty. The gift shop and café on the ground floor will remain open until six. Please make your way towards the main exit. If you have left items in the cloakroom, please remember to collect them before you leave. The museum is open again tomorrow from nine o'clock, and entry is free for all visitors on the first Sunday of every month. Thank you for visiting, and we hope you enjoyed your day.`,
    questions: [
      { question: 'What time does the museum close?', options: ['5:00', '6:30', '6:00', '5:30'], correctIndex: 3 },
      { question: 'What stays open until six?', options: ['The special exhibition', 'The cloakroom', 'The gift shop and café', 'The second floor'], correctIndex: 2 },
      { question: 'When is entry free?', options: ['Every Sunday', 'On the first Sunday of every month', 'On weekday mornings', 'For students only'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-13',
    title: 'School Radio: Sports Day',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Good morning, everyone, and here's a reminder about sports day this Friday. Because of the rain forecast, all events will be held in the indoor sports hall instead of on the field. Races start at nine thirty, so please be in your team colours and in the hall by nine fifteen. Remember to bring a water bottle, but there's no need for a packed lunch, because lunch will be served in the canteen as usual. Parents are welcome to watch from the balcony. And finally, the last day to sign up for the relay race is tomorrow, so speak to Mr. Davis in the PE office.`,
    questions: [
      { question: 'Why has sports day moved indoors?', options: ['Rain is forecast', 'The field is being repaired', 'It is too hot outside', 'More parents are coming'], correctIndex: 0 },
      { question: 'What time should students be in the hall?', options: ['9:00', '9:45', '9:30', '9:15'], correctIndex: 3 },
      { question: 'Who should students see to sign up for the relay?', options: ['The head teacher', 'Their class teacher', 'Mr. Davis', 'The canteen staff'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-14',
    title: 'Supermarket: Lost Child',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '25 sec',
    script: `Attention, shoppers. We have a little boy called Leo at the customer service desk near the main entrance. Leo is about five years old and is wearing a red jacket and blue boots. He is looking for his mum. If you are Leo's parent or guardian, please come to the customer service desk as soon as possible. Leo is safe and is waiting with a member of our staff. Thank you. And while you're shopping today, don't miss our fresh fruit offers in aisle two.`,
    questions: [
      { question: 'Where is Leo waiting?', options: ['At the checkout', 'At the customer service desk', 'In aisle two', 'By the car park'], correctIndex: 1 },
      { question: 'What is Leo wearing?', options: ['A red jacket and blue boots', 'A blue jacket and red boots', 'A yellow raincoat', 'A green hat'], correctIndex: 0 },
      { question: 'Who is Leo looking for?', options: ['His dad', 'His sister', 'His grandmother', 'His mum'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-15',
    title: 'New Starter: First-Day Briefing',
    topic: 'Work',
    level: 'Intermediate',
    duration: '50 sec',
    script: `Welcome aboard, Priya. Let me run you through today. First, IT will set up your laptop at ten, so you'll get your email and logins then. At eleven you'll have a quick safety talk with Sam, our office manager, that's where the fire exits are and so on. Lunch is on us today, the whole team's going to the Thai place around the corner at half twelve. In the afternoon, just shadow Leo; he's working on the client reports you'll be taking over next month. No need to produce anything this week. Just ask lots of questions. Oh, and the coffee machine on this floor is broken, so use the one upstairs.`,
    questions: [
      { question: 'What happens at ten o\'clock?', options: ['A safety talk', 'A team lunch', 'IT sets up her laptop', 'A client meeting'], correctIndex: 2 },
      { question: 'What will Priya do in the afternoon?', options: ['Write a client report', 'Shadow Leo', 'Train new staff', 'Meet the director'], correctIndex: 1 },
      { question: 'Why should she go upstairs for coffee?', options: ['The machine on her floor is broken', 'The coffee is better there', 'It is closer to her desk', 'Her floor has no kitchen'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-16',
    title: 'Customer Service Call: A Wrong Order',
    topic: 'Work',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `Thanks for calling, I'm sorry to hear about the mix-up. So you ordered the blue sofa cushions and received green ones instead. I can see that on your order. That's our mistake, so here's what I can do. We'll send the blue cushions out today by express delivery at no extra cost, and they should arrive by Thursday. You don't need to pay to send the green ones back. Our courier will collect them when he drops off the new ones, so just leave them in the box. And to apologise, I've added a fifteen percent discount code to your account for your next order.`,
    questions: [
      { question: 'What was wrong with the order?', options: ['It arrived broken', 'The customer was charged twice', 'It never arrived', 'The wrong colour was sent'], correctIndex: 3 },
      { question: 'How will the green cushions be returned?', options: ['The customer posts them back', 'The customer keeps them', 'The courier collects them when delivering the new ones', 'The customer takes them to a store'], correctIndex: 2 },
      { question: 'What extra does the company offer?', options: ['A free sofa', 'A fifteen percent discount code', 'A full refund', 'Free delivery for a year'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-17',
    title: 'Job Interview: Tell Me About Yourself',
    topic: 'Work',
    level: 'Upper-Intermediate',
    duration: '55 sec',
    script: `Sure. So I studied marketing at university, and after graduating I spent three years at a small travel company, where I ran their social media. When I started, they had about two thousand followers, and when I left, it was over fifty thousand, mostly because we started posting short videos made by our own tour guides. What I enjoyed most was looking at the data, seeing which posts actually brought in bookings, not just likes. That's really why I applied for this role, because it's more focused on analytics. I'm also learning Spanish at the moment, which I know could be useful with your clients in South America.`,
    questions: [
      { question: 'What did the candidate do at the travel company?', options: ['Ran social media', 'Led tours', 'Managed the finances', 'Designed the website'], correctIndex: 0 },
      { question: 'What helped their followers grow so much?', options: ['Paid advertising', 'Celebrity partners', 'Daily competitions', 'Short videos made by their tour guides'], correctIndex: 3 },
      { question: 'Why does the candidate want this new role?', options: ['It pays more', 'It is closer to home', 'It focuses more on analytics', 'It involves more travel'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-18',
    title: 'Manager: Working From Home Policy',
    topic: 'Work',
    level: 'Advanced',
    duration: '55 sec',
    script: `Right, a few of you have asked about the new hybrid policy, so let me clarify. From next month, everyone will be in the office on Tuesdays and Thursdays. Those are our collaboration days, so please book meetings then rather than on your home days. The other three days are flexible: work from home, from the office, wherever suits you, as long as you're reachable between ten and four. If your role needs something different, say you look after a parent, or your commute is over ninety minutes, talk to me and we'll work something out. This isn't about checking up on anyone; it's about making the time we're together count.`,
    questions: [
      { question: 'Which days must everyone be in the office?', options: ['Monday and Friday', 'Tuesday and Thursday', 'Wednesday only', 'Any two days they choose'], correctIndex: 1 },
      { question: 'What is required on the flexible days?', options: ['Being reachable between ten and four', 'Sending a daily report', 'Being in the office by nine', 'Working at least ten hours'], correctIndex: 0 },
      { question: 'What does the manager say the policy is about?', options: ['Saving money on office space', 'Checking up on staff', 'Reducing meetings', 'Making time together count'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-19',
    title: 'Tour Guide: A Walk Through the Old Town',
    topic: 'Travel',
    level: 'Intermediate',
    duration: '50 sec',
    script: `Okay, everyone, gather round. We'll be walking for about two hours this morning, with a coffee break halfway at the market square. Our first stop is the old city gate, built in the fourteenth century, just at the end of this street. After that we'll visit the cathedral. Please remember that shoulders and knees need to be covered inside, and there's no flash photography. The streets here are cobbled and can be slippery, so watch your step. If you get separated from the group, look for my yellow umbrella, or just wait by the fountain in the market square and I'll come back for you.`,
    questions: [
      { question: 'Where will the group have a coffee break?', options: ['At the city gate', 'At the cathedral', 'In the market square', 'At the hotel'], correctIndex: 2 },
      { question: 'What is not allowed inside the cathedral?', options: ['Talking', 'Flash photography', 'Bags', 'Children'], correctIndex: 1 },
      { question: 'What should you do if you get separated?', options: ['Wait by the fountain in the market square', 'Go back to the hotel', 'Call the guide\'s phone', 'Ask a police officer'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-20',
    title: 'Car Rental Desk',
    topic: 'Travel',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `So, you've booked a compact car for five days. I can offer you a free upgrade to a mid-size if you like; we've got a lot of those today. The car comes with a full tank of fuel, and we ask you to return it full as well, otherwise there's a refuelling charge. Basic insurance is included, but that has an excess of eight hundred dollars, so if there's any damage, you'd pay the first eight hundred. For fifteen dollars a day you can reduce that to zero. The car's in bay twelve on the second level of the car park, and drop-off is at the same place.`,
    questions: [
      { question: 'What does the agent offer for free?', options: ['Extra insurance', 'A GPS device', 'An extra day', 'An upgrade to a mid-size car'], correctIndex: 3 },
      { question: 'How should the car be returned?', options: ['Cleaned inside and out', 'With half a tank', 'With a full tank', 'At a different airport'], correctIndex: 2 },
      { question: 'What does the extra fifteen dollars a day do?', options: ['Adds a second driver', 'Reduces the excess to zero', 'Covers fuel', 'Allows late return'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-21',
    title: 'Pilot: Message From the Flight Deck',
    topic: 'Travel',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Good afternoon, ladies and gentlemen, this is your captain speaking. We've just reached our cruising altitude of thirty-six thousand feet. Our flight time to Singapore today is about two hours and ten minutes, so we expect to land a little ahead of schedule, at around four forty local time. The weather in Singapore is warm, thirty-one degrees, with a chance of a thunderstorm later this evening. We may have some light turbulence over the next twenty minutes, so I'll keep the seatbelt sign on for now. Sit back, relax, and enjoy the flight.`,
    questions: [
      { question: 'How long is the flight?', options: ['About two hours and ten minutes', 'About one hour', 'About three hours', 'About four hours and forty minutes'], correctIndex: 0 },
      { question: 'What is the weather like in Singapore?', options: ['Cool and cloudy', 'Hot and completely dry', 'Cold and windy', 'Warm, with a chance of a thunderstorm'], correctIndex: 3 },
      { question: 'Why is the seatbelt sign staying on?', options: ['The plane is landing', 'Meals are being served', 'There may be light turbulence', 'The captain forgot'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-22',
    title: 'Asking for Directions',
    topic: 'Travel',
    level: 'Intermediate',
    duration: '35 sec',
    script: `The night market? Sure, it's not far, about a ten-minute walk. Go straight down this road until you reach the big bridge, but don't cross it. Turn left before the bridge and walk along the river. You'll pass a temple on your right, and a little after that you'll see the lights and smell the food. You can't miss it. It opens at six, so you've got a bit of time. If you're hungry, try the grilled corn and the coconut ice cream. And keep an eye on your phone and wallet, because it gets very crowded after eight.`,
    questions: [
      { question: 'What should the tourist do at the big bridge?', options: ['Cross it', 'Turn left before it', 'Turn right', 'Take a boat'], correctIndex: 1 },
      { question: 'What will they pass on the right?', options: ['A temple', 'A school', 'A hotel', 'A park'], correctIndex: 0 },
      { question: 'Why should they watch their phone and wallet?', options: ['The market is dark', 'There are no police', 'Prices are high', 'It gets very crowded after eight'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-23',
    title: 'Science Brief: Why the Sky Is Blue',
    topic: 'Science',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `Sunlight looks white, but it's actually a mix of all the colours of the rainbow, each with a different wavelength. When sunlight enters the atmosphere, it bumps into tiny gas molecules, mostly nitrogen and oxygen. These molecules scatter shorter wavelengths, like blue, much more strongly than longer ones, like red. This is called Rayleigh scattering. So blue light gets bounced around the whole sky and reaches our eyes from every direction, which is why the sky looks blue. At sunrise and sunset, sunlight has to pass through much more of the atmosphere to reach us. By then, most of the blue has been scattered away, leaving the reds and oranges.`,
    questions: [
      { question: 'What is sunlight made of?', options: ['Only blue light', 'Mostly red light', 'A mix of all the colours', 'Heat but no colour'], correctIndex: 2 },
      { question: 'Why is blue light scattered more?', options: ['It is brighter', 'It has a shorter wavelength', 'It travels faster', 'It comes from the ocean'], correctIndex: 1 },
      { question: 'Why are sunsets red and orange?', options: ['Light passes through more atmosphere, so blue is scattered away', 'Clouds reflect red light', 'The sun is cooler in the evening', 'Dust turns the light red'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-24',
    title: 'Science Brief: The Octopus',
    topic: 'Science',
    level: 'Upper-Intermediate',
    duration: '45 sec',
    script: `The octopus is one of the strangest animals in the ocean. It has three hearts: two pump blood through the gills, and the third pumps it around the rest of the body. Its blood is blue, because it uses a copper-based molecule to carry oxygen, rather than the iron-based one in human blood. Even more surprising, about two thirds of an octopus's nerve cells are in its arms, not its head, so each arm can taste, touch, and react partly on its own. Octopuses can also change the colour and texture of their skin in a fraction of a second to hide from predators.`,
    questions: [
      { question: 'How many hearts does an octopus have?', options: ['One', 'Two', 'Eight', 'Three'], correctIndex: 3 },
      { question: 'Why is octopus blood blue?', options: ['It eats blue fish', 'It lives in cold water', 'It uses a copper-based molecule to carry oxygen', 'It has no blood cells'], correctIndex: 2 },
      { question: 'Where are most of an octopus\'s nerve cells?', options: ['In its head', 'In its arms', 'In its hearts', 'In its skin'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-25',
    title: 'Science Brief: Counting Thunder',
    topic: 'Science',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Have you ever noticed that you see lightning before you hear thunder? That's because light travels almost a million times faster than sound. Lightning heats the air around it to around thirty thousand degrees Celsius, about five times hotter than the surface of the sun. The air expands so suddenly that it makes a huge boom, and that's thunder. You can use the gap to work out how far away a storm is. Count the seconds between the flash and the thunder, then divide by three. That gives you the distance in kilometres. If the gap is getting shorter, the storm is coming closer.`,
    questions: [
      { question: 'Why do we see lightning before we hear thunder?', options: ['Light travels much faster than sound', 'Thunder happens later', 'Our eyes are faster than our ears', 'Clouds block the sound'], correctIndex: 0 },
      { question: 'What causes the sound of thunder?', options: ['Clouds hitting each other', 'Rain falling on the ground', 'Wind blowing through trees', 'Air expanding suddenly after being heated'], correctIndex: 3 },
      { question: 'You count nine seconds. How far away is the storm?', options: ['About one kilometre', 'About nine kilometres', 'About three kilometres', 'About twenty-seven kilometres'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-26',
    title: 'Science Brief: The Bees\' Waggle Dance',
    topic: 'Science',
    level: 'Advanced',
    duration: '50 sec',
    script: `When a honeybee finds a good patch of flowers, she flies back to the hive and tells the others where it is, by dancing. It's called the waggle dance. She runs in a straight line while shaking her body, then circles back and repeats it. The direction of the straight run shows the direction of the flowers compared with the position of the sun. If she runs straight up the honeycomb, the flowers are towards the sun. And the longer she waggles, the further away the food is. Other bees follow her closely, feel the vibrations in the dark hive, and then fly off to find the flowers themselves.`,
    questions: [
      { question: 'What is the waggle dance for?', options: ['Attracting a mate', 'Telling other bees where food is', 'Warning of danger', 'Keeping the hive warm'], correctIndex: 1 },
      { question: 'What does the direction of the straight run show?', options: ['The direction of the food compared with the sun', 'The type of flower', 'The time of day', 'How much nectar there is'], correctIndex: 0 },
      { question: 'What does a longer waggle mean?', options: ['Rain is coming', 'There are more flowers', 'The bee is tired', 'The food is further away'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-27',
    title: 'Health Podcast: Sleeping Better',
    topic: 'Health',
    level: 'Upper-Intermediate',
    duration: '55 sec',
    script: `Most adults need between seven and nine hours of sleep a night, but many of us get much less. So here are three simple habits that help. First, keep the same wake-up time every day, even at weekends; your body clock loves routine. Second, put your phone away at least half an hour before bed. The light from screens tells your brain it's still daytime, and the endless scrolling keeps your mind busy. Third, watch the caffeine. Coffee can stay in your system for six hours or more, so that four o'clock coffee might be why you're awake at midnight. And if you can't fall asleep after twenty minutes, get up and do something quiet until you feel sleepy.`,
    questions: [
      { question: 'How much sleep do most adults need?', options: ['Five to six hours', 'Six to seven hours', 'Seven to nine hours', 'Ten hours or more'], correctIndex: 2 },
      { question: 'Why should you put your phone away before bed?', options: ['It might ring', 'Screen light tells your brain it\'s still daytime', 'It uses electricity', 'It is bad for your eyes in the morning'], correctIndex: 1 },
      { question: 'What should you do if you can\'t sleep after twenty minutes?', options: ['Get up and do something quiet', 'Check your phone', 'Drink a coffee', 'Stay in bed and count'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-28',
    title: 'Doctor\'s Advice: Washing Your Hands',
    topic: 'Health',
    level: 'Intermediate',
    duration: '40 sec',
    script: `One of the easiest ways to avoid catching a cold or the flu is simply washing your hands properly. Most people rinse for just a few seconds, but you should scrub with soap for at least twenty seconds, about as long as singing "Happy Birthday" twice. Don't forget the backs of your hands, between your fingers, and under your nails. Dry them well, because germs spread more easily from wet hands. Wash before eating, after using the toilet, and after coughing or sneezing. If there's no soap and water, a hand gel with at least sixty percent alcohol is a good second choice.`,
    questions: [
      { question: 'How long should you scrub with soap?', options: ['A few seconds', 'Five minutes', 'One minute', 'At least twenty seconds'], correctIndex: 3 },
      { question: 'Why should you dry your hands well?', options: ['Wet hands get cold', 'Soap stays on wet hands', 'Germs spread more easily from wet hands', 'It saves water'], correctIndex: 2 },
      { question: 'What can you use if there is no soap and water?', options: ['Just water', 'Hand gel with at least sixty percent alcohol', 'A paper towel', 'Perfume'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-29',
    title: 'Guide: Huế, the Old Capital',
    topic: 'Culture',
    level: 'Upper-Intermediate',
    duration: '55 sec',
    script: `Welcome to Huế, in central Vietnam. From eighteen oh two to nineteen forty-five, this was the capital of the Nguyễn dynasty, the last royal family of Vietnam. The emperors built a huge citadel here on the northern bank of the Perfume River, with thick walls, moats, and ten main gates. Inside it is the Imperial City, and inside that again, the Forbidden City, where only the emperor's family and servants could go. Outside the city, in the hills, you can visit the tombs of the emperors, each one designed by the emperor himself. In nineteen ninety-three, the monuments of Huế became a UNESCO World Heritage Site. And don't leave without trying bún bò Huế, the city's famous spicy beef noodle soup.`,
    questions: [
      { question: 'Which dynasty had its capital in Huế?', options: ['The Nguyễn dynasty', 'The Trần dynasty', 'The Lý dynasty', 'The Lê dynasty'], correctIndex: 0 },
      { question: 'Who could enter the Forbidden City?', options: ['Anyone with a ticket', 'Only soldiers', 'Only foreign visitors', 'Only the emperor\'s family and servants'], correctIndex: 3 },
      { question: 'When did Huế\'s monuments become a UNESCO World Heritage Site?', options: ['1802', '1945', '1993', '1975'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-30',
    title: 'Radio: Getting Ready for Tết',
    topic: 'Culture',
    level: 'Intermediate',
    duration: '50 sec',
    script: `Tết, the Lunar New Year, is the biggest holiday of the year in Vietnam. In the weeks before, families clean their homes from top to bottom to sweep away bad luck, and buy peach blossoms in the north or yellow apricot blossoms in the south. Many people travel back to their hometowns, so trains and buses are packed. On New Year's Eve, families gather for a big meal, and they often make bánh chưng, a square cake of sticky rice, mung beans, and pork wrapped in leaves. Children receive lucky money in small red envelopes, called lì xì. And the first person to enter a home in the new year is believed to bring luck for the whole year.`,
    questions: [
      { question: 'Why do families clean their homes before Tết?', options: ['To get ready for guests', 'To sweep away bad luck', 'Because it is the law', 'To sell old things'], correctIndex: 1 },
      { question: 'What is bánh chưng?', options: ['A square cake of sticky rice, mung beans and pork', 'A soup with beef and noodles', 'A sweet fried pastry', 'A drink made with rice'], correctIndex: 0 },
      { question: 'What are lì xì?', options: ['Flower decorations', 'New Year songs', 'Fireworks', 'Red envelopes with lucky money'], correctIndex: 3 },
    ],
  },
];

/* ─── IELTS Listening: sectioned audio + comprehension questions ── */
export interface IeltsListeningQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface IeltsListeningSection {
  id: string;
  title: string;
  section: 'Section 1' | 'Section 2' | 'Section 3' | 'Section 4';
  topic: string;
  description: string;
  duration: string;
  // Section 1 & 3 are conversations (two speakers); Section 2 & 4 are
  // monologues (one narrator) — same as the real IELTS Listening test.
  transcript: { speaker: string; text: string }[];
  questions: IeltsListeningQuestion[];
  tips?: string[];
}

export const ieltsListeningTopics = [
  'Everyday Services',
  'Campus Life',
  'Academic Discussion',
  'Lecture',
] as const;

export const ieltsListeningSections: IeltsListeningSection[] = [
  {
    id: 'ielts-l-1',
    title: 'Section 1 — Booking a Storage Unit',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A conversation between a customer and a staff member about renting a self-storage unit — the classic IELTS Section 1 format.',
    duration: '3 min',
    transcript: [
      { speaker: 'Staff', text: "Good morning, SafeSpace Storage, how can I help you?" },
      { speaker: 'Customer', text: "Hi, I'd like to rent a storage unit, just for a few months while I'm between apartments." },
      { speaker: 'Staff', text: "Sure, no problem. Can I get your full name first?" },
      { speaker: 'Customer', text: "It's Rachel Owen Baker, so that's B, A, K, E, R." },
      { speaker: 'Staff', text: "Great, and roughly how much furniture are we talking about?" },
      { speaker: 'Customer', text: "Just a one-bedroom's worth — a sofa, a bed frame, some boxes. I think a medium unit should be enough." },
      { speaker: 'Staff', text: "Perfect, our medium units are fifty square feet. That'll be eighty-nine dollars a month, and we ask for a deposit of one hundred dollars, refundable when you move out." },
      { speaker: 'Customer', text: "That works. Is there a minimum rental period?" },
      { speaker: 'Staff', text: "One month minimum, and after that it's month to month, so you can leave anytime with two weeks' notice." },
      { speaker: 'Customer', text: "Great. And what are your access hours?" },
      { speaker: 'Staff', text: "Six in the morning until ten at night, seven days a week. You'll get a personal access code for the gate." },
      { speaker: 'Customer', text: "Perfect. Can I come by this Saturday to sign everything and move a few things in?" },
      { speaker: 'Staff', text: "Absolutely, we're open until five on Saturdays. Just bring a photo ID and the deposit." },
    ],
    questions: [
      { question: "What is the customer's last name?", options: ['Owen', 'Baker', 'Barker', 'Becker'], correctIndex: 1 },
      { question: 'What size storage unit does the customer choose?', options: ['Small', 'Medium', 'Large', 'Extra-large'], correctIndex: 1 },
      { question: 'What is the monthly cost of the unit?', options: ['$79', '$89', '$100', '$109'], correctIndex: 1 },
      { question: 'How much notice is needed to end the rental?', options: ['One week', 'Two weeks', 'One month', 'No notice needed'], correctIndex: 1 },
    ],
    tips: [
      'Section 1 is always a factual, everyday conversation — listen for names, numbers, prices, and times.',
      'Spelled-out names and numbers are common trap points — write down exactly what you hear, not what you expect.',
    ],
  },
  {
    id: 'ielts-l-2',
    title: 'Section 2 — Orientation Tour of a University Library',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'A monologue given by a librarian to new students on their first campus tour — typical Section 2 content.',
    duration: '3 min',
    transcript: [
      { speaker: 'Librarian', text: "Welcome to Fenwick Library, everyone. I'm going to give you a quick overview before you head off to explore on your own. We're a five-floor building, and each floor has a slightly different purpose. The ground floor, where we're standing now, is the quiet study zone — no talking at all, so save your questions for me until we move upstairs. The second floor is the group study area, with bookable rooms for project work; you can reserve those online up to a week in advance. The third and fourth floors hold the main book collection, organized by subject, with the humanities on the third floor and sciences on the fourth. The top floor is the archive and special collections, which requires staff supervision to access, so you'll need to book an appointment if you ever need something from there. As for hours, we're open from eight in the morning until midnight during term time, but during exam period, we extend to twenty-four hours a day. Printing is available on every floor, and your student card doubles as your printing card — just top it up online. If you lose a book, the replacement fee is usually the cover price plus a fifteen-dollar processing fee, so do take care of what you borrow. Finally, if you ever need help finding something, the information desk on the second floor is staffed until nine every evening."},
    ],
    questions: [
      { question: 'What is the ground floor used for?', options: ['Group study', 'Quiet study', 'The archive', 'Printing services'], correctIndex: 1 },
      { question: 'Which floor holds the science collection?', options: ['Second', 'Third', 'Fourth', 'Fifth'], correctIndex: 2 },
      { question: 'During exam period, what are the library hours?', options: ['8 AM to midnight', '24 hours a day', '8 AM to 10 PM', '6 AM to midnight'], correctIndex: 1 },
      { question: 'What is the extra fee for a lost book, on top of the cover price?', options: ['$5', '$10', '$15', '$20'], correctIndex: 2 },
    ],
    tips: [
      'Section 2 monologues often describe a place floor-by-floor or area-by-area — sketch a quick mental map as you listen.',
      'Numbers (fees, hours, floor numbers) cluster together — don\'t let one distract you from catching the next.',
    ],
  },
  {
    id: 'ielts-l-3',
    title: 'Section 3 — Discussing a Group Assignment',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'Two students and their tutor discuss progress on a research project — typical Section 3 academic discussion format.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Tutor', text: "So, how's the survey data collection going for your urban planning project?" },
      { speaker: 'Student A', text: "It's going better than expected, actually. We've got over two hundred responses already, which is more than the hundred and fifty we were aiming for." },
      { speaker: 'Tutor', text: "That's great. What about you, have you started the analysis yet?" },
      { speaker: 'Student B', text: "We have, but honestly, we're finding it harder than we thought to compare the two neighborhoods fairly, because one has a much older population than the other." },
      { speaker: 'Tutor', text: "Right, that's a real methodological issue. Have you considered weighting the responses by age group?" },
      { speaker: 'Student A', text: "We talked about that, but neither of us has done that kind of statistical weighting before, so we were hoping you could point us to some resources." },
      { speaker: 'Tutor', text: "Sure, I'll send you a link to a tutorial after this. In the meantime, I'd suggest presenting both the raw and the weighted results in your report, so the reader can see the difference it makes." },
      { speaker: 'Student B', text: "That's a good idea. Should we push back our submission date? We were planning to hand in a first draft next Friday." },
      { speaker: 'Tutor', text: "I think you can still make that if you split the analysis work between the two of you this weekend. Just make sure the introduction and literature review are solid, since those don't depend on the weighting issue." },
      { speaker: 'Student A', text: "Okay, that sounds manageable. I'll take the literature review, and you can start on the introduction while I dig into the weighting tutorial." },
      { speaker: 'Tutor', text: "Sounds like a plan. Send me a draft by Wednesday if you want feedback before Friday." },
    ],
    questions: [
      { question: 'How many survey responses did the students collect?', options: ['150', '175', 'Over 200', 'Exactly 250'], correctIndex: 2 },
      { question: 'What problem are the students having with their analysis?', options: ['Not enough responses', 'Comparing two neighborhoods with different age profiles fairly', 'Missing survey questions', 'A broken statistics program'], correctIndex: 1 },
      { question: 'What does the tutor suggest they include in the report?', options: ['Only the weighted results', 'Only the raw results', 'Both raw and weighted results', 'Neither, just a summary'], correctIndex: 2 },
      { question: 'When does the tutor want to see a draft?', options: ['Monday', 'Wednesday', 'Friday', 'Next weekend'], correctIndex: 1 },
    ],
    tips: [
      'Section 3 has up to four speakers discussing academic work — track who agrees, who raises a problem, and who proposes a solution.',
      'The tutor/lecturer often restates or summarizes a student\'s point — that restatement is frequently where the answer sits.',
    ],
  },
  {
    id: 'ielts-l-4',
    title: 'Section 4 — Lecture on Urban Heat Islands',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'A short academic lecture on why cities are hotter than surrounding rural areas — typical Section 4 monologue on an academic topic.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "Today I want to talk about a phenomenon called the urban heat island effect. Simply put, cities are consistently warmer than the rural areas that surround them, sometimes by as much as seven degrees Celsius in the evening. There are three main causes I want to cover. The first is materials. Concrete, asphalt, and dark rooftops absorb far more solar radiation during the day than natural surfaces like grass or soil, and then release that heat slowly overnight, which is why cities often stay warm well after sunset. The second cause is the lack of vegetation. Trees and plants cool their surroundings through a process called evapotranspiration, essentially releasing water vapor that has a cooling effect, similar to sweating. Cities, with far fewer trees per square kilometer than rural areas, lose this natural cooling mechanism almost entirely. The third factor is waste heat — from air conditioners, vehicles, and industrial processes, all pumping additional heat directly into the urban environment. Now, why does this matter? Beyond simple discomfort, urban heat islands increase energy consumption, since more air conditioning is needed to cool buildings, which in turn generates yet more waste heat — a feedback loop. They also pose serious health risks during heat waves, particularly for elderly residents and those without access to air conditioning. So what can cities actually do about it? Urban planners have proposed several solutions. Green roofs — literally growing vegetation on top of buildings — can reduce a roof's surface temperature significantly. Reflective or 'cool' pavements, made with lighter-colored materials, reflect more sunlight instead of absorbing it. And simply planting more street trees remains one of the most cost-effective interventions available, providing both shade and evapotranspiration cooling. Some cities, including Singapore and parts of Los Angeles, have already implemented large-scale versions of these strategies with measurable results."},
    ],
    questions: [
      { question: 'By how much can cities be warmer than surrounding rural areas in the evening?', options: ['Up to 2°C', 'Up to 4°C', 'Up to 7°C', 'Up to 10°C'], correctIndex: 2 },
      { question: 'What cools the surroundings through evapotranspiration?', options: ['Concrete', 'Trees and plants', 'Air conditioners', 'Asphalt'], correctIndex: 1 },
      { question: 'What is described as a "feedback loop"?', options: ['Trees releasing water vapor', 'More air conditioning generating more waste heat', 'Cool pavements reflecting sunlight', 'Rain cooling city streets'], correctIndex: 1 },
      { question: 'Which cities are mentioned as having implemented cooling strategies?', options: ['Tokyo and Paris', 'Singapore and Los Angeles', 'London and New York', 'Dubai and Cairo'], correctIndex: 1 },
    ],
    tips: [
      'Section 4 is the hardest: one long, uninterrupted academic monologue with no second speaker to reset your attention — the lecturer usually signals structure with phrases like "the first cause," "the second factor."',
      'Specific named examples (cities, numbers, technical terms) near the end are common answers — the lecture often builds toward concrete examples.',
    ],
  },
  {
    id: 'ielts-l-5',
    title: 'Section 1 — Joining a Sports Centre',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A caller asks a receptionist about membership options at a local sports centre.',
    duration: '3 min',
    transcript: [
      { speaker: 'Receptionist', text: "Riverside Sports Centre, Jenny speaking. How can I help?" },
      { speaker: 'Caller', text: "Hello, I'm thinking of joining, and I wanted to ask about the different memberships." },
      { speaker: 'Receptionist', text: "Of course. We have three. Off-peak is twenty-five pounds a month and lets you use the gym before four in the afternoon. Standard is thirty-eight pounds and covers the gym and pool at any time. Premium is fifty-two and adds all the fitness classes." },
      { speaker: 'Caller', text: "I mostly want to swim after work, so I suppose that rules out off-peak." },
      { speaker: 'Receptionist', text: "It does, yes. Standard would suit you best. There's also a one-off joining fee of fifteen pounds, but we're waiving it for anyone who signs up before the end of the month." },
      { speaker: 'Caller', text: "Oh, good timing. Can I take your details? What name should I give?" },
      { speaker: 'Receptionist', text: "Actually, I'll take yours. What's your full name?" },
      { speaker: 'Caller', text: "Daniel Whitford. That's W, H, I, T, F, O, R, D." },
      { speaker: 'Receptionist', text: "And a contact number?" },
      { speaker: 'Caller', text: "Zero seven seven one three, four eight two, nine zero six." },
      { speaker: 'Receptionist', text: "Lovely. When you come in for your induction, please bring a passport-sized photo for your card. Inductions run on Tuesday and Thursday evenings at seven." },
      { speaker: 'Caller', text: "Thursday would be better for me." },
      { speaker: 'Receptionist', text: "I'll put you down for Thursday, then. See you then, Daniel." },
    ],
    questions: [
      { question: 'Which membership does the receptionist recommend?', options: ['Off-peak', 'Standard', 'Premium', 'Student'], correctIndex: 1 },
      { question: 'How much is the Standard membership per month?', options: ['£25', '£38', '£52', '£15'], correctIndex: 1 },
      { question: "How is the caller's surname spelled?", options: ['Whitfield', 'Whitford', 'Witford', 'Whiteford'], correctIndex: 1 },
      { question: 'What must the caller bring to the induction?', options: ['A passport', 'A bank card', 'A passport-sized photo', 'A swimming cap'], correctIndex: 2 },
    ],
    tips: [
      'When several prices are listed in a row, note each one against its option — the question will only ask about one.',
      'A fee that is "waived" is not paid — listen for words that cancel what came before.',
    ],
  },
  {
    id: 'ielts-l-6',
    title: 'Section 1 — Reporting Lost Property',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A passenger reports a bag left on a train to the lost property office.',
    duration: '3 min',
    transcript: [
      { speaker: 'Officer', text: "Lost property, good afternoon." },
      { speaker: 'Passenger', text: "Hi, I left a bag on the train this morning and I'm hoping someone handed it in." },
      { speaker: 'Officer', text: "Let's see. Which service were you on?" },
      { speaker: 'Passenger', text: "The eight-fifteen from Hadley to Central. I got off at Central around eight fifty." },
      { speaker: 'Officer', text: "And can you describe the bag?" },
      { speaker: 'Passenger', text: "It's a navy blue backpack — not black, quite a dark blue — with a red zip on the front pocket." },
      { speaker: 'Officer', text: "What was inside?" },
      { speaker: 'Passenger', text: "A laptop, a library book, and my glasses case. Oh, and an umbrella in the side pocket." },
      { speaker: 'Officer', text: "Nothing matching has come in yet, but items from the morning trains usually arrive here by four. I'll register it. Your name?" },
      { speaker: 'Passenger', text: "Priya Nandakumar. I'll spell the surname: N, A, N, D, A, K, U, M, A, R." },
      { speaker: 'Officer', text: "Thanks. Your reference number is L, four, four, seven, two. If it turns up, we'll keep it for three months. There's a small handling charge of five pounds when you collect." },
      { speaker: 'Passenger', text: "That's fine. Where do I collect from?" },
      { speaker: 'Officer', text: "Here at Central, platform one, next to the ticket office." },
    ],
    questions: [
      { question: 'What time did the passenger\'s train leave?', options: ['8:15', '8:50', '8:05', '4:00'], correctIndex: 0 },
      { question: 'What colour is the bag?', options: ['Black', 'Red', 'Navy blue', 'Light blue'], correctIndex: 2 },
      { question: 'What is the reference number?', options: ['L4472', 'L4427', 'L7442', 'L4742'], correctIndex: 0 },
      { question: 'How long will found items be kept?', options: ['One month', 'Three months', 'Six months', 'One year'], correctIndex: 1 },
    ],
    tips: [
      'Speakers often correct themselves ("not black, quite a dark blue") — the corrected detail is the answer.',
      'Reference numbers mix letters and digits; write them as you hear them and check the order.',
    ],
  },
  {
    id: 'ielts-l-7',
    title: 'Section 1 — Booking a Cooking Class',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A customer books a place on a weekend cooking course.',
    duration: '3 min',
    transcript: [
      { speaker: 'Assistant', text: "Good morning, Fresh Table Cookery School." },
      { speaker: 'Customer', text: "Hi, I saw your weekend courses online. I'm interested in the Thai cooking one." },
      { speaker: 'Assistant', text: "Ah, I'm afraid the Thai course is fully booked this month. We do have spaces on Italian and on Vegetarian Basics." },
      { speaker: 'Customer', text: "Hmm, I'll go for Vegetarian Basics, then. How long is it?" },
      { speaker: 'Assistant', text: "It's a single day — Saturday from ten until three, with a lunch break where you eat what you've cooked." },
      { speaker: 'Customer', text: "And the price?" },
      { speaker: 'Assistant', text: "Normally seventy-five pounds, but if you book two people together it's sixty-five each." },
      { speaker: 'Customer', text: "It's just me, so seventy-five. Do I need to bring anything?" },
      { speaker: 'Assistant', text: "All ingredients and equipment are provided. Just bring an apron if you have one, and a container to take leftovers home." },
      { speaker: 'Customer', text: "Great. Is there parking?" },
      { speaker: 'Assistant', text: "Not on site, but there's a public car park on Mill Lane, about two minutes' walk away." },
      { speaker: 'Customer', text: "Perfect. Do you need to know about allergies?" },
      { speaker: 'Assistant', text: "Yes, please." },
      { speaker: 'Customer', text: "I'm allergic to peanuts." },
      { speaker: 'Assistant', text: "Noted. I'll email your confirmation shortly." },
    ],
    questions: [
      { question: 'Which course does the customer book?', options: ['Thai', 'Italian', 'Vegetarian Basics', 'Baking'], correctIndex: 2 },
      { question: 'How much will the customer pay?', options: ['£65', '£75', '£130', '£150'], correctIndex: 1 },
      { question: 'What should the customer bring?', options: ['Ingredients', 'A knife set', 'An apron and a container', 'Lunch'], correctIndex: 2 },
      { question: 'Where can the customer park?', options: ['On site', 'On Mill Lane', 'At the station', 'On the high street'], correctIndex: 1 },
    ],
    tips: [
      'The first option mentioned is often unavailable — wait for the speaker\'s final choice.',
      'Discounts usually come with a condition; check whether the condition applies to the speaker.',
    ],
  },
  {
    id: 'ielts-l-8',
    title: 'Section 1 — Renting a Flat',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A student calls a letting agent to ask about a flat advertised online.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Agent', text: "Hollis Lettings, Mark speaking." },
      { speaker: 'Student', text: "Hi, I'm calling about the two-bedroom flat on Cedar Road." },
      { speaker: 'Agent', text: "Number fourteen? Yes, it's still available. The rent is eight hundred and fifty pounds a month." },
      { speaker: 'Student', text: "Does that include bills?" },
      { speaker: 'Agent', text: "Water is included, but electricity and internet are separate. Council tax too, though students are exempt." },
      { speaker: 'Student', text: "Good. Is it furnished?" },
      { speaker: 'Agent', text: "Partly. There are beds, wardrobes and a sofa, but no desk in either bedroom." },
      { speaker: 'Student', text: "I'd need to buy a desk, then. How far is it from the university?" },
      { speaker: 'Agent', text: "About twenty minutes on foot, or there's a bus stop right outside — the number forty-two takes ten minutes." },
      { speaker: 'Student', text: "And what's the deposit?" },
      { speaker: 'Agent', text: "Five weeks' rent, held in a government protection scheme." },
      { speaker: 'Student', text: "Could I see it this week?" },
      { speaker: 'Agent', text: "I have Wednesday at five-thirty or Friday at midday." },
      { speaker: 'Student', text: "I have lectures on Friday, so Wednesday, please." },
      { speaker: 'Agent', text: "Done. I'll meet you outside the building." },
    ],
    questions: [
      { question: 'What is the house number of the flat?', options: ['4', '14', '40', '42'], correctIndex: 1 },
      { question: 'Which bill is included in the rent?', options: ['Electricity', 'Internet', 'Water', 'Council tax'], correctIndex: 2 },
      { question: 'What furniture is missing?', options: ['Beds', 'A sofa', 'Wardrobes', 'Desks'], correctIndex: 3 },
      { question: 'When will the student view the flat?', options: ['Wednesday at 5:30', 'Friday at 12:00', 'Wednesday at 12:00', 'Friday at 5:30'], correctIndex: 0 },
    ],
    tips: [
      'Listen for "but", "except" and "separate" — they mark what is NOT included.',
      'When two appointment times are offered, the speaker\'s reason for rejecting one tells you which they chose.',
    ],
  },
  {
    id: 'ielts-l-9',
    title: 'Section 1 — Registering at a Medical Clinic',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A new resident registers with a local doctor\'s surgery.',
    duration: '3 min',
    transcript: [
      { speaker: 'Receptionist', text: "Parkview Medical Centre, how can I help?" },
      { speaker: 'Patient', text: "I've just moved to the area and I'd like to register with a doctor." },
      { speaker: 'Receptionist', text: "Certainly. Can I have your full name?" },
      { speaker: 'Patient', text: "Tomás Herrera. Tomás with an accent on the A." },
      { speaker: 'Receptionist', text: "And your date of birth?" },
      { speaker: 'Patient', text: "The third of September, nineteen ninety-eight." },
      { speaker: 'Receptionist', text: "Your new address?" },
      { speaker: 'Patient', text: "Flat B, twenty-seven Linden Avenue. The postcode is L, N, four, seven, T, R." },
      { speaker: 'Receptionist', text: "Do you have any ongoing conditions or regular medication?" },
      { speaker: 'Patient', text: "I have mild asthma, so I use an inhaler." },
      { speaker: 'Receptionist', text: "Thank you. All new patients have a short health check with a nurse. The earliest is next Monday at nine-forty." },
      { speaker: 'Patient', text: "That's fine." },
      { speaker: 'Receptionist', text: "Please arrive ten minutes early and bring proof of address — a utility bill or a tenancy agreement." },
      { speaker: 'Patient', text: "I'll bring my tenancy agreement; I haven't had a bill yet." },
    ],
    questions: [
      { question: "What is the patient's date of birth?", options: ['3 September 1998', '9 March 1998', '3 September 1989', '30 September 1998'], correctIndex: 0 },
      { question: "What is the patient's house number?", options: ['7', '17', '27', '47'], correctIndex: 2 },
      { question: 'What condition does the patient have?', options: ['Diabetes', 'Asthma', 'High blood pressure', 'An allergy'], correctIndex: 1 },
      { question: 'What will the patient bring as proof of address?', options: ['A utility bill', 'A passport', 'A tenancy agreement', 'A bank statement'], correctIndex: 2 },
    ],
    tips: [
      'Dates can be said in different orders — note day, month and year separately.',
      'Postcodes and addresses are spelled out letter by letter; one missed letter loses the mark.',
    ],
  },
  {
    id: 'ielts-l-10',
    title: 'Section 1 — Hiring a Venue for a Party',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A customer enquires about hiring a community hall for a birthday party.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Manager', text: "Oakfield Community Hall, Susan speaking." },
      { speaker: 'Customer', text: "Hello, I'd like to hire the hall for my father's seventieth birthday party." },
      { speaker: 'Manager', text: "Lovely. What date were you thinking?" },
      { speaker: 'Customer', text: "Saturday the eighteenth of May." },
      { speaker: 'Manager', text: "The main hall is booked that day, but the smaller Garden Room is free. It holds up to sixty people." },
      { speaker: 'Customer', text: "We're expecting about forty-five, so that's fine." },
      { speaker: 'Manager', text: "The Garden Room is thirty pounds an hour, with a minimum of four hours." },
      { speaker: 'Customer', text: "We'd want it from six until eleven, so five hours." },
      { speaker: 'Manager', text: "That's a hundred and fifty pounds. You can use the kitchen at no extra cost, but you must bring your own tablecloths." },
      { speaker: 'Customer', text: "Can we play music?" },
      { speaker: 'Manager', text: "Yes, but it must stop by ten-thirty because of the neighbours." },
      { speaker: 'Customer', text: "Understood. How do I pay?" },
      { speaker: 'Manager', text: "A fifty-pound deposit by bank transfer now, and the rest on the day." },
    ],
    questions: [
      { question: 'Which room will the customer hire?', options: ['The main hall', 'The Garden Room', 'The kitchen', 'The meeting room'], correctIndex: 1 },
      { question: 'How many guests are expected?', options: ['About 45', 'About 60', 'About 70', 'About 18'], correctIndex: 0 },
      { question: 'What is the total cost of the room?', options: ['£120', '£150', '£180', '£50'], correctIndex: 1 },
      { question: 'When must music stop?', options: ['10:00', '10:30', '11:00', '11:30'], correctIndex: 1 },
    ],
    tips: [
      'Ages, dates and capacities often sound like answers — match each number to what it describes.',
      'Some answers need simple arithmetic (rate × hours); listen for both parts.',
    ],
  },
  {
    id: 'ielts-l-11',
    title: 'Section 1 — Opening a Bank Account',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'An international student asks a bank adviser how to open an account.',
    duration: '3 min',
    transcript: [
      { speaker: 'Adviser', text: "Good morning, welcome to Northgate Bank. How can I help?" },
      { speaker: 'Student', text: "I'd like to open an account. I've just started at the university." },
      { speaker: 'Adviser', text: "Then our student account is ideal. It has no monthly fee and an interest-free overdraft of up to five hundred pounds in the first year." },
      { speaker: 'Student', text: "Great. What do I need?" },
      { speaker: 'Adviser', text: "Your passport, your visa, and a letter from the university confirming your course. A council tax letter isn't needed." },
      { speaker: 'Student', text: "I have the passport and visa with me, but not the university letter." },
      { speaker: 'Adviser', text: "You can request one from the Student Services desk — it usually takes two working days." },
      { speaker: 'Student', text: "When will my card arrive after I open it?" },
      { speaker: 'Adviser', text: "Around five to seven working days, by post. Your PIN comes separately, a day or two later." },
      { speaker: 'Student', text: "Can I use the mobile app straight away?" },
      { speaker: 'Adviser', text: "Yes, as soon as the account is open. Shall I book you an appointment for when you have the letter?" },
      { speaker: 'Student', text: "Yes, please. Thursday afternoon?" },
      { speaker: 'Adviser', text: "Two-fifteen on Thursday it is." },
    ],
    questions: [
      { question: 'What is the overdraft limit in the first year?', options: ['£50', '£250', '£500', '£1,000'], correctIndex: 2 },
      { question: 'Which document does the student NOT have yet?', options: ['Passport', 'Visa', 'University letter', 'Council tax letter'], correctIndex: 2 },
      { question: 'How long does the card take to arrive?', options: ['1–2 days', '2 days', '5–7 working days', 'Two weeks'], correctIndex: 2 },
      { question: 'When is the appointment?', options: ['Thursday at 2:15', 'Tuesday at 2:15', 'Thursday at 2:50', 'Friday at 2:15'], correctIndex: 0 },
    ],
    tips: [
      'Questions with "NOT" reward listening for what the speaker lacks, not what they have.',
      'Similar-sounding times (fifteen / fifty) are common traps — stress usually falls on "-teen".',
    ],
  },
  {
    id: 'ielts-l-12',
    title: 'Section 1 — Booking a Day Tour',
    section: 'Section 1',
    topic: 'Everyday Services',
    description: 'A tourist books a coach day trip at a tourist information centre.',
    duration: '3 min',
    transcript: [
      { speaker: 'Agent', text: "Hi there, welcome to the tourist information centre." },
      { speaker: 'Tourist', text: "Hello. I'd like to book a day trip to the lakes." },
      { speaker: 'Agent', text: "We have two. The Classic Tour visits three lakes and costs forty-two dollars. The Explorer Tour adds a boat ride and a short hike, for sixty-eight." },
      { speaker: 'Tourist', text: "The boat ride sounds lovely. I'll take the Explorer." },
      { speaker: 'Agent', text: "Which day?" },
      { speaker: 'Tourist', text: "Tomorrow, if possible." },
      { speaker: 'Agent', text: "Tomorrow's Explorer is full, I'm afraid. Wednesday has places." },
      { speaker: 'Tourist', text: "Wednesday's fine." },
      { speaker: 'Agent', text: "The coach leaves from outside the town hall at seven-thirty sharp and returns around six. Lunch isn't included, but there's a café at the second lake." },
      { speaker: 'Tourist', text: "Should I bring anything special?" },
      { speaker: 'Agent', text: "Good walking shoes for the hike, and a waterproof jacket — the weather changes quickly up there." },
      { speaker: 'Tourist', text: "Will do. Can I pay by card?" },
      { speaker: 'Agent', text: "Of course." },
    ],
    questions: [
      { question: 'How much does the chosen tour cost?', options: ['$42', '$58', '$68', '$86'], correctIndex: 2 },
      { question: 'Which day will the tourist go?', options: ['Today', 'Tomorrow', 'Tuesday', 'Wednesday'], correctIndex: 3 },
      { question: 'Where does the coach leave from?', options: ['The train station', 'The town hall', 'The tourist centre', 'The second lake'], correctIndex: 1 },
      { question: 'What does the agent advise bringing?', options: ['A packed lunch', 'A swimsuit', 'A waterproof jacket', 'A camera'], correctIndex: 2 },
    ],
    tips: [
      'The day the speaker first asks for is often unavailable — the agreed alternative is the answer.',
      '"Isn\'t included" turns a likely-sounding option into a wrong one.',
    ],
  },
  {
    id: 'ielts-l-13',
    title: 'Section 2 — Student Accommodation Welcome',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'A residence manager welcomes new students to their halls of residence.',
    duration: '3 min',
    transcript: [
      { speaker: 'Manager', text: "Good evening and welcome to Ashworth Hall. I'm Claire, the residence manager, and I'll run through a few essentials. Each corridor has eight bedrooms sharing one kitchen, and kitchens are cleaned by our staff twice a week — on Mondays and Thursdays — though you're expected to wash your own dishes every day. Laundry is in the basement; machines take your student card, and a wash costs two pounds fifty, with drying another pound. Post is delivered to the reception desk, not to your room, and parcels can be collected between nine and five on weekdays. If you have a maintenance problem, like a broken light or a dripping tap, report it through the online form rather than calling us; urgent issues such as a flood can be reported by phone any time. A fire alarm test happens every Wednesday at eleven in the morning — if it rings for longer than a minute, it's real, so leave immediately by the nearest stairs, never the lift. Quiet hours run from eleven at night until seven in the morning. Finally, guests may stay overnight for a maximum of three nights a month, and they must be signed in at reception." },
    ],
    questions: [
      { question: 'How many bedrooms share a kitchen?', options: ['Six', 'Eight', 'Ten', 'Twelve'], correctIndex: 1 },
      { question: 'How should non-urgent maintenance problems be reported?', options: ['By phone', 'At reception', 'Through the online form', 'By email to Claire'], correctIndex: 2 },
      { question: 'When is the weekly fire alarm test?', options: ['Monday at 11 AM', 'Wednesday at 11 AM', 'Thursday at 11 AM', 'Wednesday at 11 PM'], correctIndex: 1 },
      { question: 'How many nights a month may a guest stay?', options: ['One', 'Two', 'Three', 'Seven'], correctIndex: 2 },
    ],
    tips: [
      'Rules in Section 2 often come with exceptions ("rather than", "except") — the exception is a favourite question.',
      'Days of the week cluster together; note which activity belongs to which day.',
    ],
  },
  {
    id: 'ielts-l-14',
    title: 'Section 2 — A Guided Walk Through the Botanic Gardens',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'A guide introduces visitors to the main areas of a city botanic garden.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Guide', text: "Welcome to the Kingsley Botanic Gardens. We're standing at the main gate, and before we set off I'll give you a sense of the layout. Directly ahead is the Glasshouse, home to over two thousand tropical species; it's kept at twenty-six degrees all year, so you may want to remove a layer before going in. To the left of the Glasshouse is the Rose Garden, which was originally planted in eighteen ninety-two and is at its best in June. Beyond that, following the path down the hill, you'll reach the Lake, where you can hire rowing boats in summer for eight pounds per half hour. On the right-hand side of the main path is the Children's Discovery Zone, with a maze and a small treehouse. The café sits between the Discovery Zone and the Herb Garden, and I'd recommend it — all the salad leaves are grown on site. Please note that dogs are welcome on leads everywhere except inside the Glasshouse and the Discovery Zone. Our free guided tours leave from this gate at eleven and two each day, and the gardens close at dusk, which this time of year is about six o'clock." },
    ],
    questions: [
      { question: 'What temperature is the Glasshouse kept at?', options: ['16°C', '20°C', '26°C', '30°C'], correctIndex: 2 },
      { question: 'When was the Rose Garden first planted?', options: ['1829', '1892', '1902', '1992'], correctIndex: 1 },
      { question: 'Where is the café?', options: ['Next to the Lake', 'Inside the Glasshouse', 'Between the Discovery Zone and the Herb Garden', 'At the main gate'], correctIndex: 2 },
      { question: 'Where are dogs NOT allowed?', options: ['The Rose Garden', 'The Lake', 'The Glasshouse', 'The Herb Garden'], correctIndex: 2 },
    ],
    tips: [
      'Map questions follow the speaker\'s route — "ahead", "to the left", "beyond" — so keep track of the starting point.',
      'Years like 1892 and 1829 sound similar; listen to the order of the digits carefully.',
    ],
  },
  {
    id: 'ielts-l-15',
    title: 'Section 2 — Volunteering at a Community Festival',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'An organiser briefs volunteers before a weekend community festival.',
    duration: '3 min',
    transcript: [
      { speaker: 'Organiser', text: "Thanks so much for coming, everyone. This is the twelfth year of the Harbour Festival, and we're expecting around fifteen thousand visitors over the weekend, which is up from about eleven thousand last year. You've each been given a coloured lanyard. Green lanyards are for the information tents, blue are for stewarding the car parks, and yellow are for the children's area. If you're on yellow, you must have completed the safeguarding check — if you haven't, please see me afterwards. Shifts last four hours, and every volunteer gets a free meal voucher for the food stalls and a festival T-shirt, which you need to wear while on duty. Please arrive at the volunteer tent, which is behind the main stage, thirty minutes before your shift starts so we can brief you. If you need to cancel, text the volunteer coordinator, Ben, rather than emailing, as he won't be checking his inbox over the weekend. And one last thing — the most common question visitors ask is where the toilets are, so please memorise that there are blocks by the north entrance and next to the harbour wall." },
    ],
    questions: [
      { question: 'How many visitors are expected this year?', options: ['11,000', '12,000', '15,000', '50,000'], correctIndex: 2 },
      { question: 'What colour lanyard is for car park stewards?', options: ['Green', 'Blue', 'Yellow', 'Red'], correctIndex: 1 },
      { question: 'Where is the volunteer tent?', options: ['By the north entrance', 'Next to the harbour wall', 'Behind the main stage', 'In the car park'], correctIndex: 2 },
      { question: 'How should volunteers cancel a shift?', options: ['Email Ben', 'Text Ben', 'Call the organiser', 'Tell the information tent'], correctIndex: 1 },
    ],
    tips: [
      'Last year\'s figures are mentioned to distract you — check which year the question asks about.',
      'Colour-coded or category lists are best noted as quick pairs: green = info, blue = parking.',
    ],
  },
  {
    id: 'ielts-l-16',
    title: 'Section 2 — Museum Audio Guide Introduction',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'The introductory track of a history museum\'s audio guide.',
    duration: '3 min',
    transcript: [
      { speaker: 'Narrator', text: "Welcome to the Thornbury Museum of Local History. This guide will take about ninety minutes if you visit every gallery, but feel free to skip ahead. The museum is arranged chronologically, starting on the lower ground floor with the Stone Age gallery, where the highlight is a five-thousand-year-old wooden canoe found in the river in nineteen sixty-four. The ground floor covers the Roman and medieval periods; don't miss the mosaic floor, which was moved here piece by piece from a farm just outside town. On the first floor you'll find the Industrial Revolution gallery, centred on the town's wool mills — there's a working loom that is demonstrated at twelve and three each day. The top floor is our temporary exhibition space; currently it's showing photographs of the town from the nineteen fifties, and that exhibition closes at the end of next month. Photography is allowed throughout the museum, but please don't use flash in the Stone Age gallery, as light damages the canoe. Lockers are available by the entrance for a one-pound coin, which is returned when you collect your belongings." },
    ],
    questions: [
      { question: 'What is the highlight of the Stone Age gallery?', options: ['A mosaic floor', 'A wooden canoe', 'A working loom', 'Stone tools'], correctIndex: 1 },
      { question: 'Where did the mosaic floor come from?', options: ['The river', 'A farm outside town', 'A church', 'A Roman villa abroad'], correctIndex: 1 },
      { question: 'What is shown in the temporary exhibition?', options: ['Wool mill machinery', 'Medieval coins', 'Photographs from the 1950s', 'Paintings of the river'], correctIndex: 2 },
      { question: 'Where is flash photography forbidden?', options: ['Everywhere', 'The Stone Age gallery', 'The Industrial gallery', 'The temporary exhibition'], correctIndex: 1 },
    ],
    tips: [
      'Floor-by-floor descriptions map neatly onto matching questions — write the floor next to each gallery name.',
      'A general permission followed by "but" usually leads straight to a question.',
    ],
  },
  {
    id: 'ielts-l-17',
    title: 'Section 2 — Radio Report on a New Cycle Scheme',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'A local radio presenter explains how a city bike-sharing scheme works.',
    duration: '3 min',
    transcript: [
      { speaker: 'Presenter', text: "And now some local news. From next Monday, the city's new bike-sharing scheme, CityCycle, launches with four hundred bikes at fifty docking stations. To use it, you'll need to download the CityCycle app and register a payment card. Rides cost one pound to unlock and then ten pence a minute, although the first fifteen minutes of every ride are free for annual members. Annual membership is sixty pounds, or thirty-five for students and over-sixty-fives. A quarter of the fleet — so one hundred bikes — are electric, and these cost an extra five pence per minute. Bikes must be returned to a docking station; leaving one elsewhere results in a twenty-pound fine. The council says the scheme is aimed mainly at commuters, and stations have been placed near all three railway stations and the main hospital. Helmets aren't provided, but they're strongly recommended. The scheme will be reviewed after six months, and if it's successful, the council plans to double the number of stations." },
    ],
    questions: [
      { question: 'How many bikes will the scheme start with?', options: ['50', '100', '400', '500'], correctIndex: 2 },
      { question: 'How much is annual membership for students?', options: ['£35', '£60', '£20', '£15'], correctIndex: 0 },
      { question: 'What happens if a bike is not returned to a docking station?', options: ['The account is closed', 'A £20 fine', 'A £5 charge', 'Nothing'], correctIndex: 1 },
      { question: 'When will the scheme be reviewed?', options: ['After one month', 'After three months', 'After six months', 'After one year'], correctIndex: 2 },
    ],
    tips: [
      'Fractions ("a quarter of the fleet") are often restated as numbers — both forms may appear in the options.',
      'Concessions (students, over-60s) are classic question targets.',
    ],
  },
  {
    id: 'ielts-l-18',
    title: 'Section 2 — Careers Fair Information',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'A careers adviser explains how to get the most out of the university careers fair.',
    duration: '3 min',
    transcript: [
      { speaker: 'Adviser', text: "Hello everyone. The annual careers fair takes place next Thursday in the Sports Hall, from ten until four. This year we have over ninety employers attending, from engineering firms to charities. The hall will be divided into four zones: Zone A for technology, Zone B for finance and law, Zone C for public sector and charities, and Zone D for creative industries. Last year the queues were longest at lunchtime, so I'd recommend arriving early or after two. Bring several printed copies of your CV — at least ten — though many employers will also scan a QR code linking to your online profile. Dress is smart casual; you don't need a suit. Between eleven and one, there will be short talks in Lecture Theatre Two on topics such as writing cover letters and preparing for video interviews. If you'd like your CV checked before the fair, our team runs drop-in sessions every afternoon this week at the Careers Centre, which is on the first floor of the Student Union building. Finally, don't forget to fill in the feedback form — everyone who does is entered into a draw for a fifty-pound book voucher." },
    ],
    questions: [
      { question: 'Where is the careers fair held?', options: ['The Student Union', 'The Sports Hall', 'Lecture Theatre Two', 'The Careers Centre'], correctIndex: 1 },
      { question: 'Which zone is for finance and law?', options: ['Zone A', 'Zone B', 'Zone C', 'Zone D'], correctIndex: 1 },
      { question: 'What does the adviser say about clothing?', options: ['A suit is required', 'Smart casual is fine', 'Wear university colours', 'Anything is acceptable'], correctIndex: 1 },
      { question: 'What is the prize for completing the feedback form?', options: ['A free CV check', 'A £50 book voucher', 'A job interview', 'A £10 coffee voucher'], correctIndex: 1 },
    ],
    tips: [
      'Venue names repeat in this kind of talk; tie each to its event (fair, talks, CV checks).',
      '"You don\'t need" statements eliminate options that sound sensible.',
    ],
  },
  {
    id: 'ielts-l-19',
    title: 'Section 2 — Farm Open Day',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'A farmer welcomes families to an open day and describes the activities.',
    duration: '3 min',
    transcript: [
      { speaker: 'Farmer', text: "Morning, everyone, and welcome to Hilltop Farm's open day. My family has farmed here for four generations, and today we're showing you how a modern dairy farm works. We have about two hundred and forty cows, and milking happens twice a day, at five in the morning and four in the afternoon — so if you want to watch, the viewing gallery opens at quarter to four. Tractor rides around the farm leave every thirty minutes from the big red barn; they're free, but children under five must sit on an adult's lap. In the small animal area you can feed the lambs and goats, but please only use the feed bags we sell at the entrance, at one pound each, because other food can make the animals ill. Our farm shop sells our own cheese and ice cream — the strawberry ice cream won a national award last year. Hand-washing stations are next to every animal pen, and please do use them, especially before eating. The picnic field is beside the duck pond, and the open day finishes at five." },
    ],
    questions: [
      { question: 'How many cows does the farm have?', options: ['About 140', 'About 200', 'About 240', 'About 420'], correctIndex: 2 },
      { question: 'When does the viewing gallery open for afternoon milking?', options: ['3:45', '4:00', '4:15', '5:00'], correctIndex: 0 },
      { question: 'Where do tractor rides leave from?', options: ['The farm shop', 'The duck pond', 'The red barn', 'The entrance'], correctIndex: 2 },
      { question: 'Which product won a national award?', options: ['Cheddar cheese', 'Strawberry ice cream', 'Fresh milk', 'Goat\'s cheese'], correctIndex: 1 },
    ],
    tips: [
      '"Quarter to four" is 3:45 — practise converting spoken times quickly.',
      'Listen for reasons ("because other food can make the animals ill") — they often explain a rule that is tested.',
    ],
  },
  {
    id: 'ielts-l-20',
    title: 'Section 2 — Changes to the Town Library Service',
    section: 'Section 2',
    topic: 'Campus Life',
    description: 'A council spokesperson explains upcoming changes to public library services.',
    duration: '3 min',
    transcript: [
      { speaker: 'Spokesperson', text: "Good evening. I'm here to explain the changes coming to our library service from the first of April. First, the central library will close for refurbishment for approximately eight weeks. During that time, a temporary library will operate from the old post office building on Market Street, though it will hold only about a third of the usual stock. Second, opening hours at the branch libraries will be extended — they'll now open on Sundays from ten until two. Third, late fees for children's books are being abolished completely, while adult late fees will stay at twenty pence a day. We're also introducing self-service machines at every branch, so you can borrow and return books without queuing; staff will still be available to help. When the central library reopens, it will have a new café, a dedicated teenage zone and a makerspace with 3D printers, which will be free to use after a short training session. Finally, the mobile library van, which visits rural villages, will now come weekly instead of fortnightly." },
    ],
    questions: [
      { question: 'How long will the central library be closed?', options: ['About four weeks', 'About six weeks', 'About eight weeks', 'About three months'], correctIndex: 2 },
      { question: 'Where will the temporary library be?', options: ['A school', 'The old post office', 'The town hall', 'A branch library'], correctIndex: 1 },
      { question: 'What is changing about late fees?', options: ['All fees are abolished', "Children's late fees are abolished", 'Adult fees are rising', 'Fees are halved'], correctIndex: 1 },
      { question: 'How often will the mobile library visit villages?', options: ['Daily', 'Weekly', 'Fortnightly', 'Monthly'], correctIndex: 1 },
    ],
    tips: [
      'Talks about change compare old and new — always check whether an option describes before or after.',
      'Signposting ("First", "Second", "Finally") helps you keep your place in the questions.',
    ],
  },
  {
    id: 'ielts-l-21',
    title: 'Section 3 — Planning a Presentation on Plastic Waste',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'Two environmental science students plan a joint seminar presentation.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Maya', text: "So, we've got fifteen minutes for the presentation on plastic waste. How shall we divide it?" },
      { speaker: 'Leo', text: "I thought we could start with the scale of the problem — how much plastic ends up in the ocean each year." },
      { speaker: 'Maya', text: "Good, but I don't want to open with a wall of statistics. What about starting with a photo, like that image of the seabird?" },
      { speaker: 'Leo', text: "Yes, that would grab attention. Then the statistics, but just two or three key figures." },
      { speaker: 'Maya', text: "Agreed. After that, I'd like to compare recycling rates in different countries. Germany's is much higher than ours." },
      { speaker: 'Leo', text: "Right, though our tutor said last week we should focus on solutions rather than just comparisons." },
      { speaker: 'Maya', text: "True. So maybe the comparison leads into solutions — what Germany does differently, like the bottle deposit scheme." },
      { speaker: 'Leo', text: "That works. I can cover deposit schemes, and you take the section on biodegradable alternatives, since you did that reading." },
      { speaker: 'Maya', text: "Fine. Though I'm a bit worried — some of the sources I found say biodegradable plastics only break down in industrial composting conditions." },
      { speaker: 'Leo', text: "That's actually a great point to include. It shows we're thinking critically." },
      { speaker: 'Maya', text: "Okay. And for the ending, should we give recommendations?" },
      { speaker: 'Leo', text: "Yes, and finish with a question for the audience to start the discussion." },
      { speaker: 'Maya', text: "Let's rehearse on Tuesday in the library, then." },
    ],
    questions: [
      { question: 'How do the students decide to open the presentation?', options: ['With statistics', 'With a photograph', 'With a question', 'With a video'], correctIndex: 1 },
      { question: 'What did the tutor advise?', options: ['Use more statistics', 'Focus on solutions', 'Compare more countries', 'Keep it under ten minutes'], correctIndex: 1 },
      { question: 'What concern does Maya have about biodegradable plastics?', options: ['They are too expensive', 'They only break down in industrial composting', 'They are toxic', 'There is no research on them'], correctIndex: 1 },
      { question: 'How will the presentation end?', options: ['With a photo', 'With a summary of statistics', 'With a question for the audience', 'With a video clip'], correctIndex: 2 },
    ],
    tips: [
      'In planning discussions, the first suggestion is often changed — wait until both speakers agree.',
      'Reported advice ("our tutor said…") is a common question source in Section 3.',
    ],
  },
  {
    id: 'ielts-l-22',
    title: 'Section 3 — Feedback on a Psychology Experiment',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'A student discusses the design of their memory experiment with a supervisor.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Supervisor', text: "I've read your proposal, Hannah. Can you summarise the experiment for me?" },
      { speaker: 'Hannah', text: "I want to test whether listening to music while studying affects memory. Participants learn a list of thirty words, either in silence or with background music, then recall them after twenty minutes." },
      { speaker: 'Supervisor', text: "Clear enough. How many participants?" },
      { speaker: 'Hannah', text: "I was hoping for forty, twenty in each group." },
      { speaker: 'Supervisor', text: "That's a bit small to detect a modest effect. Could you get sixty?" },
      { speaker: 'Hannah', text: "Possibly, if I recruit from first-year lectures as well as my own year." },
      { speaker: 'Supervisor', text: "Good. My bigger concern is the music. What kind are you using?" },
      { speaker: 'Hannah', text: "Pop songs, mostly." },
      { speaker: 'Supervisor', text: "Songs with lyrics might interfere specifically because they contain words, and your task is a word list. You'd be testing verbal interference, not music in general." },
      { speaker: 'Hannah', text: "Oh, I hadn't thought of that. Should I use instrumental music instead?" },
      { speaker: 'Supervisor', text: "Or add a third group — instrumental — so you can compare both. That would make the study more interesting." },
      { speaker: 'Hannah', text: "Then I'd definitely need more participants." },
      { speaker: 'Supervisor', text: "Yes — aim for twenty-five per group. And submit the ethics form by the end of next week." },
    ],
    questions: [
      { question: 'How long after learning do participants recall the words?', options: ['Ten minutes', 'Twenty minutes', 'Thirty minutes', 'One day'], correctIndex: 1 },
      { question: 'What is the supervisor\'s main concern about the music?', options: ['It is too loud', 'The lyrics may interfere with word recall', 'It is too modern', 'Participants may know the songs'], correctIndex: 1 },
      { question: 'What change does the supervisor suggest?', options: ['Remove the music group', 'Use only silence', 'Add an instrumental music group', 'Use a different memory task'], correctIndex: 2 },
      { question: 'How many participants per group should Hannah aim for?', options: ['20', '25', '30', '60'], correctIndex: 1 },
    ],
    tips: [
      'Numbers are revised during the conversation — the final agreed figure is what counts.',
      'When a tutor explains a problem, the next question often asks for its solution.',
    ],
  },
  {
    id: 'ielts-l-23',
    title: 'Section 3 — Choosing a Dissertation Topic',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'A history student and her tutor weigh up possible dissertation topics.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Tutor', text: "So, Aisha, you emailed me three possible dissertation topics. Talk me through them." },
      { speaker: 'Aisha', text: "The first is the role of women in the textile industry in the nineteenth century. The second is the history of public parks in our city. And the third is about how school history textbooks have changed since the nineteen-sixties." },
      { speaker: 'Tutor', text: "All interesting. What about sources for the first one?" },
      { speaker: 'Aisha', text: "That's the problem. A lot has already been written about it, so I'm not sure I'd find anything original." },
      { speaker: 'Tutor', text: "Fair point. And the parks?" },
      { speaker: 'Aisha', text: "The city archive has council records going back to the eighteen-eighties, and nobody seems to have studied them." },
      { speaker: 'Tutor', text: "That's a real advantage — primary sources nobody has used. The textbook topic?" },
      { speaker: 'Aisha', text: "I'd love to do it, but I'd need to find old textbooks, and the library only has a few." },
      { speaker: 'Tutor', text: "Then I'd lean towards the parks. You could even interview the parks department about recent history." },
      { speaker: 'Aisha', text: "That sounds good. How long should the literature review be?" },
      { speaker: 'Tutor', text: "Around two thousand words of the ten thousand total. And book an introduction session at the archive — they require one before you can handle original documents." },
    ],
    questions: [
      { question: 'What is the problem with the textile industry topic?', options: ['Too few sources', 'Too much already written about it', 'It is too recent', 'The tutor dislikes it'], correctIndex: 1 },
      { question: 'Why is the parks topic attractive?', options: ['It is short', 'Unused primary sources exist', 'There are many textbooks on it', 'Aisha lives near a park'], correctIndex: 1 },
      { question: 'How long should the literature review be?', options: ['1,000 words', '2,000 words', '5,000 words', '10,000 words'], correctIndex: 1 },
      { question: 'What must Aisha do before handling archive documents?', options: ['Get a letter from her tutor', 'Pay a fee', 'Attend an introduction session', 'Submit her proposal'], correctIndex: 2 },
    ],
    tips: [
      'When several options are discussed, note a quick plus/minus for each — questions ask why one was rejected.',
      'Requirements ("they require…") are frequently tested at the end of a Section 3 conversation.',
    ],
  },
  {
    id: 'ielts-l-24',
    title: 'Section 3 — Reviewing a Field Trip',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'Two geography students and their lecturer reflect on a coastal field trip.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Lecturer', text: "Now that you're back from the coastal field trip, what went well?" },
      { speaker: 'Sam', text: "The beach profiling. We measured the slope at ten points along the bay, and the data looks really consistent." },
      { speaker: 'Lecturer', text: "Good. And what was less successful?" },
      { speaker: 'Olivia', text: "The sediment sampling. The tide came in faster than we expected, so we only collected samples from six sites instead of twelve." },
      { speaker: 'Lecturer', text: "That happens. Did you check the tide tables?" },
      { speaker: 'Olivia', text: "We did, but we started late because the minibus broke down." },
      { speaker: 'Lecturer', text: "Well, in your report, acknowledge that limitation openly. Examiners respect honesty about data gaps." },
      { speaker: 'Sam', text: "Should we try to go back and collect the rest?" },
      { speaker: 'Lecturer', text: "Not necessary. Six sites is enough to identify a trend if you explain your sampling choices." },
      { speaker: 'Olivia', text: "One thing that surprised me was how much plastic was in the sediment." },
      { speaker: 'Lecturer', text: "That's worth a short section on its own — but keep it secondary to your main question about erosion." },
      { speaker: 'Sam', text: "When's the report due?" },
      { speaker: 'Lecturer', text: "The twenty-first, but I'll look at an outline if you send it by the tenth." },
    ],
    questions: [
      { question: 'Which part of the field trip went well?', options: ['Sediment sampling', 'Beach profiling', 'Interviewing residents', 'Water testing'], correctIndex: 1 },
      { question: 'Why were fewer sediment samples collected?', options: ['Equipment was lost', 'The tide came in early because they started late', 'It rained', 'They ran out of bags'], correctIndex: 1 },
      { question: 'What does the lecturer advise about the missing data?', options: ['Go back and collect it', 'Leave it out', 'Acknowledge the limitation in the report', 'Use data from another group'], correctIndex: 2 },
      { question: 'By when should the outline be sent?', options: ['The 1st', 'The 10th', 'The 12th', 'The 21st'], correctIndex: 1 },
    ],
    tips: [
      'Cause-and-effect chains (minibus broke → started late → tide) often hide the answer one step back.',
      'Two dates close together — check which one the question names (outline vs report).',
    ],
  },
  {
    id: 'ielts-l-25',
    title: 'Section 3 — Marketing Case Study Discussion',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'Business students discuss a case study about a coffee chain\'s expansion.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Tom', text: "Okay, the case study. The coffee chain expanded into five new countries in two years. Why do you think it failed in three of them?" },
      { speaker: 'Lucia', text: "I think the main reason was price. They charged the same as at home, which was far too expensive for local markets." },
      { speaker: 'Tom', text: "Partly, but the case says competitors were similarly priced. I think it was more about the menu — they didn't adapt it at all." },
      { speaker: 'Lucia', text: "Hmm, you're right, the case mentions customers wanted tea-based drinks in two of those countries." },
      { speaker: 'Professor', text: "Good. Anything else?" },
      { speaker: 'Tom', text: "Location. They opened in shopping malls, but in one country people mostly buy coffee from street vendors on their way to work." },
      { speaker: 'Professor', text: "Exactly — so what's the general lesson?" },
      { speaker: 'Lucia', text: "That a brand needs local research before expanding, not just copying what worked at home." },
      { speaker: 'Professor', text: "Yes. For your written analysis, I want you to apply a framework. Which one would fit?" },
      { speaker: 'Tom', text: "PESTLE, maybe?" },
      { speaker: 'Professor', text: "That's useful for the country context, but for the company's own choices I'd prefer the four Ps — product, price, place, promotion." },
      { speaker: 'Lucia', text: "That fits — menu is product, malls is place." },
      { speaker: 'Professor', text: "Precisely. Fifteen hundred words, due Monday." },
    ],
    questions: [
      { question: 'In how many countries did the chain fail?', options: ['Two', 'Three', 'Five', 'All of them'], correctIndex: 1 },
      { question: 'Why does Tom reject price as the main reason?', options: ['Prices were lower than at home', 'Competitors charged similar prices', 'Customers never mentioned price', 'The case gives no price data'], correctIndex: 1 },
      { question: 'What problem was there with location in one country?', options: ['Rents were too high', 'People buy coffee from street vendors', 'Malls were closed on Sundays', 'There was no parking'], correctIndex: 1 },
      { question: 'Which framework does the professor prefer?', options: ['PESTLE', 'SWOT', 'The four Ps', "Porter's Five Forces"], correctIndex: 2 },
    ],
    tips: [
      'Students often disagree — the answer is the view the evidence (or the tutor) supports.',
      'Mentioned-then-rejected options (PESTLE) are deliberate distractors.',
    ],
  },
  {
    id: 'ielts-l-26',
    title: 'Section 3 — Lab Report Writing',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'A chemistry student gets advice from a teaching assistant on their lab report.',
    duration: '3 min',
    transcript: [
      { speaker: 'TA', text: "Hi Kenji, you wanted to talk about your lab report?" },
      { speaker: 'Kenji', text: "Yes. I lost marks last time, and I'm not sure why." },
      { speaker: 'TA', text: "Let me look. Your results section is fine, but your method is written as a list of instructions — 'add ten millilitres of acid'. It should be in the past passive: 'ten millilitres of acid was added'." },
      { speaker: 'Kenji', text: "Oh, I see. What else?" },
      { speaker: 'TA', text: "Your discussion just repeats the results. It should explain them — why did the reaction slow down at higher temperatures, for example?" },
      { speaker: 'Kenji', text: "I wasn't sure, honestly. I thought that was an error." },
      { speaker: 'TA', text: "It might be, and that's fine — say so, and suggest a cause. Maybe the enzyme denatured. Discussing errors properly actually earns marks." },
      { speaker: 'Kenji', text: "Should my graphs go in the results or an appendix?" },
      { speaker: 'TA', text: "Key graphs in the results; raw data tables in the appendix. And always label the axes with units — you missed those twice." },
      { speaker: 'Kenji', text: "Right. How long should the abstract be?" },
      { speaker: 'TA', text: "No more than a hundred and fifty words. Write it last, once you know what you found." },
    ],
    questions: [
      { question: 'What was wrong with the method section?', options: ['It was too short', 'It was written as instructions', 'It had no units', 'It was in the wrong place'], correctIndex: 1 },
      { question: 'What should the discussion section do?', options: ['Repeat the results', 'Explain the results', 'List equipment', 'Summarise the method'], correctIndex: 1 },
      { question: 'Where should raw data tables go?', options: ['In the results', 'In the discussion', 'In the appendix', 'In the abstract'], correctIndex: 2 },
      { question: 'What is the maximum length of the abstract?', options: ['100 words', '150 words', '200 words', '250 words'], correctIndex: 1 },
    ],
    tips: [
      'Advice conversations follow a problem → fix pattern; questions often test the fix.',
      'Contrasts like "key graphs here, raw data there" make good matching questions.',
    ],
  },
  {
    id: 'ielts-l-27',
    title: 'Section 3 — Evaluating Online Learning',
    section: 'Section 3',
    topic: 'Academic Discussion',
    description: 'Two education students compare findings from their research on online learning.',
    duration: '3.5 min',
    transcript: [
      { speaker: 'Nadia', text: "So, what did your survey show about online courses?" },
      { speaker: 'Ethan', text: "Most students liked the flexibility — about seventy percent said it was the biggest advantage." },
      { speaker: 'Nadia', text: "Interesting, my interviews showed something different. Students valued being able to re-watch lectures more than flexibility." },
      { speaker: 'Ethan', text: "Maybe that's because your interviewees were mostly international students?" },
      { speaker: 'Nadia', text: "Possibly — they said re-watching helped with understanding the language." },
      { speaker: 'Ethan', text: "What about disadvantages?" },
      { speaker: 'Nadia', text: "Isolation came up most. Students missed chatting with classmates after lectures." },
      { speaker: 'Ethan', text: "Same in my survey, although technical problems were a close second." },
      { speaker: 'Nadia', text: "So in our report, should we combine the two data sets?" },
      { speaker: 'Ethan', text: "I'd keep them separate but compare them in the discussion. They used different methods, after all." },
      { speaker: 'Nadia', text: "Good idea. And recommendations?" },
      { speaker: 'Ethan', text: "Recorded lectures as standard, and maybe online study groups to reduce isolation." },
      { speaker: 'Nadia', text: "I'll draft the recommendations if you do the charts." },
    ],
    questions: [
      { question: "According to Ethan's survey, what was the biggest advantage?", options: ['Re-watching lectures', 'Flexibility', 'Lower cost', 'Language support'], correctIndex: 1 },
      { question: "Why might Nadia's results differ?", options: ['Her sample was too small', 'Her interviewees were mostly international students', 'She asked different questions', 'She interviewed staff'], correctIndex: 1 },
      { question: 'What was the most common disadvantage in both studies?', options: ['Technical problems', 'Isolation', 'Cost', 'Poor teaching'], correctIndex: 1 },
      { question: 'How will they present the two data sets?', options: ['Combined into one', 'Separately, compared in the discussion', 'Only the survey', 'Only the interviews'], correctIndex: 1 },
    ],
    tips: [
      'Keep track of whose research says what — questions name a speaker.',
      '"A close second" means it is NOT the top answer.',
    ],
  },
];
