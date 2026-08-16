// IELTS Writing prompts — static, hand-written content shipped in the client
// bundle, the same as IELTS Speaking/Daily Dialogue/Podcast (englishIelts.ts,
// englishDialogues.ts, englishPodcasts.ts). Not a table, not user-created:
// scoring an essay against one of these is a Pro feature (ai-ielts-writing),
// but reading the prompt, its chart, the sample answer and the tips is free
// and needs no network call.

import type { IeltsChartData } from '../components/IeltsChart';

export type IeltsTask = 1 | 2;

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
  /** A model response — band 8-9 quality, close to the target word count. */
  sampleAnswer: string;
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
    sampleAnswer: `Governments around the world face difficult choices about how to spend limited transport budgets. While some argue that road-building should remain a priority, I firmly believe that investment should be directed primarily towards public transportation.

The most compelling argument for this view is environmental. Private cars are a major source of urban air pollution and greenhouse gas emissions, whereas buses, trams and trains can move far more people using a fraction of the fuel per passenger. By expanding and improving public transport networks, governments can encourage a shift away from car dependency, which in turn reduces both emissions and traffic congestion.

A second consideration is efficiency. Building new roads is enormously expensive, and evidence from many cities shows that additional road capacity is quickly filled by extra traffic, a phenomenon known as induced demand. Money spent on new motorways therefore often fails to solve congestion in the long run. Public transport, by contrast, offers a more permanent solution: a single railway line can carry as many passengers per hour as several lanes of highway, at a fraction of the ongoing cost.

There is also a social justice dimension to this debate. Not everyone can afford to own and run a car, and reliable, affordable public transport gives lower-income citizens, the elderly and people with disabilities equal access to jobs, education and healthcare. Prioritising roads, which mainly benefit car owners, tends to widen this gap rather than close it.

In conclusion, although road maintenance cannot be ignored altogether, I strongly agree that public transportation should receive the greater share of government spending, since it addresses environmental, economic and social needs more effectively than road expansion alone.`,
  },
  {
    id: 'w2-discussion-language',
    task: 2,
    category: 'discussion',
    prompt: 'Some people believe that children should begin learning a foreign language as soon as they start school, while others think it is better to wait until secondary school. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `There is ongoing debate about the best time for children to start learning a foreign language, with some parents favouring an early start in primary school and others preferring to wait until secondary education. This essay will examine both perspectives before presenting my own view.

Those who support introducing a foreign language from the first years of school point to the remarkable ability young children have to absorb new sounds and grammar patterns almost effortlessly. At this age, learning often happens through play, songs and repetition rather than formal study, so children tend to develop natural pronunciation and a positive attitude towards the language without feeling pressured.

On the other hand, advocates of waiting until secondary school argue that older students already have a solid grasp of their first language, along with more developed reading, writing and analytical skills. This allows them to learn grammar rules more consciously and progress faster in a shorter period of time. There is also a practical argument: primary schools often lack teachers who are properly trained to teach languages, so an early start can be poorly implemented.

In my opinion, starting early is generally preferable, provided that the teaching is engaging and age-appropriate. The advantages of natural pronunciation and long-term exposure tend to outweigh the benefits of starting later, and a language introduced playfully in primary school need not come at the expense of other subjects.

To conclude, while both approaches have merit, I believe an early introduction to language learning, supported by well-trained teachers, offers the greatest long-term benefit to students.`,
  },
  {
    id: 'w2-adv-dis-remote-work',
    task: 2,
    category: 'advantages-disadvantages',
    prompt: 'More and more people are choosing to work from home instead of commuting to an office. What are the advantages and disadvantages of this trend?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Remote work has become increasingly common in recent years, allowing employees to complete their tasks from home instead of travelling to a shared office. This shift brings clear benefits but also introduces new challenges.

One major advantage of working from home is the time and money saved by eliminating the daily commute. Employees can use these extra hours for rest, exercise or family time, which often improves overall wellbeing and job satisfaction. Companies, too, can benefit financially, since they may need less office space and lower overhead costs. In addition, remote work often allows for a more flexible schedule, enabling staff to balance personal responsibilities, such as childcare, alongside their professional duties.

However, working from home is not without drawbacks. Many employees report feelings of isolation, as the casual, spontaneous interactions that occur in a shared office are difficult to replicate online. This can weaken team cohesion and make collaboration on complex projects more challenging. Furthermore, the boundary between work and personal life can become blurred, leading some individuals to work longer hours than they would in a traditional office, which may result in burnout over time. Home environments are also not always suitable for focused work, particularly for those with limited space or family distractions.

On balance, I believe the benefits of remote work outweigh the disadvantages for most employees, provided that companies actively support communication and set clear boundaries around working hours. With the right structure in place, remote work can offer a healthier and more productive alternative to the traditional office.`,
  },
  {
    id: 'w2-problem-solution-traffic',
    task: 2,
    category: 'problem-solution',
    prompt: 'Traffic congestion is becoming a serious problem in many major cities around the world. What are the causes of this problem, and what measures could be taken to solve it?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Traffic congestion has become one of the most pressing problems in major cities worldwide, causing delays, pollution and considerable frustration for commuters. This essay will explore the main causes of this issue and suggest some practical solutions.

The most obvious cause of traffic congestion is the sheer number of private vehicles on the road, driven by rising car ownership as incomes increase. Urban planning also plays a role: many cities were not designed to accommodate today's volume of traffic, resulting in narrow roads and insufficient parking. In addition, the limited availability or poor quality of public transport in some areas leaves residents with little choice but to drive, further adding to congestion during peak hours.

Several measures could help to ease this problem. Firstly, governments should invest heavily in public transportation, making it faster, cheaper and more reliable than driving. A well-connected metro or bus network can persuade many commuters to leave their cars at home. Secondly, congestion charges, similar to those introduced in cities such as London, can discourage unnecessary car use in busy central areas while generating revenue for further transport improvements. Finally, promoting flexible working arrangements, including remote work and staggered office hours, can spread traffic more evenly throughout the day rather than concentrating it in narrow rush-hour windows.

In conclusion, traffic congestion stems from a combination of rising vehicle numbers, inadequate infrastructure and weak public transport options. By combining investment in transport, pricing measures and more flexible working patterns, cities can significantly reduce this problem over time.`,
  },
  {
    id: 'w2-two-part-waste',
    task: 2,
    category: 'two-part',
    prompt: 'In many countries, the amount of waste produced by households continues to increase every year. Why do you think this is happening? What can be done to reduce household waste?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Household waste has been steadily rising in many countries, placing growing pressure on landfill sites and the environment. This essay will consider why this trend is occurring and outline some effective ways to reduce it.

One key reason for the increase in household waste is the growth of consumer culture, in which people frequently buy new products, often replacing items that still function well simply because a newer version has become available. Excessive packaging is another significant factor, as many goods, particularly food items, are wrapped in multiple layers of plastic and cardboard that are discarded almost immediately after purchase. Additionally, the convenience of disposable products, from single-use cutlery to takeaway containers, has made it easier than ever to generate waste without a second thought.

To address this growing problem, several strategies could be adopted. Governments could introduce stricter regulations on packaging, requiring manufacturers to use minimal and recyclable materials. Public education campaigns could also raise awareness about the environmental cost of waste and encourage habits such as repairing items rather than replacing them. On an individual level, people can reduce their waste by choosing reusable products, composting food scraps, and buying only what they genuinely need. Local authorities could further support these efforts by making recycling facilities more accessible and by charging households based on the amount of non-recyclable waste they produce.

In conclusion, rising household waste is driven largely by consumerism and excessive packaging, but through a combination of government regulation, public awareness and individual responsibility, this trend can be reversed.`,
  },
  {
    id: 'w2-opinion-community-service',
    task: 2,
    category: 'opinion',
    prompt: "Some people believe that unpaid community service should be a compulsory part of every student's education. To what extent do you agree or disagree?",
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Compulsory unpaid community service is sometimes proposed as a way of teaching students responsibility and civic awareness. While I recognise the potential benefits of such a scheme, I do not believe it should be made a mandatory part of every student's education.

Proponents of compulsory community service argue that it exposes young people to social issues they might otherwise never encounter, such as poverty, homelessness or environmental degradation. Volunteering can build empathy, teamwork and practical skills that are rarely taught in a traditional classroom, and it may encourage some students to continue contributing to their communities well into adulthood.

Nevertheless, making such service compulsory raises several concerns. Firstly, students already face heavy academic workloads, and adding a mandatory obligation could increase stress without necessarily achieving the intended educational benefit. Motivation matters greatly in volunteering: work performed reluctantly, simply to satisfy a requirement, is unlikely to have the same positive impact as work chosen freely. There is also a practical difficulty in ensuring that every student has equal access to suitable placements, particularly in rural areas where volunteering opportunities may be scarce.

A more effective approach, in my view, would be for schools to actively encourage and facilitate voluntary community service, offering guidance, recognition and support, rather than forcing participation. Students who choose to get involved of their own accord are far more likely to gain genuine value from the experience.

In conclusion, although community service can be valuable, I disagree that it should be compulsory, since forced participation risks undermining the very qualities the policy aims to develop.`,
  },
  {
    id: 'w2-discussion-culture',
    task: 2,
    category: 'discussion',
    prompt: 'Some people think that the best way to learn about other cultures is to travel abroad, while others believe that books, films and the internet are just as effective. Discuss both views and give your own opinion.',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Learning about other cultures can be achieved in many ways, and opinions differ on whether travelling abroad or engaging with books, films and the internet is more effective. This essay will discuss both viewpoints before giving my own opinion.

Those who favour travel argue that nothing compares to direct, first-hand experience. Visiting another country allows a person to taste local food, hear the language spoken naturally, and observe everyday customs and social norms that are difficult to convey through a screen or a page. Unexpected encounters and conversations with local people often provide insights that no documentary or textbook could offer, making the learning experience more memorable and authentic.

On the other hand, supporters of books, films and the internet point out that these resources are far more accessible and affordable than international travel, which can be prohibitively expensive and time-consuming for many people. Documentaries and well-researched books can also provide historical and social context that a short visit might not reveal, while online platforms make it possible to interact with people from other cultures in real time through video calls or social media, without leaving home.

In my view, both approaches have genuine value and are best used together rather than in isolation. Reading and watching material about a culture beforehand can prepare a traveller to understand and appreciate what they encounter, while the experience of travel itself brings that knowledge to life in a way that media alone cannot fully replicate.

In conclusion, while travel offers unmatched authenticity, media resources remain a valuable and more accessible complement, and combining both is the most effective way to understand other cultures.`,
  },
  {
    id: 'w2-adv-dis-online-shopping',
    task: 2,
    category: 'advantages-disadvantages',
    prompt: 'A growing number of people are choosing to buy products online rather than in physical shops. What are the advantages and disadvantages of this development?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Online shopping has grown enormously in popularity, with more people choosing to purchase goods through websites and apps rather than visiting physical stores. This shift offers considerable convenience, but it also brings certain disadvantages worth considering.

The most obvious advantage of online shopping is convenience. Consumers can browse and purchase products at any time of day, without the need to travel, find parking or queue at a till. Online platforms also make it easy to compare prices across different retailers, read reviews from other customers, and access a far wider range of products than any single physical shop could offer. For people living in remote areas or with limited mobility, online shopping can be particularly valuable, providing access to goods that might otherwise be unavailable locally.

However, this convenience comes with drawbacks. Shoppers cannot physically examine products before buying them, which can lead to disappointment when an item does not match its description, particularly with clothing or furniture. The rise of online shopping has also contributed to the decline of local high streets, as smaller independent shops struggle to compete with large online retailers, potentially harming local economies and reducing town centres to fewer social spaces. Additionally, the packaging and delivery associated with online orders generate considerable waste and carbon emissions, especially when items are returned.

On balance, while online shopping offers undeniable convenience and choice, its impact on local businesses and the environment should not be overlooked. A combination of online and in-person shopping, used thoughtfully, is likely to bring the greatest overall benefit to consumers and communities alike.`,
  },
  {
    id: 'w2-problem-solution-pollution',
    task: 2,
    category: 'problem-solution',
    prompt: 'Air pollution is a growing problem in many large cities. What are the main causes of this problem, and what can individuals and governments do to address it?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Air pollution has become a serious concern in many large cities, affecting both public health and quality of life. This essay will examine the main causes of this problem and propose some practical solutions that individuals and governments could implement.

The primary cause of urban air pollution is vehicle emissions, particularly from older cars, buses and trucks that burn fossil fuels inefficiently. Industrial activity is another significant contributor, as factories release smoke and chemical pollutants directly into the atmosphere, often with minimal regulation in developing economies. Additionally, the burning of coal for electricity generation and heating remains widespread in many countries, further degrading air quality, especially during colder months.

To tackle this problem, governments could take several important steps. Stricter emissions standards for vehicles and factories would compel manufacturers to adopt cleaner technologies, while generous subsidies for electric vehicles and renewable energy could accelerate the transition away from fossil fuels. Expanding and improving public transport networks would also reduce the number of private vehicles on the road, directly cutting emissions in city centres. On an individual level, people can contribute by using public transport, cycling or walking for short journeys instead of driving, and by reducing household energy consumption where possible.

In conclusion, air pollution results mainly from vehicle emissions, industrial activity and fossil fuel use, but a combination of stricter government regulation, investment in clean technology and individual behavioural change could substantially improve air quality in cities over time.`,
  },
  {
    id: 'w2-two-part-social-media',
    task: 2,
    category: 'two-part',
    prompt: 'Many young people today spend a large amount of their free time on social media. Why has this become so popular? Is this a positive or negative development?',
    minWords: 250,
    timeMinutes: 40,
    sampleAnswer: `Social media has become deeply embedded in the daily lives of young people, who often spend hours each day browsing, posting and interacting online. This essay will consider why these platforms have become so popular and whether this represents a positive or negative development.

Several factors explain the widespread appeal of social media among young people. These platforms are specifically designed to be engaging, using features such as endless scrolling, notifications and personalised content to keep users returning frequently. Social media also fulfils a genuine psychological need for connection and belonging, allowing young people to stay in touch with friends, share experiences and find communities of people with similar interests, regardless of geographical distance.

In my view, this trend has both positive and negative aspects, though the negative effects are becoming increasingly apparent. On the positive side, social media can foster creativity, provide access to educational content, and offer valuable support networks, particularly for individuals who feel isolated in their immediate surroundings. However, excessive use has been linked to anxiety, poor sleep and reduced attention spans, as constant comparison with curated, idealised versions of other people's lives can harm self-esteem. The addictive design of many platforms also makes it difficult for young people to moderate their own usage, even when they recognise its negative impact.

On balance, I believe social media's rapid rise represents a mixed development that requires careful management. Encouraging healthier habits, digital literacy, and clearer boundaries around screen time would allow young people to enjoy the genuine benefits of these platforms while minimising their considerable risks.`,
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
    sampleAnswer: `The line graph illustrates changes in the number of visitors to three museums, A, B and C, over a twenty-year period from 2000 to 2020.

Overall, Museum C experienced the most dramatic change, overtaking the other two museums by the end of the period, while Museum B remained relatively stable throughout.

In 2000, Museum A had the highest number of visitors, at around 100,000, and this figure rose steadily to a peak of approximately 420,000 in 2010. After this peak, however, visitor numbers to Museum A declined gradually, falling to roughly 300,000 by 2020. Museum B, by contrast, showed little fluctuation over the whole period, consistently attracting between 150,000 and 180,000 visitors each year.

Museum C started with by far the lowest number of visitors in 2000, at just 50,000, but this figure rose only slightly until around 2012, after which it increased sharply. By 2018, Museum C had overtaken both other museums, and it finished the period as the most popular of the three, with around 450,000 visitors in 2020.

In summary, while Museum A saw an initial rise followed by decline, and Museum B remained largely unchanged, Museum C's rapid late growth made it the most visited museum by 2020.`,
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
    sampleAnswer: `The bar chart compares the percentage of households with internet access in four countries, A, B, C and D, in 2005 and in 2020.

Overall, internet access increased substantially in all four countries over the fifteen-year period, and the gap between the countries narrowed considerably by 2020.

In 2005, Country A had by far the highest level of household internet access, at 55%, followed by Country B at 40% and Country C at 25%. Country D lagged significantly behind the other three, with only 15% of households having internet access at that time.

By 2020, the picture had changed considerably. Country A remained the leader, but its internet access rate had risen to 95%. Country B followed closely with 90%, while Country C reached 80%. The most striking change was seen in Country D, which recorded the largest increase of all four countries, climbing from just 15% to 75% of households.

In summary, although Country A consistently had the highest rate of household internet access throughout the period, Country D made the most significant progress, closing much of the gap that had existed in 2005.`,
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
    sampleAnswer: `The two pie charts compare the main sources of energy production in a country in 1990 and in 2020.

Overall, the country's reliance on coal decreased substantially over the thirty-year period, while the use of renewable energy sources increased to become the largest single contributor by 2020.

In 1990, coal was clearly the dominant energy source, accounting for exactly half of all energy production. Oil was the second largest source at 25%, followed by natural gas at 15%, while renewable energy sources made up only a small proportion, at just 10% of the total.

By 2020, the situation had changed considerably. Coal's share had fallen sharply to 20%, and oil had also declined, though less dramatically, to 15%. Natural gas showed only a slight increase, rising to 20% of total production. The most notable change, however, was in renewable energy, which grew from a minor contributor to the largest single source, reaching 45% of overall energy production by 2020.

In summary, the thirty-year period saw a clear shift away from coal towards renewable energy, which replaced coal as the country's leading source of energy production.`,
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
    sampleAnswer: `The table shows the average monthly household spending, in local currency, on four categories — food, housing, transport and entertainment — in three cities, X, Y and Z.

Overall, housing was the largest expense for households in all three cities, and City Y recorded the highest spending in this category by a considerable margin.

In terms of food spending, City X households spent the most, at 400 units per month, followed by City Y at 350 and City Z at 300. Housing costs showed the greatest variation between the three cities: City Y households spent 1,200 units, notably higher than City X at 900 and City Z at just 600, making City Y's housing costs roughly double those of City Z.

Transport spending was relatively similar across all three cities, ranging from 150 units in City Z to 250 units in City Y, with City X in between at 200. Entertainment spending followed a slightly different pattern, with City Z households spending the most, at 200 units, compared with 150 in City X and only 100 in City Y.

In summary, while spending patterns on food, transport and entertainment were broadly comparable across the three cities, housing costs varied considerably, with City Y households facing by far the highest housing expenses.`,
  },
  {
    id: 'w1-process-water',
    task: 1,
    category: 'process',
    prompt: 'The diagram below shows the process of how rainwater is collected and treated to become drinking water. Summarise the information by selecting and reporting the main features.',
    dataDescription: 'Rain falls onto a collection area and flows into a reservoir. From the reservoir, water passes through a screening stage that removes large debris, then through a series of sand and carbon filters that remove smaller particles. The filtered water is then disinfected with chlorine before being pumped into a storage tank, from which it is distributed to homes through underground pipes.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswer: `The diagram illustrates the process by which rainwater is collected and treated to become safe drinking water, from initial collection through to final distribution to homes.

Overall, the process consists of five main stages — collection, screening, filtration, disinfection and distribution — during which the water passes through several stages designed to remove impurities before reaching consumers.

The process begins when rain falls onto a collection area and flows into a reservoir, where it is stored before treatment. From the reservoir, the water first passes through a screening stage, which removes large pieces of debris such as leaves and other solid materials. Following this, the water undergoes a more thorough filtration stage, passing through a series of sand and carbon filters that remove smaller particles and impurities that screening alone cannot capture.

Once filtration is complete, the water is disinfected using chlorine, a chemical process that eliminates harmful bacteria and other microorganisms, making the water safe to drink. After disinfection, the treated water is pumped into a storage tank, from which it is finally distributed to homes through a network of underground pipes.

In summary, raw rainwater undergoes a multi-stage purification process, involving physical filtration and chemical disinfection, before it is stored and delivered to households as clean drinking water.`,
  },
  {
    id: 'w1-letter-faulty-item',
    task: 1,
    category: 'letter',
    prompt: 'You recently bought a piece of electronic equipment from a shop, but it does not work properly. Write a letter to the shop manager. In your letter: describe the item you bought, explain what is wrong with it, say what you would like the manager to do.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswer: `Dear Sir or Madam,

I am writing to inform you of a problem with an item I purchased from your shop last week.

On 10 March, I bought a wireless bluetooth speaker from your electronics department for approximately 60 dollars. Unfortunately, since bringing it home, I have found that the speaker frequently disconnects from my phone and the sound cuts out every few minutes, even when the device is fully charged and positioned close by. I have tried resetting it and reading through the instruction manual, but the problem persists and the speaker is essentially unusable in its current condition.

As this item was clearly faulty when purchased, I would like to request either a full replacement with a working model or a complete refund, whichever you are able to offer more quickly. I still have the original receipt and packaging, and I am happy to bring the speaker back to the shop at your convenience.

I would appreciate a prompt response, as I purchased this item for an upcoming trip and would like the matter resolved as soon as possible.

Thank you for your attention to this matter, and I look forward to hearing from you soon.

Yours faithfully,
[Your name]`,
  },
  {
    id: 'w1-letter-visit-friend',
    task: 1,
    category: 'letter',
    prompt: 'You are going to visit a friend who lives in another country. Write a letter to your friend. In your letter: give the dates you plan to visit, explain what you would like to do during the visit, ask if there is anything you should bring.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswer: `Dear Alex,

I hope you're doing well! I'm delighted to let you know that I've finally booked my flights, and I'll be arriving to visit you from 14 to 21 July. I can hardly wait to see you again after so long!

During my stay, I'd love to explore the city with you, especially any local markets or historic areas you think I'd enjoy. I've heard so much about the old town from your photos, and I'd really like to see it in person. If possible, it would also be wonderful to try some traditional local dishes together, perhaps at a restaurant you'd recommend, since I always trust your taste in food more than any guidebook.

As for what I should bring, could you let me know what the weather is usually like in July? I want to pack appropriately, and I'm not sure whether I'll need anything warmer for the evenings. Also, please tell me if there's anything from home you'd like me to bring for you, since it's been a while since your last visit here.

Thank you again for having me — I'm really looking forward to catching up properly and making some great memories together.

Take care,
[Your name]`,
  },
  {
    id: 'w1-letter-time-off',
    task: 1,
    category: 'letter',
    prompt: 'You recently started a new job and would like to request a few days off. Write a letter to your manager. In your letter: explain why you need the time off, give the dates you would like to take, suggest how your work will be covered while you are away.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswer: `Dear Ms. Carter,

I am writing to request a short period of leave from work due to a personal matter that requires my attention.

I recently started my role in the marketing team last month, and I have greatly enjoyed settling into the position so far. However, a family commitment has arisen that I need to attend to in person, and I would like to request three days of leave, from 22 to 24 May, if this is possible.

To ensure my work is not disrupted during my absence, I have already begun preparing detailed notes on my current projects, including the status of the spring campaign, which I can hand over to a colleague before I leave. I would be happy to remain reachable by email for any urgent matters, and I am confident that my responsibilities can be covered by Daniel, who is already familiar with much of the campaign's background.

I understand this request comes relatively early in my time with the company, and I apologise for any inconvenience it may cause. I would be grateful if we could discuss this further at your earliest convenience.

Thank you very much for your understanding.

Yours sincerely,
[Your name]`,
  },
  {
    id: 'w1-map-town',
    task: 1,
    category: 'map',
    prompt: 'The maps below show the layout of a small town in 1995 and the same town in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    dataDescription: 'In 1995, the town centre had a small market square surrounded by a post office, a school, and open farmland to the north and east. By 2020, the market square has been replaced by a shopping centre, the farmland to the north has become a residential housing estate, the school has doubled in size, and a new road bypasses the town centre to the east, where the open farmland used to be.',
    minWords: 150,
    timeMinutes: 20,
    sampleAnswer: `The two maps illustrate how a small town changed between 1995 and 2020.

Overall, the town became considerably more developed over the twenty-five-year period, with agricultural land giving way to housing and commercial development, and new transport infrastructure added to the east.

In 1995, the town centre was arranged around a small market square, which was surrounded by a post office and a school. To the north and east of the town centre lay open farmland, with no significant development in either direction.

By 2020, substantial changes had taken place. The market square had been completely replaced by a shopping centre, reflecting a shift from traditional trade towards modern retail. The farmland to the north had also disappeared, having been transformed into a residential housing estate to accommodate a growing population. In addition, the school had doubled in size, suggesting an increase in the number of school-age children in the area. Finally, a new road had been built to the east of the town centre, bypassing it entirely, on land that had previously been open farmland.

In summary, the once rural town evolved considerably by 2020, with new housing, retail and road infrastructure replacing much of the farmland and traditional town-centre buildings that existed in 1995.`,
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
    sampleAnswer: `The bar chart illustrates the average number of hours per week spent exercising by people in four age groups in 2000 and in 2020.

Overall, exercise habits shifted considerably between 2000 and 2020: younger age groups exercised less over time, while older age groups exercised more, resulting in a much smaller gap between the four groups by 2020.

In 2000, the 18-29 age group exercised the most, averaging 6 hours per week, considerably more than the 30-44 age group, who exercised for 4 hours. The two older groups exercised noticeably less, with the 45-59 age group averaging 2.5 hours and the 60+ age group just 1.5 hours per week.

By 2020, this pattern had changed significantly. Exercise levels among the two younger groups declined, falling to 4.5 hours for the 18-29 group and 3 hours for the 30-44 group. In contrast, the two older groups increased their exercise levels: the 45-59 group rose to 3.5 hours per week, while the 60+ group nearly doubled its figure, reaching 3 hours per week.

In summary, while younger people exercised less in 2020 than in 2000, older age groups became noticeably more active, narrowing the gap between all four groups considerably over the twenty-year period.`,
  },
];

/** A random prompt, optionally restricted to one task. */
export function randomIeltsWritingQuestion(task?: IeltsTask): IeltsWritingQuestion | null {
  const pool = task ? ieltsWritingQuestions.filter((q) => q.task === task) : ieltsWritingQuestions;
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
