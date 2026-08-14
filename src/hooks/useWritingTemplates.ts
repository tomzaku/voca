import { create } from 'zustand';
import { DEFAULT_WRITING_TEMPLATES, type DefaultWritingTemplate } from '../lib/writingTemplates';
import {
  createTemplate as apiCreateTemplate,
  deleteTemplate as apiDeleteTemplate,
  fetchTemplates,
  updateTemplate as apiUpdateTemplate,
  type WritingTemplate,
} from '../lib/writingTemplatesApi';

const CACHE_KEY = 'voca-writing-templates';

/** One writing template, default or custom — what the picker renders. */
export type AnyWritingTemplate = WritingTemplate | DefaultWritingTemplate;

function loadCache(): WritingTemplate[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as WritingTemplate[]) : [];
  } catch {
    return [];
  }
}

function saveCache(custom: WritingTemplate[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(custom)); } catch { /* ignore */ }
}

/** Defaults first, then the user's own — one combined list for the picker. */
export function allTemplates(custom: WritingTemplate[]): AnyWritingTemplate[] {
  return [...DEFAULT_WRITING_TEMPLATES, ...custom];
}

interface WritingTemplatesState {
  /** The signed-in user's own templates (defaults live in DEFAULT_WRITING_TEMPLATES). */
  custom: WritingTemplate[];
  fetchMine: () => Promise<void>;
  createTemplate: (name: string, instructions: string, description?: string) => Promise<WritingTemplate>;
  updateTemplate: (id: string, name: string, instructions: string, description?: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

export const useWritingTemplates = create<WritingTemplatesState>((set, get) => ({
  custom: loadCache(),

  fetchMine: async () => {
    const templates = await fetchTemplates();
    set({ custom: templates });
    saveCache(templates);
  },

  createTemplate: async (name, instructions, description) => {
    const created = await apiCreateTemplate(name, instructions, description);
    const custom = [...get().custom, created];
    set({ custom });
    saveCache(custom);
    return created;
  },

  updateTemplate: async (id, name, instructions, description) => {
    const updated = await apiUpdateTemplate(id, { name, instructions, description });
    const custom = get().custom.map((t) => (t.id === id ? updated : t));
    set({ custom });
    saveCache(custom);
  },

  deleteTemplate: async (id) => {
    await apiDeleteTemplate(id);
    const custom = get().custom.filter((t) => t.id !== id);
    set({ custom });
    saveCache(custom);
  },
}));
