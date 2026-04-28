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
      { role: 'candidate', text: "I'm a software engineer. I work for a tech company in Da Nang, Vietnam. My main responsibility is building web applications, mostly using React and TypeScript. I've been doing this for about five years now, and I really enjoy the problem-solving aspect of it." },
      { role: 'examiner', text: 'What do you like most about your job?' },
      { role: 'candidate', text: "I think what I enjoy most is the creative side of programming. When you're building a user interface, you're not just writing code — you're designing an experience for people. There's a real sense of satisfaction when you solve a difficult problem or when users genuinely appreciate something you've built. I also enjoy the continuous learning — the tech industry moves so fast that there's always something new to explore." },
      { role: 'examiner', text: 'Do you prefer working alone or in a team?' },
      { role: 'candidate', text: "Honestly, I enjoy both, but probably lean slightly toward working in a team. When you collaborate with others, you get exposed to different perspectives and ideas that you wouldn't come up with on your own. That said, I do need some quiet, focused time to actually write code. So ideally, I like a balance — team discussions for planning and brainstorming, and individual time for deep work." },
      { role: 'examiner', text: "Let's talk about your daily routine. What time do you usually wake up?" },
      { role: 'candidate', text: "I'm usually up around seven in the morning. I'm not really a morning person by nature, but I've trained myself to wake up early because I find I get more done before noon. The first thing I do is make a cup of Vietnamese coffee — I can't really function without it. Then I'll check my messages quickly before heading to the office or starting work if I'm working from home that day." },
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
      { role: 'candidate', text: "Oh, constantly. As a software developer, I'm online pretty much all day for work — looking up documentation, collaborating with teammates, and of course writing code. Outside of work, I use the internet for everything from reading news to watching tutorials. I'd say I'm connected for at least ten to twelve hours a day, which sounds like a lot when I say it out loud." },
      { role: 'examiner', text: 'What do you mainly use the internet for?' },
      { role: 'candidate', text: "Apart from work, I'd say learning is the biggest one. I watch a lot of YouTube videos about programming, design, and sometimes random topics like history or science. I also use the internet for entertainment — I'm a big fan of podcasts, especially tech ones and English learning ones. And of course, staying in touch with friends and family through messaging apps like Zalo and Telegram." },
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

I decided to focus seriously on English when I started working with international clients and colleagues. Before that, I could read English fairly well — most programming documentation is in English, so I had decent reading comprehension. But when it came to speaking and writing in professional contexts, I really struggled. I would freeze up in meetings, overthink my grammar, and often just stay silent because I was afraid of making mistakes.

The way I learned was quite self-directed. I started by consuming as much English content as possible — podcasts during my commute, English YouTube channels, and audiobooks before bed. I also began writing a daily journal in English, which helped me practice expressing my thoughts more fluently. But the biggest breakthrough came when I started actually using English every day — having conversations with colleagues, presenting in meetings, and even thinking in English instead of translating from Vietnamese in my head.

I'm particularly proud of this skill because it required me to push past a lot of discomfort. Speaking a foreign language means being vulnerable — you make grammatical mistakes, you mispronounce words, and sometimes people don't understand you. It would have been much easier to just stick to Vietnamese and avoid that discomfort. But I pushed through, and now I can confidently hold conversations, give presentations, and even make jokes in English, which I think is one of the hardest things to do in a foreign language.

It's also opened up so many opportunities for me professionally. I can now work with clients from anywhere in the world, read technical articles without struggling, and participate in the global developer community. It's genuinely changed the trajectory of my career, and I feel proud every time I realize how far I've come from those early days of freezing up in meetings.` },
      { role: 'examiner', text: 'Do you think you will continue to improve this skill?' },
      { role: 'candidate', text: "Absolutely. Language learning is a lifelong journey — I don't think you ever really finish. There are still areas where I want to improve, like using more idiomatic expressions naturally and getting better at understanding different accents. I also want to expand my vocabulary in areas outside of technology, like discussing art, politics, or philosophy in English. So yes, I'll definitely keep working on it." },
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
      { role: 'candidate', text: `One of my favorite places in Da Nang is the area along the Han River, particularly the stretch between the Dragon Bridge and the Love Lock Bridge. I try to go there at least two or three times a week, usually in the evening after work.

What I typically do there depends on my mood. Sometimes I go for a run along the riverbank — there's a nice paved path that runs alongside the water, and in the evening the temperature cools down enough to make running pleasant. Other times, I just walk slowly and take in the scenery. There are lots of small cafés and street food vendors along the river, so I might stop for a Vietnamese iced coffee or some grilled corn.

I usually go alone, actually, which might sound strange. But I find that walking by the river alone is one of the best ways for me to decompress after a long day of coding. When you spend all day staring at a screen and thinking about complex problems, there's something incredibly refreshing about being outdoors, watching the lights reflected on the water, feeling the breeze from the sea.

What I particularly love about this spot is how it transforms at night. The Dragon Bridge lights up in different colors, and on weekend nights it actually breathes fire and water, which is quite a spectacle. The Love Lock Bridge is covered in colorful locks left by couples, and it's beautifully lit in the evening. The whole area has this wonderful, almost magical atmosphere.

But beyond the aesthetics, I think what I really enjoy is the sense of community. In the evening, you see families out walking, groups of friends sitting on the riverbank, elderly people doing tai chi, and young couples taking photos. It reminds me that there's a whole world beyond my laptop screen. It brings me back to the present moment and helps me appreciate the city I live in.

I'd say this place is important to my mental health, honestly. It's become a kind of ritual — whenever I'm feeling stressed or stuck on a problem, I know that a walk by the river will help me reset. And sometimes, I've had my best ideas while walking there, because my mind is free to wander without the pressure of sitting at a desk.` },
      { role: 'examiner', text: 'Is this place popular with tourists as well?' },
      { role: 'candidate', text: "Yes, very much so. Da Nang has become one of the most popular tourist destinations in Vietnam, and the Han River area is one of the main attractions. You see quite a mix of local people and tourists there, especially near the Dragon Bridge on weekend evenings. I think tourists are drawn to it for the same reasons I am — the beautiful scenery, the vibrant atmosphere, and of course the dragon breathing fire, which is quite unique. But I'd say during weekday evenings it's mostly locals, which is when I prefer to go." },
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
      { role: 'candidate', text: "Technology has fundamentally transformed learning in several ways. The most obvious is accessibility — today, anyone with an internet connection can access courses from top universities through platforms like Coursera or MIT OpenCourseWare. When I was growing up in Vietnam, access to high-quality English-language education was limited. Now, a student in a small town can watch the same lecture as someone at Harvard. That's remarkable.\n\nBeyond accessibility, technology has made learning much more personalized. AI-powered tools can adapt to a student's level and pace, providing more practice in areas where they're struggling. Language learning apps like Duolingo adjust their difficulty based on your performance. This kind of personalization was simply impossible in a traditional classroom with thirty students." },
      { role: 'examiner', text: 'Do you think online learning is as effective as traditional classroom learning?' },
      { role: 'candidate', text: "That's a really interesting question, and I don't think there's a simple answer. For certain types of learning, online can actually be more effective. Self-paced courses are great for motivated learners who want to go deeper into a subject at their own speed. And for technical skills like programming, online resources are often more up-to-date than textbooks.\n\nHowever, traditional classroom learning has advantages that are hard to replicate online. The social aspect — learning alongside peers, having face-to-face discussions, building relationships with teachers — is really valuable. There's also the accountability factor. When you have to show up to a class at a specific time, you're more likely to actually do the work.\n\nI think the ideal model is probably a blend of both — what educators call 'blended learning.' Use online resources for content delivery and self-study, but maintain in-person sessions for discussion, collaboration, and hands-on activities." },
      { role: 'examiner', text: 'Some people say that university degrees are becoming less important. Do you agree?' },
      { role: 'candidate', text: "To some extent, yes, particularly in industries like technology. In my field, software engineering, many successful developers are self-taught or have learned through bootcamps rather than university degrees. Companies like Google and Apple have removed degree requirements for many positions, focusing instead on demonstrated skills and portfolio work.\n\nHowever, I think it would be premature to say that degrees are becoming irrelevant. For many professions — medicine, law, engineering — a formal education is absolutely essential. And even in tech, a university education provides things that self-study doesn't: a broad foundation of knowledge, exposure to different perspectives, and the development of critical thinking skills.\n\nWhat I think is changing is the monopoly that universities had on credentialing. Employers are increasingly willing to accept alternative credentials — certificates, portfolios, open-source contributions. So degrees are becoming less necessary as a signal of competence, but the learning they represent is still valuable." },
      { role: 'examiner', text: 'How do you think education systems should prepare young people for the future?' },
      { role: 'candidate', text: "This is something I feel quite strongly about. I think current education systems, in many countries including Vietnam, are still too focused on memorization and standardized testing. Students learn to pass exams rather than to think critically, solve problems, or be creative.\n\nIf I could change one thing, it would be to put much more emphasis on teaching students how to learn, rather than what to learn. In a world where information is constantly changing and new fields are emerging all the time, the most valuable skill is the ability to teach yourself new things. Critical thinking, information literacy, and adaptability should be at the core of education.\n\nI'd also advocate for more practical, project-based learning. When I was in school, most of what I learned was theoretical. But when I started working, I realized that the ability to apply knowledge to real problems is what actually matters. Students should be working on real projects, collaborating in teams, and learning from failure from an early age.\n\nFinally, I think we need to take soft skills more seriously. Communication, teamwork, emotional intelligence, resilience — these are just as important as technical knowledge, but they're rarely taught explicitly in schools." },
      { role: 'examiner', text: 'Is there too much pressure on students today?' },
      { role: 'candidate', text: "Absolutely, and I think this is a growing concern, especially in Asian countries. In Vietnam, there's enormous pressure on students to perform well in exams, get into prestigious universities, and pursue 'respectable' careers. This pressure comes from families, schools, and society as a whole.\n\nThe consequences can be quite serious. I've seen friends and colleagues who burned out in their twenties because they'd been under relentless academic pressure since childhood. Mental health issues among students are rising — anxiety, depression, and in the worst cases, more serious problems.\n\nI think we need a cultural shift in how we view success and education. Not everyone needs to go to university. Not everyone needs to be a doctor or an engineer. A society needs people with all kinds of skills and interests, and we should celebrate that diversity rather than pushing everyone through the same narrow path.\n\nThat said, I want to be careful not to romanticize a lack of pressure. Some degree of challenge and expectation is necessary for growth. The problem is when the pressure becomes excessive, when it comes at the cost of wellbeing, and when it's driven by social status rather than genuine learning." },
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
      { role: 'candidate', text: "There are both push and pull factors at play. On the pull side, cities offer better job opportunities, higher salaries, and more diverse career options. For a young person in a rural area of Vietnam, moving to Ho Chi Minh City or Da Nang opens up possibilities that simply don't exist in their hometown — particularly in fields like technology, finance, and creative industries.\n\nCities also offer better access to education, healthcare, and cultural activities. If you want to attend a university, visit a specialist doctor, or go to a concert, you generally need to be in or near a city.\n\nOn the push side, rural areas often lack economic opportunities, and farming — which is the main livelihood in many rural areas — is becoming increasingly mechanized, requiring fewer workers. Climate change is also a factor — in Vietnam, rising sea levels and extreme weather are affecting agricultural communities, pushing some people toward cities.\n\nI think this trend is likely to continue, though perhaps at a slower pace as remote work makes it possible for some people to live in smaller cities while working for companies based in large ones." },
      { role: 'examiner', text: 'What problems does rapid urbanization cause?' },
      { role: 'candidate', text: "The list is quite long, unfortunately. Housing affordability is one of the biggest issues. When millions of people move to cities, demand for housing outstrips supply, and prices skyrocket. In cities like Ho Chi Minh City, property prices have risen so dramatically that many young professionals can barely afford to rent, let alone buy. This creates inequality — longtime residents and wealthy investors benefit from rising property values while newcomers are priced out.\n\nInfrastructure strain is another major problem. Roads, public transport, water systems, and electrical grids weren't designed for the current population in many rapidly growing cities. Traffic congestion in Vietnamese cities is a daily frustration for millions of people, and it wastes enormous amounts of time and fuel.\n\nEnvironmental degradation is also a serious concern. More people means more waste, more pollution, and more pressure on green spaces. Air quality in many Asian cities is already at dangerous levels, and the heat island effect — where cities are significantly hotter than surrounding rural areas — is getting worse.\n\nAnd then there are social issues: overcrowding, stress, crime, and the erosion of community. In a village, everyone knows their neighbors. In a massive city, people can live next door to each other for years without ever speaking." },
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
      { role: 'candidate', text: `I'd like to describe a time when I helped a junior developer on my team who was really struggling during his first few months at our company.

His name was Minh, and he had just graduated from university. He was technically quite capable — his coding skills were solid — but he was having a hard time adapting to the professional environment. The codebase was large and complex, the tools and processes were unfamiliar, and I think he was overwhelmed by the gap between what he'd learned in school and what the job actually required.

I noticed that he was staying very late every day but not making much progress on his tasks. He was too shy to ask for help — I think he was afraid of looking incompetent. During code reviews, his pull requests would have fundamental issues, and I could see that the feedback, while well-intentioned, was making him feel worse rather than helping him improve.

So I decided to become something of an informal mentor. I started by having a casual coffee chat with him, where I shared my own experience of feeling lost when I first started working. I told him about mistakes I'd made and how long it took me to feel comfortable. I think hearing that helped normalize what he was going through.

After that, I set up a regular weekly session where we'd sit together and work through problems. I didn't just give him answers — I tried to teach him how to approach problems systematically. How to read a codebase, how to debug effectively, how to break a large task into manageable pieces. I also helped him set up his development environment properly and showed him shortcuts and tools that would save him time.

Over the next few months, his confidence grew visibly. He started asking questions in team meetings, his code reviews improved dramatically, and he began finishing tasks on time. By the end of his first year, he was one of the most reliable members of the team.

How did I feel about it? Honestly, it was one of the most rewarding experiences I've had at work. There's something deeply satisfying about helping someone overcome a difficult period and seeing them grow. It also made me reflect on my own journey and appreciate the people who helped me along the way. I think mentoring someone is one of the best ways to solidify your own knowledge too — when you have to explain something clearly to someone else, you understand it better yourself.

And on a broader level, it reinforced my belief that the tech industry needs to do more to support junior developers. The transition from education to professional work is genuinely difficult, and without proper support, talented people can fall through the cracks.` },
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
      { role: 'candidate', text: "I live in Da Nang, which is a coastal city in central Vietnam. It's the third largest city in the country, but it still has a much more relaxed pace of life compared to Ho Chi Minh City or Hanoi. What I love most about it is the combination of city conveniences and natural beauty — you have the beach literally five minutes from the city centre, and the Marble Mountains and Ba Na Hills are just a short drive away. It's a great place to live if you value a balance between work and quality of life." },
      { role: 'examiner', text: 'What do you like most about your neighbourhood?' },
      { role: 'candidate', text: "I live near the Han River, and the neighbourhood has a really nice atmosphere, especially in the evenings. There are lots of small cafés along the riverbank, which is where I like to spend my evenings sometimes. The area is quite walkable, which I appreciate — I can get to the supermarket, a gym, and several restaurants all on foot. It doesn't feel too crowded or chaotic, which is important to me after spending all day in front of a computer." },
      { role: 'examiner', text: 'Is there anything you dislike about living there?' },
      { role: 'candidate', text: "The main downside is the traffic. Da Nang is growing so fast that the roads haven't quite kept up with the number of vehicles. Rush hour can be quite frustrating. The rainy season — roughly from October to December — is also quite intense. We get a lot of flooding, which can disrupt daily life for weeks at a time. But overall, these are minor issues compared to the advantages of living here." },
      { role: 'examiner', text: 'Has the area changed much since you moved there?' },
      { role: 'candidate', text: "Enormously. When I first moved here about six years ago, it was much quieter. There were fewer buildings, fewer tourists, and the tech scene was just starting out. Now there are new apartment buildings going up constantly, a lot more international restaurants and coffee shops, and the city has really put a lot of investment into improving the infrastructure. The beachfront has been developed a lot too. Sometimes I miss the quieter version of the city, but the development has also brought a lot of opportunities." },
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
      { role: 'candidate', text: "I'm a big fan of Vietnamese food — it's incredibly diverse and every region has its own specialities. Living in Da Nang, I'm surrounded by central Vietnamese cuisine, which tends to be spicier and more complex than northern or southern food. My absolute favourite is mi quang — a local noodle dish with shrimp, pork, herbs, and a small amount of turmeric broth, topped with crispy rice crackers. But I also enjoy international food quite a bit. Japanese cuisine in particular — the precision and balance of flavours really appeals to me." },
      { role: 'examiner', text: 'Do you prefer cooking at home or eating out?' },
      { role: 'candidate', text: "Honestly, a mix of both. I enjoy cooking when I have the time, mainly because it's relaxing and I can control what goes into the food. But Da Nang has such incredible and affordable street food that it's hard to justify cooking every day. A bowl of banh mi or pho from a local spot costs almost nothing and tastes amazing. On weekdays, I usually eat out for convenience. On weekends, I sometimes cook something a bit more elaborate at home." },
      { role: 'examiner', text: "Have your eating habits changed as you've got older?" },
      { role: 'candidate', text: "Yes, quite a lot. When I was a student, I ate really carelessly — lots of instant noodles, fast food, skipping meals when I was busy. Now I pay much more attention to what I eat. I try to have proper meals with vegetables and protein, and I've cut down on sugar and fried food. Working from a screen all day makes me very aware that my diet affects my energy levels and concentration. If I eat junk, I feel sluggish in the afternoon. It's a very practical motivation to eat better." },
      { role: 'examiner', text: 'Is food an important part of culture in Vietnam?' },
      { role: 'candidate', text: "Absolutely. In Vietnam, food is almost inseparable from social life. Family gatherings, celebrations, even business meetings — they all revolve around eating together. There's a saying that roughly translates as 'eating is a form of connection.' I think that's very true. You can learn a lot about Vietnamese culture just by eating with a local family. The variety of ingredients, the balance of flavours, the care that goes into each dish — it all reflects something deeper about the culture." },
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
      { role: 'candidate', text: "I read quite a bit — mostly non-fiction, things like biographies, books on technology, or popular science. I also enjoy going for motorbike rides on weekends, exploring the roads around Da Nang and the surrounding province. There's something very freeing about just getting on the bike and seeing where you end up. And honestly, working on side projects counts as leisure for me — I genuinely enjoy building things, so it doesn't always feel like work." },
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
      { role: 'candidate', text: "My taste is fairly broad. While I'm working, I usually listen to lo-fi music or instrumental jazz — something without lyrics that won't distract me. When I'm exercising or commuting, I switch to more upbeat stuff, like pop or electronic music. I also genuinely enjoy Vietnamese indie music — there's a really talented scene here that I don't think gets enough international attention. And I still play guitar occasionally, so I find myself listening to classical guitar pieces too." },
      { role: 'examiner', text: 'Do you prefer reading books or watching films?' },
      { role: 'candidate', text: "I'd say reading, for deep engagement. A good book gives you space to think and imagine in a way that a film doesn't. But films are great when I want something more passive and immersive. I don't think it has to be one or the other — they serve different purposes. When I'm tired after a long day of coding, reading requires more mental energy than I often have. So in practice, I probably watch more films than I read books, even though I prefer reading in principle." },
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
      { role: 'candidate', text: `I'd like to talk about Tet, the Vietnamese Lunar New Year, which is by far the most important cultural tradition in Vietnam.

Tet usually falls in late January or early February, depending on the lunar calendar. It marks the beginning of a new year and is a time for families to come together, remember their ancestors, and celebrate new beginnings. The preparations begin weeks before the actual date — families clean and decorate their homes, buy fresh flowers like apricot blossoms or peach blossoms, and prepare special foods. Streets and markets are transformed into a sea of yellow and red, which are considered lucky colours.

The way my family celebrates is fairly traditional. We spend the days before Tet deep-cleaning the house, which symbolically sweeps away bad luck from the previous year. My mother and grandmother spend hours in the kitchen making banh tet — sticky rice cakes filled with mung bean paste and pork, wrapped in banana leaves and slow-cooked overnight. The smell of those cakes simmering fills the whole house and is one of the most deeply nostalgic smells I know.

On New Year's Eve, the whole family gathers for a reunion dinner. We set a place at the table for ancestors who have passed away, which I find very moving. Then at midnight, there are fireworks across the city — the sky above Da Nang is absolutely spectacular. On the first days of the new year, children receive red envelopes with money, which represent good luck and blessings.

Why is this tradition important to me personally? I think in modern life, we're all moving so fast — work, technology, constant change. Tet creates a moment when everything stops. Everyone goes home. You reconnect with your family, your roots, the things that are permanent. In a way, it's a reminder of where you come from and who you are.

I also think traditions like Tet are incredibly valuable for cultural continuity. Vietnam has gone through enormous changes in recent decades. Having a tradition that everyone participates in, regardless of age, class, or where they live, is a kind of cultural anchor.` },
      { role: 'examiner', text: 'Do you think younger generations still value traditional celebrations like Tet?' },
      { role: 'candidate', text: "It's a mixed picture. On one hand, I think young Vietnamese people genuinely love Tet — the holiday is deeply embedded in the culture and most people look forward to it. On the other hand, the way it's celebrated is changing. Younger generations tend to celebrate in shorter, more condensed ways. The multi-day family gatherings are getting shorter as people return to work sooner. There's also a small segment of young people who find the family pressure during Tet — questions about relationships, salary, future plans — quite stressful. But I think the core of the tradition remains strong." },
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
      { role: 'candidate', text: `The person I'd like to talk about is my first manager at work, who I'll call Anh Hung. He was the tech lead at the company where I got my first job as a developer, about six years ago, and he's one of the people I most credit for shaping the kind of professional I've become.

When I joined the company, I was fresh out of university — technically not terrible, but with very little understanding of how to actually work in a team, how to handle feedback, or how to think about code from a business perspective. I was quite anxious and trying too hard to prove myself, which, looking back, was probably more of a liability than an asset.

What made Anh Hung different from other managers I've had since was his approach to teaching. He never made you feel stupid for not knowing something. Whenever I asked a question — even a basic one — he'd answer it seriously and then explain the context around it. He once told me, "There are no stupid questions, only questions that weren't asked in time." That has stuck with me.

He also had a remarkable ability to give honest feedback without it feeling like a criticism of who you were as a person. He would say something like, "This code works, but let me show you why it will cause problems in six months." It was always about the work, never about you. I try to apply that same approach when I give feedback to junior developers now.

But perhaps the most important thing I learned from him was how to be comfortable with not knowing everything. He was the most technically skilled person in the company, but he was also the most open about uncertainty. He'd say, "I'm not sure — let me think about it, or let's look it up together." That taught me that confidence isn't about having all the answers; it's about being comfortable with the process of finding them.

He moved abroad a few years ago, but I still occasionally message him when I'm facing a difficult decision. He's one of those rare people who genuinely invests in others without expecting anything in return, and I hope I carry some of that quality in how I work with people.` },
      { role: 'examiner', text: 'Do you think good mentors are important in the workplace?' },
      { role: 'candidate', text: "I think they're absolutely critical, especially early in a career. The gap between what you learn in university and what you need to succeed in a real job is enormous, and without good guidance, it's easy to develop bad habits or lose confidence. A good mentor can compress years of learning into months. But I think good mentorship is genuinely rare — it requires technical skill, communication skill, patience, and a genuine interest in other people's growth. Not everyone who knows a lot is able or willing to teach." },
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
      { role: 'candidate', text: `The trip I'd like to describe is a solo motorbike journey I made from Da Nang to Hue, which is a city about 100 kilometres north, through the Hai Van Pass.

I did this trip on a whim, actually. It was a Sunday morning about two years ago. I had no particular plans, the weather was perfect, and on impulse I decided to ride north. I didn't plan a route or book anything. I just filled up the tank and headed toward the mountains.

The Hai Van Pass is one of the most spectacular roads in Vietnam. It cuts through the Truong Son mountain range, with the ocean on one side and forested mountains on the other. As you gain altitude, the temperature drops noticeably and the air feels cleaner. At the top of the pass, there are old fortifications from the Vietnam War, and the view from there is breathtaking — you can see both the Da Nang coastline behind you and the long sweeping bay toward Hue ahead of you. I stopped there for about an hour, had a cup of coffee from a small stall, and just sat and looked at the view. I remember thinking that moments like this are why I love living in Vietnam.

Coming down the other side of the pass, the landscape changes completely. The beaches near Lang Co are among the most beautiful I've ever seen — completely undeveloped, with calm turquoise water and almost nobody there. I stopped for a swim, which was completely spontaneous and completely wonderful.

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
      { role: 'candidate', text: "Arts and culture serve several functions that are hard to replicate in other ways. On the most basic level, they provide a shared language — stories, music, images that a community holds in common and that bind people together. In Vietnam, traditional music like ca tru or quan ho carries centuries of history and identity. Losing those traditions would be losing a part of what makes us who we are.\n\nBeyond preservation, the arts also provide a space for exploring ideas and emotions that are too complex or uncomfortable for everyday conversation. Literature and film can address difficult topics — poverty, injustice, grief — in ways that create empathy and understanding. I think empathy is increasingly important in a fragmented, polarised world.\n\nAnd at the individual level, creativity and artistic expression are deeply tied to mental health and wellbeing. Making something — whether it's a painting, a poem, or a piece of music — is one of the most distinctly human activities there is." },
      { role: 'examiner', text: 'Should governments fund the arts, or should they focus on more pressing needs?' },
      { role: 'candidate', text: "This is a genuine tension, and I don't think there's a simple answer. My view is that cultural funding shouldn't be seen as a luxury that you get to once everything else is sorted — because everything else is never fully sorted. There are always hospitals to build and roads to repair. If you wait until there are no pressing needs to fund culture, you'll never fund culture.\n\nThe case for government arts funding rests on the fact that the arts generate public goods that the market won't adequately provide. Commercial culture tends toward what's popular and profitable — blockbuster films, pop music, celebrity culture. Government funding can support things that are valuable but not commercially viable: experimental theatre, folk music preservation, minority language literature.\n\nThat said, I think the level of funding should be proportionate, and governments should be transparent about how it's used. Art for art's sake is a valid principle, but public money needs some degree of public accountability." },
      { role: 'examiner', text: 'Do you think technology is changing the way people engage with arts and culture?' },
      { role: 'candidate', text: "Profoundly. In some ways, technology has democratised culture in remarkable ways. Anyone with a smartphone can access virtually the entire history of recorded music, watch films from any country, or read books from any era. A teenager in rural Vietnam can discover a niche subgenre of Japanese jazz that their parents had no way of accessing.\n\nBut there's a paradox here. Even as access has become almost unlimited, consumption has become more algorithmic. Streaming platforms don't just give you access to everything — they actively push you toward what's similar to what you've already liked. This creates filter bubbles in culture, just as in news. People end up in very narrow aesthetic worlds despite having access to everything.\n\nI also worry about what the streaming economy does to artists. When a song generates a fraction of a cent per stream, and an artist gets paid for plays rather than ownership, the economic model for making art has fundamentally changed in ways that favour big labels and popular artists over independent and experimental ones." },
      { role: 'examiner', text: 'Is creativity something that can be taught, or is it innate?' },
      { role: 'candidate', text: "I think this is a false dichotomy. Creativity is both — there may be natural variation in creative inclination, just as with any other cognitive trait. But the idea that creativity is purely a gift that you either have or you don't is, I think, both incorrect and harmful. It lets people off the hook from developing a skill that can be cultivated.\n\nWhat we know from research on creativity is that it tends to flourish under certain conditions: broad exposure to different ideas and domains, a willingness to make and learn from mistakes, a tolerance for ambiguity, and dedicated time for unstructured thinking. These are all things that can be developed and that education systems can either encourage or discourage.\n\nIn my own experience as a developer, creativity isn't a mysterious inspiration that strikes you out of nowhere. It's the result of deeply understanding a problem, having a broad knowledge base to draw analogies from, and then giving your mind space to connect things. That process can definitely be learned." },
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
      { role: 'candidate', text: "Competitive sport plays several interesting roles simultaneously. At the national level, it provides a form of collective identity and pride. When Vietnam qualifies for a football tournament or wins a medal at the SEA Games, there's a genuine sense of shared celebration that cuts across class, age, and region. It's one of the few things that can unite a whole country in a positive emotion at the same time.\n\nAt the individual and community level, sport teaches values that are genuinely hard to instil in other ways. Learning to compete fairly, to respect opponents, to win without arrogance and lose without bitterness — these are character lessons as much as physical ones. The discipline required to train seriously also builds qualities like perseverance and self-regulation.\n\nHowever, I think competitive sport can go too far when the pressure to win at all costs overrides these positive values. Doping scandals, match-fixing, the psychological damage inflicted on child athletes who are pushed too hard — these are real costs of a purely results-oriented approach to sport." },
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
      { role: 'candidate', text: "I think it's the defining challenge of this century, and I say that without much exaggeration. The scientific consensus is overwhelming — global temperatures are rising, and the consequences are already visible: more intense storms, longer droughts, rising sea levels, shifting growing seasons. For a country like Vietnam, which has a long coastline and a heavily agricultural economy, these aren't abstract future problems. The Mekong Delta, which produces a large portion of Vietnam's food, is already experiencing saltwater intrusion from sea-level rise.\n\nWhat I find particularly alarming is the pace of change. The natural world can adapt to gradual shifts, but the current rate of warming is happening over decades rather than millennia. Ecosystems and the communities that depend on them don't have time to adjust.\n\nThat said, I try not to fall into pure despair about it, because despair is unproductive. There are genuine reasons for cautious optimism — renewable energy costs have fallen dramatically, electric vehicles are becoming mainstream, and international frameworks like the Paris Agreement, however imperfect, represent real political will." },
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
      { role: 'candidate', text: "I believe employers have a significant responsibility, and it goes beyond just providing health insurance. At a minimum, companies should ensure that their work environment doesn't actively harm employees' health — that means reasonable working hours, adequate breaks, ergonomic workspaces, and a culture that doesn't glorify overwork.\n\nBeyond that minimum, I think forward-thinking companies should actively promote wellbeing. This could include things like flexible working arrangements, mental health support or counseling services, encouraging physical activity, and training managers to recognize signs of burnout in their teams.\n\nIn Vietnam's tech industry, there's still often a culture of working long hours and wearing exhaustion as a badge of honor. I've seen colleagues work twelve-hour days consistently, skip meals, and sacrifice sleep to meet deadlines. Some companies even celebrate this as 'dedication.' I think this is deeply misguided — it leads to burnout, turnover, and actually lower productivity in the long run.\n\nHowever, I also believe individuals bear some responsibility for their own health. You can't expect your company to force you to exercise or eat well. Ideally, it should be a partnership — the employer creates conditions that support health, and the employee takes advantage of those conditions." },
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
];
