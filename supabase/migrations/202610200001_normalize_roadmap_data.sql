-- Migrates the shared roadmap from JSONB storage into relational tables.
-- Run after the existing 20261016 roadmap migrations.

alter table public.roadmap_tasks
  add column if not exists task_type text,
  add column if not exists roadmap_timing text,
  add column if not exists planned_start date,
  add column if not exists planned_end date,
  add column if not exists work_days integer,
  add column if not exists source_row integer,
  add column if not exists origin text,
  add column if not exists related_task_id text;

update public.roadmap_tasks
set task_type=coalesce(task_type,data->>'type'),
    roadmap_timing=coalesce(roadmap_timing,data->>'roadmapTiming'),
    planned_start=coalesce(planned_start,nullif(data->>'plannedStart','')::date),
    planned_end=coalesce(planned_end,nullif(data->>'plannedEnd','')::date),
    work_days=coalesce(work_days,nullif(data->>'workDays','')::integer),
    source_row=coalesce(source_row,nullif(data->>'sourceRow','')::integer),
    origin=coalesce(origin,data->>'origin'),
    related_task_id=coalesce(related_task_id,data->>'relatedTaskId');

create table if not exists public.roadmap_task_weeks (
  task_id text not null references public.roadmap_tasks(id) on delete cascade,
  position integer not null,
  week_key text not null,
  week_date date not null,
  value text,
  fill text,
  fill_type text,
  font_color text,
  primary key (task_id, position)
);

insert into public.roadmap_task_weeks(task_id,position,week_key,week_date,value,fill,fill_type,font_color)
select task.id, week.position, week.value->>'week', (week.value->>'date')::date,
       week.value->>'value', week.value->>'fill', week.value->>'fillType', week.value->>'fontColor'
from public.roadmap_tasks task
cross join lateral jsonb_array_elements(coalesce(task.data->'weeks','[]'::jsonb)) with ordinality as week(value,position)
on conflict (task_id,position) do nothing;

alter table public.project_roadmap
  add column if not exists workbook_title text,
  add column if not exists header_context text,
  add column if not exists instruction text,
  add column if not exists company text,
  add column if not exists project_name text,
  add column if not exists project_as_of date,
  add column if not exists prepared_by text,
  add column if not exists project_for text,
  add column if not exists sponsor text,
  add column if not exists target_completion date;

update public.project_roadmap
set workbook_title=coalesce(workbook_title,data->>'workbookTitle'),
    header_context=coalesce(header_context,data->>'headerContext'),
    instruction=coalesce(instruction,data->>'instruction'),
    company=coalesce(company,data->'project'->>'company'),
    project_name=coalesce(project_name,data->'project'->>'project'),
    project_as_of=coalesce(project_as_of,nullif(data->'project'->>'asOf','')::date),
    prepared_by=coalesce(prepared_by,data->'project'->>'preparedBy'),
    project_for=coalesce(project_for,data->'project'->>'for'),
    sponsor=coalesce(sponsor,data->'project'->>'sponsor'),
    target_completion=coalesce(target_completion,nullif(data->'project'->>'targetCompletion','')::date);

create table if not exists public.roadmap_columns (
  roadmap_id integer not null references public.project_roadmap(id) on delete cascade,
  position integer not null,
  label text not null,
  primary key (roadmap_id, position)
);
create table if not exists public.roadmap_weeks (
  roadmap_id integer not null references public.project_roadmap(id) on delete cascade,
  position integer not null,
  week_key text not null,
  week_date date not null,
  column_name text,
  primary key (roadmap_id, position)
);
create table if not exists public.roadmap_legend (
  roadmap_id integer not null references public.project_roadmap(id) on delete cascade,
  position integer not null,
  label text,
  note text,
  primary key (roadmap_id, position)
);
create table if not exists public.roadmap_notes (
  roadmap_id integer not null references public.project_roadmap(id) on delete cascade,
  position integer not null,
  heading text,
  text text,
  primary key (roadmap_id, position)
);

insert into public.roadmap_columns(roadmap_id,position,label)
select roadmap.id,item.position,item.value
from public.project_roadmap roadmap
cross join lateral jsonb_array_elements_text(coalesce(roadmap.data->'columns','[]'::jsonb)) with ordinality as item(value,position)
on conflict do nothing;
insert into public.roadmap_weeks(roadmap_id,position,week_key,week_date,column_name)
select roadmap.id,item.position,item.value->>'key',(item.value->>'date')::date,item.value->>'column'
from public.project_roadmap roadmap
cross join lateral jsonb_array_elements(coalesce(roadmap.data->'weeks','[]'::jsonb)) with ordinality as item(value,position)
on conflict do nothing;
insert into public.roadmap_legend(roadmap_id,position,label,note)
select roadmap.id,item.position,case when jsonb_typeof(item.value)='string' then item.value #>> '{}' else item.value->>'label' end,item.value->>'note'
from public.project_roadmap roadmap
cross join lateral jsonb_array_elements(coalesce(roadmap.data->'legend','[]'::jsonb)) with ordinality as item(value,position)
on conflict do nothing;
insert into public.roadmap_notes(roadmap_id,position,heading,text)
select roadmap.id,item.position,item.value->>'heading',item.value->>'text'
from public.project_roadmap roadmap
cross join lateral jsonb_array_elements(coalesce(roadmap.data->'notesAndPointsToConfirm','[]'::jsonb)) with ordinality as item(value,position)
on conflict do nothing;

alter table public.roadmap_tasks drop column if exists data;
alter table public.project_roadmap drop column if exists data;
alter table public.project_snapshot drop column if exists rows;

alter table public.roadmap_task_weeks enable row level security;
alter table public.roadmap_columns enable row level security;
alter table public.roadmap_weeks enable row level security;
alter table public.roadmap_legend enable row level security;
alter table public.roadmap_notes enable row level security;
grant select on public.roadmap_task_weeks,public.roadmap_columns,public.roadmap_weeks,public.roadmap_legend,public.roadmap_notes to authenticated;
create policy "authenticated users can read normalized roadmap task weeks" on public.roadmap_task_weeks for select to authenticated using (true);
create policy "authenticated users can read normalized roadmap columns" on public.roadmap_columns for select to authenticated using (true);
create policy "authenticated users can read normalized roadmap weeks" on public.roadmap_weeks for select to authenticated using (true);
create policy "authenticated users can read normalized roadmap legend" on public.roadmap_legend for select to authenticated using (true);
create policy "authenticated users can read normalized roadmap notes" on public.roadmap_notes for select to authenticated using (true);

create or replace function public.save_project_snapshot(p_expected_version bigint,p_rows jsonb,p_roadmap jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare new_version bigint; item jsonb; task_position integer:=0;
begin
 if not exists (select 1 from public.profiles where id=(select auth.uid()) and role in ('admin','editor')) then raise exception 'You do not have edit permission'; end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' or p_roadmap is null or jsonb_typeof(p_roadmap)<>'object' then raise exception 'Invalid roadmap payload'; end if;
 update public.project_snapshot set version=version+1,updated_at=now(),updated_by=(select auth.uid()) where id=1 and version=p_expected_version returning version into new_version;
 if new_version is null then raise exception 'Data changed since you loaded it. Reload the roadmap and try again.'; end if;
 update public.project_roadmap set workbook_title=p_roadmap->>'workbookTitle',header_context=p_roadmap->>'headerContext',instruction=p_roadmap->>'instruction',company=p_roadmap->'project'->>'company',project_name=p_roadmap->'project'->>'project',project_as_of=nullif(p_roadmap->'project'->>'asOf','')::date,prepared_by=p_roadmap->'project'->>'preparedBy',project_for=p_roadmap->'project'->>'for',sponsor=p_roadmap->'project'->>'sponsor',target_completion=nullif(p_roadmap->'project'->>'targetCompletion','')::date,updated_at=now(),updated_by=(select auth.uid()) where id=1;
 delete from public.roadmap_tasks where roadmap_id=1 and id not in (select value->>'id' from jsonb_array_elements(p_rows));
 for item in select value from jsonb_array_elements(p_rows) loop
  task_position:=task_position+1;
  insert into public.roadmap_tasks(id,roadmap_id,position,task,phase,owner,reviewer,status,due_date,notes,task_type,roadmap_timing,planned_start,planned_end,work_days,source_row,origin,related_task_id,updated_at,updated_by)
  values(item->>'id',1,task_position,item->>'step',item->>'phase',item->>'owner',item->>'reviewer',item->>'status',nullif(item->>'plannedEnd','')::date,item->>'notes',item->>'type',item->>'roadmapTiming',nullif(item->>'plannedStart','')::date,nullif(item->>'plannedEnd','')::date,nullif(item->>'workDays','')::integer,nullif(item->>'sourceRow','')::integer,item->>'origin',item->>'relatedTaskId',now(),(select auth.uid()))
  on conflict(id) do update set position=excluded.position,task=excluded.task,phase=excluded.phase,owner=excluded.owner,reviewer=excluded.reviewer,status=excluded.status,due_date=excluded.due_date,notes=excluded.notes,task_type=excluded.task_type,roadmap_timing=excluded.roadmap_timing,planned_start=excluded.planned_start,planned_end=excluded.planned_end,work_days=excluded.work_days,source_row=excluded.source_row,origin=excluded.origin,related_task_id=excluded.related_task_id,updated_at=excluded.updated_at,updated_by=excluded.updated_by;
  delete from public.roadmap_task_weeks where task_id=item->>'id';
  insert into public.roadmap_task_weeks(task_id,position,week_key,week_date,value,fill,fill_type,font_color)
  select item->>'id',week.position,week.value->>'week',(week.value->>'date')::date,week.value->>'value',week.value->>'fill',week.value->>'fillType',week.value->>'fontColor' from jsonb_array_elements(coalesce(item->'weeks','[]'::jsonb)) with ordinality as week(value,position);
 end loop;
 return new_version;
end; $$;
