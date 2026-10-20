-- Role-based access for every normalized roadmap table.
-- Viewers can read; only editors and admins can change data.

create or replace function private.current_user_can_edit_roadmap()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.profiles
    where id=(select auth.uid()) and role in ('admin','editor')
  );
$$;

revoke execute on function private.current_user_can_edit_roadmap() from public,anon;
grant execute on function private.current_user_can_edit_roadmap() to authenticated;

grant usage on schema public to authenticated;
grant select,insert,update,delete on public.project_snapshot,public.project_roadmap,public.roadmap_tasks,
  public.roadmap_task_weeks,public.roadmap_columns,public.roadmap_weeks,public.roadmap_legend,public.roadmap_notes to authenticated;

alter table public.project_snapshot enable row level security;
alter table public.project_roadmap enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.roadmap_task_weeks enable row level security;
alter table public.roadmap_columns enable row level security;
alter table public.roadmap_weeks enable row level security;
alter table public.roadmap_legend enable row level security;
alter table public.roadmap_notes enable row level security;

drop policy if exists "authenticated users can read project snapshot" on public.project_snapshot;
drop policy if exists "authenticated users can read project roadmap" on public.project_roadmap;
drop policy if exists "authenticated users can read roadmap tasks" on public.roadmap_tasks;
drop policy if exists "approved profiles may read roadmap" on public.project_roadmap;
drop policy if exists "approved profiles may read roadmap tasks" on public.roadmap_tasks;
drop policy if exists "authenticated users can read normalized roadmap task weeks" on public.roadmap_task_weeks;
drop policy if exists "authenticated users can read normalized roadmap columns" on public.roadmap_columns;
drop policy if exists "authenticated users can read normalized roadmap weeks" on public.roadmap_weeks;
drop policy if exists "authenticated users can read normalized roadmap legend" on public.roadmap_legend;
drop policy if exists "authenticated users can read normalized roadmap notes" on public.roadmap_notes;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'project_snapshot','project_roadmap','roadmap_tasks','roadmap_task_weeks',
    'roadmap_columns','roadmap_weeks','roadmap_legend','roadmap_notes'
  ] loop
    execute format('drop policy if exists "roadmap readers" on public.%I', table_name);
    execute format('drop policy if exists "roadmap editors insert" on public.%I', table_name);
    execute format('drop policy if exists "roadmap editors update" on public.%I', table_name);
    execute format('drop policy if exists "roadmap editors delete" on public.%I', table_name);

    execute format('create policy "roadmap readers" on public.%I for select to authenticated using ((select private.current_user_has_project_access()))', table_name);
    execute format('create policy "roadmap editors insert" on public.%I for insert to authenticated with check ((select private.current_user_can_edit_roadmap()))', table_name);
    execute format('create policy "roadmap editors update" on public.%I for update to authenticated using ((select private.current_user_can_edit_roadmap())) with check ((select private.current_user_can_edit_roadmap()))', table_name);
    execute format('create policy "roadmap editors delete" on public.%I for delete to authenticated using ((select private.current_user_can_edit_roadmap()))', table_name);
  end loop;
end;
$$;
