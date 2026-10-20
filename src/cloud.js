import { createClient } from '@supabase/supabase-js';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudConfigured=Boolean(supabaseUrl&&supabaseKey);
export const cloudClient=cloudConfigured?createClient(supabaseUrl,supabaseKey):null;

export async function readCurrentUserRole(userId){
 const {data,error}=await cloudClient.from('profiles').select('role').eq('id',userId).maybeSingle();
 if(error)throw error;
 return data?.role||'pending';
}

export async function readCloudSnapshot(){
 const results=await Promise.all([
  cloudClient.from('project_snapshot').select('version').eq('id',1).maybeSingle(),
  cloudClient.from('project_roadmap').select('*').eq('id',1).maybeSingle(),
  cloudClient.from('roadmap_tasks').select('*').eq('roadmap_id',1).order('position'),
  cloudClient.from('roadmap_task_weeks').select('*').order('task_id').order('position'),
  cloudClient.from('roadmap_columns').select('*').eq('roadmap_id',1).order('position'),
  cloudClient.from('roadmap_weeks').select('*').eq('roadmap_id',1).order('position'),
  cloudClient.from('roadmap_legend').select('*').eq('roadmap_id',1).order('position'),
  cloudClient.from('roadmap_notes').select('*').eq('roadmap_id',1).order('position')
 ]);
 const [{data:snapshot,error:snapshotError},{data:roadmap,error:roadmapError},{data:tasks,error:tasksError},{data:taskWeeks,error:taskWeeksError},{data:columns,error:columnsError},{data:weeks,error:weeksError},{data:legend,error:legendError},{data:notes,error:notesError}]=results;
 if(snapshotError||roadmapError||tasksError||taskWeeksError||columnsError||weeksError||legendError||notesError)throw snapshotError||roadmapError||tasksError||taskWeeksError||columnsError||weeksError||legendError||notesError;
 if(!snapshot||!roadmap)throw new Error('Shared roadmap has not been seeded or you do not have permission to read it.');
 const weekCells=(taskWeeks||[]).reduce((byTask,week)=>{(byTask[week.task_id]??=[]).push({week:week.week_key,date:week.week_date,value:week.value,fill:week.fill,fillType:week.fill_type,fontColor:week.font_color});return byTask;},{});
 return {version:snapshot.version,rows:(tasks||[]).map(task=>({id:task.id,phase:task.phase,step:task.task,type:task.task_type,owner:task.owner,reviewer:task.reviewer,status:task.status,notes:task.notes,roadmapTiming:task.roadmap_timing,plannedStart:task.planned_start,plannedEnd:task.planned_end,workDays:task.work_days,sourceRow:task.source_row,origin:task.origin,relatedTaskId:task.related_task_id,weeks:weekCells[task.id]||[]})),roadmap:{workbookTitle:roadmap.workbook_title,headerContext:roadmap.header_context,instruction:roadmap.instruction,project:{company:roadmap.company,project:roadmap.project_name,asOf:roadmap.project_as_of,preparedBy:roadmap.prepared_by,for:roadmap.project_for,sponsor:roadmap.sponsor,targetCompletion:roadmap.target_completion},columns:(columns||[]).map(column=>column.label),weeks:(weeks||[]).map(week=>({key:week.week_key,date:week.week_date,column:week.column_name})),legend:(legend||[]).map(item=>({label:item.label,note:item.note})),notesAndPointsToConfirm:(notes||[]).map(note=>({heading:note.heading,text:note.text}))}};
}
export async function writeCloudSnapshot(rows,roadmap,expectedVersion){
 const {data,error}=await cloudClient.rpc('save_project_snapshot',{p_expected_version:expectedVersion,p_rows:rows,p_roadmap:roadmap});
 if(error)throw error;
 return data;
}
