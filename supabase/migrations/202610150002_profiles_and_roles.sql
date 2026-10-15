create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 email text,
 full_name text not null default '',
 role text not null default 'pending'
  check (role in ('pending','admin','editor','viewer')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon,authenticated;
grant select on public.profiles to authenticated;

insert into public.profiles(id,email,full_name,role,created_at,updated_at)
select
 users.id,
 users.email,
 coalesce(users.raw_user_meta_data->>'full_name',''),
 coalesce(members.role,'pending'),
 users.created_at,
 now()
from auth.users as users
left join public.project_members as members on members.user_id=users.id
on conflict (id) do update
set email=excluded.email,
    full_name=case when excluded.full_name<>'' then excluded.full_name else public.profiles.full_name end,
    role=case when public.profiles.role='pending' then excluded.role else public.profiles.role end,
    updated_at=now();

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
 insert into public.profiles(id,email,full_name)
 values (
  new.id,
  new.email,
  coalesce(new.raw_user_meta_data->>'full_name','')
 )
 on conflict (id) do update
 set email=excluded.email,
     full_name=excluded.full_name,
     updated_at=now();
 return new;
end;
$$;

drop trigger if exists on_kc_auth_user_created on auth.users;
create trigger on_kc_auth_user_created
after insert or update of email,raw_user_meta_data on auth.users
for each row execute function private.handle_new_user();

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select exists (
  select 1 from public.profiles
  where id=(select auth.uid()) and role='admin'
 );
$$;

create or replace function private.current_user_has_project_access()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
 select exists (
  select 1 from public.profiles
  where id=(select auth.uid()) and role in ('admin','editor','viewer')
 );
$$;

revoke execute on function private.handle_new_user() from public,anon,authenticated;
revoke execute on function private.current_user_is_admin() from public,anon;
revoke execute on function private.current_user_has_project_access() from public,anon;
grant execute on function private.current_user_is_admin() to authenticated;
grant execute on function private.current_user_has_project_access() to authenticated;

drop policy if exists "users read own profile and admins read all" on public.profiles;
create policy "users read own profile and admins read all"
on public.profiles for select to authenticated
using (
 id=(select auth.uid())
 or (select private.current_user_is_admin())
);

drop policy if exists "members may read shared project" on public.project_snapshot;
drop policy if exists "approved profiles may read shared project" on public.project_snapshot;
create policy "approved profiles may read shared project"
on public.project_snapshot for select to authenticated
using ((select private.current_user_has_project_access()));

create or replace function public.save_project_snapshot(
 p_expected_version bigint,
 p_rows jsonb
)
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
 new_version bigint;
begin
 if not exists (
  select 1 from public.profiles
  where id=(select auth.uid()) and role in ('admin','editor')
 ) then
  raise exception 'You do not have edit permission';
 end if;

 if p_rows is null or jsonb_typeof(p_rows)<>'array' then
  raise exception 'Invalid rows';
 end if;

 update public.project_snapshot
 set rows=p_rows,
     version=version+1,
     updated_at=now(),
     updated_by=(select auth.uid())
 where id=1 and version=p_expected_version
 returning version into new_version;

 if new_version is null then
  raise exception 'Data changed since you loaded it. Export your unsaved changes and reload shared data.';
 end if;

 return new_version;
end;
$$;

revoke all on function public.save_project_snapshot(bigint,jsonb) from public,anon;
grant execute on function public.save_project_snapshot(bigint,jsonb) to authenticated;
