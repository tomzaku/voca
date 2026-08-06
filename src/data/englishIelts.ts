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
      { role: 'candidate', text: "Very much so, yes. I try to take at least two or three short trips a year, usually within Vietnam. What I enjoy most isn't really the sightseeing — it's the change of perspective. When you're in an unfamiliar place, you notice things again: the way people talk, what they eat, how they organise their day. Living in the same city, you stop seeing it after a while. Travelling resets that for me." },
      { role: 'examiner', text: 'Where did you go on your last holiday?' },
      { role: 'candidate', text: "I went to Da Lat, which is a small city up in the Central Highlands, about ten hours from Da Nang by bus. It's famous for its cool climate, pine forests, and coffee plantations, which is a real contrast to the heat on the coast. I spent four days there mostly walking around, visiting local farms, and drinking an unreasonable amount of coffee. It was very low-key, which was exactly what I needed at the time." },
      { role: 'examiner', text: 'Do you prefer travelling alone or with other people?' },
      { role: 'candidate', text: "It depends on what I want out of the trip. When I travel alone, I have complete freedom — I can change plans on a whim, stay somewhere longer, or leave early if I'm not enjoying it. That flexibility is quite addictive. But travelling with friends means you have someone to share the experience with, and honestly, some memories are better when someone else remembers them too. I'd say I lean slightly toward solo travel, but I wouldn't want to do only that." },
      { role: 'examiner', text: 'What kind of places do you like to visit?' },
      { role: 'candidate', text: "I'm drawn to places with mountains or coastline rather than big cities. I already live in a city, so a holiday in another crowded urban centre doesn't really feel like a break. I also love places that still have a strong local character — small towns where the food and the daily rhythm haven't been reshaped for tourists. Those places are getting harder to find, unfortunately." },
      { role: 'examiner', text: 'Would you like to travel abroad more in the future?' },
      { role: 'candidate', text: "Definitely. So far I've mostly travelled within Southeast Asia, and there's a lot I still want to see. Japan is at the top of my list, partly for the food and partly because I'm curious about how they combine tradition with such advanced technology. I'd also love to spend a longer period somewhere English-speaking — not as a tourist, but actually living there for a few months, because I think that's when you really learn a place." },
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
      { role: 'candidate', text: "It's changing, and not entirely for the better. Traditional Vietnamese food is genuinely healthy — lots of fresh herbs, vegetables, soups, not much dairy or heavy fat. And older generations were very active because daily life involved a lot of walking and physical work. But among younger people in cities, fast food and long hours in front of screens are becoming normal, and you can see the effect. On the positive side, there's also a growing fitness culture — many more gyms and running clubs than five years ago." },
      { role: 'examiner', text: 'What could be done to encourage people to exercise more?' },
      { role: 'candidate', text: "I think the environment matters more than telling people to exercise. If a city has safe pavements, parks, and cycle lanes, people will naturally move more without thinking of it as exercise. Da Nang has actually done this quite well with the riverside walkways — you see hundreds of people out every evening. Workplaces could help too, by not making long hours a badge of honour, because when people finish at nine at night, exercise is the first thing to disappear." },
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
      { role: 'candidate', text: "Vietnam is long and narrow, so the weather varies a lot from north to south. In Da Nang, where I live, we have roughly two seasons: a dry season from around February to August, which can get extremely hot — well over thirty-five degrees — and a rainy season from September to December, when we get heavy downpours and sometimes typhoons. There's no real winter here, which northern Vietnamese people find strange when they visit." },
      { role: 'examiner', text: 'Which season do you prefer?' },
      { role: 'candidate', text: "I'd say the early dry season, around March and April. The heat hasn't become oppressive yet, the sea is calm, and it's perfect weather for being outside in the evening. The peak of summer is honestly too much — by June you're planning your whole day around avoiding the sun. And the rainy season, while dramatic and beautiful in its own way, makes it hard to get anywhere on a motorbike." },
      { role: 'examiner', text: 'Does the weather affect your mood?' },
      { role: 'candidate', text: "More than I'd like to admit. On grey, rainy days I find it much harder to concentrate, and I tend to stay indoors, which makes it worse. Bright weather has the opposite effect — I get up earlier, I'm more inclined to exercise, and I generally feel more motivated. I've read that this is partly to do with sunlight and sleep cycles, so it's not purely psychological." },
      { role: 'examiner', text: 'Do you check the weather forecast?' },
      { role: 'candidate', text: "Almost every morning, especially during the rainy season. Because most people here travel by motorbike, rain isn't a minor inconvenience — it changes what you wear, when you leave, and sometimes whether you go at all. During typhoon season, everyone follows the forecast very closely, since serious storms can mean flooded streets and days without electricity." },
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
      { role: 'candidate', text: "We met at university, in the first week actually. We were assigned to the same group project, which is usually a recipe for disaster, but in our case it worked out well. We had a similar sense of humour and both took the work seriously, which built a lot of trust early on. That was almost ten years ago, and even though he now lives in Ho Chi Minh City, we still speak most weeks." },
      { role: 'examiner', text: 'What do you usually do with your friends?' },
      { role: 'candidate', text: "Mostly very ordinary things — eating out, sitting in coffee shops for hours, sometimes playing badminton or going for a ride out of the city on weekends. Vietnamese social life revolves heavily around food, so a lot of our meetups are just long meals where the eating stops and the conversation continues. Occasionally we'll do something more organised like a short trip, but honestly the simple things happen more often." },
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
      { role: 'candidate', text: "Yes, though as an observer rather than a practitioner. I'm not a painter or a musician, but I pay a lot of attention to design and visual composition, partly because of my work — building user interfaces is a kind of applied art. I also enjoy photography, mostly street photography around Da Nang. I wouldn't call it serious, but it has changed how I look at ordinary scenes." },
      { role: 'examiner', text: 'Did you learn to draw or paint at school?' },
      { role: 'candidate', text: "We had art classes, but they were quite basic and honestly treated as a minor subject. Most of the emphasis was on maths, science, and languages. I remember enjoying the classes, but I don't think anyone ever suggested that art could be a serious path. Looking back, that's a bit of a shame — I think creative subjects teach a different kind of thinking that's genuinely useful later on." },
      { role: 'examiner', text: 'Do you ever visit art galleries or museums?' },
      { role: 'candidate', text: "Occasionally, though not as often as I'd like. Da Nang has the Museum of Cham Sculpture, which is genuinely impressive — it holds artefacts from the Champa civilisation going back over a thousand years. When I travel, museums are usually on my list, because they give you context that you can't get from just walking around a city. I prefer smaller museums, honestly; the huge ones are overwhelming and you end up absorbing very little." },
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
      { role: 'candidate', text: "Listening in fast, natural conversation, especially with unfamiliar accents. Written English or a slow, clear speaker is fine, but when several native speakers are talking casually — using contractions, slang, and cultural references — I still lose the thread sometimes. Pronunciation is a challenge too, because Vietnamese doesn't have many of the final consonant sounds that English relies on, so words like 'asked' are physically awkward to say." },
      { role: 'examiner', text: 'Do you think it is important to learn a foreign language?' },
      { role: 'candidate', text: "Extremely, and not only for career reasons. Obviously English has opened doors professionally — I can read technical documentation, work with people abroad, and take part in the wider developer community. But there's a subtler benefit: learning another language forces you to see that your own way of expressing ideas isn't the only one. It makes you a bit more humble and, I think, more curious." },
      { role: 'examiner', text: 'Would you like to learn another language?' },
      { role: 'candidate', text: "I would, though I'm wary of starting one before my English is really solid. If I did, I'd probably choose Japanese, partly because of the number of Japanese companies operating in Vietnam, and partly out of genuine interest in the culture. I'm under no illusions about how hard it would be — three writing systems and a very different grammar — but that's part of the appeal." },
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
      { role: 'candidate', text: "Messaging is number one, mostly Zalo for local contacts and Telegram or Slack for work. After that, maps and ride-hailing apps — living in a city where you get around by motorbike, those are essential. I also use it a lot for payments now; almost everywhere in Da Nang accepts QR code transfers, so I rarely carry cash. And podcasts, which I listen to while riding or walking." },
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
      { role: 'candidate', text: "Dramatically. E-commerce platforms like Shopee and Lazada have exploded, and delivery is remarkably fast and cheap. Cashless payment has become the default in cities — most street food vendors now display a QR code. Traditional markets still exist and are still important, particularly for older generations, but you can see the shift happening year by year. I suspect in ten years the market culture will look quite different." },
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
      { role: 'candidate', text: "Yes, quite a lot, though books were less available than they are now. I remember reading a lot of Vietnamese folk tales and comics, and later translated adventure novels. My parents weren't big readers themselves, but they never discouraged it, and there was a small library near my school that I used constantly. I think that habit is the reason reading still feels like a pleasure rather than a task." },
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
      { role: 'candidate', text: "It varies with how much energy I have left. On a normal weekday evening, it's fairly low-effort — reading, a podcast, cooking something simple, or a walk along the river. At weekends I'm more ambitious: a longer motorbike ride, badminton with friends, or working on a side project. I've realised I need both kinds of free time, the restful and the active." },
      { role: 'examiner', text: 'Do you have enough free time?' },
      { role: 'candidate', text: "Broadly, yes, though it's uneven. When we're approaching a release at work, my free time shrinks to almost nothing for a couple of weeks. Then things settle and I have more than I know what to do with. What I lack isn't hours so much as uninterrupted stretches — an evening with nothing scheduled feels far more valuable than three separate free hours." },
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
      { role: 'candidate', text: "Coffee, almost exclusively — Vietnamese coffee, which is very strong and usually made with a small metal filter. I have one in the morning without fail, and often a second one mid-afternoon. Tea I drink mainly in social situations; when you visit someone's house here, green tea is offered almost automatically, so it's more of a ritual than a preference." },
      { role: 'examiner', text: 'Is coffee popular in your country?' },
      { role: 'candidate', text: "Enormously. Vietnam is one of the largest coffee exporters in the world, and locally it's much more than a drink — it's the default setting for socialising. Meeting a friend, discussing business, or just passing an hour all happen in a café. Prices range from about fifteen thousand dong at a pavement stall to five times that in a modern coffee shop, so there's something for everyone." },
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
      { role: 'candidate', text: "By motorbike, like almost everyone in Vietnam. It's by far the most practical option here — you can weave through traffic, park almost anywhere, and it costs very little to run. My commute is about fifteen minutes, and honestly I quite enjoy it early in the morning when the roads are still relatively empty and the air is cool." },
      { role: 'examiner', text: 'Is public transport good in your city?' },
      { role: 'candidate', text: "It's limited, to be honest. Da Nang has buses, but the network doesn't cover much and the frequency is low, so very few people use them for daily commuting. Ride-hailing services like Grab have filled the gap to some extent. Hanoi and Ho Chi Minh City are now building metro systems, and I hope something similar eventually reaches here, because the number of vehicles keeps rising." },
      { role: 'examiner', text: 'What are the main traffic problems where you live?' },
      { role: 'candidate', text: "Congestion at peak hours is the main one, especially near schools and the bridges over the river. Road safety is a more serious concern though — motorbike accidents are common, and helmet quality and driving discipline are inconsistent. During the rainy season, flooding on certain streets can bring everything to a standstill for hours." },
      { role: 'examiner', text: 'Would you like to own a car?' },
      { role: 'candidate', text: "Eventually, perhaps, but it's not a priority. Cars are heavily taxed in Vietnam, so they cost far more here than in most countries, and parking in the city is genuinely difficult. For daily life a motorbike is simply more convenient. If I had a family or needed to travel long distances regularly, my calculation would change — but for now it would be an expensive inconvenience." },
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
      { role: 'candidate', text: `The decision I'd like to describe is leaving a stable, well-paid job at a large outsourcing company to join a much smaller product company about three years ago.

To give some context, my first job after university was at a company with several thousand employees. The work was steady, the salary was good and rising predictably, and there was very little risk involved. From the outside — and certainly from my parents' point of view — it looked like exactly the kind of position you're supposed to want.

The problem was that I felt increasingly disconnected from what I was building. In outsourcing, you often work on a small part of someone else's product, to someone else's specification, and you rarely see how it's used or whether it succeeds. After three years, I'd become technically competent but professionally quite unmotivated. When a smaller company offered me a role where I'd own an entire feature area and speak directly to users, I was immediately drawn to it — but the salary was slightly lower, the company was only two years old, and there was a real chance it wouldn't survive.

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

Why do I find them so useful? Because concentration turns out to be the real bottleneck in my work. Writing software isn't physically demanding; the difficulty is holding a complex system in your head long enough to reason about it, and every interruption resets that process. Anything that protects those stretches of attention has an outsized return.

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

The background is that we'd committed to releasing a new version of our platform in time for a large industry conference. The date was fixed and public, which meant there was no possibility of quietly delaying. About two months before the deadline, two things went wrong at once: a key developer on the team left for another company, and testing revealed a serious performance problem that we'd underestimated. Suddenly we had less capacity and more work.

My days during that period looked roughly the same. I'd start around seven in the morning, before anyone else, because those two hours were the only genuinely quiet time. Mornings were for the hardest technical work — rewriting the part of the system causing the performance issues. Afternoons were meetings, code reviews, and supporting the two junior developers who'd taken on parts of the departed colleague's work. Most evenings I worked until eight or nine, and I worked several weekends, which I'm not proud of.

What made it manageable rather than miserable was, I think, three things. First, it had a clear end date — I knew exactly how long I had to sustain it, and temporary pressure is very different from indefinite pressure. Second, the team was genuinely united; nobody was blaming anyone, and there was a lot of dark humour, which helped enormously. And third, the work itself was interesting. Fixing that performance problem was one of the more satisfying technical challenges I've had.

Emotionally it was still difficult. I slept badly, stopped exercising almost entirely, and became noticeably less patient with people. About four weeks in, I remember snapping at a colleague over something trivial and realising afterwards that I was more depleted than I'd admitted to myself.

We did launch on time, and the release went well — far better than I expected, honestly. But the experience taught me something uncomfortable: that period only worked because it was exceptional. I've since become quite firm about not letting that pace become normal, both for myself and for the people I work with. I now try to plan with the assumption that something will go wrong, because in my experience something always does.

Looking back, I'm proud of what we did, but I'd be uneasy if I ever described those six weeks as a model of how to work.` },
      { role: 'examiner', text: 'Do you think people work too much these days?' },
      { role: 'candidate', text: "In many industries, yes, and I think the boundary problem is the real cause rather than the hours themselves. Historically, when you left the factory or the office, work ended. Now it follows you home through your phone, so even a normal working day never fully closes. In Vietnam's tech sector there's also a lingering culture where visible overwork is read as commitment, which quietly punishes people who work efficiently and then go home. I'd argue that's not just unhealthy but genuinely inefficient — tired people make expensive mistakes." },
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
      { role: 'candidate', text: `The outdoor activity I'd like to talk about is sea swimming, which has become a regular part of my life since moving to Da Nang.

I usually go early — around half past five in the morning, before work. My Khe Beach is about ten minutes from my apartment by motorbike, and at that hour it's genuinely beautiful. The sun is just coming up over the water, the air is still cool, and the beach is full of local people, mostly older, who have been swimming there every morning for decades. There's a whole community that exists at that time of day, and almost none of them are tourists.

I usually go alone, though 'alone' isn't quite accurate, because the same faces are always there. There's an elderly man who swims a remarkably long distance every single morning and always nods at me, and a group of women who do stretching exercises together on the sand afterwards. We've never had a real conversation, but there's a kind of quiet familiarity, which I've come to value.

A typical session is fairly simple. I swim out parallel to the shore for twenty minutes or so, then float for a while, then come back and sit on the sand for ten minutes before going home. Occasionally, when the sea is rough during the transition into the rainy season, I don't swim at all and just walk along the water's edge instead.

There are several reasons I enjoy it so much. The most immediate is physical — cold seawater in the early morning is an extraordinarily effective way to wake up, far better than coffee. It also uses your whole body without any impact on the joints, which suits me, since I sit at a desk all day.

But the deeper reason is psychological. Swimming is one of the very few activities where I genuinely cannot check my phone, cannot be contacted, and cannot multitask. For those twenty minutes I have nothing to think about except breathing and moving. In a working life dominated by screens and constant small interruptions, that kind of enforced simplicity is rare and enormously restorative.

There's also something about the sea specifically — its scale, I think. Being in a large body of water reliably makes my own worries feel proportionate, which is a strange thing to say about a physical activity, but it's the honest reason I keep going back.

I'd say it's the single healthiest habit I've built as an adult, and if I ever move somewhere landlocked, it's the thing I'd miss most.` },
      { role: 'examiner', text: 'Do you think people spend enough time outdoors nowadays?' },
      { role: 'candidate', text: "Generally not, particularly people in cities and particularly those of us who work at a computer. It's easy to go from a flat to a vehicle to an office and back and be outdoors for perhaps fifteen minutes in a whole day. I think part of the problem is design rather than willpower — many cities simply aren't pleasant to be outside in, because of traffic, heat, or a lack of shade and green space. Where cities do invest in walkable areas and parks, as Da Nang has along the river, you see people out in large numbers, which suggests the desire is there when the environment allows it." },
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
      { role: 'candidate', text: `The meal I'd like to describe took place in my grandmother's house in a small village outside Quang Nam, about two years ago, and it was the last time our whole extended family ate together in that house before it was sold.

It was during Tet, the Lunar New Year. My grandmother was in her late eighties and had decided, sensibly, that living alone in a large old house was no longer practical. So this particular reunion dinner had a weight to it that ordinary family meals don't. Around twenty of us were there — aunts, uncles, cousins, some of whom had travelled from Ho Chi Minh City and one from abroad.

The food itself was entirely traditional, and much of it had been prepared over two days. There was banh tet, the cylindrical sticky rice cake with mung bean and pork wrapped in banana leaves, which my grandmother insisted on supervising personally even though she could no longer do the wrapping herself. There was thit kho tau — pork belly braised slowly with eggs in coconut water — pickled vegetables, a clear soup with bitter melon, and an enormous amount of fresh herbs, as always. Nothing was elaborate or expensive. It was food that a hundred million Vietnamese people would recognise instantly.

We ate on mats on the floor, in the front room, because there was no table large enough. It was noisy in the way that only large families are — three conversations at once, children running in and out, someone always getting up to fetch something. My grandmother said very little, but she watched everything, and I remember noticing how carefully she was looking at each person.

Why is it memorable? Partly because of what it represented. That house had been the fixed point of my childhood — every summer, every Tet, the same rooms, the same smells. Selling it wasn't a tragedy, it was simply the sensible thing to do, but the meal marked the end of something that had been true my entire life.

There was also a moment I still think about. Near the end of the meal, my grandmother told a story about her own mother cooking the same dish during the war, in far harder circumstances. Nobody had heard the story before. Everyone went quiet, which almost never happens in my family.

I don't think the food was objectively the best I've ever eaten. But it's the meal I return to most often in my memory, and I've come to believe that what makes a meal memorable is almost never the cooking itself — it's who is sitting there, and whether you understand at the time that it won't happen again.` },
      { role: 'examiner', text: 'Do families in your country still eat together regularly?' },
      { role: 'candidate', text: "Less than they used to, though the tradition is still much stronger than in many Western countries. In rural areas, sharing meals remains completely normal. In cities it's under real pressure — long working hours, traffic, children in evening classes, and food delivery apps that make eating separately effortless. I've noticed in my own family that the everyday shared meal has largely disappeared, while the ceremonial ones around Tet and death anniversaries remain sacred. So what's being lost isn't the idea of eating together, but the ordinary, unremarkable version of it, which is arguably the version that actually holds a family together." },
    ],
    tips: [
      'Choose a meal with emotional significance — the food alone rarely fills two minutes well',
      'Specific dish names and preparation details demonstrate precise vocabulary',
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

In practice, I use it for about fifteen minutes each morning with my coffee. Whenever I encounter a useful English word or phrase — in a book, an article, a meeting — I add it, always with an example sentence rather than just a translation, because context matters enormously. I've also started using it for technical material: system design concepts, command line options, things I use rarely but need to recall precisely.

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

Every year, once school finished in late May, my parents would put me on a bus for the two-hour journey to my grandparents' village in Quang Nam province. I stayed there for most of the summer. It was a completely different world from the town where I grew up — no traffic, no schedule, and a great deal of freedom that I don't think children today are often given.

The specific afternoon I remember involved a group of us, maybe six or seven children, walking to a small river about twenty minutes from the house. It was the hottest part of the day, and we'd taken an inner tube from an old truck tyre that one boy's father had discarded. We spent the entire afternoon floating on it, taking turns, pushing each other off, arguing about whose turn it was, and eating green mangoes with salt and chilli that someone had brought in a plastic bag.

Nothing significant happened. No one was in danger, nothing was achieved, and if I described the events to someone else they'd sound completely unremarkable. But I remember the physical details with unusual clarity — the temperature of the water, which was much colder than you'd expect; the sound of cicadas, which in central Vietnam in summer is genuinely deafening; the smell of the mud on the riverbank; and walking home at dusk absolutely exhausted, with my hair still wet.

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
      { role: 'candidate', text: `The piece of music I'd like to talk about is 'Dieu Buon Chua Ke' — roughly, 'The Sad Thing Not Yet Told' — by Dat G and Du Uyen, though what actually matters to me is less the song itself than the period of my life it's attached to.

I first heard it during my final year of university, in a coffee shop near campus where I used to study late. It was playing quietly in the background while I was working on my graduation project, which was a stressful and quite lonely few months. I didn't pay much attention at first, but the melody stayed in my head, and I looked it up on the way home. After that I played it constantly — genuinely hundreds of times over those months.

Musically it's not complicated. It's a Vietnamese pop ballad with a simple guitar line and a slow, almost conversational vocal. The lyrics are about things left unsaid between two people, which is a fairly universal theme. What gives it its quality is the restraint — the singers never push, never dramatise, and there's a lot of space in the arrangement.

I don't listen to it very often now, maybe a few times a year, and that's deliberate. Certain songs act like a direct line to a specific time in your life, and I find that if I play them too frequently, that connection wears out and the song becomes ordinary. So I keep a small number of songs in reserve, and this is one of them.

Why does it matter to me? Partly because of the association. When I hear the opening bars, I'm immediately back in that coffee shop, twenty-two years old, anxious about graduating, with no idea how anything would turn out. That version of me was quite frightened, and hearing the song now produces a strange mixture of affection and relief — affection for how hard he was trying, and relief that most of what he was worried about never happened.

There's also something more general in it. I think music does something that language on its own can't quite manage: it stores emotion. I can describe that period of my life in words, and I have, but the description is factual. Playing thirty seconds of that song brings back the actual feeling, complete and immediate, which is a remarkable thing for a piece of art to be able to do.

So it isn't my favourite song objectively, and I wouldn't claim it's a great work of art. But it's the one I'd keep if I had to choose, because it holds a version of me that I'd otherwise have no way of reaching.` },
      { role: 'examiner', text: 'Why do you think music is important in most cultures?' },
      { role: 'candidate', text: "I think it serves several functions at once, which is probably why it appears in every known society. At the most basic level it's a way of coordinating and bonding — people singing or moving together feel like a group, which is why music is central to religion, ceremony, and even military tradition. It's also a form of memory: before widespread literacy, songs were how history, values, and stories were passed down, and Vietnamese folk songs still carry that function. And on a personal level, it gives shape to emotions that people often can't articulate. Grief, celebration, love — most cultures have music for these because words alone seem insufficient." },
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
      { role: 'candidate', text: `The environmental problem I'd like to talk about is plastic waste along the coastline and rivers around Da Nang, which is probably the most visible environmental issue where I live.

To describe the problem concretely: after heavy rain, and particularly at the end of the rainy season, large quantities of plastic wash down the Han River and out to sea, and much of it comes back onto the beaches. On a bad morning you'll see the tideline marked by a continuous band of plastic bags, bottles, food containers, polystyrene, and fragments of fishing gear. The city sends cleaning crews, and volunteer groups organise beach clean-ups, but within a week or two it accumulates again.

The causes are fairly clear and not unique to Vietnam. Single-use plastic is extremely cheap and deeply embedded in daily life here — street food is served in plastic bags, iced coffee comes in a plastic cup with a straw, and even a single item from a shop is usually bagged automatically. Meanwhile, waste collection infrastructure hasn't kept pace with how fast the city has grown, particularly in outlying areas, so a proportion of rubbish never reaches a proper facility. And a lot of the material arriving on the beaches comes from upriver or from other countries entirely, carried by ocean currents, which makes it a regional problem rather than a purely local one.

The effects are significant. Tourism is a major part of Da Nang's economy, and dirty beaches directly threaten it. Fishing communities are affected — I've talked to fishermen who routinely pull plastic up in their nets. There's a health dimension too, since microplastics are entering the seafood chain, and seafood is central to the diet here. And there's something harder to measure: living among visible pollution slowly changes what people accept as normal.

As for solutions, I think it requires action at three levels. Individually, refusing bags and using a reusable cup genuinely helps, and I've done this for two years — though I'd be dishonest if I claimed individual choices are sufficient. At the city level, waste collection needs serious investment, especially separation and recycling, which is currently done informally by waste pickers rather than systematically. And at the national level, I'd support taxing single-use plastic and requiring producers to be responsible for packaging, because the fundamental issue is that plastic is artificially cheap — the cost of cleaning it up isn't paid by the people who produce it.

I'm moderately hopeful, honestly. Awareness here has risen noticeably in the last five years, several coastal businesses have gone plastic-free, and Vietnam has committed to reducing marine plastic waste substantially. The trend is in the right direction. It just isn't moving quickly enough yet.` },
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

Before the pandemic, I was firmly against working from home. My reasoning seemed sound at the time. I believed that software development is fundamentally collaborative, that the informal conversations in an office — the questions you overhear, the whiteboard sketch, the quick clarification at someone's desk — were where the most valuable knowledge transfer happened. I also thought, less charitably, that most people would simply do less work without supervision. I remember arguing this quite confidently with a colleague who wanted to work remotely two days a week, and effectively talking my manager out of allowing it.

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

The habit itself is straightforward. Around eight in the evening, I walk for about forty minutes, usually along the Han River. I don't listen to podcasts or music, which was the hardest part to accept — for the first two weeks I found the silence genuinely uncomfortable, and I remember reaching into an empty pocket several times out of pure reflex.

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
      { role: 'candidate', text: "I think the honest answer is that it will affect employment substantially, but not in the way most predictions suggest. Historically, technology has eliminated tasks rather than whole occupations, and jobs have been reorganised around what remains. The introduction of spreadsheets didn't remove accountants; it removed the arithmetic and made the advisory part of the job larger.\n\nWhat's different this time, potentially, is the type of work being automated. Previous waves affected physical and routine work. This one reaches into cognitive and even creative tasks — drafting, summarising, generating code, producing images. That reaches a class of white-collar workers who have historically been insulated from this kind of disruption, and I include myself in that.\n\nMy own experience is instructive. I now use AI tools daily, and they've absorbed a meaningful portion of what I used to do — writing routine code, explaining unfamiliar systems, drafting documentation. But my job hasn't shrunk. It's shifted toward deciding what should be built, judging whether output is actually correct, and taking responsibility for the result. Those parts have become more valuable, not less.\n\nWhere I'm genuinely concerned is distribution rather than volume. Even if the number of jobs remains stable, the transition will be brutally uneven — the person whose role disappears is rarely the person who fills the new one, and retraining a forty-five-year-old is a societal problem, not an individual one. I'd argue that's where policy attention belongs, rather than on speculating about total job numbers." },
      { role: 'examiner', text: 'What skills will be most important for young people entering the job market?' },
      { role: 'candidate', text: "I'd separate this into two categories, because they age very differently.\n\nThe first is the ability to learn quickly and independently. Any specific technical skill has a limited shelf life — most of what I learned at university is now either obsolete or automated. What's kept me employable isn't any particular language or framework, it's having learned how to get up to speed on something unfamiliar in a few weeks. That capacity compounds over a career.\n\nThe second category is the set of things that are hardest to automate, which are mostly human rather than technical: communication, judgement under uncertainty, understanding what a client actually needs as opposed to what they asked for, and the ability to work with people who disagree with you. There's some irony here, because these are exactly the skills that education systems in Vietnam and elsewhere treat as peripheral.\n\nI'd add one more that's often overlooked — the ability to evaluate information critically. In an environment where generating plausible-sounding content is essentially free, the scarce skill becomes judging whether something is actually true. That applies to AI output, to news, to advice online. Fifty years ago the constraint was access to information; now the constraint is discernment." },
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
      { role: 'candidate', text: "I think the striking thing is how much of it has arrived invisibly. Most people using AI daily wouldn't describe it that way — it's in the route your maps app chooses, the spam filtered from your inbox, the recommendations on a streaming service, the photograph your phone quietly improves before you even see it. It became infrastructure before it became a topic of conversation.\n\nThe more visible wave is recent and more disruptive. Conversational systems that can write, translate, summarise, and explain have moved AI from something operating in the background to something people actively use. For me the translation quality is the most striking. A Vietnamese person with no English can now read a technical article or negotiate with a foreign supplier reasonably well, which genuinely lowers a barrier that used to require years of study.\n\nWhat I'd caution against is treating the change as complete. We're in the early period, where the capability is impressive and our social norms around it are almost nonexistent. Nobody has settled questions like whether a student using AI to draft an essay is cheating or working efficiently, or who is responsible when an automated system makes a harmful decision. Historically, norms take a generation to catch up with technology, and I don't think this will be an exception." },
      { role: 'examiner', text: 'Do you think people are too concerned, or not concerned enough, about digital privacy?' },
      { role: 'candidate', text: "I'd say most people are concerned in the abstract and unconcerned in practice, which is the worst combination. Surveys consistently show that people say they value privacy highly, yet almost nobody reads terms of service or changes default settings. The gap exists because the cost of surrendering privacy is invisible and deferred, while the benefit — a free service, a convenient login — is immediate and concrete.\n\nI'd also argue the framing is wrong. Privacy is usually discussed as a personal preference, as though it were about having something to hide. But it's better understood as a structural issue: what matters isn't that a company knows my location, it's that a company or a state knows the location of everyone simultaneously, permanently, and can search it. That's a different category of power, and it doesn't require anyone to have bad intentions today. It only requires the data to exist for someone with bad intentions later.\n\nThat said, I don't think individual vigilance is a realistic solution. Expecting ordinary people to manage this through careful choices is like expecting them to individually verify food safety. It's a regulatory problem. The European approach with GDPR is imperfect and creates a great deal of pointless clicking, but the underlying principle — that collecting data requires justification rather than being the default — is the right one." },
      { role: 'examiner', text: 'Should governments regulate technology companies more strictly?' },
      { role: 'candidate', text: "Yes, though I'd want to be careful about what we're regulating, because badly designed rules tend to entrench the largest companies rather than restrain them.\n\nThe strongest argument for regulation is that the current model externalises costs. A social platform captures the revenue from engagement while the costs — polarisation, effects on adolescent mental health, the collapse of local journalism — are paid by society. That's a familiar pattern; it's exactly the situation with industrial pollution before environmental law. We didn't rely on factories voluntarily restraining themselves, and I don't see why we'd expect it here.\n\nWhere I'd be cautious is the form. Compliance-heavy regulation is a fixed cost, and a company worth hundreds of billions absorbs it easily while a startup can't, so heavy-handed rules can accidentally cement the dominance of the very companies they target. I'd favour structural remedies — interoperability requirements, limits on self-preferencing, restrictions on acquiring emerging competitors — over rules that simply add paperwork.\n\nThere's also a jurisdictional difficulty that rarely gets acknowledged. These companies are global and regulation is national, so a single country acting alone often achieves very little, especially a mid-sized economy like Vietnam. Realistically, meaningful regulation requires either very large markets acting, as with the EU, or genuine international coordination, which is historically slow." },
      { role: 'examiner', text: 'Do you think technology brings people closer together or drives them apart?' },
      { role: 'candidate', text: "Both, and I think the answer depends almost entirely on distance. Technology has been extraordinarily good at maintaining relationships across geography — my closest friend moved to Ho Chi Minh City and we speak more often now than when we lived in the same city, which would have been impossible for my parents' generation. For diaspora communities, migrant workers, and long-distance families, the change is unambiguously positive.\n\nWhere it's more damaging is close range. It's now completely normal for a group of friends to sit at the same table with each partly elsewhere, and something real is lost in that. Attention is the actual currency of a relationship, and devices are engineered by extremely capable people to capture it.\n\nI'd add that the design incentives matter more than the technology itself. A video call with a relative and an algorithmic feed are both 'technology', but one is built to connect you and end, while the other is built to hold you as long as possible. It's the second category where the harm concentrates.\n\nSo my overall position is that technology has made connection easier and attention harder. Whether that leaves people closer or further apart is genuinely up to how deliberately individuals and societies use it, which is an unsatisfying answer, but I think an accurate one." },
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
      { role: 'candidate', text: "Several things happened at once, which is why the growth has been so dramatic. The most fundamental is that flying became cheap. Deregulation and budget airlines turned international travel from something a middle-class family did once in a decade into something they might do twice a year.\n\nThe second factor is the rise of a large middle class in Asia. When hundreds of millions of people in China, India, and Southeast Asia acquire disposable income, the effect on global tourist numbers is enormous. In Da Nang, the transformation over ten years has been driven substantially by Korean and Chinese visitors, not Western ones, which people outside the region often don't realise.\n\nThird, information and booking became frictionless. Arranging an independent trip to a foreign country once required a travel agent and considerable confidence. Now you can book flights, accommodation, and transport in twenty minutes from your phone, read reviews from strangers, and translate signs with a camera. The perceived risk of independent travel has collapsed.\n\nAnd finally there's a cultural shift, particularly among younger people, toward valuing experiences over possessions — reinforced, I'd say slightly cynically, by social media making travel highly visible as a marker of status." },
      { role: 'examiner', text: 'What are the negative effects of tourism on local communities?' },
      { role: 'candidate', text: "I can speak to this fairly directly, because Da Nang has changed enormously in the time I've lived here.\n\nThe most concrete effect is on housing and cost of living. When property becomes more profitable as short-term accommodation than as housing, prices rise beyond what local wages support. Young people in tourist cities across Vietnam increasingly cannot afford to live in the neighbourhoods they grew up in. The same pattern has played out in Barcelona, Venice, Kyoto — it's remarkably consistent.\n\nThere's also environmental pressure. Tourist numbers strain water supply, waste systems, and fragile natural sites. Some beaches and islands here receive far more visitors than they can absorb, and the damage to coral in particular is visible.\n\nThe cultural effect is subtler and, I think, more troubling. When a tradition becomes an attraction, its function changes. A ceremony performed for a community means something different from the same ceremony performed on a schedule for paying visitors. It can preserve the outward form while quietly emptying it — what anthropologists sometimes call staged authenticity.\n\nAnd economically, the benefits are often less local than they appear. When international chains and foreign tour operators take a large share, the community may absorb the crowds, the traffic, and the price rises while capturing a modest portion of the revenue." },
      { role: 'examiner', text: 'Do you think tourism does more good than harm overall?' },
      { role: 'candidate', text: "On balance I'd say yes, but with real qualifications, and I'm aware I'm answering from a country where tourism has been substantially beneficial.\n\nThe economic case is strong. Tourism in Vietnam employs millions, and importantly it creates work in rural and coastal areas where alternatives are scarce. In parts of central Vietnam, tourism has given families incomes that farming and fishing could no longer provide. It's also relatively accessible employment — it doesn't require a university degree, so it absorbs labour that other growth sectors don't.\n\nThere's a cultural benefit as well, though it's easy to overstate. Contact between people does erode stereotypes to some degree. And tourism revenue frequently funds conservation, both of heritage sites and natural areas, which would otherwise struggle for public funding.\n\nThe qualifications matter though. The benefit depends heavily on scale and structure. Tourism at a level a place can absorb, with local ownership, is largely positive. Tourism beyond that threshold, controlled by outside capital, can hollow a place out — and the transition between those two states is gradual enough that it's usually recognised too late.\n\nSo my honest position is that tourism is neither good nor bad in itself; it's a question of volume and who controls it. What worries me about my own city is that we're arguably approaching that threshold without much of a public conversation about it." },
      { role: 'examiner', text: 'How do you think tourism will change in the next twenty years?' },
      { role: 'candidate', text: "I'd expect several shifts, some driven by policy and some by necessity.\n\nThe most likely is a move from encouraging volume to managing it. Cities like Venice and Amsterdam have already begun limiting numbers, charging entry fees, and restricting short-term rentals. Twenty years ago, tourist arrivals were reported purely as a success metric; increasingly they're treated as something requiring management. I expect that shift to spread, including here.\n\nClimate is the second force, and it works in two directions. Aviation will likely become more expensive as carbon costs are internalised, which may reduce casual long-haul travel. At the same time, changing climates will redirect flows — extreme summer heat is already pushing Mediterranean tourism toward spring and autumn, and I'd expect equatorial destinations to face similar pressure.\n\nI'd also expect the composition of tourists to keep shifting toward Asian travellers, and destinations that currently orient themselves toward Western expectations to reorganise accordingly.\n\nWhat I'm less confident about is whether technology substitutes for travel. There's a long-standing prediction that immersive technology will reduce the desire to visit places physically, and I'm sceptical. Travel isn't primarily about seeing something — it's about being somewhere, with the discomfort, the food, the weather, the strangers. I don't think that's easily simulated, and I suspect the demand will outlast every technology proposed to replace it." },
    ],
    tips: [
      'Local specificity ("Da Nang has changed enormously") is far stronger than generic examples',
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
      { role: 'candidate', text: "Enormously, and the pace has accelerated in the last ten years. The most fundamental change is simply abundance. My parents grew up in a period when food was scarce and rice was the centre of every meal by necessity. My generation grew up with far more meat, more variety, and effectively unlimited availability, which is a change of circumstance so large that behaviour couldn't help but follow.\n\nThe second change is convenience. Vietnamese cooking traditionally involves fresh ingredients bought daily and a fair amount of preparation. Now, in cities, delivery apps make it trivially easy to eat without cooking anything, and packaged and processed food occupies far more shelf space than it did.\n\nThird, foreign cuisines have become normal rather than exotic. Korean, Japanese, Thai, and Western food are everywhere in Da Nang, and among young people, eating pizza or Korean fried chicken isn't a special occasion.\n\nThe consequence, which is already measurable, is a rapid rise in obesity and diabetes, particularly in urban areas. It's a strange situation historically — Vietnam still has undernutrition in some rural regions while dealing with the diseases of excess in its cities, sometimes within the same province." },
      { role: 'examiner', text: 'Why do you think fast food has become so popular around the world?' },
      { role: 'candidate', text: "I think it's a mistake to explain it purely through taste, because the more powerful reasons are structural.\n\nThe first is that it fits how people now live. Fast food is fast, and when both parents work long hours and commute, the constraint on dinner is time rather than money. Anything that removes cooking and cleaning has an enormous advantage regardless of what it tastes like.\n\nSecond, it's engineered to be appealing at a level that home cooking simply doesn't compete with. The combinations of fat, sugar, and salt are the product of decades of research into what people find hard to stop eating. That's not a moral judgement, it's just accurate — enormous resources have gone into optimising it.\n\nThird, and this is often missed outside developing countries, fast food has carried a status signal. When McDonald's or KFC arrived in Vietnam, they weren't the cheap option — they were more expensive than excellent local food and were associated with modernity and the West. Eating there was aspirational, particularly for young people, in a way that's difficult to explain to someone from a country where it's always been the budget choice.\n\nAnd finally, price. Where agricultural subsidies make processed ingredients artificially cheap, unhealthy calories can genuinely cost less than healthy ones, which turns diet into a question of economics rather than willpower." },
      { role: 'examiner', text: 'Is it important for countries to preserve their traditional food culture?' },
      { role: 'candidate', text: "I'd say yes, though I want to avoid the sentimental version of that argument, because 'traditional' can quietly mean 'we prefer things as they were', which isn't in itself a reason.\n\nThe strongest case is practical and nutritional. Traditional Vietnamese cooking is genuinely well-suited to the climate and to health — lots of fresh herbs, vegetables, seafood, minimal dairy, moderate portions. It evolved over centuries in this environment. Replacing it with a diet developed elsewhere, higher in processed fat and sugar, has visible health consequences, so preservation here isn't nostalgia, it's public health.\n\nThe second argument is about knowledge. Food culture is a body of practical skill — how to balance flavours, use inexpensive cuts, ferment, preserve, cook seasonally. That knowledge transmits through households, and when a generation stops cooking, it's genuinely lost, not merely paused. Recipes survive; the judgement doesn't.\n\nThe third is identity, which is real even if it's harder to quantify. Food is one of the most durable markers of where someone comes from, and it survives migration better than language does.\n\nWhere I'd push back on the purist position is the idea that cuisines should be frozen. Vietnamese food is itself the product of Chinese, French, Cham, and Khmer influence — banh mi exists because of French colonialism. A living food culture absorbs and adapts. What concerns me isn't foreign influence, it's replacement: a fusion of Vietnamese and Korean cooking is culture continuing; a generation that only knows how to order delivery is culture stopping." },
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
      { role: 'candidate', text: "The clearest change is structural: the shift from multigenerational households to nuclear families, driven mainly by urbanisation. In the village where my grandparents lived, three generations under one roof was normal. In cities, apartments are small, people move for work, and the extended household is becoming the exception.\n\nFamily size has fallen sharply too. My father was one of seven children; most couples I know now have one or two, and increasingly one. The reasons are the familiar ones — the cost of urban housing and education, women's participation in the workforce, and later marriage.\n\nThe less visible change is in authority. Vietnamese family life was traditionally quite hierarchical, with significant deference to elders in decisions about careers, marriage, and money. That hasn't disappeared, but it has softened considerably. Young people now typically choose their own partners and careers, sometimes over objections that would have been decisive a generation ago.\n\nWhat's interesting is what hasn't changed. Financial obligation to parents remains strong — most people I know send money home regularly, and there's little sense that this is unusual. So the emotional and financial bonds persist even as the physical household disperses." },
      { role: 'examiner', text: 'Who should be responsible for taking care of elderly people?' },
      { role: 'candidate', text: "In Vietnam the assumed answer is the family, specifically adult children, and that expectation carries real moral weight — putting a parent in a care home is still widely seen as a failure of duty. I understand that view and there's something genuinely valuable in it.\n\nBut I think it's becoming unsustainable on arithmetic alone. When a couple has four children, care can be shared. When they have one, that one person may be responsible for two parents and possibly grandparents while working full time in a different city. The family model assumed a demographic structure that no longer exists.\n\nSo my view is that it has to become a shared responsibility, with the state providing the infrastructure — pensions, accessible healthcare, home-visit services, and dignified professional care for those who need it — while families provide the relationship. Those aren't in conflict. In fact, I'd argue that the countries with the strongest formal systems often have better family relationships, because the interaction isn't dominated by exhausting physical care.\n\nThere's an important gender dimension too. In practice, 'the family will care for them' almost always means a daughter or a daughter-in-law, usually unpaid and often at the cost of her own career. Any honest discussion has to acknowledge that the traditional model has been subsidised by women's unpaid labour." },
      { role: 'examiner', text: 'Do you think the generation gap is bigger now than in the past?' },
      { role: 'candidate', text: "I think it's larger in Vietnam specifically, though not necessarily everywhere, and the reason is the sheer speed of change here.\n\nMy grandparents lived through war, subsidy-era scarcity, and reunification. My parents came of age during the economic reforms of the late eighties. I grew up with the internet and now work in a global industry. Those are not merely different tastes in music — they're fundamentally different material realities, formed within a single family. A grandparent who experienced genuine hunger and a grandchild who has never known scarcity will disagree about money, and the disagreement isn't really about money.\n\nTechnology widens it further, because for the first time the younger generation is more competent than the older in a domain that matters practically. That inverts the traditional flow of authority in a culture built on age-based respect, and it creates friction that didn't exist before.\n\nThat said, I'd distinguish between a gap in experience and a gap in affection. My relationship with my parents involves plenty of disagreement about how I should live, but very little distance emotionally. In some Western contexts I've observed the opposite — more shared cultural reference points but weaker obligation. So a large generation gap doesn't automatically mean a weak family." },
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
      { role: 'candidate', text: "I think the honest answer is that it depends enormously on where you're starting from, and the popular phrasing of the question obscures that.\n\nBelow a certain level, money buys happiness very directly, and I'd say anyone who denies this has probably never been genuinely short of it. If you can't afford medical treatment, or you're anxious about rent every month, additional income removes real suffering. My parents' generation in Vietnam experienced significant scarcity, and the improvement in living standards since has straightforwardly improved lives.\n\nAbove that level, the relationship weakens considerably. The research on this is fairly consistent — additional income continues to help, but with sharply diminishing returns, because much of what we buy at higher incomes is positional. A larger apartment feels good largely relative to what people around you have, so if everyone's apartment grows, the gain evaporates. It's a treadmill.\n\nWhat money reliably buys, I'd argue, isn't happiness but options — the ability to leave a bad job, absorb an emergency, take a risk, or buy time. And time is probably the most underrated purchase. People routinely spend money to acquire objects and rarely spend it to acquire hours, even though hours are the thing they later say they wished they'd had." },
      { role: 'examiner', text: 'Why do you think people buy things they do not need?' },
      { role: 'candidate', text: "There are several mechanisms operating at once, and I think it's unfair to reduce it to individual weakness.\n\nThe most obvious is that consumption is a form of communication. What people buy signals status, taste, group membership, and aspiration. A watch tells you the time and also tells everyone else something about you, and the second function is often what's actually being purchased.\n\nSecond, there's an emotional mechanism. Buying something provides a genuine, if brief, sense of progress and control. When people are stressed or dissatisfied, purchasing is a fast and socially acceptable relief, which is why retail therapy is a real and well-documented phenomenon.\n\nThird — and this is where I'd shift the blame away from individuals — enormous professional effort goes into manufacturing the desire. Advertising's central technique is to create dissatisfaction with your current situation and then present the product as the resolution. Add the frictionless design of online shopping, and you have a system deliberately engineered to convert a fleeting impulse into a completed purchase before reflection can intervene.\n\nAnd fourth, there's simple adaptation. Anything you buy becomes normal within weeks, which resets your baseline and creates the conditions for the next purchase. That's not irrationality exactly; it's a well-documented feature of how human satisfaction works, and the industry understands it far better than most consumers do." },
      { role: 'examiner', text: 'Is a large gap between rich and poor a serious problem for a society?' },
      { role: 'candidate', text: "Yes, and I'd argue the problem is structural rather than a matter of fairness alone, which is the stronger case.\n\nThe practical argument is that severe inequality erodes trust and social cohesion. When people's lives diverge sufficiently, they stop sharing schools, hospitals, neighbourhoods, and eventually assumptions. Once the wealthy exit public services, their incentive to fund them properly disappears, and quality declines for everyone else. That's a self-reinforcing cycle rather than a one-off unfairness.\n\nThere's an economic argument too. Wealth concentrated at the top is disproportionately saved rather than spent, which weakens demand, and it tends to be reinvested in assets like property, pushing prices further beyond ordinary incomes. Vietnam is experiencing exactly this — urban property prices have decoupled from local salaries to the point where a young professional in Ho Chi Minh City cannot realistically buy a home through employment income alone.\n\nAnd there's a political dimension. Concentrated wealth reliably translates into political influence, which is then used to protect that wealth. That's where inequality becomes self-perpetuating rather than a natural outcome of differing effort.\n\nWhere I'd be careful is in distinguishing inequality from mobility. A degree of inequality is inevitable and arguably useful as an incentive. What's genuinely corrosive is when your outcome is determined mainly by your parents' position — at that point the system stops rewarding effort and starts merely transmitting advantage." },
      { role: 'examiner', text: 'Do you think attitudes toward money differ between generations?' },
      { role: 'candidate', text: "Very much so, and in Vietnam the differences are particularly sharp because the economic context changed so quickly.\n\nMy grandparents' generation was formed by genuine scarcity, and their relationship with money is primarily about security. Saving is almost a moral value; visible spending on oneself carries a slight discomfort. They keep things that are broken because throwing away a repairable object was unthinkable for most of their lives.\n\nMy parents' generation lived through the transition and combined both instincts — they saved diligently but also invested, mainly in property and in their children's education, which they saw as the reliable route out of uncertainty.\n\nMy own generation, particularly urban professionals, has a noticeably different attitude. We're more comfortable spending on experiences — travel, eating out, hobbies — which my grandmother would find close to incomprehensible. There's more debt, more spending on convenience, and less assumption that a house must be bought as early as possible.\n\nI'd resist reading that as simple irresponsibility, though. Some of it is a rational response to circumstances: when property prices have risen far faster than wages, the traditional strategy of saving toward a home has become genuinely unachievable for many people, so it's not surprising that money gets redirected toward things that are actually attainable. Different behaviour doesn't always mean different values; sometimes it means different arithmetic." },
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
      { role: 'candidate', text: "The fundamental reason is a mismatch between where people want to live and how much housing is permitted there, but there are several forces layered on top of that.\n\nThe first is straightforward demand. Cities concentrate jobs, particularly well-paid ones, so people move to them, and supply hasn't expanded at the same rate. In many cities that's a policy choice rather than a physical constraint — planning restrictions limit how densely you can build, often because existing owners benefit from scarcity and are politically organised.\n\nThe second factor, and I think the more important one recently, is that housing has become an investment asset rather than simply a place to live. When property is treated as a store of wealth, demand no longer comes only from people who need somewhere to sleep. In Vietnam this is very pronounced — a great deal of urban property is bought speculatively, and you can see entire apartment buildings and even resort developments that are largely empty. Land is held vacant because holding it is profitable.\n\nThird, low interest rates over the past decade inflated asset prices generally, and property most of all, since it's the asset ordinary people can borrow most heavily against.\n\nThe result in cities like Ho Chi Minh City is that prices have separated almost completely from local wages. When the ratio of house price to average income reaches twenty or thirty times, ownership stops being achievable through work, and that has consequences well beyond housing itself." },
      { role: 'examiner', text: 'Is it better to live in a house or an apartment?' },
      { role: 'candidate', text: "I'd say it depends far more on stage of life and location than on any inherent superiority of either.\n\nApartments have genuine advantages that are often undersold. They're more efficient in energy and in land use, they're usually closer to work and services, and there's considerably less maintenance — which matters more than people expect. In a dense, well-designed city, apartment living means you can walk to most of what you need, and that has a measurable effect on daily quality of life.\n\nHouses offer space, privacy, outdoor access, and control over your own environment. For families with young children, and for anyone who wants a garden or workspace, those advantages are difficult to replicate.\n\nWhat I'd emphasise is that the comparison is usually really about the neighbourhood rather than the building. A well-built apartment in a walkable area with parks nearby is far better to live in than a detached house on the edge of a city with a ninety-minute commute. The commute alone is one of the most consistently negative factors in life satisfaction research.\n\nIn Vietnam specifically, the traditional preference for owning land and a house remains strong — an apartment is still viewed by many older people as somehow less real. But in cities that's becoming unaffordable for most young people, so apartment living is increasingly the practical outcome rather than a preference." },
      { role: 'examiner', text: 'What makes a neighbourhood a good place to live?' },
      { role: 'candidate', text: "I'd put walkability near the top, and not for aesthetic reasons. When the ordinary business of daily life — buying food, getting to a café, reaching a school — can be done on foot, a great deal follows. You encounter your neighbours incidentally, which is how weak social ties actually form; you move without treating it as exercise; and you don't lose an hour of every day to traffic.\n\nSecond, I'd say a mixture of uses and of people. Neighbourhoods that are purely residential become dead during the day, and areas segregated strictly by income tend to be both duller and less resilient. What makes my own area in Da Nang pleasant is that there's an office building, a wet market, several schools, and housing at very different price levels within a few hundred metres.\n\nThird, public space that's genuinely usable — parks, a riverside walkway, somewhere to sit that doesn't require buying anything. That last point matters more than it seems, because a city where all the comfortable places are commercial quietly excludes anyone without money.\n\nAnd fourth, some degree of stability. Neighbourhoods need a proportion of long-term residents to develop the informal trust that makes a place feel safe. Areas that turn over completely every two years never develop that, regardless of how well designed they are.\n\nWhat I'd notice is that almost none of these are about the buildings themselves, which I think is the mistake most property development makes." },
      { role: 'examiner', text: 'How should governments respond to housing shortages?' },
      { role: 'candidate', text: "I'd argue the response has to work on both supply and the treatment of housing as an asset, because addressing only one tends to fail.\n\nOn supply, the most effective lever is usually permitting more construction, particularly denser housing near transport and employment. Where cities have relaxed restrictions substantially — Tokyo is the standard example — prices have stayed far more stable than in comparable cities that didn't. It's unglamorous, but the arithmetic is difficult to escape: if a city adds people faster than homes, prices rise regardless of what else is done.\n\nOn the demand side, I'd support measures that reduce the incentive to hold housing purely as an investment — vacancy taxes, higher rates on additional properties, restrictions on speculative purchase. Vietnam has debated a property tax for years without implementing one, and in the meantime holding empty land carries almost no cost, which is precisely why so much is held empty.\n\nDirect public provision has a role too, particularly for people the market will never serve. Singapore is the striking case — around eighty percent of the population lives in public housing, and it's neither stigmatised nor poor quality. That model isn't easily transplanted, since it depended on the state controlling land early, but it demonstrates that widespread affordable housing is achievable rather than utopian.\n\nWhat I'd avoid is demand-side subsidies alone — first-time buyer grants and cheap loans without additional supply. They sound generous, but in a constrained market they're largely absorbed into higher prices, which benefits sellers rather than the people they're meant to help." },
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
      { role: 'candidate', text: "I think it's important to be clear that it isn't because of any quality of the language itself. English isn't especially easy — the spelling is notoriously irregular and the phrasal verbs are a nightmare for learners, myself included. Its position is historical and economic rather than linguistic.\n\nThe first stage was the British Empire, which spread the language across a quarter of the world's population and embedded it in the administration, law, and education of dozens of countries. The second, and probably more decisive stage, was American economic and cultural dominance in the twentieth century — business, science, film, music, and then the internet, which was built in English and by default carried it everywhere.\n\nWhat sustains it now is a network effect, which is self-reinforcing and quite hard to reverse. People learn English because other people have learned English. For a Vietnamese engineer and a Brazilian engineer, English is the practical bridge, and neither of them is learning it out of affection for Britain or America. The majority of English conversations in the world now take place between non-native speakers, which I find a genuinely interesting fact.\n\nThat's also why I'd be cautious about predicting a straightforward replacement by Mandarin, despite China's economic weight. Displacing an established network standard requires more than economic size — it would require the world to abandon an investment it has already made." },
      { role: 'examiner', text: 'What are the disadvantages of one language dominating the world?' },
      { role: 'candidate', text: "There are several, and they're easy to underestimate if you happen to speak that language natively.\n\nThe most concrete is the advantage it confers. Native speakers can participate fully in international business, academia, and diplomacy without the years of effort that everyone else has to invest. In science this is quite serious — good research from non-English-speaking countries is systematically under-cited, and researchers spend time on language that their English-speaking colleagues spend on the work itself. It's an invisible tax.\n\nThe second issue is the effect on other languages. When English becomes the language of prestige, science, and advancement, other languages can get pushed into domestic and informal use. That's already visible in Vietnam — technical and business vocabulary is increasingly borrowed directly, and there's a real risk that Vietnamese stops developing in certain domains because nobody bothers to create the terminology.\n\nThird, and more abstractly, languages encode ways of organising experience. Concepts that exist naturally in one language often require a paragraph in another. Vietnamese has a system of pronouns that encodes age, relationship, and respect in every sentence, which is essentially untranslatable — you simply lose it in English. If the world converges linguistically, some of that variety in thought goes with it.\n\nI want to be balanced, though. A shared language has enormous benefits — cooperation, science, and my own career all depend on it. The problem isn't English existing as a common tongue; it's English displacing rather than coexisting." },
      { role: 'examiner', text: 'Should governments try to protect minority or dying languages?' },
      { role: 'candidate', text: "I'd say yes, though I'd want to be honest about how difficult and expensive it is, and about who gets to decide.\n\nThe case for protection is that a language is not merely a set of labels for the same fixed objects. It carries oral literature, ecological knowledge, medicinal practice, and a distinct way of seeing relationships and time. When a language dies, that knowledge is very rarely recorded first — it usually disappears entirely. Vietnam has over fifty ethnic minority groups with their own languages, several of which are now spoken only by older people, and what's disappearing with them is not recoverable.\n\nOn method, I'd argue documentation is the minimum obligation — recording and archiving while native speakers are alive — but revitalisation requires more than that. The evidence suggests a language only survives if it's used in ordinary daily life, which means education in that language, some economic or administrative value attached to it, and media. Welsh and Basque have been partially revived precisely because they were given institutional roles rather than just sentimental respect.\n\nThe honest complication is that language shift is usually driven by people making rational decisions for their own children — parents choose the majority language because it leads to jobs and education. So protection has to avoid becoming a policy of preserving a culture at the expense of the people living in it. My view is that the goal should be bilingualism rather than isolation: nobody should have to lose their language to participate fully in the wider economy, and it's the state's job to make that possible." },
      { role: 'examiner', text: 'Will translation technology make language learning unnecessary?' },
      { role: 'candidate', text: "I don't think so, though I do expect it to change who needs to learn and why.\n\nFor a large category of practical situations, technology is already sufficient. A tourist ordering food, a traveller reading a sign, a manager skimming a foreign document — those problems are essentially solved, and that's genuinely useful. It removes a real barrier for people who have no time or opportunity to study for years.\n\nBut I'd argue it doesn't touch the more important functions of speaking a language. Translation is asymmetric with trust: a negotiation, a job interview, a difficult conversation with a colleague — these depend on nuance, timing, and the ability to respond immediately. Speaking someone's language directly signals investment and respect in a way that holding up a phone simply cannot.\n\nThere's also a cognitive dimension that gets ignored in this debate. Learning a language changes how you think about your own — you notice structures in Vietnamese that I'd never have examined without learning English. That benefit belongs to the learner, and no tool can perform it on your behalf, in the same way that a calculator doesn't remove the value of understanding mathematics.\n\nSo my expectation is a split rather than a decline. Casual, transactional language learning will probably shrink, because the practical motivation weakens. But serious learning — for people who want to work, live, or build relationships across a language boundary — will remain, and may even become more valued precisely because fewer people bother." },
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
      { role: 'candidate', text: "Two things are happening simultaneously, and it's the combination that produces the demographic shift rather than either alone.\n\nThe first is that people live considerably longer. Improvements in sanitation, nutrition, vaccination, and medical treatment have added decades to life expectancy over a century. In Vietnam, life expectancy has risen from around sixty in the 1970s to well over seventy today. That's an unambiguous success, and it's worth stating plainly before discussing it as a problem.\n\nThe second, and the more powerful driver, is falling birth rates. As countries urbanise and educate women, family size drops sharply, and the causes are quite rational: children in a city are expensive rather than economically productive, housing is constrained, and career and education delay the age at which people start families. Vietnam's fertility rate has now fallen to roughly replacement level and continues to decline in the major cities.\n\nWhat's distinctive about Vietnam's situation, and this concerns me, is the speed. European countries grew wealthy over a century and aged gradually. Vietnam is ageing considerably faster while still being a middle-income country. The common formulation is that we risk growing old before we grow rich, which leaves much less time to build the pension and healthcare systems that ageing societies require." },
      { role: 'examiner', text: 'What problems does an ageing population create?' },
      { role: 'candidate', text: "The core difficulty is arithmetic. Pension and healthcare systems in most countries are funded by current workers paying for current retirees. When the ratio of workers to retirees falls from, say, five to one down to two to one, that arrangement comes under severe strain, and the options are all politically unattractive: higher taxes, later retirement, or reduced benefits.\n\nHealthcare demand is the second problem, and it's not merely a matter of more patients. Older populations need a different kind of care — chronic condition management, long-term support, dementia care — which is labour-intensive and difficult to make more efficient. You can automate manufacturing; you cannot easily automate helping someone wash and dress with dignity.\n\nThere's a labour supply issue as well. A shrinking working-age population constrains growth, which is precisely the situation Japan has been managing for decades.\n\nAnd there's a subtler political effect that I think is underdiscussed. Older voters participate at higher rates, so policy tends to tilt toward protecting pensions and property values over investment in education, housing, and children. That's not a conspiracy, it's just how electorates work — but it can lock in generational unfairness.\n\nI'd add one qualification. Much of this framing assumes people over sixty-five are dependants, which is increasingly inaccurate. A healthy seventy-year-old today is very different from one in 1960, and a lot of the 'problem' is really a mismatch between our institutions and how long people now remain capable." },
      { role: 'examiner', text: 'Should the retirement age be increased?' },
      { role: 'candidate', text: "I think some increase is probably unavoidable, but I'd argue the standard proposal is too blunt to be fair.\n\nThe case for raising it is straightforward. Retirement ages were set when life expectancy was much lower and when work was more physically punishing. If people live twenty years longer, funding a retirement of the same relative length requires either much higher contributions or a later start. That arithmetic doesn't disappear because it's unpopular.\n\nMy objection is to applying a single number to everyone, because life expectancy and work capacity differ substantially by occupation and income. A professional who sits at a desk can generally work to sixty-eight without difficulty. A construction worker or someone who has done manual labour since eighteen often physically cannot, and statistically will die younger — so raising the threshold uniformly takes disproportionately from people who have already had the harder working life. That strikes me as regressive in a way that rarely gets acknowledged.\n\nSo I'd favour more flexible approaches: allowing earlier retirement for physically demanding occupations, phased or part-time retirement rather than a hard stop, and stronger measures against age discrimination in hiring, because raising the retirement age achieves nothing if employers won't hire people over fifty-five.\n\nAnd I'd note that in Vietnam, where a large proportion of workers are in the informal economy with no pension at all, the retirement age debate applies to a minority. The more urgent question here is building coverage in the first place." },
      { role: 'examiner', text: 'How can societies make better use of older people?' },
      { role: 'candidate', text: "I think the framing of older people as a burden is both inaccurate and self-fulfilling, and changing it is the first step.\n\nThe most obvious underused resource is experience. In my own field, there's a strong bias toward youth — technology is assumed to be a young person's industry — and I think that's costly. Some of the most valuable capabilities in a team are judgement, knowing which problems are worth solving, and having seen a similar failure before. Those are acquired only through time. The most effective mentoring I received came from someone with twenty years more experience than me.\n\nSecond, there's an enormous amount of unpaid work already being done that isn't counted. Grandparents providing childcare are a substantial part of why parents in Vietnam can work at all, and that's real economic value that appears in no statistics.\n\nThird, I'd argue for redesigning work rather than simply extending it. Rigid full-time employment until a fixed date and then nothing is a crude structure. Phased retirement, part-time consulting, and formal mentoring roles allow people to contribute at a sustainable level rather than falling off a cliff — and abrupt retirement is associated with real declines in health and cognition, so this isn't only an economic argument.\n\nAnd finally, age discrimination in hiring needs to be treated as seriously as other forms of discrimination. At present, someone made redundant at fifty-eight often finds it nearly impossible to be hired again, and that's a societal waste as much as an individual injustice." },
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
      { role: 'candidate', text: "Congestion is the most visible, but I'd argue it's a symptom rather than the underlying problem. The underlying problem is that most cities have been organised around private vehicles, which are extraordinarily inefficient users of space. A car occupies roughly the same road area as ten people on a bus and typically carries one person, and it also has to be stored somewhere for the twenty-three hours a day it isn't moving.\n\nThe second problem is safety, and I think it's badly underweighted globally. Road deaths in Vietnam remain very high — motorbike accidents are a leading cause of death for young men here — and yet it's treated as an unfortunate background fact rather than a crisis. If any other cause killed comparable numbers, the response would be entirely different.\n\nThird, air quality. Transport emissions are a major contributor to urban pollution, with measurable effects on respiratory and cardiovascular health, and the burden falls disproportionately on people living beside major roads, who are usually not the wealthiest.\n\nAnd finally there's an equity dimension. Cities built for cars quietly disadvantage everyone who doesn't have one — children, older people, the poor. When crossing a road becomes dangerous and shops are only reachable by driving, a significant part of the population loses independence." },
      { role: 'examiner', text: 'How can governments encourage people to use public transport?' },
      { role: 'candidate', text: "The honest answer is that it requires making public transport genuinely better, and simultaneously making driving less automatically convenient — and governments are usually willing to attempt only the first half.\n\nOn the positive side, the factors that determine whether people use transit are fairly well established: frequency above almost everything else, reliability, coverage, and safety. Frequency matters most because it removes the need to plan. If a service comes every five minutes, you simply turn up; if it comes every thirty, you organise your day around it, and most people will choose a car instead. Da Nang's buses fail precisely on this point — the coverage exists on paper but the frequency makes them impractical for commuting.\n\nPrice matters, though less than people assume. Free transit experiments have had mixed results, because the barrier for most middle-class commuters isn't the fare, it's the inconvenience.\n\nThe harder half is demand management: congestion charging, higher parking costs, removing parking minimums, reallocating road space to buses and bicycles. These are politically painful, and they're also the measures with the strongest evidence behind them. London and Singapore both demonstrate that congestion pricing works.\n\nI'd add that land use is inseparable from this. If a city permits low-density development on its outskirts, no transit system can serve it economically. Transport policy and planning policy have to be made together, and in most places they're handled by separate authorities that barely coordinate." },
      { role: 'examiner', text: 'Will electric vehicles solve the environmental problems of transport?' },
      { role: 'candidate', text: "They address one problem well and leave several others entirely untouched, which is why I'd resist treating them as a complete answer.\n\nWhat they genuinely solve is tailpipe emissions, and that's not trivial. Urban air quality improves immediately and substantially, and even accounting for a fossil-heavy electricity grid, the lifetime emissions of an electric vehicle are lower than a petrol equivalent — the gap widens as grids decarbonise. In Vietnam, where electric motorbikes are already becoming common in cities, the local air quality benefit is very real.\n\nWhat they don't solve is everything related to space and volume. An electric car creates the same congestion, requires the same parking, kills pedestrians at similar rates, and demands the same road-building. If a city replaces every petrol car with an electric one, it remains a city where crossing the road is unpleasant and children can't travel independently.\n\nThere are also upstream costs that get glossed over. Battery production is materially intensive — lithium, cobalt, nickel — with significant mining impacts and difficult labour conditions in some supply chains. And manufacturing a new vehicle carries a substantial carbon cost of its own, so replacing a functioning car early isn't automatically an environmental gain.\n\nMy overall position is that electrification is necessary but insufficient. The larger prize is reducing the number of vehicle journeys altogether through density, transit, and walkable design — and there's a risk that focusing on electric vehicles lets us feel we've addressed the problem while the more difficult structural changes are deferred." },
      { role: 'examiner', text: 'How do you think people will travel in fifty years?' },
      { role: 'candidate', text: "I'll answer with some humility, because transport predictions have a poor historical record — we were promised flying cars decades ago and instead got better trains and an app for hailing a taxi.\n\nWithin cities, I'd expect the changes to be less dramatic than people imagine and more about arrangement than invention. Vehicles will be electric and probably substantially autonomous. But I think the bigger shift will be a rebalancing of space — cities reclaiming road area for pedestrians, cycling, and transit, which is already happening in Paris and elsewhere. The technologies that transform daily mobility may turn out to be unglamorous: electric bicycles have already changed more journeys in more places than autonomous vehicles have.\n\nBetween cities, high-speed rail seems likely to take a considerable share from short-haul aviation wherever the geography allows, particularly as carbon costs are internalised. Vietnam's north-south high-speed line, if it's built, would be transformative for exactly that reason.\n\nLong-haul aviation is the genuinely difficult case. Batteries are far too heavy for it, so it depends on sustainable fuels or hydrogen, both of which are technically plausible and economically painful. My expectation is that flying becomes meaningfully more expensive, which would reverse the cheap-flight era of my lifetime.\n\nAnd I'd note the possibility that the most significant change is a reduction in travel rather than a transformation of it. Remote work has already eliminated a substantial number of commutes and business trips. Sometimes the most consequential transport innovation is one that removes the need for the journey entirely." },
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
      { role: 'candidate', text: "Almost certainly, and the strongest evidence is that most people confidently believe they're unaffected while companies spend hundreds of billions annually on the assumption that they are. Both cannot be right, and I'd trust the money over the self-assessment.\n\nPart of the reason is that people misunderstand how it works. They imagine advertising as an argument to be accepted or rejected, so they conclude that since they've never been persuaded by a claim, they're immune. But most modern advertising doesn't argue at all. It builds familiarity and association — linking a product with a feeling, an identity, or a moment — and those associations operate below the level where you'd notice or resist them. When you're standing in a shop choosing between two similar products, the one that feels vaguely more familiar wins, and that feeling is exactly what was purchased.\n\nThere's also an effect on norms rather than on individual purchases, which I think is the more significant one. Decades of advertising shape what a society considers a normal standard of living, an acceptable appearance, or a reasonable thing to want. That doesn't sell a specific item; it constructs the environment in which selling happens.\n\nI'd include myself here without hesitation. I work in technology, I understand the mechanisms reasonably well, and I'm certain I'm still influenced — knowing how a magic trick works doesn't stop you from seeing the illusion." },
      { role: 'examiner', text: 'Should advertising to children be restricted?' },
      { role: 'candidate', text: "Yes, and this is one of the few areas where I hold a fairly unqualified position.\n\nThe core argument is about capacity for consent. Advertising is a persuasive act directed at someone assumed capable of evaluating it critically. Research fairly consistently shows that young children cannot reliably distinguish advertising from other content, and don't understand persuasive intent until around eight to twelve years old. So this isn't persuasion between equals; it's exploiting a developmental limitation. We accept this reasoning for contracts, alcohol, and gambling — I don't see why marketing should be exempt.\n\nThe second argument is about the specific harms. A large proportion of food advertising to children promotes exactly the products contributing to rising childhood obesity, and the correlation between exposure and consumption is well documented. There's also the deliberate use of children as leverage on their parents, which the industry has studied explicitly.\n\nOn implementation, several countries have acted. Sweden and Quebec ban most advertising to young children, and the UK restricts junk food advertising around children's programming. These haven't produced any of the catastrophic effects the industry predicted.\n\nThe genuine difficulty is enforcement in a digital environment. Rules built for television don't map cleanly onto influencer content, in-game purchases, or algorithmic feeds, where the boundary between entertainment and advertising is deliberately indistinct. That's an argument for updating the rules, though, not for abandoning the principle." },
      { role: 'examiner', text: 'Does advertising have any benefits for society?' },
      { role: 'candidate', text: "It does, and I'd rather acknowledge them than pretend the case is one-sided.\n\nThe most substantial is funding. Advertising pays for an enormous amount of content that people use without direct payment — search, journalism, video platforms, much of the free internet. There are real problems with that model, particularly the incentive toward engagement over quality, but the alternative isn't a pristine ad-free internet; it's a subscription internet that would exclude a great many people. In a country like Vietnam, where disposable income is limited, ad-supported access has genuine democratic value.\n\nSecond, advertising does perform an information function, especially for new products and for smaller companies. Without any means of reaching customers, markets would tilt further toward established brands that already have recognition. In principle advertising lowers the barrier for a new entrant with a better product.\n\nThird, public health and safety campaigns use exactly the same techniques for clearly beneficial ends — anti-smoking campaigns, road safety, vaccination drives. Persuasion isn't inherently illegitimate; the technique is neutral even when its typical use isn't.\n\nWhere I'd end, though, is that these benefits describe advertising as it could be — informative, funding useful things, occasionally serving public ends. The concerns I raised earlier describe a great deal of it as it actually is. So my position isn't that advertising should be eliminated, but that persuasion at industrial scale is a form of power, and we regulate other forms of power rather than trusting they'll be used well." },
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
];
