import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { bucket, hourlySigningDate, storage } from "@/lib/server";

/**
 * Sends the browser to a stored song or cover image using a short-lived signed link,
 * so the bucket itself can stay private (needed for free Backblaze B2 accounts).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join("/");
  if (!/^(audio|covers)\//.test(key) || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }
  const url = await getSignedUrl(storage(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: 60 * 60 * 2,
    signingDate: hourlySigningDate(),
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      // Let browsers and Vercel's edge reuse this redirect for a while.
      "Cache-Control": "public, max-age=1800, s-maxage=1800",
    },
  });
}
