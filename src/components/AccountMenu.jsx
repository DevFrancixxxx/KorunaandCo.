import { useEffect, useRef, useState } from 'react';
import { LogOut, UserRound } from 'lucide-react';

export function AccountMenu({session,onSignOut}){
 const [open,setOpen]=useState(false);
 const [signingOut,setSigningOut]=useState(false);
 const menuRef=useRef(null);
 const email=session?.user?.email||'Signed in user';
 const fullName=session?.user?.user_metadata?.full_name||'Dashboard user';
 const initials=(fullName!=='Dashboard user'?fullName:email)
  .split(/[\s@._-]+/)
  .filter(Boolean)
  .slice(0,2)
  .map(part=>part[0])
  .join('')
  .toUpperCase();

 useEffect(()=>{
  const closeOnOutsideClick=event=>{
   if(menuRef.current&&!menuRef.current.contains(event.target))setOpen(false);
  };
  const closeOnEscape=event=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('pointerdown',closeOnOutsideClick);
  document.addEventListener('keydown',closeOnEscape);
  return ()=>{
   document.removeEventListener('pointerdown',closeOnOutsideClick);
   document.removeEventListener('keydown',closeOnEscape);
  };
 },[]);

 const logout=async()=>{
  setSigningOut(true);
  try{await onSignOut();}
  finally{setSigningOut(false);}
 };

 return <div className="account-menu" ref={menuRef}>
  <button className="avatar account-trigger" type="button" onClick={()=>setOpen(value=>!value)} aria-label="Open account menu" aria-expanded={open} aria-haspopup="menu">{initials||'U'}</button>
  {open&&<div className="account-popover" role="menu">
   <div className="account-summary"><span className="account-icon"><UserRound size={18}/></span><div><b>{fullName}</b><span>{email}</span></div></div>
   <button className="account-logout" type="button" role="menuitem" onClick={logout} disabled={signingOut}><LogOut size={16}/><span>{signingOut?'Signing out…':'Log out'}</span></button>
  </div>}
  {signingOut&&<div className="auth-loading-overlay" role="dialog" aria-modal="true" aria-labelledby="signing-out-title"><div className="auth-loading-modal"><span className="auth-spinner" aria-hidden="true"/><h3 id="signing-out-title">Signing you out</h3><p>Closing your session securely…</p></div></div>}
 </div>;
}
