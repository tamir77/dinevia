import {hashPassword,verifyPassword,randomToken,tokenHash} from './password';
import {getChatGPTUser} from '../app/chatgpt-auth';
export type Actor={id:string;name:string;kind:'restaurant'|'guest'|'legacy';email?:string};
let prepared:Promise<unknown>|undefined;
export function ensureAccounts(db:D1Database){
 return prepared??=(async()=>{
  await db.batch([
   db.prepare('CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, created TEXT NOT NULL)'),
   db.prepare('CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, actor_id TEXT NOT NULL, kind TEXT NOT NULL, expires INTEGER NOT NULL)'),
   db.prepare('CREATE TABLE IF NOT EXISTS taste_results (id TEXT PRIMARY KEY, menu_id TEXT NOT NULL, data TEXT NOT NULL, created INTEGER NOT NULL)'),
   db.prepare('CREATE TABLE IF NOT EXISTS translation_drafts (id TEXT PRIMARY KEY, data TEXT NOT NULL)'),
   db.prepare('CREATE TABLE IF NOT EXISTS photo_reads (owner TEXT NOT NULL, fingerprint TEXT NOT NULL, data TEXT NOT NULL, translation TEXT, PRIMARY KEY(owner,fingerprint))'),
   db.prepare('CREATE TABLE IF NOT EXISTS request_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)'),
  ]);
 })().catch(e=>{prepared=undefined;throw e});
}
export function cookieValue(req:Request,name:string){const matches=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):''}
function sessionCookie(req:Request,name:string,token:string,age:number){return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol==='https:'?'; Secure':''}`}
export async function readSession(req:Request,db:D1Database,kind:'guest'|'restaurant'):Promise<Actor|null>{
 const token=cookieValue(req,kind==='guest'?'mp_guest':'mp_account');if(!/^[a-f0-9]{64}$/.test(token))return null;
 const s=await db.prepare('SELECT actor_id FROM sessions WHERE token=? AND kind=? AND expires>?').bind(tokenHash(token),kind,Date.now()).first<{actor_id:string}>();if(!s)return null;
 if(kind==='guest')return {id:s.actor_id,name:'My menu',kind};
 const account=await db.prepare('SELECT id,name,email FROM accounts WHERE id=?').bind(s.actor_id).first<{id:string;name:string;email:string}>();return account?{...account,kind}:null;
}
export async function actors(req:Request,db:D1Database){
 await ensureAccounts(db);const [account,guest,legacy]=await Promise.all([readSession(req,db,'restaurant'),readSession(req,db,'guest'),getChatGPTUser()]);
 const restaurant:Actor|null=account||(legacy?{id:legacy.userId,name:legacy.displayName,kind:'legacy'}:null);
 return {restaurant,guest,account};
}
export async function limited(db:D1Database,key:string,max:number,windowMs:number){
 const bucket=Math.floor(Date.now()/windowMs),id=key+':'+bucket;
 const result=await db.prepare('INSERT INTO request_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 WHERE count<?').bind(id,(bucket+1)*windowMs,max).run();return !result.meta.changes;
}
async function newSession(req:Request,db:D1Database,id:string,kind:'restaurant'|'guest'){
 const token=randomToken(),age=kind==='guest'?7*86400:30*86400;
 await db.prepare('INSERT INTO sessions(token,actor_id,kind,expires) VALUES(?,?,?,?)').bind(tokenHash(token),id,kind,Date.now()+age*1000).run();
 return sessionCookie(req,kind==='guest'?'mp_guest':'mp_account',token,age);
}
export async function guestSession(req:Request,db:D1Database){
 const current=await readSession(req,db,'guest');if(current)return Response.json({ok:true});
 const id='guest:'+crypto.randomUUID();return Response.json({ok:true},{headers:{'Set-Cookie':await newSession(req,db,id,'guest'),'Cache-Control':'no-store'}});
}
export async function accountAction(req:Request,db:D1Database,action:string){
 if(action==='logout'){
  const token=cookieValue(req,'mp_account');if(token)await db.prepare('DELETE FROM sessions WHERE token=?').bind(tokenHash(token)).run();
  return Response.json({ok:true},{headers:{'Set-Cookie':sessionCookie(req,'mp_account','',0),'Cache-Control':'no-store'}});
 }
 const b=await req.json() as {name?:string;email?:string;password?:string};
 const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||''),name=String(b.name||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||password.length<10||password.length>256||action==='register'&&(!name||name.length>120))return Response.json({error:'Enter your restaurant name, email and a password with at least 10 characters.'},{status:400});
 if(await limited(db,'account:'+tokenHash(email),10,15*60000))return Response.json({error:'Too many attempts. Please try again in 15 minutes.'},{status:429});
 let account=await db.prepare('SELECT id,name,email,password FROM accounts WHERE email=?').bind(email).first<{id:string;name:string;email:string;password:string}>();
 if(action==='register'){
  if(account)return Response.json({error:'This email is already registered. Please sign in.'},{status:409});
  const id='restaurant:'+crypto.randomUUID(),hash=await hashPassword(password);
  try{await db.prepare('INSERT INTO accounts(id,name,email,password,created) VALUES(?,?,?,?,?)').bind(id,name,email,hash,new Date().toISOString()).run()}catch{return Response.json({error:'Could not create your account. This email may already be registered.'},{status:409})}
  account={id,name,email,password:hash};
 }else if(action==='login'){
  const valid=await verifyPassword(password,account?.password||'pbkdf2-sha256:600000:'+ '0'.repeat(64)+':'+ '0'.repeat(64));
  if(!account||!valid)return Response.json({error:'Please check your email and password.'},{status:401});
 }else return Response.json({error:'This action is not available.'},{status:404});
 return Response.json({user:{name:account!.name,email:account!.email}},{headers:{'Set-Cookie':await newSession(req,db,account!.id,'restaurant'),'Cache-Control':'no-store'}});
}
