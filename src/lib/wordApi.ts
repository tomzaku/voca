// Word-data client. Talks to the cache-first `word` edge function, which returns
// a ready vocabulary object (usually from the shared cache, no AI). Kept separate
// from the AI action client (aiProviders.ts) because this is a data lookup that
// only sometimes generates.

import { supabase } from './supabase';
import type { VocabularyWord } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface WordDataParams {
  word: string;
  level: VocabularyWord['level'];
  learnLang: string;
  motherLang: string;
}

export async function fetchWordData(params: WordDataParams, signal?: AbortSignal): Promise<VocabularyWord> {
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in to use AI features.');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/word`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.error || `Word request failed (${response.status}).`);
  }

  return await response.json() as VocabularyWord;
}
