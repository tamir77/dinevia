'use client';
import {guestCopy} from '../lib/guest-copy';
import {useState} from 'react';
import {ArrowRight,Copy,Check} from 'lucide-react';
export default function RecommendRestaurant({source,language='en'}:{source?:string;language?:string}){
 const t=guestCopy(language);
 const [url,setUrl]=useState(''),[copied,setCopied]=useState(false);
 async function recommend(){const link=new URL('/restaurants',location.origin);link.searchParams.set('lang',language);if(source)link.searchParams.set('source',source);setUrl(link.href);try{await navigator.clipboard.writeText(link.href);setCopied(true)}catch{setCopied(false)}}
 return <aside className="recommend"><div><span className="number">{t.referralEyebrow}</span><h2>{t.referralTitle}</h2><p>{t.referralIntro}</p></div><button className="button" onClick={recommend}>{copied?<Check size={16}/>:<Copy size={16}/>} {copied?t.invited:t.invite}</button>{url&&<div className="referrallink"><label>{t.invitation}<input readOnly value={url} onFocus={e=>e.target.select()}/></label><p className="hint">{t.localInvitation}</p></div>}<a className="textbutton" href={'/restaurants?lang='+language+(source?'&source='+encodeURIComponent(source):'')}>{t.imHost} <ArrowRight size={15}/></a></aside>;
}
