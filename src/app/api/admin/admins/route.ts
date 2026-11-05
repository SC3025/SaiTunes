import type { SupabaseClient } from "@supabase/supabase-js";
import { errorResponse, HttpError, requireAdmin, serviceClient } from "@/lib/server";

async function findUserIdByEmail(db: SupabaseClient, email: string): Promise<string | null> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

function checkPassword(password: unknown): string {
  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "Password must be at least 8 characters");
  }
  return password;
}

/** List admins. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const { data, error } = await serviceClient().from("admins").select("*").order("added_at");
    if (error) throw error;
    return Response.json({ admins: data });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Add an admin: creates their login with a temporary password you give them. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Enter a valid email");
    const password = checkPassword(body.password);
    const db = serviceClient();

    let userId: string | null = null;
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.data.user) {
      userId = created.data.user.id;
    } else {
      // They may already have a login (e.g. removed earlier) — reuse it and set the new password.
      userId = await findUserIdByEmail(db, email);
      if (!userId) throw created.error ?? new HttpError(500, "Could not create user");
      const { error } = await db.auth.admin.updateUserById(userId, { password });
      if (error) throw error;
    }
    const { error } = await db.from("admins").upsert({ user_id: userId, email });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Reset another admin's password (for when someone forgets theirs). */
export async function PATCH(req: Request) {
  try {
    await requireAdmin(req);
    const { userId, password } = await req.json();
    const db = serviceClient();
    const { data: target } = await db.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
    if (!target) throw new HttpError(404, "Admin not found");
    const { error } = await db.auth.admin.updateUserById(userId, { password: checkPassword(password) });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Remove an admin. The last admin can never be removed, so the site can't get locked out. */
export async function DELETE(req: Request) {
  try {
    const me = await requireAdmin(req);
    const { userId } = await req.json();
    const db = serviceClient();
    const { count } = await db.from("admins").select("*", { count: "exact", head: true });
    if ((count ?? 0) <= 1) throw new HttpError(400, "You can't remove the last admin");
    if (userId === me.userId) throw new HttpError(400, "Ask another admin to remove you");
    const { error } = await db.from("admins").delete().eq("user_id", userId);
    if (error) throw error;
    await db.auth.admin.deleteUser(userId);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
