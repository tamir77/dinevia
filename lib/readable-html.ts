import {parse} from 'parse5';
import {isPageChrome,isChromeContainer} from './menu-content.ts';
import {isMenuAmount} from './menu-amount.ts';
import type {WebMenu} from './menu-document';
type Node=any;
const attr=(n:Node,key:string):string=>n.attrs?.find((a:Node)=>a.name===key)?.value||'';

// Read only our saved text markers; never execute the restaurant's HTML.
// Original IDs stay stable so existing translations remain usable.
export function readableHtml(data:WebMenu,html:string):WebMenu{
 const tree=parse(html) as Node,byId=new Map(data.blocks.map(b=>[b.id,b])),blocks:WebMenu['blocks']=[];
 const mains:Node[]=[];
 function find(n:Node){if(n.tagName==='main'||attr(n,'role')==='main'||['main','main-content','main_content'].includes(attr(n,'id'))){mains.push(n);return}for(const c of n.childNodes||[])find(c)}find(tree);
 const amountCache=new WeakMap<object,boolean>();
 function hasAmount(node:Node):boolean{if(amountCache.has(node))return amountCache.get(node)!;const result=node.nodeName==='#comment'?isMenuAmount(byId.get(/^mp-text:(t\d+)$/.exec(node.data)?.[1]||'')?.text||''):(node.childNodes||[]).some(hasAmount);amountCache.set(node,result);return result}
 function walk(n:Node,heading='',item=false){
  const tag=n.tagName||'',classes=attr(n,'class').split(/\s+/);
  if(isChromeContainer(attr(n,'class')+' '+attr(n,'id'))||['navigation','contentinfo','banner','dialog'].includes(attr(n,'role'))||['head','nav','footer','aside','form','button','script','style','address'].includes(tag)||
   n.attrs?.some((a:Node)=>a.name==='hidden')||attr(n,'aria-hidden')==='true'||
   /(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test(attr(n,'style'))||
   classes.some((c:string)=>['skip-link','screen-reader-text','sr-only'].includes(c))||
   tag==='a'&&(attr(n,'data-mp-anchor')||attr(n,'href').startsWith('#')))return;
  const siblings=(n.parentNode?.childNodes||[]).filter((c:Node)=>c.tagName),next=siblings[siblings.indexOf(n)+1];
  // Many menus use div.title instead of headings: a label above a dish list is
  // a category, while the title inside a priced list item is a dish name.
  if(tag==='li'&&hasAmount(n))item=true;
  const titleLike=classes.some((c:string)=>/^(?:title|heading|name)(?:[-_]?\d+)?$/.test(c))||classes.some((c:string)=>/^(?:dish|product|menu-item)[-_](?:title|name)$/.test(c));
  if(titleLike&&item)heading='h3';
  else if(titleLike&&next&&['ul','ol'].includes(next.tagName)&&hasAmount(next))heading='h2';
  else if(/^h[1-6]$/.test(tag))heading=tag;
  if(n.nodeName==='#comment'){
   const id=/^mp-text:(t\d+)$/.exec(n.data)?.[1],b=id?byId.get(id):undefined;
   if(b&&!isPageChrome(b.text))blocks.push({...b,...(isMenuAmount(b.text)?{role:'price' as const}:heading?{role:['h1','h2'].includes(heading)?'heading' as const:'dish' as const}:{})});
  }
  for(const c of n.childNodes||[])walk(c,heading,item);
 }
 for(const root of mains.length?mains:[tree])walk(root);
 // Old snapshots may lack markers: still remove unambiguous webpage chrome.
 return {...data,blocks:/<!--mp-text:t\d+-->/.test(html)?blocks:data.blocks.filter(b=>!isPageChrome(b.text))};
}
