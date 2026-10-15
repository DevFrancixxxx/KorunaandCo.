-- Legacy SQL Editor entrypoint. New projects should apply the canonical migration:
-- supabase/migrations/202610150001_initial_dashboard.sql
-- Run in an approved Supabase project, not in the browser.
create table if not exists public.project_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','editor','viewer'))
);
create table if not exists public.project_snapshot (
 id integer primary key check (id=1),
 version bigint not null default 0,
 rows jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id)
);
insert into public.project_snapshot(id,version,rows) values (1,0,'[]'::jsonb) on conflict (id) do nothing;
alter table public.project_members enable row level security;
alter table public.project_snapshot enable row level security;
revoke all on public.project_members from anon, authenticated;
revoke all on public.project_snapshot from anon, authenticated;
grant select on public.project_members to authenticated;
drop policy if exists "users may read own membership" on public.project_members;
create policy "users may read own membership" on public.project_members for select to authenticated
 using (user_id=auth.uid());
grant select on public.project_snapshot to authenticated;
drop policy if exists "members may read shared project" on public.project_snapshot;
create policy "members may read shared project" on public.project_snapshot for select to authenticated
 using (exists (select 1 from public.project_members m where m.user_id=auth.uid()));
-- No direct writes to snapshot: all edits go through version-checked RPC.
create or replace function public.save_project_snapshot(p_expected_version bigint,p_rows jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare new_version bigint;
begin
 if not exists (select 1 from public.project_members m where m.user_id=auth.uid() and m.role in ('admin','editor')) then
   raise exception 'You do not have edit permission';
 end if;
 if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'Invalid rows'; end if;
 update public.project_snapshot
 set rows=p_rows,version=version+1,updated_at=now(),updated_by=auth.uid()
 where id=1 and version=p_expected_version returning version into new_version;
 if new_version is null then raise exception 'Data changed since you loaded it. Export your unsaved changes and reload shared data.'; end if;
 return new_version;
end $$;
revoke all on function public.save_project_snapshot(bigint,jsonb) from public,anon;
grant execute on function public.save_project_snapshot(bigint,jsonb) to authenticated;
-- Administrator action (in SQL editor, after approved users exist):
-- insert into public.project_members(user_id,role) values ('<auth-user-uuid>','admin');
