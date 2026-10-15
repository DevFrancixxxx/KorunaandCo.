import { createClient } from '@supabase/supabase-js';

const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;

export const cloudConfigured=Boolean(supabaseUrl&&supabaseKey);
export const cloudClient=cloudConfigured?createClient(supabaseUrl,supabaseKey):null;

export async function readCloudSnapshot(){
 const {data,error}=await cloudClient.from('project_snapshot').select('version,rows').eq('id',1).single();
 if(error)throw error;
 return {version:data.version,rows:data.rows};
}
export async function writeCloudSnapshot(rows,expectedVersion){
 const {data,error}=await cloudClient.rpc('save_project_snapshot',{p_expected_version:expectedVersion,p_rows:rows});
 if(error)throw error;
 return data;
}
