#!/usr/bin/env node
/**
 * Bulk-import a folder of old music into Sai Tunes.
 *
 *   node scripts/bulk-import.mjs "/path/to/Sai Tunes Archive" [--dry-run]
 *
 * Every folder that contains audio files becomes one collection. The year is taken from
 * the first 4-digit year (1990–2099) in the folder path, so all of these work:
 *
 *   Archive/2004 - Annual Day/01 Song.mp3        → "Annual Day" (2004)
 *   Archive/2007/Diwali Special/Song.mp3         → "Diwali Special" (2007)
 *   Archive/2011/Song.mp3                        → "2011" (year collection)
 *
 * A cover.jpg / folder.jpg / front.jpg (or the only image) in the folder becomes the cover.
 * Safe to run again: songs already imported (same file name in the same collection) are skipped.
 *
 * Needs the same values as the website in .env.local (including SUPABASE_SERVICE_ROLE_KEY).
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parseFile } from "music-metadata";

config({ path: ".env.local" });
config();

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const root = args.find((a) => !a.startsWith("--"));
if (!root) {
  console.error('Usage: node scripts/bulk-import.mjs "/path/to/archive" [--dry-run]');
  process.exit(1);
}

const need = (k) => {
  if (!process.env[k]) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
  return process.env[k];
};

const db = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${need("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: need("R2_ACCESS_KEY_ID"), secretAccessKey: need("R2_SECRET_ACCESS_KEY") },
});
const BUCKET = need("R2_BUCKET");

const AUDIO = { ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".aac": "audio/aac", ".wav": "audio/wav", ".flac": "audio/flac", ".ogg": "audio/ogg", ".opus": "audio/ogg" };
const IMAGE = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const slugify = (t) => t.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "collection";
const safeName = (name) => {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, path.extname(name)).normalize("NFKD").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "file";
  return base + ext;
};
const titleFromFile = (n) => n.replace(/\.[^.]+$/, "").replace(/^\s*\d{1,3}\s*[-._)]\s*/, "").replace(/_/g, " ").trim();

async function findAlbumFolders(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile() && !e.name.startsWith("."));
  const audio = files.filter((e) => AUDIO[path.extname(e.name).toLowerCase()]);
  if (audio.length) {
    out.push({ dir, audio: audio.map((e) => e.name), images: files.filter((e) => IMAGE[path.extname(e.name).toLowerCase()]).map((e) => e.name) });
  }
  for (const e of entries) if (e.isDirectory() && !e.name.startsWith(".")) await findAlbumFolders(path.join(dir, e.name), out);
  return out;
}

function describe(dir) {
  const rel = path.relative(root, dir) || path.basename(root);
  const year = rel.match(/(?:^|\D)((?:19[9]|20\d)\d)(?!\d)/)?.[1];
  const name = path.basename(dir);
  let title = name.replace(/^\s*(19|20)\d\d\s*[-–_.:]?\s*/, "").trim();
  if (!title || /^(19|20)\d\d$/.test(name)) title = year ?? name;
  const kind = title === year ? "year" : /special|diwali|christmas|tribute|release|anniversary|jubilee/i.test(title) ? "special" : "album";
  return { title, year: year ? Number(year) : null, kind };
}

async function upload(file, key, contentType) {
  if (DRY) return;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: await readFile(file), ContentType: contentType }));
}

async function importFolder({ dir, audio, images }) {
  const { title, year, kind } = describe(dir);
  const slug = slugify(`${title} ${year && title !== String(year) ? year : ""}`);
  console.log(`\n📀 ${title}${year ? ` (${year})` : ""}  ← ${path.relative(root, dir) || "."}  [${audio.length} songs]`);

  let { data: col } = await db.from("collections").select("*").eq("slug", slug).maybeSingle();
  if (!col) {
    const coverName = images.find((n) => /^(cover|folder|front)\./i.test(n)) ?? (images.length === 1 ? images[0] : null);
    let cover_key = null;
    if (coverName) {
      cover_key = `covers/${slug}/${randomUUID().slice(0, 8)}-${safeName(coverName)}`;
      await upload(path.join(dir, coverName), cover_key, IMAGE[path.extname(coverName).toLowerCase()]);
    }
    if (DRY) {
      col = { id: "dry-run", slug };
    } else {
      const res = await db.from("collections").insert({ slug, title, year, kind, cover_key, is_featured: false }).select().single();
      if (res.error) throw new Error(`Could not create collection: ${res.error.message}`);
      col = res.data;
    }
    console.log(`   created collection /c/${slug}${cover_key ? " with cover" : ""}`);
  }

  const existing = new Set();
  if (!DRY || col.id !== "dry-run") {
    const { data } = await db.from("songs").select("original_filename").eq("collection_id", col.id);
    for (const s of data ?? []) existing.add(s.original_filename);
  }

  audio.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  let added = 0;
  for (const [i, name] of audio.entries()) {
    if (existing.has(name)) continue;
    const file = path.join(dir, name);
    let meta = null;
    try {
      meta = await parseFile(file, { duration: true, skipCovers: true });
    } catch {}
    const key = `audio/${slug}/${randomUUID().slice(0, 8)}-${safeName(name)}`;
    const ext = path.extname(name).toLowerCase();
    try {
      await upload(file, key, AUDIO[ext]);
      if (!DRY) {
        const { error } = await db.from("songs").insert({
          collection_id: col.id,
          title: meta?.common.title?.trim() || titleFromFile(name),
          artist: meta?.common.artist?.trim() || meta?.common.albumartist?.trim() || null,
          track_number: meta?.common.track?.no ?? i + 1,
          duration_seconds: meta?.format.duration ? Math.round(meta.format.duration) : null,
          file_key: key,
          file_size: (await stat(file)).size,
          mime_type: AUDIO[ext],
          original_filename: name,
        });
        if (error) throw new Error(error.message);
      }
      added++;
      process.stdout.write(`   ✓ ${name}\n`);
    } catch (e) {
      console.error(`   ✗ ${name}: ${e.message}`);
    }
  }
  console.log(`   ${added} added, ${audio.length - added} skipped/failed`);
  return added;
}

const folders = await findAlbumFolders(path.resolve(root));
console.log(`Found ${folders.length} folders with music${DRY ? " (DRY RUN — nothing will be uploaded)" : ""}.`);
let total = 0;
for (const f of folders) total += await importFolder(f);
console.log(`\nDone. ${total} songs ${DRY ? "would be" : ""} imported.`);
