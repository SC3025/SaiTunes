# Sai Tunes 🎵

Our department's music library: listen to and download every song, from the early 2000s to today.

- **Public site:** browse by year, search, play in the browser, download any song.
- **Admin page (`/admin`):** log in to create new collections and special releases, upload songs, edit details, and add or remove other admins.

**👉 Setting it up or taking it over? Read [SETUP.md](./SETUP.md).**

## How it's built

| Part | Service | What it stores |
|---|---|---|
| Website | Next.js on Vercel | the code |
| Database + admin logins | Supabase | song and collection details, admin accounts |
| Audio files + cover art | Cloudflare R2 | the MP3/WAV files (cheap at any size, free downloads) |

```
src/app/                 pages: home, /c/[slug] (collection), /search, /admin
src/app/api/             server routes: upload links, deletes, admin management, downloads, keep-alive
src/components/          player, song list, admin forms and uploader
supabase/schema.sql      database tables and permissions (run once)
scripts/bulk-import.mjs  import a whole folder of old music at once
```

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```
