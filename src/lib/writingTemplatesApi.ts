// Client for the `writing-templates` resource — the custom "Improve Writing"
// templates a Pro user creates. The 5 built-in templates never touch this
// resource; see ./writingTemplates.ts.
//
//   GET    /writing-templates       → { templates }
//   POST   /writing-templates       → { template }
//   PATCH  /writing-templates/:id   → { template }
//   DELETE /writing-templates/:id   → { ok }
//
// Reads are quiet — the store caches templates in localStorage and shows that
// copy when the server can't be reached. Writes throw, so the UI can tell
// someone their template didn't save.

import { request } from './api';

export interface WritingTemplate {
  id: string;
  name: string;
  instructions: string;
  /** Short blurb shown in the picker's detail view — not sent to the AI. */
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The caller's own custom templates. Empty (not an error) when unreachable. */
export async function fetchTemplates(): Promise<WritingTemplate[]> {
  const res = await request.get<{ templates: WritingTemplate[] }>('/writing-templates', { quiet: true });
  return res?.templates ?? [];
}

/** Create a template owned by the caller. Throws ApiError with the server's message. */
export async function createTemplate(
  name: string,
  instructions: string,
  description?: string,
): Promise<WritingTemplate> {
  const { template } = await request.post<{ template: WritingTemplate }>('/writing-templates', {
    name,
    instructions,
    description,
  });
  return template;
}

/** Change a template. Only the fields passed are written. Throws ApiError. */
export async function updateTemplate(
  id: string,
  patch: { name?: string; instructions?: string; description?: string },
): Promise<WritingTemplate> {
  const { template } = await request.patch<{ template: WritingTemplate }>(`/writing-templates/${id}`, patch);
  return template;
}

/** Delete a template. Idempotent — deleting one that's already gone succeeds. */
export async function deleteTemplate(id: string): Promise<void> {
  await request.delete(`/writing-templates/${id}`);
}
