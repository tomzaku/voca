import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey
  // Realtime's heartbeat in a worker: a background tab's timers are
  // throttled, the heartbeat lapses and the server drops the connection — and
  // with it you, from the shared world.
  ? createClient(supabaseUrl, supabaseAnonKey, { realtime: { worker: true } })
  : null;
