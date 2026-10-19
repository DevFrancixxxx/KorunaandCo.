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
 const [{data:snapshot,error:snapshotError},{data:roadmap,error:roadmapError},{data:tasks,error:tasksError}]=await Promise.all([
  cloudClient.from('project_snapshot').select('version,rows').eq('id',1).maybeSingle(),
  cloudClient.from('project_roadmap').select('data').eq('id',1).maybeSingle(),
  cloudClient.from('roadmap_tasks').select('data').eq('roadmap_id',1).order('position')
 ]);
 if(snapshotError)throw snapshotError;
 if(roadmapError)throw roadmapError;
 if(tasksError)throw tasksError;
 if(!snapshot||!roadmap)throw new Error('Shared roadmap has not been seeded or you do not have permission to read it.');
 return {version:snapshot.version,rows:tasks.map(task=>task.data),roadmap:roadmap.data};
}
export async function writeCloudSnapshot(rows,roadmap,expectedVersion){
 const {data,error}=await cloudClient.rpc('save_project_snapshot',{p_expected_version:expectedVersion,p_rows:rows,p_roadmap:roadmap});
 if(error)throw error;
 return data;
}
