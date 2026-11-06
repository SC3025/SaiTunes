"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/media";
import { usePlayer, type Track } from "./Player";

export interface SongRow extends Track {
  track_number?: number | null;
  duration_seconds?: number | null;
}

/** Songs laid out like numbered hymns in a songbook. */
export default function SongList({ songs, showCollection = false, station = null }: { songs: SongRow[]; showCollection?: boolean; station?: string | null }) {
  const { current, playing, playQueue, toggle } = usePlayer();

  if (!songs.length) return <p className="py-8 text-center italic text-muted">No songs here yet.</p>;

  return (
    <ol className="divide-y divide-line/70 border-y border-line">
      {songs.map((song, i) => {
        const isCurrent = current?.id === song.id;
        return (
          <li key={song.id} className={`group flex items-center gap-3 py-3 sm:gap-4 ${isCurrent ? "bg-accent/5" : ""}`}>
            <button
              onClick={() => (isCurrent ? toggle() : playQueue(songs, i, station))}
              aria-label={isCurrent && playing ? `Pause ${song.title}` : `Play ${song.title}`}
              className="flex w-12 shrink-0 flex-col items-center sm:w-14"
            >
              <span className={`smallcaps text-[0.7rem] leading-none ${isCurrent ? "text-accent" : "text-gold"}`}>No.</span>
              <span className={`font-display text-2xl leading-none tabular-nums ${isCurrent ? "hidden" : "group-hover:hidden"}`}>
                {song.track_number ?? i + 1}
              </span>
              <span className={`text-xl leading-none text-accent ${isCurrent ? "" : "hidden group-hover:block"}`}>
                {isCurrent && playing ? "❚❚" : "▶"}
              </span>
            </button>
            <button onClick={() => (isCurrent ? toggle() : playQueue(songs, i, station))} className="min-w-0 flex-1 text-left">
              <div className={`truncate font-display text-xl leading-snug ${isCurrent ? "italic text-accent" : ""}`}>{song.title}</div>
              <div className="truncate text-[0.95rem] italic text-muted">
                {song.artist && <>sung by {song.artist}</>}
                {showCollection && song.collectionTitle && (
                  <>
                    {song.artist ? " · " : ""}
                    <Link href={`/c/${song.collectionSlug}`} onClick={(e) => e.stopPropagation()} className="not-italic hover:text-accent hover:underline">
                      {song.collectionTitle}
                      {song.year ? `, ${song.year}` : ""}
                    </Link>
                  </>
                )}
              </div>
            </button>
            <span className="hidden text-sm tabular-nums text-muted sm:block">{formatDuration(song.duration_seconds)}</span>
            <a
              href={`/api/download/${song.id}`}
              className="smallcaps shrink-0 rounded-full px-3 py-1.5 text-sm text-muted ring-1 ring-transparent hover:text-accent hover:ring-line"
              aria-label={`Download ${song.title}`}
            >
              <span className="hidden sm:inline">Keep </span>↓
            </a>
          </li>
        );
      })}
    </ol>
  );
}
