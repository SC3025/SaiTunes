"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminGate from "@/components/admin/AdminGate";
import AdminsPanel, { PasswordPanel } from "@/components/admin/AdminsPanel";
import CollectionForm from "@/components/admin/CollectionForm";
import { Cover } from "@/components/Player";
import { KIND_LABEL } from "@/lib/media";
import { supabase } from "@/lib/supabase";
import type { Collection } from "@/lib/types";

type Tab = "music" | "admins" | "account";

export default function AdminPage() {
  return <AdminGate>{(session) => <Dashboard myId={session.user.id} />}</AdminGate>;
}

function Dashboard({ myId }: { myId: string }) {
  const [tab, setTab] = useState<Tab>("music");
  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-full border border-line bg-surface p-1 text-sm sm:w-fit">
        {(
          [
            ["music", "Music"],
            ["admins", "Admins"],
            ["account", "My password"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-full px-4 py-1.5 ${tab === key ? "bg-accent font-semibold text-accent-ink" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "music" && <MusicPanel />}
      {tab === "admins" && <AdminsPanel myId={myId} />}
      {tab === "account" && <PasswordPanel />}
    </div>
  );
}

function MusicPanel() {
  const router = useRouter();
  const [collections, setCollections] = useState<(Collection & { songs: { count: number }[] })[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    supabase()
      .from("collections")
      .select("*, songs(count)")
      .order("year", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => setCollections((data ?? []) as never));
  }, []);

  const shown = (collections ?? []).filter((c) => `${c.title} ${c.year ?? ""}`.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-5">
      {creating ? (
        <CollectionForm onSaved={(c) => router.push(`/admin/c/${c.id}`)} onCancel={() => setCreating(false)} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" onClick={() => setCreating(true)}>+ New collection / release</button>
          <input placeholder="Filter collections…" value={filter} onChange={(e) => setFilter(e.target.value)} className="min-w-0 flex-1 sm:max-w-xs" />
        </div>
      )}
      {collections === null ? (
        <p className="text-muted">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="text-muted">No collections yet. Create one, then upload songs into it.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {shown.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/c/${c.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-raised">
                <Cover coverKey={c.cover_key} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.title}</div>
                  <div className="text-xs text-muted">
                    {[c.year, KIND_LABEL[c.kind], `${c.songs[0]?.count ?? 0} songs`, c.is_featured ? "★ featured" : null].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="text-sm text-muted">Edit →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
