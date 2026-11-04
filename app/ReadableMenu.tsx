'use client';
import type {ReactNode} from 'react';
import {useMenuCurrency} from './MenuCurrency';
import {documentSections,isWebMenu,type MenuDocument} from '../lib/menu-document';
import type {Translated} from '../lib/layout';
import {isMenuAmount,formatMenuAmount} from '../lib/menu-amount';
import {guestCopy,languageName} from '../lib/guest-copy';
type Block={id:string;text:string;role?:string};
export default function ReadableMenu({data,translation,annotation,uiLanguage}:{data:MenuDocument;translation:Translated|null;annotation?:(id:string)=>ReactNode;uiLanguage?:string}){
 const localCurrency='sourceUrl' in data&&!!data.sourceUrl&&new URL(data.sourceUrl).hostname.endsWith('.md');
 const language=translation?.language||data.language,rtl=['he','ar','fa','ur'].includes(language);
 const ui=uiLanguage||language,t=guestCopy(ui);
 const currency=useMenuCurrency(data,ui);
 const hidden=new Set(translation?.hiddenIds||[]);
 const sections=documentSections(data),categories=sections.flatMap(s=>s.blocks).filter(b=>!hidden.has(b.id)&&(b as Block).role==='heading');
 return <>{currency.controls}{categories.length>1&&<nav className="menucategories" dir={rtl?'rtl':'ltr'} aria-label={t.menuText}>{categories.map(b=><a key={b.id} href={'#category-'+b.id}>{translation?.texts[b.id]||b.text}</a>)}</nav>}<div className="readablemenu" lang={language==='auto'?undefined:language} dir={rtl?'rtl':'ltr'}>{documentSections(data).map((section,index)=>{
  if(!section.blocks.length)return null;
  let previous='';
  return <section className="readingpaper" key={index} aria-label={`${t.menuText}${documentSections(data).length>1?' · '+t.page+' '+(index+1):''}`}><div className="readingmasthead"><span>{t.theMenu}</span><span>{languageName(language,ui)}{documentSections(data).length>1?' · '+(index+1):''}</span></div><div className="readingcontent">{section.blocks.map((value,blockIndex)=>{
   if(hidden.has(value.id))return null;
   const b=value as Block,text=translation?.texts[b.id]||b.text;
   // Bilingual menus often repeat a dish name. Collapse adjacent identical translated
   // labels, but never collapse prices, weights or any text containing numbers.
   const repeated=!!translation&&text.trim()===previous&&/\p{L}/u.test(text)&&!/[0-9]/.test(text);previous=text.trim();if(repeated)return null;
   const letters=b.text.replace(/[^\p{L}]/gu,''),capitalized=letters.length>3&&letters===letters.toLocaleUpperCase()&&letters!==letters.toLocaleLowerCase()&&b.text.length<140;
   const numeric=b.role==='price'||isMenuAmount(b.text),heading=!numeric&&b.role==='heading',dish=!numeric&&(b.role==='dish'||(!b.role&&capitalized));
   const quantity=numeric&&/\b(?:gr|kg|ml|cl|g|oz)\.?\s*$/i.test(b.text);
   const display=numeric?formatMenuAmount(b.text,{localCurrency,previousText:section.blocks[blockIndex-1]?.text}):text;
   return <div key={b.id} className={'readingrow '+(heading?'readingsection':dish?'readingdish':numeric?'readingprice '+(quantity?'readingquantity':'readingmoney'):'readingdescription')} data-menu-block={b.id} id={heading?'category-'+b.id:undefined}>{heading?<h2><span className="categoryornament" aria-hidden="true"/> {display}</h2>:dish?<h3>{display}</h3>:<p dir={numeric?"ltr":undefined}>{display}{currency.conversion(b.text,b.role)}</p>}{annotation?.(b.id)}</div>
  })}</div>{translation&&<details className="readingoriginal"><summary>{t.originalText}</summary><div dir="auto">{section.blocks.map(b=><p key={b.id}>{b.text}</p>)}</div></details>}</section>
 })}</div></>;
}
