import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucket, hourlySigningDate, storage, serviceClient } from "@/lib/server";

/** Sends the browser to the song file with a "save as" header and a friendly file name. */
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
  const ascii = name.replace(/[^\x20-\x7e]/g, "_");
  const url = await getSignedUrl(
    storage(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: song.file_key,
      ResponseContentDisposition: `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    }),
    { expiresIn: 60 * 60 * 2, signingDate: hourlySigningDate() },
  );
  return Response.redirect(url, 302);
}
