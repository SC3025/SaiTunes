"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/supabase";

type Status = { connected: boolean; uploadsAllowed?: boolean; error?: string };

/** One-click check and fix for the file storage (Backblaze B2 / R2) settings. */
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
          ✗ Can&apos;t reach the storage bucket. Check the STORAGE_* settings in Vercel, then redeploy.
          {status.error && <span className="mt-1 block text-xs text-muted">Details: {status.error}</span>}
        </p>
      ) : status.uploadsAllowed ? (
        <p className="text-green-400">✓ Storage connected and ready for uploads.</p>
      ) : (
        <p className="text-amber-300">Storage is connected, but uploads from the website aren&apos;t switched on yet.</p>
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
          {busy ? "Setting up…" : "Switch on uploads"}
        </button>
      )}
      {msg && <p className="text-red-400">{msg}</p>}
    </div>
  );
}
