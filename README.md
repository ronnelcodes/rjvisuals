# RJ Visuals Netlify Website

Launch-ready static HTML, CSS, and JavaScript website with Netlify Forms, Netlify Functions, and secure private galleries backed by Supabase.

## Security model

- Gallery passwords are hashed on the server with scrypt. They are never stored in page code.
- Original client images live in a private Supabase Storage bucket.
- A correct password returns one-hour signed image links.
- The admin dashboard requires a Supabase user whose email matches `ADMIN_EMAIL`.
- Public portfolio images are separate from private client originals.

## One-time setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase/schema.sql`.
3. Create one Supabase Auth user for the administrator.
4. In Supabase SQL Editor, set the admin email used by the storage policy:

   `alter database postgres set app.settings.admin_email = 'your-email@example.com';`

5. In Netlify, add these environment variables:

   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_EMAIL`

6. Deploy the folder to Netlify and connect `rjvisuals.online` only after testing the Netlify URL.

## WordPress gallery migration

The current public WordPress API exposes the gallery names but intentionally hides protected gallery content. Export the Media Library or provide a complete WordPress backup. Then upload each gallery's originals through `/admin.html`, assign a new strong password, and publish it. Do not reuse old weak passwords.

## Gallery shells found on the current site

- Bevington Anniversary
- Scott
- Bevington
- Alexandra #2
- Alexandra #1
- Brinkenhoff
- Castro
- Jones & Moore

The WordPress site currently exposes eight protected gallery pages, not seven. This project preserves all eight so none is lost.

