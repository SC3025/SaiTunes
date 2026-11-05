import Link from "next/link";
import type { Collection } from "@/lib/types";
import { KIND_LABEL } from "@/lib/media";
import { Cover } from "./Player";

export default function CollectionCard({ c, songCount }: { c: Collection; songCount?: number }) {
  return (
    <Link href={`/c/${c.slug}`} className="group block rounded-xl p-2 transition hover:bg-surface">
      <Cover coverKey={c.cover_key} className="aspect-square w-full text-4xl" />
      <div className="mt-2 truncate font-semibold group-hover:text-accent">{c.title}</div>
      <div className="truncate text-xs text-muted">
        {[c.year, KIND_LABEL[c.kind], songCount != null ? `${songCount} songs` : null].filter(Boolean).join(" · ")}
      </div>
    </Link>
  );
}
