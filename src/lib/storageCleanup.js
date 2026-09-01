import { supabaseAdmin } from "./supabaseAdmin.js";

/**
 * Given a full Supabase public URL like:
 *   https://<project>.supabase.co/storage/v1/object/public/ad-images/1234-abc.webp
 * returns { bucket: 'ad-images', path: '1234-abc.webp' }
 * Returns null if the URL doesn't look like a Supabase storage URL.
 */
export function parseStorageUrl(url) {
  if (!url || typeof url !== "string") return null;
  // Match: /storage/v1/object/public/<bucket>/<path>
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
  if (!match) return null;
  return { bucket: match[1], path: match[2] };
}

/**
 * Delete a single file from storage by its public URL.
 * Silently ignores errors (file may already be gone, URL may be external, etc.)
 */
export async function deleteStorageFile(url) {
  const parsed = parseStorageUrl(url);
  if (!parsed) return;
  try {
    await supabaseAdmin.storage.from(parsed.bucket).remove([parsed.path]);
  } catch {
    // Non-fatal — row deletion should still proceed
  }
}

/**
 * Delete multiple files from storage. Batches by bucket for efficiency.
 * @param {string[]} urls - array of Supabase public URLs (nulls/undefineds are ignored)
 */
export async function deleteStorageFiles(urls) {
  if (!urls?.length) return;

  // Group paths by bucket
  const byBucket = {};
  for (const url of urls) {
    const parsed = parseStorageUrl(url);
    if (!parsed) continue;
    if (!byBucket[parsed.bucket]) byBucket[parsed.bucket] = [];
    byBucket[parsed.bucket].push(parsed.path);
  }

  // Fire a single remove() call per bucket
  await Promise.all(
    Object.entries(byBucket).map(([bucket, paths]) =>
      supabaseAdmin.storage
        .from(bucket)
        .remove(paths)
        .catch(() => {
          // Non-fatal
        }),
    ),
  );
}

/**
 * Collect all image URLs from a questions array and delete them from storage.
 * Handles question_image_url and per-option image_url fields.
 * @param {{ question_image_url?: string, options: { image_url?: string }[] }[]} questions
 */
export async function deleteQuestionImages(questions) {
  if (!questions?.length) return;
  const urls = [];
  for (const q of questions) {
    if (q.question_image_url) urls.push(q.question_image_url);
    if (Array.isArray(q.options)) {
      for (const opt of q.options) {
        if (opt?.image_url) urls.push(opt.image_url);
      }
    }
  }
  await deleteStorageFiles(urls);
}
