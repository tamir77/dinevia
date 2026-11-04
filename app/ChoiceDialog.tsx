'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {closeLabel} from '../lib/dialog-copy';
import {Check,ChevronDown,X} from 'lucide-react';
type Option={value:string;label:string;detail?:string};
export default function ChoiceDialog({label,value,options,onChange,disabled=false,language='en',icon}:{label:string;value:string;options:Option[];onChange:(value:string)=>void;disabled?:boolean;language?:string;icon?:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),id=useId(),[open,setOpen]=useState(false);
 useEffect(()=>{if(!open)return;const d=ref.current!;d.showModal();d.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{d.close();document.body.style.overflow=old}},[open]);
 return <><button type="button" className="choice-trigger" aria-label={label} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(true)}>{icon}<span>{options.find(o=>o.value===value)?.label||label}</span><ChevronDown size={16}/></button><dialog ref={ref} className="choice-dialog" aria-labelledby={id} lang={language} dir={['he','ar'].includes(language)?'rtl':'ltr'} onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="choice-dialog-head"><h2 id={id}>{label}</h2><button type="button" className="dialog-close" aria-label={closeLabel(language)} onClick={()=>setOpen(false)}><X size={22}/></button></div><div className="choice-options">{options.map(o=><button type="button" key={o.value} aria-pressed={value===o.value} onClick={()=>{setOpen(false);onChange(o.value)}}><span>{o.label}{o.detail&&<small>{o.detail}</small>}</span>{value===o.value&&<Check size={20}/>}</button>)}</div></dialog></>;
}
