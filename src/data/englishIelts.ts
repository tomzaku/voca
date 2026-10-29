export interface IeltsConversation {
  id: string;
  title: string;
  part: 'Part 1' | 'Part 2' | 'Part 3';
  topic: string;
  description: string;
  duration: string;
  exchanges: {
    role: 'examiner' | 'candidate';
    text: string;
  }[];
  tips?: string[];
  keyPhrases?: string[];
}

export const ieltsTopics = [
  'Home & Living',
  'Work & Study',
  'Technology',
  'Travel & Places',
  'Health & Lifestyle',
  'Media & Entertainment',
  'Environment',
  'Society & Culture',
  'Food & Culture',
  'Sports & Leisure',
  'Arts & Culture',
] as const;

export const ieltsConversations: IeltsConversation[] = [
  // ── Part 1: Short Questions ──────────────────────────────
  {
    id: 'ielts-1',
    title: 'Part 1 — Daily Routine & Work',
    part: 'Part 1',
    topic: 'Work & Study',
    description: 'Typical Part 1 questions about daily life, work habits, and preferences. The examiner asks short, personal questions.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: "Let's talk about your work. What do you do?" },
      { role: 'candidate', text: "I work in marketing. I'm part of the marketing team at a mid-sized company in my city. My main responsibility is planning campaigns and creating content, mostly for social media and our website. I've been doing this for about five years now, and I really enjoy the problem-solving aspect of it." },
      { role: 'examiner', text: 'What do you like most about your job?' },
      { role: 'candidate', text: "I think what I enjoy most is the creative side of marketing. When you're putting together a campaign, you're not just writing copy — you're shaping how people experience a brand. There's a real sense of satisfaction when you solve a difficult problem or when customers genuinely respond to something you've created. I also enjoy the continuous learning — the industry moves so fast that there's always something new to explore." },
      { role: 'examiner', text: 'Do you prefer working alone or in a team?' },
      { role: 'candidate', text: "Honestly, I enjoy both, but probably lean slightly toward working in a team. When you collaborate with others, you get exposed to different perspectives and ideas that you wouldn't come up with on your own. That said, I do need some quiet, focused time to actually write and think things through. So ideally, I like a balance — team discussions for planning and brainstorming, and individual time for deep work." },
      { role: 'examiner', text: "Let's talk about your daily routine. What time do you usually wake up?" },
      { role: 'candidate', text: "I'm usually up around seven in the morning. I'm not really a morning person by nature, but I've trained myself to wake up early because I find I get more done before noon. The first thing I do is make a cup of strong coffee — I can't really function without it. Then I'll check my messages quickly before heading to the office or starting work if I'm working from home that day." },
      { role: 'examiner', text: 'Has your daily routine changed much in recent years?' },
      { role: 'candidate', text: "Yes, quite a bit actually. Before the pandemic, I had a very fixed routine — commute to the office every day, work nine to six, come home. But since we shifted to a hybrid model, my routine has become much more flexible. On days I work from home, I might take a longer lunch break to go for a walk, or I might start earlier and finish earlier. I think the flexibility has been really positive for my overall wellbeing." },
      { role: 'examiner', text: 'Do you think routines are important?' },
      { role: 'candidate', text: "Definitely. I think having some structure in your day helps you stay productive and gives you a sense of stability. But at the same time, I don't think you should be too rigid about it. Life is unpredictable, and being able to adapt is important too. I try to have a general framework for my day — when I wake up, when I exercise, when I do focused work — but I leave room for flexibility within that framework." },
    ],
    tips: [
      'Keep answers to 2-4 sentences — detailed enough to show fluency but not so long that you ramble',
      'Use specific examples from your own life',
      'Show a range of vocabulary — avoid repeating the same words',
      'Use natural discourse markers: "Honestly," "Actually," "I think," "That said"',
    ],
    keyPhrases: [
      'I really enjoy the... aspect of it',
      'There\'s a real sense of satisfaction when...',
      'I probably lean slightly toward...',
      'I\'m not really a... person by nature, but...',
      'Quite a bit, actually',
      'I try to have a general framework for...',
    ],
  },
  {
    id: 'ielts-2',
    title: 'Part 1 — Technology & Internet',
    part: 'Part 1',
    topic: 'Technology',
    description: 'Part 1 questions about technology usage, internet habits, and social media preferences.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'How often do you use the internet?' },
      { role: 'candidate', text: "Oh, constantly. Working in marketing, I'm online pretty much all day for work — researching trends, collaborating with teammates, and of course managing our social media accounts. Outside of work, I use the internet for everything from reading news to watching tutorials. I'd say I'm connected for at least ten to twelve hours a day, which sounds like a lot when I say it out loud." },
      { role: 'examiner', text: 'What do you mainly use the internet for?' },
      { role: 'candidate', text: "Apart from work, I'd say learning is the biggest one. I watch a lot of YouTube videos about marketing, design, and sometimes random topics like history or science. I also use the internet for entertainment — I'm a big fan of podcasts, especially business ones and English learning ones. And of course, staying in touch with friends and family through messaging apps and video calls." },
      { role: 'examiner', text: 'Do you think people spend too much time online?' },
      { role: 'candidate', text: "I think it really depends on how you use it. If you're spending time learning, creating, or connecting meaningfully with people, then being online isn't necessarily a bad thing. But I do think a lot of people, myself included sometimes, fall into the trap of mindless scrolling — going through social media feeds without really getting anything out of it. That's the kind of screen time that I think is too much. It's about quality, not just quantity." },
      { role: 'examiner', text: 'What technology could you not live without?' },
      { role: 'candidate', text: "My laptop, without question. It's essentially my livelihood — I couldn't do my job without it. But beyond work, I use it for almost everything: communication, entertainment, learning, even managing my finances. If I had to choose a second thing, I'd say noise-cancelling headphones. They've been a game-changer for my concentration, especially when working in cafés or open offices." },
      { role: 'examiner', text: 'Do you think children should use technology?' },
      { role: 'candidate', text: "Yes, but with limits. Technology is such an important part of the world they're growing up in, so I think it's actually essential for children to be exposed to it and learn how to use it. However, I don't think a five-year-old should be spending three hours a day on a tablet. There should be a good balance between screen time and physical activities, socializing, and creative play. Parents have a responsibility to set boundaries and guide their children's technology use." },
    ],
    tips: [
      'For questions about opinions, give your view AND explain why',
      'Use quantifiers naturally: "pretty much," "at least," "a lot of"',
      'Show you can discuss both sides: "Yes, but..." or "It depends on..."',
      'Idiomatic expressions add naturalness: "game-changer," "fall into the trap"',
    ],
    keyPhrases: [
      'Which sounds like a lot when I say it out loud',
      'Apart from... I\'d say... is the biggest one',
      'It really depends on how you...',
      'Fall into the trap of...',
      'It\'s about quality, not just quantity',
      'Without question',
      'They\'ve been a game-changer for...',
    ],
  },

  // ── Part 2: Long Turn ──────────────────────────────
  {
    id: 'ielts-3',
    title: 'Part 2 — Describe a Skill You Learned',
    part: 'Part 2',
    topic: 'Work & Study',
    description: 'A cue card topic where the candidate speaks for 1-2 minutes. Topic: Describe a skill you learned that you are proud of.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a skill that you learned and are proud of. You should say: what the skill is, how you learned it, why you decided to learn it, and explain why you are proud of it. You have one minute to prepare." },
      { role: 'candidate', text: `I'd like to talk about learning to communicate effectively in English, which is something I've been working on for the past couple of years and feel genuinely proud of.

I decided to focus seriously on English when I started working with international clients and colleagues. Before that, I could read English fairly well — most of the industry articles I read were in English, so I had decent reading comprehension. But when it came to speaking and writing in professional contexts, I really struggled. I would freeze up in meetings, overthink my grammar, and often just stay silent because I was afraid of making mistakes.

The way I learned was quite self-directed. I started by consuming as much English content as possible — podcasts during my commute, English YouTube channels, and audiobooks before bed. I also began writing a daily journal in English, which helped me practice expressing my thoughts more fluently. But the biggest breakthrough came when I started actually using English every day — having conversations with colleagues, presenting in meetings, and even thinking in English instead of translating from my native language in my head.

I'm particularly proud of this skill because it required me to push past a lot of discomfort. Speaking a foreign language means being vulnerable — you make grammatical mistakes, you mispronounce words, and sometimes people don't understand you. It would have been much easier to just stick to my own language and avoid that discomfort. But I pushed through, and now I can confidently hold conversations, give presentations, and even make jokes in English, which I think is one of the hardest things to do in a foreign language.

It's also opened up so many opportunities for me professionally. I can now work with clients from anywhere in the world, read industry reports without struggling, and take part in international conferences and events. It's genuinely changed the trajectory of my career, and I feel proud every time I realize how far I've come from those early days of freezing up in meetings.` },
      { role: 'examiner', text: 'Do you think you will continue to improve this skill?' },
      { role: 'candidate', text: "Absolutely. Language learning is a lifelong journey — I don't think you ever really finish. There are still areas where I want to improve, like using more idiomatic expressions naturally and getting better at understanding different accents. I also want to expand my vocabulary in areas outside of work, like discussing art, politics, or philosophy in English. So yes, I'll definitely keep working on it." },
    ],
    tips: [
      'Structure your answer clearly: what, how, why, and your feelings about it',
      'Speak for the full 1-2 minutes — practice timing yourself',
      'Use a mix of past and present tenses to show grammatical range',
      'Include personal feelings and reflections, not just facts',
      'Use discourse markers to connect ideas: "But the biggest breakthrough came when..."',
    ],
    keyPhrases: [
      'I\'d like to talk about...',
      'I feel genuinely proud of...',
      'When it came to... I really struggled',
      'The biggest breakthrough came when...',
      'It required me to push past a lot of discomfort',
      'It\'s genuinely changed the trajectory of...',
      'I feel proud every time I realize how far I\'ve come',
    ],
  },
  {
    id: 'ielts-4',
    title: 'Part 2 — Describe a Place You Like to Visit',
    part: 'Part 2',
    topic: 'Travel & Places',
    description: 'A cue card topic: Describe a place in your city that you like to visit. Say where it is, what you do there, who you go with, and why you enjoy it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a place in your city that you like to visit. You should say: where it is, how often you go there, what you do there, and explain why you enjoy visiting this place." },
      { role: 'candidate', text: `One of my favorite places in my city is the area along the river that runs through the centre, particularly the stretch between the two main bridges. I try to go there at least two or three times a week, usually in the evening after work.

What I typically do there depends on my mood. Sometimes I go for a run along the riverbank — there's a nice paved path that runs alongside the water, and in the evening the temperature cools down enough to make running pleasant. Other times, I just walk slowly and take in the scenery. There are lots of small cafés and street food vendors along the river, so I might stop for an iced coffee or some grilled corn.

I usually go alone, actually, which might sound strange. But I find that walking by the river alone is one of the best ways for me to decompress after a long day at work. When you spend all day staring at a screen and thinking about complex problems, there's something incredibly refreshing about being outdoors, watching the lights reflected on the water, feeling the breeze from the sea.

What I particularly love about this spot is how it transforms at night. The main bridge lights up in different colors, and on weekend nights there's a light show set to music, which is quite a spectacle. The smaller footbridge is covered in colorful locks left by couples, and it's beautifully lit in the evening. The whole area has this wonderful, almost magical atmosphere.

But beyond the aesthetics, I think what I really enjoy is the sense of community. In the evening, you see families out walking, groups of friends sitting on the riverbank, elderly people doing tai chi, and young couples taking photos. It reminds me that there's a whole world beyond my laptop screen. It brings me back to the present moment and helps me appreciate the city I live in.

I'd say this place is important to my mental health, honestly. It's become a kind of ritual — whenever I'm feeling stressed or stuck on a problem, I know that a walk by the river will help me reset. And sometimes, I've had my best ideas while walking there, because my mind is free to wander without the pressure of sitting at a desk.` },
      { role: 'examiner', text: 'Is this place popular with tourists as well?' },
      { role: 'candidate', text: "Yes, very much so. My city has become quite a popular tourist destination in recent years, and the riverside is one of the main attractions. You see quite a mix of local people and tourists there, especially near the main bridge on weekend evenings. I think tourists are drawn to it for the same reasons I am — the beautiful scenery, the vibrant atmosphere, and of course the light show, which is quite unique. But I'd say during weekday evenings it's mostly locals, which is when I prefer to go." },
    ],
    tips: [
      'Paint a picture with descriptive language — help the listener visualize the place',
      'Include sensory details: sights, sounds, smells, feelings',
      'Explain the emotional significance, not just physical description',
      'Use present simple for habits and routines at the place',
      'Vary your sentence structure — mix short and long sentences',
    ],
    keyPhrases: [
      'One of my favorite places is...',
      'What I typically do there depends on...',
      'There\'s something incredibly refreshing about...',
      'What I particularly love about... is how it...',
      'Beyond the aesthetics, I think what I really enjoy is...',
      'It\'s become a kind of ritual',
      'My mind is free to wander',
    ],
  },

  // ── Part 3: Discussion ──────────────────────────────
  {
    id: 'ielts-5',
    title: 'Part 3 — Education & Learning in the Modern World',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'An in-depth discussion about education systems, online learning, and how technology is changing the way people learn.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How has technology changed the way people learn?' },
      { role: 'candidate', text: "Technology has fundamentally transformed learning in several ways. The most obvious is accessibility — today, anyone with an internet connection can access courses from top universities through platforms like Coursera or MIT OpenCourseWare. When I was growing up, access to high-quality English-language education was limited where I lived. Now, a student in a small town can watch the same lecture as someone at Harvard. That's remarkable.\n\nBeyond accessibility, technology has made learning much more personalized. AI-powered tools can adapt to a student's level and pace, providing more practice in areas where they're struggling. Language learning apps like Duolingo adjust their difficulty based on your performance. This kind of personalization was simply impossible in a traditional classroom with thirty students." },
      { role: 'examiner', text: 'Do you think online learning is as effective as traditional classroom learning?' },
      { role: 'candidate', text: "That's a really interesting question, and I don't think there's a simple answer. For certain types of learning, online can actually be more effective. Self-paced courses are great for motivated learners who want to go deeper into a subject at their own speed. And for practical skills like graphic design or data analysis, online resources are often more up-to-date than textbooks.\n\nHowever, traditional classroom learning has advantages that are hard to replicate online. The social aspect — learning alongside peers, having face-to-face discussions, building relationships with teachers — is really valuable. There's also the accountability factor. When you have to show up to a class at a specific time, you're more likely to actually do the work.\n\nI think the ideal model is probably a blend of both — what educators call 'blended learning.' Use online resources for content delivery and self-study, but maintain in-person sessions for discussion, collaboration, and hands-on activities." },
      { role: 'examiner', text: 'Some people say that university degrees are becoming less important. Do you agree?' },
      { role: 'candidate', text: "To some extent, yes, particularly in industries like technology and media. In my field, marketing, many successful people are self-taught or have learned through short courses rather than university degrees. Companies like Google and Apple have removed degree requirements for many positions, focusing instead on demonstrated skills and portfolio work.\n\nHowever, I think it would be premature to say that degrees are becoming irrelevant. For many professions — medicine, law, engineering — a formal education is absolutely essential. And even in fields like mine, a university education provides things that self-study doesn't: a broad foundation of knowledge, exposure to different perspectives, and the development of critical thinking skills.\n\nWhat I think is changing is the monopoly that universities had on credentialing. Employers are increasingly willing to accept alternative credentials — certificates, portfolios, real-world experience. So degrees are becoming less necessary as a signal of competence, but the learning they represent is still valuable." },
      { role: 'examiner', text: 'How do you think education systems should prepare young people for the future?' },
      { role: 'candidate', text: "This is something I feel quite strongly about. I think current education systems, in many countries including my own, are still too focused on memorization and standardized testing. Students learn to pass exams rather than to think critically, solve problems, or be creative.\n\nIf I could change one thing, it would be to put much more emphasis on teaching students how to learn, rather than what to learn. In a world where information is constantly changing and new fields are emerging all the time, the most valuable skill is the ability to teach yourself new things. Critical thinking, information literacy, and adaptability should be at the core of education.\n\nI'd also advocate for more practical, project-based learning. When I was in school, most of what I learned was theoretical. But when I started working, I realized that the ability to apply knowledge to real problems is what actually matters. Students should be working on real projects, collaborating in teams, and learning from failure from an early age.\n\nFinally, I think we need to take soft skills more seriously. Communication, teamwork, emotional intelligence, resilience — these are just as important as technical knowledge, but they're rarely taught explicitly in schools." },
      { role: 'examiner', text: 'Is there too much pressure on students today?' },
      { role: 'candidate', text: "Absolutely, and I think this is a growing concern, especially in Asian countries. In my country, there's enormous pressure on students to perform well in exams, get into prestigious universities, and pursue 'respectable' careers. This pressure comes from families, schools, and society as a whole.\n\nThe consequences can be quite serious. I've seen friends and colleagues who burned out in their twenties because they'd been under relentless academic pressure since childhood. Mental health issues among students are rising — anxiety, depression, and in the worst cases, more serious problems.\n\nI think we need a cultural shift in how we view success and education. Not everyone needs to go to university. Not everyone needs to be a doctor or an engineer. A society needs people with all kinds of skills and interests, and we should celebrate that diversity rather than pushing everyone through the same narrow path.\n\nThat said, I want to be careful not to romanticize a lack of pressure. Some degree of challenge and expectation is necessary for growth. The problem is when the pressure becomes excessive, when it comes at the cost of wellbeing, and when it's driven by social status rather than genuine learning." },
    ],
    tips: [
      'Part 3 requires you to discuss abstract topics in depth — go beyond personal experience',
      'Structure complex answers: state your position, give reasons, provide examples, and acknowledge other views',
      'Use hedging language for nuance: "To some extent," "I think it would be premature to say..."',
      'Show you can evaluate both sides of an argument',
      'Use sophisticated linking: "However," "That said," "Beyond that," "What I think is changing is..."',
    ],
    keyPhrases: [
      'That\'s a really interesting question, and I don\'t think there\'s a simple answer',
      'To some extent, yes, particularly in...',
      'I think it would be premature to say...',
      'This is something I feel quite strongly about',
      'If I could change one thing, it would be...',
      'I\'d also advocate for...',
      'I want to be careful not to romanticize...',
      'That said...',
    ],
  },
  {
    id: 'ielts-6',
    title: 'Part 3 — The Future of Cities',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'A discussion about urbanization, smart cities, and how cities might change in the coming decades.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why do you think so many people are moving to cities?' },
      { role: 'candidate', text: "There are both push and pull factors at play. On the pull side, cities offer better job opportunities, higher salaries, and more diverse career options. For a young person in a rural area of my country, moving to one of the big cities opens up possibilities that simply don't exist in their hometown — particularly in fields like technology, finance, and creative industries.\n\nCities also offer better access to education, healthcare, and cultural activities. If you want to attend a university, visit a specialist doctor, or go to a concert, you generally need to be in or near a city.\n\nOn the push side, rural areas often lack economic opportunities, and farming — which is the main livelihood in many rural areas — is becoming increasingly mechanized, requiring fewer workers. Climate change is also a factor — in my country, rising sea levels and extreme weather are affecting agricultural communities, pushing some people toward cities.\n\nI think this trend is likely to continue, though perhaps at a slower pace as remote work makes it possible for some people to live in smaller cities while working for companies based in large ones." },
      { role: 'examiner', text: 'What problems does rapid urbanization cause?' },
      { role: 'candidate', text: "The list is quite long, unfortunately. Housing affordability is one of the biggest issues. When millions of people move to cities, demand for housing outstrips supply, and prices skyrocket. In the biggest cities in my country, property prices have risen so dramatically that many young professionals can barely afford to rent, let alone buy. This creates inequality — longtime residents and wealthy investors benefit from rising property values while newcomers are priced out.\n\nInfrastructure strain is another major problem. Roads, public transport, water systems, and electrical grids weren't designed for the current population in many rapidly growing cities. Traffic congestion in cities across my region is a daily frustration for millions of people, and it wastes enormous amounts of time and fuel.\n\nEnvironmental degradation is also a serious concern. More people means more waste, more pollution, and more pressure on green spaces. Air quality in many Asian cities is already at dangerous levels, and the heat island effect — where cities are significantly hotter than surrounding rural areas — is getting worse.\n\nAnd then there are social issues: overcrowding, stress, crime, and the erosion of community. In a village, everyone knows their neighbors. In a massive city, people can live next door to each other for years without ever speaking." },
      { role: 'examiner', text: 'Do you think technology can help solve some of these urban problems?' },
      { role: 'candidate', text: "Yes, I'm cautiously optimistic about this. The concept of 'smart cities' — using technology to improve urban management — is already being implemented in various ways. For example, smart traffic systems that use AI to optimize signal timing can significantly reduce congestion. Singapore has been a leader in this area, and the results are impressive.\n\nSmart waste management systems can use sensors to optimize collection routes, reducing costs and environmental impact. Smart energy grids can distribute power more efficiently. And improvements in public transport technology — electric buses, ride-sharing algorithms, even the prospect of autonomous vehicles — could transform how people move around cities.\n\nHowever, I'm cautious because technology alone isn't enough. A smart traffic system can only do so much if the fundamental problem is that there are too many cars and not enough public transport. Technology should complement good urban planning and policy, not replace it.\n\nThere's also the risk that smart city technology could be used for excessive surveillance. China's social credit system and pervasive camera networks raise real questions about privacy and civil liberties. We need to ensure that making cities smarter doesn't mean making citizens less free." },
      { role: 'examiner', text: 'What do you think cities will look like in fifty years?' },
      { role: 'candidate', text: "That's a fascinating question to speculate about. I think cities will be significantly greener — both literally and figuratively. As climate change pressures intensify, cities will need to incorporate much more green space, better insulation, and renewable energy. I imagine buildings covered in vertical gardens, rooftop solar panels everywhere, and many more parks and green corridors.\n\nTransportation will probably look very different. I expect most vehicles will be electric and autonomous, and personal car ownership will decline in favor of shared mobility services. Public transport will likely be faster and more efficient, possibly including things like hyperloop systems connecting nearby cities.\n\nRemote work will have reshaped urban geography. If fewer people need to commute to a central office every day, we might see a more distributed model — clusters of smaller urban centers rather than one massive downtown. This could help reduce some of the congestion and housing pressure.\n\nBut honestly, predicting fifty years into the future is extremely difficult. If you'd asked someone in 1975 what cities would look like in 2025, they probably wouldn't have predicted smartphones, the internet, or ride-sharing apps. The changes that actually transform cities might be things we haven't even imagined yet.\n\nWhat I hope for, regardless of the specific technologies, is that future cities are designed with human wellbeing at their center — places where people can live comfortably, move easily, breathe clean air, and feel a sense of community. That should be the goal, and technology should serve that goal rather than being an end in itself." },
    ],
    tips: [
      'For speculative questions, use appropriate modal verbs: "will probably," "might," "could"',
      'Organize your points clearly — use categories like "push and pull factors" or "On one hand... on the other..."',
      'Show awareness of your own country/context while also discussing broader trends',
      'End with a personal reflection or forward-looking statement',
      'Use advanced vocabulary naturally, not forcefully',
    ],
    keyPhrases: [
      'There are both push and pull factors at play',
      'The list is quite long, unfortunately',
      'I\'m cautiously optimistic about...',
      'Technology should complement... not replace...',
      'That\'s a fascinating question to speculate about',
      'If you\'d asked someone in... they probably wouldn\'t have predicted...',
      'Regardless of the specific technologies...',
      '...should be the goal, and... should serve that goal',
    ],
  },
  {
    id: 'ielts-7',
    title: 'Part 2 — Describe a Time You Helped Someone',
    part: 'Part 2',
    topic: 'Society & Culture',
    description: 'Cue card: Describe a time you helped someone. Say who you helped, what the situation was, how you helped, and how you felt about it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a time when you helped someone. You should say: who you helped, what the situation was, how you helped them, and explain how you felt about helping them. You have one minute to prepare." },
      { role: 'candidate', text: `I'd like to describe a time when I helped a new colleague on my team who was really struggling during his first few months at our company.

His name was Sam, and he had just graduated from university. He was quite capable — his writing and analytical skills were solid — but he was having a hard time adapting to the professional environment. The workload was large and complex, the tools and processes were unfamiliar, and I think he was overwhelmed by the gap between what he'd learned in school and what the job actually required.

I noticed that he was staying very late every day but not making much progress on his tasks. He was too shy to ask for help — I think he was afraid of looking incompetent. During team reviews, his reports would have fundamental issues, and I could see that the feedback, while well-intentioned, was making him feel worse rather than helping him improve.

So I decided to become something of an informal mentor. I started by having a casual coffee chat with him, where I shared my own experience of feeling lost when I first started working. I told him about mistakes I'd made and how long it took me to feel comfortable. I think hearing that helped normalize what he was going through.

After that, I set up a regular weekly session where we'd sit together and work through problems. I didn't just give him answers — I tried to teach him how to approach problems systematically. How to plan a project, how to prioritize effectively, how to break a large task into manageable pieces. I also helped him organize his files and workflow properly and showed him shortcuts and tools that would save him time.

Over the next few months, his confidence grew visibly. He started asking questions in team meetings, the quality of his work improved dramatically, and he began finishing tasks on time. By the end of his first year, he was one of the most reliable members of the team.

How did I feel about it? Honestly, it was one of the most rewarding experiences I've had at work. There's something deeply satisfying about helping someone overcome a difficult period and seeing them grow. It also made me reflect on my own journey and appreciate the people who helped me along the way. I think mentoring someone is one of the best ways to solidify your own knowledge too — when you have to explain something clearly to someone else, you understand it better yourself.

And on a broader level, it reinforced my belief that companies need to do more to support new graduates. The transition from education to professional work is genuinely difficult, and without proper support, talented people can fall through the cracks.` },
      { role: 'examiner', text: 'Do you think people help each other enough in the workplace?' },
      { role: 'candidate', text: "Unfortunately, I don't think so — at least not in many workplaces. There's often a culture of 'figure it out yourself,' which can be especially tough for newcomers. People are busy with their own tasks and deadlines, and mentoring doesn't always get recognized or rewarded by management. I think companies should make mentorship more formal and valued — it benefits the mentor, the mentee, and the organization as a whole." },
    ],
    tips: [
      'Tell a story with a clear beginning, middle, and end',
      'Include emotional depth — how you felt, how the other person felt',
      'Use narrative tenses well: past simple for events, past continuous for background',
      'Connect the personal story to a broader theme or lesson',
      'Show character through actions, not just descriptions',
    ],
    keyPhrases: [
      'I\'d like to describe a time when...',
      'He was having a hard time adapting to...',
      'I noticed that...',
      'I decided to become something of an...',
      'I didn\'t just... — I tried to...',
      'His confidence grew visibly',
      'It was one of the most rewarding experiences I\'ve had',
      'It reinforced my belief that...',
      'Talented people can fall through the cracks',
    ],
  },
  // ── New Topics ──────────────────────────────────────────
  {
    id: 'ielts-9',
    title: 'Part 1 — Hometown & Living Environment',
    part: 'Part 1',
    topic: 'Home & Living',
    description: 'Part 1 questions about where you live, your neighbourhood, and what you like or dislike about your living environment.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Can you tell me about the town or city where you currently live?' },
      { role: 'candidate', text: "I live in a coastal city in the centre of my country. It's one of the larger cities in the country, but it still has a much more relaxed pace of life compared to the capital or the main business hub. What I love most about it is the combination of city conveniences and natural beauty — you have the beach literally five minutes from the city centre, and the mountains and hills are just a short drive away. It's a great place to live if you value a balance between work and quality of life." },
      { role: 'examiner', text: 'What do you like most about your neighbourhood?' },
      { role: 'candidate', text: "I live near the river, and the neighbourhood has a really nice atmosphere, especially in the evenings. There are lots of small cafés along the riverbank, which is where I like to spend my evenings sometimes. The area is quite walkable, which I appreciate — I can get to the supermarket, a gym, and several restaurants all on foot. It doesn't feel too crowded or chaotic, which is important to me after spending all day in front of a computer." },
      { role: 'examiner', text: 'Is there anything you dislike about living there?' },
      { role: 'candidate', text: "The main downside is the traffic. My city is growing so fast that the roads haven't quite kept up with the number of vehicles. Rush hour can be quite frustrating. The rainy season — roughly from October to December — is also quite intense. We get a lot of flooding, which can disrupt daily life for weeks at a time. But overall, these are minor issues compared to the advantages of living here." },
      { role: 'examiner', text: 'Has the area changed much since you moved there?' },
      { role: 'candidate', text: "Enormously. When I first moved here about six years ago, it was much quieter. There were fewer buildings, fewer tourists, and the business scene was just starting out. Now there are new apartment buildings going up constantly, a lot more international restaurants and coffee shops, and the city has really put a lot of investment into improving the infrastructure. The beachfront has been developed a lot too. Sometimes I miss the quieter version of the city, but the development has also brought a lot of opportunities." },
    ],
    tips: [
      'Use a mix of positive and negative observations to show balanced thinking',
      'Give specific details — names of places, distances, time frames',
      'Use present simple for facts and present perfect for changes: "has grown," "has been developed"',
      'Natural filler phrases show fluency: "What I love most is," "The main downside is"',
    ],
    keyPhrases: [
      'has a much more relaxed pace of life compared to...',
      'What I love most about it is the combination of...',
      'I appreciate... especially after...',
      "The main downside is...",
      'I miss the quieter version of...',
      'the development has also brought a lot of opportunities',
    ],
  },
  {
    id: 'ielts-10',
    title: 'Part 1 — Food & Eating Habits',
    part: 'Part 1',
    topic: 'Food & Culture',
    description: 'Part 1 questions about food preferences, eating habits, and cooking.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'What kind of food do you enjoy eating?' },
      { role: 'candidate', text: "I'm a big fan of our local food — it's incredibly diverse and every region has its own specialities. Living where I do, I'm surrounded by the cuisine of my region, which tends to be spicier and more complex than food from other parts of the country. My absolute favourite is a local noodle dish with shrimp, pork, herbs, and a small amount of turmeric broth, topped with crispy rice crackers. But I also enjoy international food quite a bit. Japanese cuisine in particular — the precision and balance of flavours really appeals to me." },
      { role: 'examiner', text: 'Do you prefer cooking at home or eating out?' },
      { role: 'candidate', text: "Honestly, a mix of both. I enjoy cooking when I have the time, mainly because it's relaxing and I can control what goes into the food. But my city has such incredible and affordable street food that it's hard to justify cooking every day. A bowl of noodle soup or a sandwich from a local spot costs almost nothing and tastes amazing. On weekdays, I usually eat out for convenience. On weekends, I sometimes cook something a bit more elaborate at home." },
      { role: 'examiner', text: "Have your eating habits changed as you've got older?" },
      { role: 'candidate', text: "Yes, quite a lot. When I was a student, I ate really carelessly — lots of instant noodles, fast food, skipping meals when I was busy. Now I pay much more attention to what I eat. I try to have proper meals with vegetables and protein, and I've cut down on sugar and fried food. Working from a screen all day makes me very aware that my diet affects my energy levels and concentration. If I eat junk, I feel sluggish in the afternoon. It's a very practical motivation to eat better." },
      { role: 'examiner', text: 'Is food an important part of culture in your country?' },
      { role: 'candidate', text: "Absolutely. In my country, food is almost inseparable from social life. Family gatherings, celebrations, even business meetings — they all revolve around eating together. There's a saying that roughly translates as 'eating is a form of connection.' I think that's very true. You can learn a lot about our culture just by eating with a local family. The variety of ingredients, the balance of flavours, the care that goes into each dish — it all reflects something deeper about the culture." },
    ],
    tips: [
      'Show vocabulary range: don\'t just say "nice" — use "complex," "precise," "aromatic," "balanced"',
      'Connect food to identity and culture to show depth',
      'Use contrast naturally: "When I was a student... Now I..."',
      'Specific examples (dish names, meal contexts) are much stronger than vague answers',
    ],
    keyPhrases: [
      'I\'m a big fan of...',
      'tends to be... than...',
      'It\'s hard to justify... when...',
      'I pay much more attention to...',
      'makes me very aware that... affects...',
      'is almost inseparable from...',
    ],
  },
  {
    id: 'ielts-11',
    title: 'Part 1 — Sports & Leisure',
    part: 'Part 1',
    topic: 'Sports & Leisure',
    description: 'Part 1 questions about sports, exercise habits, and leisure activities.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you play any sports?' },
      { role: 'candidate', text: "Yes, I play badminton regularly — about two or three times a week. It's a great sport because it's both a good workout and a social activity. I usually go with a group of colleagues after work. We book a court near the office and play for about an hour. It started as something casual, but now it's become a proper routine that I really look forward to. I've also gotten into swimming over the past year, which is almost unavoidable when you live this close to the beach." },
      { role: 'examiner', text: 'Did you play more sport when you were younger?' },
      { role: 'candidate', text: "Definitely. When I was in school, I played football almost every day with my friends in the neighbourhood. We'd play on any open piece of ground we could find — it was completely informal, no uniforms, no referee, just kids having fun. As I got older and started university, it kind of fell away because of study pressures. Then working life made it even harder to find time. I think that's a pattern a lot of people experience. But I've made more of an effort recently to bring exercise back into my routine." },
      { role: 'examiner', text: 'What leisure activities do you enjoy apart from sport?' },
      { role: 'candidate', text: "I read quite a bit — mostly non-fiction, things like biographies, books on business, or popular science. I also enjoy going for bike rides on weekends, exploring the roads around my city and the surrounding countryside. There's something very freeing about just getting on the bike and seeing where you end up. And honestly, working on creative side projects like photography counts as leisure for me — I genuinely enjoy making things, so it doesn't always feel like work." },
      { role: 'examiner', text: "Do you think it's important for young people to do sport?" },
      { role: 'candidate', text: "Very much so. Beyond the obvious physical benefits, sport teaches children things that are hard to learn in a classroom — how to win graciously, how to lose without giving up, how to work as a team. Those are life skills. I also think children today spend too much time on screens, and sport is one of the most natural ways to get them away from that. It doesn't have to be competitive or serious — even unstructured play is valuable." },
    ],
    tips: [
      'Talk about sport in social and personal context, not just physical exercise',
      'Past-to-present contrast shows tense range and reflective thinking',
      'Offer opinions on societal questions with reasons, not just yes/no',
      '"About two or three times a week" sounds more natural than "twice a week exactly"',
    ],
    keyPhrases: [
      'It\'s a great sport because it\'s both... and...',
      'It\'s become a proper routine that I really look forward to',
      'completely informal — no..., just...',
      'I\'ve made more of an effort recently to...',
      'There\'s something very freeing about...',
      'teaches children things that are hard to learn in a classroom',
    ],
  },
  {
    id: 'ielts-12',
    title: 'Part 1 — Media & Entertainment',
    part: 'Part 1',
    topic: 'Media & Entertainment',
    description: 'Part 1 questions about TV, news, music, and how people consume media.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you watch a lot of television?' },
      { role: 'candidate', text: "Not as much as I used to. I've mostly switched to streaming platforms — Netflix, YouTube, that kind of thing. The advantage is that you can watch what you want, when you want, without sitting through commercials. I tend to watch in short bursts rather than binge-watching whole series. In the evenings, I might watch a documentary or an episode of something while I eat dinner. On weekends, I sometimes watch a film. I don't really follow any live TV anymore, except for occasional football matches." },
      { role: 'examiner', text: 'How do you usually get your news?' },
      { role: 'candidate', text: "Mostly through online sources. I follow a few news websites and I have a couple of newsletters that summarise the most important stories. I've found that trying to follow the news too closely is quite bad for my mood, so I try to check in once or twice a day rather than constantly refreshing feeds. For international news, I read a lot in English — BBC, Reuters, that sort of thing. It's actually been a great way to improve my reading comprehension while staying informed." },
      { role: 'examiner', text: 'What kind of music do you listen to?' },
      { role: 'candidate', text: "My taste is fairly broad. While I'm working, I usually listen to lo-fi music or instrumental jazz — something without lyrics that won't distract me. When I'm exercising or commuting, I switch to more upbeat stuff, like pop or electronic music. I also genuinely enjoy local indie music — there's a really talented scene here that I don't think gets enough international attention. And I still play guitar occasionally, so I find myself listening to classical guitar pieces too." },
      { role: 'examiner', text: 'Do you prefer reading books or watching films?' },
      { role: 'candidate', text: "I'd say reading, for deep engagement. A good book gives you space to think and imagine in a way that a film doesn't. But films are great when I want something more passive and immersive. I don't think it has to be one or the other — they serve different purposes. When I'm tired after a long day at work, reading requires more mental energy than I often have. So in practice, I probably watch more films than I read books, even though I prefer reading in principle." },
    ],
    tips: [
      'Contrast past habits with current ones to demonstrate language range',
      'Use qualifiers honestly: "not as much as I used to," "in practice"',
      'Specific examples (platform names, genres) make answers feel genuine',
      'Acknowledging a contradiction and explaining it shows mature thinking',
    ],
    keyPhrases: [
      'Not as much as I used to.',
      'The advantage is that you can...',
      'I\'ve found that... is quite bad for...',
      'It\'s actually been a great way to... while...',
      'something without... that won\'t distract me',
      'they serve different purposes',
      'even though I prefer... in principle',
    ],
  },
  {
    id: 'ielts-13',
    title: 'Part 2 — Describe a Cultural Tradition',
    part: 'Part 2',
    topic: 'Food & Culture',
    description: 'Cue card: Describe a cultural tradition in your country. Say what it involves, when it happens, how you participate, and explain why it is important to you.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a cultural tradition that is important in your country. You should say: what the tradition is, when and how it is celebrated, how you personally participate, and explain why this tradition is important to you or your culture. You have one minute to prepare." },
      { role: 'candidate', text: `I'd like to talk about Lunar New Year, which is by far the most important cultural tradition in my country.

It usually falls in late January or early February, depending on the lunar calendar. It marks the beginning of a new year and is a time for families to come together, remember their ancestors, and celebrate new beginnings. The preparations begin weeks before the actual date — families clean and decorate their homes, buy fresh flowers like apricot blossoms or peach blossoms, and prepare special foods. Streets and markets are transformed into a sea of yellow and red, which are considered lucky colours.

The way my family celebrates is fairly traditional. We spend the days before the holiday deep-cleaning the house, which symbolically sweeps away bad luck from the previous year. My mother and grandmother spend hours in the kitchen making sticky rice cakes filled with mung bean paste and pork, wrapped in banana leaves and slow-cooked overnight. The smell of those cakes simmering fills the whole house and is one of the most deeply nostalgic smells I know.

On New Year's Eve, the whole family gathers for a reunion dinner. We set a place at the table for ancestors who have passed away, which I find very moving. Then at midnight, there are fireworks across the city — the sky above my city is absolutely spectacular. On the first days of the new year, children receive red envelopes with money, which represent good luck and blessings.

Why is this tradition important to me personally? I think in modern life, we're all moving so fast — work, technology, constant change. The New Year creates a moment when everything stops. Everyone goes home. You reconnect with your family, your roots, the things that are permanent. In a way, it's a reminder of where you come from and who you are.

I also think traditions like this are incredibly valuable for cultural continuity. My country has gone through enormous changes in recent decades. Having a tradition that everyone participates in, regardless of age, class, or where they live, is a kind of cultural anchor.` },
      { role: 'examiner', text: 'Do you think younger generations still value traditional celebrations like Lunar New Year?' },
      { role: 'candidate', text: "It's a mixed picture. On one hand, I think young people in my country genuinely love the New Year — the holiday is deeply embedded in the culture and most people look forward to it. On the other hand, the way it's celebrated is changing. Younger generations tend to celebrate in shorter, more condensed ways. The multi-day family gatherings are getting shorter as people return to work sooner. There's also a small segment of young people who find the family pressure during the holiday — questions about relationships, salary, future plans — quite stressful. But I think the core of the tradition remains strong." },
    ],
    tips: [
      'Organize your monologue with a clear arc: what it is → how it\'s done → how you participate → why it matters',
      'Use sensory details to bring the tradition alive: smells, sights, sounds',
      'Personal emotional significance is what distinguishes a band 7+ answer from a band 5 one',
      'Temporal language: "weeks before," "on New Year\'s Eve," "on the first days"',
      'The follow-up question tests your ability to analyze, not just describe — give a nuanced view',
    ],
    keyPhrases: [
      'by far the most important...',
      'transformed into...',
      'one of the most deeply nostalgic... I know',
      'I find very moving',
      'creates a moment when everything stops',
      'a reminder of where you come from and who you are',
      'a kind of cultural anchor',
      'It\'s a mixed picture',
    ],
  },
  {
    id: 'ielts-14',
    title: 'Part 2 — Describe a Person Who Inspired You',
    part: 'Part 2',
    topic: 'Society & Culture',
    description: 'Cue card: Describe a person who has inspired or influenced you. Say who they are, how you know them, what they did, and explain how they influenced you.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a person who has had a significant influence on you. You should say: who this person is, how you know or knew them, what qualities or actions made them influential, and explain how they have affected the way you think or live. You have one minute to prepare." },
      { role: 'candidate', text: `The person I'd like to talk about is my first manager at work, who I'll call David. He was the team leader at the company where I got my first job in marketing, about six years ago, and he's one of the people I most credit for shaping the kind of professional I've become.

When I joined the company, I was fresh out of university — not short of ideas, but with very little understanding of how to actually work in a team, how to handle feedback, or how to think about my work from a business perspective. I was quite anxious and trying too hard to prove myself, which, looking back, was probably more of a liability than an asset.

What made David different from other managers I've had since was his approach to teaching. He never made you feel stupid for not knowing something. Whenever I asked a question — even a basic one — he'd answer it seriously and then explain the context around it. He once told me, "There are no stupid questions, only questions that weren't asked in time." That has stuck with me.

He also had a remarkable ability to give honest feedback without it feeling like a criticism of who you were as a person. He would say something like, "This plan works, but let me show you why it will cause problems in six months." It was always about the work, never about you. I try to apply that same approach when I give feedback to junior colleagues now.

But perhaps the most important thing I learned from him was how to be comfortable with not knowing everything. He was the most experienced person in the company, but he was also the most open about uncertainty. He'd say, "I'm not sure — let me think about it, or let's look it up together." That taught me that confidence isn't about having all the answers; it's about being comfortable with the process of finding them.

He moved abroad a few years ago, but I still occasionally message him when I'm facing a difficult decision. He's one of those rare people who genuinely invests in others without expecting anything in return, and I hope I carry some of that quality in how I work with people.` },
      { role: 'examiner', text: 'Do you think good mentors are important in the workplace?' },
      { role: 'candidate', text: "I think they're absolutely critical, especially early in a career. The gap between what you learn in university and what you need to succeed in a real job is enormous, and without good guidance, it's easy to develop bad habits or lose confidence. A good mentor can compress years of learning into months. But I think good mentorship is genuinely rare — it requires real expertise, communication skill, patience, and a genuine interest in other people's growth. Not everyone who knows a lot is able or willing to teach." },
    ],
    tips: [
      'Choose someone you can speak about with genuine feeling — it comes across in fluency and detail',
      'Don\'t just list qualities — show them through specific moments or examples',
      'Reported speech adds texture: "He once told me..." "He\'d say..."',
      'Connect their influence to your current behavior — "I try to apply that same approach"',
    ],
    keyPhrases: [
      'I most credit for shaping the kind of... I\'ve become',
      'trying too hard to prove myself',
      'That has stuck with me',
      'It was always about the work, never about you',
      'confidence isn\'t about having all the answers; it\'s about...',
      'carries some of that quality in how I...',
    ],
  },
  {
    id: 'ielts-15',
    title: 'Part 2 — Describe a Memorable Travel Experience',
    part: 'Part 2',
    topic: 'Travel & Places',
    description: 'Cue card: Describe a memorable trip or travel experience. Say where you went, who you went with, what you did, and explain why it was memorable.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a memorable trip you have taken. You should say: where you went, who you travelled with, what you did and saw there, and explain what made the experience memorable. You have one minute to prepare." },
      { role: 'candidate', text: `The trip I'd like to describe is a solo drive I made from my city to an old town about 100 kilometres north, over a mountain pass along the coast.

I did this trip on a whim, actually. It was a Sunday morning about two years ago. I had no particular plans, the weather was perfect, and on impulse I decided to drive north. I didn't plan a route or book anything. I just filled up the tank and headed toward the mountains.

The pass is one of the most spectacular roads in the country. It cuts through a long mountain range, with the ocean on one side and forested mountains on the other. As you gain altitude, the temperature drops noticeably and the air feels cleaner. At the top of the pass, there are old fortifications from a war long ago, and the view from there is breathtaking — you can see both the coastline of my city behind you and the long sweeping bay toward the town ahead of you. I stopped there for about an hour, had a cup of coffee from a small stall, and just sat and looked at the view. I remember thinking that moments like this are why I love living where I do.

Coming down the other side of the pass, the landscape changes completely. The beaches on that side are among the most beautiful I've ever seen — completely undeveloped, with calm turquoise water and almost nobody there. I stopped for a swim, which was completely spontaneous and completely wonderful.

What made the experience memorable wasn't any single dramatic event. It was the combination of the freedom of being alone on the road, the extraordinary scenery, the spontaneity of it all. When you travel with a plan, you're always trying to match reality to your expectations. When you go without a plan, every good thing that happens feels like a gift.

I came back that evening feeling genuinely refreshed in a way that a week of sitting on a beach resort never achieves for me. I think that kind of unplanned, local adventure is underrated.` },
      { role: 'examiner', text: 'Do you think solo travel and group travel have different benefits?' },
      { role: 'candidate', text: "Definitely. Solo travel forces you to be more independent and more open to the unexpected. When there's no one to consult, you make decisions faster and you end up in situations you'd never put yourself in with a group — talking to strangers, getting slightly lost, discovering things off the tourist trail. Group travel is better for sharing joy. Some experiences feel incomplete without someone to turn to and say, 'did you see that?' I think both are valuable, but for self-discovery, solo travel is hard to beat." },
    ],
    tips: [
      'Build a narrative arc: the setting up, the journey, the climax (the view, the swim), the reflection',
      'Use "on impulse," "on a whim," "spontaneously" to make the story feel alive',
      'Include a philosophical observation to show high-band reasoning',
      'Past continuous creates atmosphere: "the temperature was dropping," "the ocean was glittering"',
    ],
    keyPhrases: [
      'on a whim',
      'noticeably',
      'I remember thinking that...',
      'completely spontaneous and completely wonderful',
      'trying to match reality to your expectations',
      'every good thing that happens feels like a gift',
      'underrated',
    ],
  },
  {
    id: 'ielts-16',
    title: 'Part 3 — Arts, Culture & Creativity',
    part: 'Part 3',
    topic: 'Arts & Culture',
    description: 'A discussion about the role of arts, why governments fund culture, and what creativity means in the modern world.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why do you think arts and culture are important for society?' },
      { role: 'candidate', text: "Arts and culture serve several functions that are hard to replicate in other ways. On the most basic level, they provide a shared language — stories, music, images that a community holds in common and that bind people together. In my country, traditional folk songs carry centuries of history and identity. Losing those traditions would be losing a part of what makes us who we are.\n\nBeyond preservation, the arts also provide a space for exploring ideas and emotions that are too complex or uncomfortable for everyday conversation. Literature and film can address difficult topics — poverty, injustice, grief — in ways that create empathy and understanding. I think empathy is increasingly important in a fragmented, polarised world.\n\nAnd at the individual level, creativity and artistic expression are deeply tied to mental health and wellbeing. Making something — whether it's a painting, a poem, or a piece of music — is one of the most distinctly human activities there is." },
      { role: 'examiner', text: 'Should governments fund the arts, or should they focus on more pressing needs?' },
      { role: 'candidate', text: "This is a genuine tension, and I don't think there's a simple answer. My view is that cultural funding shouldn't be seen as a luxury that you get to once everything else is sorted — because everything else is never fully sorted. There are always hospitals to build and roads to repair. If you wait until there are no pressing needs to fund culture, you'll never fund culture.\n\nThe case for government arts funding rests on the fact that the arts generate public goods that the market won't adequately provide. Commercial culture tends toward what's popular and profitable — blockbuster films, pop music, celebrity culture. Government funding can support things that are valuable but not commercially viable: experimental theatre, folk music preservation, minority language literature.\n\nThat said, I think the level of funding should be proportionate, and governments should be transparent about how it's used. Art for art's sake is a valid principle, but public money needs some degree of public accountability." },
      { role: 'examiner', text: 'Do you think technology is changing the way people engage with arts and culture?' },
      { role: 'candidate', text: "Profoundly. In some ways, technology has democratised culture in remarkable ways. Anyone with a smartphone can access virtually the entire history of recorded music, watch films from any country, or read books from any era. A teenager in a remote village can discover a niche subgenre of Japanese jazz that their parents had no way of accessing.\n\nBut there's a paradox here. Even as access has become almost unlimited, consumption has become more algorithmic. Streaming platforms don't just give you access to everything — they actively push you toward what's similar to what you've already liked. This creates filter bubbles in culture, just as in news. People end up in very narrow aesthetic worlds despite having access to everything.\n\nI also worry about what the streaming economy does to artists. When a song generates a fraction of a cent per stream, and an artist gets paid for plays rather than ownership, the economic model for making art has fundamentally changed in ways that favour big labels and popular artists over independent and experimental ones." },
      { role: 'examiner', text: 'Is creativity something that can be taught, or is it innate?' },
      { role: 'candidate', text: "I think this is a false dichotomy. Creativity is both — there may be natural variation in creative inclination, just as with any other cognitive trait. But the idea that creativity is purely a gift that you either have or you don't is, I think, both incorrect and harmful. It lets people off the hook from developing a skill that can be cultivated.\n\nWhat we know from research on creativity is that it tends to flourish under certain conditions: broad exposure to different ideas and domains, a willingness to make and learn from mistakes, a tolerance for ambiguity, and dedicated time for unstructured thinking. These are all things that can be developed and that education systems can either encourage or discourage.\n\nIn my own experience at work, creativity isn't a mysterious inspiration that strikes you out of nowhere. It's the result of deeply understanding a problem, having a broad knowledge base to draw analogies from, and then giving your mind space to connect things. That process can definitely be learned." },
    ],
    tips: [
      'Part 3 arts questions reward you for showing you can think abstractly and philosophically',
      'Use academic frameworks naturally: "public goods," "democratised," "filter bubbles"',
      'Acknowledging tensions and complexities: "This is a genuine tension" shows maturity',
      'Bring in personal experience to ground abstract discussion',
      'Challenge false dichotomies: "I think this is a false dichotomy" is high-band framing',
    ],
    keyPhrases: [
      'a shared language that a community holds in common',
      'shouldn\'t be seen as a luxury that you get to once everything else is sorted',
      'generate public goods that the market won\'t adequately provide',
      'Profoundly',
      'there\'s a paradox here',
      'I think this is a false dichotomy',
      'lets people off the hook from...',
    ],
  },
  {
    id: 'ielts-17',
    title: 'Part 3 — Sports, Competition & Society',
    part: 'Part 3',
    topic: 'Sports & Leisure',
    description: 'A discussion about the role of competitive sport, professional sports culture, and the value of physical activity in modern society.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'What role do you think competitive sport plays in society?' },
      { role: 'candidate', text: "Competitive sport plays several interesting roles simultaneously. At the national level, it provides a form of collective identity and pride. When our national team qualifies for a football tournament or wins a medal at a regional games, there's a genuine sense of shared celebration that cuts across class, age, and region. It's one of the few things that can unite a whole country in a positive emotion at the same time.\n\nAt the individual and community level, sport teaches values that are genuinely hard to instil in other ways. Learning to compete fairly, to respect opponents, to win without arrogance and lose without bitterness — these are character lessons as much as physical ones. The discipline required to train seriously also builds qualities like perseverance and self-regulation.\n\nHowever, I think competitive sport can go too far when the pressure to win at all costs overrides these positive values. Doping scandals, match-fixing, the psychological damage inflicted on child athletes who are pushed too hard — these are real costs of a purely results-oriented approach to sport." },
      { role: 'examiner', text: 'Do you think professional athletes are paid too much?' },
      { role: 'candidate', text: "This is a question that seems obvious on the surface — of course a footballer earning fifty million dollars a year seems disproportionate when compared to a nurse or a teacher. But I think the economic logic is more complex than it appears.\n\nProfessional athletes in top-tier sports generate enormous revenue — television rights, merchandise, sponsorship, tourism. Their salaries are, in most cases, a small fraction of the commercial value they create. From a pure market perspective, the salaries reflect what the market is willing to pay for their skills. You can argue about whether the market is valuing the right things — and I'd agree it isn't — but the athletes themselves aren't extracting value unfairly.\n\nThe deeper issue is systemic: why does our society generate such enormous commercial value from entertainment and sport, but not from teaching or nursing? That's a question about values and priorities, and it can't be solved by capping athletes' salaries. It requires reimagining how we compensate essential work.\n\nThat said, I do think there's something uncomfortable about the sheer scale of wealth in professional sport, particularly when grassroots sport in many countries is underfunded." },
      { role: 'examiner', text: 'Should governments invest more in promoting sport among ordinary citizens?' },
      { role: 'candidate', text: "Absolutely, and I'd argue it's one of the most cost-effective public health investments a government can make. The economic cost of physical inactivity — through healthcare for preventable diseases like obesity, diabetes, and cardiovascular disease — is astronomical. Any investment in making sport accessible and affordable will generate significant savings downstream.\n\nBut beyond the purely economic argument, I think there's a quality-of-life dimension. People who exercise regularly are, on average, happier, more productive, and have better mental health. A society where people can easily access parks, swimming pools, courts, and trails is simply a better place to live.\n\nThe challenge is that sports infrastructure tends to concentrate in wealthier areas. If you live in an affluent suburb, you have good access to facilities. If you live in a poor urban neighbourhood, you might have nothing. Governments need to be intentional about distributing investment equitably rather than assuming the private sector will fill the gap." },
      { role: 'examiner', text: 'How do you think attitudes to sport will change over the next generation?' },
      { role: 'candidate', text: "I think we'll see a shift away from competitive, structured sport toward more informal, wellness-oriented physical activity. Younger generations seem less interested in joining clubs and teams and more interested in individual activities like running, cycling, yoga, or gym training that they can fit around their schedules. The rise of fitness tracking technology reinforces this — people are monitoring their own health metrics rather than competing with others.\n\nI also expect esports to continue growing and potentially being accepted as a mainstream sport. This is already happening — there are university esports scholarships and major international tournaments with audiences larger than many traditional sports. Whether you call it a sport is a semantic argument, but the competitive skill and dedication involved are real.\n\nAt the same time, I hope that traditional community sports — the local football league, the neighbourhood badminton court — don't disappear entirely. There's something important about physical sport as a communal, embodied experience that I don't think can be replicated on a screen." },
    ],
    tips: [
      'For controversial topics, state your view clearly but show you understand the counterargument',
      'Use economic reasoning to add depth: "cost-effective," "generate revenue," "downstream"',
      'The phrase "seems obvious on the surface... but" signals sophisticated thinking',
      'Future predictions: use "I expect," "I think we\'ll see," "likely to"',
      'Bring the answer back to human values at the end to show you\'re not purely analytical',
    ],
    keyPhrases: [
      'plays several interesting roles simultaneously',
      'cuts across class, age, and region',
      'when the pressure to win at all costs overrides these positive values',
      'the economic logic is more complex than it appears',
      'the deeper issue is systemic',
      'one of the most cost-effective public health investments',
      'generate significant savings downstream',
      'be intentional about distributing investment equitably',
    ],
  },
  {
    id: 'ielts-18',
    title: 'Part 3 — Environment & Climate Change',
    part: 'Part 3',
    topic: 'Environment',
    description: 'A discussion about environmental challenges, government responsibility, and what individuals can realistically do.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How serious do you think the problem of climate change is?' },
      { role: 'candidate', text: "I think it's the defining challenge of this century, and I say that without much exaggeration. The scientific consensus is overwhelming — global temperatures are rising, and the consequences are already visible: more intense storms, longer droughts, rising sea levels, shifting growing seasons. For a country like mine, which has a long coastline and a heavily agricultural economy, these aren't abstract future problems. The river delta in the south, which produces a large portion of our food, is already experiencing saltwater intrusion from sea-level rise.\n\nWhat I find particularly alarming is the pace of change. The natural world can adapt to gradual shifts, but the current rate of warming is happening over decades rather than millennia. Ecosystems and the communities that depend on them don't have time to adjust.\n\nThat said, I try not to fall into pure despair about it, because despair is unproductive. There are genuine reasons for cautious optimism — renewable energy costs have fallen dramatically, electric vehicles are becoming mainstream, and international frameworks like the Paris Agreement, however imperfect, represent real political will." },
      { role: 'examiner', text: 'Who bears the most responsibility for addressing climate change — governments, corporations, or individuals?' },
      { role: 'candidate', text: "I think it's primarily governments and corporations, and I'd push back on the narrative that individual behavior is the main lever.\n\nThe idea that personal choices — reusable bags, shorter showers, vegetarian diets — are the solution to climate change is, I think, largely a distraction that was strategically promoted by the fossil fuel industry in the 1970s and 80s to shift responsibility from themselves onto consumers. The carbon footprint concept itself was popularised by BP. That context matters.\n\nThe structural changes needed to address climate change — decarbonising energy grids, electrifying transport, retrofitting buildings, transforming agriculture — require the scale of action that only governments and large corporations can deliver. Individual choices operate at the margin.\n\nThat's not to say individuals should do nothing. Setting an example, voting for policies that support climate action, and participating in public discourse about the issue are all meaningful. But I think placing the weight of responsibility on individuals is both empirically wrong and psychologically damaging — it creates climate anxiety without commensurate agency." },
      { role: 'examiner', text: 'Do you think developing countries should be expected to reduce their carbon emissions at the same rate as developed countries?' },
      { role: 'candidate', text: "No, and I think this is a matter of basic fairness. The current level of carbon dioxide in the atmosphere is primarily the result of two centuries of industrialisation in Europe, North America, and Japan. Those countries built their wealth on cheap fossil fuels. To now tell developing countries that they cannot use those same fuels to lift their populations out of poverty — unless they can afford expensive clean technology — is a form of hypocrisy.\n\nThe principle of 'common but differentiated responsibilities,' which is embedded in international climate agreements, reflects this reality. Developed countries have a greater historical responsibility and greater financial capacity to act first and most aggressively.\n\nIn practice, this means developed nations should be financing the clean energy transition in developing countries, not just expecting them to make sacrifices that the rich world didn't make at the equivalent stage of development. There's been some progress on climate finance, but nowhere near the scale needed.\n\nThis isn't to let developing countries off the hook entirely — the decisions made now about energy infrastructure will lock in emissions for decades. But the terms of engagement need to be fair." },
      { role: 'examiner', text: 'Are you optimistic or pessimistic about the future of the environment?' },
      { role: 'candidate', text: "I'd call myself a realistic optimist, which might sound like a contradiction but reflects where I genuinely land on this.\n\nI'm pessimistic about the short term. The window to limit warming to 1.5 degrees Celsius — the safer target — has probably already closed, and 2 degrees is becoming increasingly difficult. Some degree of climate damage is now locked in, and communities around the world — particularly poorer ones — will suffer for it.\n\nBut I'm optimistic about human ingenuity and adaptability over the longer term. The energy transition is genuinely happening — not fast enough, but the direction of travel is clear. Renewables are cheaper than fossil fuels in most of the world now. Battery technology is improving rapidly. A generation of young people has grown up understanding that this is the central challenge of their lifetime, and I believe they will bring different values to politics, business, and culture.\n\nI think the honest answer is that the future of the environment isn't predetermined — it will be shaped by decisions made over the next ten to twenty years, by governments, companies, and yes, by people. That uncertainty is both frightening and motivating." },
    ],
    tips: [
      'Use precise qualifying language for strong opinions: "I\'d push back on the narrative that..."',
      'Historical context demonstrates depth: knowing who popularised the carbon footprint concept',
      'The principle of equity in international negotiations ("common but differentiated responsibilities") is high-value content',
      'Resist false binary conclusions — "realistic optimist" is more compelling than "optimistic" or "pessimistic"',
      'End with a statement about human agency — examiners reward forward-looking, empowered thinking',
    ],
    keyPhrases: [
      'I say that without much exaggeration',
      'aren\'t abstract future problems',
      'despair is unproductive',
      'I\'d push back on the narrative that...',
      'operates at the margin',
      'commensurate agency',
      'a form of hypocrisy',
      'lock in emissions for decades',
      'a realistic optimist',
      'the direction of travel is clear',
      'the future... isn\'t predetermined',
    ],
  },

  {
    id: 'ielts-8',
    title: 'Part 3 — Health & Modern Lifestyle',
    part: 'Part 3',
    topic: 'Health & Lifestyle',
    description: 'Discussion about health challenges in modern life, work-life balance, and the role of mental health.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Do you think people today are healthier than in the past?' },
      { role: 'candidate', text: "It's a paradox, really. In many ways, we're healthier than ever before. Life expectancy has increased dramatically over the past century. We've virtually eliminated many diseases through vaccination, and medical technology can now treat conditions that were once fatal. Access to clean water, sanitation, and nutrition has improved for billions of people.\n\nBut at the same time, we're facing new health challenges that didn't really exist in the past. Sedentary lifestyles are a huge problem — many people, myself included, spend most of the day sitting. Processed food has become the default for millions of people, leading to rising rates of obesity, diabetes, and heart disease. And mental health issues — anxiety, depression, burnout — are reaching epidemic proportions in many countries.\n\nSo I'd say we've traded one set of health problems for another. We've conquered many infectious diseases, but we're now struggling with chronic lifestyle diseases. Whether we're 'healthier' overall depends on how you define health." },
      { role: 'examiner', text: 'Why do you think mental health problems are increasing?' },
      { role: 'candidate', text: "I think there are several interconnected factors. First, modern life is genuinely more stressful in certain ways. The pace of work has intensified — we're expected to be constantly available, constantly productive. The boundary between work and personal life has eroded, especially for knowledge workers. You might technically finish work at six, but your email follows you home.\n\nSecond, social media and constant comparison are taking a toll. We're exposed to carefully curated versions of other people's lives, which makes our own lives seem inadequate by comparison. This is especially damaging for young people who are still forming their identity and self-worth.\n\nThird, and this is often overlooked, traditional sources of meaning and community have weakened. In many societies, religious attendance has declined, families are more geographically dispersed, and neighborhood communities are less tight-knit than they once were. These structures used to provide a sense of belonging and purpose that's now missing for many people.\n\nThat said, I should note that part of the apparent increase in mental health problems is actually increased awareness and reduced stigma. People are more willing to talk about mental health and seek help, which is a positive development. But even accounting for that, the research suggests there is a genuine increase in prevalence, not just reporting." },
      { role: 'examiner', text: 'What responsibility do employers have for their employees\' health?' },
      { role: 'candidate', text: "I believe employers have a significant responsibility, and it goes beyond just providing health insurance. At a minimum, companies should ensure that their work environment doesn't actively harm employees' health — that means reasonable working hours, adequate breaks, ergonomic workspaces, and a culture that doesn't glorify overwork.\n\nBeyond that minimum, I think forward-thinking companies should actively promote wellbeing. This could include things like flexible working arrangements, mental health support or counseling services, encouraging physical activity, and training managers to recognize signs of burnout in their teams.\n\nIn many industries in my country, there's still often a culture of working long hours and wearing exhaustion as a badge of honor. I've seen colleagues work twelve-hour days consistently, skip meals, and sacrifice sleep to meet deadlines. Some companies even celebrate this as 'dedication.' I think this is deeply misguided — it leads to burnout, turnover, and actually lower productivity in the long run.\n\nHowever, I also believe individuals bear some responsibility for their own health. You can't expect your company to force you to exercise or eat well. Ideally, it should be a partnership — the employer creates conditions that support health, and the employee takes advantage of those conditions." },
      { role: 'examiner', text: 'How do you think attitudes toward health will change in the future?' },
      { role: 'candidate', text: "I'm hopeful that we'll see a more holistic understanding of health take hold. Currently, many people still think of health primarily in physical terms — am I sick or not? But I think the younger generation is already shifting toward a broader view that includes mental health, social connection, and overall life satisfaction as components of being healthy.\n\nI also expect that preventive health will become much more important relative to reactive treatment. Technology like wearable devices, genetic testing, and AI-powered health monitoring will allow people to identify health risks before they become problems. Instead of going to the doctor when you're already sick, you'll receive an alert that your stress levels have been elevated for two weeks and be prompted to take action.\n\nIn terms of work culture, I think the pandemic accelerated a shift that was already underway. More companies are recognizing that burnt-out, unhealthy employees are neither productive nor loyal. The competition for talent means that companies that offer genuine work-life balance and health support will have an advantage in attracting top people.\n\nMy hope is that in twenty or thirty years, the idea that someone should sacrifice their health for their job will seem as outdated as the idea of smoking in the office does today." },
    ],
    tips: [
      'Part 3 rewards sophisticated thinking — show you can analyze complex issues',
      'Use academic/formal vocabulary naturally: "epidemic proportions," "interconnected factors"',
      'Give specific examples from your own country or experience to support general points',
      'Don\'t just give opinions — consider multiple perspectives and counterarguments',
      'Use conditional and speculative language for future predictions',
    ],
    keyPhrases: [
      'It\'s a paradox, really',
      'I\'d say we\'ve traded one set of... for another',
      'It depends on how you define...',
      'There are several interconnected factors',
      'This is often overlooked...',
      'That said, I should note that...',
      'I believe... and it goes beyond just...',
      'This is deeply misguided',
      'Ideally, it should be a partnership',
      'My hope is that...',
    ],
  },

  // ── Part 1: Additional Topics ──────────────────────────────
  {
    id: 'ielts-19',
    title: 'Part 1 — Travel & Holidays',
    part: 'Part 1',
    topic: 'Travel & Places',
    description: 'Part 1 questions about holidays, travel preferences, and how you like to spend time away from home.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you enjoy travelling?' },
      { role: 'candidate', text: "Very much so, yes. I try to take at least two or three short trips a year, usually within my own country. What I enjoy most isn't really the sightseeing — it's the change of perspective. When you're in an unfamiliar place, you notice things again: the way people talk, what they eat, how they organise their day. Living in the same city, you stop seeing it after a while. Travelling resets that for me." },
      { role: 'examiner', text: 'Where did you go on your last holiday?' },
      { role: 'candidate', text: "I went to a small town up in the mountains, about ten hours from my city by bus. It's famous for its cool climate, pine forests, and coffee plantations, which is a real contrast to the heat on the coast. I spent four days there mostly walking around, visiting local farms, and drinking an unreasonable amount of coffee. It was very low-key, which was exactly what I needed at the time." },
      { role: 'examiner', text: 'Do you prefer travelling alone or with other people?' },
      { role: 'candidate', text: "It depends on what I want out of the trip. When I travel alone, I have complete freedom — I can change plans on a whim, stay somewhere longer, or leave early if I'm not enjoying it. That flexibility is quite addictive. But travelling with friends means you have someone to share the experience with, and honestly, some memories are better when someone else remembers them too. I'd say I lean slightly toward solo travel, but I wouldn't want to do only that." },
      { role: 'examiner', text: 'What kind of places do you like to visit?' },
      { role: 'candidate', text: "I'm drawn to places with mountains or coastline rather than big cities. I already live in a city, so a holiday in another crowded urban centre doesn't really feel like a break. I also love places that still have a strong local character — small towns where the food and the daily rhythm haven't been reshaped for tourists. Those places are getting harder to find, unfortunately." },
      { role: 'examiner', text: 'Would you like to travel abroad more in the future?' },
      { role: 'candidate', text: "Definitely. So far I've mostly travelled within my own region, and there's a lot I still want to see. Japan is at the top of my list, partly for the food and partly because I'm curious about how they combine tradition with such advanced technology. I'd also love to spend a longer period somewhere English-speaking — not as a tourist, but actually living there for a few months, because I think that's when you really learn a place." },
    ],
    tips: [
      'Give a reason behind a preference — "It depends on what I want out of the trip" scores higher than a flat answer',
      'Name specific places and time frames; vague answers sound rehearsed',
      'Use "would like to" and "I\'d love to" for future plans — a natural way to show conditional forms',
      'A short opinion aside ("which is getting harder to find") adds fluency without lengthening the answer much',
    ],
    keyPhrases: [
      "What I enjoy most isn't really... — it's...",
      'Travelling resets that for me',
      'which was exactly what I needed at the time',
      'That flexibility is quite addictive',
      "I'm drawn to places with...",
      "that's when you really learn a place",
    ],
  },
  {
    id: 'ielts-20',
    title: 'Part 1 — Health & Exercise',
    part: 'Part 1',
    topic: 'Health & Lifestyle',
    description: 'Part 1 questions about staying healthy, exercise routines, and attitudes toward fitness.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you do much exercise?' },
      { role: 'candidate', text: "More than I used to, though probably less than I should. I play badminton a couple of times a week and try to run along the river two or three evenings. I've learned that I need exercise that feels social or enjoyable — going to a gym and lifting weights alone never lasted more than a month for me. If it feels like a chore, I stop doing it." },
      { role: 'examiner', text: 'How do you usually stay healthy?' },
      { role: 'candidate', text: "I focus on the basics rather than anything complicated. Regular sleep is the big one — I've noticed that when I sleep badly, everything else falls apart: my diet, my concentration, my mood. Beyond that, I try to eat home-cooked or simple local food rather than processed things, and I make a point of standing up and walking around every hour or so while working. Small habits, but they add up." },
      { role: 'examiner', text: 'Do you think people in your country lead a healthy lifestyle?' },
      { role: 'candidate', text: "It's changing, and not entirely for the better. Traditional food in my country is genuinely healthy — lots of fresh herbs, vegetables, soups, not much dairy or heavy fat. And older generations were very active because daily life involved a lot of walking and physical work. But among younger people in cities, fast food and long hours in front of screens are becoming normal, and you can see the effect. On the positive side, there's also a growing fitness culture — many more gyms and running clubs than five years ago." },
      { role: 'examiner', text: 'What could be done to encourage people to exercise more?' },
      { role: 'candidate', text: "I think the environment matters more than telling people to exercise. If a city has safe pavements, parks, and cycle lanes, people will naturally move more without thinking of it as exercise. My city has actually done this quite well with the riverside walkways — you see hundreds of people out every evening. Workplaces could help too, by not making long hours a badge of honour, because when people finish at nine at night, exercise is the first thing to disappear." },
    ],
    tips: [
      'Honest, slightly self-critical answers ("less than I should") sound natural and confident',
      'Use cause-and-effect chains to extend answers: "when I sleep badly, everything else falls apart"',
      'For "what could be done" questions, propose a concrete measure and give a local example',
      'Contrast generations or time periods to demonstrate a range of tenses',
    ],
    keyPhrases: [
      'More than I used to, though probably less than I should',
      'If it feels like a chore, I stop doing it',
      'I focus on the basics rather than anything complicated',
      'Small habits, but they add up',
      "It's changing, and not entirely for the better",
      'people will naturally move more without thinking of it as exercise',
    ],
  },
  {
    id: 'ielts-21',
    title: 'Part 1 — Weather & Seasons',
    part: 'Part 1',
    topic: 'Environment',
    description: 'Part 1 questions about weather, seasons, and how climate affects daily life and mood.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'What is the weather like in your country?' },
      { role: 'candidate', text: "My country is quite long, so the weather varies a lot from north to south. In my city, which is on the coast, we have roughly two seasons: a dry season from around February to August, which can get extremely hot — well over thirty-five degrees — and a rainy season from September to December, when we get heavy downpours and sometimes typhoons. There's no real winter here, which people from the north find strange when they visit." },
      { role: 'examiner', text: 'Which season do you prefer?' },
      { role: 'candidate', text: "I'd say the early dry season, around March and April. The heat hasn't become oppressive yet, the sea is calm, and it's perfect weather for being outside in the evening. The peak of summer is honestly too much — by June you're planning your whole day around avoiding the sun. And the rainy season, while dramatic and beautiful in its own way, makes it hard to get anywhere without getting soaked." },
      { role: 'examiner', text: 'Does the weather affect your mood?' },
      { role: 'candidate', text: "More than I'd like to admit. On grey, rainy days I find it much harder to concentrate, and I tend to stay indoors, which makes it worse. Bright weather has the opposite effect — I get up earlier, I'm more inclined to exercise, and I generally feel more motivated. I've read that this is partly to do with sunlight and sleep cycles, so it's not purely psychological." },
      { role: 'examiner', text: 'Do you check the weather forecast?' },
      { role: 'candidate', text: "Almost every morning, especially during the rainy season. Because a lot of people here get around on two wheels, rain isn't a minor inconvenience — it changes what you wear, when you leave, and sometimes whether you go at all. During typhoon season, everyone follows the forecast very closely, since serious storms can mean flooded streets and days without electricity." },
    ],
    tips: [
      'Use precise weather vocabulary: "downpour," "oppressive," "typhoon," "grey"',
      'Give numbers where you can — temperatures and months make answers concrete',
      'Explain why something matters in your context ("rain isn\'t a minor inconvenience")',
      'Small admissions of feeling ("more than I\'d like to admit") sound natural and fluent',
    ],
    keyPhrases: [
      'varies a lot from north to south',
      "The heat hasn't become oppressive yet",
      "you're planning your whole day around avoiding the sun",
      "More than I'd like to admit",
      "it's not purely psychological",
      'rain changes what you wear, when you leave, and whether you go at all',
    ],
  },
  {
    id: 'ielts-22',
    title: 'Part 1 — Friends & Social Life',
    part: 'Part 1',
    topic: 'Society & Culture',
    description: 'Part 1 questions about friendship, socialising, and how people keep in touch.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you have many friends?' },
      { role: 'candidate', text: "Not a huge number, but a few very close ones. I'd say I have maybe four or five people I could call at midnight if something went wrong, and then a wider circle of colleagues and acquaintances I enjoy spending time with. I've come to prefer it that way — when I was younger I tried to maintain a very large social circle, and it was exhausting and quite shallow." },
      { role: 'examiner', text: 'How did you meet your best friend?' },
      { role: 'candidate', text: "We met at university, in the first week actually. We were assigned to the same group project, which is usually a recipe for disaster, but in our case it worked out well. We had a similar sense of humour and both took the work seriously, which built a lot of trust early on. That was almost ten years ago, and even though he now lives in another city, we still speak most weeks." },
      { role: 'examiner', text: 'What do you usually do with your friends?' },
      { role: 'candidate', text: "Mostly very ordinary things — eating out, sitting in coffee shops for hours, sometimes playing badminton or going for a ride out of the city on weekends. Social life here revolves heavily around food, so a lot of our meetups are just long meals where the eating stops and the conversation continues. Occasionally we'll do something more organised like a short trip, but honestly the simple things happen more often." },
      { role: 'examiner', text: 'Is it easy to make new friends as an adult?' },
      { role: 'candidate', text: "Harder than it was at school, definitely. At university you're thrown together with the same people every day, and friendship develops almost by accident. As an adult you have to be deliberate about it — you have to actually invite someone, follow up, make time. I've found shared activities work best. My badminton group started as colleagues and turned into real friendships because we saw each other regularly without it being forced." },
    ],
    tips: [
      'Quality-over-quantity answers give you something interesting to say beyond a number',
      'Use a story to answer "how did you meet" — a short narrative shows past tenses naturally',
      'Comparatives are useful here: "harder than it was at school"',
      'Add a cultural observation to lift an ordinary answer',
    ],
    keyPhrases: [
      'people I could call at midnight if something went wrong',
      "I've come to prefer it that way",
      'which is usually a recipe for disaster',
      'the eating stops and the conversation continues',
      'friendship develops almost by accident',
      'you have to be deliberate about it',
    ],
  },
  {
    id: 'ielts-23',
    title: 'Part 1 — Art & Creativity',
    part: 'Part 1',
    topic: 'Arts & Culture',
    description: 'Part 1 questions about art, drawing, museums, and creativity in everyday life.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Are you interested in art?' },
      { role: 'candidate', text: "Yes, though as an observer rather than a practitioner. I'm not a painter or a musician, but I pay a lot of attention to design and visual composition, partly because of my work — putting together campaign visuals is a kind of applied art. I also enjoy photography, mostly street photography around my city. I wouldn't call it serious, but it has changed how I look at ordinary scenes." },
      { role: 'examiner', text: 'Did you learn to draw or paint at school?' },
      { role: 'candidate', text: "We had art classes, but they were quite basic and honestly treated as a minor subject. Most of the emphasis was on maths, science, and languages. I remember enjoying the classes, but I don't think anyone ever suggested that art could be a serious path. Looking back, that's a bit of a shame — I think creative subjects teach a different kind of thinking that's genuinely useful later on." },
      { role: 'examiner', text: 'Do you ever visit art galleries or museums?' },
      { role: 'candidate', text: "Occasionally, though not as often as I'd like. My city has a small sculpture museum, which is genuinely impressive — it holds artefacts from an ancient civilisation going back over a thousand years. When I travel, museums are usually on my list, because they give you context that you can't get from just walking around a city. I prefer smaller museums, honestly; the huge ones are overwhelming and you end up absorbing very little." },
      { role: 'examiner', text: 'Do you think art is important for children?' },
      { role: 'candidate', text: "Very much so. Children learn to express things through drawing or music long before they can articulate them in words, so art gives them an outlet. Beyond that, it teaches them that there isn't always one correct answer, which is quite a valuable lesson in an education system built around exams. I don't think every child needs to become an artist, but every child benefits from making something." },
    ],
    tips: [
      'You don\'t need expertise — an honest, thoughtful position on art scores well',
      'Link the topic to your own life or work to keep answers personal',
      'Mild criticism of your own education system is fine and shows evaluative language',
      'Useful hedges here: "as an observer rather than a practitioner," "I wouldn\'t call it serious"',
    ],
    keyPhrases: [
      'as an observer rather than a practitioner',
      'a kind of applied art',
      'it has changed how I look at ordinary scenes',
      "Looking back, that's a bit of a shame",
      'they give you context you can\'t get from just walking around',
      "there isn't always one correct answer",
    ],
  },
  {
    id: 'ielts-24',
    title: 'Part 1 — Learning Languages',
    part: 'Part 1',
    topic: 'Work & Study',
    description: 'Part 1 questions about studying English and other languages, and how language learning fits into your life.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'How long have you been learning English?' },
      { role: 'candidate', text: "Formally, since primary school, so more than fifteen years in total. But I'd say I only started learning it properly about four years ago, when I began working with international clients. Before that it was very passive — grammar exercises, vocabulary lists, reading comprehension. It's only when you have to actually use a language for something real that it starts to stick." },
      { role: 'examiner', text: 'What is the most difficult part of learning English for you?' },
      { role: 'candidate', text: "Listening in fast, natural conversation, especially with unfamiliar accents. Written English or a slow, clear speaker is fine, but when several native speakers are talking casually — using contractions, slang, and cultural references — I still lose the thread sometimes. Pronunciation is a challenge too, because my first language doesn't have many of the final consonant sounds that English relies on, so words like 'asked' are physically awkward to say." },
      { role: 'examiner', text: 'Do you think it is important to learn a foreign language?' },
      { role: 'candidate', text: "Extremely, and not only for career reasons. Obviously English has opened doors professionally — I can read industry reports, work with people abroad, and take part in online professional communities. But there's a subtler benefit: learning another language forces you to see that your own way of expressing ideas isn't the only one. It makes you a bit more humble and, I think, more curious." },
      { role: 'examiner', text: 'Would you like to learn another language?' },
      { role: 'candidate', text: "I would, though I'm wary of starting one before my English is really solid. If I did, I'd probably choose Japanese, partly because of the number of Japanese companies operating in my country, and partly out of genuine interest in the culture. I'm under no illusions about how hard it would be — three writing systems and a very different grammar — but that's part of the appeal." },
    ],
    tips: [
      'Distinguishing "formally" from "properly" gives you a richer answer than a number of years',
      'Naming a specific difficulty with an explanation shows precision and self-awareness',
      'Talk about benefits beyond the obvious ones — examiners notice depth of reasoning',
      'Phrases like "I\'m wary of," "I\'m under no illusions about" lift your lexical band',
    ],
    keyPhrases: [
      'It\'s only when you have to use a language for something real that it starts to stick',
      'I still lose the thread sometimes',
      'physically awkward to say',
      'It has opened doors professionally',
      "your own way of expressing ideas isn't the only one",
      "I'm under no illusions about how hard it would be",
    ],
  },
  {
    id: 'ielts-25',
    title: 'Part 1 — Mobile Phones & Apps',
    part: 'Part 1',
    topic: 'Technology',
    description: 'Part 1 questions about phone use, favourite apps, and dependence on mobile devices.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'How often do you use your mobile phone?' },
      { role: 'candidate', text: "Far too often, if I'm honest. My screen time report says around four hours a day, which is a slightly uncomfortable number to look at. A good portion of that is messaging and work-related, but there's definitely an element of picking it up out of habit rather than need. I've started leaving it in another room when I'm doing focused work, which helps more than I expected." },
      { role: 'examiner', text: 'What do you mainly use your phone for?' },
      { role: 'candidate', text: "Messaging is number one, mostly one app for friends and family and another for work. After that, maps and ride-hailing apps — living in a busy city where traffic is unpredictable, those are essential. I also use it a lot for payments now; almost everywhere in my city accepts QR code transfers, so I rarely carry cash. And podcasts, which I listen to while commuting or walking." },
      { role: 'examiner', text: 'Which app do you find most useful?' },
      { role: 'candidate', text: "Probably my banking app, which sounds unglamorous but it has genuinely changed daily life here. Ten years ago you'd queue at a bank branch to transfer money; now it takes five seconds and works instantly, even between different banks. For learning, I'd say Anki — it's a flashcard app that uses spaced repetition, and it's the single most effective tool I've used for building English vocabulary." },
      { role: 'examiner', text: 'Do you think people rely too much on their phones?' },
      { role: 'candidate', text: "In some ways, yes, though I try not to be too moralistic about it since I'm hardly innocent. The concerning part isn't the amount of time so much as the reflexiveness — reaching for your phone in every quiet moment, so you never sit with your own thoughts. I do think we've lost some tolerance for boredom, and there's decent evidence that boredom is where a lot of creative thinking actually comes from." },
    ],
    tips: [
      'Self-aware honesty ("far too often, if I\'m honest") is more engaging than a defensive answer',
      'Name real apps and describe what they do — it demonstrates explanatory vocabulary',
      'Avoid preaching: "I try not to be too moralistic about it" is a graceful hedge',
      'End an opinion answer with a slightly surprising idea to leave a strong impression',
    ],
    keyPhrases: [
      "Far too often, if I'm honest",
      'picking it up out of habit rather than need',
      'which sounds unglamorous but...',
      "I'm hardly innocent",
      "The concerning part isn't... so much as...",
      "we've lost some tolerance for boredom",
    ],
  },
  {
    id: 'ielts-26',
    title: 'Part 1 — Shopping',
    part: 'Part 1',
    topic: 'Home & Living',
    description: 'Part 1 questions about shopping habits, markets versus supermarkets, and online purchasing.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you enjoy shopping?' },
      { role: 'candidate', text: "Not particularly, no. I see it as something to be completed efficiently rather than enjoyed. If I need something, I'll research it carefully, buy it, and that's the end of it. The idea of wandering around a shopping mall for an afternoon with no specific purpose is genuinely unappealing to me — though I know plenty of people find it relaxing." },
      { role: 'examiner', text: 'Do you prefer shopping online or in physical shops?' },
      { role: 'candidate', text: "Online for anything standardised — electronics, books, household items — because it's faster, usually cheaper, and I can compare options properly. But for food, and especially fresh produce, I strongly prefer buying in person. There's a wet market near my apartment where the vegetables and fish are far fresher than anything in a supermarket, and the prices are better too." },
      { role: 'examiner', text: 'Have shopping habits changed in your country in recent years?' },
      { role: 'candidate', text: "Dramatically. Big e-commerce platforms have exploded, and delivery is remarkably fast and cheap. Cashless payment has become the default in cities — most street food vendors now display a QR code. Traditional markets still exist and are still important, particularly for older generations, but you can see the shift happening year by year. I suspect in ten years the market culture will look quite different." },
      { role: 'examiner', text: 'Do you think people buy too many things they do not need?' },
      { role: 'candidate', text: "Yes, and I think the way online shopping is designed encourages it. Everything is engineered to remove friction — one-click purchases, saved cards, flash sales with countdown timers. It's very easy to buy something before you've properly asked yourself whether you want it. I've adopted a simple rule of waiting a few days before buying anything non-essential, and I'd say around half the time the impulse just disappears." },
    ],
    tips: [
      'A negative answer is perfectly acceptable — just justify it clearly',
      'Split your preference by category ("online for X, in person for Y") to extend your answer naturally',
      'Describing change over time invites the present perfect: "have exploded," "has become"',
      'Sharing a personal rule or strategy makes an opinion answer more memorable',
    ],
    keyPhrases: [
      'something to be completed efficiently rather than enjoyed',
      "that's the end of it",
      'for anything standardised',
      'you can see the shift happening year by year',
      'engineered to remove friction',
      'the impulse just disappears',
    ],
  },
  {
    id: 'ielts-27',
    title: 'Part 1 — Reading & Books',
    part: 'Part 1',
    topic: 'Media & Entertainment',
    description: 'Part 1 questions about reading habits, types of books, and reading in childhood.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you like reading?' },
      { role: 'candidate', text: "I do, though my reading is quite narrow. I read a lot of non-fiction — biographies, popular science, books about technology and psychology. Fiction I read much less often, which I sometimes regret, because I think novels build empathy in a way that non-fiction doesn't. I usually manage a book a month, mostly in the evenings before sleeping." },
      { role: 'examiner', text: 'Did you read a lot as a child?' },
      { role: 'candidate', text: "Yes, quite a lot, though books were less available than they are now. I remember reading a lot of local folk tales and comics, and later translated adventure novels. My parents weren't big readers themselves, but they never discouraged it, and there was a small library near my school that I used constantly. I think that habit is the reason reading still feels like a pleasure rather than a task." },
      { role: 'examiner', text: 'Do you prefer physical books or e-books?' },
      { role: 'candidate', text: "Physical books, for a slightly irrational reason — I remember things better when I've physically turned the pages and can picture roughly where on the page something was. That said, I read e-books quite often for practical reasons: they're cheaper, instantly available, and English books in particular are hard to find in physical shops here. So my preference and my behaviour don't quite match." },
      { role: 'examiner', text: 'Do you think people read less than they used to?' },
      { role: 'candidate', text: "I think people read differently rather than less. If you count articles, threads, subtitles, and messages, people probably process more written words than any generation before. What has declined is sustained, deep reading — sitting with one long text for an hour without interruption. That's a real loss, because that kind of concentration is where you actually absorb complex ideas." },
    ],
    tips: [
      'Admitting a limitation ("my reading is quite narrow") gives you something to elaborate on',
      'Childhood questions call for past simple plus "used to" and "would"',
      'Reframing the question — "people read differently rather than less" — shows strong analytical language',
      'Noticing a contradiction in your own behaviour sounds mature and natural',
    ],
    keyPhrases: [
      'which I sometimes regret',
      'they never discouraged it',
      'reading still feels like a pleasure rather than a task',
      "my preference and my behaviour don't quite match",
      'people read differently rather than less',
      'sustained, deep reading',
    ],
  },
  {
    id: 'ielts-28',
    title: 'Part 1 — Free Time & Weekends',
    part: 'Part 1',
    topic: 'Sports & Leisure',
    description: 'Part 1 questions about free time, weekends, and how you relax after work.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'What do you usually do in your free time?' },
      { role: 'candidate', text: "It varies with how much energy I have left. On a normal weekday evening, it's fairly low-effort — reading, a podcast, cooking something simple, or a walk along the river. At weekends I'm more ambitious: a longer bike ride, badminton with friends, or working on a side project. I've realised I need both kinds of free time, the restful and the active." },
      { role: 'examiner', text: 'Do you have enough free time?' },
      { role: 'candidate', text: "Broadly, yes, though it's uneven. When we're approaching a big deadline at work, my free time shrinks to almost nothing for a couple of weeks. Then things settle and I have more than I know what to do with. What I lack isn't hours so much as uninterrupted stretches — an evening with nothing scheduled feels far more valuable than three separate free hours." },
      { role: 'examiner', text: 'How do you usually spend your weekends?' },
      { role: 'candidate', text: "Saturday tends to be the social day — meeting friends, a long lunch, maybe an outing somewhere near the city. Sunday I deliberately keep quieter. I'll do the practical things like cleaning and cooking for the week, then read or work on something creative in the afternoon. I've found that if I fill both days completely, Monday feels much harder." },
      { role: 'examiner', text: 'Has the way you spend your free time changed over the years?' },
      { role: 'candidate', text: "Quite a lot. As a student, free time was almost entirely social — being out with friends until late, without much planning. Now I value quiet more, and I'm far more selective about what I say yes to. I also spend more of it outdoors, which is a deliberate correction, since I sit in front of a screen all day for work." },
    ],
    tips: [
      'Splitting weekday and weekend routines is an easy way to extend a short answer',
      'Distinguish quantity from quality ("what I lack isn\'t hours so much as uninterrupted stretches")',
      'Use "I\'ve realised / I\'ve found" to introduce reflective statements',
      'Then-and-now contrasts naturally show past and present tenses side by side',
    ],
    keyPhrases: [
      'It varies with how much energy I have left',
      'more than I know what to do with',
      "What I lack isn't hours so much as...",
      'I deliberately keep quieter',
      "I'm far more selective about what I say yes to",
      'which is a deliberate correction',
    ],
  },
  {
    id: 'ielts-29',
    title: 'Part 1 — Coffee, Tea & Drinks',
    part: 'Part 1',
    topic: 'Food & Culture',
    description: 'Part 1 questions about drinks, coffee culture, and social habits around cafés.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you drink coffee or tea?' },
      { role: 'candidate', text: "Coffee, almost exclusively — strong black coffee, which is and usually made with a small metal filter. I have one in the morning without fail, and often a second one mid-afternoon. Tea I drink mainly in social situations; when you visit someone's house here, green tea is offered almost automatically, so it's more of a ritual than a preference." },
      { role: 'examiner', text: 'Is coffee popular in your country?' },
      { role: 'candidate', text: "Enormously. There are coffee shops on almost every street, and locally it's much more than a drink — it's the default setting for socialising. Meeting a friend, discussing business, or just passing an hour all happen in a café. Prices range from almost nothing at a pavement stall to five times that in a modern coffee shop, so there's something for everyone." },
      { role: 'examiner', text: 'Where do you usually go to drink coffee?' },
      { role: 'candidate', text: "It depends on the purpose. If I'm meeting friends, we'll go to one of the riverside cafés with outdoor seating. If I want to work, I look for somewhere quieter with reliable wifi and decent air conditioning — there are several places near my apartment that are basically informal co-working spaces. And on ordinary mornings I just make it at home, which is cheaper and honestly tastes better." },
      { role: 'examiner', text: 'Do you think drinking too much coffee is bad for health?' },
      { role: 'candidate', text: "In excess, probably, like most things. I notice it clearly in my own sleep — if I have coffee after about four in the afternoon, I'll lie awake later that night. So I've set myself a cut-off time. But in moderate amounts, the research I've read suggests it's fairly harmless and may even have some benefits. The bigger problem is arguably the sugar and condensed milk that often come with it here." },
    ],
    tips: [
      'Cultural explanation adds depth: describe the social role, not just the drink',
      'Prices, times, and quantities make answers concrete and specific',
      '"It depends on the purpose" is a reliable structure for extending an answer',
      'Hedge health claims: "the research I\'ve read suggests," "in moderate amounts"',
    ],
    keyPhrases: [
      'almost exclusively',
      'without fail',
      "it's more of a ritual than a preference",
      'the default setting for socialising',
      'basically informal co-working spaces',
      "I've set myself a cut-off time",
    ],
  },
  {
    id: 'ielts-30',
    title: 'Part 1 — Transport & Getting Around',
    part: 'Part 1',
    topic: 'Travel & Places',
    description: 'Part 1 questions about daily transport, public transport, and traffic in your city.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'How do you usually travel around your city?' },
      { role: 'candidate', text: "By bike, like a lot of people here. It's by far the most practical option for me — you can avoid the worst traffic, park almost anywhere, and it costs very little to run. My commute is about fifteen minutes, and honestly I quite enjoy it early in the morning when the roads are still relatively empty and the air is cool." },
      { role: 'examiner', text: 'Is public transport good in your city?' },
      { role: 'candidate', text: "It's limited, to be honest. My city has buses, but the network doesn't cover much and the frequency is low, so very few people use them for daily commuting. Ride-hailing services have filled the gap to some extent. The bigger cities in my country are now building metro systems, and I hope something similar eventually reaches here, because the number of vehicles keeps rising." },
      { role: 'examiner', text: 'What are the main traffic problems where you live?' },
      { role: 'candidate', text: "Congestion at peak hours is the main one, especially near schools and the bridges over the river. Road safety is a more serious concern though — accidents involving cyclists and scooters are common, and driving discipline is inconsistent. During the rainy season, flooding on certain streets can bring everything to a standstill for hours." },
      { role: 'examiner', text: 'Would you like to own a car?' },
      { role: 'candidate', text: "Eventually, perhaps, but it's not a priority. Cars are heavily taxed in my country, so they cost far more here than in most countries, and parking in the city is genuinely difficult. For daily life a bike is simply more convenient. If I had a family or needed to travel long distances regularly, my calculation would change — but for now it would be an expensive inconvenience." },
    ],
    tips: [
      'Explain why a local norm exists rather than just stating it',
      'Distinguish between related problems (congestion vs. safety) to structure your answer',
      'Conditional forms shine here: "If I had a family, my calculation would change"',
      'Understated phrasing like "to be honest" and "perhaps" sounds natural and unrehearsed',
    ],
    keyPhrases: [
      'by far the most practical option',
      "the network doesn't cover much",
      'have filled the gap to some extent',
      'bring everything to a standstill',
      "it's not a priority",
      'my calculation would change',
    ],
  },

  // ── Part 2: Additional Cue Cards ──────────────────────────────
  {
    id: 'ielts-31',
    title: 'Part 2 — Describe a Book You Recently Read',
    part: 'Part 2',
    topic: 'Media & Entertainment',
    description: 'Cue card: Describe a book you have read recently. Say what it was about, why you chose it, what you learned, and explain how you felt about it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a book you have read recently. You should say: what the book was, why you decided to read it, what it was about, and explain how you felt about it. You have one minute to prepare." },
      { role: 'candidate', text: `The book I'd like to talk about is 'Deep Work' by Cal Newport, which I read about three months ago and which has probably influenced my daily habits more than anything else I've read in the last few years.

I came across it almost by accident. A colleague mentioned it during a conversation about how difficult it had become to concentrate at work, and the title stuck in my mind. At the time I was genuinely frustrated — I'd finish a nine-hour day and feel that I'd produced almost nothing of value, because my attention had been fragmented across messages, meetings, and small interruptions. So I bought it hoping for some practical help.

The central argument of the book is quite simple, but it's made very convincingly. Newport distinguishes between what he calls 'deep work' — cognitively demanding tasks performed without distraction — and 'shallow work', which is the logistical, low-value activity that fills most people's days. His claim is that the ability to concentrate deeply is becoming both rarer and more economically valuable at the same time, which makes it a genuine competitive advantage. He supports this with examples from writers, scientists, and business people, and he's honest about the discomfort involved, which I appreciated.

What I found most useful were the practical strategies. He recommends scheduling blocks of uninterrupted time in advance, treating concentration as a skill you train rather than a mood you wait for, and being deliberately unavailable for parts of the day. After reading it, I started blocking out two hours every morning where I close my messaging apps completely, and the difference in what I produce has been genuinely noticeable.

I didn't agree with everything in it. Some of his advice feels written for people with a lot of control over their own schedule, which junior employees often don't have. And there's a slightly puritanical tone in places — the idea that anything enjoyable and easy must be worthless.

Still, I'd say it's one of the most useful books I've read as a working professional. It didn't tell me anything I couldn't have worked out for myself in principle, but it gave me a vocabulary and a structure for something I'd only felt vaguely. And in the end, that's often what a good book does — it names something you already half-knew.` },
      { role: 'examiner', text: 'Do you think people benefit more from fiction or non-fiction?' },
      { role: 'candidate', text: "I think they benefit in different ways, so it's not really a competition. Non-fiction gives you information and frameworks — it's the more obviously practical of the two. But fiction does something that I think is quietly more important: it puts you inside another person's experience for a few hours. There's research suggesting that regular fiction readers score higher on measures of empathy, which makes intuitive sense to me. Ideally people would read both, but if I'm honest, I'm the one who needs to read more fiction, not less non-fiction." },
    ],
    tips: [
      'Summarise the argument of the book, not just the plot or subject — it demonstrates abstract vocabulary',
      'Include a criticism: a balanced view sounds far more credible than pure praise',
      'Explain the concrete effect on your own behaviour to keep the answer personal',
      'A memorable closing line ("it names something you already half-knew") leaves a strong impression',
    ],
    keyPhrases: [
      'I came across it almost by accident',
      'my attention had been fragmented across...',
      'He distinguishes between... and...',
      "he's honest about the discomfort involved",
      'a skill you train rather than a mood you wait for',
      "It gave me a vocabulary and a structure for something I'd only felt vaguely",
    ],
  },
  {
    id: 'ielts-32',
    title: 'Part 2 — Describe a Difficult Decision You Made',
    part: 'Part 2',
    topic: 'Work & Study',
    description: 'Cue card: Describe a difficult decision you had to make. Say what it was, why it was difficult, what you decided, and explain how you felt afterwards.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a difficult decision that you have made. You should say: what the decision was, what made it difficult, how you finally decided, and explain how you felt about the decision afterwards. You have one minute to prepare." },
      { role: 'candidate', text: `The decision I'd like to describe is leaving a stable, well-paid job at a large corporation to join a much smaller start-up about three years ago.

To give some context, my first job after university was at a company with several thousand employees. The work was steady, the salary was good and rising predictably, and there was very little risk involved. From the outside — and certainly from my parents' point of view — it looked like exactly the kind of position you're supposed to want.

The problem was that I felt increasingly disconnected from what I was working on. In a big corporation, you often handle a small part of a much larger process, to someone else's plan, and you rarely see the results or whether it succeeds. After three years, I'd become perfectly competent but professionally quite unmotivated. When a smaller company offered me a role where I'd run an entire area of marketing and speak directly to customers, I was immediately drawn to it — but the salary was slightly lower, the company was only two years old, and there was a real chance it wouldn't survive.

What made the decision genuinely difficult was that both options were defensible. It wasn't a case of right and wrong. Staying meant security and disappointing myself; leaving meant risk and disappointing my family, who understandably valued stability, especially given how hard they had worked to put me through university.

In the end, what settled it was a question I asked myself: which decision would I regret more in ten years? I realised that if I stayed and the small company went on to do well, I'd always wonder. Whereas if I left and it failed, I'd still have learned a great deal and could find another job — my skills weren't going anywhere. Framed that way, the asymmetry became obvious.

I handed in my notice, and it was uncomfortable — my manager was disappointed, and my mother worried for months. But three years on, I'm certain it was the right choice. I've learned more in this role than in the previous three years combined, and I care about the product in a way I never did before.

What I took from the whole experience is that the hardest decisions usually aren't between a good option and a bad one. They're between two reasonable lives, and at some point you simply have to choose which one you'd rather be responsible for.` },
      { role: 'examiner', text: 'Do you think young people find it harder to make decisions today?' },
      { role: 'candidate', text: "In some ways, yes — and I think it's precisely because there are more options than there used to be. My parents' generation had a fairly narrow set of paths, and while that was limiting, it was also simpler. Today a young person can work remotely for a company on another continent, change career entirely at thirty, or build something of their own. That freedom is genuinely valuable, but it also creates a constant fear of choosing wrongly, because every choice closes off many others. I'd say the difficulty isn't a lack of information — it's an excess of possibility." },
    ],
    tips: [
      'A dilemma with two defensible options is far more interesting than an obvious choice',
      'Show the decision process, not just the outcome — examiners reward reasoning',
      'Use past perfect for background: "I\'d become," "they had worked"',
      'End with a general lesson to lift the story into more abstract language',
    ],
    keyPhrases: [
      'To give some context...',
      'It looked like exactly the kind of position you\'re supposed to want',
      "It wasn't a case of right and wrong",
      'What settled it was a question I asked myself',
      'the asymmetry became obvious',
      "They're between two reasonable lives",
    ],
  },
  {
    id: 'ielts-33',
    title: 'Part 2 — Describe a Useful Piece of Technology',
    part: 'Part 2',
    topic: 'Technology',
    description: 'Cue card: Describe a piece of technology you find useful. Say what it is, how you use it, how you learned to use it, and explain why it is useful to you.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a piece of technology that you find useful. You should say: what it is, how long you have had it, how you use it, and explain why you find it so useful. You have one minute to prepare." },
      { role: 'candidate', text: `The piece of technology I'd like to talk about is my pair of noise-cancelling headphones, which might sound like a modest choice compared to a phone or a laptop, but which has had a disproportionate effect on my working life.

I bought them about two years ago, fairly reluctantly, because they were expensive and I assumed the noise-cancelling feature was mostly marketing. I was working in a large open-plan office at the time, where conversations, phone calls, and general movement were constant. I'd started noticing that I could only concentrate properly before nine in the morning and after six in the evening, which is an absurd way to structure a working day.

The way they work is quite clever. Small microphones on the outside pick up ambient sound, and the headphones generate an inverted sound wave that cancels much of it out. It's most effective on continuous low-frequency noise — air conditioning, traffic, aeroplane engines — and less so on sudden speech, but the overall effect is that the world becomes noticeably quieter and much less demanding of your attention.

In practice, I use them in three main situations. At work, they're a signal as much as a tool: when they're on, colleagues know I'm in the middle of something and tend not to interrupt, which is almost as valuable as the noise reduction itself. When I'm travelling — on buses, planes, or in cafés — they let me read or work in places where I otherwise couldn't. And in the evening, I use them for podcasts and English listening practice, where the clarity genuinely helps me catch details I'd miss with cheap earphones.

Why do I find them so useful? Because concentration turns out to be the real bottleneck in my work. Office work isn't physically demanding; the difficulty is holding a complex task in your head long enough to think it through, and every interruption resets that process. Anything that protects those stretches of attention has an outsized return.

There's a downside I've become aware of, though. It's very easy to wear them all day and end up quite isolated from your team. I've caught myself missing useful hallway conversations and casual questions that would have been easier to answer in the moment. So I've started treating them as a deliberate tool rather than a default — on for focused work, off for the rest of the day.

If I lost them tomorrow, I would replace them immediately, which is probably the simplest test of how useful a piece of technology really is.` },
      { role: 'examiner', text: 'Do you think new technology always improves our lives?' },
      { role: 'candidate', text: "Not automatically, no. I think technology tends to solve a specific problem very well while quietly creating new ones that are harder to see at first. Email made communication instant, but it also made it endless. Smartphones gave us access to everything, and in return took away the experience of being unreachable. So my view is that a technology improves your life only if you're deliberate about how you use it. The default settings are usually designed to serve the company that built it, not you." },
    ],
    tips: [
      'An unexpected choice of object is memorable — you don\'t need the most impressive technology',
      'Explain how something works in simple terms to demonstrate technical description',
      'Group your usage into categories ("three main situations") for a clear structure',
      'Mentioning a drawback and how you manage it shows evaluative depth',
    ],
    keyPhrases: [
      'has had a disproportionate effect on...',
      'which is an absurd way to structure a working day',
      "they're a signal as much as a tool",
      'concentration turns out to be the real bottleneck',
      'has an outsized return',
      'a deliberate tool rather than a default',
    ],
  },
  {
    id: 'ielts-34',
    title: 'Part 2 — Describe a Time You Were Very Busy',
    part: 'Part 2',
    topic: 'Work & Study',
    description: 'Cue card: Describe a time when you were very busy. Say when it was, why you were busy, what you did, and explain how you felt about it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a time when you were extremely busy. You should say: when it was, why you were so busy, what you had to do, and explain how you felt during that period. You have one minute to prepare." },
      { role: 'candidate', text: `The period I'd like to describe is the six weeks leading up to a major product launch at my company last year, which was easily the most intense stretch of work I've experienced.

The background is that we'd committed to releasing a new version of our platform in time for a large industry conference. The date was fixed and public, which meant there was no possibility of quietly delaying. About two months before the deadline, two things went wrong at once: a key member of the team left for another company, and a final review revealed a serious problem with the product that we'd underestimated. Suddenly we had less capacity and more work.

My days during that period looked roughly the same. I'd start around seven in the morning, before anyone else, because those two hours were the only genuinely quiet time. Mornings were for the hardest work — rewriting the parts of the launch plan that the problem affected. Afternoons were meetings, reviewing reports, and supporting the two junior colleagues who'd taken on parts of the departed colleague's work. Most evenings I worked until eight or nine, and I worked several weekends, which I'm not proud of.

What made it manageable rather than miserable was, I think, three things. First, it had a clear end date — I knew exactly how long I had to sustain it, and temporary pressure is very different from indefinite pressure. Second, the team was genuinely united; nobody was blaming anyone, and there was a lot of dark humour, which helped enormously. And third, the work itself was interesting. Solving that problem was one of the more satisfying challenges I've had.

Emotionally it was still difficult. I slept badly, stopped exercising almost entirely, and became noticeably less patient with people. About four weeks in, I remember snapping at a colleague over something trivial and realising afterwards that I was more depleted than I'd admitted to myself.

We did launch on time, and the release went well — far better than I expected, honestly. But the experience taught me something uncomfortable: that period only worked because it was exceptional. I've since become quite firm about not letting that pace become normal, both for myself and for the people I work with. I now try to plan with the assumption that something will go wrong, because in my experience something always does.

Looking back, I'm proud of what we did, but I'd be uneasy if I ever described those six weeks as a model of how to work.` },
      { role: 'examiner', text: 'Do you think people work too much these days?' },
      { role: 'candidate', text: "In many industries, yes, and I think the boundary problem is the real cause rather than the hours themselves. Historically, when you left the factory or the office, work ended. Now it follows you home through your phone, so even a normal working day never fully closes. In many offices in my country there's also a lingering culture where visible overwork is read as commitment, which quietly punishes people who work efficiently and then go home. I'd argue that's not just unhealthy but genuinely inefficient — tired people make expensive mistakes." },
    ],
    tips: [
      'A time-bounded story is easy to structure: background → what you did → how you felt → what you learned',
      'Physical and emotional detail ("I slept badly, stopped exercising") makes the account believable',
      'Numbered reasons ("three things") give a clear spine to a long turn',
      'A reflective, slightly critical ending is stronger than a triumphant one',
    ],
    keyPhrases: [
      'there was no possibility of quietly delaying',
      'less capacity and more work',
      'temporary pressure is very different from indefinite pressure',
      'more depleted than I\'d admitted to myself',
      'it only worked because it was exceptional',
      "I'd be uneasy if I ever described it as a model",
    ],
  },
  {
    id: 'ielts-35',
    title: 'Part 2 — Describe an Outdoor Activity You Enjoy',
    part: 'Part 2',
    topic: 'Sports & Leisure',
    description: 'Cue card: Describe an outdoor activity you enjoy doing. Say what it is, where and when you do it, who you do it with, and explain why you enjoy it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe an outdoor activity that you enjoy. You should say: what the activity is, where and when you do it, who you do it with, and explain why you enjoy it so much. You have one minute to prepare." },
      { role: 'candidate', text: `The outdoor activity I'd like to talk about is sea swimming, which has become a regular part of my life since moving to a coastal city.

I usually go early — around half past five in the morning, before work. The beach is about ten minutes from my apartment by bike, and at that hour it's genuinely beautiful. The sun is just coming up over the water, the air is still cool, and the beach is full of local people, mostly older, who have been swimming there every morning for decades. There's a whole community that exists at that time of day, and almost none of them are tourists.

I usually go alone, though 'alone' isn't quite accurate, because the same faces are always there. There's an elderly man who swims a remarkably long distance every single morning and always nods at me, and a group of women who do stretching exercises together on the sand afterwards. We've never had a real conversation, but there's a kind of quiet familiarity, which I've come to value.

A typical session is fairly simple. I swim out parallel to the shore for twenty minutes or so, then float for a while, then come back and sit on the sand for ten minutes before going home. Occasionally, when the sea is rough during the transition into the rainy season, I don't swim at all and just walk along the water's edge instead.

There are several reasons I enjoy it so much. The most immediate is physical — cold seawater in the early morning is an extraordinarily effective way to wake up, far better than coffee. It also uses your whole body without any impact on the joints, which suits me, since I sit at a desk all day.

But the deeper reason is psychological. Swimming is one of the very few activities where I genuinely cannot check my phone, cannot be contacted, and cannot multitask. For those twenty minutes I have nothing to think about except breathing and moving. In a working life dominated by screens and constant small interruptions, that kind of enforced simplicity is rare and enormously restorative.

There's also something about the sea specifically — its scale, I think. Being in a large body of water reliably makes my own worries feel proportionate, which is a strange thing to say about a physical activity, but it's the honest reason I keep going back.

I'd say it's the single healthiest habit I've built as an adult, and if I ever move somewhere landlocked, it's the thing I'd miss most.` },
      { role: 'examiner', text: 'Do you think people spend enough time outdoors nowadays?' },
      { role: 'candidate', text: "Generally not, particularly people in cities and particularly those of us who work at a computer. It's easy to go from a flat to a vehicle to an office and back and be outdoors for perhaps fifteen minutes in a whole day. I think part of the problem is design rather than willpower — many cities simply aren't pleasant to be outside in, because of traffic, heat, or a lack of shade and green space. Where cities do invest in walkable areas and parks, as my city has along the river, you see people out in large numbers, which suggests the desire is there when the environment allows it." },
    ],
    tips: [
      'Sensory and time-of-day detail turns a simple activity into a vivid picture',
      'Describing other people at the scene adds life without leaving the topic',
      'Separate the surface reason (physical) from the deeper reason (psychological)',
      'A hypothetical ending — "if I ever move somewhere landlocked" — shows conditional range',
    ],
    keyPhrases: [
      "there's a whole community that exists at that time of day",
      'a kind of quiet familiarity',
      'far better than coffee',
      'that kind of enforced simplicity is rare',
      'makes my own worries feel proportionate',
      "it's the thing I'd miss most",
    ],
  },
  {
    id: 'ielts-36',
    title: 'Part 2 — Describe a Meal You Will Never Forget',
    part: 'Part 2',
    topic: 'Food & Culture',
    description: 'Cue card: Describe a meal you will always remember. Say where you had it, who you were with, what you ate, and explain why it was memorable.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a meal that you will always remember. You should say: when and where you had it, who you were with, what you ate, and explain why it was so memorable. You have one minute to prepare." },
      { role: 'candidate', text: `The meal I'd like to describe took place in my grandmother's house in a small village in the countryside, about two years ago, and it was the last time our whole extended family ate together in that house before it was sold.

It was during the Lunar New Year. My grandmother was in her late eighties and had decided, sensibly, that living alone in a large old house was no longer practical. So this particular reunion dinner had a weight to it that ordinary family meals don't. Around twenty of us were there — aunts, uncles, cousins, some of whom had travelled from the capital and one from abroad.

The food itself was entirely traditional, and much of it had been prepared over two days. There was a traditional cylindrical sticky rice cake with mung bean and pork wrapped in banana leaves, which my grandmother insisted on supervising personally even though she could no longer do the wrapping herself. There was pork belly braised slowly with eggs in coconut water — pickled vegetables, a clear soup with bitter melon, and an enormous amount of fresh herbs, as always. Nothing was elaborate or expensive. It was food that almost anyone in my country would recognise instantly.

We ate on mats on the floor, in the front room, because there was no table large enough. It was noisy in the way that only large families are — three conversations at once, children running in and out, someone always getting up to fetch something. My grandmother said very little, but she watched everything, and I remember noticing how carefully she was looking at each person.

Why is it memorable? Partly because of what it represented. That house had been the fixed point of my childhood — every summer, every New Year, the same rooms, the same smells. Selling it wasn't a tragedy, it was simply the sensible thing to do, but the meal marked the end of something that had been true my entire life.

There was also a moment I still think about. Near the end of the meal, my grandmother told a story about her own mother cooking the same dish during the war, in far harder circumstances. Nobody had heard the story before. Everyone went quiet, which almost never happens in my family.

I don't think the food was objectively the best I've ever eaten. But it's the meal I return to most often in my memory, and I've come to believe that what makes a meal memorable is almost never the cooking itself — it's who is sitting there, and whether you understand at the time that it won't happen again.` },
      { role: 'examiner', text: 'Do families in your country still eat together regularly?' },
      { role: 'candidate', text: "Less than they used to, though the tradition is still much stronger than in many Western countries. In rural areas, sharing meals remains completely normal. In cities it's under real pressure — long working hours, traffic, children in evening classes, and food delivery apps that make eating separately effortless. I've noticed in my own family that the everyday shared meal has largely disappeared, while the ceremonial ones around the New Year and death anniversaries remain sacred. So what's being lost isn't the idea of eating together, but the ordinary, unremarkable version of it, which is arguably the version that actually holds a family together." },
    ],
    tips: [
      'Choose a meal with emotional significance — the food alone rarely fills two minutes well',
      'Specific dishes and preparation details demonstrate precise vocabulary',
      'Describe the atmosphere and the people, not only the plates',
      'A reflective conclusion that generalises the experience is a strong band 8 feature',
    ],
    keyPhrases: [
      'had a weight to it that ordinary family meals don\'t',
      'she insisted on supervising personally',
      'noisy in the way that only large families are',
      'the fixed point of my childhood',
      'Everyone went quiet, which almost never happens',
      "whether you understand at the time that it won't happen again",
    ],
  },
  {
    id: 'ielts-37',
    title: 'Part 2 — Describe a Website or App You Often Use',
    part: 'Part 2',
    topic: 'Technology',
    description: 'Cue card: Describe a website or app you use frequently. Say what it is, how you found it, what you use it for, and explain why it is useful.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a website or mobile application that you use often. You should say: what it is, how you discovered it, what you use it for, and explain why it is important to you. You have one minute to prepare." },
      { role: 'candidate', text: `The application I'd like to talk about is Anki, which is a flashcard app built around a technique called spaced repetition. It's not glamorous — the interface is famously plain — but it's probably the single most useful piece of software I use outside of work.

I discovered it about three years ago, when I was trying seriously to improve my English vocabulary. I'd tried the obvious things: notebooks, vocabulary lists, more polished apps with points and streaks. The problem was always the same — I'd learn fifty words in a week and forget most of them within a month. A friend who was studying for a medical exam mentioned Anki, and although it looked unappealing at first, the underlying idea convinced me.

The principle is straightforward. Instead of reviewing everything at the same frequency, the app tracks how well you know each card and schedules the next review just before you're likely to forget it. Words you find easy might reappear in three months; words you keep getting wrong come back tomorrow. It's based on decades of research into how memory decays, and the effect is that you spend your review time almost entirely on your weak points.

In practice, I use it for about fifteen minutes each morning with my coffee. Whenever I encounter a useful English word or phrase — in a book, an article, a meeting — I add it, always with an example sentence rather than just a translation, because context matters enormously. I've also started using it for work material: industry terms, product details, things I use rarely but need to recall precisely.

The reason it matters to me is that it fixed a specific, frustrating problem. Before, I felt like I was doing a lot of learning that quietly leaked away. Now I have several thousand cards, and phrases I added two years ago are still available to me. There's something genuinely reassuring about that — knowing that effort you spent long ago hasn't simply evaporated.

It isn't perfect. The setup takes patience, the design is dated, and it's easy to fall into the trap of adding far more cards than you can realistically review, which turns it into a daily burden. I've had to learn to be selective and to delete things I don't actually need.

But if I could keep only one app on my phone for learning purposes, this would be it — because unlike almost everything else on there, it's designed to help me finish something rather than to keep me using it.` },
      { role: 'examiner', text: 'Do you think apps are changing the way people learn?' },
      { role: 'candidate', text: "Substantially, and I'd say mostly for the better, though with a caveat. The clear benefit is access and personalisation — someone in a small town can now practise a language, follow a university course, or learn to code from their phone, with content that adapts to their level. That was unimaginable when I was at school. The caveat is that many learning apps are designed primarily to maximise engagement, so they reward streaks and points rather than genuine difficulty. Real learning is often uncomfortable, and an app that's optimised to feel pleasant may quietly avoid the very thing that makes learning work." },
    ],
    tips: [
      'Explaining the mechanism behind a tool demonstrates advanced explanatory language',
      'Describe a concrete daily routine with the app rather than listing features',
      'Naming a limitation prevents the answer from sounding like an advertisement',
      'The final line should answer "why it matters", not repeat what the app does',
    ],
    keyPhrases: [
      "It's not glamorous, but...",
      'the underlying idea convinced me',
      "just before you're likely to forget it",
      'a lot of learning that quietly leaked away',
      "it's easy to fall into the trap of...",
      'designed to help me finish something rather than to keep me using it',
    ],
  },
  {
    id: 'ielts-38',
    title: 'Part 2 — Describe a Childhood Memory',
    part: 'Part 2',
    topic: 'Home & Living',
    description: 'Cue card: Describe a happy memory from your childhood. Say when it happened, where you were, who you were with, and explain why you remember it so clearly.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a happy memory from your childhood. You should say: when it happened, where you were, who was with you, and explain why you still remember it so clearly. You have one minute to prepare." },
      { role: 'candidate', text: `The memory I'd like to describe is of the summers I spent at my grandparents' house in the countryside, and one particular afternoon when I was around nine years old.

Every year, once school finished in late May, my parents would put me on a bus for the two-hour journey to my grandparents' village. I stayed there for most of the summer. It was a completely different world from the town where I grew up — no traffic, no schedule, and a great deal of freedom that I don't think children today are often given.

The specific afternoon I remember involved a group of us, maybe six or seven children, walking to a small river about twenty minutes from the house. It was the hottest part of the day, and we'd taken an inner tube from an old truck tyre that one boy's father had discarded. We spent the entire afternoon floating on it, taking turns, pushing each other off, arguing about whose turn it was, and eating green mangoes with salt and chilli that someone had brought in a plastic bag.

Nothing significant happened. No one was in danger, nothing was achieved, and if I described the events to someone else they'd sound completely unremarkable. But I remember the physical details with unusual clarity — the temperature of the water, which was much colder than you'd expect; the sound of cicadas, which in the countryside in summer is genuinely deafening; the smell of the mud on the riverbank; and walking home at dusk absolutely exhausted, with my hair still wet.

I think there are two reasons it has stayed with me so vividly. The first is that it represents a kind of unsupervised freedom that has largely disappeared. No adult knew exactly where we were, we had no way of contacting anyone, and nobody was concerned. That would be almost unthinkable now, and I understand why, but something real has been lost with it.

The second reason is that it was the last summer of that kind. The following year my grandfather became ill, my parents moved for work, and the village summers ended. So that afternoon has become, in my memory, a kind of marker for the end of childhood — although obviously I had no idea of that at the time.

I've since gone back to that river as an adult. It's smaller than I remembered, quite polluted now, and there were no children there at all. That visit was slightly painful, but it didn't damage the memory. If anything it made me more protective of it.` },
      { role: 'examiner', text: 'Do you think childhood today is very different from in the past?' },
      { role: 'candidate', text: "Very different, and I'd say the changes cut both ways. Children today are far safer, better educated, better fed, and have access to information that my generation couldn't have imagined. Those are enormous gains and I wouldn't reverse them. But childhood has also become much more supervised and much more scheduled — extra classes, structured activities, constant monitoring. The unstructured, slightly risky, unobserved play that filled my summers is now rare, and psychologists increasingly argue that it's precisely that kind of play which builds independence and resilience. So children today may be safer but somewhat less free, and I'm not sure we've fully counted the cost of that trade." },
    ],
    tips: [
      'Sensory memory — temperature, smell, sound — is the strongest material for this cue card',
      '"Nothing significant happened" is a powerful move: it lets you explain why it matters anyway',
      'Past habitual forms are essential here: "would put me on a bus," "I stayed there"',
      'Returning to the place as an adult gives you a natural, reflective ending',
    ],
    keyPhrases: [
      'a completely different world from...',
      "they'd sound completely unremarkable",
      'which is genuinely deafening',
      'a kind of unsupervised freedom that has largely disappeared',
      'a marker for the end of childhood',
      'it made me more protective of it',
    ],
  },
  {
    id: 'ielts-39',
    title: 'Part 2 — Describe a Song or Piece of Music You Like',
    part: 'Part 2',
    topic: 'Arts & Culture',
    description: 'Cue card: Describe a song or piece of music that means a lot to you. Say what it is, when you first heard it, when you listen to it, and explain why it is important to you.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a song or piece of music that is important to you. You should say: what it is, when you first heard it, how often you listen to it, and explain why it means so much to you. You have one minute to prepare." },
      { role: 'candidate', text: `The piece of music I'd like to talk about is a slow ballad by a little-known local duo — the title roughly translates as 'The Sad Thing Not Yet Told' — though what actually matters to me is less the song itself than the period of my life it's attached to.

I first heard it during my final year of university, in a coffee shop near campus where I used to study late. It was playing quietly in the background while I was working on my graduation project, which was a stressful and quite lonely few months. I didn't pay much attention at first, but the melody stayed in my head, and I looked it up on the way home. After that I played it constantly — genuinely hundreds of times over those months.

Musically it's not complicated. It's a pop ballad with a simple guitar line and a slow, almost conversational vocal. The lyrics are about things left unsaid between two people, which is a fairly universal theme. What gives it its quality is the restraint — the singers never push, never dramatise, and there's a lot of space in the arrangement.

I don't listen to it very often now, maybe a few times a year, and that's deliberate. Certain songs act like a direct line to a specific time in your life, and I find that if I play them too frequently, that connection wears out and the song becomes ordinary. So I keep a small number of songs in reserve, and this is one of them.

Why does it matter to me? Partly because of the association. When I hear the opening bars, I'm immediately back in that coffee shop, twenty-two years old, anxious about graduating, with no idea how anything would turn out. That version of me was quite frightened, and hearing the song now produces a strange mixture of affection and relief — affection for how hard he was trying, and relief that most of what he was worried about never happened.

There's also something more general in it. I think music does something that language on its own can't quite manage: it stores emotion. I can describe that period of my life in words, and I have, but the description is factual. Playing thirty seconds of that song brings back the actual feeling, complete and immediate, which is a remarkable thing for a piece of art to be able to do.

So it isn't my favourite song objectively, and I wouldn't claim it's a great work of art. But it's the one I'd keep if I had to choose, because it holds a version of me that I'd otherwise have no way of reaching.` },
      { role: 'examiner', text: 'Why do you think music is important in most cultures?' },
      { role: 'candidate', text: "I think it serves several functions at once, which is probably why it appears in every known society. At the most basic level it's a way of coordinating and bonding — people singing or moving together feel like a group, which is why music is central to religion, ceremony, and even military tradition. It's also a form of memory: before widespread literacy, songs were how history, values, and stories were passed down, and folk songs in my country still carry that function. And on a personal level, it gives shape to emotions that people often can't articulate. Grief, celebration, love — most cultures have music for these because words alone seem insufficient." },
    ],
    tips: [
      'Attaching the music to a specific time and place gives you rich material to describe',
      'Describing the music itself briefly ("restraint," "space in the arrangement") shows range',
      'Reflecting on your younger self is emotionally engaging and grammatically varied',
      'A concession ("it isn\'t my favourite objectively") makes the final claim more convincing',
    ],
    keyPhrases: [
      "what matters is less the song than the period it's attached to",
      'the melody stayed in my head',
      'a direct line to a specific time in your life',
      'I keep a small number of songs in reserve',
      'a strange mixture of affection and relief',
      'it stores emotion',
    ],
  },
  {
    id: 'ielts-40',
    title: 'Part 2 — Describe an Environmental Problem in Your Area',
    part: 'Part 2',
    topic: 'Environment',
    description: 'Cue card: Describe an environmental problem where you live. Say what it is, what causes it, how it affects people, and explain what could be done about it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe an environmental problem in the area where you live. You should say: what the problem is, what has caused it, how it affects local people, and explain what you think should be done about it. You have one minute to prepare." },
      { role: 'candidate', text: `The environmental problem I'd like to talk about is plastic waste along the coastline and rivers around my city, which is probably the most visible environmental issue where I live.

To describe the problem concretely: after heavy rain, and particularly at the end of the rainy season, large quantities of plastic wash down the river and out to sea, and much of it comes back onto the beaches. On a bad morning you'll see the tideline marked by a continuous band of plastic bags, bottles, food containers, polystyrene, and fragments of fishing gear. The city sends cleaning crews, and volunteer groups organise beach clean-ups, but within a week or two it accumulates again.

The causes are fairly clear and not unique to my country. Single-use plastic is extremely cheap and deeply embedded in daily life here — street food is served in plastic bags, iced coffee comes in a plastic cup with a straw, and even a single item from a shop is usually bagged automatically. Meanwhile, waste collection infrastructure hasn't kept pace with how fast the city has grown, particularly in outlying areas, so a proportion of rubbish never reaches a proper facility. And a lot of the material arriving on the beaches comes from upriver or from other countries entirely, carried by ocean currents, which makes it a regional problem rather than a purely local one.

The effects are significant. Tourism is a major part of the city's economy, and dirty beaches directly threaten it. Fishing communities are affected — I've talked to fishermen who routinely pull plastic up in their nets. There's a health dimension too, since microplastics are entering the seafood chain, and seafood is central to the diet here. And there's something harder to measure: living among visible pollution slowly changes what people accept as normal.

As for solutions, I think it requires action at three levels. Individually, refusing bags and using a reusable cup genuinely helps, and I've done this for two years — though I'd be dishonest if I claimed individual choices are sufficient. At the city level, waste collection needs serious investment, especially separation and recycling, which is currently done informally by waste pickers rather than systematically. And at the national level, I'd support taxing single-use plastic and requiring producers to be responsible for packaging, because the fundamental issue is that plastic is artificially cheap — the cost of cleaning it up isn't paid by the people who produce it.

I'm moderately hopeful, honestly. Awareness here has risen noticeably in the last five years, several coastal businesses have gone plastic-free, and the government has committed to reducing marine plastic waste substantially. The trend is in the right direction. It just isn't moving quickly enough yet.` },
      { role: 'examiner', text: 'Whose responsibility is it to solve environmental problems — individuals or governments?' },
      { role: 'candidate', text: "Both, but not equally, and I think framing it as a choice between them is part of the problem. Individuals can and should change their own behaviour, and that matters culturally — norms shift when enough people act. But individual action can't rebuild a waste management system or regulate an industry, and there's a long history of large polluters promoting personal responsibility precisely because it deflects attention from structural change. Governments have the tools that actually operate at scale: taxation, regulation, infrastructure, enforcement. So my view is that individuals create the political conditions, and governments deliver the actual change." },
    ],
    tips: [
      'Describe the problem visually first — concrete images are more powerful than abstractions',
      'Separate causes, effects, and solutions clearly; examiners can follow the structure easily',
      'Layered solutions ("three levels") demonstrate sophisticated organisation',
      'Qualify your own claims: "I\'d be dishonest if I claimed individual choices are sufficient"',
    ],
    keyPhrases: [
      'the tideline marked by a continuous band of plastic',
      'deeply embedded in daily life',
      "hasn't kept pace with how fast the city has grown",
      'changes what people accept as normal',
      'plastic is artificially cheap',
      "The trend is in the right direction. It just isn't moving quickly enough",
    ],
  },
  {
    id: 'ielts-41',
    title: 'Part 2 — Describe a Time You Changed Your Mind',
    part: 'Part 2',
    topic: 'Society & Culture',
    description: 'Cue card: Describe a time when you changed your opinion about something. Say what you believed, what changed it, what you think now, and explain how you felt about changing.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a time when you changed your mind about something important. You should say: what you originally believed, what made you reconsider, what you think now, and explain how you felt about changing your view. You have one minute to prepare." },
      { role: 'candidate', text: `The change of mind I'd like to describe concerns remote work, where I held a fairly strong opinion for years and now hold something close to the opposite.

Before the pandemic, I was firmly against working from home. My reasoning seemed sound at the time. I believed that office work is fundamentally collaborative, that the informal conversations in an office — the questions you overhear, the whiteboard sketch, the quick clarification at someone's desk — were where the most valuable knowledge transfer happened. I also thought, less charitably, that most people would simply do less work without supervision. I remember arguing this quite confidently with a colleague who wanted to work remotely two days a week, and effectively talking my manager out of allowing it.

Then in 2020 the choice was removed from everyone. Our entire company worked from home for the better part of a year, and I found that almost every prediction I'd made was wrong in some way.

The most surprising thing was my own productivity. My output went up substantially, because the work I do requires long stretches of concentration and the office had been quietly destroying those stretches all along. What I'd interpreted as valuable informal collaboration was, at least half the time, just interruption that I'd learned not to notice.

I was also wrong about the discipline question, and this is the part I'm least comfortable about. Almost nobody on my team worked less. The actual problem turned out to be the opposite: people worked too much, because the boundary between home and work disappeared. Two colleagues came close to burning out. That's a real problem, but it's a completely different problem from the one I'd predicted.

Where I've landed now is a middle position rather than a reversal. I do still think some things genuinely require being in the same room — onboarding new team members, difficult conversations, early design discussions where you need to sketch and argue in real time. But I no longer believe presence equals productivity, and I'd now defend a hybrid model quite strongly.

How did it feel? Uncomfortable, mostly, and it took longer than it should have. I'd argued the position publicly, so changing it meant admitting I'd been confidently wrong in front of people who remembered. But the experience did teach me something valuable: I'd never actually tested that belief, I'd only defended it. Now, when I notice myself holding an opinion very firmly, I try to ask what evidence would change my mind — and if the honest answer is 'nothing', that's usually a sign I'm defending an identity rather than an argument.` },
      { role: 'examiner', text: 'Do you think people find it difficult to admit they were wrong?' },
      { role: 'candidate', text: "Extremely, and I think the reason is that opinions become tangled up with identity. If I've argued a position publicly for years, abandoning it doesn't just mean updating a belief — it means admitting something about my judgement, in front of people who watched me argue it. That's a social cost, not an intellectual one. Culture matters here too: in workplaces where being wrong is treated as a failure, people defend bad positions far longer, whereas in teams where a senior person can casually say 'I got that wrong', everyone updates much faster. So I'd say admitting error is less a matter of personal humility than of whether the environment makes it safe." },
    ],
    tips: [
      'State the original belief and its reasoning fairly — a strawman weakens the story',
      'Identify what specifically caused the change: evidence, experience, or a conversation',
      'A partial change ("a middle position rather than a reversal") sounds more honest than a total reversal',
      'Extract a transferable principle at the end — this is high-band Part 2 content',
    ],
    keyPhrases: [
      'I held a fairly strong opinion... and now hold close to the opposite',
      'My reasoning seemed sound at the time',
      'the choice was removed from everyone',
      "just interruption that I'd learned not to notice",
      'Where I\'ve landed now is a middle position',
      "I'd never actually tested that belief, I'd only defended it",
    ],
  },
  {
    id: 'ielts-42',
    title: 'Part 2 — Describe a Healthy Habit You Have',
    part: 'Part 2',
    topic: 'Health & Lifestyle',
    description: 'Cue card: Describe a healthy habit you have. Say what it is, how you started it, how it affects your life, and explain why you think it is important.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "Describe a healthy habit that you have. You should say: what the habit is, when and how you started it, how you maintain it, and explain how it has affected your life. You have one minute to prepare." },
      { role: 'candidate', text: `The healthy habit I'd like to describe is going for a walk every evening without my phone, which sounds almost trivially simple but has been one of the more meaningful changes I've made.

It started about two years ago, and not for health reasons at all. I was having persistent trouble sleeping — lying awake for an hour or more, with my mind still processing work problems. I tried the usual advice: no caffeine after four, no screens before bed, a consistent bedtime. Those helped slightly. What actually made the difference was something a friend suggested almost in passing: a walk after dinner, deliberately leaving the phone at home.

The habit itself is straightforward. Around eight in the evening, I walk for about forty minutes, usually along the river near my flat. I don't listen to podcasts or music, which was the hardest part to accept — for the first two weeks I found the silence genuinely uncomfortable, and I remember reaching into an empty pocket several times out of pure reflex.

Maintaining it has been easier than I expected, for two reasons. First, it's tied to an existing routine — it happens straight after dinner, so I don't have to decide anything. Second, the reward is immediate rather than distant. Unlike going to the gym, where the benefit arrives in three months, I sleep better that same night. Habits that pay you back the same day are far easier to keep.

The effects have gone well beyond sleep, which is why I still do it. My sleep did improve substantially — I now fall asleep within about fifteen minutes, which was unimaginable before. But the unexpected benefit is what happens mentally during the walk. Without input, my mind gradually stops racing and starts wandering, and a surprising number of my better ideas at work have arrived somewhere around the twenty-minute mark. I've come to think of it less as exercise and more as processing time that the rest of my day doesn't allow.

There's also a small social dimension. Because I go at the same time along the same route, I see the same city every evening — families out after dinner, elderly people exercising, students sitting on the wall by the water. It gives me a sense of belonging to a place, which is easy to lose when you spend your working life in front of a screen.

Why do I think it's important? Because it's sustainable. I've started and abandoned many ambitious health regimes — strict diets, six-day gym plans — and none of them lasted more than a couple of months. This one has survived two years precisely because it's undemanding. I've become convinced that a modest habit you actually keep is worth more than an ideal one you abandon.` },
      { role: 'examiner', text: 'Why do you think many people find it hard to keep healthy habits?' },
      { role: 'candidate', text: "I think the main reason is a mismatch in timing: the cost of a healthy habit is immediate and the benefit is delayed, sometimes by years, whereas with unhealthy habits it's exactly the reverse. Our motivation simply isn't well designed for that trade. On top of that, people tend to start far too ambitiously — a complete diet overhaul plus daily gym sessions — which works for about three weeks and then collapses, and the failure itself is discouraging enough to stop them trying again. What's worked for me is making the habit small enough to be almost unimpressive, and attaching it to something I already do. It's much less inspiring as advice, but it survives contact with a busy week." },
    ],
    tips: [
      'A small, specific habit is easier to describe convincingly than a general "I stay healthy"',
      'Explain the mechanism of why it works — this lifts the answer above description',
      'Mention past failed attempts to give the story contrast and credibility',
      'The closing principle should be quotable: "a modest habit you keep is worth more than an ideal one you abandon"',
    ],
    keyPhrases: [
      'which sounds almost trivially simple',
      'something a friend suggested almost in passing',
      'out of pure reflex',
      "it's tied to an existing routine",
      'Habits that pay you back the same day are far easier to keep',
      'processing time that the rest of my day doesn\'t allow',
    ],
  },

  // ── Part 3: Additional Discussions ──────────────────────────────
  {
    id: 'ielts-43',
    title: 'Part 3 — Work & the Future of Careers',
    part: 'Part 3',
    topic: 'Work & Study',
    description: 'A discussion about job security, changing careers, automation, and what work will look like for the next generation.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Do you think people change jobs more often now than in the past?' },
      { role: 'candidate', text: "Considerably more, yes, and I think the reasons are structural rather than generational. There's a common assumption that young people are simply less loyal, but I'd argue the loyalty disappeared from the employer's side first. The implicit contract that existed for my parents' generation — you give the company decades, the company gives you security and a pension — has largely broken down. Once redundancy became a normal business tool, staying in one place stopped being obviously safer.\n\nThere are practical factors too. Information is far more transparent now: you can see what similar roles pay elsewhere within minutes, which makes staying underpaid a conscious choice rather than an unavoidable fact. And in fields like mine, moving is often the fastest way to develop, because you're exposed to different systems and different ways of working.\n\nThat said, I don't think constant movement is automatically good. Changing jobs every eighteen months means you're never present for the consequences of your own decisions, which is where a lot of professional judgement actually comes from. My own view is that two to four years is the sweet spot — long enough to see something through, short enough not to stagnate." },
      { role: 'examiner', text: 'How do you think automation and artificial intelligence will affect employment?' },
      { role: 'candidate', text: "I think the honest answer is that it will affect employment substantially, but not in the way most predictions suggest. Historically, technology has eliminated tasks rather than whole occupations, and jobs have been reorganised around what remains. The introduction of spreadsheets didn't remove accountants; it removed the arithmetic and made the advisory part of the job larger.\n\nWhat's different this time, potentially, is the type of work being automated. Previous waves affected physical and routine work. This one reaches into cognitive and even creative tasks — drafting, summarising, generating code, producing images. That reaches a class of white-collar workers who have historically been insulated from this kind of disruption, and I include myself in that.\n\nMy own experience is instructive. I now use AI tools daily, and they've absorbed a meaningful portion of what I used to do — writing routine reports, summarising long documents, drafting emails. But my job hasn't shrunk. It's shifted toward deciding what should be done, judging whether output is actually correct, and taking responsibility for the result. Those parts have become more valuable, not less.\n\nWhere I'm genuinely concerned is distribution rather than volume. Even if the number of jobs remains stable, the transition will be brutally uneven — the person whose role disappears is rarely the person who fills the new one, and retraining a forty-five-year-old is a societal problem, not an individual one. I'd argue that's where policy attention belongs, rather than on speculating about total job numbers." },
      { role: 'examiner', text: 'What skills will be most important for young people entering the job market?' },
      { role: 'candidate', text: "I'd separate this into two categories, because they age very differently.\n\nThe first is the ability to learn quickly and independently. Any specific technical skill has a limited shelf life — most of what I learned at university is now either obsolete or automated. What's kept me employable isn't any particular tool or method, it's having learned how to get up to speed on something unfamiliar in a few weeks. That capacity compounds over a career.\n\nThe second category is the set of things that are hardest to automate, which are mostly human rather than technical: communication, judgement under uncertainty, understanding what a client actually needs as opposed to what they asked for, and the ability to work with people who disagree with you. There's some irony here, because these are exactly the skills that education systems in my country and elsewhere treat as peripheral.\n\nI'd add one more that's often overlooked — the ability to evaluate information critically. In an environment where generating plausible-sounding content is essentially free, the scarce skill becomes judging whether something is actually true. That applies to AI output, to news, to advice online. Fifty years ago the constraint was access to information; now the constraint is discernment." },
      { role: 'examiner', text: 'Do you think the traditional nine-to-five working day will disappear?' },
      { role: 'candidate', text: "I think it will erode considerably rather than disappear entirely, and the split will be along the lines of what kind of work you do.\n\nFor knowledge work, the fixed schedule is already looking arbitrary. Its origins are industrial — factories needed everyone present simultaneously because the machinery required it. That logic doesn't transfer to work whose output is ideas. Since we shifted to a hybrid model at my company, we've moved toward a small number of shared hours for meetings and considerable freedom around the rest, and productivity has been fine.\n\nBut a great deal of work simply can't be untethered from time and place. Nurses, teachers, drivers, restaurant staff, factory workers — these are synchronised by necessity. So I'd expect the outcome to be a growing divide, where a professional class gains substantial autonomy and a much larger group sees no change at all. That's already a source of resentment, and I think it will grow.\n\nI'd also raise a caution about the flexible model, based on personal experience. The nine-to-five had one underappreciated virtue: it ended. When work has no fixed boundaries, it tends to expand into everything, and the freedom to work at any time becomes an obligation to be available at all times. If we're going to dismantle the traditional working day, we need to replace it with an explicit norm about when work stops, or people will simply work more while believing they're more free." },
    ],
    tips: [
      'Challenge the premise of a question when you can justify it — "the loyalty disappeared from the employer\'s side first"',
      'Use historical parallels to discuss technology; they demonstrate analytical range',
      'Draw on your own professional experience as concrete evidence, then generalise',
      'Distinguish between volume and distribution effects — precise framing scores highly',
    ],
    keyPhrases: [
      'the reasons are structural rather than generational',
      'the implicit contract... has largely broken down',
      'technology has eliminated tasks rather than whole occupations',
      'a limited shelf life',
      'the constraint is discernment',
      'the freedom to work at any time becomes an obligation to be available at all times',
    ],
  },
  {
    id: 'ielts-44',
    title: 'Part 3 — Technology, AI & Society',
    part: 'Part 3',
    topic: 'Technology',
    description: 'A discussion about artificial intelligence, privacy, digital dependence, and how societies should regulate new technology.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How has artificial intelligence changed daily life for ordinary people?' },
      { role: 'candidate', text: "I think the striking thing is how much of it has arrived invisibly. Most people using AI daily wouldn't describe it that way — it's in the route your maps app chooses, the spam filtered from your inbox, the recommendations on a streaming service, the photograph your phone quietly improves before you even see it. It became infrastructure before it became a topic of conversation.\n\nThe more visible wave is recent and more disruptive. Conversational systems that can write, translate, summarise, and explain have moved AI from something operating in the background to something people actively use. For me the translation quality is the most striking. Someone with no English can now read a technical article or negotiate with a foreign supplier reasonably well, which genuinely lowers a barrier that used to require years of study.\n\nWhat I'd caution against is treating the change as complete. We're in the early period, where the capability is impressive and our social norms around it are almost nonexistent. Nobody has settled questions like whether a student using AI to draft an essay is cheating or working efficiently, or who is responsible when an automated system makes a harmful decision. Historically, norms take a generation to catch up with technology, and I don't think this will be an exception." },
      { role: 'examiner', text: 'Do you think people are too concerned, or not concerned enough, about digital privacy?' },
      { role: 'candidate', text: "I'd say most people are concerned in the abstract and unconcerned in practice, which is the worst combination. Surveys consistently show that people say they value privacy highly, yet almost nobody reads terms of service or changes default settings. The gap exists because the cost of surrendering privacy is invisible and deferred, while the benefit — a free service, a convenient login — is immediate and concrete.\n\nI'd also argue the framing is wrong. Privacy is usually discussed as a personal preference, as though it were about having something to hide. But it's better understood as a structural issue: what matters isn't that a company knows my location, it's that a company or a state knows the location of everyone simultaneously, permanently, and can search it. That's a different category of power, and it doesn't require anyone to have bad intentions today. It only requires the data to exist for someone with bad intentions later.\n\nThat said, I don't think individual vigilance is a realistic solution. Expecting ordinary people to manage this through careful choices is like expecting them to individually verify food safety. It's a regulatory problem. The European approach with GDPR is imperfect and creates a great deal of pointless clicking, but the underlying principle — that collecting data requires justification rather than being the default — is the right one." },
      { role: 'examiner', text: 'Should governments regulate technology companies more strictly?' },
      { role: 'candidate', text: "Yes, though I'd want to be careful about what we're regulating, because badly designed rules tend to entrench the largest companies rather than restrain them.\n\nThe strongest argument for regulation is that the current model externalises costs. A social platform captures the revenue from engagement while the costs — polarisation, effects on adolescent mental health, the collapse of local journalism — are paid by society. That's a familiar pattern; it's exactly the situation with industrial pollution before environmental law. We didn't rely on factories voluntarily restraining themselves, and I don't see why we'd expect it here.\n\nWhere I'd be cautious is the form. Compliance-heavy regulation is a fixed cost, and a company worth hundreds of billions absorbs it easily while a startup can't, so heavy-handed rules can accidentally cement the dominance of the very companies they target. I'd favour structural remedies — interoperability requirements, limits on self-preferencing, restrictions on acquiring emerging competitors — over rules that simply add paperwork.\n\nThere's also a jurisdictional difficulty that rarely gets acknowledged. These companies are global and regulation is national, so a single country acting alone often achieves very little, especially a mid-sized economy like mine. Realistically, meaningful regulation requires either very large markets acting, as with the EU, or genuine international coordination, which is historically slow." },
      { role: 'examiner', text: 'Do you think technology brings people closer together or drives them apart?' },
      { role: 'candidate', text: "Both, and I think the answer depends almost entirely on distance. Technology has been extraordinarily good at maintaining relationships across geography — my closest friend moved to the capital and we speak more often now than when we lived in the same city, which would have been impossible for my parents' generation. For diaspora communities, migrant workers, and long-distance families, the change is unambiguously positive.\n\nWhere it's more damaging is close range. It's now completely normal for a group of friends to sit at the same table with each partly elsewhere, and something real is lost in that. Attention is the actual currency of a relationship, and devices are engineered by extremely capable people to capture it.\n\nI'd add that the design incentives matter more than the technology itself. A video call with a relative and an algorithmic feed are both 'technology', but one is built to connect you and end, while the other is built to hold you as long as possible. It's the second category where the harm concentrates.\n\nSo my overall position is that technology has made connection easier and attention harder. Whether that leaves people closer or further apart is genuinely up to how deliberately individuals and societies use it, which is an unsatisfying answer, but I think an accurate one." },
    ],
    tips: [
      'Reframe questions where the standard framing is weak — "privacy is better understood as a structural issue"',
      'Historical analogies (industrial pollution, food safety) are powerful Part 3 tools',
      'Acknowledge trade-offs in your own recommendations to show balanced judgement',
      'Concluding with a qualified answer is fine, provided you explain why the qualification is honest',
    ],
    keyPhrases: [
      'It became infrastructure before it became a topic of conversation',
      'concerned in the abstract and unconcerned in practice',
      'invisible and deferred... immediate and concrete',
      'the current model externalises costs',
      'attention is the actual currency of a relationship',
      'made connection easier and attention harder',
    ],
  },
  {
    id: 'ielts-45',
    title: 'Part 3 — Tourism & Its Impact',
    part: 'Part 3',
    topic: 'Travel & Places',
    description: 'A discussion about mass tourism, its economic and cultural effects, and how travel might change in the future.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why do you think tourism has grown so much in recent decades?' },
      { role: 'candidate', text: "Several things happened at once, which is why the growth has been so dramatic. The most fundamental is that flying became cheap. Deregulation and budget airlines turned international travel from something a middle-class family did once in a decade into something they might do twice a year.\n\nThe second factor is the rise of a large middle class in Asia. When hundreds of millions of people in China, India, and Southeast Asia acquire disposable income, the effect on global tourist numbers is enormous. In my city, the transformation over ten years has been driven substantially by Korean and Chinese visitors, not Western ones, which people outside the region often don't realise.\n\nThird, information and booking became frictionless. Arranging an independent trip to a foreign country once required a travel agent and considerable confidence. Now you can book flights, accommodation, and transport in twenty minutes from your phone, read reviews from strangers, and translate signs with a camera. The perceived risk of independent travel has collapsed.\n\nAnd finally there's a cultural shift, particularly among younger people, toward valuing experiences over possessions — reinforced, I'd say slightly cynically, by social media making travel highly visible as a marker of status." },
      { role: 'examiner', text: 'What are the negative effects of tourism on local communities?' },
      { role: 'candidate', text: "I can speak to this fairly directly, because my city has changed enormously in the time I've lived here.\n\nThe most concrete effect is on housing and cost of living. When property becomes more profitable as short-term accommodation than as housing, prices rise beyond what local wages support. Young people in tourist cities across my country increasingly cannot afford to live in the neighbourhoods they grew up in. The same pattern has played out in Barcelona, Venice, Kyoto — it's remarkably consistent.\n\nThere's also environmental pressure. Tourist numbers strain water supply, waste systems, and fragile natural sites. Some beaches and islands here receive far more visitors than they can absorb, and the damage to coral in particular is visible.\n\nThe cultural effect is subtler and, I think, more troubling. When a tradition becomes an attraction, its function changes. A ceremony performed for a community means something different from the same ceremony performed on a schedule for paying visitors. It can preserve the outward form while quietly emptying it — what anthropologists sometimes call staged authenticity.\n\nAnd economically, the benefits are often less local than they appear. When international chains and foreign tour operators take a large share, the community may absorb the crowds, the traffic, and the price rises while capturing a modest portion of the revenue." },
      { role: 'examiner', text: 'Do you think tourism does more good than harm overall?' },
      { role: 'candidate', text: "On balance I'd say yes, but with real qualifications, and I'm aware I'm answering from a country where tourism has been substantially beneficial.\n\nThe economic case is strong. Tourism in my country employs millions, and importantly it creates work in rural and coastal areas where alternatives are scarce. In parts of the coast, tourism has given families incomes that farming and fishing could no longer provide. It's also relatively accessible employment — it doesn't require a university degree, so it absorbs labour that other growth sectors don't.\n\nThere's a cultural benefit as well, though it's easy to overstate. Contact between people does erode stereotypes to some degree. And tourism revenue frequently funds conservation, both of heritage sites and natural areas, which would otherwise struggle for public funding.\n\nThe qualifications matter though. The benefit depends heavily on scale and structure. Tourism at a level a place can absorb, with local ownership, is largely positive. Tourism beyond that threshold, controlled by outside capital, can hollow a place out — and the transition between those two states is gradual enough that it's usually recognised too late.\n\nSo my honest position is that tourism is neither good nor bad in itself; it's a question of volume and who controls it. What worries me about my own city is that we're arguably approaching that threshold without much of a public conversation about it." },
      { role: 'examiner', text: 'How do you think tourism will change in the next twenty years?' },
      { role: 'candidate', text: "I'd expect several shifts, some driven by policy and some by necessity.\n\nThe most likely is a move from encouraging volume to managing it. Cities like Venice and Amsterdam have already begun limiting numbers, charging entry fees, and restricting short-term rentals. Twenty years ago, tourist arrivals were reported purely as a success metric; increasingly they're treated as something requiring management. I expect that shift to spread, including here.\n\nClimate is the second force, and it works in two directions. Aviation will likely become more expensive as carbon costs are internalised, which may reduce casual long-haul travel. At the same time, changing climates will redirect flows — extreme summer heat is already pushing Mediterranean tourism toward spring and autumn, and I'd expect equatorial destinations to face similar pressure.\n\nI'd also expect the composition of tourists to keep shifting toward Asian travellers, and destinations that currently orient themselves toward Western expectations to reorganise accordingly.\n\nWhat I'm less confident about is whether technology substitutes for travel. There's a long-standing prediction that immersive technology will reduce the desire to visit places physically, and I'm sceptical. Travel isn't primarily about seeing something — it's about being somewhere, with the discomfort, the food, the weather, the strangers. I don't think that's easily simulated, and I suspect the demand will outlast every technology proposed to replace it." },
    ],
    tips: [
      'Local specificity ("my city has changed enormously") is far stronger than generic examples',
      'Introduce a technical concept where relevant — "staged authenticity" — but explain it',
      'Acknowledge your own position and its bias: "I\'m answering from a country where..."',
      'For future questions, separate the forces driving change rather than listing predictions',
    ],
    keyPhrases: [
      'The perceived risk of independent travel has collapsed',
      'cannot afford to live in the neighbourhoods they grew up in',
      'preserve the outward form while quietly emptying it',
      "it's a question of volume and who controls it",
      'reported purely as a success metric',
      "it's about being somewhere",
    ],
  },
  {
    id: 'ielts-46',
    title: 'Part 3 — Food, Diet & Globalisation',
    part: 'Part 3',
    topic: 'Food & Culture',
    description: 'A discussion about changing diets, fast food, food culture, and the globalisation of what people eat.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How have eating habits changed in your country over the last few decades?' },
      { role: 'candidate', text: "Enormously, and the pace has accelerated in the last ten years. The most fundamental change is simply abundance. My parents grew up in a period when food was scarce and rice was the centre of every meal by necessity. My generation grew up with far more meat, more variety, and effectively unlimited availability, which is a change of circumstance so large that behaviour couldn't help but follow.\n\nThe second change is convenience. Our cooking traditionally involves fresh ingredients bought daily and a fair amount of preparation. Now, in cities, delivery apps make it trivially easy to eat without cooking anything, and packaged and processed food occupies far more shelf space than it did.\n\nThird, foreign cuisines have become normal rather than exotic. Korean, Japanese, Thai, and Western food are everywhere in my city, and among young people, eating pizza or Korean fried chicken isn't a special occasion.\n\nThe consequence, which is already measurable, is a rapid rise in obesity and diabetes, particularly in urban areas. It's a strange situation historically — my country still has undernutrition in some rural regions while dealing with the diseases of excess in its cities, sometimes within the same province." },
      { role: 'examiner', text: 'Why do you think fast food has become so popular around the world?' },
      { role: 'candidate', text: "I think it's a mistake to explain it purely through taste, because the more powerful reasons are structural.\n\nThe first is that it fits how people now live. Fast food is fast, and when both parents work long hours and commute, the constraint on dinner is time rather than money. Anything that removes cooking and cleaning has an enormous advantage regardless of what it tastes like.\n\nSecond, it's engineered to be appealing at a level that home cooking simply doesn't compete with. The combinations of fat, sugar, and salt are the product of decades of research into what people find hard to stop eating. That's not a moral judgement, it's just accurate — enormous resources have gone into optimising it.\n\nThird, and this is often missed outside developing countries, fast food has carried a status signal. When McDonald's or KFC arrived in my country, they weren't the cheap option — they were more expensive than excellent local food and were associated with modernity and the West. Eating there was aspirational, particularly for young people, in a way that's difficult to explain to someone from a country where it's always been the budget choice.\n\nAnd finally, price. Where agricultural subsidies make processed ingredients artificially cheap, unhealthy calories can genuinely cost less than healthy ones, which turns diet into a question of economics rather than willpower." },
      { role: 'examiner', text: 'Is it important for countries to preserve their traditional food culture?' },
      { role: 'candidate', text: "I'd say yes, though I want to avoid the sentimental version of that argument, because 'traditional' can quietly mean 'we prefer things as they were', which isn't in itself a reason.\n\nThe strongest case is practical and nutritional. Our traditional cooking is genuinely well-suited to the climate and to health — lots of fresh herbs, vegetables, seafood, minimal dairy, moderate portions. It evolved over centuries in this environment. Replacing it with a diet developed elsewhere, higher in processed fat and sugar, has visible health consequences, so preservation here isn't nostalgia, it's public health.\n\nThe second argument is about knowledge. Food culture is a body of practical skill — how to balance flavours, use inexpensive cuts, ferment, preserve, cook seasonally. That knowledge transmits through households, and when a generation stops cooking, it's genuinely lost, not merely paused. Recipes survive; the judgement doesn't.\n\nThe third is identity, which is real even if it's harder to quantify. Food is one of the most durable markers of where someone comes from, and it survives migration better than language does.\n\nWhere I'd push back on the purist position is the idea that cuisines should be frozen. Our national cuisine is itself the product of centuries of foreign influence — some of our best-loved dishes exist only because of colonial contact. A living food culture absorbs and adapts. What concerns me isn't foreign influence, it's replacement: a fusion of our cooking and Korean cooking is culture continuing; a generation that only knows how to order delivery is culture stopping." },
      { role: 'examiner', text: 'Should governments do more to encourage people to eat healthily?' },
      { role: 'candidate', text: "Yes, and I'd argue they're already intervening — the question is only whether they do so deliberately. Agricultural subsidies, import tariffs, zoning rules, and advertising law all shape what people eat, so a government claiming neutrality on diet is usually just endorsing the existing arrangement.\n\nOn what actually works, the evidence points more toward changing environments than toward informing individuals. Public information campaigns have a fairly weak record, because the problem generally isn't ignorance — most people know fried food and sugary drinks are unhealthy. Measures that change price and availability do considerably better. Sugar taxes have reduced consumption in Mexico and the UK, mostly by pushing manufacturers to reformulate products rather than by changing individual decisions at the shop.\n\nSchool food strikes me as the highest-value area, both because childhood habits are durable and because it's the one setting where the state has direct control over what's served.\n\nThe objection, which I take seriously, is paternalism — that adults should be free to eat what they want. My response is that the freedom is already heavily constrained by an environment designed by companies with a commercial interest in overconsumption. Making the healthy option cheaper and more available doesn't take a choice away; it corrects a distortion. What I'd resist is punitive or shaming approaches, which tend to fall hardest on people with the least money and the fewest options." },
    ],
    tips: [
      'Explain a phenomenon through structural causes rather than personal preference — it reads as more analytical',
      'A local detail that surprises an examiner ("fast food was aspirational") is memorable',
      'Anticipate the counterargument to your position and answer it directly',
      'Distinguish carefully between related ideas: "culture continuing" vs "culture stopping"',
    ],
    keyPhrases: [
      'a change of circumstance so large that behaviour couldn\'t help but follow',
      'the constraint on dinner is time rather than money',
      "That's not a moral judgement, it's just accurate",
      'preservation here isn\'t nostalgia, it\'s public health',
      'Recipes survive; the judgement doesn\'t',
      'it corrects a distortion',
    ],
  },
  {
    id: 'ielts-47',
    title: 'Part 3 — Family & Changing Relationships',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'A discussion about family structures, generational change, care for the elderly, and how relationships are evolving.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How has family life changed in your country in recent years?' },
      { role: 'candidate', text: "The clearest change is structural: the shift from multigenerational households to nuclear families, driven mainly by urbanisation. In the village where my grandparents lived, three generations under one roof was normal. In cities, apartments are small, people move for work, and the extended household is becoming the exception.\n\nFamily size has fallen sharply too. My father was one of seven children; most couples I know now have one or two, and increasingly one. The reasons are the familiar ones — the cost of urban housing and education, women's participation in the workforce, and later marriage.\n\nThe less visible change is in authority. Family life here was traditionally quite hierarchical, with significant deference to elders in decisions about careers, marriage, and money. That hasn't disappeared, but it has softened considerably. Young people now typically choose their own partners and careers, sometimes over objections that would have been decisive a generation ago.\n\nWhat's interesting is what hasn't changed. Financial obligation to parents remains strong — most people I know send money home regularly, and there's little sense that this is unusual. So the emotional and financial bonds persist even as the physical household disperses." },
      { role: 'examiner', text: 'Who should be responsible for taking care of elderly people?' },
      { role: 'candidate', text: "In my country the assumed answer is the family, specifically adult children, and that expectation carries real moral weight — putting a parent in a care home is still widely seen as a failure of duty. I understand that view and there's something genuinely valuable in it.\n\nBut I think it's becoming unsustainable on arithmetic alone. When a couple has four children, care can be shared. When they have one, that one person may be responsible for two parents and possibly grandparents while working full time in a different city. The family model assumed a demographic structure that no longer exists.\n\nSo my view is that it has to become a shared responsibility, with the state providing the infrastructure — pensions, accessible healthcare, home-visit services, and dignified professional care for those who need it — while families provide the relationship. Those aren't in conflict. In fact, I'd argue that the countries with the strongest formal systems often have better family relationships, because the interaction isn't dominated by exhausting physical care.\n\nThere's an important gender dimension too. In practice, 'the family will care for them' almost always means a daughter or a daughter-in-law, usually unpaid and often at the cost of her own career. Any honest discussion has to acknowledge that the traditional model has been subsidised by women's unpaid labour." },
      { role: 'examiner', text: 'Do you think the generation gap is bigger now than in the past?' },
      { role: 'candidate', text: "I think it's larger in my country specifically, though not necessarily everywhere, and the reason is the sheer speed of change here.\n\nMy grandparents lived through war and genuine scarcity. My parents came of age during a period of rapid economic reform. I grew up with the internet and now work for an international company. Those are not merely different tastes in music — they're fundamentally different material realities, formed within a single family. A grandparent who experienced genuine hunger and a grandchild who has never known scarcity will disagree about money, and the disagreement isn't really about money.\n\nTechnology widens it further, because for the first time the younger generation is more competent than the older in a domain that matters practically. That inverts the traditional flow of authority in a culture built on age-based respect, and it creates friction that didn't exist before.\n\nThat said, I'd distinguish between a gap in experience and a gap in affection. My relationship with my parents involves plenty of disagreement about how I should live, but very little distance emotionally. In some Western contexts I've observed the opposite — more shared cultural reference points but weaker obligation. So a large generation gap doesn't automatically mean a weak family." },
      { role: 'examiner', text: 'Do you think people are less committed to long-term relationships than in the past?' },
      { role: 'candidate', text: "I'd resist that framing slightly, because I think what's changed is the cost of leaving rather than the willingness to commit.\n\nHistorically, marriages persisted partly through necessity — economic dependence, particularly of women, social stigma, and legal difficulty. Divorce rates rising as those constraints loosen doesn't necessarily mean people value commitment less; it may mean fewer people are trapped in relationships that were always unhappy. Stability isn't the same as satisfaction, and we should be careful about romanticising a past where enduring a bad marriage was simply the only option.\n\nWhat has genuinely changed is expectation. A marriage was once expected to provide economic partnership and a stable household. Now people expect a spouse to be a best friend, an emotional support, an intellectual equal, and a source of personal growth as well. That's a far heavier load for one relationship to bear, and it's not surprising that more of them fail to meet it.\n\nI'd also point to a change in timing rather than commitment. People in cities here marry considerably later than their parents did, often after establishing careers. That reads as reluctance from the outside, but it may produce more deliberate and better-matched partnerships. So my overall view is that commitment hasn't weakened so much as become voluntary — and voluntary commitment is harder to sustain but arguably means more." },
    ],
    tips: [
      'Note what has and hasn\'t changed — the contrast makes your analysis more precise',
      'Raise dimensions others overlook, such as the gender implications of care work',
      'Use demographic reasoning ("on arithmetic alone") to ground a social argument',
      'Resisting a loaded premise politely — "I\'d resist that framing slightly" — is a strong band 8 move',
    ],
    keyPhrases: [
      'the extended household is becoming the exception',
      'the emotional and financial bonds persist even as the physical household disperses',
      'assumed a demographic structure that no longer exists',
      "subsidised by women's unpaid labour",
      'Stability isn\'t the same as satisfaction',
      'commitment hasn\'t weakened so much as become voluntary',
    ],
  },
  {
    id: 'ielts-48',
    title: 'Part 3 — Media, News & Information',
    part: 'Part 3',
    topic: 'Media & Entertainment',
    description: 'A discussion about news consumption, misinformation, social media, and the role of journalism in society.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How do people get their news today compared with in the past?' },
      { role: 'candidate', text: "The change is almost total. A generation ago, news arrived at fixed times through a small number of institutions — a newspaper in the morning, a broadcast in the evening. Everyone in a country received broadly the same information, edited by professionals whose names you knew.\n\nNow it's continuous, fragmented, and mostly algorithmic. Most people, myself included, encounter news incidentally while doing something else — scrolling a feed, reading a group chat, watching a short video. There's no longer a moment when you sit down to 'get the news'.\n\nThe consequences run deeper than convenience. The gatekeeping function has moved from editors to recommendation systems optimised for engagement rather than importance, and those are very different objectives. A shocking claim and a carefully verified report look identical in a feed and compete on equal terms.\n\nWhat's been lost, I think, is the shared baseline. When a society consumed the same handful of sources, people disagreed about what should be done but broadly agreed on what had happened. Now it's entirely possible for two people in the same city to hold incompatible pictures of reality, which makes political disagreement much harder to resolve." },
      { role: 'examiner', text: 'What can be done about the spread of false information?' },
      { role: 'candidate', text: "I'd start by saying I'm sceptical of any single solution, because the problem has technical, economic, and psychological components at once.\n\nOn the technical side, platforms can and do reduce the reach of demonstrably false claims and label disputed content. This has some effect but is inherently limited — it's reactive, it operates at enormous scale, and it hands contested judgements about truth to private companies, which raises legitimate concerns of its own.\n\nThe economic dimension is arguably more tractable. A great deal of misinformation exists because it's profitable: engagement generates advertising revenue, and false content is frequently more engaging than accurate content. Changing what gets rewarded — demonetising repeat offenders, reducing the amplification of unverified claims — addresses the incentive rather than fighting each instance.\n\nBut I'd put the most weight on education, specifically media literacy taught seriously in schools. Not a lecture on 'fake news', but practical skills: identifying a source, recognising the emotional manipulation in a headline, understanding why something appeared in your feed at all. Finland has done this systematically and appears to have unusually high resistance to disinformation.\n\nThe uncomfortable part is that misinformation succeeds because it satisfies people — it confirms what they already believe and provides a simple explanation for a complicated situation. Truth is often complicated and unsatisfying. That asymmetry isn't fixable by technology, which is why I think this will be managed rather than solved." },
      { role: 'examiner', text: 'Is traditional journalism still important?' },
      { role: 'candidate', text: "More important than ever, and simultaneously in the weakest financial position it has ever occupied, which is an unfortunate combination.\n\nThe reason it remains essential is that some functions genuinely cannot be crowdsourced. Investigative reporting — spending eight months and considerable money to expose corruption or a corporate safety failure — requires an institution that can fund the work, employ lawyers, and protect the journalist. No individual with a social media account can do that. Nearly every major scandal that reaches public attention started with professional reporters.\n\nThere's also the verification function, which sounds mundane but is the actual product. The value isn't the sentence published; it's the process behind it — checking, corroborating, seeking response, and being accountable for errors.\n\nThe difficulty is that the business model collapsed. Classified advertising, which quietly funded local newspapers for a century, moved to the internet, and subscription revenue hasn't replaced it. Local journalism has been hit hardest, and research consistently shows that when local papers close, corruption rises and voter turnout falls, which suggests the loss is civic rather than merely commercial.\n\nWhat replaces it is unresolved. Some outlets have succeeded with subscriptions, some with philanthropy, some with public funding — though that last one carries obvious risks to independence, which is a live concern in a country like mine." },
      { role: 'examiner', text: 'Do you think social media has been good or bad for public debate?' },
      { role: 'candidate', text: "My honest assessment is that it has been genuinely good for participation and quite bad for deliberation, and those pull in opposite directions.\n\nThe positive case is real and shouldn't be dismissed. Social media has given a voice to people who previously had none — activists, minority communities, ordinary citizens documenting events that institutions would rather ignore. It has broken monopolies on information in a number of countries, and it allows people to organise around shared concerns with very little money.\n\nBut the structure of these platforms is poorly suited to actual reasoning. Debate happens in public, in short form, in front of an audience, which makes changing your mind socially costly — you're performing for your own side rather than talking to the other. The incentives reward the sharpest formulation rather than the most careful one, and moral outrage spreads measurably faster than nuance.\n\nThere's also a distortion of perception. Highly engaged extreme voices are massively overrepresented, so people conclude their opponents are more numerous and more unreasonable than they actually are.\n\nSo where I land is this: social media has been excellent at surfacing problems and consistently poor at resolving them. It's an extraordinary tool for making a society hear something, and a very weak one for helping it decide what to do about it." },
    ],
    tips: [
      'Contrast the past and present media environment structurally, not just technologically',
      'Break a complex problem into dimensions (technical, economic, educational) before answering',
      'Cite a real example — Finland, local newspaper closures — to anchor an abstract claim',
      'A balanced verdict phrased sharply ("good for participation, bad for deliberation") is memorable',
    ],
    keyPhrases: [
      "There's no longer a moment when you sit down to get the news",
      'compete on equal terms',
      'What\'s been lost is the shared baseline',
      'addresses the incentive rather than fighting each instance',
      'the loss is civic rather than merely commercial',
      'excellent at surfacing problems and consistently poor at resolving them',
    ],
  },
  {
    id: 'ielts-49',
    title: 'Part 3 — Money, Consumption & Happiness',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'A discussion about wealth, consumerism, inequality, and whether money makes people happier.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Do you think money can buy happiness?' },
      { role: 'candidate', text: "I think the honest answer is that it depends enormously on where you're starting from, and the popular phrasing of the question obscures that.\n\nBelow a certain level, money buys happiness very directly, and I'd say anyone who denies this has probably never been genuinely short of it. If you can't afford medical treatment, or you're anxious about rent every month, additional income removes real suffering. My parents' generation experienced significant scarcity, and the improvement in living standards since has straightforwardly improved lives.\n\nAbove that level, the relationship weakens considerably. The research on this is fairly consistent — additional income continues to help, but with sharply diminishing returns, because much of what we buy at higher incomes is positional. A larger apartment feels good largely relative to what people around you have, so if everyone's apartment grows, the gain evaporates. It's a treadmill.\n\nWhat money reliably buys, I'd argue, isn't happiness but options — the ability to leave a bad job, absorb an emergency, take a risk, or buy time. And time is probably the most underrated purchase. People routinely spend money to acquire objects and rarely spend it to acquire hours, even though hours are the thing they later say they wished they'd had." },
      { role: 'examiner', text: 'Why do you think people buy things they do not need?' },
      { role: 'candidate', text: "There are several mechanisms operating at once, and I think it's unfair to reduce it to individual weakness.\n\nThe most obvious is that consumption is a form of communication. What people buy signals status, taste, group membership, and aspiration. A watch tells you the time and also tells everyone else something about you, and the second function is often what's actually being purchased.\n\nSecond, there's an emotional mechanism. Buying something provides a genuine, if brief, sense of progress and control. When people are stressed or dissatisfied, purchasing is a fast and socially acceptable relief, which is why retail therapy is a real and well-documented phenomenon.\n\nThird — and this is where I'd shift the blame away from individuals — enormous professional effort goes into manufacturing the desire. Advertising's central technique is to create dissatisfaction with your current situation and then present the product as the resolution. Add the frictionless design of online shopping, and you have a system deliberately engineered to convert a fleeting impulse into a completed purchase before reflection can intervene.\n\nAnd fourth, there's simple adaptation. Anything you buy becomes normal within weeks, which resets your baseline and creates the conditions for the next purchase. That's not irrationality exactly; it's a well-documented feature of how human satisfaction works, and the industry understands it far better than most consumers do." },
      { role: 'examiner', text: 'Is a large gap between rich and poor a serious problem for a society?' },
      { role: 'candidate', text: "Yes, and I'd argue the problem is structural rather than a matter of fairness alone, which is the stronger case.\n\nThe practical argument is that severe inequality erodes trust and social cohesion. When people's lives diverge sufficiently, they stop sharing schools, hospitals, neighbourhoods, and eventually assumptions. Once the wealthy exit public services, their incentive to fund them properly disappears, and quality declines for everyone else. That's a self-reinforcing cycle rather than a one-off unfairness.\n\nThere's an economic argument too. Wealth concentrated at the top is disproportionately saved rather than spent, which weakens demand, and it tends to be reinvested in assets like property, pushing prices further beyond ordinary incomes. My country is experiencing exactly this — urban property prices have decoupled from local salaries to the point where a young professional in our capital cannot realistically buy a home through employment income alone.\n\nAnd there's a political dimension. Concentrated wealth reliably translates into political influence, which is then used to protect that wealth. That's where inequality becomes self-perpetuating rather than a natural outcome of differing effort.\n\nWhere I'd be careful is in distinguishing inequality from mobility. A degree of inequality is inevitable and arguably useful as an incentive. What's genuinely corrosive is when your outcome is determined mainly by your parents' position — at that point the system stops rewarding effort and starts merely transmitting advantage." },
      { role: 'examiner', text: 'Do you think attitudes toward money differ between generations?' },
      { role: 'candidate', text: "Very much so, and in my country the differences are particularly sharp because the economic context changed so quickly.\n\nMy grandparents' generation was formed by genuine scarcity, and their relationship with money is primarily about security. Saving is almost a moral value; visible spending on oneself carries a slight discomfort. They keep things that are broken because throwing away a repairable object was unthinkable for most of their lives.\n\nMy parents' generation lived through the transition and combined both instincts — they saved diligently but also invested, mainly in property and in their children's education, which they saw as the reliable route out of uncertainty.\n\nMy own generation, particularly urban professionals, has a noticeably different attitude. We're more comfortable spending on experiences — travel, eating out, hobbies — which my grandmother would find close to incomprehensible. There's more debt, more spending on convenience, and less assumption that a house must be bought as early as possible.\n\nI'd resist reading that as simple irresponsibility, though. Some of it is a rational response to circumstances: when property prices have risen far faster than wages, the traditional strategy of saving toward a home has become genuinely unachievable for many people, so it's not surprising that money gets redirected toward things that are actually attainable. Different behaviour doesn't always mean different values; sometimes it means different arithmetic." },
    ],
    tips: [
      'Split a question by threshold ("below a certain level... above that level") for a nuanced answer',
      'Attribute causes to systems as well as individuals — it demonstrates analytical maturity',
      'Distinguish closely related concepts, such as inequality vs. social mobility',
      'Defend a younger generation with reasoning rather than sentiment: "different arithmetic"',
    ],
    keyPhrases: [
      'with sharply diminishing returns',
      'much of what we buy at higher incomes is positional',
      "money buys options, not happiness",
      'convert a fleeting impulse into a completed purchase',
      'have decoupled from local salaries',
      'merely transmitting advantage',
    ],
  },
  {
    id: 'ielts-50',
    title: 'Part 3 — Housing & Urban Living',
    part: 'Part 3',
    topic: 'Home & Living',
    description: 'A discussion about housing affordability, apartment living, city planning, and what makes a good place to live.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why is housing so expensive in many cities today?' },
      { role: 'candidate', text: "The fundamental reason is a mismatch between where people want to live and how much housing is permitted there, but there are several forces layered on top of that.\n\nThe first is straightforward demand. Cities concentrate jobs, particularly well-paid ones, so people move to them, and supply hasn't expanded at the same rate. In many cities that's a policy choice rather than a physical constraint — planning restrictions limit how densely you can build, often because existing owners benefit from scarcity and are politically organised.\n\nThe second factor, and I think the more important one recently, is that housing has become an investment asset rather than simply a place to live. When property is treated as a store of wealth, demand no longer comes only from people who need somewhere to sleep. In my country this is very pronounced — a great deal of urban property is bought speculatively, and you can see entire apartment buildings and even resort developments that are largely empty. Land is held vacant because holding it is profitable.\n\nThird, low interest rates over the past decade inflated asset prices generally, and property most of all, since it's the asset ordinary people can borrow most heavily against.\n\nThe result in cities like our capital is that prices have separated almost completely from local wages. When the ratio of house price to average income reaches twenty or thirty times, ownership stops being achievable through work, and that has consequences well beyond housing itself." },
      { role: 'examiner', text: 'Is it better to live in a house or an apartment?' },
      { role: 'candidate', text: "I'd say it depends far more on stage of life and location than on any inherent superiority of either.\n\nApartments have genuine advantages that are often undersold. They're more efficient in energy and in land use, they're usually closer to work and services, and there's considerably less maintenance — which matters more than people expect. In a dense, well-designed city, apartment living means you can walk to most of what you need, and that has a measurable effect on daily quality of life.\n\nHouses offer space, privacy, outdoor access, and control over your own environment. For families with young children, and for anyone who wants a garden or workspace, those advantages are difficult to replicate.\n\nWhat I'd emphasise is that the comparison is usually really about the neighbourhood rather than the building. A well-built apartment in a walkable area with parks nearby is far better to live in than a detached house on the edge of a city with a ninety-minute commute. The commute alone is one of the most consistently negative factors in life satisfaction research.\n\nIn my country specifically, the traditional preference for owning land and a house remains strong — an apartment is still viewed by many older people as somehow less real. But in cities that's becoming unaffordable for most young people, so apartment living is increasingly the practical outcome rather than a preference." },
      { role: 'examiner', text: 'What makes a neighbourhood a good place to live?' },
      { role: 'candidate', text: "I'd put walkability near the top, and not for aesthetic reasons. When the ordinary business of daily life — buying food, getting to a café, reaching a school — can be done on foot, a great deal follows. You encounter your neighbours incidentally, which is how weak social ties actually form; you move without treating it as exercise; and you don't lose an hour of every day to traffic.\n\nSecond, I'd say a mixture of uses and of people. Neighbourhoods that are purely residential become dead during the day, and areas segregated strictly by income tend to be both duller and less resilient. What makes my own area pleasant is that there's an office building, a wet market, several schools, and housing at very different price levels within a few hundred metres.\n\nThird, public space that's genuinely usable — parks, a riverside walkway, somewhere to sit that doesn't require buying anything. That last point matters more than it seems, because a city where all the comfortable places are commercial quietly excludes anyone without money.\n\nAnd fourth, some degree of stability. Neighbourhoods need a proportion of long-term residents to develop the informal trust that makes a place feel safe. Areas that turn over completely every two years never develop that, regardless of how well designed they are.\n\nWhat I'd notice is that almost none of these are about the buildings themselves, which I think is the mistake most property development makes." },
      { role: 'examiner', text: 'How should governments respond to housing shortages?' },
      { role: 'candidate', text: "I'd argue the response has to work on both supply and the treatment of housing as an asset, because addressing only one tends to fail.\n\nOn supply, the most effective lever is usually permitting more construction, particularly denser housing near transport and employment. Where cities have relaxed restrictions substantially — Tokyo is the standard example — prices have stayed far more stable than in comparable cities that didn't. It's unglamorous, but the arithmetic is difficult to escape: if a city adds people faster than homes, prices rise regardless of what else is done.\n\nOn the demand side, I'd support measures that reduce the incentive to hold housing purely as an investment — vacancy taxes, higher rates on additional properties, restrictions on speculative purchase. My country has debated a property tax for years without implementing one, and in the meantime holding empty land carries almost no cost, which is precisely why so much is held empty.\n\nDirect public provision has a role too, particularly for people the market will never serve. Singapore is the striking case — around eighty percent of the population lives in public housing, and it's neither stigmatised nor poor quality. That model isn't easily transplanted, since it depended on the state controlling land early, but it demonstrates that widespread affordable housing is achievable rather than utopian.\n\nWhat I'd avoid is demand-side subsidies alone — first-time buyer grants and cheap loans without additional supply. They sound generous, but in a constrained market they're largely absorbed into higher prices, which benefits sellers rather than the people they're meant to help." },
    ],
    tips: [
      'Layer causes: fundamental cause first, then secondary factors — it structures a long answer well',
      'Use international comparisons (Tokyo, Singapore) precisely, including their limitations',
      'Redirect a narrow question ("house or apartment") toward the more meaningful variable',
      'Explaining why a popular policy fails shows genuine analytical confidence',
    ],
    keyPhrases: [
      'housing has become an investment asset rather than a place to live',
      'prices have separated almost completely from local wages',
      'the comparison is really about the neighbourhood rather than the building',
      'how weak social ties actually form',
      'holding empty land carries almost no cost',
      'largely absorbed into higher prices',
    ],
  },
  {
    id: 'ielts-51',
    title: 'Part 3 — Language, English & Globalisation',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'A discussion about the global spread of English, language learning, dying languages, and translation technology.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why has English become the dominant international language?' },
      { role: 'candidate', text: "I think it's important to be clear that it isn't because of any quality of the language itself. English isn't especially easy — the spelling is notoriously irregular and the phrasal verbs are a nightmare for learners, myself included. Its position is historical and economic rather than linguistic.\n\nThe first stage was the British Empire, which spread the language across a quarter of the world's population and embedded it in the administration, law, and education of dozens of countries. The second, and probably more decisive stage, was American economic and cultural dominance in the twentieth century — business, science, film, music, and then the internet, which was built in English and by default carried it everywhere.\n\nWhat sustains it now is a network effect, which is self-reinforcing and quite hard to reverse. People learn English because other people have learned English. For a Korean engineer and a Brazilian engineer, English is the practical bridge, and neither of them is learning it out of affection for Britain or America. The majority of English conversations in the world now take place between non-native speakers, which I find a genuinely interesting fact.\n\nThat's also why I'd be cautious about predicting a straightforward replacement by Mandarin, despite China's economic weight. Displacing an established network standard requires more than economic size — it would require the world to abandon an investment it has already made." },
      { role: 'examiner', text: 'What are the disadvantages of one language dominating the world?' },
      { role: 'candidate', text: "There are several, and they're easy to underestimate if you happen to speak that language natively.\n\nThe most concrete is the advantage it confers. Native speakers can participate fully in international business, academia, and diplomacy without the years of effort that everyone else has to invest. In science this is quite serious — good research from non-English-speaking countries is systematically under-cited, and researchers spend time on language that their English-speaking colleagues spend on the work itself. It's an invisible tax.\n\nThe second issue is the effect on other languages. When English becomes the language of prestige, science, and advancement, other languages can get pushed into domestic and informal use. That's already visible in my country — technical and business vocabulary is increasingly borrowed directly, and there's a real risk that my language stops developing in certain domains because nobody bothers to create the terminology.\n\nThird, and more abstractly, languages encode ways of organising experience. Concepts that exist naturally in one language often require a paragraph in another. My language has a system of pronouns that encodes age, relationship, and respect in every sentence, which is essentially untranslatable — you simply lose it in English. If the world converges linguistically, some of that variety in thought goes with it.\n\nI want to be balanced, though. A shared language has enormous benefits — cooperation, science, and my own career all depend on it. The problem isn't English existing as a common tongue; it's English displacing rather than coexisting." },
      { role: 'examiner', text: 'Should governments try to protect minority or dying languages?' },
      { role: 'candidate', text: "I'd say yes, though I'd want to be honest about how difficult and expensive it is, and about who gets to decide.\n\nThe case for protection is that a language is not merely a set of labels for the same fixed objects. It carries oral literature, ecological knowledge, medicinal practice, and a distinct way of seeing relationships and time. When a language dies, that knowledge is very rarely recorded first — it usually disappears entirely. My country has dozens of ethnic minority groups with their own languages, several of which are now spoken only by older people, and what's disappearing with them is not recoverable.\n\nOn method, I'd argue documentation is the minimum obligation — recording and archiving while native speakers are alive — but revitalisation requires more than that. The evidence suggests a language only survives if it's used in ordinary daily life, which means education in that language, some economic or administrative value attached to it, and media. Welsh and Basque have been partially revived precisely because they were given institutional roles rather than just sentimental respect.\n\nThe honest complication is that language shift is usually driven by people making rational decisions for their own children — parents choose the majority language because it leads to jobs and education. So protection has to avoid becoming a policy of preserving a culture at the expense of the people living in it. My view is that the goal should be bilingualism rather than isolation: nobody should have to lose their language to participate fully in the wider economy, and it's the state's job to make that possible." },
      { role: 'examiner', text: 'Will translation technology make language learning unnecessary?' },
      { role: 'candidate', text: "I don't think so, though I do expect it to change who needs to learn and why.\n\nFor a large category of practical situations, technology is already sufficient. A tourist ordering food, a traveller reading a sign, a manager skimming a foreign document — those problems are essentially solved, and that's genuinely useful. It removes a real barrier for people who have no time or opportunity to study for years.\n\nBut I'd argue it doesn't touch the more important functions of speaking a language. Translation is asymmetric with trust: a negotiation, a job interview, a difficult conversation with a colleague — these depend on nuance, timing, and the ability to respond immediately. Speaking someone's language directly signals investment and respect in a way that holding up a phone simply cannot.\n\nThere's also a cognitive dimension that gets ignored in this debate. Learning a language changes how you think about your own — you notice structures in my own language that I'd never have examined without learning English. That benefit belongs to the learner, and no tool can perform it on your behalf, in the same way that a calculator doesn't remove the value of understanding mathematics.\n\nSo my expectation is a split rather than a decline. Casual, transactional language learning will probably shrink, because the practical motivation weakens. But serious learning — for people who want to work, live, or build relationships across a language boundary — will remain, and may even become more valued precisely because fewer people bother." },
    ],
    tips: [
      'Explain a dominant position through history and network effects, not inherent merit',
      'Name the invisible costs others miss ("an invisible tax" on non-native researchers)',
      'Acknowledge the rational reasons behind a trend you regret — it prevents sentimentality',
      'Predict a split or shift rather than a simple rise or fall; it\'s usually more accurate and sounds it',
    ],
    keyPhrases: [
      'Its position is historical and economic rather than linguistic',
      'People learn English because other people have learned English',
      "It's English displacing rather than coexisting",
      'sentimental respect vs. institutional roles',
      'Translation is asymmetric with trust',
      'a split rather than a decline',
    ],
  },
  {
    id: 'ielts-52',
    title: 'Part 3 — Ageing Populations & Social Change',
    part: 'Part 3',
    topic: 'Health & Lifestyle',
    description: 'A discussion about longer life expectancy, retirement, generational fairness, and how societies should adapt to ageing.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why are populations in many countries getting older?' },
      { role: 'candidate', text: "Two things are happening simultaneously, and it's the combination that produces the demographic shift rather than either alone.\n\nThe first is that people live considerably longer. Improvements in sanitation, nutrition, vaccination, and medical treatment have added decades to life expectancy over a century. In my country, life expectancy has risen from around sixty in the 1970s to well over seventy today. That's an unambiguous success, and it's worth stating plainly before discussing it as a problem.\n\nThe second, and the more powerful driver, is falling birth rates. As countries urbanise and educate women, family size drops sharply, and the causes are quite rational: children in a city are expensive rather than economically productive, housing is constrained, and career and education delay the age at which people start families. Our fertility rate has now fallen to roughly replacement level and continues to decline in the major cities.\n\nWhat's distinctive about my country's situation, and this concerns me, is the speed. European countries grew wealthy over a century and aged gradually. We are ageing considerably faster while still being a middle-income country. The common formulation is that we risk growing old before we grow rich, which leaves much less time to build the pension and healthcare systems that ageing societies require." },
      { role: 'examiner', text: 'What problems does an ageing population create?' },
      { role: 'candidate', text: "The core difficulty is arithmetic. Pension and healthcare systems in most countries are funded by current workers paying for current retirees. When the ratio of workers to retirees falls from, say, five to one down to two to one, that arrangement comes under severe strain, and the options are all politically unattractive: higher taxes, later retirement, or reduced benefits.\n\nHealthcare demand is the second problem, and it's not merely a matter of more patients. Older populations need a different kind of care — chronic condition management, long-term support, dementia care — which is labour-intensive and difficult to make more efficient. You can automate manufacturing; you cannot easily automate helping someone wash and dress with dignity.\n\nThere's a labour supply issue as well. A shrinking working-age population constrains growth, which is precisely the situation Japan has been managing for decades.\n\nAnd there's a subtler political effect that I think is underdiscussed. Older voters participate at higher rates, so policy tends to tilt toward protecting pensions and property values over investment in education, housing, and children. That's not a conspiracy, it's just how electorates work — but it can lock in generational unfairness.\n\nI'd add one qualification. Much of this framing assumes people over sixty-five are dependants, which is increasingly inaccurate. A healthy seventy-year-old today is very different from one in 1960, and a lot of the 'problem' is really a mismatch between our institutions and how long people now remain capable." },
      { role: 'examiner', text: 'Should the retirement age be increased?' },
      { role: 'candidate', text: "I think some increase is probably unavoidable, but I'd argue the standard proposal is too blunt to be fair.\n\nThe case for raising it is straightforward. Retirement ages were set when life expectancy was much lower and when work was more physically punishing. If people live twenty years longer, funding a retirement of the same relative length requires either much higher contributions or a later start. That arithmetic doesn't disappear because it's unpopular.\n\nMy objection is to applying a single number to everyone, because life expectancy and work capacity differ substantially by occupation and income. A professional who sits at a desk can generally work to sixty-eight without difficulty. A construction worker or someone who has done manual labour since eighteen often physically cannot, and statistically will die younger — so raising the threshold uniformly takes disproportionately from people who have already had the harder working life. That strikes me as regressive in a way that rarely gets acknowledged.\n\nSo I'd favour more flexible approaches: allowing earlier retirement for physically demanding occupations, phased or part-time retirement rather than a hard stop, and stronger measures against age discrimination in hiring, because raising the retirement age achieves nothing if employers won't hire people over fifty-five.\n\nAnd I'd note that in my country, where a large proportion of workers are in the informal economy with no pension at all, the retirement age debate applies to a minority. The more urgent question here is building coverage in the first place." },
      { role: 'examiner', text: 'How can societies make better use of older people?' },
      { role: 'candidate', text: "I think the framing of older people as a burden is both inaccurate and self-fulfilling, and changing it is the first step.\n\nThe most obvious underused resource is experience. In my own field, marketing, there's a strong bias toward youth — it's assumed to be a young person's industry — and I think that's costly. Some of the most valuable capabilities in a team are judgement, knowing which problems are worth solving, and having seen a similar failure before. Those are acquired only through time. The most effective mentoring I received came from someone with twenty years more experience than me.\n\nSecond, there's an enormous amount of unpaid work already being done that isn't counted. Grandparents providing childcare are a substantial part of why parents in my country can work at all, and that's real economic value that appears in no statistics.\n\nThird, I'd argue for redesigning work rather than simply extending it. Rigid full-time employment until a fixed date and then nothing is a crude structure. Phased retirement, part-time consulting, and formal mentoring roles allow people to contribute at a sustainable level rather than falling off a cliff — and abrupt retirement is associated with real declines in health and cognition, so this isn't only an economic argument.\n\nAnd finally, age discrimination in hiring needs to be treated as seriously as other forms of discrimination. At present, someone made redundant at fifty-eight often finds it nearly impossible to be hired again, and that's a societal waste as much as an individual injustice." },
    ],
    tips: [
      'Lead with demographic mechanics before discussing consequences — it establishes authority',
      'Name your country\'s specific version of a global problem ("old before we grow rich")',
      'Attack a policy on distributional grounds, not just feasibility — it\'s a sophisticated argument',
      'Challenge the assumption embedded in a question when it deserves challenging',
    ],
    keyPhrases: [
      "it's worth stating plainly before discussing it as a problem",
      'we risk growing old before we grow rich',
      'the options are all politically unattractive',
      'a mismatch between our institutions and how long people remain capable',
      'takes disproportionately from people who have had the harder working life',
      'falling off a cliff',
    ],
  },
  {
    id: 'ielts-53',
    title: 'Part 3 — Transport, Cars & Mobility',
    part: 'Part 3',
    topic: 'Environment',
    description: 'A discussion about traffic, public transport, electric vehicles, and how people will move around cities in the future.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'What are the main transport problems in cities today?' },
      { role: 'candidate', text: "Congestion is the most visible, but I'd argue it's a symptom rather than the underlying problem. The underlying problem is that most cities have been organised around private vehicles, which are extraordinarily inefficient users of space. A car occupies roughly the same road area as ten people on a bus and typically carries one person, and it also has to be stored somewhere for the twenty-three hours a day it isn't moving.\n\nThe second problem is safety, and I think it's badly underweighted globally. Road deaths in my country remain very high — traffic accidents are a leading cause of death for young men here — and yet it's treated as an unfortunate background fact rather than a crisis. If any other cause killed comparable numbers, the response would be entirely different.\n\nThird, air quality. Transport emissions are a major contributor to urban pollution, with measurable effects on respiratory and cardiovascular health, and the burden falls disproportionately on people living beside major roads, who are usually not the wealthiest.\n\nAnd finally there's an equity dimension. Cities built for cars quietly disadvantage everyone who doesn't have one — children, older people, the poor. When crossing a road becomes dangerous and shops are only reachable by driving, a significant part of the population loses independence." },
      { role: 'examiner', text: 'How can governments encourage people to use public transport?' },
      { role: 'candidate', text: "The honest answer is that it requires making public transport genuinely better, and simultaneously making driving less automatically convenient — and governments are usually willing to attempt only the first half.\n\nOn the positive side, the factors that determine whether people use transit are fairly well established: frequency above almost everything else, reliability, coverage, and safety. Frequency matters most because it removes the need to plan. If a service comes every five minutes, you simply turn up; if it comes every thirty, you organise your day around it, and most people will choose a car instead. My city's buses fail precisely on this point — the coverage exists on paper but the frequency makes them impractical for commuting.\n\nPrice matters, though less than people assume. Free transit experiments have had mixed results, because the barrier for most middle-class commuters isn't the fare, it's the inconvenience.\n\nThe harder half is demand management: congestion charging, higher parking costs, removing parking minimums, reallocating road space to buses and bicycles. These are politically painful, and they're also the measures with the strongest evidence behind them. London and Singapore both demonstrate that congestion pricing works.\n\nI'd add that land use is inseparable from this. If a city permits low-density development on its outskirts, no transit system can serve it economically. Transport policy and planning policy have to be made together, and in most places they're handled by separate authorities that barely coordinate." },
      { role: 'examiner', text: 'Will electric vehicles solve the environmental problems of transport?' },
      { role: 'candidate', text: "They address one problem well and leave several others entirely untouched, which is why I'd resist treating them as a complete answer.\n\nWhat they genuinely solve is tailpipe emissions, and that's not trivial. Urban air quality improves immediately and substantially, and even accounting for a fossil-heavy electricity grid, the lifetime emissions of an electric vehicle are lower than a petrol equivalent — the gap widens as grids decarbonise. In my city, where electric scooters are already becoming common in cities, the local air quality benefit is very real.\n\nWhat they don't solve is everything related to space and volume. An electric car creates the same congestion, requires the same parking, kills pedestrians at similar rates, and demands the same road-building. If a city replaces every petrol car with an electric one, it remains a city where crossing the road is unpleasant and children can't travel independently.\n\nThere are also upstream costs that get glossed over. Battery production is materially intensive — lithium, cobalt, nickel — with significant mining impacts and difficult labour conditions in some supply chains. And manufacturing a new vehicle carries a substantial carbon cost of its own, so replacing a functioning car early isn't automatically an environmental gain.\n\nMy overall position is that electrification is necessary but insufficient. The larger prize is reducing the number of vehicle journeys altogether through density, transit, and walkable design — and there's a risk that focusing on electric vehicles lets us feel we've addressed the problem while the more difficult structural changes are deferred." },
      { role: 'examiner', text: 'How do you think people will travel in fifty years?' },
      { role: 'candidate', text: "I'll answer with some humility, because transport predictions have a poor historical record — we were promised flying cars decades ago and instead got better trains and an app for hailing a taxi.\n\nWithin cities, I'd expect the changes to be less dramatic than people imagine and more about arrangement than invention. Vehicles will be electric and probably substantially autonomous. But I think the bigger shift will be a rebalancing of space — cities reclaiming road area for pedestrians, cycling, and transit, which is already happening in Paris and elsewhere. The technologies that transform daily mobility may turn out to be unglamorous: electric bicycles have already changed more journeys in more places than autonomous vehicles have.\n\nBetween cities, high-speed rail seems likely to take a considerable share from short-haul aviation wherever the geography allows, particularly as carbon costs are internalised. The high-speed line my country has been planning, if it's built, would be transformative for exactly that reason.\n\nLong-haul aviation is the genuinely difficult case. Batteries are far too heavy for it, so it depends on sustainable fuels or hydrogen, both of which are technically plausible and economically painful. My expectation is that flying becomes meaningfully more expensive, which would reverse the cheap-flight era of my lifetime.\n\nAnd I'd note the possibility that the most significant change is a reduction in travel rather than a transformation of it. Remote work has already eliminated a substantial number of commutes and business trips. Sometimes the most consequential transport innovation is one that removes the need for the journey entirely." },
    ],
    tips: [
      'Identify the symptom versus the underlying cause early — it frames the whole answer',
      'Use spatial and physical reasoning ("a car occupies the road area of ten bus passengers")',
      'Give a technology fair credit before explaining its limits — it makes the critique credible',
      'Open a prediction question with humility, then commit to specific claims anyway',
    ],
    keyPhrases: [
      "it's a symptom rather than the underlying problem",
      'treated as an unfortunate background fact rather than a crisis',
      'frequency removes the need to plan',
      'necessary but insufficient',
      'lets us feel we\'ve addressed the problem',
      'removes the need for the journey entirely',
    ],
  },
  {
    id: 'ielts-54',
    title: 'Part 3 — Advertising & Consumer Behaviour',
    part: 'Part 3',
    topic: 'Media & Entertainment',
    description: 'A discussion about advertising, influence, marketing to children, and the regulation of persuasion.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How has advertising changed in recent years?' },
      { role: 'candidate', text: "The fundamental change is from broadcast to targeting. Traditional advertising was a blunt instrument — you bought space in a newspaper or a slot on television and reached everyone watching, most of whom had no interest in the product. It was expensive and wasteful, but it was also public: everyone saw the same advertisement, so it could be scrutinised and criticised collectively.\n\nWhat's replaced it is individually targeted and largely invisible to everyone except the recipient. Advertisers can now select audiences by age, location, browsing history, purchase behaviour, and inferred emotional state. The advertisement I see for a product may make a claim that would be challenged immediately if it were broadcast publicly, but nobody else sees it. I find that accountability gap more concerning than the targeting itself.\n\nThe second change is the blurring of the boundary between advertising and content. Influencer marketing, sponsored posts, product placement, and native advertising are all designed to not look like advertising, and they work precisely because our defences activate when we recognise a sales attempt. A recommendation from someone you've followed for two years bypasses that entirely.\n\nAnd third, the sophistication has increased enormously. Advertising is now continuously tested — thousands of variations measured against actual behaviour rather than stated preference. That's a very different discipline from a copywriter's intuition in 1970." },
      { role: 'examiner', text: 'Do you think advertising influences people more than they realise?' },
      { role: 'candidate', text: "Almost certainly, and the strongest evidence is that most people confidently believe they're unaffected while companies spend hundreds of billions annually on the assumption that they are. Both cannot be right, and I'd trust the money over the self-assessment.\n\nPart of the reason is that people misunderstand how it works. They imagine advertising as an argument to be accepted or rejected, so they conclude that since they've never been persuaded by a claim, they're immune. But most modern advertising doesn't argue at all. It builds familiarity and association — linking a product with a feeling, an identity, or a moment — and those associations operate below the level where you'd notice or resist them. When you're standing in a shop choosing between two similar products, the one that feels vaguely more familiar wins, and that feeling is exactly what was purchased.\n\nThere's also an effect on norms rather than on individual purchases, which I think is the more significant one. Decades of advertising shape what a society considers a normal standard of living, an acceptable appearance, or a reasonable thing to want. That doesn't sell a specific item; it constructs the environment in which selling happens.\n\nI'd include myself here without hesitation. I work in marketing, I understand the mechanisms reasonably well, and I'm certain I'm still influenced — knowing how a magic trick works doesn't stop you from seeing the illusion." },
      { role: 'examiner', text: 'Should advertising to children be restricted?' },
      { role: 'candidate', text: "Yes, and this is one of the few areas where I hold a fairly unqualified position.\n\nThe core argument is about capacity for consent. Advertising is a persuasive act directed at someone assumed capable of evaluating it critically. Research fairly consistently shows that young children cannot reliably distinguish advertising from other content, and don't understand persuasive intent until around eight to twelve years old. So this isn't persuasion between equals; it's exploiting a developmental limitation. We accept this reasoning for contracts, alcohol, and gambling — I don't see why marketing should be exempt.\n\nThe second argument is about the specific harms. A large proportion of food advertising to children promotes exactly the products contributing to rising childhood obesity, and the correlation between exposure and consumption is well documented. There's also the deliberate use of children as leverage on their parents, which the industry has studied explicitly.\n\nOn implementation, several countries have acted. Sweden and Quebec ban most advertising to young children, and the UK restricts junk food advertising around children's programming. These haven't produced any of the catastrophic effects the industry predicted.\n\nThe genuine difficulty is enforcement in a digital environment. Rules built for television don't map cleanly onto influencer content, in-game purchases, or algorithmic feeds, where the boundary between entertainment and advertising is deliberately indistinct. That's an argument for updating the rules, though, not for abandoning the principle." },
      { role: 'examiner', text: 'Does advertising have any benefits for society?' },
      { role: 'candidate', text: "It does, and I'd rather acknowledge them than pretend the case is one-sided.\n\nThe most substantial is funding. Advertising pays for an enormous amount of content that people use without direct payment — search, journalism, video platforms, much of the free internet. There are real problems with that model, particularly the incentive toward engagement over quality, but the alternative isn't a pristine ad-free internet; it's a subscription internet that would exclude a great many people. In a country like mine, where disposable income is limited, ad-supported access has genuine democratic value.\n\nSecond, advertising does perform an information function, especially for new products and for smaller companies. Without any means of reaching customers, markets would tilt further toward established brands that already have recognition. In principle advertising lowers the barrier for a new entrant with a better product.\n\nThird, public health and safety campaigns use exactly the same techniques for clearly beneficial ends — anti-smoking campaigns, road safety, vaccination drives. Persuasion isn't inherently illegitimate; the technique is neutral even when its typical use isn't.\n\nWhere I'd end, though, is that these benefits describe advertising as it could be — informative, funding useful things, occasionally serving public ends. The concerns I raised earlier describe a great deal of it as it actually is. So my position isn't that advertising should be eliminated, but that persuasion at industrial scale is a form of power, and we regulate other forms of power rather than trusting they'll be used well." },
    ],
    tips: [
      'Point out an inconsistency to make an argument vivid ("both cannot be right")',
      'Correct a common misconception about a mechanism — it shows genuine understanding',
      'Cite specific jurisdictions when discussing regulation; it makes the answer concrete',
      'Give the opposing case its strongest form before delivering your conclusion',
    ],
    keyPhrases: [
      'from broadcast to targeting',
      'the accountability gap',
      'designed to not look like advertising',
      "I'd trust the money over the self-assessment",
      'it constructs the environment in which selling happens',
      'persuasion at industrial scale is a form of power',
    ],
  },
  // ── Part 1: more topics ──────────────────────────────
  {
    id: 'ielts-55',
    title: 'Part 1 — Music',
    part: 'Part 1',
    topic: 'Arts & Culture',
    description: 'Part 1 questions about the music you listen to, when you listen to it, and how your taste has changed over time.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you listen to music often?' },
      { role: 'candidate', text: "Pretty much all day, to be honest. I've got headphones in on the commute, and I usually have something quiet playing in the background while I'm writing at work. It helps me settle into a task, almost like a signal to my brain that it's time to concentrate. The only time I really go without it is when I'm in meetings." },
      { role: 'examiner', text: 'What kind of music do you like?' },
      { role: 'candidate', text: "My taste is all over the place, really. At work I tend to go for instrumental stuff — jazz or ambient music — because lyrics pull my attention away from what I'm writing. But at the weekend I'm much more into upbeat pop and old soul records. I'd say I choose music to suit my mood rather than sticking to one genre." },
      { role: 'examiner', text: 'Has your taste in music changed since you were a child?' },
      { role: 'candidate', text: "Quite dramatically, yes. As a teenager I was obsessed with whatever was in the charts, and I'd have been embarrassed to admit I liked anything my parents listened to. Ironically, a lot of the songs they used to play in the car are now some of my favourites. I suppose as you get older you stop worrying about whether something is cool and just listen to what you enjoy." },
      { role: 'examiner', text: 'Have you ever learned to play a musical instrument?' },
      { role: 'candidate', text: "I had piano lessons for a few years when I was at primary school, but I gave up once exams got serious. I really regret that now. I've actually been thinking about picking it up again — there are plenty of apps and online lessons these days, so there's not much of an excuse. Whether I'll find the time is another matter." },
      { role: 'examiner', text: 'Do you prefer listening to live music or recorded music?' },
      { role: 'candidate', text: "Day to day it's obviously recorded music, just for convenience. But nothing really compares to a live performance. There's a small venue near the seafront in my city that has bands on Friday nights, and the atmosphere there is something you simply can't get through headphones. You feel the music rather than just hearing it." },
    ],
    tips: [
      'Contrast situations ("At work... but at the weekend...") to give a fuller answer to a simple question',
      'Talk about how things have changed over time — it is an easy way to show past and present tenses',
      'Expressing regret with "I really regret that now" shows natural emotional language',
      'Finish an answer with a short, memorable line rather than trailing off',
    ],
    keyPhrases: [
      'Pretty much all day, to be honest',
      'My taste is all over the place, really',
      'I choose music to suit my mood rather than...',
      'I suppose as you get older you stop worrying about...',
      "Whether I'll find the time is another matter",
      'nothing really compares to...',
    ],
  },
  {
    id: 'ielts-56',
    title: 'Part 1 — Clothes & Fashion',
    part: 'Part 1',
    topic: 'Home & Living',
    description: 'Part 1 questions about the clothes you wear, how you shop for them, and whether you follow fashion trends.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'What kind of clothes do you usually wear?' },
      { role: 'candidate', text: "On a typical day it's fairly smart casual — chinos and a shirt, nothing too formal. Our office has quite a relaxed dress code, so I only wear a jacket if I'm meeting a client. At the weekend I live in jeans and T-shirts. Since my city is by the sea and it's warm most of the year, comfort tends to win over style." },
      { role: 'examiner', text: 'Do you follow fashion trends?' },
      { role: 'candidate', text: "Not really, no. I'm aware of them, partly because working in marketing you can't avoid seeing what's popular, but I don't feel any pressure to keep up. Trends seem to come and go so quickly now that by the time you've bought something, it's already out of date. I'd rather have a few well-made pieces that I'll actually wear for years." },
      { role: 'examiner', text: 'Where do you usually buy your clothes?' },
      { role: 'candidate', text: "Mostly online these days, if I'm honest. It's just so much more convenient than spending a Saturday afternoon trailing round shopping centres. The downside is that sizes vary so much between brands that I end up sending quite a lot back. For anything more expensive, like a suit, I still prefer to go into a shop and try it on properly." },
      { role: 'examiner', text: 'Have you ever bought clothes that you never wore?' },
      { role: 'candidate', text: "Guilty as charged. A couple of years ago I bought a bright yellow jacket in a sale because it seemed like a bargain, and I think I've worn it exactly once. It looked great in the shop, but in real life it just didn't go with anything I owned. That taught me a lesson — now I ask myself whether I'd buy something at full price before I buy it on sale." },
    ],
    tips: [
      'Link your answer to your own circumstances — job, climate, lifestyle — to make it sound personal',
      'An idiom like "Guilty as charged" is a natural, light-hearted way to admit something',
      'Use "I\'d rather..." to express preferences — examiners notice this structure',
      'Explain what you learned from an experience to extend a past-tense answer naturally',
    ],
    keyPhrases: [
      'comfort tends to win over style',
      "I don't feel any pressure to keep up",
      "I'd rather have a few well-made pieces",
      'Mostly online these days, if I\'m honest',
      'Guilty as charged',
      'That taught me a lesson',
    ],
  },
  {
    id: 'ielts-57',
    title: 'Part 1 — Photographs & Taking Pictures',
    part: 'Part 1',
    topic: 'Arts & Culture',
    description: 'Part 1 questions about taking photos, what you like to photograph, and how you keep your pictures.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you like taking photographs?' },
      { role: 'candidate', text: "I do, although I'd hardly call myself a photographer. Like most people, I just use my phone. I take a lot of pictures when I'm travelling or out with friends, but I've become a bit more selective recently. I noticed I was spending so much time trying to get the perfect shot that I wasn't actually enjoying the moment." },
      { role: 'examiner', text: 'What do you usually take photos of?' },
      { role: 'candidate', text: "Mainly landscapes and the sea, funnily enough. I live near the coast, and the sunsets there can be absolutely spectacular, so I've got hundreds of almost identical pictures of the same horizon. I also take a lot of photos of food, which my friends tease me about. I'm not so keen on selfies — I always feel slightly self-conscious taking them." },
      { role: 'examiner', text: 'Do you prefer to keep photos on your phone or print them?' },
      { role: 'candidate', text: "Realistically, almost everything stays on my phone. But I do think we've lost something by not printing photos anymore. My parents have shelves full of albums, and looking through them is a completely different experience from scrolling through a screen. A couple of times a year I try to print my favourite shots and put them in frames, just so they don't get buried under thousands of others." },
      { role: 'examiner', text: 'Is there a photo that is particularly special to you?' },
      { role: 'candidate', text: "There's an old black-and-white photo of my grandparents on their wedding day that I treasure. It's slightly faded and creased at the corners, but that's part of its charm. What I love about it is how nervous they both look — it's a reminder that they were once young people at the start of everything. I had a copy made, and it's on the wall in my living room." },
    ],
    tips: [
      'Admit something modest ("I\'d hardly call myself a photographer") — it sounds natural, not weak',
      'Use humour sparingly, such as being teased by friends, to make an answer memorable',
      'Contrast past and present habits to show a range of tenses',
      'For a "special" question, describe one concrete object in detail and explain why it matters',
    ],
    keyPhrases: [
      "I'd hardly call myself a...",
      "I wasn't actually enjoying the moment",
      'funnily enough',
      "we've lost something by...",
      "that's part of its charm",
      "it's a reminder that...",
    ],
  },
  {
    id: 'ielts-58',
    title: 'Part 1 — Pets & Animals',
    part: 'Part 1',
    topic: 'Home & Living',
    description: 'Part 1 questions about keeping pets, your favourite animals, and attitudes toward animals in your country.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you have any pets?' },
      { role: 'candidate', text: "Yes, I've got a cat called Biscuit. She was a rescue — a neighbour found her as a kitten outside our building, and I sort of ended up adopting her by accident. She's incredibly independent, which suits my lifestyle, because I'm out at work most of the day. She more or less tolerates me, as long as I feed her on time." },
      { role: 'examiner', text: 'Did you have pets when you were a child?' },
      { role: 'candidate', text: "We had a dog for most of my childhood, a scruffy little mixed breed. I was responsible for walking him after school, which I used to complain about constantly. Looking back, though, those walks were some of the best parts of my day. I think having a dog taught me a lot about responsibility, even if I didn't appreciate it at the time." },
      { role: 'examiner', text: 'Why do you think people keep pets?' },
      { role: 'candidate', text: "I think it's mostly about companionship. Especially in cities, where a lot of people live alone and work long hours, coming home to an animal that's pleased to see you makes a real difference. There's also something calming about looking after another living thing — it gets you out of your own head for a while. And for families, pets are a gentle way of teaching children to care for something." },
      { role: 'examiner', text: 'Would you like to have a different kind of pet in the future?' },
      { role: 'candidate', text: "I'd love to have a dog again at some point, but it wouldn't be fair at the moment. I live in a small flat and I'm not home enough to give a dog the attention it needs. Maybe once I have a place with a garden and a bit more flexibility at work. For now, Biscuit would probably be deeply offended if I brought another animal home anyway." },
    ],
    tips: [
      'A pet\'s name and a small personal detail make an answer feel genuine',
      'Use "Looking back, though..." to reflect on childhood experiences',
      'For "why do people..." questions, give two or three reasons rather than just one',
      'Explain conditions for future plans: "Maybe once I have..."',
    ],
    keyPhrases: [
      'I sort of ended up... by accident',
      'which suits my lifestyle',
      'Looking back, though,',
      "even if I didn't appreciate it at the time",
      'it gets you out of your own head',
      "it wouldn't be fair at the moment",
    ],
  },
  {
    id: 'ielts-59',
    title: 'Part 1 — Cooking',
    part: 'Part 1',
    topic: 'Food & Culture',
    description: 'Part 1 questions about cooking at home, who taught you to cook, and whether people cook less than they used to.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you enjoy cooking?' },
      { role: 'candidate', text: "I do, but mostly at the weekend when I've got time to do it properly. During the week I tend to stick to quick, simple meals — a stir-fry or some pasta — because by the time I get home from work, I don't have the energy for anything elaborate. On Sundays, though, I like to spend a couple of hours in the kitchen trying something new. I find it surprisingly relaxing." },
      { role: 'examiner', text: 'Who taught you how to cook?' },
      { role: 'candidate', text: "Mainly my mother, although I didn't really pay attention until I moved out. When I was living at home I just ate whatever was put in front of me. It was only once I had my own place that I started phoning her for recipes, usually in a panic halfway through making something. These days I learn a lot from online videos as well, but her versions are still the benchmark." },
      { role: 'examiner', text: 'What is the most difficult thing you have ever cooked?' },
      { role: 'candidate', text: "Probably a slow-cooked beef stew I made for a dinner party last year. It took about six hours, and I was terrified the whole time that it would go wrong in front of my friends. In the end it turned out really well, but I don't think I'll be attempting it again any time soon. It was far more stress than it was worth." },
      { role: 'examiner', text: 'Do you think people cook at home less these days?' },
      { role: 'candidate', text: "In cities, I'd say definitely. Food delivery apps have made it so easy to order a meal that a lot of people my age hardly cook at all. Part of it is time, but I think part of it is also that cooking for one person can feel like a lot of effort. That said, I've noticed a bit of a backlash recently — more people seem to be getting into cooking as a hobby, partly to eat more healthily and partly to save money." },
    ],
    tips: [
      'Distinguish between weekday and weekend habits to give a more nuanced answer',
      'A short anecdote ("phoning her in a panic") makes your answer vivid and personal',
      'Use "It was only once... that..." — a cleft structure that shows grammatical range',
      'When asked about trends, give the main view first and then a counter-trend with "That said"',
    ],
    keyPhrases: [
      "I don't have the energy for anything elaborate",
      'I find it surprisingly relaxing',
      'It was only once... that I started...',
      'her versions are still the benchmark',
      'It was far more stress than it was worth',
      "I've noticed a bit of a backlash recently",
    ],
  },
  {
    id: 'ielts-60',
    title: 'Part 1 — Gifts & Giving Presents',
    part: 'Part 1',
    topic: 'Society & Culture',
    description: 'Part 1 questions about choosing gifts, memorable presents you have received, and gift-giving customs in your country.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you enjoy giving gifts?' },
      { role: 'candidate', text: "I do, though I find choosing them quite stressful. I always want to get something that shows I've actually been paying attention to the person, rather than just grabbing whatever's on offer. So I tend to keep a little note on my phone — if a friend mentions something they'd like, I jot it down for later. It's a small trick, but it saves me a lot of last-minute panic." },
      { role: 'examiner', text: 'What was the last gift you gave someone?' },
      { role: 'candidate', text: "I gave my colleague Anna a cookery class for her birthday last month. She'd been saying for ages that she wanted to learn to make fresh pasta, so it seemed like the obvious choice. She went last weekend and sent me photos of the results, which was lovely. I think experiences make better gifts than objects, generally — people remember them for longer." },
      { role: 'examiner', text: 'What is the best gift you have ever received?' },
      { role: 'candidate', text: "Probably a handwritten letter my younger sister gave me when I left home for university. She was only about twelve at the time, and she'd written down all her favourite memories of us growing up. It didn't cost anything, but it meant more to me than anything I've ever been given. I still have it in a drawer, and I reread it every now and then." },
      { role: 'examiner', text: 'Are there any special occasions for giving gifts in your country?' },
      { role: 'candidate', text: "Yes, quite a few. The biggest is the New Year holiday, when it's traditional to give small gifts of money, especially to children and elderly relatives. Weddings are another big one — guests usually give cash rather than presents. And increasingly, birthdays and Valentine's Day have become big occasions too, partly because shops promote them so heavily." },
    ],
    tips: [
      'Mention a simple habit or "trick" you use — it makes an answer practical and personal',
      'Give a general opinion after a specific example: "I think experiences make better gifts than objects"',
      'For "the best..." questions, explain the emotional value, not just what the item was',
      'List customs with "The biggest is... Another big one is... And increasingly..."',
    ],
    keyPhrases: [
      "I've actually been paying attention to...",
      'it saves me a lot of last-minute panic',
      'it seemed like the obvious choice',
      'experiences make better gifts than objects',
      'it meant more to me than anything...',
      'every now and then',
    ],
  },
  {
    id: 'ielts-61',
    title: 'Part 1 — Sleep & Rest',
    part: 'Part 1',
    topic: 'Health & Lifestyle',
    description: 'Part 1 questions about your sleeping habits, napping, and what helps you rest and recover.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'How many hours do you usually sleep?' },
      { role: 'candidate', text: "On a good night, about seven hours, but it varies quite a lot. During the week I'm usually in bed by eleven and up at six thirty. When we've got a big campaign launching at work, though, I tend to sleep badly because my mind just won't switch off. I've learned that I really need at least seven hours, otherwise I'm useless by mid-afternoon." },
      { role: 'examiner', text: 'Do you ever take naps during the day?' },
      { role: 'candidate', text: "Not on weekdays — there's nowhere to do it at the office, for one thing. But on Sunday afternoons I'm a big fan of a short nap, maybe twenty minutes. Any longer than that and I wake up feeling groggy and worse than before. It's quite common in my country to have a rest after lunch, so I suppose it's a habit I grew up with." },
      { role: 'examiner', text: 'What do you do if you can\'t fall asleep?' },
      { role: 'candidate', text: "The worst thing I can do is pick up my phone, although I'm embarrassed to say that's usually my first instinct. What tends to work better is getting up, making a cup of herbal tea and reading a few pages of a book with a dim light on. If my head is full of things I need to remember, I write them down, which somehow helps me let go of them. Usually I'm asleep within half an hour." },
      { role: 'examiner', text: 'Do you think people get enough sleep nowadays?' },
      { role: 'candidate', text: "Honestly, I doubt it. Most people I know are permanently a bit tired. Between long working hours, commuting and then scrolling on our phones late at night, sleep is often the first thing that gets sacrificed. It's ironic, really, because everyone talks about health and fitness, but sleep is probably the easiest thing to improve and the one we take least seriously." },
    ],
    tips: [
      'Use conditionals to talk about habits: "Any longer than that and I wake up feeling groggy"',
      'Admitting a bad habit ("I\'m embarrassed to say...") sounds honest and natural',
      'Describe a sequence of actions clearly to show you can organise ideas',
      'Point out an irony to add depth to an opinion answer',
    ],
    keyPhrases: [
      "my mind just won't switch off",
      "otherwise I'm useless by mid-afternoon",
      "I'm a big fan of...",
      "I'm embarrassed to say that's usually my first instinct",
      'sleep is often the first thing that gets sacrificed',
      "It's ironic, really, because...",
    ],
  },
  {
    id: 'ielts-62',
    title: 'Part 1 — Neighbours',
    part: 'Part 1',
    topic: 'Home & Living',
    description: 'Part 1 questions about your neighbours, how well you know them, and how neighbourly relationships have changed.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you know your neighbours well?' },
      { role: 'candidate', text: "Some of them, yes. I live in an apartment block with about thirty flats, so I couldn't tell you everyone's name. But I'm on friendly terms with the couple next door — we chat in the corridor and occasionally look after each other's post when one of us is away. Beyond that, it's mostly a nod and a smile in the lift." },
      { role: 'examiner', text: 'How often do you see your neighbours?' },
      { role: 'candidate', text: "Almost every day, but only in passing. Our schedules don't really overlap much — I leave early for the office, and a lot of the other residents are retired, so they're around during the day when I'm not. Every few months the building holds a small get-together in the courtyard, and that's when I actually get to talk to people properly." },
      { role: 'examiner', text: 'Have you ever had a problem with a neighbour?' },
      { role: 'candidate', text: "Only once, and it was fairly minor. A family upstairs had a teenager who was learning the drums, and he used to practise late in the evening. At first I didn't want to make a fuss, but after a couple of weeks I went up and mentioned it politely. They were really apologetic, and he switched to practising in the afternoons. It was a good reminder that most problems can be sorted out with a friendly conversation." },
      { role: 'examiner', text: 'Do you think relationships between neighbours have changed?' },
      { role: 'candidate', text: "I think they have, quite a lot. When I was growing up in my hometown, everyone on our street knew each other, and children would wander in and out of each other's houses. In cities now, people move more often and spend so much time at work that there's less chance to build those connections. It's a bit of a shame, because a good neighbour can be incredibly helpful in an emergency." },
    ],
    tips: [
      'Use precise phrases for degrees of familiarity: "on friendly terms," "a nod and a smile"',
      'Give a reason why something happens rarely — it extends your answer naturally',
      'Tell a short problem-solution story for questions about difficulties',
      'Compare your childhood with the present to show a range of tenses',
    ],
    keyPhrases: [
      "I'm on friendly terms with...",
      "it's mostly a nod and a smile",
      'Almost every day, but only in passing',
      "I didn't want to make a fuss",
      'most problems can be sorted out with...',
      "It's a bit of a shame, because...",
    ],
  },
  {
    id: 'ielts-63',
    title: 'Part 1 — Parks & Nature',
    part: 'Part 1',
    topic: 'Environment',
    description: 'Part 1 questions about parks near your home, spending time outdoors, and the value of green spaces in cities.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Is there a park near where you live?' },
      { role: 'candidate', text: "Yes, there's one about ten minutes' walk from my flat. It's not huge, but it has a lake in the middle and some lovely old trees that give a lot of shade, which is a blessing in the summer. In the mornings it's full of older people doing exercises together, and in the evenings it's mostly families and joggers. It's become a bit of a refuge for me after a long day." },
      { role: 'examiner', text: 'How often do you go there?' },
      { role: 'candidate', text: "I try to go for a walk there three or four evenings a week, although that tends to slip when work gets busy. At the weekends I sometimes take a book and just sit on a bench for an hour. It sounds a bit dull when I describe it, but I find it really clears my head. It's amazing how much difference a bit of green space makes to your mood." },
      { role: 'examiner', text: 'Do you prefer spending time in nature or in the city?' },
      { role: 'candidate', text: "If I had to choose, nature, without a doubt. I enjoy the convenience of city life, and I'd probably get bored living somewhere completely remote. But whenever I get the chance to go hiking in the hills outside my city, I come back feeling completely recharged. I think the ideal for me would be living in a city that's within easy reach of the countryside." },
      { role: 'examiner', text: 'Do you think cities should have more parks?' },
      { role: 'candidate', text: "Absolutely. As cities get more crowded, parks become one of the few places where people can breathe, both literally and figuratively. They help with air quality and keep temperatures down, and they give people who live in small apartments somewhere to relax and meet others. In my city, a lot of open land has been turned into tower blocks in recent years, and I think we'll regret that in the long run." },
    ],
    tips: [
      'Describe a place using what people do there at different times of day',
      'Use "If I had to choose..." to answer a preference question decisively',
      'A phrase like "both literally and figuratively" shows sophisticated vocabulary',
      'End an opinion answer with a prediction: "I think we\'ll regret that in the long run"',
    ],
    keyPhrases: [
      'which is a blessing in the summer',
      "It's become a bit of a refuge for me",
      'I find it really clears my head',
      'If I had to choose, ..., without a doubt',
      'I come back feeling completely recharged',
      'both literally and figuratively',
    ],
  },
  {
    id: 'ielts-64',
    title: 'Part 1 — Films & Cinema',
    part: 'Part 1',
    topic: 'Media & Entertainment',
    description: 'Part 1 questions about the films you enjoy, going to the cinema, and how streaming has changed the way people watch movies.',
    duration: '5 min',
    exchanges: [
      { role: 'examiner', text: 'Do you like watching films?' },
      { role: 'candidate', text: "Yes, I'm quite a film fan. I probably watch two or three a week, mostly at home in the evenings. I like the fact that a film is self-contained — unlike a series, you don't have to commit to ten hours of your life. After a busy day, it's a nice way to switch off and get lost in a completely different world." },
      { role: 'examiner', text: 'What kind of films do you enjoy most?' },
      { role: 'candidate', text: "I'm a sucker for a good thriller — something with a clever plot that keeps me guessing until the end. I also enjoy documentaries, particularly about nature or history. What I can't stand are horror films; I've never understood why people pay to be frightened. My friend Sam keeps trying to convert me, but so far it hasn't worked." },
      { role: 'examiner', text: 'How often do you go to the cinema?' },
      { role: 'candidate', text: "Much less than I used to, maybe once every couple of months. When I was a student, going to the cinema was the default plan for a Friday night. Now tickets are quite expensive, and with so many films available to stream at home, it's hard to justify. I still go for the big releases, though, because some films really deserve to be seen on a big screen." },
      { role: 'examiner', text: 'Do you prefer watching films at home or at the cinema?' },
      { role: 'candidate', text: "It depends on the film. For a big action film with amazing visuals, the cinema wins hands down — the sound and the scale make it a real experience. But for a quieter drama, I'd honestly rather be at home on the sofa, where I can pause it and nobody is rustling sweet wrappers next to me. So I suppose I treat them as two quite different experiences." },
      { role: 'examiner', text: 'Has streaming changed the way people watch films?' },
      { role: 'candidate', text: "Enormously. People now expect to watch whatever they want, whenever they want, which was unthinkable when I was a child. The downside is that there's so much choice that I sometimes spend longer scrolling through options than actually watching something. I also think people pay less attention — it's very tempting to have your phone in your hand while a film is on at home." },
    ],
    tips: [
      'Use strong preference idioms: "I\'m a sucker for..." and "What I can\'t stand..."',
      'Contrast your student days with now to show past habits with "used to"',
      'Answer "it depends" questions by giving both conditions clearly',
      'Mention a downside of a trend to show balanced thinking',
    ],
    keyPhrases: [
      'get lost in a completely different world',
      "I'm a sucker for...",
      "What I can't stand are...",
      "it's hard to justify",
      'the cinema wins hands down',
      'which was unthinkable when I was a child',
    ],
  },
  // ── Part 2: more topics ──────────────────────────────
  {
    id: 'ielts-65',
    title: 'Part 2 — Describe a Gift You Gave Someone',
    part: 'Part 2',
    topic: 'Society & Culture',
    description: 'A cue card topic: Describe a gift you gave someone. Say what it was, who you gave it to, why you chose it, and how the person reacted.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a gift you gave to someone. You should say: what the gift was, who you gave it to, why you chose this gift, and explain how the person felt about it. You have one minute to prepare." },
      { role: 'candidate', text: `I'd like to talk about a gift I gave my grandmother for her eightieth birthday last spring, which was a photo book I put together myself. It wasn't expensive at all, but it's probably the most meaningful present I've ever given anyone.

The idea came to me almost by accident. I was helping her clear out a cupboard, and we found a shoebox full of old photographs — some of them were from her childhood, and quite a few were faded or curling at the edges. She spent the whole afternoon telling me stories about them, and I remember thinking that if those photos stayed in a box, the stories would eventually disappear with them.

So over the next couple of months, I quietly borrowed the box, scanned everything, and arranged the pictures in roughly chronological order. The tricky part was the captions. I didn't want to just write dates, so I rang my aunts and my mum and asked them to fill in the gaps — who was in each picture, where it was taken, what was going on. Honestly, it turned into a bit of a family project, and it took far longer than I'd expected.

I chose it because, to be frank, my grandmother has everything she needs. Whenever we ask what she wants, she says she doesn't want anything, and she means it. I think at her age, what people really value isn't things but time and attention, and a gift like this shows that someone has actually listened to them.

When she opened it, she went very quiet, and then she started turning the pages really slowly. She didn't say much at first, but I could tell she was moved. Since then, apparently, she's shown it to every single visitor — the neighbours, her friends from the market, even the man who comes to read the electricity meter. It's become a kind of conversation piece, and I've lost count of the number of times she's rung me to say she found another story she wants to add.` },
      { role: 'examiner', text: 'Do you prefer giving gifts or receiving them?' },
      { role: 'candidate', text: "Giving, without a doubt. Receiving a gift always makes me feel slightly awkward — I'm never quite sure how to react. Whereas when you give someone something you've really thought about, and you see it land, that's a genuinely lovely feeling. I suppose it's a small way of telling someone you know them well." },
    ],
    tips: [
      'Open by naming the gift and the occasion straight away so the examiner knows where you are going',
      'Tell the story in sequence: the idea, the preparation, the moment of giving',
      'Explain your reasoning — why this gift suited this person',
      'Describe the reaction with specific details rather than just saying "she liked it"',
      'Finish with the longer-term effect to show a range of tenses',
    ],
    keyPhrases: [
      "it's probably the most meaningful present I've ever given anyone",
      'The idea came to me almost by accident',
      'it turned into a bit of a family project',
      'it took far longer than I\'d expected',
      'what people really value isn\'t things but time and attention',
      'I could tell she was moved',
      'It\'s become a kind of conversation piece',
      'I\'ve lost count of the number of times...',
    ],
  },
  {
    id: 'ielts-66',
    title: 'Part 2 — Describe an Old Friend You Got Back in Touch With',
    part: 'Part 2',
    topic: 'Society & Culture',
    description: 'A cue card topic: Describe an old friend you got back in touch with. Say who they are, how you lost touch, how you reconnected, and how you felt about it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe an old friend that you got back in touch with. You should say: who this friend is, how you lost contact, how you got back in touch, and explain how you felt about reconnecting with this person. You have one minute to prepare." },
      { role: 'candidate', text: `The person I'd like to talk about is a friend called Anna, who I was really close to all the way through secondary school. We sat next to each other for about four years, and for a long time we were more or less inseparable.

We lost touch in a very ordinary way, which I think is how it usually happens. After school, she moved to the other end of the country for university, and I stayed in my hometown. For the first year we messaged constantly, but then we both got caught up in new lives, new friends, exams, part-time jobs. Nobody fell out or anything — we just drifted apart, and before I knew it, about eight years had gone by.

Getting back in touch was pure chance. A couple of years ago, I was at a marketing conference in another city, and during the coffee break someone tapped me on the shoulder. It was Anna. It turned out she was working for one of the agencies that had a stand there. We both just stood there laughing for a few seconds, because it was so unexpected.

We ended up skipping the afternoon sessions and sitting in a café for about three hours. What struck me most was how quickly we fell back into our old rhythm. Within ten minutes we were finishing each other's sentences and bringing up silly jokes from when we were fifteen. Of course, we'd both changed — she's far more confident than she used to be — but the core of the friendship was still there.

I have to say, it made me feel a mixture of joy and a bit of regret. Joy, obviously, because she's such good company, but regret that I'd let such an important friendship slip away without even noticing. Since then, we've made a real effort to stay in touch — we have a video call every month or so, and she came to stay with me last summer. It taught me that friendships need a bit of maintenance, and that it's worth reaching out even when it feels awkward.` },
      { role: 'examiner', text: 'Why do people lose touch with friends as they get older?' },
      { role: 'candidate', text: "I think it's mostly about time and priorities. When you're young, friendship is the centre of your social life, but as you get older, work, family and responsibilities compete for the same hours. And people move around much more now, so staying close takes deliberate effort rather than just bumping into each other." },
    ],
    tips: [
      'Introduce the friend briefly, then move on to the story — avoid a long list of personality traits',
      'Phrasal verbs like "lose touch", "drift apart" and "fall back into" sound natural here',
      'Use past perfect to show sequence: "eight years had gone by"',
      'Express mixed emotions — it sounds more mature than simply saying you were happy',
      'End with a reflection or lesson learned',
    ],
    keyPhrases: [
      'we were more or less inseparable',
      'We lost touch in a very ordinary way',
      'we just drifted apart',
      'before I knew it...',
      'Getting back in touch was pure chance',
      'What struck me most was...',
      'we fell back into our old rhythm',
      'friendships need a bit of maintenance',
    ],
  },
  {
    id: 'ielts-67',
    title: 'Part 2 — Describe a Time You Got Lost',
    part: 'Part 2',
    topic: 'Travel & Places',
    description: 'A cue card topic: Describe a time you got lost. Say where you were, how you got lost, what you did, and how you felt about the experience.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a time when you got lost. You should say: where you were, how you got lost, what you did to find your way, and explain how you felt about the experience. You have one minute to prepare." },
      { role: 'candidate', text: `I'd like to describe a time I got lost on a hiking trip in the hills about two hours from my city. This was about three years ago, and looking back, it's quite a funny story, although it certainly didn't feel funny at the time.

I'd gone with a colleague, Sam, who's much more of an outdoors person than I am. The plan was a fairly easy circular walk — about four hours in total. The problem was that we'd both relied completely on our phones for navigation, and about halfway round, we lost signal. On top of that, the path split into two at one point, and neither of the trails was signposted. We picked the one that looked more well-trodden, which, as it turned out, was a big mistake.

For the first hour or so, we didn't even realise anything was wrong. We were chatting away, enjoying the views. It was only when the path started heading steeply downhill, when it should have been going up, that it dawned on us that we had no idea where we were. By then it was mid-afternoon, and the light was starting to fade.

I'll admit I started to panic a little. But Sam stayed remarkably calm. He suggested we stop, have some water, and think rather than just keep walking. We decided the safest option was to retrace our steps back to the fork, which took a good hour and a half. Eventually, we ran into an elderly couple walking their dog, and they kindly pointed us in the right direction. We got back to the car just as it was getting dark — exhausted, starving, and with very sore feet.

In terms of how I felt, it was a mixture of embarrassment and relief. Embarrassment because we'd been so unprepared, and relief because it could have been much worse. But it was a real eye-opener. These days, I never go walking without a paper map and a fully charged power bank, and I always tell someone where I'm going. I suppose it was a lesson I needed to learn the hard way.` },
      { role: 'examiner', text: 'Do you think people rely too much on technology for directions?' },
      { role: 'candidate', text: "To some extent, yes. Navigation apps are brilliant, but I think they've made a lot of us lazy about paying attention to our surroundings. I've noticed I can drive somewhere five times and still not really know the way, because I've just been following the voice. So it's handy, but it can leave you quite helpless when it fails." },
    ],
    tips: [
      'Set the scene first: where, when, and who you were with',
      'Build a little tension — stories are more engaging when there is a turning point',
      'Use narrative tenses: past continuous for background, past simple for events, past perfect for earlier actions',
      'Include what you learned — it gives your answer a natural conclusion',
      'Idioms like "learn the hard way" and "an eye-opener" are effective if used naturally',
    ],
    keyPhrases: [
      'looking back, it\'s quite a funny story',
      'as it turned out, was a big mistake',
      'it dawned on us that...',
      'the light was starting to fade',
      'retrace our steps',
      'pointed us in the right direction',
      'it was a real eye-opener',
      'a lesson I needed to learn the hard way',
    ],
  },
  {
    id: 'ielts-68',
    title: 'Part 2 — Describe Something You Lost',
    part: 'Part 2',
    topic: 'Home & Living',
    description: 'A cue card topic: Describe something you lost. Say what it was, how you lost it, what you did to find it, and how you felt.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe something that you lost. You should say: what it was, where and how you lost it, what you did to try to find it, and explain how you felt about losing it. You have one minute to prepare." },
      { role: 'candidate', text: `Something I lost that I still think about is a watch that used to belong to my grandfather. It wasn't particularly valuable in financial terms — it was quite an old, plain watch with a leather strap — but it had huge sentimental value, because he gave it to me shortly before he passed away.

I lost it about two years ago, and the frustrating thing is I'm still not entirely sure how. We were moving flat at the time, and the whole place was in chaos — boxes everywhere, furniture half taken apart. I'd taken the watch off to carry some heavy things, and I'm fairly sure I put it in my jacket pocket. But by the end of the day, it had simply vanished.

Naturally, I turned the new flat upside down. I unpacked every single box, checked every pocket of every coat I own, and even went back to the old place to search before handing back the keys. I rang the removal company as well, and they were very helpful, but they didn't find anything in the van. For weeks afterwards, I kept looking in random places — down the back of the sofa, inside shoes — half hoping it would just turn up.

To be honest, I felt awful about it, and I was quite hard on myself. I kept thinking that he'd trusted me with something important and I'd been careless. What made it worse was having to tell my mum, because it had been her father's. She was very kind about it, though. She said something that really stuck with me — that the watch was just an object, and the memories weren't going anywhere.

Over time, I've more or less come to terms with it. I still hold out a tiny bit of hope that it'll appear one day in a box I've forgotten about. But the experience has definitely changed my habits. I'm far more careful now with things that matter, and anything precious has its own particular place in a drawer, so I always know exactly where it is.` },
      { role: 'examiner', text: 'Why do people become attached to certain objects?' },
      { role: 'candidate', text: "I think it's because objects can hold memories in a way that's quite physical. When you touch something that belonged to someone you loved, it brings them back for a moment. So the value isn't really in the thing itself — it's in what it represents and who it connects you to." },
    ],
    tips: [
      'Explain why the object mattered — sentimental value gives your answer depth',
      'Describe the search with concrete actions to show a wide vocabulary',
      'Use expressions of uncertainty: "I\'m fairly sure", "I\'m still not entirely sure how"',
      'Talk honestly about your feelings, including regret or frustration',
      'Show how the experience changed you to bring the story into the present',
    ],
    keyPhrases: [
      'it had huge sentimental value',
      'the whole place was in chaos',
      'it had simply vanished',
      'I turned the new flat upside down',
      'half hoping it would just turn up',
      'I was quite hard on myself',
      'She said something that really stuck with me',
      'I\'ve more or less come to terms with it',
    ],
  },
  {
    id: 'ielts-69',
    title: 'Part 2 — Describe a Teacher Who Influenced You',
    part: 'Part 2',
    topic: 'Work & Study',
    description: 'A cue card topic: Describe a teacher who influenced you. Say who they were, what they taught, what they were like, and why they had such an impact on you.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a teacher who has influenced you. You should say: who this teacher was, what subject they taught, what they were like, and explain why this teacher influenced you. You have one minute to prepare." },
      { role: 'candidate', text: `The teacher I'd like to talk about is my literature teacher from my last two years of secondary school, Mr Hale. He was probably in his late fifties at the time, and he had a reputation for being quite strict, so I'll admit I wasn't especially looking forward to his classes at first.

What made him different was the way he taught. Most of our teachers stuck very closely to the textbook, but he hardly ever used it. Instead, he'd come in with a single short poem or a page from a novel and spend the whole lesson asking us questions about it. He'd never tell us what the right interpretation was. If someone gave an answer, he'd just say, 'Interesting — why do you think that?' and keep pushing until we'd actually justified it. It was a bit nerve-racking at first, but after a while it became genuinely exciting.

As a person, he was quite reserved, but he had a very dry sense of humour, and he took students seriously in a way that not many adults did. I remember I once wrote an essay arguing the complete opposite of what he'd said in class, and I was half expecting a terrible mark. Instead, he gave me one of the highest grades I'd had and wrote, 'I disagree, but you've made me think,' at the bottom. That small comment did wonders for my confidence.

The reason he influenced me so much is that he taught me how to think, not just what to think. Even now, in my job in marketing, a lot of what I do is questioning assumptions — why would a customer actually care about this, what's the evidence, is there another way of looking at it. I genuinely believe I picked up that habit in his classroom.

He's retired now, and a few years ago I bumped into him in a bookshop and finally got the chance to thank him. He seemed quite touched, although, in typical fashion, he made a joke about it to hide it.` },
      { role: 'examiner', text: 'What qualities make a good teacher?' },
      { role: 'candidate', text: "I'd say patience and curiosity above all. A good teacher is genuinely interested in how students think, not just whether they get the right answer. And I think they need to be able to make students feel safe getting things wrong, because that's really where learning happens." },
    ],
    tips: [
      'Give a quick first impression, then show how it changed — this creates a natural structure',
      'Use one specific anecdote to illustrate the teacher\'s character',
      'Reported speech or a short quotation can make the story vivid',
      'Link the influence to your present life or job',
      'Avoid listing adjectives; show qualities through examples instead',
    ],
    keyPhrases: [
      'he had a reputation for being quite strict',
      'What made him different was the way he taught',
      'It was a bit nerve-racking at first',
      'he had a very dry sense of humour',
      'I was half expecting...',
      'did wonders for my confidence',
      'he taught me how to think, not just what to think',
      'in typical fashion',
    ],
  },
  {
    id: 'ielts-70',
    title: 'Part 2 — Describe a Goal You Want to Achieve',
    part: 'Part 2',
    topic: 'Work & Study',
    description: 'A cue card topic: Describe a goal you want to achieve. Say what it is, why you set it, how you plan to achieve it, and how you will feel when you do.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a goal that you would like to achieve in the future. You should say: what the goal is, when you set this goal, what you are doing to achieve it, and explain why this goal is important to you. You have one minute to prepare." },
      { role: 'candidate', text: `One goal I'm working towards at the moment is leading my own team at work within the next two or three years. Right now, I'm part of the marketing team at a mid-sized company, and I'd really like to move up to a position where I'm managing a small group of people and running campaigns from start to finish.

I set the goal about a year ago, after a project where our manager was off sick for a few weeks and I ended up stepping in to coordinate things. It was quite a steep learning curve — I had to chair meetings, deal with a couple of disagreements, and keep the client happy. It was stressful, but I found I actually enjoyed it far more than I'd expected, and that's when it clicked that this was the direction I wanted to go in.

In terms of what I'm doing about it, I've taken a fairly practical approach. Firstly, I've signed up for an evening course in management, which covers things like giving feedback and planning budgets. Secondly, I've asked my manager to give me more responsibility on smaller projects so that I can build up a track record. And thirdly, I've been making a conscious effort to get better at the softer side of things — listening properly, being patient, and not jumping in with solutions straight away, which, I have to admit, doesn't come naturally to me.

The reason it matters to me is partly about growth. I've been doing more or less the same role for five years, and while I'm good at it, I've started to feel that I've reached a bit of a plateau. But it's also about the people side. Some of the best managers I've had made a huge difference to how I felt about coming to work every day, and I'd love to be able to do that for someone else.

Of course, there's no guarantee it'll happen on my timeline. Promotions depend on a lot of things that are out of my control. But even if it takes longer than I hope, I think the skills I'm building along the way will be worth it in their own right.` },
      { role: 'examiner', text: 'Is it important to set goals in life?' },
      { role: 'candidate', text: "I think so, although I'd say they should be flexible. Goals give you a sense of direction and help you decide what to spend your time on. But if you hold on to them too rigidly, you can miss opportunities that you never planned for. So I see them more as a compass than a fixed map." },
    ],
    tips: [
      'State the goal clearly in your first sentence',
      'Explain the moment you decided on it — a short story makes the reason convincing',
      'Use sequencing words such as "firstly", "secondly" and "thirdly" for your plan',
      'Use future forms and conditionals: "I\'d love to", "even if it takes longer"',
      'Acknowledge uncertainty to sound realistic and mature',
    ],
    keyPhrases: [
      'One goal I\'m working towards at the moment is...',
      'It was quite a steep learning curve',
      'that\'s when it clicked that...',
      'build up a track record',
      'making a conscious effort to...',
      'doesn\'t come naturally to me',
      'I\'ve reached a bit of a plateau',
      'worth it in their own right',
    ],
  },
  {
    id: 'ielts-71',
    title: 'Part 2 — Describe a Time You Were Late',
    part: 'Part 2',
    topic: 'Work & Study',
    description: 'A cue card topic: Describe a time you were late for something important. Say what it was, why you were late, what happened, and how you felt.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a time when you were late for something important. You should say: what the event was, why you were late, what happened as a result, and explain how you felt about being late. You have one minute to prepare." },
      { role: 'candidate', text: `I'd like to talk about the time I was late for a big presentation to a new client, which happened about eighteen months ago. It's one of those memories that still makes me cringe a little, even though it worked out fine in the end.

The presentation was scheduled for nine o'clock at the client's office on the other side of the city. My team had spent weeks preparing for it, and I was the one presenting the main part. I'd planned to leave home at around eight, which should have given me plenty of time. Unfortunately, my alarm didn't go off — I'd changed my phone settings the night before and somehow switched it off by mistake. I woke up at ten past eight in a complete panic.

I threw on my clothes, grabbed my laptop and ran out, but of course that was the morning the traffic was at a standstill. There'd been an accident on the main road along the seafront, and my taxi was barely moving. I remember sitting in the back, watching the minutes tick by and feeling my heart sink.

In the end, I rang my colleague and asked her to start without me, and I arrived about twenty minutes late, out of breath and probably looking quite flustered. Luckily, she'd done a brilliant job of opening the meeting, so I was able to slip in and pick up from where she'd left off. I apologised to the client straight away, and to my surprise, they were very understanding — one of them even joked that at least I'd arrived with a good story.

I felt mortified at the time, to be honest, because I hate letting people down. But looking back, it taught me a couple of things. One is to always have a backup — I now set two alarms for anything important. And the other is how valuable it is to have teammates you can rely on. We actually won the contract, so it's turned into a bit of a running joke in the office.` },
      { role: 'examiner', text: 'Is punctuality important in your culture?' },
      { role: 'candidate', text: "It depends on the situation. For work and formal appointments, people expect you to be on time, and being late can come across as disrespectful. But socially it's much more relaxed — if friends say they'll meet at seven, nobody's really surprised if they turn up at quarter past." },
    ],
    tips: [
      'Explain the stakes early so the listener understands why being late mattered',
      'Use a clear cause-and-effect chain: the alarm, the traffic, the consequences',
      'Vivid verbs and idioms help: "my heart sank", "at a standstill", "flustered"',
      'Show how the situation was resolved, not just what went wrong',
      'Close with what you learned and how things turned out',
    ],
    keyPhrases: [
      'still makes me cringe a little',
      'it worked out fine in the end',
      'I woke up... in a complete panic',
      'the traffic was at a standstill',
      'feeling my heart sink',
      'pick up from where she\'d left off',
      'I felt mortified at the time',
      'it\'s turned into a bit of a running joke',
    ],
  },
  {
    id: 'ielts-72',
    title: 'Part 2 — Describe a Film You Enjoyed',
    part: 'Part 2',
    topic: 'Media & Entertainment',
    description: 'A cue card topic: Describe a film you enjoyed. Say what it was about, when and where you saw it, who you watched it with, and why you liked it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a film that you enjoyed watching. You should say: what the film was about, when and where you watched it, who you watched it with, and explain why you enjoyed it. You have one minute to prepare." },
      { role: 'candidate', text: `I'd like to talk about a fairly small, independent film I saw last winter. It's a drama about an elderly man who runs a tiny repair shop in a seaside town, and a teenage girl who ends up working there for a summer after getting into trouble at school. It isn't a well-known film, and I only came across it because a friend recommended it.

On the surface, not very much happens. There are no car chases or big plot twists. It's mostly the two of them fixing old radios and clocks and slowly getting to know each other. At first they can barely stand each other — she thinks he's a grumpy old man, and he thinks she's lazy and rude — but gradually they open up. It turns out he's lost his wife and is quite lonely, and she's struggling with things at home.

I watched it at a small cinema near where I live that shows older and independent films. I went with my sister, and I have to say neither of us expected much. We'd chosen it partly because it was raining and we wanted something to do on a Sunday afternoon. But within about twenty minutes, we were completely drawn in.

What I loved most was how understated it was. The acting felt incredibly natural — there were long scenes with hardly any dialogue, just the two of them working side by side, and yet you could feel the relationship changing. The cinematography was beautiful too, lots of soft light and shots of the sea, which suited the slow pace perfectly. And without giving too much away, the ending was quietly devastating. I'm not someone who cries at films very often, but I'll admit I had a lump in my throat.

I think it stuck with me because it's about something we don't talk about enough — how much people of different generations can give each other. It made me want to call my grandparents more often, actually. It's not the kind of film everyone would enjoy, but for me it was a real hidden gem.` },
      { role: 'examiner', text: 'Do you prefer watching films at home or at the cinema?' },
      { role: 'candidate', text: "It depends on the film. For big action films, the cinema is unbeatable — the screen and the sound just make it an event. But for quieter films, I often prefer watching at home, where I can relax. Having said that, that particular film was better in the cinema, because there were no distractions and I couldn't reach for my phone." },
    ],
    tips: [
      'Summarise the plot briefly — the examiner is more interested in your opinion than the full story',
      'Use film vocabulary naturally: cinematography, plot twist, dialogue, pace',
      'Say what you expected versus what you experienced to add contrast',
      'Avoid spoilers with phrases like "without giving too much away"',
      'Explain the personal impact the film had on you',
    ],
    keyPhrases: [
      'I only came across it because...',
      'On the surface, not very much happens',
      'they can barely stand each other',
      'we were completely drawn in',
      'What I loved most was how understated it was',
      'without giving too much away',
      'I had a lump in my throat',
      'it was a real hidden gem',
    ],
  },
  {
    id: 'ielts-73',
    title: 'Part 2 — Describe an Interesting Building',
    part: 'Part 2',
    topic: 'Arts & Culture',
    description: 'A cue card topic: Describe an interesting building you have seen. Say where it is, what it looks like, what it is used for, and why you find it interesting.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe an interesting building that you have seen. You should say: where it is, what it looks like, what it is used for, and explain why you think it is interesting. You have one minute to prepare." },
      { role: 'candidate', text: `The building I'd like to describe is the public library in my city, which was completely rebuilt about five years ago. It's right on the waterfront, close to the old harbour, and it's become something of a landmark.

What makes it stand out is the design. The old library was a rather gloomy concrete block, but the new one is almost entirely glass on the side facing the sea. From the outside, it looks a bit like a set of stacked boxes, each one slightly offset from the one below, so the roof of each floor becomes a terrace. In the evening, when the lights are on inside, it glows, and you can see people reading on every level. It's quite striking, especially from a boat or from the beach on the other side of the bay.

Inside, it's very open and light. There's a huge central staircase that doubles as seating, and people sit there to read or chat. On the lower floors there's a children's area and a café, and higher up it gets quieter, with study spaces where you can look out over the water. There's also a small exhibition space that usually has work by local artists.

I find it interesting for a couple of reasons. Firstly, I think it's a good example of architecture that actually changes how people behave. When the old library was there, hardly anyone went in apart from students during exam season. Now it's packed at weekends — families, retired people, teenagers — and a lot of them aren't even there for the books. It's become more of a community space.

Secondly, it divided opinion quite sharply when it was being built. A lot of people thought it was a waste of public money, and some felt it didn't fit in with the older buildings around the harbour. I was on the fence myself at first. But I've come round to it completely. I think it shows that a public building can be bold and still be genuinely useful, and now I'd say most people in my city are rather proud of it.` },
      { role: 'examiner', text: 'Should old buildings be preserved or replaced with modern ones?' },
      { role: 'candidate', text: "I think it depends on the building. Historic buildings that tell us something about the past are worth protecting, even if they're expensive to maintain. But not every old building is special, and cities need to adapt. Ideally, I'd like to see old buildings reused for new purposes, which keeps the character while still meeting modern needs." },
    ],
    tips: [
      'Describe the building from the outside first, then the inside — a clear spatial structure',
      'Use comparisons and similes to help the listener picture it: "a bit like a set of stacked boxes"',
      'Mention its function and how people use it, not just how it looks',
      'Include other people\'s opinions to show balance',
      'Show your own change of opinion with phrases like "I\'ve come round to it"',
    ],
    keyPhrases: [
      'it\'s become something of a landmark',
      'What makes it stand out is...',
      'It\'s quite striking',
      'doubles as seating',
      'architecture that actually changes how people behave',
      'it divided opinion quite sharply',
      'I was on the fence myself at first',
      'I\'ve come round to it completely',
    ],
  },
  {
    id: 'ielts-74',
    title: 'Part 2 — Describe a Sport You Would Like to Try',
    part: 'Part 2',
    topic: 'Sports & Leisure',
    description: 'A cue card topic: Describe a sport you would like to try. Say what it is, how you know about it, what you would need to do it, and why you want to try it.',
    duration: '8 min',
    exchanges: [
      { role: 'examiner', text: "I'd like you to describe a sport that you would like to try in the future. You should say: what the sport is, how you know about it, what you would need to do it, and explain why you would like to try it. You have one minute to prepare." },
      { role: 'candidate', text: `A sport I've been meaning to try for ages is sea kayaking. Since I live in a coastal city, it seems almost silly that I've never done it, but somehow I've always found an excuse to put it off.

I first got interested in it through a friend of mine, Sam, who took it up a couple of years ago. He's always posting photos of himself paddling past cliffs and into little caves along the coast, and every time I see them I feel a bit envious. He's told me there's a club that runs taster sessions at weekends, just a short bus ride from where I live, so there's really no reason not to.

From what I understand, you don't actually need much to get started. The club provides the kayak, the paddle, a life jacket and a wetsuit, so it's mostly a matter of turning up. You do need to be a reasonably confident swimmer, which I am, and apparently a basic level of fitness helps, particularly in the shoulders and core. Beginners spend the first session or two in the calm water of the harbour, learning how to paddle in a straight line and, importantly, what to do if you capsize.

The main reason I'd like to try it is that I spend most of my day sitting at a desk in front of a screen. Working in marketing, I'm constantly juggling deadlines, and I've realised I need something that gets me outdoors and completely switches my brain off. I'm not really drawn to team sports or the gym, but the idea of being out on the water, with nothing but the sound of the paddle and the waves, really appeals to me.

There's also a slight sense of adventure about it. I like the idea of seeing my own city from a completely different angle — from the sea, rather than from the streets. And to be honest, I think it'd be good for me to try something where I'm a total beginner again. So I've promised myself that this spring I'm finally going to sign up, and I've told Sam to hold me to it.` },
      { role: 'examiner', text: 'Why do some people prefer individual sports to team sports?' },
      { role: 'candidate', text: "I think it's partly about personality and partly about flexibility. With an individual sport, you can go whenever you like without coordinating with ten other people. And some people simply enjoy competing against themselves and tracking their own progress, rather than relying on a team. Personally, I find it more relaxing because there's less pressure." },
    ],
    tips: [
      'Be honest about why you haven\'t tried it yet — it makes the answer more natural',
      'Use present perfect continuous for long-standing intentions: "I\'ve been meaning to..."',
      'Describe the equipment and practical steps to show topic vocabulary',
      'Connect the sport to your lifestyle and needs',
      'Finish with a clear plan or intention using future forms',
    ],
    keyPhrases: [
      'A sport I\'ve been meaning to try for ages is...',
      'I\'ve always found an excuse to put it off',
      'took it up a couple of years ago',
      'there\'s really no reason not to',
      'it\'s mostly a matter of turning up',
      'completely switches my brain off',
      'really appeals to me',
      'I\'ve told Sam to hold me to it',
    ],
  },
  // ── Part 3: more topics ──────────────────────────────
  {
    id: 'ielts-75',
    title: 'Part 3 — Crime & Punishment',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'A discussion about why people commit crimes, whether prison works, the role of rehabilitation, and how technology is changing policing.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why do you think some people turn to crime?' },
      { role: 'candidate', text: "I think it's rarely a single cause, and I'm wary of explanations that put it all down to bad character. If you look at where crime is concentrated, it tends to track things like poverty, unemployment and a lack of stable family support fairly closely. That doesn't excuse anything, but it does suggest that circumstances shape choices far more than we like to admit.\n\nThere's also an element of opportunity. A lot of petty crime is impulsive rather than planned — someone sees an unlocked bike or an unattended bag and makes a split-second decision they'd never have made otherwise. That's partly why fairly simple measures, like better street lighting, tend to work better than people expect.\n\nAnd then, of course, there's a small group for whom crime is a deliberate career, and I think they need to be treated quite differently. Lumping every offender into one category is, to my mind, where a lot of policy goes wrong." },
      { role: 'examiner', text: 'Do you think prison is an effective way to reduce crime?' },
      { role: 'candidate', text: "It depends on what you mean by effective. In the narrow sense that someone who's locked up can't reoffend while they're inside, yes, obviously. But if the goal is for people to come out less likely to commit crime, the evidence is pretty discouraging. Prisons can end up functioning as schools for crime, where a first-time offender picks up contacts and habits they didn't have before.\n\nThere's also the problem of what happens on release. Someone leaves with a criminal record, no job and often nowhere to live, and then we act surprised when they slip back into old patterns. So I'd say prison is necessary for people who pose a genuine danger to the public, but for minor, non-violent offences I'm not convinced it's the best use of public money." },
      { role: 'examiner', text: 'Should the focus be on punishment or rehabilitation?' },
      { role: 'candidate', text: "I don't really see them as opposites, although they're often presented that way in political debate. Punishment matters because victims and society need to see that actions have consequences — without that, people lose faith in the system altogether.\n\nThat said, if we're being purely pragmatic, rehabilitation is what actually protects the public in the long run. Almost everyone who goes to prison comes out eventually, so the real question is what kind of person walks out of the gate. Education, job training and treatment for addiction might sound soft, but they tend to pay for themselves many times over in crimes that never happen.\n\nSo my view would be: punish proportionately, but design the punishment so that it leaves people better equipped to live within the law, not worse." },
      { role: 'examiner', text: 'How is technology changing the way crime is prevented and solved?' },
      { role: 'candidate', text: "Enormously, and in both directions. On the one hand, things like CCTV, DNA analysis and phone data have made it far harder to get away with many traditional crimes. In my city, for instance, the number of car thefts has dropped dramatically since modern immobilisers became standard.\n\nOn the other hand, crime has simply migrated online. Fraud, identity theft and scams targeting older people have grown at a staggering rate, and the police are, frankly, playing catch-up — the criminals are often in another country and almost impossible to trace.\n\nI'd add a note of caution, too. Facial recognition and mass surveillance might catch more offenders, but they also raise serious questions about privacy. Once those systems are in place, it's very difficult to roll them back, so I think we need to have that debate before they become normal rather than after." },
    ],
    tips: [
      'Separate types of crime (impulsive, opportunistic, organised) to show analytical depth',
      'Question the definition in the prompt — "it depends on what you mean by effective"',
      'Reject a false choice between two options and explain how they fit together',
      'Show both sides of technology: a benefit, a new problem, and a caveat',
      'Use a measured personal stance — "to my mind", "I\'m not convinced" — rather than absolute claims',
    ],
    keyPhrases: [
      'circumstances shape choices far more than we like to admit',
      'a split-second decision',
      'schools for crime',
      'slip back into old patterns',
      'actions have consequences',
      'pay for themselves many times over',
      'playing catch-up',
      'roll them back',
    ],
  },
  {
    id: 'ielts-76',
    title: 'Part 3 — Science & Research',
    part: 'Part 3',
    topic: 'Technology',
    description: 'A discussion about public funding for science, trust in scientists, how research is communicated, and whether some research should be limited.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Should governments spend more money on scientific research?' },
      { role: 'candidate', text: "On balance, yes, although I appreciate it's a hard sell when hospitals and schools are under pressure. The difficulty is that the payoff from research is slow and unpredictable, so it always looks like an easy thing to cut. Nobody loses an election because a breakthrough didn't happen twenty years later.\n\nBut historically, an awful lot of the technology we take for granted came out of publicly funded research that had no obvious commercial application at the time. Private companies, understandably, want returns within a few years, so they tend to focus on improving existing products rather than pursuing fundamental questions. If the state doesn't fund that basic research, frankly, nobody will." },
      { role: 'examiner', text: 'Why do some people not trust scientists?' },
      { role: 'candidate', text: "I think part of it is a misunderstanding of how science works. People expect certainty, whereas science is really a process of steadily reducing uncertainty. So when advice changes as new evidence comes in, some people see that as scientists not knowing what they're talking about, when actually it's the system working exactly as it should.\n\nThere's also a trust issue that isn't entirely unfounded. When research is funded by companies with a stake in the outcome, people are right to ask questions. And occasionally there have been high-profile cases of falsified data, which do a lot of damage.\n\nOn top of that, social media has made it much easier for misinformation to spread. A confident-sounding video can reach millions of people in a day, while a careful correction gets a fraction of the attention." },
      { role: 'examiner', text: 'How could scientists communicate their work better to the public?' },
      { role: 'candidate', text: "Working in marketing, I'm probably biased, but I'd say scientists often undersell their work by focusing on the method rather than the meaning. The public doesn't need every technical detail — they need to know why it matters to their lives.\n\nI'd also like to see scientists being more open about uncertainty rather than less. It's tempting to present findings as settled to avoid confusion, but that backfires the moment the picture changes. Saying, in effect, 'this is our best understanding right now' builds more credibility over time.\n\nAnd I think there's a role for intermediaries — good science journalists, museums, even well-made documentaries. Not every brilliant researcher is a natural communicator, and that's fine, as long as someone is bridging the gap." },
      { role: 'examiner', text: 'Are there any areas of research that should be restricted?' },
      { role: 'candidate', text: "I think there have to be some limits, yes, though drawing the line is incredibly difficult. Research that could easily be turned into weapons, or experiments that cause serious harm to people or animals, clearly need tight controls. Most people would agree on that much.\n\nThe harder cases are things like genetic editing of human embryos, where the potential benefits are enormous but so are the ethical risks. My instinct is that outright bans tend not to work, because the research simply moves somewhere with looser rules. So rather than prohibiting it, I'd rather see strong international oversight and complete transparency.\n\nUltimately, I'd say the question isn't whether we should know something, but how the knowledge is used — and that's a decision for society as a whole, not just for scientists." },
    ],
    tips: [
      'Acknowledge the strongest counterargument before giving your view ("I appreciate it\'s a hard sell")',
      'Explain a misconception about how something works — it shows genuine understanding',
      'Linking to your own job is fine in Part 3 as long as you then generalise',
      'Use reported speech or a hypothetical quote sparingly to make a point vivid',
      'Finish with a reframing of the question to show higher-level thinking',
    ],
    keyPhrases: [
      "it's a hard sell",
      'technology we take for granted',
      'a process of steadily reducing uncertainty',
      "isn't entirely unfounded",
      'a fraction of the attention',
      'focusing on the method rather than the meaning',
      'bridging the gap',
      "the question isn't whether... but how...",
    ],
  },
  {
    id: 'ielts-77',
    title: 'Part 3 — Children & Parenting',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'A discussion about how parenting has changed, screen time, the right amount of freedom for children, and who should teach values.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'How has parenting changed compared with a generation ago?' },
      { role: 'candidate', text: "I'd say the biggest shift is that parenting has become far more intensive. When my parents were growing up, children were largely left to their own devices after school — they'd be out on their bikes until it got dark and nobody worried too much. Now parents tend to schedule every hour: music lessons, tutoring, sports clubs.\n\nPart of that is genuine concern for children's futures, because competition for university places and jobs feels much fiercer. But I think part of it is also anxiety. Parents are exposed to a constant stream of advice and warnings online, so there's this sense that any mistake could have lasting consequences.\n\nOn the positive side, fathers are much more involved than they used to be, and there's far more awareness of children's emotional needs. So it's not a simple story of things getting better or worse." },
      { role: 'examiner', text: 'Should parents limit the time their children spend on screens?' },
      { role: 'candidate', text: "Yes, I think so, but I'm not sure a simple number of hours is the right way to think about it. What a child is doing on the screen matters at least as much as how long they spend on it. Video calling grandparents or making something creative is very different from endlessly scrolling through short videos designed to be addictive.\n\nThe tricky part is that children copy what they see. If parents are glued to their own phones at the dinner table, telling a child to put the tablet away rings a bit hollow. A friend of mine, Anna, introduced a rule that nobody in the house uses a phone during meals, including the adults, and apparently it's made a noticeable difference.\n\nSo I'd say limits are sensible, but they work best when they're consistent and when the whole family follows them." },
      { role: 'examiner', text: 'Do you think children today have enough freedom?' },
      { role: 'candidate', text: "Probably not, if I'm honest. There's a real irony here: statistically, most places are safer for children now than they were decades ago, yet children are given far less independence. Many kids aren't allowed to walk to school alone until they're well into their teens.\n\nThe cost of that, I suspect, is that they miss out on learning to manage small risks and solve problems for themselves. Getting slightly lost, sorting out an argument with friends without an adult stepping in — those experiences build resilience. If you shield children from every difficulty, they arrive at adulthood without the tools to cope.\n\nOf course, I understand why parents are cautious. Nobody wants to be the one who gave too much freedom when something went wrong. But I think we've tipped too far towards protection." },
      { role: 'examiner', text: 'Who has the greater responsibility for teaching values to children — parents or schools?' },
      { role: 'candidate', text: "I'd say parents, first and foremost, simply because children spend their most formative years at home and pick up values from what they see day to day rather than what they're told. Honesty and kindness are learned by example far more than by lessons.\n\nThat said, schools play an important complementary role. They're often where children first encounter people from very different backgrounds, so they're well placed to teach things like tolerance and cooperation in a practical way.\n\nWhere it goes wrong is when each side assumes the other is handling it. Some parents expect schools to fix behaviour that's been allowed at home, and some schools are reluctant to address anything that seems like a family matter. Ideally, it should be a partnership, with both sending the same message." },
    ],
    tips: [
      'Compare past and present with concrete detail — it makes Part 3 answers vivid',
      'Point out an irony or paradox to show critical thinking',
      'A short anecdote about a friend can support an abstract point',
      'Avoid a simple "better or worse" verdict; show the picture is mixed',
      'When asked "A or B", give a priority and then explain the role of the other',
    ],
    keyPhrases: [
      'left to their own devices',
      'lasting consequences',
      'glued to their own phones',
      'rings a bit hollow',
      'a real irony here',
      'build resilience',
      'tipped too far towards...',
      'first and foremost',
    ],
  },
  {
    id: 'ielts-78',
    title: 'Part 3 — Celebrities & Fame',
    part: 'Part 3',
    topic: 'Media & Entertainment',
    description: 'A discussion about why people are fascinated by celebrities, whether famous people are good role models, privacy, and fame in the social media age.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why are people so interested in the lives of celebrities?' },
      { role: 'candidate', text: "I think it taps into something quite basic. Humans have always been fascinated by other people's lives — gossip is probably as old as language itself. Celebrities just give everyone a shared set of people to talk about, which is oddly bonding. Colleagues who have nothing else in common can chat about the same singer's latest scandal.\n\nThere's also an element of escapism. Most people's daily lives are fairly routine, so following someone who lives in a mansion and goes to glamorous parties offers a bit of fantasy. And, if I'm being cynical, there's some satisfaction in seeing that the rich and famous have problems too — it makes our own lives feel a little more manageable." },
      { role: 'examiner', text: 'Do you think celebrities have a responsibility to be good role models?' },
      { role: 'candidate', text: "That's a tricky one. In principle, I'd say nobody signs up to be a role model just by being good at singing or acting, so it seems a bit unfair to expect them to be moral examples as well.\n\nIn practice, though, whether they like it or not, young people do look up to them, and they copy their behaviour, their attitudes and even their spending habits. So I think with that level of influence comes at least some responsibility — not to be perfect, but to avoid actively promoting harmful things, like dangerous diets or gambling.\n\nI'd also argue that parents and teachers shouldn't outsource this. If a teenager's main role model is someone they've only ever seen through a carefully edited feed, that says as much about the people around them as it does about the celebrity." },
      { role: 'examiner', text: 'Should famous people have the right to privacy?' },
      { role: 'candidate', text: "Yes, absolutely, although the boundaries are blurrier than for ordinary people. If someone is a politician, there's a legitimate public interest in their conduct, because it can affect how they do their job. But for an actor or an athlete, I really don't see why their health problems or their children should be fair game.\n\nThe complication is that some celebrities court publicity when it suits them — posting every detail of their wedding, for example — and then complain when the media digs deeper. So there's a degree of give and take.\n\nStill, I think the press often crosses the line. Photographers chasing people down the street or publishing pictures of their kids goes well beyond reporting. Being famous shouldn't mean forfeiting basic dignity." },
      { role: 'examiner', text: 'How has social media changed what it means to be famous?' },
      { role: 'candidate', text: "It's democratised fame, in a way. It used to be that you needed a record label or a film studio to become well known, whereas now anyone with a phone can build an audience of millions from their bedroom. Some of that is genuinely positive — talented people who would never have been discovered now get a chance.\n\nThe downside is that fame has become much more fragile and much more exhausting. Online celebrities are expected to post constantly, and their audiences feel a kind of personal ownership over them. One badly judged comment and they can be torn apart overnight.\n\nI also think it's changed young people's ambitions. In surveys, a surprising number of children say they want to be influencers when they grow up, and I'm not sure they realise how few people actually make a living from it." },
    ],
    tips: [
      'Begin with a deeper, universal explanation before moving to specifics',
      'Distinguish "in principle" from "in practice" to structure a nuanced answer',
      'Use contrasting examples (a politician vs an actor) to define boundaries',
      'Discuss both positive and negative effects of a change, then add a broader implication',
      'Light cynicism or humour is fine, as long as it is clearly signalled ("if I\'m being cynical")',
    ],
    keyPhrases: [
      'it taps into something quite basic',
      'an element of escapism',
      'if I\'m being cynical',
      'whether they like it or not',
      'fair game',
      'court publicity when it suits them',
      'crosses the line',
      'torn apart overnight',
    ],
  },
  {
    id: 'ielts-79',
    title: 'Part 3 — Wildlife & Conservation',
    part: 'Part 3',
    topic: 'Environment',
    description: 'A discussion about why animals are becoming endangered, whether zoos are justified, who should pay for conservation, and the role of individuals.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why are so many animal species becoming endangered?' },
      { role: 'candidate', text: "The single biggest factor, as far as I understand it, is habitat loss. As cities expand and forests are cleared for farming, animals simply run out of space to live and breed. It's less dramatic than hunting, so it gets less attention, but it's far more widespread.\n\nClimate change is making things worse, because it shifts the conditions that species have adapted to over thousands of years. In my country, fishermen have noticed that certain fish are turning up in completely different areas from where they used to be found.\n\nAnd then there's pollution and illegal trade. Plastic in the ocean, pesticides killing insects, poaching for traditional medicines — individually each might seem manageable, but together they add up to a crisis." },
      { role: 'examiner', text: 'Do you think zoos still have a place in the modern world?' },
      { role: 'candidate', text: "I'm genuinely torn on this one. On the one hand, keeping a large animal like an elephant or a polar bear in a confined space seems hard to justify when you see how much they suffer from boredom. Some older zoos are frankly depressing places.\n\nOn the other hand, good modern zoos do valuable work. They run breeding programmes for species that are close to extinction in the wild, and some animals that were down to a handful of individuals have been successfully reintroduced. They also give children a connection to wildlife that a documentary can't quite replicate.\n\nSo I suppose my position is that zoos can be justified, but only if conservation and education come first and entertainment comes a distant second. The ones that are essentially animal theme parks should probably be phased out." },
      { role: 'examiner', text: 'Who should be responsible for protecting wildlife — governments or individuals?' },
      { role: 'candidate', text: "Mostly governments, I'd argue, because the scale of the problem is beyond what individuals can tackle. Protecting a habitat means setting aside land, enforcing laws against poaching and regulating industries, and only governments have that kind of power.\n\nIt also has to be international. Migratory birds and whales don't respect borders, so one country protecting them achieves very little if neighbouring countries don't.\n\nThat said, individuals aren't powerless. The choices we make about what we buy and eat do send signals, and public pressure is often what pushes governments to act in the first place. So I'd say individuals are the spark and governments are the engine, if that makes sense." },
      { role: 'examiner', text: 'Is it more important to protect wildlife or to support economic development?' },
      { role: 'candidate', text: "I think framing it as a trade-off is a bit misleading, although I understand why people do. For a farmer struggling to feed his family, being told he can't clear a bit of forest must feel deeply unfair, particularly when wealthy countries cleared their own forests centuries ago.\n\nBut in the long run, a healthy environment underpins the economy. Pollinating insects are essential for agriculture, fish stocks support entire coastal communities, and in many places wildlife tourism brings in far more money than logging ever could.\n\nSo rather than choosing one over the other, I'd focus on making conservation pay. If local people benefit directly from protecting wildlife — through jobs as rangers or guides, say — they become its strongest defenders rather than its opponents." },
    ],
    tips: [
      'Rank causes ("the single biggest factor") rather than just listing them',
      'Admitting you are torn is fine — then resolve it with a conditional position',
      'Use a memorable metaphor to summarise a balanced view ("the spark and the engine")',
      'Challenge the framing of a trade-off question when you can justify it',
      'Show awareness of fairness between richer and poorer countries',
    ],
    keyPhrases: [
      'as far as I understand it',
      'they add up to a crisis',
      "I'm genuinely torn on this one",
      'comes a distant second',
      'phased out',
      "don't respect borders",
      'framing it as a trade-off is a bit misleading',
      'they become its strongest defenders',
    ],
  },
  {
    id: 'ielts-80',
    title: 'Part 3 — Work-Life Balance & Stress',
    part: 'Part 3',
    topic: 'Health & Lifestyle',
    description: 'A discussion about why people feel more stressed, the responsibility of employers, the four-day week, and whether a good balance is realistic.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why do so many people today feel stressed at work?' },
      { role: 'candidate', text: "I think the main reason is that work no longer has clear boundaries. When I started my career, you left the office and that was it until the next morning. Now, with email and messaging apps on our phones, there's an unspoken expectation that you'll respond in the evening or even on holiday. Your brain never really switches off.\n\nThere's also a sense of job insecurity that wasn't there before. Companies restructure frequently, and people worry that if they're not seen to be working flat out, they'll be first in line when cuts come.\n\nAnd I'd add that workloads have quietly increased. In my own team, we're doing roughly what used to be done by two or three more people, simply because nobody was replaced when they left. That kind of creeping pressure is hard to push back against because it never arrives all at once." },
      { role: 'examiner', text: "Should employers be responsible for their staff's mental health?" },
      { role: 'candidate', text: "To a large extent, yes. Not in the sense that a company should become a therapist, but they're responsible for the conditions that cause a lot of stress in the first place — unrealistic deadlines, poor management, a culture of staying late. It seems a bit hypocritical to create those conditions and then offer a meditation app as the solution.\n\nThe companies that get it right, in my experience, focus on the basics: reasonable workloads, managers who are trained to notice when someone's struggling, and leadership that actually takes holidays themselves. That last point is surprisingly important, because staff take their cues from the people at the top.\n\nOf course, individuals have some responsibility too, for setting limits and speaking up. But it's much easier to do that in a workplace where it's genuinely accepted." },
      { role: 'examiner', text: 'Do you think a four-day working week is a good idea?' },
      { role: 'candidate', text: "I'm cautiously in favour. The trials I've read about suggest that productivity often stays the same or even improves, because people waste less time and come back to work properly rested. When you know you only have four days, you become much more ruthless about pointless meetings.\n\nHowever, I don't think it would suit every industry. It's fairly straightforward for an office like mine, but hospitals, schools and shops need people there every day, so they'd have to hire more staff or use rotating schedules, which costs money.\n\nThere's also a risk that people just cram five days' work into four and end up more exhausted. So it really depends on whether the workload is reduced or simply compressed." },
      { role: 'examiner', text: 'Is a healthy work-life balance realistic for most people?' },
      { role: 'candidate', text: "For some people, yes, but I think it's become a bit of a privilege. If you're in a secure, well-paid job, you can afford to say no to extra hours. Someone juggling two part-time jobs to pay the rent doesn't have that luxury, and telling them to prioritise self-care misses the point entirely.\n\nI'd also question the idea of 'balance' as something you achieve once and then keep. In reality it shifts constantly — there are weeks when work has to come first, and weeks when family does. The goal, I think, is that it evens out over time rather than being perfect every single day.\n\nSo it's realistic as an aim, but I'd say it depends far more on economic security than on personal discipline, which is something the self-help industry tends to overlook." },
    ],
    tips: [
      'Contrast how things were when you started your career with how they are now',
      'Separate what employers should and should not be responsible for',
      'Show cautious support with clear conditions ("I\'m cautiously in favour")',
      'Raise issues of fairness — who can and cannot afford a choice',
      'Question the key concept itself ("balance") to demonstrate abstract thinking',
    ],
    keyPhrases: [
      'an unspoken expectation',
      'never really switches off',
      'working flat out',
      'push back against',
      'take their cues from the people at the top',
      "I'm cautiously in favour",
      'reduced or simply compressed',
      'misses the point entirely',
    ],
  },
  {
    id: 'ielts-81',
    title: 'Part 3 — Online Shopping & the High Street',
    part: 'Part 3',
    topic: 'Technology',
    description: 'A discussion about the rise of online shopping, the decline of local shops, the environmental cost of deliveries, and the future of town centres.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why has online shopping become so popular?' },
      { role: 'candidate', text: "Convenience, above all. You can compare prices across dozens of shops in a few minutes, read reviews from other buyers, and have it delivered to your door the next day without leaving the sofa. For busy people, that's hard to beat.\n\nThe pandemic was a huge accelerator, too. Lots of older people who'd never bought anything online were more or less forced to learn, and once they discovered how easy it was, most of them didn't go back.\n\nAnd from a marketing perspective, which is my line of work, online retailers have become incredibly good at personalisation. They know what you've looked at, what you might need next, and exactly when to send you a discount. Physical shops simply can't compete with that level of targeting." },
      { role: 'examiner', text: 'What effect has this had on traditional shops?' },
      { role: 'candidate', text: "It's been pretty devastating in many places. In the centre of my city, there's a street that used to be the main shopping area, and now probably a third of the units are empty or have been turned into cheap phone repair shops. Once a few big stores close, footfall drops, and that makes life harder for the smaller shops that relied on those visitors. It becomes a vicious circle.\n\nHaving said that, not all shops have suffered equally. The ones doing well tend to offer something you can't get online — expert advice, the chance to try things on, or a genuine experience. Independent bookshops, oddly enough, have had a bit of a revival because they've turned themselves into community spaces with events and cafés." },
      { role: 'examiner', text: 'Does online shopping have any negative effects on the environment?' },
      { role: 'candidate', text: "It can do, although it's more complicated than it first appears. In theory, one delivery van dropping off fifty parcels could be more efficient than fifty people driving to the shops. But that only works if the deliveries are well planned, and the trend towards same-day delivery undermines it, because vans are sent out half-empty to meet the deadline.\n\nThe bigger issue, in my view, is returns. Because returning things is free and easy, people order three sizes and send two back, and a surprising amount of returned stock is never resold — it's simply thrown away. Then there's all the packaging.\n\nSo I wouldn't say online shopping is inherently worse, but the way it's currently designed encourages quite wasteful habits." },
      { role: 'examiner', text: 'What do you think town centres will look like in the future?' },
      { role: 'candidate', text: "I suspect they'll become less about shopping and more about experiences and services. We're already seeing empty shops being converted into gyms, restaurants, medical clinics and even flats. If people are going to make the effort to go into town, there has to be a reason beyond buying things they could get online.\n\nIdeally, I'd like to see town centres become places where people actually want to spend time — more green space, more seating, markets and events. Some cities have pedestrianised their main streets and found that people linger longer and spend more.\n\nBut it won't happen automatically. It will take local governments being bold enough to rethink what a town centre is for, rather than waiting for the old retail model to come back, because I don't think it will." },
    ],
    tips: [
      'Draw on your own professional knowledge (marketing) to add credibility',
      'Describe a cause-and-effect chain — "it becomes a vicious circle"',
      'Show that an issue is "more complicated than it first appears" by weighing theory against practice',
      'When predicting the future, base it on trends you can already see',
      'End with a clear opinion about what needs to happen',
    ],
    keyPhrases: [
      "that's hard to beat",
      'a huge accelerator',
      'my line of work',
      'a vicious circle',
      'oddly enough',
      "it's more complicated than it first appears",
      'inherently worse',
      'bold enough to rethink...',
    ],
  },
  {
    id: 'ielts-82',
    title: 'Part 3 — Museums & Heritage',
    part: 'Part 3',
    topic: 'Arts & Culture',
    description: 'A discussion about the value of museums, free entry, returning historical objects, and protecting old buildings in modern cities.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why do you think museums are important?' },
      { role: 'candidate', text: "For me, the main value is that they make history tangible. You can read about how people lived three hundred years ago, but standing in front of the actual tools they used or the clothes they wore makes it feel real in a way that a textbook never quite manages.\n\nThey also serve as a kind of collective memory. A society that doesn't understand where it came from is more likely to repeat its mistakes, and museums — especially ones dealing with difficult periods — help keep those lessons alive.\n\nAnd on a more practical level, they're one of the few public spaces left where you can spend an afternoon without being expected to buy anything. I think that's undervalued." },
      { role: 'examiner', text: 'Should museums be free for everyone to enter?' },
      { role: 'candidate', text: "I lean towards yes, at least for the major national collections. The objects in them are, in a sense, owned by the public, so charging people to see their own heritage feels slightly odd. And when entry is free, you see a much broader range of visitors — families who couldn't afford four tickets, or people who just pop in for twenty minutes on their lunch break.\n\nThe counterargument is about money. Museums are expensive to run, and if the government won't fund them properly, entry fees might be the only way to keep the doors open.\n\nA compromise that seems to work quite well is free general entry with charges for special exhibitions. That way, everyone has access to the core collection, but people who want something extra help to subsidise it." },
      { role: 'examiner', text: 'Should historical objects be returned to the countries they originally came from?' },
      { role: 'candidate', text: "This is a genuinely complex issue, and I don't think there's a blanket answer. Where objects were clearly taken by force or through theft, particularly during periods of colonial rule, I find the case for returning them very persuasive. It's hard to argue that a museum has a moral right to something that was looted.\n\nThe usual argument against is that major museums can preserve objects better and show them to more visitors. But that sounds increasingly weak, because many of the countries asking for items back now have excellent facilities of their own.\n\nThere are also creative middle grounds — long-term loans, joint ownership, or digital replicas. What matters most, I'd say, is that these decisions are made through honest dialogue rather than one side simply refusing to discuss it." },
      { role: 'examiner', text: 'How important is it to protect old buildings in modern cities?' },
      { role: 'candidate', text: "Very important, although I don't think every old building deserves to be preserved just because it's old. Historic buildings give a city its character and its sense of identity. My hometown has an old harbour district with buildings dating back a couple of centuries, and it's by far the most popular part of town — with locals as well as tourists.\n\nAt the same time, cities have to evolve. When there's a severe housing shortage, refusing to allow any change to a run-down area can be hard to justify.\n\nThe most successful approach I've seen is adaptive reuse — keeping the outside of an old warehouse or factory but converting the inside into flats, offices or a gallery. That way, you hold on to the history while still giving the building a useful role in the modern city." },
    ],
    tips: [
      'Organise answers by layers of value: personal, social, practical',
      'Use "I lean towards..." to give a soft but clear opinion',
      'Propose a compromise when there are strong arguments on both sides',
      'For sensitive topics, acknowledge complexity and avoid blanket answers',
      'Use a precise technical term ("adaptive reuse") and explain it briefly',
    ],
    keyPhrases: [
      'make history tangible',
      'a kind of collective memory',
      'keep those lessons alive',
      'I lean towards yes',
      'keep the doors open',
      "I don't think there's a blanket answer",
      'creative middle grounds',
      'hold on to the history',
    ],
  },
  {
    id: 'ielts-83',
    title: 'Part 3 — Volunteering & Community',
    part: 'Part 3',
    topic: 'Society & Culture',
    description: 'A discussion about why people volunteer, whether volunteering should be compulsory, the decline of community spirit, and the role of charities.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Why do people choose to do voluntary work?' },
      { role: 'candidate', text: "There's a mix of motives, and I think that's perfectly fine. Some people are driven by a genuine desire to give something back — they've been helped at some point in their lives and want to return the favour.\n\nFor others, especially younger people, it's partly about gaining experience and building a CV. That might sound less noble, but the work still gets done, and quite often people who start for practical reasons end up staying because they enjoy it.\n\nAnd then there's the social side, which is often overlooked. I volunteer at a beach clean-up group a couple of times a month, and honestly, half the appeal is the people. In a big city it can be surprisingly hard to meet anyone outside work, and volunteering gives you a ready-made community." },
      { role: 'examiner', text: 'Should volunteering be compulsory for students?' },
      { role: 'candidate', text: "I can see the appeal, but I'm a bit sceptical. The whole point of volunteering is that it's freely given, and once it becomes compulsory, it turns into just another box to tick. You risk students turning up resentfully, doing the bare minimum, and leaving with a negative impression of the whole idea.\n\nThere's also a practical issue: charities would have to supervise large numbers of unwilling teenagers, which could create more work for them than it saves.\n\nWhat I'd prefer is for schools to make volunteering easy and visible — offering a wide range of opportunities, giving credit for it, and letting students choose something they actually care about. Exposure, rather than obligation, is probably the way to build a lasting habit." },
      { role: 'examiner', text: 'Do you think people have less sense of community than in the past?' },
      { role: 'candidate', text: "In some ways, yes. My grandparents knew everyone on their street, whereas I'd struggle to name more than a couple of my neighbours. People move around far more for work, they commute longer distances, and a lot of social life has moved online, so the local connections have weakened.\n\nBut I'm not sure community has disappeared so much as changed shape. People now form communities around shared interests rather than geography — running clubs, online groups for new parents, that sort of thing. They can be just as supportive, even if the members live miles apart.\n\nThe one thing that's harder to replace is the informal, everyday contact — someone noticing that an elderly neighbour hasn't been out for a few days. That kind of safety net really does depend on people living close together and knowing each other." },
      { role: 'examiner', text: 'Should charities do work that governments are responsible for?' },
      { role: 'candidate', text: "In an ideal world, charities would be filling gaps rather than propping up essential services. When food banks become a permanent part of a country's welfare system, I think that's a sign that something has gone badly wrong with government policy.\n\nThat said, charities do have real strengths. They tend to be more flexible and closer to the communities they serve, so they can respond quickly and try new approaches that a large government department would take years to approve.\n\nSo the best arrangement, in my view, is a partnership where the government guarantees the basics and funds them properly, while charities handle the things that need a more personal touch. The danger is when governments quietly step back and expect volunteers to pick up the slack." },
    ],
    tips: [
      'Accept that motives can be mixed — it makes your answer more realistic and nuanced',
      'Use a brief, specific personal example to support a general point',
      'Explain why a well-intentioned policy might backfire',
      'Suggest that something has "changed shape" rather than simply declined',
      'Distinguish between the ideal and the reality when discussing responsibility',
    ],
    keyPhrases: [
      'give something back',
      'return the favour',
      'a ready-made community',
      'just another box to tick',
      'doing the bare minimum',
      'changed shape',
      'filling gaps rather than propping up...',
      'pick up the slack',
    ],
  },
  {
    id: 'ielts-84',
    title: 'Part 3 — Space Exploration',
    part: 'Part 3',
    topic: 'Technology',
    description: 'A discussion about whether space exploration is worth the cost, private space companies, space tourism, and the possibility of living on other planets.',
    duration: '10 min',
    exchanges: [
      { role: 'examiner', text: 'Is space exploration worth the money that is spent on it?' },
      { role: 'candidate', text: "I think it is, although I understand the objection. When people are struggling with the cost of living, spending billions on sending a probe to a distant planet can look like a luxury. But in reality, space budgets are a tiny fraction of what governments spend on things like healthcare or defence.\n\nAnd the benefits are often indirect. A lot of everyday technology — satellite navigation, weather forecasting, even some medical imaging techniques — came out of space programmes. Satellites are also essential for monitoring climate change, which is hardly a luxury.\n\nBeyond that, there's an inspirational value that's hard to put a price on. Seeing images from space or a successful landing can spark a child's interest in science in a way that nothing else does." },
      { role: 'examiner', text: 'What do you think about private companies becoming involved in space travel?' },
      { role: 'candidate', text: "It's a double-edged sword. On the positive side, competition has driven down the cost of launching things into space dramatically. Reusable rockets, for instance, were seen as unrealistic for decades, and private companies made them work in a relatively short time.\n\nOn the other hand, I'm uneasy about space becoming dominated by a handful of extremely wealthy individuals. Their priorities are commercial, and there's a real risk of things like orbital space being crowded with private satellites with very little regulation. Astronomers are already complaining that it's interfering with their observations.\n\nSo I'd say private involvement is welcome, but space shouldn't become a free-for-all. There needs to be strong international agreement on the rules before it gets out of hand." },
      { role: 'examiner', text: 'Would you like to travel into space as a tourist?' },
      { role: 'candidate', text: "If money were no object, I'd be very tempted — seeing the Earth from above must be an extraordinary experience. Apparently, many astronauts describe a profound shift in perspective when they see how small and fragile the planet looks.\n\nHaving said that, I have mixed feelings about space tourism as an industry. At the moment, it's essentially a playground for the super-rich, and each flight burns an enormous amount of fuel for what is, essentially, a few minutes of entertainment. It's hard to square that with asking ordinary people to cut back on flights for environmental reasons.\n\nPerhaps in a few decades, if it becomes cheaper and cleaner, it'll be a different story. But for now, I think I'll stick to watching the videos." },
      { role: 'examiner', text: 'Do you think humans will ever live on other planets?' },
      { role: 'candidate', text: "Eventually, perhaps, but I suspect it's much further off than some people claim. The practical challenges are immense — radiation, the lack of breathable air, the effect of low gravity on the human body over many years. We haven't even worked out how to keep a small group healthy on a long journey, let alone build a self-sustaining colony.\n\nI'm also slightly wary of the argument that we need another planet as a backup in case we ruin this one. Even after a major disaster, Earth would still be far more habitable than anywhere else we know of. It seems to me that fixing our own planet is both cheaper and more urgent.\n\nThat said, I wouldn't rule anything out. If you'd told people a hundred and fifty years ago that we would one day walk on the Moon, they'd have laughed. So I'd say it's possible in the long term, just not something we should count on." },
    ],
    tips: [
      'Put costs in proportion — comparing budgets makes an argument more convincing',
      'Use "a double-edged sword" or similar to frame a balanced answer, then develop both sides',
      'For personal questions in Part 3, add a wider social or ethical angle',
      'Use second conditionals ("If money were no object...") for hypothetical situations',
      'Make long-term predictions with appropriate hedging rather than certainty',
    ],
    keyPhrases: [
      "hard to put a price on",
      'a double-edged sword',
      'a free-for-all',
      'before it gets out of hand',
      'money were no object',
      'hard to square that with...',
      'let alone...',
      "I wouldn't rule anything out",
    ],
  },
];
