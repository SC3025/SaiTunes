import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { bucket, errorResponse, HttpError, r2, requireAdmin, serviceClient } from "@/lib/server";

async function deleteFiles(keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    if (!chunk.length) continue;
    await r2().send(
      new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }),
    );
  }
}

/** Deletes a song or a whole collection, including the files in R2. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const { type, id } = await req.json();
    const db = serviceClient();

    if (type === "song") {
      const { data: song } = await db.from("songs").select("file_key").eq("id", id).maybeSingle();
      if (!song) throw new HttpError(404, "Song not found");
      const { error } = await db.from("songs").delete().eq("id", id);
      if (error) throw error;
      await deleteFiles([song.file_key]);
    } else if (type === "collection") {
      const { data: col } = await db.from("collections").select("cover_key").eq("id", id).maybeSingle();
      if (!col) throw new HttpError(404, "Collection not found");
      const { data: songs } = await db.from("songs").select("file_key").eq("collection_id", id);
      const { error } = await db.from("collections").delete().eq("id", id);
      if (error) throw error;
      await deleteFiles([...(songs ?? []).map((s) => s.file_key), ...(col.cover_key ? [col.cover_key] : [])]);
    } else if (type === "file") {
      // Clean up an uploaded file that never got saved (e.g. replaced cover, failed upload).
      if (typeof id !== "string" || !/^(audio|covers)\//.test(id)) throw new HttpError(400, "Bad file key");
      await deleteFiles([id]);
    } else {
      throw new HttpError(400, "Unknown type");
    }
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
