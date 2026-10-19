import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronRight, Eye, EyeOff, LockKeyhole, LogIn, Mail } from 'lucide-react';

export function Login({cloudMode,demoCredentials,onSignIn,onRegister,onForgotPassword}){
 const [email,setEmail]=useState(cloudMode?'':demoCredentials.email);
 const [password,setPassword]=useState(cloudMode?'':demoCredentials.password);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [showPassword,setShowPassword]=useState(false);

 const submit=async event=>{
  event.preventDefault();
  setError('');
  setLoading(true);
  try{await onSignIn(email,password);}
  catch(signInError){setError(signInError.message||'Unable to sign in. Please try again.');}
  finally{setLoading(false);}
 };

 return <div className="login-page">
  <section className="login-intro"><div className="login-brand"><span className="login-mark">KC</span><span>KORUNA &amp; CO</span></div><div><span className="login-kicker">AI Workforce Transformation</span><h1>Turn ambitious plans into visible progress.</h1><p>Sign in to manage the shared roadmap, track delivery, and keep every workstream moving.</p></div><div className="login-proof"><span><CheckCircle2 size={16}/> One source of truth</span><span><LockKeyhole size={16}/> Controlled access</span></div></section>
  <section className="login-panel"><div className="login-card"><div className="login-heading"><span className="login-icon"><LogIn size={21}/></span><div><h2>Welcome back</h2><p>Enter your details to access the dashboard.</p></div></div><form className="login-form" onSubmit={submit}>
   <label htmlFor="login-email">Email address</label><div className="login-input"><Mail size={18}/><input id="login-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@company.com"/></div>
   <label htmlFor="login-password">Password</label><div className="login-input"><LockKeyhole size={18}/><input id="login-password" type={showPassword?'text':'password'} autoComplete="current-password" required minLength="8" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Enter your password"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
   {error&&<div className="login-error" role="alert"><AlertTriangle size={16}/><span>{error}</span></div>}
   <button className="login-submit" disabled={loading}>{loading?'Signing in…':<>Sign in <ChevronRight size={17}/></>}</button>
  </form><div className="auth-switch"><button type="button" onClick={onForgotPassword}>Forgot password?</button><span aria-hidden="true">·</span><span>Need an account?</span><button type="button" onClick={onRegister}>Create account</button></div>{!cloudMode&&<div className="demo-access"><b>Demo access</b><span>{demoCredentials.email}</span><span>{demoCredentials.password}</span></div>}<p className="login-note">{cloudMode?'Only approved Supabase accounts can access this workspace.':'Local prototype access. Do not use real company credentials.'}</p></div>
  </section>
  {loading&&<div className="auth-loading-overlay" role="dialog" aria-modal="true" aria-labelledby="signing-in-title"><div className="auth-loading-modal"><span className="auth-spinner" aria-hidden="true"/><h3 id="signing-in-title">Signing you in</h3><p>Preparing your dashboard…</p></div></div>}
 </div>;
}

export function AuthLoading({title,message,children}){
 return <div className="login-page"><div className="login-loading"><span className="login-mark">KC</span>{title&&<h2>{title}</h2>}<p>{message}</p>{children}</div></div>;
}
