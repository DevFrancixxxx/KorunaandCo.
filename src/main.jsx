import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, CheckSquare, CalendarDays, Users, GraduationCap, FileText, BarChart3, Settings, Search, Bell, ChevronRight, ChevronLeft, AlertTriangle, Flag, Circle, CheckCircle2, Clock3, LayoutGrid, List, Menu, Download, RotateCcw, Save, X, ClipboardList } from 'lucide-react';
import sourceData from './data.json';
import './style.css';
import { cloudConfigured, readCloudSnapshot, writeCloudSnapshot } from './cloud.js';
import { AuthLoading, Login } from './components/Login.jsx';
import { Register } from './components/Register.jsx';
import { AccountMenu } from './components/AccountMenu.jsx';
import { demoCredentials, getCurrentSession, getInitialSession, registerAccount, signIn, signOut, watchAuthState } from './services/auth.js';

const nav = [
 ['Overview',Home],['Roadmap',CheckSquare],['Tasks',ClipboardList],['Calendar',CalendarDays],
 ['Team',Users],['AI Academy',GraduationCap],['Documents',FileText],['Reports',BarChart3],['Settings',Settings]
];
const statusOptions = ['Awaiting review','Not started','In progress','Done','At risk','To confirm'];
const fmt = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
const short = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—';
const daysBetween = (a,b) => Math.ceil((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000);
const todayISO = new Date().toLocaleDateString('en-CA'); // Actual local reporting date.
const initial = sourceData.rows.map((r,i)=>({...r,id:`r${r.sourceRow}`,weeks:r.weeks||[]}));
// Week 1 begins Monday 5 October 2026. Keep the workbook's original timing labels unchanged.
const projectWeekStart = '2026-10-05';
function roadmapTimingFromDates(start,end){
 if(!start || !end || end < start) return '';
 const weekNumber = date => Math.floor(daysBetween(projectWeekStart,date)/7)+1;
 const first=weekNumber(start), last=weekNumber(end);
 if(first<1 || last>26) return 'Outside 26-week roadmap';
 return `Weeks ${first}–${last}`;
}

// Update dashboard-added tasks only; original workbook timing is preserved.
function normalizeAddedTiming(rows){
 return rows.map(t=>t.origin==='Added in dashboard' ? {...t,roadmapTiming:roadmapTimingFromDates(t.plannedStart,t.plannedEnd)||t.roadmapTiming} : t);
}

// Preserve source workbook order; insert dashboard-created tasks after their related step.
// Unknown relationships fall at the end of their selected phase, never after Phase 6.
function orderTasks(rows){
 const base=rows.filter(t=>t.origin!=='Added in dashboard');
 const added=rows.filter(t=>t.origin==='Added in dashboard');
 const result=[...base];
 for(const task of added){
  const anchorId=task.relatedTaskId;
  let pos=anchorId?result.findIndex(t=>t.id===anchorId):-1;
  if(pos<0){
   // Backward-compatible match for tasks created in v2 without a relationship field.
   const stem=String(task.step||'').replace(/\s*(approval|review).*$/i,'').trim().toLowerCase().replace(/[–—]/g,'-');
   if(stem) pos=result.findIndex(t=>t.phase===task.phase && String(t.step||'').toLowerCase().replace(/[–—]/g,'-').startsWith(stem) && /draft/i.test(t.step||''));
  }
  if(pos<0){
   for(let i=0;i<result.length;i++) if(result[i].phase===task.phase)pos=i;
  }
  result.splice(pos+1,0,task);
 }
 return result;
}
function App(){
 const [session,setSession]=useState(getInitialSession);
 const [authView,setAuthView]=useState('login');
 const [authReady,setAuthReady]=useState(!cloudConfigured);
 const [cloudReady,setCloudReady]=useState(!cloudConfigured);
 const [sharedAccess,setSharedAccess]=useState(!cloudConfigured);
 const [cloudVersion,setCloudVersion]=useState(0);
 const [cloudMessage,setCloudMessage]=useState(cloudConfigured?'Connecting to shared data…':'');
 const [cloudSaving,setCloudSaving]=useState(false);
 const [saveBlocked,setSaveBlocked]=useState(false);
 const cloudVersionRef=React.useRef(0);
 const lastSavedRef=React.useRef(null);
 const remoteDirtyRef=React.useRef(false);
 const loadCloud=async()=>{
  if(remoteDirtyRef.current&&!confirm('You have unsaved changes. Export a JSON backup first. Discard them and reload shared data?'))return;
  try {
   const result=await readCloudSnapshot();
   const visibleRows=Array.isArray(result.rows)&&result.rows.length?normalizeAddedTiming(result.rows):initial;
   cloudVersionRef.current=result.version;
   setCloudVersion(result.version);
   lastSavedRef.current=JSON.stringify(visibleRows);
   remoteDirtyRef.current=false;
   setSaveBlocked(false);
   setSharedAccess(true);
   setTasks(visibleRows);
   setCloudMessage(result.rows?.length?'Shared data loaded':'Shared database empty — showing bundled dashboard content');
   setCloudReady(true);
  }catch{
   lastSavedRef.current=JSON.stringify(initial);
   remoteDirtyRef.current=false;
   setSaveBlocked(false);
   setSharedAccess(false);
   setTasks(initial);
   setCloudMessage('Showing dashboard content · shared access pending');
   setCloudReady(true);
  }
 };
 useEffect(()=>{
  if(!cloudConfigured)return;
  getCurrentSession().then(setSession).catch(error=>setCloudMessage(error.message)).finally(()=>setAuthReady(true));
  return watchAuthState((next,event)=>{
   setSession(next);
   if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED'){
    setCloudReady(false);
    setSharedAccess(false);
   }
  });
 },[]);
 useEffect(()=>{if(cloudConfigured&&session)loadCloud()},[session?.user?.id]);

 const handleLogin=async(email,password)=>setSession(await signIn(email,password));
 const handleSignOut=async()=>{
  await signOut();
  setSession(null);
  setAuthView('login');
 };

 const [tasks,setTasks] = useState(()=>{try{const saved=localStorage.getItem('kc-demo-tasks-v1');return saved?normalizeAddedTiming(JSON.parse(saved)):initial}catch{return initial}});
 const [page,setPage] = useState('Overview');
 const [showAdd,setShowAdd] = useState(false);
 const [draft,setDraft] = useState({step:'',phase:'Build The Product',owner:'Demo User',reviewer:'',plannedStart:'',plannedEnd:'',status:'Awaiting review',notes:'',roadmapTiming:'',type:'Task',relatedTaskId:''});
 const [query,setQuery] = useState('');
 const [filter,setFilter] = useState('All');
 const [view,setView] = useState('Gantt');
 const [menu,setMenu] = useState(false);
 const [toast,setToast] = useState('');
 const [now,setNow] = useState(todayISO);
 useEffect(()=>{const guard=e=>{if(remoteDirtyRef.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 useEffect(()=>{if(!cloudConfigured)localStorage.setItem('kc-demo-tasks-v1',JSON.stringify(tasks));},[tasks]);
 useEffect(()=>{
  if(!cloudConfigured||!cloudReady||!sharedAccess||!session)return;
  const serialized=JSON.stringify(tasks);
  remoteDirtyRef.current=serialized!==lastSavedRef.current;
  if(!remoteDirtyRef.current||cloudSaving||saveBlocked)return;
  const timer=setTimeout(async()=>{
   setCloudSaving(true);
   try{
    const nextVersion=await writeCloudSnapshot(tasks,cloudVersionRef.current);
    cloudVersionRef.current=nextVersion;setCloudVersion(nextVersion);lastSavedRef.current=serialized;
    setCloudMessage('Saved to shared database');
   }catch(e){setSaveBlocked(true);setCloudMessage('SAVE FAILED: '+e.message+' — export a JSON backup before reloading');}
   finally{setCloudSaving(false)}
  },1200);
  return ()=>clearTimeout(timer);
 },[tasks,cloudReady,sharedAccess,cloudSaving,saveBlocked,session?.user?.id]);

 const actionable = tasks.filter(t=>t.type==='Task'||t.type==='Milestone');
 const taskRows = tasks.filter(t=>t.type==='Task'||t.type==='Milestone');
 const done = taskRows.filter(t=>t.status==='Done').length;
 const inProgress = taskRows.filter(t=>t.status==='In progress').length;
 const atRisk = taskRows.filter(t=>t.status==='At risk').length;
 const progress = taskRows.length?Math.round(done/taskRows.length*100):0;
 const target = sourceData.project.targetCompletion;
 const remaining = Math.max(0,daysBetween(now,target));
 const addTask=(e)=>{e.preventDefault();if(!draft.step.trim()||!draft.phase||!draft.owner.trim())return;if(draft.plannedStart&&draft.plannedEnd&&draft.plannedEnd<draft.plannedStart){setToast('End date cannot be before start date');return;}const id='added-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now());const row={...draft,roadmapTiming:roadmapTimingFromDates(draft.plannedStart,draft.plannedEnd)||draft.roadmapTiming,id,sourceRow:null,origin:'Added in dashboard',workDays:draft.plannedStart&&draft.plannedEnd?Math.max(1,daysBetween(draft.plannedStart,draft.plannedEnd)+1):null,weeks:sourceData.weeks.map(w=>({week:w.key,date:w.date,value:null,fill:null}))};setTasks(old=>[...old,row]);setShowAdd(false);setPage('Tasks');setToast(cloudConfigured?'Task added — cloud save pending':'Task added and saved in this browser');};
 const importJSON=(e)=>{const file=e.target.files?.[0];if(!file)return;file.text().then(raw=>{try{const data=JSON.parse(raw);if(!Array.isArray(data.rows)||!data.rows.every(r=>r&&typeof r.id==='string'&&typeof r.type==='string'))throw Error('Not a compatible dashboard backup');if(!confirm(`Restore ${data.rows.length} rows from this backup? This replaces the current project data, including shared data in cloud mode. Export your current backup first.`))return;setTasks(normalizeAddedTiming(data.rows));setToast('Backup imported successfully');}catch(err){setToast('Import failed: '+err.message);}finally{e.target.value='';}});};
 const update=(id,key,value)=>setTasks(old=>old.map(t=>{
  if(t.id!==id)return t;
  const changed={...t,[key]:value};
  if(t.origin==='Added in dashboard' && (key==='plannedStart'||key==='plannedEnd')){
   changed.roadmapTiming=roadmapTimingFromDates(changed.plannedStart,changed.plannedEnd);
   changed.workDays=changed.plannedStart&&changed.plannedEnd&&changed.plannedEnd>=changed.plannedStart?daysBetween(changed.plannedStart,changed.plannedEnd)+1:null;
  }
  return changed;
 }));
 const reset=()=>{if(cloudConfigured){setToast('Reset disabled in cloud mode; use approved import with care');return;}if(confirm('Reset all edits to the original workbook data?')){setTasks(initial);localStorage.removeItem('kc-demo-tasks-v1');setToast('Workbook data restored');}};
 const exportJSON=()=>{const blob=new Blob([JSON.stringify({...sourceData,rows:tasks},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kc-roadmap-data-backup.json';a.click();URL.revokeObjectURL(a.href);};
 const filtered=useMemo(()=>orderTasks(tasks).filter(t=>`${t.phase} ${t.step||''} ${t.owner||''} ${t.status||''} ${t.notes||''}`.toLowerCase().includes(query.toLowerCase()) && (filter==='All'||t.status===filter)),[tasks,query,filter]);
 const phases = [
  {name:'Foundation',label:'01',start:'2026-10-05',end:'2026-10-09'},
  {name:'Build The Product',label:'02',start:'2026-10-05',end:'2026-10-20'},
  {name:'Package It',label:'03',start:'2026-10-12',end:'2026-10-23'},
  {name:'Prove It',label:'04',start:'2026-10-19',end:'2026-11-13'},
  {name:'Find The Next Niche',label:'05',start:'2026-11-02',end:'2027-01-08'},
  {name:'Scale',label:'06',start:'2026-11-30',end:'2027-04-02'}
 ];
 const phasePct = name => {const a=taskRows.filter(t=>t.phase===name);return a.length?Math.round(a.filter(t=>t.status==='Done').length/a.length*100):0};
 const attention=taskRows.filter(t=>t.status==='At risk'||(t.status!=='Done'&&t.plannedEnd&&t.plannedEnd<now));
 const weekStart = new Date(now+'T12:00:00'); weekStart.setDate(weekStart.getDate() - (weekStart.getDay()+6)%7); const monday=weekStart.toLocaleDateString('en-CA'); const friday=new Date(weekStart.getTime()+4*86400000).toLocaleDateString('en-CA');
 const weekTasks=taskRows.filter(t=>t.plannedStart&&t.plannedEnd&&t.plannedStart<=friday&&t.plannedEnd>=monday&&t.status!=='Done').slice(0,7);
 const allMilestones=tasks.filter(t=>t.type==='Milestone');
 const navTo=p=>{setPage(p);setMenu(false)};
 if(!authReady)return <AuthLoading message="Checking secure session…"/>;
 if(!session&&authView==='register')return <Register cloudMode={cloudConfigured} onRegister={registerAccount} onBackToLogin={()=>setAuthView('login')}/>;
 if(!session)return <Login cloudMode={cloudConfigured} demoCredentials={demoCredentials} onSignIn={handleLogin} onRegister={()=>setAuthView('register')}/>;
 return <div className="app">
  <aside className={`sidebar ${menu?'open':''}`}>
   <div className="brand"><div className="monogram">DEMO</div><div className="brandname">KORUNA &amp; CO</div></div>
   <div className="nav">{nav.map(([label,Icon])=><button key={label} className={page===label?'active':''} onClick={()=>navTo(label)}><Icon size={17}/><span>{label}</span></button>)}</div>
   <div className="sidebar-foot"><div>AI Workforce<br/>Transformation</div><ChevronRight size={18}/></div>
  </aside>
  <main className="main">
   <header className="topbar"><button className="mobile-menu" onClick={()=>setMenu(!menu)}><Menu/></button><div><h1>{page==='Overview'?'Project Roadmap':page}</h1><p>Sample Project</p></div><div className="top-actions"><div className="search"><Search size={16}/><input placeholder="Search tasks, people or documents..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="iconbutton" title="Notifications"><Bell size={18}/><i/></button><AccountMenu session={session} onSignOut={handleSignOut}/></div></header>
   <div className={`cloud-banner ${cloudConfigured&&!sharedAccess?'cloud-fallback':''}`}><span>{cloudConfigured?(sharedAccess?`☁ Shared prototype · version ${cloudVersion} · ${cloudSaving?'Saving…':cloudMessage}`:`◌ ${cloudMessage}`):`Local demo session · ${session.user.email}`}</span><div>{cloudConfigured&&<button className="outline" onClick={loadCloud} disabled={cloudSaving}>Reload shared data</button>}</div></div>
   {page==='Overview'&&<><div className="stats">
    <div className="stat"><div className="ring" style={{'--pct':progress}}><span>{progress}%</span></div><div><b>{progress}%</b><small>Overall progress</small><em className="green">↑ Calculated from tasks</em></div></div>
    <div className="stat"><div className="stat-icon lavender"><List/></div><div><b>{taskRows.filter(t=>t.status==='In progress'||t.status==='Not started').length}</b><small>Active tasks</small><em>{inProgress} in progress</em></div></div>
    <div className="stat"><div className="stat-icon rose"><AlertTriangle/></div><div><b>{atRisk}</b><small>At risk</small><em>{attention.length} need attention (incl. overdue)</em></div></div>
    <div className="stat"><div className="stat-icon lavender"><CalendarDays/></div><div><b>{fmt(target)}</b><small>Target completion</small><em>{remaining} days remaining</em></div></div>
   </div>
   <section className="panel phase-panel"><div className="section-head"><h2>Project Phases</h2><button className="textbutton" onClick={()=>navTo('Roadmap')}>View all phases <ChevronRight size={14}/></button></div><div className="phases">{phases.map(p=><div className="phase" key={p.label}><div className="phase-title"><span className={'phase-number n'+p.label}>{p.label}</span><div><b>{p.name==='Build The Product'?'Build Product':p.name==='Find The Next Niche'?'Find Next Niche':p.name}</b><small>{short(p.start)} – {short(p.end)}</small></div></div><div className="progress-line"><span style={{width:phasePct(p.name)+'%'}}/></div><div className="pct">{phasePct(p.name)}%</div></div>)}</div></section>
   <section className="panel gantt-panel"><div className="section-head"><div className="tabs">{['Gantt','Month','Week'].map(v=><button key={v} className={view===v?'selected':''} onClick={()=>setView(v)}>{v}</button>)}</div><span className="range">Oct 2026 – Apr 2027</span><button className="textbutton" onClick={()=>navTo('Roadmap')}>Open full roadmap <ChevronRight size={14}/></button></div><div className="mini-gantt"><div className="gantt-labels">{phases.map(p=><div key={p.label}><span className={'tiny-num n'+p.label}>{p.label}</span>{p.name==='Build The Product'?'Build Product':p.name==='Find The Next Niche'?'Find Next Niche':p.name}</div>)}</div><div className="gantt-grid"><div className="months">{['Oct 2026','Nov 2026','Dec 2026','Jan 2027','Feb 2027','Mar 2027','Apr 2027'].map(m=><span key={m}>{m}</span>)}</div>{phases.map(p=><div className="gantt-row" key={p.label}><span className={'bar n'+p.label} style={{left:((new Date(p.start)-new Date('2026-10-05'))/86400000/179*100)+'%',width:(Math.max(1,(new Date(p.end)-new Date(p.start))/86400000+1)/179*100)+'%'}} title={`${fmt(p.start)} – ${fmt(p.end)}`}/></div>)}</div></div></section>
   <div className="lower-grid"><section className="panel"><div className="section-head"><h2>This Week</h2><small>{short(monday)} – {fmt(friday)}</small><button className="textbutton" onClick={()=>navTo('Tasks')}>View all <ChevronRight size={14}/></button></div>{weekTasks.length?weekTasks.map(t=><div className="listrow" key={t.id}><span className={`status-dot ${t.status==='Done'?'done':t.status==='In progress'?'progress':''}`}>{t.status==='Done'?<CheckCircle2 size={13}/>:t.status==='In progress'?<Clock3 size={13}/>:<Circle size={13}/>}</span><span className="listname">{t.step}</span><small>{t.owner||'TBC'}</small><time>{short(t.plannedEnd)}</time></div>):<p className="empty">No unfinished tasks scheduled for this week.</p>}</section>
   <section className="panel"><div className="section-head"><h2>Needs Attention</h2><span className="count">{attention.length}</span><button className="textbutton" onClick={()=>navTo('Tasks')}>View all <ChevronRight size={14}/></button></div>{attention.slice(0,5).map(t=><div className="attention-row" key={t.id}><AlertTriangle size={16}/><span>{t.step}</span><small>{t.owner||'TBC'}</small><time className={t.plannedEnd<now?'late':''}>{short(t.plannedEnd)}</time></div>)}{!attention.length&&<p className="empty">No at-risk or overdue tasks.</p>}</section>
   <section className="panel"><div className="section-head"><h2>Upcoming Milestones</h2><button className="textbutton" onClick={()=>navTo('Roadmap')}>View all <ChevronRight size={14}/></button></div>{[...sourceData.milestones].map(m=><div className="milestone-row" key={m.title}><Flag size={15}/><span>{m.title}</span><time>{short(m.date)}</time></div>)}</section></div>
   <section className="panel schedule"><div className="section-head"><h2>October 2026</h2><div className="arrow-group"><button onClick={()=>setNow('2026-10-12')}><ChevronLeft size={15}/></button><button onClick={()=>setNow('2026-10-13')}><ChevronRight size={15}/></button></div><span className="grow"/><button className="outline" onClick={()=>setNow(todayISO)}>Today</button><select aria-label="Schedule view"><option>Week view</option><option>Day view</option></select></div><div className="calendar-grid">{['Mon 12','Tue 13','Wed 14','Thu 15','Fri 16'].map((day,i)=>{const date=`2026-10-${12+i}`;const dayTasks=tasks.filter(t=>t.type==='Task'&&t.plannedStart<=date&&t.plannedEnd>=date&&t.status!=='Done').slice(0,4);return <div className="day" key={day}><b>{day}</b>{['09:00','11:00','14:00','16:00'].map((time,j)=><div className="event" key={time}><small>{time}</small><span className="event-dot"/><span>{dayTasks[j]?.step||'—'}</span></div>)}</div>})}</div></section>
   </>}
   {page==='Tasks'&&<section className="panel task-management"><div className="section-head"><div><h2>Task Management</h2><p className="subhead">Manage daily work and approvals · {taskRows.length} actionable steps ({taskRows.filter(t=>t.origin==='Added in dashboard').length} added)</p></div><div className="table-actions"><button className="outline" onClick={exportJSON}><Download size={14}/> Export JSON backup</button><label className="outline import-button">Import JSON backup<input type="file" accept=".json,.json_v2,application/json" onChange={importJSON} hidden/></label><button className="primary" onClick={()=>setShowAdd(true)}>+ Add Task</button></div></div><div className="task-summary"><span><b>{taskRows.filter(t=>t.status==='In progress').length}</b> In progress</span><span><b>{taskRows.filter(t=>t.status==='Awaiting review').length}</b> Awaiting review</span><span><b>{attention.length}</b> Need attention</span></div><div className="task-list-wrap"><table className="task-list"><thead><tr><th>Task</th><th>Phase</th><th>Owner</th><th>Reviewer</th><th>Status</th><th>Due date</th><th>Notes</th></tr></thead><tbody>{filtered.filter(t=>t.type==='Task'||t.type==='Milestone').map(t=><tr key={t.id}><td><strong>{t.step}</strong>{t.origin==='Added in dashboard'&&<small className="added-label">Added task</small>}</td><td>{t.phase}</td><td><input aria-label={'Owner for '+t.step} value={t.owner||''} onChange={e=>update(t.id,'owner',e.target.value)}/></td><td><input aria-label={'Reviewer for '+t.step} placeholder="—" value={t.reviewer||''} onChange={e=>update(t.id,'reviewer',e.target.value)}/></td><td><select aria-label={'Status for '+t.step} value={t.status||'Not started'} onChange={e=>update(t.id,'status',e.target.value)}>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></td><td><input aria-label={'Due date for '+t.step} type="date" value={t.plannedEnd||''} onChange={e=>update(t.id,'plannedEnd',e.target.value)}/></td><td><textarea aria-label={'Notes for '+t.step} rows="2" value={t.notes||''} onChange={e=>update(t.id,'notes',e.target.value)}/></td></tr>)}</tbody></table></div><p className="table-foot">New tasks are labelled “Added task”. {cloudConfigured?'Shared prototype: edits sync to the database, but simultaneous edits may conflict; keep JSON backups.':'Changes save locally in this browser only; export a JSON backup regularly.'}</p></section>}
   {showAdd&&<div className="modal-backdrop" onClick={()=>setShowAdd(false)}><section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="add-title" onClick={e=>e.stopPropagation()}><div className="modal-heading"><h2 id="add-title">+ Add Task</h2><button className="outline" onClick={()=>setShowAdd(false)} aria-label="Close">✕</button></div><p className="subhead">New tasks will appear in Tasks, Roadmap and Overview without changing the workbook baseline.</p><form onSubmit={addTask} className="task-form"><label>Task name *<input required value={draft.step} onChange={e=>setDraft({...draft,step:e.target.value})} placeholder="e.g. Review demo task"/></label><label>Phase *<select required value={draft.phase} onChange={e=>setDraft({...draft,phase:e.target.value})}>{[...new Set(initial.filter(t=>t.type==='Task').map(t=>t.phase))].map(x=><option key={x}>{x}</option>)}</select></label><label>Place after related task<select value={draft.relatedTaskId||''} onChange={e=>setDraft({...draft,relatedTaskId:e.target.value})}><option value="">End of selected phase</option>{tasks.filter(t=>t.phase===draft.phase&&(t.type==='Task'||t.type==='Milestone')).map(t=><option key={t.id} value={t.id}>{t.step}</option>)}</select></label><label>Owner *<input required value={draft.owner} onChange={e=>setDraft({...draft,owner:e.target.value})}/></label><label>Reviewer / approver<input value={draft.reviewer} onChange={e=>setDraft({...draft,reviewer:e.target.value})}/></label><label>Status<select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value})}>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></label><label>Roadmap timing (auto-calculated)<input readOnly value={roadmapTimingFromDates(draft.plannedStart,draft.plannedEnd)} placeholder="Choose planned dates"/></label><label>Planned start<input type="date" value={draft.plannedStart} onChange={e=>setDraft({...draft,plannedStart:e.target.value})}/></label><label>Planned end<input type="date" min={draft.plannedStart||undefined} value={draft.plannedEnd} onChange={e=>setDraft({...draft,plannedEnd:e.target.value})}/></label><label className="wide">Notes<textarea rows="3" value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></label><div className="form-actions"><button type="button" className="outline" onClick={()=>setShowAdd(false)}>Cancel</button><button className="primary" type="submit">Save new task</button></div></form></section></div>}
   {(page==='Roadmap')&&<section className="panel full-table"><div className="section-head"><div><h2>{page==='Roadmap'?'Roadmap & Gantt':'Task Register'}</h2><p className="subhead">Workbook source of truth · {taskRows.length} steps · 26 weekly columns</p></div><div className="table-actions"><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{statusOptions.map(s=><option key={s}>{s}</option>)}</select><button className="outline" onClick={exportJSON}><Download size={14}/> Export JSON</button><button className="outline" onClick={reset}><RotateCcw size={14}/> Reset</button></div></div><div className="legend">{sourceData.legend.filter(x=>x.label).map((x,i)=><span key={i}><i className={`legend-swatch sw${i}`}/>{x.label}</span>)}<span className="legend-note">Red end date = past due and not done.</span></div><div className="table-wrap"><table className="roadmap"><thead><tr>{sourceData.columns.map((c,i)=><th key={i} className={i<10?'sticky-col':''}>{c}</th>)}{sourceData.weeks.map((w,i)=><th className="weekhead" key={i}><b>{w.key}</b><small>{short(w.date)}</small></th>)}</tr></thead><tbody>{filtered.map(t=>{const phaseRow=t.type==='Phase';return <tr key={t.id} className={phaseRow?'phase-row':''}>{[t.phase,t.step,t.type,t.owner,t.roadmapTiming,t.plannedStart,t.plannedEnd,t.workDays,t.status,t.notes].map((val,i)=><td key={i} className={i===0?'phase-cell':i===9?'notes-cell':i===6&&t.status!=='Done'&&t.plannedEnd&&t.plannedEnd<now?'late-date':''}>{i===5||i===6? <input aria-label={`${t.step||t.phase} ${sourceData.columns[i]}`} type="date" value={val||''} onChange={e=>update(t.id,i===5?'plannedStart':'plannedEnd',e.target.value)}/>:i===3?<input aria-label="Owner" value={val||''} onChange={e=>update(t.id,'owner',e.target.value)}/>:i===8&& !phaseRow?<select className={`status-select ${String(val||'').toLowerCase().replaceAll(' ','-')}`} value={val||'Not started'} onChange={e=>update(t.id,'status',e.target.value)}>{statusOptions.map(s=><option key={s}>{s}</option>)}</select>:i===9?<textarea aria-label="Notes" rows="2" value={val||''} onChange={e=>update(t.id,'notes',e.target.value)}/>:i===4?<input aria-label="Roadmap timing" value={val||''} onChange={e=>update(t.id,'roadmapTiming',e.target.value)}/>:i===7?<span>{val??<span className='unconfirmed' title='Blank in source workbook'>Blank in workbook</span>}</span>:<span>{val??<span className='unconfirmed' title='Blank in source workbook'>Blank in workbook</span>}</span>}</td>)}{sourceData.weeks.map((w,i)=><td className="weekcell" key={i}><span className={t.weeks?.[i]?.fill?'weekbar':''} title={`${w.key} ${w.date}`}>{t.weeks?.[i]?.value||''}</span></td>)}</tr>})}</tbody></table></div><p className="table-foot">{cloudConfigured?'Edits sync to the shared database. Export JSON before major changes.':'Edits save automatically in this browser. Export JSON to keep a portable copy.'} Weekly columns retain the workbook's source values and are not recalculated when dates change.</p><div className="source-notes"><h3>Notes and points to confirm</h3><ul>{sourceData.notesAndPointsToConfirm.filter(x=>x.text&&x.text.startsWith('•')).map((x,i)=><li key={i}>{x.text}</li>)}</ul></div></section>}
   {!(page==='Overview'||page==='Roadmap'||page==='Tasks')&&<section className="panel placeholder"><div className="stat-icon lavender"><LayoutGrid/></div><h2>{page}</h2><p>This navigation section is scaffolded for future expansion. The live task data and editable roadmap are available in Roadmap and Tasks.</p><button className="primary" onClick={()=>navTo('Roadmap')}>Open Roadmap</button></section>}
   <footer>Demo Organisation · Sample Project <span>Fictional data only</span></footer>
  </main>
  {toast&&<div className="toast">{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
