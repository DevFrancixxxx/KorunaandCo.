# Supabase setup

The dashboard uses Supabase Auth for email/password login and Postgres for profiles plus one versioned shared project snapshot. Every Auth account is mirrored into `public.profiles`. Row Level Security limits project reads to approved profiles, and only `admin` or `editor` profiles can save.

## 1. Create and configure the project

1. Create a Supabase project.
2. In Authentication > Providers > Email, keep email/password enabled and turn on **Allow new users to sign up**.
3. Keep **Confirm Email** enabled so newly registered users must verify their address.
4. In Authentication > URL Configuration, set the Site URL to the deployed app and add both the local and deployed app URLs to Redirect URLs.
5. In Authentication > Email Templates > Confirm signup, replace the confirmation-link content with a code using `{{ .Token }}`. For example: `Your confirmation code is: {{ .Token }}`.
6. Apply both files in `supabase/migrations` in filename order using either the SQL Editor or the Supabase CLI.

With the CLI:

```powershell
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run
supabase db push
```

## 2. Add the first admin

1. Register through the app or create a user in Authentication > Users.
2. Confirm the user's email.
3. Run this in the SQL Editor, using the account email:

```sql
update public.profiles
set role='admin',updated_at=now()
where lower(email)=lower('admin@company.com')
returning id,email,full_name,role;
```

The returned row confirms that the administrator was added. If no row is returned, confirm the user exists in Authentication > Users and rerun the profiles migration to backfill existing accounts.

New registrations receive the `pending` role and cannot read shared project data until an admin changes their role.

## 3. Connect the app

Copy `.env.example` to `.env.local`, then replace the placeholders with the Project URL and publishable key from the Supabase Connect dialog:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
VITE_PUBLIC_APP_URL=https://your-deployed-app.example.com/
```

Only use a publishable key in this browser app. Never expose a secret or `service_role` key.

`VITE_PUBLIC_APP_URL` is retained as a safe fallback for confirmation-link templates. The configured email template sends an eight-digit code, which the user enters in the registration screen. After successful verification, the app signs out the temporary verification session and shows the login form.

Restart `npm run dev` after changing environment variables. The login form will automatically switch from local demo mode to Supabase authentication.

## 4. Load initial dashboard data

The migration creates an empty shared snapshot. Sign in as an admin, open the dashboard import action, and select `src/data.json`. The app writes it through the version-checked `save_project_snapshot` function.

## Access maintenance

View every account and role in the SQL Editor:

```sql
select id,email,full_name,role,created_at,updated_at
from public.profiles
order by created_at desc;
```

Approve an account as an editor or viewer:

```sql
update public.profiles
set role='editor',updated_at=now()
where lower(email)=lower('user@company.com');
```

Use `viewer` for read-only project access. Revoke project access without deleting the Auth account:

```sql
update public.profiles
set role='pending',updated_at=now()
where lower(email)=lower('user@company.com');
```
