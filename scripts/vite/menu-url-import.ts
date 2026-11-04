import {lookup} from 'node:dns/promises';
import {request as httpsRequest} from 'node:https';
import {request as httpRequest} from 'node:http';
import {BlockList, isIP} from 'node:net';
import type {Plugin} from 'vite';
import type {IncomingMessage,ServerResponse} from 'node:http';
import {isLaPlacinteMenu,loadLaPlacinteMenu,type PublicRequest} from './image-menu-catalog.ts';
import {snapshotHtml} from './html-menu-snapshot.ts';

const maxBytes=8*1024*1024;
const blocked=new BlockList();
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked.addSubnet(ip,bits,'ipv4');
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6');
const blockedV6=new BlockList();for(const [ip,bits] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]] as const)blockedV6.addSubnet(ip,bits,'ipv6');
export function publicAddress(ip:string){
 if(isIP(ip)===4)return !blocked.check(ip,'ipv4');
 return isIP(ip)===6&&globalV6.check(ip,'ipv6')&&!blockedV6.check(ip,'ipv6');
}
export function parseSourceUrl(value:string){
 let u:URL;try{u=new URL(value)}catch{throw new Error('Enter a full address starting with https://');}
 const host=u.hostname.replace(/^\[|\]$/g,'').toLowerCase();
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port||!host.includes('.')||isIP(host)||host.endsWith('.localhost')||host.endsWith('.local')||host.endsWith('.internal'))throw new Error('Use a public restaurant menu or PDF link without a password or custom port.');
 u.hash='';return u;
}
type Download={url:string;type:string;bytes:Buffer};
export async function downloadPublic(raw:string,redirects=0,deadline=Date.now()+25000,options:PublicRequest={}):Promise<Download>{
 if(redirects>4)throw new Error('This link redirects too many times. Use a direct menu link.');
 const u=parseSourceUrl(raw),remaining=deadline-Date.now();if(remaining<=0)throw new Error('The restaurant website took too long to respond. Please try again later.');
 const addresses=await Promise.race([lookup(u.hostname,{all:true}),new Promise<never>((_,reject)=>{const t=setTimeout(()=>reject(new Error('This website could not be found.')),Math.min(remaining,5000));t.unref();})]);
 if(!addresses.length||addresses.some(a=>!publicAddress(a.address)))throw new Error('This link does not point to a public website.');
 const selected=addresses[0];
 return new Promise((resolve,reject)=>{
  const req=(u.protocol==='https:'?httpsRequest:httpRequest)(u,{
   // Pin the checked address at connection time, including every redirect.
   lookup:(_hostname,_options,callback)=>callback(null,selected.address,selected.family),
   family:selected.family,agent:false,method:options.method||'GET',
   headers:{'User-Agent':'MenuPassport/0.1','Accept':'text/html,application/pdf;q=0.9,text/css,image/*;q=0.8,*/*;q=0.5','Accept-Encoding':'identity',...options.headers},
  },res=>{
   if([301,302,303,307,308].includes(res.statusCode||0)&&res.headers.location){if(options.body||options.headers?.stoken){res.resume();reject(new Error('The restaurant menu service redirected unexpectedly.'));return;}res.resume();clearTimeout(timer);downloadPublic(new URL(res.headers.location,u).href,redirects+1,deadline).then(resolve,reject);return;}
   if(!res.statusCode||res.statusCode<200||res.statusCode>=300){res.resume();reject(new Error(`The website returned error ${res.statusCode}. Please check the menu link.`));return;}
   if(Number(res.headers['content-length']||0)>maxBytes){res.destroy();reject(new Error('This file is larger than 8 MB.'));return;}
   const encoding=res.headers['content-encoding'];if(encoding&&encoding!=='identity'){res.destroy();reject(new Error('This page format is not supported. Try another menu link.'));return;}
   const chunks:Buffer[]=[];let length=0;
   res.on('data',(chunk:Buffer)=>{length+=chunk.length;if(length>maxBytes){res.destroy(new Error('This file is larger than 8 MB.'));return}chunks.push(chunk)});
   res.on('error',reject);res.on('end',()=>resolve({url:u.href,type:String(res.headers['content-type']||''),bytes:Buffer.concat(chunks)}));
  });
  const timer=setTimeout(()=>req.destroy(new Error('The restaurant website took too long to respond. Please try again later.')),Math.max(1,deadline-Date.now()));
  req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end(options.body);
 });
}
export function importUrlHandler(publicOrigin?:string){return async(req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
 if(req.url?.split('?')[0]!=='/api/import-url')return next();
 const send=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 try{
 const origin=publicOrigin||`http://${req.headers.host}`;
 if(req.method!=='POST')return send(405,{error:'Please submit this request using POST.'});
 if(req.headers.origin!==origin||!publicOrigin&&(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress||'')||!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname)))return send(403,{error:'This request could not be verified. Refresh the page and try again.'});
 let payload='';for await(const chunk of req){payload+=chunk;if(payload.length>4096)return send(413,{error:'This link is too long.'});}
 let value;try{value=JSON.parse(payload)}catch{return send(400,{error:'This request is not valid.'});}
 if(typeof value.url!=='string'||value.url.length>2000)return send(400,{error:'Enter a link with up to 2,000 characters.'});
 const result=await downloadPublic(value.url);
 if(result.bytes.subarray(0,5).toString()==='%PDF-'){
  res.writeHead(200,{'Content-Type':'application/pdf','Cache-Control':'no-store','Content-Disposition':'attachment; filename="restaurant-menu.pdf"'});res.end(result.bytes);return;
 }
 if(/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(result.type)){
  res.writeHead(200,{'Content-Type':result.type.split(';')[0],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(result.bytes);return;
 }
 if(isLaPlacinteMenu(result.url))return send(200,await loadLaPlacinteMenu(result,(url,options)=>downloadPublic(url,0,Date.now()+25000,options)));
 if(!/text\/html|application\/xhtml/i.test(result.type))return send(422,{error:'This link does not contain a supported menu page, image or PDF.'});
 const language=typeof value.language==='string'&&/^(?:[a-z]{2,3}|auto)$/.test(value.language)?value.language:'ro';
 const snapshot=await snapshotHtml(result,language,(url)=>downloadPublic(url,0,Date.now()+10000),{textOnly:value.presentation==='text'});
 return send(200,snapshot);
 }catch(e){return send(400,{error:e instanceof Error?e.message:'Could not open this link. Check the address and try again.'});}
 };}
export function menuUrlImport():Plugin{return {name:'local-menu-url-import',enforce:'pre',apply:'serve',configureServer(server){server.middlewares.use(importUrlHandler());}};}
