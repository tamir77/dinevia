'use client';
import {useEffect,useRef,useState} from 'react';
import type {Translated} from '../lib/layout';
import type {WebMenu} from '../lib/menu-document';

// The snapshot is untrusted content: offline-only resources and no scripts/forms.
const policy="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
function makeDocument(html:string,data:WebMenu,translation:Translated|null){
 const doc=new DOMParser().parseFromString(html,'text/html');
 const csp=doc.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content=policy;doc.head.insertBefore(csp,doc.head.firstChild);
 const texts=translation?.texts||Object.fromEntries(data.blocks.map(b=>[b.id,b.text]));
 const walker=doc.createTreeWalker(doc.body,NodeFilter.SHOW_COMMENT);
 for(let marker=walker.nextNode();marker;marker=walker.nextNode()){
  const id=marker.nodeValue?.match(/^mp-text:(t\d+)$/)?.[1],node=marker.nextSibling;
  if(id&&node?.nodeType===Node.TEXT_NODE&&Object.hasOwn(texts,id)){
   const before=node.textContent||'';node.textContent=(before.match(/^\s*/)?.[0]||'')+texts[id]+(before.match(/\s*$/)?.[0]||'');
   if(translation&&/[\u0590-\u08FF]/.test(texts[id]))node.parentElement?.setAttribute('dir','auto');
  }
 }
 doc.documentElement.lang=translation?.language||data.language;
 return '<!DOCTYPE html>'+doc.documentElement.outerHTML;
}
function Frame({source,title}:{source:string;title:string}){
 const ref=useRef<HTMLIFrameElement>(null);
 function ready(){
  const doc=ref.current?.contentDocument;if(!doc)return;
  // Preserve in-page category navigation without running restaurant JavaScript.
  const navigate=(event:Event)=>{
   if(event.type==='keydown'&&!['Enter',' '].includes((event as KeyboardEvent).key))return;
   const anchor=(event.target as Element)?.closest?.('[data-mp-anchor]');if(!anchor)return;
   event.preventDefault();const id=anchor.getAttribute('data-mp-anchor');if(id)doc.getElementById(id)?.scrollIntoView({block:'start'});
  };
  doc.addEventListener('click',navigate);doc.addEventListener('keydown',navigate);
 }
 return <iframe ref={ref} className="webmenuframe" title={title} sandbox="allow-same-origin" referrerPolicy="no-referrer" srcDoc={source} onLoad={ready}/>;
}
export default function HtmlMenuViewer({src,data,translation,compare=false}:{src:string;data:WebMenu;translation:Translated|null;compare?:boolean}){
 const [html,setHtml]=useState(''),[error,setError]=useState(''),[documents,setDocuments]=useState<{original:string;translated:string}|null>(null);
 useEffect(()=>{const controller=new AbortController();setHtml('');setError('');fetch(src,{signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error('Could not load the saved menu page.');return r.text()}).then(setHtml).catch(e=>{if(e.name!=='AbortError')setError(e.message)});return()=>controller.abort()},[src]);
 useEffect(()=>{if(html)setDocuments({original:makeDocument(html,data,null),translated:makeDocument(html,data,translation)})},[html,data,translation]);
 if(error)return <p role="alert" className="notice">{error}</p>;
 if(!html||!documents)return <div className="loadingdoc">Opening the restaurant menu…</div>;
 return <div className={'webmenu '+(compare?'webmenucompare':'')}>
  {compare&&<section><div className="webmenulabel">Original</div><Frame title="Original menu page" source={documents.original}/></section>}
  <section><div className="webmenulabel">{translation?'Translation · '+translation.language.toUpperCase():'Original page'}<span>Original restaurant design</span></div><Frame title={translation?'Translated menu page':'Restaurant menu page'} source={documents.translated}/></section>
 </div>;
}
