"use client";

import { useRef, useState } from "react";
import { titleFromFileName } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import type { Collection } from "@/lib/types";
import { deleteR2File, guessType, uploadToR2 } from "./upload";

interface Item {
  file: File;
  status: "waiting" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|flac|ogg|opus)$/i;
const PARALLEL = 3;

/** Reads title / artist / track number / length from the file's tags, falling back to the file name. */
async function readTags(file: File) {
  try {
    const { parseBlob } = await import("music-metadata");
    const meta = await parseBlob(file, { duration: true, skipCovers: true });
    return {
      title: meta.common.title?.trim() || titleFromFileName(file.name),
      artist: meta.common.artist?.trim() || meta.common.albumartist?.trim() || null,
      track: meta.common.track?.no ?? null,
      duration: meta.format.duration ? Math.round(meta.format.duration) : null,
    };
  } catch {
    return { title: titleFromFileName(file.name), artist: null, track: null, duration: null };
  }
}

export default function SongUploader({
  collection,
  startTrack,
  onUploaded,
}: {
  collection: Collection;
  startTrack: number;
  onUploaded: () => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const audio = [...files].filter((f) => f.type.startsWith("audio/") || AUDIO_EXT.test(f.name));
    audio.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setItems((prev) => [...prev.filter((i) => i.status !== "done"), ...audio.map((file) => ({ file, status: "waiting" as const, progress: 0 }))]);
  }

  const update = (file: File, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.file === file ? { ...i, ...patch } : i)));

  async function uploadOne(item: Item, fallbackTrack: number) {
    update(item.file, { status: "uploading", progress: 0, error: undefined });
    let key: string | null = null;
    try {
      const tags = await readTags(item.file);
      key = await uploadToR2(item.file, "audio", collection.slug, (p) => update(item.file, { progress: p }));
      const { error } = await supabase().from("songs").insert({
        collection_id: collection.id,
        title: tags.title,
        artist: tags.artist,
        track_number: tags.track ?? fallbackTrack,
        duration_seconds: tags.duration,
        file_key: key,
        file_size: item.file.size,
        mime_type: item.file.type || guessType(item.file.name),
        original_filename: item.file.name,
      });
      if (error) throw new Error(error.message);
      update(item.file, { status: "done", progress: 1 });
    } catch (e) {
      if (key) await deleteR2File(key);
      update(item.file, { status: "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  async function start() {
    setRunning(true);
    const todo = items.filter((i) => i.status === "waiting" || i.status === "error");
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const n = next++;
        await uploadOne(todo[n], startTrack + n);
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    setRunning(false);
    onUploaded();
  }

  const pending = items.filter((i) => i.status === "waiting" || i.status === "error").length;
  const done = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${dragOver ? "border-accent bg-accent/10" : "border-line hover:border-muted"}`}
      >
        <div className="text-3xl">♪</div>
        <p className="mt-1 font-medium">Drop songs here, or click to choose</p>
        <p className="text-sm text-muted">MP3, M4A, WAV, FLAC, OGG. You can pick many at once. Title, singer and length are read from the file.</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="audio/*,.mp3,.m4a,.wav,.flac,.ogg,.opus"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2 rounded-xl border border-line bg-surface p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">
              {done} of {items.length} uploaded
            </span>
            {pending > 0 && (
              <button className="btn ml-auto" onClick={start} disabled={running}>
                {running ? "Uploading… keep this tab open" : `Upload ${pending} song${pending === 1 ? "" : "s"}`}
              </button>
            )}
            {!running && pending > 0 && (
              <button className="btn btn-ghost" onClick={() => setItems((p) => p.filter((i) => i.status === "done"))}>Clear</button>
            )}
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {items.map((i) => (
              <li key={i.file.name + i.file.size + i.file.lastModified} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{i.file.name}</span>
                <span className="text-xs text-muted">{(i.file.size / 1048576).toFixed(1)} MB</span>
                <span className="relative h-1.5 w-24 overflow-hidden rounded-full bg-raised">
                  <span
                    className={`absolute inset-y-0 left-0 ${i.status === "error" ? "bg-red-500" : i.status === "done" ? "bg-green-500" : "bg-accent"}`}
                    style={{ width: `${Math.round((i.status === "error" ? 1 : i.progress) * 100)}%` }}
                  />
                </span>
                <span className={`w-16 text-right text-xs ${i.status === "error" ? "text-red-400" : "text-muted"}`} title={i.error}>
                  {i.status === "error" ? "failed" : i.status === "done" ? "done" : i.status === "uploading" ? `${Math.round(i.progress * 100)}%` : "waiting"}
                </span>
              </li>
            ))}
          </ul>
          {items.some((i) => i.status === "error") && (
            <p className="text-xs text-red-400">Some uploads failed (hover &ldquo;failed&rdquo; for details). Press Upload again to retry them.</p>
          )}
        </div>
      )}
    </div>
  );
}
