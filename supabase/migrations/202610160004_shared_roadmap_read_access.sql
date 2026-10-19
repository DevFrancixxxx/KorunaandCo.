-- Lets signed-in dashboard users read the one shared roadmap.
-- Writes remain controlled by save_project_snapshot and its role checks.

grant usage on schema public to authenticated;
grant select on public.project_snapshot, public.project_roadmap, public.roadmap_tasks to authenticated;

drop policy if exists "authenticated users can read project snapshot" on public.project_snapshot;
create policy "authenticated users can read project snapshot"
on public.project_snapshot for select to authenticated
using (true);

drop policy if exists "authenticated users can read project roadmap" on public.project_roadmap;
create policy "authenticated users can read project roadmap"
on public.project_roadmap for select to authenticated
using (true);

drop policy if exists "authenticated users can read roadmap tasks" on public.roadmap_tasks;
create policy "authenticated users can read roadmap tasks"
on public.roadmap_tasks for select to authenticated
using (true);
