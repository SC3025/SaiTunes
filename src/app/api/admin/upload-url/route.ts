import { errorResponse, HttpError, requireAdmin } from "@/lib/server";
import { createUploadTarget, MAX_UPLOAD_BYTES } from "@/lib/storage";
import { MAX_UPLOAD_MB, safeFileName } from "@/lib/media";

const ALLOWED = {
  audio: /^audio\//,
  covers: /^image\//,
} as const;

/** Gives an admin a one-time URL to upload one file straight to storage. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const { filename, contentType, folder, collectionSlug, size } = await req.json();
    if (folder !== "audio" && folder !== "covers") throw new HttpError(400, "Bad folder");
    if (typeof filename !== "string" || typeof contentType !== "string") throw new HttpError(400, "Missing file info");
    if (!ALLOWED[folder as keyof typeof ALLOWED].test(contentType)) {
      throw new HttpError(400, folder === "audio" ? "Only audio files can be uploaded here" : "Cover must be an image");
    }
    if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
      throw new HttpError(400, `File is larger than ${MAX_UPLOAD_MB} MB. Convert it to MP3 first.`);
    }
    const prefix = String(collectionSlug || "misc").replace(/[^a-z0-9-]/g, "");
    const key = `${folder}/${prefix}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(filename)}`;
    const target = await createUploadTarget(key, contentType);
    return Response.json({ ...target, key });
  } catch (err) {
    return errorResponse(err);
  }
}
