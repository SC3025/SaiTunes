import "server-only";
import {
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";
import { serviceClient } from "./server";
import { MAX_UPLOAD_MB, STORAGE_MODE, SUPABASE_BUCKET, supabasePublicUrl } from "./media";

/*
 * Where song and cover files live.
 *
 *   Default ("supabase"): Supabase Storage, in a public bucket called "music".
 *     Nothing to set up beyond Supabase itself.
 *
 *   NEXT_PUBLIC_STORAGE=s3: any S3-compatible service (Backblaze B2, Cloudflare R2, AWS),
 *     for when the archive outgrows the Supabase plan. Needs the STORAGE_* settings.
 */

export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export interface UploadTarget {
  url: string;
  kind: "s3" | "supabase";
}

export interface StorageStatus {
  provider: "supabase" | "s3";
  connected: boolean;
  uploadsAllowed: boolean;
  error?: string;
}

// ---------- S3-compatible ----------

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

let s3Client: S3Client | null = null;
function s3(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      endpoint: env("STORAGE_ENDPOINT"),
      credentials: { accessKeyId: env("STORAGE_ACCESS_KEY_ID"), secretAccessKey: env("STORAGE_SECRET_ACCESS_KEY") },
      // Newer AWS SDKs add checksums that S3-compatible services and browser uploads
      // to signed URLs don't handle. Only send them when an operation requires one.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return s3Client;
}
const s3Bucket = () => env("STORAGE_BUCKET");

/** Signing time rounded to the hour, so a file keeps the same link for an hour and browsers can cache it. */
function hourlySigningDate(): Date {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
}

const CORS_RULES = [
  { AllowedOrigins: ["*"], AllowedMethods: ["GET", "PUT", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 },
];

// ---------- Supabase Storage ----------

async function ensureSupabaseBucket(): Promise<void> {
  const db = serviceClient();
  const { data } = await db.storage.getBucket(SUPABASE_BUCKET);
  if (data) return;
  const { error } = await db.storage.createBucket(SUPABASE_BUCKET, {
    public: true,
    fileSizeLimit: MAX_UPLOAD_BYTES,
    allowedMimeTypes: ["audio/*", "image/*"],
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

// ---------- shared API used by the routes ----------

/** A one-time URL the admin's browser can upload one file to. */
export async function createUploadTarget(key: string, contentType: string): Promise<UploadTarget> {
  if (STORAGE_MODE === "s3") {
    const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: s3Bucket(), Key: key, ContentType: contentType }), {
      expiresIn: 60 * 60,
    });
    return { url, kind: "s3" };
  }
  await ensureSupabaseBucket();
  const { data, error } = await serviceClient().storage.from(SUPABASE_BUCKET).createSignedUploadUrl(key);
  if (error || !data) throw error ?? new Error("Could not create upload link");
  return { url: data.signedUrl, kind: "supabase" };
}

/** Where to send the browser to play or show a file. */
export async function fileLocation(key: string): Promise<string> {
  if (STORAGE_MODE === "s3") {
    return getSignedUrl(s3(), new GetObjectCommand({ Bucket: s3Bucket(), Key: key }), {
      expiresIn: 60 * 60 * 2,
      signingDate: hourlySigningDate(),
    });
  }
  return supabasePublicUrl(key);
}

/** Where to send the browser to download a file under a friendly name. */
export async function downloadLocation(key: string, filename: string): Promise<string> {
  if (STORAGE_MODE === "s3") {
    const ascii = filename.replace(/[^\x20-\x7e]/g, "_");
    return getSignedUrl(
      s3(),
      new GetObjectCommand({
        Bucket: s3Bucket(),
        Key: key,
        ResponseContentDisposition: `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      }),
      { expiresIn: 60 * 60 * 2, signingDate: hourlySigningDate() },
    );
  }
  return `${supabasePublicUrl(key)}?download=${encodeURIComponent(filename)}`;
}

export async function deleteStoredFiles(keys: string[]): Promise<void> {
  if (!keys.length) return;
  if (STORAGE_MODE === "s3") {
    for (let i = 0; i < keys.length; i += 10) {
      await Promise.all(keys.slice(i, i + 10).map((Key) => s3().send(new DeleteObjectCommand({ Bucket: s3Bucket(), Key }))));
    }
    return;
  }
  for (let i = 0; i < keys.length; i += 500) {
    const { error } = await serviceClient().storage.from(SUPABASE_BUCKET).remove(keys.slice(i, i + 500));
    if (error) throw error;
  }
}

export async function storageStatus(): Promise<StorageStatus> {
  if (STORAGE_MODE === "s3") {
    try {
      const res = await s3().send(new GetBucketCorsCommand({ Bucket: s3Bucket() }));
      const ok = (res.CORSRules ?? []).some((r) => r.AllowedMethods?.includes("PUT"));
      return { provider: "s3", connected: true, uploadsAllowed: ok };
    } catch (e) {
      if ((e as { name?: string }).name === "NoSuchCORSConfiguration") return { provider: "s3", connected: true, uploadsAllowed: false };
      return { provider: "s3", connected: false, uploadsAllowed: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  const { data, error } = await serviceClient().storage.getBucket(SUPABASE_BUCKET);
  if (error && !/not found/i.test(error.message)) {
    return { provider: "supabase", connected: false, uploadsAllowed: false, error: error.message };
  }
  return { provider: "supabase", connected: true, uploadsAllowed: Boolean(data) };
}

/** One-time setup: creates the Supabase bucket, or sets S3 CORS rules so browsers can upload. */
export async function setupStorage(): Promise<void> {
  if (STORAGE_MODE !== "s3") return ensureSupabaseBucket();
  const cmd = new PutBucketCorsCommand({ Bucket: s3Bucket(), CORSConfiguration: { CORSRules: CORS_RULES } });
  // This call needs a body checksum; send the classic Content-MD5 every S3-compatible service accepts.
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
  await s3().send(cmd);
}
