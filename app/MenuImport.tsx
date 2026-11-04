'use client';
import ChoiceDialog from './ChoiceDialog';
import TranslationProgress from './TranslationProgress';
import {useEffect,useRef,useState} from 'react';
import {Camera,FileText,Link2,Loader2,ArrowRight,Upload} from 'lucide-react';
import {api,body} from './shared';
import {importCopy} from '../lib/import-copy';
import {languageName} from '../lib/guest-copy';
import {languages} from '../lib/menu';
import {preferredLanguage} from '../lib/preferred-language';
import {preparePhoto} from '../lib/client-photo';
import {readLayout,readGuestPdf} from '../lib/pdf';
import type {ImageMenuCatalog} from '../scripts/vite/image-menu-catalog';
export default function MenuImport({mode,restaurantName='',replaceId='',sourceHint='',uiLanguage,onLanguageChange}:{mode:'guest'|'restaurant';restaurantName?:string;replaceId?:string;sourceHint?:string;uiLanguage?:string;onLanguageChange?:(language:string)=>void}){
 const personal=mode==='guest';
 const [pdfProgress,setPdfProgress]=useState('');
 const progress=(done:number,total:number)=>setPdfProgress(`${t.page} ${done} / ${total}`);
 const [catalog,setCatalog]=useState<ImageMenuCatalog|null>(null),[group,setGroup]=useState(0),[page,setPage]=useState<number|null>(null);
 const selectedPage=catalog&&page!==null?catalog.groups[group]?.pages[page]:null;
 const [source,setSource]=useState('url'),[url,setUrl]=useState(sourceHint),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[name,setName]=useState(restaurantName),[original,setOriginal]=useState('auto'),[language,setLanguage]=useState(uiLanguage||'en'),[busy,setBusy]=useState(''),[error,setError]=useState('');const input=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(uiLanguage)setLanguage(uiLanguage);else setLanguage(preferredLanguage(navigator.languages));},[uiLanguage]);
 const t=importCopy(personal?language:'en');
 function chooseLanguage(value:string){setLanguage(value);if(personal){onLanguageChange?.(value);try{localStorage.setItem('menu-languages:ui-language',value)}catch{}}}
 useEffect(()=>{if(file&&source==='photo'){const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)}setPreview('')},[file,source]);
 function choose(f?:File){if(!f)return;setError('');if(source==='photo'&&(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>15*1024*1024)){setError('Choose a JPEG, PNG or WebP photo up to 15 MB.');return}if(source==='pdf'&&(!f.name.toLowerCase().endsWith('.pdf')||f.size>8*1024*1024)){setError('Choose a text-based PDF up to 8 MB.');return}setFile(f)}
 async function submit(e:React.FormEvent){e.preventDefault();setError('');setPdfProgress('');setBusy('Preparing your menu…');try{
  if(personal)await api('guest-session',body({}));
  const form=new FormData();form.set('audience',personal?'personal':'restaurant');form.set('language',language);form.set('name',personal?(source==='url'?new URL(url).hostname:'Menu photo'):name.trim());if(replaceId)form.set('replaceId',replaceId);
  if(source==='photo'){
   setBusy('Preparing your photo…');const photo=await preparePhoto(file!);form.set('kind','photo');form.set('file',photo.file);form.set('width',String(photo.width));form.set('height',String(photo.height));setBusy(personal?'Reading and translating your photo…':'Reading your menu photo…');
  }else if(source==='pdf'){
   setBusy('Reading the PDF text and layout…');form.set('file',file!);form.set('layout',JSON.stringify(personal?await readGuestPdf(file!,original,undefined,progress):await readLayout(file!,original)));
  }else{
   if(catalog&&!selectedPage)throw new Error('Choose a menu page to translate.');
   setBusy(selectedPage?'Opening the selected menu page…':personal?'Reading the menu text…':'Saving the menu page and its design…');const r=await fetch('/api/import-url',body({url:selectedPage?.url||url,language:original,presentation:personal?'text':'design'}));
   if(!r.ok){const d:any=await r.json().catch(()=>({error:'Could not open this link. Check the address and try again.'}));throw new Error(d.error)}
   if(r.headers.get('content-type')?.includes('application/pdf')){const pdf=new File([await r.blob()],'menu.pdf',{type:'application/pdf'});form.set('file',pdf);form.set('layout',JSON.stringify(personal?await readGuestPdf(pdf,original,url,progress):await readLayout(pdf,original)))}
   else if(r.headers.get('content-type')?.startsWith('image/')){
    const blob=await r.blob(),photo=await preparePhoto(new File([blob],'menu-page',{type:blob.type}));
    form.set('kind','photo');form.set('file',photo.file);form.set('width',String(photo.width));form.set('height',String(photo.height));
    if(catalog&&page!==null&&personal)form.set('name',`${catalog.restaurant} · ${catalog.groups[group].name} · page ${page+1}`.slice(0,120));
    setBusy(personal?'Reading and translating your menu…':'Reading the selected menu page…');
   }else{const d:any=await r.json();if(d.kind==='image-menu'){setCatalog(d);setGroup(0);setPage(null);setBusy('');return}form.set('file',new File([d.html],'menu.html',{type:'text/html'}));form.set('layout',JSON.stringify(d.data))}
  }
  const result=await api('menus',{method:'POST',body:form});location.href='/menu/'+result.id+'?lang='+encodeURIComponent(language);
 }catch(e){setError((e as Error).message);setBusy('')}}
 return <section className="panel importpanel"><span className={personal?'sr-only':'number'}>{replaceId?'UPDATE MENU · KEEP YOUR QR CODE':personal?t.guest:'NEW RESTAURANT MENU'}</span><h2 className={personal?'sr-only':undefined}>{replaceId?'Replace your menu':personal?t.title:'Add your menu'}</h2>{error&&<p role="alert" className="notice">{personal?t.error:error}</p>}<TranslationProgress open={!!busy} language={personal?language:'en'} preparing detail={pdfProgress}/><form onSubmit={submit}>
 {!personal&&<label>Menu name<input value={name} onChange={e=>setName(e.target.value)} required maxLength={120} disabled={!!busy} placeholder="e.g. Odelle — main menu"/></label>}
 <div className="sourcechoices" role="group" aria-label={t.source}>{[['url',t.link,Link2],['photo',t.photo,Camera],...(!personal?[['pdf','PDF',FileText]]:[])].map(([value,label,Icon]:any)=><button key={value} type="button" aria-pressed={source===value} disabled={!!busy} onClick={()=>{setSource(value);setFile(null);setError('')}}><Icon size={17}/>{label}</button>)}</div>
 {source==='url'?<div className="urlsource"><label>{t.menuLink}<input type="url" autoComplete="url" autoCapitalize="none" spellCheck={false} inputMode="url" value={url} onChange={e=>{setUrl(e.target.value);setCatalog(null);setPage(null)}} required maxLength={2000} disabled={!!busy} placeholder="https://restaurant.md/menu"/></label><p className="hint">{t.linkHint}</p></div>:<div><input ref={input} type="file" className="sr-only" accept={source==='photo'?'image/jpeg,image/png,image/webp':'application/pdf'} aria-label={source==='photo'?t.choosePhoto:'Choose a PDF'} onChange={e=>choose(e.target.files?.[0])}/><button type="button" className="dropzone" disabled={!!busy} onClick={()=>input.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();choose(e.dataTransfer.files[0])}}>{preview?<img className="photothumb" src={preview} alt={t.choosePhoto}/>:<Upload size={28}/>}<strong>{file?.name||(source==='photo'?t.choosePhoto:'Choose a PDF')}</strong><span>{source==='photo'?t.photoHint:'Text-based PDF · up to 8 MB'}</span></button>{source==='photo'&&<label className="camerabutton"><Camera size={17}/> {t.takePhoto}<input type="file" accept="image/*" capture="environment" onChange={e=>choose(e.target.files?.[0])} disabled={!!busy}/></label>}</div>}
 {source==='url'&&catalog&&<section className="imagecatalog" aria-label={t.pages}><h3>{catalog.restaurant}: {t.choosePage}</h3><p>{t.imageMenu}</p><p className="hint">{t.onePage}</p><label>{t.section}<select value={group} disabled={!!busy} onChange={e=>{setGroup(Number(e.target.value));setPage(null)}}>{catalog.groups.map((g,i)=><option value={i} key={i}>{g.name} · {g.pages.length} · {t.page}</option>)}</select></label><div className="imagepagegrid" role="group" aria-label={t.choosePage}>{catalog.groups[group].pages.map((p,i)=><button type="button" key={p.url} aria-pressed={page===i} aria-label={`${t.page} ${i+1}`} disabled={!!busy} onClick={()=>setPage(i)}><img src={p.url} alt={`${t.page} ${i+1}`} loading="lazy" referrerPolicy="no-referrer"/><span>{t.page} {i+1}{page===i?' · '+t.selected:''}</span></button>)}</div>{selectedPage&&<a className="textbutton" href={selectedPage.url} target="_blank" rel="noreferrer">{t.fullSize} ↗</a>}</section>}
 <div className={!personal&&source!=='photo'?'twocol':'singlelanguage'}>{!personal&&source!=='photo'&&<label>Original language<select value={original} onChange={e=>setOriginal(e.target.value)} disabled={!!busy}><option value="auto">Detect automatically</option>{languages.map(([v,n])=><option key={v} value={v}>{personal?languageName(v,language):n}</option>)}</select></label>}<div className="import-language"><span className="control-label">{personal?t.language:'Prepare a first translation'}</span><ChoiceDialog label={personal?t.language:'Prepare a first translation'} value={language} onChange={chooseLanguage} disabled={!!busy} language={personal?language:'en'} options={languages.map(([v,n])=>({value:v,label:personal?languageName(v,language):n,detail:languageName(v,v)}))}/></div></div>
 <button className="button full" disabled={!!busy||!(source==='url'?url.trim():file)||(!personal&&!name.trim())||(source==='url'&&!!catalog&&!selectedPage)}>{busy?<><Loader2 size={18} className="spin"/>{personal?t.preparing:busy}</>:<>{source==='url'&&catalog?t.submitPage:personal?t.submit:replaceId?'Update and translate':'Save and translate'}<ArrowRight size={18}/></>}</button>
 <p className="hint">{personal?t.resultHint:(source==='photo'||source==='url'&&catalog?'Meta reads and translates your photo. Fonts and small details may change. You can always compare with the original.':'Keep the original design, with translated text. Some interactive menu websites are not supported yet.')}</p>{!personal&&<p className="hint">Each new language is translated once and saved for your next guest. Updating your menu refreshes its translations.</p>}</form></section>
}
