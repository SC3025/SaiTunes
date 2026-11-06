"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePlayer, type Track } from "./Player";

export interface DialYear {
  year: number;
  songs: number;
}

const ITEM_W = 76; // width of one stop on the dial, px

interface Row {
  id: string;
  title: string;
  artist: string | null;
  file_key: string;
  collections: { slug: string; title: string; year: number | null; cover_key: string | null } | null;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Sai Tunes FM: turn the dial to a year (or "All years") and tune in.
 * It shuffles that year's songs into the player, like a radio station.
 */
export default function RadioDial({ years, totalSongs }: { years: DialYear[]; totalSongs: number }) {
  const stops: { label: string; year: number | null; songs: number }[] = [
    { label: "All", year: null, songs: totalSongs },
    ...years.map((y) => ({ label: String(y.year), year: y.year, songs: y.songs })),
  ];
  const trackRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { current, playing, station, playQueue, toggle, next } = usePlayer();

  const stationName = (i: number) => `Sai Tunes FM · ${stops[i].year ?? "All years"}`;
  const onThisStation = station === stationName(sel);

  const goTo = useCallback((i: number, smooth = true) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * ITEM_W, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Read which stop sits under the needle while the dial is scrolled or dragged.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => setSel(Math.max(0, Math.min(stops.length - 1, Math.round(el.scrollLeft / ITEM_W)))), 60);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, [stops.length]);

  async function tuneIn() {
    if (onThisStation && current) return toggle();
    setLoading(true);
    setError("");
    try {
      const year = stops[sel].year;
      let q = supabase()
        .from("songs")
        .select("id, title, artist, file_key, collections!inner(slug, title, year, cover_key)")
        .limit(1000);
      if (year !== null) q = q.eq("collections.year", year);
      const { data, error } = await q;
      if (error) throw error;
      const tracks: Track[] = shuffle((data ?? []) as unknown as Row[]).map((r) => ({
        id: r.id,
        title: r.title,
        artist: r.artist,
        file_key: r.file_key,
        cover_key: r.collections?.cover_key,
        collectionTitle: r.collections?.title,
        collectionSlug: r.collections?.slug,
        year: r.collections?.year,
      }));
      if (!tracks.length) throw new Error("Nothing on this frequency yet.");
      playQueue(tracks, 0, stationName(sel));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const stop = stops[sel];
  const label = loading
    ? "Tuning…"
    : onThisStation && playing
      ? "❚❚  Pause"
      : onThisStation
        ? "▶  Resume"
        : `▶  Tune in${stop.year ? ` to ${stop.year}` : ""}`;

  return (
    <section aria-label="Sai Tunes FM radio" className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_0_var(--line),0_18px_40px_-28px_color-mix(in_srgb,var(--ink)_45%,transparent)]">
      {/* readout */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-7 sm:pt-6">
        <div>
          <div className="smallcaps flex items-center gap-2 text-sm text-gold">
            <span className={`inline-block h-2 w-2 rounded-full ${onThisStation && playing ? "on-air bg-accent" : "bg-line"}`} aria-hidden />
            Sai Tunes FM {onThisStation && playing ? "· on air" : ""}
          </div>
          <div className="mt-1 font-display text-5xl font-semibold leading-none tracking-tight tabular-nums sm:text-6xl">
            {stop.year ?? <span className="italic">All years</span>}
          </div>
          <div className="mt-1 text-sm italic text-muted">
            {stop.songs.toLocaleString()} song{stop.songs === 1 ? "" : "s"} on this frequency
            {stop.year && (
              <>
                {" · "}
                <a href={`#y-${stop.year}`} className="underline decoration-line underline-offset-4 hover:text-accent">read the {stop.year} chapter</a>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn !px-6 !py-3 text-base" onClick={tuneIn} disabled={loading || stop.songs === 0}>
            {label}
          </button>
          {onThisStation && (
            <button className="btn btn-ghost !px-3 !py-3" onClick={next} aria-label="Skip to next song" title="Skip">
              ⏭
            </button>
          )}
        </div>
      </div>

      {onThisStation && current && (
        <p className="px-5 pt-3 text-muted sm:px-7">
          Now playing <span className="font-display text-lg italic text-ink">{current.title}</span>
          {current.collectionTitle && <> from {current.collectionTitle}</>}
          {current.year && current.year !== stop.year ? ` (${current.year})` : ""}
        </p>
      )}
      {error && <p className="px-5 pt-2 text-sm text-bad sm:px-7">{error}</p>}

      {/* the dial */}
      <div className="relative mt-5 border-t border-line bg-raised/60">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-[2px] -translate-x-1/2 bg-accent" aria-hidden>
          <div className="absolute -top-px left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-accent" />
        </div>
        <div
          ref={trackRef}
          className="dial-track flex overflow-x-auto py-3"
          style={{ paddingInline: `calc(50% - ${ITEM_W / 2}px)` }}
          role="listbox"
          aria-label="Choose a year"
        >
          {stops.map((s, i) => (
            <button
              key={s.label}
              role="option"
              aria-selected={i === sel}
              onClick={() => goTo(i)}
              style={{ width: ITEM_W }}
              className="group relative shrink-0 snap-center pb-1 pt-5 text-center"
            >
              {/* ruler ticks: one tall tick per year, small ticks between */}
              <span className="absolute left-1/2 top-0 h-3.5 w-px -translate-x-1/2 bg-ink/50" aria-hidden />
              {i < stops.length - 1 && [0.25, 0.5, 0.75].map((f) => (
                <span key={f} className="absolute top-0 h-1.5 w-px bg-ink/25" style={{ left: `${f * 100 + 50}%` }} aria-hidden />
              ))}
              <span
                className={`font-display tabular-nums transition ${i === sel ? "text-xl font-semibold text-accent" : "text-base text-muted group-hover:text-ink"} ${s.year === null ? "italic" : ""}`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => goTo(Math.max(0, sel - 1))} aria-label="Earlier year" className="absolute left-1 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-surface text-muted shadow-sm ring-1 ring-line hover:text-ink">‹</button>
        <button onClick={() => goTo(Math.min(stops.length - 1, sel + 1))} aria-label="Later year" className="absolute right-1 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-surface text-muted shadow-sm ring-1 ring-line hover:text-ink">›</button>
      </div>
    </section>
  );
}
