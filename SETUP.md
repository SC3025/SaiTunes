# Sai Tunes: setup and handover guide

This covers everything: first-time setup, importing the old archive, adding new releases, and handing the site over to the next people. No coding is needed after setup.

---

## 0. Before anything: use a department account

Create (or use) a **shared department email**, e.g. `saitunes.dept@gmail.com`, and sign up for **GitHub, Supabase and Vercel with that email**. Store its password somewhere the department keeps (a shared password manager, or with the HOD/coordinator).

> If these accounts belong to one student's personal email, the site dies when they graduate. This is the most important step.

---

## 1. Supabase (database + admin logins), about 10 minutes

1. Go to <https://supabase.com>, sign in with the department account, and create a **New project** called `sai-tunes`. Pick the region closest to you and save the database password.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](./supabase/schema.sql), and press **Run**.
3. **Authentication → Sign In / Providers**: turn **off** "Allow new users to sign up". Admins are only ever added from inside the admin page.
4. **Create the first admin:**
   - **Authentication → Users → Add user → Create new user**: enter an email and password and tick **Auto Confirm User**.
   - Then in **SQL Editor** run this, with your email in place of the example:
     ```sql
     insert into public.admins (user_id, email)
     select id, email from auth.users where email = 'you@example.com';
     ```
5. **Project Settings → API Keys**: copy the **Project URL**, the **anon / publishable** key, and the **service_role / secret** key. You'll need them in step 2.

The song files are stored in Supabase too (Supabase Storage), so there's no separate storage account to make.

## 2. Vercel (the website), about 5 minutes

1. Put this code in a GitHub repository owned by the department account.
2. At <https://vercel.com>, sign in with that GitHub account: **Add New → Project → import the repo**.
3. Before deploying, open **Environment Variables** and add these 3 values:

   | Name | Where it comes from |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key (**keep secret**) |

4. Press **Deploy**. Under **Settings → Domains** you can rename the address, e.g. `saitunes.vercel.app`.
5. Open `https://your-site/admin`, log in, go to the **Storage** tab, and click **"Set up storage"**. It should then say ✓ ready.
6. In the **Music** tab, create a test collection, upload one song, then play it and download it on the public site. ✅

**Keep-alive:** Supabase pauses free projects after a week with no visitors. `vercel.json` sets up a daily job (`/api/keepalive`) that stops this. Nothing to do; just check **Vercel → Settings → Cron Jobs** shows it.

---

## 3. Importing the old archive (2000s → now)

Uploading 20 years of music one album at a time in the browser would take forever. Use the bulk importer from any laptop that has the music files and [Node.js](https://nodejs.org) installed.

1. Arrange the music into folders. **Each folder of songs becomes one collection**, and the year is read from the folder path:
   ```
   Sai Tunes Archive/
     2003/                     → collection "2003" (year collection)
       song1.mp3
     2004 - Annual Day/        → "Annual Day" (2004)
       cover.jpg               → used as cover art
       01 Opening.mp3
     2007/
       Diwali Special/         → "Diwali Special" (2007, special release)
       Founders Day/           → "Founders Day" (2007)
   ```
2. In the project folder, create `.env.local` with the same values as Vercel, then:
   ```bash
   npm install
   node scripts/bulk-import.mjs "/path/to/Sai Tunes Archive" --dry-run   # preview, uploads nothing
   node scripts/bulk-import.mjs "/path/to/Sai Tunes Archive"             # real import
   ```
3. It's **safe to re-run**. Songs already imported are skipped, so if it stops halfway, just run it again.
4. Afterwards, tidy up titles, singers and covers from the admin page.

Song titles, artists, track numbers and lengths are read from each file's tags when they exist, otherwise from the file name (`03 - My Song.mp3` → "My Song").

---

## 4. Day-to-day: adding a new release

1. Go to `https://your-site/admin` and log in.
2. **+ New collection / release**: enter the title, year and type (Album / Year collection / Special release), an optional description and cover, and tick **"Show in New & special releases"** to pin it to the top of the home page.
3. On the next screen, **drag the songs in** and press **Upload**. Keep the tab open until every song says "done".
4. Fix any titles or singer names in the list and press **Save**.
5. When the release is no longer new, **Edit details** and untick "Show in New & special releases".

---

## 5. Handing over (do this before you leave!)

- [ ] At least **2–3 admins** added (Admin → **Admins** tab). Each gets their own login; the site won't let you remove the last one.
- [ ] Department email password stored where the department can get it. That account owns GitHub, Supabase and Vercel.
- [ ] The next admins have read sections 4 and 7 of this file.

**Forgot password?** Any other admin can go to **Admins → Reset password**. If *every* admin is locked out, log into Supabase with the department account, open **Authentication → Users**, and reset a password there.

---

## 6. Costs and limits

Everything runs on free plans with **no card**:

| Service | Free allowance |
|---|---|
| Supabase Storage (song files) | **1 GB** stored (about 250 MP3s at 4 MB), about 5–10 GB of plays/downloads a month, 50 MB max per file |
| Supabase database | 500 MB (plenty: song details are tiny) |
| Vercel Hobby | plenty for a department site |

To fit more songs, upload **MP3s at 128–192 kbps** (about 3–5 MB per song). WAV files are about 10× larger, so keep WAV masters elsewhere.

Supabase's **Usage** page (left sidebar → Usage, or Organization → Usage) shows how much space and bandwidth is used. When it gets close to 1 GB, see section 8.

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Uploads fail straight away | Admin → **Storage** tab → **Set up storage**. If it still fails, check the 3 Supabase values in Vercel and redeploy. |
| "File is larger than 50 MB" | Convert it to MP3 (e.g. with Audacity or an online converter), then upload again. |
| Uploads fail with "exceeded" / quota errors, or songs stop playing | The free 1 GB of storage or the monthly bandwidth is used up. See section 8. |
| "This account is not an admin" | That login exists but isn't in the admins list. Another admin adds them from the Admins tab. |
| Site says it can't load music | Supabase project paused. Log into Supabase and press **Restore**, then check the Vercel cron job is enabled. |
| Download says "Song not found" | The song was deleted. Refresh the page. |

---

## 8. When the archive outgrows the free plan

The code supports two ways to grow. Pick whichever the department can do:

**Option A: Supabase Pro (simplest, needs a card).** Supabase → **Organization → Billing → upgrade to Pro** (about $25/month for 100 GB of storage and 250 GB of bandwidth). Nothing else changes: same account, same site.

**Option B: Backblaze B2 (no card, 10 GB free).** Move file storage to Backblaze while keeping Supabase for everything else:
1. Sign up at <https://www.backblaze.com/sign-up/cloud-storage> and verify your email.
2. **Buckets → Create a Bucket**: give it a unique lowercase name, set **Files in Bucket: Private**, and leave encryption and Object Lock off.
3. **Application Keys → Add a New Application Key**: limit it to that bucket, choose **Read and Write**, and copy the keyID and applicationKey (shown once).
4. In Vercel → **Environment Variables**, add the following, then **redeploy**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_STORAGE` | `s3` |
   | `STORAGE_ENDPOINT` | `https://` + the bucket's Endpoint, e.g. `https://s3.us-east-005.backblazeb2.com` |
   | `STORAGE_REGION` | middle part of the endpoint, e.g. `us-east-005` |
   | `STORAGE_BUCKET` | the bucket name |
   | `STORAGE_ACCESS_KEY_ID` | keyID |
   | `STORAGE_SECRET_ACCESS_KEY` | applicationKey (**keep secret**) |

5. Admin → **Storage** tab → **Set up storage**.

New uploads then go to Backblaze. Songs already in Supabase Storage need moving across (ask whoever maintains the code; it's a short script). Backblaze's free plan allows 10 GB stored and 1 GB of plays a day; adding a card raises that, at about $7 per TB a month.

