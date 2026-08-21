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
];
