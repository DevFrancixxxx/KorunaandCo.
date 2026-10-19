# Demo Dashboard — Sanitised Prototype

This package contains fictional task data and a separate browser storage key (`kc-demo-tasks-v1`). It is NOT an approved secure production application.

## Local development

Run `npm install`, then `npm run dev`. The local site runs at `http://localhost:3000`. Without Supabase environment variables, sign in with `demo@koruna.co` and `Demo2026!`. The local session lasts until the browser tab is closed or the user signs out.

For a local password-reset link to work, keep `npm run dev` running while opening the email. For a deployed app, set `VITE_PUBLIC_APP_URL` to its public HTTPS URL before requesting the reset email.

The login and registration UIs are isolated in `src/components/Login.jsx` and `src/components/Register.jsx`. Session, sign-in, and sign-up operations are isolated in `src/services/auth.js`. Supabase data access remains in `src/cloud.js`.

## Supabase

Follow `SUPABASE_SETUP.md` to create the database, apply the migrations, add an administrator, and connect the app. `public.profiles` mirrors Auth accounts and stores `pending`, `admin`, `editor`, or `viewer` access roles.

Do not import real company backups into this demo or deploy before security review and confirmation of hosting/account ownership. Local login is a prototype-only UI gate and is not production security. With Supabase configured, email/password authentication and Row Level Security protect shared data.

The `dist` and `node_modules` folders are intentionally excluded; build fresh.
