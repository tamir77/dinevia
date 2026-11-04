'use client';
import {guestCopy} from '../lib/guest-copy';
import ChoiceDialog from './ChoiceDialog';
import {Coins} from 'lucide-react';
import {useEffect,useState} from 'react';
import {displayCurrencies,isDisplayCurrency,detectMenuCurrency,parseMenuPrice,convertPrice,formatConverted,rateSource,type Currency,type ExchangeRates} from '../lib/currency';
import {documentBlocks,isWebMenu,type MenuDocument} from '../lib/menu-document';
const storageKey='menu-languages:display-currency:v1';
export function useMenuCurrency(data:MenuDocument,language:string){
 const he=['he','ar'].includes(language.split('-')[0]),t=guestCopy(language);
 const currencyNames=new Intl.DisplayNames([language==='auto'?'en':language],{type:'currency'});
 const detected=detectMenuCurrency(documentBlocks(data).map(b=>b.text),'sourceUrl' in data?data.sourceUrl:undefined);
 const [target,setTarget]=useState<Currency|''>(''),[rates,setRates]=useState<ExchangeRates|null>(null),[busy,setBusy]=useState(false),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const [sourceChoice,setSourceChoice]=useState<Currency|''>('');
 const ambiguousLei=!detected&&documentBlocks(data).some(b=>/\ble[yi]\b/i.test(b.text));
 const source=detected||('currency' in data?data.currency:undefined)||sourceChoice;
 const sourceQuestion:Record<string,string>={en:'Which lei does this menu use?',it:'Quali lei usa questo menu?',de:'Welche Lei verwendet diese Speisekarte?',fr:'Quels lei utilise ce menu ?',es:'¿Qué lei utiliza este menú?',zh:'这份菜单使用哪种列伊？',ja:'このメニューのレイはどちらですか？'};
 const sourceKey='menu-languages:source:'+JSON.stringify(documentBlocks(data).map(b=>b.text));
 useEffect(()=>{setSourceChoice('');try{const saved=localStorage.getItem(sourceKey);if(saved==='MDL'||saved==='RON')setSourceChoice(saved)}catch{}},[sourceKey]);
 function chooseSource(code:'MDL'|'RON'){setSourceChoice(code);try{localStorage.setItem(sourceKey,code)}catch{}}

 useEffect(()=>{try{const stored=localStorage.getItem(storageKey);if(stored&&isDisplayCurrency(stored))setTarget(stored)}catch{}},[]);
 useEffect(()=>{
  if(!target||rates)return;
  let cancelled=false;const controller=new AbortController();setBusy(true);setFailed(false);
  fetch('/api/exchange-rates',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error('Unavailable');return await r.json() as ExchangeRates}).then(value=>{if(!cancelled)setRates(value)}).catch(()=>{if(!cancelled)setFailed(true)}).finally(()=>{if(!cancelled)setBusy(false)});
  return ()=>{cancelled=true;controller.abort()};
 },[target,rates,retry]);
 function selectTarget(value:string){const next=isDisplayCurrency(value)?value:'';setTarget(next);try{localStorage.setItem(storageKey,next)}catch{}}
 const options=[{value:'',label:t.originalCurrency},...displayCurrencies.map(([code,en])=>({value:code,label:currencyNames.of(code)||en,detail:code}))];
 const controls=<div className="menucurrency" dir={he?'rtl':'ltr'} lang={language==='auto'?undefined:language}>
  <div className="currencychoices"><div className="currency-target"><span className="control-label">{t.alsoCurrency}</span><ChoiceDialog label={t.alsoCurrency} value={target} options={options} onChange={selectTarget} language={language} icon={<Coins size={18}/>}/></div>
  {source&&<p className="source-currency">{t.menuCurrency}: <strong><bdi>{source}</bdi> · {currencyNames.of(source)}</strong></p>}</div>
  {target&&ambiguousLei&&!('currency' in data&&data.currency)&&<div className="currencynote"><p>{sourceQuestion[language]||sourceQuestion.en}</p><div className="currencychoices">{(['MDL','RON'] as const).map(code=><button key={code} type="button" className="button secondary" aria-pressed={source===code} onClick={()=>chooseSource(code)}>{new Intl.DisplayNames([language==='auto'?'en':language],{type:'region'}).of(code==='MDL'?'MD':'RO')} · {code}{source===code?' ✓':''}</button>)}</div></div>}
  {target&&<div className="currencynote" aria-live="polite">
   {!source&&!ambiguousLei&&<p>{t.originalCurrency}</p>}
   {busy&&<p role="status">{t.loadingRates}</p>}
   {failed&&<p role="alert">{t.ratesError} <button type="button" className="textbutton" onClick={()=>setRetry(n=>n+1)}>{t.retry}</button></p>}
   {rates&&source&&<p>{t.approximate} · <a href={rateSource} target="_blank" rel="noreferrer">{t.bank}</a> · <time dateTime={rates.date}>{rates.date}</time>. {t.bankDifference}</p>}
   {rates&&target===source&&<p>{t.sameCurrency}</p>}
   {rates&&!rates.rates[target]&&<p>{t.missingRate}</p>}
  </div>}
 </div>;
 function conversion(text:string,role?:string){
  if(!target||!rates)return null;
  const price=parseMenuPrice(text,source,role);if(!price||price.currency===target)return null;
  const amount=convertPrice(price.amount,price.currency,target,rates.rates);if(amount===null)return null;
  return <span className="convertedprice" data-currency={target}><span aria-hidden="true"> ≈ </span><bdi>{formatConverted(amount,target,language)}</bdi><span className="sr-only"> ({target}, {t.approximately})</span></span>;
 }
 return {controls,conversion};
}
