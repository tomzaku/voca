// The `writing-templates` resource — custom "Improve Writing" templates a Pro
// user creates (name + instructions), used by POST /ai/improve_writing.
//
//   GET    /writing-templates       → { templates }   the caller's own
//   POST   /writing-templates       → { template }     { name, instructions, description? }   Pro
//   PATCH  /writing-templates/:id   → { template }     { name?, instructions?, description? }  Pro
//   DELETE /writing-templates/:id   → { ok }
//
// The 5 built-in templates (General Writing, Slack, Jira Comment, Mail, Daily
// Speaking) never touch this table — they're a client-side constant. This
// resource only holds the ones a user writes themselves.
//
// Writing is Pro-gated (the whole feature is Pro, so there's no point letting
// a non-Pro user pile up templates they can never submit). Reading and
// deleting stay open so a lapsed-Pro user can still see and clean up their own
// rows.
//
// Deploy: `supabase functions deploy writing-templates`

import { corsHeaders, jsonResponse, proGateError, requireUser } from '../_shared/ai.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const UUID = /^[0-9a-f-]{36}$/i;
const MAX_NAME = 60;
const MAX_INSTRUCTIONS = 2000;
const MAX_DESCRIPTION = 200;
const MAX_TEMPLATES = 30;

/** Row → the client's shape. Column names stop here. */
function toTemplate(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    instructions: r.instructions as string,
    description: (r.description as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function readName(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error('"name" is required.');
  return v.trim().slice(0, MAX_NAME);
}

function readInstructions(v: unknown): string {
  if (typeof v !== 'string' || !v.trim()) throw new Error('"instructions" is required.');
  return v.trim().slice(0, MAX_INSTRUCTIONS);
}

/** Optional — blank clears it. */
function readDescription(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed ? trimmed.slice(0, MAX_DESCRIPTION) : null;
}

async function list(db: SupabaseClient, userId: string) {
  const { data, error } = await db
    .from('writing_templates')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return { templates: (data ?? []).map(toTemplate) };
}

/** Exported for supabase/functions/_local/serve.ts — see progress/index.ts. */
export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const [id] = parts.slice(parts.lastIndexOf('writing-templates') + 1);
  if (id !== undefined && !UUID.test(id)) return jsonResponse(404, { error: 'Not found' });

  const auth = await requireUser(req);
  if (!auth) return jsonResponse(401, { error: 'Please sign in to use this feature.' });
  const db = auth.supabase;
  const userId = auth.user.id;

  const body = async () => {
    try {
      return (await req.json() ?? {}) as Record<string, unknown>;
    } catch {
      throw new Error('Invalid JSON body.');
    }
  };

  try {
    // ── /writing-templates ──────────────────────────────────────────
    if (id === undefined) {
      if (req.method === 'GET') return jsonResponse(200, await list(db, userId));

      if (req.method === 'POST') {
        const denied = await proGateError(db, userId);
        if (denied) return denied;

        const { count, error: countErr } = await db
          .from('writing_templates')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', userId);
        if (countErr) throw new Error(countErr.message);
        if ((count ?? 0) >= MAX_TEMPLATES) {
          return jsonResponse(400, { error: `You can have at most ${MAX_TEMPLATES} templates. Delete one first.` });
        }

        const b = await body();
        const { data, error } = await db
          .from('writing_templates')
          .insert({
            owner_id: userId,
            name: readName(b.name),
            instructions: readInstructions(b.instructions),
            description: readDescription(b.description),
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        return jsonResponse(200, { template: toTemplate(data) });
      }
      return jsonResponse(404, { error: 'Not found' });
    }

    // ── /writing-templates/:id ──────────────────────────────────────
    if (req.method === 'PATCH') {
      const denied = await proGateError(db, userId);
      if (denied) return denied;

      const b = await body();
      // Only what was sent, so renaming can't blank the instructions.
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ('name' in b) patch.name = readName(b.name);
      if ('instructions' in b) patch.instructions = readInstructions(b.instructions);
      if ('description' in b) patch.description = readDescription(b.description);
      const { data, error } = await db
        .from('writing_templates')
        .update(patch)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      // Not found and not-yours are the same answer under RLS.
      if (!data) return jsonResponse(404, { error: 'Template not found.' });
      return jsonResponse(200, { template: toTemplate(data) });
    }

    if (req.method === 'DELETE') {
      const { error } = await db.from('writing_templates').delete().eq('id', id);
      if (error) throw new Error(error.message);
      // Idempotent: deleting one that's already gone is a success.
      return jsonResponse(200, { ok: true });
    }

    return jsonResponse(404, { error: 'Not found' });
  } catch (err) {
    const message = (err as Error).message ?? '';
    // The validators above throw plain messages meant for the user.
    if (message.startsWith('"') || message === 'Invalid JSON body.') {
      return jsonResponse(400, { error: message });
    }
    console.error('[writing-templates]', err);
    return jsonResponse(500, { error: 'Something went wrong.' });
  }
}

if (import.meta.main) Deno.serve(handler);
