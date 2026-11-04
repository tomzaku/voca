// Where clips live: S3 behind CloudFront (infra/aws/audio-bucket) once its
// secrets are set, the Supabase `speech` bucket until then. The handler only
// sees `url` / `exists` / `put`, so moving storage is configuration, not code.
//
// S3 env (see infra/aws/audio-bucket/README.md):
//   AUDIO_S3_BUCKET, AUDIO_S3_REGION, AUDIO_CDN_URL,
//   AUDIO_S3_ACCESS_KEY_ID, AUDIO_S3_SECRET_ACCESS_KEY

import { HeadObjectCommand, PutObjectCommand, S3Client } from 'npm:@aws-sdk/client-s3@3';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface ClipStore {
  /** Where a client plays `path` from. */
  url(path: string): string;
  exists(path: string): Promise<boolean>;
  put(path: string, mp3: Uint8Array): Promise<void>;
}

/** A year: a clip's name is the hash of what it says, so it never changes. */
const IMMUTABLE = 'public, max-age=31536000, immutable';

function s3Store(): ClipStore | null {
  const bucket = Deno.env.get('AUDIO_S3_BUCKET');
  const region = Deno.env.get('AUDIO_S3_REGION');
  const cdn = Deno.env.get('AUDIO_CDN_URL')?.replace(/\/$/, '');
  const accessKeyId = Deno.env.get('AUDIO_S3_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('AUDIO_S3_SECRET_ACCESS_KEY');
  if (!bucket || !region || !cdn || !accessKeyId || !secretAccessKey) return null;

  const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return {
    url: (path) => `${cdn}/${path}`,
    // Straight to S3, not through CloudFront: the answer must be current the
    // moment after a put, with no edge cache in between.
    async exists(path) {
      try {
        await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: path }));
        return true;
      } catch (err) {
        const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
        // Without ListBucket a missing key is a 403, not a 404 — both are a miss.
        if (status === 404 || status === 403) return false;
        throw err;
      }
    },
    async put(path, mp3) {
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: path,
        Body: mp3,
        ContentType: 'audio/mpeg',
        CacheControl: IMMUTABLE,
      }));
    },
  };
}

function supabaseStore(svc: SupabaseClient): ClipStore {
  const BUCKET = 'speech';
  const url = (path: string) => `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/${BUCKET}/${path}`;
  return {
    url,
    // A HEAD on the public URL: the same CDN path the client will play from.
    async exists(path) {
      return (await fetch(url(path), { method: 'HEAD' })).ok;
    },
    async put(path, mp3) {
      // upsert: two callers missing at once both synthesize; the second write
      // just replaces an identical file instead of failing.
      const { error } = await svc.storage.from(BUCKET).upload(path, mp3, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
        upsert: true,
      });
      if (error) throw new Error(`storage: ${error.message}`);
    },
  };
}

let cached: ClipStore | null = null;

export function clipStore(svc: SupabaseClient): ClipStore {
  return cached ??= s3Store() ?? supabaseStore(svc);
}
