"use client";

import { useState } from "react";
import { fileUrl, slugify } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import type { Collection, CollectionKind } from "@/lib/types";
import { deleteStoredFile, uploadFile } from "./upload";

/** Create a new collection, or edit an existing one. */
export default function CollectionForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: Collection;
  onSaved: (c: Collection) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [year, setYear] = useState(existing?.year?.toString() ?? String(new Date().getFullYear()));
  const [kind, setKind] = useState<CollectionKind>(existing?.kind ?? "album");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [featured, setFeatured] = useState(existing?.is_featured ?? !existing);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const yearNum = year.trim() ? Number(year) : null;
      if (yearNum !== null && (!Number.isInteger(yearNum) || yearNum < 1950 || yearNum > 2200)) throw new Error("Year looks wrong");
      const slug = existing?.slug ?? slugify(`${title} ${yearNum ?? ""}`);

      let cover_key = existing?.cover_key ?? null;
      if (cover) cover_key = await uploadFile(cover, "covers", slug);

      const fields = { title: title.trim(), year: yearNum, kind, description: description.trim() || null, is_featured: featured, cover_key };
      const sb = supabase();
      let result;
      if (existing) {
        result = await sb.from("collections").update(fields).eq("id", existing.id).select().single();
      } else {
        result = await sb.from("collections").insert({ ...fields, slug }).select().single();
        if (result.error?.code === "23505") {
          // Slug already taken — add a short suffix.
          result = await sb.from("collections").insert({ ...fields, slug: `${slug}-${crypto.randomUUID().slice(0, 4)}` }).select().single();
        }
      }
      if (result.error) {
        if (cover && cover_key) await deleteStoredFile(cover_key);
        throw new Error(result.error.message);
      }
      if (cover && existing?.cover_key) await deleteStoredFile(existing.cover_key);
      onSaved(result.data as Collection);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const preview = cover ? URL.createObjectURL(cover) : fileUrl(existing?.cover_key);

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem_12rem]">
        <label className="space-y-1 text-sm">
          <span>Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Day 2026" className="w-full" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Year</span>
          <input inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} className="w-full" />
        </label>
        <label className="space-y-1 text-sm">
          <span>Type</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as CollectionKind)} className="w-full">
            <option value="album">Album</option>
            <option value="year">Year collection</option>
            <option value="special">Special release</option>
          </select>
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Description (optional)</span>
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" />
      </label>
      <div className="flex flex-wrap items-center gap-5">
        <label className="flex items-center gap-3 text-sm">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-14 w-14 rounded-md object-cover" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-md bg-raised text-muted">♪</span>
          )}
          <span>
            Cover image (optional)
            <input type="file" accept="image/*" onChange={(e) => setCover(e.target.files?.[0] ?? null)} className="mt-1 block w-56 !border-0 !bg-transparent !p-0 text-xs" />
          </span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Show in &ldquo;New &amp; special releases&rdquo; on the home page
        </label>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button className="btn" disabled={busy}>{busy ? "Saving…" : existing ? "Save changes" : "Create collection"}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
