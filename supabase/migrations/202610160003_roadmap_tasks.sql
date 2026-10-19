create table if not exists public.roadmap_tasks (
 id text primary key,
 roadmap_id integer not null default 1 references public.project_roadmap(id) on delete cascade,
 position integer not null,
 task text,
 phase text,
 owner text,
 reviewer text,
 status text,
 due_date date,
 notes text,
 data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object'),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);

insert into public.roadmap_tasks(
 id,roadmap_id,position,task,phase,owner,reviewer,status,due_date,notes,data
)
select
 coalesce(task_data->>'id','legacy-'||position::text),
 1,
 position,
 task_data->>'step',
 task_data->>'phase',
 task_data->>'owner',
 task_data->>'reviewer',
 task_data->>'status',
 nullif(task_data->>'plannedEnd','')::date,
 task_data->>'notes',
 task_data
from public.project_snapshot snapshot,
 lateral jsonb_array_elements(snapshot.rows) with ordinality as task_rows(task_data,position)
where snapshot.id=1
on conflict (id) do update
set position=excluded.position,
    task=excluded.task,
    phase=excluded.phase,
    owner=excluded.owner,
    reviewer=excluded.reviewer,
    status=excluded.status,
    due_date=excluded.due_date,
    notes=excluded.notes,
    data=excluded.data,
    updated_at=now();

alter table public.roadmap_tasks enable row level security;
revoke all on public.roadmap_tasks from anon,authenticated;
grant select on public.roadmap_tasks to authenticated;

drop policy if exists "approved profiles may read roadmap tasks" on public.roadmap_tasks;
create policy "approved profiles may read roadmap tasks"
on public.roadmap_tasks for select to authenticated
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
 task_data jsonb;
 task_position integer := 0;
begin
 if not exists (
  select 1 from public.profiles
  where id=(select auth.uid()) and role in ('admin','editor')
 ) then
  raise exception 'You do not have edit permission';
 end if;

 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Invalid rows'; end if;
 if p_roadmap is null or jsonb_typeof(p_roadmap)<>'object' then raise exception 'Invalid roadmap metadata'; end if;

 update public.project_snapshot
 set rows=p_rows,version=version+1,updated_at=now(),updated_by=(select auth.uid())
 where id=1 and version=p_expected_version
 returning version into new_version;
 if new_version is null then raise exception 'Data changed since you loaded it. Export your unsaved changes and reload shared data.'; end if;

 insert into public.project_roadmap(id,data,updated_at,updated_by)
 values (1,p_roadmap,now(),(select auth.uid()))
 on conflict (id) do update
 set data=excluded.data,updated_at=excluded.updated_at,updated_by=excluded.updated_by;

 delete from public.roadmap_tasks
 where roadmap_id=1 and id not in (
  select value->>'id' from jsonb_array_elements(p_rows)
 );

 for task_data in select value from jsonb_array_elements(p_rows)
 loop
  task_position := task_position + 1;
  insert into public.roadmap_tasks(
   id,roadmap_id,position,task,phase,owner,reviewer,status,due_date,notes,data,updated_at,updated_by
  ) values (
   task_data->>'id',1,task_position,task_data->>'step',task_data->>'phase',task_data->>'owner',
   task_data->>'reviewer',task_data->>'status',nullif(task_data->>'plannedEnd','')::date,
   task_data->>'notes',task_data,now(),(select auth.uid())
  ) on conflict (id) do update set
   position=excluded.position,task=excluded.task,phase=excluded.phase,owner=excluded.owner,
   reviewer=excluded.reviewer,status=excluded.status,due_date=excluded.due_date,notes=excluded.notes,
   data=excluded.data,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
 end loop;

 return new_version;
end;
$$;

revoke all on function public.save_project_snapshot(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.save_project_snapshot(bigint,jsonb,jsonb) to authenticated;
