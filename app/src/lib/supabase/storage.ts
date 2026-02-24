import { createClient } from "@/lib/supabase/client";

export type StorageBucket = "profile-pictures" | "verification-documents";

interface UploadResult {
  url: string | null;
  error: string | null;
}

/**
 * Upload a file to Supabase Storage.
 * For public buckets: returns the permanent public URL.
 * For private buckets: returns the storage path (signed URLs generated on-demand).
 */
export async function uploadFile(
  bucket: StorageBucket,
  userId: string,
  file: File
): Promise<UploadResult> {
  const supabase = createClient();

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${timestamp}-${safeName}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Storage upload error:", error);
    return { url: null, error: error.message };
  }

  if (bucket === "profile-pictures") {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { url: data.publicUrl, error: null };
  }

  // Private buckets: store the path, generate signed URLs on-demand
  return { url: filePath, error: null };
}

/**
 * Upload a file with real-time progress via XHR.
 * Returns the storage file path on success.
 */
export function uploadFileWithProgress(
  bucket: StorageBucket,
  userId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise(async (resolve) => {
    const supabase = createClient();

    // Force a server round-trip to validate/refresh the auth token.
    // getSession() returns a CACHED token that may be expired after
    // page refreshes, admin status changes, or incognito tab switches.
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      resolve({ url: null, error: "Not authenticated — please refresh the page and try again" });
      return;
    }

    // Now getSession() will have the freshly-refreshed token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      resolve({ url: null, error: "Session expired — please refresh the page and try again" });
      return;
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${userId}/${timestamp}-${safeName}`;
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (bucket === "profile-pictures") {
          const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
          resolve({ url: data.publicUrl, error: null });
        } else {
          resolve({ url: filePath, error: null });
        }
      } else if (xhr.status === 401 || xhr.status === 403) {
        resolve({ url: null, error: "Session expired — please refresh the page and try again" });
      } else {
        resolve({ url: null, error: `Upload failed (${xhr.status}) — please try again` });
      }
    });

    xhr.addEventListener("error", () => {
      resolve({ url: null, error: "Upload failed — check your connection and try again" });
    });

    xhr.addEventListener("timeout", () => {
      resolve({ url: null, error: "Upload timed out — please try again" });
    });

    xhr.timeout = 60000; // 60s timeout
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.send(file);
  });
}
