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
  collectionSlug?: string;
  year?: number | null;
}

interface PlayerState {
  current: Track | null;
  playing: boolean;
  /** Label of the radio station / chapter being played, e.g. "Sai Tunes FM · 2007". */
  station: string | null;
  playQueue: (tracks: Track[], startIndex: number, station?: string | null) => void;
  toggle: () => void;
  next: () => void;
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
  const [station, setStation] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const current = queue[index] ?? null;

  const playQueue = useCallback((tracks: Track[], startIndex: number, label: string | null = null) => {
    setQueue(tracks);
    setIndex(startIndex);
    setStation(label);
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

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !current) return;
    setTime(0);
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

  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <PlayerContext.Provider value={{ current, playing, station, playQueue, toggle, next }}>
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-double border-line bg-surface/95 backdrop-blur">
          {/* progress: a thin ink line you can click to seek */}
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
            className="absolute inset-x-0 -top-[7px] h-3 w-full cursor-pointer appearance-none !rounded-none !border-0 !bg-transparent !p-0 opacity-0"
          />
          <div className="pointer-events-none absolute inset-x-0 -top-[3px] h-[3px] bg-accent" style={{ width: `${pct}%` }} />
          <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
            <Cover coverKey={current.cover_key} className="hidden h-12 w-12 sm:grid" />
            <div className="min-w-0 flex-1">
              <div className="smallcaps flex items-center gap-1.5 truncate text-xs text-gold">
                {station && <span className="on-air inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                {station ?? current.collectionTitle ?? "Now playing"}
              </div>
              <div className="truncate font-display text-lg italic leading-tight">{current.title}</div>
              <div className="truncate text-sm text-muted">
                {current.artist ? `sung by ${current.artist}` : current.collectionTitle}
                {station && current.collectionTitle && current.artist ? ` · ${current.collectionTitle}` : ""}
              </div>
            </div>
            <span className="hidden text-sm tabular-nums text-muted md:block">
              {formatDuration(time)} / {formatDuration(duration)}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={prev} aria-label="Previous" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink">⏮</button>
              <button
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-ink shadow-sm"
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <button onClick={next} aria-label="Next" disabled={index + 1 >= queue.length} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-raised hover:text-ink disabled:opacity-30">⏭</button>
            </div>
            <a href={`/api/download/${current.id}`} className="smallcaps hidden text-sm text-muted hover:text-accent sm:block" aria-label="Download this song">
              Keep ↓
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
    <img src={url} alt="" className={`shrink-0 rounded-sm object-cover ring-1 ring-line ${className}`} />
  ) : (
    <div className={`grid shrink-0 place-items-center rounded-sm bg-raised font-display italic text-gold ring-1 ring-line ${className}`}>❦</div>
  );
}
