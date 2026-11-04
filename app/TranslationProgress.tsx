'use client';
import LoadingTips from './LoadingTips';
import {useEffect,useId,useRef} from 'react';
import {Globe2,Loader2} from 'lucide-react';
import {guestCopy,languageName} from '../lib/guest-copy';
export default function TranslationProgress({open,language,photo=false,preparing=false,detail=''}:{open:boolean;language:string;photo?:boolean;preparing?:boolean;detail?:string}){
 const ref=useRef<HTMLDialogElement>(null),id=useId(),t=guestCopy(language);
 useEffect(()=>{if(!open)return;const d=ref.current!;d.showModal();d.querySelector<HTMLElement>('h2')?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{d.close();document.body.style.overflow=old}},[open]);
 return <dialog ref={ref} className="translation-dialog" aria-labelledby={id} aria-describedby={id+'-detail'} lang={language} dir={['he','ar'].includes(language)?'rtl':'ltr'} onCancel={e=>e.preventDefault()}><div className="translation-orbit" aria-hidden="true"><Globe2 size={36}/><Loader2 className="spin" size={78}/></div><h2 id={id} tabIndex={-1}>{preparing?t.opening:photo?t.photoWait:t.translating}</h2><p id={id+'-detail'}>{detail||languageName(language,language)}</p><div className="translation-track" aria-hidden="true"><span/></div><p className="translation-promise" role="status">{t.same}</p>{open&&<LoadingTips language={language}/>}</dialog>;
}
