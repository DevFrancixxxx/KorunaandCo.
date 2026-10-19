begin;

delete from public.roadmap_tasks
where task like 'Demo %'
   or notes='Fictional demonstration record';

update public.project_snapshot
set rows=coalesce(
  (
    select jsonb_agg(task_data order by position)
    from jsonb_array_elements(rows) with ordinality as task_rows(task_data,position)
    where coalesce(task_data->>'step','') not like 'Demo %'
      and coalesce(task_data->>'notes','')<>'Fictional demonstration record'
  ),
  '[]'::jsonb
),
version=version+1,
updated_at=now()
where id=1;

commit;
