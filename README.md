# Tailsman

Contact-style profile management built with React, Vite, and Supabase. Profiles store a name, country, email, link, additional link, Telegram, WhatsApp, Discord, note, and a status of Found, Sent, Responded, Interview, Failed, or Succeeded. Name, country, email, link, and status are required. Each profile can point at one of your contacts. A contact stores a name, email, Telegram, WhatsApp, and Discord handle, and that name is what you pick when adding a profile.

Click a person's name to read their full profile, links, notes, and date added; use Edit profile to change details. Country filtering and name/date sorting run on Supabase before pagination. Reset filters restores the default directory view. A database setup notice detects a missing profiles table and links to your project's SQL editor.

## Setup

1. Run `npm.cmd install` on Windows (`npm install` elsewhere).
2. Copy `.env.example` to `.env` and set your Supabase project URL and public publishable/anon key. Never use a service-role key in this app.
3. In the Supabase SQL editor, run the files in `supabase/migrations` in filename order. If earlier files are already applied, run only the new ones, including `202610190002_profile_channels.sql`.
4. Enable email/password authentication in Supabase. Create an account through the app; confirm your email if required by your project.
5. Run `npm.cmd run dev` and open the displayed localhost URL.

`npm.cmd run build` creates the production bundle in `dist`. Environment variables are embedded at build time; rebuild after changing them.

Profiles are stored only in Supabase. Without configuration, the app shows a setup notice and disables data changes. Row-level security isolates each signed-in user's contact list. Sharing profiles across team members requires a future workspace membership model; it is not enabled by granting every account access to every profile.

The public key is intended for browser use; access is enforced by Supabase Auth and database policies. Follow the [Supabase row-level security guide](https://supabase.com/docs/guides/database/postgres/row-level-security) when adapting permissions.
