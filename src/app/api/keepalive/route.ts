import { serviceClient } from "@/lib/server";

export const dynamic = "force-dynamic";

/**
 * Supabase pauses free projects after a week with no activity.
 * vercel.json runs this once a day so the site never goes to sleep.
 */
export async function GET() {
  const { count, error } = await serviceClient().from("songs").select("*", { count: "exact", head: true });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, songs: count });
}
