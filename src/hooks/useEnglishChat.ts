import { useState, useCallback, useRef } from 'react';
import { callAiAction } from '../lib/aiProviders';
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

export type TopicId = (typeof ENGLISH_TOPICS)[number]['id'];

export function useEnglishChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTopic, setCurrentTopic] = useState<TopicId | null>(null);
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const topicRef = useRef<TopicId | null>(null);
  const modeRef = useRef<PracticeMode | null>(null);
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

  const startConversation = useCallback(async (topicId: TopicId, practiceMode: PracticeMode) => {
    setMessages([]);
    setIsLoading(true);
    setError(null);
    setCurrentTopic(topicId);
    setMode(practiceMode);
    topicRef.current = topicId;
    modeRef.current = practiceMode;
    abortRef.current = new AbortController();

    try {
      const rawText = await callAiAction(
        'chat_start',
        { topicId, mode: practiceMode },
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
  }, [processResponse]);

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
      const rawText = await callAiAction(
        'chat_reply',
        { topicId: topic, mode: practiceMode, messages: newMessages },
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

      const rawText = await callAiAction(
        'chat_summary',
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
    topicRef.current = null;
    modeRef.current = null;
  }, []);

  return {
    messages,
    isLoading,
    error,
    currentTopic,
    mode,
    sendMessage,
    startConversation,
    summarizeMistakes,
    reset,
    setMessages,
    setCurrentTopic,
    setMode,
    setOnLearnings,
  };
}
