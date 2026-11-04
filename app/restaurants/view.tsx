'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,QrCode,Palette,Languages,Globe2} from 'lucide-react';
import {Brand} from '../shared';
import ChoiceDialog from '../ChoiceDialog';
import FAQ from '../FAQ';
import {siteCopy} from '../../lib/site-copy';
import {importCopy} from '../../lib/import-copy';
import {homeCopy} from '../../lib/home-copy';
import {guestLocale} from '../../lib/guest-locale';
import {languageName} from '../../lib/guest-copy';
import {languages} from '../../lib/menu';
export default function Restaurants({initialLanguage='en'}:{initialLanguage?:string}){
 const [language,setLanguage]=useState(initialLanguage),t=siteCopy(language),i=importCopy(language),h=homeCopy(language);
 useEffect(()=>{let saved='';try{saved=localStorage.getItem('menu-languages:ui-language')||''}catch{}setLanguage(guestLocale(new URLSearchParams(location.search).get('lang'),saved,navigator.languages))},[]);
 function choose(value:string){setLanguage(value);try{localStorage.setItem('menu-languages:ui-language',value)}catch{}const u=new URL(location.href);u.searchParams.set('lang',value);history.replaceState(null,'',u)}
 const icons=[Palette,Languages,QrCode];
 return <div lang={language} className="welcome"><header className="topbar"><Brand/><div className="welcomecontrols"><nav><a href={'/translate?lang='+language}>{i.guest}</a><a href={'/restaurants?lang='+language} aria-current="page">{i.host}</a></nav><ChoiceDialog label={i.language} value={language} language={language} onChange={choose} icon={<Globe2 size={16}/>} options={languages.map(([code])=>({value:code,label:languageName(code,language),detail:languageName(code,code)}))}/></div></header><main className="dashboard home host-overview"><div className="eyebrow"><span/>{i.host}</div><div className="pageheading"><div><h1>{t.hostTitle}</h1><p>{t.hostIntro}</p></div><div className="passport-stamp" aria-hidden="true"><QrCode size={36}/><span>DINEVIA</span><small>Menus Without Borders</small></div></div><section className="host-features">{t.hostSteps.map(([title,body],index)=>{const Icon=icons[index];return <article key={title}><Icon size={26}/><span className="number">0{index+1}</span><h2>{title}</h2><p>{body}</p></article>})}</section><section className="host-preview"><div><h2>{t.hostPreview}</h2><p>{t.hostPreviewBody}</p></div><a className="button" href={'/translate?lang='+language}>{t.hostCta}<ArrowRight size={18}/></a></section><FAQ language={language}/><footer><Brand/><span>Menus Without Borders</span><span>{h.powered}</span></footer></main></div>;
}
