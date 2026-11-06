import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { S3Client } from "@aws-sdk/client-s3";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

/** Supabase client with full access. Server only — never send this key to the browser. */
export function serviceClient(): SupabaseClient {
  return createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let storageClient: S3Client | null = null;

/**
 * Client for the S3-compatible bucket that holds the audio and cover files.
 * Works with Backblaze B2 (no card needed), Cloudflare R2, AWS S3 and others:
 * only STORAGE_ENDPOINT / STORAGE_REGION differ.
 */
export function storage(): S3Client {
  if (!storageClient) {
    storageClient = new S3Client({
      region: process.env.STORAGE_REGION || "auto",
      endpoint: required("STORAGE_ENDPOINT"),
      credentials: {
        accessKeyId: required("STORAGE_ACCESS_KEY_ID"),
        secretAccessKey: required("STORAGE_SECRET_ACCESS_KEY"),
      },
      // Newer AWS SDKs add checksums that S3-compatible services (B2, R2) and
      // browser uploads to signed URLs don't handle. Only send them when required.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return storageClient;
}

export function bucket(): string {
  return required("STORAGE_BUCKET");
}

/**
 * Signing time rounded down to the hour, so the same file gets the same signed URL
 * for an hour and browsers can cache it instead of downloading it again.
 */
export function hourlySigningDate(): Date {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Checks the request's bearer token belongs to someone in the admins table. */
export async function requireAdmin(req: Request): Promise<{ userId: string; email: string }> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Not logged in");
  const db = serviceClient();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session expired, please log in again");
  const { data: admin } = await db.from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (!admin) throw new HttpError(403, "This account is not an admin");
  return { userId: data.user.id, email: data.user.email ?? "" };
}

export function errorResponse(err: unknown): Response {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : "Something went wrong";
  if (status === 500) console.error(err);
  return Response.json({ error: message }, { status });
}
