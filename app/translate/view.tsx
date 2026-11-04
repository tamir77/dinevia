'use client';
import {useEffect,useState} from 'react';
import {Brand} from '../shared';
import FAQ from '../FAQ';
import MenuImport from '../MenuImport';
import {importCopy} from '../../lib/import-copy';
import {languages} from '../../lib/menu';
import {preferredLanguage} from '../../lib/preferred-language';
export default function Translate({initialLanguage='en'}:{initialLanguage?:string}){
 const [language,setLanguage]=useState(initialLanguage),t=importCopy(language),dir=['he','ar'].includes(language)?'rtl':'ltr';
 useEffect(()=>{let saved='';try{saved=localStorage.getItem('menu-languages:ui-language')||''}catch{}const chosen=new URLSearchParams(location.search).get('lang')||saved||preferredLanguage(navigator.languages);if(languages.some(([code])=>code===chosen))setLanguage(chosen)},[]);
 return <div lang={language} dir={dir}><header className="topbar"><Brand/><nav><a href={'/translate?lang='+language} aria-current="page">{t.guest}</a><a href={'/restaurants?lang='+language}>{t.host}</a></nav></header><main className="dashboard guestdashboard"><div className="pageheading"><div><h1>{t.title}</h1><p>{t.intro}</p></div></div><div className="guestimport"><MenuImport mode="guest" uiLanguage={language} onLanguageChange={setLanguage}/></div><FAQ language={language}/></main></div>
}
