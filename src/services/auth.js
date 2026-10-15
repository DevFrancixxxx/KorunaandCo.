import { cloudClient, cloudConfigured } from '../cloud.js';

const localAuthKey = 'kc-demo-auth-v1';

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
 const {data,error}=await cloudClient.auth.signUp({
  email:email.trim(),
  password,
  options:{
   data:{full_name:fullName.trim()},
   emailRedirectTo:window.location.origin
  }
 });
 if(error)throw error;
 if(data.session)await cloudClient.auth.signOut();
 return {email:email.trim(),confirmationRequired:!data.session};
}

export async function signOut(){
 if(cloudConfigured){
  const {error}=await cloudClient.auth.signOut();
  if(error)throw error;
  return;
 }
 sessionStorage.removeItem(localAuthKey);
}
