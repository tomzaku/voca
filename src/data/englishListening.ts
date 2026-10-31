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
  {
    id: 'pod-7',
    title: 'The Psychology of Waiting — Why Queues Feel So Long',
    topic: 'Culture & Society',
    description: 'Why ten minutes in a line can feel like an hour, and how airports, theme parks and shops quietly redesign waiting to make it feel shorter.',
    duration: '11 min',
    level: 'Intermediate',
    script: `Think about the last time you stood in a line. Maybe it was at the supermarket, at the airport, or outside a popular restaurant. How long were you actually waiting? And how long did it feel like you were waiting? If you're like most people, those two numbers are very different.

Today we're talking about queues — the lines we stand in every day — and about a surprising idea: the experience of waiting depends much less on the clock than on what's happening in our heads.

Let's start with a famous story from Houston, Texas. Some years ago, passengers at the city's airport were complaining that they had to wait too long for their bags. The airport hired more baggage handlers, and the average wait fell to about eight minutes, which is quite good. But the complaints continued. So the managers looked more closely. They noticed that passengers walked for only about a minute from the plane to the baggage area, and then stood there for seven minutes doing nothing. The solution was clever. They moved the arrival gates further away, so people had to walk for about six minutes. Now passengers spent most of the time moving, and only a couple of minutes standing still. The complaints almost disappeared, even though the total time was the same.

This story is often used to illustrate a set of principles described by David Maister, a business researcher who wrote an influential essay on the psychology of waiting lines in the nineteen-eighties. His first principle is simple: unoccupied time feels longer than occupied time. When we have nothing to do, we notice every passing second.

That's why so many places give us something to look at while we wait. Hotels put mirrors next to elevators, partly so that guests can check their appearance instead of staring at the doors. Theme parks such as Disneyland design their queues as part of the attraction, with decorations, videos and winding paths that hide how long the line really is.

Another of Maister's principles is that uncertain waits feel longer than known, finite waits. If someone tells you the train will arrive in twelve minutes, you can relax, check your phone, or buy a coffee. But if the screen just says "delayed," every minute becomes stressful. This is why so many bus stops and websites now show countdowns and progress bars. The information doesn't make the wait any shorter, but it makes it more bearable.

Perhaps the most powerful principle is about fairness. Unfair waits feel longer than fair ones. Nothing makes people angrier than seeing someone push in ahead of them, or watching the line next to theirs move faster. Some banks and post offices use a single "snake" line that feeds several counters. Mathematically, it's often more efficient, but more importantly, it feels fair — everyone is served in the order they arrived.

Of course, attitudes to queuing also vary from culture to culture. The British have a reputation for being especially devoted to orderly lines, and jokes about it are a national tradition. In other places, a crowd at a counter might look chaotic to an outsider, while locals understand perfectly well who is next. The rules are unwritten, but everyone who grew up there knows them.

So the next time you're stuck in a long line, try an experiment. Notice what the people who designed that space have done — the screens, the music, the shape of the queue. And if you can, give yourself something to do. You can't always change how long you wait, but you can change how long it feels.`,
    vocabulary: [
      { word: 'queue', definition: 'A line of people waiting for something, especially in British English' },
      { word: 'bearable', definition: 'Able to be accepted or tolerated, even though unpleasant' },
      { word: 'push in', definition: 'To join a line unfairly in front of people who were already waiting' },
      { word: 'finite', definition: 'Having a clear limit or end' },
      { word: 'orderly', definition: 'Arranged or behaving in a neat, organized way' },
    ],
    discussionQuestions: [
      'Where do you most often have to wait in line, and how does it make you feel?',
      'Is queuing orderly in your country, or are the rules different? Give an example.',
      'Which of the principles from the podcast have you noticed in real life?',
      'If you could redesign one queue you know, what would you change?',
    ],
  },
  {
    id: 'pod-8',
    title: 'What\'s in a Surname? — How Family Names Were Born',
    topic: 'Culture & Society',
    description: 'Where family names come from — jobs, places, fathers and nicknames — and why different cultures arrived at them so differently.',
    duration: '12 min',
    level: 'Upper-Intermediate',
    script: `Imagine living in a small village a thousand years ago. Everyone knows everyone, and a single name is perfectly enough. There's John, there's Mary, there's Thomas. But what happens when the village grows, and suddenly there are five men called John? You need a way to tell them apart. And that, in a nutshell, is where surnames come from.

In English, most family names fall into a few broad categories. The first, and perhaps the most familiar, is occupation. If your name is Smith, one of your ancestors probably worked with metal. Baker, Miller, Carpenter, Taylor, Fisher and Cooper — a cooper made barrels — all tell us what someone did for a living. Smith is still one of the most common surnames in the English-speaking world, which makes sense when you remember that almost every village needed a blacksmith.

The second category is location. Names like Hill, Wood, Brook or Field described where a person lived. Others came from the name of a town or village, so someone who moved to a new place might be known by where they had come from.

The third category is based on family relationships, especially the father's name. These are called patronymics. Johnson was originally the son of John, and Williamson the son of William. You can find the same idea all over Europe. In Scotland and Ireland, "Mac" or "Mc" means "son of," so MacDonald is the son of Donald. The Irish "O" originally meant "grandson" or "descendant of." In Russian, people still carry a patronymic as a middle name — Ivan's son might be called Pyotr Ivanovich.

Iceland is a fascinating case, because there most people still don't have a family name in the usual sense. A man named Jón whose father is Stefán will be Jón Stefánsson, and his sister will be Stefánsdóttir — Stefán's daughter. This is why the Icelandic phone book has traditionally been organized by first name rather than surname.

The fourth category is nicknames. These described someone's appearance or personality. Brown, White and Short probably began as descriptions, and so might names like Young, Good or even Fox.

Outside Europe, the story is often very different. In China, family names are extremely old, and a relatively small number of surnames are shared by a huge part of the population. Names like Wang, Li and Zhang are each carried by tens of millions of people. Vietnam has a similar pattern, with Nguyễn being by far the most common family name. One reason is historical: people sometimes adopted the surname of a ruling dynasty, either out of loyalty or for protection.

Japan offers yet another story. For centuries, most ordinary Japanese people didn't officially use surnames, which were mainly a privilege of the nobility and the samurai class. That changed in the second half of the nineteenth century, during the Meiji era, when the government required everyone to register a family name. Many people chose names inspired by the landscape around them — Yamamoto means something like "base of the mountain," and Tanaka "in the rice field."

So the next time you meet someone new, you might wonder what their name says about their ancestors. Was there a baker, a farmer, or a man named John somewhere in their family tree? A surname can be a tiny piece of history that we carry with us every day, usually without thinking about it at all.`,
    vocabulary: [
      { word: 'surname', definition: 'A family name shared by members of the same family' },
      { word: 'patronymic', definition: 'A name taken from the name of one\'s father or a male ancestor' },
      { word: 'occupation', definition: 'A person\'s job or profession' },
      { word: 'dynasty', definition: 'A series of rulers from the same family' },
      { word: 'in a nutshell', definition: 'Expressed in a very short, clear way' },
      { word: 'nobility', definition: 'The highest social class, often with inherited titles' },
    ],
    discussionQuestions: [
      'Do you know what your family name means or where it comes from?',
      'How are names ordered in your culture, and does that tell us anything about its values?',
      'Should married couples change their surnames? Why or why not?',
      'What do you think are the advantages of the Icelandic naming system?',
    ],
  },
  {
    id: 'pod-9',
    title: 'Busy Bees — The Hidden Workforce Behind Our Food',
    topic: 'Environment',
    description: 'How pollinators keep much of our food supply going, why honeybee colonies have been struggling, and why wild bees matter just as much.',
    duration: '11 min',
    level: 'Intermediate',
    script: `Look at your breakfast this morning. Maybe you had some fruit, a coffee, or toast with jam. There's a good chance that a small, hard-working insect helped make some of that possible. Today we're talking about bees, and why they matter so much more than most of us realize.

First, a quick biology lesson. Many plants can't produce fruit or seeds unless pollen is moved from one flower to another. This process is called pollination. Some plants rely on the wind, but many depend on animals — birds, bats, butterflies, beetles and, above all, bees. As a bee flies from flower to flower collecting nectar and pollen for food, it carries pollen with it and fertilizes the plants along the way.

How important is this for people? According to international assessments, around three-quarters of the world's leading types of food crops benefit at least partly from animal pollination. That includes apples, almonds, blueberries, cherries, coffee, cocoa and many vegetables. Staple crops like rice, wheat and maize are mostly pollinated by wind, so we wouldn't starve without bees. But our diets would become much less varied, and much less healthy.

When most people think of bees, they picture the honeybee. Honeybees live in large colonies, and beekeepers have managed them for thousands of years. In some places, they've become part of an enormous industry. Every spring in California, beekeepers bring a huge number of hives — well over a million — to the almond orchards, often by truck from other states, so the bees can pollinate the trees during their short flowering season.

But honeybees have faced serious problems. In the mid-two-thousands, beekeepers in the United States began reporting that worker bees were simply vanishing from their hives. The phenomenon was named colony collapse disorder. Scientists now believe there was no single cause. Instead, a combination of factors puts pressure on bees: a parasitic mite called varroa, viruses, poor nutrition, certain pesticides, and the stress of being moved long distances.

Here's something that surprises many people: honeybees are only one species. There are roughly twenty thousand known species of bees in the world. Most of them don't live in hives or make honey at all. Many are solitary, nesting alone in small holes in the ground or in hollow stems. Bumblebees, for example, are excellent at pollinating tomatoes, because they can vibrate their bodies to shake pollen loose — a technique called buzz pollination.

These wild bees are often harder to protect than honeybees, because no beekeeper is looking after them. They suffer when meadows are turned into farmland or concrete, because they lose both their food and their nesting places. Studies have also shown that, for some crops, wild bees improve harvests even when plenty of honeybees are present.

So what can be done? Farmers can leave strips of wildflowers around their fields and use pesticides more carefully. Cities can plant flowers in parks and along roadsides. And individuals can help too — by growing a variety of flowering plants, leaving a corner of the garden a little wild, and not cutting the grass too often.

Bees remind us that some of the most important work in nature is done quietly, by creatures we hardly notice. The next time one buzzes past you, perhaps you'll think of it not as a nuisance, but as one of the hardest-working members of our food system.`,
    vocabulary: [
      { word: 'pollination', definition: 'The transfer of pollen between flowers so that plants can produce seeds and fruit' },
      { word: 'colony', definition: 'A group of animals of the same type living closely together' },
      { word: 'staple crop', definition: 'A basic food crop eaten regularly by large numbers of people, such as rice or wheat' },
      { word: 'parasitic', definition: 'Living on or in another organism and harming it' },
      { word: 'solitary', definition: 'Living or existing alone rather than in a group' },
      { word: 'nuisance', definition: 'Something or someone that is annoying or causes trouble' },
    ],
    discussionQuestions: [
      'Which foods that you eat regularly depend on pollinators?',
      'Why do you think honeybees get more attention than wild bees?',
      'What could your town or city do to support bees and other insects?',
      'Would you consider keeping bees? Why or why not?',
    ],
  },
  {
    id: 'pod-10',
    title: 'Mangroves — The Forests Between Land and Sea',
    topic: 'Environment',
    description: 'Why the tangled forests along tropical coastlines protect shorelines, shelter young fish and lock away carbon — and how people are bringing them back.',
    duration: '13 min',
    level: 'Upper-Intermediate',
    script: `If you've ever traveled along a tropical coastline, you may have seen them: dense green forests standing right in the water, their trees balanced on twisting roots that rise out of the mud like the legs of a giant spider. These are mangroves, and they are some of the most remarkable — and most underrated — ecosystems on the planet.

Mangroves grow in a place where very few trees could survive. The ground is soft, salty mud that floods twice a day with the tide and contains very little oxygen. To cope with these conditions, mangroves have developed some impressive adaptations. Some species filter salt out of the water at their roots. Others get rid of it through their leaves, and if you look closely you can sometimes see tiny salt crystals on the surface. Many have special roots that stick up out of the mud, which help them breathe when the tide is in.

They have also found a clever way to reproduce. In several species, the seeds actually start to grow while they're still attached to the parent tree. When they finally drop, they're already young plants, ready to float away on the tide and put down roots wherever they land.

So why should the rest of us care? The first reason is protection. Mangrove forests act as a natural barrier between the sea and the land. Their dense roots slow down waves and hold sediment in place, reducing erosion. After the Indian Ocean tsunami in two thousand and four, there were many reports that villages sheltered behind healthy mangroves suffered less damage than those on bare coastlines. Mangroves can't stop every disaster, but they can soften the blow of storms and rising seas.

The second reason is life. The tangle of underwater roots creates a perfect nursery for young fish, crabs and shrimp, which hide there from predators until they're big enough to survive in the open sea. Millions of people in coastal communities depend on these fisheries for food and income. The largest mangrove forest in the world, the Sundarbans, which stretches across Bangladesh and India, is even home to the Bengal tiger, which has learned to swim between its islands.

The third reason is climate. Mangroves are extraordinarily good at storing carbon — not so much in their trunks and branches, but in the deep, waterlogged soil beneath them, where dead plant material breaks down very slowly. Scientists call the carbon stored by coastal ecosystems like mangroves, salt marshes and seagrass "blue carbon." When mangroves are cleared, much of that stored carbon can be released into the atmosphere.

And unfortunately, mangroves have been cleared on a large scale. Over the past several decades, a significant share of the world's mangroves has been lost, cut down for timber, coastal development and, especially, shrimp farming ponds.

The good news is that mangroves can recover when given the chance. One well-known example is Cần Giờ, near Ho Chi Minh City in Vietnam. Its mangroves were largely destroyed by herbicides during the Vietnam War. In the decades that followed, a large replanting effort brought the forest back, and today it's a UNESCO biosphere reserve, full of birds, monkeys and fishing villages.

Restoration isn't always that simple. Projects fail when people plant the wrong species, or plant in places where the tide and soil aren't right. The most successful efforts tend to work with local communities and restore natural water flow, allowing the forest to regenerate on its own.

Mangroves live on the edge, between land and sea. But for millions of people, and for countless species, they are right at the center of everything.`,
    vocabulary: [
      { word: 'underrated', definition: 'Not valued or appreciated as much as it deserves' },
      { word: 'adaptation', definition: 'A feature that helps a living thing survive in its environment' },
      { word: 'sediment', definition: 'Sand, mud or small stones carried by water and left behind' },
      { word: 'erosion', definition: 'The gradual wearing away of land by water, wind or ice' },
      { word: 'waterlogged', definition: 'So full of water that it cannot absorb any more' },
      { word: 'regenerate', definition: 'To grow again or recover after damage' },
    ],
    discussionQuestions: [
      'Have you ever visited a mangrove forest or another coastal wetland? What was it like?',
      'Why do you think mangroves were cleared so quickly for shrimp farms and development?',
      'Should countries be paid by others for protecting ecosystems that store carbon?',
      'Why might restoration projects work better when local communities are involved?',
    ],
  },
  {
    id: 'pod-11',
    title: 'The Placebo Effect — When Belief Becomes Medicine',
    topic: 'Health',
    description: 'How sugar pills can make people feel better, what the placebo effect can and cannot do, and why it shapes the way every new medicine is tested.',
    duration: '12 min',
    level: 'Advanced',
    script: `Here's a puzzle. A patient with chronic pain is given a small white pill and told it's a powerful painkiller. An hour later, she reports that the pain has eased considerably. The catch? The pill contained nothing but sugar. This phenomenon, known as the placebo effect, is one of the most intriguing and widely misunderstood ideas in modern medicine.

The word "placebo" comes from Latin and means "I shall please." For centuries, doctors knowingly gave patients harmless remedies simply to reassure them. But the placebo only became a serious scientific concern in the twentieth century. In the nineteen-fifties, an American anesthesiologist named Henry Beecher published an influential paper called "The Powerful Placebo," arguing that a substantial proportion of patients improved after receiving inactive treatments. Some of his conclusions have since been challenged, but the paper helped establish a principle that now underpins medical research.

That principle is the randomized, double-blind, placebo-controlled trial. When a new drug is tested, some participants receive the real medicine and others receive an identical-looking placebo. Crucially, neither the patients nor the researchers know who has received which. Only if the drug clearly outperforms the placebo can we be confident that it works. Without this comparison, we might credit a medicine with improvements that were really caused by expectation, by the natural course of an illness, or simply by chance.

So what exactly is happening when a placebo seems to work? Part of the answer is psychological. When we expect to feel better, we may pay less attention to our symptoms and interpret ambiguous sensations more positively. But there is also evidence of genuine changes in the body. Studies of placebo pain relief have found that, in some cases, the brain releases its own natural painkillers, called endorphins. In one well-known line of research, giving people a drug that blocks endorphins reduced the placebo effect.

The details of the treatment matter, too. Research has suggested that injections tend to produce stronger placebo responses than pills, that two pills can be more effective than one, and that people may respond more strongly to a placebo they believe is expensive. Even the color of a pill can shape expectations. It seems that the ritual of treatment — the white coat, the prescription, the careful instructions — carries real weight.

The placebo has an evil twin, known as the nocebo effect. If people expect a treatment to cause side effects, they are more likely to experience them, even when taking an inactive pill. This has a practical consequence: the way doctors describe the risks of a medicine can influence how patients feel when they take it.

Perhaps the most surprising discovery is the so-called open-label placebo. In a study led by Ted Kaptchuk at Harvard, patients with irritable bowel syndrome were given pills and told honestly that they were placebos containing no active ingredient. Remarkably, many still reported that their symptoms improved compared with patients who received no treatment. This suggests deception may not always be necessary for the effect to occur.

However, we should be careful not to exaggerate. Placebos are most effective for subjective symptoms such as pain, nausea and fatigue. They don't shrink tumors, cure infections or repair broken bones. Confusing the two can be dangerous, particularly when people abandon effective treatment for remedies that rely on belief alone.

What the placebo effect really teaches us is that the mind and body are deeply interconnected. Care, attention and trust between doctor and patient are not optional extras. They may be part of the treatment itself.`,
    vocabulary: [
      { word: 'placebo', definition: 'A substance with no active effect, given as if it were a real treatment' },
      { word: 'double-blind', definition: 'Describing a study in which neither participants nor researchers know who receives which treatment' },
      { word: 'underpin', definition: 'To support or form the basis of an idea or system' },
      { word: 'endorphins', definition: 'Natural chemicals in the brain that reduce pain and improve mood' },
      { word: 'nocebo', definition: 'A negative effect caused by the expectation of harm from a treatment' },
      { word: 'subjective', definition: 'Based on personal feelings or experience rather than measurable facts' },
    ],
    discussionQuestions: [
      'Have you ever felt better after a treatment and wondered whether it was the placebo effect?',
      'Is it ethical for doctors to prescribe placebos? Does the open-label research change your answer?',
      'How might the nocebo effect influence the way doctors should talk about side effects?',
      'Why do you think the "ritual" of treatment has such a strong influence on how we feel?',
    ],
  },
  {
    id: 'pod-12',
    title: 'Superbugs — The Quiet Crisis of Antibiotic Resistance',
    topic: 'Health',
    description: 'How antibiotics transformed medicine, why bacteria are learning to survive them, and what doctors, farmers and patients can do about it.',
    duration: '13 min',
    level: 'Upper-Intermediate',
    script: `In nineteen twenty-eight, a Scottish scientist named Alexander Fleming came back from a summer holiday to find something strange in his laboratory. One of the dishes of bacteria he had left behind had been contaminated by mold, and around the mold, the bacteria had died. That mold produced a substance he called penicillin, and it would eventually change the course of medicine.

It's hard to overstate how important antibiotics have been. Before them, a small cut that became infected could kill you. Pneumonia, tuberculosis and infections after childbirth took countless lives. Once penicillin was mass-produced during the Second World War, and other antibiotics followed, infections that had once been death sentences became treatable in days. Antibiotics also made much of modern medicine possible: surgery, cancer chemotherapy and organ transplants all depend on our ability to prevent and treat infections.

But Fleming himself saw a danger coming. In his Nobel Prize lecture in nineteen forty-five, he warned that bacteria could become resistant to penicillin if people used too little of it, or used it carelessly. He was right.

To understand why, we need a little evolution. Bacteria reproduce incredibly quickly, and every time they divide, there's a small chance of a random genetic change. Occasionally, one of these changes helps a bacterium survive an antibiotic. When we use the drug, the vulnerable bacteria die, but the resistant ones survive and multiply. Over time, the resistant strain takes over. Bacteria can even pass resistance genes directly to one another, which allows resistance to spread surprisingly fast.

The result is what newspapers like to call "superbugs." One well-known example is MRSA, a type of staph bacteria that no longer responds to many common antibiotics. Some strains of tuberculosis and gonorrhea have also become very difficult to treat. The World Health Organization has repeatedly described antimicrobial resistance as one of the greatest threats to global health.

So why is this happening? A major factor is overuse. Antibiotics are often prescribed for colds and flu, even though these illnesses are caused by viruses, and antibiotics have no effect on viruses at all. In some countries, antibiotics can be bought without a prescription. And a large share of antibiotics worldwide are used in farm animals, sometimes not to treat illness but to help them grow faster or to prevent disease in crowded conditions.

There's another problem: the pipeline of new antibiotics has slowed dramatically. Developing a new drug is expensive, and antibiotics aren't very profitable. Patients take them for only a few days, and doctors try to keep the newest ones in reserve, using them only when nothing else works. From a public health point of view, that's sensible. From a business point of view, it's a difficult product to sell.

What can be done? Doctors are encouraged to practice what's called antibiotic stewardship — prescribing them only when needed, choosing the right drug, and using it for the right length of time. Governments are experimenting with new ways to reward companies for developing antibiotics. Better hygiene, clean water and vaccination also help, because every infection prevented is one that doesn't need treating.

And as patients, we have a role too. Don't demand antibiotics for a cold. Don't take leftover pills or share them with friends. Follow your doctor's instructions carefully. Antibiotics are a shared resource, and like any shared resource, they can be used up if we're careless with them.`,
    vocabulary: [
      { word: 'contaminated', definition: 'Made impure or dirty by contact with something harmful' },
      { word: 'overstate', definition: 'To describe something as more important or serious than it is' },
      { word: 'strain', definition: 'A particular type of a bacterium or virus with its own characteristics' },
      { word: 'pipeline', definition: 'A series of products being developed that are not yet available' },
      { word: 'stewardship', definition: 'The careful and responsible management of something' },
    ],
    discussionQuestions: [
      'In your country, can people buy antibiotics without a prescription? What do you think of that?',
      'Should the use of antibiotics in farming be more strictly controlled? Why?',
      'How could governments encourage companies to develop new antibiotics?',
      'Why is antibiotic resistance a problem that no single country can solve alone?',
    ],
  },
  {
    id: 'pod-13',
    title: 'Lost at Sea — The Clock That Solved Longitude',
    topic: 'History',
    description: 'How a deadly navigation problem baffled scientists for centuries, and how a self-taught carpenter built a clock accurate enough to solve it.',
    duration: '12 min',
    level: 'Upper-Intermediate',
    script: `Today, finding out exactly where you are is as easy as glancing at your phone. But for most of human history, sailors on the open ocean faced a terrifying problem. They could work out how far north or south they were, but not how far east or west. Today's story is about how that problem was finally solved — not by a famous astronomer, but by a carpenter from the north of England.

Let's begin with some geography. Any position on Earth can be described using two numbers: latitude and longitude. Latitude measures how far north or south of the equator you are, and sailors could find it fairly easily by measuring the height of the sun at midday, or of certain stars at night. Longitude, which measures position east or west, was a completely different matter.

The key to longitude is time. The Earth turns through three hundred and sixty degrees in twenty-four hours, which means fifteen degrees every hour. So if you know the exact time at your home port, and you can work out the local time where you are from the position of the sun, the difference tells you your longitude. The problem was that no clock in the seventeenth century could keep accurate time on a rolling ship, with changes in temperature, humidity and constant motion. Pendulum clocks, the best timekeepers of the day, simply didn't work at sea.

The consequences could be tragic. In seventeen-oh-seven, a British fleet returning home misjudged its position and struck rocks off the Isles of Scilly, near the southwest tip of England. Four warships were lost, and well over a thousand sailors died. Disasters like this pushed the British government to act. In seventeen-fourteen, Parliament passed the Longitude Act, offering a prize of up to twenty thousand pounds — a huge fortune at the time — to anyone who could find a practical method of determining longitude at sea.

Many of the greatest scientists of the age believed the answer lay in the sky. One proposed method, known as the lunar distance method, involved measuring the position of the moon against the stars and then using complex tables to calculate the time. It was a reasonable idea, but it required precise observations and hours of difficult mathematics.

Enter John Harrison, a carpenter and self-taught clockmaker from Lincolnshire. Harrison believed the solution was mechanical: build a clock good enough to keep time at sea. He spent decades on the problem, building a series of remarkable timekeepers. His first three were large, complicated machines. But his fourth, known today as H4, was completely different — it looked like a large pocket watch, only about thirteen centimeters across.

In trials on voyages to the Caribbean in the seventeen-sixties, H4 performed brilliantly, keeping time accurate enough to determine longitude well within the limits set by the Act. But Harrison's struggle was far from over. The Board of Longitude, which was dominated by astronomers, was reluctant to give the full prize to a craftsman, and demanded more tests and more evidence. It was only after Harrison, by then an old man, appealed to King George the Third and to Parliament that he received a large payment for his work.

In the end, both methods proved useful for a while. But as marine chronometers based on Harrison's ideas became cheaper and more reliable, they became standard equipment on ships around the world. Captain James Cook took a copy of H4 on his second great voyage and praised it highly.

Harrison's story is a reminder that big problems are not always solved by the people we expect. Sometimes the breakthrough comes from an outsider, working patiently at a bench, who refuses to give up.`,
    vocabulary: [
      { word: 'latitude', definition: 'The distance of a place north or south of the equator, measured in degrees' },
      { word: 'longitude', definition: 'The distance of a place east or west of a fixed line, measured in degrees' },
      { word: 'misjudge', definition: 'To form a wrong opinion or estimate about something' },
      { word: 'self-taught', definition: 'Having learned a skill by oneself rather than through formal teaching' },
      { word: 'reluctant', definition: 'Unwilling and hesitant to do something' },
      { word: 'chronometer', definition: 'A very accurate clock, especially one used for navigation at sea' },
    ],
    discussionQuestions: [
      'Why do you think the astronomers on the Board were reluctant to reward Harrison?',
      'Can you think of other important discoveries made by outsiders or amateurs?',
      'How has GPS changed the way people travel and find their way today?',
      'Do you think offering large prizes is a good way to encourage innovation? Why?',
    ],
  },
  {
    id: 'pod-14',
    title: 'The Great Stink — How Sewers Saved a City',
    topic: 'History',
    description: 'How a foul-smelling summer in 1858 forced London to build a modern sewer system, and how a doctor\'s map helped overturn an old theory of disease.',
    duration: '11 min',
    level: 'Intermediate',
    script: `Imagine a hot summer in the biggest city in the world. The river that runs through the middle of it is full of human waste, and the smell is so terrible that people cover their faces as they walk past. Even the politicians in Parliament, right on the riverbank, can't escape it. This was London in eighteen fifty-eight, and the event became known as the Great Stink.

To understand how things got so bad, we need to go back a little. In the first half of the nineteenth century, London grew enormously. Hundreds of thousands of people moved in from the countryside to work in factories and docks. But the city's system for dealing with waste hadn't changed. Many homes used cesspits — holes in the ground where waste collected. Others were connected to old drains that emptied straight into the River Thames.

At the same time, flushing toilets were becoming more popular. That sounds like progress, but it actually made things worse. More water meant cesspits overflowed, and more waste went straight into the river. And here's the frightening part: the Thames was also one of the main sources of drinking water for the city.

London was hit by several terrible outbreaks of cholera, a disease that causes severe diarrhea and can kill within hours. At the time, most experts believed in something called miasma theory. They thought diseases like cholera were spread by "bad air" — foul smells rising from rotting matter.

One doctor disagreed. His name was John Snow. During an outbreak in the Soho area of London in eighteen fifty-four, Snow carefully recorded where the victims lived and marked them on a map. He noticed that the cases were clustered around one public water pump on Broad Street. He persuaded local officials to remove the pump's handle, so people couldn't use it, and the outbreak, which was already declining, came to an end. Snow argued that cholera was spread through contaminated water, not through the air. Many people didn't accept his ideas at the time, but today his map is famous as a founding moment of modern epidemiology.

Then came the summer of eighteen fifty-eight. It was unusually hot, the river level was low, and the smell from the Thames became unbearable. Parliament tried soaking the curtains of its buildings in chemicals to block the smell, but it didn't help. Finally, the politicians acted quickly, and approved a huge plan to rebuild London's drainage.

The man in charge was an engineer named Joseph Bazalgette. He designed a network of enormous brick sewers that collected waste before it reached the river and carried it far downstream, east of the city. The project took many years and involved building hundreds of kilometers of tunnels. Bazalgette also built riverside embankments, which hid the main sewers and created new roads and gardens along the Thames.

One of his smartest decisions was to make the pipes much wider than they needed to be at the time. He planned for a bigger future city. Because of that, much of his system is still in use today, more than a century and a half later.

Ironically, Bazalgette's sewers were built partly because of miasma theory — people wanted to get rid of the smell. But by removing waste from the drinking water, they also helped bring cholera outbreaks in London to an end. Sometimes, it seems, you can do the right thing for the wrong reason.`,
    vocabulary: [
      { word: 'stink', definition: 'A very strong, unpleasant smell' },
      { word: 'cesspit', definition: 'An underground hole where household waste is collected' },
      { word: 'outbreak', definition: 'A sudden start or rise of a disease in a particular area' },
      { word: 'clustered', definition: 'Grouped closely together' },
      { word: 'epidemiology', definition: 'The study of how diseases spread and can be controlled in populations' },
      { word: 'embankment', definition: 'A wall or bank of earth or stone built along a river' },
    ],
    discussionQuestions: [
      'Why do you think it took a terrible smell to make politicians act?',
      'What can we learn from John Snow about collecting and using evidence?',
      'Bazalgette planned for the future. What modern infrastructure should be built with the future in mind?',
      'Can you think of other examples of doing the right thing for the wrong reason?',
    ],
  },
  {
    id: 'pod-15',
    title: 'Why Is the Sky Blue? — The Physics of Everyday Color',
    topic: 'Science',
    description: 'A simple childhood question leads to scattered sunlight, red sunsets, white clouds and the strange blue sunsets of Mars.',
    duration: '10 min',
    level: 'Advanced',
    script: `It's perhaps the most famous question a child can ask: why is the sky blue? Many adults respond with a shrug, or with a vague answer about the sky reflecting the ocean. That explanation, though popular, is simply wrong. The real answer is far more elegant, and once you understand it, it explains not only the blue of the sky but the red of the sunset and the white of the clouds.

Let's begin with sunlight itself. Light from the sun appears white, but as Isaac Newton demonstrated with a prism in the seventeenth century, white light is actually a mixture of all the colors of the rainbow. Each color corresponds to a different wavelength. Red light has relatively long waves, while blue and violet light have much shorter ones.

Now consider what happens when that light enters our atmosphere. The air is made up mostly of nitrogen and oxygen molecules, which are vastly smaller than the wavelength of visible light. When light strikes these tiny molecules, some of it is redirected in all directions — a process called scattering. Crucially, the amount of scattering depends heavily on wavelength. Shorter wavelengths are scattered far more strongly than longer ones. This relationship was worked out in the nineteenth century by the British physicist Lord Rayleigh, which is why it's known as Rayleigh scattering.

So, as sunlight passes through the air, blue light is bounced around the sky much more than red or yellow light. Wherever you look, away from the sun itself, some of that scattered blue light is heading toward your eyes. The result is a sky that appears blue in every direction.

At this point, a sharp listener might object. If shorter wavelengths scatter even more, shouldn't the sky be violet? It's a fair question, and the answer involves several factors. The sun emits somewhat less violet than blue light, and some violet is absorbed high in the atmosphere. Most importantly, our eyes are far more sensitive to blue than to violet. The cone cells in our retinas combine the scattered light into a color our brains perceive as sky blue.

The same physics explains sunsets. When the sun is low on the horizon, its light has to travel through a much thicker layer of atmosphere to reach us. Along that longer path, most of the blue light is scattered away before it arrives. What's left is dominated by the longer wavelengths — the oranges and reds that make sunsets so spectacular. Dust, smoke and pollution can intensify these colors, which is why sunsets after volcanic eruptions or wildfires are sometimes unusually vivid.

What about clouds? Clouds are made of water droplets that are much larger than air molecules. These droplets scatter all visible wavelengths roughly equally, a different process often called Mie scattering. When every color is scattered together, the result is white. And when clouds become thick enough to block much of the light passing through them, they appear grey.

Perhaps the most striking confirmation of these ideas comes from another planet. On Mars, the atmosphere is thin and filled with fine reddish dust. During the day, the Martian sky tends to look butterscotch or pinkish. But at sunset, the dust scatters light in a way that creates a cool blue glow around the setting sun — the reverse of what we see on Earth. NASA's rovers have photographed these blue Martian sunsets.

So the next time a child asks you why the sky is blue, you'll have an answer — and perhaps you'll pass on a little of the wonder that comes with it.`,
    vocabulary: [
      { word: 'wavelength', definition: 'The distance between successive peaks of a wave, which determines the color of light' },
      { word: 'scattering', definition: 'The process by which light is redirected in many directions by particles' },
      { word: 'elegant', definition: 'Pleasingly simple and clever, especially of an idea or explanation' },
      { word: 'retina', definition: 'The light-sensitive layer at the back of the eye' },
      { word: 'vivid', definition: 'Very bright and intense in color' },
      { word: 'object', definition: 'To express disagreement or raise a counterargument' },
    ],
    discussionQuestions: [
      'What other "simple" questions about the world do you find hard to explain?',
      'Before listening, how would you have explained why the sky is blue?',
      'Why do you think incorrect explanations, like the ocean reflection idea, spread so easily?',
      'How would you explain Rayleigh scattering to a ten-year-old?',
    ],
  },
  {
    id: 'pod-16',
    title: 'The Humble Box — How the Shipping Container Changed the World',
    topic: 'Business',
    description: 'How a standard steel box cut the cost of shipping, transformed ports and made modern global trade and supply chains possible.',
    duration: '13 min',
    level: 'Advanced',
    script: `Look around the room you're in. Your phone, your clothes, perhaps the chair you're sitting on — there's a good chance that much of it crossed an ocean at some point. And almost certainly, it made that journey inside a plain metal box. The shipping container is one of the least glamorous inventions of the twentieth century, yet it arguably did as much to shape the global economy as any new technology.

To appreciate its impact, we need to picture how goods were moved before it existed. For centuries, cargo was loaded and unloaded piece by piece. Sacks of coffee, crates of machinery, barrels and bales were carried on and off ships by large teams of dockworkers. This method, known as break-bulk shipping, was extraordinarily slow and labor-intensive. A ship could spend days or even weeks in port, and loading costs made up a large portion of the total expense of shipping. Theft and damage were also common.

The man most associated with changing this was Malcom McLean, an American trucking entrepreneur. As the story goes, he grew frustrated watching his trucks wait for hours at the docks while their cargo was transferred onto ships. His idea was deceptively simple: instead of unloading the goods, why not lift the entire container off the truck and put it straight onto the ship?

In nineteen fifty-six, a converted tanker called the Ideal X sailed from Newark, New Jersey, to Houston, Texas, carrying fifty-eight containers. It's widely regarded as the beginning of modern container shipping. McLean's company later became Sea-Land, and the concept spread rapidly, boosted by the enormous logistical demands of the Vietnam War, when containers helped the US military move supplies across the Pacific far more efficiently.

But the container on its own wasn't enough. For the system to work globally, everyone needed to agree on the box. If one company's containers didn't fit another company's ships, cranes or trucks, the advantages would disappear. During the nineteen-sixties, after considerable negotiation, international standards were agreed on, including standard sizes and the design of the corner fittings used to lift and lock containers together. The industry still measures capacity in TEUs — twenty-foot equivalent units.

The consequences were profound. Loading and unloading times collapsed from days to hours. Shipping costs fell dramatically, which made it economical to manufacture goods far from where they were sold. This, in turn, paved the way for the globalized supply chains we take for granted today, in which a single product might contain components made in a dozen countries.

There were losers, too. Traditional ports in city centers, such as those in London and New York, declined because they lacked space for the vast container terminals and cranes the new system required. Activity shifted to new, purpose-built ports. And the demand for dockworkers fell sharply, devastating communities that had depended on that work for generations.

The container also revealed a vulnerability in global trade. Because supply chains became so efficient and so tightly connected, a single disruption can ripple across the world. In twenty twenty-one, when the giant container ship Ever Given became stuck in the Suez Canal for several days, it held up hundreds of vessels and reminded everyone how dependent we are on this invisible system.

The economist Marc Levinson called his history of the container simply "The Box." It's a fitting title. The container's genius isn't complexity — it's standardization. And it shows that sometimes the most powerful innovations are not dazzling inventions, but simple agreements about how things should fit together.`,
    vocabulary: [
      { word: 'glamorous', definition: 'Attractive and exciting in a way that attracts attention' },
      { word: 'labor-intensive', definition: 'Requiring a large amount of human work' },
      { word: 'deceptively', definition: 'In a way that makes something seem simpler or different than it really is' },
      { word: 'standardization', definition: 'The process of making things follow the same agreed rules or sizes' },
      { word: 'pave the way', definition: 'To create the conditions that make something possible' },
      { word: 'ripple', definition: 'To spread gradually outward, like waves on water' },
    ],
    discussionQuestions: [
      'Can you think of other simple innovations that had enormous effects on the economy?',
      'Who benefited most from containerization, and who lost out?',
      'Should countries try to make supply chains shorter and more local? What are the trade-offs?',
      'Why do you think agreeing on standards is often harder than inventing new technology?',
    ],
  },
  {
    id: 'pod-17',
    title: 'A Tale of Two Cups — How Tea and Coffee Shaped the World',
    topic: 'Culture & Society',
    description: 'From Chinese tea houses to London coffeehouses and Hanoi street cafés, how two humble drinks changed trade, politics, and daily life.',
    duration: '12 min',
    level: 'Intermediate',
    script: `Think about the first thing you drank this morning. For billions of people around the world, the answer is either tea or coffee. These two drinks are so ordinary that we rarely think about them. But behind every cup there's a long story of trade, religion, revolution, and social change.

Let's start with tea, the older of the two. Chinese legend says that the emperor Shen Nong discovered tea thousands of years ago when a few leaves blew into his pot of boiling water. That's probably a myth, but we do know that tea was an important part of Chinese life by the Tang dynasty. In the eighth century, a writer named Lu Yu wrote "The Classic of Tea," a whole book about how to grow, prepare, and drink it properly. Tea wasn't just a drink — it was an art.

That idea travelled to Japan, where Buddhist monks used tea to stay alert during long hours of meditation. Over time, it developed into the Japanese tea ceremony, shaped in the sixteenth century by the tea master Sen no Rikyu. In the ceremony, every movement is slow and deliberate. The point isn't really the tea. It's about being fully present, and treating a simple moment with respect.

Coffee has a very different origin story. It comes from the highlands of Ethiopia. A popular legend tells of a goat herder named Kaldi who noticed his goats dancing with energy after eating red berries from a certain bush. Again, that's a legend. What historians can confirm is that by the fifteenth century, Sufi mystics in Yemen were drinking coffee to stay awake for night-time prayers. The Yemeni port of Mocha became so famous for exporting coffee that its name is still on café menus today.

From Yemen, coffee spread across the Ottoman Empire. Coffeehouses opened in Istanbul in the sixteenth century, and they quickly became places where men gathered to talk, play games, listen to stories, and discuss politics. Rulers were sometimes nervous about them. A room full of people sharing opinions can be a dangerous thing if you're trying to control what people think.

The same thing happened in Europe. In seventeenth-century London, coffeehouses were nicknamed "penny universities," because for the price of a cup you could listen to conversations about science, business, and news. Some of these meetings grew into lasting institutions. Lloyd's of London, one of the world's most famous insurance markets, began in a coffeehouse run by a man named Edward Lloyd, where ship owners and merchants met to share shipping news.

Tea, meanwhile, became a British obsession. By the nineteenth century, it was the national drink, and the custom of afternoon tea, with sandwiches and cakes, became a fashionable social event. But Britain's love of tea had a darker side. Britain was buying huge amounts of tea from China and wanted something to sell in return. It turned to opium, grown in British-controlled India. When China tried to stop the opium trade, the result was the Opium Wars. Tea was also at the centre of the American Revolution. In 1773, colonists protesting British taxes threw chests of tea into Boston Harbor — the event we now call the Boston Tea Party.

Let's bring the story closer to home. Coffee arrived in Vietnam with the French in the nineteenth century, and today Vietnam is one of the largest coffee producers in the world. But Vietnamese people didn't just copy French habits. They created their own: strong coffee dripped slowly through a small metal filter, cà phê sữa đá with sweet condensed milk and ice, and the famous egg coffee of Hanoi. Meanwhile, green tea is still offered to guests in Vietnamese homes as a basic sign of hospitality.

So what does all this tell us? Tea and coffee aren't just about caffeine. They create rituals — a morning routine, a break with colleagues, a way to welcome a guest. They gave people a reason to sit together and talk, and those conversations changed history.

Next time you hold a cup in your hands, take a second to think about the long journey behind it — across mountains, oceans, and centuries — before it reached you.`,
    vocabulary: [
      { word: 'ritual', definition: 'A set of actions that is always done in the same way, often with special meaning' },
      { word: 'deliberate', definition: 'Done slowly and carefully, with full attention' },
      { word: 'hospitality', definition: 'Friendly and generous treatment of guests' },
      { word: 'institution', definition: 'A large, established organization with a long history' },
      { word: 'obsession', definition: 'Something a person or group thinks about or loves to an extreme degree' },
    ],
    discussionQuestions: [
      'Are you more of a tea person or a coffee person? Why?',
      'What role do tea or coffee play in social life in your country?',
      'Why do you think rulers were sometimes afraid of coffeehouses?',
      'Do modern cafés still work like "penny universities"? Why or why not?',
    ],
  },
  {
    id: 'pod-18',
    title: 'The Plastic Ocean — Where Our Rubbish Really Goes',
    topic: 'Environment',
    description: 'What the "Great Pacific Garbage Patch" really looks like, why microplastics are such a hard problem, and which solutions actually help.',
    duration: '11 min',
    level: 'Upper-Intermediate',
    script: `When people hear the phrase "Great Pacific Garbage Patch," many of them imagine a floating island of rubbish, big enough to walk on. It's a powerful image. It's also wrong. And understanding why it's wrong is the key to understanding the real problem with plastic in our oceans.

The patch was brought to public attention in 1997 by a sailor named Charles Moore. He was crossing the Pacific Ocean between Hawaii and California when he noticed that, day after day, there were small pieces of plastic floating in the water, far from any land. What he had found was an area where ocean currents slowly circle and trap floating debris. Scientists call these circular current systems gyres, and there are five major ones in the world's oceans.

So if it isn't an island, what is it? It's closer to a thin soup. Some of it is large objects — and a surprising amount of that is lost fishing gear, like nets and ropes. But much of it is tiny fragments, spread over an enormous area and through the upper layers of the water. You could sail straight through the patch and not realise you were there.

This brings us to the heart of the problem: plastic doesn't really disappear. Natural materials like wood or paper are eventually broken down by bacteria and fungi. Most plastics aren't. Instead, sunlight, waves, and salt break them into smaller and smaller pieces. When those pieces are less than five millimetres across, we call them microplastics. Some come from larger items breaking apart; others are small to begin with, like fibres that come off synthetic clothing in the washing machine.

Microplastics have now been found almost everywhere scientists have looked — in deep-sea sediments, in Arctic ice, in sea salt, and in the bodies of fish and seabirds. Larger plastic causes obvious harm: turtles mistake plastic bags for jellyfish, and seabirds feed bits of plastic to their chicks. The effects of microplastics on human health are still being studied, and honestly, the science isn't settled yet. But the fact that they're so widespread is reason enough for concern.

How does plastic get into the sea in the first place? Some is dropped directly by ships and fishing boats. But a large share comes from land, carried by rivers. Rubbish that isn't collected properly ends up in drains, then streams, then rivers, and finally the ocean. That's why waste management on land — proper collection, landfills, and recycling systems — is one of the most effective ways to protect the sea.

Now, what about cleaning it up? There are projects that use long floating barriers to collect plastic from the gyres, and others that place traps at the mouths of rivers to catch rubbish before it reaches the ocean. These efforts are useful, but most experts agree that cleaning alone can't solve the problem. It's like trying to mop the floor while the tap is still running. You have to turn off the tap first.

Turning off the tap means producing and throwing away less plastic. Many countries have banned or taxed single-use plastic bags, and some have banned plastic straws and certain types of packaging. Recycling helps, but only a small fraction of all the plastic ever made has actually been recycled, because many plastics are difficult or unprofitable to process. So the most powerful step is usually the simplest: reuse things, and avoid plastic you don't need.

Plastic is an amazing material. It's cheap, light, and strong — and that's exactly why it lasts so long in the environment. The challenge for the coming decades isn't to get rid of plastic completely. It's to stop treating something that lasts for centuries as if it were disposable.`,
    vocabulary: [
      { word: 'debris', definition: 'Pieces of waste or broken material scattered around' },
      { word: 'gyre', definition: 'A large system of circular ocean currents' },
      { word: 'microplastics', definition: 'Pieces of plastic smaller than five millimetres' },
      { word: 'synthetic', definition: 'Made by people using chemicals, not naturally produced' },
      { word: 'disposable', definition: 'Designed to be thrown away after being used once' },
    ],
    discussionQuestions: [
      'Before listening, how did you imagine the Great Pacific Garbage Patch?',
      'What single-use plastics do you use most often? Could you replace any of them?',
      'Should governments ban more plastic products, or should it be a personal choice?',
      'What does the comparison "mopping the floor while the tap is running" mean to you?',
    ],
  },
  {
    id: 'pod-19',
    title: 'The Night Shift — Why Your Brain Needs Sleep',
    topic: 'Health',
    description: 'What actually happens while we sleep, how it protects memory and health, and simple habits that help you sleep better.',
    duration: '10 min',
    level: 'Intermediate',
    script: `We spend roughly a third of our lives asleep. If you live to eighty, that's more than twenty-five years with your eyes closed. For a long time, people thought of sleep as wasted time — the brain simply switching off. Today we know that's completely wrong. While you sleep, your brain is busy doing some of its most important work.

Let's start with how sleep is organised. Sleep isn't one single state. It comes in cycles, and each cycle lasts about ninety minutes. In each cycle, you move through lighter sleep, then deep sleep, and then a stage called REM, which stands for rapid eye movement. During REM sleep, your eyes move quickly behind your eyelids, your brain is very active, and this is when most vivid dreaming happens. A typical night includes four or five of these cycles. Deep sleep tends to come earlier in the night, and REM sleep becomes longer towards the morning.

So what is all this activity for? One of the clearest answers is memory. During sleep, the brain replays and strengthens the things you learned during the day, moving them into longer-term storage. This is called memory consolidation. Students who stay up all night before an exam are actually working against themselves. A good night's sleep after studying helps the information stick — which is useful to know if you're learning a language.

Sleep also seems to help the brain clean itself. In 2013, a team led by the scientist Maiken Nedergaard found that in mice, the spaces between brain cells widen during sleep, allowing fluid to wash away waste products more efficiently. Researchers call this the glymphatic system. There's still a lot to learn about how it works in humans, but it gives us one more reason to take sleep seriously.

What controls when we feel sleepy? Two main systems. The first is your circadian rhythm, an internal clock that runs on a cycle of about twenty-four hours. It's controlled by a small area of the brain that responds to light. When it gets dark, your body releases a hormone called melatonin, which tells you it's time to rest. The second system is sleep pressure. The longer you're awake, the more a chemical called adenosine builds up in your brain, making you feel more and more tired.

This is where coffee comes in. Caffeine works by blocking adenosine, so you don't feel as tired as you really are. The problem is that caffeine stays in your body for many hours. A coffee in the late afternoon can still be affecting you when you're trying to fall asleep at night.

What happens when we don't sleep enough? In the short term, we become less focused, more forgetful, and more emotional. Our reaction times slow down, which is why driving while very tired is so dangerous. In the long term, regularly getting too little sleep is linked to a higher risk of health problems such as obesity, diabetes, and heart disease. Most health organisations recommend that adults get seven to nine hours a night.

So how can you sleep better? First, keep a regular schedule — go to bed and wake up at roughly the same time, even at weekends. Second, get some daylight in the morning, which helps set your internal clock. Third, reduce bright screens in the hour before bed, and keep your bedroom cool, dark, and quiet. And finally, watch your caffeine, especially after lunch.

Sleep isn't a luxury, and it isn't laziness. It's the time when your body and brain repair, sort, and prepare for tomorrow. So tonight, when you're tempted to watch just one more episode, remember: going to bed might be the most productive thing you do all day.`,
    vocabulary: [
      { word: 'consolidation', definition: 'The process of making something, such as a memory, stronger and more stable' },
      { word: 'circadian rhythm', definition: 'The body\'s natural 24-hour cycle of sleeping and waking' },
      { word: 'melatonin', definition: 'A hormone that helps control sleep and is released when it gets dark' },
      { word: 'vivid', definition: 'Very clear, bright, and detailed' },
      { word: 'sleep pressure', definition: 'The growing need to sleep that builds up the longer you stay awake' },
    ],
    discussionQuestions: [
      'How many hours do you usually sleep? Do you think it\'s enough?',
      'Have you ever stayed up all night to study? How did it go?',
      'Which of the tips in the podcast would be easiest for you to follow?',
      'Why do you think many people see sleep as "wasted time"?',
    ],
  },
  {
    id: 'pod-20',
    title: 'The Silk Road — A Network, Not a Road',
    topic: 'History',
    description: 'How a web of trade routes linking China, Central Asia, and the Mediterranean carried not only silk, but religions, inventions, and disease.',
    duration: '13 min',
    level: 'Upper-Intermediate',
    script: `The Silk Road is one of the most romantic names in history. It makes us think of camel caravans crossing deserts, busy markets full of spices, and travellers carrying precious goods from one end of the world to the other. Some of that picture is true. But the name itself is a little misleading — and it's also surprisingly recent.

The term "Silk Road" was popularised in 1877 by a German geographer called Ferdinand von Richthofen. The people who actually travelled these routes never used it. And more importantly, there was never a single road. The Silk Road was a vast network of routes, over land and by sea, connecting China with Central Asia, India, Persia, the Middle East, and eventually Europe. It changed over the centuries as empires rose and fell and as some paths became safer than others.

Most historians date the beginning of regular trade along these routes to China's Han dynasty, in the second century BCE. The Han emperor sent an official named Zhang Qian west to find allies against nomadic enemies. His mission didn't achieve its military goal, but he returned with detailed reports about the kingdoms of Central Asia — and about their excellent horses. Chinese interest in the West grew, and trade began to flow.

What was traded? Silk, of course. For centuries, China kept the method of making silk a closely guarded secret, and Romans paid high prices for it. But the network carried much more than fabric. Spices, precious stones, glass, horses, tea, and paper all moved along it. Interestingly, very few traders made the whole journey. Goods usually passed from merchant to merchant, city to city, with the price rising at every step.

Cities along the routes became rich and cosmopolitan. Samarkand, in today's Uzbekistan, was a famous centre of trade, where merchants from many cultures met. At Dunhuang, on the edge of China's desert, Buddhist caves were filled with paintings and manuscripts, many of which have survived for over a thousand years.

And that leads us to perhaps the most important point. The Silk Road didn't only move things — it moved ideas. Buddhism travelled from India into Central Asia and China along these routes. Later, Islam spread along many of the same paths. Technologies such as papermaking moved from China westward. Foods, musical instruments, artistic styles, and scientific knowledge were all exchanged. When you look at the art of the region, you can sometimes see Greek, Indian, Persian, and Chinese influences in a single statue.

Even silk's great secret eventually escaped. According to the Byzantine historian Procopius, in the sixth century two monks smuggled silkworm eggs out of Asia to the Byzantine Empire, possibly hidden inside hollow walking sticks. After that, Europe could produce its own silk.

But connection has a dark side, too. The same routes that carried goods and ideas could also carry disease. In the fourteenth century, the Black Death — a plague that killed a huge part of the population of Europe and the Middle East — is widely believed to have spread along trade routes from Central Asia. Globalisation, it seems, is not a modern invention, and neither are its risks.

Over-land trade gradually declined from the fifteenth century onwards, as European sailors found sea routes to Asia, and as large ships could carry far more goods than any camel caravan. The cities of Central Asia lost much of their importance.

Today, the Silk Road is remembered as a symbol of exchange between cultures. Its real lesson is simple but powerful: when people trade with each other, they don't just swap goods. They swap stories, beliefs, and ways of seeing the world. And that exchange shapes all of us — often in ways we never notice.`,
    vocabulary: [
      { word: 'caravan', definition: 'A group of people travelling together, often with animals, across a desert' },
      { word: 'nomadic', definition: 'Moving from place to place rather than living in one permanent home' },
      { word: 'cosmopolitan', definition: 'Including people and influences from many different countries' },
      { word: 'smuggle', definition: 'To move goods secretly and illegally from one place to another' },
      { word: 'misleading', definition: 'Giving the wrong idea or impression' },
      { word: 'globalisation', definition: 'The process by which countries and cultures become more connected through trade and communication' },
    ],
    discussionQuestions: [
      'Why do you think the name "Silk Road" became so popular, even though it is not accurate?',
      'Which do you think was more important to exchange along the Silk Road: goods or ideas?',
      'Can you think of a modern example of trade spreading ideas or culture?',
      'What are the benefits and risks of a highly connected world today?',
    ],
  },
  {
    id: 'pod-21',
    title: 'Into the Dark — What We Really Know About Black Holes',
    topic: 'Science',
    description: 'From a strange solution to Einstein\'s equations to the first photographs, how black holes went from science fiction to observed fact.',
    duration: '14 min',
    level: 'Advanced',
    script: `Black holes have an almost mythical reputation. They're the monsters of the universe — objects so dense that nothing, not even light, can escape them. For most of the twentieth century, many physicists weren't even sure they really existed. Today, we've heard them collide, and we've taken pictures of their shadows. Let's look at how we got here.

The story begins in 1915, when Albert Einstein published his general theory of relativity. Einstein's key insight was that gravity isn't simply a force pulling objects together; it's the bending of space and time by mass. Only a few months later, a German physicist named Karl Schwarzschild found an exact solution to Einstein's equations — remarkably, while serving in the army during the First World War. His solution described something very strange: if enough mass were squeezed into a small enough space, there would be a boundary from which nothing could return.

That boundary is what we now call the event horizon. It's not a physical surface. You wouldn't bump into it. It's more like a point of no return. Outside it, a powerful enough rocket could still escape. Inside it, every possible path leads inward. Even Einstein was doubtful that nature would actually allow such objects to form. For decades, they were treated as a mathematical curiosity.

That began to change in the 1960s. Physicists showed that when a very massive star runs out of fuel, nothing can stop its core from collapsing, so black holes should be a natural result of stellar evolution. In 1967, the physicist John Wheeler helped popularise the name "black hole," and it stuck. Around the same time, astronomers began finding powerful sources of X-rays in space. One of them, Cygnus X-1, turned out to be a star orbiting an invisible companion too heavy to be anything but a black hole.

In 1974, Stephen Hawking added a surprising twist. Combining relativity with quantum mechanics, he argued that black holes aren't completely black. They should give off a faint glow, now known as Hawking radiation, and over unimaginably long periods of time, slowly lose mass. This radiation is far too weak to have been detected, but the idea transformed how physicists think about black holes, information, and the nature of space itself.

We also now know that black holes come in very different sizes. Stellar black holes, formed from collapsed stars, have a few to a few dozen times the mass of our Sun. But at the centres of most large galaxies sit supermassive black holes, millions or even billions of times heavier. Our own galaxy, the Milky Way, has one called Sagittarius A-star, with about four million times the mass of the Sun. By tracking stars racing around it over many years, the astronomers Andrea Ghez and Reinhard Genzel showed that something extremely compact and massive had to be there. They shared the 2020 Nobel Prize in Physics for this work.

Then came two historic moments. In 2015, the LIGO detectors in the United States picked up gravitational waves — tiny ripples in space-time — produced by two black holes merging more than a billion light-years away. Einstein had predicted such waves a century earlier. And in 2019, the Event Horizon Telescope, a network of radio telescopes across the planet working as one giant instrument, released the first image of a black hole's shadow, at the centre of the galaxy M87. In 2022, the same team published an image of Sagittarius A-star.

What would happen if you fell into a black hole? For a smaller one, the difference in gravity between your head and your feet would be so extreme that you'd be stretched out like a noodle — a process physicists genuinely call "spaghettification." What happens at the very centre, the singularity, is still unknown, because that's exactly where our current theories break down.

And that's why black holes matter so much. They're not just exotic objects far away. They're natural laboratories where our two best theories of the universe, relativity and quantum mechanics, collide. Understanding them may be the key to the next great revolution in physics.`,
    vocabulary: [
      { word: 'event horizon', definition: 'The boundary around a black hole beyond which nothing can escape' },
      { word: 'singularity', definition: 'The point at the centre of a black hole where density is thought to become infinite' },
      { word: 'collapse', definition: 'To fall inward suddenly, especially under great pressure' },
      { word: 'gravitational waves', definition: 'Ripples in space-time caused by massive objects accelerating, such as merging black holes' },
      { word: 'compact', definition: 'Closely packed into a small space' },
      { word: 'curiosity', definition: 'Something unusual or interesting, but not considered very important' },
    ],
    discussionQuestions: [
      'Why do you think it took so long for scientists to accept that black holes are real?',
      'Which discovery mentioned in the podcast do you find most impressive, and why?',
      'Should governments spend money on research that has no immediate practical use?',
      'If you could ask a physicist one question about black holes, what would it be?',
    ],
  },
  {
    id: 'pod-22',
    title: 'Gig Life — Freedom or Insecurity?',
    topic: 'Business',
    description: 'How apps turned millions of people into freelancers, why the question "employee or contractor?" matters so much, and how courts are responding.',
    duration: '12 min',
    level: 'Upper-Intermediate',
    script: `If you've ever ordered food through an app, booked a ride with your phone, or hired a freelancer online to design a logo, you've taken part in what's known as the gig economy. It's a way of working that has grown enormously in the last fifteen years — and it raises a question that governments around the world are still struggling to answer: what exactly is a job?

The word "gig" originally comes from the world of music. Jazz musicians in the early twentieth century used it to describe a single paid performance. You play one night, you get paid, and then you look for the next one. That's essentially what the gig economy is: work divided into short, separate tasks, rather than a long-term job with one employer.

Of course, freelance work isn't new. Writers, translators, and taxi drivers have worked this way for a long time. What changed was technology. When smartphones became common at the end of the 2000s, companies like Uber, founded in 2009, realised they could use apps to match customers with workers instantly. In Southeast Asia, companies like Grab and Gojek built similar platforms, often combining rides, food delivery, and payments in a single app. Websites like Upwork and Fiverr did the same for digital work, such as programming, writing, and design.

For workers, the main attraction is flexibility. You can choose when to work and how much. A student can deliver food between classes. A parent can drive in the evenings when the children are asleep. Someone between jobs can earn money quickly without a long hiring process. Many gig workers say they value this freedom very highly and wouldn't want a traditional nine-to-five job.

But there's another side to the story. Most platforms treat their workers as independent contractors, not employees. That might sound like a technical detail, but it makes a huge difference. In many countries, employees are entitled to a minimum wage, paid holidays, sick pay, and some form of pension or insurance. Independent contractors usually aren't. If a delivery rider is injured, or their app account is suddenly deactivated, they may have very little protection.

Then there's what researchers call algorithmic management. In a traditional job, you have a human boss. In the gig economy, decisions about which jobs you're offered, how much you're paid, and whether you're performing well are often made by software. Workers sometimes describe feeling controlled by a system they can't see or argue with.

Not surprisingly, this has ended up in the courts. In 2021, the UK Supreme Court ruled that Uber drivers should be classified as "workers," a category in British law that gives them rights such as the minimum wage and holiday pay. In the United States, California passed a law in 2019 that made it harder for companies to classify people as contractors. Gig companies responded with a ballot measure, Proposition 22, which voters approved in 2020, keeping app-based drivers as contractors while giving them some limited benefits. The debate is far from over, and different countries are choosing different answers.

So is the gig economy good or bad? The honest answer is that it depends on who you are. For someone who wants a little extra income on their own schedule, it can be a great opportunity. For someone who relies on gig work as their only source of income, it can mean long hours, unpredictable pay, and no safety net.

Perhaps the real challenge is to find a middle path — a way to keep the flexibility that workers value, while making sure that being your own boss doesn't mean being completely on your own.`,
    vocabulary: [
      { word: 'freelancer', definition: 'A person who works for different clients rather than for one employer' },
      { word: 'independent contractor', definition: 'A self-employed person who provides services under contract, without employee benefits' },
      { word: 'entitled to', definition: 'Having a legal or moral right to something' },
      { word: 'deactivate', definition: 'To switch off or disable, such as a user account' },
      { word: 'safety net', definition: 'Something that protects people if they lose their income or have problems' },
    ],
    discussionQuestions: [
      'Have you ever done gig work, or used gig economy apps? What was your experience?',
      'Should gig workers be treated as employees? Why or why not?',
      'How do you feel about being managed by an algorithm instead of a person?',
      'Would you prefer a flexible job with less security or a stable job with less freedom?',
    ],
  },
  {
    id: 'pod-23',
    title: 'To Tip or Not to Tip — The Strange Rules of Gratitude',
    topic: 'Culture & Society',
    description: 'Why tipping is expected in some countries and almost insulting in others, and what the custom reveals about how we value work.',
    duration: '9 min',
    level: 'Intermediate',
    script: `Imagine you've just finished a nice dinner at a restaurant. The bill arrives. Do you leave some extra money for the waiter? And if so, how much? The answer depends almost completely on where you are in the world. In some countries, not leaving a tip is a serious insult. In others, leaving one might cause confusion or even embarrassment. Tipping is one of those customs that seems simple, but is actually full of hidden rules.

Let's start with the country most famous for tipping: the United States. In American restaurants, customers are generally expected to add a tip of around fifteen to twenty percent of the bill. For visitors, this can be a shock. Why should the customer pay extra on top of the price on the menu?

Part of the answer lies in how waiters are paid. Under US federal law, employers can pay workers who receive tips a much lower minimum wage — just two dollars and thirteen cents an hour — as long as tips bring their total earnings up to the normal minimum wage. Some states have their own, higher rules, but in many places, tips are not a bonus. They're the main part of a server's income. So when an American leaves a tip, they're not just saying thank you. They're helping to pay the waiter's salary.

Now travel to Japan, and the situation is completely different. Tipping is generally not part of the culture there. Good service is considered a normal part of the job and a matter of professional pride. If you leave money on the table, a staff member might even run after you to return it, thinking you forgot it.

Much of Europe sits somewhere in the middle. In many European countries, a service charge is often already included in the bill, and waiters receive a regular wage. People may round up the bill or leave a few coins for good service, but it's a small gesture, not an obligation. In Vietnam, tipping isn't traditionally expected in everyday places like street food stalls, though it has become more common in hotels, spas, and restaurants that serve many tourists.

Where did tipping come from? Historians aren't completely sure. Some trace it back to European aristocrats who gave small amounts of money to servants. The custom spread to the United States in the nineteenth century, and at first many Americans actually disliked it, seeing it as an undemocratic habit that created a class of people dependent on the generosity of others. Despite the criticism, tipping grew and became a standard part of American life.

Recently, there's been a new debate. With digital payment screens, customers are now asked to tip in places that didn't use to expect it — coffee shops, bakeries, even self-service machines. Many people have started to complain about what's sometimes called "tip creep" or "tipping fatigue." They feel pressured to tip every time they buy something, even when they've received very little service.

So is tipping a good system? Supporters say it rewards hard work and encourages good service. Critics say it makes workers' income unpredictable, and that it can allow customers' personal biases to affect how much someone earns.

Whatever you think about it, here's some practical advice: before you travel, look up the local tipping customs. It's a small thing, but getting it right shows respect — and in some places, it makes a real difference to someone's day.`,
    vocabulary: [
      { word: 'gratitude', definition: 'The feeling of being thankful' },
      { word: 'obligation', definition: 'Something you must do because of a rule, custom, or duty' },
      { word: 'gesture', definition: 'An action that shows a feeling or intention' },
      { word: 'round up', definition: 'To increase a number to the nearest whole or convenient amount' },
      { word: 'fatigue', definition: 'Extreme tiredness, or a feeling of being tired of something' },
    ],
    discussionQuestions: [
      'What are the tipping customs in your country?',
      'Have you ever been confused about whether to tip while travelling?',
      'Do you think tips should be replaced by higher wages? Why or why not?',
      'How do you feel when a payment screen asks you to add a tip?',
    ],
  },
  {
    id: 'pod-24',
    title: 'Why Zebras Don\'t Worry — The Science of Stress',
    topic: 'Health',
    description: 'How the body\'s ancient alarm system works, why it helps us in a crisis but harms us when it never switches off, and what actually brings it back down.',
    duration: '11 min',
    level: 'Upper-Intermediate',
    script: `Picture a zebra grazing peacefully on the African savannah. Suddenly, a lion leaps out of the grass. In a fraction of a second, the zebra's heart starts pounding, its muscles fill with energy, and it runs for its life. A few minutes later, if it escapes, it goes back to eating grass as if nothing had happened. Now picture yourself lying awake at three in the morning, worrying about an email you need to send next week. Your heart is pounding too. But there's no lion. And that difference is the key to understanding stress.

The word "stress" was borrowed from physics and engineering, where it describes the force acting on a material. In the 1930s, a Hungarian-Canadian scientist named Hans Selye started using it to describe how living bodies respond to pressure. Even earlier, the American physiologist Walter Cannon had described what he called the "fight-or-flight" response — the body's way of preparing to either face a danger or escape from it.

So what actually happens in your body? When your brain detects a threat, it sends signals that cause your adrenal glands, which sit on top of your kidneys, to release hormones. The first is adrenaline. It acts within seconds: your heart beats faster, your breathing speeds up, and sugar is released into your blood to fuel your muscles. A little more slowly, a second hormone called cortisol rises. Cortisol helps keep energy available and, in the short term, it puts less urgent jobs on hold — things like digestion, growth, and repairing tissue. After all, there's no point digesting lunch if you're about to become someone else's lunch.

This system is brilliant for short emergencies. It's also useful in everyday life. A moderate amount of stress can sharpen your focus before an exam or a job interview. Psychologists have known since the early twentieth century that performance often improves with arousal — up to a point. Too little, and you're bored and unfocused. Too much, and you fall apart. This idea is often called the Yerkes-Dodson law.

The problem is that humans, unlike zebras, can switch on the stress response just by thinking. We worry about money, deadlines, relationships, and things that might happen months from now. The biologist Robert Sapolsky explored this in his popular book "Why Zebras Don't Get Ulcers." His point is simple: the stress response evolved for short, physical crises, but modern humans often keep it running for weeks or years.

When stress becomes chronic, the same changes that save your life in an emergency start to cause harm. Long-term high levels of stress are linked to high blood pressure, heart disease, poor sleep, weaker immune responses, and problems with memory and mood. The jobs that cortisol put on hold — repair, digestion, defence against infection — stay on hold for too long.

By the way, there's an interesting twist in the book's title. For decades, doctors believed stomach ulcers were mainly caused by stress. Then, in the 1980s, two Australian scientists, Barry Marshall and Robin Warren, showed that most ulcers are caused by a bacterium. Marshall famously drank a culture of the bacteria to prove his point, and the pair won the Nobel Prize in 2005. Stress may still make things worse, but it isn't the main cause. Science changes its mind when the evidence changes.

So what can we do? We can't remove every source of stress from our lives, and we shouldn't try. But we can help the body switch the alarm off. Physical exercise is one of the most reliable tools, perhaps because it uses the energy the stress response prepares us for. Sleep, of course, matters enormously. Slow breathing, especially long, gentle breaths out, activates the part of the nervous system that calms the body down. And social support is powerful: talking to someone you trust can make a threat feel smaller and more manageable.

The goal isn't a life without stress. It's a life where, like the zebra, you can run when you need to — and then go back to grazing.`,
    vocabulary: [
      { word: 'fight-or-flight response', definition: 'The body\'s automatic reaction to danger, preparing it to fight or run away' },
      { word: 'cortisol', definition: 'A hormone released during stress that helps control energy and other body processes' },
      { word: 'chronic', definition: 'Continuing for a long time or happening again and again' },
      { word: 'arousal', definition: 'A state of being alert, awake, and ready to react' },
      { word: 'put on hold', definition: 'To delay something until a later time' },
      { word: 'manageable', definition: 'Possible to deal with or control' },
    ],
    discussionQuestions: [
      'What situations make you feel most stressed? Is the "threat" real or imagined?',
      'Can you remember a time when a little stress helped you perform better?',
      'Which of the stress-reducing strategies in the podcast do you already use?',
      'Do you think modern life is more stressful than life in the past? Why?',
    ],
  },
  {
    id: 'pod-25',
    title: 'The Day of Two Noons — How Railways Invented Time Zones',
    topic: 'History',
    description: 'Before trains, every town kept its own time. How railways forced the world to agree on standard time, and why the result is still a little messy.',
    duration: '10 min',
    level: 'Intermediate',
    script: `Look at the clock on your phone. You probably trust it completely, and you assume that everyone in your city — and across most of your country — sees exactly the same time. That seems obvious today. But until the nineteenth century, it wasn't true at all. Every town kept its own time. So how did the whole world come to agree on what time it is? The answer, surprisingly, is trains.

For most of history, time was set by the sun. When the sun reached its highest point in the sky, it was noon. Because the Earth turns, the sun reaches that point at slightly different moments in different places. A town to the east has noon a few minutes before a town to the west. This was called local solar time, and for most people it worked perfectly well. If you travelled by horse, a difference of a few minutes between towns didn't matter.

Then came the railways. Suddenly people could travel long distances quickly, and train companies had to publish timetables. But which time should those timetables use? If every station used its own local time, the schedules became confusing. Worse, if two trains on the same track were using different clocks, it could lead to accidents.

Britain, where railways began, was the first to solve the problem. In 1840, the Great Western Railway started using London time at all its stations. Other railway companies followed, and by the late 1840s most of Britain's railways were using Greenwich Mean Time, the time kept at the Royal Observatory in Greenwich. People started calling it "railway time." Not everyone liked it, and for years some towns had clocks showing two times: local time and railway time.

The United States had a much bigger problem, because the country is so wide. At one point, American railways were using dozens of different local times. On the eighteenth of November 1883, the railway companies introduced a system of standard time zones across the country. In many towns, clocks were adjusted at noon, so that people experienced noon twice in one day — once by the old local time, and again by the new standard time. It became known as "the day of two noons." Interestingly, this was a decision made by private companies; the US government didn't officially make standard time law until 1918.

One person who pushed for a worldwide system was a Scottish-born Canadian engineer named Sandford Fleming. According to a well-known story, he once missed a train in Ireland because of a mistake in a timetable, and began thinking about a better way to organise time across the globe. He proposed dividing the world into twenty-four time zones, each one hour apart.

In 1884, representatives from twenty-five countries met in Washington, D.C., at the International Meridian Conference. They agreed that the line passing through Greenwich would be the prime meridian — zero degrees longitude — the starting point for measuring both longitude and time. That's why world time was based on Greenwich for so long.

Of course, the system is still not perfectly neat. Time zones often follow national borders rather than straight lines. China, which is wide enough to cover around five time zones, uses just one official time for the whole country. Some places, like India, use time zones that are half an hour off from their neighbours. And then there's daylight saving time, first introduced by Germany in 1916 during the First World War, which still causes confusion twice a year in many countries.

So next time you check the time, remember that this simple number is the result of a long negotiation between science, business, and politics — all started by the need to make the trains run on time.`,
    vocabulary: [
      { word: 'timetable', definition: 'A list showing the times when trains, buses, or classes are scheduled' },
      { word: 'meridian', definition: 'An imaginary line on the Earth\'s surface running from the North Pole to the South Pole' },
      { word: 'longitude', definition: 'The distance east or west of the prime meridian, measured in degrees' },
      { word: 'standardise', definition: 'To make things the same so that they follow one agreed rule' },
      { word: 'negotiation', definition: 'Discussion aimed at reaching an agreement' },
    ],
    discussionQuestions: [
      'How would your daily life be different if every town had its own time?',
      'Does your country use daylight saving time? Do you think it is a good idea?',
      'Should a large country use one time zone or several? What are the pros and cons?',
      'Can you think of another invention that changed how people think about time?',
    ],
  },
  {
    id: 'pod-26',
    title: 'Remembering Things That Never Happened — The Truth About Memory',
    topic: 'Psychology',
    description: 'Why memory works less like a video recording and more like a story we rebuild every time, and what that means for eyewitnesses and for all of us.',
    duration: '13 min',
    level: 'Advanced',
    script: `Most of us think of memory as a kind of video recorder. Something happens, the brain records it, and later we press "play" and watch it again. If a memory feels clear and detailed, we assume it must be accurate. But decades of psychological research tell a very different story. Memory isn't a recording. It's a reconstruction — and it can be rebuilt in ways that are surprisingly wrong.

One of the earliest scientists to notice this was the British psychologist Frederic Bartlett. In the 1930s, he asked English participants to read a Native American folk tale called "The War of the Ghosts" and then retell it later. The story contained details that felt strange to them. When people retold it, they didn't just forget parts; they changed it. Unfamiliar details disappeared or were replaced by more familiar ones, and the story became shorter and more logical by their own cultural standards. Bartlett concluded that we remember using mental frameworks, or schemas, filling gaps with what we expect.

The researcher most associated with this field is the American psychologist Elizabeth Loftus. In a famous experiment published in 1974, she showed people a film of a car accident and then asked how fast the cars were going when they "hit" each other. For other groups, she replaced the word "hit" with words like "smashed." People who heard "smashed" gave higher estimates of speed. A week later, they were also more likely to report seeing broken glass in the film, even though there wasn't any. A single word, introduced after the event, had changed what they remembered.

Loftus went further. In the 1990s, she and her colleagues showed that it was possible to plant entirely false memories. In what became known as the "lost in the mall" study, participants were given short descriptions of events from their childhood, supposedly provided by family members. One of them — getting lost in a shopping centre as a child — had never happened. Yet a significant minority of participants came to remember it, sometimes adding their own details.

You might think that very emotional memories are different. Surely we remember the most shocking moments of our lives perfectly? These are called flashbulb memories, because they feel as vivid as a photograph. But research suggests otherwise. The day after the space shuttle Challenger exploded in 1986, the psychologist Ulric Neisser asked students to write down how they had heard the news. When he asked them again about two and a half years later, many of their accounts had changed significantly — yet they were highly confident that their new versions were correct. Some even insisted that their original written accounts must be wrong.

This has serious consequences in the real world, particularly in courtrooms. Eyewitness testimony can be extremely persuasive to a jury. A witness who says, "I'm absolutely certain that's the man," sounds convincing. But confidence is not the same as accuracy. In the United States, cases in which people were later proven innocent through DNA evidence have shown that mistaken eyewitness identification was a factor in a large share of wrongful convictions. As a result, many police departments have changed how they conduct line-ups, to avoid accidentally influencing witnesses.

Why would the brain work this way? It seems like a design flaw, but it may actually be a feature. Memory didn't evolve to keep a perfect archive of the past. It evolved to help us predict and act in the future. A flexible memory lets us update what we know, combine experiences, and imagine new situations. The price we pay for that flexibility is that our memories can be edited — by time, by suggestion, and by the stories we tell ourselves.

So what should we take from all this? Not that we should distrust every memory we have. Most of the time, our memories are good enough. But we should hold them with a little humility. When you and a friend remember the same event differently, it's quite possible that neither of you is lying — and neither of you is completely right.`,
    vocabulary: [
      { word: 'reconstruction', definition: 'The act of building something again, often from incomplete pieces' },
      { word: 'schema', definition: 'A mental framework that helps us organise and interpret information' },
      { word: 'testimony', definition: 'A formal statement of what someone saw or knows, especially in a court of law' },
      { word: 'wrongful conviction', definition: 'A case in which an innocent person is found guilty of a crime' },
      { word: 'humility', definition: 'The quality of not being too proud or too sure of yourself' },
      { word: 'persuasive', definition: 'Able to make people believe or do something' },
    ],
    discussionQuestions: [
      'Have you ever remembered an event differently from someone else who was there?',
      'Why do you think confident witnesses are so convincing, even when they are wrong?',
      'Is it a problem or an advantage that our memories can change over time?',
      'How might this research change the way you think about your own childhood memories?',
    ],
  },
  {
    id: 'pod-27',
    title: 'Why Cities Keep Growing — The Pull of Urban Life',
    topic: 'Culture & Society',
    description: 'Why more than half of humanity now lives in cities, what draws people in, and the problems that come with rapid urban growth.',
    duration: '12 min',
    level: 'Upper-Intermediate',
    script: `For almost all of human history, most people lived in the countryside. They farmed, they raised animals, and the town was a place you visited, not a place you lived. Then, sometime around 2007, something quietly historic happened. According to the United Nations, for the first time ever, more people on Earth lived in urban areas than in rural ones. And the trend hasn't slowed down. The UN expects that by 2050, roughly two out of every three people will be city dwellers.

So why do cities keep growing? Why do people leave villages where their families have lived for generations and move into crowded, expensive, noisy places? The short answer is opportunity. But the longer answer is more interesting.

Economists talk about something called agglomeration. It simply means that when lots of people and businesses cluster together, everyone becomes more productive. A factory near other factories can find suppliers easily. A software company in a big city can hire from a huge pool of talent. And workers can switch jobs without moving house. The economist Edward Glaeser, who wrote a book called Triumph of the City, argues that cities are our greatest invention precisely because they make people smarter by putting them close to each other.

Ideas spread faster in cities, too. Think about a chance conversation in a café, a meeting at a conference, or a colleague who used to work at a competitor. Physicist Geoffrey West and his colleagues studied hundreds of cities and found a striking pattern: as a city gets bigger, things like wages, patents, and new businesses tend to grow faster than the population itself. A city twice the size doesn't just produce twice as much — it tends to produce a bit more than twice as much. Interestingly, infrastructure like roads and cables grows more slowly, so big cities are also more efficient per person.

Of course, the story isn't the same everywhere. In Europe and North America, urbanization happened mostly during the industrial revolution, over a century or more. Today, the fastest growth is in Asia and Africa. China moved hundreds of millions of people from farms to cities in just a few decades — probably the largest migration in human history. Cities like Lagos in Nigeria and Kinshasa in the Democratic Republic of the Congo are growing so quickly that planners can barely keep up.

And that's where the problems begin. When a city grows faster than it can build housing, roads, and water systems, people create their own solutions. Informal settlements, sometimes called slums, appear on the edges of town or on land nobody else wants. Traffic becomes a daily nightmare. Air pollution rises. Housing prices push ordinary families further and further from the center, which means longer commutes and more time away from home.

There's a social side as well. Many people move to the city and feel lonelier than ever, surrounded by millions of strangers. Village life, for all its limits, often came with a strong sense of community. In the city, you might not even know your neighbor's name.

Still, cities have one big environmental advantage that people often overlook. A person living in a dense apartment, taking the metro to work, usually uses far less energy than someone in a large suburban house who drives everywhere. Well-planned density can actually be greener than spreading out.

So the real question isn't whether cities will keep growing. They almost certainly will. The question is whether they'll grow well — with good public transport, affordable homes, green spaces, and room for everyone. The city of the future is being built right now, one decision at a time.`,
    vocabulary: [
      { word: 'urbanization', definition: 'The process of a population moving from rural areas into cities' },
      { word: 'agglomeration', definition: 'The clustering of people and businesses in one place, which makes them more productive' },
      { word: 'informal settlement', definition: 'An area of housing built without official permission or planning' },
      { word: 'city dweller', definition: 'A person who lives in a city' },
      { word: 'density', definition: 'How many people or buildings there are in a given area' },
    ],
    discussionQuestions: [
      'Would you rather live in a big city or in the countryside? Why?',
      'What are the biggest problems in the city you know best, and how could they be solved?',
      'Do you agree that cities can be better for the environment than suburbs?',
      'Why do you think people sometimes feel lonelier in cities despite being surrounded by others?',
    ],
  },
  {
    id: 'pod-28',
    title: 'Rewilding — Letting Nature Take the Wheel',
    topic: 'Environment',
    description: 'What happens when we step back and let ecosystems repair themselves, from wolves in Yellowstone to a former farm in southern England.',
    duration: '11 min',
    level: 'Intermediate',
    script: `Most conservation work is about protecting what's left. We put a fence around a forest, we ban hunting of a rare bird, we save a wetland from being drained. But there's a newer idea that goes a step further. It's called rewilding, and instead of just protecting nature, it tries to bring nature back — and then mostly get out of the way.

The basic idea is simple. Ecosystems are complicated, and in many places humans have removed key pieces of the puzzle, especially large animals. Rewilding tries to restore those missing pieces and then let natural processes do the rest. Less gardening, more letting go.

The most famous example comes from Yellowstone National Park in the United States. Wolves had been hunted out of the park by the 1920s. Without wolves, elk populations grew large, and the elk spent a lot of time grazing along rivers, eating young trees. In 1995, wolves were brought back from Canada. Many scientists have described what followed as a trophic cascade — a chain reaction running down the food chain. With wolves around, elk behaved differently, some trees and shrubs recovered in certain areas, and beavers found more material to build dams. Now, I should be honest here: researchers still debate how big these effects really were, and the story is often told in a simpler way than the evidence supports. But Yellowstone made the world pay attention to how much one species can matter.

Animals like wolves and beavers are sometimes called keystone species. A keystone is the stone at the top of an arch that holds everything else in place. Take it away, and the arch falls down. Beavers are a great example. By building dams, they slow down rivers, create ponds and wetlands, reduce flooding downstream, and provide homes for fish, insects, and birds. Beavers have now returned to rivers in Britain, centuries after they were hunted to extinction there.

Rewilding doesn't always need wolves, though. One of the best-known projects in Europe is the Knepp Estate in West Sussex, in southern England. For years it was an ordinary farm that struggled to make money on heavy clay soil. Starting around 2001, the owners, Charlie Burrell and Isabella Tree, stopped farming intensively and let the land go. They introduced free-roaming animals — old breeds of cattle, ponies, pigs, and deer — to act a bit like the wild grazers that once lived in Europe. Scrub grew back, and with it came wildlife. Rare species like nightingales, turtle doves, and purple emperor butterflies began to thrive there. Isabella Tree described the experience in her book, Wilding.

But rewilding is not without controversy. In the Netherlands, a reserve called the Oostvaardersplassen became famous when large numbers of deer, horses, and cattle starved during hard winters. Many people were upset, and it raised a hard question: if you bring animals back but fence them in, are they really wild, and who is responsible for them?

Farmers often have concerns too. Wolves can kill sheep. Beavers can flood fields. And some people worry that rewilding means giving up productive land when the world needs food. Supporters respond that rewilding often works best on land that was never very profitable to farm, and that healthy ecosystems provide services we all depend on, like clean water and pollinating insects.

What I find exciting about rewilding is the humility behind it. It admits that nature often knows how to heal itself better than we do. Our job is sometimes not to manage every detail, but simply to make room.`,
    vocabulary: [
      { word: 'rewilding', definition: 'Restoring an area to a natural state, often by reintroducing missing species' },
      { word: 'trophic cascade', definition: 'A chain of effects through a food chain caused by adding or removing a predator' },
      { word: 'keystone species', definition: 'A species that has an unusually large effect on its ecosystem' },
      { word: 'scrub', definition: 'Land covered with small bushes and low trees' },
      { word: 'humility', definition: 'The quality of not thinking you are more important or more capable than you are' },
    ],
    discussionQuestions: [
      'Would you support reintroducing a large predator, like wolves, in your country? Why or why not?',
      'Who should decide how land is used — farmers, governments, or local communities?',
      'Is there an animal that has disappeared from your region that you would like to see return?',
    ],
  },
  {
    id: 'pod-29',
    title: 'The Gut Microbiome — The Tiny Ecosystem Inside You',
    topic: 'Health',
    description: 'An introduction to the trillions of microbes living in our digestive system, what they do for us, and what science can and cannot yet say about them.',
    duration: '10 min',
    level: 'Upper-Intermediate',
    script: `Right now, as you listen to this, you are not alone. Inside your digestive system live trillions of microorganisms — bacteria mostly, but also viruses, fungi, and other tiny life forms. Together, they're known as the gut microbiome. And over the past twenty years, it has become one of the most exciting areas in medical research.

You may have heard the claim that bacterial cells in your body outnumber your own cells by ten to one. That number was repeated for decades, but it turned out to be a rough guess. A more careful estimate published in 2016 suggested the ratio is closer to one to one. So, roughly speaking, you're about half microbe by cell count. Still pretty remarkable.

So what are all these microbes doing? Quite a lot, it turns out. One of their most important jobs is helping us digest food we can't handle on our own, especially fiber. Our bodies don't have the tools to break down many kinds of plant fiber. But gut bacteria do. When they ferment fiber, they produce substances called short-chain fatty acids. One of these, butyrate, is a major source of energy for the cells lining the colon and seems to help keep the gut wall healthy.

Gut microbes also help train the immune system. From the moment we're born, our bodies are learning which microbes are friends and which are threats. A baby picks up its first microbes during birth and in the first months of life, from its mother, from breast milk, and from the environment. This early period appears to shape the microbiome for years to come.

Another fascinating topic is what scientists call the gut-brain axis. The gut and the brain are connected by nerves, especially the vagus nerve, and by chemical signals in the blood. Studies in mice have shown that changing gut bacteria can change behavior. That's led to a lot of excitement — and a lot of headlines — about the microbiome affecting mood, anxiety, and even depression. But here's where we need to be careful. Mice are not people, and much of the human evidence is still early. It's a promising field, not a settled one.

There is one treatment where the evidence is genuinely strong, and it's a slightly unusual one. It's called a fecal microbiota transplant. Yes, that means transferring stool from a healthy donor into a patient's gut. It sounds unpleasant, but for people with repeated infections of a harmful bacterium called Clostridioides difficile, it works remarkably well, often after antibiotics have failed.

Speaking of antibiotics, they're a good example of how the microbiome can be disrupted. Antibiotics save lives, but they don't only kill harmful bacteria. They can also wipe out many helpful ones. Usually the microbiome recovers, but not always completely. That's one reason doctors encourage people to use antibiotics only when they're truly needed.

So what can you actually do to look after your gut? The most consistent advice is not very glamorous. Eat plenty of fiber from a wide variety of plants — vegetables, fruits, beans, whole grains, nuts. Fermented foods like yogurt, kimchi, and kefir may also help. As for expensive probiotic supplements, the evidence is mixed, and the benefits depend a lot on the specific product and the person.

The big lesson of microbiome research may be this: your body is less like a single organism and more like an ecosystem. And like any ecosystem, it does best with diversity and care.`,
    vocabulary: [
      { word: 'microbiome', definition: 'The community of microorganisms living in a particular environment, such as the human gut' },
      { word: 'ferment', definition: 'To break down a substance chemically using bacteria or yeast' },
      { word: 'immune system', definition: "The body's system for protecting itself against disease and infection" },
      { word: 'gut-brain axis', definition: 'The two-way communication network between the digestive system and the brain' },
      { word: 'probiotic', definition: 'Live bacteria eaten or taken as a supplement to benefit health' },
    ],
    discussionQuestions: [
      'Are fermented foods part of the traditional diet in your country? Which ones?',
      'Why do you think health headlines often exaggerate early scientific findings?',
      'Would you change your diet based on what you heard in this episode? How?',
      'How do you decide whether a health supplement is worth buying?',
    ],
  },
  {
    id: 'pod-30',
    title: 'The Printing Press — The Machine That Changed Minds',
    topic: 'History',
    description: "How Gutenberg's movable type spread across Europe and transformed religion, science, and the way ordinary people thought about knowledge.",
    duration: '13 min',
    level: 'Advanced',
    script: `Imagine a world where every single book had to be copied out by hand. A Bible might take a skilled scribe a year or more to complete. Books were rare, expensive, and mostly kept in monasteries, universities, and the homes of the very rich. That was Europe before the middle of the fifteenth century. Then a goldsmith from the German city of Mainz changed everything.

His name was Johannes Gutenberg, and around 1440 he began developing a system of printing with movable metal type. The idea was to cast individual letters in metal, arrange them into lines and pages, ink them, and press them onto paper. When you were finished, you could take the letters apart and reuse them for the next page. Gutenberg's genius wasn't a single invention. It was a combination: a mold for casting letters quickly and precisely, an oil-based ink that stuck to metal, and a screw press adapted from the kind used to make wine and olive oil.

Now, it's important to say that Gutenberg wasn't the first to print with movable type. In China, an artisan named Bi Sheng created movable type from baked clay in the eleventh century. And in Korea, a Buddhist text known as the Jikji was printed with metal type in 1377, decades before Gutenberg. But the Chinese writing system has thousands of characters, which made movable type far less practical than it was for the twenty-odd letters of the Latin alphabet. In Europe, the conditions were just right for the technology to explode.

And explode it did. Gutenberg's famous Bible was completed around 1455. Within about fifty years, printing presses were operating in well over two hundred towns and cities across Europe, and millions of books had been produced. Historians call books printed before 1501 incunabula, from a Latin word meaning cradle — these were the products of printing's infancy.

The consequences were enormous. Take religion. In 1517, a monk named Martin Luther wrote his Ninety-five Theses criticizing the Catholic Church. In earlier centuries, a protest like that might have stayed local. But printers quickly copied Luther's writings, and within weeks they were circulating across Germany. Luther became one of the first best-selling authors in history, and the Protestant Reformation spread with a speed that would have been impossible before print.

Science changed too. Before printing, every hand-copied manuscript introduced small errors, and drawings of plants or the human body became less accurate with each copy. Print allowed scholars in different countries to look at exactly the same text and the same diagrams. They could compare, correct, and build on each other's work. The historian Elizabeth Eisenstein argued that this standardization was one of the quiet foundations of the Scientific Revolution.

Language was affected as well. Printers needed consistent spelling and grammar to sell books across a wide area, so over time, regional variations began to give way to more standard national languages. Even the way we think about authorship and ownership of ideas — the concept that eventually became copyright — grew out of the printing trade.

Of course, not everyone welcomed the change. Some worried that cheap books would spread dangerous ideas or false information. Authorities created lists of banned books and tried to control what could be printed. If that sounds familiar, it should. Every major communication technology since — newspapers, radio, television, the internet — has prompted the same fears and the same arguments.

That may be the most useful lesson from the printing press. New technologies don't just make old tasks faster. They change who gets to speak, who gets to listen, and what a society believes is true.`,
    vocabulary: [
      { word: 'movable type', definition: 'A printing system using individual letters that can be arranged and reused' },
      { word: 'scribe', definition: 'A person whose job was to copy documents by hand before printing' },
      { word: 'incunabula', definition: 'Books printed in Europe before 1501, in the earliest years of printing' },
      { word: 'Reformation', definition: 'The sixteenth-century religious movement that led to the founding of Protestant churches' },
      { word: 'standardization', definition: 'The process of making things follow the same rules or form' },
      { word: 'manuscript', definition: 'A book or document written by hand' },
    ],
    discussionQuestions: [
      'Why do you think the printing press had a bigger impact in Europe than in China or Korea?',
      'Do you see similarities between the printing press and the internet? What are they?',
      'Should governments ever control what can be published? Where would you draw the line?',
    ],
  },
  {
    id: 'pod-31',
    title: 'How Habits Form — The Autopilot in Your Brain',
    topic: 'Psychology',
    description: 'What happens in the brain when a behavior becomes automatic, how long it really takes to build a habit, and how to use that knowledge in daily life.',
    duration: '11 min',
    level: 'Intermediate',
    script: `Think about what you did this morning. You probably got out of bed, went to the bathroom, brushed your teeth, maybe made a coffee or checked your phone. Now here's a question: how many of those things did you actually decide to do? If you're like most people, the honest answer is — not many. You just did them. That's the power of habit.

Psychologists have found that a large share of what we do each day happens more or less on autopilot. In one well-known set of studies, the researcher Wendy Wood asked people to record what they were doing and thinking throughout the day. Roughly forty percent of the time, people were doing the same thing in the same place they usually did, often while thinking about something else entirely.

So how does a behavior become automatic? A lot of the early research was done with rats. At MIT, neuroscientist Ann Graybiel and her team watched the brain activity of rats learning to run through a maze to find chocolate. At first, the rats' brains were very active the whole time — sniffing, exploring, deciding. But after many runs, the brain activity changed. It became strong at the beginning, when the rat heard a click and the gate opened, and again at the end, when it reached the reward. In the middle, the brain was much quieter. The whole route had become a single packaged unit, a process sometimes called chunking. A part of the brain called the basal ganglia plays a central role in this.

The writer Charles Duhigg made this idea popular in his book The Power of Habit. He described a simple three-part loop. First, there's a cue — a trigger that tells your brain to start. Then there's the routine — the behavior itself. And finally, there's the reward, which tells your brain this loop is worth remembering. For example: you feel bored at work, that's the cue. You check social media, that's the routine. You get a little hit of novelty, that's the reward.

Now, you've probably heard that it takes twenty-one days to form a habit. Unfortunately, that's a myth. In a 2009 study at University College London, Phillippa Lally and her colleagues followed people trying to build new daily habits, like drinking water with lunch or going for a run. On average, it took about sixty-six days for the behavior to feel automatic. But the range was huge — from eighteen days to more than two hundred. Simpler habits formed faster. And here's some good news: missing a single day didn't seriously damage the process.

So how can we use this? One useful strategy is to attach a new habit to an existing one. This is sometimes called habit stacking. For example, "After I pour my morning coffee, I'll write down three things I need to do today." The old habit becomes the cue for the new one.

Another strategy is to change the amount of friction. Friction is anything that makes a behavior harder. If you want to read more, put a book on your pillow. If you want to snack less, don't keep chips on the kitchen counter. Small changes in the environment often work better than willpower, because willpower gets tired, but your environment is always there.

Finally, big life changes can be a great opportunity. When people move to a new home or start a new job, their old cues disappear. Researchers have found that this is a good moment to build new habits, because the autopilot hasn't been programmed yet.

The key takeaway is that habits aren't about character. They're about repetition and context. Design your surroundings well, be patient, and let your brain do what it does best — run on autopilot.`,
    vocabulary: [
      { word: 'autopilot', definition: 'A state of doing something automatically without thinking about it' },
      { word: 'cue', definition: 'A signal that triggers a particular behavior' },
      { word: 'basal ganglia', definition: 'A group of structures deep in the brain involved in movement and habit formation' },
      { word: 'friction', definition: 'Anything that makes an action more difficult or less convenient' },
      { word: 'willpower', definition: 'The ability to control your own actions and resist temptation' },
    ],
    discussionQuestions: [
      'What is one good habit and one bad habit you have? What are their cues?',
      'Were you surprised that habits take longer than twenty-one days to form?',
      'How could you add or remove friction in your environment to support a goal?',
      'Have you ever changed a habit after moving house or starting something new?',
    ],
  },
  {
    id: 'pod-32',
    title: 'The Four-Day Work Week — Less Time, Same Results?',
    topic: 'Business',
    description: 'Looking at the trials, the arguments, and the practical challenges behind the idea of working four days instead of five for the same pay.',
    duration: '12 min',
    level: 'Upper-Intermediate',
    script: `The weekend as we know it is younger than you might think. In 1926, the American carmaker Henry Ford made headlines when he moved his factory workers to a five-day, forty-hour week. Critics said it would hurt productivity. Instead, it became the standard across much of the world. Nearly a century later, a growing number of companies are asking a similar question: if five days worked, why not four?

The idea behind the modern four-day week is often summed up with three numbers: one hundred, eighty, one hundred. Employees receive one hundred percent of their pay, work eighty percent of the time, and in return they promise to deliver one hundred percent of their usual output. It's important to separate this from a compressed week, where people simply squeeze forty hours into four ten-hour days. The more ambitious version actually cuts the total hours.

So, does it work? Let's look at the evidence. One of the most talked-about experiments took place in Iceland. Between 2015 and 2019, the city of Reykjavik and the national government ran trials that reduced working hours for around two and a half thousand public sector workers, without reducing their pay. Researchers reported that productivity and service quality stayed the same or improved in most workplaces, while workers reported less stress and burnout. Following the trials, unions negotiated shorter hours for a large share of the country's workforce.

In 2022, the United Kingdom hosted a large pilot organized by the non-profit group 4 Day Week Global, together with researchers from universities including Cambridge. Around sixty companies took part, from marketing agencies to a fish-and-chip shop. At the end of six months, the large majority of companies decided to continue with the shorter week, and many made it permanent. Employees reported better sleep, less exhaustion, and more time for family.

Why might working less not mean producing less? One explanation is an old idea known as Parkinson's law: work expands to fill the time available for its completion. When people have less time, they often cut out the least useful parts of the day — long meetings, unnecessary emails, constant interruptions. Many trial companies shortened meetings or created periods of quiet, focused work.

There's also the question of recruitment and retention. A four-day week is a powerful benefit. Companies that offer it may find it easier to attract talented people and keep them, which saves money on hiring and training.

But it's not all simple. Critics point out that the companies volunteering for these trials were probably the ones most likely to succeed. That's a form of selection bias. And it's much easier to reorganize an office job than a job where someone needs to be physically present. A hospital can't close on Fridays. A restaurant still needs to serve customers. In those settings, a four-day week usually means hiring more staff, which costs money.

Some workers also find that four days become more intense. If you have to fit the same work into less time, the pressure can actually increase. And not every manager is comfortable judging people by results rather than by hours seen at a desk.

So is the four-day week the future? It's probably not a one-size-fits-all solution. But the trials have challenged a basic assumption — that more hours automatically mean more output. Just as Henry Ford's decision once seemed radical, today's experiments might look perfectly normal to the next generation of workers.`,
    vocabulary: [
      { word: 'compressed week', definition: 'A schedule where full-time hours are fitted into fewer, longer days' },
      { word: 'pilot', definition: 'A small-scale trial carried out before introducing something more widely' },
      { word: "Parkinson's law", definition: 'The idea that work expands to fill the time available for it' },
      { word: 'retention', definition: 'The ability of a company to keep its employees' },
      { word: 'selection bias', definition: 'A distortion in results caused by the way participants were chosen' },
      { word: 'burnout', definition: 'Physical and emotional exhaustion caused by long-term stress' },
    ],
    discussionQuestions: [
      'Would you prefer a four-day week with longer days, or five shorter days? Why?',
      'Which jobs do you think would find a four-day week most difficult?',
      "Do you agree with Parkinson's law? Can you think of an example from your own life?",
    ],
  },
  {
    id: 'pod-33',
    title: 'Glaciers as Water Towers — The Ice That Feeds Rivers',
    topic: 'Environment',
    description: 'How mountain glaciers store water and release it when people need it most, and what happens to the rivers below as that ice disappears.',
    duration: '10 min',
    level: 'Intermediate',
    script: `When we think about melting glaciers, most of us picture one thing: rising sea levels. That's a real concern. But there's another side of the story that gets far less attention, and for hundreds of millions of people it may matter even more. Mountain glaciers are not just frozen scenery. They work like giant water towers.

Here's how it works. In winter, or during the wet season, snow falls high in the mountains. Over many years, that snow is pressed down into thick layers of ice, which slowly flows downhill as a glacier. Then, in the warm, dry months, part of the ice melts and runs into streams and rivers. In other words, glaciers save water when there's plenty of it and release it when there isn't. They're a natural storage system that nobody had to build.

The most important example is in Asia. The Himalayas, the Karakoram, and the Hindu Kush contain so much ice that scientists sometimes call the region the Third Pole — the largest store of frozen water outside the Arctic and Antarctica. Great rivers begin in these mountains, including the Indus, the Ganges, the Brahmaputra, the Yangtze, and the Mekong, which ends here in southern Vietnam.

Now, it's worth being careful. Not all of these rivers depend on glaciers in the same way. For the Ganges or the Mekong, monsoon rain provides most of the water. But for the Indus, which flows through some of the driest farmland in Pakistan, melting ice and snow are a much bigger part of the supply. And for almost every mountain river, glacier melt matters most at exactly the worst moment — in hot, dry periods before the rains arrive, when farmers need water for their crops.

The same is true on the other side of the world. In the Andes of South America, cities such as Lima in Peru and La Paz in Bolivia rely partly on glacier water during the dry season. Bolivia has already seen what loss looks like. The Chacaltaya glacier near La Paz once had a ski run — reportedly the highest in the world. By around 2009, the glacier had essentially disappeared.

So what happens as glaciers shrink? This is where an idea called peak water comes in, and it's a little counterintuitive. At first, as temperatures rise, glaciers melt faster, so rivers actually carry more water. That can look like good news. But a glacier is like a bank account. If you keep withdrawing more than you deposit, the balance goes down. Eventually the ice becomes too small to produce as much meltwater, and the extra flow turns into less flow. Many smaller glaciers have already passed this peak.

Melting also creates more immediate dangers. As glaciers retreat, meltwater often collects in lakes held back by loose rock and ice. If that natural dam suddenly breaks, the result is a glacial lake outburst flood, which can send a wall of water and debris rushing down a valley with very little warning.

People in mountain communities are finding creative ways to adapt. In Ladakh, in northern India, the engineer Sonam Wangchuk developed ice stupas — tall cones of artificial ice built in winter by spraying water into the freezing air. Because a cone has less surface exposed to the sun, it melts slowly into spring, giving farmers water when they plant. Other communities are building small reservoirs, improving irrigation, and sharing water more carefully.

Glaciers have been quietly managing our water for thousands of years. As they shrink, that job falls to us. And learning to do it well may be one of the defining challenges of this century.`,
    vocabulary: [
      { word: 'glacier', definition: 'A large, slow-moving mass of ice formed from snow over many years' },
      { word: 'meltwater', definition: 'Water produced by melting snow or ice' },
      { word: 'peak water', definition: 'The point after which the water supply from a source begins to decline' },
      { word: 'retreat', definition: '(Of a glacier) to become smaller and move back up a valley' },
      { word: 'irrigation', definition: 'Supplying water to land or crops through channels or pipes' },
    ],
    discussionQuestions: [
      'Where does the drinking water in your city come from?',
      'Why do you think the idea of peak water is easy to misunderstand?',
      'Who should help pay for adaptation in mountain communities affected by melting glaciers?',
    ],
  },
  {
    id: 'pod-34',
    title: 'Light Pollution — The Disappearing Night Sky',
    topic: 'Environment',
    description: 'How artificial light at night hides the stars, confuses wildlife, and affects our own health — and why it is one of the easiest pollution problems to fix.',
    duration: '9 min',
    level: 'Upper-Intermediate',
    script: `When was the last time you saw the Milky Way? Not in a photograph, but with your own eyes — that soft band of light stretching across a dark sky. If you live in or near a city, the answer might be never. And you're far from alone.

In 2016, a team of scientists published a world atlas of artificial night sky brightness. Their conclusion was striking: the Milky Way is hidden from more than a third of humanity. In Europe, around sixty percent of people can no longer see it from where they live. In North America, the figure is close to eighty percent. For most of human history, the night sky was a shared experience, a source of stories, calendars, and navigation. Now, for many people, it has simply vanished.

The cause is light pollution — artificial light that shines where it isn't needed or wanted. It comes from streetlights, buildings, advertising screens, sports fields, and car parks. Much of it is wasted. Light that points sideways or upward doesn't help anyone see the ground. It just scatters in the atmosphere and creates that orange or white glow you see above cities at night, which is called skyglow.

Light pollution isn't only a problem for astronomers. It has real effects on wildlife. Take sea turtles. Baby turtles hatch on beaches at night and find the ocean by moving toward the brightest horizon, which naturally would be the moonlight and starlight reflecting off the water. But near brightly lit hotels and roads, many hatchlings crawl in the wrong direction, toward the land, where they die. Many beaches now have rules about lighting during nesting season for exactly this reason.

Birds are affected too. Many species migrate at night and use the stars to navigate. Brightly lit buildings and towers can confuse them, causing them to circle until they're exhausted or crash into glass. Some cities now encourage tall buildings to switch off unnecessary lights during migration seasons. And insects, as anyone who has seen moths around a lamp knows, are strongly drawn to artificial light, which can trap them and make them easy prey.

What about humans? Our bodies evolved with a natural cycle of light and dark. In darkness, the brain releases melatonin, a hormone that helps regulate our internal clock. Bright light at night, especially light with a lot of blue in it, can suppress melatonin. Researchers are still studying the long-term health effects of living under constant artificial light, but our biology clearly expects nights to be dark.

There's an ironic twist in recent years. Many cities have replaced old streetlights with LEDs, which use much less energy — a clear win for the climate. But early LEDs were often very bright and bluish-white, and because they're cheap to run, some places simply added more of them. Today, many lighting experts recommend warmer-colored LEDs, shielded so they point downward, and dimmed or switched off when nobody is around.

And that's the hopeful part of this story. Unlike many forms of pollution, light pollution disappears the moment you turn the light off. There's no cleanup. The International Dark-Sky Association, now called DarkSky International, certifies places that protect their night skies. In 2001, the city of Flagstaff in Arizona became the world's first International Dark Sky City, thanks to lighting rules that go back decades.

So next time you're far from the city on a clear night, look up. That sky belongs to everyone — and getting it back might be as simple as pointing our lights in the right direction.`,
    vocabulary: [
      { word: 'skyglow', definition: 'The brightening of the night sky over populated areas caused by artificial light' },
      { word: 'hatchling', definition: 'A young animal that has recently come out of its egg' },
      { word: 'migrate', definition: 'To travel regularly from one region to another, usually with the seasons' },
      { word: 'melatonin', definition: 'A hormone that helps control the body\'s sleep and wake cycle' },
      { word: 'shielded', definition: 'Covered so that light is directed only where it is needed' },
    ],
    discussionQuestions: [
      'Can you see many stars from where you live? Where is the darkest place you have ever been?',
      'Should cities limit advertising screens and decorative lighting at night?',
      'Why do you think light pollution gets less attention than air or water pollution?',
      'Would you support switching off some streetlights late at night to save energy?',
    ],
  },
  {
    id: 'pod-35',
    title: 'Plate Tectonics — The Idea Nobody Believed',
    topic: 'Science',
    description: "The story of how Alfred Wegener's rejected theory of drifting continents became the foundation of modern geology.",
    duration: '13 min',
    level: 'Advanced',
    script: `Look at a map of the world and you might notice something curious. The east coast of South America and the west coast of Africa look as if they could fit together, like two pieces of a jigsaw puzzle. People had noticed this for centuries. But it took a German scientist with an unusual background, a lot of stubbornness, and about fifty years of argument before the world accepted what it meant.

The scientist was Alfred Wegener. He wasn't a geologist — he was a meteorologist and polar explorer who studied the atmosphere and led expeditions to Greenland. In 1912, he proposed an idea he called continental drift. According to Wegener, the continents had once been joined together in a single giant landmass, which he named Pangaea, meaning all lands. Over millions of years, that supercontinent had broken apart, and the pieces had slowly drifted to their present positions.

Wegener didn't just rely on the shape of the coastlines. He gathered evidence from many fields. Fossils of the same ancient reptile, called Mesosaurus, had been found in both Brazil and southern Africa, even though it couldn't have swum across an ocean. Fossils of a plant called Glossopteris turned up in South America, Africa, India, Australia, and Antarctica. Rock formations and mountain ranges seemed to continue from one continent to another. And there were signs of ancient glaciers in places that are now hot and tropical.

It was a powerful case. So why did most geologists reject it? The main problem was that Wegener couldn't explain how continents could move. He suggested they plowed through the ocean floor like ships through ice, but physicists showed that the forces he proposed were far too weak. Without a convincing mechanism, many scientists dismissed the whole theory, sometimes with open mockery. Wegener died in 1930 on an expedition across the Greenland ice sheet, long before his idea was vindicated.

The turning point came from the bottom of the sea. After the Second World War, new sonar technology allowed scientists to map the ocean floor in detail. Working at Columbia University, the geologist and cartographer Marie Tharp, together with Bruce Heezen, produced maps revealing a vast underwater mountain chain running down the middle of the Atlantic — the Mid-Atlantic Ridge — with a deep valley along its center. Tharp suspected this was a rift, a place where the Earth's crust was being pulled apart. At first, even Heezen doubted her.

Then came the magnetic evidence. When volcanic rock cools, tiny magnetic minerals inside it line up with the Earth's magnetic field, which has flipped direction many times in the planet's history. In the early 1960s, scientists including Fred Vine and Drummond Matthews showed that the rocks on either side of ocean ridges formed matching stripes of normal and reversed magnetism. The best explanation was that new sea floor was constantly forming at the ridges and spreading outward, like two conveyor belts.

By the late 1960s, these ideas had come together into the theory of plate tectonics. The Earth's outer shell is broken into large rigid plates that move slowly over the hotter, softer layer beneath. They travel only a few centimeters per year — about as fast as your fingernails grow. But over millions of years, that's enough to open oceans and build mountains.

Plate tectonics explains so much. The Himalayas are still rising because the Indian plate is pushing into the Eurasian plate. The Ring of Fire around the Pacific, with its earthquakes and volcanoes, marks the edges of plates. Japan, Indonesia, and Chile sit on these restless boundaries.

Wegener's story is a reminder of how science really works. Good evidence isn't always enough on its own. Sometimes an idea has to wait for the tools — and the people — that can prove it.`,
    vocabulary: [
      { word: 'continental drift', definition: 'The theory that continents slowly move across the surface of the Earth' },
      { word: 'mechanism', definition: 'The process or system that causes something to happen' },
      { word: 'vindicated', definition: 'Proved to be right after being doubted or criticized' },
      { word: 'rift', definition: 'A large crack in the ground where the Earth\'s crust is being pulled apart' },
      { word: 'plate', definition: "One of the large rigid sections that make up the Earth's outer shell" },
      { word: 'sonar', definition: 'A system that uses sound waves to detect objects or measure depth underwater' },
    ],
    discussionQuestions: [
      "Why do you think scientists rejected Wegener's theory even though he had a lot of evidence?",
      'Can you think of other ideas that were laughed at before being accepted?',
      'Does your country experience earthquakes or volcanoes? How do people prepare for them?',
    ],
  },
  {
    id: 'pod-36',
    title: 'How GPS Works — Clocks, Satellites and Einstein',
    topic: 'Technology',
    description: 'What really happens when your phone finds your location, why GPS depends on extremely precise clocks, and how relativity keeps it accurate.',
    duration: '11 min',
    level: 'Upper-Intermediate',
    script: `You open a map on your phone, and within seconds a little blue dot shows exactly where you're standing. It feels effortless. But behind that dot is a network of satellites orbiting the Earth, some of the most precise clocks ever built, and — surprisingly — Albert Einstein's theory of relativity.

GPS stands for Global Positioning System. It was developed by the United States military, and the first satellites were launched in the late 1970s. Today, the system includes around thirty working satellites, orbiting about twenty thousand kilometers above the Earth. They're arranged so that, from almost anywhere on the planet, at least four are visible in the sky at any moment.

Here's the key idea, and it's a little counterintuitive: GPS satellites don't actually know where you are. They don't track you at all. Each satellite simply broadcasts a continuous signal that says, in effect, "I am this satellite, this is my position, and this is the exact time right now." That's it. Your phone does all the work.

When your phone receives one of these signals, it compares the time the signal was sent with the time it arrived. Radio signals travel at the speed of light, so if you know how long the signal took, you know how far away the satellite is. With one satellite, you know you're somewhere on a giant sphere around it. With a second, you narrow it down to where two spheres overlap. With a third, you get down to a point. This method is called trilateration.

So why do you need four satellites rather than three? Because your phone's clock isn't very accurate. The satellites carry atomic clocks, but your phone has a cheap ordinary one. Light travels about thirty centimeters in a single nanosecond, so even a tiny clock error would put you hundreds of meters off. The fourth satellite allows your phone to solve for its own clock error along with its position. Clever, isn't it?

Now for Einstein. According to his special theory of relativity, clocks that move fast tick more slowly. GPS satellites move at roughly fourteen thousand kilometers per hour, so their clocks lose about seven microseconds per day. But according to general relativity, clocks in weaker gravity tick faster, and the satellites are far from Earth's gravity, so their clocks gain about forty-five microseconds a day. Put together, the satellite clocks run ahead by about thirty-eight microseconds every day. That sounds tiny. But if engineers didn't correct for it, position errors would build up by roughly ten kilometers per day. Relativity isn't just abstract physics — it's built into your map app.

GPS also has an interesting political history. For years, civilians could use only a deliberately degraded signal. After a Korean passenger plane strayed into Soviet airspace and was shot down in 1983, President Ronald Reagan announced that GPS would be made available for civilian use once it was ready. Then, in 2000, the United States switched off the intentional degradation, known as Selective Availability, and civilian accuracy improved dramatically almost overnight.

Today, GPS isn't the only system. Russia operates GLONASS, the European Union has Galileo, and China has BeiDou. Most modern phones can use several of them at once, which improves accuracy, especially in cities where tall buildings block parts of the sky.

And GPS does far more than navigation. Its precise time signals are used to synchronize mobile phone networks, power grids, and financial transactions. That dependence is also a weakness. Signals from space are weak and can be jammed or faked, a technique called spoofing. Engineers are working on backups for exactly this reason.

So the next time that blue dot appears, remember what it took: satellites, atomic clocks, a Cold War decision, and a correction for the bending of time itself.`,
    vocabulary: [
      { word: 'trilateration', definition: 'Finding a position by measuring distances from several known points' },
      { word: 'atomic clock', definition: 'An extremely accurate clock that measures time using the vibrations of atoms' },
      { word: 'counterintuitive', definition: 'Different from what you would naturally expect' },
      { word: 'synchronize', definition: 'To make things happen at exactly the same time or rate' },
      { word: 'spoofing', definition: 'Sending false signals to trick a device into giving wrong information' },
    ],
    discussionQuestions: [
      'How often do you use GPS in a typical day? Could you manage without it?',
      'Were you surprised that GPS depends on the theory of relativity?',
      'Should a single country control a technology that the whole world depends on?',
      'Do you worry about apps knowing your location? How do you manage this?',
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
  {
    id: 'comp-31',
    title: 'Gym: Joining Up',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '45 sec',
    script: `Thanks for coming in. So we have two memberships. The standard one is thirty dollars a month and lets you use the gym and the pool any time between six in the morning and ten at night. The premium one is forty-five a month and also includes all group classes, like yoga and spinning, plus one free session with a personal trainer. There's no joining fee this month, and you can cancel any time with thirty days' notice. If you'd like, you can try the gym for free today before deciding. I'll just need you to fill in a short health form first.`,
    questions: [
      { question: 'What does the standard membership include?', options: ['A personal trainer', 'Group classes only', 'The gym and the pool', 'Twenty-four-hour access'], correctIndex: 2 },
      { question: 'What extra does the premium membership give you?', options: ['A free towel every visit', 'Group classes and one personal training session', 'Free parking', 'Use of the sauna only'], correctIndex: 1 },
      { question: 'What must the customer do before trying the gym today?', options: ['Fill in a short health form', 'Bring a friend', 'Pay a joining fee', 'Book a class'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-32',
    title: 'Landlord Voicemail: Water Shut-Off',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '35 sec',
    script: `Hi, it's Mr. Patel, your landlord. Just letting all the tenants know that the water will be turned off this Wednesday from nine in the morning until about one in the afternoon. The plumbers are replacing the old pipes in the basement. Please fill a few bottles or a kettle beforehand if you need water during that time. Also, the plumbers may need to get into some of the flats to check the pipes under the kitchen sink, so if you're out, could you leave a key with me? I'm in flat one. Thanks, and sorry for the trouble.`,
    questions: [
      { question: 'Why will the water be turned off?', options: ['The bill wasn\'t paid', 'There is a leak on the roof', 'The building is being painted', 'The old pipes are being replaced'], correctIndex: 3 },
      { question: 'How long will the water be off?', options: ['All day', 'About one hour', 'About four hours', 'Two days'], correctIndex: 2 },
      { question: 'What does the landlord ask tenants who will be out to do?', options: ['Call the plumbers', 'Leave a key with him', 'Turn off their electricity', 'Stay at home'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-33',
    title: 'Library: Lost and Found',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '35 sec',
    script: `A black umbrella? Let me look in the lost property box. We get a lot of umbrellas, I'm afraid. Hmm, there are three black ones here. Can you tell me anything special about yours? A wooden handle with a small crack? Yes, I think this is it. Here you go. Just so you know, we keep lost items for one month. After that, we give them to a charity shop. And by the way, your library books are due back on Friday. You can renew them online if you need more time, up to two times.`,
    questions: [
      { question: 'How did the librarian know which umbrella was hers?', options: ['It had a wooden handle with a small crack', 'It had her name on it', 'It was the only black one', 'It was red inside'], correctIndex: 0 },
      { question: 'What happens to lost items after one month?', options: ['They are thrown away', 'They are sold by the library', 'They are sent to the police', 'They are given to a charity shop'], correctIndex: 3 },
      { question: 'How many times can she renew her books online?', options: ['Once', 'Up to five times', 'Up to two times', 'As many times as she likes'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-34',
    title: 'Booking a Table for a Birthday',
    topic: 'Daily Life',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Good evening, Lotus Garden restaurant. A table for this Saturday? Of course. How many people? Eight, at seven o'clock. Let me check. Inside is full at seven, but I can offer you eight o'clock inside, or seven o'clock on the terrace. It's covered, so it's fine even if it rains. The terrace at seven, lovely. Is it for a special occasion? A birthday. Would you like us to prepare a small cake? It's complimentary for birthday bookings. Great. Can I have a name and phone number? And please let us know by Friday if the number of guests changes.`,
    questions: [
      { question: 'How many people is the booking for?', options: ['Four', 'Eight', 'Six', 'Ten'], correctIndex: 1 },
      { question: 'Where will they sit?', options: ['On the terrace at seven', 'Inside at eight', 'Inside at seven', 'At the bar'], correctIndex: 0 },
      { question: 'What does the restaurant offer for birthdays?', options: ['A free bottle of wine', 'Live music', 'Ten percent off the bill', 'A small free cake'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-35',
    title: 'Bank: A Blocked Card',
    topic: 'Daily Life',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `Thank you for holding. I can see your card was blocked last night at eleven fifteen. Our system stopped a payment of four hundred dollars to an online electronics shop overseas, because it didn't match your usual spending. Did you make that payment? You didn't. Okay, then the block has protected you. I'm going to cancel this card completely, and a new one will arrive by post within five working days. You haven't lost any money; the payment never went through. In the meantime, you can still pay with your phone, because I'll add a temporary digital card to your banking app right now.`,
    questions: [
      { question: 'Why was the card blocked?', options: ['The customer forgot the PIN', 'The card had expired', 'A payment didn\'t match the usual spending', 'The account was empty'], correctIndex: 2 },
      { question: 'What will happen to the old card?', options: ['It will be unblocked', 'It will be cancelled and replaced', 'It will work only in shops', 'Nothing'], correctIndex: 1 },
      { question: 'How can the customer pay until the new card arrives?', options: ['With a temporary digital card in the app', 'With a cheque', 'Only with cash', 'By borrowing a friend\'s card'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-36',
    title: 'Ferry Terminal: Weather Cancellation',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '35 sec',
    script: `Attention, all passengers. Due to strong winds and high waves, all ferry services to the islands are cancelled for the rest of today. We expect services to start again tomorrow morning, weather permitting, with the first ferry at seven thirty. Passengers with tickets for today can use them on any ferry tomorrow, or ask for a full refund at the ticket office. If you need a place to stay tonight, staff at the information desk can give you a list of hotels near the harbour. We apologise for the disruption and thank you for your patience.`,
    questions: [
      { question: 'Why are the ferries cancelled?', options: ['A strike', 'Fog', 'Engine problems', 'Strong winds and high waves'], correctIndex: 3 },
      { question: 'What can passengers do with today\'s tickets?', options: ['Nothing; they are no longer valid', 'Use them on a bus', 'Use them tomorrow or get a full refund', 'Exchange them for a hotel room'], correctIndex: 2 },
      { question: 'Where can passengers get a list of hotels?', options: ['At the ticket office', 'At the information desk', 'On the ferry', 'From the captain'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-37',
    title: 'Stadium: Before the Match',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '35 sec',
    script: `Good afternoon and welcome to City Stadium. Kick-off is at three o'clock. Please have your tickets ready on your phone before you reach the gates, to help keep the queues moving. Large bags are not allowed inside the stadium, but you can leave them at the bag drop next to gate C for two dollars. Food and drinks are available on every level, and all stands are now card-only, so we don't accept cash. In an emergency, please follow the instructions of the stewards in orange jackets. Enjoy the match.`,
    questions: [
      { question: 'What should fans have ready before they reach the gates?', options: ['Their tickets on their phone', 'Cash', 'A photo ID', 'Their bag'], correctIndex: 0 },
      { question: 'Where can fans leave large bags?', options: ['In the car park', 'Under their seats', 'At the ticket office', 'At the bag drop next to gate C'], correctIndex: 3 },
      { question: 'How can fans pay for food?', options: ['Cash only', 'With tokens', 'By card only', 'Food is free'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-38',
    title: 'Office: Fire Drill Notice',
    topic: 'Announcements',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Good morning, everyone. This is a reminder that we'll have a fire drill today at eleven o'clock. When you hear the alarm, please stop what you're doing and leave the building by the nearest stairs. Do not use the lifts. Leave your bags and coffee behind, it's only a drill, but we want to practise it properly. The meeting point is the car park opposite the main entrance, where your floor's fire warden will check that everyone is out. The whole thing should take about fifteen minutes. Thank you for your cooperation.`,
    questions: [
      { question: 'What should people not use during the drill?', options: ['The stairs', 'The lifts', 'The main entrance', 'Their phones'], correctIndex: 1 },
      { question: 'Where is the meeting point?', options: ['The car park opposite the main entrance', 'The canteen', 'The roof', 'The reception desk'], correctIndex: 0 },
      { question: 'Who will check that everyone is out?', options: ['The police', 'The building owner', 'The receptionist', 'The floor\'s fire warden'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-39',
    title: 'Metro: Weekend Line Closure',
    topic: 'Announcements',
    level: 'Upper-Intermediate',
    duration: '40 sec',
    script: `Customers are advised that this weekend, from Saturday at six in the morning until Monday at five, there will be no trains on the Green Line between Central and Airport stations, because of track maintenance. Replacement buses will run every ten minutes from outside each closed station. Please allow an extra thirty minutes for your journey, especially if you are travelling to the airport. Your normal metro ticket is valid on the replacement buses. All other lines will run as usual. We are sorry for any inconvenience this may cause.`,
    questions: [
      { question: 'Why are there no trains on part of the Green Line?', options: ['A strike', 'A public holiday', 'Track maintenance', 'Flooding'], correctIndex: 2 },
      { question: 'How often will the replacement buses run?', options: ['Every five minutes', 'Every ten minutes', 'Every thirty minutes', 'Once an hour'], correctIndex: 1 },
      { question: 'What are people travelling to the airport advised to do?', options: ['Allow an extra thirty minutes', 'Buy a new ticket', 'Take a taxi', 'Travel on Friday'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-40',
    title: 'IT Team: New Password Rules',
    topic: 'Work',
    level: 'Upper-Intermediate',
    duration: '45 sec',
    script: `Hi all, a quick message from IT. Starting next Monday, we're switching on two-step login for everyone. After you type your password, you'll get a code on the authenticator app on your phone, and you'll need that code to log in. Please install the app before Monday, there's a guide on the intranet. We're also changing the password rules: instead of changing your password every ninety days, you'll only need to change it if we think it's been leaked. But it will need to be at least fourteen characters long. A short sentence that's easy to remember works well.`,
    questions: [
      { question: 'What is starting next Monday?', options: ['A new email system', 'Working from home', 'New laptops', 'Two-step login for everyone'], correctIndex: 3 },
      { question: 'When will staff need to change their password now?', options: ['Every ninety days', 'Every month', 'Only if it may have been leaked', 'Never'], correctIndex: 2 },
      { question: 'What does IT suggest for a long password?', options: ['Your birthday', 'A short sentence that\'s easy to remember', 'Random numbers', 'Your name and the year'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-41',
    title: 'Giving Feedback to a Colleague',
    topic: 'Work',
    level: 'Advanced',
    duration: '55 sec',
    script: `Thanks for sharing the draft of the presentation, Ben. Overall, it's really strong. The story is clear, and the customer quotes at the start grab your attention straight away. I have two suggestions. First, there's a lot of text on slides five to eight. People will read instead of listening to you, so maybe keep one key number per slide and say the rest out loud. Second, the ending feels a bit sudden. It would help to finish with one clear next step for the client, so they know exactly what we're asking them to decide. If you can tidy that up by Thursday, I think it's ready for the client on Monday.`,
    questions: [
      { question: 'What does the speaker praise first?', options: ['The customer quotes at the start', 'The colour scheme', 'The length of the slides', 'The price list'], correctIndex: 0 },
      { question: 'What is the problem with slides five to eight?', options: ['They are in the wrong order', 'They contain mistakes', 'They have no pictures', 'They have too much text'], correctIndex: 3 },
      { question: 'How should the presentation end?', options: ['With a joke', 'With a summary of every slide', 'With one clear next step for the client', 'With a thank-you slide'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-42',
    title: 'Conference: Welcome Message',
    topic: 'Work',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `Good morning, and welcome to the Green Cities conference. We have over six hundred people here from thirty countries, which is a record for us. A few practical things before we begin. The talks in this main hall will be streamed online, so if you miss one, you can watch it later in the conference app. The workshops on the second floor have limited places, so please book them in the app as soon as possible. Lunch is at twelve thirty in the garden, and there are vegetarian and vegan options at every station. Tonight's dinner is at the riverside hotel, and buses leave from the front entrance at seven.`,
    questions: [
      { question: 'How can people watch a talk they missed?', options: ['On television', 'On the conference app', 'They can\'t watch it again', 'By asking the speaker'], correctIndex: 1 },
      { question: 'Why should people book workshops quickly?', options: ['They have limited places', 'They are expensive', 'They start early', 'They are only on the first day'], correctIndex: 0 },
      { question: 'Where do the buses to dinner leave from?', options: ['The garden', 'The second floor', 'The riverside hotel', 'The front entrance'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-43',
    title: 'Sales Review: The Quarter in Numbers',
    topic: 'Work',
    level: 'Advanced',
    duration: '55 sec',
    script: `So, the quarter in numbers. Total sales were up twelve percent compared with the same quarter last year, which is better than our target of ten. Most of that growth came from online sales, which rose by almost a third, while sales in our physical stores were flat. The one disappointing area was the north region, where sales actually fell by five percent, mainly because a competitor opened two new stores there. For next quarter, we'll move some of the marketing budget from print adverts to online, and the north team will run a loyalty offer to win customers back.`,
    questions: [
      { question: 'How did total sales do compared with the target?', options: ['They missed the target', 'They exactly met the target', 'They beat the target', 'There was no target'], correctIndex: 2 },
      { question: 'Where did most of the growth come from?', options: ['Physical stores', 'Online sales', 'The north region', 'Print adverts'], correctIndex: 1 },
      { question: 'Why did sales fall in the north region?', options: ['A competitor opened two new stores', 'Bad weather', 'Prices went up', 'A store closed'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-44',
    title: 'Hostel: House Rules',
    topic: 'Travel',
    level: 'Intermediate',
    duration: '45 sec',
    script: `Welcome to Backpacker's Nest! You're in a six-bed dorm on the third floor, bed number four. Here's your key card. It opens your room and the locker under your bed, so keep your valuables in there. Quiet hours are from eleven at night until seven in the morning, so please use the common room downstairs if you want to chat. The kitchen is open to everyone, but label your food in the fridge with your name and the date. Breakfast is free, pancakes and fruit, from seven to ten. And every Friday we have a free walking tour, meeting here at the front desk at nine.`,
    questions: [
      { question: 'What does the key card open?', options: ['Only the front door', 'All the rooms', 'The kitchen fridge', 'The room and the locker under the bed'], correctIndex: 3 },
      { question: 'What should guests do with food in the fridge?', options: ['Share it with everyone', 'Eat it the same day', 'Label it with their name and the date', 'Keep it in their locker'], correctIndex: 2 },
      { question: 'When is the free walking tour?', options: ['Every day at nine', 'Every Friday at nine', 'Every Sunday at ten', 'On the first day of the month'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-45',
    title: 'Airport: Lost Luggage Desk',
    topic: 'Travel',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `I'm sorry your suitcase hasn't arrived. Let me check the system. It looks like your bag missed the connection in Doha and it's still there. The good news is that it's booked on the next flight, which lands tomorrow at two in the afternoon. We'll deliver it straight to your hotel, so you don't need to come back to the airport. Here's your reference number; you can use it to track the bag online. In the meantime, you can buy essentials like a toothbrush and a change of clothes, and the airline will pay you back up to a hundred dollars if you keep the receipts.`,
    questions: [
      { question: 'Where is the suitcase now?', options: ['In Doha', 'On the wrong plane to London', 'At the hotel', 'Lost completely'], correctIndex: 0 },
      { question: 'How will the passenger get the bag?', options: ['Collect it at the airport tomorrow', 'Pick it up in Doha', 'It will be posted home', 'It will be delivered to the hotel'], correctIndex: 3 },
      { question: 'What will the airline pay for?', options: ['A new suitcase', 'A hotel night', 'Essentials up to a hundred dollars, with receipts', 'A free flight'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-46',
    title: 'Visa Office: What to Bring',
    topic: 'Travel',
    level: 'Upper-Intermediate',
    duration: '45 sec',
    script: `For a tourist visa, you'll need to bring four things to your appointment. First, your passport, which must be valid for at least six months after your trip ends. Second, two recent passport photos with a white background. Third, a printed copy of your return flight booking. And fourth, a bank statement from the last three months, to show you can pay for your stay. The fee is sixty dollars, and we only accept card payments. Processing usually takes ten working days, so we recommend applying at least a month before you travel.`,
    questions: [
      { question: 'How long must the passport be valid after the trip?', options: ['One month', 'Six months', 'Three months', 'One year'], correctIndex: 1 },
      { question: 'Why is a bank statement needed?', options: ['To show you can pay for your stay', 'To pay the fee', 'To prove your address', 'To check your job'], correctIndex: 0 },
      { question: 'When is it recommended to apply?', options: ['A week before travelling', 'After booking a hotel', 'At the airport', 'At least a month before travelling'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-47',
    title: 'Boat Trip: Hạ Long Bay',
    topic: 'Travel',
    level: 'Intermediate',
    duration: '50 sec',
    script: `Good morning, everyone, and welcome on board. Today we'll cruise through Hạ Long Bay, which has nearly two thousand limestone islands rising out of the green water. Our first stop, at about ten o'clock, is a large cave with amazing rock shapes inside, so wear comfortable shoes, because there are some steps. After lunch on the boat, you can choose between kayaking around the small islands or relaxing on a quiet beach. Life jackets are under your seats, and you must wear one when kayaking. We'll be back at the harbour at around five. Please don't throw anything into the water; we want to keep the bay beautiful.`,
    questions: [
      { question: 'What are the islands of Hạ Long Bay made of?', options: ['Sand', 'Volcanic rock', 'Limestone', 'Coral'], correctIndex: 2 },
      { question: 'Why should visitors wear comfortable shoes?', options: ['The beach is rocky', 'There are steps in the cave', 'They will hike to the top of an island', 'The boat deck is slippery'], correctIndex: 1 },
      { question: 'What must people do when kayaking?', options: ['Wear a life jacket', 'Stay with the guide', 'Pay extra', 'Swim back to the boat'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-48',
    title: 'Science Brief: The Moon and the Tides',
    topic: 'Science',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `Twice a day, the sea comes in and goes out again. These are the tides, and they're caused mainly by the Moon. The Moon's gravity pulls on the Earth's oceans, making the water bulge towards it. There's also a second bulge on the opposite side of the Earth. As the Earth spins, most coasts pass through both bulges, so they get two high tides and two low tides roughly every day. The Sun has an effect too. When the Sun, Moon, and Earth are in a line, at the new moon and full moon, their pulls add together and we get extra-high tides, called spring tides, which have nothing to do with the season.`,
    questions: [
      { question: 'What mainly causes the tides?', options: ['The wind', 'Rivers flowing into the sea', 'Underwater earthquakes', 'The Moon\'s gravity'], correctIndex: 3 },
      { question: 'How many high tides do most coasts get each day?', options: ['One', 'Three', 'Two', 'Four'], correctIndex: 2 },
      { question: 'When do spring tides happen?', options: ['Only in spring', 'When the Sun, Moon and Earth are in a line', 'When it is very windy', 'Once a year'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-49',
    title: 'Science Brief: Why Ice Floats',
    topic: 'Science',
    level: 'Upper-Intermediate',
    duration: '45 sec',
    script: `Most substances get denser when they freeze, so the solid form sinks in the liquid. Water is unusual. When it freezes, its molecules lock into an open, hexagonal pattern that takes up more space, about nine percent more. That makes ice less dense than liquid water, so it floats. This matters a lot for life on Earth. In winter, lakes freeze from the top down, and the layer of ice on the surface acts like a blanket, keeping the water underneath from freezing. That's why fish and plants can survive at the bottom of a frozen lake until spring.`,
    questions: [
      { question: 'What happens to most substances when they freeze?', options: ['They get denser and sink', 'They float', 'They turn into gas', 'They change colour'], correctIndex: 0 },
      { question: 'Why does ice float?', options: ['It contains air bubbles', 'It is lighter in colour', 'It is colder than water', 'It is less dense than liquid water'], correctIndex: 3 },
      { question: 'How does surface ice help life in a lake?', options: ['It gives fish food', 'It makes the water warmer than in summer', 'It keeps the water below from freezing', 'It lets in more sunlight'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-50',
    title: 'Science Brief: How Vaccines Work',
    topic: 'Science',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `Your immune system protects you from germs, but the first time it meets a new one, it can take days to learn how to fight it, and in that time you can get very sick. A vaccine is a way to give your immune system a practice run. It contains a weakened or inactive form of the germ, or just a harmless piece of it, or instructions for your cells to make that piece. Your body reacts by making antibodies and memory cells. Then, if the real germ ever arrives, your immune system recognises it straight away and fights it off quickly, often before you feel ill at all.`,
    questions: [
      { question: 'What is the problem when the immune system meets a new germ?', options: ['It cannot fight it at all', 'It can take days to learn how to fight it', 'It attacks the body', 'It stops working'], correctIndex: 1 },
      { question: 'What does a vaccine contain?', options: ['A weakened, inactive or harmless piece of the germ', 'A strong form of the germ', 'Antibiotics', 'Vitamins'], correctIndex: 0 },
      { question: 'What does the body make in response to a vaccine?', options: ['New germs', 'More red blood cells', 'Extra stomach acid', 'Antibodies and memory cells'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-51',
    title: 'Science Brief: The Ring of Fire',
    topic: 'Science',
    level: 'Advanced',
    duration: '50 sec',
    script: `Around the edge of the Pacific Ocean lies a horseshoe-shaped belt about forty thousand kilometres long, known as the Ring of Fire. It's home to around three quarters of the world's active volcanoes, and most of the world's earthquakes happen there too. The reason is plate tectonics. The Earth's surface is broken into huge plates that slowly move. Around the Pacific, ocean plates are sliding underneath other plates. As they sink, the rock melts and rises up to form volcanoes, and the plates sticking and slipping cause earthquakes. Countries such as Japan, Indonesia, Chile, and the Philippines all lie along the Ring of Fire.`,
    questions: [
      { question: 'Where is the Ring of Fire?', options: ['Around the Atlantic Ocean', 'Across Africa', 'Around the edge of the Pacific Ocean', 'Around the North Pole'], correctIndex: 2 },
      { question: 'About what share of the world\'s active volcanoes are there?', options: ['A tenth', 'Three quarters', 'Half', 'A quarter'], correctIndex: 1 },
      { question: 'What causes the volcanoes there?', options: ['Ocean plates sliding under other plates', 'Very hot weather', 'Meteor strikes', 'Deep ocean currents'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-52',
    title: 'Science Brief: Your Heart',
    topic: 'Science',
    level: 'Intermediate',
    duration: '40 sec',
    script: `Make a fist. That's roughly the size of your heart. This small muscle beats around a hundred thousand times every day, and it never takes a break. Each beat pushes blood through about a hundred thousand kilometres of blood vessels, carrying oxygen and food to every part of your body. In a single day, your heart pumps around seven thousand litres of blood. A healthy resting heart rate for adults is between sixty and a hundred beats a minute. Regular exercise makes the heart stronger, so it can pump more blood with each beat and doesn't need to beat as fast.`,
    questions: [
      { question: 'About how big is your heart?', options: ['The size of your foot', 'The size of your head', 'The size of a coin', 'The size of your fist'], correctIndex: 3 },
      { question: 'About how many times does your heart beat each day?', options: ['Ten thousand', 'Fifty thousand', 'A hundred thousand', 'A million'], correctIndex: 2 },
      { question: 'What does regular exercise do for the heart?', options: ['Makes it beat faster at rest', 'Makes it stronger, so it beats less often', 'Makes it smaller', 'Has no effect'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-53',
    title: 'Health Radio: Move More',
    topic: 'Health',
    level: 'Intermediate',
    duration: '45 sec',
    script: `The World Health Organization recommends that adults do at least a hundred and fifty minutes of moderate activity every week. That sounds like a lot, but it's just thirty minutes, five days a week. And moderate means anything that makes you breathe a little faster but still lets you talk, like a brisk walk, cycling, or dancing. You don't even have to do it all at once; three ten-minute walks a day count too. Try getting off the bus one stop early, taking the stairs instead of the lift, or walking while you're on the phone. Every bit of movement is better than none.`,
    questions: [
      { question: 'How much moderate activity a week is recommended?', options: ['At least 150 minutes', 'At least 60 minutes', 'At least 300 minutes', 'At least 10 hours'], correctIndex: 0 },
      { question: 'What does "moderate" activity mean here?', options: ['Running as fast as you can', 'Standing still', 'Lifting heavy weights', 'Breathing faster but still able to talk'], correctIndex: 3 },
      { question: 'Which tip is mentioned?', options: ['Running a marathon', 'Joining an expensive gym', 'Getting off the bus one stop early', 'Exercising only at weekends'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-54',
    title: 'Pharmacist: Protecting Your Skin',
    topic: 'Health',
    level: 'Intermediate',
    duration: '45 sec',
    script: `If you're going to the beach, use a sunscreen with SPF thirty or higher. SPF thirty blocks about ninety-seven percent of the sun's burning rays. Put it on fifteen minutes before you go outside, and use more than you think, about a shot glass for your whole body. The most important thing is to put it on again every two hours, and always after swimming, even if the bottle says it's waterproof. The sun is strongest between ten in the morning and four in the afternoon, so try to stay in the shade then, and wear a hat and sunglasses.`,
    questions: [
      { question: 'What SPF does the pharmacist recommend?', options: ['SPF 10', 'SPF 30 or higher', 'SPF 15', 'Any SPF'], correctIndex: 1 },
      { question: 'How often should sunscreen be put on again?', options: ['Every two hours, and after swimming', 'Once a day', 'Only after swimming', 'Every six hours'], correctIndex: 0 },
      { question: 'When is the sun strongest?', options: ['From six to nine in the morning', 'At sunset', 'From four to seven in the evening', 'From ten in the morning to four in the afternoon'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-55',
    title: 'Health Podcast: A Healthy Plate',
    topic: 'Health',
    level: 'Intermediate',
    duration: '45 sec',
    script: `Here's an easy way to build a healthy meal without counting calories. Imagine your plate divided into parts. Fill half of it with vegetables and fruit, and the more colours, the better. Fill a quarter with whole grains, like brown rice, whole-wheat bread, or oats. And fill the last quarter with protein: fish, chicken, beans, tofu, or eggs. Drink water instead of sugary drinks, and use healthy oils, like olive oil, in small amounts. You don't have to be perfect. If most of your meals look roughly like this, you're doing well.`,
    questions: [
      { question: 'How much of the plate should be vegetables and fruit?', options: ['A quarter', 'A third', 'Half', 'All of it'], correctIndex: 2 },
      { question: 'Which of these is given as a whole grain?', options: ['White bread', 'Brown rice', 'Sugar', 'Potatoes'], correctIndex: 1 },
      { question: 'What should you drink instead of sugary drinks?', options: ['Water', 'Juice', 'Milkshakes', 'Coffee with sugar'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-56',
    title: 'Wellbeing: A One-Minute Breathing Exercise',
    topic: 'Health',
    level: 'Upper-Intermediate',
    duration: '45 sec',
    script: `When you feel stressed, your breathing often becomes fast and shallow, which can make you feel even more anxious. Here's a simple exercise to calm down, called box breathing. Breathe in slowly through your nose while you count to four. Hold your breath for a count of four. Breathe out slowly through your mouth for four. Then hold again for four. That's one box. Repeat it four or five times. Slow breathing tells your nervous system that you're safe, so your heart rate drops and your muscles relax. You can do it anywhere, before an exam, a job interview, or a difficult conversation.`,
    questions: [
      { question: 'What happens to breathing when you are stressed?', options: ['It becomes slow and deep', 'It doesn\'t change', 'It stops', 'It becomes fast and shallow'], correctIndex: 3 },
      { question: 'How long is each step of box breathing?', options: ['A count of two', 'A count of eight', 'A count of four', 'Ten seconds'], correctIndex: 2 },
      { question: 'What does slow breathing do?', options: ['Raises your heart rate', 'Lowers your heart rate and relaxes your muscles', 'Makes you sleepy immediately', 'Makes you hungry'], correctIndex: 1 },
    ],
  },
  {
    id: 'comp-57',
    title: 'Radio: Vietnamese Coffee',
    topic: 'Culture',
    level: 'Intermediate',
    duration: '50 sec',
    script: `Vietnam is the second-largest coffee producer in the world, after Brazil, and most of its coffee is robusta, which is strong and a little bitter. The classic way to make it is with a phin, a small metal filter that sits on top of the cup. Hot water drips slowly through the coffee, and it takes about five minutes. Then there's cà phê sữa đá: strong coffee mixed with sweet condensed milk and poured over ice, perfect for a hot day. And in Hanoi, you can try egg coffee, coffee topped with a thick, creamy foam of egg yolk and sugar. It was first made in the nineteen forties, when fresh milk was hard to find.`,
    questions: [
      { question: 'Which country produces more coffee than Vietnam?', options: ['Brazil', 'Colombia', 'Ethiopia', 'Indonesia'], correctIndex: 0 },
      { question: 'What is a phin?', options: ['A type of coffee bean', 'A sweet cake', 'A coffee shop', 'A small metal filter'], correctIndex: 3 },
      { question: 'Why was egg coffee first made?', options: ['A king asked for it', 'Eggs were cheap', 'Fresh milk was hard to find', 'To make coffee less strong'], correctIndex: 2 },
    ],
  },
  {
    id: 'comp-58',
    title: 'Guide: Hội An\'s Lantern Nights',
    topic: 'Culture',
    level: 'Upper-Intermediate',
    duration: '50 sec',
    script: `Hội An, on the central coast of Vietnam, was a busy trading port from the fifteenth to the nineteenth century, visited by merchants from Japan, China, and Europe. Its old town is so well preserved that it became a UNESCO World Heritage Site in nineteen ninety-nine. Look out for the Japanese Covered Bridge, built in the late fifteen hundreds. The best time to visit is on the fourteenth day of the lunar month, at the full moon. That evening, shops in the old town switch off their electric lights, and the streets glow with silk lanterns. People also float small paper lanterns with candles on the river and make a wish.`,
    questions: [
      { question: 'What was Hội An from the 15th to the 19th century?', options: ['The capital of Vietnam', 'A busy trading port', 'A fishing village only', 'A royal palace'], correctIndex: 1 },
      { question: 'When did Hội An become a UNESCO World Heritage Site?', options: ['1999', '1993', '1975', '2005'], correctIndex: 0 },
      { question: 'What happens on the full moon evening?', options: ['Fireworks over the river', 'There is a boat race', 'The old town is closed', 'Shops switch off electric lights and lanterns light the streets'], correctIndex: 3 },
    ],
  },
  {
    id: 'comp-59',
    title: 'Craft Workshop: Huế\'s Poem Hats',
    topic: 'Culture',
    level: 'Intermediate',
    duration: '45 sec',
    script: `The conical hat, or nón lá, is one of the symbols of Vietnam. It protects you from both sun and rain. But Huế has its own special version, called nón bài thơ, the poem hat. It's made from thin, light palm leaves, and between the layers, the maker places cut-out paper pictures and lines of poetry. You can't see them normally, but when you hold the hat up to the sunlight, the pictures and poems appear, often a scene of the Perfume River or a few lines of a love poem. Making one hat by hand can take a skilled maker a whole day.`,
    questions: [
      { question: 'What does a conical hat protect you from?', options: ['Only the rain', 'Only the sun', 'Both sun and rain', 'The wind'], correctIndex: 2 },
      { question: 'How can you see the poems in a nón bài thơ?', options: ['They are painted on the outside', 'By holding it up to the sunlight', 'By wetting the hat', 'By turning it upside down'], correctIndex: 1 },
      { question: 'How long can it take to make one hat by hand?', options: ['A whole day', 'An hour', 'Ten minutes', 'A month'], correctIndex: 0 },
    ],
  },
  {
    id: 'comp-60',
    title: 'Radio: The Mid-Autumn Festival',
    topic: 'Culture',
    level: 'Intermediate',
    duration: '45 sec',
    script: `The Mid-Autumn Festival, Tết Trung Thu, falls on the fifteenth day of the eighth lunar month, when the moon is at its fullest and brightest. In Vietnam, it's above all a festival for children. In the weeks before, streets fill with colourful lanterns, especially the five-pointed star lantern, called đèn ông sao. On the night of the festival, children carry their lanterns through the streets, and lion dancers perform to the beat of loud drums. Families share mooncakes, round cakes filled with things like lotus seeds, mung beans, or salted egg yolk, and drink tea while they look at the moon.`,
    questions: [
      { question: 'When is the Mid-Autumn Festival?', options: ['On the first day of the lunar year', 'In early spring', 'On the last day of December', 'On the fifteenth day of the eighth lunar month'], correctIndex: 3 },
      { question: 'Who is the festival mainly for in Vietnam?', options: ['Farmers', 'Old people', 'Children', 'Students'], correctIndex: 2 },
      { question: 'What is đèn ông sao?', options: ['A kind of mooncake', 'A five-pointed star lantern', 'A lion dance', 'A song'], correctIndex: 1 },
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
      { question: 'Which membership does the receptionist recommend?', options: ['Standard', 'Off-peak', 'Premium', 'Student'], correctIndex: 0 },
      { question: 'How much is the Standard membership per month?', options: ['£25', '£52', '£38', '£15'], correctIndex: 2 },
      { question: "How is the caller's surname spelled?", options: ['Whitfield', 'Whiteford', 'Witford', 'Whitford'], correctIndex: 3 },
      { question: 'What must the caller bring to the induction?', options: ['A passport', 'A passport-sized photo', 'A bank card', 'A swimming cap'], correctIndex: 1 },
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
      { question: 'What time did the passenger\'s train leave?', options: ['4:00', '8:50', '8:05', '8:15'], correctIndex: 3 },
      { question: 'What colour is the bag?', options: ['Navy blue', 'Red', 'Black', 'Light blue'], correctIndex: 0 },
      { question: 'What is the reference number?', options: ['L4427', 'L4472', 'L7442', 'L4742'], correctIndex: 1 },
      { question: 'How long will found items be kept?', options: ['One month', 'Six months', 'Three months', 'One year'], correctIndex: 2 },
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
      { question: 'Which course does the customer book?', options: ['Vegetarian Basics', 'Italian', 'Thai', 'Baking'], correctIndex: 0 },
      { question: 'How much will the customer pay?', options: ['£65', '£130', '£75', '£150'], correctIndex: 2 },
      { question: 'What should the customer bring?', options: ['Ingredients', 'A knife set', 'Lunch', 'An apron and a container'], correctIndex: 3 },
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
      { question: 'What is the house number of the flat?', options: ['4', '42', '40', '14'], correctIndex: 3 },
      { question: 'Which bill is included in the rent?', options: ['Water', 'Internet', 'Electricity', 'Council tax'], correctIndex: 0 },
      { question: 'What furniture is missing?', options: ['Beds', 'Desks', 'Wardrobes', 'A sofa'], correctIndex: 1 },
      { question: 'When will the student view the flat?', options: ['Wednesday at 12:00', 'Friday at 12:00', 'Wednesday at 5:30', 'Friday at 5:30'], correctIndex: 2 },
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
      { question: 'What condition does the patient have?', options: ['Diabetes', 'An allergy', 'High blood pressure', 'Asthma'], correctIndex: 3 },
      { question: 'What will the patient bring as proof of address?', options: ['A utility bill', 'A tenancy agreement', 'A passport', 'A bank statement'], correctIndex: 1 },
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
      { question: 'Which room will the customer hire?', options: ['The main hall', 'The meeting room', 'The kitchen', 'The Garden Room'], correctIndex: 3 },
      { question: 'How many guests are expected?', options: ['About 45', 'About 60', 'About 70', 'About 18'], correctIndex: 0 },
      { question: 'What is the total cost of the room?', options: ['£120', '£150', '£180', '£50'], correctIndex: 1 },
      { question: 'When must music stop?', options: ['10:00', '11:00', '10:30', '11:30'], correctIndex: 2 },
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
      { question: 'What is the overdraft limit in the first year?', options: ['£500', '£250', '£50', '£1,000'], correctIndex: 0 },
      { question: 'Which document does the student NOT have yet?', options: ['Passport', 'Visa', 'University letter', 'Council tax letter'], correctIndex: 2 },
      { question: 'How long does the card take to arrive?', options: ['1–2 days', '2 days', 'Two weeks', '5–7 working days'], correctIndex: 3 },
      { question: 'When is the appointment?', options: ['Tuesday at 2:15', 'Thursday at 2:15', 'Thursday at 2:50', 'Friday at 2:15'], correctIndex: 1 },
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
      { question: 'How much does the chosen tour cost?', options: ['$42', '$58', '$86', '$68'], correctIndex: 3 },
      { question: 'Which day will the tourist go?', options: ['Wednesday', 'Tomorrow', 'Tuesday', 'Today'], correctIndex: 0 },
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
      { question: 'How many bedrooms share a kitchen?', options: ['Eight', 'Six', 'Ten', 'Twelve'], correctIndex: 0 },
      { question: 'How should non-urgent maintenance problems be reported?', options: ['By phone', 'At reception', 'Through the online form', 'By email to Claire'], correctIndex: 2 },
      { question: 'When is the weekly fire alarm test?', options: ['Monday at 11 AM', 'Wednesday at 11 PM', 'Thursday at 11 AM', 'Wednesday at 11 AM'], correctIndex: 3 },
      { question: 'How many nights a month may a guest stay?', options: ['One', 'Three', 'Two', 'Seven'], correctIndex: 1 },
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
      { question: 'What temperature is the Glasshouse kept at?', options: ['16°C', '20°C', '30°C', '26°C'], correctIndex: 3 },
      { question: 'When was the Rose Garden first planted?', options: ['1892', '1829', '1902', '1992'], correctIndex: 0 },
      { question: 'Where is the café?', options: ['Next to the Lake', 'Between the Discovery Zone and the Herb Garden', 'Inside the Glasshouse', 'At the main gate'], correctIndex: 1 },
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
      { question: 'How many visitors are expected this year?', options: ['15,000', '12,000', '11,000', '50,000'], correctIndex: 0 },
      { question: 'What colour lanyard is for car park stewards?', options: ['Green', 'Yellow', 'Blue', 'Red'], correctIndex: 2 },
      { question: 'Where is the volunteer tent?', options: ['By the north entrance', 'Next to the harbour wall', 'In the car park', 'Behind the main stage'], correctIndex: 3 },
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
      { question: 'What is the highlight of the Stone Age gallery?', options: ['A mosaic floor', 'Stone tools', 'A working loom', 'A wooden canoe'], correctIndex: 3 },
      { question: 'Where did the mosaic floor come from?', options: ['A farm outside town', 'The river', 'A church', 'A Roman villa abroad'], correctIndex: 0 },
      { question: 'What is shown in the temporary exhibition?', options: ['Wool mill machinery', 'Photographs from the 1950s', 'Medieval coins', 'Paintings of the river'], correctIndex: 1 },
      { question: 'Where is flash photography forbidden?', options: ['Everywhere', 'The Industrial gallery', 'The Stone Age gallery', 'The temporary exhibition'], correctIndex: 2 },
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
      { question: 'How many bikes will the scheme start with?', options: ['400', '100', '50', '500'], correctIndex: 0 },
      { question: 'How much is annual membership for students?', options: ['£20', '£60', '£35', '£15'], correctIndex: 2 },
      { question: 'What happens if a bike is not returned to a docking station?', options: ['The account is closed', 'Nothing', 'A £5 charge', 'A £20 fine'], correctIndex: 3 },
      { question: 'When will the scheme be reviewed?', options: ['After one month', 'After six months', 'After three months', 'After one year'], correctIndex: 1 },
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
      { question: 'Where is the careers fair held?', options: ['The Student Union', 'The Careers Centre', 'Lecture Theatre Two', 'The Sports Hall'], correctIndex: 3 },
      { question: 'Which zone is for finance and law?', options: ['Zone B', 'Zone A', 'Zone C', 'Zone D'], correctIndex: 0 },
      { question: 'What does the adviser say about clothing?', options: ['A suit is required', 'Smart casual is fine', 'Wear university colours', 'Anything is acceptable'], correctIndex: 1 },
      { question: 'What is the prize for completing the feedback form?', options: ['A free CV check', 'A job interview', 'A £50 book voucher', 'A £10 coffee voucher'], correctIndex: 2 },
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
      { question: 'How many cows does the farm have?', options: ['About 240', 'About 200', 'About 140', 'About 420'], correctIndex: 0 },
      { question: 'When does the viewing gallery open for afternoon milking?', options: ['4:15', '4:00', '3:45', '5:00'], correctIndex: 2 },
      { question: 'Where do tractor rides leave from?', options: ['The farm shop', 'The duck pond', 'The entrance', 'The red barn'], correctIndex: 3 },
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
      { question: 'How long will the central library be closed?', options: ['About four weeks', 'About six weeks', 'About three months', 'About eight weeks'], correctIndex: 3 },
      { question: 'Where will the temporary library be?', options: ['The old post office', 'A school', 'The town hall', 'A branch library'], correctIndex: 0 },
      { question: 'What is changing about late fees?', options: ['All fees are abolished', "Children's late fees are abolished", 'Adult fees are rising', 'Fees are halved'], correctIndex: 1 },
      { question: 'How often will the mobile library visit villages?', options: ['Daily', 'Fortnightly', 'Weekly', 'Monthly'], correctIndex: 2 },
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
      { question: 'How do the students decide to open the presentation?', options: ['With a photograph', 'With statistics', 'With a question', 'With a video'], correctIndex: 0 },
      { question: 'What did the tutor advise?', options: ['Use more statistics', 'Compare more countries', 'Focus on solutions', 'Keep it under ten minutes'], correctIndex: 2 },
      { question: 'What concern does Maya have about biodegradable plastics?', options: ['They are too expensive', 'There is no research on them', 'They are toxic', 'They only break down in industrial composting'], correctIndex: 3 },
      { question: 'How will the presentation end?', options: ['With a photo', 'With a question for the audience', 'With a summary of statistics', 'With a video clip'], correctIndex: 1 },
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
      { question: 'How long after learning do participants recall the words?', options: ['Ten minutes', 'One day', 'Thirty minutes', 'Twenty minutes'], correctIndex: 3 },
      { question: 'What is the supervisor\'s main concern about the music?', options: ['The lyrics may interfere with word recall', 'It is too loud', 'It is too modern', 'Participants may know the songs'], correctIndex: 0 },
      { question: 'What change does the supervisor suggest?', options: ['Remove the music group', 'Add an instrumental music group', 'Use only silence', 'Use a different memory task'], correctIndex: 1 },
      { question: 'How many participants per group should Hannah aim for?', options: ['20', '30', '25', '60'], correctIndex: 2 },
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
      { question: 'What is the problem with the textile industry topic?', options: ['Too much already written about it', 'Too few sources', 'It is too recent', 'The tutor dislikes it'], correctIndex: 0 },
      { question: 'Why is the parks topic attractive?', options: ['It is short', 'There are many textbooks on it', 'Unused primary sources exist', 'Aisha lives near a park'], correctIndex: 2 },
      { question: 'How long should the literature review be?', options: ['1,000 words', '10,000 words', '5,000 words', '2,000 words'], correctIndex: 3 },
      { question: 'What must Aisha do before handling archive documents?', options: ['Get a letter from her tutor', 'Attend an introduction session', 'Pay a fee', 'Submit her proposal'], correctIndex: 1 },
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
      { question: 'Which part of the field trip went well?', options: ['Sediment sampling', 'Water testing', 'Interviewing residents', 'Beach profiling'], correctIndex: 3 },
      { question: 'Why were fewer sediment samples collected?', options: ['The tide came in early because they started late', 'Equipment was lost', 'It rained', 'They ran out of bags'], correctIndex: 0 },
      { question: 'What does the lecturer advise about the missing data?', options: ['Go back and collect it', 'Acknowledge the limitation in the report', 'Leave it out', 'Use data from another group'], correctIndex: 1 },
      { question: 'By when should the outline be sent?', options: ['The 1st', 'The 12th', 'The 10th', 'The 21st'], correctIndex: 2 },
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
      { question: 'In how many countries did the chain fail?', options: ['Three', 'Two', 'Five', 'All of them'], correctIndex: 0 },
      { question: 'Why does Tom reject price as the main reason?', options: ['Prices were lower than at home', 'Customers never mentioned price', 'Competitors charged similar prices', 'The case gives no price data'], correctIndex: 2 },
      { question: 'What problem was there with location in one country?', options: ['Rents were too high', 'There was no parking', 'Malls were closed on Sundays', 'People buy coffee from street vendors'], correctIndex: 3 },
      { question: 'Which framework does the professor prefer?', options: ['PESTLE', 'The four Ps', 'SWOT', "Porter's Five Forces"], correctIndex: 1 },
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
      { question: 'What was wrong with the method section?', options: ['It was too short', 'It was in the wrong place', 'It had no units', 'It was written as instructions'], correctIndex: 3 },
      { question: 'What should the discussion section do?', options: ['Explain the results', 'Repeat the results', 'List equipment', 'Summarise the method'], correctIndex: 0 },
      { question: 'Where should raw data tables go?', options: ['In the results', 'In the appendix', 'In the discussion', 'In the abstract'], correctIndex: 1 },
      { question: 'What is the maximum length of the abstract?', options: ['100 words', '200 words', '150 words', '250 words'], correctIndex: 2 },
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
      { question: "According to Ethan's survey, what was the biggest advantage?", options: ['Flexibility', 'Re-watching lectures', 'Lower cost', 'Language support'], correctIndex: 0 },
      { question: "Why might Nadia's results differ?", options: ['Her sample was too small', 'She asked different questions', 'Her interviewees were mostly international students', 'She interviewed staff'], correctIndex: 2 },
      { question: 'What was the most common disadvantage in both studies?', options: ['Technical problems', 'Poor teaching', 'Cost', 'Isolation'], correctIndex: 3 },
      { question: 'How will they present the two data sets?', options: ['Combined into one', 'Separately, compared in the discussion', 'Only the survey', 'Only the interviews'], correctIndex: 1 },
    ],
    tips: [
      'Keep track of whose research says what — questions name a speaker.',
      '"A close second" means it is NOT the top answer.',
    ],
  },
  {
    id: 'ielts-l-28',
    title: 'Section 4 — Lecture on the History of Tea',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'A lecture tracing how tea spread from China to the rest of the world.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "Today's lecture looks at how tea became one of the world's most popular drinks. Tea originated in south-west China, where it was first used as a medicine rather than a daily drink. By the Tang dynasty, around the eighth century, it had become part of everyday life, and a writer named Lu Yu produced the first book devoted entirely to tea, describing how to grow, prepare and serve it. Tea reached Japan in the ninth century, brought by Buddhist monks who used it to stay awake during long meditation — which explains the close link between tea and Zen practice. Europe encountered tea much later. The Dutch were the first to import it commercially, in the early sixteen-hundreds, and it was initially so expensive that it was kept in locked boxes. In Britain, tea became fashionable partly thanks to Catherine of Braganza, a Portuguese princess who married King Charles the Second and brought her tea-drinking habit to the court. Taxes on tea were extremely high in the eighteenth century, which led to widespread smuggling; when the tax was cut dramatically in seventeen eighty-four, smuggling almost disappeared overnight. Finally, to break China's monopoly, the British began growing tea in India, particularly in Assam, where a native variety of the plant was discovered in the eighteen-twenties." },
    ],
    questions: [
      { question: 'How was tea first used in China?', options: ['As a daily drink', 'As currency', 'In religious ceremonies', 'As a medicine'], correctIndex: 3 },
      { question: 'Why did Buddhist monks in Japan drink tea?', options: ['To stay awake while meditating', 'For its taste', 'As a gift to guests', 'To cure illness'], correctIndex: 0 },
      { question: 'Who first imported tea commercially into Europe?', options: ['The Portuguese', 'The Dutch', 'The British', 'The Spanish'], correctIndex: 1 },
      { question: 'What happened after the tea tax was cut in 1784?', options: ['Prices rose', 'Tea became illegal', 'Smuggling almost disappeared', 'India began growing tea'], correctIndex: 2 },
    ],
    tips: [
      'History lectures move in time order — use dates as anchors to find your place.',
      'Watch for the person credited versus the country mentioned near them (Catherine was Portuguese; the Dutch imported first).',
    ],
  },
  {
    id: 'ielts-l-29',
    title: 'Section 4 — Lecture on Sleep and Memory',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'A psychology lecture on the role of sleep in forming long-term memories.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "This afternoon we're examining the relationship between sleep and memory. For a long time, sleep was thought of simply as rest — a period when the brain switched off. We now know that's far from true. Sleep occurs in cycles of roughly ninety minutes, and each cycle contains two main types: slow-wave sleep, which is deep sleep, and REM, or rapid eye movement, sleep, when most vivid dreaming happens. Research suggests these two stages support different kinds of memory. Slow-wave sleep appears especially important for factual memory — names, dates, vocabulary — because during this stage the brain replays the day's experiences and transfers them from the hippocampus to the cortex for long-term storage. REM sleep, on the other hand, seems to strengthen procedural memory, meaning skills like playing an instrument or riding a bike. One well-known study found that students who slept after learning a list of word pairs remembered about twenty percent more than those who stayed awake for the same period. The practical implication for students is clear: staying up all night before an exam is counterproductive. Even a short nap of around twenty minutes can improve recall, although longer naps risk waking you from deep sleep, leaving you feeling groggy — a state known as sleep inertia." },
    ],
    questions: [
      { question: 'How long is a typical sleep cycle?', options: ['About 90 minutes', 'About 60 minutes', 'About 20 minutes', 'About 120 minutes'], correctIndex: 0 },
      { question: 'Which type of memory does slow-wave sleep mainly support?', options: ['Procedural memory', 'Emotional memory', 'Factual memory', 'Short-term memory'], correctIndex: 2 },
      { question: 'How much more did students who slept remember?', options: ['About 10%', 'Twice as much', 'About 50%', 'About 20%'], correctIndex: 3 },
      { question: 'What is "sleep inertia"?', options: ['Being unable to fall asleep', 'Feeling groggy after waking from deep sleep', 'Dreaming during REM', 'Sleeping too long at night'], correctIndex: 1 },
    ],
    tips: [
      '"On the other hand" introduces a contrast — pair each sleep stage with its memory type.',
      'Definitions of technical terms ("a state known as…") usually come right before or after the term.',
    ],
  },
  {
    id: 'ielts-l-30',
    title: 'Section 4 — Lecture on Bees and Pollination',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'A biology lecture on why bee populations are declining and why it matters.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "Today we turn to pollinators, and bees in particular. Around three-quarters of the world's leading food crops depend to some extent on animal pollination, and bees are by far the most important pollinators. Most people think of the honeybee, but there are over twenty thousand bee species, and many wild species, such as bumblebees, are actually more efficient pollinators of certain crops — tomatoes, for instance, which need to be vibrated to release their pollen, something honeybees can't do. Unfortunately, bee populations have declined sharply in many regions. Scientists point to several causes acting together. The first is habitat loss: modern farming often means huge fields of a single crop, which provide food for only a few weeks a year. The second is pesticides, particularly a group called neonicotinoids, which can impair bees' ability to navigate back to the hive; the European Union restricted their outdoor use in twenty eighteen. The third is disease, including a parasitic mite called Varroa that has spread worldwide. What can be done? Farmers are being encouraged to plant wildflower strips along field edges, and even urban gardeners can help by growing flowers that bloom at different times of the year, so that bees have food from early spring to late autumn." },
    ],
    questions: [
      { question: 'What proportion of leading food crops depend partly on animal pollination?', options: ['About a quarter', 'About half', 'Nearly all', 'About three-quarters'], correctIndex: 3 },
      { question: 'Why are bumblebees better pollinators of tomatoes?', options: ['They can vibrate flowers to release pollen', 'They fly further', 'They live longer', 'They are larger'], correctIndex: 0 },
      { question: 'What effect can neonicotinoids have on bees?', options: ['They shorten their wings', 'They impair navigation back to the hive', 'They spread Varroa', 'They reduce honey production'], correctIndex: 1 },
      { question: 'What does the lecturer suggest urban gardeners do?', options: ['Keep beehives', 'Avoid all flowers', 'Grow flowers that bloom at different times', 'Use natural pesticides'], correctIndex: 2 },
    ],
    tips: [
      'Lectures that list "several causes acting together" usually test one question per cause.',
      'Proportions may be spoken as fractions ("three-quarters") — match them to percentages if needed.',
    ],
  },
  {
    id: 'ielts-l-31',
    title: 'Section 4 — Lecture on the Design of Cities for Walking',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'An urban studies lecture on what makes a city walkable.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "In today's session I want to explore walkability — what makes people choose to walk in a city rather than drive. Researchers generally agree on a few key factors. The first is density and mix of uses. When homes, shops, schools and workplaces are close together, walking becomes practical. A useful rule of thumb is that most people will happily walk around four hundred metres, or about five minutes, to reach daily services. The second factor is street connectivity. A grid of short blocks offers many possible routes, whereas cul-de-sacs, common in suburbs built since the nineteen-fifties, force long detours even when the destination is physically close. The third factor is the quality of the walking environment itself: wide pavements, street trees, and buildings with windows and doors facing the street, which make walkers feel safer because they sense people are watching — what the writer Jane Jacobs called 'eyes on the street'. Interestingly, studies have found that perceived safety matters more to walkers than actual crime statistics. Cities like Copenhagen have shown that change is possible: by gradually converting car parking into pedestrian space over several decades, the city centre now has far more foot traffic, and local businesses have benefited rather than suffered." },
    ],
    questions: [
      { question: 'How far will most people happily walk to daily services?', options: ['About 400 metres', 'About 200 metres', 'About 800 metres', 'About 1 kilometre'], correctIndex: 0 },
      { question: 'Why do cul-de-sacs reduce walking?', options: ['They are unsafe', 'They have no pavements', 'They force long detours', 'They are too noisy'], correctIndex: 2 },
      { question: "What did Jane Jacobs' phrase 'eyes on the street' refer to?", options: ['CCTV cameras', 'Police patrols', 'Street lighting', 'Buildings with windows and doors facing the street'], correctIndex: 3 },
      { question: 'What happened to businesses in central Copenhagen?', options: ['Many closed', 'They benefited', 'They moved to the suburbs', 'They were unaffected'], correctIndex: 1 },
    ],
    tips: [
      '"Interestingly" and "surprisingly" flag a finding that goes against expectations — often tested.',
      'Quoted phrases from named writers are frequent targets; note what they describe.',
    ],
  },
  {
    id: 'ielts-l-32',
    title: 'Section 4 — Lecture on Deep-Sea Exploration',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'A marine science lecture on how we explore the deep ocean.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "It's often said that we know more about the surface of the Moon than about our own ocean floor, and there's some truth in that. Although modern satellites have mapped the ocean floor at low resolution, only around a quarter of it has been mapped in high detail. The deep sea — generally defined as water below two hundred metres, where sunlight no longer penetrates — makes up the largest living space on Earth. Exploring it is difficult mainly because of pressure: at the bottom of the Mariana Trench, nearly eleven kilometres down, the pressure is more than a thousand times that at the surface. Early exploration relied on crewed submersibles; the famous Trieste reached the trench's deepest point in nineteen sixty, but the two men aboard could see very little because sediment clouded the water. Today, most research is carried out by remotely operated vehicles, controlled from a ship by a cable, and autonomous underwater vehicles, which follow pre-programmed routes without any cable. These have revealed remarkable ecosystems, such as communities around hydrothermal vents that depend not on sunlight but on chemicals released from the sea floor — a process called chemosynthesis. Ironically, just as we're discovering these habitats, interest in mining the deep sea for metals used in batteries is growing, raising serious environmental concerns." },
    ],
    questions: [
      { question: 'How much of the ocean floor has been mapped in high detail?', options: ['About 5%', 'Nearly all', 'About half', 'About a quarter'], correctIndex: 3 },
      { question: 'How is the deep sea defined in the lecture?', options: ['Below 200 m', 'Below 100 m', 'Below 1,000 m', 'Below 11 km'], correctIndex: 0 },
      { question: 'Why could the Trieste crew see very little?', options: ['There were no lights', 'Sediment clouded the water', 'The windows were too small', 'They were too deep for cameras'], correctIndex: 1 },
      { question: 'What do hydrothermal vent communities depend on?', options: ['Sunlight', 'Falling plankton', 'Chemicals from the sea floor', 'Warm currents'], correctIndex: 2 },
    ],
    tips: [
      'Definitions with numbers ("below two hundred metres") are easy marks — note them immediately.',
      'Contrasting technologies (ROVs vs AUVs) are often tested by their distinguishing feature.',
    ],
  },
  {
    id: 'ielts-l-33',
    title: 'Section 4 — Lecture on the Psychology of Habits',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'A lecture explaining how habits form and how they can be changed.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "Today we're looking at habits — behaviours we perform automatically, with little conscious thought. Researchers estimate that around forty percent of our daily actions are habitual. A widely used model describes habits as a loop of three parts: a cue, a routine, and a reward. The cue triggers the behaviour — for example, arriving home from work. The routine is the behaviour itself, such as switching on the television, and the reward is the benefit the brain receives, perhaps relaxation. Over time, the brain begins to anticipate the reward as soon as it notices the cue, which is why habits feel so hard to resist. How long does it take to form a new habit? You may have heard the figure of twenty-one days, but that figure has little scientific basis. A study at University College London found that the average was actually sixty-six days, with a huge range depending on the person and the behaviour. Simpler habits, like drinking a glass of water at breakfast, formed far more quickly than complex ones such as daily exercise. As for breaking bad habits, simply relying on willpower tends to fail. A more effective approach is to keep the cue and the reward but replace the routine — or to change the environment so the cue never appears, for instance by keeping your phone in another room while you study." },
    ],
    questions: [
      { question: 'What proportion of daily actions are estimated to be habitual?', options: ['About 40%', 'About 21%', 'About 14%', 'About 66%'], correctIndex: 0 },
      { question: 'In the example, what is the cue?', options: ['Switching on the TV', 'Feeling relaxed', 'Arriving home from work', 'Eating dinner'], correctIndex: 2 },
      { question: 'What was the average time to form a habit in the UCL study?', options: ['21 days', '40 days', '90 days', '66 days'], correctIndex: 3 },
      { question: 'Which approach to breaking habits does the lecturer say tends to fail?', options: ['Replacing the routine', 'Relying on willpower', 'Changing the environment', 'Removing the cue'], correctIndex: 1 },
    ],
    tips: [
      'A popular figure that the lecturer then corrects ("little scientific basis") is a classic distractor.',
      'Three-part models invite matching questions — note an example for each part.',
    ],
  },
  {
    id: 'ielts-l-34',
    title: 'Section 4 — Lecture on Renewable Energy Storage',
    section: 'Section 4',
    topic: 'Lecture',
    description: 'An engineering lecture on ways to store electricity from wind and solar power.',
    duration: '4 min',
    transcript: [
      { speaker: 'Lecturer', text: "Wind and solar power have grown enormously, but they share one major limitation: they're intermittent. The sun doesn't shine at night, and the wind doesn't blow on demand. So today I'll outline the main ways of storing energy so it can be used later. The oldest and still the largest form of storage worldwide is pumped hydro. When electricity is cheap and plentiful, water is pumped uphill into a reservoir; when demand rises, it's released downhill through turbines. It's very efficient — around eighty percent of the energy is recovered — but it needs specific geography: two reservoirs at different heights, close together. The second option is lithium-ion batteries, the same technology as in phones and electric cars. Their cost has fallen by roughly ninety percent over the past decade, and they respond within milliseconds, which makes them ideal for stabilising the grid. However, they typically store energy for only a few hours, so they can't cover a windless week. That's where newer ideas come in. One is green hydrogen — using surplus electricity to split water, storing the hydrogen, and burning it or using it in fuel cells later. It can store energy for months, but at present over half the energy is lost in the conversion process. Most experts believe the future grid will combine all of these, each doing what it does best." },
    ],
    questions: [
      { question: 'What is the largest form of energy storage worldwide?', options: ['Lithium-ion batteries', 'Compressed air', 'Green hydrogen', 'Pumped hydro'], correctIndex: 3 },
      { question: 'What is the main limitation of pumped hydro?', options: ['It needs specific geography', 'Low efficiency', 'It is very slow', 'It is very new'], correctIndex: 0 },
      { question: 'Why are lithium-ion batteries good for stabilising the grid?', options: ['They store energy for months', 'They respond within milliseconds', 'They are made of water', 'They need no maintenance'], correctIndex: 1 },
      { question: 'What is the main drawback of green hydrogen?', options: ['It only stores energy for hours', 'It needs mountains', 'Over half the energy is lost in conversion', 'It cannot be stored'], correctIndex: 2 },
    ],
    tips: [
      'Each technology has a strength and a weakness — expect a question on each side.',
      '"However" in a lecture almost always introduces a limitation worth noting.',
    ],
  },
];
