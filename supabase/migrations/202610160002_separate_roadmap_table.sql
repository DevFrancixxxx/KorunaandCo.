create table if not exists public.project_roadmap (
 id integer primary key check (id=1),
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object'),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);

insert into public.project_roadmap(id,data)
select 1,coalesce(roadmap,'{}'::jsonb)
from public.project_snapshot
where id=1
on conflict (id) do nothing;

alter table public.project_snapshot
 drop column if exists roadmap;

alter table public.project_roadmap enable row level security;
revoke all on public.project_roadmap from anon,authenticated;
grant select on public.project_roadmap to authenticated;

create schema if not exists private;
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

revoke execute on function private.current_user_has_project_access() from public,anon;
grant execute on function private.current_user_has_project_access() to authenticated;

drop policy if exists "approved profiles may read roadmap" on public.project_roadmap;
create policy "approved profiles may read roadmap"
on public.project_roadmap for select to authenticated
using ((select private.current_user_has_project_access()));

create or replace function public.save_project_snapshot(
 p_expected_version bigint,
 p_rows jsonb,
 p_roadmap jsonb
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
 if p_roadmap is null or jsonb_typeof(p_roadmap)<>'object' then
  raise exception 'Invalid roadmap metadata';
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

 insert into public.project_roadmap(id,data,updated_at,updated_by)
 values (1,p_roadmap,now(),(select auth.uid()))
 on conflict (id) do update
 set data=excluded.data,
     updated_at=excluded.updated_at,
     updated_by=excluded.updated_by;

 return new_version;
end;
$$;

revoke all on function public.save_project_snapshot(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.save_project_snapshot(bigint,jsonb,jsonb) to authenticated;
