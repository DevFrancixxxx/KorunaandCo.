import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Home, CheckSquare, CalendarDays, Users, GraduationCap, FileText, BarChart3, Settings, Search, Bell, ChevronRight, ChevronLeft, AlertTriangle, Flag, Circle, CheckCircle2, Clock3, LayoutGrid, List, Menu, Download, RotateCcw, Save, X, ClipboardList } from 'lucide-react';
import bundledData from './data.json';
import './style.css';
import './edit-access.css';
import './overview.css';
import { cloudConfigured, readCloudSnapshot, readCurrentUserRole, writeCloudSnapshot } from './cloud.js';
import { AuthLoading, Login } from './components/Login.jsx';
import { Register } from './components/Register.jsx';
import { ForgotPassword, ResetPassword } from './components/PasswordRecovery.jsx';
import { AccountMenu } from './components/AccountMenu.jsx';
import { SaveProgressModal } from './components/SaveProgressModal.jsx';
import { AddTaskModal } from './components/AddTaskModal.jsx';
import { TaskCreatedModal } from './components/TaskCreatedModal.jsx';
import { clearEmailConfirmationReturn, clearPasswordRecoveryReturn, demoCredentials, getCurrentSession, getInitialSession, isEmailConfirmationReturn, isPasswordRecoveryReturn, registerAccount, requestPasswordReset, resetPassword, signIn, signOut, verifyRegistrationCode, watchAuthState } from './services/auth.js';

const nav = [
 ['Overview',Home],['Roadmap',CheckSquare],['Tasks',ClipboardList],['Calendar',CalendarDays],
 ['Team',Users],['AI Academy',GraduationCap],['Documents',FileText],['Reports',BarChart3],['Settings',Settings]
];
const pageStorageKey='kc-dashboard-page';
const statusOptions = ['Awaiting review','Not started','In progress','Done','At risk','To confirm'];
const fmt = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : '—';
const short = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—';
const daysBetween = (a,b) => Math.ceil((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/86400000);
const todayISO = new Date().toLocaleDateString('en-CA'); // Actual local reporting date.
const initial = [];
const { rows: ignoredRows, ...initialRoadmap } = bundledData;
function normalizeRoadmap(remote={}){
 const legend=Array.isArray(remote.legend)?remote.legend.map(item=>typeof item==='string'?{label:item}:item):initialRoadmap.legend;
 return {...initialRoadmap,...remote,project:{...initialRoadmap.project,...remote.project},legend};
}
function hydrateRoadmapRows(rows,weeks){
 return normalizeAddedTiming(rows).map(row=>({
  ...row,
  weeks:Array.isArray(row.weeks)&&row.weeks.length?row.weeks:weeks.map(week=>{
   const weekEnd=new Date(week.date+'T12:00:00');weekEnd.setDate(weekEnd.getDate()+6);
   const weekEndIso=weekEnd.toLocaleDateString('en-CA');
   return {week:week.key,date:week.date,value:null,fill:row.plannedStart&&row.plannedEnd&&row.plannedStart<=weekEndIso&&row.plannedEnd>=week.date?'planned':null};
  })
 }));
}
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
 const [createdTaskName,setCreatedTaskName]=useState('');
 const [userRole,setUserRole]=useState(cloudConfigured?'checking':'local');
 const cloudVersionRef=React.useRef(0);
 const lastSavedRef=React.useRef(null);
 const remoteDirtyRef=React.useRef(false);
 const loadCloud=async()=>{
  if(remoteDirtyRef.current&&!confirm('You have unsaved changes. Export a JSON backup first. Discard them and reload shared data?'))return;
  try {
   const result=await readCloudSnapshot();
   const remoteRoadmap=normalizeRoadmap(result.roadmap);
   const visibleRows=Array.isArray(result.rows)&&result.rows.length?hydrateRoadmapRows(result.rows,remoteRoadmap.weeks):initial;
   cloudVersionRef.current=result.version;
   setCloudVersion(result.version);
   lastSavedRef.current=JSON.stringify({rows:result.rows||[],roadmap:result.roadmap||{}});
   remoteDirtyRef.current=false;
   setSaveBlocked(false);
   setSharedAccess(true);
   setTasks(visibleRows);
   setRoadmap(remoteRoadmap);
   setCloudMessage(result.rows?.length?'Shared data loaded':'Shared database empty — showing bundled dashboard content');
   setCloudReady(true);
  }catch{
   lastSavedRef.current=JSON.stringify(initial);
   remoteDirtyRef.current=false;
   setSaveBlocked(false);
   setSharedAccess(false);
   setTasks(initial);
   setRoadmap(initialRoadmap);
   setCloudMessage('Showing dashboard content · shared access pending');
   setCloudReady(true);
  }
 };
 useEffect(()=>{
  if(!cloudConfigured)return;
  let active=true;
  const confirmationReturn=isEmailConfirmationReturn();
  const passwordRecoveryReturn=isPasswordRecoveryReturn();
  const initializeAuth=async()=>{
   try{
    const next=await getCurrentSession();
    if(confirmationReturn){
     if(next)await signOut();
     if(!active)return;
     clearEmailConfirmationReturn();
     setSession(null);
     setAuthView('login');
    }else if(passwordRecoveryReturn&&next){
     if(!active)return;
     setSession(next);
     setAuthView('reset-password');
    }else if(active)setSession(next);
   }catch(error){if(active)setCloudMessage(error.message)}
   finally{if(active)setAuthReady(true)}
  };
  initializeAuth();
  const stopWatching=watchAuthState((next,event)=>{
   if(!active)return;
   setSession(next);
   if(event==='PASSWORD_RECOVERY')setAuthView('reset-password');
   if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED'){
    setCloudReady(false);
    setSharedAccess(false);
   }
  });
  return ()=>{active=false;stopWatching()};
 },[]);
 useEffect(()=>{if(cloudConfigured&&session)loadCloud()},[session?.user?.id]);
 useEffect(()=>{
  if(!cloudConfigured){setUserRole('local');return;}
  if(!session?.user?.id){setUserRole('checking');return;}
  let active=true;
  readCurrentUserRole(session.user.id).then(role=>{if(active)setUserRole(role)}).catch(()=>{if(active)setUserRole('pending')});
  return ()=>{active=false};
 },[session?.user?.id]);

 const handleLogin=async(email,password)=>setSession(await signIn(email,password));
 const handlePasswordReset=async password=>{
  await resetPassword(password);
 };
 const completePasswordReset=async()=>{
  await signOut();
  clearPasswordRecoveryReturn();
  setSession(null);
  setAuthView('login');
 };
 const cancelPasswordReset=async()=>{
  await signOut();
  clearPasswordRecoveryReturn();
  setSession(null);
  setAuthView('login');
 };
 const handleSignOut=async()=>{
  await signOut();
  setSession(null);
  setAuthView('login');
 };

 const [tasks,setTasks] = useState(()=>{try{const saved=localStorage.getItem('kc-demo-tasks-v1');return saved?normalizeAddedTiming(JSON.parse(saved)):initial}catch{return initial}});
 const [roadmap,setRoadmap] = useState(()=>{try{const saved=localStorage.getItem('kc-demo-roadmap-v1');return saved?normalizeRoadmap(JSON.parse(saved)):initialRoadmap}catch{return initialRoadmap}});
 const sourceData={...roadmap,milestones:tasks.filter(t=>t.type==='Milestone').map(t=>({title:t.step,date:t.plannedEnd}))};
 const [page,setPage] = useState(()=>{const saved=localStorage.getItem(pageStorageKey);return nav.some(([label])=>label===saved)?saved:'Overview'});
 const [showAdd,setShowAdd] = useState(false);
 const [query,setQuery] = useState('');
 const [filter,setFilter] = useState('All');
 const [view,setView] = useState('Gantt');
 const [timelineDate,setTimelineDate] = useState(projectWeekStart);
 const [menu,setMenu] = useState(false);
 const [toast,setToast] = useState('');
 const [now] = useState(todayISO);
 const [scheduleDate,setScheduleDate] = useState(todayISO);
 const [scheduleView,setScheduleView] = useState('Week');
 useEffect(()=>{const guard=e=>{if(remoteDirtyRef.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[]);
 useEffect(()=>{if(!cloudConfigured)localStorage.setItem('kc-demo-tasks-v1',JSON.stringify(tasks));},[tasks]);
 useEffect(()=>{if(!cloudConfigured)localStorage.setItem('kc-demo-roadmap-v1',JSON.stringify(roadmap));},[roadmap]);
 useEffect(()=>localStorage.setItem(pageStorageKey,page),[page]);
 useEffect(()=>{
  if(!cloudConfigured||!cloudReady||!sharedAccess||!session)return;
   const serialized=JSON.stringify({rows:tasks,roadmap});
  remoteDirtyRef.current=serialized!==lastSavedRef.current;
  if(!remoteDirtyRef.current||cloudSaving||saveBlocked)return;
  const timer=setTimeout(async()=>{
   setCloudSaving(true);
   const previousRows=JSON.parse(lastSavedRef.current||'{"rows":[]}').rows||[];
   const createdTask=tasks.find(task=>task.origin==='Added in dashboard'&&!previousRows.some(previous=>previous.id===task.id));
   try{
    const nextVersion=await writeCloudSnapshot(tasks,roadmap,cloudVersionRef.current);
    cloudVersionRef.current=nextVersion;setCloudVersion(nextVersion);lastSavedRef.current=serialized;
    setCloudMessage('Saved to shared database');
    setToast('');
    if(createdTask)setCreatedTaskName(createdTask.step);
   }catch(e){setSaveBlocked(true);setCloudMessage('SAVE FAILED: '+e.message+' — export a JSON backup before reloading');}
   finally{setCloudSaving(false)}
  },400);
  return ()=>clearTimeout(timer);
 },[tasks,roadmap,cloudReady,sharedAccess,cloudSaving,saveBlocked,session?.user?.id]);

 const actionable = tasks.filter(t=>t.type==='Task'||t.type==='Milestone');
 const taskRows = tasks.filter(t=>t.type==='Task'||t.type==='Milestone');
 const done = taskRows.filter(t=>t.status==='Done').length;
 const inProgress = taskRows.filter(t=>t.status==='In progress').length;
 const atRisk = taskRows.filter(t=>t.status==='At risk').length;
 const progress = taskRows.length?Math.round(done/taskRows.length*100):0;
 const target = roadmap.project?.targetCompletion;
 const remaining = Math.max(0,daysBetween(now,target));
 const addTaskFromModal=draft=>{const id='added-'+(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now());const row={...draft,id,type:'Task',origin:'Added in dashboard',sourceRow:null,roadmapTiming:roadmapTimingFromDates(draft.plannedStart,draft.plannedEnd),workDays:draft.plannedStart&&draft.plannedEnd?Math.max(1,daysBetween(draft.plannedStart,draft.plannedEnd)+1):null,weeks:sourceData.weeks.map(week=>({week:week.key,date:week.date,value:null,fill:draft.plannedStart&&draft.plannedEnd&&draft.plannedStart<=new Date(new Date(week.date+'T12:00:00').getTime()+6*86400000).toLocaleDateString('en-CA')&&draft.plannedEnd>=week.date?'planned':null}))};setTasks(old=>[...old,row]);setShowAdd(false);setPage('Tasks');setToast(cloudConfigured?'Task added. Saving to Supabase…':'Task added and saved in this browser');};
 const importJSON=(e)=>{const file=e.target.files?.[0];if(!file)return;file.text().then(raw=>{try{const data=JSON.parse(raw);if(!Array.isArray(data.rows)||!data.rows.every(r=>r&&typeof r.id==='string'&&typeof r.type==='string'))throw Error('Not a compatible dashboard backup');if(!confirm(`Restore ${data.rows.length} rows from this backup? This replaces the current project data, including shared data in cloud mode. Export your current backup first.`))return;setTasks(normalizeAddedTiming(data.rows));setToast('Backup imported successfully');}catch(err){setToast('Import failed: '+err.message);}finally{e.target.value='';}});};
 const update=(id,key,value)=>setTasks(old=>old.map(t=>{
 if(t.id!==id)return t;
 const changed={...t,[key]:value};
  if(key==='plannedStart'||key==='plannedEnd'){
   if(changed.plannedStart&&changed.plannedEnd&&changed.plannedEnd<changed.plannedStart){
    setToast('End date cannot be before start date');
    return t;
   }
   changed.roadmapTiming=roadmapTimingFromDates(changed.plannedStart,changed.plannedEnd);
   changed.workDays=changed.plannedStart&&changed.plannedEnd&&changed.plannedEnd>=changed.plannedStart?daysBetween(changed.plannedStart,changed.plannedEnd)+1:null;
   changed.weeks=sourceData.weeks.map(week=>{
    const weekEnd=new Date(week.date+'T12:00:00');weekEnd.setDate(weekEnd.getDate()+6);
    const weekEndIso=weekEnd.toLocaleDateString('en-CA');
    return {week:week.key,date:week.date,value:null,fill:changed.plannedStart&&changed.plannedEnd&&changed.plannedStart<=weekEndIso&&changed.plannedEnd>=week.date?'planned':null};
   });
  }
  return changed;
 }));
 const refreshRoadmap=()=>{
  if(cloudConfigured){loadCloud();return;}
  try{
   const savedTasks=localStorage.getItem('kc-demo-tasks-v1');
   const savedRoadmap=localStorage.getItem('kc-demo-roadmap-v1');
   setTasks(savedTasks?normalizeAddedTiming(JSON.parse(savedTasks)):initial);
   setRoadmap(savedRoadmap?normalizeRoadmap(JSON.parse(savedRoadmap)):initialRoadmap);
   setToast('Roadmap refreshed');
  }catch{setToast('Could not refresh the saved roadmap data');}
 };
 const exportJSON=()=>{const blob=new Blob([JSON.stringify({...sourceData,rows:tasks},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kc-roadmap-data-backup.json';a.click();URL.revokeObjectURL(a.href);};
 const filtered=useMemo(()=>orderTasks(tasks).filter(t=>`${t.phase} ${t.step||''} ${t.owner||''} ${t.status||''} ${t.notes||''}`.toLowerCase().includes(query.toLowerCase()) && (filter==='All'||t.status===filter)),[tasks,query,filter]);
 const phases = tasks.filter(t=>t.type==='Phase').map((phase,index)=>({name:phase.phase,label:String(index+1).padStart(2,'0'),start:phase.plannedStart,end:phase.plannedEnd}));
 const timeline = useMemo(()=>{
  const toDate=value=>new Date(value+'T12:00:00');
  const toISO=value=>value.toLocaleDateString('en-CA');
  const addDays=(value,days)=>{const next=toDate(value);next.setDate(next.getDate()+days);return toISO(next)};
  const monthName=value=>toDate(value).toLocaleDateString('en-GB',{month:'short',year:'numeric'});
  const dayName=value=>toDate(value).toLocaleDateString('en-GB',{weekday:'short',day:'numeric'});
  if(view==='Gantt'){
   const start=sourceData.weeks[0]?.date||projectWeekStart;
   const end=sourceData.weeks.at(-1)?.date||target;
   const labels=[];
   sourceData.weeks.forEach(week=>{const label=monthName(week.date);if(!labels.some(item=>item.label===label))labels.push({label,date:week.date});});
   return {start,end,labels,title:`${monthName(start)} – ${monthName(end)}`,stepDays:7};
  }
  if(view==='Month'){
   const startDate=toDate(timelineDate);startDate.setDate(1);
   const start=toISO(startDate);
   const endDate=new Date(startDate);endDate.setMonth(endDate.getMonth()+1);endDate.setDate(0);
   const end=toISO(endDate);
   const labels=[];
   for(let date=start;date<=end;date=addDays(date,7))labels.push({label:toDate(date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}),date});
   return {start,end,labels,title:monthName(start),stepDays:30};
  }
  const anchor=toDate(timelineDate);anchor.setDate(anchor.getDate()-(anchor.getDay()+6)%7);
  const start=toISO(anchor);
  const end=addDays(start,6);
  return {start,end,labels:Array.from({length:7},(_,index)=>{const date=addDays(start,index);return {label:dayName(date),date};}),title:`${fmt(start)} – ${fmt(end)}`,stepDays:7};
 },[view,timelineDate,sourceData.weeks,target]);
 const visibleTimelinePhases=phases.filter(phase=>phase.start&&phase.end&&phase.start<=timeline.end&&phase.end>=timeline.start);
 const shiftTimeline=direction=>{
  const anchor=new Date(timelineDate+'T12:00:00');
  anchor.setDate(anchor.getDate()+direction*(view==='Month'?30:view==='Week'?7:56));
  setTimelineDate(anchor.toLocaleDateString('en-CA'));
 };
 const timelineBarStyle=phase=>{
  const total=Math.max(1,daysBetween(timeline.start,timeline.end)+1);
  const start=Math.max(0,daysBetween(timeline.start,phase.start));
  const end=Math.min(total,daysBetween(timeline.start,phase.end)+1);
  return {left:`${start/total*100}%`,width:`${Math.max(2,(end-start)/total*100)}%`};
 };
 const phasePct = name => {const a=taskRows.filter(t=>t.phase===name);return a.length?Math.round(a.filter(t=>t.status==='Done').length/a.length*100):0};
 const attention=taskRows.filter(t=>t.status==='At risk'||(t.status!=='Done'&&t.plannedEnd&&t.plannedEnd<now));
 const weekStart = new Date(now+'T12:00:00'); weekStart.setDate(weekStart.getDate() - (weekStart.getDay()+6)%7); const monday=weekStart.toLocaleDateString('en-CA'); const friday=new Date(weekStart.getTime()+4*86400000).toLocaleDateString('en-CA');
 const weekTasks=taskRows.filter(t=>t.plannedStart&&t.plannedEnd&&t.plannedStart<=friday&&t.plannedEnd>=monday&&t.status!=='Done').slice(0,7);
 const scheduleStart=new Date(scheduleDate+'T12:00:00');
 scheduleStart.setDate(scheduleStart.getDate()-(scheduleStart.getDay()+6)%7);
 const scheduleDays=Array.from({length:scheduleView==='Day'?1:5},(_,index)=>{
  const date=new Date((scheduleView==='Day'?new Date(scheduleDate+'T12:00:00'):scheduleStart).getTime()+index*86400000);
  return {date:date.toLocaleDateString('en-CA'),label:date.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})};
 });
 const scheduleTitle=scheduleView==='Day'?fmt(scheduleDate):`${short(scheduleDays[0].date)} – ${fmt(scheduleDays.at(-1).date)}`;
 const shiftSchedule=direction=>{
  const next=new Date(scheduleDate+'T12:00:00');
  next.setDate(next.getDate()+direction*(scheduleView==='Day'?1:7));
  setScheduleDate(next.toLocaleDateString('en-CA'));
 };
 const allMilestones=tasks.filter(t=>t.type==='Milestone');
 const navTo=p=>{setPage(p);setMenu(false)};
 if(!authReady)return <AuthLoading message="Checking secure session…"/>;
 if(authView==='reset-password')return <ResetPassword onResetPassword={handlePasswordReset} onComplete={completePasswordReset} onBackToLogin={cancelPasswordReset}/>;
 if(!session&&authView==='register')return <Register cloudMode={cloudConfigured} onRegister={registerAccount} onVerifyCode={verifyRegistrationCode} onBackToLogin={()=>setAuthView('login')}/>;
 if(!session&&authView==='forgot-password')return <ForgotPassword cloudMode={cloudConfigured} onRequestReset={requestPasswordReset} onBackToLogin={()=>setAuthView('login')}/>;
 if(!session)return <Login cloudMode={cloudConfigured} demoCredentials={demoCredentials} onSignIn={handleLogin} onRegister={()=>setAuthView('register')} onForgotPassword={()=>setAuthView('forgot-password')}/>;
 return <div className="app">
  <aside className={`sidebar ${menu?'open':''}`}>
   <div className="brand"><div className="monogram">DEMO</div><div className="brandname">KORUNA &amp; CO</div></div>
   <div className="nav">{nav.map(([label,Icon])=><button key={label} className={page===label?'active':''} onClick={()=>navTo(label)}><Icon size={17}/><span>{label}</span></button>)}</div>
   <div className="sidebar-foot"><div>AI Workforce<br/>Transformation</div><ChevronRight size={18}/></div>
  </aside>
  <main className="main">
   {showAdd&&<AddTaskModal phases={tasks.filter(task=>task.type==='Phase')} onClose={()=>setShowAdd(false)} onAdd={addTaskFromModal}/>}
   {createdTaskName&&<TaskCreatedModal taskName={createdTaskName} onClose={()=>setCreatedTaskName('')}/>}
   {cloudSaving&&<SaveProgressModal/>}
   {cloudConfigured&&<div className={`edit-access ${userRole==='admin'||userRole==='editor'?'can-edit':'read-only'}`}><span>{userRole==='checking'?'Checking access…':userRole==='admin'||userRole==='editor'?'Editing enabled':'Read-only access'}</span><small>{userRole==='checking'?'':userRole==='admin'||userRole==='editor'?`Role: ${userRole}`:'Ask an admin to assign the editor role to save changes.'}</small></div>}
   <header className="topbar"><button className="mobile-menu" onClick={()=>setMenu(!menu)}><Menu/></button><div><h1>{page==='Overview'?'Project Roadmap':page}</h1><p>{roadmap.project?.project||'Project roadmap'}</p></div><div className="top-actions"><div className="search"><Search size={16}/><input placeholder="Search tasks, people or documents..." value={query} onChange={e=>setQuery(e.target.value)}/></div><button className="iconbutton" title="Notifications"><Bell size={18}/><i/></button><AccountMenu session={session} onSignOut={handleSignOut}/></div></header>
   <div className={`cloud-banner ${cloudConfigured&&!sharedAccess?'cloud-fallback':''}`}><span>{cloudConfigured?(sharedAccess?`☁ Shared prototype · version ${cloudVersion} · ${cloudSaving?'Saving…':cloudMessage}`:`◌ ${cloudMessage}`):`Local demo session · ${session.user.email}`}</span><div>{cloudConfigured&&<button className="outline" onClick={loadCloud} disabled={cloudSaving}>Reload shared data</button>}</div></div>
   {page==='Overview'&&<div className="overview"><div className="stats">
    <div className="stat"><div className="ring" style={{'--pct':progress}}><span>{progress}%</span></div><div><b>{progress}%</b><small>Overall progress</small><em className="green">↑ Calculated from tasks</em></div></div>
    <div className="stat"><div className="stat-icon lavender"><List/></div><div><b>{taskRows.filter(t=>t.status==='In progress'||t.status==='Not started').length}</b><small>Active tasks</small><em>{inProgress} in progress</em></div></div>
    <div className="stat"><div className="stat-icon rose"><AlertTriangle/></div><div><b>{atRisk}</b><small>At risk</small><em>{attention.length} need attention (incl. overdue)</em></div></div>
    <div className="stat"><div className="stat-icon lavender"><CalendarDays/></div><div><b>{fmt(target)}</b><small>Target completion</small><em>{remaining} days remaining</em></div></div>
   </div>
   <section className="panel phase-panel"><div className="section-head"><h2>Project Phases</h2><button className="textbutton" onClick={()=>navTo('Roadmap')}>View all phases <ChevronRight size={14}/></button></div><div className="phases">{phases.map(p=><div className="phase" key={p.label}><div className="phase-title"><span className={'phase-number n'+p.label}>{p.label}</span><div><b>{p.name==='Build The Product'?'Build Product':p.name==='Find The Next Niche'?'Find Next Niche':p.name}</b><small>{short(p.start)} – {short(p.end)}</small></div></div><div className="progress-line"><span style={{width:phasePct(p.name)+'%'}}/></div><div className="pct">{phasePct(p.name)}%</div></div>)}</div></section>
   <section className="panel gantt-panel"><div className="section-head"><div className="tabs" role="tablist" aria-label="Roadmap timeline view">{['Gantt','Month','Week'].map(v=><button key={v} role="tab" aria-selected={view===v} className={view===v?'selected':''} onClick={()=>setView(v)}>{v}</button>)}</div><div className="timeline-controls"><button className="timeline-arrow" aria-label={`Previous ${view.toLowerCase()}`} onClick={()=>shiftTimeline(-1)}><ChevronLeft size={14}/></button><span className="range">{timeline.title}</span><button className="timeline-arrow" aria-label={`Next ${view.toLowerCase()}`} onClick={()=>shiftTimeline(1)}><ChevronRight size={14}/></button></div><button className="textbutton" onClick={()=>navTo('Roadmap')}>Open full roadmap <ChevronRight size={14}/></button></div><div className="mini-gantt" style={{'--timeline-columns':timeline.labels.length}}><div className="gantt-labels">{visibleTimelinePhases.map(p=><div key={p.label}><span className={'tiny-num n'+p.label}>{p.label}</span>{p.name==='Build The Product'?'Build Product':p.name==='Find The Next Niche'?'Find Next Niche':p.name}</div>)}</div><div className="gantt-grid"><div className="months">{timeline.labels.map(item=><span key={item.date}>{item.label}</span>)}</div>{visibleTimelinePhases.map(p=><div className="gantt-row" key={p.label}><span className={'bar n'+p.label} style={timelineBarStyle(p)} title={`${p.name}: ${fmt(p.start)} – ${fmt(p.end)}`}/></div>)}{!visibleTimelinePhases.length&&<div className="timeline-empty">No phases are scheduled in this period.</div>}</div></div></section>
   <div className="lower-grid"><section className="panel"><div className="section-head"><h2>This Week</h2><small>{short(monday)} – {fmt(friday)}</small><button className="textbutton" onClick={()=>navTo('Tasks')}>View all <ChevronRight size={14}/></button></div>{weekTasks.length?weekTasks.map(t=><div className="listrow" key={t.id}><span className={`status-dot ${t.status==='Done'?'done':t.status==='In progress'?'progress':''}`}>{t.status==='Done'?<CheckCircle2 size={13}/>:t.status==='In progress'?<Clock3 size={13}/>:<Circle size={13}/>}</span><span className="listname">{t.step}</span><small>{t.owner||'TBC'}</small><time>{short(t.plannedEnd)}</time></div>):<p className="empty">No unfinished tasks scheduled for this week.</p>}</section>
   <section className="panel"><div className="section-head"><h2>Needs Attention</h2><span className="count">{attention.length}</span><button className="textbutton" onClick={()=>navTo('Tasks')}>View all <ChevronRight size={14}/></button></div>{attention.slice(0,5).map(t=><div className="attention-row" key={t.id}><AlertTriangle size={16}/><span>{t.step}</span><small>{t.owner||'TBC'}</small><time className={t.plannedEnd<now?'late':''}>{short(t.plannedEnd)}</time></div>)}{!attention.length&&<p className="empty">No at-risk or overdue tasks.</p>}</section>
   <section className="panel"><div className="section-head"><h2>Upcoming Milestones</h2><button className="textbutton" onClick={()=>navTo('Roadmap')}>View all <ChevronRight size={14}/></button></div>{[...sourceData.milestones].map(m=><div className="milestone-row" key={m.title}><Flag size={15}/><span>{m.title}</span><time>{short(m.date)}</time></div>)}</section></div>
   <section className="panel schedule"><div className="section-head"><h2>{scheduleTitle}</h2><div className="arrow-group"><button aria-label={`Previous ${scheduleView.toLowerCase()}`} onClick={()=>shiftSchedule(-1)}><ChevronLeft size={15}/></button><button aria-label={`Next ${scheduleView.toLowerCase()}`} onClick={()=>shiftSchedule(1)}><ChevronRight size={15}/></button></div><span className="grow"/><button className="outline" onClick={()=>setScheduleDate(todayISO)}>Today</button><select aria-label="Schedule view" value={scheduleView} onChange={event=>setScheduleView(event.target.value)}><option value="Week">Week view</option><option value="Day">Day view</option></select></div><div className="calendar-grid" style={{'--schedule-columns':scheduleDays.length}}>{scheduleDays.map(day=>{const dayTasks=tasks.filter(task=>task.type==='Task'&&task.plannedStart<=day.date&&task.plannedEnd>=day.date&&task.status!=='Done').slice(0,4);return <div className="day" key={day.date}><b>{day.label}</b>{['09:00','11:00','14:00','16:00'].map((time,index)=><div className="event" key={time}><small>{time}</small><span className="event-dot"/><span>{dayTasks[index]?.step||'—'}</span></div>)}</div>})}</div></section>
   </div>}
   {page==='Tasks'&&<section className="panel task-management"><div className="section-head"><div><h2>Task Management</h2><p className="subhead">Manage daily work and approvals · {taskRows.length} actionable steps ({taskRows.filter(t=>t.origin==='Added in dashboard').length} added)</p></div><div className="table-actions"><button className="outline" onClick={exportJSON}><Download size={14}/> Export JSON backup</button><label className="outline import-button">Import JSON backup<input type="file" accept=".json,.json_v2,application/json" onChange={importJSON} hidden/></label><button className="primary" onClick={()=>setShowAdd(true)}>+ Add Task</button></div></div><div className="task-summary"><span><b>{taskRows.filter(t=>t.status==='In progress').length}</b> In progress</span><span><b>{taskRows.filter(t=>t.status==='Awaiting review').length}</b> Awaiting review</span><span><b>{attention.length}</b> Need attention</span></div><div className="task-list-wrap"><table className="task-list"><thead><tr><th>Task</th><th>Phase</th><th>Owner</th><th>Reviewer</th><th>Status</th><th>Due date</th><th>Notes</th></tr></thead><tbody>{filtered.filter(t=>t.type==='Task'||t.type==='Milestone').map(t=><tr key={t.id}><td><strong>{t.step}</strong>{t.origin==='Added in dashboard'&&<small className="added-label">Added task</small>}</td><td>{t.phase}</td><td><input aria-label={'Owner for '+t.step} value={t.owner||''} onChange={e=>update(t.id,'owner',e.target.value)}/></td><td><input aria-label={'Reviewer for '+t.step} placeholder="—" value={t.reviewer||''} onChange={e=>update(t.id,'reviewer',e.target.value)}/></td><td><select aria-label={'Status for '+t.step} value={t.status||'Not started'} onChange={e=>update(t.id,'status',e.target.value)}>{statusOptions.map(x=><option key={x}>{x}</option>)}</select></td><td><input aria-label={'Due date for '+t.step} type="date" value={t.plannedEnd||''} onChange={e=>update(t.id,'plannedEnd',e.target.value)}/></td><td><textarea aria-label={'Notes for '+t.step} rows="2" value={t.notes||''} onChange={e=>update(t.id,'notes',e.target.value)}/></td></tr>)}</tbody></table></div><p className="table-foot">New tasks are labelled “Added task”. {cloudConfigured?'Shared prototype: edits sync to the database, but simultaneous edits may conflict; keep JSON backups.':'Changes save locally in this browser only; export a JSON backup regularly.'}</p></section>}
   {(page==='Roadmap')&&<section className="panel full-table roadmap-page"><div className="section-head"><div><h2>{page==='Roadmap'?'Roadmap & Gantt':'Task Register'}</h2><p className="subhead">Workbook source of truth · {taskRows.length} steps · 26 weekly columns</p></div><div className="table-actions"><select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option>{statusOptions.map(s=><option key={s}>{s}</option>)}</select><button className="outline" onClick={refreshRoadmap} disabled={cloudSaving}><RotateCcw size={14}/> Refresh</button></div></div><div className="legend">{sourceData.legend.filter(x=>x.label).map((x,i)=><span key={i}><i className={`legend-swatch sw${i}`}/>{x.label}</span>)}<span className="legend-note">Red end date = past due and not done.</span></div><div className="table-wrap"><table className="roadmap"><thead><tr>{sourceData.columns.map((c,i)=><th key={i} className={i<10?'sticky-col':''}>{c}</th>)}{sourceData.weeks.map((w,i)=><th className="weekhead" key={i}><b>{w.key}</b><small>{short(w.date)}</small></th>)}</tr></thead><tbody>{filtered.map(t=>{const phaseRow=t.type==='Phase';return <tr key={t.id} className={phaseRow?'phase-row':''}>{[t.phase,t.step,t.type,t.owner,t.roadmapTiming,t.plannedStart,t.plannedEnd,t.workDays,t.status,t.notes].map((val,i)=><td key={i} className={i===0?'phase-cell':i===9?'notes-cell':i===6&&t.status!=='Done'&&t.plannedEnd&&t.plannedEnd<now?'late-date':''}>{i===5||i===6? <input aria-label={`${t.step||t.phase} ${sourceData.columns[i]}`} type="date" value={val||''} onChange={e=>update(t.id,i===5?'plannedStart':'plannedEnd',e.target.value)}/>:i===3?<input aria-label="Owner" value={val||''} onChange={e=>update(t.id,'owner',e.target.value)}/>:i===8&& !phaseRow?<select className={`status-select ${String(val||'').toLowerCase().replaceAll(' ','-')}`} value={val||'Not started'} onChange={e=>update(t.id,'status',e.target.value)}>{statusOptions.map(s=><option key={s}>{s}</option>)}</select>:i===9?<textarea aria-label="Notes" rows="2" value={val||''} onChange={e=>update(t.id,'notes',e.target.value)}/>:i===4?<input aria-label="Roadmap timing" value={val||''} onChange={e=>update(t.id,'roadmapTiming',e.target.value)}/>:i===7?<span>{val??<span className='unconfirmed' title='Blank in source workbook'>Blank in workbook</span>}</span>:<span>{val??<span className='unconfirmed' title='Blank in source workbook'>Blank in workbook</span>}</span>}</td>)}{sourceData.weeks.map((w,i)=><td className="weekcell" key={i}><span className={t.weeks?.[i]?.fill?'weekbar':''} title={`${w.key} ${w.date}`}>{t.weeks?.[i]?.value||''}</span></td>)}</tr>})}</tbody></table></div><p className="table-foot">{cloudConfigured?'Edits sync to the shared database. Refresh to retrieve the latest saved version.':'Edits save automatically in this browser. Refresh restores the latest browser-saved version.'} Weekly columns retain the workbook's source values and are not recalculated when dates change.</p><div className="source-notes"><h3>Notes and points to confirm</h3><ul>{sourceData.notesAndPointsToConfirm.filter(x=>x.text&&x.text.startsWith('•')).map((x,i)=><li key={i}>{x.text}</li>)}</ul></div></section>}
   {!(page==='Overview'||page==='Roadmap'||page==='Tasks')&&<section className="panel placeholder"><div className="stat-icon lavender"><LayoutGrid/></div><h2>{page}</h2><p>This navigation section is scaffolded for future expansion. The live task data and editable roadmap are available in Roadmap and Tasks.</p><button className="primary" onClick={()=>navTo('Roadmap')}>Open Roadmap</button></section>}
   <footer>Demo Organisation · Sample Project <span>Fictional data only</span></footer>
  </main>
  {toast&&<div className="toast">{toast}<button onClick={()=>setToast('')}><X size={14}/></button></div>}
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
