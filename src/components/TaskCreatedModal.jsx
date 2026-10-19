import { CheckCircle2 } from 'lucide-react';
import './TaskCreatedModal.css';

export function TaskCreatedModal({taskName,onClose}){
 return <div className="task-created-backdrop" role="dialog" aria-modal="true" aria-labelledby="task-created-title">
  <section className="task-created-modal">
   <CheckCircle2 size={42}/>
   <h2 id="task-created-title">Task created</h2>
   <p><strong>{taskName}</strong> was saved to the shared Supabase roadmap.</p>
   <button className="primary" onClick={onClose}>Done</button>
  </section>
 </div>;
}
