'use client';
import LoadingTips from './LoadingTips';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {Heart,SlidersHorizontal,Sparkles,ThumbsDown,Ban,X,Plus,Loader2,Check} from 'lucide-react';
import {addPreference,emptyPreferences,hasPreferences,preferencesSchema,rateDish,type Preferences,type TasteKind,type SuggestedDish} from '../lib/taste';
import {guestCopy} from '../lib/guest-copy';
import {tasteCopy,tasteDirection,tasteCacheKey} from '../lib/taste-copy';
import {tasteRulesVersion} from '../lib/taste-instructions';
import {api,body} from './shared';
const storageKey='menu-languages:taste:v1';

export default function TasteMenu({id,version,language='en',disabled=false,menuLabel='Original menu',children}:{id:string;version:number;language?:string;disabled?:boolean;menuLabel?:string;children:(options:{active:boolean;annotation:(id:string)=>ReactNode})=>ReactNode}){
 language=language==='auto'?'en':language.split('-')[0];
 const ui=guestCopy(language);
 const t=tasteCopy(language),dir=tasteDirection(language),he=language==='he';
 const categories=[{kind:'love' as const,label:t.love,Icon:Heart,hint:t.loveHint},{kind:'avoid' as const,label:t.avoid,Icon:ThumbsDown,hint:t.avoidHint},{kind:'never' as const,label:t.never,Icon:Ban,hint:t.neverHint}];
 const [preferenceLabels,setPreferenceLabels]=useState<Record<string,string>>({});
 const prefLabel=(id:string,term:string)=>preferenceLabels[id]||term;
 const localError=(e:unknown)=>language!=='en'?String((e as Error).message).includes('minute')?t.busyError:t.error:(e as Error).message;
 const [preferences,setPreferences]=useState<Preferences>(emptyPreferences),[draft,setDraft]=useState<Preferences>(emptyPreferences),[active,setActive]=useState(false),[kind,setKind]=useState<TasteKind>('love'),[term,setTerm]=useState(''),[formError,setFormError]=useState(''),[storageNote,setStorageNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[dishes,setDishes]=useState<SuggestedDish[]|null>(null);
 const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null),cache=useRef(new Map<string,{dishes:SuggestedDish[];labels:Record<string,string>}>()),request=useRef(0);
 useEffect(()=>{try{const raw=localStorage.getItem(storageKey);if(raw){const parsed=preferencesSchema.safeParse(JSON.parse(raw));if(parsed.success)setPreferences(parsed.data)}}catch{setStorageNote(t.sessionOnly)}},[]);
 useEffect(()=>{request.current++;setDishes(null);setPreferenceLabels({});setError('');setBusy(false);setActive(false);cache.current.clear()},[id,version,tasteRulesVersion]);
 useEffect(()=>{request.current++;setDishes(null);setPreferenceLabels({});setError('');setBusy(false);setActive(false)},[language]);
 useEffect(()=>()=>{request.current++},[]);
 function open(){setDraft(structuredClone(preferences));setTerm('');setFormError('');setKind('love');dialog.current?.showModal()}
 function add(value=term){try{setDraft(addPreference(draft,kind,value));setTerm('');setFormError('');input.current?.focus()}catch(e){setFormError(language!=='en'?String((e as Error).message).includes('8')?t.tooMany:t.invalidTerm:(e as Error).message)}}
 function persist(value:Preferences){setPreferences(value);try{localStorage.setItem(storageKey,JSON.stringify(value));setStorageNote('')}catch{setStorageNote(t.sessionOnly)}}
 async function find(value:Preferences){
  setActive(true);setError('');setDishes(null);setPreferenceLabels({});const token=++request.current,key=tasteCacheKey(id,version,language,tasteRulesVersion,value);
  const saved=cache.current.get(key);if(saved){setDishes(saved.dishes);setPreferenceLabels(saved.labels);setBusy(false);return}
  if(id==='demo'){setBusy(false);setError(t.demo);return}
  setBusy(true);try{const result=await api('menu/'+id+'/recommend',body({preferences:value,version,language}));if(token!==request.current)return;cache.current.set(key,{dishes:result.dishes,labels:result.preferenceLabels||{}});setDishes(result.dishes);setPreferenceLabels(result.preferenceLabels||{})}catch(e){if(token===request.current)setError(localError(e))}finally{if(token===request.current)setBusy(false)}
 }
 function save(e:React.FormEvent){e.preventDefault();let value=draft;try{if(term.trim())value=addPreference(value,kind,term);if(!hasPreferences(value)){setFormError(t.addFirst);return}persist(value);dialog.current?.close();void find(value)}catch(e){setFormError(language!=='en'?String((e as Error).message).includes('8')?t.tooMany:t.invalidTerm:(e as Error).message)}}
 function reset(){persist(emptyPreferences());setDraft(emptyPreferences());setDishes(null);setPreferenceLabels({});setActive(false);setBusy(false);request.current++;cache.current.clear();dialog.current?.close()}
 const byBlock=new Map(dishes?.map(dish=>[dish.nameBlock,{dish,...rateDish(dish,preferences)}]));
 function annotation(id:string){
  if(!active)return null;
  const item=byBlock.get(id);if(!item)return null;
  const {dish,label,love,avoid,never,needsCheck}=item;
  const reasons=[...never,...avoid,...love].map(p=>({id:p.id,text:prefLabel(p.id,p.term)+': '+(dish.matches.find(m=>m.preferenceId===p.id)?.reason||'')}));
  for(const p of needsCheck)reasons.push({id:p.id,text:prefLabel(p.id,p.term)+': '+p.reason});
  return <div className="readingmatch" lang={language} dir={dir}>
   <span className={'tastebadge '+(label==='Great match'?'great':label==='Not for you'?'excluded':label==='Ask your host'?'ask':'worth')}>{label==='Not for you'?<Ban size={13}/>:label==='Ask your host'?<span>?</span>:<Check size={13}/>} {t.labels[label]}</span>
   {reasons.length>0?<details><summary>{t.why}</summary>{reasons.map(p=><p key={p.id}>{p.text}</p>)}{[...dish.matches,...dish.uncertainties].map((m,i)=><div key={i}><p>{'basis' in m&&m.basis==='recipe'?t.recipe:t.source}</p><blockquote dir="auto">{m.quote}</blockquote></div>)}</details>:<span className="readingmatch-note">{t.noConflict}</span>}
  </div>
 }
 return <><div className="tastebar" dir={dir} lang={language}><div className="tasteviews" role="group" aria-label={t.experience}><button type="button" aria-pressed={!active} onClick={()=>setActive(false)}>{menuLabel==='Menu'?t.menu:t.originalMenu}</button><button type="button" aria-pressed={active} disabled={disabled} onClick={()=>hasPreferences(preferences)?(dishes||busy?setActive(true):void find(preferences)):open()}><Sparkles size={17}/> {t.forYou}</button></div><button type="button" className="textbutton" disabled={disabled} onClick={open}><SlidersHorizontal size={16}/>{hasPreferences(preferences)?t.edit:t.yourTaste}</button></div>
 {active&&<section className="tasteinline" dir={dir} lang={language} aria-label={t.personalized}>
  <div className="savedtaste">{categories.map(c=>preferences[c.kind].length>0&&<span key={c.kind}><c.Icon size={14}/>{c.label}: {preferences[c.kind].map((term,i)=>prefLabel(c.kind+':'+i,term)).join(', ')}</span>)}</div>
  <p className="hint">{ui.inlineTaste}</p>
  {storageNote&&<p className="hint">{t.sessionOnly}</p>}
  {busy&&<div className="taste-loading"><p className="progress" role="status"><Loader2 className="spin" size={17}/>{t.waiting}</p><LoadingTips language={language}/></div>}
  {error&&<div role="alert" className="notice">{error}<button className="textbutton" onClick={()=>void find(preferences)}>{t.retry}</button></div>}
  {dishes&&<p className="hint">{ui.unassessed}</p>}
 </section>}
 {children({active,annotation})}
 <dialog ref={dialog} dir={dir} lang={language} className="tastedialog" aria-labelledby="taste-title" onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close()}}><form onSubmit={save}><div className="taste-dialog-header"><span className="eyebrow">{t.yourTaste}</span><button type="button" className="textbutton" aria-label={t.close} onClick={()=>dialog.current?.close()}><X size={21}/></button></div><h2 id="taste-title">{t.title}</h2><p className="taste-dialog-intro">{t.dialogIntro}</p><div className="tastecategories" role="group" aria-label={t.preferenceType}>{categories.map(c=><button key={c.kind} type="button" aria-pressed={kind===c.kind} onClick={()=>setKind(c.kind)}><c.Icon size={17}/>{c.label}</button>)}</div><label className="tasteinputlabel" htmlFor="taste-ingredient">{categories.find(c=>c.kind===kind)?.hint}</label><div className="tasteinput"><input id="taste-ingredient" ref={input} value={term} maxLength={50} autoComplete="off" placeholder={kind==='love'?t.loveExample:t.avoidExample} onChange={e=>setTerm(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add()}}}/><button type="button" aria-label={t.add} className="button" disabled={!term.trim()} onClick={()=>add()}><Plus size={20}/></button></div><p className="hint">{t.oneAtATime}</p><div className="tastesuggestions" aria-label={t.quick}>{(kind==='love'?t.loveSuggestions:t.avoidSuggestions).map(value=><button key={value} type="button" onClick={()=>add(value)}><Plus size={13}/>{value}</button>)}</div>{formError&&<p className="notice" role="alert">{formError}</p>}<div className="tastegroups">{categories.map(c=><section key={c.kind}><h3><c.Icon size={15}/>{c.label}<span>{draft[c.kind].length}/8</span></h3><div className="tastechips">{draft[c.kind].map(value=><button type="button" key={value} aria-label={`${t.remove} ${value} ${t.from} ${c.label}`} onClick={()=>setDraft({...draft,[c.kind]:draft[c.kind].filter(v=>v!==value)})}>{value}<X size={13}/></button>)}{!draft[c.kind].length&&<span className="taste-none">{t.nothing}</span>}</div></section>)}</div><p className="tasteprivacy">{t.privacy}</p><div className="taste-dialog-footer"><button type="submit" className="button full" disabled={!hasPreferences(draft)&&!term.trim()}><Check size={17}/>{t.save}</button>{hasPreferences(preferences)&&<button type="button" className="textbutton" onClick={reset}>{t.clear}</button>}</div></form></dialog></>;
}
