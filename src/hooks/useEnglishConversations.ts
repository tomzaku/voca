import { useState, useCallback } from 'react';
import type { ChatMessage, TopicId, PracticeMode } from './useEnglishChat';

export interface EnglishConversation {
  id: string;
  topicId: TopicId;
  mode: PracticeMode;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'voca-english-conversations';

function load(): EnglishConversation[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function save(data: EnglishConversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export function useEnglishConversations() {
  const [conversations, setConversations] = useState<EnglishConversation[]>(load);

  const saveConversation = useCallback(
    (topicId: TopicId, mode: PracticeMode, messages: ChatMessage[], title?: string) => {
      const now = Date.now();
      const newConv: EnglishConversation = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        topicId,
        mode,
        title: title || `Session ${new Date(now).toLocaleDateString()} ${new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        messages,
        createdAt: now,
        updatedAt: now,
      };
      setConversations((prev) => {
        const updated = [newConv, ...prev];
        save(updated);
        return updated;
      });
      return newConv;
    },
    [],
  );

  const updateConversation = useCallback((id: string, messages: ChatMessage[]) => {
    const now = Date.now();
    setConversations((prev) => {
      const updated = prev.map((c) => c.id === id ? { ...c, messages, updatedAt: now } : c);
      save(updated);
      return updated;
    });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      save(updated);
      return updated;
    });
  }, []);

  return { conversations, saveConversation, updateConversation, deleteConversation };
}
