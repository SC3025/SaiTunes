import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Cover } from "@/components/Player";
import SongList from "@/components/SongList";
import PlayAllButton from "@/components/PlayAllButton";
import { supabase } from "@/lib/supabase";
import type { Collection, Song } from "@/lib/types";
import { formatDuration, KIND_LABEL } from "@/lib/media";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  const { data } = await supabase().from("collections").select("*").eq("slug", slug).maybeSingle();
  return data as Collection | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await load((await params).slug);
  return { title: c ? `${c.title} · Sai Tunes` : "Sai Tunes" };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await load((await params).slug);
  if (!c) notFound();

  const { data } = await supabase()
    .from("songs")
    .select("*")
    .eq("collection_id", c.id)
    .order("track_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });
  const songs = ((data ?? []) as Song[]).map((s) => ({
    ...s,
    cover_key: c.cover_key,
    collectionTitle: c.title,
  }));
  const total = songs.reduce((n, s) => n + (s.duration_seconds ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <Cover coverKey={c.cover_key} className="h-44 w-44 text-5xl shadow-2xl sm:h-52 sm:w-52" />
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-accent">
            {KIND_LABEL[c.kind]}
            {c.is_featured && " · New"}
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-5xl">{c.title}</h1>
          {c.description && <p className="mt-2 max-w-2xl whitespace-pre-line text-muted">{c.description}</p>}
          <p className="mt-2 text-sm text-muted">
            {[c.year, `${songs.length} songs`, total ? formatDuration(total) : null].filter(Boolean).join(" · ")}
          </p>
          {songs.length > 0 && (
            <div className="mt-4">
              <PlayAllButton songs={songs} />
            </div>
          )}
        </div>
      </div>
      <SongList songs={songs} />
    </div>
  );
}
