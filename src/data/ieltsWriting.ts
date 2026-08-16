// IELTS Writing prompts — static, hand-written content shipped in the client
// bundle, the same as IELTS Speaking/Daily Dialogue/Podcast (englishIelts.ts,
// englishDialogues.ts, englishPodcasts.ts). Not a table, not user-created:
// scoring an essay against one of these is a Pro feature (ai-ielts-writing),
// but reading the prompts themselves is free and needs no network call.

export type IeltsTask = 1 | 2;

export interface IeltsWritingQuestion {
  id: string;
  task: IeltsTask;
  /** Task 2: opinion | discussion | advantages-disadvantages | problem-solution | two-part
   *  Task 1: line-graph | bar-chart | pie-chart | table | process | map | letter */
  category: string;
  prompt: string;
  /** Task 1 only — the chart/table/process/map the prompt refers to, described
   *  in words: there's no chart renderer here, so this stands in for the
   *  image an academic Task 1 question would normally show. */
  dataDescription?: string;
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
  },
  {
    id: 'w2-discussion-language',
    task: 2,
    category: 'discussion',
    prompt: 'Some people believe that children should begin learning a foreign language as soon as they start school, while others think it is better to wait until secondary school. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-adv-dis-remote-work',
    task: 2,
    category: 'advantages-disadvantages',
    prompt: 'More and more people are choosing to work from home instead of commuting to an office. What are the advantages and disadvantages of this trend?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-problem-solution-traffic',
    task: 2,
    category: 'problem-solution',
    prompt: 'Traffic congestion is becoming a serious problem in many major cities around the world. What are the causes of this problem, and what measures could be taken to solve it?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-two-part-waste',
    task: 2,
    category: 'two-part',
    prompt: 'In many countries, the amount of waste produced by households continues to increase every year. Why do you think this is happening? What can be done to reduce household waste?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-opinion-community-service',
    task: 2,
    category: 'opinion',
    prompt: "Some people believe that unpaid community service should be a compulsory part of every student's education. To what extent do you agree or disagree?",
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-discussion-culture',
    task: 2,
    category: 'discussion',
    prompt: 'Some people think that the best way to learn about other cultures is to travel abroad, while others believe that books, films and the internet are just as effective. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-adv-dis-online-shopping',
    task: 2,
    category: 'advantages-disadvantages',
    prompt: 'A growing number of people are choosing to buy products online rather than in physical shops. What are the advantages and disadvantages of this development?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-problem-solution-pollution',
    task: 2,
    category: 'problem-solution',
    prompt: 'Air pollution is a growing problem in many large cities. What are the main causes of this problem, and what can individuals and governments do to address it?',
    minWords: 250,
    timeMinutes: 40,
  },
  {
    id: 'w2-two-part-social-media',
    task: 2,
    category: 'two-part',
    prompt: 'Many young people today spend a large amount of their free time on social media. Why has this become so popular? Is this a positive or negative development?',
    minWords: 250,
    timeMinutes: 40,
  },

  // ── Task 1: reports & letters (150 words, 20 min) ───────────────
  {
    id: 'w1-line-graph-museums',
    task: 1,
    category: 'line-graph',
    prompt: 'The line graph below shows information about the number of visitors to three different museums in a city between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'Museum A rises steadily from about 100,000 visitors in 2000 to a peak of 420,000 in 2010, then declines gradually to around 300,000 by 2020. Museum B stays roughly flat between 150,000 and 180,000 visitors for the whole period. Museum C starts lowest at about 50,000 in 2000, climbs sharply after 2012, and overtakes both other museums by 2018, reaching 450,000 in 2020.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-bar-chart-internet',
    task: 1,
    category: 'bar-chart',
    prompt: 'The bar chart below shows the percentage of households with internet access in four countries in 2005 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 2005, internet access ranged from 15% of households in Country D to 55% in Country A, with Country B at 40% and Country C at 25%. By 2020, all four countries show large increases: Country A reaches 95%, Country B 90%, Country C 80%, and Country D shows the biggest relative jump, rising to 75%.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-pie-chart-energy',
    task: 1,
    category: 'pie-chart',
    prompt: 'The two pie charts below show the main sources of energy production in a country in 1990 and in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 1990, coal accounted for 50% of energy production, oil 25%, natural gas 15%, and renewables just 10%. By 2020, coal had fallen to 20%, oil to 15%, natural gas had risen slightly to 20%, and renewables had grown substantially to 45%, becoming the largest single source.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-table-spending',
    task: 1,
    category: 'table',
    prompt: 'The table below shows the average monthly household spending (in local currency) on food, housing, transport and entertainment in three cities. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'City X: food 400, housing 900, transport 200, entertainment 150. City Y: food 350, housing 1200, transport 250, entertainment 100. City Z: food 300, housing 600, transport 150, entertainment 200. Housing is the largest expense in every city, and City Y has by far the highest housing cost of the three.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-process-water',
    task: 1,
    category: 'process',
    prompt: 'The diagram below shows the process of how rainwater is collected and treated to become drinking water. Summarise the information by selecting and reporting the main features.',
    dataDescription: 'Rain falls onto a collection area and flows into a reservoir. From the reservoir, water passes through a screening stage that removes large debris, then through a series of sand and carbon filters that remove smaller particles. The filtered water is then disinfected with chlorine before being pumped into a storage tank, from which it is distributed to homes through underground pipes.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-letter-faulty-item',
    task: 1,
    category: 'letter',
    prompt: 'You recently bought a piece of electronic equipment from a shop, but it does not work properly. Write a letter to the shop manager. In your letter: describe the item you bought, explain what is wrong with it, say what you would like the manager to do.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-letter-visit-friend',
    task: 1,
    category: 'letter',
    prompt: 'You are going to visit a friend who lives in another country. Write a letter to your friend. In your letter: give the dates you plan to visit, explain what you would like to do during the visit, ask if there is anything you should bring.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-letter-time-off',
    task: 1,
    category: 'letter',
    prompt: 'You recently started a new job and would like to request a few days off. Write a letter to your manager. In your letter: explain why you need the time off, give the dates you would like to take, suggest how your work will be covered while you are away.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-map-town',
    task: 1,
    category: 'map',
    prompt: 'The maps below show the layout of a small town in 1995 and the same town in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 1995, the town centre had a small market square surrounded by a post office, a school, and open farmland to the north and east. By 2020, the market square has been replaced by a shopping centre, the farmland to the north has become a residential housing estate, the school has doubled in size, and a new road bypasses the town centre to the east, where the open farmland used to be.',
    minWords: 150,
    timeMinutes: 20,
  },
  {
    id: 'w1-bar-chart-exercise',
    task: 1,
    category: 'bar-chart',
    prompt: 'The bar chart below shows the average number of hours per week that people in four age groups spent exercising in 2000 and in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 2000, the 18-29 age group exercised the most at 6 hours per week, followed by 30-44 at 4 hours, 45-59 at 2.5 hours, and 60+ at 1.5 hours. By 2020, exercise hours had fallen for the two younger groups (18-29 down to 4.5 hours, 30-44 down to 3 hours) but risen for the two older groups (45-59 up to 3.5 hours, 60+ up to 3 hours), narrowing the gap between all four groups considerably.',
    minWords: 150,
    timeMinutes: 20,
  },
];

/** A random prompt, optionally restricted to one task. */
export function randomIeltsWritingQuestion(task?: IeltsTask): IeltsWritingQuestion | null {
  const pool = task ? ieltsWritingQuestions.filter((q) => q.task === task) : ieltsWritingQuestions;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
