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
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search songs or artists…"
        aria-label="Search songs or artists"
        className="w-full !rounded-full !py-1.5 text-sm"
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
