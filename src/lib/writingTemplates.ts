// The 5 built-in "Improve Writing" templates — always available, not editable
// or deletable. A user's own templates come from the `writing-templates`
// resource instead (see ./writingTemplatesApi.ts); this file exists so the
// defaults don't need a DB row or per-user seeding.

export interface DefaultWritingTemplate {
  id: string;
  name: string;
  instructions: string;
  /** Short blurb shown in the picker's detail view — not sent to the AI. */
  description: string;
  isDefault: true;
}

export const DEFAULT_WRITING_TEMPLATES: DefaultWritingTemplate[] = [
  {
    id: 'default-general',
    name: 'General Writing',
    isDefault: true,
    description: 'Fix grammar, clarity, and flow — with a short reason for each correction.',
    instructions:
      'Please review the following text for grammatical errors and suggest revisions to improve clarity, style, and flow. Correct any spelling mistakes, punctuation errors, and sentence structure issues. Reply with just the revised text, then briefly explain each grammar or word-choice correction — what was wrong and why the fix is correct, one short line each. Skip the explanation only for purely mechanical fixes like capitalization or a missing punctuation mark.',
  },
  {
    id: 'default-slack',
    name: 'Slack',
    isDefault: true,
    description: 'Casual, skimmable tone for chat messages.',
    instructions:
      "Rewrite the following text as a casual, skimmable Slack message. Keep sentences short, use a friendly and conversational tone, and break it into short lines or bullet points where that helps readability. Light formatting is fine (bold for key points, short bullet lists) but avoid heavy markdown headers. Cut anything that isn't essential — Slack messages get skimmed, not read closely.",
  },
  {
    id: 'default-jira',
    name: 'Jira Comment',
    isDefault: true,
    description: 'Structured, professional status updates.',
    instructions:
      'Rewrite the following text as a clear, structured Jira comment or status update. Use a professional, neutral tone. Organize with short headings or bullet points where useful (e.g. Summary, Status, Next Steps, Blockers), only including sections relevant to the content. Be precise and factual, avoid filler words.',
  },
  {
    id: 'default-mail',
    name: 'Mail',
    isDefault: true,
    description: 'Polished, professional email with a greeting and sign-off.',
    instructions:
      'Rewrite the following text as a polished, professional email. Add an appropriate greeting and sign-off if missing. Use a courteous, semi-formal tone, correct grammar/spelling/punctuation, and organize into clear paragraphs.',
  },
  {
    id: 'default-speaking',
    name: 'Daily Speaking',
    isDefault: true,
    description: 'Natural spoken-English phrasing for everyday conversation.',
    instructions:
      'Rephrase the following text so it sounds natural when spoken aloud in everyday English conversation, the way a fluent native speaker would actually say it. Simplify overly formal phrasing, use natural contractions and everyday vocabulary, keep sentences short enough to say in one breath. Reply with just the rephrased version. Only if something non-obvious changed, add one short sentence after it explaining why.',
  },
];
