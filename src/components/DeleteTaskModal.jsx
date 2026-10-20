import { AlertTriangle, Trash2, X } from 'lucide-react';
import './DeleteTaskModal.css';

export function DeleteTaskModal({taskName,onCancel,onConfirm}){
 return <div className="delete-task-backdrop" role="presentation" onMouseDown={onCancel}>
  <section className="delete-task-modal" role="dialog" aria-modal="true" aria-labelledby="delete-task-title" onMouseDown={event=>event.stopPropagation()}>
   <button className="delete-task-close" type="button" onClick={onCancel} aria-label="Close"><X size={17}/></button>
   <div className="delete-task-icon"><AlertTriangle size={22}/></div>
   <h2 id="delete-task-title">Delete task?</h2>
   <p><strong>{taskName}</strong> will be removed from the roadmap. This action cannot be undone.</p>
   <div className="delete-task-actions"><button className="outline" type="button" onClick={onCancel}>Cancel</button><button className="delete-task-confirm" type="button" onClick={onConfirm}><Trash2 size={15}/> Delete task</button></div>
  </section>
 </div>;
}
