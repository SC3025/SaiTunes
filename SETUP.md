# Sai Tunes: setup and handover guide

This covers everything: first-time setup, importing the old archive, adding new releases, and handing the site over to the next people. No coding is needed after setup.

---

## 0. Before anything: use a department account

Create (or use) a **shared department email**, e.g. `saitunes.dept@gmail.com`, and sign up for **GitHub, Supabase, Cloudflare and Vercel with that email**. Store its password somewhere the department keeps (a shared password manager, or with the HOD/coordinator).

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

## 2. Cloudflare R2 (where the songs live), about 10 minutes

R2 needs a card on file, but the first 10 GB are free and **downloads are always free**. See costs below.

1. Go to <https://dash.cloudflare.com> and open **R2 Object Storage → Create bucket**. Name it `sai-tunes`.
2. Open the bucket, then **Settings → Public access**:
   - **Best:** connect a **custom domain** (e.g. `music.yourdept.org`) if the department owns one.
   - **Otherwise:** enable the **R2.dev subdomain**. It works, but Cloudflare rate-limits it, so switch to a custom domain later if the site gets busy.

   Copy the public URL. This becomes `NEXT_PUBLIC_R2_PUBLIC_URL`.
3. In the bucket, **Settings → CORS policy → Edit**, paste this, and add your real site address once you have it (step 3):
   ```json
   [
     {
       "AllowedOrigins": ["https://saitunes.vercel.app", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "HEAD"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
4. **R2 → Manage API Tokens → Create API token**: choose **Object Read & Write**, limit it to the `sai-tunes` bucket, then create it. Copy the **Access Key ID**, the **Secret Access Key**, and your **Account ID** (shown on the R2 overview page).

## 3. Vercel (the website), about 5 minutes

1. Put this code in a GitHub repository owned by the department account.
2. At <https://vercel.com>, sign in with that GitHub account: **Add New → Project → import the repo**.
3. Before deploying, open **Environment Variables** and add every value from [`.env.example`](./.env.example):

   | Name | Where it comes from |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role / secret key (**keep secret**) |
   | `R2_ACCOUNT_ID` | Cloudflare account ID |
   | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token (**keep secret**) |
   | `R2_BUCKET` | `sai-tunes` |
   | `NEXT_PUBLIC_R2_PUBLIC_URL` | bucket public URL (no `/` at the end) |

4. Press **Deploy**. Under **Settings → Domains** you can rename the address, e.g. `saitunes.vercel.app`.
5. Put that exact address in the R2 CORS policy (step 2.3). Uploads fail without it.
6. Open `https://your-site/admin`, log in, create a test collection, upload one song, play it and download it. ✅

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
- [ ] Department email password stored where the department can get it. That account owns GitHub, Supabase, Cloudflare and Vercel.
- [ ] The next admins have read sections 5 and 8 of this file.
- [ ] Someone knows which card is on the Cloudflare account (in case billing ever needs updating).

**Forgot password?** Any other admin can go to **Admins → Reset password**. If *every* admin is locked out, log into Supabase with the department account, open **Authentication → Users**, and reset a password there.

---

## 7. Costs and limits

| Service | Free allowance | After that |
|---|---|---|
| Cloudflare R2 | 10 GB stored, unlimited downloads | about $0.015 per GB a month: **100 GB ≈ $1.35/month, 500 GB ≈ $7.35/month** |
| Supabase | 500 MB database (plenty: song details are tiny) | not needed |
| Vercel Hobby | plenty for a department site | not needed |

To keep storage small, upload **MP3s (192–320 kbps)** for listening. WAV files are about 10× larger. If you want to keep WAV masters, archive them elsewhere and upload MP3s here.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Uploads fail instantly with "check R2 CORS" | The site's address isn't in the R2 CORS policy (step 2.3), or it has a typo or a trailing `/`. |
| Songs show but won't play | `NEXT_PUBLIC_R2_PUBLIC_URL` is wrong, or the bucket's public access is off. Redeploy after changing env vars. |
| "This account is not an admin" | That login exists but isn't in the admins list. Another admin adds them from the Admins tab. |
| Site says it can't load music | Supabase project paused. Log into Supabase and press **Restore**, then check the Vercel cron job is enabled. |
| Download says "Song not found" | The song was deleted. Refresh the page. |
