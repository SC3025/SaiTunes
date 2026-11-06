import { errorResponse, HttpError, requireAdmin, serviceClient } from "@/lib/server";
import { deleteStoredFiles } from "@/lib/storage";

/** Deletes a song or a whole collection, including the stored files. */
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
      await deleteStoredFiles([song.file_key]);
    } else if (type === "collection") {
      const { data: col } = await db.from("collections").select("cover_key").eq("id", id).maybeSingle();
      if (!col) throw new HttpError(404, "Collection not found");
      const { data: songs } = await db.from("songs").select("file_key").eq("collection_id", id);
      const { error } = await db.from("collections").delete().eq("id", id);
      if (error) throw error;
      await deleteStoredFiles([...(songs ?? []).map((s) => s.file_key), ...(col.cover_key ? [col.cover_key] : [])]);
    } else if (type === "file") {
      // Clean up an uploaded file that never got saved (e.g. replaced cover, failed upload).
      if (typeof id !== "string" || !/^(audio|covers)\//.test(id)) throw new HttpError(400, "Bad file key");
      await deleteStoredFiles([id]);
    } else {
      throw new HttpError(400, "Unknown type");
    }
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
