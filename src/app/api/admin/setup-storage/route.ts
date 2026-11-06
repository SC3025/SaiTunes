import { errorResponse, requireAdmin } from "@/lib/server";
import { setupStorage, storageStatus } from "@/lib/storage";

/** Is file storage reachable and ready for uploads? */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    return Response.json(await storageStatus());
  } catch (err) {
    return errorResponse(err);
  }
}

/** One-click setup: creates the Supabase bucket, or allows browser uploads on S3 storage. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    await setupStorage();
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
