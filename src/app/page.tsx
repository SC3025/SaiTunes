import CollectionCard from "@/components/CollectionCard";
import { Cover } from "@/components/Player";
import { isConfigured, supabase } from "@/lib/supabase";
import type { Collection } from "@/lib/types";
import { KIND_LABEL } from "@/lib/media";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Row = Collection & { songs: { count: number }[] };

export default async function Home() {
  if (!isConfigured()) {
    return <p className="text-muted">Sai Tunes isn&apos;t connected to its database yet. See SETUP.md.</p>;
  }

  const { data, error } = await supabase()
    .from("collections")
    .select("*, songs(count)")
    .order("year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return <p className="text-red-400">Couldn&apos;t load music: {error.message}</p>;
  const collections = (data ?? []) as Row[];
  const featured = collections.filter((c) => c.is_featured);
  const totalSongs = collections.reduce((n, c) => n + (c.songs[0]?.count ?? 0), 0);

  const byYear = new Map<string, Row[]>();
  for (const c of collections) {
    const key = c.year ? String(c.year) : "Other";
    byYear.set(key, [...(byYear.get(key) ?? []), c]);
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Sai Tunes</h1>
        <p className="mt-1 text-muted">
          Every song from our department in one place. Listen here or download to keep.
          {totalSongs > 0 && ` ${totalSongs.toLocaleString()} songs in ${collections.length.toLocaleString()} collections.`}
        </p>
      </section>

      {featured.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-accent">New &amp; special releases</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((c) => (
              <Link
                key={c.id}
                href={`/c/${c.slug}`}
                className="flex items-center gap-4 rounded-xl border border-accent/30 bg-gradient-to-br from-accent/15 to-surface p-3 transition hover:border-accent"
              >
                <Cover coverKey={c.cover_key} className="h-20 w-20 text-2xl" />
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold">{c.title}</div>
                  <div className="text-sm text-muted">
                    {[c.year, KIND_LABEL[c.kind], `${c.songs[0]?.count ?? 0} songs`].filter(Boolean).join(" · ")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {collections.length === 0 && <p className="text-muted">No music yet. Admins can add the first collection from the admin page.</p>}

      {byYear.size > 1 && (
        <nav aria-label="Jump to year" className="flex flex-wrap gap-2">
          {[...byYear.keys()].map((y) => (
            <a key={y} href={`#y-${y}`} className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:border-accent hover:text-ink">
              {y}
            </a>
          ))}
        </nav>
      )}

      {[...byYear.entries()].map(([year, list]) => (
        <section key={year} id={`y-${year}`} className="scroll-mt-20">
          <h2 className="mb-2 text-xl font-bold">{year}</h2>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {list.map((c) => (
              <CollectionCard key={c.id} c={c} songCount={c.songs[0]?.count ?? 0} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
