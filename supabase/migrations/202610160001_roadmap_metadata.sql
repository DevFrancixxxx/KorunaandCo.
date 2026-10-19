create table if not exists public.project_snapshot (
 id integer primary key check (id=1),
 version bigint not null default 0,
 rows jsonb not null default '[]'::jsonb check (jsonb_typeof(rows)='array'),
 roadmap jsonb not null default '{}'::jsonb check (jsonb_typeof(roadmap)='object'),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);

alter table public.project_snapshot
 add column if not exists roadmap jsonb not null default '{}'::jsonb;

insert into public.project_snapshot(id,version,rows,roadmap)
values (1,0,'[]'::jsonb,'{}'::jsonb)
on conflict (id) do nothing;

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
     roadmap=p_roadmap,
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

revoke all on function public.save_project_snapshot(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.save_project_snapshot(bigint,jsonb,jsonb) to authenticated;
