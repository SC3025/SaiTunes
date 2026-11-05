"use client";

import Link from "next/link";
import { formatDuration } from "@/lib/media";
import { usePlayer, type Track } from "./Player";

export interface SongRow extends Track {
  track_number?: number | null;
  duration_seconds?: number | null;
  collectionSlug?: string;
}

export default function SongList({ songs, showCollection = false }: { songs: SongRow[]; showCollection?: boolean }) {
  const { current, playing, playQueue, toggle } = usePlayer();

  if (!songs.length) return <p className="py-8 text-center text-muted">No songs here yet.</p>;

  return (
    <ol className="divide-y divide-line rounded-xl border border-line bg-surface">
      {songs.map((song, i) => {
        const isCurrent = current?.id === song.id;
        return (
          <li key={song.id} className={`group flex items-center gap-3 px-3 py-2.5 ${isCurrent ? "bg-raised" : "hover:bg-raised/60"}`}>
            <button
              onClick={() => (isCurrent ? toggle() : playQueue(songs, i))}
              aria-label={isCurrent && playing ? `Pause ${song.title}` : `Play ${song.title}`}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm ${isCurrent ? "bg-accent text-accent-ink" : "bg-raised text-ink group-hover:bg-accent group-hover:text-accent-ink"}`}
            >
              {isCurrent && playing ? "❚❚" : "▶"}
            </button>
            <div className="min-w-0 flex-1">
              <div className={`truncate font-medium ${isCurrent ? "text-accent" : ""}`}>{song.title}</div>
              <div className="truncate text-sm text-muted">
                {song.artist}
                {showCollection && song.collectionTitle && (
                  <>
                    {song.artist ? " · " : ""}
                    <Link href={`/c/${song.collectionSlug}`} className="hover:text-ink hover:underline">
                      {song.collectionTitle}
                    </Link>
                  </>
                )}
              </div>
            </div>
            <span className="hidden text-sm tabular-nums text-muted sm:block">{formatDuration(song.duration_seconds)}</span>
            <a
              href={`/api/download/${song.id}`}
              className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-bg hover:text-ink"
              aria-label={`Download ${song.title}`}
              title="Download"
            >
              ⬇<span className="ml-1 hidden sm:inline">Download</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
