import { adminFetch, supabase } from "@/lib/supabase";
import { MAX_UPLOAD_MB } from "@/lib/media";

/** Uploads a file straight from the browser to storage and returns its key. */
export async function uploadFile(
  file: File,
  folder: "audio" | "covers",
  collectionSlug: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const contentType = file.type || guessType(file.name);
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
    throw new Error(`${file.name} is larger than ${MAX_UPLOAD_MB} MB. Convert it to MP3 first.`);
  }
  const { url, key, kind } = await adminFetch<{ url: string; key: string; kind: "s3" | "supabase" }>("/api/admin/upload-url", {
    filename: file.name,
    contentType,
    folder,
    collectionSlug,
    size: file.size,
  });

  const accessToken = kind === "supabase" ? (await supabase().auth.getSession()).data.session?.access_token : undefined;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status < 300) return resolve();
      let detail = "";
      try {
        detail = JSON.parse(xhr.responseText).message ?? "";
      } catch {}
      reject(new Error(`Upload failed (${xhr.status})${detail ? `: ${detail}` : ""}`));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection, then open Admin → Storage."));
    if (kind === "supabase") {
      // Same format the official Supabase client uses for signed uploads.
      const form = new FormData();
      form.append("cacheControl", "31536000");
      form.append("", new File([file], file.name, { type: contentType }));
      // Same headers the official client sends; the token in the URL is what authorizes the upload.
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
      xhr.setRequestHeader("apikey", anonKey);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken ?? anonKey}`);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.send(form);
    } else {
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.send(file);
    }
  });
  return key;
}

export function guessType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    wav: "audio/wav",
    flac: "audio/flac",
    ogg: "audio/ogg",
    opus: "audio/ogg",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

export async function deleteStoredFile(key: string) {
  await adminFetch("/api/admin/delete", { type: "file", id: key }).catch(() => {});
}
