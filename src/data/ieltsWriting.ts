// IELTS Writing prompts — static, hand-written content shipped in the client
// bundle, the same as IELTS Speaking/Daily Dialogue/Podcast (englishIelts.ts,
// englishDialogues.ts, englishPodcasts.ts). Not a table, not user-created:
// scoring an essay against one of these is a Pro feature (ai-ielts-writing),
// but reading the prompt, its chart, the sample answers and the tips is free
// and needs no network call.

import type { IeltsChartData } from '../components/IeltsChart';

export type IeltsTask = 1 | 2;

export interface IeltsSampleAnswer {
  /** Representative band score this response is written to illustrate. */
  band: number;
  text: string;
  /** Why it lands around this band — concrete, tied to what's actually on the page,
   *  not a restatement of the band number. Not a guarantee: self-assessed content,
   *  meant to show the *shape* of the gap between bands, not a certified score. */
  explanation: string;
}

export interface IeltsWritingQuestion {
  id: string;
  task: IeltsTask;
  /** Task 2: opinion | discussion | advantages-disadvantages | problem-solution | two-part
   *  Task 1: line-graph | bar-chart | pie-chart | table | process | map | letter */
  category: string;
  prompt: string;
  /** Task 1 only — the chart/table/process/map the prompt refers to, described
   *  in words, shown alongside (or in place of, for process/map/letter) a
   *  rendered chart. */
  dataDescription?: string;
  /** Task 1 chart-type categories only (line-graph, bar-chart, pie-chart, table) — the
   *  actual numbers behind `dataDescription`, rendered by IeltsChart.tsx. */
  chartData?: IeltsChartData;
  /** Three responses to the same prompt, ordered low → high band, so the gap
   *  between them is visible side by side rather than asserted in the abstract. */
  sampleAnswers: IeltsSampleAnswer[];
  minWords: number;
  timeMinutes: number;
}

export const ieltsWritingQuestions: IeltsWritingQuestion[] = [
  // ── Task 2: essays (250 words, 40 min) ──────────────────────────
  {
    id: 'w2-opinion-transport',
    task: 2,
    category: 'opinion',
    prompt: 'Some people think that governments should spend money on public transportation rather than on building more roads for cars. To what extent do you agree or disagree?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Nowadays many countries have problem with traffic and pollution. Some people think government should spend money for public transport not for build more roads. I agree with this opinion because it is good for environment and peoples.

First, cars make a lot of pollution in the city. Bus and train is better because many people can use same time. If government build more road, more people will buy car and pollution will more bad.

Second, not all people have money to buy car. So bus is important for they go to work or school. If only have roads, poor people will have problem to travel.

In conclusion, I think government must spend on public transport because is more good for environment and for poor peoples too.`,
        explanation: 'Sits around Band 4.5-5: the position is clear and each paragraph loosely matches a reason, but ideas stay generic and undeveloped, with no specific examples. Frequent grammar errors (subject-verb agreement, missing articles, wrong word forms — "is more good", "peoples") and repetitive, basic vocabulary ("good", "bad", "problem") limit both clarity and range, though the overall meaning is usually still recoverable.',
      },
      {
        band: 6.5,
        text: `Governments have to decide how to spend money on transport, and many people believe public transport should be the priority instead of building new roads. In my opinion, I agree with this view for several reasons.

Firstly, public transport is better for the environment. Buses and trains can carry a lot of passengers at the same time, which produces less pollution than many individual cars. If governments only build more roads, more people will probably buy cars, and pollution will get worse in cities.

Secondly, public transport is more affordable for everyone. Not everyone can afford to buy and maintain a car, so a good bus or train system gives people access to jobs and schools even if they don't have much money. Building more roads mostly helps people who already own cars, so it does not help this problem.

However, roads are also necessary for emergency vehicles and deliveries, so they should not be completely ignored.

In conclusion, I agree that public transport should get more investment than roads, because it is better for the environment and more fair for people who cannot afford a car.`,
        explanation: 'A solid Band 6.5-7: the essay directly answers the question with a clear position, two developed reasons, and appropriate linking words (Firstly, Secondly, However). Vocabulary and grammar are generally accurate and communication is never in doubt, but sentence structures stay fairly simple and repetitive ("public transport is...", "is better for..."), and the ideas, while relevant, are not pushed as far as they could be.',
      },
      {
        band: 9,
        text: `Faced with finite budgets, governments must constantly choose between competing transport priorities — and among these, I firmly believe that public transportation deserves the lion's share of investment, rather than the construction of additional roads.

Environmentally, the case is difficult to dispute. A single bus can replace dozens of private cars during rush hour, carrying far more passengers per litre of fuel burned and, crucially, per tonne of carbon emitted. Widening motorways, by contrast, does little to curb emissions; if anything, it entrenches car dependency at precisely the moment cities need to be weaning themselves off it.

Nor does road-building even solve the problem it purports to address. Traffic engineers have long observed a phenomenon known as induced demand: newly built lanes fill with newly encouraged drivers almost as soon as they open, leaving congestion largely unchanged within a few years. A modern rail line, once built, tends to shift travel patterns far more durably — it can carry the equivalent of several highway lanes' worth of commuters, at a fraction of the long-term cost.

There is, too, a question of fairness that road advocates rarely confront. Car ownership assumes a level of income not everyone has; a well-run bus or metro network, by contrast, extends the same access to employment, education and healthcare regardless of what a person can afford to drive. Pouring money into roads that chiefly benefit those who already own cars does little to close that gap — if anything, it widens it.

None of this is to say road maintenance should be neglected entirely. But when the choice is stark, I would unhesitatingly direct public money towards buses, trams and railways: they pollute less, solve congestion more durably, and serve citizens more equitably than another lane of asphalt ever could.`,
        explanation: 'A strong Band 8.5-9 response: the position is fully developed across three distinct, well-differentiated lines of argument (environmental, economic, social), each backed by a specific mechanism rather than a generic claim (induced demand, the relative cost of a rail line). Cohesion is handled without relying on mechanical signposting — paragraphs open on the idea itself ("Environmentally, the case is...", "Nor does road-building...") rather than "Firstly/Secondly." Vocabulary is precise and idiomatic ("entrenches car dependency", "weaning themselves off it"), and a wide range of grammar is used accurately, including inversion-adjacent structures and varied clause types, with no errors that interrupt meaning.',
      },
    ],
  },
  {
    id: 'w2-discussion-language',
    task: 2,
    category: 'discussion',
    prompt: 'Some people believe that children should begin learning a foreign language as soon as they start school, while others think it is better to wait until secondary school. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 5,
        text: `Some people think children must learn foreign language when they are young in school. Other people think is better wait until secondary school. In this essay I will talk about both idea.

Young children can learn language very fast because their brain is good for learn new things. They can copy the sound good and not feel shy to speak.

But older children already know grammar of their own language, so they can understand new grammar rules more easy. Also many primary school don't have good teacher for language.

In my opinion, I think is better start early because children enjoy more and remember better. So school should teach language from small age.`,
        explanation: 'Around Band 5: both sides are mentioned and an opinion is given, but development is thin — each side gets only one or two simple sentences with no real examples. Cohesion relies on very basic connectors ("But", "Also"), and grammar errors are frequent enough to be noticeable throughout (article and verb-form slips: "is better", "more easy", "is good for learn"), though the writer\'s meaning stays clear.',
      },
      {
        band: 6.5,
        text: `There is disagreement about whether children should start learning a foreign language in primary school or wait until secondary school. This essay will look at both sides before giving my opinion.

Those who support an early start say that young children learn languages more naturally. They can copy pronunciation well and are not usually afraid of making mistakes, so they build confidence quickly through games and songs rather than serious study.

On the other hand, people who prefer a later start point out that older students already understand grammar in their first language, so they can learn new grammar rules faster and more logically. They also mention that primary schools sometimes do not have teachers who are trained to teach languages properly, which can make an early start less effective.

In my opinion, starting early is usually better, because the advantages in pronunciation and confidence are hard to get back later, as long as the school actually has good teachers for it.

In conclusion, both approaches have some benefits, but I believe an early start works best when the teaching quality is good.`,
        explanation: 'A competent Band 6.5-7 response: it addresses both views in separate, balanced paragraphs and states a clear opinion, with generally accurate grammar and adequate (if unremarkable) vocabulary. It falls short of a higher band because the supporting points remain fairly general rather than sharply developed, and cohesion depends on fairly predictable signposting ("This essay will...", "In conclusion").',
      },
      {
        band: 9,
        text: `Few debates in education provoke quite as much disagreement among parents as when a child should first encounter a foreign language — in nursery, or only once secondary school begins. Both camps have a case worth taking seriously.

Advocates of an early start point to something almost magical about the young brain: children who begin a language before the age of seven or eight tend to absorb its sounds with an ease that becomes markedly harder to replicate later, often developing an accent indistinguishable from a native speaker's. Because so much of this early learning unfolds through song, play and repetition rather than grammar drills, it rarely feels like work — which may explain why children who start young often retain a lasting affection for the language itself.

Those who would rather wait argue, not unreasonably, that older students bring something younger children simply cannot: a mature grasp of their own language, and with it the analytical tools to dissect grammar consciously rather than absorb it by instinct. A fourteen-year-old can master, in a single term, verb conjugations that might take a six-year-old years to internalise unconsciously. There is also a more practical objection — primary schools are frequently short of teachers qualified to teach languages well, so an "early start" in name can amount, in practice, to very little real learning at all.

On balance, I side with the early starters, but only conditionally. The pronunciation and long-term fluency gains are difficult to replicate at any later stage, and there is little evidence that a well-designed, playful language programme comes at the expense of a child's other subjects. What matters far more than the starting age, in my view, is whether the teaching itself is any good — a mediocre programme begun at five will always lose to an excellent one begun at eleven.`,
        explanation: 'A strong Band 8.5-9 response: both sides are given genuinely distinct, well-reasoned cases (a cognitive argument for early starters, a practical/analytical one for late starters) rather than a token paragraph each, and the conclusion reaches a nuanced, conditional judgement rather than a flat pick. Vocabulary is precise and varied ("internalise unconsciously", "a mediocre programme"), sentence openings vary naturally, and a wide range of accurate grammar is on display (relative clauses, conditionals, parenthetical asides) without any error that disrupts meaning.',
      },
    ],
  },
  {
    id: 'w2-adv-dis-remote-work',
    task: 2,
    category: 'advantages-disadvantages',
    prompt: 'More and more people are choosing to work from home instead of commuting to an office. What are the advantages and disadvantages of this trend?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Many people now work from home instead of go to office. This have some good point and some bad point.

Good point is people don't need travel to office every day. This save time and money. Also people can stay with family more time.

Bad point is people cannot talk with colleague easy like in office. Sometime this make people feel alone. Also some people work more hour at home because they don't stop working.

I think work from home is good but company must help worker to communicate good with team.`,
        explanation: 'Roughly Band 4.5-5: the advantages and disadvantages are both mentioned, so the task is minimally addressed, but each point is a single short, simple sentence with no real explanation or example. Grammatical control is weak throughout — missing third-person "-s", wrong verb forms ("this have", "don\'t stop working" used loosely) — and vocabulary is very limited and repeated ("good point", "bad point").',
      },
      {
        band: 6.5,
        text: `More people are now choosing to work from home rather than commute to an office every day. This brings both advantages and disadvantages.

One clear advantage is that employees save the time and money they would normally spend commuting, which they can use for rest, exercise or family. Companies can also save money because they need less office space.

However, working from home also has drawbacks. Employees may feel isolated because they don't have the same casual conversations with colleagues that happen naturally in an office. This can make teamwork more difficult, especially for complicated projects. In addition, some people find it hard to stop working at a normal time, which can lead to tiredness and stress.

In my opinion, remote work has more advantages than disadvantages if companies make an effort to keep communication clear and encourage employees not to work too many hours.

Overall, I believe remote work can be a positive change as long as businesses manage it carefully.`,
        explanation: 'A clear Band 6.5-7 answer: advantages and disadvantages are each given their own paragraph with reasonable, relevant support, and the response reaches a sensible overall judgement. Grammar and vocabulary are accurate enough not to cause confusion, but the language stays safe and somewhat repetitive ("advantage"/"disadvantage" used directly rather than varied), which keeps it short of a higher band.',
      },
      {
        band: 9,
        text: `The shift from office to spare bedroom has been one of the more consequential changes to how people work in recent memory, and like most consequential changes, it cuts both ways.

Chief among its benefits is time reclaimed. An hour or more once spent commuting can now be spent sleeping, exercising, or simply being present for a family that used to see far less of its working members — a gain in wellbeing that is difficult to overstate. Employers, for their part, often discover that a smaller office footprint translates directly into lower overheads, while employees gain a flexibility that lets them structure the working day around genuine responsibilities rather than a fixed commute.

Yet something is undeniably lost in translation. The casual exchange by the coffee machine, the half-formed idea overheard and improved upon — these are precisely the interactions video calls struggle to reproduce, and their absence can leave remote teams feeling curiously disconnected even when every scheduled meeting goes smoothly. Nor is the boundary between "at work" and "at home" always as clean as advocates suggest; without a commute to mark the end of the day, some employees find themselves answering emails long after they should have logged off, trading one kind of burnout for another.

Weighing the two, I remain persuaded that remote work is, on balance, the better arrangement for most people — provided organisations are deliberate about preserving what the office used to provide for free: structured collaboration, visible boundaries, and the occasional excuse to simply talk. Left unmanaged, however, its downsides can just as easily outweigh its considerable appeal.`,
        explanation: 'A strong Band 8.5-9 response: the advantages and disadvantages are illustrated through specific, vivid detail ("the casual exchange by the coffee machine") rather than named in the abstract, and the final judgement is genuinely conditional rather than a simple "on balance" tally. Cohesion between paragraphs is handled through contrast ("Yet something is undeniably lost...") rather than mechanical linking words, vocabulary is idiomatic throughout ("cuts both ways", "trading one kind of burnout for another"), and grammar shows real range — fronted structures, embedded clauses, a rhetorical negative ("Nor is the boundary...") — used with full control.',
      },
    ],
  },
  {
    id: 'w2-problem-solution-traffic',
    task: 2,
    category: 'problem-solution',
    prompt: 'Traffic congestion is becoming a serious problem in many major cities around the world. What are the causes of this problem, and what measures could be taken to solve it?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Traffic jam is big problem in many big city. In this essay I will say why this happen and how to solve.

One reason is too many car in the road. When people have more money they buy car. Another reason is not enough public transport so people must drive.

To solve this problem, government can build more bus and train. Government can also make people pay money when they drive in city center.

I think if government do these thing, traffic will become better in the future.`,
        explanation: 'Around Band 4.5-5: causes and solutions are both attempted, giving the response a recognisable shape, but each idea is compressed into one plain sentence with little elaboration. Errors with articles, plurals and verb agreement recur throughout ("big problem", "not enough public transport", "government do"), and the range of vocabulary used is narrow and repetitive.',
      },
      {
        band: 6.5,
        text: `Traffic congestion has become a serious problem in many large cities. This essay will discuss the main causes of this problem and suggest some possible solutions.

One major cause is the increasing number of private cars, as more people can afford to buy a car when their income grows. Another cause is that public transport is sometimes not good enough, so people feel they have no choice but to drive to work.

To solve this problem, governments could invest more money in public transport, making buses and trains cheaper, faster and more frequent so people prefer them to driving. Another solution is to introduce charges for driving into busy city centres, which would encourage people to use other ways to travel and also raise money for transport improvements.

In conclusion, traffic congestion is caused mainly by too many cars and weak public transport, but with better investment and some new policies, cities could reduce this problem considerably.`,
        explanation: 'A steady Band 6.5-7: causes and solutions are logically separated and clearly linked to each other, with generally accurate grammar and reasonably varied but safe vocabulary. It doesn\'t reach a higher band because the examples remain generic ("better public transport", "some new policies") rather than specific or original, and sentence patterns are fairly uniform throughout.',
      },
      {
        band: 9,
        text: `Anyone who has sat motionless in rush-hour traffic in a major city needs no convincing that congestion has become a genuine crisis rather than a mere inconvenience. Understanding why it has grown so severe is the first step towards solving it.

The most immediate cause is simple arithmetic: as incomes rise, so does car ownership, and most cities' road networks were laid out decades before anyone anticipated today's volume of traffic. Narrow streets built for a fraction of the current population now strain under vehicle numbers they were never designed to carry. Compounding this, public transport in many cities remains too slow, too infrequent or too poorly connected to offer drivers a genuine alternative — leaving the car, whatever its costs, as the only practical option for millions of commuters.

Addressing this will require more than a single fix. A fast, reliable metro or bus network, built to actually rival the door-to-door convenience of driving, would do more to reduce congestion than any number of additional lanes — a lesson cities from Singapore to Copenhagen have already learned. Congestion pricing, of the kind London introduced in its centre, offers a second lever: charging drivers for entering the busiest areas both discourages unnecessary trips and raises revenue that can be reinvested in the very transport improvements that make the charge fair. Finally, encouraging employers to stagger start times or permit remote work, even a few days a week, would spread demand across the day rather than concentrating it into two punishing peaks.

None of these measures alone would solve the problem. Together, however — better transit, smarter pricing, and a little more flexibility about when the working day begins — they offer a realistic path out of gridlock that adding roads, on its own, has repeatedly failed to deliver.`,
        explanation: 'A strong Band 8.5-9 response: causes are traced to underlying mechanisms rather than just named ("simple arithmetic", roads "laid out decades before"), and each of the three solutions is grounded in a specific real-world reference (Singapore, Copenhagen, London) rather than left abstract. The final paragraph explicitly argues that the measures work as a combination, showing genuine synthesis rather than a list. Vocabulary is precise and natural ("punishing peaks", "a genuine alternative"), and grammar ranges widely — colon-led elaboration, parenthetical interruption, comparative structures — all handled accurately.',
      },
    ],
  },
  {
    id: 'w2-two-part-waste',
    task: 2,
    category: 'two-part',
    prompt: 'In many countries, the amount of waste produced by households continues to increase every year. Why do you think this is happening? What can be done to reduce household waste?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Every year household make more rubbish. This essay explain why this happen and what we can do stop it.

One reason is people like buy new thing all the time. Old thing they just throw away even it still work. Also many food and thing have too much plastic for packaging.

Government can make law for less plastic packaging. People can also use thing again instead throw away, and buy only what they need.

I think if everyone try, we can make less rubbish in future.`,
        explanation: 'About Band 4.5: both parts of the question (why, and what to do) receive a brief answer, so the task is nominally covered, but reasoning is minimal and mostly restates the question rather than explaining it. Basic grammar errors are frequent (missing "-s" on verbs and nouns, wrong verb forms: "household make", "thing they just throw away"), and vocabulary rarely goes beyond the words used in the prompt itself.',
      },
      {
        band: 6.5,
        text: `In many countries, the amount of rubbish produced by households keeps increasing every year. This essay will explain some reasons for this and suggest ways to reduce it.

One reason is that people often buy new products even when their old ones still work, partly because of advertising and changing trends. Another reason is excessive packaging, especially on food products, which is usually thrown away almost immediately after shopping.

Several things could help reduce household waste. Governments could introduce stricter rules on how much packaging companies are allowed to use. Individuals can also help by choosing reusable items instead of disposable ones, repairing things instead of replacing them, and being more careful about what they actually need to buy.

In conclusion, household waste is increasing mainly because of consumer habits and excess packaging, but a combination of government action and individual choices could help to reduce it over time.`,
        explanation: 'A reasonably solid Band 6.5-7 response: it answers both parts of the question with a plausible cause and workable solutions, using accurate grammar and adequate topic-specific vocabulary. It stays in the mid range because the ideas, while correct, are fairly predictable and are not developed with any specific example or detail.',
      },
      {
        band: 9,
        text: `Bin day, in most households today, means considerably more than it once did. Across many countries, the volume of waste each household throws away has climbed steadily for years, and the reasons are not hard to find.

Consumer culture bears much of the responsibility. Products are increasingly designed to be replaced rather than repaired, and a steady stream of marketing convinces people to discard perfectly functional items simply because something newer has arrived. Packaging compounds the problem: a single grocery shop can generate a surprising quantity of plastic and cardboard that serves no purpose beyond the walk from shop to kitchen. Add to this the sheer convenience of disposability — takeaway containers, single-use cutlery, individually wrapped snacks — and it becomes clear why bins fill up faster than they used to, almost without anyone noticing.

Reversing this trend calls for action on several fronts at once. Governments could require manufacturers to use minimal, genuinely recyclable packaging, shifting the burden of waste reduction away from consumers and onto the companies that create it in the first place. Public campaigns, meanwhile, can shift habits at a smaller scale — encouraging people to repair rather than replace, and to think twice before a purchase becomes rubbish within the year. Individuals, too, have real agency here: composting food scraps, choosing reusable alternatives, and simply buying less all make a measurable difference. Local councils could reinforce these habits further by charging households according to how much non-recyclable waste they actually produce, turning a vague environmental concern into a very concrete incentive.

Taken together, regulation, education and a genuine price signal offer a realistic route to reversing a trend that, left unchecked, shows no sign of slowing on its own.`,
        explanation: 'A strong Band 8.5-9 response: the opening reframes the familiar prompt in a fresh, concrete image ("Bin day... means considerably more than it once did") rather than restating it, and each cause is explained through its mechanism (marketing-driven disposal, packaging that "serves no purpose beyond the walk from shop to kitchen") instead of simply named. Solutions are matched to specific actors (governments, campaigns, individuals, councils) and closed with genuine synthesis rather than a list. Vocabulary is wide and precise, and grammar shows real range — colon-led lists, an imperative aside ("Add to this..."), varied clause structures — with no error that disrupts meaning.',
      },
    ],
  },
  {
    id: 'w2-opinion-community-service',
    task: 2,
    category: 'opinion',
    prompt: "Some people believe that unpaid community service should be a compulsory part of every student's education. To what extent do you agree or disagree?",
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Some people think student must do free work for help community in school time. I don't agree with this idea fully.

Volunteer work can teach student be more kind and understand other people problem. This is good thing.

But if it is compulsory, student maybe don't want do it and just do for finish the requirement, not because they want help. Also student already have many homework and exam, so this can make more stress for they.

In my opinion, school can suggest this activity but not force student to do it.`,
        explanation: 'Around Band 5: an opinion is given and loosely supported, but the essay is short with only one idea per side and no real examples. Grammatical accuracy is inconsistent — wrong verb forms and missing words appear regularly ("for they", "don\'t want do it") — and the response stays close to the language of the question rather than developing it independently.',
      },
      {
        band: 6.5,
        text: `Some people believe that community service should be a required part of every student's education, while others disagree. In my opinion, although volunteering has clear benefits, I do not think it should be compulsory.

On one hand, community service can teach students important values such as empathy and responsibility, by exposing them to situations they may not usually experience, such as helping elderly people or protecting the environment. This kind of experience can be very valuable for their personal development.

On the other hand, making it compulsory could reduce its benefits. Students already have busy schedules with schoolwork and exams, and if volunteering becomes just another requirement, they might do it without real motivation, which reduces its educational value. It could also be difficult for schools to arrange enough suitable placements for every student.

In conclusion, while community service has many advantages, I believe it should remain optional so that students who participate do so because they genuinely want to.`,
        explanation: 'A well-organised Band 6.5-7: it presents both the benefit and the drawback of compulsion clearly, with a consistent opinion and generally accurate, if somewhat formulaic, language ("on one hand... on the other hand"). It doesn\'t reach a higher band because the argument, while logical, doesn\'t go beyond fairly expected points.',
      },
      {
        band: 9,
        text: `Few policy ideas sound as immediately appealing as compulsory community service for students — and few, on closer inspection, hold up quite so well. While I understand its appeal, I remain unconvinced that mandating it is the right approach.

Supporters make a genuinely persuasive case: volunteering exposes teenagers to realities of poverty, homelessness or environmental neglect that a classroom, however well taught, simply cannot replicate. Slotting a student into a food bank or an environmental clean-up crew for a few hours a term can teach empathy and teamwork more effectively than any textbook, and some of that experience clearly does stay with people well into adulthood.

My reservation is not with volunteering itself but with the word "compulsory." Students already juggle demanding timetables, and bolting on a mandatory obligation risks turning something potentially transformative into one more box to tick. Motivation, in my experience, matters enormously here: work undertaken reluctantly, purely to satisfy a requirement, rarely produces the empathy and insight that voluntary engagement does. There is a fairness problem too — a student in a well-resourced city has no shortage of volunteering opportunities within easy reach; a student in a remote rural area may struggle to find any placement at all, through no fault of their own.

A better path, to my mind, is for schools to make volunteering easy and appealing rather than obligatory — offering guidance, recognising genuine contribution, and simply getting out of students' way once they choose to participate. Students who volunteer because they want to nearly always take more from the experience than those who do so because they must.

In short, I remain sympathetic to the goal but sceptical of the method: community service can shape character, but only when a student chooses it freely.`,
        explanation: 'A strong Band 8.5-9 response: the essay isolates precisely where it agrees and disagrees ("My reservation is not with volunteering itself but with the word \'compulsory\'") rather than giving a blanket yes/no, and supports each point with vivid, specific illustration (a food bank, a rural student with no placement nearby). Cohesion is carried by the logic of the argument rather than signposting words, vocabulary is natural and precise ("bolting on a mandatory obligation", "one more box to tick"), and a wide range of grammar — semicolons, appositives, conditional framing — is used with full accuracy.',
      },
    ],
  },
  {
    id: 'w2-discussion-culture',
    task: 2,
    category: 'discussion',
    prompt: 'Some people think that the best way to learn about other cultures is to travel abroad, while others believe that books, films and the internet are just as effective. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Some people think travel to other country is best way learn about culture. Other people think book, film and internet is same good. I will talk about both.

When you travel, you can see real life of the country. You can eat food and talk with local people. This is good experience.

But travel is expensive and not everyone can do it. Book and internet is cheap and everyone can use, and you can learn history too.

In my opinion both is good but travel maybe is better because is real experience.`,
        explanation: 'Around Band 4.5-5: both views are named and a preference is given, but the paragraphs are short and general, without any specific example beyond "eat food" or "talk with local people". Repeated basic grammar errors (missing verb agreement, "is" used for plural subjects) and a narrow vocabulary range keep this response in the lower band despite the ideas themselves being reasonable.',
      },
      {
        band: 6.5,
        text: `There are different opinions about the best way to learn about other cultures — some people think travelling abroad is best, while others believe books, films and the internet are just as useful. This essay will discuss both views.

Those who prefer travelling argue that direct experience cannot be replaced. Seeing a place with your own eyes, trying local food, and talking to local people gives a much more real understanding of a culture than reading about it.

On the other hand, supporters of books, films and the internet point out that these resources are much cheaper and more accessible, since not everyone can afford to travel abroad. They also argue that documentaries and books can explain historical background that a short trip might not show.

In my opinion, both methods are useful, and using them together, for example reading about a country before visiting it, gives the best understanding overall.

In conclusion, while travelling provides direct experience, media resources remain a valuable and affordable alternative.`,
        explanation: 'A balanced Band 6.5-7 answer: both viewpoints are given roughly equal space with reasonable justification, and a clear personal opinion is offered. It remains mid-range because the reasoning, while accurate, is somewhat generic and the linking phrases ("on the other hand", "in conclusion") are used mechanically rather than woven naturally into the argument.',
      },
      {
        band: 8.5,
        text: `Learning about other cultures can be achieved in many ways, and opinions differ on whether travelling abroad or engaging with books, films and the internet is more effective. This essay will discuss both viewpoints before giving my own opinion.

Those who favour travel argue that nothing compares to direct, first-hand experience. Visiting another country allows a person to taste local food, hear the language spoken naturally, and observe everyday customs and social norms that are difficult to convey through a screen or a page. Unexpected encounters and conversations with local people often provide insights that no documentary or textbook could offer, making the learning experience more memorable and authentic.

On the other hand, supporters of books, films and the internet point out that these resources are far more accessible and affordable than international travel, which can be prohibitively expensive and time-consuming for many people. Documentaries and well-researched books can also provide historical and social context that a short visit might not reveal, while online platforms make it possible to interact with people from other cultures in real time through video calls or social media, without leaving home.

In my view, both approaches have genuine value and are best used together rather than in isolation. Reading and watching material about a culture beforehand can prepare a traveller to understand and appreciate what they encounter, while the experience of travel itself brings that knowledge to life in a way that media alone cannot fully replicate.

In conclusion, while travel offers unmatched authenticity, media resources remain a valuable and more accessible complement, and combining both is the most effective way to understand other cultures.`,
        explanation: 'A strong Band 8-8.5 response: both sides are developed with specific, concrete detail (tasting food, video calls, "prohibitively expensive") rather than generic assertion, and the conclusion goes beyond picking a side to propose how the two approaches interact. Grammar and vocabulary are accurate and varied throughout. It sits just under a 9 because the linking phrases, while natural, still lean on fairly standard discussion-essay signposting ("On the other hand", "In conclusion") rather than the more organic cohesion the very top band shows.',
      },
    ],
  },
  {
    id: 'w2-adv-dis-online-shopping',
    task: 2,
    category: 'advantages-disadvantages',
    prompt: 'A growing number of people are choosing to buy products online rather than in physical shops. What are the advantages and disadvantages of this development?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Now many people buy thing online instead go to shop. This have advantage and disadvantage.

Advantage is you can buy anytime, even at night, and you don't need go outside. Also sometime online is more cheap than shop.

Disadvantage is you cannot touch or try the thing before buy, so sometime the thing is not same like picture. Also small shop in the city can close because people buy online.

I think online shopping is convenient but we should still support local shop sometime.`,
        explanation: 'Approximately Band 4.5-5: both an advantage and a disadvantage are given, meeting the basic shape of the task, but each is only one simple sentence, and specific detail is minimal. Frequent article and agreement errors ("this have", "is more cheap", "the thing is not same like picture") and simple, repeated vocabulary limit the band despite the ideas being relevant.',
      },
      {
        band: 6.5,
        text: `An increasing number of people now prefer to shop online instead of visiting physical stores. This has both advantages and disadvantages worth considering.

One clear advantage is convenience: people can shop at any time without needing to travel, and they can easily compare prices between different websites. This is especially useful for people who live far from shops or who have busy schedules.

However, online shopping also has drawbacks. Customers cannot physically check the product before buying, which sometimes leads to disappointment if the item does not match its description. In addition, local shops can struggle to compete with large online companies, which may hurt small businesses in towns and cities.

In my opinion, online shopping is very convenient, but people should also think about supporting local businesses when possible.

Overall, while online shopping offers real convenience, it brings some downsides for both consumers and local communities that should not be ignored.`,
        explanation: 'A clear Band 6.5-7 response: the advantage and disadvantage are each explained with a plausible reason, and there is a sensible concluding opinion. It sits in the mid range because supporting detail stays general rather than specific, and the paragraph structure, though correct, is somewhat predictable.',
      },
      {
        band: 8.5,
        text: `Online shopping has grown enormously in popularity, with more people choosing to purchase goods through websites and apps rather than visiting physical stores. This shift offers considerable convenience, but it also brings certain disadvantages worth considering.

The most obvious advantage of online shopping is convenience. Consumers can browse and purchase products at any time of day, without the need to travel, find parking or queue at a till. Online platforms also make it easy to compare prices across different retailers, read reviews from other customers, and access a far wider range of products than any single physical shop could offer. For people living in remote areas or with limited mobility, online shopping can be particularly valuable, providing access to goods that might otherwise be unavailable locally.

However, this convenience comes with drawbacks. Shoppers cannot physically examine products before buying them, which can lead to disappointment when an item does not match its description, particularly with clothing or furniture. The rise of online shopping has also contributed to the decline of local high streets, as smaller independent shops struggle to compete with large online retailers, potentially harming local economies and reducing town centres to fewer social spaces. Additionally, the packaging and delivery associated with online orders generate considerable waste and carbon emissions, especially when items are returned.

On balance, while online shopping offers undeniable convenience and choice, its impact on local businesses and the environment should not be overlooked. A combination of online and in-person shopping, used thoughtfully, is likely to bring the greatest overall benefit to consumers and communities alike.`,
        explanation: 'A strong Band 8-8.5 answer: advantages and disadvantages are each unpacked into two or three distinct, specific strands (price comparison, accessibility for remote shoppers; product mismatch, high-street decline, delivery emissions) rather than one point apiece, and the conclusion weighs them rather than simply listing them. Vocabulary is precise and wide-ranging. It falls just short of a 9 because a few phrases stay close to safe essay formulas ("On balance", "should not be overlooked") rather than the more distinctive phrasing the very highest band shows.',
      },
    ],
  },
  {
    id: 'w2-problem-solution-pollution',
    task: 2,
    category: 'problem-solution',
    prompt: 'Air pollution is a growing problem in many large cities. What are the main causes of this problem, and what can individuals and governments do to address it?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Air pollution is big problem in many big city now. This essay will say the cause and how to fix.

Car and factory make a lot of smoke and this go to air. Also many people burn coal for cooking or heating house.

Government can make rule for factory to pollute less. People can use bicycle or bus instead of car. This will make air more clean.

I think government and people must work together to solve this problem.`,
        explanation: 'Around Band 4.5-5: causes and solutions are both mentioned, giving basic task coverage, but the ideas are stated very simply with no elaboration or example. Errors with articles and word choice occur throughout ("big problem", "make air more clean"), and vocabulary rarely extends beyond common, general words.',
      },
      {
        band: 6.5,
        text: `Air pollution has become a serious issue in many large cities around the world. This essay will look at the main causes of this problem and suggest what individuals and governments could do about it.

The main causes are vehicle emissions and factories, which release smoke and harmful gases into the air, especially in cities with a lot of traffic or industry. Burning coal for heating and electricity is another common cause in many countries.

To reduce air pollution, governments could introduce stricter rules on factory and vehicle emissions, and support the use of electric cars and clean energy. Individuals can also help by using public transport, walking or cycling for short trips instead of driving.

In conclusion, air pollution is mainly caused by vehicles, factories and coal burning, but with stronger regulations and some changes in personal habits, this problem could be reduced significantly.`,
        explanation: 'A solid Band 6.5-7 answer: it identifies plausible causes and matches them with reasonable solutions in clearly organised paragraphs, with accurate if unremarkable grammar and vocabulary. It falls short of a higher band because the points, although correct, are broad rather than specifically developed.',
      },
      {
        band: 8.5,
        text: `Step outside in many of the world's largest cities on a still, grey morning, and the problem announces itself before any statistic does. Air pollution has become one of urban life's most persistent hazards, and its causes, while familiar, are worth restating plainly.

Vehicles remain the largest single culprit, particularly older engines that burn fuel far less cleanly than modern standards would allow. Industry adds substantially to the load: factories in economies where environmental regulation remains weak often release pollutants with little restraint, while coal — still widely burned for electricity and heating — continues to blanket entire regions in smog each winter.

None of these causes is beyond remedy. Governments could tighten emissions standards for vehicles and factories alike, forcing a transition towards genuinely cleaner technology rather than incremental tweaks to old ones; generous incentives for electric vehicles and renewable power would accelerate that shift considerably. Investment in public transport would do double duty here, drawing drivers out of older, dirtier vehicles and directly reducing the traffic that idles, engines running, through city centres. Individuals are not powerless in this either: choosing to cycle, walk or take a bus for short journeys, and simply using less energy at home, adds up to a meaningful difference when adopted widely enough.

Air pollution, in other words, is neither mysterious in its origins nor unsolvable in principle. What it requires is the political will to regulate seriously, invest genuinely, and — where individuals can help — to actually do so, rather than waiting for someone else to act first.`,
        explanation: 'A strong Band 8.5-9 response: it opens with a sensory, concrete image rather than restating the prompt, and traces each cause to a specific mechanism (weak regulation, coal "blanketing regions in smog") rather than naming it in the abstract. The solutions section explicitly connects measures to each other ("would do double duty") rather than listing them side by side. Vocabulary is idiomatic and precise ("incremental tweaks", "adds up to a meaningful difference"), and grammar shows genuine range — semicolon-joined clauses, a parenthetical aside, an em-dash-led final twist — used with full control.',
      },
    ],
  },
  {
    id: 'w2-two-part-social-media',
    task: 2,
    category: 'two-part',
    prompt: 'Many young people today spend a large amount of their free time on social media. Why has this become so popular? Is this a positive or negative development?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswers: [
      {
        band: 4.5,
        text: `Many young people spend a lot of time on social media every day. In this essay I will say why this happen and if it is good or bad.

Social media is popular because young people can talk with friend and see funny video anytime. It make them feel connect with other people.

But too much social media can be bad. Young people can feel sad when compare life with other, and they cannot sleep good because look phone too long.

I think social media have some good point but also some bad point for young people.`,
        explanation: 'Roughly Band 4.5-5: both parts of the question receive a short answer, but development is minimal and reasoning is stated rather than explained. Frequent grammar slips ("it make them", "sleep good", "social media have") and simple, repetitive vocabulary keep this in the lower band despite reasonable, relevant ideas.',
      },
      {
        band: 6.5,
        text: `Many young people today spend a large part of their free time using social media. This essay will consider why these platforms have become so popular, and whether this is a positive or negative development.

Social media has become popular partly because it allows young people to stay connected with friends easily, share their experiences, and find communities with similar interests. These apps are also designed to be very engaging, with constant new content to look at.

In my opinion, this development has both positive and negative sides. On the positive side, social media can help people stay connected and access useful information. On the negative side, spending too much time on it has been linked to problems like anxiety, poor sleep and difficulty concentrating.

In conclusion, social media's popularity comes from real social needs, but its heavy use among young people can be both helpful and harmful depending on how it is managed.`,
        explanation: 'A competent Band 6.5-7 response: both questions from the prompt are addressed, with a balanced, clearly stated opinion. Grammar and vocabulary are accurate but fairly plain, and the argument, while logical, does not move beyond generally expected points about connection and overuse.',
      },
      {
        band: 8.5,
        text: `Scroll through almost any classroom or bus full of teenagers today and the same glow will be visible on nearly every face — the unmistakable light of a phone screen. Social media's grip on young people's free time is now so total that it is worth asking both how it happened and whether it should concern us.

Its popularity is, in truth, engineered rather than accidental. These platforms are built, quite deliberately, to keep users scrolling — endless feeds, algorithmically tuned notifications, and content curated to know precisely what will hold someone's attention a few seconds longer. Beneath the design, though, lies a genuine human need these apps have simply learned to exploit: the desire to belong, to be seen, to stay connected to friends regardless of distance. That the appeal is manufactured does not make the underlying need any less real.

Whether this represents progress or regression, I suspect, depends on how it is used rather than on the technology itself. Used thoughtfully, social media can nurture creativity, provide access to educational content, and offer a lifeline for young people who feel isolated in their immediate surroundings. Used compulsively, however, it has been linked with rising anxiety, disrupted sleep and shortening attention spans — outcomes that seem to follow, unsurprisingly, from hours spent comparing one's ordinary life against everyone else's carefully curated highlight reel.

On balance, I would call this a genuinely mixed development rather than a straightforwardly negative one — but one that increasingly demands deliberate management, through digital literacy, healthier defaults, and rather more honesty from platforms themselves about what they are designed to do.`,
        explanation: 'A strong Band 8.5-9 response: the "why" is answered with a specific mechanism (algorithmic design exploiting a genuine need) rather than a generic "it\'s popular because it connects people", and the "positive or negative" question is reframed around use rather than forced into a binary. Cohesion runs through contrast and repetition-with-variation ("Used thoughtfully... Used compulsively...") rather than transition words, vocabulary is idiomatic ("a lifeline", "carefully curated highlight reel"), and grammar shows real range — parallel structure, an em-dash-led qualifier, a fronted adverbial opening — with no error affecting meaning.',
      },
    ],
  },

  // ── Task 1: reports & letters (150 words, 20 min) ───────────────
  {
    id: 'w1-line-graph-museums',
    task: 1,
    category: 'line-graph',
    prompt: 'The line graph below shows information about the number of visitors to three different museums in a city between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'Museum A rises steadily from about 100,000 visitors in 2000 to a peak of 420,000 in 2010, then declines gradually to around 300,000 by 2020. Museum B stays roughly flat between 150,000 and 180,000 visitors for the whole period. Museum C starts lowest at about 50,000 in 2000, climbs sharply after 2012, and overtakes both other museums by 2018, reaching 450,000 in 2020.',
    chartData: {
      kind: 'line',
      xLabels: ['2000', '2005', '2010', '2015', '2020'],
      unit: 'thousand visitors',
      series: [
        { name: 'Museum A', values: [100, 260, 420, 360, 300] },
        { name: 'Museum B', values: [160, 170, 175, 165, 170] },
        { name: 'Museum C', values: [50, 90, 180, 320, 450] },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 4.5,
        text: `The graph show number of visitor in three museum from 2000 to 2020.

Museum A go up first then go down. Museum B stay same all the time. Museum C is low at start but go up very much at the end and become the highest.

In 2000 museum A have 100,000 visitor and museum C have only 50,000. In 2020 museum C have most visitor, about 450,000.

Overall museum C have biggest change in the graph.`,
        explanation: 'About Band 4.5-5: there is an attempt at an overview and the three lines are all mentioned, but the description is very repetitive ("go up", "go down", "go up very much") and relies on simple present tense rather than the past tenses a completed historical graph requires. Only two data points are actually reported with figures, so the description is thin, and grammar errors (missing plurals, "museum A have") are frequent.',
      },
      {
        band: 6.5,
        text: `The line graph shows the number of visitors to three museums, A, B and C, between 2000 and 2020.

Overall, Museum A increased then decreased, Museum B stayed almost the same, and Museum C increased a lot and finished with the most visitors.

In 2000, Museum A had about 100,000 visitors, which rose to a peak of around 420,000 in 2010, before falling back to about 300,000 by 2020. Museum B remained fairly stable during the whole period, staying between roughly 150,000 and 180,000 visitors.

Museum C started the lowest, with only 50,000 visitors in 2000, but increased sharply after 2012 and reached about 450,000 by 2020, overtaking the other two museums.

In summary, Museum C saw the most dramatic increase, while Museum B changed the least over the twenty years.`,
        explanation: 'A competent Band 6.5-7: it includes a clear overview and reports the key figures for each museum with mostly accurate comparative language ("rose to a peak", "remained fairly stable"). It doesn\'t reach a higher band because the sentence patterns are fairly repetitive between paragraphs and some finer detail (the exact overtaking point) is only briefly noted rather than highlighted as a key feature.',
      },
      {
        band: 9,
        text: `The line graph traces visitor numbers at three museums — A, B and C — across two decades from 2000 to 2020, revealing sharply divergent fortunes for each.

What stands out most is Museum C's transformation from also-ran to clear leader, a reversal that dominates the graph's overall story; Museum B, meanwhile, is notable chiefly for how little it changed at all.

Museum A began the period as the most popular of the three, its visitor numbers climbing from around 100,000 in 2000 to a peak of roughly 420,000 by 2010. That momentum did not last, however: the following decade saw a steady decline, leaving Museum A at approximately 300,000 visitors by 2020 — still respectable, but a marked retreat from its peak. Museum B, by contrast, barely moved at all, hovering consistently between 150,000 and 180,000 across the entire twenty-year span.

Museum C's trajectory is the graph's most striking feature. Starting from a mere 50,000 visitors in 2000 — comfortably the lowest of the three — its numbers crept up only gradually until around 2012, at which point growth accelerated sharply. By 2018 it had overtaken both rivals, finishing the period at roughly 450,000 visitors, the highest figure any of the three museums recorded throughout the entire period.

In short, two decades transformed the museum landscape considerably: what began as a clear hierarchy, with Museum A comfortably ahead, ended with Museum C firmly in the lead and Museum B essentially unchanged throughout.`,
        explanation: 'A strong Band 8.5-9 report: the overview foregrounds the single most significant feature (Museum C\'s reversal) rather than listing all three lines equally, and every figure is embedded in comparative, analytical language ("comfortably the lowest", "a marked retreat from its peak") rather than stated flatly. A wide range of report-writing structures is used accurately — semicolon-joined contrast, an em-dash-led aside, varied ways of marking time ("by 2018", "at which point") — with no repetition of sentence pattern across paragraphs.',
      },
    ],
  },
  {
    id: 'w1-bar-chart-internet',
    task: 1,
    category: 'bar-chart',
    prompt: 'The bar chart below shows the percentage of households with internet access in four countries in 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 2005, internet access ranged from 15% of households in Country D to 55% in Country A, with Country B at 40% and Country C at 25%. By 2020, all four countries show large increases: Country A reaches 95%, Country B 90%, Country C 80%, and Country D shows the biggest relative jump, rising to 75%.',
    chartData: {
      kind: 'bar',
      categories: ['Country A', 'Country B', 'Country C', 'Country D'],
      unit: '%',
      series: [
        { name: '2005', values: [55, 40, 25, 15] },
        { name: '2020', values: [95, 90, 80, 75] },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 4.5,
        text: `The chart show percent of house have internet in four country in 2005 and 2020.

In 2005, country A have most internet, 55%. Country D have less, only 15%.

In 2020, all country have more internet than before. Country A have 95% and country D have 75%.

Overall internet access go up in all country from 2005 to 2020.`,
        explanation: 'Around Band 4.5-5: an overview sentence is present and some figures are reported, but only two of the four countries are described in each year, so the comparison is incomplete. Repeated simple structures ("country X have Y%") and grammar errors (missing plural "-s", wrong verb form) are frequent throughout.',
      },
      {
        band: 6.5,
        text: `The bar chart compares the percentage of households with internet access in four countries, A, B, C and D, in 2005 and 2020.

Overall, internet access increased in all four countries over the period, and the gap between them became smaller by 2020.

In 2005, Country A had the highest rate at 55%, followed by Country B at 40% and Country C at 25%, while Country D had the lowest at just 15%.

By 2020, Country A remained highest at 95%, with Country B close behind at 90% and Country C at 80%. Country D increased the most, rising from 15% to 75%.

In summary, all countries improved considerably, but Country D made the biggest progress of all.`,
        explanation: 'A clear Band 6.5-7 report: it states an overview, covers all four countries in both years, and uses reasonable comparative phrasing ("followed by", "close behind"). It stays mid-range because the description proceeds fairly mechanically through the figures rather than grouping or prioritising the most striking comparisons.',
      },
      {
        band: 9,
        text: `The bar chart charts the proportion of households with internet access across four countries, A to D, comparing figures from 2005 with those from 2020 — and the fifteen years between them tell a story of near-universal catch-up.

Overall, every country registered substantial growth over the period, though the size of that growth varied considerably, leaving the four countries far closer together by 2020 than they had been at the outset.

In 2005, the gap between countries was stark: Country A led comfortably with 55% household internet access, trailed by Country B at 40% and Country C at 25%, while Country D lagged well behind the rest at just 15%. This was a landscape of clear haves and have-nots.

By 2020, that hierarchy had largely dissolved. Country A remained nominally in front, but its lead had narrowed considerably as it reached 95%; Country B followed closely at 90%, and Country C climbed to 80%. The most dramatic shift, however, belonged to Country D, whose access rate rose fivefold, from 15% to 75% — by far the steepest increase of any country shown, and one that brought it within striking distance of the others despite its late start.

Taken together, the data point to a broad convergence: while Country A never relinquished its lead, the real story of these fifteen years is how dramatically the laggards, particularly Country D, closed the gap.`,
        explanation: 'A strong Band 8.5-9 response: the overview names the underlying pattern (convergence) rather than merely "increase", and the report closes by explicitly stating what the data mean as a whole rather than just restating the last figures. Vocabulary is precise and varied ("a landscape of clear haves and have-nots", "within striking distance"), and grammar shows genuine range — colon-led elaboration, semicolon-joined comparison, a calculated figure ("rose fivefold") rather than a bare percentage — used accurately throughout.',
      },
    ],
  },
  {
    id: 'w1-pie-chart-energy',
    task: 1,
    category: 'pie-chart',
    prompt: 'The two pie charts below show the main sources of energy production in a country in 1990 and in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 1990, coal accounted for 50% of energy production, oil 25%, natural gas 15%, and renewables just 10%. By 2020, coal had fallen to 20%, oil to 15%, natural gas had risen slightly to 20%, and renewables had grown substantially to 45%, becoming the largest single source.',
    chartData: {
      kind: 'pie',
      charts: [
        { title: '1990', slices: [{ name: 'Coal', value: 50 }, { name: 'Oil', value: 25 }, { name: 'Natural gas', value: 15 }, { name: 'Renewables', value: 10 }] },
        { title: '2020', slices: [{ name: 'Coal', value: 20 }, { name: 'Oil', value: 15 }, { name: 'Natural gas', value: 20 }, { name: 'Renewables', value: 45 }] },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 4.5,
        text: `The pie chart show energy source in 1990 and 2020.

In 1990, coal is 50%, this is biggest. Oil is 25%. Gas is 15% and renewable is 10%, this is smallest.

In 2020, coal go down to 20%. Renewable go up to 45% and become biggest now.

Overall renewable energy increase a lot and coal decrease a lot in this time.`,
        explanation: 'Roughly Band 4.5-5: the figures for both years are reported and a brief overview is given, but sentences are short, repetitive ("is biggest", "go down", "go up") and rely on the present tense throughout despite describing change over thirty years. Basic errors with verb forms and subject-verb agreement occur consistently.',
      },
      {
        band: 6.5,
        text: `The two pie charts show the main sources of energy production in a country in 1990 and 2020.

Overall, coal's share of energy production decreased a lot, while renewable energy increased and became the largest source by 2020.

In 1990, coal was the largest source, making up 50% of production, followed by oil at 25%, natural gas at 15%, and renewables at only 10%.

By 2020, this had changed considerably. Coal fell to 20%, oil dropped slightly to 15%, natural gas rose a little to 20%, and renewables increased significantly to 45%, becoming the biggest source of energy.

In summary, renewable energy replaced coal as the main source of energy production over the thirty-year period.`,
        explanation: 'A solid Band 6.5-7 answer: both pie charts are described with an overview and accurate figures, using appropriate past tense and some comparative language. It remains mid-range because the description works through each slice in a fairly uniform pattern without picking out the most significant contrast more sharply.',
      },
      {
        band: 9,
        text: `The two pie charts contrast a country's sources of energy production in 1990 with the same breakdown thirty years later, and the shift between them amounts to a near-total reordering of priorities.

In 1990, coal was overwhelmingly dominant, generating exactly half of all energy produced, with oil a distant second at 25%. Natural gas contributed a modest 15%, while renewable sources — solar, wind and the like — barely registered at just 10% of the total, a marginal presence in an energy mix still built almost entirely around fossil fuels.

By 2020, that picture had been substantially redrawn. Coal's share had more than halved, falling to just 20%, while oil slipped more modestly to 15%. Natural gas edged up slightly to 20%, roughly matching coal's diminished share. The standout change, however, was renewables: from a negligible 10% in 1990, they had grown to account for 45% of total production by 2020 — comfortably the largest single source, and a complete reversal of coal's former dominance.

In essence, these three decades saw the country's energy mix pivot decisively away from coal and towards renewables, which overtook every other source to become, by 2020, the backbone of the country's energy supply.`,
        explanation: 'A strong Band 8.5-9 response: the overview names the pattern precisely ("a near-total reordering of priorities") rather than describing it vaguely, and each figure is framed comparatively rather than listed ("more than halved", "roughly matching coal\'s diminished share"). Vocabulary is idiomatic and exact ("barely registered", "the backbone of the country\'s energy supply"), and a genuinely wide range of grammar — em-dash asides, participial phrases, varied clause openings — is used with full accuracy.',
      },
    ],
  },
  {
    id: 'w1-table-spending',
    task: 1,
    category: 'table',
    prompt: 'The table below shows the average monthly household spending (in local currency) on food, housing, transport and entertainment in three cities. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'City X: food 400, housing 900, transport 200, entertainment 150. City Y: food 350, housing 1200, transport 250, entertainment 100. City Z: food 300, housing 600, transport 150, entertainment 200. Housing is the largest expense in every city, and City Y has by far the highest housing cost of the three.',
    chartData: {
      kind: 'table',
      columns: ['City', 'Food', 'Housing', 'Transport', 'Entertainment'],
      rows: [
        ['City X', 400, 900, 200, 150],
        ['City Y', 350, 1200, 250, 100],
        ['City Z', 300, 600, 150, 200],
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 4.5,
        text: `The table show money that people spend in three city for food, house, transport and fun.

City Y spend most for house, 1200. City Z spend less for house, only 600.

For food, city X spend most, 400. For transport, all city similar, around 150 to 250.

Overall house is the biggest cost in all city, especially in city Y.`,
        explanation: 'Around Band 4.5-5: the largest single figure (housing) is correctly picked out and a basic overview is offered, but food, transport and entertainment are covered only briefly or not compared at all. Grammar remains simple and error-prone throughout ("city Y spend", "all city similar"), and connecting language between figures is minimal.',
      },
      {
        band: 6.5,
        text: `The table shows average monthly household spending on food, housing, transport and entertainment in three cities, X, Y and Z.

Overall, housing was the biggest expense in every city, and spending on food, transport and entertainment was fairly similar between the cities.

City X spent the most on food, at 400 units, compared with 350 in City Y and 300 in City Z. Housing costs varied more: City Y spent 1,200 units, much higher than City X's 900 and City Z's 600.

Transport spending ranged from 150 to 250 units across the three cities, while entertainment spending was highest in City Z at 200 units and lowest in City Y at 100.

In summary, City Y had by far the highest housing costs of the three cities.`,
        explanation: 'A clear Band 6.5-7 report: it gives an overview, covers every category for all three cities, and includes some direct comparison ("much higher than"). It doesn\'t move higher because the description reads as a fairly even list of figures rather than foregrounding the single most significant contrast.',
      },
      {
        band: 9,
        text: `The table breaks down average monthly household spending, in local currency, across four categories — food, housing, transport and entertainment — for three cities, X, Y and Z, and housing emerges as the clearest point of contrast between them.

Food spending followed a fairly narrow band across all three cities: City X households spent the most, at 400 units a month, only slightly ahead of City Y's 350 and City Z's 300 — a difference unlikely to reflect anything more than modest local price variation.

Housing costs told a very different story. City Y households spent 1,200 units monthly, dramatically more than City X's 900 and more than double City Z's comparatively modest 600 — a gap far too large to be incidental, and one that likely reflects genuine differences in local property markets between the three cities.

Transport spending sat in a comparable range throughout, from 150 units in City Z to 250 in City Y, with City X falling neatly in between at 200. Entertainment reversed the pattern seen elsewhere: City Z households, despite spending the least on housing, spent the most on entertainment at 200 units, compared with 150 in City X and just 100 in City Y.

Overall, while food, transport and entertainment spending varied only modestly between the three cities, housing costs diverged sharply, with City Y's households facing by far the heaviest financial burden of the three.`,
        explanation: 'A strong Band 8.5-9 response: rather than listing categories in order, it groups them by how much they actually vary ("followed a fairly narrow band" vs. "a very different story"), and explicitly notes the one genuinely interesting reversal (City Z low on housing, high on entertainment) instead of treating every figure as equally significant. Vocabulary is precise and analytical ("unlikely to reflect anything more than", "a gap far too large to be incidental"), and grammar shows real range with no error affecting meaning.',
      },
    ],
  },
  {
    id: 'w1-process-water',
    task: 1,
    category: 'process',
    prompt: 'The diagram below shows the process of how rainwater is collected and treated to become drinking water. Summarise the information by selecting and reporting the main features.',
    dataDescription: 'Rain falls onto a collection area and flows into a reservoir. From the reservoir, water passes through a screening stage that removes large debris, then through a series of sand and carbon filters that remove smaller particles. The filtered water is then disinfected with chlorine before being pumped into a storage tank, from which it is distributed to homes through underground pipes.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 5,
        text: `The diagram show how rain water become drink water.

First, rain fall to the ground and go to reservoir. After that, water go through filter for clean the dirty thing.

Then chemical put in water for kill bacteria. Last, water go to house through pipe.

Overall the water go through many step before people can drink it.`,
        explanation: 'Around Band 5: the stages are listed in the correct order and an overview is attempted, but the description of each stage is very brief with little technical detail (no mention of screening vs. filtration as separate steps, for example). Simple, repeated connectors ("First", "After that", "Then", "Last") and basic grammar errors keep this response in the lower band.',
      },
      {
        band: 6.5,
        text: `The diagram shows the process of turning rainwater into drinking water, from collection to distribution.

Overall, the process involves several stages, including collection, filtering, disinfection and distribution to homes.

First, rain falls into a collection area and flows into a reservoir, where it is stored. The water then passes through a screening stage to remove large debris, followed by filtration through sand and carbon to remove smaller particles.

After filtration, the water is disinfected with chlorine to kill bacteria and make it safe to drink. Finally, the clean water is stored in a tank and sent to homes through underground pipes.

In summary, rainwater goes through several cleaning and treatment stages before it becomes safe drinking water for households.`,
        explanation: 'A competent Band 6.5-7 description: the stages are covered in the correct sequence with reasonably varied sequencing language ("First", "followed by", "After", "Finally") and adequate technical vocabulary (screening, filtration, disinfected). It sits mid-range because the explanation of each stage stays fairly brief rather than fully elaborated.',
      },
      {
        band: 9,
        text: `The diagram sets out the journey rainwater takes from the sky to the kitchen tap, tracing five distinct stages between initial collection and final delivery to homes.

The process begins, unsurprisingly, with rainfall itself: water falling onto a collection area drains into a reservoir, where it is held before any treatment takes place. From there it passes through a screening stage, a relatively crude filter whose sole purpose is removing larger debris — leaves, twigs and similar solid matter — before the water proceeds any further.

What follows is a more rigorous filtration stage, in which the water is passed through successive layers of sand and carbon. These finer filters strip out the smaller particles and impurities that screening alone would let through, leaving the water considerably cleaner but not yet safe to drink. That final step of safety comes next, as the filtered water is disinfected with chlorine — a chemical treatment that eliminates bacteria and other microorganisms capable of causing illness.

Only once disinfection is complete is the water considered fit for consumption. It is then pumped into a storage tank, from which a network of underground pipes finally carries it into homes, completing a journey that began, several stages earlier, as nothing more than rain falling from the sky.`,
        explanation: 'A strong Band 8.5-9 response: each stage is distinguished from the next by its actual function ("a relatively crude filter" vs. "a more rigorous filtration stage") rather than named as an undifferentiated list, and the report closes by circling back to its opening image, giving it genuine shape. Passive voice is used throughout, appropriately, since the process happens TO the water rather than the water doing anything itself, and vocabulary is precise and technical (disinfected, microorganisms, strip out) without ever feeling like a vocabulary display.',
      },
    ],
  },
  {
    id: 'w1-letter-faulty-item',
    task: 1,
    category: 'letter',
    prompt: 'You recently bought a piece of electronic equipment from a shop, but it does not work properly. Write a letter to the shop manager. In your letter: describe the item you bought, explain what is wrong with it, say what you would like the manager to do.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 5,
        text: `Dear Manager,

I write this letter because I have problem with item I buy in your shop.

I buy a speaker last week but it not work good. Sound stop sometime and connect problem with my phone.

I want you give me new speaker or give back my money. I have the receipt.

Please answer me soon.

Thank you,
[Your name]`,
        explanation: 'Roughly Band 4.5-5: the letter covers the three required points (what was bought, what\'s wrong, what the writer wants) but very briefly, with a tone that is too informal for a complaint letter ("Dear Manager" rather than "Dear Sir or Madam", "I write this letter"). Grammar errors appear in almost every sentence ("it not work good", "give me new speaker"), though the request is still understandable.',
      },
      {
        band: 6.5,
        text: `Dear Sir or Madam,

I am writing to tell you about a problem with an item I bought from your shop recently.

Last week, I bought a Bluetooth speaker from your shop, but it does not work properly. The sound keeps stopping and it often loses connection with my phone, even after I tried resetting it.

Because of this problem, I would like to ask for a replacement or a refund. I still have the receipt and can bring the speaker back to the shop if needed.

I hope to hear from you soon regarding this matter.

Yours faithfully,
[Your name]`,
        explanation: 'A solid Band 6.5-7 letter: it uses an appropriately formal opening and closing, and covers all three required points clearly. Grammar and vocabulary are accurate throughout, but the language stays fairly plain and formulaic rather than showing the more natural, varied phrasing of a higher-band response.',
      },
      {
        band: 9,
        text: `Dear Sir or Madam,

I am writing to inform you of a problem with an item I purchased from your shop last week.

On 10 March, I bought a wireless bluetooth speaker from your electronics department for approximately 60 dollars. Unfortunately, since bringing it home, I have found that the speaker frequently disconnects from my phone and the sound cuts out every few minutes, even when the device is fully charged and positioned close by. I have tried resetting it and reading through the instruction manual, but the problem persists and the speaker is essentially unusable in its current condition.

As this item was clearly faulty when purchased, I would like to request either a full replacement with a working model or a complete refund, whichever you are able to offer more quickly. I still have the original receipt and packaging, and I am happy to bring the speaker back to the shop at your convenience.

I would appreciate a prompt response, as I purchased this item for an upcoming trip and would like the matter resolved as soon as possible.

Thank you for your attention to this matter, and I look forward to hearing from you soon.

Yours faithfully,
[Your name]`,
        explanation: 'A strong Band 8.5-9 letter: every required point is developed with specific, concrete detail (a date, a price, exactly how the fault manifests) rather than stated in outline, and the request is framed with a reasonable justification ("as I purchased this item for an upcoming trip") rather than a bare demand. Tone is consistently, naturally formal throughout, and grammar shows real range — conditional framing, precise time expressions, varied sentence length — with no error at all.',
      },
    ],
  },
  {
    id: 'w1-letter-visit-friend',
    task: 1,
    category: 'letter',
    prompt: 'You are going to visit a friend who lives in another country. Write a letter to your friend. In your letter: give the dates you plan to visit, explain what you would like to do during the visit, ask if there is anything you should bring.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 5,
        text: `Dear Alex,

How are you? I want to tell you I will visit you soon, from 14 July to 21 July.

I want we go to see the city and eat some food together. Also can you tell me the weather? I don't know what to bring.

I am very happy to see you soon.

Best wishes,
[Your name]`,
        explanation: 'Around Band 5: all three points (dates, plans, question about what to bring) are covered, so the task is minimally complete, but each point receives only a short, simple sentence with little elaboration. Grammatical errors are frequent ("I want we go", "the weather?") and the tone, while friendly, relies on very basic phrasing throughout.',
      },
      {
        band: 6.5,
        text: `Dear Alex,

I hope you are doing well. I'm happy to tell you that I have booked my flight, and I will be visiting you from 14 to 21 July.

During my visit, I would love to explore the city with you, maybe visit some local markets and try some traditional food together. I'm really looking forward to spending time with you again.

Could you also let me know what the weather is usually like in July? I want to pack the right clothes, and I'm not sure if I should bring anything warm for the evenings.

Thank you again, and I can't wait to see you soon!

Best wishes,
[Your name]`,
        explanation: 'A friendly, clearly organised Band 6.5-7 letter: all three bullet points are addressed with reasonable detail and an appropriately informal tone. It remains mid-range because the phrasing, while accurate, stays fairly conventional rather than showing the more natural, idiomatic warmth of a higher-band letter.',
      },
      {
        band: 9,
        text: `Dear Alex,

I hope you're doing well! I'm delighted to let you know that I've finally booked my flights, and I'll be arriving to visit you from 14 to 21 July. I can hardly wait to see you again after so long!

During my stay, I'd love to explore the city with you, especially any local markets or historic areas you think I'd enjoy. I've heard so much about the old town from your photos, and I'd really like to see it in person. If possible, it would also be wonderful to try some traditional local dishes together, perhaps at a restaurant you'd recommend, since I always trust your taste in food more than any guidebook.

As for what I should bring, could you let me know what the weather is usually like in July? I want to pack appropriately, and I'm not sure whether I'll need anything warmer for the evenings. Also, please tell me if there's anything from home you'd like me to bring for you, since it's been a while since your last visit here.

Thank you again for having me — I'm really looking forward to catching up properly and making some great memories together.

Take care,
[Your name]`,
        explanation: 'A strong Band 8.5-9 letter: each point is developed with a personal, specific touch (photos of the old town, "I always trust your taste in food more than any guidebook") rather than a plain statement, and the tone throughout reads as genuinely warm rather than a formula filled in. Contractions, idiomatic phrasing ("I can hardly wait", "catching up properly") and varied sentence length all contribute to a natural, native-like register, with no grammatical error anywhere in the letter.',
      },
    ],
  },
  {
    id: 'w1-letter-time-off',
    task: 1,
    category: 'letter',
    prompt: 'You recently started a new job and would like to request a few days off. Write a letter to your manager. In your letter: explain why you need the time off, give the dates you would like to take, suggest how your work will be covered while you are away.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 5,
        text: `Dear Ms Carter,

I want ask you for some day off from work.

I have family problem and I need go for 3 day, from 22 May to 24 May. I will tell my work to my colleague before I go, so is okay.

I hope you say yes for this.

Thank you,
[Your name]`,
        explanation: 'About Band 4.5-5: the letter covers the required points briefly (reason, dates, coverage plan) but with minimal detail and a tone that is not consistently formal enough for a request to a manager ("I want ask you", "is okay"). Grammar errors are frequent, including missing auxiliary verbs and articles.',
      },
      {
        band: 6.5,
        text: `Dear Ms Carter,

I am writing to request a few days off work due to a personal family matter.

I would like to take three days of leave, from 22 to 24 May, if possible. I know this is important, so I will prepare notes on my current projects and ask a colleague to help cover my work while I am away.

I understand this request is quite soon after starting my job, and I apologise for any inconvenience. Please let me know if we can discuss this further.

Thank you for considering my request.

Yours sincerely,
[Your name]`,
        explanation: 'A well-structured Band 6.5-7 letter: it uses appropriately formal language, states clear dates, and offers a sensible plan for covering the work. It doesn\'t reach a higher band because the sentences, while accurate, follow a fairly predictable pattern without the more nuanced tone a higher-band letter would show.',
      },
      {
        band: 9,
        text: `Dear Ms. Carter,

I am writing to request a short period of leave from work due to a personal matter that requires my attention.

I recently started my role in the marketing team last month, and I have greatly enjoyed settling into the position so far. However, a family commitment has arisen that I need to attend to in person, and I would like to request three days of leave, from 22 to 24 May, if this is possible.

To ensure my work is not disrupted during my absence, I have already begun preparing detailed notes on my current projects, including the status of the spring campaign, which I can hand over to a colleague before I leave. I would be happy to remain reachable by email for any urgent matters, and I am confident that my responsibilities can be covered by Daniel, who is already familiar with much of the campaign's background.

I understand this request comes relatively early in my time with the company, and I apologise for any inconvenience it may cause. I would be grateful if we could discuss this further at your earliest convenience.

Thank you very much for your understanding.

Yours sincerely,
[Your name]`,
        explanation: 'A strong Band 8.5-9 letter: the coverage plan names a specific colleague and a specific project rather than a vague "someone will cover it", and the letter proactively acknowledges the awkwardness of the timing ("I understand this request comes relatively early") rather than ignoring it. Register is consistently professional and natural throughout, with a wide range of accurate structures (relative clauses, conditional framing, formal set phrases used correctly) and no error of any kind.',
      },
    ],
  },
  {
    id: 'w1-map-town',
    task: 1,
    category: 'map',
    prompt: 'The maps below show the layout of a small town in 1995 and the same town in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 1995, the town centre had a small market square surrounded by a post office, a school, and open farmland to the north and east. By 2020, the market square has been replaced by a shopping centre, the farmland to the north has become a residential housing estate, the school has doubled in size, and a new road bypasses the town centre to the east, where the open farmland used to be.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 4.5,
        text: `The map show town in 1995 and 2020.

In 1995, town center have market and school. Around have farmland.

In 2020, market become shopping center. Farmland become house. School is more big now. New road also build.

Overall the town change a lot and become more modern.`,
        explanation: 'Around Band 4.5-5: the main changes are identified, so the response covers the key content, but each change is described in a very short, simple sentence without location detail (north/east) or clear comparative language. Grammar errors (missing verbs, plurals) appear throughout, and vocabulary is limited and repetitive ("become").',
      },
      {
        band: 6.5,
        text: `The two maps show how a small town changed between 1995 and 2020.

Overall, the town became more developed, with farmland replaced by housing and new infrastructure added.

In 1995, the town centre had a market square surrounded by a post office and a school, with open farmland to the north and east.

By 2020, the market square had been replaced by a shopping centre, and the farmland to the north had become a housing estate. The school had also become bigger, and a new road was built to the east, where the farmland used to be.

In summary, the town changed a lot in twenty-five years, with new shops, houses and roads replacing the farmland shown on the first map.`,
        explanation: 'A clear Band 6.5-7 description: it gives an overview and covers every major change with appropriate change-of-state language ("had been replaced by", "had become"). It stays mid-range because the description moves through changes in a fairly listed fashion rather than organising them more analytically by area or theme.',
      },
      {
        band: 9,
        text: `The two maps illustrate how a small town changed between 1995 and 2020.

Overall, the town became considerably more developed over the twenty-five-year period, with agricultural land giving way to housing and commercial development, and new transport infrastructure added to the east.

In 1995, the town centre was arranged around a small market square, which was surrounded by a post office and a school. To the north and east of the town centre lay open farmland, with no significant development in either direction.

By 2020, substantial changes had taken place. The market square had been completely replaced by a shopping centre, reflecting a shift from traditional trade towards modern retail. The farmland to the north had also disappeared, having been transformed into a residential housing estate to accommodate a growing population. In addition, the school had doubled in size, suggesting an increase in the number of school-age children in the area. Finally, a new road had been built to the east of the town centre, bypassing it entirely, on land that had previously been open farmland.

In summary, the once rural town evolved considerably by 2020, with new housing, retail and road infrastructure replacing much of the farmland and traditional town-centre buildings that existed in 1995.`,
        explanation: 'A strong Band 8.5-9 response: every change is organised by location (centre, north, east) as the maps themselves are, and each is paired with a plausible inference about why it happened ("reflecting a shift from traditional trade towards modern retail", "suggesting an increase in the number of school-age children") rather than stated as a bare fact — appropriate for Task 1 as reasonable interpretation of what a map shows, not speculation beyond the data. Grammar shows genuine range (past perfect throughout for completed change, participial phrases, varied sentence openings) with full accuracy.',
      },
    ],
  },
  {
    id: 'w1-bar-chart-exercise',
    task: 1,
    category: 'bar-chart',
    prompt: 'The bar chart below shows the average number of hours per week that people in four age groups spent exercising in 2000 and in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 2000, the 18-29 age group exercised the most at 6 hours per week, followed by 30-44 at 4 hours, 45-59 at 2.5 hours, and 60+ at 1.5 hours. By 2020, exercise hours had fallen for the two younger groups (18-29 down to 4.5 hours, 30-44 down to 3 hours) but risen for the two older groups (45-59 up to 3.5 hours, 60+ up to 3 hours), narrowing the gap between all four groups considerably.',
    chartData: {
      kind: 'bar',
      categories: ['18-29', '30-44', '45-59', '60+'],
      unit: 'hours/week',
      series: [
        { name: '2000', values: [6, 4, 2.5, 1.5] },
        { name: '2020', values: [4.5, 3, 3.5, 3] },
      ],
    },
    minWords: 150,
    timeMinutes: 20,
    sampleAnswers: [
      {
        band: 4.5,
        text: `The chart show hour of exercise for four age group in 2000 and 2020.

In 2000, young people exercise most, 6 hour. Old people exercise less, 1.5 hour.

In 2020, young people exercise less than before. Old people exercise more than before.

Overall exercise habit change between young and old people.`,
        explanation: 'Roughly Band 4.5-5: the general direction of change is noted, but only two of the four age groups are given specific figures, and the description relies on very simple, repeated sentence patterns ("exercise most", "exercise less"). Grammar errors (missing plurals on "hour", simple present used throughout) are frequent.',
      },
      {
        band: 6.5,
        text: `The bar chart shows average weekly exercise hours for four age groups in 2000 and 2020.

Overall, younger people exercised less in 2020 than in 2000, while older people exercised more, so the difference between the age groups became smaller.

In 2000, the 18-29 group exercised the most, at 6 hours a week, compared with 4 hours for the 30-44 group, 2.5 hours for the 45-59 group, and only 1.5 hours for the 60+ group.

By 2020, the 18-29 group had dropped to 4.5 hours and the 30-44 group to 3 hours, while the 45-59 group rose to 3.5 hours and the 60+ group nearly doubled to 3 hours.

In summary, exercise habits became more similar across all four age groups by 2020.`,
        explanation: 'A solid Band 6.5-7 report: it gives a clear overview of the overall trend and reports specific figures for every age group in both years, using accurate comparative language. It remains mid-range because the presentation follows a fairly uniform, list-like pattern rather than more selectively highlighting the single most notable feature.',
      },
      {
        band: 9,
        text: `The bar chart compares average weekly exercise hours across four age groups in 2000 and 2020, and the two decades reveal a striking role reversal between younger and older generations.

In 2000, exercise habits followed an entirely predictable pattern: the youngest group, aged 18-29, exercised the most by a wide margin, averaging 6 hours a week, more than the 30-44 group's 4 hours. Exercise levels fell steadily with age from there, with the 45-59 group managing just 2.5 hours and the over-60s trailing at only 1.5 hours weekly.

Twenty years later, that pattern had all but inverted. Exercise levels among the two younger groups actually declined — the 18-29 group fell to 4.5 hours and the 30-44 group to 3 — while the two older groups moved decisively in the opposite direction: the 45-59 group rose to 3.5 hours, and the over-60s very nearly doubled their figure, climbing to 3 hours a week, matching the middle-aged group entirely.

What is most notable is not any single figure but the overall convergence: a four-hour gap separating the most and least active groups in 2000 had narrowed to barely more than one hour by 2020, as declining activity among the young and rising activity among the old brought all four groups within close reach of one another.`,
        explanation: 'A strong Band 8.5-9 response: the overview names the actual pattern (a "role reversal") rather than a generic "changed", and the closing paragraph explicitly identifies the single most significant feature — the narrowing gap — as more important than any individual figure, exactly what a high-band overview/conclusion should do. Vocabulary is precise ("trailing at", "moved decisively in the opposite direction"), and grammar shows real range, including an em-dash-led aside and a calculated comparison ("matching the middle-aged group entirely") that goes beyond the raw data to note its significance.',
      },
    ],
  },
];

/** A random prompt, optionally restricted to one task. */
export function randomIeltsWritingQuestion(task?: IeltsTask): IeltsWritingQuestion | null {
  const pool = task ? ieltsWritingQuestions.filter((q) => q.task === task) : ieltsWritingQuestions;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
