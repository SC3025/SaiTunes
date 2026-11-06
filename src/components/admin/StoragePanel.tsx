"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/supabase";

type Status = { provider?: "supabase" | "s3"; connected: boolean; uploadsAllowed?: boolean; error?: string };

/** One-click check and setup for file storage (Supabase Storage, or S3-compatible). */
export default function StoragePanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    setStatus(null);
    try {
      setStatus(await adminFetch<Status>("/api/admin/setup-storage", undefined, "GET"));
    } catch (e) {
      setStatus({ connected: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, []);
  useEffect(() => {
    check();
  }, [check]);

  return (
    <div className="space-y-4 rounded-xl border border-line bg-surface p-5 text-sm">
      <h3 className="text-base font-semibold">File storage</h3>
      {!status ? (
        <p className="text-muted">Checking…</p>
      ) : !status.connected ? (
        <p className="text-red-400">
          ✗ Can&apos;t reach the storage bucket. Check the Supabase keys (or STORAGE_* settings) in Vercel, then redeploy.
          {status.error && <span className="mt-1 block text-xs text-muted">Details: {status.error}</span>}
        </p>
      ) : status.uploadsAllowed ? (
        <p className="text-green-400">
          ✓ Storage ready for uploads ({status.provider === "s3" ? "S3-compatible storage" : "Supabase Storage"}).
        </p>
      ) : (
        <p className="text-amber-300">Storage isn&apos;t set up yet. Click the button once.</p>
      )}
      {status?.connected && !status.uploadsAllowed && (
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMsg("");
            try {
              await adminFetch("/api/admin/setup-storage", {});
              await check();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Setting up…" : "Set up storage"}
        </button>
      )}
      {msg && <p className="text-red-400">{msg}</p>}
    </div>
  );
}
