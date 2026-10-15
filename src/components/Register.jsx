import { useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Eye, EyeOff, LockKeyhole, Mail, UserRound, UserPlus } from 'lucide-react';

export function Register({cloudMode,onRegister,onBackToLogin}){
 const [fullName,setFullName]=useState('');
 const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');
 const [confirmPassword,setConfirmPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(false);
 const [result,setResult]=useState(null);

 const submit=async event=>{
  event.preventDefault();
  setError('');
  if(password!==confirmPassword){setError('Passwords do not match.');return;}
  if(password.length<8){setError('Password must contain at least 8 characters.');return;}
  setLoading(true);
  try{setResult(await onRegister({fullName,email,password}));}
  catch(registrationError){setError(registrationError.message||'Unable to create your account.');}
  finally{setLoading(false);}
 };

 if(result)return <div className="login-page">
  <section className="login-intro"><div className="login-brand"><span className="login-mark">KC</span><span>KORUNA &amp; CO</span></div><div><span className="login-kicker">Account created</span><h1>One final step before you sign in.</h1><p>Your account has been created securely through Supabase Authentication.</p></div><div className="login-proof"><span><CheckCircle2 size={16}/> Email verification</span><span><LockKeyhole size={16}/> Admin-approved access</span></div></section>
  <section className="login-panel"><div className="login-card registration-success"><span className="success-icon"><CheckCircle2 size={28}/></span><h2>{result.confirmationRequired?'Check your email':'Registration complete'}</h2><p>{result.confirmationRequired?`We sent a confirmation link to ${result.email}. Confirm your email before signing in.`:`Your account for ${result.email} is ready.`}</p><div className="approval-note"><b>Dashboard approval required</b><span>An administrator must add your account to the project before shared data becomes available.</span></div><button className="login-submit" onClick={onBackToLogin}>Return to sign in <ChevronRight size={17}/></button></div></section>
 </div>;

 return <div className="login-page">
  <section className="login-intro"><div className="login-brand"><span className="login-mark">KC</span><span>KORUNA &amp; CO</span></div><div><span className="login-kicker">Create your account</span><h1>Join the team shaping what comes next.</h1><p>Register your account, verify your email, and request access to the shared transformation roadmap.</p></div><div className="login-proof"><span><CheckCircle2 size={16}/> Secure registration</span><span><LockKeyhole size={16}/> Controlled project access</span></div></section>
  <section className="login-panel"><div className="login-card"><button className="auth-back" onClick={onBackToLogin}><ArrowLeft size={16}/> Back to sign in</button><div className="login-heading"><span className="login-icon"><UserPlus size={21}/></span><div><h2>Create account</h2><p>Use your work email to get started.</p></div></div><form className="login-form" onSubmit={submit}>
   <label htmlFor="register-name">Full name</label><div className="login-input"><UserRound size={18}/><input id="register-name" autoComplete="name" required value={fullName} onChange={event=>setFullName(event.target.value)} placeholder="Your full name"/></div>
   <label htmlFor="register-email">Work email</label><div className="login-input"><Mail size={18}/><input id="register-email" type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@company.com"/></div>
   <label htmlFor="register-password">Password</label><div className="login-input"><LockKeyhole size={18}/><input id="register-password" type={showPassword?'text':'password'} autoComplete="new-password" required minLength="8" value={password} onChange={event=>setPassword(event.target.value)} placeholder="At least 8 characters"/><button type="button" className="password-toggle" onClick={()=>setShowPassword(value=>!value)} aria-label={showPassword?'Hide passwords':'Show passwords'}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
   <label htmlFor="register-confirm">Confirm password</label><div className="login-input"><LockKeyhole size={18}/><input id="register-confirm" type={showPassword?'text':'password'} autoComplete="new-password" required minLength="8" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} placeholder="Repeat your password"/></div>
   {!cloudMode&&<div className="login-warning"><AlertTriangle size={16}/><span>Connect Supabase in `.env.local` to enable registration.</span></div>}
   {error&&<div className="login-error" role="alert"><AlertTriangle size={16}/><span>{error}</span></div>}
   <button className="login-submit" disabled={loading||!cloudMode}>{loading?'Creating account…':<>Create account <ChevronRight size={17}/></>}</button>
  </form><p className="login-note">Creating an account does not automatically grant access to confidential project data.</p></div></section>
 </div>;
}
