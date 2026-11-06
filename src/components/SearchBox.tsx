"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function Box() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  return (
    <form
      role="search"
      className="flex items-center gap-2 border-b border-ink/40 focus-within:border-accent"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <span aria-hidden className="text-muted">⌕</span>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a song, singer or year…"
        aria-label="Find a song, singer or year"
        className="w-full !rounded-none !border-0 !bg-transparent !px-0 !py-1.5 italic placeholder:text-muted"
      />
    </form>
  );
}

export default function SearchBox() {
  return (
    <Suspense>
      <Box />
    </Suspense>
  );
}
