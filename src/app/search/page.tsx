import SongList from "@/components/SongList";
import CollectionCard from "@/components/CollectionCard";
import { supabase } from "@/lib/supabase";
import type { Collection, SongWithCollection } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const raw = ((await searchParams).q ?? "").trim();
  // Strip characters that have meaning in Supabase filter syntax.
  const q = raw.replace(/[%,()*\\]/g, " ").trim().slice(0, 100);
  if (!q) return <p className="text-muted">Type something in the search box to find songs.</p>;

  const pattern = `%${q}%`;
  const [songsRes, colsRes] = await Promise.all([
    supabase()
      .from("songs")
      .select("*, collections(slug, title, year, cover_key)")
      .or(`title.ilike.${pattern},artist.ilike.${pattern}`)
      .order("title")
      .limit(100),
    supabase().from("collections").select("*").ilike("title", pattern).order("year", { ascending: false }).limit(20),
  ]);

  const songs = ((songsRes.data ?? []) as SongWithCollection[]).map((s) => ({
    ...s,
    cover_key: s.collections?.cover_key,
    collectionTitle: s.collections?.title,
    collectionSlug: s.collections?.slug,
  }));
  const collections = (colsRes.data ?? []) as Collection[];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Results for &ldquo;{raw}&rdquo;</h1>
      {collections.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">Collections</h2>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {collections.map((c) => (
              <CollectionCard key={c.id} c={c} />
            ))}
          </div>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
          Songs {songs.length === 100 && "(first 100, try a more specific search)"}
        </h2>
        <SongList songs={songs} showCollection />
      </section>
    </div>
  );
}
