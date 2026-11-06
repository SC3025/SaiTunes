import Link from "next/link";
import RadioDial from "@/components/RadioDial";
import { isConfigured, supabase } from "@/lib/supabase";
import type { Collection } from "@/lib/types";
import { KIND_LABEL } from "@/lib/media";

export const dynamic = "force-dynamic";

type Row = Collection & { songs: { count: number }[] };

export default async function Home() {
  if (!isConfigured()) {
    return <p className="italic text-muted">Sai Tunes isn&apos;t connected to its database yet. See SETUP.md.</p>;
  }

  const { data, error } = await supabase()
    .from("collections")
    .select("*, songs(count)")
    .order("year", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) return <p className="text-bad">Couldn&apos;t load music: {error.message}</p>;

  const collections = (data ?? []) as Row[];
  const count = (c: Row) => c.songs[0]?.count ?? 0;
  const featured = collections.filter((c) => c.is_featured);
  const totalSongs = collections.reduce((n, c) => n + count(c), 0);

  const byYear = new Map<string, Row[]>();
  for (const c of collections) {
    const key = c.year ? String(c.year) : "Undated";
    byYear.set(key, [...(byYear.get(key) ?? []), c]);
  }
  const dialYears = [...byYear.entries()]
    .filter(([y]) => y !== "Undated")
    .map(([y, list]) => ({ year: Number(y), songs: list.reduce((n, c) => n + count(c), 0) }))
    .sort((a, b) => a.year - b.year);
  const first = dialYears[0]?.year;
  const last = dialYears[dialYears.length - 1]?.year;

  return (
    <div className="space-y-14">
      <section className="space-y-6">
        <div className="max-w-2xl">
          <p className="smallcaps text-sm text-gold">
            {first && last ? `${first} – ${last}` : "Our music"} · {totalSongs.toLocaleString()} songs
          </p>
          <h1 className="mt-1 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            Every song we&apos;ve ever sung, <span className="italic text-accent">in one book.</span>
          </h1>
          <p className="mt-3 text-lg text-muted">
            Turn the dial to a year and tune in, or read through the chapters below. Every song can be downloaded to keep.
          </p>
        </div>
        <RadioDial years={dialYears} totalSongs={totalSongs} />
      </section>

      {featured.length > 0 && (
        <section className="rounded-xl border-[3px] border-double border-gold/50 bg-surface px-5 py-5 sm:px-7">
          <div className="smallcaps text-center text-sm text-gold">❦ New this season ❦</div>
          <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {featured.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="group flex items-baseline gap-2">
                  <span className="font-display text-xl italic group-hover:text-accent">{c.title}</span>
                  <span className="flex-1 translate-y-[-4px] border-b border-dotted border-muted/50" aria-hidden />
                  <span className="text-sm text-muted">{[c.year, `${count(c)} songs`].filter(Boolean).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="contents">
        <h2 id="contents" className="smallcaps ornament text-base">Contents</h2>
        {collections.length === 0 && (
          <p className="mt-6 text-center italic text-muted">The book is empty for now. Admins can add the first chapter.</p>
        )}
        <div className="mt-6 space-y-8">
          {[...byYear.entries()].map(([year, list]) => (
            <div key={year} id={`y-${year}`} className="grid scroll-mt-6 gap-x-6 gap-y-1 sm:grid-cols-[7rem_1fr]">
              <div className="font-display text-3xl font-semibold tabular-nums text-gold/90 sm:text-right sm:text-4xl">{year}</div>
              <ul className="space-y-1.5 sm:pt-2">
                {list.map((c) => (
                  <li key={c.id}>
                    <Link href={`/c/${c.slug}`} className="group flex items-baseline gap-2">
                      <span className="text-lg group-hover:text-accent">
                        {c.title}
                        {c.kind !== "album" && <span className="smallcaps ml-2 text-xs text-muted">{KIND_LABEL[c.kind]}</span>}
                        {c.is_featured && <span className="smallcaps ml-2 text-xs text-accent">new</span>}
                      </span>
                      <span className="flex-1 translate-y-[-4px] border-b border-dotted border-muted/50" aria-hidden />
                      <span className="text-sm tabular-nums text-muted">{count(c)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
