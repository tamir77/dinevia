import {parse,parseFragment,serialize} from 'parse5';
import {isPageChrome,isChromeContainer} from '../../lib/menu-content.ts';
import {readableHtml} from '../../lib/readable-html.ts';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import type {WebMenu} from '../../lib/menu-document';

type Resource={url:string;type:string;bytes:Buffer};
type Loader=(url:string)=>Promise<Resource>;
// parse5's HTML/SVG tree is handled centrally; no source HTML is executed.
type Node=any;
const allowed=new Set('html head body title style main header footer nav section article aside div span p h1 h2 h3 h4 h5 h6 a img picture figure figcaption ul ol li dl dt dd table caption colgroup col thead tbody tfoot tr th td br hr strong em b i u s small sub sup blockquote q cite abbr address time mark pre code details summary button label form fieldset legend svg g path circle ellipse rect line polyline polygon defs linearGradient radialGradient stop clipPath mask symbol use text tspan'.toLowerCase().split(' '));
export const snapshotCsp="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; media-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
const get=(n:Node,key:string):string=>n.attrs?.find((a:Node)=>a.name===key)?.value||'';
const set=(n:Node,key:string,value:string)=>{n.attrs=n.attrs.filter((a:Node)=>a.name!==key);n.attrs.push({name:key,value})};
function element(markup:string){return (parseFragment(markup) as Node).childNodes[0]}
function cssText(n:Node,text:string){n.childNodes=[{nodeName:'#text',value:text.replace(/<\/style/gi,'<\\/style'),parentNode:n}]}

export async function snapshotHtml(source:Resource,language:string,load:Loader,options:{textOnly?:boolean}={}):Promise<{html:string;data:WebMenu}>{
 const tree=parse(source.bytes.toString('utf8'),{scriptingEnabled:false}) as Node;
 const html=tree.childNodes.find((n:Node)=>n.tagName==='html'),head=html.childNodes.find((n:Node)=>n.tagName==='head');
 if(language==='auto')language=get(html,'lang').split('-')[0]||'auto';
 const warnings=new Set<string>();
 const blocks:WebMenu['blocks']=[];
 let count=0,total=source.bytes.length,characters=0;
 const cache=new Map<string,Promise<Resource>>();
 const deadline=Date.now()+45000;
 // Bound simultaneous downloads as well as total requests and stored bytes.
 let active=0;const waiting:(()=>void)[]=[];
 async function resource(raw:string,base:string){
  const url=new URL(raw,base).href;
  if(!/^https?:/.test(url))throw new Error('Unsupported resource');
  if(!cache.has(url)){
   if(++count>200||total>16*1024*1024||Date.now()>deadline)throw new Error('Resource budget reached');
   const promise=(async()=>{if(active>=4)await new Promise<void>(r=>waiting.push(r));else active++;
    try{if(Date.now()>deadline)throw new Error('Resource timeout');const r=await load(url);total+=r.bytes.length;if(total>16*1024*1024)throw new Error('Resource budget reached');return r}
    finally{const next=waiting.shift();if(next)next();else active--}
   })();cache.set(url,promise);
  }
  return cache.get(url)!;
 }
 function missing(){warnings.add('Some images or fonts could not be saved. Compare with the original.')}
 async function asset(raw:string,base:string):Promise<string>{
  if(/^data:(?:image\/(?:png|jpeg|gif|webp|avif|svg\+xml)|font\/[\w.+-]+);base64,[a-z0-9+/=\s]+$/i.test(raw)&&raw.length<4*1024*1024)return raw;
  if(raw.startsWith('#'))return raw;
  try{const r=await resource(raw,base);let mime=r.type.split(';')[0].toLowerCase();
   if(!/^(?:image\/(?:png|jpeg|gif|webp|avif|svg\+xml|x-icon)|font\/[\w.+-]+|application\/(?:font-woff|vnd.ms-fontobject|x-font-ttf))$/.test(mime)){
    if(/\.(woff2?|ttf|otf)(?:\?|$)/i.test(r.url))mime='font/'+(r.url.match(/\.(woff2?|ttf|otf)(?:\?|$)/i)?.[1]);else throw new Error('Unsupported asset');
   }
   return `data:${mime};base64,${r.bytes.toString('base64')}`;
  }catch{missing();return 'data:,'}
 }
 async function css(input:string,base:string,depth=0):Promise<string>{
  try{
   const root=postcss.parse(input),jobs:Promise<void>[]=[];
   root.walkAtRules(rule=>{
    if(rule.name.toLowerCase()==='import'){
     if(depth>=3){rule.remove();return}
     const nodes=valueParser(rule.params).nodes;
     const first=nodes[0];const href=first?.type==='string'?first.value:first?.type==='function'&&first.value==='url'?valueParser.stringify(first.nodes).replace(/^['"]|['"]$/g,''):'';
     const media=valueParser.stringify(nodes.slice(1)).trim();
     jobs.push((async()=>{try{if(!href)throw new Error();const r=await resource(href,base);const nested=await css(r.bytes.toString('utf8'),r.url,depth+1);rule.replaceWith(postcss.parse(media?`@media ${media}{${nested}}`:nested))}catch{missing();rule.remove()}})());
    }else if(['charset','namespace'].includes(rule.name.toLowerCase()))rule.remove();
   });
   root.walkDecls(decl=>{const parsed=valueParser(decl.value),tasks:Promise<void>[]=[];
    parsed.walk(n=>{if(n.type==='function'&&n.value.toLowerCase()==='url'){
     const raw=valueParser.stringify(n.nodes).replace(/^['"]|['"]$/g,'');
     tasks.push(asset(raw,base).then(value=>{n.nodes=[{type:'string',quote:'"',value,sourceIndex:0,sourceEndIndex:0}]}));return false;
    }});
    if(tasks.length)jobs.push(Promise.all(tasks).then(()=>{decl.value=parsed.toString()}));
   });
   await Promise.all(jobs);return root.toString();
  }catch{warnings.add('Some parts of the page design could not be saved.');return ''}
 }
 // Honor the source base URL only during safe resource resolution, never in the iframe.
 const baseNode=head.childNodes.find((n:Node)=>n.tagName==='base');
 let base=source.url;try{if(baseNode&&get(baseNode,'href'))base=new URL(get(baseNode,'href'),source.url).href}catch{}
 async function walk(parent:Node,inBody:boolean,hidden=false):Promise<void>{
  const next:Node[]=[];
  for(const n of parent.childNodes||[]){
   if(n.nodeName==='#text'){
    if(options.textOnly&&isPageChrome(n.value))continue;
    if(inBody&&!hidden&&n.value.trim()){
     const text=n.value.trim();characters+=text.length;
     if(text.length>4000||blocks.length>=3000||characters>100000)throw new Error('This page has too much text. Link directly to the restaurant menu.');
     const id=`t${blocks.length}`;blocks.push({id,text,...(/^h[1-6]$/.test(parent.tagName||'')?{role:['h1','h2'].includes(parent.tagName)?'heading' as const:'dish' as const}:{})});
     next.push({nodeName:'#comment',data:`mp-text:${id}`,parentNode:parent});
    }
    next.push(n);continue;
   }
   if(!n.tagName)continue; // Strip source comments (including spoofed translation markers).
   const tag=n.tagName.toLowerCase();
   if(options.textOnly&&(isChromeContainer(get(n,'class')+' '+get(n,'id'))||['navigation','contentinfo','banner','dialog'].includes(get(n,'role'))))continue;
   if(options.textOnly&&['style','link','img','picture','svg','nav','footer','button'].includes(tag))continue;
   if(tag==='link'&&get(n,'rel').toLowerCase().split(/\s+/).includes('stylesheet')){
    try{const r=await resource(get(n,'href'),base),style=element('<style></style>');cssText(style,await css(r.bytes.toString('utf8'),r.url));if(get(n,'media'))set(style,'media',get(n,'media'));style.parentNode=parent;next.push(style)}catch{missing()}
    continue;
   }
   if(!allowed.has(tag))continue;
   const isHidden=hidden||n.attrs.some((a:Node)=>a.name==='hidden')||get(n,'aria-hidden')==='true'||/(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\b/i.test(get(n,'style'));
   const href=get(n,'href')||get(n,'xlink:href');
   const imageSource=tag==='img'?(get(n,'data-src')||get(n,'data-lazy-src')||get(n,'src')||get(n,'srcset').split(/[ ,]/)[0]):'';
   n.attrs=n.attrs.filter((a:Node)=>{
    const name=a.name.toLowerCase();
    if(name.startsWith('on')||name.startsWith('data-mp')||['src','srcset','href','action','formaction','target','ping','autofocus','contenteditable','nonce','integrity','crossorigin','is','srcdoc','http-equiv','xmlns'].includes(name))return false;
    return !a.namespace;
   });
   if(tag==='a'&&href.startsWith('#')&&href.length>1){set(n,'data-mp-anchor',(()=>{try{return decodeURIComponent(href.slice(1))}catch{return href.slice(1)}})());set(n,'role','link');set(n,'tabindex','0')}
   if(tag==='use'&&href.startsWith('#'))set(n,'href',href);
   if(tag==='img'){set(n,'src',await asset(imageSource,base));set(n,'loading','eager');set(n,'decoding','async')}
   if(tag==='button'){set(n,'type','button');set(n,'disabled','')}
   if(options.textOnly)n.attrs=n.attrs.filter((a:Node)=>a.name!=='style');
   if(get(n,'style'))set(n,'style',(await css(`x{${get(n,'style')}}`,base)).replace(/^x\s*\{|\}$/g,''));
   if(tag==='style'){cssText(n,await css(n.childNodes.map((c:Node)=>c.value||'').join(''),base))}
   else await walk(n,inBody||tag==='body',isHidden||['title','code','pre'].includes(tag));
   next.push(n);
  }
  parent.childNodes=next;
 }
 await walk(html,false);
 if(!blocks.some(b=>/\p{L}/u.test(b.text)))throw new Error('No menu text was found on this page. It may load interactively or be part of an image. Try a direct link to a text-based menu page.');
 const meta=element('<meta charset="utf-8">'),policy=element('<meta http-equiv="Content-Security-Policy">');set(policy,'content',snapshotCsp);
 const viewport=element('<meta name="viewport" content="width=device-width,initial-scale=1">');
 head.childNodes.unshift(meta,policy,viewport);for(const n of [meta,policy,viewport])n.parentNode=head;
 const adjustment=element('<style>html{scroll-behavior:auto!important}*,*::before,*::after{animation:none!important;transition:none!important}body{overflow-wrap:break-word}a,button{cursor:default}</style>');adjustment.parentNode=head;head.childNodes.push(adjustment);
 set(html,'lang',language);
 const result='<!DOCTYPE html>'+serialize(tree);
 if(Buffer.byteLength(result)>24*1024*1024)throw new Error('This page is too large. Try linking to a single menu section.');
 const data:WebMenu={kind:'html',language,sourceUrl:source.url,blocks,warnings:[...warnings]};
 return {html:result,data:options.textOnly?readableHtml(data,result):data};
}
