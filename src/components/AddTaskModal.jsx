import { useState } from 'react';
import { X } from 'lucide-react';
import './AddTaskModal.css';

const statuses=['Awaiting review','Not started','In progress','Done','At risk','To confirm'];

export function AddTaskModal({phases,onClose,onAdd}){
 const [draft,setDraft]=useState({step:'',phase:phases[0]?.phase||'',owner:'',reviewer:'',plannedStart:'',plannedEnd:'',status:'Not started',notes:''});
 const [error,setError]=useState('');
 const submit=event=>{
  event.preventDefault();
  if(!draft.step.trim()||!draft.phase||!draft.owner.trim())return setError('Task, phase, and owner are required.');
  if(draft.plannedStart&&draft.plannedEnd&&draft.plannedEnd<draft.plannedStart)return setError('End date cannot be before the start date.');
  onAdd(draft);
 };
 return <div className="add-task-backdrop" onClick={onClose}>
  <section className="add-task-modal" role="dialog" aria-modal="true" aria-labelledby="add-task-title" onClick={event=>event.stopPropagation()}>
   <div className="add-task-heading"><div><span>Task planner</span><h2 id="add-task-title">Add a new task</h2><p>Set the owner, timeline, and delivery status.</p></div><button type="button" onClick={onClose} aria-label="Close"><X size={16}/></button></div>
   <form onSubmit={submit} className="add-task-form">
    <label>Task name *<input autoFocus value={draft.step} onChange={event=>setDraft({...draft,step:event.target.value})}/></label>
    <label>Phase *<select value={draft.phase} onChange={event=>setDraft({...draft,phase:event.target.value})}>{phases.map(phase=><option key={phase.id} value={phase.phase}>{phase.phase}</option>)}</select></label>
    <label>Owner *<input value={draft.owner} onChange={event=>setDraft({...draft,owner:event.target.value})}/></label>
    <label>Reviewer<input value={draft.reviewer} onChange={event=>setDraft({...draft,reviewer:event.target.value})}/></label>
    <label>Status<select value={draft.status} onChange={event=>setDraft({...draft,status:event.target.value})}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label>
    <label>Start date<input type="date" value={draft.plannedStart} onChange={event=>setDraft({...draft,plannedStart:event.target.value})}/></label>
    <label>Due date<input type="date" min={draft.plannedStart||undefined} value={draft.plannedEnd} onChange={event=>setDraft({...draft,plannedEnd:event.target.value})}/></label>
    <label className="add-task-notes">Notes<textarea rows="3" value={draft.notes} onChange={event=>setDraft({...draft,notes:event.target.value})}/></label>
    {error&&<p className="add-task-error">{error}</p>}
    <div className="add-task-actions"><button type="button" className="outline" onClick={onClose}>Cancel</button><button className="primary" type="submit">Add and save</button></div>
   </form>
  </section>
 </div>;
}
