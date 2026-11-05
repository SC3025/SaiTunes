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

let r2Client: S3Client | null = null;
export function r2(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return r2Client;
}

export function bucket(): string {
  return required("R2_BUCKET");
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
