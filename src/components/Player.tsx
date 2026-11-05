"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { fileUrl, formatDuration } from "@/lib/media";

export interface Track {
  id: string;
  title: string;
  artist: string | null;
  file_key: string;
  cover_key?: string | null;
  collectionTitle?: string;
}

interface PlayerState {
  current: Track | null;
  playing: boolean;
  playQueue: (tracks: Track[], startIndex: number) => void;
  toggle: () => void;
}

const PlayerContext = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be inside PlayerProvider");
  return ctx;
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const current = queue[index] ?? null;

  const playQueue = useCallback((tracks: Track[], startIndex: number) => {
    setQueue(tracks);
    setIndex(startIndex);
  }, []);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    if (a.paused) void a.play();
    else a.pause();
  }, [current]);

  const next = useCallback(() => setIndex((i) => (i + 1 < queue.length ? i + 1 : i)), [queue.length]);
  const prev = useCallback(() => {
    const a = audioRef.current;
    if (a && a.currentTime > 3) a.currentTime = 0;
    else setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Load and start the new track whenever it changes.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    a.src = fileUrl(current.file_key) ?? "";
    void a.play().catch(() => setPlaying(false));
  }, [current]);

  // Lock-screen / headphone controls on phones.
  useEffect(() => {
    if (!current || !("mediaSession" in navigator)) return;
    const art = fileUrl(current.cover_key);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist ?? "Sai Tunes",
      album: current.collectionTitle ?? "",
      artwork: art ? [{ src: art, sizes: "512x512" }] : [],
    });
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  }, [current, next, prev]);

  return (
    <PlayerContext.Provider value={{ current, playing, playQueue, toggle }}>
      {children}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => (index + 1 < queue.length ? next() : setPlaying(false))}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      {current && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <Cover coverKey={current.cover_key} className="h-12 w-12" />
            <div className="min-w-0 flex-1 sm:flex-none sm:w-56">
              <div className="truncate text-sm font-semibold">{current.title}</div>
              <div className="truncate text-xs text-muted">{current.artist ?? current.collectionTitle}</div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={prev} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-full hover:bg-raised">⏮</button>
              <button
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="grid h-10 w-10 place-items-center rounded-full bg-accent text-accent-ink"
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <button onClick={next} aria-label="Next" disabled={index + 1 >= queue.length} className="grid h-9 w-9 place-items-center rounded-full hover:bg-raised disabled:opacity-30">⏭</button>
            </div>
            <div className="hidden flex-1 items-center gap-2 text-xs tabular-nums text-muted sm:flex">
              <span>{formatDuration(time)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={1}
                value={Math.min(time, duration || 0)}
                onChange={(e) => {
                  if (audioRef.current) audioRef.current.currentTime = Number(e.target.value);
                }}
                aria-label="Seek"
                className="flex-1 !border-0 !p-0 accent-[var(--color-accent)]"
              />
              <span>{formatDuration(duration)}</span>
            </div>
            <a href={`/api/download/${current.id}`} className="hidden text-xs text-muted hover:text-ink sm:block" aria-label="Download current song">
              ⬇
            </a>
          </div>
        </div>
      )}
    </PlayerContext.Provider>
  );
}

export function Cover({ coverKey, className = "" }: { coverKey?: string | null; className?: string }) {
  const url = fileUrl(coverKey);
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={`shrink-0 rounded-md object-cover ${className}`} />
  ) : (
    <div className={`grid shrink-0 place-items-center rounded-md bg-gradient-to-br from-accent/40 to-raised text-accent ${className}`}>♪</div>
  );
}
