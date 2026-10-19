import { LoaderCircle } from 'lucide-react';
import './SaveProgressModal.css';

export function SaveProgressModal(){
 return <div className="save-progress-backdrop" role="status" aria-live="polite" aria-label="Saving updates to Supabase">
  <section className="save-progress-modal">
   <LoaderCircle className="save-progress-spinner" size={26}/>
   <div><strong>Saving changes</strong><p>Updating the shared roadmap in Supabase…</p></div>
  </section>
 </div>;
}
