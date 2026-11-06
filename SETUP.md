# Sai Tunes: setup and handover guide

This covers everything: first-time setup, importing the old archive, adding new releases, and handing the site over to the next people. No coding is needed after setup.

---

## 0. Before anything: use a department account

Create (or use) a **shared department email**, e.g. `saitunes.dept@gmail.com`, and sign up for **GitHub, Supabase, Backblaze and Vercel with that email**. Store its password somewhere the department keeps (a shared password manager, or with the HOD/coordinator).

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
5. **Project Settings → API Keys**: copy the **Project URL**, the **anon / publishable** key, and the **service_role / secret** key. You'll need them in step 3.

## 2. Backblaze B2 (where the songs live), about 10 minutes, no card needed

1. Go to <https://www.backblaze.com/sign-up/cloud-storage> and sign up with the department email. Pick a **region** when asked (any is fine). **No credit card is needed.**
2. Check your inbox and **verify your email**.
3. In the Backblaze dashboard, open **B2 Cloud Storage → Buckets → Create a Bucket**:
   - **Bucket name:** must be unique across all of Backblaze, lowercase, e.g. `sai-tunes-dept-2026`.
   - **Files in Bucket:** **Private** (yes, private: the website shares songs through temporary links, so no card is needed).
   - Leave encryption and Object Lock **off**, then click **Create a Bucket**.
4. On the new bucket's card, copy the **Endpoint**, e.g. `s3.us-east-005.backblazeb2.com`:
   - `STORAGE_ENDPOINT` = `https://` + that endpoint, e.g. `https://s3.us-east-005.backblazeb2.com`
   - `STORAGE_REGION` = the middle part, e.g. `us-east-005`
   - `STORAGE_BUCKET` = the bucket name
5. Go to **Application Keys → Add a New Application Key**:
   - **Name:** `sai-tunes-website`
   - **Allow access to bucket(s):** your bucket only
   - **Type of access:** **Read and Write**
   - Leave the rest blank and click **Create New Key**.
   - ⚠️ The key is shown **only once**. Copy **keyID** into `STORAGE_ACCESS_KEY_ID` and **applicationKey** into `STORAGE_SECRET_ACCESS_KEY` (keep this secret).

You don't need to touch Backblaze's CORS settings. After the site is live, the admin page's **Storage** tab has a **"Switch on uploads"** button that sets them for you.

**Free limits (no card):** 10 GB stored (about 2,500 MP3s), **1 GB of listening/downloads per day** (about 250 song plays), and a daily cap on file requests. If the site gets busier or the archive outgrows 10 GB, the department can add a card in Backblaze (about $7 per TB per month). The code can also move to Cloudflare R2 later by changing the `STORAGE_*` settings.

## 3. Vercel (the website), about 5 minutes

1. Put this code in a GitHub repository owned by the department account.
2. At <https://vercel.com>, sign in with that GitHub account: **Add New → Project → import the repo**.
3. Before deploying, open **Environment Variables** and add every value from [`.env.example`](./.env.example):

   | Name | Where it comes from |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key (**keep secret**) |
   | `STORAGE_ENDPOINT` | `https://` + Backblaze bucket endpoint |
   | `STORAGE_REGION` | middle part of the endpoint, e.g. `us-east-005` |
   | `STORAGE_BUCKET` | Backblaze bucket name |
   | `STORAGE_ACCESS_KEY_ID` | Backblaze keyID |
   | `STORAGE_SECRET_ACCESS_KEY` | Backblaze applicationKey (**keep secret**) |

4. Press **Deploy**. Under **Settings → Domains** you can rename the address, e.g. `saitunes.vercel.app`.
5. Open `https://your-site/admin`, log in, go to the **Storage** tab, and click **"Switch on uploads"**. It should then say ✓ ready.
6. In the **Music** tab, create a test collection, upload one song, then play it and download it on the public site. ✅

**Keep-alive:** Supabase pauses free projects after a week with no visitors. `vercel.json` sets up a daily job (`/api/keepalive`) that stops this. Nothing to do; just check **Vercel → Settings → Cron Jobs** shows it.

---

## 4. Importing the old archive (2000s → now)

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

## 5. Day-to-day: adding a new release

1. Go to `https://your-site/admin` and log in.
2. **+ New collection / release**: enter the title, year and type (Album / Year collection / Special release), an optional description and cover, and tick **"Show in New & special releases"** to pin it to the top of the home page.
3. On the next screen, **drag the songs in** and press **Upload**. Keep the tab open until every song says "done".
4. Fix any titles or singer names in the list and press **Save**.
5. When the release is no longer new, **Edit details** and untick "Show in New & special releases".

---

## 6. Handing over (do this before you leave!)

- [ ] At least **2–3 admins** added (Admin → **Admins** tab). Each gets their own login; the site won't let you remove the last one.
- [ ] Department email password stored where the department can get it. That account owns GitHub, Supabase, Backblaze and Vercel.
- [ ] The next admins have read sections 5 and 8 of this file.

**Forgot password?** Any other admin can go to **Admins → Reset password**. If *every* admin is locked out, log into Supabase with the department account, open **Authentication → Users**, and reset a password there.

---

## 7. Costs and limits

| Service | Free allowance (no card) | If it's outgrown |
|---|---|---|
| Backblaze B2 | 10 GB stored, 1 GB/day of plays and downloads | add a card in Backblaze: about **$7 per TB a month**, so 100 GB costs about $0.70 |
| Supabase | 500 MB database (plenty: song details are tiny) | not needed |
| Vercel Hobby | plenty for a department site | not needed |

To fit more music in the free 10 GB, upload **MP3s at 128–192 kbps** (about 3–5 MB per song). WAV files are about 10× larger, so keep WAV masters elsewhere.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Uploads fail instantly with "check the storage CORS settings" | Admin → **Storage** tab → **Switch on uploads**. |
| Storage tab says it can't reach the bucket | A `STORAGE_*` value in Vercel is wrong (check `https://` on the endpoint, and that the region matches it). Redeploy after changing env vars. |
| Songs stop playing late in the day | The free daily download allowance (1 GB) is used up. It resets daily; for more, add a card in Backblaze. |
| "This account is not an admin" | That login exists but isn't in the admins list. Another admin adds them from the Admins tab. |
| Site says it can't load music | Supabase project paused. Log into Supabase and press **Restore**, then check the Vercel cron job is enabled. |
| Download says "Song not found" | The song was deleted. Refresh the page. |
