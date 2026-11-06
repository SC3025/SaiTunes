"use client";

import { usePlayer, type Track } from "./Player";

export default function PlayAllButton({ songs, station }: { songs: Track[]; station?: string }) {
  const { playQueue } = usePlayer();
  return (
    <button className="btn !px-6 !py-2.5" onClick={() => playQueue(songs, 0, station ?? null)}>
      ▶ Play all
    </button>
  );
}
