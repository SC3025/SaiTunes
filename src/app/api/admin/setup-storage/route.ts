import { createHash } from "node:crypto";
import { GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { bucket, errorResponse, requireAdmin, storage } from "@/lib/server";

const CORS_RULES = [
  {
    AllowedOrigins: ["*"],
    AllowedMethods: ["GET", "PUT", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  },
];

/** Checks whether the bucket is reachable and lets browsers upload to it. */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    try {
      const res = await storage().send(new GetBucketCorsCommand({ Bucket: bucket() }));
      const ok = (res.CORSRules ?? []).some((r) => r.AllowedMethods?.includes("PUT"));
      return Response.json({ connected: true, uploadsAllowed: ok });
    } catch (e) {
      const name = (e as { name?: string }).name;
      if (name === "NoSuchCORSConfiguration") return Response.json({ connected: true, uploadsAllowed: false });
      return Response.json({ connected: false, error: e instanceof Error ? e.message : String(e) });
    }
  } catch (err) {
    return errorResponse(err);
  }
}

/** Sets the bucket's CORS rules so admins can upload straight from the browser. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const cmd = new PutBucketCorsCommand({ Bucket: bucket(), CORSConfiguration: { CORSRules: CORS_RULES } });
    // This call needs a body checksum. Send the classic Content-MD5, which every
    // S3-compatible service (Backblaze B2, Cloudflare R2, AWS) accepts.
    cmd.middlewareStack.add(
      (next) => async (args) => {
        const request = args.request as { headers: Record<string, string>; body?: unknown };
        if (typeof request.body === "string") {
          for (const h of Object.keys(request.headers)) {
            const lower = h.toLowerCase();
            if (lower.startsWith("x-amz-checksum-") || lower === "x-amz-sdk-checksum-algorithm") delete request.headers[h];
          }
          request.headers["content-md5"] = createHash("md5").update(request.body).digest("base64");
        }
        return next(args);
      },
      { step: "build", priority: "low", name: "contentMd5" },
    );
    await storage().send(cmd);
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
