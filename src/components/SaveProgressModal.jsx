import { LoaderCircle } from 'lucide-react';
import './SaveProgressModal.css';

export function SaveProgressModal({isCreating=false}){
 return <div className="save-progress-backdrop" role="status" aria-live="polite" aria-label={isCreating?'Adding task to Supabase':'Saving updates to Supabase'}>
  <section className="save-progress-modal">
   <LoaderCircle className="save-progress-spinner" size={26}/>
   <div><strong>{isCreating?'Adding task':'Saving changes'}</strong><p>{isCreating?'Creating the task in the shared roadmap…':'Updating the shared roadmap in Supabase…'}</p></div>
  </section>
 </div>;
}
