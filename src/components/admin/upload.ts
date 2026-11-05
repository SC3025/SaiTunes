import { adminFetch } from "@/lib/supabase";

/** Uploads a file straight from the browser to R2 and returns its key. */
export async function uploadToR2(
  file: File,
  folder: "audio" | "covers",
  collectionSlug: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const contentType = file.type || guessType(file.name);
  const { url, key } = await adminFetch<{ url: string; key: string }>("/api/admin/upload-url", {
    filename: file.name,
    contentType,
    folder,
    collectionSlug,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection, or the R2 CORS settings (see SETUP.md)."));
    xhr.send(file);
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

export async function deleteR2File(key: string) {
  await adminFetch("/api/admin/delete", { type: "file", id: key }).catch(() => {});
}
