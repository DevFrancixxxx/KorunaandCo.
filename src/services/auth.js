import { cloudClient, cloudConfigured } from '../cloud.js';

const localAuthKey = 'kc-demo-auth-v1';
const emailConfirmedParam = 'email-confirmed';
const passwordRecoveryParam = 'reset-password';

export const demoCredentials = {
 email: 'demo@koruna.co',
 password: 'Demo2026!'
};

export function getInitialSession(){
 if(cloudConfigured)return null;
 return sessionStorage.getItem(localAuthKey)?{user:{email:demoCredentials.email},local:true}:null;
}

export async function getCurrentSession(){
 if(!cloudConfigured)return getInitialSession();
 const {data,error}=await cloudClient.auth.getSession();
 if(error)throw error;
 return data.session;
}

export function watchAuthState(callback){
 if(!cloudConfigured)return ()=>{};
 const {data:{subscription}}=cloudClient.auth.onAuthStateChange((event,session)=>callback(session,event));
 return ()=>subscription.unsubscribe();
}

export async function signIn(email,password){
 if(cloudConfigured){
  const {data,error}=await cloudClient.auth.signInWithPassword({email:email.trim(),password});
  if(error)throw error;
  return data.session;
 }
 await new Promise(resolve=>setTimeout(resolve,350));
 if(email.trim().toLowerCase()!==demoCredentials.email||password!==demoCredentials.password){
  throw new Error('Email or password is incorrect.');
 }
 sessionStorage.setItem(localAuthKey,'signed-in');
 return {user:{email:demoCredentials.email},local:true};
}

export async function registerAccount({fullName,email,password}){
 if(!cloudConfigured)throw new Error('Connect this app to Supabase before creating accounts.');
 const confirmationUrl=new URL(import.meta.env.VITE_PUBLIC_APP_URL?.trim()||window.location.href);
 confirmationUrl.search='';
 confirmationUrl.hash='';
 confirmationUrl.searchParams.set(emailConfirmedParam,'1');
 const {data,error}=await cloudClient.auth.signUp({
  email:email.trim(),
  password,
  options:{
   data:{full_name:fullName.trim()},
   emailRedirectTo:confirmationUrl.toString()
  }
 });
 if(error)throw error;
 if(data.session)await cloudClient.auth.signOut();
 return {email:email.trim(),confirmationRequired:!data.session};
}

export async function verifyRegistrationCode(email,code){
 if(!cloudConfigured)throw new Error('Connect this app to Supabase before confirming accounts.');
 const {data,error}=await cloudClient.auth.verifyOtp({
  email:email.trim(),
  token:code.trim(),
  type:'signup'
 });
 if(error)throw error;
 if(data.session)await cloudClient.auth.signOut();
 return true;
}

function passwordRecoveryUrl(){
 const recoveryUrl=new URL(import.meta.env.VITE_PUBLIC_APP_URL?.trim()||window.location.href);
 recoveryUrl.search='';
 recoveryUrl.hash='';
 recoveryUrl.searchParams.set(passwordRecoveryParam,'1');
 return recoveryUrl.toString();
}

export async function requestPasswordReset(email){
 if(!cloudConfigured)throw new Error('Password reset is available when this app is connected to Supabase.');
 const {error}=await cloudClient.auth.resetPasswordForEmail(email.trim(),{redirectTo:passwordRecoveryUrl()});
 if(error)throw error;
}

export async function resetPassword(password){
 if(!cloudConfigured)throw new Error('Password reset is available when this app is connected to Supabase.');
 const {error}=await cloudClient.auth.updateUser({password});
 if(error)throw error;
}

export function isEmailConfirmationReturn(){
 return new URLSearchParams(window.location.search).get(emailConfirmedParam)==='1';
}

export function clearEmailConfirmationReturn(){
 const url=new URL(window.location.href);
 url.searchParams.delete(emailConfirmedParam);
 window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`);
}

export function isPasswordRecoveryReturn(){
 return new URLSearchParams(window.location.search).get(passwordRecoveryParam)==='1';
}

export function clearPasswordRecoveryReturn(){
 const url=new URL(window.location.href);
 url.searchParams.delete(passwordRecoveryParam);
 window.history.replaceState({},'',`${url.pathname}${url.search}${url.hash}`);
}

export async function signOut(){
 if(cloudConfigured){
  const {error}=await cloudClient.auth.signOut();
  if(error)throw error;
  return;
 }
 sessionStorage.removeItem(localAuthKey);
}
