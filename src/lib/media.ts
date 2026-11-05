const PUBLIC_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");

/** Public URL of a file stored in R2 (audio or cover art). */
export function fileUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return `${PUBLIC_BASE}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds)) return "";
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "collection"
  );
}

/** Make a file name safe to use as part of an R2 key. */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const cleanBase = base.normalize("NFKD").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "file";
  return ext ? `${cleanBase}.${ext}` : cleanBase;
}

/** Turn "03 - My Song (final).mp3" into "My Song (final)". */
export function titleFromFileName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/^\s*\d{1,3}\s*[-._)]\s*/, "")
    .replace(/_/g, " ")
    .trim();
}

export const KIND_LABEL: Record<string, string> = {
  album: "Album",
  year: "Year collection",
  special: "Special release",
};
