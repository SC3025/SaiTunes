import Link from "next/link";
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
    collectionSlug: c.slug,
    year: c.year,
  }));
  const total = songs.reduce((n, s) => n + (s.duration_seconds ?? 0), 0);
  const singers = [...new Set(songs.map((s) => s.artist).filter(Boolean))] as string[];

  return (
    <article className="space-y-8">
      <Link href={c.year ? `/#y-${c.year}` : "/"} className="smallcaps text-sm text-muted hover:text-accent">
        ← Contents
      </Link>

      <header className="grid items-end gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="smallcaps text-sm text-gold">
            Chapter{c.year ? ` · ${c.year}` : ""} · {KIND_LABEL[c.kind]}
            {c.is_featured && <span className="text-accent"> · New</span>}
          </div>
          <h1 className="mt-2 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-6xl">{c.title}</h1>
          {c.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-lg italic leading-relaxed text-muted">{c.description}</p>}
          <p className="mt-3 text-sm text-muted">
            {[`${songs.length} song${songs.length === 1 ? "" : "s"}`, total ? formatDuration(total) : null].filter(Boolean).join(" · ")}
            {singers.length > 0 && (
              <>
                {" · "}
                <span className="italic">
                  voices of {singers.slice(0, 4).join(", ")}
                  {singers.length > 4 ? ` and ${singers.length - 4} more` : ""}
                </span>
              </>
            )}
          </p>
          {songs.length > 0 && (
            <div className="mt-5">
              <PlayAllButton songs={songs} station={c.title} />
            </div>
          )}
        </div>
        {c.cover_key && (
          <div className="rotate-[1.5deg] bg-surface p-2.5 pb-8 shadow-[0_14px_30px_-18px_color-mix(in_srgb,var(--ink)_60%,transparent)] ring-1 ring-line">
            <Cover coverKey={c.cover_key} className="h-48 w-48 !rounded-none !ring-0 sm:h-56 sm:w-56" />
          </div>
        )}
      </header>

      <div className="ornament text-sm">❦</div>

      <SongList songs={songs} station={c.title} />
    </article>
  );
}
