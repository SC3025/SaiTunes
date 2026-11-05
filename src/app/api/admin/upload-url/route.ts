import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucket, errorResponse, HttpError, r2, requireAdmin } from "@/lib/server";
import { safeFileName } from "@/lib/media";

const ALLOWED = {
  audio: /^audio\//,
  covers: /^image\//,
} as const;

/** Gives an admin a short-lived URL to upload one file straight to R2. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const { filename, contentType, folder, collectionSlug } = await req.json();
    if (folder !== "audio" && folder !== "covers") throw new HttpError(400, "Bad folder");
    if (typeof filename !== "string" || typeof contentType !== "string") throw new HttpError(400, "Missing file info");
    if (!ALLOWED[folder as keyof typeof ALLOWED].test(contentType)) {
      throw new HttpError(400, folder === "audio" ? "Only audio files can be uploaded here" : "Cover must be an image");
    }
    const prefix = String(collectionSlug || "misc").replace(/[^a-z0-9-]/g, "");
    const key = `${folder}/${prefix}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(filename)}`;
    const url = await getSignedUrl(
      r2(),
      new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
      { expiresIn: 60 * 60 },
    );
    return Response.json({ url, key });
  } catch (err) {
    return errorResponse(err);
  }
}
