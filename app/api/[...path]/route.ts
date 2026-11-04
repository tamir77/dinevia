import {translationRevision} from '../../../lib/translation-engine';
import {env} from 'cloudflare:workers';
import {isPageChrome} from '../../../lib/menu-content';
import {loadExchangeRates} from '../../../lib/exchange-rates';
import {languages} from '../../../lib/menu';
import {menuDocumentSchema,documentSections,documentBlocks,isWebMenu,isPhotoMenu} from '../../../lib/menu-document';
import {isConfigured,translateLayout} from '../../../lib/meta';
import {readPhoto,renderPhoto} from '../../../lib/meta-photo';
import {preferencesSchema,hasPreferences} from '../../../lib/taste';
import {recommendationKey,createPendingCache} from '../../../lib/taste-batches';
import {tasteRulesVersion} from '../../../lib/taste-instructions';
import {recommendMenu} from '../../../lib/meta-taste';
import {menuPresentation,needsTranslatedImage} from '../../../lib/presentation';
import {readableHtml} from '../../../lib/readable-html';
import {photoFingerprint} from '../../../lib/photo-reading';
import type {Translated} from '../../../lib/layout';
import {imageMime} from '../../../lib/photo';
import {actors,guestSession,accountAction,limited} from '../../../lib/accounts';
const pendingTaste=createPendingCache<Awaited<ReturnType<typeof recommendMenu>>>();
export const dynamic='force-dynamic';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
type Row={id:string;owner:string;name:string;data:string;source:string;published:number;version:number;created:string};
async function handle(req:Request){
 try{
 const url=new URL(req.url),parts=url.pathname.split('/').filter(Boolean).slice(1),db=env.DB!;
 if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return json({error:'This request could not be verified. Refresh the page and try again.'},403);
 if(parts[0]==='exchange-rates'&&parts.length===1&&req.method==='GET'){
  try{return json(await loadExchangeRates())}catch{return json({error:'Exchange rates are temporarily unavailable.'},503)}
 }
 const {restaurant,guest,account}=await actors(req,db);
 if(parts[0]==='guest-session'&&req.method==='POST')return guestSession(req,db);
 if(parts[0]==='account'&&req.method==='POST')return accountAction(req,db,parts[1]);
 if(parts[0]==='state'&&req.method==='GET')return json({user:restaurant?{name:restaurant.name,kind:restaurant.kind,email:restaurant.email}:null,configured:isConfigured(),menus:restaurant?(await db.prepare('SELECT id,name,published,version,created FROM menus WHERE owner=? ORDER BY created DESC').bind(restaurant.id).all()).results:[],personalMenus:guest?(await db.prepare('SELECT id,name,created FROM menus WHERE owner=? ORDER BY created DESC LIMIT 10').bind(guest.id).all()).results:[]});
 if(parts[0]==='pdf-page'&&req.method==='POST'){
  if(!guest)return json({error:'Refresh the page and try again.'},401);
  if(Number(req.headers.get('content-length')||0)>8*1024*1024)return json({error:'PDF page is too large.'},413);
  const form=await req.formData(),file=form.get('file'),width=Number(form.get('width')),height=Number(form.get('height'));
  if(!(file instanceof File)||file.size>8*1024*1024||!Number.isInteger(width)||!Number.isInteger(height)||width<200||height<200||width>2500||height>2500)return json({error:'Invalid PDF page.'},400);
  const bytes=new Uint8Array(await file.arrayBuffer());if(!imageMime(bytes))return json({error:'Invalid PDF image.'},400);
  const fingerprint='pdf-v1:'+await photoFingerprint(bytes,width,height);
  const saved=await db.prepare('SELECT data FROM photo_reads WHERE owner=? AND fingerprint=?').bind(guest.id,fingerprint).first<{data:string}>();
  if(saved)return json({menu:JSON.parse(saved.data)});
  if(await limited(db,'pdf-ocr',25,60000))return json({error:'Several PDF pages are being processed. Please retry in a minute.'},429);
  const reading=await readPhoto(bytes,width,height,undefined,true);
  await db.prepare('INSERT OR IGNORE INTO photo_reads(owner,fingerprint,data,translation) VALUES(?,?,?,NULL)').bind(guest.id,fingerprint,JSON.stringify(reading?.menu||null)).run();
  return json({menu:reading?.menu||null});
 }
 if(parts[0]==='menus'&&req.method==='POST'){
  if(Number(req.headers.get('content-length')||0)>25*1024*1024)return json({error:'This menu is too large. The maximum size is 24 MB.'},413);
  const form=await req.formData(),file=form.get('file'),personal=form.get('audience')==='personal',actor=personal?guest:restaurant;
  if(!actor)return json({error:personal?'Refresh the page and try again.':'Sign in to your host account first.'},401);
  const name=String(form.get('name')||'My menu').trim();if(!name||name.length>120)return json({error:'Enter a name with up to 120 characters.'},400);
  const replaceId=String(form.get('replaceId')||'');
  const previous=replaceId?await db.prepare('SELECT * FROM menus WHERE id=? AND owner=?').bind(replaceId,actor.id).first<Row>():null;
  if(replaceId&&(!previous||personal))return json({error:'You do not have permission to replace this menu.'},403);
  if(!(file instanceof File)||file.size<5||file.size>24*1024*1024)return json({error:'The file is missing or too large.'},400);
  const bytes=new Uint8Array(await file.arrayBuffer());let data,firstTranslation:Translated|undefined;
  if(form.get('kind')==='photo'){
   const width=Number(form.get('width')),height=Number(form.get('height'));
   if(!imageMime(bytes)||bytes.length>8*1024*1024||!Number.isInteger(width)||!Number.isInteger(height)||width<200||height<200||width>5000||height>5000)return json({error:'Use a clear JPEG, PNG or WebP photo up to 8 MB.'},400);
   const requested=String(form.get('language')||''),target=personal&&languages.some(([code])=>code===requested)?requested:undefined;
   const fingerprint=await photoFingerprint(bytes,width,height);
   const saved=await db.prepare('SELECT data,translation FROM photo_reads WHERE owner=? AND fingerprint=?').bind(actor.id,fingerprint).first<{data:string;translation:string|null}>();
   if(saved){data=menuDocumentSchema.parse(JSON.parse(saved.data));const t=saved.translation?JSON.parse(saved.translation):null;if(personal&&t?.language===target)firstTranslation=t;}
   else{
    if(await limited(db,'ai',5,60000))return json({error:'We are processing several menus. Please try again in a minute.'},429);
    const reading=await readPhoto(bytes,width,height,target);data=reading.menu;firstTranslation=reading.translation;
    await db.prepare('INSERT OR IGNORE INTO photo_reads(owner,fingerprint,data,translation) VALUES(?,?,?,?)').bind(actor.id,fingerprint,JSON.stringify(data),firstTranslation?JSON.stringify(firstTranslation):null).run();
   }
  }else{try{data=menuDocumentSchema.parse(JSON.parse(String(form.get('layout')||'')))}catch{return json({error:'Could not read this menu.'},400)}
   if(isPhotoMenu(data))return json({error:'Upload your image using the photo option.'},400);
  }
  const html=isWebMenu(data),photo=isPhotoMenu(data);
  if(!html&&!photo&&(bytes.length>8*1024*1024||new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'))return json({error:'Choose a valid PDF up to 8 MB.'},400);
  const ids=documentBlocks(data).map(b=>b.id);if(!ids.length||new Set(ids).size!==ids.length)return json({error:'No readable menu text was found.'},400);
  const id=previous?.id||crypto.randomUUID(),source=crypto.randomUUID()+(html?'.html':photo?'.photo':'.pdf');
  await env.BUCKET!.put(source,bytes,{httpMetadata:{contentType:html?'text/plain; charset=utf-8':photo?imageMime(bytes)!:'application/pdf'}});
  try{
   if(previous){const result=await db.prepare('UPDATE menus SET name=?,data=?,source=?,version=version+1,published=0 WHERE id=? AND owner=? AND version=?').bind(name,JSON.stringify(data),source,id,actor.id,previous.version).run();if(!result.meta.changes)throw new Error('This menu changed in another window. Please import it again.');}
   else await db.prepare('INSERT INTO menus(id,owner,name,data,source,created) VALUES(?,?,?,?,?,?)').bind(id,actor.id,name,JSON.stringify(data),source,new Date().toISOString()).run();
  }catch(e){await env.BUCKET!.delete(source);throw e}
  if(firstTranslation?.revision===translationRevision)await db.prepare('INSERT INTO translations(id,menu_id,language,version,data,started) VALUES(?,?,?,?,?,?)').bind(`${id}:1:${firstTranslation.language}`,id,firstTranslation.language,1,JSON.stringify(firstTranslation),Date.now()).run();
  if(previous)await env.BUCKET!.delete(previous.source);
  return json({id},201);
 }
 if(parts[0]==='menu'&&parts[1]){
  const row=await db.prepare('SELECT * FROM menus WHERE id=?').bind(parts[1]).first<Row>();
  const owner=!!row&&row.owner===restaurant?.id,personal=!!row&&row.owner===guest?.id;
  if(!row||(!row.published&&!owner&&!personal))return json({error:'This menu was not found or has not been published yet.'},404);
  let document=menuDocumentSchema.parse(JSON.parse(row.data));
  if(menuPresentation(row.owner)==='text'&&isWebMenu(document)&&(!parts[2]||['translate','recommend'].includes(parts[2]))){
   const source=await env.BUCKET!.get(row.source);if(source)document=readableHtml(document,await source.text());
  }
  if(personal&&!isWebMenu(document)){for(const section of documentSections(document))section.blocks=section.blocks.filter(b=>!isPageChrome(b.text));if(isPhotoMenu(document))document={...document,blocks:document.blocks.filter(b=>!isPageChrome(b.text))};}
  if(req.method==='GET'){
   if(parts[2]==='translation'){
    const language=url.searchParams.get('language');if(!languages.some(([code])=>code===language))return json({error:'Choose a language.'},400);
    const job=await db.prepare('SELECT data,started FROM translations WHERE id=?').bind(`${row.id}:${row.version}:${language}`).first<{data:string|null;started:number}>();
    return job?.data?json({state:'ready',data:JSON.parse(job.data)}):json({state:job&&job.started>0&&Date.now()-job.started<600000?'pending':'failed'});
   }
   if(['html','pdf','photo','translated-photo'].includes(parts[2])){
    let key=row.source;
    if(parts[2]==='html'&&!isWebMenu(document)||parts[2]==='pdf'&&(isWebMenu(document)||isPhotoMenu(document))||['photo','translated-photo'].includes(parts[2])&&!isPhotoMenu(document))return json({error:'This menu uses a different format.'},404);
    if(parts[2]==='translated-photo'){
     const cached=await db.prepare('SELECT data FROM translations WHERE id=?').bind(`${row.id}:${row.version}:${url.searchParams.get('language')}`).first<{data:string}>();
     const t=cached?.data?JSON.parse(cached.data):null;if(!t?.image)return json({error:'Your image is not ready yet.'},404);key=t.image;
    }
    const file=await env.BUCKET!.get(key);if(!file)return json({error:'The original file was not found.'},404);
    return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'application/octet-stream','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cache-Control':'private, no-store',...(url.searchParams.get('download')==='1'?{'Content-Disposition':`attachment; filename="menu.${file.httpMetadata?.contentType==='image/jpeg'?'jpg':file.httpMetadata?.contentType==='image/png'?'png':'webp'}"`}:{})}});
   }
   const ready=(await db.prepare('SELECT language FROM translations WHERE menu_id=? AND version=? AND data IS NOT NULL').bind(row.id,row.version).all<{language:string}>()).results.map(t=>t.language);
   return json({id:row.id,name:row.name,data:document,published:!!row.published,version:row.version,owner,personal,presentation:menuPresentation(row.owner),readyLanguages:ready});
  }
  if(req.method==='POST'&&parts[2]==='recommend'){
   if(Number(req.headers.get('content-length')||0)>6000)return json({error:'Your preferences are too long.'},413);
   const request=await req.json() as {preferences:unknown;version:number;language?:string};
   const parsed=preferencesSchema.safeParse(request.preferences);
   if(!parsed.success||!hasPreferences(parsed.data))return json({error:'Add at least one taste preference to get started.'},400);
   if(request.version!==row.version)return json({error:'This menu has changed. Refresh the page for current suggestions.'},409);
   const language=request.language??'en';if(!languages.some(([code])=>code===language))return json({error:'Choose a language from the list.'},400);
   const cacheId=await recommendationKey(row.id,row.version,language,tasteRulesVersion,documentBlocks(document),parsed.data);
   const cached=await db.prepare('SELECT data FROM taste_results WHERE id=? AND created>?').bind(cacheId,Date.now()-7*86400000).first<{data:string}>();
   if(cached)return json({...JSON.parse(cached.data),cached:true});
   const suggestions=await pendingTaste(cacheId,async()=>{
    if(await limited(db,'ai',5,60000))throw Object.assign(Error('Several menus are being prepared. Please try again in a minute.'),{status:429});
    const result=await recommendMenu(document,parsed.data,language);
    await db.prepare('INSERT OR REPLACE INTO taste_results(id,menu_id,data,created) VALUES(?,?,?,?)').bind(cacheId,row.id,JSON.stringify(result),Date.now()).run();
    return result;
   });
   const current=await db.prepare('SELECT version FROM menus WHERE id=?').bind(row.id).first<{version:number}>();
   if(current?.version!==row.version)return json({error:'This menu changed while we were checking it. Refresh and try again.'},409);
   return json(suggestions);
  }
  if(req.method==='PUT'){
   if(!owner)return json({error:'You do not have access to this menu.'},403);
   const b=await req.json() as {name:string;data:unknown;version:number},parsed=menuDocumentSchema.safeParse(b.data);
   if(!parsed.success||!b.name?.trim()||b.name.length>120)return json({error:'Please check the menu name and text.'},400);
   if(isWebMenu(parsed.data)!==isWebMenu(document)||isPhotoMenu(parsed.data)!==isPhotoMenu(document))return json({error:'Use Update menu to change the file format.'},400);
   const ids=documentBlocks(parsed.data).map(b=>b.id);if(new Set(ids).size!==ids.length)return json({error:'Some text identifiers are duplicated. Please import the menu again.'},400);
   const result=await db.prepare('UPDATE menus SET name=?,data=?,version=version+1,published=0 WHERE id=? AND owner=? AND version=?').bind(b.name.trim(),JSON.stringify(parsed.data),row.id,restaurant!.id,b.version).run();
   return result.meta.changes?json({ok:true,version:row.version+1}):json({error:'This menu has changed. Please refresh the page.'},409);
  }
  if(req.method==='POST'&&parts[2]==='publish'){
   if(!owner)return json({error:'Personal menus cannot be published as restaurant menus.'},403);
   const b=await req.json() as {version:number;published:boolean};
   const changed=await db.prepare('UPDATE menus SET published=? WHERE id=? AND owner=? AND version=?').bind(b.published?1:0,row.id,restaurant!.id,b.version).run();return changed.meta.changes?json({ok:true}):json({error:'This menu has changed. Please refresh the page.'},409);
  }
  if(req.method==='POST'&&parts[2]==='translate'){
   const {language}=await req.json() as {language:string};if(!languages.some(([l])=>l===language))return json({error:'Choose a language from the list.'},400);
   if(language===document.language&&menuPresentation(row.owner)!=='text')return json({data:{language,texts:Object.fromEntries(documentBlocks(document).map(b=>[b.id,b.text]))},cached:true});
   const id=`${row.id}:${row.version}:${language}`,now=Date.now();
   const cached=await db.prepare('SELECT data,started FROM translations WHERE id=?').bind(id).first<{data:string|null;started:number}>();
   if(cached?.data){if(JSON.parse(cached.data).revision===translationRevision)return json({data:JSON.parse(cached.data),cached:true});await db.prepare('UPDATE translations SET data=NULL,started=0 WHERE id=? AND data=?').bind(id,cached.data).run();cached.started=0;}
   if(cached&&now-cached.started<600000)return json({error:'This translation is already in progress. Please wait a moment.'},409);
   if(!isConfigured())return json({error:'Translation is not connected yet.'},503);
   if(await limited(db,'ai',5,60000))return json({error:'Several translations are in progress. Please try again in a minute.'},429);
   const lease=await db.prepare('INSERT INTO translations(id,menu_id,language,version,started) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET started=excluded.started WHERE data IS NULL AND started<?').bind(id,row.id,language,row.version,now,now-600000).run();
   if(!lease.meta.changes)return json({error:'Your translation is already in progress.'},409);
   try{
    const imageNeeded=isPhotoMenu(document)&&needsTranslatedImage(row.owner,'photo');
    const draft=imageNeeded?await db.prepare('SELECT data FROM translation_drafts WHERE id=?').bind(id).first<{data:string}>():null;
    const translated:any=draft?JSON.parse(draft.data):await translateLayout(document,language,{concurrency:3,readable:menuPresentation(row.owner)==='text'});
    if(isPhotoMenu(document)&&imageNeeded){
     if(!draft)await db.prepare('INSERT OR REPLACE INTO translation_drafts(id,data) VALUES(?,?)').bind(id,JSON.stringify(translated)).run();
     const original=await env.BUCKET!.get(row.source);if(!original)throw new Error('The original photo was not found.');
     const output=await renderPhoto(new Uint8Array(await original.arrayBuffer()),document,translated),imageKey=`${id}:image`;
     await env.BUCKET!.put(imageKey,output,{httpMetadata:{contentType:imageMime(output)!}});translated.image=imageKey;
    }
    await db.prepare('UPDATE translations SET data=? WHERE id=? AND started=?').bind(JSON.stringify(translated),id,now).run();if(imageNeeded)await db.prepare('DELETE FROM translation_drafts WHERE id=?').bind(id).run();return json({data:translated,cached:false});
   }catch(e){await db.prepare('UPDATE translations SET started=0 WHERE id=? AND started=? AND data IS NULL').bind(id,now).run();throw e}
  }
 }
 return json({error:'Page not found.'},404);
 }catch(e){return json({error:e instanceof Error?e.message:'Something went wrong. Please try again.'},e instanceof Error&&'status' in e&&e.status===429?429:500)}
}
export const GET=handle;export const POST=handle;export const PUT=handle;
