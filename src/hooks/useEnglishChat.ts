import { useState, useCallback, useRef } from 'react';
import { callChatAction } from '../lib/chatApi';
import { extractLearnings } from './useLearnings';
import type { Learning } from './useLearnings';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type PracticeMode = 'smooth' | 'feedback';

export const ENGLISH_TOPICS = [
  { id: 'daily-life', label: 'Daily Life', desc: 'Routines, habits, hobbies' },
  { id: 'travel', label: 'Travel', desc: 'Trips, destinations, experiences' },
  { id: 'technology', label: 'Technology', desc: 'Tech trends, gadgets, apps' },
  { id: 'work', label: 'Work & Career', desc: 'Office life, goals, challenges' },
  { id: 'food', label: 'Food & Cooking', desc: 'Recipes, restaurants, cuisine' },
  { id: 'health', label: 'Health & Fitness', desc: 'Exercise, wellness, habits' },
  { id: 'entertainment', label: 'Entertainment', desc: 'Movies, music, books, games' },
  { id: 'culture', label: 'Culture & Society', desc: 'Traditions, news, opinions' },
  { id: 'education', label: 'Education', desc: 'Learning, school, skills' },
  { id: 'environment', label: 'Environment', desc: 'Nature, climate, sustainability' },
  { id: 'random', label: 'Random', desc: 'Surprise me with anything!' },
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
  return ENGLISH_TOPICS.find((t) => t.id === topicId)?.label ?? 'Speaking Practice';
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
