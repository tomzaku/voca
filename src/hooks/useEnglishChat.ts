import { useState, useCallback, useRef } from 'react';
import { callChatAction } from '../lib/chatApi';
import { t } from '../i18n';
import { extractLearnings } from './useLearnings';
import type { Learning } from './useLearnings';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type PracticeMode = 'smooth' | 'feedback';

// Message ids, formatted at render so the picker follows the app language.
export const ENGLISH_TOPICS = [
  { id: 'daily-life', labelId: 'conversation.topicDailyLife', descId: 'conversation.topicDailyLifeDesc' },
  { id: 'travel', labelId: 'conversation.topicTravel', descId: 'conversation.topicTravelDesc' },
  { id: 'technology', labelId: 'conversation.topicTechnology', descId: 'conversation.topicTechnologyDesc' },
  { id: 'work', labelId: 'conversation.topicWork', descId: 'conversation.topicWorkDesc' },
  { id: 'food', labelId: 'conversation.topicFood', descId: 'conversation.topicFoodDesc' },
  { id: 'health', labelId: 'conversation.topicHealth', descId: 'conversation.topicHealthDesc' },
  { id: 'entertainment', labelId: 'conversation.topicEntertainment', descId: 'conversation.topicEntertainmentDesc' },
  { id: 'culture', labelId: 'conversation.topicCulture', descId: 'conversation.topicCultureDesc' },
  { id: 'education', labelId: 'conversation.topicEducation', descId: 'conversation.topicEducationDesc' },
  { id: 'environment', labelId: 'conversation.topicEnvironment', descId: 'conversation.topicEnvironmentDesc' },
  { id: 'random', labelId: 'conversation.topicRandom', descId: 'conversation.topicRandomDesc' },
] as const;

/**
 * `speaking` is not in the picker above — it's the id for sessions launched
 * from the /speaking page, whose subject travels in the TopicContext instead.
 */
export type TopicId = (typeof ENGLISH_TOPICS)[number]['id'] | 'speaking';

/** Pins a session to a subject outside the fixed topic list. */
export interface TopicContext {
  /** Shown in the header and used as the topic in the prompt. */
  label?: string;
  /** A specific question the conversation should open with. */
  focus?: string;
}

/** Header/history label for a session — the context label wins when set. */
export function topicLabel(topicId: TopicId | null, context?: TopicContext | null): string {
  if (context?.label) return context.label;
  const topic = ENGLISH_TOPICS.find((x) => x.id === topicId);
  return t(topic?.labelId ?? 'conversation.speakingPractice');
}

export function useEnglishChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<TopicId | null>(null);
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [context, setContextState] = useState<TopicContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const topicRef = useRef<TopicId | null>(null);
  const modeRef = useRef<PracticeMode | null>(null);
  const contextRef = useRef<TopicContext | null>(null);
  const onLearningsRef = useRef<((items: Omit<Learning, 'id' | 'createdAt'>[], conversationId?: string) => void) | null>(null);

  const setOnLearnings = useCallback((fn: ((items: Omit<Learning, 'id' | 'createdAt'>[], conversationId?: string) => void) | null) => {
    onLearningsRef.current = fn;
  }, []);

  const processResponse = useCallback((rawText: string): string => {
    const { displayText, learnings } = extractLearnings(rawText);
    if (learnings.length > 0 && onLearningsRef.current) {
      onLearningsRef.current(learnings);
    }
    return displayText;
  }, []);

  /** Keep the ref and the state in sync — sendMessage reads the ref. */
  const setContext = useCallback((ctx: TopicContext | null) => {
    contextRef.current = ctx;
    setContextState(ctx);
  }, []);

  const startConversation = useCallback(async (
    topicId: TopicId,
    practiceMode: PracticeMode,
    ctx: TopicContext | null = null,
  ) => {
    setMessages([]);
    setIsLoading(true);
    setError(null);
    setCurrentTopic(topicId);
    setMode(practiceMode);
    setContext(ctx);
    topicRef.current = topicId;
    modeRef.current = practiceMode;
    abortRef.current = new AbortController();

    try {
      const rawText = await callChatAction(
        'start',
        { topicId, mode: practiceMode, topicLabel: ctx?.label, focus: ctx?.focus },
        { signal: abortRef.current.signal },
      );
      const displayText = processResponse(rawText);
      setMessages([{ role: 'assistant', content: displayText }]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [processResponse, setContext]);

  const sendMessage = useCallback(async (userMessage: string) => {
    const topic = topicRef.current;
    const practiceMode = modeRef.current;
    if (!topic || !practiceMode) return;

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const rawText = await callChatAction(
        'reply',
        {
          topicId: topic,
          mode: practiceMode,
          messages: newMessages,
          topicLabel: contextRef.current?.label,
          focus: contextRef.current?.focus,
        },
        { signal: abortRef.current.signal },
      );
      const displayText = processResponse(rawText);
      setMessages([...newMessages, { role: 'assistant', content: displayText }]);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, processResponse]);

  const summarizeMistakes = useCallback(async (conversationMessages: ChatMessage[]): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const conversationText = conversationMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      const rawText = await callChatAction(
        'summary',
        { conversationText },
        { signal: abortRef.current.signal },
      );

      return processResponse(rawText);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return null;
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [processResponse]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    setError(null);
    setCurrentTopic(null);
    setMode(null);
    setContext(null);
    topicRef.current = null;
    modeRef.current = null;
  }, [setContext]);

  return {
    messages,
    isLoading,
    error,
    currentTopic,
    mode,
    context,
    sendMessage,
    startConversation,
    summarizeMistakes,
    reset,
    setMessages,
    setCurrentTopic,
    setMode,
    setContext,
    setOnLearnings,
  };
}
