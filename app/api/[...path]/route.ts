import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {languages} from '../../../lib/menu';
import {layoutSchema} from '../../../lib/layout';
import {isConfigured,translateLayout} from '../../../lib/meta';
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
type Row={id:string;owner:string;name:string;data:string;source:string;published:number;version:number;created:string};
async function handle(req:Request){
 try{
 const url=new URL(req.url),parts=url.pathname.split('/').filter(Boolean).slice(1),db=env.DB!,user=await getChatGPTUser();
 if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return json({error:'Недопустимый источник запроса.'},403);
 if(parts[0]==='state'&&req.method==='GET')return json({user:user?{name:user.displayName}:null,configured:isConfigured(),menus:user?(await db.prepare('SELECT id,name,published,version,created FROM menus WHERE owner=? ORDER BY created DESC').bind(user.userId).all()).results:[]});
 if(parts[0]==='menus'&&req.method==='POST'){
  if(!user)return json({error:'Сначала войдите в аккаунт.'},401);

  if(Number(req.headers.get('content-length')||0)>9*1024*1024)return json({error:'Максимальный размер PDF — 8 МБ.'},413);
  const form=await req.formData(),file=form.get('file'),name=String(form.get('name')||'').trim();
  if(!name||name.length>120)return json({error:'Введите название ресторана (до 120 символов).'},400);
  if(!(file instanceof File)||file.size>8*1024*1024||file.size<5)return json({error:'Выберите PDF до 8 МБ.'},400);
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')return json({error:'Файл должен быть настоящим PDF.'},400);
  let data;try{data=layoutSchema.parse(JSON.parse(String(form.get('layout')||'')))}catch{return json({error:'Не удалось прочитать текстовый слой PDF.'},400)}
  const ids=data.pages.flatMap(p=>p.blocks.map(b=>b.id));if(!ids.length||new Set(ids).size!==ids.length)return json({error:'В PDF нет подходящего текстового слоя.'},400);
  const id=crypto.randomUUID();await env.BUCKET!.put(id+'.pdf',bytes,{httpMetadata:{contentType:'application/pdf'}});
  try{await db.prepare('INSERT INTO menus(id,owner,name,data,source,created) VALUES(?,?,?,?,?,?)').bind(id,user.userId,name,JSON.stringify(data),id+'.pdf',new Date().toISOString()).run();}catch(e){await env.BUCKET!.delete(id+'.pdf');throw e;}
  return json({id},201);
 }
 if(parts[0]==='menu'&&parts[1]){
  const row=await db.prepare('SELECT * FROM menus WHERE id=?').bind(parts[1]).first<Row>();
  if(!row||(!row.published&&row.owner!==user?.userId))return json({error:'Меню не найдено или ещё не опубликовано.'},404);
  const owner=row.owner===user?.userId;
  if(req.method==='GET'){
   if(parts[2]==='pdf'){const file=await env.BUCKET!.get(row.source);return file?new Response(file.body,{headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','Content-Disposition':'inline; filename="menu.pdf"'}}):json({error:'PDF не найден.'},404);}
   return json({id:row.id,name:row.name,data:JSON.parse(row.data),published:!!row.published,version:row.version,owner});
  }
  if(req.method==='PUT'){
   if(!owner)return json({error:'Нет доступа.'},403);
   const body=await req.json() as {name:string;data:unknown;version:number};const parsed=layoutSchema.safeParse(body.data);
   if(!parsed.success||!body.name?.trim()||body.name.length>120)return json({error:'Проверьте названия, разделы и блюда.'},400);
   const ids=parsed.data.pages.flatMap(p=>p.blocks.map(b=>b.id));if(new Set(ids).size!==ids.length)return json({error:'Идентификаторы блюд должны быть уникальными.'},400);
   const changed=await db.prepare('UPDATE menus SET name=?,data=?,version=version+1,published=0 WHERE id=? AND owner=? AND version=?').bind(body.name.trim(),JSON.stringify(parsed.data),row.id,user!.userId,body.version).run();
   if(!changed.meta.changes)return json({error:'Меню уже изменено в другом окне. Перезагрузите страницу.'},409);
   return json({ok:true,version:row.version+1});
  }
  if(req.method==='POST'&&parts[2]==='publish'){
   if(!owner)return json({error:'Нет доступа.'},403);
   const body=await req.json() as {version:number;published:boolean};
   const changed=await db.prepare('UPDATE menus SET published=? WHERE id=? AND owner=? AND version=?').bind(body.published?1:0,row.id,user!.userId,body.version).run();
   return changed.meta.changes?json({ok:true}):json({error:'Меню изменилось. Обновите страницу.'},409);
  }
  if(req.method==='POST'&&parts[2]==='translate'){
   if(!row.published&&!owner)return json({error:'Меню не опубликовано.'},404);
   const {language}=await req.json() as {language:string};if(!languages.some(([l])=>l===language))return json({error:'Выберите язык из списка.'},400);
   const data=JSON.parse(row.data);if(language===data.language)return json({data:{language,texts:Object.fromEntries(data.pages.flatMap((p:{blocks:{id:string;text:string}[]})=>p.blocks.map(b=>[b.id,b.text])))}});
   const id=`${row.id}:${row.version}:${language}`,now=Date.now();
   const cached=await db.prepare('SELECT data,started FROM translations WHERE id=?').bind(id).first<{data:string|null;started:number}>();
   if(cached?.data)return json({data:JSON.parse(cached.data)});
   if(cached&&now-cached.started<600000)return json({error:'Этот перевод уже готовится. Попробуйте через минуту.'},409);
   if(!isConfigured())return json({error:'Ресторан пока не подключил перевод. Доступно оригинальное меню.'},503);
   // A fixed language list, one lease per version/language, and a global rate cap bound public API spending.
   const recent=await db.prepare('SELECT count(*) AS n FROM translations WHERE started>?').bind(now-60000).first<{n:number}>();
   if((recent?.n||0)>=5)return json({error:'Сейчас готовится несколько переводов. Попробуйте через минуту.'},429);
   const lease=await db.prepare('INSERT INTO translations(id,menu_id,language,version,started) SELECT ?,?,?,?,? WHERE (SELECT count(*) FROM translations WHERE started>?)<5 ON CONFLICT(id) DO UPDATE SET started=excluded.started WHERE data IS NULL AND started<?').bind(id,row.id,language,row.version,now,now-60000,now-600000).run();
   if(!lease.meta.changes)return json({error:'Перевод уже готовится.'},409);
   try{const translated=await translateLayout(data,language);await db.prepare('UPDATE translations SET data=? WHERE id=? AND started=?').bind(JSON.stringify(translated),id,now).run();return json({data:translated});}catch(e){throw e;}
  }
 }
 return json({error:'Страница не найдена.'},404);
 }catch(e){return json({error:e instanceof Error?e.message:'Не удалось выполнить запрос.'},500);}
}
export const GET=handle;export const POST=handle;export const PUT=handle;
