// Band-boosting tips for IELTS Writing — static content, same posture as
// src/data/ieltsWriting.ts. Kept separate from the question bank because
// tips are shared across every question of a given task/category rather than
// one-to-one with a question, so this avoids 20 near-duplicate tip lists.

import type { IeltsTask } from './ieltsWriting';

export interface IeltsTips {
  structure: string[];
  phrases: string[];
}

export const IELTS_TASK_TIPS: Record<IeltsTask, string[]> = {
  1: [
    'Write a one- or two-sentence overview stating the main trend(s) — this matters for Task Achievement even before you cover any details.',
    "Never speculate about WHY the data changed — Task 1 is purely descriptive, not an explanation.",
    'Group similar data together rather than describing every figure in the order given.',
    "Use a range of comparing language (higher than, in contrast to, whereas) instead of repeating 'more'/'less'.",
  ],
  2: [
    'State your position clearly in the introduction and keep it consistent all the way through.',
    'One main idea per paragraph — open each body paragraph with a clear topic sentence.',
    'Support every claim with a specific reason or example; unsupported generalisations cap your Task Response score.',
    "Vary your linking devices — don't rely only on 'Firstly'/'Secondly'/'In conclusion'.",
  ],
};

const DATA_REPORT_TIPS: IeltsTips = {
  structure: [
    "Open with one sentence identifying what the chart/table shows, in your own words — don't copy the question.",
    'Write a brief overview highlighting the one or two most striking overall trends or comparisons.',
    "Group and compare data rather than listing every figure in order — pick out what's significant.",
    'Never give opinions or explanations — Task 1 is purely descriptive.',
  ],
  phrases: [
    'rose / increased steadily / sharply / gradually to …',
    'fell / declined / dropped from … to …',
    'remained (relatively) stable / constant at around …',
    '…, compared with … / whereas … / in contrast to …',
    'accounted for the largest / smallest proportion of …',
    '…, reaching a peak of … before falling to …',
  ],
};

/** Keyed by IeltsWritingQuestion.category. */
export const IELTS_CATEGORY_TIPS: Record<string, IeltsTips> = {
  opinion: {
    structure: [
      'State your opinion clearly in the introduction, then keep the same position all the way through.',
      'Give at least two well-developed reasons, each in its own paragraph, with a specific example.',
      "Restate (don't just repeat) your opinion in the conclusion.",
    ],
    phrases: [
      'In my view, … / I firmly believe that …',
      'One of the main reasons for this is that …',
      'This is clearly illustrated by …',
      'While it could be argued that …, I would maintain that …',
    ],
  },
  discussion: {
    structure: [
      'Give one full paragraph to each side of the argument before stating your own opinion.',
      "Keep both sides balanced — don't let one paragraph be much longer than the other.",
      'Make your own opinion clear, either in the introduction or the conclusion (or both).',
    ],
    phrases: [
      'On the one hand, … / On the other hand, …',
      'Proponents of this view argue that …',
      'Critics, however, contend that …',
      'Having considered both sides, I believe that …',
    ],
  },
  'advantages-disadvantages': {
    structure: [
      'Devote one paragraph to advantages and one to disadvantages, each with clear examples.',
      'Finish with a brief overall judgement on whether the advantages outweigh the disadvantages, or vice versa.',
    ],
    phrases: [
      'One major advantage of … is that …',
      'A further benefit is …',
      'However, this development is not without drawbacks.',
      'On balance, the benefits outweigh the drawbacks / the drawbacks outweigh the benefits.',
    ],
  },
  'problem-solution': {
    structure: [
      "Separate causes and solutions into distinct paragraphs — don't mix them together.",
      'Match each solution to a cause you mentioned earlier, so the essay feels connected.',
      "Be specific: 'governments should invest in public transport' is stronger than 'something should be done'.",
    ],
    phrases: [
      'One of the main causes of this problem is …',
      'This is compounded by …',
      'A number of measures could be taken to address this issue.',
      'This would go a long way towards solving / reducing …',
    ],
  },
  'two-part': {
    structure: [
      'Answer both questions — examiners specifically check whether every part of the prompt is addressed.',
      'Use one paragraph per question so the structure clearly matches the prompt.',
    ],
    phrases: [
      'There are several reasons why this trend has emerged.',
      'This can be attributed to …',
      'To tackle this problem, …',
      'A combination of … and … would be effective in addressing this.',
    ],
  },
  'line-graph': DATA_REPORT_TIPS,
  'bar-chart': DATA_REPORT_TIPS,
  'pie-chart': DATA_REPORT_TIPS,
  table: DATA_REPORT_TIPS,
  process: {
    structure: [
      'Describe the stages in the correct order, using sequencing language throughout.',
      "Use the passive voice where appropriate ('the water is filtered'), since a process diagram usually shows a sequence of steps happening TO something.",
      'Give a brief overview naming how many stages there are before describing each one.',
    ],
    phrases: [
      'The process begins when …',
      'Once … has taken place, …',
      'Following this, … / Subsequently, …',
      'Finally, … is … before the process is complete.',
    ],
  },
  map: {
    structure: [
      "Give an overview of the general pattern of change (e.g. 'the area became more built-up') before the details.",
      'Organise your description by area (north, south, centre) or by feature, not randomly.',
      "Use appropriate change language: 'was replaced by', 'was converted into', 'was built/demolished'.",
    ],
    phrases: [
      '… has been replaced by …',
      '… was converted into …',
      'A new … was constructed to the … of …',
      '…, whereas in [year], this area was …',
    ],
  },
  letter: {
    structure: [
      'Match your tone to the situation — formal for a complaint or workplace letter, friendly for a letter to someone you know.',
      'Cover every bullet point in the prompt — missing one directly lowers your Task Achievement score.',
      'Use an appropriate greeting and sign-off (Dear Sir/Madam … Yours faithfully for formal; Dear [name] … Best wishes for informal).',
    ],
    phrases: [
      'I am writing to inform you that … / I am writing to request …',
      'I would be grateful if you could …',
      'I look forward to hearing from you.',
      'Thank you for your understanding. / Please let me know if …',
    ],
  },
};
