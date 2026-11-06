import { serviceClient } from "@/lib/server";
import { downloadLocation } from "@/lib/storage";

/** Sends the browser to the song file as a download with a friendly file name. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const { data: song } = await serviceClient()
    .from("songs")
    .select("title, artist, file_key")
    .eq("id", id)
    .maybeSingle();
  if (!song) return new Response("Song not found", { status: 404 });

  const ext = song.file_key.match(/\.[a-z0-9]+$/i)?.[0] ?? "";
  const name = `${song.artist ? `${song.artist} - ` : ""}${song.title}${ext}`.replace(/[\\/:*?"<>|]+/g, "");
  return Response.redirect(await downloadLocation(song.file_key, name), 302);
}
