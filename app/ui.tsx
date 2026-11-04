'use client';
import WatchDemo from './WatchDemo';
import ChoiceDialog from './ChoiceDialog';
import {useEffect,useState} from 'react';
import {Utensils,ArrowUpRight,Camera,Link2,Globe2,QrCode,ArrowRight,Check} from 'lucide-react';
import {Brand} from './shared';
import {languages} from '../lib/menu';
import {languageName} from '../lib/guest-copy';
import {importCopy} from '../lib/import-copy';
import FAQ from './FAQ';
import {siteCopy} from '../lib/site-copy';
import {homeCopy} from '../lib/home-copy';
import {guestLocale} from '../lib/guest-locale';
export {api,body,Brand} from './shared';
export default function Home({initialLanguage='en'}:{initialLanguage?:string}){
 const [language,setLanguage]=useState(initialLanguage),t=homeCopy(language),s=siteCopy(language),i=importCopy(language),dir=['he','ar'].includes(language)?'rtl':'ltr';
 useEffect(()=>{let saved='';try{saved=localStorage.getItem('menu-languages:ui-language')||''}catch{}setLanguage(guestLocale(new URLSearchParams(location.search).get('lang'),saved,navigator.languages))},[]);
 function choose(value:string){setLanguage(value);try{localStorage.setItem('menu-languages:ui-language',value)}catch{}const url=new URL(location.href);url.searchParams.set('lang',value);history.replaceState(null,'',url)}
 return <div lang={language} dir={dir} className="welcome"><header className="topbar"><Brand/><div className="welcomecontrols"><nav><a href={'/translate?lang='+language}>{i.guest}</a><a href={'/restaurants?lang='+language}>{i.host}</a></nav><ChoiceDialog label={i.language} value={language} onChange={choose} language={language} icon={<Globe2 size={16}/>} options={languages.map(([code])=>({value:code,label:languageName(code,language),detail:languageName(code,code)}))}/></div></header><main className="dashboard home"><div className="eyebrow"><span/> {t.eyebrow}</div><div className="pageheading homeheading"><div><h1><span className="menuecho">{s.headline[0]}</span><br/><em>{s.headline.slice(1).map((line,index)=><span key={line}>{index>0&&<br/>}{line}</span>)}</em></h1><a className="button heroaction" href={'/translate?lang='+language}>{i.submit}<ArrowRight size={18}/></a><WatchDemo language={language}/></div><div className="wordplay"><div className="world-art" aria-hidden="true"><span className="world-orbit"/><Globe2 className="world-globe" strokeWidth={.8}/><span className="world-fork"><Utensils size={32}/></span><span className="world-greeting greeting-one">Ciao!</span><span className="world-greeting greeting-two">こんにちは</span><span className="world-spark">✦</span></div><span className="wordplay-top">{t.wordplay}</span><div dir="ltr"><span>menu</span><ArrowUpRight size={28}/><em>many</em></div><p>{t.small}</p><span className="languagechips">{['en','fr','zh'].map(code=><span key={code}>{languageName(code,language)}</span>)}<span>+{languages.length-3}</span></span><div className="paperlines" aria-hidden="true"><span/><span/><span/></div></div></div>
<div className="audiencegrid"><a className="audiencecard guestcard" href={'/translate?lang='+language}><span className="number">01 / {i.guest}</span><div className="audienceicons"><Link2/><Camera/></div><h2>{t.guestTitle}</h2><p>{t.guestBody}</p><span className="audiencenote"><Check size={15}/> {t.guestNote}</span><span className="button">{i.submit} <ArrowRight size={18}/></span></a><a className="audiencecard restaurantcard" href={'/restaurants?lang='+language}><span className="number">02 / {i.host}</span><div className="audienceicons"><QrCode/></div><h2>{t.hostTitle}</h2><p>{t.hostBody}</p><span className="audiencenote"><Check size={15}/> {s.hostNote}</span><span className="button secondary">{s.hostAction} <ArrowUpRight size={18}/></span></a></div>
<div className="steps">{[[t.step1,t.step1Body],[t.step2,t.step2Body],[t.step3,t.step3Body]].map(([title,copy],n)=><div key={n}><span>0{n+1}</span><div><strong>{title}</strong><p>{copy}</p></div></div>)}</div><p className="hint">{t.foot}</p><FAQ language={language}/><footer><Brand/><span>Menus Without Borders</span><span>{t.powered}</span></footer></main></div>
}
