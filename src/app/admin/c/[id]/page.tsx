"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminGate from "@/components/admin/AdminGate";
import CollectionForm from "@/components/admin/CollectionForm";
import SongUploader from "@/components/admin/SongUploader";
import { Cover } from "@/components/Player";
import { formatDuration, KIND_LABEL } from "@/lib/media";
import { adminFetch, supabase } from "@/lib/supabase";
import type { Collection, Song } from "@/lib/types";

export default function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <AdminGate>{() => <Editor id={id} />}</AdminGate>;
}

function Editor({ id }: { id: string }) {
  const router = useRouter();
  const [collection, setCollection] = useState<Collection | null | undefined>(undefined);
  const [songs, setSongs] = useState<Song[]>([]);
  const [editingDetails, setEditingDetails] = useState(false);

  const loadSongs = useCallback(async () => {
    const { data } = await supabase()
      .from("songs")
      .select("*")
      .eq("collection_id", id)
      .order("track_number", { ascending: true, nullsFirst: false })
      .order("created_at");
    setSongs((data ?? []) as Song[]);
  }, [id]);

  useEffect(() => {
    supabase()
      .from("collections")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setCollection(data as Collection | null));
    loadSongs();
  }, [id, loadSongs]);

  if (collection === undefined) return <p className="text-muted">Loading…</p>;
  if (collection === null) return <p>Collection not found. <Link href="/admin" className="text-accent">Back</Link></p>;

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-muted hover:text-ink">← All collections</Link>

      {editingDetails ? (
        <CollectionForm
          existing={collection}
          onSaved={(c) => {
            setCollection(c);
            setEditingDetails(false);
          }}
          onCancel={() => setEditingDetails(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <Cover coverKey={collection.cover_key} className="h-24 w-24 text-3xl" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold">{collection.title}</h1>
            <p className="text-sm text-muted">
              {[collection.year, KIND_LABEL[collection.kind], `${songs.length} songs`, collection.is_featured ? "★ featured on home page" : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/c/${collection.slug}`} className="btn btn-ghost" target="_blank">View public page ↗</Link>
            <button className="btn btn-ghost" onClick={() => setEditingDetails(true)}>Edit details</button>
            <button
              className="btn btn-danger"
              onClick={async () => {
                if (!confirm(`Delete "${collection.title}" and all ${songs.length} songs in it? This can't be undone.`)) return;
                try {
                  await adminFetch("/api/admin/delete", { type: "collection", id: collection.id });
                  router.push("/admin");
                } catch (e) {
                  alert(e instanceof Error ? e.message : e);
                }
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Upload songs</h2>
        <SongUploader collection={collection} startTrack={songs.length + 1} onUploaded={loadSongs} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Songs in this collection</h2>
        {songs.length === 0 ? (
          <p className="text-muted">None yet.</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {songs.map((s) => (
              <SongRow key={s.id} song={s} onChanged={loadSongs} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SongRow({ song, onChanged }: { song: Song; onChanged: () => void }) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist ?? "");
  const [track, setTrack] = useState(song.track_number?.toString() ?? "");
  const [state, setState] = useState<"" | "saving" | "saved" | string>("");
  const dirty = title !== song.title || artist !== (song.artist ?? "") || track !== (song.track_number?.toString() ?? "");

  async function save() {
    setState("saving");
    const { error } = await supabase()
      .from("songs")
      .update({ title: title.trim() || song.title, artist: artist.trim() || null, track_number: track ? Number(track) : null })
      .eq("id", song.id);
    setState(error ? error.message : "saved");
    if (!error) onChanged();
  }

  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
      <input value={track} onChange={(e) => setTrack(e.target.value.replace(/\D/g, ""))} aria-label="Track number" className="w-12 text-center" />
      <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" className="min-w-40 flex-[2]" />
      <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist / singers" aria-label="Artist" className="min-w-32 flex-1" />
      <span className="w-12 text-right tabular-nums text-muted">{formatDuration(song.duration_seconds)}</span>
      {dirty && (
        <button className="btn !py-1 !text-xs" onClick={save} disabled={state === "saving"}>Save</button>
      )}
      {!dirty && state === "saved" && <span className="text-xs text-ok">Saved</span>}
      {state && state !== "saving" && state !== "saved" && <span className="text-xs text-bad">{state}</span>}
      <button
        className="btn btn-danger !py-1 !text-xs"
        onClick={async () => {
          if (!confirm(`Delete "${song.title}"?`)) return;
          try {
            await adminFetch("/api/admin/delete", { type: "song", id: song.id });
            onChanged();
          } catch (e) {
            alert(e instanceof Error ? e.message : e);
          }
        }}
      >
        Delete
      </button>
    </li>
  );
}
