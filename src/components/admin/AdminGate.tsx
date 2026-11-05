"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isConfigured, supabase } from "@/lib/supabase";

/** Shows a login form until someone who is in the admins table signs in. */
export default function AdminGate({ children }: { children: (session: Session) => React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isConfigured()) return setSession(null);
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setIsAdmin(undefined);
    supabase()
      .rpc("is_admin")
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [session]);

  if (!isConfigured()) return <p className="text-muted">Supabase isn&apos;t configured yet. See SETUP.md.</p>;
  if (session === undefined || (session && isAdmin === undefined)) return <p className="text-muted">Loading…</p>;
  if (!session) return <LoginForm />;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-16 text-center">
        <p>
          <b>{session.user.email}</b> is logged in but isn&apos;t an admin. Ask an existing admin to add you.
        </p>
        <button className="btn btn-ghost" onClick={() => supabase().auth.signOut()}>Log out</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-line pb-3 text-sm">
        <Link href="/admin" className="font-semibold text-accent">Admin</Link>
        <span className="text-muted">Logged in as {session.user.email}</span>
        <button className="ml-auto text-muted hover:text-ink" onClick={() => supabase().auth.signOut()}>Log out</button>
      </div>
      {children(session)}
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="mx-auto mt-10 max-w-sm space-y-4 rounded-2xl border border-line bg-surface p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
        if (error) setError(error.message === "Invalid login credentials" ? "Wrong email or password" : error.message);
        setBusy(false);
      }}
    >
      <h1 className="text-xl font-bold">Admin login</h1>
      <p className="text-sm text-muted">For people who upload and manage Sai Tunes music.</p>
      <label className="block space-y-1 text-sm">
        <span>Email</span>
        <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" />
      </label>
      <label className="block space-y-1 text-sm">
        <span>Password</span>
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full" />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button className="btn w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</button>
      <p className="text-xs text-muted">Forgot your password? Any other admin can reset it for you from the admin page.</p>
    </form>
  );
}
