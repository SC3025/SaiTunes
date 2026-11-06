import Link from "next/link";
import SongList from "@/components/SongList";
import { supabase } from "@/lib/supabase";
import type { Collection, SongWithCollection } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const raw = ((await searchParams).q ?? "").trim();
  // Strip characters that have meaning in Supabase filter syntax.
  const q = raw.replace(/[%,()*\\]/g, " ").trim().slice(0, 100);
  if (!q) return <p className="italic text-muted">Type something in the search box to find songs.</p>;

  const pattern = `%${q}%`;
  const asYear = /^(19|20)\d\d$/.test(q) ? Number(q) : null;
  const [songsRes, colsRes] = await Promise.all([
    supabase()
      .from("songs")
      .select("*, collections(slug, title, year, cover_key)")
      .or(`title.ilike.${pattern},artist.ilike.${pattern}`)
      .order("title")
      .limit(100),
    asYear
      ? supabase().from("collections").select("*").eq("year", asYear).order("title")
      : supabase().from("collections").select("*").ilike("title", pattern).order("year", { ascending: false }).limit(20),
  ]);

  const songs = ((songsRes.data ?? []) as SongWithCollection[]).map((s) => ({
    ...s,
    cover_key: s.collections?.cover_key,
    collectionTitle: s.collections?.title,
    collectionSlug: s.collections?.slug,
    year: s.collections?.year,
  }));
  const collections = (colsRes.data ?? []) as Collection[];

  return (
    <div className="space-y-10">
      <header>
        <div className="smallcaps text-sm text-gold">Search</div>
        <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">
          &ldquo;<span className="italic">{raw}</span>&rdquo;
        </h1>
        <p className="mt-1 text-muted">
          {songs.length} song{songs.length === 1 ? "" : "s"}
          {collections.length > 0 && `, ${collections.length} collection${collections.length === 1 ? "" : "s"}`}
        </p>
      </header>

      {collections.length > 0 && (
        <section>
          <h2 className="smallcaps ornament text-base">Collections</h2>
          <ul className="mt-4 space-y-1.5">
            {collections.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="group flex items-baseline gap-2">
                  <span className="text-lg group-hover:text-accent">{c.title}</span>
                  <span className="flex-1 translate-y-[-4px] border-b border-dotted border-muted/50" aria-hidden />
                  <span className="text-sm text-muted">{c.year}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="smallcaps ornament text-base">Songs</h2>
        <div className="mt-4">
          {songs.length === 0 ? (
            <p className="text-center italic text-muted">No songs found.</p>
          ) : (
            <SongList songs={songs} showCollection />
          )}
        </div>
        {songs.length === 100 && <p className="mt-3 text-sm italic text-muted">Showing the first 100. Try a more specific search.</p>}
      </section>
    </div>
  );
}
