import {readFile} from 'node:fs/promises';
import type {Plugin} from 'vite';
export function phoneLink():Plugin{return {name:'local-phone-link',apply:'serve',configureServer(server){server.middlewares.use(async(req,res,next)=>{
 if(req.url?.split('?')[0]!=='/api/phone-link')return next();
 const reply=(status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
 if(req.method!=='GET'||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress||'')||req.headers['sec-fetch-site']==='cross-site')return reply(403,{error:'Local preview only.'});
 const id=new URL(req.url,'http://localhost').searchParams.get('menu');if(!id||!/^[a-f0-9-]{36}$/i.test(id))return reply(400,{error:'Invalid menu.'});
 try{
  const url=new URL((await readFile('.sites-runtime/phone-preview-url.txt','utf8')).trim());
  if(url.protocol!=='http:'||url.port!=='5179'||!/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname))throw Error();
  const active=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(1000)});if(active.status!==303)throw Error();
  url.searchParams.set('menu',id);return reply(200,{url:url.href});
 }catch{return reply(404,{error:'Phone preview is not running.'})}
 })}};}
