"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch, supabase } from "@/lib/supabase";

interface AdminRow {
  user_id: string;
  email: string;
  added_at: string;
}

export default function AdminsPanel({ myId }: { myId: string }) {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { admins } = await adminFetch<{ admins: AdminRow[] }>("/api/admin/admins", undefined, "GET");
    setAdmins(admins);
  }, []);
  useEffect(() => {
    load().catch((e) => setMsg({ ok: false, text: e.message }));
  }, [load]);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ ok: true, text: success });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Admins can upload and edit music. Keep at least two or three, so the site never depends on one person.
      </p>
      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {admins.map((a) => (
          <li key={a.user_id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
            <span className="font-medium">{a.email}</span>
            {a.user_id === myId && <span className="rounded-full bg-raised px-2 py-0.5 text-xs text-muted">you</span>}
            <span className="ml-auto flex gap-2">
              {a.user_id !== myId && (
                <>
                  <button
                    className="btn btn-ghost !py-1 !text-xs"
                    disabled={busy}
                    onClick={() => {
                      const pw = prompt(`New password for ${a.email} (at least 8 characters):`);
                      if (pw) run(() => adminFetch("/api/admin/admins", { userId: a.user_id, password: pw }, "PATCH"), `Password reset for ${a.email}. Tell them the new one.`);
                    }}
                  >
                    Reset password
                  </button>
                  <button
                    className="btn btn-danger !py-1 !text-xs"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Remove ${a.email} as an admin?`)) run(() => adminFetch("/api/admin/admins", { userId: a.user_id }, "DELETE"), `${a.email} removed.`);
                    }}
                  >
                    Remove
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      <form
        className="space-y-3 rounded-xl border border-line bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await adminFetch("/api/admin/admins", { email, password });
            setEmail("");
            setPassword("");
          }, `Added. Send them the site link, their email and the temporary password. They can change it under "My password".`);
        }}
      >
        <h3 className="font-semibold">Add an admin</h3>
        <div className="flex flex-wrap gap-2">
          <input type="email" required placeholder="their.email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-0 flex-1" />
          <input type="text" required minLength={8} placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} className="min-w-0 flex-1" />
          <button className="btn" disabled={busy}>Add admin</button>
        </div>
      </form>
      {msg && <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}

export function PasswordPanel() {
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form
      className="flex max-w-lg flex-wrap gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase().auth.updateUser({ password: pw });
        setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Password changed." });
        if (!error) setPw("");
      }}
    >
      <input type="password" required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} className="min-w-0 flex-1" />
      <button className="btn">Change my password</button>
      {msg && <p className={`w-full text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
